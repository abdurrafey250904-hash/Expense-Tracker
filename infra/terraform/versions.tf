terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.70"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

provider "aws" {
  region = var.aws_region

  # Every resource is tagged so cost, ownership and SSM deployment targeting work.
  default_tags {
    tags = {
      Project   = var.project
      ManagedBy = "terraform"
      Course    = "SE-490-CEA"
    }
  }
}

data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

locals {
  name = var.project
  azs  = slice(data.aws_availability_zones.available.names, 0, 2)
}
