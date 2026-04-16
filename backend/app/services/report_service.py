import io
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
    HRFlowable,
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT


# Color palette
PRIMARY = colors.HexColor("#6366f1")
PRIMARY_DARK = colors.HexColor("#4f46e5")
SUCCESS = colors.HexColor("#10b981")
WARNING = colors.HexColor("#f59e0b")
DANGER = colors.HexColor("#ef4444")
TEXT_DARK = colors.HexColor("#1e293b")
TEXT_LIGHT = colors.HexColor("#64748b")
BG_LIGHT = colors.HexColor("#f8fafc")
BORDER = colors.HexColor("#e2e8f0")


def _get_styles():
    """Create custom styles for the report."""
    styles = getSampleStyleSheet()

    styles.add(ParagraphStyle(
        name="ReportTitle",
        parent=styles["Title"],
        fontSize=24,
        textColor=PRIMARY_DARK,
        spaceAfter=6,
    ))

    styles.add(ParagraphStyle(
        name="ReportSubtitle",
        parent=styles["Normal"],
        fontSize=12,
        textColor=TEXT_LIGHT,
        spaceAfter=20,
    ))

    styles.add(ParagraphStyle(
        name="SectionHeader",
        parent=styles["Heading2"],
        fontSize=16,
        textColor=PRIMARY_DARK,
        spaceBefore=16,
        spaceAfter=8,
        borderPadding=(0, 0, 4, 0),
    ))

    styles.add(ParagraphStyle(
        name="CandidateName",
        parent=styles["Heading3"],
        fontSize=14,
        textColor=TEXT_DARK,
        spaceBefore=12,
        spaceAfter=4,
    ))

    styles.add(ParagraphStyle(
        name="BodyText2",
        parent=styles["Normal"],
        fontSize=10,
        textColor=TEXT_DARK,
        spaceAfter=4,
    ))

    styles.add(ParagraphStyle(
        name="Positive",
        parent=styles["Normal"],
        fontSize=9,
        textColor=colors.HexColor("#059669"),
        leftIndent=12,
    ))

    styles.add(ParagraphStyle(
        name="Negative",
        parent=styles["Normal"],
        fontSize=9,
        textColor=colors.HexColor("#dc2626"),
        leftIndent=12,
    ))

    styles.add(ParagraphStyle(
        name="SmallGray",
        parent=styles["Normal"],
        fontSize=8,
        textColor=TEXT_LIGHT,
    ))

    return styles


def _get_recommendation_color(rec: str) -> colors.Color:
    """Get color based on recommendation level."""
    mapping = {
        "strongly_recommended": SUCCESS,
        "recommended": colors.HexColor("#22c55e"),
        "maybe": WARNING,
        "not_recommended": DANGER,
    }
    return mapping.get(rec, TEXT_LIGHT)


def _get_recommendation_label(rec: str) -> str:
    """Get human-readable recommendation label."""
    mapping = {
        "strongly_recommended": "⭐ Strongly Recommended",
        "recommended": "✅ Recommended",
        "maybe": "⚠️ Maybe",
        "not_recommended": "❌ Not Recommended",
    }
    return mapping.get(rec, "Not Evaluated")


def generate_screening_report(
    job_title: str,
    job_description: str,
    results: list,
    bias_report=None,
    rubric=None,
) -> bytes:
    """Generate a comprehensive PDF screening report."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=20 * mm,
        leftMargin=20 * mm,
        topMargin=25 * mm,
        bottomMargin=20 * mm,
    )

    styles = _get_styles()
    story = []

    # === COVER / HEADER ===
    story.append(Paragraph("AI HR Recruitment Screener", styles["ReportTitle"]))
    story.append(Paragraph("Deep Dive Screening Report", styles["ReportSubtitle"]))
    story.append(HRFlowable(width="100%", thickness=2, color=PRIMARY))
    story.append(Spacer(1, 12))

    # Job info
    story.append(Paragraph(f"<b>Position:</b> {job_title}", styles["BodyText2"]))
    story.append(Paragraph(
        f"<b>Report Generated:</b> {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}",
        styles["BodyText2"],
    ))
    story.append(Paragraph(
        f"<b>Total Candidates Screened:</b> {len(results)}",
        styles["BodyText2"],
    ))

    if rubric:
        story.append(Paragraph(
            f"<b>Scoring Weights:</b> Skills {rubric.get('skill_weight', 35)}% | "
            f"Experience {rubric.get('experience_weight', 30)}% | "
            f"Culture Fit {rubric.get('culture_fit_weight', 20)}% | "
            f"Red Flags {rubric.get('red_flags_weight', 15)}%",
            styles["BodyText2"],
        ))

    story.append(Spacer(1, 20))

    # === EXECUTIVE SUMMARY RANKING TABLE ===
    story.append(Paragraph("Executive Summary — Ranked Candidates", styles["SectionHeader"]))
    story.append(Spacer(1, 6))

    table_data = [["Rank", "Candidate", "Score", "Skills", "Exp", "Culture", "Red Flags", "Recommendation"]]
    for i, r in enumerate(results, 1):
        rec_label = _get_recommendation_label(r.get("recommendation", "")).replace("⭐ ", "").replace("✅ ", "").replace("⚠️ ", "").replace("❌ ", "")
        table_data.append([
            str(i),
            r.get("candidate_name", "Unknown")[:20],
            f"{r.get('overall_score', 0):.0f}",
            f"{r.get('skill_match', {}).get('score', 0):.0f}",
            f"{r.get('experience_relevance', {}).get('score', 0):.0f}",
            f"{r.get('culture_fit', {}).get('score', 0):.0f}",
            f"{r.get('red_flags', {}).get('score', 0):.0f}",
            rec_label,
        ])

    col_widths = [30, 95, 40, 40, 35, 45, 50, 95]
    ranking_table = Table(table_data, colWidths=col_widths)
    ranking_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTSIZE", (0, 0), (-1, 0), 8),
        ("FONTSIZE", (0, 1), (-1, -1), 8),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("ALIGN", (1, 1), (1, -1), "LEFT"),
        ("ALIGN", (-1, 1), (-1, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, BG_LIGHT]),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(ranking_table)

    # === DETAILED CANDIDATE ANALYSIS ===
    story.append(PageBreak())
    story.append(Paragraph("Detailed Candidate Analysis", styles["SectionHeader"]))

    for i, r in enumerate(results, 1):
        story.append(Spacer(1, 8))
        story.append(HRFlowable(width="100%", thickness=1, color=BORDER))
        story.append(Spacer(1, 4))

        # Candidate header
        rec_color = _get_recommendation_color(r.get("recommendation", ""))
        story.append(Paragraph(
            f"#{i} — {r.get('candidate_name', 'Unknown')} — "
            f"<font color='{rec_color.hexval()}'><b>Score: {r.get('overall_score', 0):.0f}/100</b></font>",
            styles["CandidateName"],
        ))

        # XAI Summary
        xai = r.get("xai_summary", "")
        if xai:
            story.append(Paragraph(f"<i>{xai}</i>", styles["BodyText2"]))
            story.append(Spacer(1, 6))

        # Dimension scores table
        dim_data = [
            ["Dimension", "Score", "Details"],
        ]

        for dim_key, dim_label in [
            ("skill_match", "Skill Match"),
            ("experience_relevance", "Experience"),
            ("culture_fit", "Culture Fit"),
        ]:
            dim = r.get(dim_key, {})
            details = dim.get("reasoning", "")[:120]
            dim_data.append([dim_label, f"{dim.get('score', 0):.0f}/100", details])

        rf = r.get("red_flags", {})
        flag_count = len(rf.get("flags", []))
        rf_detail = f"{flag_count} flags detected. " + rf.get("reasoning", "")[:100] if flag_count else "No red flags"
        dim_data.append(["Red Flags", f"{rf.get('score', 100):.0f}/100", rf_detail])

        dim_table = Table(dim_data, colWidths=[80, 60, 330])
        dim_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("ALIGN", (1, 0), (1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, BG_LIGHT]),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(dim_table)
        story.append(Spacer(1, 4))

        # Positives & Negatives
        for dim_key in ["skill_match", "experience_relevance", "culture_fit"]:
            dim = r.get(dim_key, {})
            for pos in dim.get("positives", []):
                story.append(Paragraph(f"✅ {pos}", styles["Positive"]))
            for neg in dim.get("negatives", []):
                story.append(Paragraph(f"⚠️ {neg}", styles["Negative"]))

        # Red flags detail
        for flag in rf.get("flags", []):
            severity_icon = "🔴" if flag.get("severity") == "high" else "🟡" if flag.get("severity") == "medium" else "🟢"
            story.append(Paragraph(
                f"🚩 {severity_icon} [{flag.get('flag_type', '')}] {flag.get('description', '')}",
                styles["Negative"],
            ))

        story.append(Spacer(1, 10))

    # === BIAS REPORT ===
    if bias_report and bias_report.get("has_bias"):
        story.append(PageBreak())
        story.append(Paragraph("Job Description Bias Report", styles["SectionHeader"]))
        story.append(Paragraph(
            f"<b>Inclusivity Score:</b> {bias_report.get('overall_score', 100):.0f}/100",
            styles["BodyText2"],
        ))
        story.append(Paragraph(bias_report.get("summary", ""), styles["BodyText2"]))
        story.append(Spacer(1, 8))

        for flag in bias_report.get("flags", []):
            story.append(Paragraph(
                f"⚠️ <b>{flag.get('phrase', '')}</b> — {flag.get('explanation', '')}",
                styles["Negative"],
            ))
            story.append(Paragraph(
                f"   → Suggested: <i>{flag.get('suggested_alternative', '')}</i>",
                styles["BodyText2"],
            ))
            story.append(Spacer(1, 4))

    # === FOOTER ===
    story.append(Spacer(1, 30))
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER))
    story.append(Paragraph(
        "Generated by AI HR Recruitment Screener — Deep Dive | Powered by GPT-4o",
        styles["SmallGray"],
    ))
    story.append(Paragraph(
        "This report is AI-assisted. Human review is recommended for final hiring decisions.",
        styles["SmallGray"],
    ))

    doc.build(story)
    buffer.seek(0)
    return buffer.read()
