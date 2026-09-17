variable "environment" {
  type        = string
  description = "The environment name (dev or prod)"
}

variable "node_count" {
  type        = number
  description = "Number of worker nodes for the cluster"
  default     = 3
}

# Placeholder for Kubernetes Cluster resource creation
# e.g., google_container_cluster, aws_eks_cluster, or azurerm_kubernetes_cluster
resource "null_resource" "cluster" {
  triggers = {
    env   = var.environment
    nodes = var.node_count
  }
}

output "cluster_name" {
  value = "${var.environment}-k8s-cluster"
}
