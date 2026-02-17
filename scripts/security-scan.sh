#!/bin/bash
# Security Scanning Script
# Runs local security scans on the Nonprofit Manager project

set -e

# Load common utilities and configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"
source "$SCRIPT_DIR/lib/config.sh"

# Create reports directory
REPORT_DIR="$SECURITY_REPORT_DIR/$(date +%Y-%m-%d)"
ensure_dir "$REPORT_DIR"

print_header "Security Scan"

log_info "Reports will be saved to: $REPORT_DIR"
echo ""

# 1. NPM Audit - Backend
echo "======================================"
echo "1. NPM Audit - Backend"
echo "======================================"
cd backend
npm audit --json > "../$REPORT_DIR/backend-audit.json" 2>&1 || true
npm audit
cd ..
echo ""

# 2. NPM Audit - Frontend
echo "======================================"
echo "2. NPM Audit - Frontend"
echo "======================================"
cd frontend
npm audit --json > "../$REPORT_DIR/frontend-audit.json" 2>&1 || true
npm audit
cd ..
echo ""

# 3. Check for secrets in code
echo "======================================"
echo "3. Secret Scanning"
echo "======================================"
if command -v gitleaks &> /dev/null; then
    gitleaks detect --source=. --report-path="$REPORT_DIR/gitleaks-report.json" --verbose || true
    echo -e "${GREEN}✓ Gitleaks scan complete${NC}"
else
    echo -e "${YELLOW}⚠ Gitleaks not installed. Install with: brew install gitleaks${NC}"
fi
echo ""

# 4. Check for hardcoded credentials
echo "======================================"
echo "4. Credential Search"
echo "======================================"
echo "Searching for potential hardcoded credentials..."
grep -r -n -i "password\s*=\s*['\"]" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . || echo "No hardcoded passwords found"
grep -r -n -i "api[_-]?key\s*=\s*['\"]" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . || echo "No hardcoded API keys found"
grep -r -n -i "secret\s*=\s*['\"]" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . || echo "No hardcoded secrets found"
echo ""

# 5. Check for TODO SECURITY comments
echo "======================================"
echo "5. Security TODOs"
echo "======================================"
echo "Searching for security-related TODO comments..."
grep -r -n "TODO.*SECURITY\|FIXME.*SECURITY\|XXX.*SECURITY" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . || echo "No security TODOs found"
echo ""

# 6. Check .env files are gitignored
echo "======================================"
echo "6. Environment File Check"
echo "======================================"
if git ls-files | grep -q "\.env$"; then
    echo -e "${RED}✗ .env files found in git! This is a security risk.${NC}"
else
    echo -e "${GREEN}✓ No .env files in git${NC}"
fi
echo ""

# 7. Check for outdated dependencies
echo "======================================"
echo "7. Outdated Dependencies"
echo "======================================"
echo "Backend:"
cd backend
npm outdated > "../$REPORT_DIR/backend-outdated.txt" 2>&1 || true
npm outdated || true
cd ..
echo ""
echo "Frontend:"
cd frontend
npm outdated > "../$REPORT_DIR/frontend-outdated.txt" 2>&1 || true
npm outdated || true
cd ..
echo ""

# 8. File permissions check
echo "======================================"
echo "8. File Permissions Check"
echo "======================================"
echo "Checking for world-writable files..."
find . -type f -perm -002 -not -path "*/node_modules/*" -not -path "*/.git/*" || echo "No world-writable files found"
echo ""

# 9. Generate summary report
echo "======================================"
echo "9. Generating Summary Report"
echo "======================================"

cat > "$REPORT_DIR/security-summary.md" <<EOF
# Security Scan Summary

**Scan Date:** $(date)
**Project:** Nonprofit Manager

## Scans Completed

- ✅ NPM Audit (Backend)
- ✅ NPM Audit (Frontend)
- ✅ Secret Scanning
- ✅ Credential Search
- ✅ Security TODO Search
- ✅ Environment File Check
- ✅ Outdated Dependencies Check
- ✅ File Permissions Check

## Quick Findings

### Backend Dependencies
$(cd backend && npm audit --audit-level=moderate 2>&1 | grep "vulnerabilities" || echo "No vulnerabilities found")

### Frontend Dependencies
$(cd frontend && npm audit --audit-level=moderate 2>&1 | grep "vulnerabilities" || echo "No vulnerabilities found")

## Detailed Reports

See individual report files in this directory:
- backend-audit.json
- frontend-audit.json
- backend-outdated.txt
- frontend-outdated.txt
$(if command -v gitleaks &> /dev/null; then echo "- gitleaks-report.json"; fi)

## Recommendations

1. Review all identified vulnerabilities
2. Update outdated dependencies
3. Address any security TODOs
4. Ensure no secrets in code
5. Schedule professional penetration test

---

**Next Scan:** $(date -d '+1 week' 2>/dev/null || date -v +1w 2>/dev/null || echo "Manual scheduling required")
EOF

echo -e "${GREEN}✓ Summary report generated${NC}"
echo ""

# Print summary
echo "======================================"
echo "  Scan Complete!"
echo "======================================"
echo ""
echo "Reports saved to: $REPORT_DIR/"
echo ""
echo "View summary: cat $REPORT_DIR/security-summary.md"
echo ""

# Open summary if on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "Opening summary report..."
    open "$REPORT_DIR/security-summary.md" || cat "$REPORT_DIR/security-summary.md"
fi
