from pathlib import Path
import sys

DEPS_PATH = Path(__file__).resolve().parent / ".deps"
if str(DEPS_PATH) not in sys.path:
    sys.path.insert(0, str(DEPS_PATH))

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph
from reportlab.pdfgen import canvas
from reportlab.pdfbase.pdfmetrics import stringWidth


OUTPUT_PATH = "/Users/bryan/projects/nonprofit-manager/output/pdf/nonprofit-manager-app-summary.pdf"
PAGE_WIDTH, PAGE_HEIGHT = letter
MARGIN = 0.55 * inch
GUTTER = 0.28 * inch
COLUMN_WIDTH = (PAGE_WIDTH - (2 * MARGIN) - GUTTER) / 2


def build_styles():
    styles = getSampleStyleSheet()
    return {
        "kicker": ParagraphStyle(
            "Kicker",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8.2,
            leading=9.4,
            textColor=colors.HexColor("#5B6472"),
            spaceAfter=0,
        ),
        "title": ParagraphStyle(
            "Title",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=16,
            leading=18.5,
            textColor=colors.HexColor("#111827"),
            spaceAfter=0,
        ),
        "body": ParagraphStyle(
            "Body",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=9.25,
            leading=11.4,
            textColor=colors.HexColor("#1F2937"),
            spaceAfter=0,
        ),
        "section": ParagraphStyle(
            "Section",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=12.5,
            textColor=colors.HexColor("#111827"),
            spaceAfter=0,
        ),
        "bullet": ParagraphStyle(
            "Bullet",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=9.0,
            leading=10.9,
            leftIndent=10,
            firstLineIndent=-8,
            textColor=colors.HexColor("#1F2937"),
            spaceAfter=0,
        ),
        "micro": ParagraphStyle(
            "Micro",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=8.3,
            leading=10.0,
            textColor=colors.HexColor("#374151"),
            spaceAfter=0,
        ),
    }


def draw_wrapped_paragraph(pdf, text, style, x, y, width):
    paragraph = Paragraph(text, style)
    paragraph.wrap(width, PAGE_HEIGHT)
    _, height = paragraph.wrap(width, PAGE_HEIGHT)
    paragraph.drawOn(pdf, x, y - height)
    return y - height


def draw_section_heading(pdf, text, x, y, width, styles):
    y = draw_wrapped_paragraph(pdf, text, styles["section"], x, y, width)
    pdf.setStrokeColor(colors.HexColor("#D1D5DB"))
    pdf.setLineWidth(0.8)
    pdf.line(x, y - 4, x + width, y - 4)
    return y - 10


def draw_bullets(pdf, items, x, y, width, styles, gap=3):
    for item in items:
        y = draw_wrapped_paragraph(pdf, f"• {item}", styles["bullet"], x, y, width)
        y -= gap
    return y


def draw_stack_labels(pdf, items, x, y, width):
    label_font = "Helvetica"
    label_size = 8.2
    pad_x = 6
    chip_h = 15
    gap = 5
    cursor_x = x
    cursor_y = y
    for item in items:
        text_w = stringWidth(item, label_font, label_size)
        chip_w = text_w + (pad_x * 2)
        if cursor_x + chip_w > x + width:
            cursor_x = x
            cursor_y -= chip_h + gap
        pdf.setFillColor(colors.HexColor("#F3F4F6"))
        pdf.setStrokeColor(colors.HexColor("#D1D5DB"))
        pdf.roundRect(cursor_x, cursor_y - chip_h, chip_w, chip_h, 4, fill=1, stroke=1)
        pdf.setFillColor(colors.HexColor("#374151"))
        pdf.setFont(label_font, label_size)
        pdf.drawString(cursor_x + pad_x, cursor_y - 10.5, item)
        cursor_x += chip_w + gap
    return cursor_y - chip_h


def main():
    styles = build_styles()
    pdf = canvas.Canvas(OUTPUT_PATH, pagesize=letter)
    pdf.setTitle("Nonprofit Manager App Summary")

    top_y = PAGE_HEIGHT - MARGIN

    pdf.setFillColor(colors.HexColor("#5B6472"))
    pdf.rect(MARGIN, top_y - 6, 82, 2.5, fill=1, stroke=0)

    y = top_y - 18
    y = draw_wrapped_paragraph(pdf, "APP SUMMARY", styles["kicker"], MARGIN, y, PAGE_WIDTH - 2 * MARGIN)
    y -= 3
    y = draw_wrapped_paragraph(
        pdf,
        "Nonprofit Manager",
        styles["title"],
        MARGIN,
        y,
        PAGE_WIDTH - 2 * MARGIN,
    )
    y -= 8
    y = draw_wrapped_paragraph(
        pdf,
        (
            "Nonprofit Manager is a full-stack TypeScript platform for nonprofit operations, covering "
            "people and case management, events and volunteers, fundraising, client portal workflows, "
            "analytics, and website publishing. The repo shows a browser-based frontend, an Express API, "
            "and Docker-backed local services for development."
        ),
        styles["body"],
        MARGIN,
        y,
        PAGE_WIDTH - 2 * MARGIN,
    )

    columns_top = y - 15
    left_x = MARGIN
    right_x = MARGIN + COLUMN_WIDTH + GUTTER
    left_y = columns_top
    right_y = columns_top

    left_y = draw_section_heading(pdf, "Who It's For", left_x, left_y, COLUMN_WIDTH, styles)
    left_y = draw_wrapped_paragraph(
        pdf,
        (
            "Nonprofit staff and administrators managing day-to-day operations, fundraising, reporting, "
            "and client-facing workflows."
        ),
        styles["body"],
        left_x,
        left_y,
        COLUMN_WIDTH,
    )
    left_y -= 4
    left_y = draw_wrapped_paragraph(
        pdf,
        "<b>Named persona:</b> Not found in repo.",
        styles["body"],
        left_x,
        left_y,
        COLUMN_WIDTH,
    )
    left_y -= 12

    left_y = draw_section_heading(pdf, "What It Does", left_x, left_y, COLUMN_WIDTH, styles)
    left_y = draw_bullets(
        pdf,
        [
            "Tracks contacts, accounts, and cases for service delivery and relationship management.",
            "Runs events, registrations, and public event check-in flows.",
            "Manages volunteers, task assignment, and follow-up work.",
            "Supports donations, payments, export, and reconciliation workflows.",
            "Provides dashboards, analytics, reports, saved reports, and scheduled reports.",
            "Powers portal access, website publishing, public forms, webhooks, and external service integrations.",
        ],
        left_x,
        left_y,
        COLUMN_WIDTH,
        styles,
        gap=2.5,
    )
    left_y -= 10

    left_y = draw_section_heading(pdf, "How To Run", left_x, left_y, COLUMN_WIDTH, styles)
    left_y = draw_wrapped_paragraph(
        pdf,
        "Prereqs: Node.js 20.19+, npm 10+, Docker Compose, Git.",
        styles["body"],
        left_x,
        left_y,
        COLUMN_WIDTH,
    )
    left_y -= 4
    left_y = draw_bullets(
        pdf,
        [
            "Copy `.env.development.example` to `.env.development`.",
            "Run `make install` from the repo root.",
            "Run `make dev` to start frontend, backend, Postgres, and Redis.",
            "Open `http://localhost:8005` in the browser.",
            "Verify the backend with `http://localhost:8004/health`.",
        ],
        left_x,
        left_y,
        COLUMN_WIDTH,
        styles,
        gap=2,
    )

    right_y = draw_section_heading(pdf, "How It Works", right_x, right_y, COLUMN_WIDTH, styles)
    right_y = draw_bullets(
        pdf,
        [
            "The frontend is a React 19 + Vite app that boots providers in `frontend/src/main.tsx`, lazy-loads route composition from `frontend/src/routes/index.tsx`, and keeps app state in a Redux Toolkit store.",
            "The backend is an Express service whose active application surface is `/api/v2/*`; `backend/src/routes/v2/index.ts` mounts module-owned routes for domains such as auth, contacts, cases, volunteers, events, donations, reports, publishing, portal, and webhooks.",
            "Repo conventions document a thin request path of `route -> controller -> service/usecase -> data access`, with Zod validation, auth guards, rate limiting, success/error envelopes, and shared middleware at the HTTP boundary.",
            "Docker development wires the frontend and backend to PostgreSQL and Redis, while the backend also starts optional background schedulers such as reminders, scheduled reports, public report cleanup, and webhook retry processing.",
        ],
        right_x,
        right_y,
        COLUMN_WIDTH,
        styles,
        gap=2.5,
    )
    right_y -= 8

    right_y = draw_section_heading(pdf, "Stack Snapshot", right_x, right_y, COLUMN_WIDTH, styles)
    right_y = draw_stack_labels(
        pdf,
        [
            "React 19",
            "Vite",
            "Redux Toolkit",
            "React Router 7",
            "Express",
            "TypeScript",
            "PostgreSQL",
            "Redis",
            "Docker Compose",
            "Jest",
            "Vitest",
            "Playwright",
            "Zod",
        ],
        right_x,
        right_y,
        COLUMN_WIDTH,
    )
    right_y -= 12
    right_y = draw_wrapped_paragraph(
        pdf,
        (
            "<b>Dev endpoints:</b> Frontend `localhost:8005`, backend `localhost:8004`, Postgres "
            "`localhost:8002`, Redis `localhost:8003`."
        ),
        styles["micro"],
        right_x,
        right_y,
        COLUMN_WIDTH,
    )
    right_y -= 5
    right_y = draw_wrapped_paragraph(
        pdf,
        (
            "<b>Evidence sources:</b> `README.md`, `docs/development/GETTING_STARTED.md`, "
            "`docs/development/CONVENTIONS.md`, `docs/development/ARCHITECTURE.md`, "
            "`backend/src/index.ts`, `backend/src/routes/v2/index.ts`, `frontend/src/main.tsx`, "
            "`frontend/src/App.tsx`, `frontend/src/routes/index.tsx`, `frontend/src/store/index.ts`, "
            "and `docker-compose.dev.yml`."
        ),
        styles["micro"],
        right_x,
        right_y,
        COLUMN_WIDTH,
    )

    footer_y = MARGIN - 2
    pdf.setStrokeColor(colors.HexColor("#E5E7EB"))
    pdf.setLineWidth(0.8)
    pdf.line(MARGIN, footer_y + 11, PAGE_WIDTH - MARGIN, footer_y + 11)
    pdf.setFillColor(colors.HexColor("#6B7280"))
    pdf.setFont("Helvetica", 7.6)
    pdf.drawString(MARGIN, footer_y, "Generated from repo evidence only. Items missing from docs are marked explicitly.")

    pdf.save()


if __name__ == "__main__":
    main()
