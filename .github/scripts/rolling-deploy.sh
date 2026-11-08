#!/usr/bin/env bash
# Rolling deployment of one tier to its EC2 Auto Scaling Group.
#   usage: rolling-deploy.sh <web|app> <image-tag>
#
# 1. Publishes the new tag to SSM Parameter Store, so instances launched later by
#    auto scaling boot straight into this release.
# 2. Runs /opt/expense-tracker/deploy.sh on each in-service instance, ONE AT A TIME
#    (via SSM Run Command, with no SSH), so the load balancer always has healthy targets.
set -euo pipefail

TIER="$1"
TAG="$2"
PROJECT="${PROJECT:-expense-tracker}"
ASG="${PROJECT}-${TIER}-asg"
PARAM="/${PROJECT}/${TIER}/image_tag"

echo "Publishing release ${TAG} for tier ${TIER}"
aws ssm put-parameter --name "$PARAM" --value "$TAG" --type String --overwrite >/dev/null

IDS=$(aws autoscaling describe-auto-scaling-groups --auto-scaling-group-names "$ASG" \
  --query 'AutoScalingGroups[0].Instances[?LifecycleState==`InService`].InstanceId' --output text)

if [ -z "$IDS" ] || [ "$IDS" = "None" ]; then
  echo "No in-service instances in ${ASG}; new instances will pull ${TAG} at boot."
  exit 0
fi

for ID in $IDS; do
  echo "::group::${TIER}: deploying ${TAG} to ${ID}"
  CMD_ID=$(aws ssm send-command \
    --instance-ids "$ID" \
    --document-name "AWS-RunShellScript" \
    --comment "deploy ${TIER} ${TAG:0:12}" \
    --parameters 'commands=["/opt/expense-tracker/deploy.sh"]' \
    --timeout-seconds 600 \
    --query Command.CommandId --output text)

  STATUS="Pending"
  for _ in $(seq 1 120); do # up to 10 minutes
    sleep 5
    STATUS=$(aws ssm get-command-invocation --command-id "$CMD_ID" --instance-id "$ID" \
      --query Status --output text 2>/dev/null || echo "Pending")
    case "$STATUS" in
      Success | Failed | Cancelled | TimedOut) break ;;
    esac
  done

  aws ssm get-command-invocation --command-id "$CMD_ID" --instance-id "$ID" \
    --query '[StandardOutputContent, StandardErrorContent]' --output text || true
  echo "::endgroup::"

  if [ "$STATUS" != "Success" ]; then
    echo "::error::Deployment to ${ID} finished with status ${STATUS}; stopping the rollout."
    exit 1
  fi
  echo "${ID}: ${STATUS}"
done

echo "Tier ${TIER} is running ${TAG} on all instances."
