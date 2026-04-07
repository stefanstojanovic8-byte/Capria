/* ============================================================
   Capria — script.js v5
   + Viral Score System (hook/save/share with animated ring)
   + Social Preview Card (IG + TikTok mock)
   + Share Card (Before vs After + watermark on copy)
   + Trend Engine (premium pattern-intelligence layer)
   + Niche Quick Chips
   + Platform Action Buttons (Copy + Open TikTok/IG)
   All original features preserved:
     Rewrite Hooks · Amplify Viral · Aesthetic Mode · Short Version
   ============================================================ */

// ── STATE ────────────────────────────────────────────────────
const state = {
  imageFile:     null,
  imageBase64:   null,
  imageMimeType: null,
  imageAnalysis: '',
  userInput:    '',
  mode:         'PERSONAL',
  businessType: '',
  selectedNiche: '',
  content:        null,
  meta:           null,
  activeVersion:  'safe',
  finalMode:         'PERSONAL',
  finalBusinessType: '',
  previewPlatform: 'ig',
  previewCollapsed: false,
  trendEngineData: null,
  trendEngineRunning: false,
};

// ── DOM ELEMENTS ─────────────────────────────────────────────
const screens = {
  landing: document.getElementById('screen-landing'),
  setup:   document.getElementById('screen-setup'),
  results: document.getElementById('screen-results'),
};

const fileInput         = document.getElementById('file-input');
const btnContinue       = document.getElementById('btn-continue');
const btnBackSetup      = document.getElementById('btn-back-setup');
const btnGenerate       = document.getElementById('btn-generate');
const btnNew            = document.getElementById('btn-new');
const btnRegenerate     = document.getElementById('btn-regenerate');
const modeCards         = document.querySelectorAll('.mode-card');
const businessField     = document.getElementById('business-field');
const businessTypeInput = document.getElementById('business-type');
const descriptionInput  = document.getElementById('description-input');
const imagePreviewWrap  = document.getElementById('preview-wrap');
const imagePreview      = document.getElementById('image-preview');
const resultsCards      = document.getElementById('results-cards');
const generateLabel     = document.getElementById('generate-label');
const generateSpinner   = document.getElementById('generate-spinner');
const versionTabSafe    = document.getElementById('tab-safe');
const versionTabViral   = document.getElementById('tab-viral');
const versionTabs       = document.getElementById('version-tabs');
const detectedBadge     = document.getElementById('detected-badge');
const viralScorePanel   = document.getElementById('viral-score-panel');
const socialPreviewCard = document.getElementById('social-preview-card');
const shareCard         = document.getElementById('share-card');
const niqueChips        = document.querySelectorAll('.niche-chip');

// ── NAVIGATION ───────────────────────────────────────────────
function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
  window.scrollTo(0, 0);
}

// ── IMAGE UPLOAD ─────────────────────────────────────────────
fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  state.imageFile     = file;
  state.imageMimeType = file.type;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const dataUrl      = ev.target.result;
    state.imageBase64  = dataUrl.split(',')[1];
    imagePreview.src   = dataUrl;
    imagePreviewWrap.style.display = 'block';
  };
  reader.readAsDataURL(file);
  showScreen('setup');
});

btnContinue.addEventListener('click', () => {
  state.imageFile   = null;
  state.imageBase64 = null;
  state.imageAnalysis = '';
  imagePreviewWrap.style.display = 'none';
  showScreen('setup');
});

btnBackSetup.addEventListener('click', () => showScreen('landing'));

// ── MODE SELECTION ───────────────────────────────────────────
modeCards.forEach(card => {
  card.addEventListener('click', () => {
    modeCards.forEach(c => c.classList.remove('active'));
    card.classList.add('active');
    state.mode = card.dataset.mode;
    businessField.style.display = state.mode === 'BUSINESS' ? 'block' : 'none';
  });
});

// ── NICHE CHIPS ──────────────────────────────────────────────
niqueChips.forEach(chip => {
  chip.addEventListener('click', () => {
    const niche = chip.dataset.niche;
    if (state.selectedNiche === niche) {
      chip.classList.remove('active');
      state.selectedNiche = '';
    } else {
      niqueChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.selectedNiche = niche;
      if (!descriptionInput.value.trim()) {
        descriptionInput.placeholder = `Describe your ${niche} post...`;
      }
    }
  });
});

// ── VERSION TABS ─────────────────────────────────────────────
versionTabSafe.addEventListener('click', () => {
  if (state.activeVersion === 'safe') return;
  state.activeVersion = 'safe';
  versionTabSafe.classList.add('active');
  versionTabViral.classList.remove('active');
  if (state.content) { renderActiveVersion(); updateSocialPreview(); }
});

versionTabViral.addEventListener('click', () => {
  if (state.activeVersion === 'viral') return;
  state.activeVersion = 'viral';
  versionTabViral.classList.add('active');
  versionTabSafe.classList.remove('active');
  if (state.content) { renderActiveVersion(); updateSocialPreview(); }
});

// ── MAIN GENERATE ────────────────────────────────────────────
btnGenerate.addEventListener('click', handleGenerate);
btnRegenerate.addEventListener('click', handleGenerate);

async function handleGenerate() {
  state.userInput     = descriptionInput.value.trim();
  state.businessType  = businessTypeInput.value.trim();
  state.imageAnalysis = '';
  state.trendEngineData = null;
  state.trendEngineRunning = false;

  // Blend niche into prompt if selected
  const nichePrefix = state.selectedNiche ? `[Niche: ${state.selectedNiche}] ` : '';
  const effectiveInput = nichePrefix + state.userInput;

  setGenerating(true);
  showLoadingCards();

  try {
    if (state.imageBase64) {
      try {
        const vRes  = await fetch('/api/analyze-image', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ base64Image: state.imageBase64, mimeType: state.imageMimeType }),
        });
        const vData = await vRes.json();
        if (vData.description) state.imageAnalysis = vData.description;
      } catch (e) {
        console.warn('[vision] failed:', e.message);
      }
    }

    const res  = await fetch('/api/generate', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        imageAnalysis:    state.imageAnalysis,
        userInput:        effectiveInput,
        userMode:         state.mode,
        userBusinessType: state.businessType,
      }),
    });

    const data = await res.json();
    if (data.error) { showError(data.error); setGenerating(false); return; }

    if (data.rawFallback && !data.content) {
      showError('AI response was unexpected — try regenerating.');
      setGenerating(false);
      return;
    }

    state.content        = data.content;
    state.meta           = data.meta || null;
    state.finalMode      = data.meta?.finalMode         || state.mode;
    state.finalBusinessType = data.meta?.finalBusinessType || state.businessType;
    state.activeVersion  = 'safe';

    versionTabSafe.classList.add('active');
    versionTabViral.classList.remove('active');

    renderResults(data.content, data.meta);
    showScreen('results');

  } catch (err) {
    showError('Cannot reach the server. Make sure it is running on localhost:3000.');
  }

  setGenerating(false);
}

// ── LOADING STATE ─────────────────────────────────────────────
function showLoadingCards() {
  resultsCards.innerHTML = '';
  viralScorePanel.style.display  = 'none';
  socialPreviewCard.style.display = 'none';
  shareCard.style.display        = 'none';

  const skeletons = ['hook','captions','songs','hashtags','viral','engagement'];
  skeletons.forEach((type, i) => {
    const card = document.createElement('div');
    card.className = 'result-card skeleton-card';
    card.dataset.type = type;
    card.style.animationDelay = `${i * 0.06}s`;
    card.innerHTML = `<div class="skeleton-label"></div><div class="skeleton-line"></div><div class="skeleton-line short"></div>`;
    resultsCards.appendChild(card);
  });
  if (versionTabs)   versionTabs.style.display   = 'none';
  if (detectedBadge) detectedBadge.style.display  = 'none';
}

function setGenerating(on) {
  btnGenerate.disabled          = on;
  generateLabel.style.display   = on ? 'none'         : 'inline';
  generateSpinner.style.display = on ? 'inline-block' : 'none';
}

// ── RENDER RESULTS ────────────────────────────────────────────
function renderResults(content, meta) {
  if (meta && detectedBadge) {
    const modeLabel  = meta.finalMode === 'BUSINESS'
      ? `🏪 ${meta.finalBusinessType || 'Business'}`
      : '👤 Personal';
    const detectNote = meta.userOverrodeMode ? ' (manual)' : ' (auto-detected)';
    detectedBadge.textContent    = modeLabel + detectNote;
    detectedBadge.style.display  = 'inline-flex';
  }

  versionTabs.style.display = 'flex';
  renderActiveVersion();

  renderViralScore();
  renderSocialPreview();
  renderShareCard();
  renderTrendEngineButton();
}

function renderActiveVersion() {
  if (!state.content) return;

  const versionData = state.activeVersion === 'viral'
    ? state.content.viral
    : state.content.safe;

  if (!versionData) {
    resultsCards.innerHTML = `<div class="error-card">⚠️ Version data missing. Try regenerating.</div>`;
    return;
  }

  const isBusiness = state.finalMode === 'BUSINESS';
  resultsCards.innerHTML = '';

  const cards = [
    buildHookCard(versionData.hook),
    buildCaptionsCard(versionData.captions),
    buildSongsCard(versionData.songs),
    buildHashtagsCard(versionData.hashtags),
    buildViralIdeaCard(versionData.viralIdea),
    buildEngagementCard(versionData.engagement),
    ...(isBusiness && versionData.cta         ? [buildCtaCard(versionData.cta)]               : []),
    ...(isBusiness && versionData.contentIdea  ? [buildContentIdeaCard(versionData.contentIdea)] : []),
  ];

  cards.forEach(c => { if (c) resultsCards.appendChild(c); });

  // Re-attach trend engine button after cards re-render
  renderTrendEngineButton();

  // If trend engine data already exists, re-render it too
  if (state.trendEngineData) {
    renderTrendEngineResult(state.trendEngineData);
  }
}

// ── VIRAL SCORE SYSTEM ────────────────────────────────────────
function computeViralScore(content) {
  if (!content) return { total: 0, hook: 0, save: 0, share: 0, verdict: '' };

  const safeData  = content.safe  || {};
  const viralData = content.viral || {};

  const hook = safeData.hook || viralData.hook || '';
  const captions = [...(safeData.captions || []), ...(viralData.captions || [])].join(' ');
  const viralIdea = safeData.viralIdea || '';
  const hashtags = safeData.hashtags || [];

  const emotionWords = /stop|secret|nobody|wait|this|pov|i|never|always|how|why|what|before|after|change|can't|you|just/gi;
  const curiosityWords = /secret|nobody|wait|before|after|never|how|why|what|stop|change/gi;
  const hookWordCount = hook.split(' ').filter(Boolean).length;
  const hookEmotionHits = (hook.match(emotionWords) || []).length;
  const hookCuriosityHits = (hook.match(curiosityWords) || []).length;

  let hookScore = 0;
  hookScore += Math.min(hookWordCount >= 4 && hookWordCount <= 10 ? 40 : 20, 40);
  hookScore += Math.min(hookEmotionHits * 15, 35);
  hookScore += Math.min(hookCuriosityHits * 12, 25);
  hookScore = Math.min(hookScore, 100);

  const saveWords = /tip|how|save|learn|guide|secret|hack|step|best|worst|mistake|rule|never|always|everything/gi;
  const captionSaveHits = (captions.match(saveWords) || []).length;
  const viralIdeaSaveHits = (viralIdea.match(saveWords) || []).length;
  let saveScore = Math.min(captionSaveHits * 10 + viralIdeaSaveHits * 14 + (hashtags.length >= 10 ? 15 : 5), 100);

  const shareWords = /everyone|nobody|we|us|they|person|people|when you|me when|pov|this is|i can't|same|lowkey|literally|honestly|real|truth/gi;
  const captionShareHits = (captions.match(shareWords) || []).length;
  let shareScore = Math.min(captionShareHits * 12 + (hookCuriosityHits * 8), 100);

  const total = Math.round((hookScore * 0.45) + (saveScore * 0.28) + (shareScore * 0.27));

  let verdict = '';
  if (total >= 80) verdict = `<strong>🔥 Explosive potential.</strong> This content has all the markers of a viral post. Push it.`;
  else if (total >= 65) verdict = `<strong>⚡ Strong performance likely.</strong> Solid hook and save-worthy content. Minor tweaks could push this into viral territory.`;
  else if (total >= 50) verdict = `<strong>📈 Good base.</strong> Resonant content, but the hook could hit harder. Try the Viral tab or Rewrite Hook ×5.`;
  else verdict = `<strong>🌱 Room to grow.</strong> The AI has a base to work with — try adding more context or switching to Viral mode.`;

  return {
    total: Math.min(total, 99),
    hook:  Math.round(hookScore),
    save:  Math.round(saveScore),
    share: Math.round(shareScore),
    verdict,
  };
}

function renderViralScore() {
  const scores = computeViralScore(state.content);

  viralScorePanel.style.display = 'block';

  let svgDefs = viralScorePanel.querySelector('defs');
  if (!svgDefs) {
    const ring = viralScorePanel.querySelector('.score-ring');
    if (ring) {
      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      defs.innerHTML = `<linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style="stop-color:#ff3cac"/>
        <stop offset="100%" style="stop-color:#7b5ea7"/>
      </linearGradient>`;
      ring.insertBefore(defs, ring.firstChild);
    }
  }

  const scoreNumberEl = document.getElementById('score-number');
  const ringFill      = document.getElementById('score-ring-fill');
  const barHook       = document.getElementById('bar-hook');
  const barSave       = document.getElementById('bar-save');
  const barShare      = document.getElementById('bar-share');
  const valHook       = document.getElementById('val-hook');
  const valSave       = document.getElementById('val-save');
  const valShare      = document.getElementById('val-share');
  const verdictEl     = document.getElementById('score-verdict');

  scoreNumberEl.textContent = '0';
  ringFill.style.strokeDashoffset = '213.6';
  barHook.style.width  = '0%';
  barSave.style.width  = '0%';
  barShare.style.width = '0%';
  valHook.textContent  = '0';
  valSave.textContent  = '0';
  valShare.textContent = '0';
  verdictEl.innerHTML  = '';

  if (scores.total >= 80) scoreNumberEl.style.color = '#ff3cac';
  else if (scores.total >= 60) scoreNumberEl.style.color = '#f7b731';
  else scoreNumberEl.style.color = '#00f5d4';

  requestAnimationFrame(() => {
    const offset = 213.6 - (213.6 * scores.total / 100);
    ringFill.style.strokeDashoffset = offset;

    barHook.style.width  = scores.hook  + '%';
    barSave.style.width  = scores.save  + '%';
    barShare.style.width = scores.share + '%';

    animateCount(scoreNumberEl, 0, scores.total, 1200);
    animateCount(valHook,  0, scores.hook,  900);
    animateCount(valSave,  0, scores.save,  900);
    animateCount(valShare, 0, scores.share, 900);
  });

  setTimeout(() => { verdictEl.innerHTML = scores.verdict; }, 400);
}

function animateCount(el, from, to, duration) {
  const start = performance.now();
  function frame(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(from + (to - from) * eased);
    if (progress < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// ── SOCIAL PREVIEW ────────────────────────────────────────────
function renderSocialPreview() {
  socialPreviewCard.style.display = 'block';

  document.getElementById('prev-btn-ig').addEventListener('click', () => {
    state.previewPlatform = 'ig';
    document.getElementById('prev-btn-ig').classList.add('active');
    document.getElementById('prev-btn-tt').classList.remove('active');
    updateSocialPreview();
  });
  document.getElementById('prev-btn-tt').addEventListener('click', () => {
    state.previewPlatform = 'tt';
    document.getElementById('prev-btn-tt').classList.add('active');
    document.getElementById('prev-btn-ig').classList.remove('active');
    updateSocialPreview();
  });

  const collapseBtn = document.getElementById('btn-collapse-preview');
  collapseBtn.addEventListener('click', () => {
    const body = document.getElementById('social-preview-body');
    state.previewCollapsed = !state.previewCollapsed;
    body.style.display = state.previewCollapsed ? 'none' : 'block';
    collapseBtn.textContent = state.previewCollapsed ? '▼ Show' : '▲ Hide';
  });

  updateSocialPreview();
}

function updateSocialPreview() {
  if (!state.content) return;
  const vd = state.activeVersion === 'viral' ? state.content.viral : state.content.safe;
  if (!vd) return;

  const body = document.getElementById('social-preview-body');
  const hook = vd.hook || '';
  const caption = (vd.captions && vd.captions[0]) || '';
  const hashtags = (vd.hashtags || []).slice(0, 5).join(' ');
  const imgSrc = state.imageBase64 ? `data:${state.imageMimeType};base64,${state.imageBase64}` : null;

  if (state.previewPlatform === 'ig') {
    body.innerHTML = buildIGMock(hook, caption, hashtags, imgSrc);
  } else {
    const song = vd.songs && vd.songs[0] ? `${vd.songs[0].title} — ${vd.songs[0].artist}` : 'Original Sound';
    body.innerHTML = buildTTMock(hook, imgSrc, song);
  }
}

function buildIGMock(hook, caption, hashtags, imgSrc) {
  const imgHtml = imgSrc
    ? `<img src="${escAttr(imgSrc)}" alt="Post" />`
    : `<span class="ig-mock-image-placeholder">🖼️</span>`;

  return `
    <div class="ig-mock">
      <div class="ig-mock-header">
        <div class="ig-mock-avatar"></div>
        <div>
          <div class="ig-mock-username">your_account</div>
        </div>
        <div class="ig-mock-follow">Follow</div>
      </div>
      <div class="ig-mock-image">${imgHtml}</div>
      <div class="ig-mock-actions">
        <span class="ig-mock-action">🤍</span>
        <span class="ig-mock-action">💬</span>
        <span class="ig-mock-action">📤</span>
        <span class="ig-mock-action ig-save">🔖</span>
      </div>
      <div class="ig-mock-caption">
        <div class="ig-mock-hook">${escHtml(hook)}</div>
        <div class="ig-mock-caption-text">${escHtml(caption)}</div>
        ${hashtags ? `<div class="ig-mock-hashtags">${escHtml(hashtags)}</div>` : ''}
      </div>
    </div>`;
}

function buildTTMock(hook, imgSrc, songText) {
  const imgHtml = imgSrc
    ? `<img src="${escAttr(imgSrc)}" alt="Post" />`
    : `<span class="tt-mock-video-placeholder">📱</span>`;

  return `
    <div class="tt-mock">
      <div class="tt-mock-video">
        ${imgHtml}
        <div class="tt-mock-overlay">
          <div class="tt-mock-username">@your_account</div>
          <div class="tt-mock-hook-text">${escHtml(hook)}</div>
        </div>
        <div class="tt-mock-sidebar">
          <div class="tt-side-btn"><span class="tt-side-icon">❤️</span><span class="tt-side-count">24K</span></div>
          <div class="tt-side-btn"><span class="tt-side-icon">💬</span><span class="tt-side-count">1.2K</span></div>
          <div class="tt-side-btn"><span class="tt-side-icon">🔖</span><span class="tt-side-count">8.9K</span></div>
          <div class="tt-side-btn"><span class="tt-side-icon">↗️</span><span class="tt-side-count">Share</span></div>
        </div>
      </div>
      <div class="tt-mock-bar">
        <div class="tt-bar-disc"></div>
        <span class="tt-bar-sound">${escHtml(songText)}</span>
      </div>
    </div>`;
}

// ── SHARE CARD ────────────────────────────────────────────────
function renderShareCard() {
  if (!state.content) return;
  const vd = state.activeVersion === 'viral' ? state.content.viral : state.content.safe;
  if (!vd) return;

  const hook = vd.hook || '';
  const caption = (vd.captions && vd.captions[0]) || '';

  document.getElementById('share-after-text').textContent = hook + (caption ? '\n\n' + caption.slice(0, 80) + (caption.length > 80 ? '...' : '') : '');

  shareCard.style.display = 'block';

  document.getElementById('btn-share-post').onclick = () => {
    const shareText = buildShareText(hook, caption);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText).then(() => {
        const btn = document.getElementById('btn-share-post');
        btn.textContent = '✓ Copied!';
        setTimeout(() => { btn.textContent = '🚀 Share as Post'; }, 2000);
      });
    }
  };

  document.getElementById('btn-open-tiktok').onclick = () => {
    const vd2 = state.activeVersion === 'viral' ? state.content.viral : state.content.safe;
    const text = buildFullCopy(vd2) + '\n\nMade with Capria ⚡';
    copyAndOpen(text, 'https://www.tiktok.com/', document.getElementById('btn-open-tiktok'));
  };

  document.getElementById('btn-open-ig').onclick = () => {
    const vd2 = state.activeVersion === 'viral' ? state.content.viral : state.content.safe;
    const text = buildFullCopy(vd2) + '\n\nMade with Capria ⚡';
    copyAndOpen(text, 'https://www.instagram.com/', document.getElementById('btn-open-ig'));
  };
}

function buildShareText(hook, caption) {
  return `POV: I stopped writing captions myself\n\n❌ Before: "Great photo, check it out!"\n\n✅ After Capria:\n"${hook}"\n\n${caption.slice(0, 120)}${caption.length > 120 ? '...' : ''}\n\nMade with Capria ⚡`;
}

function buildFullCopy(vd) {
  if (!vd) return '';
  const parts = [];
  if (vd.hook)    parts.push(vd.hook);
  if (vd.captions && vd.captions[0]) parts.push('\n' + vd.captions[0]);
  if (vd.hashtags && vd.hashtags.length) parts.push('\n' + vd.hashtags.join(' '));
  return parts.join('\n');
}

function copyAndOpen(text, url, btn) {
  const orig = btn.textContent;
  const write = () => {
    btn.textContent = '✓ Copied — Opening...';
    setTimeout(() => {
      window.open(url, '_blank');
      setTimeout(() => { btn.textContent = orig; }, 2000);
    }, 400);
  };
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(write).catch(() => legacyCopy(text, write));
  } else {
    legacyCopy(text, write);
  }
}

// ── TREND ENGINE ──────────────────────────────────────────────
function renderTrendEngineButton() {
  const existing = document.getElementById('btn-trend-engine');
  if (existing) existing.remove();

  const existingResult = document.getElementById('trend-engine-result');
  if (existingResult && !state.trendEngineData) existingResult.remove();

  const btn = document.createElement('button');
  btn.id = 'btn-trend-engine';
  btn.className = 'btn-trend-engine';
  btn.innerHTML = state.trendEngineRunning
    ? `<span class="dot-loader"><span></span><span></span><span></span></span>`
    : state.trendEngineData
      ? '✦ Trend Engine — Rerun'
      : '✦ Run Trend Engine';

  if (state.trendEngineRunning) {
    btn.disabled = true;
  }

  btn.addEventListener('click', handleTrendEngine);
  resultsCards.appendChild(btn);
}

async function handleTrendEngine() {
  if (state.trendEngineRunning) return;
  state.trendEngineRunning = true;

  const btn = document.getElementById('btn-trend-engine');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="dot-loader"><span></span><span></span><span></span></span>`;
  }

  // Remove any existing result
  const existingResult = document.getElementById('trend-engine-result');
  if (existingResult) existingResult.remove();

  try {
    const res = await fetch('/api/trend-engine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageAnalysis:    state.imageAnalysis,
        userInput:        state.userInput,
        finalMode:        state.finalMode,
        finalBusinessType: state.finalBusinessType,
        activeVersion:    state.activeVersion,
        currentContent:   state.activeVersion === 'viral' ? state.content?.viral : state.content?.safe,
      }),
    });

    const data = await res.json();

    if (data.error || !data.trendEngine) {
      state.trendEngineRunning = false;
      if (btn) { btn.disabled = false; btn.textContent = '✦ Run Trend Engine'; }
      return;
    }

    state.trendEngineData = data.trendEngine;
    state.trendEngineRunning = false;

    renderTrendEngineResult(data.trendEngine);

    if (btn) { btn.disabled = false; btn.textContent = '✦ Trend Engine — Rerun'; }

  } catch (e) {
    console.error('[trend-engine]', e.message);
    state.trendEngineRunning = false;
    if (btn) { btn.disabled = false; btn.textContent = '✦ Run Trend Engine'; }
  }
}

function renderTrendEngineResult(te) {
  const existing = document.getElementById('trend-engine-result');
  if (existing) existing.remove();

  const wrap = document.createElement('div');
  wrap.id = 'trend-engine-result';
  wrap.className = 'trend-engine-result';

  wrap.innerHTML = `
    <div class="te-header">
      <div class="te-header-left">
        <span class="te-label">Trend Engine</span>
        <span class="te-pattern">${escHtml(te.pattern || '')}</span>
      </div>
      <div class="te-match-badge">
        <span class="te-match-score">${te.trendMatch || ''}%</span>
        <span class="te-match-label">${escHtml(te.label || 'Pattern Alignment')}</span>
      </div>
    </div>

    <div class="te-block">
      <div class="te-block-label">Trend Hook</div>
      <div class="te-hook-text">${escHtml(te.hook || '')}</div>
    </div>

    <div class="te-block">
      <div class="te-block-label">Trend Caption</div>
      <div class="te-body-text">${escHtml(te.caption || '')}</div>
    </div>

    <div class="te-insight-row">
      <div class="te-insight-block">
        <div class="te-insight-label">Why This Works</div>
        <div class="te-insight-text">${escHtml(te.whyThisWorks || '')}</div>
      </div>
      <div class="te-insight-block">
        <div class="te-insight-label">How To Post It</div>
        <div class="te-insight-text">${escHtml(te.howToPostIt || '')}</div>
      </div>
    </div>
  `;

  // Copy buttons
  const hookCopy = makeTECopyBtn(() => te.hook || '');
  wrap.querySelector('.te-block').appendChild(hookCopy);

  const captionCopy = makeTECopyBtn(() => te.caption || '');
  wrap.querySelectorAll('.te-block')[1].appendChild(captionCopy);

  // Insert before the trend engine button
  const btn = document.getElementById('btn-trend-engine');
  if (btn) {
    resultsCards.insertBefore(wrap, btn);
  } else {
    resultsCards.appendChild(wrap);
  }
}

function makeTECopyBtn(getText) {
  const btn = document.createElement('button');
  btn.className = 'copy-btn te-copy-btn';
  btn.innerHTML = '📋 Copy';
  btn.addEventListener('click', () => {
    const text = getText() + '\n\nMade with Capria ⚡';
    const write = () => {
      btn.innerHTML = '✓ Copied';
      btn.classList.add('copied');
      setTimeout(() => { btn.innerHTML = '📋 Copy'; btn.classList.remove('copied'); }, 2000);
    };
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(write).catch(() => legacyCopy(text, write));
    } else { legacyCopy(text, write); }
  });
  return btn;
}

// ── CARD FACTORY ─────────────────────────────────────────────
function makeCard(type, icon, label, bodyFn) {
  const div    = document.createElement('div');
  div.className      = 'result-card';
  div.dataset.type   = type;

  const labelEl = document.createElement('div');
  labelEl.className  = 'card-label';
  labelEl.innerHTML  = `<span class="card-label-icon">${icon}</span>${label}`;
  div.appendChild(labelEl);

  bodyFn(div);
  return div;
}

function copyBtn(container, getText) {
  const btn = document.createElement('button');
  btn.className = 'copy-btn';
  btn.innerHTML = '📋 Copy';
  btn.addEventListener('click', () => {
    const text = getText() + '\n\nMade with Capria ⚡';
    const write = () => {
      btn.innerHTML = '✓ Copied';
      btn.classList.add('copied');
      setTimeout(() => { btn.innerHTML = '📋 Copy'; btn.classList.remove('copied'); }, 2000);
    };
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(write).catch(() => legacyCopy(text, write));
    } else { legacyCopy(text, write); }
  });
  container.appendChild(btn);
}

function legacyCopy(text, cb) {
  const ta = Object.assign(document.createElement('textarea'), { value: text });
  Object.assign(ta.style, { position: 'fixed', opacity: '0' });
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); cb(); } catch(e) {}
  document.body.removeChild(ta);
}

// ── INDIVIDUAL CARD BUILDERS ──────────────────────────────────
function buildHookCard(hook) {
  if (!hook) return null;
  const isViral = state.activeVersion === 'viral';

  return makeCard('hook', '🪝', isViral ? 'Hook — Viral' : 'Hook — Safe', (div) => {
    const body       = document.createElement('div');
    body.className   = `card-body hook-body${isViral ? ' hook-viral' : ''}`;
    body.textContent = hook;
    div.appendChild(body);

    const microRow = document.createElement('div');
    microRow.className = 'micro-row';

    const rewriteBtn = document.createElement('button');
    rewriteBtn.className = 'micro-btn';
    rewriteBtn.textContent = '🎲 Rewrite Hook ×5';
    rewriteBtn.addEventListener('click', () => handleRewriteHooks(div, hook, rewriteBtn));

    microRow.appendChild(rewriteBtn);
    div.appendChild(microRow);
    copyBtn(div, () => hook);
  });
}

async function handleRewriteHooks(hookCardDiv, currentHook, triggerBtn) {
  triggerBtn.disabled   = true;
  triggerBtn.textContent = '⏳ Writing...';

  const existing = hookCardDiv.querySelector('.hook-alternatives');
  if (existing) existing.remove();

  try {
    const res  = await fetch('/api/rewrite-hooks', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        imageAnalysis:    state.imageAnalysis,
        userInput:        state.userInput,
        finalMode:        state.finalMode,
        finalBusinessType: state.finalBusinessType,
        currentHook,
      }),
    });
    const data = await res.json();

    if (data.error || !data.hooks) {
      triggerBtn.textContent = '❌ Failed — retry';
      triggerBtn.disabled    = false;
      return;
    }

    const altWrap       = document.createElement('div');
    altWrap.className   = 'hook-alternatives';

    const altLabel      = document.createElement('div');
    altLabel.className  = 'alt-label';
    altLabel.textContent = '5 fresh hooks — tap to use';
    altWrap.appendChild(altLabel);

    data.hooks.forEach((h) => {
      const row      = document.createElement('div');
      row.className  = 'alt-hook-row';

      const text     = document.createElement('span');
      text.className = 'alt-hook-text';
      text.textContent = h;

      const useBtn   = document.createElement('button');
      useBtn.className   = 'alt-use-btn';
      useBtn.textContent = 'Use';
      useBtn.addEventListener('click', () => {
        hookCardDiv.querySelector('.hook-body').textContent = h;
        const version  = state.activeVersion === 'viral' ? 'viral' : 'safe';
        if (state.content && state.content[version]) state.content[version].hook = h;
        altWrap.remove();
        triggerBtn.disabled    = false;
        triggerBtn.textContent = '🎲 Rewrite Hook ×5';
        updateSocialPreview();
        renderViralScore();
      });

      row.appendChild(text);
      row.appendChild(useBtn);
      altWrap.appendChild(row);
    });

    hookCardDiv.appendChild(altWrap);

  } catch (e) {
    triggerBtn.textContent = '❌ Failed — retry';
  }

  triggerBtn.disabled    = false;
  triggerBtn.textContent = '🎲 Rewrite Hook ×5';
}

function buildCaptionsCard(captions) {
  if (!captions || !captions.length) return null;

  return makeCard('captions', '✍️', 'Captions', (div) => {
    const captionWrap = document.createElement('div');
    captionWrap.className = 'caption-list';

    captions.forEach((cap, i) => {
      const item = document.createElement('div');
      item.className = 'caption-item';
      item.innerHTML = `<div class="caption-num">Caption ${i + 1}</div><div class="card-body caption-text">${escHtml(cap)}</div>`;
      captionWrap.appendChild(item);
    });
    div.appendChild(captionWrap);

    const microRow = document.createElement('div');
    microRow.className = 'micro-row';

    const aestheticBtn = document.createElement('button');
    aestheticBtn.className   = 'micro-btn';
    aestheticBtn.textContent = '🌸 Aesthetic Mode';

    const shortBtn = document.createElement('button');
    shortBtn.className   = 'micro-btn';
    shortBtn.textContent = '⚡ Short Version';

    aestheticBtn.addEventListener('click', () => handleRestyle(div, captions, 'aesthetic', aestheticBtn, captionWrap));
    shortBtn.addEventListener('click',     () => handleRestyle(div, captions, 'short',     shortBtn,    captionWrap));

    microRow.appendChild(aestheticBtn);
    microRow.appendChild(shortBtn);
    div.appendChild(microRow);

    copyBtn(div, () => captions.join('\n\n'));
  });
}

async function handleRestyle(captionCardDiv, currentCaptions, style, triggerBtn, captionWrap) {
  triggerBtn.disabled    = true;
  const original         = triggerBtn.textContent;
  triggerBtn.textContent = '⏳ Restyling...';
  captionWrap.style.opacity = '0.4';

  try {
    const res  = await fetch('/api/restyle-captions', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        imageAnalysis:    state.imageAnalysis,
        userInput:        state.userInput,
        finalMode:        state.finalMode,
        finalBusinessType: state.finalBusinessType,
        style,
        currentCaptions,
      }),
    });
    const data = await res.json();

    if (data.error || !data.captions) {
      captionWrap.style.opacity = '1';
      triggerBtn.textContent = '❌ Failed — retry';
      triggerBtn.disabled    = false;
      return;
    }

    captionWrap.innerHTML = '';
    data.captions.forEach((cap, i) => {
      const item = document.createElement('div');
      item.className = 'caption-item';
      item.innerHTML = `<div class="caption-num">Caption ${i + 1}</div><div class="card-body caption-text">${escHtml(cap)}</div>`;
      captionWrap.appendChild(item);
    });
    captionWrap.style.opacity = '1';

    const version = state.activeVersion === 'viral' ? 'viral' : 'safe';
    if (state.content && state.content[version]) state.content[version].captions = data.captions;

    triggerBtn.textContent = '✓ Done!';
    setTimeout(() => {
      triggerBtn.textContent = original;
      triggerBtn.disabled    = false;
    }, 1500);

  } catch (e) {
    captionWrap.style.opacity = '1';
    triggerBtn.textContent = '❌ Failed — retry';
    triggerBtn.disabled    = false;
  }
}

function buildSongsCard(songs) {
  if (!songs || !songs.length) return null;

  return makeCard('songs', '🎵', 'Songs / Sounds', (div) => {
    songs.forEach(s => {
      const item    = document.createElement('div');
      item.className = 'song-item';
      const title   = s.artist ? `${escHtml(s.title)} — ${escHtml(s.artist)}` : escHtml(s.title);
      const reason  = s.reason && s.reason !== s.artist ? escHtml(s.reason) : '';
      item.innerHTML = `
        <div class="song-dot"></div>
        <div>
          <div class="song-text">${title}</div>
          ${reason ? `<div class="song-reason">${reason}</div>` : ''}
        </div>`;
      div.appendChild(item);
    });
    copyBtn(div, () => songs.map(s => s.artist ? `${s.title} — ${s.artist}` : s.title).join('\n'));
  });
}

function buildHashtagsCard(hashtags) {
  if (!hashtags || !hashtags.length) return null;

  return makeCard('hashtags', '#️⃣', 'Hashtags', (div) => {
    const wrap    = document.createElement('div');
    wrap.className = 'card-body hashtag-body';
    hashtags.forEach(h => {
      const pill    = document.createElement('span');
      pill.className = 'hashtag-pill';
      pill.textContent = h;
      wrap.appendChild(pill);
    });
    div.appendChild(wrap);
    copyBtn(div, () => hashtags.join(' '));
  });
}

function buildViralIdeaCard(text) {
  if (!text) return null;

  return makeCard('viral', '🔥', 'Viral Idea', (div) => {
    if (state.activeVersion === 'safe') {
      const microRow   = document.createElement('div');
      microRow.className = 'micro-row micro-row-top';

      const amplifyBtn = document.createElement('button');
      amplifyBtn.className   = 'micro-btn micro-btn-fire';
      amplifyBtn.textContent = '😈 Make it more viral';
      amplifyBtn.addEventListener('click', () => handleAmplifyViral(amplifyBtn));
      microRow.appendChild(amplifyBtn);
      div.appendChild(microRow);
    }

    const body        = document.createElement('div');
    body.className    = 'card-body';
    body.textContent  = text;
    div.appendChild(body);
    copyBtn(div, () => text);
  });
}

async function handleAmplifyViral(triggerBtn) {
  triggerBtn.disabled    = true;
  triggerBtn.textContent = '⏳ Amplifying...';

  try {
    const res  = await fetch('/api/amplify-viral', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        imageAnalysis:    state.imageAnalysis,
        userInput:        state.userInput,
        finalMode:        state.finalMode,
        finalBusinessType: state.finalBusinessType,
        currentViral:     state.content?.viral || null,
      }),
    });
    const data = await res.json();

    if (data.error || !data.viral) {
      triggerBtn.textContent = '❌ Failed — retry';
      triggerBtn.disabled    = false;
      return;
    }

    if (state.content) state.content.viral = data.viral;
    state.activeVersion = 'viral';
    versionTabViral.classList.add('active');
    versionTabSafe.classList.remove('active');
    renderActiveVersion();
    updateSocialPreview();
    renderViralScore();
    renderShareCard();

    const badge = document.getElementById('detected-badge');
    if (badge) {
      const orig = badge.textContent;
      badge.textContent = '🔥 Viral version amplified';
      setTimeout(() => { badge.textContent = orig; }, 2500);
    }

  } catch (e) {
    triggerBtn.textContent = '❌ Failed — retry';
    triggerBtn.disabled    = false;
  }
}

function buildEngagementCard(text) {
  if (!text) return null;
  return makeCard('engagement', '💬', 'Engagement', (div) => {
    const body        = document.createElement('div');
    body.className    = 'card-body';
    body.style.fontStyle = 'italic';
    body.textContent  = text;
    div.appendChild(body);
    copyBtn(div, () => text);
  });
}

function buildCtaCard(text) {
  if (!text) return null;
  return makeCard('cta', '📣', 'Call to Action', (div) => {
    const body       = document.createElement('div');
    body.className   = 'card-body';
    body.textContent = text;
    div.appendChild(body);
    copyBtn(div, () => text);
  });
}

function buildContentIdeaCard(text) {
  if (!text) return null;
  return makeCard('idea', '💡', 'Content Idea', (div) => {
    const body       = document.createElement('div');
    body.className   = 'card-body';
    body.textContent = text;
    div.appendChild(body);
    copyBtn(div, () => text);
  });
}

// ── NEW POST ─────────────────────────────────────────────────
btnNew.addEventListener('click', () => {
  Object.assign(state, {
    imageFile: null, imageBase64: null, imageMimeType: null,
    imageAnalysis: '', userInput: '',
    mode: 'PERSONAL', businessType: '',
    content: null, meta: null, activeVersion: 'safe',
    finalMode: 'PERSONAL', finalBusinessType: '',
    selectedNiche: '',
    previewPlatform: 'ig', previewCollapsed: false,
    trendEngineData: null, trendEngineRunning: false,
  });

  fileInput.value                  = '';
  descriptionInput.value           = '';
  businessTypeInput.value          = '';
  imagePreviewWrap.style.display   = 'none';
  versionTabs.style.display        = 'none';
  detectedBadge.style.display      = 'none';
  viralScorePanel.style.display    = 'none';
  socialPreviewCard.style.display  = 'none';
  shareCard.style.display          = 'none';

  niqueChips.forEach(c => c.classList.remove('active'));
  descriptionInput.placeholder = 'Describe your post (optional — AI figures it out)...';

  modeCards.forEach(c => c.classList.remove('active'));
  modeCards[0].classList.add('active');
  businessField.style.display = 'none';

  versionTabSafe.classList.add('active');
  versionTabViral.classList.remove('active');

  showScreen('landing');
});

// ── ERROR ─────────────────────────────────────────────────────
function showError(msg) {
  versionTabs.style.display   = 'none';
  detectedBadge.style.display = 'none';
  resultsCards.innerHTML = '';

  const div = document.createElement('div');
  div.className = 'error-card';
  div.innerHTML = `⚠️ <strong>Something went wrong</strong><br><br>${escHtml(msg)}<br><br>
    <span style="font-size:0.82rem;opacity:0.7">
      Check that <code>OPENAI_API_KEY</code> is set in <code>.env</code> and the server is running.
    </span>`;
  resultsCards.appendChild(div);
  showScreen('results');
}

// ── UTILS ─────────────────────────────────────────────────────
function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function escAttr(str) {
  return String(str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
