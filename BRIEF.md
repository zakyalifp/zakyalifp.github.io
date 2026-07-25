# PROJECT BRIEF — Academic Personal Website

## ROLE & CONTEXT
You are building a personal academic website for a medical doctor applying to
international postgraduate scholarships (LPDP, MEXT, Australia Awards) and doing
outreach to principal investigators abroad.

**IMPORTANT — the owner of this project is NOT a programmer.** Follow these rules
strictly at all times:
1. Explain every action in plain language BEFORE you do it.
2. Never assume he knows what a terminal command, framework, or file path means.
3. When he needs to do something manually, give numbered click-by-click steps.
4. Work in small steps and confirm with him before moving to the next step.
5. Prefer the SIMPLEST technical solution that works. Do not add complexity.

---

## TECHNICAL REQUIREMENTS

**Stack: plain HTML + CSS + minimal vanilla JavaScript. NOTHING ELSE.**
- Do NOT use React, Vue, Next.js, Tailwind CLI, npm, Node, or any build step.
- Reason: the owner cannot maintain a build pipeline, and it must deploy to
  GitHub Pages by simply dragging files into a repository.
- Fonts: load from Google Fonts via `<link>` tag.
- The site must work by double-clicking `index.html` in a browser.

**Hardware constraint:** Acer Aspire E5-476G, 12GB RAM, integrated/MX150 GPU,
screen resolution 1366x768. Keep the site lightweight. Design must look correct
at 1366x768 — do not assume a large monitor. Must also be mobile-responsive.

**Target deployment:** GitHub Pages (username.github.io). Structure files
accordingly — `index.html` at the root of the project folder.

---

## SITE STRUCTURE (4 separate pages)

1. `index.html` — Home / About
2. `research.html` — Research & Publications
3. `cv.html` — Full CV
4. `contact.html` — Contact

Shared navigation bar across all 4 pages. Language: **English only.**

---

## DESIGN DIRECTION — "Academic Elegant"

- Palette: deep navy (#1B2A4A or similar), white background, one restrained
  accent (muted gold or slate blue). No bright colours.
- Typography: a serif for headings (e.g. Lora, Crimson Pro, or Playfair Display),
  a clean sans-serif for body text (e.g. Inter or Source Sans 3).
- Generous whitespace, comfortable line-height (1.6–1.7), max text width ~700px.
- Restrained and credible — this must look like a researcher's site, not a
  startup landing page. No gradients, no animations beyond subtle hover states.

---

## CV CONTENT (use exactly this — do not invent anything)

**Name:** dr. Zaky Alif Pradian
**Tagline:** Medical Doctor · Clinical Research & Evidence Synthesis
**Email:** zakyalifpradian@gmail.com
**Contact page must show EMAIL ONLY.** Do not include a phone number or
physical address anywhere on the site.

### Professional Summary
Licensed medical doctor with hands-on clinical practice and a strong track record
in evidence-based medicine, systematic review and meta-analysis (SR/MA), and
scientific writing. Experienced in critically appraising clinical evidence,
extracting and synthesising data across large study pools, and applying
structured reasoning to complex medical questions. Research interests span
cardiology, regenerative medicine, extracellular vesicles, and epigenetics.
Currently pursuing postgraduate opportunities in biomedical research abroad.

### Education
- Faculty of Medicine, Universitas Padjadjaran (Unpad), Indonesia

### Clinical Experience
- **General Practitioner** — Puskesmas Ciracas, Jakarta (Feb 2026 – present)
- **Research Assistant** — Phase IV clinical trial on the safety of Efepoetin
  Alfa for anemia; Nephrology Division, RSPAD Gatot Soebroto

### Awards
- **2nd Best Poster Presentation, APREMIC 2026** — "Navigating The Horizon:
  Long-Term Follow Up, Efficacy and Safety of Stem Cell Transplantation in
  Retinitis Pigmentosa — A Systematic Review and Meta-Analysis"
- **Selected printed poster (1 of 18), Jakarta Endocrine Meeting 2026** —
  "Predictors of Volumetric, Functional, and Retreatment Outcomes in
  Radiofrequency Ablation of Benign Thyroid Nodules: A Systematic Review"

### Publications
- Two peer-reviewed Scopus-indexed publications (Q1 and Q2) on epigenetics and
  atherosclerosis.
  > NOTE TO CLAUDE CODE: Full citations are not yet available. Insert clearly
  > marked placeholders like `[FULL CITATION — TO BE ADDED]` and tell the owner
  > exactly which lines to edit later. Do NOT fabricate journal names, years,
  > volume numbers, or DOIs.

### Research Interests (for the Research page)
- Systematic review & meta-analysis methodology (PRISMA 2020, RoB assessment)
- Cardiovascular regenerative medicine
- Extracellular vesicles / exosomes
- iPSC-derived cardiomyocytes
- Epigenetics in atherosclerosis
- Clinical database analysis (NHANES, MIMIC-IV)

### Skills (for the CV page)
- Evidence synthesis: PICO framing, PRISMA 2020, Rayyan, RevMan,
  R (meta-analysis), Newcastle-Ottawa Scale, Cochrane RoB
- In silico / dry lab: molecular docking, AlphaFold structure assessment,
  bibliometric analysis
- Languages: Indonesian (native), English (professional working proficiency)

---

## ASSETS

- **Profile photo:** the owner will supply a photo file later. For now, build the
  layout with a placeholder circle and tell him the exact filename and folder to
  drop his photo into (suggest `assets/profile.jpg`).
- **CV PDF download button:** place a prominent "Download CV (PDF)" button on the
  CV page. It should link to `assets/cv.pdf`. The owner will add that file
  himself — tell him the exact filename and location required.

---

## HOW TO PROCEED

Work in this order, pausing for his confirmation after each step:

1. Show him the planned folder structure and explain what each file does.
2. Build `index.html` plus the shared stylesheet. Ask him to open it in a browser
   and give feedback before continuing.
3. Build the remaining three pages once he approves the look.
4. Give him a plain-language checklist of what he must add manually
   (photo, CV PDF, publication citations).
5. Only after the site is finished and approved, explain GitHub Pages deployment
   step by step — assume he has never used GitHub or Git before.

**Do not skip ahead to deployment. Do not build all four pages at once.**
