terraform {
  required_version = ">= 1.7.0"
  
  backend "http" {
    # address        = "https://gitlab.com/api/v4/projects/<PROJECT_ID>/terraform/state/prod"
    # lock_address   = "https://gitlab.com/api/v4/projects/<PROJECT_ID>/terraform/state/prod/lock"
    # unlock_address = "https://gitlab.com/api/v4/projects/<PROJECT_ID>/terraform/state/prod/lock"
  }
}

provider "kubernetes" {
  # Configuration for Kubernetes provider (Prod Cluster)
}

# 1. Prod Kubernetes Cluster
module "k8s_cluster" {
  source = "../../modules/k8s-cluster"
  
  environment = "prod"
  node_count  = 5
}
