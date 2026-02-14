#!/bin/bash
# Script Validation
# Validates that all scripts are executable and have proper structure

set -e

# Load common utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"
source "$SCRIPT_DIR/lib/config.sh"

print_header "Script Validation"

# Check if all scripts are executable
log_info "Checking script permissions..."
for script in "$SCRIPT_DIR"/*.sh; do
    [ -f "$script" ] || continue
    if [ ! -x "$script" ]; then
        log_error "Script not executable: $(basename "$script")"
        exit 1
    fi
done
log_success "All scripts are executable"

# Check if hooks are executable
log_info "Checking hook permissions..."
for hook in "$SCRIPT_DIR"/hooks/*; do
    [ -f "$hook" ] || continue
    if [ ! -x "$hook" ]; then
        log_error "Hook not executable: $(basename "$hook")"
        exit 1
    fi
done
log_success "All hooks are executable"

# Check if libraries exist and are readable
log_info "Checking library files..."
for lib in "$SCRIPT_DIR"/lib/*.sh; do
    [ -f "$lib" ] || continue
    if [ ! -r "$lib" ]; then
        log_error "Library not readable: $(basename "$lib")"
        exit 1
    fi
done
log_success "All libraries are readable"

# Validate script structure (basic check for common patterns)
log_info "Validating script structure..."
for script in "$SCRIPT_DIR"/*.sh; do
    [ -f "$script" ] || continue

    script_name=$(basename "$script")

    # Check for shebang
    if ! head -n1 "$script" | grep -q "^#!/"; then
        log_error "Missing shebang in: $script_name"
        continue
    fi

    # Check for common library inclusion (except for common.sh itself)
    if [ "$script_name" != "common.sh" ] && [ "$script_name" != "config.sh" ]; then
        if ! grep -q "source.*lib/common.sh" "$script"; then
            log_error "Missing common library inclusion in: $script_name"
            continue
        fi
    fi

    log_success "✓ $script_name"
done

# Test basic script execution (dry run)
log_info "Testing basic script execution..."
for script in "$SCRIPT_DIR"/ci.sh "$SCRIPT_DIR"/db-migrate.sh; do
    [ -f "$script" ] || continue

    script_name=$(basename "$script")

    # Test help flag if available
    if grep -q "--help" "$script" 2>/dev/null; then
        if "$script" --help >/dev/null 2>&1; then
            log_success "✓ $script_name --help works"
        else
            log_error "✗ $script_name --help failed"
        fi
    fi
done

print_footer "Script validation complete"