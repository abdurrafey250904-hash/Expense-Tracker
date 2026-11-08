#!/usr/bin/env bash
# Exports read-only AWS CLI evidence of every deployed component into docs/evidence/.
# Complements the console screenshots required by the CEA brief.
#   usage: bash scripts/collect-evidence.sh
set -uo pipefail
export AWS_REGION="${AWS_REGION:-ap-southeast-2}" AWS_PAGER="" MSYS_NO_PATHCONV=1 PYTHONIOENCODING=utf-8
OUT="$(dirname "$0")/../docs/evidence"
mkdir -p "$OUT"
P=expense-tracker
VPC=$(aws ec2 describe-vpcs --filters Name=tag:Project,Values=$P --query 'Vpcs[0].VpcId' --output text)

run() { # run <file> <title> <aws args...>
  local f="$OUT/$1" t="$2"; shift 2
  { echo "# $t"; echo "\$ aws $*"; echo; aws "$@" 2>&1; echo; } >> "$f"
}
rm -f "$OUT"/*.txt

run 01-network.txt "VPC" ec2 describe-vpcs --vpc-ids "$VPC" --query 'Vpcs[].{VpcId:VpcId,Cidr:CidrBlock,Name:Tags[?Key==`Name`]|[0].Value}' --output table
run 01-network.txt "Subnets" ec2 describe-subnets --filters Name=vpc-id,Values="$VPC" --query 'sort_by(Subnets,&CidrBlock)[].{Name:Tags[?Key==`Name`]|[0].Value,Cidr:CidrBlock,AZ:AvailabilityZone,PublicIpOnLaunch:MapPublicIpOnLaunch}' --output table
run 01-network.txt "Route tables" ec2 describe-route-tables --filters Name=vpc-id,Values="$VPC" --query 'RouteTables[].{Name:Tags[?Key==`Name`]|[0].Value,Routes:join(`, `,Routes[].join(` -> `,[DestinationCidrBlock,GatewayId||NatGatewayId]))}' --output table
run 01-network.txt "Internet gateway" ec2 describe-internet-gateways --filters Name=attachment.vpc-id,Values="$VPC" --query 'InternetGateways[].{Id:InternetGatewayId,State:Attachments[0].State}' --output table
run 01-network.txt "NAT gateway" ec2 describe-nat-gateways --filter Name=vpc-id,Values="$VPC" --query 'NatGateways[].{Id:NatGatewayId,State:State,Subnet:SubnetId,PublicIp:NatGatewayAddresses[0].PublicIp}' --output table

run 02-compute.txt "EC2 instances" ec2 describe-instances --filters Name=vpc-id,Values="$VPC" Name=instance-state-name,Values=running --query 'Reservations[].Instances[].{Name:Tags[?Key==`Name`]|[0].Value,Id:InstanceId,Type:InstanceType,AZ:Placement.AvailabilityZone,PrivateIp:PrivateIpAddress,PublicIp:PublicIpAddress}' --output table
run 02-compute.txt "Auto Scaling Groups" autoscaling describe-auto-scaling-groups --auto-scaling-group-names $P-web-asg $P-app-asg --query 'AutoScalingGroups[].{Name:AutoScalingGroupName,Min:MinSize,Desired:DesiredCapacity,Max:MaxSize,HealthCheck:HealthCheckType,InService:length(Instances[?LifecycleState==`InService`])}' --output table
run 02-compute.txt "Scaling policies" autoscaling describe-policies --query 'ScalingPolicies[?starts_with(AutoScalingGroupName,`expense`)].{ASG:AutoScalingGroupName,Policy:PolicyName,Metric:TargetTrackingConfiguration.PredefinedMetricSpecification.PredefinedMetricType,Target:TargetTrackingConfiguration.TargetValue}' --output table
run 02-compute.txt "Running containers (via SSM)" ssm describe-instance-information --query 'InstanceInformationList[].{Id:InstanceId,Ping:PingStatus,Ip:IPAddress,Platform:PlatformName}' --output table

for SG in $(aws ec2 describe-security-groups --filters Name=vpc-id,Values="$VPC" Name=group-name,Values="$P-*" --query 'SecurityGroups[].GroupId' --output text); do
  run 03-security-groups.txt "Security group $SG" ec2 describe-security-groups --group-ids "$SG" --query 'SecurityGroups[].{Name:GroupName,Inbound:IpPermissions[].join(``,[to_string(FromPort),` from `,join(`,`,UserIdGroupPairs[].GroupId),join(`,`,IpRanges[].CidrIp)]),Outbound:IpPermissionsEgress[].join(``,[to_string(FromPort),` to `,join(`,`,UserIdGroupPairs[].GroupId),join(`,`,IpRanges[].CidrIp)])}' --output yaml
done

run 04-load-balancers.txt "Load balancers" elbv2 describe-load-balancers --names $P-public-alb $P-internal-alb --query 'LoadBalancers[].{Name:LoadBalancerName,Scheme:Scheme,DNS:DNSName,AZs:join(`,`,AvailabilityZones[].ZoneName)}' --output table
for TG in $(aws elbv2 describe-target-groups --names $P-web-tg $P-app-tg --query 'TargetGroups[].TargetGroupArn' --output text); do
  run 04-load-balancers.txt "Target group $(basename "$(dirname "$TG")")" elbv2 describe-target-health --target-group-arn "$TG" --query 'TargetHealthDescriptions[].{Target:Target.Id,Port:Target.Port,Health:TargetHealth.State}' --output table
done

run 05-database.txt "Database host" ec2 describe-instances --filters Name=tag:Name,Values=$P-mongodb Name=instance-state-name,Values=running --query 'Reservations[].Instances[].{Id:InstanceId,Type:InstanceType,PrivateIp:PrivateIpAddress,PublicIp:PublicIpAddress,Subnet:SubnetId,SG:SecurityGroups[0].GroupName}' --output table
run 05-database.txt "Persistent EBS data volume" ec2 describe-volumes --filters Name=tag:Name,Values=$P-db-data --query 'Volumes[].{Id:VolumeId,SizeGiB:Size,Type:VolumeType,Encrypted:Encrypted,State:State}' --output table
run 05-database.txt "S3 backup bucket" s3api list-buckets --query 'Buckets[?starts_with(Name,`expense-tracker-db-backups`)].{Name:Name,Created:CreationDate}' --output table

for R in web app; do
  run 06-ecr.txt "ECR images: $P-$R" ecr describe-images --repository-name $P-$R --query 'sort_by(imageDetails,&imagePushedAt)[].{Tag:imageTags[0],Pushed:imagePushedAt,SizeMB:to_string(imageSizeInBytes)}' --output table
done

run 09-secrets-monitoring.txt "Secrets Manager (names only, values never printed)" secretsmanager list-secrets --query 'SecretList[?starts_with(Name,`expense-tracker`)].{Name:Name,LastChanged:LastChangedDate}' --output table
run 09-secrets-monitoring.txt "Release tags in SSM" ssm get-parameters --names /$P/web/image_tag /$P/app/image_tag --query 'Parameters[].{Name:Name,Value:Value}' --output table
run 09-secrets-monitoring.txt "CloudWatch log groups" logs describe-log-groups --log-group-name-prefix /$P --query 'logGroups[].{Name:logGroupName,RetentionDays:retentionInDays}' --output table
run 09-secrets-monitoring.txt "CloudWatch alarms" cloudwatch describe-alarms --alarm-name-prefix $P --query 'MetricAlarms[].{Name:AlarmName,State:StateValue,Metric:MetricName}' --output table

echo "Evidence written to $OUT"
