# SpendSync CI/CD Pipeline

This directory contains the GitHub Actions workflows for SpendSync's Continuous Integration and Continuous Deployment pipeline.

## Workflows

### CI/CD (`ci-cd.yml`)

The main workflow that handles:

1. **Linting** - Validates code style and quality
2. **Testing** - Runs unit and integration tests with MongoDB service
3. **Building** - Builds Docker images for all microservices and pushes to DockerHub
4. **Deployment** - Deploys to the development environment (develop branch only)

This workflow runs automatically on push to main and develop branches.

### PR Validation (`pr-validation.yml`)

This workflow validates pull requests by:

1. Checking code style and quality
2. Running unit tests
3. Verifying code coverage meets the minimum threshold (70%)
4. Validating semantic PR titles (using conventional commits format)

### Release (`release.yml`)

This workflow is triggered when a release is published, and it:

1. Builds all microservice Docker images
2. Tags them with the version number and latest
3. Pushes the images to DockerHub
4. Creates a deployment artifact package
5. Attaches it to the GitHub release

## Development Deployment

The development deployment uses:

- `docker-compose.dev.yml` - Docker Compose configuration for the development environment
- `.env.dev` - Environment variables for the development deployment

The deployment is done via SSH to the development server, where it:
1. Creates a deployment directory
2. Copies the configuration files
3. Pulls the latest Docker images
4. Starts the services with Docker Compose

## Production Deployment

For production deployment:
1. Create a GitHub release, which will trigger the release workflow
2. Download the deployment package from the release
3. Extract it to your production server
4. Configure environment variables
5. Run with Docker Compose

## Required Secrets

To use these workflows, the following secrets need to be configured in your GitHub repository:

| Secret | Description |
|--------|-------------|
| `DOCKERHUB_USERNAME` | DockerHub username for pushing images |
| `DOCKERHUB_TOKEN` | DockerHub access token |
| `SSH_PRIVATE_KEY` | SSH private key for development server access |
| `SSH_USER` | SSH username for development server |
| `SSH_HOST` | SSH host address for development server |
| `KNOWN_HOSTS` | Known hosts configuration for SSH |

## Manual Deployment

You can also manually trigger a deployment using the provided script:

```bash
# Set deployment server information
export SSH_USER=your-username
export SSH_HOST=your-server.example.com

# Run the deployment script
./scripts/deploy-dev.sh
```

Or trigger the workflow manually:

```bash
# Deploy to development
gh workflow run ci-cd.yml -r develop
```

## Adding New Services

When adding a new microservice to the stack:

1. Add the service to the `docker-compose.dev.yml` file
2. Add a new build and push step in the `ci-cd.yml` workflow
3. Add the service to the `release.yml` workflow
4. Update environment variables in `.env.dev` if needed 