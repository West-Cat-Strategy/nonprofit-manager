# Documentation Style Guide

**Last Updated**: February 18, 2026

This guide ensures consistency across all documentation in the nonprofit-manager project. All contributors should follow these standards when creating or updating documentation.

---

## Table of Contents

- [Purpose](#purpose)
- [File Organization](#file-organization)
- [Markdown Formatting](#markdown-formatting)
- [Writing Style & Tone](#writing-style--tone)
- [Code Examples](#code-examples)
- [Links & References](#links--references)
- [Dates & Timestamps](#dates--timestamps)
- [Special Sections](#special-sections)
- [Emoji Usage](#emoji-usage)
- [Checklist for Documentation](#checklist-for-documentation)

---

## Purpose

Clear, consistent documentation:
- Reduces onboarding time for new developers
- Prevents confusion about roles/status/procedures
- Improves searchability and navigation
- Maintains professional quality standards
- Supports knowledge transfer and compliance

---

## File Organization

### Directory Structure

```
docs/
├── INDEX.md                      # Master navigation (replaces README.md)
├── DOCUMENTATION_STYLE_GUIDE.md  # This file
├── DOCUMENTATION_MAINTENANCE.md  # Maintenance checklist
├── README.md                     # (legacy, kept for backwards compatibility)
├── api/                          # API documentation
│   ├── README.md                 # API index/master reference
│   ├── API_REFERENCE_*.md        # Specific reference docs
│   ├── openapi.yaml              # OpenAPI specification
│   └── postman/                  # Postman collection docs
├── backend/                      # Backend-specific docs
│   └── BACKEND_SERVICE_REFACTORING_GUIDE.md
├── deployment/                   # Infrastructure & deployment
├── development/                  # Developer guides
│   ├── GETTING_STARTED.md        # Onboarding entry point
│   ├── AGENT_INSTRUCTIONS.md     # AI developer guidelines
│   ├── ARCHITECTURE.md           # Architecture decisions (ADRs)
│   ├── CONVENTIONS.md            # Code style & naming
│   ├── RELEASE_CHECKLIST.md      # Release procedures
│   └── TROUBLESHOOTING.md        # Common issues
├── features/                     # Feature documentation
│   ├── FEATURE_MATRIX.md         # Master feature status table
│   ├── PEOPLE_MODULE_ENHANCEMENTS.md
│   ├── TASK_MANAGEMENT.md
│   └── [other feature docs]
├── performance/                  # Performance & optimization
├── phases/                       # Project planning & execution
│   ├── planning-and-progress.md  # ACTIVE workboard (only current work)
│   ├── PHASE_3_EXECUTION_REPORT.md
│   └── archive/                  # Historical phase reports
│       ├── README.md             # Archive explanation
│       ├── PHASE_1_*.md
│       ├── PHASE_2_*.md
│       └── [older summaries]
├── product/                      # Product specs & requirements
├── quick-reference/              # Quick lookup guides
├── security/                     # Security & incident response
├── testing/                      # Testing guides & procedures
├── ui/                          # UI/design documentation
└── validation/                  # Validation schemas reference
```

### File Naming Conventions

- **Use UPPERCASE with underscores**: `FEATURE_MATRIX.md`, `GETTING_STARTED.md`
- **Exception**: index files are lowercase: `README.md`, `INDEX.md`
- **Use descriptive names**: `API_REFERENCE_DASHBOARD_ALERTS.md` (not `api_ref.md`)
- **Archive old files** instead of deleting: Move to `docs/phases/archive/`

---

## Markdown Formatting

### Headers

**Hierarchy**:
```markdown
# Page Title (h1 - exactly one per file)

## Major Section (h2)

### Subsection (h3)

#### Minor Heading (h4)
```

**Rules**:
- Every markdown file must have exactly **one h1** (the title)
- Use h2 for major sections (Features, Installation, Troubleshooting, etc.)
- Use h3 for subsections within major sections
- Avoid h4/h5/h6 unless structure is deeply nested
- Always add a space after `#`: `# Title` (not `#Title`)

### Code Blocks

**Always include language identifier**:

```markdown
# Correct
\`\`\`typescript
const schema = z.object({ ... });
\`\`\`

# Incorrect
\`\`\`
const schema = z.object({ ... });
\`\`\`
```

**Supported languages** (for syntax highlighting):
- `typescript`, `javascript`, `jsx`, `tsx` — Frontend/Backend code
- `bash`, `shell`, `sh` — Terminal commands
- `sql` — Database queries
- `json` — Configuration/API responses
- `yaml` — Docker, GitHub Actions
- `markdown` — Documentation examples

**Inline code**:
- Use backticks for: variables, function names, class names, file paths in prose
- Examples: `` `handleClick()` ``, `` `UserSchema` ``, `` `src/services/authService.ts` ``
- Do NOT use backticks for file names in file references (see Links section)

### Tables

**Format** (use consistent spacing):

```markdown
| Column 1 | Column 2 | Status |
|----------|----------|--------|
| Item A   | Details  | ✅ Done |
| Item B   | Details  | ⚠️ WIP |
```

**Guidelines**:
- Always include separator row (dashes)
- Align columns for readability
- Use center alignment with colons: `|:---:|` for centered, `|---:|` for right-aligned
- Keep tables < 6 columns (split into multiple tables if needed)
- Use emoji status indicators consistently: ✅ ⚠️ ❌ 🟢 🟡 🔴

### Lists

**Bullet lists** (use `-` for consistency):
```markdown
- Item one
- Item two
  - Nested item
  - Another nested
- Item three
```

**Numbered lists** (use `1.`, `2.`, etc.):
```markdown
1. First step
2. Second step
   1. Substep A
   2. Substep B
3. Third step
```

**Definition lists** (use `Term: Description` format):
```markdown
**Feature**: Description of what it does
**Status**: Production ready
**Owner**: Team name
```

### Emphasis

- **Bold** for important terms: `**required**`, `**critical**`
- *Italic* for emphasis: `*do not skip this step*`
- ~~Strikethrough~~ for deprecated items: `~~old endpoint~~`
- `Inline code` for code references
- `> Blockquote` for warnings/notes

---

## Writing Style & Tone

### Audience Adaptation

Three primary audiences, three tone levels:

| Audience | Tone | Files |
|----------|------|-------|
| **New developers** | Friendly, patient, verbose | GETTING_STARTED.md, frontend/SETUP.md, backend/README.md |
| **Experienced developers** | Professional, concise, assumes knowledge | AGENT_INSTRUCTIONS.md, CONVENTIONS.md, ARCHITECTURE.md |
| **Maintainers/Ops** | Formal, precise, procedural | DEPLOYMENT.md, INCIDENT_RESPONSE_RUNBOOK.md |

### Writing Principles

- **Be specific**: Not "install dependencies" but "run `npm install` in frontend/ and backend/"
- **Be scannable**: Use headers, bullet lists, bold text to break up long paragraphs
- **Be accurate**: If something is assumed knowledge, say so ("assumes Node.js 18+")
- **Be brief**: 3-5 sentences per paragraph maximum
- **Be objective**: Avoid "I think", "in my opinion"; use "the system", "the design decision"
- **Be imperative for instructions**: "Install Node.js" not "You should install Node.js"
- **Use active voice**: "The system validates input" not "Input is validated by the system"

### Examples

**Good**:
> Install Node.js 18+ and npm 9+. Verify with `node --version` and `npm --version`.

**Bad**:
> You will need Node.js. Make sure to install a recent version. In my experience, version 18 works well. Check that everything is installed correctly.

---

## Code Examples

### Requirements

All code examples must:
1. **Be valid and tested** — Compile/run without errors
2. **Reflect current codebase** — Not outdated patterns
3. **Be self-contained** — Can be understood without running full system
4. **Include context** — Where in the codebase does this pattern appear?

### Example Format

```markdown
## Example: Creating a Zod Schema

Here's how to define a schema for user input validation:

\`\`\`typescript
import { z } from 'zod';

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(['admin', 'manager', 'volunteer']),
});

type CreateUserRequest = z.infer<typeof createUserSchema>;
\`\`\`

**Location in codebase**: [backend/src/services/userService.ts](backend/src/services/userService.ts#L45)

**Testing**: This schema is tested in [backend/src/__tests__/userService.test.ts](backend/src/__tests__/userService.test.ts)
```

### Real-World vs. Illustrative

**Real-world examples** (copy from actual code):
- Use when teaching patterns
- Always provide file link and line number
- Update when pattern changes

**Illustrative examples** (simplified for clarity):
- Use when showing simplified version
- Mark as `// Simplified example` or `// Illustrative`
- Consider providing link to full implementation

---

## Links & References

### File References

**Never wrap file paths in backticks**. Use markdown links instead:

```markdown
# Correct
See [backend/src/services/authService.ts](backend/src/services/authService.ts) for implementation.
See [CONVENTIONS.md](docs/development/CONVENTIONS.md) for code style.

# Incorrect
See `backend/src/services/authService.ts` for implementation.
See `CONVENTIONS.md` for code style.
```

### Link Format

```markdown
[Display Text](relative/path/to/file.md)
[Display Text](relative/path/to/file.md#L42)  # Specific line
[Display Text](relative/path/to/file.md#L42-L50)  # Line range
[Display Text](relative/path/to/file.md#section-anchor)  # Section anchor
```

### Link Rules

- Use **relative paths** from workspace root (not absolute paths)
- Display text should be: file path OR descriptive label (not both)
- For files in same directory: `[SETUP.md](docs/development/SETUP.md)` (full path for clarity)
- All links must be verified before committing
- Update links when files are moved/renamed

### External Links

```markdown
[GitHub Copilot](https://github.com/features/copilot) — Free/paid AI assistant
[Zod Documentation](https://zod.dev) — Runtime validation library
```

### Cross-References Between Docs

Use "See also" sections:

```markdown
## See Also

- [TESTING.md](docs/testing/TESTING.md) — Testing strategies
- [PERFORMANCE_OPTIMIZATION.md](docs/performance/PERFORMANCE_OPTIMIZATION.md) — Database optimization
- [INCIDENT_RESPONSE_RUNBOOK.md](docs/security/INCIDENT_RESPONSE_RUNBOOK.md) — Security incidents
```

---

## Dates & Timestamps

### Format Standard: YYYY-MM-DD

```markdown
# Incorrect
- Last Updated: February 18, 2026
- Updated: 2/18/26
- Created: 18 Feb 2026

# Correct
- Last Updated: 2026-02-18
- Date Range: 2026-02-10 to 2026-02-18
```

### "Last Updated" Section

Every documentation file should include this at the top:

```markdown
# Documentation Title

**Last Updated**: 2026-02-18

Content follows below...
```

### Keeping Dates Current

- Add `**Last Updated**: YYYY-MM-DD` to every doc
- Update this timestamp when making substantial changes (not typo fixes)
- Use ISO 8601 format consistently

---

## Special Sections

### Table of Contents (for long docs > 300 lines)

Include at start of document:

```markdown
# Document Title

**Last Updated**: 2026-02-18

## Table of Contents

- [Section One](#section-one)
- [Section Two](#section-two)
  - [Subsection](#subsection)
- [See Also](#see-also)
```

Use anchor links (automatic with markdown headers).

### Status Indicators

Use consistent emoji/text for status:

| Status | Indicator | Usage |
|--------|-----------|-------|
| Complete | ✅ | "✅ Phase 1 complete" |
| In Progress | 🟡 or 🔄 | "🟡 Phase 2 in progress" |
| Planned | 📋 | "📋 Phase 3 planned" |
| Not Started | ⚠️ or ❌ | "❌ Not started" |
| Good | 🟢 | "🟢 All tests passing" |
| Needs Work | 🔴 | "🔴 Missing documentation" |
| Warning | ⚠️ | "⚠️ Breaking change" |

### Note/Warning Blocks

```markdown
> **Note**: This is important context for understanding the next section.

> **Warning**: Do not attempt this without proper backup procedures.

> **Deprecated**: This pattern is no longer recommended. Use [NEW_APPROACH.md](docs/development/NEW_APPROACH.md) instead.
```

### Author Attribution (optional, for major docs)

```markdown
# Document Title

**Last Updated**: 2026-02-18  
**Authors**: Alice Developer, Bot Agent  
**Reviewers**: Team Lead, Security Team
```

---

## Emoji Usage

### Where to Use Emoji

**✅ Use emoji**:
- Status indicators in planning documents and progress tables
- Tables and status indicators (✅ 🟡 ❌ 🟢 🔴 🟠 etc.)
- Headers for visual organization in planning/phase docs
- Section markers in tables of contents

**❌ Avoid emoji**:
- Technical guides (AGENT_INSTRUCTIONS.md, ARCHITECTURE.md, etc.)
- API reference documentation
- Security/incident response documents
- Long narrative text (reduces professionalism)

### Standard Emoji Set

Use this consistent set:
- ✅ Complete / Green light / Pass
- 🟡 In Progress / Yellow light / Caution  
- ❌ Failed / Error / Do not proceed
- 🟢 Good / Production ready
- 🔴 Critical / Red alert / Blocked
- 🟠 Medium priority / Needs attention
- 📋 Planned / To-do / Backlog
- 🔄 In Progress / Ongoing / Cycle
- ⚠️ Warning / Important note
- 📖 See documentation
- 🔗 Link to related doc
- 💡 Pro tip / Best practice

---

## Checklist for Documentation

Use this checklist before committing documentation changes:

### Content
- [ ] Content is accurate and tested
- [ ] Examples are valid and reflect current codebase
- [ ] All code examples have language identifiers
- [ ] Instructions have been followed (walkthrough test)
- [ ] Links are relative paths (not absolute or file://)
- [ ] No personally identifiable information (PII) included
- [ ] Appropriate for target audience (new dev vs. maintainer)

### Format
- [ ] Exactly one h1 (file title) at top
- [ ] "Last Updated" date at top in YYYY-MM-DD format
- [ ] Headers use consistent hierarchy (h1 > h2 > h3)
- [ ] Code blocks have language identifiers
- [ ] Tables are aligned and readable
- [ ] Lists use consistent formatting (- for bullets, 1. for numbered)
- [ ] Emoji use is minimal and consistent

### Style
- [ ] Tone matches audience (friendly for new devs, formal for maintainers)
- [ ] No personal opinion language ("I think", "in my experience")
- [ ] Written in active voice (not passive)
- [ ] Sentences are ≤3 per paragraph
- [ ] Instructions are imperative (commands, not suggestions)

### Quality
- [ ] No spelling/grammar errors
- [ ] No formatting inconsistencies
- [ ] Related documents are cross-linked
- [ ] Document fits in logical place in docs/ structure
- [ ] File name follows UPPERCASE_WITH_UNDERSCORES convention
- [ ] Document doesn't duplicate content elsewhere

### Before Committing
- [ ] Tested: Followed setup guides, ran examples, verified links work
- [ ] Reviewed: Read through as new developer (unfamiliar perspective)
- [ ] Updated: Related docs that reference this doc are also updated
- [ ] Linked: docs/INDEX.md or relevant index file is updated

---

## Support & Questions

Questions about documentation standards?
- See [docs/INDEX.md](docs/INDEX.md) for navigation
- See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines
- Refer to existing well-documented files as examples: [VALIDATION_SCHEMAS_REFERENCE.md](docs/validation/VALIDATION_SCHEMAS_REFERENCE.md), [SECURITY_MONITORING_GUIDE.md](docs/security/SECURITY_MONITORING_GUIDE.md)

For issues or improvements to this guide, open an issue or PR with label `documentation`.
