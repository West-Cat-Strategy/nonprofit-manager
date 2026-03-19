# Nonprofit Manager - Local CI/CD Makefile
# Run 'make help' for available commands
#
# This replaces GitHub Actions with local commands.
# All CI/CD operations can be run locally or via git hooks.

.PHONY: help install lint lint-rate-limit-keys lint-success-envelope lint-route-validation lint-express-validator lint-controller-sql lint-auth-guards lint-duplicate-tests lint-doc-api-versioning lint-v2-module-ownership lint-module-boundary lint-module-route-proxy lint-canonical-module-imports lint-implementation-size lint-frontend-feature-boundary lint-frontend-legacy-slice-imports lint-frontend-legacy-page-paths lint-backend-legacy-controller-wrappers lint-route-integrity lint-route-catalog-drift typecheck test test-coverage quality-baseline check-links build clean clean-local clean-all \
	security-audit security-scan ci ci-fast ci-full ci-unit \
        deploy deploy-staging deploy-local \
        docker-build docker-up docker-up-dev docker-up-tools docker-up-caddy docker-down docker-logs docker-rebuild docker-validate \
        db-migrate db-verify clean hooks test-e2e

# Colors for output
BLUE := \033[34m
GREEN := \033[32m
YELLOW := \033[33m
RED := \033[31m
RESET := \033[0m

# Default target
.DEFAULT_GOAL := help

DOCKER_COMPOSE ?= $(shell if docker compose version >/dev/null 2>&1; then echo "docker compose"; elif docker-compose version >/dev/null 2>&1; then echo "docker-compose"; else echo "docker compose"; fi)
PROD_ENV_FILE ?= .env.production
DEV_ENV_FILE ?= .env.development
COMPOSE_PROJECT_PROD ?= nonprofit-prod
COMPOSE_PROJECT_DEV ?= nonprofit-dev
COMPOSE_PROJECT_CI ?= nonprofit-ci
BACKEND_DOCKER_IMAGE ?= nonprofit-manager-backend:latest
FRONTEND_DOCKER_IMAGE ?= nonprofit-manager-frontend:latest
LEGACY_COMPOSE_STACK_FILES := docker-compose.yml docker-compose.tools.yml docker-compose.caddy.yml docker-compose.host-access.yml docker-compose.ci.yml docker-compose.db-encrypted.yml docker-compose.vps.yml docker-compose.plausible.yml docker-compose.elk.yml

COMPOSE_PROD_ARGS := -p $(COMPOSE_PROJECT_PROD) --env-file $(PROD_ENV_FILE) -f docker-compose.yml
COMPOSE_DEV_ARGS := -p $(COMPOSE_PROJECT_DEV) -f docker-compose.dev.yml
COMPOSE_DEV_TOOLS_ARGS := $(COMPOSE_DEV_ARGS) -f docker-compose.tools.yml --profile tools
COMPOSE_DEV_CADDY_ARGS := $(COMPOSE_DEV_ARGS) -f docker-compose.caddy.yml
COMPOSE_CI_INFRA_ARGS := -p $(COMPOSE_PROJECT_CI) -f docker-compose.yml -f docker-compose.host-access.yml -f docker-compose.ci.yml

#------------------------------------------------------------------------------
# Help
#------------------------------------------------------------------------------
help:
	@echo "$(BLUE)Nonprofit Manager - Local CI/CD$(RESET)"
	@echo ""
	@echo "$(GREEN)Development:$(RESET)"
	@echo "  make install        Install all dependencies"
	@echo "  make docker-build   Build backend/frontend Docker images directly"
	@echo "  make docker-validate Validate both Dockerfiles with clean direct builds"
	@echo "  make docker-rebuild Rebuild backend/frontend Docker images without cache"
	@echo "  make dev            Start the optional compose dev stack"
	@echo "  make docker-up-dev  Start the optional compose dev stack (hot reload)"
	@echo "  make docker-up      Start the compose stack"
	@echo "  make docker-up-tools Start the compose stack with tools profile"
	@echo "  make docker-up-caddy Start the dev compose stack behind Caddy"
	@echo "  make docker-down    Stop the optional compose dev stack"
	@echo "  make docker-logs    View optional compose dev stack logs"
	@echo ""
	@echo "$(GREEN)Quality Checks:$(RESET)"
	@echo "  make lint           Run linters on all projects"
	@echo "  make lint-express-validator Enforce no express-validator production usage"
	@echo "  make lint-controller-sql Enforce controller->service SQL boundary ratchet"
	@echo "  make lint-v2-module-ownership Enforce module-only imports in v2 registrar"
	@echo "  make lint-module-boundary Enforce migrated modules do not import legacy controllers"
	@echo "  make lint-module-route-proxy Enforce migrated module routes do not proxy @routes/*"
	@echo "  make lint-canonical-module-imports Enforce canonical module paths over legacy controller/service shims"
	@echo "  make lint-implementation-size Enforce implementation file size ratchet against baseline"
	@echo "  make lint-frontend-feature-boundary Enforce feature-page boundary ratchet"
	@echo "  make lint-frontend-legacy-slice-imports Enforce migrated features do not import store/slices"
	@echo "  make lint-frontend-legacy-page-paths Enforce deleted legacy page implementations stay removed"
	@echo "  make lint-backend-legacy-controller-wrappers Enforce deleted legacy controller wrappers stay removed"
	@echo "  make lint-route-integrity Enforce literal route targets resolve via routeCatalog"
	@echo "  make lint-route-catalog-drift Enforce routeCatalog stays aligned with registered routes"
	@echo "  make lint-fix       Run linters and auto-fix issues"
	@echo "  make typecheck      Run TypeScript type checking"
	@echo "  make test           Run all unit tests"
	@echo "  make test-coverage  Run tests with coverage report"
	@echo "  make quality-baseline Generate code quality baseline report"
	@echo "  make check-links    Validate markdown links"
	@echo ""
	@echo "$(GREEN)CI Pipelines:$(RESET)"
	@echo "  make ci             Run full CI (lint + typecheck + test + build)"
	@echo "  make ci-fast        Run quick CI (lint + typecheck only)"
	@echo "  make ci-full        Run CI with coverage and security audit"
	@echo "  make ci-unit        Run CI with unit-test coverage (no integration tests)"
	@echo ""
	@echo "$(GREEN)Security:$(RESET)"
	@echo "  make security-audit Run npm audit on all projects"
	@echo "  make security-scan  Run full security scan (audit + secrets)"
	@echo ""
	@echo "$(GREEN)Build & Deploy:$(RESET)"
	@echo "  make build          Build all projects"
	@echo "  make docker-build   Build Docker images"
	@echo "  make deploy-local   Deploy locally (rebuild containers)"
	@echo "  make deploy-staging Deploy to staging server"
	@echo "  make deploy         Deploy to production server"
	@echo ""
	@echo "$(GREEN)Database:$(RESET)"
	@echo "  make db-migrate     Run database migrations"
	@echo "  make db-verify      Verify migration files"
	@echo ""
	@echo "$(GREEN)Setup:$(RESET)"
	@echo "  make hooks          Install git hooks for local CI"
	@echo "  make clean          Clean build artifacts"

#------------------------------------------------------------------------------
# Installation
#------------------------------------------------------------------------------
install:
	@echo "$(BLUE)Installing backend dependencies...$(RESET)"
	cd backend && npm ci
	@echo "$(BLUE)Installing frontend dependencies...$(RESET)"
	cd frontend && npm ci
	@echo "$(GREEN)All dependencies installed!$(RESET)"

install-dev: install hooks
	@echo "$(BLUE)Installing development tools...$(RESET)"
	@command -v gitleaks >/dev/null 2>&1 || echo "$(YELLOW)Tip: Install gitleaks for secret scanning: brew install gitleaks$(RESET)"
	@echo "$(GREEN)Development environment ready!$(RESET)"

#------------------------------------------------------------------------------
# Development
#------------------------------------------------------------------------------
dev: docker-up-dev
	@echo ""
	@echo "$(GREEN)Development environment started!$(RESET)"
	@echo "  Frontend: http://localhost:8005"
	@echo "  Backend:  http://localhost:8004"
	@echo "  Database: localhost:8002"
	@echo "  Redis:    localhost:8003"
	@echo ""

docker-up:
	@missing=0; \
	for file in $(LEGACY_COMPOSE_STACK_FILES); do \
	  if [ ! -f "$$file" ]; then \
	    echo "$(YELLOW)Required compose manifest missing: $$file$(RESET)"; \
	    missing=1; \
	  fi; \
	done; \
	if [ $$missing -ne 0 ]; then \
	  echo "$(RED)Compose stack target is unavailable until the manifests are restored.$(RESET)"; \
	  exit 1; \
	fi
	$(DOCKER_COMPOSE) $(COMPOSE_PROD_ARGS) up -d

docker-up-dev:
	$(DOCKER_COMPOSE) $(COMPOSE_DEV_ARGS) up -d

docker-up-tools:
	@missing=0; \
	for file in $(LEGACY_COMPOSE_STACK_FILES); do \
	  if [ ! -f "$$file" ]; then \
	    echo "$(YELLOW)Required compose manifest missing: $$file$(RESET)"; \
	    missing=1; \
	  fi; \
	done; \
	if [ $$missing -ne 0 ]; then \
	  echo "$(RED)Compose stack target is unavailable until the manifests are restored.$(RESET)"; \
	  exit 1; \
	fi
	$(DOCKER_COMPOSE) $(COMPOSE_DEV_TOOLS_ARGS) up -d

docker-up-caddy:
	@missing=0; \
	for file in $(LEGACY_COMPOSE_STACK_FILES); do \
	  if [ ! -f "$$file" ]; then \
	    echo "$(YELLOW)Required compose manifest missing: $$file$(RESET)"; \
	    missing=1; \
	  fi; \
	done; \
	if [ $$missing -ne 0 ]; then \
	  echo "$(RED)Compose stack target is unavailable until the manifests are restored.$(RESET)"; \
	  exit 1; \
	fi
	CADDY_BACKEND_UPSTREAM=host.docker.internal:8004 \
	CADDY_FRONTEND_UPSTREAM=host.docker.internal:8005 \
	CADDY_DOMAIN=localhost \
	$(DOCKER_COMPOSE) $(COMPOSE_DEV_CADDY_ARGS) up -d

docker-down:
	$(DOCKER_COMPOSE) $(COMPOSE_DEV_ARGS) down --remove-orphans
	@echo "$(YELLOW)Only the compose dev stack can be stopped from this checkout.$(RESET)"

docker-logs:
	$(DOCKER_COMPOSE) $(COMPOSE_DEV_ARGS) logs -f

docker-build:
	docker build -f backend/Dockerfile -t $(BACKEND_DOCKER_IMAGE) backend
	docker build -f frontend/Dockerfile -t $(FRONTEND_DOCKER_IMAGE) frontend
	@echo "$(GREEN)Docker images built!$(RESET)"

docker-rebuild:
	docker build --no-cache -f backend/Dockerfile -t $(BACKEND_DOCKER_IMAGE) backend
	docker build --no-cache -f frontend/Dockerfile -t $(FRONTEND_DOCKER_IMAGE) frontend
	@echo "$(GREEN)Docker images rebuilt without cache!$(RESET)"

docker-validate:
	docker build --pull --no-cache -f backend/Dockerfile backend
	docker build --pull --no-cache -f frontend/Dockerfile frontend
	@echo "$(GREEN)Dockerfile validation complete!$(RESET)"

#------------------------------------------------------------------------------
# Quality Checks
#------------------------------------------------------------------------------
lint:
	@echo "$(BLUE)Linting backend...$(RESET)"
	cd backend && npm run lint
	@echo "$(BLUE)Checking rate-limit key policy...$(RESET)"
	node scripts/check-rate-limit-key-policy.ts
	@echo "$(BLUE)Checking success envelope policy...$(RESET)"
	node scripts/check-success-envelope-policy.ts
	@echo "$(BLUE)Checking route validation policy...$(RESET)"
	node scripts/check-route-validation-policy.ts
	@echo "$(BLUE)Checking query contract policy...$(RESET)"
	node scripts/check-query-contract-policy.ts
	@echo "$(BLUE)Checking express-validator migration policy...$(RESET)"
	node scripts/check-express-validator-policy.ts
	@echo "$(BLUE)Checking controller SQL boundary policy...$(RESET)"
	node scripts/check-controller-sql-policy.ts
	@echo "$(BLUE)Checking legacy auth guard policy...$(RESET)"
	node scripts/check-auth-guard-policy.ts
	@echo "$(BLUE)Checking migration manifest policy...$(RESET)"
	node scripts/check-migration-manifest-policy.ts
	@echo "$(BLUE)Checking duplicate backend test paths...$(RESET)"
	node scripts/check-duplicate-test-tree.ts
	@echo "$(BLUE)Checking docs API versioning policy...$(RESET)"
	node scripts/check-doc-api-versioning.ts
	@echo "$(BLUE)Checking v2 module ownership policy...$(RESET)"
	node scripts/check-v2-module-ownership-policy.ts
	@echo "$(BLUE)Checking module boundary policy...$(RESET)"
	node scripts/check-module-boundary-policy.ts
	@echo "$(BLUE)Checking module route proxy policy...$(RESET)"
	node scripts/check-module-route-proxy-policy.ts
	@echo "$(BLUE)Checking canonical module import policy...$(RESET)"
	node scripts/check-canonical-module-import-policy.ts
	@echo "$(BLUE)Checking implementation size policy...$(RESET)"
	node scripts/check-implementation-size-policy.ts
	@echo "$(BLUE)Checking frontend feature boundary policy...$(RESET)"
	node scripts/check-frontend-feature-boundary-policy.ts
	@echo "$(BLUE)Checking frontend legacy slice import policy...$(RESET)"
	node scripts/check-frontend-legacy-slice-import-policy.ts
	@echo "$(BLUE)Checking frontend legacy page path policy...$(RESET)"
	node scripts/check-frontend-legacy-page-path-policy.ts
	@echo "$(BLUE)Checking route integrity...$(RESET)"
	node scripts/check-route-integrity.ts
	@echo "$(BLUE)Checking route catalog drift...$(RESET)"
	node scripts/check-route-catalog-drift.ts
	@echo "$(BLUE)Checking backend legacy controller wrapper policy...$(RESET)"
	node scripts/check-backend-legacy-controller-wrapper-policy.ts
	@echo "$(BLUE)Linting frontend...$(RESET)"
	cd frontend && npm run lint
	@echo "$(GREEN)Linting complete!$(RESET)"

lint-rate-limit-keys:
	@echo "$(BLUE)Checking rate-limit key policy...$(RESET)"
	node scripts/check-rate-limit-key-policy.ts
	@echo "$(GREEN)Rate-limit key policy check complete!$(RESET)"

lint-success-envelope:
	@echo "$(BLUE)Checking success envelope policy...$(RESET)"
	node scripts/check-success-envelope-policy.ts
	@echo "$(GREEN)Success envelope policy check complete!$(RESET)"

lint-route-validation:
	@echo "$(BLUE)Checking route validation policy...$(RESET)"
	node scripts/check-route-validation-policy.ts
	@echo "$(GREEN)Route validation policy check complete!$(RESET)"

lint-query-contract:
	@echo "$(BLUE)Checking query contract policy...$(RESET)"
	node scripts/check-query-contract-policy.ts
	@echo "$(GREEN)Query contract policy check complete!$(RESET)"

lint-express-validator:
	@echo "$(BLUE)Checking express-validator migration policy...$(RESET)"
	node scripts/check-express-validator-policy.ts
	@echo "$(GREEN)Express-validator migration policy check complete!$(RESET)"

lint-controller-sql:
	@echo "$(BLUE)Checking controller SQL boundary policy...$(RESET)"
	node scripts/check-controller-sql-policy.ts
	@echo "$(GREEN)Controller SQL boundary policy check complete!$(RESET)"

lint-auth-guards:
	@echo "$(BLUE)Checking legacy auth guard policy...$(RESET)"
	node scripts/check-auth-guard-policy.ts
	@echo "$(GREEN)Legacy auth guard policy check complete!$(RESET)"

lint-migration-manifest:
	@echo "$(BLUE)Checking migration manifest policy...$(RESET)"
	node scripts/check-migration-manifest-policy.ts
	@echo "$(GREEN)Migration manifest policy check complete!$(RESET)"

lint-duplicate-tests:
	@echo "$(BLUE)Checking duplicate backend test paths...$(RESET)"
	node scripts/check-duplicate-test-tree.ts
	@echo "$(GREEN)Duplicate backend test-path check complete!$(RESET)"

lint-doc-api-versioning:
	@echo "$(BLUE)Checking docs API versioning policy...$(RESET)"
	node scripts/check-doc-api-versioning.ts
	@echo "$(GREEN)Docs API versioning check complete!$(RESET)"

lint-v2-module-ownership:
	@echo "$(BLUE)Checking v2 module ownership policy...$(RESET)"
	node scripts/check-v2-module-ownership-policy.ts
	@echo "$(GREEN)V2 module ownership check complete!$(RESET)"

lint-module-boundary:
	@echo "$(BLUE)Checking module boundary policy...$(RESET)"
	node scripts/check-module-boundary-policy.ts
	@echo "$(GREEN)Module boundary check complete!$(RESET)"

lint-module-route-proxy:
	@echo "$(BLUE)Checking module route proxy policy...$(RESET)"
	node scripts/check-module-route-proxy-policy.ts
	@echo "$(GREEN)Module route proxy check complete!$(RESET)"

lint-canonical-module-imports:
	@echo "$(BLUE)Checking canonical module import policy...$(RESET)"
	node scripts/check-canonical-module-import-policy.ts
	@echo "$(GREEN)Canonical module import policy check complete!$(RESET)"

lint-implementation-size:
	@echo "$(BLUE)Checking implementation size policy...$(RESET)"
	node scripts/check-implementation-size-policy.ts
	@echo "$(GREEN)Implementation size policy check complete!$(RESET)"

lint-route-integrity:
	@echo "$(BLUE)Checking route integrity...$(RESET)"
	node scripts/check-route-integrity.ts
	@echo "$(GREEN)Route integrity check complete!$(RESET)"

lint-route-catalog-drift:
	@echo "$(BLUE)Checking route catalog drift...$(RESET)"
	node scripts/check-route-catalog-drift.ts
	@echo "$(GREEN)Route catalog drift check complete!$(RESET)"

lint-frontend-feature-boundary:
	@echo "$(BLUE)Checking frontend feature boundary policy...$(RESET)"
	node scripts/check-frontend-feature-boundary-policy.ts
	@echo "$(GREEN)Frontend feature boundary check complete!$(RESET)"

lint-frontend-legacy-slice-imports:
	@echo "$(BLUE)Checking frontend legacy slice import policy...$(RESET)"
	node scripts/check-frontend-legacy-slice-import-policy.ts
	@echo "$(GREEN)Frontend legacy slice import check complete!$(RESET)"

lint-frontend-legacy-page-paths:
	@echo "$(BLUE)Checking frontend legacy page path policy...$(RESET)"
	node scripts/check-frontend-legacy-page-path-policy.ts
	@echo "$(GREEN)Frontend legacy page path check complete!$(RESET)"

lint-backend-legacy-controller-wrappers:
	@echo "$(BLUE)Checking backend legacy controller wrapper policy...$(RESET)"
	node scripts/check-backend-legacy-controller-wrapper-policy.ts
	@echo "$(GREEN)Backend legacy controller wrapper check complete!$(RESET)"

lint-fix:
	@echo "$(BLUE)Fixing lint issues in backend...$(RESET)"
	cd backend && npm run lint -- --fix || true
	@echo "$(BLUE)Fixing lint issues in frontend...$(RESET)"
	cd frontend && npm run lint -- --fix || true
	@echo "$(GREEN)Lint fixes applied!$(RESET)"

typecheck:
	@echo "$(BLUE)Type checking backend...$(RESET)"
	cd backend && npm run type-check
	@echo "$(BLUE)Type checking frontend...$(RESET)"
	cd frontend && npm run type-check
	@echo "$(GREEN)Type checking complete!$(RESET)"

test:
	@echo "$(BLUE)Ensuring test infrastructure is running (Redis)...$(RESET)"
	DB_PASSWORD=postgres $(DOCKER_COMPOSE) $(COMPOSE_CI_INFRA_ARGS) up -d redis
	@echo "$(BLUE)Applying pending database migrations...$(RESET)"
	@COMPOSE_MODE=ci COMPOSE_ENV_FILE=$(DEV_ENV_FILE) COMPOSE_PROJECT_NAME=$(COMPOSE_PROJECT_CI) COMPOSE_FILES="docker-compose.yml docker-compose.host-access.yml docker-compose.ci.yml" ./scripts/db-migrate.sh
	@echo "$(BLUE)Running backend tests...$(RESET)"
	cd backend && npm test -- --runInBand
	@echo "$(BLUE)Running frontend tests...$(RESET)"
	cd frontend && npm test -- --run
	@echo "$(BLUE)Running Playwright E2E tests (all browsers)...$(RESET)"
	cd e2e && npm run test:ci
	@echo "$(GREEN)Tests complete!$(RESET)"

test-coverage:
	@echo "$(BLUE)Ensuring test infrastructure is running (Redis)...$(RESET)"
	DB_PASSWORD=postgres $(DOCKER_COMPOSE) $(COMPOSE_CI_INFRA_ARGS) up -d redis
	@echo "$(BLUE)Applying pending database migrations...$(RESET)"
	@COMPOSE_MODE=ci COMPOSE_ENV_FILE=$(DEV_ENV_FILE) COMPOSE_PROJECT_NAME=$(COMPOSE_PROJECT_CI) COMPOSE_FILES="docker-compose.yml docker-compose.host-access.yml docker-compose.ci.yml" ./scripts/db-migrate.sh
	@echo "$(BLUE)Running backend tests with coverage...$(RESET)"
	cd backend && npm test -- --coverage --runInBand
	@echo "$(BLUE)Running frontend tests with coverage...$(RESET)"
	cd frontend && npm test -- --run --coverage
	@echo "$(BLUE)Running Playwright E2E smoke tests...$(RESET)"
	cd e2e && npm run test:smoke
	@echo "$(GREEN)Coverage reports generated!$(RESET)"

test-backend:
	DB_PASSWORD=postgres $(DOCKER_COMPOSE) $(COMPOSE_CI_INFRA_ARGS) up -d redis
	@COMPOSE_MODE=ci COMPOSE_ENV_FILE=$(DEV_ENV_FILE) COMPOSE_PROJECT_NAME=$(COMPOSE_PROJECT_CI) COMPOSE_FILES="docker-compose.yml docker-compose.host-access.yml docker-compose.ci.yml" ./scripts/db-migrate.sh
	cd backend && npm test -- --runInBand

test-frontend:
	cd frontend && npm test -- --run

test-e2e:
	DB_PASSWORD=postgres $(DOCKER_COMPOSE) $(COMPOSE_CI_INFRA_ARGS) up -d redis
	@COMPOSE_MODE=ci COMPOSE_ENV_FILE=$(DEV_ENV_FILE) COMPOSE_PROJECT_NAME=$(COMPOSE_PROJECT_CI) COMPOSE_FILES="docker-compose.yml docker-compose.host-access.yml docker-compose.ci.yml" ./scripts/db-migrate.sh
	cd e2e && npm run test:ci

quality-baseline:
	@./scripts/quality-baseline.sh

check-links:
	@./scripts/check-links.sh

#------------------------------------------------------------------------------
# Security
#------------------------------------------------------------------------------
security-audit:
	@echo "$(BLUE)Running npm audit on backend...$(RESET)"
	cd backend && npm audit --audit-level=high || true
	@echo ""
	@echo "$(BLUE)Running npm audit on frontend...$(RESET)"
	cd frontend && npm audit --audit-level=high || true
	@echo ""
	@echo "$(GREEN)Security audit complete!$(RESET)"

security-scan:
	@echo "$(BLUE)Running full security scan...$(RESET)"
	@./scripts/security-scan.sh

#------------------------------------------------------------------------------
# Build
#------------------------------------------------------------------------------
build:
	@echo "$(BLUE)Building backend...$(RESET)"
	cd backend && npm run build
	@echo "$(BLUE)Building frontend...$(RESET)"
	cd frontend && npm run build
	@echo "$(BLUE)Checking frontend bundle budgets...$(RESET)"
	node scripts/check-frontend-bundle-size.js
	@echo "$(GREEN)Build complete!$(RESET)"

build-backend:
	cd backend && npm run build

build-frontend:
	cd frontend && npm run build
	node scripts/check-frontend-bundle-size.js

#------------------------------------------------------------------------------
# CI Pipelines (replaces GitHub Actions)
#------------------------------------------------------------------------------
ci:
	@echo ""
	@echo "$(BLUE)========================================$(RESET)"
	@echo "$(BLUE)  Running Local CI Pipeline$(RESET)"
	@echo "$(BLUE)========================================$(RESET)"
	@echo ""
	@./scripts/local-ci.sh --build
	@echo ""
	@echo "$(GREEN)========================================$(RESET)"
	@echo "$(GREEN)  CI Pipeline Passed!$(RESET)"
	@echo "$(GREEN)========================================$(RESET)"

ci-fast:
	@echo ""
	@echo "$(BLUE)========================================$(RESET)"
	@echo "$(BLUE)  Running Fast CI (no tests)$(RESET)"
	@echo "$(BLUE)========================================$(RESET)"
	@echo ""
	@./scripts/local-ci.sh --fast
	@echo ""
	@echo "$(GREEN)========================================$(RESET)"
	@echo "$(GREEN)  Fast CI Passed!$(RESET)"
	@echo "$(GREEN)========================================$(RESET)"

ci-full:
	@echo ""
	@echo "$(BLUE)========================================$(RESET)"
	@echo "$(BLUE)  Running Full CI + Security$(RESET)"
	@echo "$(BLUE)========================================$(RESET)"
	@echo ""
	@./scripts/local-ci.sh --build --audit --coverage
	@echo ""
	@echo "$(GREEN)========================================$(RESET)"
	@echo "$(GREEN)  Full CI Pipeline Passed!$(RESET)"
	@echo "$(GREEN)========================================$(RESET)"

ci-unit:
	@echo ""
	@echo "$(BLUE)========================================$(RESET)"
	@echo "$(BLUE)  Running Unit CI + Coverage$(RESET)"
	@echo "$(BLUE)========================================$(RESET)"
	@echo ""
	@./scripts/local-ci.sh --build --coverage --unit-only
	@echo ""
	@echo "$(GREEN)========================================$(RESET)"
	@echo "$(GREEN)  Unit CI Pipeline Passed!$(RESET)"
	@echo "$(GREEN)========================================$(RESET)"

#------------------------------------------------------------------------------
# Database
#------------------------------------------------------------------------------
db-migrate:
	@echo "$(BLUE)Running database migrations...$(RESET)"
	@./scripts/db-migrate.sh

db-verify:
	@echo "$(BLUE)Verifying migrations...$(RESET)"
	@./scripts/verify-migrations.sh

#------------------------------------------------------------------------------
# Deployment (replaces GitHub Actions deploy workflow)
#------------------------------------------------------------------------------
deploy-local:
	@echo "$(BLUE)Deploying locally (Docker rebuild)...$(RESET)"
	@./scripts/deploy.sh local

deploy-staging:
	@echo "$(BLUE)Deploying to staging...$(RESET)"
	@./scripts/deploy.sh staging

deploy:
	@echo "$(BLUE)Deploying to production...$(RESET)"
	@./scripts/deploy.sh production

#------------------------------------------------------------------------------
# Git Hooks (replaces GitHub Actions PR checks)
#------------------------------------------------------------------------------
hooks:
	@echo "$(BLUE)Installing git hooks...$(RESET)"
	@./scripts/install-git-hooks.sh
	@echo "$(GREEN)Git hooks installed!$(RESET)"
	@echo ""
	@echo "Hooks will run:"
	@echo "  - pre-commit: Lint staged files"
	@echo "  - pre-push: Run typecheck"
	@echo ""
	@echo "To skip: git commit --no-verify"

#------------------------------------------------------------------------------
# Cleanup
#------------------------------------------------------------------------------
clean:
	@echo "$(BLUE)Cleaning build artifacts...$(RESET)"
	rm -rf backend/dist
	rm -rf frontend/dist
	rm -rf backend/coverage
	rm -rf frontend/coverage
	rm -rf security-reports
	@echo "$(GREEN)Clean complete!$(RESET)"

clean-local:
	@echo "$(BLUE)Cleaning local artifacts...$(RESET)"
	rm -rf backend/logs
	rm -rf backend/exports
	rm -rf backend/coverage
	rm -rf backend/dist
	rm -rf backend/dist.bak
	rm -rf frontend/dist
	rm -rf frontend/coverage
	rm -rf .playwright-cli
	rm -rf tmp
	rm -rf e2e/playwright-report
	rm -rf logs
	@echo "$(GREEN)Local cleanup complete!$(RESET)"

clean-all: clean
	@echo "$(BLUE)Cleaning node_modules...$(RESET)"
	rm -rf backend/node_modules
	rm -rf frontend/node_modules
	@echo "$(GREEN)Full clean complete!$(RESET)"
