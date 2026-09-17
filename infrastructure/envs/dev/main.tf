terraform {
  required_version = ">= 1.7.0"
  
  # Using the GitHub/GitLab HTTP backend for state storage
  # Ensure you configure credentials in the CI pipeline
  backend "http" {
    # address        = "https://gitlab.com/api/v4/projects/<PROJECT_ID>/terraform/state/dev"
    # lock_address   = "https://gitlab.com/api/v4/projects/<PROJECT_ID>/terraform/state/dev/lock"
    # unlock_address = "https://gitlab.com/api/v4/projects/<PROJECT_ID>/terraform/state/dev/lock"
  }
}

provider "kubernetes" {
  # Configuration for Kubernetes provider (Dev Cluster)
}

# 1. Dev Kubernetes Cluster
module "k8s_cluster" {
  source = "../../modules/k8s-cluster"
  
  environment = "dev"
  node_count  = 2
}

# 2. Database
# module "database" {
#   source = "../../modules/database"
#   environment = "dev"
# }
