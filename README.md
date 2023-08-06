# Wait for ECR Replication Action

Waits for ECR repository replications to be succeeded on GitHub Actions.


## Getting Started

### Using Repository URI

```yaml
- uses: siketyan/wait-for-replication-action@v1
  with:
    repository_uri: 0123456789.dkr.ecr.ap-northeast-1.amazonaws.com/my-image
```

### Using Repository Name and Registry ID

```yaml
- uses: siketyan/wait-for-replication-action@v1
  with:
    repository_name: my-image
    registry_id: 0123456789  # Optional
```
