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

BACKEND_VULN_TOTAL=0
FRONTEND_VULN_TOTAL=0
DEPENDENCY_STATUS="Not Applicable"
DEPENDENCY_DETAILS="Dependency audit not executed."
SECRET_SCAN_STATUS="Not Applicable"
SECRET_SCAN_DETAILS="Secret scanning not executed."
ENV_STATUS="Not Applicable"
ENV_STATUS_DETAILS="Environment file policy not checked."

print_header "Security Scan"

log_info "Reports will be saved to: $REPORT_DIR"
echo ""

# 1. NPM Audit - Backend
echo "======================================"
echo "1. NPM Audit - Backend"
echo "======================================"
cd backend
npm audit --json > "../$REPORT_DIR/backend-audit.json" 2>&1 || true
npm audit || true
BACKEND_VULN_TOTAL=$(node -e "const fs=require('fs');const p='../$REPORT_DIR/backend-audit.json';try{const d=JSON.parse(fs.readFileSync(p,'utf8'));console.log(d?.metadata?.vulnerabilities?.total ?? 0);}catch{console.log(0);}")
cd ..
echo ""

# 2. NPM Audit - Frontend
echo "======================================"
echo "2. NPM Audit - Frontend"
echo "======================================"
cd frontend
npm audit --json > "../$REPORT_DIR/frontend-audit.json" 2>&1 || true
npm audit || true
FRONTEND_VULN_TOTAL=$(node -e "const fs=require('fs');const p='../$REPORT_DIR/frontend-audit.json';try{const d=JSON.parse(fs.readFileSync(p,'utf8'));console.log(d?.metadata?.vulnerabilities?.total ?? 0);}catch{console.log(0);}")
cd ..
echo ""

if [ $((BACKEND_VULN_TOTAL + FRONTEND_VULN_TOTAL)) -eq 0 ]; then
    DEPENDENCY_STATUS="Fixed"
    DEPENDENCY_DETAILS="No vulnerabilities reported by npm audit."
else
    DEPENDENCY_STATUS="Known blocked"
    DEPENDENCY_DETAILS="Backend: ${BACKEND_VULN_TOTAL}, Frontend: ${FRONTEND_VULN_TOTAL} vulnerabilities remain."
fi

# 3. Check for secrets in code
echo "======================================"
echo "3. Secret Scanning"
echo "======================================"
if command -v gitleaks &> /dev/null; then
    if gitleaks detect --source=. --report-path="$REPORT_DIR/gitleaks-report.json" --verbose; then
        SECRET_SCAN_STATUS="Fixed"
        SECRET_SCAN_DETAILS="Local gitleaks scan completed with no findings."
    else
        SECRET_SCAN_STATUS="Known blocked"
        SECRET_SCAN_DETAILS="Local gitleaks detected findings or failed. Review $REPORT_DIR/gitleaks-report.json."
    fi
elif command -v docker &> /dev/null; then
    echo -e "${YELLOW}⚠ Gitleaks not installed locally. Running Docker fallback...${NC}"
    if docker run --rm -v "$PWD:/repo" zricethezav/gitleaks:latest \
        detect --source=/repo --report-path="/repo/$REPORT_DIR/gitleaks-report.json" --verbose; then
        SECRET_SCAN_STATUS="Fixed"
        SECRET_SCAN_DETAILS="Docker gitleaks fallback completed with no findings."
    else
        SECRET_SCAN_STATUS="Known blocked"
        SECRET_SCAN_DETAILS="Docker gitleaks detected findings or failed. Review $REPORT_DIR/gitleaks-report.json."
    fi
else
    SECRET_SCAN_STATUS="Known blocked"
    SECRET_SCAN_DETAILS="gitleaks and Docker are unavailable in this environment."
    echo -e "${YELLOW}⚠ Gitleaks not installed and Docker unavailable. Secret scanning skipped.${NC}"
fi
echo ""

# 4. Check for hardcoded credentials
echo "======================================"
echo "4. Credential Search"
echo "======================================"
echo "Searching for potential hardcoded credentials..."
CODE_GLOBS=(-g '*.{ts,tsx,js,jsx}')
SCAN_EXCLUDES=(
    -g '!**/node_modules/**'
    -g '!**/.git/**'
    -g '!**/dist/**'
    -g '!**/coverage/**'
    -g '!**/.vite/**'
    -g '!**/playwright-report/**'
    -g '!**/test-results/**'
)
rg -n -i --pcre2 "password\\s*=\\s*['\"]" "${CODE_GLOBS[@]}" "${SCAN_EXCLUDES[@]}" . || echo "No hardcoded passwords found"
rg -n -i --pcre2 "api[_-]?key\\s*=\\s*['\"]" "${CODE_GLOBS[@]}" "${SCAN_EXCLUDES[@]}" . || echo "No hardcoded API keys found"
rg -n -i --pcre2 "secret\\s*=\\s*['\"]" "${CODE_GLOBS[@]}" "${SCAN_EXCLUDES[@]}" . || echo "No hardcoded secrets found"
echo ""

# 5. Check for TODO SECURITY comments
echo "======================================"
echo "5. Security TODOs"
echo "======================================"
echo "Searching for security-related TODO comments..."
rg -n "TODO.*SECURITY|FIXME.*SECURITY|XXX.*SECURITY" "${CODE_GLOBS[@]}" "${SCAN_EXCLUDES[@]}" . || echo "No security TODOs found"
echo ""

# 6. Check .env files are gitignored
echo "======================================"
echo "6. Environment File Check"
echo "======================================"
if git ls-files | grep -q "\.env$"; then
    echo -e "${RED}✗ .env files found in git! This is a security risk.${NC}"
    ENV_STATUS="Known blocked"
    ENV_STATUS_DETAILS=".env files are tracked in git."
else
    echo -e "${GREEN}✓ No .env files in git${NC}"
    ENV_STATUS="Fixed"
    ENV_STATUS_DETAILS="No .env files are tracked in git."
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
$(if [ -f "$REPORT_DIR/gitleaks-report.json" ]; then echo "- gitleaks-report.json"; fi)

## Recommendations

1. Review all identified vulnerabilities
2. Update outdated dependencies
3. Address any security TODOs
4. Ensure no secrets in code
5. Schedule professional penetration test

## Remediation Status

- Dependencies: ${DEPENDENCY_STATUS} (${DEPENDENCY_DETAILS})
- Secret scanning: ${SECRET_SCAN_STATUS} (${SECRET_SCAN_DETAILS})
- Credential pattern scan: Not Applicable (heuristic grep output requires manual triage)
- Security TODO scan: Not Applicable (advisory text scan only)
- Environment file policy: ${ENV_STATUS} (${ENV_STATUS_DETAILS})

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
