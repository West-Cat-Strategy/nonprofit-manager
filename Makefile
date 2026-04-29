# Nonprofit Manager - Local CI/CD Makefile
# Run 'make help' for available commands
#
# Local make targets are the canonical CI/security/release command surface.
# GitHub hosts the repo, but tracked workflows do not execute CI/CD.

.PHONY: help install install-dev lint lint-rate-limit-keys lint-success-envelope lint-route-validation lint-express-validator lint-controller-sql lint-query-contract lint-auth-guards lint-migration-manifest lint-duplicate-tests lint-doc-api-versioning lint-v2-module-ownership lint-module-boundary lint-module-route-proxy lint-canonical-module-imports lint-implementation-size lint-frontend-feature-boundary lint-frontend-legacy-slice-imports lint-frontend-legacy-page-paths lint-backend-legacy-controller-wrappers lint-route-integrity lint-route-catalog-drift typecheck test test-backend test-frontend test-e2e test-e2e-docker-smoke test-coverage test-coverage-full test-tooling quality-baseline check-links build build-backend build-frontend clean clean-local clean-all \
	security-audit security-scan ci ci-fast ci-full ci-unit \
        release-check release-staging release-production deploy deploy-staging deploy-local \
        docker-build docker-up docker-up-dev docker-up-caddy docker-down docker-logs docker-rebuild docker-validate \
        db-migrate db-verify doctor check-changed hooks

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
COMPOSE_PROJECT_SMOKE ?= nonprofit-smoke
CI_REDIS_URL ?= redis://redis:6379
CI_BACKEND_COVERAGE_NODE_OPTIONS ?= --max-old-space-size=8192
DEV_DB_PORT ?= 8002
DEV_REDIS_PORT ?= 8003
DEV_BACKEND_PORT ?= 8004
DEV_FRONTEND_PORT ?= 8005
DEV_PUBLIC_SITE_PORT ?= 8006
SMOKE_DB_PORT ?= 18002
SMOKE_REDIS_PORT ?= 18003
SMOKE_BACKEND_PORT ?= 18004
SMOKE_FRONTEND_PORT ?= 18005
SMOKE_PUBLIC_SITE_PORT ?= 18006
KEEP_SMOKE_STACK ?= 0
BACKEND_DOCKER_IMAGE ?= nonprofit-manager-backend:latest
FRONTEND_DOCKER_IMAGE ?= nonprofit-manager-frontend:latest
DOCKER_WORKSPACE_BUILD_CONTEXT ?= --build-context workspace=.
DOCKER_DIRECT_BUILD_HELPER := DOCKER_WORKSPACE_BUILD_CONTEXT="$(DOCKER_WORKSPACE_BUILD_CONTEXT)" BACKEND_DOCKER_IMAGE="$(BACKEND_DOCKER_IMAGE)" FRONTEND_DOCKER_IMAGE="$(FRONTEND_DOCKER_IMAGE)" ./scripts/docker-build-images.sh

COMPOSE_PROD_ARGS := -p $(COMPOSE_PROJECT_PROD) --env-file $(PROD_ENV_FILE) -f docker-compose.yml
COMPOSE_DEV_ARGS := -p $(COMPOSE_PROJECT_DEV) -f docker-compose.dev.yml
COMPOSE_DEV_CADDY_ARGS := $(COMPOSE_DEV_ARGS) -f docker-compose.caddy.yml
COMPOSE_DEV_SMOKE_ARGS := -p $(COMPOSE_PROJECT_SMOKE) -f docker-compose.dev.yml
COMPOSE_CI_INFRA_ARGS := -p $(COMPOSE_PROJECT_CI) -f docker-compose.yml -f docker-compose.host-access.yml -f docker-compose.ci.yml
E2E_NPM_RUN := cd e2e && npm run
CI_INFRA_ENV := REDIS_URL=$(CI_REDIS_URL) DB_PASSWORD=postgres
CI_BACKEND_COVERAGE_ENV := REDIS_URL=$(CI_REDIS_URL) NODE_OPTIONS=$(CI_BACKEND_COVERAGE_NODE_OPTIONS)
CI_TEST_DB_ENV := DB_HOST=127.0.0.1 DB_PORT=8012 DB_NAME=nonprofit_manager_test DB_USER=postgres DB_PASSWORD=postgres COMPOSE_MODE=ci
SMOKE_STACK_ENV := COMPOSE_PROJECT_NAME=$(COMPOSE_PROJECT_SMOKE) DEV_DB_PORT=$(SMOKE_DB_PORT) DEV_REDIS_PORT=$(SMOKE_REDIS_PORT) DEV_BACKEND_PORT=$(SMOKE_BACKEND_PORT) DEV_FRONTEND_PORT=$(SMOKE_FRONTEND_PORT) DEV_PUBLIC_SITE_PORT=$(SMOKE_PUBLIC_SITE_PORT) DEV_BYPASS_REGISTRATION_POLICY_IN_TEST=true DEV_BYPASS_MFA_FOR_TESTS=true

#------------------------------------------------------------------------------
# Help
#------------------------------------------------------------------------------
help:
	@echo "$(BLUE)Nonprofit Manager - Local CI/CD$(RESET)"
	@echo ""
	@echo "$(GREEN)Development:$(RESET)"
	@echo "  make install        Install all dependencies"
	@echo "  make install-dev    Install dependencies plus git hooks and dev tooling"
	@echo "  make docker-build   Build backend/frontend Docker images directly"
	@echo "  make docker-validate Validate both Dockerfiles and workspace dependency stages with clean direct builds"
	@echo "  make docker-rebuild Rebuild backend/frontend Docker images without cache"
	@echo "  make dev            Start the optional compose dev stack"
	@echo "  make docker-up      Start the production compose stack"
	@echo "  make docker-up-dev  Start the optional compose dev stack (hot reload)"
	@echo "  make docker-up-caddy Start the dev compose stack behind Caddy"
	@echo "  make docker-down    Stop the optional compose dev stack"
	@echo "  make docker-logs    View optional compose dev stack logs"
	@echo "  make build-backend  Build the backend package"
	@echo "  make build-frontend Build the frontend package"
	@echo "  make test-backend   Run backend tests only"
	@echo "  make test-frontend  Run frontend tests only"
	@echo "  make test-e2e       Run E2E tests only"
	@echo ""
	@echo "$(GREEN)Quality Checks:$(RESET)"
	@echo "  make lint           Run linters on all projects"
	@echo "  make lint-express-validator Enforce no express-validator production usage"
	@echo "  make lint-controller-sql Enforce controller->service SQL boundary ratchet"
	@echo "  make lint-query-contract Enforce query-contract policy"
	@echo "  make lint-v2-module-ownership Enforce module-only imports in v2 registrar"
	@echo "  make lint-module-boundary Enforce migrated modules do not import legacy controllers"
	@echo "  make lint-module-route-proxy Enforce migrated module routes do not proxy @routes/*"
	@echo "  make lint-canonical-module-imports Enforce canonical module paths over legacy controller/service shims"
	@echo "  make lint-implementation-size Enforce implementation file size ratchet against baseline"
	@echo "  make lint-migration-manifest Enforce migration manifest policy"
	@echo "  make lint-frontend-feature-boundary Enforce feature-page boundary ratchet"
	@echo "  make lint-frontend-legacy-slice-imports Enforce deleted legacy store slice path stays removed"
	@echo "  make lint-frontend-legacy-page-paths Enforce deleted legacy page path stays removed"
	@echo "  make lint-backend-legacy-controller-wrappers Enforce deleted legacy controller path stays removed"
	@echo "  make lint-route-integrity Enforce literal route targets resolve via routeCatalog"
	@echo "  make lint-route-catalog-drift Enforce routeCatalog stays aligned with registered routes"
	@echo "  make lint-fix       Run linters and auto-fix issues"
	@echo "  make typecheck      Run TypeScript type checking across backend, frontend, and contracts"
	@echo "  make test           Run backend/frontend tests + host Playwright CI + isolated Docker smoke gate"
	@echo "  make test-coverage  Run backend/frontend coverage + host smoke + isolated Docker smoke gate"
	@echo "  make test-coverage-full  Run backend/frontend coverage + host CI Playwright matrix + isolated Docker smoke gate"
	@echo "  make test-tooling   Run the targeted tooling-contract regression tests"
	@echo "  make quality-baseline Generate code quality baseline report"
	@echo "  make check-links    Validate markdown links"
	@echo "  make check-changed  Identify and optionally run checks for changed files (--run)"
	@echo "  make test-e2e-docker-smoke Run the Docker-backed Playwright smoke gate against the isolated smoke stack"
	@echo ""
	@echo "$(GREEN)CI Pipelines:$(RESET)"
	@echo "  make ci             Run full CI (lint + typecheck + test + build)"
	@echo "  make ci-fast        Run quick CI (lint + typecheck only)"
	@echo "  make ci-full        Run coverage-focused CI + security audit"
	@echo "  make ci-unit        Run coverage-focused CI with unit tests only"
	@echo "  make release-check  Run the local release gate without deploying"
	@echo "  make release-staging Run the local release gate, then stage deploy wrapper"
	@echo "  make release-production Run the local release gate, then production deploy wrapper"
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
	@echo "  make db-migrate     Bootstrap or inspect the local database contract"
	@echo "  make db-verify      Verify manifest/initdb parity and the isolated test database contract"
	@echo ""
	@echo "$(GREEN)Setup:$(RESET)"
	@echo "  make doctor         Preflight local runtime prerequisites"
	@echo "  make hooks          Install git hooks for local CI"
	@echo "  make clean          Clean build artifacts"
	@echo "  make clean-local    Remove local build and runtime artifacts"
	@echo "  make clean-all      Remove build artifacts and node_modules"

#------------------------------------------------------------------------------
# Installation
#------------------------------------------------------------------------------
install:
	@echo "$(BLUE)Installing workspace dependencies from the repo root...$(RESET)"
	npm ci
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
	@echo "  Frontend: http://localhost:$(DEV_FRONTEND_PORT)"
	@echo "  Backend:  http://localhost:$(DEV_BACKEND_PORT)"
	@echo "  Database: localhost:$(DEV_DB_PORT)"
	@echo "  Redis:    localhost:$(DEV_REDIS_PORT)"
	@echo ""

docker-up:
	@missing=0; \
	for file in docker-compose.yml; do \
	  if [ ! -f "$$file" ]; then \
	    echo "$(YELLOW)Required compose manifest missing: $$file$(RESET)"; \
	    missing=1; \
	  fi; \
	done; \
	if [ $$missing -ne 0 ]; then \
	  echo "$(RED)Compose stack target is unavailable until the manifest is restored.$(RESET)"; \
	  exit 1; \
	fi
	$(DOCKER_COMPOSE) $(COMPOSE_PROD_ARGS) up -d

docker-up-dev:
	@missing=0; \
	for file in docker-compose.dev.yml; do \
	  if [ ! -f "$$file" ]; then \
	    echo "$(YELLOW)Required compose manifest missing: $$file$(RESET)"; \
	    missing=1; \
	  fi; \
	done; \
	if [ $$missing -ne 0 ]; then \
	  echo "$(RED)Compose dev stack is unavailable until the manifest is restored.$(RESET)"; \
	  exit 1; \
	fi
	$(DOCKER_COMPOSE) $(COMPOSE_DEV_ARGS) up -d
	@./scripts/wait-for-http-ready.sh \
	  "http://127.0.0.1:$(DEV_BACKEND_PORT)/health/ready" \
	  "http://127.0.0.1:$(DEV_FRONTEND_PORT)" \
	  "http://127.0.0.1:$(DEV_PUBLIC_SITE_PORT)/health/ready"

docker-up-caddy:
	@missing=0; \
	for file in docker-compose.dev.yml docker-compose.caddy.yml Caddyfile; do \
	  if [ ! -f "$$file" ]; then \
	    echo "$(YELLOW)Required compose manifest missing: $$file$(RESET)"; \
	    missing=1; \
	  fi; \
	done; \
	if [ $$missing -ne 0 ]; then \
	  echo "$(RED)Compose caddy stack is unavailable until the manifests are restored.$(RESET)"; \
	  exit 1; \
	fi
	CADDY_BACKEND_UPSTREAM=host.docker.internal:$(DEV_BACKEND_PORT) \
	CADDY_FRONTEND_UPSTREAM=host.docker.internal:$(DEV_FRONTEND_PORT) \
	CADDY_PUBLIC_SITE_UPSTREAM=host.docker.internal:$(DEV_PUBLIC_SITE_PORT) \
	CADDY_PUBLIC_SITE_DOMAIN=sites.localhost \
	CADDY_DOMAIN=localhost \
	$(DOCKER_COMPOSE) $(COMPOSE_DEV_CADDY_ARGS) up -d

docker-down:
	@missing=0; \
	for file in docker-compose.dev.yml; do \
	  if [ ! -f "$$file" ]; then \
	    echo "$(YELLOW)Required compose manifest missing: $$file$(RESET)"; \
	    missing=1; \
	  fi; \
	done; \
	if [ $$missing -ne 0 ]; then \
	  echo "$(RED)Compose dev stack is unavailable until the manifest is restored.$(RESET)"; \
	  exit 1; \
	fi
	$(DOCKER_COMPOSE) $(COMPOSE_DEV_ARGS) down --remove-orphans
	@echo "$(YELLOW)Only the compose dev stack can be stopped from this checkout.$(RESET)"

docker-logs:
	@missing=0; \
	for file in docker-compose.dev.yml; do \
	  if [ ! -f "$$file" ]; then \
	    echo "$(YELLOW)Required compose manifest missing: $$file$(RESET)"; \
	    missing=1; \
	  fi; \
	done; \
	if [ $$missing -ne 0 ]; then \
	  echo "$(RED)Compose dev stack is unavailable until the manifest is restored.$(RESET)"; \
	  exit 1; \
	fi
	$(DOCKER_COMPOSE) $(COMPOSE_DEV_ARGS) logs -f

docker-build:
	$(DOCKER_DIRECT_BUILD_HELPER) build
	@echo "$(GREEN)Docker images built!$(RESET)"

docker-rebuild:
	$(DOCKER_DIRECT_BUILD_HELPER) rebuild
	@echo "$(GREEN)Docker images rebuilt without cache!$(RESET)"

docker-validate:
	$(DOCKER_DIRECT_BUILD_HELPER) validate
	@echo "$(GREEN)Dockerfile validation complete!$(RESET)"

#------------------------------------------------------------------------------
# Quality Checks
#------------------------------------------------------------------------------
lint:
	@echo "$(BLUE)Linting backend...$(RESET)"
	cd backend && npm run lint
	@echo "$(BLUE)Running shared policy checks...$(RESET)"
	bash scripts/run-policy-checks.sh
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

check-changed:
	@./scripts/check-changed.sh $(ARGS)

lint-frontend-feature-boundary:
	@echo "$(BLUE)Checking frontend feature boundary policy...$(RESET)"
	node scripts/check-frontend-feature-boundary-policy.ts
	@echo "$(GREEN)Frontend feature boundary check complete!$(RESET)"

lint-frontend-legacy-slice-imports:
	@echo "$(BLUE)Checking frontend legacy slice path absence...$(RESET)"
	node scripts/check-frontend-legacy-slice-import-policy.ts
	@echo "$(GREEN)Frontend legacy slice path absence check complete!$(RESET)"

lint-frontend-legacy-page-paths:
	@echo "$(BLUE)Checking frontend legacy page path absence...$(RESET)"
	node scripts/check-frontend-legacy-page-path-policy.ts
	@echo "$(GREEN)Frontend legacy page path absence check complete!$(RESET)"

lint-backend-legacy-controller-wrappers:
	@echo "$(BLUE)Checking backend legacy controller path absence...$(RESET)"
	node scripts/check-backend-legacy-controller-wrapper-policy.ts
	@echo "$(GREEN)Backend legacy controller path absence check complete!$(RESET)"

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
	@echo "$(BLUE)Type checking shared contracts...$(RESET)"
	cd contracts && npm run type-check
	@echo "$(GREEN)Type checking complete!$(RESET)"

test:
	@echo "$(BLUE)Ensuring test infrastructure is running (Redis)...$(RESET)"
	$(CI_INFRA_ENV) $(DOCKER_COMPOSE) $(COMPOSE_CI_INFRA_ARGS) up -d redis
	@echo "$(BLUE)Preparing isolated test database...$(RESET)"
	@$(CI_TEST_DB_ENV) ./scripts/db-migrate.sh
	@echo "$(BLUE)Running backend tests...$(RESET)"
	cd backend && npm test -- --runInBand
	@echo "$(BLUE)Running frontend tests...$(RESET)"
	cd frontend && npm test -- --run
	@echo "$(BLUE)Running Playwright E2E host CI matrix...$(RESET)"
	$(E2E_NPM_RUN) test:ci
	@$(MAKE) --no-print-directory test-e2e-docker-smoke
	@echo "$(GREEN)Tests complete!$(RESET)"

test-coverage:
	@echo "$(BLUE)Ensuring test infrastructure is running (Redis)...$(RESET)"
	$(CI_INFRA_ENV) $(DOCKER_COMPOSE) $(COMPOSE_CI_INFRA_ARGS) up -d redis
	@echo "$(BLUE)Preparing isolated test database...$(RESET)"
	@$(CI_TEST_DB_ENV) ./scripts/db-migrate.sh
	@echo "$(BLUE)Waiting for database to complete post-init restart...$(RESET)"
	@sleep 5
	@echo "$(BLUE)Running backend tests with coverage...$(RESET)"
	cd backend && $(CI_BACKEND_COVERAGE_ENV) SKIP_INTEGRATION_DB_PREP=1 npm run test:coverage
	@echo "$(BLUE)Running frontend tests with coverage...$(RESET)"
	cd frontend && npm test -- --run --coverage
	@echo "$(BLUE)Running Playwright E2E host smoke tests...$(RESET)"
	$(E2E_NPM_RUN) test:smoke
	@$(MAKE) --no-print-directory test-e2e-docker-smoke
	@echo "$(GREEN)Coverage reports and smoke gates complete!$(RESET)"

test-coverage-full:
	@echo "$(BLUE)Ensuring test infrastructure is running (Redis)...$(RESET)"
	$(CI_INFRA_ENV) $(DOCKER_COMPOSE) $(COMPOSE_CI_INFRA_ARGS) up -d redis
	@echo "$(BLUE)Preparing isolated test database...$(RESET)"
	@$(CI_TEST_DB_ENV) ./scripts/db-migrate.sh
	@echo "$(BLUE)Waiting for database to complete post-init restart...$(RESET)"
	@sleep 5
	@echo "$(BLUE)Running backend tests with coverage...$(RESET)"
	cd backend && $(CI_BACKEND_COVERAGE_ENV) SKIP_INTEGRATION_DB_PREP=1 npm run test:coverage
	@echo "$(BLUE)Running frontend tests with coverage...$(RESET)"
	cd frontend && npm test -- --run --coverage
	@echo "$(BLUE)Running Playwright E2E host CI matrix...$(RESET)"
	$(E2E_NPM_RUN) test:ci
	@$(MAKE) --no-print-directory test-e2e-docker-smoke
	@echo "$(GREEN)Coverage reports and full behavior gates complete!$(RESET)"

test-tooling:
	node --test scripts/tests/tooling-contracts.test.cjs

test-backend:
	$(CI_INFRA_ENV) $(DOCKER_COMPOSE) $(COMPOSE_CI_INFRA_ARGS) up -d redis
	@$(CI_TEST_DB_ENV) ./scripts/db-migrate.sh
	@echo "$(BLUE)Waiting for database to complete post-init restart...$(RESET)"
	@sleep 5
	cd backend && SKIP_INTEGRATION_DB_PREP=1 npm test -- --runInBand

test-frontend:
	cd frontend && npm test -- --run

test-e2e:
	$(CI_INFRA_ENV) $(DOCKER_COMPOSE) $(COMPOSE_CI_INFRA_ARGS) up -d redis
	@$(CI_TEST_DB_ENV) ./scripts/db-migrate.sh
	$(E2E_NPM_RUN) test:ci

test-e2e-docker-smoke:
	@set -eu; \
	purge_smoke_stack() { \
	  $(SMOKE_STACK_ENV) $(DOCKER_COMPOSE) $(COMPOSE_DEV_SMOKE_ARGS) down --remove-orphans --volumes >/dev/null 2>&1 || true; \
	  for container in \
	    "$(COMPOSE_PROJECT_SMOKE)-postgres-1" \
	    "$(COMPOSE_PROJECT_SMOKE)-redis-1" \
	    "$(COMPOSE_PROJECT_SMOKE)-backend-dev-1" \
	    "$(COMPOSE_PROJECT_SMOKE)-frontend-dev-1" \
	    "$(COMPOSE_PROJECT_SMOKE)-public-site-dev-1"; do \
	    docker rm -f "$$container" >/dev/null 2>&1 || true; \
	  done; \
	  for volume in \
	    "$(COMPOSE_PROJECT_SMOKE)_nonprofit-manager-postgres-data" \
	    "$(COMPOSE_PROJECT_SMOKE)_backend-dev-node-modules" \
	    "$(COMPOSE_PROJECT_SMOKE)_public-site-dev-node-modules" \
	    "$(COMPOSE_PROJECT_SMOKE)_frontend-dev-node-modules"; do \
	    docker volume rm -f "$$volume" >/dev/null 2>&1 || true; \
	  done; \
	  docker network rm "$(COMPOSE_PROJECT_SMOKE)_default" >/dev/null 2>&1 || true; \
	}; \
	cleanup() { \
	  if [ "$${KEEP_SMOKE_STACK:-$(KEEP_SMOKE_STACK)}" = "1" ]; then \
	    echo "$(YELLOW)Keeping isolated Docker smoke stack $(COMPOSE_PROJECT_SMOKE) on ports $(SMOKE_FRONTEND_PORT)/$(SMOKE_BACKEND_PORT)/$(SMOKE_PUBLIC_SITE_PORT).$(RESET)"; \
	    return 0; \
	  fi; \
	  echo "$(BLUE)Stopping isolated Docker smoke stack $(COMPOSE_PROJECT_SMOKE)...$(RESET)"; \
	  purge_smoke_stack; \
	}; \
	trap cleanup EXIT; \
	echo "$(BLUE)Starting isolated Docker smoke stack $(COMPOSE_PROJECT_SMOKE) on ports $(SMOKE_FRONTEND_PORT)/$(SMOKE_BACKEND_PORT)/$(SMOKE_PUBLIC_SITE_PORT)...$(RESET)"; \
	purge_smoke_stack; \
	if ! $(SMOKE_STACK_ENV) $(DOCKER_COMPOSE) $(COMPOSE_DEV_SMOKE_ARGS) up -d; then \
	  echo "$(YELLOW)Smoke stack startup failed; purging partial containers and volumes before exit.$(RESET)"; \
	  purge_smoke_stack; \
	  exit 1; \
	fi; \
	./scripts/wait-for-http-ready.sh \
	  "http://127.0.0.1:$(SMOKE_BACKEND_PORT)/health/ready" \
	  "http://127.0.0.1:$(SMOKE_FRONTEND_PORT)" \
	  "http://127.0.0.1:$(SMOKE_PUBLIC_SITE_PORT)/health/ready"; \
	echo "$(BLUE)Running Docker-backed Playwright smoke tests against the isolated stack...$(RESET)"; \
	cd e2e && \
	E2E_REQUIRED_PORTS="$(SMOKE_BACKEND_PORT) $(SMOKE_FRONTEND_PORT) $(SMOKE_PUBLIC_SITE_PORT)" \
	E2E_READY_URLS="http://127.0.0.1:$(SMOKE_BACKEND_PORT)/health/ready http://127.0.0.1:$(SMOKE_FRONTEND_PORT) http://127.0.0.1:$(SMOKE_PUBLIC_SITE_PORT)/health/ready" \
	E2E_BACKEND_PORT=$(SMOKE_BACKEND_PORT) \
	E2E_FRONTEND_PORT=$(SMOKE_FRONTEND_PORT) \
	E2E_PUBLIC_SITE_PORT=$(SMOKE_PUBLIC_SITE_PORT) \
	E2E_DB_PORT=$(SMOKE_DB_PORT) \
	npm run test:docker:smoke; \
	echo "$(GREEN)Docker-backed Playwright smoke gate complete!$(RESET)"

quality-baseline:
	@./scripts/quality-baseline.sh

check-links:
	@./scripts/check-links.sh

#------------------------------------------------------------------------------
# Security
#------------------------------------------------------------------------------
security-audit:
	@echo "$(BLUE)Running npm audit on backend...$(RESET)"
	cd backend && npm audit --omit=dev --audit-level=moderate
	@echo ""
	@echo "$(BLUE)Running npm audit on frontend...$(RESET)"
	cd frontend && npm audit --omit=dev --audit-level=moderate
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
# CI Pipelines
#------------------------------------------------------------------------------
ci:
	@echo ""
	@echo "$(BLUE)========================================$(RESET)"
	@echo "$(BLUE)  Running Local CI Pipeline$(RESET)"
	@echo "$(BLUE)========================================$(RESET)"
	@echo ""
	@./scripts/ci.sh --build
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
	@./scripts/ci.sh --fast
	@echo ""
	@echo "$(GREEN)========================================$(RESET)"
	@echo "$(GREEN)  Fast CI Passed!$(RESET)"
	@echo "$(GREEN)========================================$(RESET)"

ci-full:
	@echo ""
	@echo "$(BLUE)========================================$(RESET)"
	@echo "$(BLUE)  Running Coverage-Focused CI + Security Audit$(RESET)"
	@echo "$(BLUE)========================================$(RESET)"
	@echo ""
	@./scripts/ci.sh --build --audit --coverage
	@echo ""
	@echo "$(GREEN)========================================$(RESET)"
	@echo "$(GREEN)  Coverage-Focused CI Pipeline Passed!$(RESET)"
	@echo "$(GREEN)========================================$(RESET)"

ci-unit:
	@echo ""
	@echo "$(BLUE)========================================$(RESET)"
	@echo "$(BLUE)  Running Unit-Only Coverage CI$(RESET)"
	@echo "$(BLUE)========================================$(RESET)"
	@echo ""
	@./scripts/ci.sh --build --coverage --unit-only
	@echo ""
	@echo "$(GREEN)========================================$(RESET)"
	@echo "$(GREEN)  Unit-Only Coverage CI Pipeline Passed!$(RESET)"
	@echo "$(GREEN)========================================$(RESET)"

#------------------------------------------------------------------------------
# Local Release Gates
#------------------------------------------------------------------------------
release-check:
	@./scripts/local-release.sh check

release-staging:
	@./scripts/local-release.sh staging

release-production:
	@./scripts/local-release.sh production

#------------------------------------------------------------------------------
# Database
#------------------------------------------------------------------------------
db-migrate:
	@echo "$(BLUE)Running database migrations...$(RESET)"
	@./scripts/db-migrate.sh

db-verify:
	@echo "$(BLUE)Verifying the manifest/initdb contract and isolated test database...$(RESET)"
	@./scripts/verify-migrations.sh

doctor:
	@./scripts/doctor.sh

#------------------------------------------------------------------------------
# Deployment
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
# Git Hooks
#------------------------------------------------------------------------------
hooks:
	@echo "$(BLUE)Installing git hooks...$(RESET)"
	@./scripts/install-git-hooks.sh
	@echo "$(GREEN)Git hooks installed!$(RESET)"
	@echo ""
	@echo "Hooks will run:"
	@echo "  - pre-commit: Run repo lint"
	@echo "  - pre-push: Run fast local CI"
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
	rm -rf node_modules
	rm -rf backend/node_modules
	rm -rf frontend/node_modules
	rm -rf e2e/node_modules
	@echo "$(GREEN)Full clean complete!$(RESET)"
