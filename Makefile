# Nonprofit Manager - Local CI/CD Makefile
# Run 'make help' for available commands
#
# This replaces GitHub Actions with local commands.
# All CI/CD operations can be run locally or via git hooks.

.PHONY: help install lint typecheck test test-coverage quality-baseline check-links build \
	security-audit security-scan ci ci-fast ci-full ci-unit \
        deploy deploy-staging deploy-local \
        docker-build docker-up docker-down docker-logs docker-rebuild \
        db-migrate db-verify clean hooks

# Colors for output
BLUE := \033[34m
GREEN := \033[32m
YELLOW := \033[33m
RED := \033[31m
RESET := \033[0m

# Default target
.DEFAULT_GOAL := help

#------------------------------------------------------------------------------
# Help
#------------------------------------------------------------------------------
help:
	@echo "$(BLUE)Nonprofit Manager - Local CI/CD$(RESET)"
	@echo ""
	@echo "$(GREEN)Development:$(RESET)"
	@echo "  make install        Install all dependencies"
	@echo "  make dev            Start development environment (Docker)"
	@echo "  make docker-up      Start all Docker services"
	@echo "  make docker-down    Stop all Docker services"
	@echo "  make docker-logs    View Docker logs"
	@echo "  make docker-rebuild Rebuild containers (no cache)"
	@echo ""
	@echo "$(GREEN)Quality Checks:$(RESET)"
	@echo "  make lint           Run linters on all projects"
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
dev: docker-up
	@echo ""
	@echo "$(GREEN)Development environment started!$(RESET)"
	@echo "  Frontend: http://localhost:5173"
	@echo "  Backend:  http://localhost:3000"
	@echo "  Database: localhost:5432"
	@echo ""

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

docker-logs:
	docker-compose logs -f

docker-build:
	docker-compose build

docker-rebuild:
	docker-compose build --no-cache

#------------------------------------------------------------------------------
# Quality Checks
#------------------------------------------------------------------------------
lint:
	@echo "$(BLUE)Linting backend...$(RESET)"
	cd backend && npm run lint
	@echo "$(BLUE)Linting frontend...$(RESET)"
	cd frontend && npm run lint
	@echo "$(GREEN)Linting complete!$(RESET)"

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
	@echo "$(BLUE)Ensuring test infrastructure is running (Postgres/Redis)...$(RESET)"
	docker-compose up -d postgres redis
	@echo "$(BLUE)Running backend tests...$(RESET)"
	cd backend && npm test -- --runInBand
	@echo "$(BLUE)Running frontend tests...$(RESET)"
	cd frontend && npm test -- --run
	@echo "$(GREEN)Tests complete!$(RESET)"

test-coverage:
	@echo "$(BLUE)Ensuring test infrastructure is running (Postgres/Redis)...$(RESET)"
	docker-compose up -d postgres redis
	@echo "$(BLUE)Running backend tests with coverage...$(RESET)"
	cd backend && npm test -- --coverage --runInBand
	@echo "$(BLUE)Running frontend tests with coverage...$(RESET)"
	cd frontend && npm test -- --run --coverage
	@echo "$(GREEN)Coverage reports generated!$(RESET)"

test-backend:
	docker-compose up -d postgres redis
	cd backend && npm test -- --runInBand

test-frontend:
	cd frontend && npm test -- --run

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
	@echo "$(GREEN)Build complete!$(RESET)"

build-backend:
	cd backend && npm run build

build-frontend:
	cd frontend && npm run build

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

clean-all: clean
	@echo "$(BLUE)Cleaning node_modules...$(RESET)"
	rm -rf backend/node_modules
	rm -rf frontend/node_modules
	@echo "$(GREEN)Full clean complete!$(RESET)"
