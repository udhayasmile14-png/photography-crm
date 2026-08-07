import os
import sys

def install_and_run():
    print("Installing reportlab for PDF generation...")
    os.system("pip install reportlab")

    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER, TA_LEFT
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
    from reportlab.lib import colors

    pdf_filename = "photography_crm_specifications.pdf"
    print(f"Generating {pdf_filename}...")

    # Document Setup
    doc = SimpleDocTemplate(
        pdf_filename,
        pagesize=letter,
        rightMargin=54,
        leftMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    story = []
    styles = getSampleStyleSheet()

    # Custom Styles
    title_style = ParagraphStyle(
        'CoverTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=28,
        leading=34,
        textColor=colors.HexColor('#4c1d95'),
        alignment=TA_CENTER,
        spaceAfter=15
    )

    subtitle_style = ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=14,
        leading=18,
        textColor=colors.HexColor('#4b5563'),
        alignment=TA_CENTER,
        spaceAfter=40
    )

    h1_style = ParagraphStyle(
        'Header1',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#1e1b4b'),
        spaceBefore=18,
        spaceAfter=10,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Header2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=16,
        textColor=colors.HexColor('#4c1d95'),
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'BodyTextCustom',
        parent=styles['BodyText'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#374151'),
        spaceAfter=8
    )

    code_style = ParagraphStyle(
        'CodeBlock',
        parent=styles['Code'],
        fontName='Courier',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#1f2937'),
        backColor=colors.HexColor('#f3f4f6'),
        borderColor=colors.HexColor('#e5e7eb'),
        borderWidth=0.5,
        borderPadding=6,
        spaceBefore=8,
        spaceAfter=8,
        keepWithNext=True
    )

    bullet_style = ParagraphStyle(
        'BulletCustom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#374151'),
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=4
    )

    # --- COVER PAGE ---
    story.append(Spacer(1, 100))
    story.append(Paragraph("📷 APERTURE", title_style))
    story.append(Paragraph("Photography CRM — Complete System Architecture & Specifications", subtitle_style))
    
    # Metadata Box
    metadata_data = [
        [Paragraph("<b>Author:</b> Antigravity AI Coding Assistant", body_style)],
        [Paragraph("<b>Status:</b> Production MVP Architecture", body_style)],
        [Paragraph("<b>Target Stack:</b> Python (FastAPI) & React (Vite)", body_style)],
        [Paragraph("<b>Date:</b> August 2026", body_style)]
    ]
    meta_table = Table(metadata_data, colWidths=[300])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#faf5ff')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#e9d5ff')),
        ('PADDING', (0,0), (-1,-1), 12),
        ('ALIGN', (0,0), (-1,-1), 'CENTER')
    ]))
    
    story.append(meta_table)
    story.append(PageBreak())

    # --- SECTION 1: OVERVIEW ---
    story.append(Paragraph("1. System Overview", h1_style))
    story.append(Paragraph(
        "Aperture is a multi-tenant, production-grade SaaS platform designed for professional photographers "
        "and studios to manage client relationships, booking schedules, invoices, and photo proofing "
        "galleries. It implements a secure data-isolation architecture where every query is scoped to "
        "the authenticated studio (tenant) via JSON Web Tokens (JWT).",
        body_style
    ))
    
    story.append(Paragraph("Key Pillars of the System:", h2_style))
    story.append(Paragraph("• <b>Studio CRM Core:</b> Client directories, status pipes, and metadata history tracking.", bullet_style))
    story.append(Paragraph("• <b>Scheduling Calendar:</b> Multi-session booking with collision and buffer detection.", bullet_style))
    story.append(Paragraph("• <b>Invoices & Inbound Payments:</b> Quote conversions, base rate billing, tax calculation, and payment status updates.", bullet_style))
    story.append(Paragraph("• <b>Client Portal:</b> Unauthenticated portal dashboard linked to custom URLs for document signature and secure gallery access.", bullet_style))
    story.append(Paragraph("• <b>Gallery Proofing:</b> Premium grid with photo detail sliders, download features, and client favorites selection.", bullet_style))

    # --- SECTION 2: ARCHITECTURE & DATABASE ---
    story.append(Paragraph("2. Database Schema & Architecture", h1_style))
    story.append(Paragraph(
        "The database layer runs on SQLite for development and transitions to PostgreSQL for staging. "
        "Multi-tenancy is enforced by adding a <b>studio_id</b> column to all tables. All queries filter on "
        "this ID after extracting it from the verified JWT payload.",
        body_style
    ))

    # Models Table
    model_rows = [
        ["Model Name", "Primary Keys / Foreign Keys", "Description & Scoping"],
        ["Studio", "id (PK)", "Represents the studio/tenant name and license."],
        ["User", "id (PK), studio_id (FK)", "Photographers/Staff with encrypted passwords."],
        ["Client", "id (PK), studio_id (FK)", "Client directory records with styles preferences."],
        ["Booking", "id (PK), client_id (FK), studio_id (FK)", "Session scheduling logs and rate cards."],
        ["Invoice", "id (PK), booking_id (FK), studio_id (FK)", "Payment status tracker (Paid, Pending)."],
        ["Gallery", "id (PK), booking_id (FK), studio_id (FK)", "Shared picture groups for client review."],
        ["Photo", "id (PK), gallery_id (FK)", "Image cards with original/edited URLs and AI tags."]
    ]
    model_table = Table(model_rows, colWidths=[80, 180, 240])
    model_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1e1b4b')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0,0), (-1,0), 6),
        ('BACKGROUND', (0,1), (-1,-1), colors.HexColor('#f9fafb')),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e5e7eb')),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('FONTSIZE', (0,0), (-1,-1), 9),
        ('PADDING', (0,0), (-1,-1), 6)
    ]))
    story.append(model_table)
    story.append(Spacer(1, 10))

    # --- SECTION 3: BACKEND API ENDPOINTS ---
    story.append(Paragraph("3. Core API Endpoints", h1_style))
    story.append(Paragraph("The backend is built with FastAPI. It segregates routes into standard auth, tenant-scoped paths, and public routes:", body_style))
    
    story.append(Paragraph("<b>Authentication & Registration</b>", h2_style))
    story.append(Paragraph("• <code>POST /api/auth/register</code>: Registers a studio and its admin user.", bullet_style))
    story.append(Paragraph("• <code>POST /api/auth/login</code>: Verifies passwords and signs JWT tokens.", bullet_style))
    
    story.append(Paragraph("<b>Dashboard & Management (JWT Protected)</b>", h2_style))
    story.append(Paragraph("• <code>GET /api/dashboard/stats</code>: Compiles statistics and upcoming shoots.", bullet_style))
    story.append(Paragraph("• <code>GET /api/clients</code> & <code>POST /api/clients</code>: Client directory CRUD.", bullet_style))
    story.append(Paragraph("• <code>POST /api/bookings</code>: Books a shoot. Warns if another session overlaps within 2 hours.", bullet_style))
    
    story.append(Paragraph("<b>Public Routes (Token-free URL sharing)</b>", h2_style))
    story.append(Paragraph("• <code>GET /api/public/clients/{id}/portal</code>: Returns client portal dashboard data.", bullet_style))
    story.append(Paragraph("• <code>GET /api/public/galleries/{id}</code>: Fetches proofing photos.", bullet_style))
    story.append(Paragraph("• <code>POST /api/public/photos/{id}/favorite</code>: Saves client photo selection.", bullet_style))

    story.append(PageBreak())

    # --- SECTION 4: DEPLOYMENT & OPERATION ---
    story.append(Paragraph("4. Running the Project Locally", h1_style))
    story.append(Paragraph(
        "Aperture includes a pre-configured root <code>package.json</code> which boots the entire "
        "system concurrently in a single terminal pane.",
        body_style
    ))

    story.append(Paragraph("<b>Setup and Start Command:</b>", h2_style))
    story.append(Paragraph(
        "Open a terminal in the root folder <code>C:\\Users\\udhaya durairaj\\.gemini\\antigravity\\scratch\\photography-crm</code> and run:",
        body_style
    ))
    story.append(Paragraph("npm run dev", code_style))
    
    story.append(Paragraph("This will start:", body_style))
    story.append(Paragraph("1. <b>FastAPI Server</b> on port <code>8000</code>", bullet_style))
    story.append(Paragraph("2. <b>React/Vite App</b> on port <code>5173</code>", bullet_style))

    # --- SECTION 5: DAILY GIT CHEAT SHEET ---
    story.append(Paragraph("5. Daily Git Workflow Guide", h1_style))
    story.append(Paragraph("Follow this order of commands to save and share your daily progress safely:", body_style))
    
    story.append(Paragraph("<b>1. Start of work (Get latest updates & branch):</b>", h2_style))
    story.append(Paragraph(
        "git switch main\n"
        "git pull\n"
        "git switch -c features/my-new-updates",
        code_style
    ))
    
    story.append(Paragraph("<b>2. Stage and commit completed work:</b>", h2_style))
    story.append(Paragraph(
        "git status\n"
        "git add .\n"
        "git commit -m \"feat: added new features\"",
        code_style
    ))

    story.append(Paragraph("<b>3. Push / Upload code to GitHub:</b>", h2_style))
    story.append(Paragraph(
        "git push https://<token>@github.com/udhayasmile14-png/photography-crm.git main",
        code_style
    ))

    # Build the document
    doc.build(story)
    print(f"Successfully generated {pdf_filename}!")

if __name__ == "__main__":
    install_and_run()
