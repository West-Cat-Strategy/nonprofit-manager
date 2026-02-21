# Nonprofit Manager Configuration
# Common settings used across scripts

# Project settings
PROJECT_NAME="nonprofit-manager"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Docker settings
DOCKER_COMPOSE_FILE="docker-compose.yml"
DOCKER_COMPOSE_DEV_FILE="docker-compose.dev.yml"
DOCKER_COMPOSE_TOOLS_FILE="docker-compose.tools.yml"

# Container names
DB_CONTAINER="nonprofit-db"
DB_DEV_CONTAINER="nonprofit-db-dev"
REDIS_CONTAINER="nonprofit-redis"
REDIS_DEV_CONTAINER="nonprofit-redis-dev"
BACKEND_CONTAINER="nonprofit-backend"
BACKEND_DEV_CONTAINER="nonprofit-backend-dev"
FRONTEND_CONTAINER="nonprofit-frontend"
FRONTEND_DEV_CONTAINER="nonprofit-frontend-dev"

# Database settings
DB_USER="postgres"
DB_NAME="nonprofit_manager"
DB_HOST="localhost"
DB_PORT="8012"
DB_DEV_PORT="8002"
REDIS_PORT="8013"
REDIS_DEV_PORT="8003"

# Service ports (development)
BACKEND_DEV_PORT="8004"
FRONTEND_DEV_PORT="8005"

# Service ports (production)
BACKEND_PORT="3000"
FRONTEND_PORT="8001"

# API settings
API_BASE_URL="http://localhost:3000/api"
API_DEV_URL="http://localhost:8004/api"

# Health check settings
HEALTH_CHECK_TIMEOUT="30"
HEALTH_CHECK_RETRIES="3"
HEALTH_CHECK_INTERVAL="10"

# Backup settings
BACKUP_DIR="database/backups"
BACKUP_RETENTION_DAYS="7"
BACKUP_COMPRESSION="true"

# Migration settings
MIGRATIONS_DIR="database/migrations"
SEEDS_DIR="database/seeds"

# CI settings
CI_TIMEOUT="300"  # 5 minutes
CI_PARALLEL_JOBS="2"

# Security settings
SECURITY_REPORT_DIR="security-reports"
VULNERABILITY_LEVEL="moderate"

# Deployment settings
DEPLOY_CONFIG_FILE=".deploy.conf"
DEPLOY_HISTORY_FILE=".deploy-history"

# Git settings
GIT_HOOKS_DIR="scripts/hooks"

# Export all variables
export PROJECT_NAME PROJECT_ROOT
export DOCKER_COMPOSE_FILE DOCKER_COMPOSE_DEV_FILE DOCKER_COMPOSE_TOOLS_FILE
export DB_CONTAINER DB_DEV_CONTAINER REDIS_CONTAINER REDIS_DEV_CONTAINER
export BACKEND_CONTAINER BACKEND_DEV_CONTAINER FRONTEND_CONTAINER FRONTEND_DEV_CONTAINER
export DB_USER DB_NAME DB_HOST DB_PORT DB_DEV_PORT REDIS_PORT REDIS_DEV_PORT
export BACKEND_DEV_PORT FRONTEND_DEV_PORT BACKEND_PORT FRONTEND_PORT
export API_BASE_URL API_DEV_URL
export HEALTH_CHECK_TIMEOUT HEALTH_CHECK_RETRIES HEALTH_CHECK_INTERVAL
export BACKUP_DIR BACKUP_RETENTION_DAYS BACKUP_COMPRESSION
export MIGRATIONS_DIR SEEDS_DIR
export CI_TIMEOUT CI_PARALLEL_JOBS
export SECURITY_REPORT_DIR VULNERABILITY_LEVEL
export DEPLOY_CONFIG_FILE DEPLOY_HISTORY_FILE
export GIT_HOOKS_DIR
