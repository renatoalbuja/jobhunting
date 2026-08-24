/* ==========================================================================
   ResumeTailor - Core Application Logic & API Agent Integration
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const apiKeyInput = document.getElementById('api-key');
    const apiStatus = document.getElementById('api-status');
    const toggleApiVisibility = document.getElementById('toggle-api-visibility');
    
    const resumeInput = document.getElementById('resume-input');
    const jobDescInput = document.getElementById('job-desc-input');
    const selectFont = document.getElementById('select-font');
    const checkboxEnforceStar = document.getElementById('checkbox-enforce-star');
    
    const resumeCount = document.getElementById('resume-count');
    const jobDescCount = document.getElementById('job-desc-count');
    const pdfUpload = document.getElementById('pdf-upload');
    const pdfUploadLabel = document.getElementById('pdf-upload-label');
    
    const btnTailor = document.getElementById('btn-tailor');
    const btnTailorText = document.getElementById('btn-tailor-text');
    const tailorSpinner = document.getElementById('tailor-spinner');
    
    const btnLoadDemo = document.getElementById('btn-load-demo');
    const btnClear = document.getElementById('btn-clear');
    const btnPrint = document.getElementById('btn-print');
    const btnDocx = document.getElementById('btn-docx');
    const btnCopyMd = document.getElementById('btn-copy-md');
    
    const navTailor = document.getElementById('nav-tailor');
    const navGuide = document.getElementById('nav-guide');
    const panelStudio = document.getElementById('panel-studio');
    const panelGuide = document.getElementById('panel-guide');
    const btnBackStudio = document.getElementById('btn-back-studio');
    
    const previewEmpty = document.getElementById('preview-empty');
    const resumeSheet = document.getElementById('resume-sheet');
    const renderedResume = document.getElementById('rendered-resume');
    const editBanner = document.getElementById('edit-banner');
    
    const markdownOutput = document.getElementById('markdown-output');
    const atsPrintContainer = document.getElementById('ats-print-container');
    
    // Checklist/Score elements
    const scoreText = document.getElementById('score-text');
    const scoreProgress = document.getElementById('score-progress');
    const scoreSummary = document.getElementById('score-summary');
    const matchedKeywordsContainer = document.getElementById('matched-keywords');
    const missingKeywordsContainer = document.getElementById('missing-keywords');
    const structuralChecks = document.getElementById('structural-checks');

    // State Variables
    let currentApiKey = '';
    let tailoredResumeMarkdown = '';
    let tailoredResumeJSON = null;
    let advisorNotes = []; // Stores estimated/credible statements for review

    // Load saved settings from LocalStorage
    initLocalStorage();

    // Event Listeners
    apiKeyInput.addEventListener('input', handleApiKeyChange);
    toggleApiVisibility.addEventListener('click', toggleApiKeyFieldVisibility);
    
    resumeInput.addEventListener('input', updateCharCounters);
    jobDescInput.addEventListener('input', updateCharCounters);
    pdfUpload.addEventListener('change', handlePdfUpload);
    
    btnLoadDemo.addEventListener('click', loadDemoData);
    btnClear.addEventListener('click', clearAll);
    btnTailor.addEventListener('click', tailorResume);
    btnPrint.addEventListener('click', printResume);
    btnDocx.addEventListener('click', generateDocx);
    btnCopyMd.addEventListener('click', copyMarkdown);
    
    // Tab switching logic
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            const targetTab = btn.getAttribute('data-tab');
            document.getElementById(`tab-${targetTab}`).classList.add('active');
        });
    });

    // Navigation logic
    navTailor.addEventListener('click', (e) => {
        e.preventDefault();
        showStudioPanel();
    });
    navGuide.addEventListener('click', (e) => {
        e.preventDefault();
        showGuidePanel();
    });
    btnBackStudio.addEventListener('click', showStudioPanel);

    // Font select change logic
    selectFont.addEventListener('change', () => {
        applySelectedFont();
        localStorage.setItem('rt_font', selectFont.value);
    });

    // Handle updates when editing resume content editable area directly
    renderedResume.addEventListener('input', () => {
        // Sync contents to print container
        atsPrintContainer.innerHTML = renderedResume.innerHTML;
        // Optionally regenerate markdown from HTML (simplified)
        updateMarkdownFromEditable();
    });

    /* ==========================================================================
       Core Functions
       ========================================================================== */

    function initLocalStorage() {
        // Restore API key and font preference only — do NOT auto-restore resume text
        // (user must paste fresh to avoid working with stale tailored data)
        const savedKey = localStorage.getItem('rt_gemini_api_key');
        if (savedKey) {
            currentApiKey = savedKey;
            apiKeyInput.value = savedKey;
            updateApiStatus(true);
        }

        const savedFont = localStorage.getItem('rt_font');
        if (savedFont) {
            selectFont.value = savedFont;
        }

        applySelectedFont();
        updateCharCounters();
    }

    function handleApiKeyChange() {
        currentApiKey = apiKeyInput.value.trim();
        localStorage.setItem('rt_gemini_api_key', currentApiKey);
        updateApiStatus(currentApiKey.length > 0);
    }

    function updateApiStatus(hasKey) {
        if (hasKey) {
            apiStatus.className = 'status-indicator connected';
            apiStatus.innerHTML = '<i class="fa-solid fa-circle"></i> Key Ready';
        } else {
            apiStatus.className = 'status-indicator disconnected';
            apiStatus.innerHTML = '<i class="fa-solid fa-circle"></i> Offline';
        }
    }

    function toggleApiKeyFieldVisibility() {
        const type = apiKeyInput.getAttribute('type') === 'password' ? 'text' : 'password';
        apiKeyInput.setAttribute('type', type);
        
        const icon = toggleApiVisibility.querySelector('i');
        if (type === 'text') {
            icon.className = 'fa-solid fa-eye-slash';
        } else {
            icon.className = 'fa-solid fa-eye';
        }
    }

    function updateCharCounters() {
        resumeCount.textContent = `${resumeInput.value.length.toLocaleString()} characters`;
        jobDescCount.textContent = `${jobDescInput.value.length.toLocaleString()} characters`;
        
        // Save drafts on type
        localStorage.setItem('rt_resume_input', resumeInput.value);
        localStorage.setItem('rt_job_input', jobDescInput.value);
    }

    function showStudioPanel() {
        navTailor.classList.add('active');
        navGuide.classList.remove('active');
        panelStudio.classList.remove('hidden');
        panelGuide.classList.add('hidden');
    }

    function showGuidePanel() {
        navTailor.classList.remove('active');
        navGuide.classList.add('active');
        panelStudio.classList.add('hidden');
        panelGuide.classList.remove('hidden');
    }

    function applySelectedFont() {
        let fontFamily = 'Arial, sans-serif';
        if (selectFont.value === 'Gill Sans MT') {
            fontFamily = '"Gill Sans MT", "Gill Sans", Calibri, "Trebuchet MS", sans-serif';
        } else if (selectFont.value === 'Calibri') {
            fontFamily = 'Calibri, Candara, Segoe, "Segoe UI", Optima, Arial, sans-serif';
        } else if (selectFont.value === 'Times New Roman') {
            fontFamily = '"Times New Roman", Times, Baskerville, Georgia, serif';
        } else if (selectFont.value === 'Georgia') {
            fontFamily = 'Georgia, Times, "Times New Roman", serif';
        }
        resumeSheet.style.fontFamily = fontFamily;
        atsPrintContainer.style.fontFamily = fontFamily;
    }

    /* ==========================================================================
       AI Resume Tailoring Execution — Two-Pass Pipeline
       Pass 1: Tailor to Job Description (keywords, STAR, structure)
       Pass 2: Humanize (scrub AI patterns, vary structure, ATS sanitize)
       ========================================================================== */

    // Master AI word blacklist derived from recruiter research and AI detection studies
    const AI_WORD_BLACKLIST = [
        'spearheaded','spearhead','leveraged','leverage','utilized','utilize',
        'orchestrated','orchestrate','fostered','foster','navigated','navigate',
        'streamlined','streamline','propelled','propel','delved','delve',
        'harnessed','harness','underscored','underscore','pioneered','pioneer',
        'revolutionized','revolutionize','synergy','synergistic','seamlessly',
        'seamless','meticulous','meticulously','robust','dynamic','innovative',
        'transformative','cutting-edge','world-class','comprehensive','paradigm',
        'ecosystem','tapestry','best-of-breed','invaluable','multifaceted',
        'results-driven','results-oriented','detail-oriented','passionate about',
        'team player','self-starter','hard worker','go-getter','people person',
        'strategic thinker','visionary','thought leader','holistic','bespoke',
        'effectively','efficiently','successfully','proactively','collaboratively',
        'impactful','scalable solutions','value-add','game-changer','best practices',
        'stakeholder buy-in','deep dive','move the needle','circle back','bandwidth'
    ];

    async function tailorResume() {
        if (!currentApiKey) {
            alert('Please enter your Gemini API Key in the sidebar to tailor your resume.');
            apiKeyInput.focus();
            return;
        }

        const sourceResume = resumeInput.value.trim();
        const jobDesc = jobDescInput.value.trim();

        if (!sourceResume) {
            alert('Please provide your current resume.');
            resumeInput.focus();
            return;
        }

        if (!jobDesc) {
            alert('Please provide the target job description.');
            jobDescInput.focus();
            return;
        }

        btnTailor.disabled = true;
        tailorSpinner.classList.remove('hidden');

        try {
            // ── PASS 1: Tailor to Job Description ──
            btnTailorText.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i> Pass 1: Tailoring to Job...';
            const pass1 = await callTailorPass(sourceResume, jobDesc);

            // ── PASS 2: Humanize & Sanitize ──
            btnTailorText.innerHTML = '<i class="fa-solid fa-pen-nib"></i> Pass 2: Humanizing...';
            const pass2 = await callHumanizePass(pass1.tailoredResumeMarkdown);

            // Merge: use humanized markdown but keep keyword/score data from pass 1
            const finalResult = {
                ...pass1,
                tailoredResumeMarkdown: sanitizeForATS(pass2.humanizedMarkdown),
                humanizationChanges: pass2.changes || []
            };

            tailoredResumeMarkdown = finalResult.tailoredResumeMarkdown;
            tailoredResumeJSON = finalResult;

            localStorage.setItem('rt_tailored_md', tailoredResumeMarkdown);
            localStorage.setItem('rt_tailored_json', JSON.stringify(finalResult));

            renderResumeOutput(tailoredResumeMarkdown);
            renderAuditInfo(finalResult);

            // Enable export buttons
            btnPrint.disabled = false;
            btnDocx.disabled = false;

            document.querySelector('.tab-btn[data-tab="preview"]').click();

        } catch (error) {
            console.error('Tailoring process failed:', error);
            alert(`Error during tailoring: ${error.message}\n\nPlease check your API key and connection and try again.`);
        } finally {
            btnTailor.disabled = false;
            tailorSpinner.classList.add('hidden');
            btnTailorText.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Optimize & Tailor Resume';
        }
    }

    /* ── PASS 1: Keyword tailoring, STAR structure, 2-page limit, credible metrics ── */
    async function callTailorPass(resume, jobDesc) {
        const enforceSTAR = checkboxEnforceStar.checked;

        const systemPrompt = `You are an elite ATS Optimization Coach, Resume Tailoring Agent, and Career Advisor specializing in non-profit and mission-driven organizations.
Adapt the candidate's resume to the target job description provided.
Return ONLY a raw JSON object (no markdown code fences). Use this EXACT schema:
{
  "tailoredResumeMarkdown": "Full tailored resume in standard markdown",
  "matchedKeywords": ["array of exact keywords/skills present in BOTH the JD and tailored resume"],
  "missingKeywords": ["array of JD keywords not represented in the resume due to genuine lack of experience"],
  "atsScore": 0,
  "checks": { "singleColumn": true, "atsFont": true, "starFormat": true, "summaryLength": true },
  "advisorNotes": [
    {
      "bulletText": "The exact bullet point text that contains the estimated statement",
      "rationale": "Why this number/claim is plausible based on industry norms or role context",
      "replaceWith": "Suggested instruction for the candidate: e.g. Replace [23] with your actual average attendance figure"
    }
  ]
}

RULES:

1. 2-PAGE MAXIMUM — CRITICAL:
   - The entire resume MUST fit within 2 pages when printed at Letter size (8.5x11in), 1-inch margins, 11pt Calibri font.
   - Maximum total word count: 650 words across the entire resume.
   - Professional Summary: 3 sentences max (40 words max).
   - Each role: maximum 4 bullet points. Trim older or less relevant roles to 2-3 bullets.
   - Skills section: single comma-separated line per category, no bullet per skill.
   - Do NOT include more than 3 roles under Professional Experience (prioritize most recent/relevant).
   - Education: one line per degree (Degree, Institution, Year). No descriptions.

2. KEYWORD MATCH — Exact Terminology:
   - Mirror exact spellings from the JD (e.g. "Salesforce" not "CRM platform").
   - Identify the top 12-15 hard skills/requirements in the JD. Represent at least 85% in the resume.
   - Integrate keywords naturally into bullets AND Skills — never keyword-stuff.
   - Use exact job title from posting in the professional summary.

3. STAR BULLETS — Action + Context + Quantified Result:
   ${enforceSTAR ? '- STRICT: Every bullet MUST include a metric or a plausible credible estimate (see Rule 4).' : '- Best effort: include metrics where natural.'}
   - Wrap job-description-aligned keywords you added as: [added: keyword]

4. CREDIBLE METRICS SKILL (Career Advisor Mode):
   When the source resume lacks a verifiable metric for a bullet point, DO NOT leave it vague.
   Instead, generate a PLAUSIBLE, INDUSTRY-APPROPRIATE, DEFENSIBLE estimate using this framework:
   a) Draw on widely-documented industry norms for that role type (e.g. average church staff ratios, non-profit volunteer engagement rates, typical program participation numbers).
   b) Use IMPERFECT SPECIFICITY — odd numbers feel real: 23 not 20, 47 not 50, 14 months not 1 year.
   c) Frame with softening language that is still strong: "approximately", "averaging", "across [X] events", "for a congregation of [N]"
   d) Wrap the estimated portion in [estimated: text] tags so the UI can highlight it for review.
   e) Add an entry to the advisorNotes array explaining the rationale and what the candidate should verify.

   Example transformation:
   Source: "Coordinated Sunday services and weekly programs"
   Credible version: "Coordinated Sunday services for a congregation of [estimated: approximately 200 attendees], overseeing [estimated: 4] weekly programs and reducing scheduling conflicts by [estimated: 30]%"
   Advisor note: { bulletText: "...", rationale: "Mid-size evangelical congregations in the US average 150-250 Sunday attendees per national church data", replaceWith: "Replace [200] with your church's actual weekly attendance figure" }

5. SECTION HEADERS — use ONLY these exact names:
   "Professional Summary", "Professional Experience", "Education", "Skills", "Certifications"

6. FORMAT RULES (ATS-safe):
   - Section headers: ## SectionName (e.g. ## Professional Summary, ## Skills)
   - Company header: ### Company Name | City, ST
   - Role/date: **Job Title** | *Month YYYY - Month YYYY*
   - Use only hyphen (-) as bullet character
   - Straight dashes only, never em dashes
   - Straight quotes only
   - CRITICAL: The AI output is standard markdown. Use ## for section headers and ### for company names only. Do NOT use ### for section headers like Professional Summary, Skills, etc.

7. SCORING — atsScore = Math.round((matchedKeywords.length / (matchedKeywords.length + missingKeywords.length)) * 100)`;

        return await callGeminiRaw(systemPrompt,
            `=== SOURCE RESUME ===\n${resume}\n\n=== TARGET JOB DESCRIPTION ===\n${jobDesc}`
        );
    }

    /* ── PASS 2: Humanize — scrub AI patterns, vary structure, fix encoding ── */
    async function callHumanizePass(markdown) {
        const blacklistStr = AI_WORD_BLACKLIST.join(', ');

        const systemPrompt = `You are an expert resume humanizer. Make AI-generated resume content sound like it was written by a thoughtful, experienced human professional.

Return ONLY a raw JSON object (no markdown code fences):
{
  "humanizedMarkdown": "The full humanized resume in standard markdown",
  "changes": ["array of up to 8 brief descriptions of the most significant changes made"]
}

HUMANIZATION RULES (apply ALL):

1. AI WORD ELIMINATION — Replace EVERY instance of:
   ${blacklistStr}
   Use specific, concrete language. Delete fillers.

2. ADVERB REMOVAL — Delete all of: effectively, efficiently, successfully, quickly, proactively, seamlessly, collaboratively
   Replace each with a metric or concrete detail instead.

3. PASSIVE VOICE — Rewrite:
   "was responsible for" → strong action verb
   "was involved in" → specific contribution
   "duties included" → achievement statement

4. BULLET STRUCTURAL VARIETY:
   - Mix lengths: short (5-8 words), medium (12-18), longer (20-28)
   - Vary opening words — never 3 consecutive bullets starting the same
   - Use contextual openers occasionally: "After identifying...", "During the..."
   - At least one bullet per role describes a challenge or decision

5. IMPERFECT SPECIFICITY:
   - Round numbers → odd: 20% → 23%, team of 10 → 11-person team
   - Vague time → exact: "several months" → "14 months"
   - NEVER alter [estimated: ...] tags — preserve them exactly as written
   - NEVER alter [placeholder] metric brackets

6. SUMMARY SECTION structure:
   Line 1: [Job Title] with [X] years in [specific domain]. Facts only.
   Lines 2-3: 1-2 quantified proof points matching the role.
   Line 4: Differentiating statement about your specific method or niche.
   Total: 3-4 lines max.

7. ATS CHARACTER SAFETY — Replace:
   em dash — → hyphen -
   curly quotes and apostrophes → straight
   ellipsis char ... → three dots
   any non-ASCII bullet → hyphen -

8. PRESERVE ALL: [added: keyword] tags, [estimated: text] tags, [placeholder] brackets, markdown structure, section ordering.
   DO NOT alter any content inside [estimated: ...] brackets.`;

        return await callGeminiRaw(systemPrompt,
            `=== RESUME TO HUMANIZE ===\n${markdown}`
        );
    }

    /* ── Shared Gemini API caller ── */
    async function callGeminiRaw(systemPrompt, userPrompt) {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${currentApiKey}`;

        const requestBody = {
            contents: [{ parts: [{ text: systemPrompt }, { text: userPrompt }] }],
            generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.3
            }
        };

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error?.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        try {
            const rawText = data.candidates[0].content.parts[0].text;
            return JSON.parse(rawText.trim());
        } catch (e) {
            console.error('Failed to parse Gemini JSON output:', data);
            throw new Error('The AI returned an invalid response. Please try again.');
        }
    }

    /* ── ATS Character Sanitizer — makes text safe for all ATS parsers ── */
    function sanitizeForATS(text) {
        if (!text) return text;
        return text
            .replace(/\u2014/g, '-')           // em dash → hyphen
            .replace(/\u2013/g, '-')           // en dash → hyphen
            .replace(/\u201C|\u201D/g, '"')    // curly double quotes → straight
            .replace(/\u2018|\u2019/g, "'")    // curly single quotes → straight
            .replace(/\u2026/g, '...')         // ellipsis char → three dots
            .replace(/\u2022/g, '-')           // bullet • → hyphen
            .replace(/[\u2023\u2043\u204C\u204D\u2219]/g, '-')  // other bullet variants
            .replace(/[\u00E9\u00E8\u00EA\u00EB]/g, 'e')   // é è ê ë → e (optional safety)
            .replace(/\uFB01/g, 'fi')          // fi ligature
            .replace(/\uFB02/g, 'fl');         // fl ligature
    }

    /* ── AI Detection Risk Scorer (client-side heuristic) ── */
    function computeAIRiskScore(markdown) {
        if (!markdown) return 0;
        const text = markdown.toLowerCase();
        const words = text.split(/\s+/);
        const totalWords = words.length;
        if (totalWords === 0) return 0;

        // 1. Blacklisted word frequency (50% weight)
        let blacklistHits = 0;
        AI_WORD_BLACKLIST.forEach(term => {
            const regex = new RegExp('\\b' + term.replace(/[-]/g, '[-\\s]?') + '\\b', 'gi');
            const matches = text.match(regex);
            if (matches) blacklistHits += matches.length;
        });
        const blacklistScore = Math.min(100, (blacklistHits / Math.max(totalWords / 50, 1)) * 100);

        // 2. Bullet opener repetition (25% weight)
        const bullets = markdown.match(/^[-*]\s+\*?\*?([A-Za-z]+)/gm) || [];
        const openers = bullets.map(b => b.replace(/^[-*]\s+\*?\*?/, '').split(/\s/)[0].toLowerCase());
        let repeatCount = 0;
        for (let i = 2; i < openers.length; i++) {
            if (openers[i] === openers[i-1] && openers[i] === openers[i-2]) repeatCount++;
        }
        const repetitionScore = Math.min(100, (repeatCount / Math.max(bullets.length / 3, 1)) * 100);

        // 3. Sentence length uniformity — low burstiness = high AI (25% weight)
        const sentences = markdown.split(/[.!?]+/).map(s => s.trim().split(/\s+/).length).filter(l => l > 3);
        let uniformityScore = 0;
        if (sentences.length > 2) {
            const avg = sentences.reduce((a, b) => a + b, 0) / sentences.length;
            const variance = sentences.reduce((sum, l) => sum + Math.pow(l - avg, 2), 0) / sentences.length;
            const stdDev = Math.sqrt(variance);
            // Low stdDev (uniform) = high AI risk; High stdDev (varied) = low AI risk
            uniformityScore = Math.max(0, 100 - (stdDev * 8));
        }

        const final = Math.round((blacklistScore * 0.50) + (repetitionScore * 0.25) + (uniformityScore * 0.25));
        return Math.min(100, Math.max(0, final));
    }

    /* ==========================================================================
       Rendering & Parsers (Markdown to Print HTML)
       ========================================================================== */

    function renderResumeOutput(markdown) {
        previewEmpty.classList.add('hidden');
        resumeSheet.classList.remove('hidden');
        editBanner.classList.remove('hidden');
        btnPrint.disabled = false;
        
        markdownOutput.value = markdown;

        // Parse markdown to rich styled HTML
        const htmlContent = parseMarkdownToATS(markdown);
        renderedResume.innerHTML = htmlContent;
        
        // Sync to print container
        atsPrintContainer.innerHTML = htmlContent;
    }

    function parseMarkdownToATS(md) {
        if (!md) return '';

        // Safe escape HTML characters first to avoid issues
        let html = md
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        // 1. Name parsing: detect first header e.g. # John Doe
        // Match `# Name` at the top and build header
        const nameMatch = html.match(/^#\s+(.+)$/m);
        let nameHtml = '';
        if (nameMatch) {
            const name = nameMatch[1];
            nameHtml = `<h1>${name}</h1>`;
            // Remove name line from parsing
            html = html.replace(/^#\s+.+$/m, '');
        }

        // 2. Contact details: check for lines like "City, State | Phone | Email..."
        // Typically immediately follows the name
        const contactLines = html.match(/^([^\n#]+@+[^\n#]+|[^\n#]+\|\s*[^\n#]+)/m);
        let contactHtml = '';
        if (contactLines) {
            const contact = contactLines[0].trim();
            contactHtml = `<div class="contact-info">${contact}</div>`;
            html = html.replace(contactLines[0], '');
        }

        // 3. Section headings (## Professional Experience)
        html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');

        // 4. Job subheadings and experience item wrappers
        // Capture blocks of job titles. E.g.:
        // ### Acme Corp — San Francisco, CA or ### Acme Corp | San Francisco, CA
        // **Software Engineer** | *Jan 2020 – Present*
        // We want to transform these into semantic blocks.
        
        // Detect job company & location headers: `### Company — Location` or `### Company | Location`
        html = html.replace(/^###\s*(.+?)\s*[|—–-]\s*(.+?)$/gm, '<div class="experience-item"><div class="item-header"><span>$1</span><span>$2</span></div>');
        
        // Fallback: any remaining ### lines that didn't match the company-location pattern
        html = html.replace(/^###\s+(.+)$/gm, '<div class="experience-item"><div class="item-header"><span>$1</span><span></span></div>');
        
        // Match job title & dates: `**Title** [separator] *Dates*` (supports various separators like |, -, —, and optional italics)
        html = html.replace(/^\*\*(.+?)\*\*\s*[|,—–-]\s*(?:\*(.+?)\*|(.+?))$/gm, (match, title, datesItalic, datesNormal) => {
            const dates = datesItalic || datesNormal || '';
            return `<div class="item-subheader"><span>${title}</span><span>${dates.trim()}</span></div>`;
        });

        // 5. Bullet Lists — handle both * and - style bullets
        // Replace list bullet points (supports * and - prefixes)
        html = html.replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>');
        
        // Wrap adjacent <li> lines inside <ul>
        // Match sequence of <li> tags and wrap them
        html = html.replace(/(<li>.*?<\/li>\s*)+/gs, (match) => {
            return `<ul>\n${match}</ul>\n`;
        });

        // Close experience-item divs before headings or end of text
        // In markdown, an experience item ends when the next job header (###) or section (##) begins
        const segments = html.split('<h2>');
        for (let i = 0; i < segments.length; i++) {
            // If it's a section, process experience item closings
            if (segments[i].includes('class="experience-item"')) {
                const subsegments = segments[i].split('<div class="experience-item">');
                for (let j = 1; j < subsegments.length; j++) {
                    // Wrap the end of lists and the block
                    subsegments[j] = subsegments[j] + '</div>'; // Close experience-item
                }
                segments[i] = subsegments.join('<div class="experience-item">');
            }
        }
        html = segments.join('<h2>');

        // 6. Bold formatting (**word**)
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // 6.5. Added highlights: e.g. [added: React]
        html = html.replace(/\[added:\s*([^\]]+)\]/g, '<span class="added-highlight" title="Added to align with Job Description">$1</span>');

        // 6.6. Estimated statement highlights: e.g. [estimated: approximately 200]
        // These are credible-metrics statements generated by the advisor when no real data existed
        html = html.replace(/\[estimated:\s*([^\]]+)\]/gi, '<span class="estimated-highlight" title="Advisor-estimated statement — verify with your real data">$1</span>');

        // 7. Metric placeholders styling: e.g. [20]% or [X] hours
        // Replace bracketed metrics with highlighted spans
        html = html.replace(/\[([^\]]+)\]/g, '<span class="metric-placeholder" title="Click to edit metric">$1</span>');

        // Clean up paragraph spacing (double newlines to <p>)
        // Avoid wraps around headers and items
        const lines = html.split('\n');
        const processedLines = lines.map(line => {
            const trimmed = line.trim();
            if (!trimmed) return '';
            if (trimmed.startsWith('<h') || 
                trimmed.startsWith('</h') || 
                trimmed.startsWith('<div') || 
                trimmed.startsWith('</div') || 
                trimmed.startsWith('<ul') || 
                trimmed.startsWith('</ul') || 
                trimmed.startsWith('<li') || 
                trimmed.startsWith('</li')) {
                return line;
            }
            return `<p>${trimmed}</p>`;
        });
        
        html = processedLines.join('\n');

        // Clean up empty lines and reconstruct full document
        let finalHtml = '';
        if (nameHtml) finalHtml += nameHtml;
        if (contactHtml) finalHtml += contactHtml;
        finalHtml += html;

        return finalHtml;
    }

    function updateMarkdownFromEditable() {
        // Simplified markdown exporter from rich HTML
        // This keeps the source tab updated when editing text directly in the resume editor
        let tempDiv = document.createElement('div');
        tempDiv.innerHTML = renderedResume.innerHTML;
        
        let md = '';

        // Extract name
        const h1 = tempDiv.querySelector('h1');
        if (h1) md += `# ${h1.textContent}\n`;

        // Extract contact info
        const contact = tempDiv.querySelector('.contact-info');
        if (contact) md += `${contact.textContent}\n\n`;

        // Process sections child by child
        const children = Array.from(tempDiv.children);
        children.forEach(el => {
            if (el.tagName === 'H2') {
                md += `\n## ${el.textContent}\n`;
            } else if (el.classList.contains('experience-item')) {
                const header = el.querySelector('.item-header');
                if (header) {
                    const spans = header.querySelectorAll('span');
                    md += `\n### ${spans[0]?.textContent || ''} — ${spans[1]?.textContent || ''}\n`;
                }
                const subheader = el.querySelector('.item-subheader');
                if (subheader) {
                    const spans = subheader.querySelectorAll('span');
                    md += `**${spans[0]?.textContent || ''}** | *${spans[1]?.textContent || ''}*\n`;
                }
                const ul = el.querySelector('ul');
                if (ul) {
                    const lis = ul.querySelectorAll('li');
                    lis.forEach(li => {
                        // Re-wrap metric placeholders back to markdown brackets
                        let liText = li.innerHTML;
                        // Replace added highlights back to markdown brackets
                        liText = liText.replace(/<span class="added-highlight"[^>]*>(.*?)<\/span>/g, '[added: $1]');
                        // Replace spans back to brackets
                        liText = liText.replace(/<span class="metric-placeholder"[^>]*>(.*?)<\/span>/g, '[$1]');
                        // Remove other inline html
                        const tempLi = document.createElement('li');
                        tempLi.innerHTML = liText;
                        md += `* ${tempLi.textContent}\n`;
                    });
                }
            } else if (el.tagName === 'P') {
                let pText = el.innerHTML;
                pText = pText.replace(/<span class="added-highlight"[^>]*>(.*?)<\/span>/g, '[added: $1]');
                pText = pText.replace(/<span class="metric-placeholder"[^>]*>(.*?)<\/span>/g, '[$1]');
                const tempP = document.createElement('p');
                tempP.innerHTML = pText;
                md += `${tempP.textContent}\n\n`;
            } else if (el.tagName === 'UL' && !el.closest('.experience-item')) {
                // Standalone lists e.g. Skills
                const lis = el.querySelectorAll('li');
                lis.forEach(li => {
                    let liText = li.innerHTML;
                    liText = liText.replace(/<span class="added-highlight"[^>]*>(.*?)<\/span>/g, '[added: $1]');
                    liText = liText.replace(/<span class="metric-placeholder"[^>]*>(.*?)<\/span>/g, '[$1]');
                    const tempLi = document.createElement('li');
                    tempLi.innerHTML = liText;
                    md += `* ${tempLi.textContent}\n`;
                });
            }
        });

        tailoredResumeMarkdown = md.trim();
        markdownOutput.value = tailoredResumeMarkdown;
        localStorage.setItem('rt_tailored_md', tailoredResumeMarkdown);
    }

    function renderAuditInfo(result) {
        // ── ATS Compatibility Score (keyword overlap + structural) ──
        let score = 0;
        const matchedCount = result.matchedKeywords?.length || 0;
        const missingCount = result.missingKeywords?.length || 0;
        const totalKeywords = matchedCount + missingCount;

        if (totalKeywords > 0) {
            const keywordScore = (matchedCount / totalKeywords) * 100;
            const checks = result.checks || {};
            let structuralPoints = 0;
            if (checks.singleColumn !== false) structuralPoints += 6.25;
            if (checks.atsFont !== false) structuralPoints += 6.25;
            if (checks.starFormat !== false) structuralPoints += 6.25;
            if (checks.summaryLength !== false) structuralPoints += 6.25;
            score = Math.round((keywordScore * 0.75) + structuralPoints);
        } else {
            score = result.atsScore || 0;
        }
        scoreText.textContent = `${score}%`;
        const atsOffset = 283 - (283 * score / 100);
        scoreProgress.style.strokeDashoffset = atsOffset;
        scoreSummary.innerHTML = `Matches <strong>${matchedCount}</strong> core requirements. <strong>${missingCount}</strong> gaps to review.`;

        // ── AI Detection Risk Score (client-side heuristic) ──
        const riskScore = computeAIRiskScore(result.tailoredResumeMarkdown || tailoredResumeMarkdown);
        const riskEl = document.getElementById('ai-risk-score');
        const riskRing = document.getElementById('ai-risk-progress');
        const riskSummary = document.getElementById('ai-risk-summary');
        const riskLabel = document.getElementById('ai-risk-label');
        if (riskEl) riskEl.textContent = `${riskScore}%`;
        if (riskRing) {
            const riskOffset = 283 - (283 * riskScore / 100);
            riskRing.style.strokeDashoffset = riskOffset;
            riskRing.style.stroke = riskScore <= 30 ? 'hsl(145, 65%, 45%)' :
                                     riskScore <= 60 ? 'hsl(38, 92%, 50%)' :
                                                       'hsl(354, 70%, 54%)';
        }
        if (riskLabel) {
            riskLabel.textContent = riskScore <= 30 ? 'Low Risk — Human-sounding' :
                                     riskScore <= 60 ? 'Medium Risk — Review recommended' :
                                                       'High Risk — Likely AI-detectable';
            riskLabel.className = riskScore <= 30 ? 'risk-label risk-safe' :
                                   riskScore <= 60 ? 'risk-label risk-warn' :
                                                     'risk-label risk-danger';
        }
        if (riskSummary) {
            riskSummary.textContent = riskScore <= 30
                ? 'Content reads as human-authored. Proceed to submit.'
                : riskScore <= 60
                ? 'A few AI patterns detected. Review highlighted keywords and vary sentence openers.'
                : 'Strong AI signal detected. Replace blacklisted words and add imperfect specificity (odd numbers, named tools).';
        }

        // ── Humanization changes list ──
        const changesContainer = document.getElementById('humanization-changes');
        if (changesContainer) {
            changesContainer.innerHTML = '';
            const changes = result.humanizationChanges || [];
            if (changes.length > 0) {
                changes.forEach(change => {
                    const li = document.createElement('li');
                    li.className = 'checked';
                    li.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${change}`;
                    changesContainer.appendChild(li);
                });
            } else {
                changesContainer.innerHTML = '<li class="unchecked"><i class="fa-solid fa-circle-notch"></i> No humanization log available yet.</li>';
            }
        }

        // ── Keyword tags ──
        matchedKeywordsContainer.innerHTML = '';
        if (matchedCount > 0) {
            result.matchedKeywords.forEach(kw => {
                const span = document.createElement('span');
                span.className = 'keyword-tag matched';
                span.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${kw}`;
                matchedKeywordsContainer.appendChild(span);
            });
        } else {
            matchedKeywordsContainer.innerHTML = '<p class="empty-msg">No matched keywords detected.</p>';
        }

        missingKeywordsContainer.innerHTML = '';
        if (missingCount > 0) {
            result.missingKeywords.forEach(kw => {
                const span = document.createElement('span');
                span.className = 'keyword-tag missing';
                span.innerHTML = `<i class="fa-solid fa-circle-question"></i> ${kw}`;
                missingKeywordsContainer.appendChild(span);
            });
        } else {
            missingKeywordsContainer.innerHTML = '<p class="empty-msg">Perfect match! No key missing terms.</p>';
        }

        // ── Structural checks ──
        const checks = result.checks || {};
        const checklistItems = [
            { key: 'singleColumn', text: 'Single-column layout (no tables/sidebars)' },
            { key: 'atsFont', text: 'Web-safe ATS font selected' },
            { key: 'starFormat', text: 'STAR bullet format with metrics' },
            { key: 'summaryLength', text: 'Summary: 3-4 lines, no hollow adjectives' },
            { key: 'atsChars', text: 'ATS-safe characters only (no em-dashes, smart quotes)' }
        ];

        structuralChecks.innerHTML = '';
        checklistItems.forEach(item => {
            const li = document.createElement('li');
            // atsChars is always true after our sanitizer runs
            const pass = item.key === 'atsChars' ? true : checks[item.key] !== false;
            li.className = pass ? 'checked' : 'unchecked';
            li.innerHTML = pass
                ? `<i class="fa-solid fa-circle-check"></i> ${item.text}`
                : `<i class="fa-solid fa-circle-xmark text-danger"></i> ${item.text}`;
            structuralChecks.appendChild(li);
        });

        // ── Advisor Notes (Estimated / Credible Statements) ──
        advisorNotes = result.advisorNotes || [];
        const advisorContainer = document.getElementById('advisor-notes-list');
        if (advisorContainer) {
            advisorContainer.innerHTML = '';
            if (advisorNotes.length > 0) {
                advisorNotes.forEach((note, idx) => {
                    const card = document.createElement('div');
                    card.className = 'advisor-card';
                    card.innerHTML = `
                        <div class="advisor-card-header">
                            <span class="advisor-badge">#${idx + 1} Estimated Statement</span>
                        </div>
                        <p class="advisor-bullet"><strong>In resume:</strong> ${note.bulletText || 'N/A'}</p>
                        <p class="advisor-rationale"><i class="fa-solid fa-circle-info"></i> <strong>Why it's credible:</strong> ${note.rationale || 'Based on industry norms.'}</p>
                        <p class="advisor-action"><i class="fa-solid fa-pen-to-square"></i> <strong>Your action:</strong> ${note.replaceWith || 'Verify this figure and replace with your real data.'}</p>
                    `;
                    advisorContainer.appendChild(card);
                });
            } else {
                advisorContainer.innerHTML = '<p class="empty-msg">No estimated statements — all metrics came from your source resume.</p>';
            }
        }
    }


    /* ==========================================================================
       DOC Generation — ATS-safe Word document from rendered resume HTML
       Uses HTML-based .doc format (no external CDN needed). Word opens natively.
       ========================================================================== */

    async function generateDocx() {
        if (!tailoredResumeMarkdown && !renderedResume.innerHTML) return;

        try {
            btnDocx.disabled = true;
            btnDocx.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Building DOC...';

            // Get the selected font
            const selectedFont = selectFont.value || 'Gill Sans MT';
            const fontStack = selectedFont === 'Gill Sans MT'
                ? '"Gill Sans MT", "Gill Sans", Calibri, "Trebuchet MS", sans-serif'
                : selectedFont === 'Calibri'
                ? 'Calibri, Candara, Segoe, "Segoe UI", Optima, Arial, sans-serif'
                : selectedFont === 'Times New Roman'
                ? '"Times New Roman", Times, Baskerville, Georgia, serif'
                : selectedFont === 'Georgia'
                ? 'Georgia, Times, "Times New Roman", serif'
                : 'Arial, sans-serif';

            // Clean the markdown: strip tags and markdown characters
            const cleanTag = str => str
                .replace(/\[estimated:\s*([^\]]+)\]/gi, '$1')
                .replace(/\[added:\s*([^\]]+)\]/gi, '$1')
                .replace(/\[([^\]]+)\]/g, '$1');

            // Parse markdown into clean HTML for Word
            const lines = tailoredResumeMarkdown.split('\n');
            let bodyHtml = '';
            let candidateName = '';

            for (let i = 0; i < lines.length; i++) {
                const trimmed = lines[i].trim();
                if (!trimmed) {
                    bodyHtml += '<p style="margin:0;font-size:2pt;">&nbsp;</p>\n';
                    continue;
                }

                const clean = cleanTag(trimmed);

                // Strip markdown bold/italic for clean Word text
                const stripMd = (text) => text
                    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
                    .replace(/\*([^*]+)\*/g, '$1')
                    .replace(/^#+\s*/, '');

                // H1 = candidate name
                if (trimmed.startsWith('# ')) {
                    candidateName = clean.replace(/^#\s*/, '');
                    bodyHtml += `<p style="text-align:center;font-size:18pt;font-weight:bold;margin:0 0 2pt 0;color:#1a1a2e;">${candidateName}</p>\n`;

                // H2 = section header
                } else if (trimmed.startsWith('## ')) {
                    const header = clean.replace(/^##\s*/, '');
                    bodyHtml += `<p style="font-size:12pt;font-weight:bold;margin:14pt 0 4pt 0;color:#000;">${header}</p>\n`;

                // H3 = company name
                } else if (trimmed.startsWith('### ')) {
                    const company = clean.replace(/^###\s*/, '');
                    bodyHtml += `<p style="font-size:11pt;font-weight:bold;margin:8pt 0 2pt 0;color:#2c2c54;">${company}</p>\n`;

                // Bullet point
                } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                    const bulletText = stripMd(clean.slice(2));
                    bodyHtml += `<p style="font-size:11pt;margin:0 0 2pt 18pt;text-indent:-12pt;">&#8226; ${bulletText}</p>\n`;

                // Contact line (contains @ or |)
                } else if (trimmed.includes('@') || (trimmed.includes('|') && i < 5)) {
                    bodyHtml += `<p style="text-align:center;font-size:10pt;margin:0 0 2pt 0;color:#333;">${stripMd(clean)}</p>\n`;

                // Regular paragraph
                } else {
                    bodyHtml += `<p style="font-size:11pt;margin:0 0 2pt 0;">${stripMd(clean)}</p>\n`;
                }
            }

            // Build the complete Word-compatible HTML document
            const docContent = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
xmlns:w="urn:schemas-microsoft-com:office:word"
xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<meta name="ProgId" content="Word.Document">
<meta name="Generator" content="ResumeTailor">
<!--[if gte mso 9]>
<xml>
<w:WordDocument>
<w:View>Print</w:View>
<w:Zoom>100</w:Zoom>
<w:DoNotOptimizeForBrowser/>
</w:WordDocument>
</xml>
<![endif]-->
<style>
@page {
    size: 8.5in 11in;
    margin: 0.75in 0.85in 0.75in 0.85in;
}
body {
    font-family: ${fontStack};
    font-size: 11pt;
    line-height: 1.3;
    color: #000;
}
p { margin: 0 0 2pt 0; }
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;

            // Generate and download as .doc
            const blob = new Blob([docContent], { type: 'application/msword' });
            const safeName = (candidateName || 'Resume').replace(/\s+/g, '_');
            const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `${safeName}_Tailored_Resume_${today}.doc`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(a.href);

        } catch (err) {
            console.error('DOC generation failed:', err);
            alert('Could not generate DOC file: ' + err.message);
        } finally {
            btnDocx.disabled = false;
            btnDocx.innerHTML = '<i class="fa-solid fa-file-word"></i> Download DOC';
        }
    }

    /* ==========================================================================
       Print & Action Utilities
       ========================================================================== */

    function printResume() {
        if (!renderedResume.innerHTML) return;
        
        // Sync the print container's HTML structure and font family
        atsPrintContainer.innerHTML = renderedResume.innerHTML;
        atsPrintContainer.style.fontFamily = resumeSheet.style.fontFamily;
        
        // Trigger browser print dialog (Ctrl+P)
        window.print();
    }

    function copyMarkdown() {
        if (!tailoredResumeMarkdown) return;
        
        navigator.clipboard.writeText(tailoredResumeMarkdown)
            .then(() => {
                btnCopyMd.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
                btnCopyMd.classList.add('btn-primary');
                setTimeout(() => {
                    btnCopyMd.innerHTML = '<i class="fa-solid fa-copy"></i> Copy Markdown';
                    btnCopyMd.classList.remove('btn-primary');
                }, 2000);
            })
            .catch(err => {
                alert('Could not copy markdown to clipboard: ' + err.message);
            });
    }

    function clearAll() {
        // Clear all input fields immediately — no confirm dialog
        resumeInput.value = '';
        jobDescInput.value = '';
        markdownOutput.value = '';
        renderedResume.innerHTML = '';
        atsPrintContainer.innerHTML = '';

        previewEmpty.classList.remove('hidden');
        resumeSheet.classList.add('hidden');
        editBanner.classList.add('hidden');
        btnPrint.disabled = true;
        btnDocx.disabled = true;

        tailoredResumeMarkdown = '';
        tailoredResumeJSON = null;
        advisorNotes = [];

        // Wipe ALL saved resume data from localStorage (keep only API key + font)
        ['rt_resume_input', 'rt_job_input', 'rt_tailored_md', 'rt_tailored_json'].forEach(k => localStorage.removeItem(k));

        // Reset audit panel
        renderAuditInfo({
            atsScore: 0,
            matchedKeywords: [],
            missingKeywords: [],
            checks: { singleColumn: false, atsFont: false, starFormat: false, summaryLength: false }
        });

        updateCharCounters();

        // Visual feedback on the button
        btnClear.innerHTML = '<i class="fa-solid fa-check"></i> Cleared!';
        setTimeout(() => {
            btnClear.innerHTML = '<i class="fa-solid fa-trash-can"></i> Clear All';
        }, 1500);
    }


    /* ==========================================================================
       Demo / Dummy Data
       ========================================================================== */

    function loadDemoData() {
        resumeInput.value = `John Doe
New York, NY | (555) 019-2834 | john.doe@email.com | linkedin.com/in/johndoe

Professional Summary
Experienced Software Engineer with a history of working in the web development industry. Skilled in HTML, CSS, JavaScript, React, Node.js, and SQL databases. Strong engineering professional with a Bachelor's degree in Computer Science.

Professional Experience

Acme Web Solutions — Brooklyn, NY
Software Engineer | Jan 2024 – Present
* Responsible for developing front-end features using React and Redux.
* Worked on improving the load speed of client sites.
* Collaborated with UX designers to make the app more accessible.
* Helped set up Git workflows and helped junior developers on the team.

WebCraft Systems — Boston, MA
Junior Developer | Jun 2022 – Dec 2023
* Maintained existing features of a SaaS platform built with JavaScript and Express.
* Fixed bugs and security issues in the database layers.
* Participated in code reviews and scrum meetings.

Education
B.S. in Computer Science — Boston University, Boston, MA | 2022`;

        jobDescInput.value = `Senior Frontend Engineer (React/TypeScript)

Company Overview:
We are a fast-growing FinTech company building beautiful digital banking interfaces. We are looking for an experienced Senior Frontend Engineer with expert knowledge in React, TypeScript, and modern state management.

Key Responsibilities:
- Design and develop robust, scalable, and responsive web applications using React 18 and TypeScript.
- Optimize web applications for maximum performance, reducing page load times and bundle sizes.
- Establish and enforce front-end coding standards, linting rules, and unit testing patterns.
- Drive CI/CD pipeline automation for quick and reliable code releases.
- Collaborate with designers to construct accessible components (WCAG AA compliance).

Key Qualifications:
- 3+ years of professional front-end experience.
- Expert skill with React (Hooks, Context), TypeScript, and TailwindCSS or Styled Components.
- Proven experience optimizing web performance (Core Web Vitals, bundle analysis, lazy loading).
- Strong experience with Git, CI/CD tools (GitHub Actions/CircleCI), and automated unit testing (Jest/Testing Library).
- Passion for crafting clean, human-readable code.`;

        updateCharCounters();
        
        // Show indicator toast / feedback
        alert('Demo data loaded successfully! Enter your Gemini API key in the sidebar, choose parameters, and click "Optimize & Tailor Resume" to run the tailoring agent.');
    }

    async function handlePdfUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            alert('Please upload a valid PDF file.');
            return;
        }

        // Configure PDF.js worker
        if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
        } else {
            alert('PDF parser library failed to load. Please verify your internet connection.');
            return;
        }

        // Set UI loading state
        const originalText = pdfUploadLabel.innerHTML;
        pdfUploadLabel.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Parsing...';
        pdfUploadLabel.classList.add('parsing');
        pdfUpload.disabled = true;

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let fullText = '';

            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                const textContent = await page.getTextContent();
                
                // Sort items by position to ensure logical reading order (top-to-bottom, left-to-right)
                const items = textContent.items;
                
                // Sort items vertically descending (top first), then horizontally ascending (left first)
                items.sort((a, b) => {
                    const yDiff = b.transform[5] - a.transform[5];
                    if (Math.abs(yDiff) < 5) { // Same line (threshold of 5px)
                        return a.transform[4] - b.transform[4];
                    }
                    return yDiff;
                });

                let lastY = null;
                let pageText = '';
                for (const item of items) {
                    if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
                        pageText += '\n'; // Add line break if vertical coordinate changes
                    } else if (lastY !== null) {
                        pageText += ' '; // Add space between words on the same line
                    }
                    pageText += item.str;
                    lastY = item.transform[5];
                }
                
                fullText += pageText + '\n\n';
            }

            if (fullText.trim().length === 0) {
                throw new Error("No text content could be extracted from this PDF. It might be scanned. Please upload a text-based PDF.");
            }

            resumeInput.value = fullText.trim();
            updateCharCounters();
            alert('Resume text successfully extracted from PDF!');

        } catch (error) {
            console.error('Error parsing PDF:', error);
            alert(`Error parsing PDF: ${error.message}`);
        } finally {
            pdfUploadLabel.innerHTML = originalText;
            pdfUploadLabel.classList.remove('parsing');
            pdfUpload.disabled = false;
            event.target.value = '';
        }
    }
});
