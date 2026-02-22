# Documentation Index

**Last Updated**: 2026-02-18

Welcome to the nonprofit-manager documentation. This is your navigation hub for all project guides, specifications, and references.

---

## 🚀 Getting Started (Start Here!)

**New to the project?** Read these in order (~2 hours total):

1. [GETTING_STARTED.md](development/GETTING_STARTED.md) — Development environment setup for Mac/Linux/Windows
2. [CONTRIBUTING.md](../CONTRIBUTING.md) — Code contribution guidelines and workflow
3. [CONVENTIONS.md](development/CONVENTIONS.md) — Code style, naming standards, and patterns

**Frontend developers?** Also see:
- [frontend/SETUP.md](../frontend/SETUP.md) — Frontend-specific setup
- [frontend/README.md](../frontend/README.md) — Frontend project structure
- [frontend/ARCHITECTURE.md](https://github.com/example/nonprofit-manager) — Component architecture and state management

**Backend developers?** Also see:
- [backend/README.md](../backend/README.md) — Backend project overview
- [ARCHITECTURE.md](development/ARCHITECTURE.md) — System architecture decisions

---

## 📚 Documentation Categories

### **Development & Architecture**

| Document | Purpose | Audience |
|----------|---------|----------|
| [GETTING_STARTED.md](development/GETTING_STARTED.md) | Development environment setup | New developers |
| [CONVENTIONS.md](development/CONVENTIONS.md) | Code style & naming standards | All developers |
| [ARCHITECTURE.md](development/ARCHITECTURE.md) | Architecture Decision Records (ADRs) | Architects, senior devs |
| [AGENT_INSTRUCTIONS.md](development/AGENT_INSTRUCTIONS.md) | AI developer guidelines | Copilot/AI assistants |
| [TROUBLESHOOTING.md](development/TROUBLESHOOTING.md) | Common issues & solutions | Developers |
| [RELEASE_CHECKLIST.md](development/RELEASE_CHECKLIST.md) | Release procedures | Release managers |

### **API & Integration**

| Document | Purpose | Audience |
|----------|---------|----------|
| **[api/README.md](api/README.md)** | **Master API index** | API consumers |
| [api/API_INTEGRATION_GUIDE.md](api/API_INTEGRATION_GUIDE.md) | Payment & CRM integrations | Integration engineers |
| [api/API_REFERENCE_DASHBOARD_ALERTS.md](api/API_REFERENCE_DASHBOARD_ALERTS.md) | Dashboard & alerting APIs | Backend/frontend devs |
| [api/API_REFERENCE_EVENTS.md](api/API_REFERENCE_EVENTS.md) | Event management endpoints | Backend devs |
| [api/API_REFERENCE_EXPORT.md](api/API_REFERENCE_EXPORT.md) | Analytics export endpoints | Data engineers |
| [api/API_REFERENCE_BACKUP.md](api/API_REFERENCE_BACKUP.md) | Backup/restore endpoints | DevOps/maintainers |
| [api/openapi.yaml](api/openapi.yaml) | OpenAPI specification | Tool integrations |
| [api/postman/README.md](api/postman/README.md) | Postman collection guide | API testers |

### **Features & Product**

| Document | Purpose | Audience |
|----------|---------|----------|
| **[features/FEATURE_MATRIX.md](features/FEATURE_MATRIX.md)** | **Master feature status** | Product managers, all devs |
| [features/PEOPLE_MODULE_ENHANCEMENTS.md](features/PEOPLE_MODULE_ENHANCEMENTS.md) | CRM & people management | Backend/frontend devs |
| [features/TASK_MANAGEMENT.md](features/TASK_MANAGEMENT.md) | Task module specification | Product/devs |
| [features/REPORTING_GUIDE.md](features/REPORTING_GUIDE.md) | Report generation | Devs/analysts |
| [features/TEMPLATE_SYSTEM.md](features/TEMPLATE_SYSTEM.md) | Template management | Devs |
| [features/DASHBOARD_CUSTOMIZATION.md](features/DASHBOARD_CUSTOMIZATION.md) | Dashboard widget system | Frontend/devs |
| [features/VOLUNTEER_COMPONENTS_STATUS.md](features/VOLUNTEER_COMPONENTS_STATUS.md) | Volunteer features | Devs |
| [features/TELEMETRY.md](features/TELEMETRY.md) | Analytics & tracking | Analytics/devs |
| [product/product-spec.md](product/product-spec.md) | Product requirements | Product/stakeholders |

### **Testing & Quality**

| Document | Purpose | Audience |
|----------|---------|----------|
| [testing/TESTING.md](testing/TESTING.md) | Testing overview & quick reference | All developers |
| [https://github.com/example/nonprofit-manager](https://github.com/example/nonprofit-manager) | Unit test patterns (Jest/Vitest) | Backend/frontend devs |
| [testing/COMPONENT_TESTING.md](testing/COMPONENT_TESTING.md) | React component testing | Frontend developers |
| [testing/INTEGRATION_TEST_GUIDE.md](testing/INTEGRATION_TEST_GUIDE.md) | Integration test procedures | QA/backend devs |
| [testing/MANUAL_TESTING_GUIDE.md](testing/MANUAL_TESTING_GUIDE.md) | Manual QA procedures | QA team |
| [testing/TESTING_STATUS.md](testing/TESTING_STATUS.md) | Test coverage report | QA/maintainers |
| [../e2e/README.md](../e2e/README.md) | E2E testing with Playwright | QA/frontend devs |

### **Deployment & Infrastructure**

| Document | Purpose | Audience |
|----------|---------|----------|
| [deployment/DEPLOYMENT.md](deployment/DEPLOYMENT.md) | Production deployment guide | DevOps/ops team |
| [deployment/DB_SETUP.md](deployment/DB_SETUP.md) | Database initialization & configuration | DevOps/DBAs |
| [deployment/LOG_AGGREGATION_SETUP.md](deployment/LOG_AGGREGATION_SETUP.md) | ELK stack configuration | DevOps/ops |
| [deployment/PLAUSIBLE_SETUP.md](deployment/PLAUSIBLE_SETUP.md) | Analytics platform setup | DevOps/analysts |
| [../database/README.md](../database/README.md) | Database schema overview | All developers |
| [../database/SCHEMA_DIAGRAM.md](../database/SCHEMA_DIAGRAM.md) | Entity relationship diagram | Architects/DBAs |

### **Security & Monitoring**

| Document | Purpose | Audience |
|----------|---------|----------|
| [security/SECURITY_MONITORING_GUIDE.md](security/SECURITY_MONITORING_GUIDE.md) | Security monitoring & alerting | DevOps/security team |
| [security/INCIDENT_RESPONSE_RUNBOOK.md](security/INCIDENT_RESPONSE_RUNBOOK.md) | Incident response procedures | On-call/ops team |
| [security/SECURITY_AUDIT.md](security/SECURITY_AUDIT.md) | Security assessment | Security team |
| [validation/VALIDATION_SCHEMAS_REFERENCE.md](validation/VALIDATION_SCHEMAS_REFERENCE.md) | Zod schema reference | Backend developers |

### **Performance & Optimization**

| Document | Purpose | Audience |
|----------|---------|----------|
| [performance/PERFORMANCE_OPTIMIZATION.md](performance/PERFORMANCE_OPTIMIZATION.md) | Database & caching optimization | Backend/devops |
| [performance/PERFORMANCE_OPTIMIZATION_REPORT.md](performance/PERFORMANCE_OPTIMIZATION_REPORT.md) | Performance assessment | Architects/ops |

### **Project Planning & Progress**

| Document | Purpose | Audience |
|----------|---------|----------|
| [phases/planning-and-progress.md](phases/planning-and-progress.md) | **ACTIVE WORKBOARD** — current task tracking | All team members |
| [phases/PHASE_3_EXECUTION_REPORT.md](phases/PHASE_3_EXECUTION_REPORT.md) | Latest phase completion | Stakeholders |
| [phases/archive/README.md](phases/archive/README.md) | Historical phase reports (archive) | Historians/reference |

For historical phase reports, see [phases/archive/](phases/archive/) directory.

### **Design & UI**

| Document | Purpose | Audience |
|----------|---------|----------|
| [../frontend/NEO-BRUTALIST-GUIDE.md](../frontend/NEO-BRUTALIST-GUIDE.md) | Neo-brutalist design system | Frontend/designers |
| [ui/THEME_IMPLEMENTATION_PLANS.md](ui/THEME_IMPLEMENTATION_PLANS.md) | Design theming implementation | Frontend developers |

### **Quick References**

| Document | Purpose | Cheat sheet for |
|----------|---------|-----------------|
| [quick-reference/QUICK_REFERENCE.md](quick-reference/QUICK_REFERENCE.md) | General project quick reference | Common lookups |
| [quick-reference/PEOPLE_MODULE_QUICK_REFERENCE.md](quick-reference/PEOPLE_MODULE_QUICK_REFERENCE.md) | People module quick commands | People module devs |

### **Utilities & Services**

| Document | Purpose | Audience |
|----------|---------|----------|
| [../backend/README.md](../backend/README.md) | Backend service overview | Backend developers |
| [../frontend/README.md](../frontend/README.md) | Frontend service overview | Frontend developers |
| [../frontend/SETUP.md](../frontend/SETUP.md) | Frontend development setup | Frontend developers |
| [../scripts/README.md](../scripts/README.md) | Utility scripts documentation | DevOps/ops |
| [../data-intake/README.md](../data-intake/README.md) | Data intake service | Backend/integrations |

---

## 🎯 Common Tasks

**"I want to..."**

- **Get started developing** → [GETTING_STARTED.md](development/GETTING_STARTED.md)
- **Contribute code** → [CONTRIBUTING.md](../CONTRIBUTING.md) → [CONVENTIONS.md](development/CONVENTIONS.md)
- **Understand the architecture** → [ARCHITECTURE.md](development/ARCHITECTURE.md)
- **Write tests** → [TESTING.md](testing/TESTING.md) → [UNIT_TESTING.md](https://github.com/example/nonprofit-manager) or [COMPONENT_TESTING.md](testing/COMPONENT_TESTING.md)
- **Call an API endpoint** → [api/README.md](api/README.md)
- **Check feature status** → [features/FEATURE_MATRIX.md](features/FEATURE_MATRIX.md)
- **Deploy to production** → [deployment/DEPLOYMENT.md](deployment/DEPLOYMENT.md)
- **Respond to security incident** → [security/INCIDENT_RESPONSE_RUNBOOK.md](security/INCIDENT_RESPONSE_RUNBOOK.md)
- **Optimize database performance** → [performance/PERFORMANCE_OPTIMIZATION.md](performance/PERFORMANCE_OPTIMIZATION.md)
- **Monitor system health** → [security/SECURITY_MONITORING_GUIDE.md](security/SECURITY_MONITORING_GUIDE.md)
- **Check project progress** → [phases/planning-and-progress.md](phases/planning-and-progress.md)
- **Find a specific code style rule** → [CONVENTIONS.md](development/CONVENTIONS.md)

---

## 📖 Documentation Standards

All documentation follows the standards in [DOCUMENTATION_STYLE_GUIDE.md](DOCUMENTATION_STYLE_GUIDE.md).

Key principles:
- Clear, scannable structure with headers and lists
- Code examples with language identifiers
- Relative links (not absolute paths)
- Consistent dates (YYYY-MM-DD format)
- Tone adapted to audience (friendly for newbies, formal for technical docs)

---

## 🔍 Finding What You Need

### By Role

**New Developer**
1. [GETTING_STARTED.md](development/GETTING_STARTED.md) — First 2 hours
2. [CONTRIBUTING.md](../CONTRIBUTING.md) — How to contribute
3. [CONVENTIONS.md](development/CONVENTIONS.md) — Code standards

**Backend Developer**
1. [backend/README.md](../backend/README.md) — Project overview
2. [ARCHITECTURE.md](development/ARCHITECTURE.md) — Design decisions
3. [VALIDATION_SCHEMAS_REFERENCE.md](validation/VALIDATION_SCHEMAS_REFERENCE.md) — Input validation
4. [UNIT_TESTING.md](https://github.com/example/nonprofit-manager) — Testing patterns
5. [api/README.md](api/README.md) — API reference

**Frontend Developer**
1. [frontend/SETUP.md](../frontend/SETUP.md) — Project setup
2. [frontend/README.md](../frontend/README.md) — Project structure
3. [frontend/ARCHITECTURE.md](https://github.com/example/nonprofit-manager) — Component structure
4. [COMPONENT_TESTING.md](testing/COMPONENT_TESTING.md) — Testing patterns
5. [../frontend/NEO-BRUTALIST-GUIDE.md](../frontend/NEO-BRUTALIST-GUIDE.md) — Design system

**DevOps/Infrastructure**
1. [deployment/DEPLOYMENT.md](deployment/DEPLOYMENT.md) — Production deployment
2. [deployment/DB_SETUP.md](deployment/DB_SETUP.md) — Database setup
3. [security/SECURITY_MONITORING_GUIDE.md](security/SECURITY_MONITORING_GUIDE.md) — Monitoring
4. [security/INCIDENT_RESPONSE_RUNBOOK.md](security/INCIDENT_RESPONSE_RUNBOOK.md) — Incidents
5. [../scripts/README.md](../scripts/README.md) — Utility scripts

**Product Manager**
1. [product/product-spec.md](product/product-spec.md) — Product requirements
2. [features/FEATURE_MATRIX.md](features/FEATURE_MATRIX.md) — Feature status
3. [phases/planning-and-progress.md](phases/planning-and-progress.md) — What we're working on

**QA/Tester**
1. [testing/TESTING.md](testing/TESTING.md) — Testing overview
2. [testing/MANUAL_TESTING_GUIDE.md](testing/MANUAL_TESTING_GUIDE.md) — Manual QA
3. [testing/INTEGRATION_TEST_GUIDE.md](testing/INTEGRATION_TEST_GUIDE.md) — Integration tests
4. [../e2e/README.md](../e2e/README.md) — End-to-end tests

---

## 📞 Support

**Documentation questions?**
- See [DOCUMENTATION_STYLE_GUIDE.md](DOCUMENTATION_STYLE_GUIDE.md) for how docs are formatted
- See [https://github.com/example/nonprofit-manager](https://github.com/example/nonprofit-manager) for how to maintain docs

**Can't find what you need?**
- Check the table of contents for each major category above
- Use your editor's search (Ctrl+F / Cmd+F) to find keywords
- Check the Table of Contents in the top right of this page

**Found an error or gap?**
- Report in GitHub Issues with label `documentation`
- Fix it yourself and submit a PR (see [CONTRIBUTING.md](../CONTRIBUTING.md))

---

## 🗂️ Directory Structure at a Glance

```
docs/
├── INDEX.md                              ← You are here
├── DOCUMENTATION_STYLE_GUIDE.md          ← Style standards
├── https://github.com/example/nonprofit-manager          ← Maintenance checklist
├── api/                                  ← API documentation
├── backend/                              ← Backend-specific docs
├── deployment/                           ← Infrastructure & deployment
├── development/                          ← Developer guides & architecture
├── features/                             ← Feature documentation & roadmap
├── performance/                          ← Performance & optimization
├── phases/                               ← Project planning
│   ├── planning-and-progress.md          ← Active workboard
│   └── archive/                          ← Historical phase reports
├── product/                              ← Product specs & requirements
├── quick-reference/                      ← Quick lookup guides
├── security/                             ← Security & incident response
├── testing/                              ← Testing guides & procedures
├── ui/                                   ← UI/design documentation
└── validation/                           ← Validation schemas reference
```

---

**Last Updated**: 2026-02-18  
**Status**: Active — Maintained by development team

Questions? See [CONTRIBUTING.md](../CONTRIBUTING.md) to propose improvements.
