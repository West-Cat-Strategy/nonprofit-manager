#!/bin/bash
# Link checker for markdown files and frontend pages

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"
source "$SCRIPT_DIR/lib/config.sh"

PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CONFIG_FILE="$PROJECT_ROOT/.markdown-link-check.json"

print_header "Link Checks" "Markdown + frontend routes"

if ! command_exists "node" || ! command_exists "npx"; then
    log_error "Node.js and npx are required to run link checks"
    exit 2
fi

check_file "$CONFIG_FILE" "markdown-link-check config" || exit 2

log_info "Scanning markdown files..."
MARKDOWN_FILES=()
while IFS= read -r file; do
    MARKDOWN_FILES+=("$file")
done < <(
    find "$PROJECT_ROOT" -type f -name "*.md" \
        -not -path "*/node_modules/*" \
        -not -path "*/dist/*" \
        -not -path "*/dist.bak/*" \
        -not -path "*/coverage/*" \
        -not -path "*/playwright-report/*" \
        -not -path "*/test-results/*" \
        -not -path "*/.git/*"
)

if [ ${#MARKDOWN_FILES[@]} -eq 0 ]; then
    log_warn "No markdown files found"
else
    FAILURES=0
    for file in "${MARKDOWN_FILES[@]}"; do
        log_info "Checking: $file"
        if ! npx -y markdown-link-check -c "$CONFIG_FILE" "$file"; then
            FAILURES=$((FAILURES + 1))
        fi
    done

    if [ "$FAILURES" -gt 0 ]; then
        log_error "Markdown link check failed for $FAILURES file(s)"
        exit 1
    fi
fi

log_success "Markdown links look good"

log_info "To validate frontend routes, run: cd e2e && npm test -- tests/link-health.spec.ts"
print_footer "Link checks complete"
