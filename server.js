const express = require('express');
const cors    = require('cors');
const path    = require('path');
require('dotenv').config();

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ─────────────────────────────────────────────────────────────────────────────
// MASTER SYSTEM PROMPT — sharpened for JSON output + viral intelligence
// ─────────────────────────────────────────────────────────────────────────────
const MASTER_SYSTEM_PROMPT = `You are Capria — a senior creative strategist and viral content engine for Instagram and TikTok.

You have studied what makes content explode: algorithms, scroll psychology, hook anatomy, emotional triggers, and save behavior.

VIRAL LAWS — apply to every output:

HOOK: The entire game. Stops scroll in 0.5 seconds or it fails.
Types: curiosity gap ("I stopped doing this and..."), pattern interrupt, emotional trigger (FOMO/nostalgia/shock), identity claim ("POV: you're the person who..."), bold statement. Max 10 words. No trailing punctuation.

EMOTION > INFORMATION: People share feelings, not facts. Design emotion first.

SPECIFICITY = VIRALITY:
  DEAD → "Great coffee shop"
  VIRAL → "The coffee shop where people stay 4 hours and no one judges you"

SAVE TRIGGER: Every output must have a save-worthy element — useful, beautiful, or deeply relatable.

COMMENT BAIT: Ask for personal experience, light debate, or tag-someone behavior. Never "what do you think?"

TONE LAWS:
- Sound like a real person, not a brand or AI
- Contractions. Short sentences. Fragments when natural.
- NEVER use: utilize, leverage, journey, hustle, game-changer, innovative
- NEVER open with: "Are you ready to...", "In today's world...", "I'm so excited to share..."
- Best captions read like a text from a friend

PERSONAL MODE: Deep relatability + aspirational identity. Make them feel "this is so me" or "I want this life."
BUSINESS MODE: Make it feel like a discovery, not an ad. Loyal customer energy. FOMO without being pushy.

SAFE VERSION: Clean, warm, broadly appealing. 7/10 virality, zero risk. Optimized for saves + follows.
VIRAL VERSION: Bolder, more tension, stronger emotion. 9.5/10 virality. Edgy but never offensive. Creates "yes EXACTLY" or gentle controversy.

OUTPUT RULE: You MUST return ONLY valid JSON. No preamble, no explanation, no markdown fences. Pure JSON only.`;

// ─────────────────────────────────────────────────────────────────────────────
// JSON OUTPUT SCHEMA (injected into every prompt so the model knows the shape)
// ─────────────────────────────────────────────────────────────────────────────
const JSON_SCHEMA = `
Return this exact JSON structure and nothing else:
{
  "safe": {
    "hook": "string — max 10 words, no trailing punctuation",
    "captions": ["string", "string", "string"],
    "songs": [
      { "title": "string", "artist": "string", "reason": "string" },
      { "title": "string", "artist": "string", "reason": "string" },
      { "title": "string", "artist": "string", "reason": "string" }
    ],
    "hashtags": ["#tag1", "#tag2", "...12-15 total"],
    "viralIdea": "string — specific tactical instruction",
    "engagement": "string — one comment-driving question or CTA",
    "cta": "string or null — business only, null for personal",
    "contentIdea": "string or null — business only, null for personal"
  },
  "viral": {
    "hook": "string — more aggressive, max 10 words",
    "captions": ["string", "string", "string"],
    "songs": [
      { "title": "string", "artist": "string", "reason": "string" },
      { "title": "string", "artist": "string", "reason": "string" },
      { "title": "string", "artist": "string", "reason": "string" }
    ],
    "hashtags": ["#tag1", "#tag2", "...12-15 total"],
    "viralIdea": "string — more aggressive tactical instruction",
    "engagement": "string — more provocative comment trigger",
    "cta": "string or null",
    "contentIdea": "string or null"
  }
}`;

// ─────────────────────────────────────────────────────────────────────────────
// MODE DETECTION ENGINE
// Silent intelligence — user never sees this, it just enriches the prompt.
// ─────────────────────────────────────────────────────────────────────────────
function detectContentMode(imageAnalysis, userInput) {
  const combined = [imageAnalysis, userInput].filter(Boolean).join(' ');

  if (!combined.trim()) {
    return { detectedMode: 'PERSONAL', detectedBusinessType: null, confidence: 'low', reasoning: 'No input — defaulting to personal' };
  }

  const businessCategories = [
    { pattern: /restaurant|cafe|coffee shop|bistro|eatery|diner|brunch spot|food truck|bakery|pastry|pizza|sushi|burger|ramen|taco|cuisine|chef|kitchen|menu|dish|plating|food photography|cocktail bar|wine bar|speakeasy|mixologist/i, label: 'Restaurant / Food & Beverage' },
    { pattern: /gym|fitness studio|personal trainer|workout|weightlifting|yoga studio|pilates|crossfit|hiit|spin class|athlete|sports brand|supplement|protein|pre-workout|muscle|physique|body transformation|coaching/i, label: 'Fitness / Health & Wellness' },
    { pattern: /salon|hair salon|barbershop|nail studio|spa|skincare|beauty brand|makeup artist|cosmetics|lash artist|brow bar|esthetician|facial|dermatology|glow up|beauty routine|serum|moisturizer|foundation|lashes/i, label: 'Beauty / Skincare' },
    { pattern: /fashion brand|clothing brand|boutique|collection|lookbook|outfit|streetwear|luxury fashion|designer|styling|wardrobe|pieces|drop|new arrival|limited edition|sold out|merch|apparel/i, label: 'Fashion / Clothing' },
    { pattern: /hotel|resort|luxury stay|airbnb|vacation rental|travel brand|tour operator|destination wedding|travel agency|cruise|safari|retreat|hostel|boutique hotel|villa|suite|concierge/i, label: 'Travel / Hospitality' },
    { pattern: /product launch|e-commerce|online store|shop now|retail|limited stock|sale|promo|discount|new in|just dropped|order now|free shipping|unboxing|product review/i, label: 'Retail / E-commerce' },
    { pattern: /real estate|property listing|home for sale|interior design|home decor|renovation|architecture|staging|open house|luxury home|investment property|apartment tour/i, label: 'Real Estate / Interior Design' },
    { pattern: /saas|startup|tech product|app launch|software|platform|digital tool|product update|feature release|beta|developer|tech brand/i, label: 'Tech / SaaS' },
    { pattern: /dog grooming|cat cafe|pet brand|veterinary|pet products|animal shelter|dog trainer|puppy|kitten|rescue|exotic pet/i, label: 'Pet Services' },
    { pattern: /event venue|wedding venue|catering|event planning|nightclub|rooftop bar|festival|concert|entertainment brand|vip|exclusive event/i, label: 'Events / Entertainment' },
    { pattern: /photography studio|photographer|videographer|creative agency|content creator brand|media production|studio shoot/i, label: 'Creative Services' },
  ];

  const personalPatterns = /selfie|portrait|me and|myself|my life|personal|ootd|lifestyle|vibe check|day in my life|grwm|travel diary|solo travel|nature walk|sunset|journaling|morning routine|night routine|friendship|family photo|birthday|graduation/i;

  let detectedBusinessType = null;
  let businessCount = 0;

  for (const cat of businessCategories) {
    if (cat.pattern.test(combined)) {
      businessCount++;
      if (!detectedBusinessType) detectedBusinessType = cat.label;
    }
  }

  const isPersonal = personalPatterns.test(combined);

  let detectedMode = 'PERSONAL';
  let confidence   = 'medium';
  let reasoning    = '';

  if (businessCount >= 2) {
    detectedMode = 'BUSINESS'; confidence = 'high';
    reasoning = `Multiple business signals → ${detectedBusinessType}`;
  } else if (businessCount === 1 && !isPersonal) {
    detectedMode = 'BUSINESS'; confidence = 'medium';
    reasoning = `Business signal detected → ${detectedBusinessType}`;
  } else if (businessCount === 1 && isPersonal) {
    detectedMode = 'PERSONAL'; confidence = 'medium';
    reasoning = 'Mixed signals — personal with product element';
  } else if (isPersonal) {
    detectedMode = 'PERSONAL'; confidence = 'high';
    reasoning = 'Strong personal lifestyle signals';
  } else {
    detectedMode = 'PERSONAL'; confidence = 'low';
    reasoning = 'No dominant signals — defaulting to personal';
  }

  return { detectedMode, detectedBusinessType, confidence, reasoning };
}

// ─────────────────────────────────────────────────────────────────────────────
// BUILD PROMPT — image analysis and user input kept separate and clearly labeled
// ─────────────────────────────────────────────────────────────────────────────
function buildPrompt({ imageAnalysis, userInput, finalMode, finalBusinessType, detection }) {
  const isBusinessMode = finalMode === 'BUSINESS';
  const lines = [];

  lines.push(`CONTENT BRIEF`);
  lines.push(`Mode: ${finalMode}${finalBusinessType ? ` → ${finalBusinessType}` : ''}`);
  lines.push(`Detection: ${detection.reasoning} (confidence: ${detection.confidence})`);
  lines.push('');

  if (imageAnalysis) {
    lines.push(`IMAGE ANALYSIS (GPT-4o Vision):`);
    lines.push(imageAnalysis);
    lines.push('');
  }

  if (userInput) {
    lines.push(`USER CONTEXT:`);
    lines.push(userInput);
    lines.push('');
  }

  if (!imageAnalysis && !userInput) {
    lines.push(`No specific content provided. Generate the highest-potential evergreen viral content`);
    lines.push(`for ${finalMode} mode${finalBusinessType ? ` in the ${finalBusinessType} space` : ''}.`);
    lines.push('');
  }

  if (isBusinessMode) {
    lines.push(`BUSINESS STRATEGY: Make this feel like a discovery, not an ad.`);
    lines.push(`Psychology: FOMO + social proof + insider energy.`);
    lines.push(`Voice: What would an obsessed loyal customer post organically?`);
    lines.push(`CTA and ContentIdea fields are REQUIRED (not null).`);
  } else {
    lines.push(`PERSONAL STRATEGY: Deep relatability + aspirational identity.`);
    lines.push(`Psychology: "this is so me" OR "I want this life".`);
    lines.push(`Voice: Confession, discovery, or shared secret energy.`);
    lines.push(`CTA and ContentIdea fields should be null.`);
  }

  lines.push('');
  lines.push(`CAPTION REQUIREMENTS:`);
  lines.push(`Caption 1: Storytelling angle, 2–4 sentences, ends memorably. Optimized for saves.`);
  lines.push(`Caption 2: Different emotion — vulnerability, warmth, or quiet aspiration. 2–3 sentences.`);
  lines.push(`Caption 3: Short and bold. 1–2 sentences. Screenshot-worthy.`);
  lines.push(`SAFE viral idea: specific camera angle + edit technique + posting window.`);
  lines.push(`VIRAL viral idea: more aggressive — trending format, challenge tie-in, or high-upside angle.`);
  lines.push('');
  lines.push(`HASHTAG MIX: 3 mega (1M+ posts), 5 mid (100K–1M), 4-7 niche (<100K) + platform tags.`);
  lines.push('');
  lines.push(JSON_SCHEMA);

  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// SAFE JSON PARSER — never crashes the app; falls back gracefully
// ─────────────────────────────────────────────────────────────────────────────
function safeParseJSON(raw) {
  let clean = raw.trim();
  clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();

  try {
    return { ok: true, data: JSON.parse(clean) };
  } catch (e) {
    const start = clean.indexOf('{');
    const end   = clean.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return { ok: true, data: JSON.parse(clean.slice(start, end + 1)) };
      } catch (_) {}
    }
    return { ok: false, raw: clean, error: e.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// OPENAI CALL WRAPPER
// ─────────────────────────────────────────────────────────────────────────────
async function callOpenAI({ systemPrompt, userPrompt, maxTokens = 2400, temperature = 0.93 }) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
    body:    JSON.stringify({
      model:       'gpt-4o',
      max_tokens:  maxTokens,
      temperature,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || `OpenAI API error ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: POST /api/analyze-image
// GPT-4o Vision → rich content-strategy-aware image description
// ─────────────────────────────────────────────────────────────────────────────
app.post('/api/analyze-image', async (req, res) => {
  try {
    const { base64Image, mimeType } = req.body;
    if (!OPENAI_API_KEY) return res.status(500).json({ error: 'OpenAI API key not configured.' });
    if (!base64Image || !mimeType) return res.status(400).json({ error: 'Missing base64Image or mimeType.' });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
      body:    JSON.stringify({
        model:      'gpt-4o',
        max_tokens: 350,
        temperature: 0.3,
        messages: [
          {
            role:    'system',
            content: 'You are a content intelligence analyst for Capria, a viral social media strategy tool. Analyze images and produce a vivid, strategy-aware description for viral caption generation. Be specific, never generic.',
          },
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}`, detail: 'low' } },
              { type: 'text', text: `Analyze this image for social media content generation. Return:
1. Visual description (2–3 vivid sentences): subjects, setting, colors, lighting, aesthetic
2. Mood/vibe (1 sentence): emotional tone
3. Content type (1 sentence): PERSONAL (lifestyle/creator) or BUSINESS (product/place/brand) — if business, name the category

Under 150 words. Specific, not generic.` },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      return res.status(response.status).json({ error: err.error?.message || 'Vision API error' });
    }

    const data = await response.json();
    const description = data.choices?.[0]?.message?.content || '';
    console.log(`[analyze-image] ${description.length} chars extracted`);
    res.json({ description });

  } catch (error) {
    console.error('[analyze-image]', error.message);
    res.status(500).json({ error: 'Image analysis failed: ' + error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: POST /api/generate
// Main engine — auto-detects mode, builds prompt, returns structured JSON
// ─────────────────────────────────────────────────────────────────────────────
app.post('/api/generate', async (req, res) => {
  try {
    const {
      imageAnalysis    = '',
      userInput        = '',
      userMode         = null,
      userBusinessType = '',
    } = req.body;

    if (!OPENAI_API_KEY) return res.status(500).json({ error: 'OpenAI API key not configured.' });

    const detection         = detectContentMode(imageAnalysis, userInput);
    const finalMode         = userMode || detection.detectedMode;
    const finalBusinessType = userBusinessType || detection.detectedBusinessType || '';

    console.log(`[generate] Mode: ${finalMode} | Business: "${finalBusinessType || 'N/A'}" | ${detection.reasoning}`);

    const userPrompt = buildPrompt({ imageAnalysis, userInput, finalMode, finalBusinessType, detection });

    const rawResult = await callOpenAI({
      systemPrompt: MASTER_SYSTEM_PROMPT,
      userPrompt,
      maxTokens:    2400,
      temperature:  0.93,
    });

    const parsed = safeParseJSON(rawResult);

    if (!parsed.ok) {
      console.error('[generate] JSON parse failed:', parsed.error);
      return res.json({
        content:    null,
        rawFallback: parsed.raw,
        parseError: parsed.error,
        meta: { finalMode, finalBusinessType, detectedMode: detection.detectedMode, detectedBusinessType: detection.detectedBusinessType, detectionConfidence: detection.confidence, detectionReasoning: detection.reasoning, userOverrodeMode: !!userMode },
      });
    }

    res.json({
      content: parsed.data,
      meta: {
        finalMode,
        finalBusinessType,
        detectedMode:         detection.detectedMode,
        detectedBusinessType: detection.detectedBusinessType,
        detectionConfidence:  detection.confidence,
        detectionReasoning:   detection.reasoning,
        userOverrodeMode:     !!userMode,
      },
    });

  } catch (error) {
    console.error('[generate] Fatal:', error.message);
    res.status(500).json({ error: 'Generation failed: ' + error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: POST /api/rewrite-hooks
// "Rewrite Hook x5" — generates 5 fresh hooks for the current content only.
// ─────────────────────────────────────────────────────────────────────────────
app.post('/api/rewrite-hooks', async (req, res) => {
  try {
    const { imageAnalysis = '', userInput = '', finalMode = 'PERSONAL', finalBusinessType = '', currentHook = '' } = req.body;
    if (!OPENAI_API_KEY) return res.status(500).json({ error: 'OpenAI API key not configured.' });

    const prompt = `You are Capria — the world's best viral hook writer.

Context:
Mode: ${finalMode}${finalBusinessType ? ` → ${finalBusinessType}` : ''}
${imageAnalysis ? `Image: ${imageAnalysis}` : ''}
${userInput ? `User context: ${userInput}` : ''}
${currentHook ? `Current hook (do NOT repeat this): "${currentHook}"` : ''}

Generate 5 completely different scroll-stopping hooks. Each must use a different hook type:
1. Curiosity gap
2. Pattern interrupt
3. Emotional trigger (nostalgia/FOMO/desire)
4. Identity claim ("POV: ...")
5. Bold/provocative statement

Rules: max 10 words each, no trailing punctuation, no numbering in the hooks themselves, all must be radically different from each other and from the current hook.

Return ONLY this JSON:
{ "hooks": ["hook1", "hook2", "hook3", "hook4", "hook5"] }`;

    const raw = await callOpenAI({
      systemPrompt: MASTER_SYSTEM_PROMPT,
      userPrompt:   prompt,
      maxTokens:    400,
      temperature:  0.97,
    });

    const parsed = safeParseJSON(raw);
    if (!parsed.ok || !Array.isArray(parsed.data?.hooks)) {
      return res.status(500).json({ error: 'Hook generation failed — bad JSON from model' });
    }

    res.json({ hooks: parsed.data.hooks });

  } catch (error) {
    console.error('[rewrite-hooks]', error.message);
    res.status(500).json({ error: 'Hook rewrite failed: ' + error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: POST /api/amplify-viral
// "Make it more viral" — regenerates ONLY the viral version, maximally aggressive
// ─────────────────────────────────────────────────────────────────────────────
app.post('/api/amplify-viral', async (req, res) => {
  try {
    const { imageAnalysis = '', userInput = '', finalMode = 'PERSONAL', finalBusinessType = '', currentViral = null } = req.body;
    if (!OPENAI_API_KEY) return res.status(500).json({ error: 'OpenAI API key not configured.' });

    const currentRef = currentViral
      ? `Current viral version (make it STRONGER — do NOT repeat the same hook or captions):\n${JSON.stringify(currentViral, null, 2)}`
      : '';

    const prompt = `You are Capria — generating the most aggressively viral content possible.

Context:
Mode: ${finalMode}${finalBusinessType ? ` → ${finalBusinessType}` : ''}
${imageAnalysis ? `Image: ${imageAnalysis}` : ''}
${userInput ? `User context: ${userInput}` : ''}
${currentRef}

Generate a MAXIMUM virality version. This should be the most raw, bold, emotionally charged content possible while staying appropriate.

- Hook must use tension, FOMO, or shock in a sophisticated way
- Captions should be bolder, more direct, more polarizing
- Viral idea should be the most aggressive high-upside strategy
- Engagement must be a debate-starter or strong "agree/disagree"
${finalMode === 'BUSINESS' ? '- CTA must create strong urgency without sounding desperate\n- ContentIdea must be the most disruptive marketing angle' : ''}

Return ONLY this JSON (viral object only):
{
  "hook": "string",
  "captions": ["string", "string", "string"],
  "songs": [
    { "title": "string", "artist": "string", "reason": "string" },
    { "title": "string", "artist": "string", "reason": "string" },
    { "title": "string", "artist": "string", "reason": "string" }
  ],
  "hashtags": ["#tag", "..."],
  "viralIdea": "string",
  "engagement": "string"${finalMode === 'BUSINESS' ? ',\n  "cta": "string",\n  "contentIdea": "string"' : ',\n  "cta": null,\n  "contentIdea": null'}
}`;

    const raw = await callOpenAI({
      systemPrompt: MASTER_SYSTEM_PROMPT,
      userPrompt:   prompt,
      maxTokens:    1200,
      temperature:  0.98,
    });

    const parsed = safeParseJSON(raw);
    if (!parsed.ok) return res.status(500).json({ error: 'Amplify failed — bad JSON from model' });

    res.json({ viral: parsed.data });

  } catch (error) {
    console.error('[amplify-viral]', error.message);
    res.status(500).json({ error: 'Amplify viral failed: ' + error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: POST /api/restyle-captions
// "Aesthetic Mode" | "Short Version" — rewrites captions in a specific style
// ─────────────────────────────────────────────────────────────────────────────
app.post('/api/restyle-captions', async (req, res) => {
  try {
    const { imageAnalysis = '', userInput = '', finalMode = 'PERSONAL', finalBusinessType = '', style = 'aesthetic', currentCaptions = [] } = req.body;
    if (!OPENAI_API_KEY) return res.status(500).json({ error: 'OpenAI API key not configured.' });

    const styleInstructions = {
      aesthetic: `AESTHETIC MODE: Poetic, dreamy, and atmospheric. Sentences feel like soft-focus photography. Lowercase is fine. Minimal punctuation. Evokes a mood more than describes it. Think: visual art meets diary entry. Examples: "the kind of light that makes you forget what day it is" / "everything felt slower here, in the best way"`,
      short:     `SHORT / TIKTOK MODE: Maximum 1–2 sentences per caption. Punchy. Direct. No fluff. TikTok energy — raw and immediate. These should land like a punch. One should be under 8 words. All three must hit differently.`,
    };

    const instruction = styleInstructions[style] || styleInstructions.aesthetic;
    const currentRef  = currentCaptions.length ? `Current captions to reimagine (do NOT repeat them):\n${currentCaptions.map((c, i) => `${i + 1}. ${c}`).join('\n')}` : '';

    const prompt = `You are Capria — caption specialist.

Context:
Mode: ${finalMode}${finalBusinessType ? ` → ${finalBusinessType}` : ''}
${imageAnalysis ? `Image: ${imageAnalysis}` : ''}
${userInput ? `User context: ${userInput}` : ''}
${currentRef}

Style instruction:
${instruction}

Return ONLY this JSON:
{ "captions": ["string", "string", "string"] }`;

    const raw = await callOpenAI({
      systemPrompt: MASTER_SYSTEM_PROMPT,
      userPrompt:   prompt,
      maxTokens:    600,
      temperature:  0.95,
    });

    const parsed = safeParseJSON(raw);
    if (!parsed.ok || !Array.isArray(parsed.data?.captions)) {
      return res.status(500).json({ error: 'Restyle failed — bad JSON from model' });
    }

    res.json({ captions: parsed.data.captions });

  } catch (error) {
    console.error('[restyle-captions]', error.message);
    res.status(500).json({ error: 'Caption restyle failed: ' + error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: POST /api/trend-engine
// Premium pattern-intelligence layer — adapts proven viral structures to content
// ─────────────────────────────────────────────────────────────────────────────
app.post('/api/trend-engine', async (req, res) => {
  try {
    const {
      imageAnalysis    = '',
      userInput        = '',
      finalMode        = 'PERSONAL',
      finalBusinessType = '',
      activeVersion    = 'safe',
      currentContent   = null,
    } = req.body;

    if (!OPENAI_API_KEY) return res.status(500).json({ error: 'OpenAI API key not configured.' });

    const contentRef = currentContent
      ? `Current generated content (${activeVersion} version):\nHook: "${currentContent.hook || ''}"\nCaption sample: "${(currentContent.captions && currentContent.captions[0]) || ''}"`
      : '';

    const prompt = `You are Capria's Trend Engine — a premium pattern-intelligence system that adapts proven short-form content structures to any given post.

You are NOT a real-time trend database. You are a strategic AI trained on the underlying patterns of high-performing short-form content. Your output is pattern-level reasoning, not live market data.

CONTEXT:
Mode: ${finalMode}${finalBusinessType ? ` → ${finalBusinessType}` : ''}
${imageAnalysis ? `Image: ${imageAnalysis}` : ''}
${userInput ? `User context: ${userInput}` : ''}
${contentRef}

AVAILABLE PATTERNS (choose the single best fit):
- Curiosity Gap: withholds a key piece of information to force scroll/view-through
- Transformation / Before-After: shows a clear state change that creates desire or relatability
- POV Identity: places the viewer in a specific role or identity ("POV: you finally...")
- Personal Confession: a specific personal truth that makes people feel seen
- Strong Opinion: a confident, slightly polarizing take that generates saves and replies
- Micro-Story: a compressed narrative arc (setup → tension → resolution) in one post
- Relatable Frustration: names something the audience secretly feels
- Aspirational Trigger: creates a specific desire or lifestyle aspiration
- Niche Authority: positions the creator as an insider with exclusive knowledge

YOUR TASK:
1. Select the single best-fitting pattern for this specific content and context.
2. Adapt that pattern into a premium hook and caption for this exact post.
3. Explain WHY this specific pattern works for this specific content — be concrete, not generic.
4. Give one tactical posting instruction specific to this content type.
5. Assign a pattern alignment confidence score (65–95 range). This represents your structural confidence in this pattern fit, not a real market metric.

TONE FOR ALL OUTPUT:
- Sharp. Premium. Calm confidence.
- Specific, not generic. Never say "because it's engaging."
- Never claim real-time data, live trends, or platform metrics.
- Output must feel like a senior strategist's recommendation, not a tool response.

Return ONLY this valid JSON:
{
  "trendEngine": {
    "label": "string — e.g. 'High Pattern Alignment' or 'Strong Structural Fit'",
    "trendMatch": number,
    "pattern": "string — name of the chosen pattern",
    "hook": "string — a scroll-stopping hook adapted from the chosen pattern, max 12 words",
    "caption": "string — a strategic caption adapted from the chosen pattern, 2–4 sentences",
    "whyThisWorks": "string — one concrete, specific explanation of why this pattern fits this exact content",
    "howToPostIt": "string — one tactical instruction for how to publish or frame this post"
  }
}`;

    const raw = await callOpenAI({
      systemPrompt: MASTER_SYSTEM_PROMPT,
      userPrompt:   prompt,
      maxTokens:    800,
      temperature:  0.88,
    });

    const parsed = safeParseJSON(raw);

    if (!parsed.ok || !parsed.data?.trendEngine) {
      console.error('[trend-engine] JSON parse failed:', parsed.error);
      return res.status(500).json({ error: 'Trend Engine failed — bad JSON from model' });
    }

    console.log(`[trend-engine] Pattern: ${parsed.data.trendEngine.pattern} | Match: ${parsed.data.trendEngine.trendMatch}`);
    res.json({ trendEngine: parsed.data.trendEngine });

  } catch (error) {
    console.error('[trend-engine]', error.message);
    res.status(500).json({ error: 'Trend Engine failed: ' + error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// CATCH-ALL — serve frontend SPA
// ─────────────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n⚡ Capria → http://localhost:${PORT}\n`);
});
