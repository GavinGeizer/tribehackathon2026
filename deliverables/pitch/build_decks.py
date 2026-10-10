"""Editable source for PermitPath pitch PDFs. Run: python3 build_decks.py"""
from reportlab.lib.pagesizes import landscape, A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
from reportlab.pdfgen.canvas import Canvas
from reportlab.lib.utils import ImageReader

PAGE_W, PAGE_H = landscape(A4)  # 841.9 x 595.3
NAVY = HexColor("#14243B")
TEAL = HexColor("#0E7C7B")
TEAL_D = HexColor("#0A5E5D")
CREAM = HexColor("#FAF5E9")
CREAM_D = HexColor("#EFE6D2")
INK = HexColor("#1B2A41")
MUTED = HexColor("#4A5A73")
ACCENT = HexColor("#E8A838")
WHITE = HexColor("#FFFFFF")

FOOTER_R1 = "PermitPath \u2014 planned prototype \u2022 Space Jam \u2022 Sources: see research.md (2026-10-10)"
FOOTER_F = "PermitPath \u2014 planned prototype \u2022 Space Jam \u2022 Sources: see research.md (2026-10-10)"

def base(c, num, total, footer, kicker):
    c.setFillColor(CREAM)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    c.setFillColor(NAVY)
    c.rect(0, PAGE_H - 64, PAGE_W, 64, fill=1, stroke=0)
    c.setFillColor(TEAL)
    c.rect(0, PAGE_H - 69, PAGE_W, 5, fill=1, stroke=0)
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 15)
    c.drawString(28, PAGE_H - 32, "PermitPath")
    c.setFont("Helvetica", 9.5)
    c.drawString(28, PAGE_H - 48, kicker)
    c.setFont("Helvetica", 9.5)
    c.drawRightString(PAGE_W - 28, PAGE_H - 38, f"{num} / {total}")
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 6.2)
    c.drawString(28, 14, footer)
    c.setFillColor(TEAL)
    c.rect(0, 24, PAGE_W, 2, fill=1, stroke=0)

def title_block(c, title, subtitle, y=None):
    y = y or (PAGE_H - 120)
    c.setFillColor(NAVY)
    c.setFont("Helvetica-Bold", 30)
    c.drawString(40, y, title)
    c.setFillColor(TEAL_D)
    c.setFont("Helvetica", 13.5)
    c.drawString(40, y - 28, subtitle)
    return y - 56

def bullets(c, items, x, y, size=12.5, gap=26, width=720, bold_prefix=True):
    from reportlab.pdfbase.pdfmetrics import stringWidth
    c.setFont("Helvetica", size)
    for it in items:
        parts = it.split(" \u2014 ", 1) if " \u2014 " in it else it.split(": ", 1)
        words = it.split()
        lines, cur = [], ""
        for w in words:
            t = (cur + " " + w).strip()
            if stringWidth(t, "Helvetica", size) > width:
                lines.append(cur); cur = w
            else:
                cur = t
        lines.append(cur)
        c.setFillColor(TEAL_D)
        c.circle(x + 4, y - 4, 4.2, fill=1, stroke=0)
        tx = x + 20
        for li, ln in enumerate(lines):
            c.setFillColor(INK)
            c.setFont("Helvetica", size)
            c.drawString(tx, y - li * (size + 5), ln)
        y -= len(lines) * (size + 5) + gap - (size + 5)
    return y

def card(c, x, y, w, h, heading, body):
    c.setFillColor(WHITE)
    c.roundRect(x, y - h, w, h, 10, fill=1, stroke=0)
    c.setFillColor(TEAL)
    c.roundRect(x, y - 8, w, 8, 4, fill=1, stroke=0)
    c.setFillColor(NAVY)
    c.setFont("Helvetica-Bold", 12.5)
    c.drawString(x + 14, y - 32, heading)
    c.setFillColor(INK)
    c.setFont("Helvetica", 10.5)
    ty = y - 50
    for ln in body:
        c.drawString(x + 14, ty, ln)
        ty -= 16

ROUND1 = [
    ("1", "Customer workflow", "Preparing a Halifax commercial renovation application",
     ["Applicant matches project documents to municipal instructions for their project",
      "They decide which requirements apply, collect evidence, check consistency",
      "Missing or conflicting information can create avoidable follow-up and rework"]),
    ("2", "Problem to test", "Does preparation burden fall on repeat applicants?",
     ["Hypothesis only \u2014 no interviews yet: repeat professional applicants feel this burden most",
      "Frequency, time cost, and willingness to pay are unknown",
      "We will validate all three through customer pilots \u2014 no claims made here"]),
    ("3", "Our answer", "PermitPath: source-backed readiness workspace (planned prototype)",
     ["Document text \u2192 validated extraction \u2192 official rule pack \u2192 evidence check \u2192 report",
      "Every flag carries its evidence quote + page and cites the official source row",
      "Fix gaps, record review notes honestly, export a cited readiness report"]),
    ("4", "Expected value + ask", "Less preparation burden \u2014 if pilots confirm it",
     ["Expected (unvalidated): fewer avoidable follow-ups; clearer missing-item list before filing",
      "No filing, no stamp, no municipal submission; AI extraction pending until final integration",
      "Ask: customer pilots to measure frequency, time cost, willingness to pay"]),
]

FINAL = [
    ("1", "Workflow + problem", "Preparing the application takes careful matching work",
     ["Applicant gathers project documents and matches them to municipal instructions",
      "Missing or conflicting information can create avoidable follow-up and rework",
      "Hypothesis buyer (unvalidated): repeat professional applicants \u2014 to confirm in pilots"]),
    ("2", "Walkthrough", "Planned pipeline \u2014 verify status.md before presenting as working",
     ["Step 1 \u2014 document text: upload project files into a browser-local workspace",
      "Step 2 \u2014 validated extraction: key facts pulled with evidence quote + page",
      "Step 3 \u2014 official rule pack + evidence check \u2192 cited readiness report"]),
    ("3", "Rules vs optional AI", "Rules decide; AI only helps read (pending until final integration)",
     ["Official rule pack: which requirements apply given project facts; unknowns stay unknown",
      "Validated extraction first; AI-assisted reading labeled per field when enabled",
      "AI pending until final integration \u2014 workspace runs without it; nothing decided by AI alone"]),
    ("4", "Architecture + privacy", "Your files stay in your browser",
     ["Workspace records live only in the visitor's browser; no signup; synthetic demo data",
      "Server reads files to extract text, then forgets them \u2014 originals not retained",
      "No municipal integration or submission; scans may need manual text or expert review"]),
    ("5", "Landscape + pricing", "A narrow preparation step; pricing still to test",
     ["Others describe wider roles: full-service filing help, expert plan review, government systems",
      "PermitPath tests one step only: readiness before filing \u2014 see research.md (2026-10-10)",
      "Pricing hypothesis (unvalidated): per-project or subscription \u2014 discovery only"]),
    ("6", "Next validation", "Pilots measure frequency, time cost, willingness to pay",
     ["Customer pilots: observe real preparation work; count missing-item catches + false flags",
      "Professional items always route to human verification; every report carries a disclaimer",
      "Final deck will be updated with actual verified capabilities + URL from the lead"]),
]

def build(path, slides, footer, kicker):
    c = Canvas(path, pagesize=landscape(A4))
    c.setTitle("PermitPath " + kicker)
    c.setAuthor("Space Jam")
    total = str(len(slides))
    for num, title, sub, items in slides:
        base(c, num, total, footer, kicker)
        y = title_block(c, f"{num}. {title}", sub)
        bullets(c, items, 44, y, size=12.5 if len(slides) > 4 else 13.5, width=730)
        # accent pill
        c.setFillColor(ACCENT)
        c.roundRect(PAGE_W - 250, 40, 210, 26, 13, fill=1, stroke=0)
        c.setFillColor(NAVY)
        c.setFont("Helvetica-Bold", 9.5)
        c.drawCentredString(PAGE_W - 145, 48, "Prototype scope \u2014 see status.md")
        c.showPage()
    c.save()

if __name__ == "__main__":
    build("round1-permitpath-4slides.pdf", ROUND1, FOOTER_R1, "Round 1 \u2022 4 slides \u2022 problem / solution")
    build("final-permitpath-6slides.pdf", FINAL, FOOTER_F, "Final \u2022 ~6 slides \u2022 5-minute pitch")
    print("wrote both PDFs")
