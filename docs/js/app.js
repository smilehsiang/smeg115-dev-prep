/* ─── smeg115 Study Site ─────────────────────────────────────── */

const EXAM_DATE = new Date('2026-06-13T14:00:00+08:00');
const STORAGE_KEY = 'smeg115_progress';

// ─── Progress Store ───────────────────────────────────────────

const Progress = {
  get() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch { return {}; }
  },
  set(data) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); },
  toggleExercise(chapterId, sectionId, exId) {
    const p = this.get();
    const key = `${chapterId}:${sectionId}:${exId}`;
    p[key] = !p[key];
    this.set(p);
    return p[key];
  },
  isDone(chapterId, sectionId, exId) {
    return !!this.get()[`${chapterId}:${sectionId}:${exId}`];
  },
  countDone(chapterId, sectionId, total) {
    const p = this.get();
    let count = 0;
    for (let i = 1; i <= total; i++) {
      if (p[`${chapterId}:${sectionId}:${i}`]) count++;
    }
    return count;
  },
  totalDone() {
    return Object.values(this.get()).filter(Boolean).length;
  }
};

// ─── Countdown ────────────────────────────────────────────────

function getCountdown() {
  const now = new Date();
  const diff = EXAM_DATE - now;
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, expired: true };
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  return { days, hours, minutes, expired: false };
}

function updateCountdown(el) {
  if (!el) return;
  const { days, hours, minutes, expired } = getCountdown();
  if (expired) { el.textContent = '考試已結束'; return; }
  el.innerHTML = `<strong>${days}</strong> 天 ${hours} 時 ${minutes} 分`;
}

// ─── Fetch helpers ────────────────────────────────────────────

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

function getBasePath() {
  // Works both locally (file://) and on GitHub Pages (/repo-name/)
  const path = window.location.pathname;
  const idx = path.lastIndexOf('/');
  return path.slice(0, idx);
}

function dataURL(file) {
  return `${getBasePath()}/data/${file}`;
}

// ─── Code Block Renderer ──────────────────────────────────────

function renderCodeBlock(code, lang = 'csharp') {
  const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `
    <div class="code-block-wrapper">
      <div class="code-block-header">
        <span class="lang-badge">${lang.toUpperCase()}</span>
        <button class="copy-btn" onclick="copyCode(this)">複製</button>
      </div>
      <pre class="code-pre"><code class="language-${lang}">${escaped}</code></pre>
    </div>`;
}

function copyCode(btn) {
  const code = btn.closest('.code-block-wrapper').querySelector('code').textContent;
  navigator.clipboard.writeText(code).then(() => {
    btn.textContent = '已複製 ✓';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = '複製'; btn.classList.remove('copied'); }, 1500);
  });
}
window.copyCode = copyCode;

// ─── Content Renderer ─────────────────────────────────────────

function formatContent(text) {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .split('\n\n').map(p => p.trim() ? `<p>${p}</p>` : '').join('');
}

function renderExercise(ex, chapterId, sectionId) {
  const done = Progress.isDone(chapterId, sectionId, ex.id);
  const typeLabel = { coding: '程式設計', debugging: '除錯', 'multiple-choice': '選擇題', design: '設計題' }[ex.type] || ex.type;
  const typeClass = `type-${ex.type}`;

  const isCorrectOption = (opt) => {
    if (!ex.answer) return false;
    const letter = ex.answer.trim().charAt(0).toUpperCase();
    return opt.startsWith(letter + '.');
  };

  const optionsHTML = ex.options ? `
    <p class="options-label">選項：</p>
    <ul class="options-list">
      ${ex.options.map(opt => `<li class="${isCorrectOption(opt) ? 'correct' : ''}">${escapeHTML(opt)}</li>`).join('')}
    </ul>` : '';

  const buggyCodeHTML = ex.buggyCode ? `
    <p class="buggy-code-label">有錯誤的程式碼：</p>
    ${renderCodeBlock(ex.buggyCode, 'csharp')}` : '';

  const answerHTML = ex.answer ? `
    <p class="answer-label">解答：</p>
    <div class="answer-box">
      ${ex.type === 'multiple-choice'
        ? `<strong>${ex.answer}</strong>`
        : renderCodeBlock(ex.answer, 'csharp')}
    </div>` : '';

  const explanationHTML = ex.explanation ? `
    <p class="explanation-label">解析：</p>
    <div class="explanation-box">${formatContent(ex.explanation)}</div>` : '';

  return `
    <div class="exercise-card ${done ? 'done' : ''}" id="ex-${chapterId}-${sectionId}-${ex.id}">
      <div class="ex-header" onclick="toggleExercise(this)">
        <div class="ex-number" style="background:${done ? '#86efac' : '#f0f1f5'};color:${done ? '#065f46' : '#6b7280'}">${ex.id}</div>
        <span class="ex-type-badge ${typeClass}">${typeLabel}</span>
        <div class="ex-question">${formatContent(ex.question)}</div>
        <span class="ex-toggle-icon">▼</span>
      </div>
      <div class="ex-body">
        ${buggyCodeHTML}
        ${optionsHTML}
        ${answerHTML}
        ${explanationHTML}
        <div class="ex-actions">
          <button class="btn-done ${done ? 'active' : ''}"
            onclick="markDone('${chapterId}','${sectionId}',${ex.id},this)">
            ${done ? '✓ 已熟悉' : '標記已熟悉'}
          </button>
        </div>
      </div>
    </div>`;
}

window.toggleExercise = function(header) {
  const body = header.nextElementSibling;
  const icon = header.querySelector('.ex-toggle-icon');
  const isOpen = body.classList.toggle('open');
  icon.textContent = isOpen ? '▲' : '▼';
  if (isOpen && window.Prism) {
    header.closest('.exercise-card').querySelectorAll('code[class*="language-"]').forEach(el => Prism.highlightElement(el));
  }
};

window.markDone = function(chapterId, sectionId, exId, btn) {
  const isDone = Progress.toggleExercise(chapterId, sectionId, exId);
  const card = btn.closest('.exercise-card');
  card.classList.toggle('done', isDone);
  btn.classList.toggle('active', isDone);
  btn.textContent = isDone ? '✓ 已熟悉' : '標記已熟悉';
  updateSidebarProgress();
};

function escapeHTML(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── Sidebar ──────────────────────────────────────────────────

async function buildSidebar(indexData, activeChapter) {
  const nav = document.getElementById('sidebar-nav');
  if (!nav) return;

  const base = getBasePath();

  nav.innerHTML = `
    <div class="nav-section-label">學習章節</div>
    ${indexData.chapters.map(ch => `
      <div class="nav-chapter ${ch.id === activeChapter ? 'active' : ''}"
           onclick="toggleChapterNav('${ch.id}',this)">
        <div class="ch-badge" style="background:${ch.color}">${ch.priority}</div>
        <span>${ch.title}</span>
        <span class="ch-progress" id="nav-prog-${ch.id}"></span>
      </div>
      <div class="nav-sections ${ch.id === activeChapter ? 'open' : ''}" id="nav-sections-${ch.id}">
        ${ch.sections.map(s => `
          <div class="nav-section-item" onclick="navToSection('${ch.id}','${s.id}')" id="nav-sec-${ch.id}-${s.id}">
            ${s.title}
          </div>`).join('')}
      </div>`).join('')}
    <div class="nav-section-label" style="margin-top:8px">快速導覽</div>
    <a class="nav-chapter" href="${base}/index.html" style="font-size:0.85rem">
      <div class="ch-badge" style="background:#6b7280">🏠</div>
      <span>回首頁</span>
    </a>`;

  updateSidebarProgress();
}

window.toggleChapterNav = function(chId, el) {
  const sections = document.getElementById(`nav-sections-${chId}`);
  sections.classList.toggle('open');
};

window.navToSection = function(chId, sectionId) {
  const base = getBasePath();
  const currentPage = window.location.pathname;
  if (currentPage.endsWith('chapter.html')) {
    const url = new URL(window.location.href);
    if (url.searchParams.get('ch') === chId) {
      const el = document.getElementById(`section-${sectionId}`);
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    }
  }
  window.location.href = `${base}/chapter.html?ch=${chId}#section-${sectionId}`;
};

function updateSidebarProgress() {
  // Update done count per chapter in sidebar
  const indexData = window.__indexData;
  if (!indexData) return;
  indexData.chapters.forEach(ch => {
    const el = document.getElementById(`nav-prog-${ch.id}`);
    if (!el) return;
    let done = 0;
    ch.sections.forEach(s => { done += Progress.countDone(ch.id, s.id, s.exerciseCount); });
    const total = ch.totalExercises;
    el.textContent = `${done}/${total}`;
  });
}

// ─── Home Page ────────────────────────────────────────────────

async function initHome() {
  const indexData = await fetchJSON(dataURL('index.json'));
  window.__indexData = indexData;

  buildSidebar(indexData, null);

  // Countdown
  const cdEl = document.getElementById('countdown');
  updateCountdown(cdEl);
  setInterval(() => updateCountdown(cdEl), 30000);

  // Days remaining
  const { days } = getCountdown();
  const daysEl = document.getElementById('days-remaining');
  if (daysEl) { daysEl.innerHTML = `<span class="countdown-big">${days}</span>`; }

  // Chapters grid
  const grid = document.getElementById('chapters-grid');
  if (grid) {
    const base = getBasePath();
    grid.innerHTML = indexData.chapters.map(ch => {
      let done = 0;
      ch.sections.forEach(s => { done += Progress.countDone(ch.id, s.id, s.exerciseCount); });
      const pct = ch.totalExercises > 0 ? Math.round(done / ch.totalExercises * 100) : 0;
      const priorityColors = ['#fee2e2','#dbeafe','#ede9fe','#d1fae5','#fef3c7','#d1fae5'];
      const priorityTextColors = ['#991b1b','#1e40af','#5b21b6','#065f46','#92400e','#065f46'];
      const pIdx = ch.priority - 1;
      return `
        <a class="chapter-card" href="${base}/chapter.html?ch=${ch.id}">
          <div class="chapter-card-header">
            <div class="ch-icon" style="background:${ch.color}">${ch.priority}</div>
            <div class="ch-meta">
              <h3>${ch.title}</h3>
              <span class="priority-badge" style="background:${priorityColors[pIdx]};color:${priorityTextColors[pIdx]}">${ch.priorityLabel}</span>
            </div>
          </div>
          <div class="chapter-stats">
            <div class="stat"><div class="num">${ch.sections.length}</div><div class="lbl">小節</div></div>
            <div class="stat"><div class="num">${ch.totalExercises}</div><div class="lbl">練習題</div></div>
            <div class="stat"><div class="num">${pct}%</div><div class="lbl">完成</div></div>
          </div>
          <div class="chapter-progress-bar">
            <div class="chapter-progress-fill" style="width:${pct}%;background:${ch.color}"></div>
          </div>
          <div class="chapter-weight">${ch.examWeight}</div>
        </a>`;
    }).join('');
  }

  // Schedule
  buildSchedule(indexData);
}

function buildSchedule(indexData) {
  const tbody = document.getElementById('schedule-tbody');
  if (!tbody) return;
  const today = new Date();
  today.setHours(0,0,0,0);

  tbody.innerHTML = indexData.schedule.map(item => {
    const start = new Date(item.date);
    const end = new Date(item.end);
    const isPast = end < today;
    const isToday = start <= today && today <= end;
    const isExam = item.date === '2026-06-13';

    let cls = '';
    if (isExam) cls = 'exam-day';
    else if (isToday) cls = 'today';
    else if (isPast) cls = 'past';

    const badge = isExam ? '<span class="day-badge today-badge">考試日</span>'
      : isToday ? '<span class="day-badge today-badge">今天</span>'
      : isPast ? '<span class="day-badge done-badge">已完成</span>'
      : '';

    const startStr = `${start.getMonth()+1}/${start.getDate()}`;
    const endStr = start.toDateString() === end.toDateString() ? '' : `–${end.getMonth()+1}/${end.getDate()}`;

    return `<tr class="${cls}">
      <td><span class="date-range">${startStr}${endStr}</span>${badge}</td>
      <td>${item.topic}</td>
    </tr>`;
  }).join('');
}

// ─── Chapter Page ─────────────────────────────────────────────

async function initChapter() {
  const params = new URLSearchParams(window.location.search);
  const chId = params.get('ch') || 'ch01';

  const indexData = await fetchJSON(dataURL('index.json'));
  window.__indexData = indexData;
  buildSidebar(indexData, chId);

  // Breadcrumb
  const chInfo = indexData.chapters.find(c => c.id === chId);
  const breadcrumb = document.getElementById('breadcrumb');
  if (breadcrumb && chInfo) {
    breadcrumb.innerHTML = `首頁 / <span>${chInfo.title}</span>`;
  }

  // Countdown topbar
  const cdEl = document.getElementById('countdown-topbar');
  if (cdEl) { updateCountdown(cdEl); setInterval(() => updateCountdown(cdEl), 30000); }

  // Load chapter data
  const contentEl = document.getElementById('chapter-content');
  const tocEl = document.getElementById('chapter-toc-list');
  if (!contentEl) return;

  contentEl.innerHTML = `<div class="loading"><div class="spinner"></div><p>載入內容中…</p></div>`;

  let chapterData;
  try {
    chapterData = await fetchJSON(dataURL(`${chId}.json`));
  } catch (err) {
    contentEl.innerHTML = `
      <div class="not-generated">
        <h3>尚未產生內容</h3>
        <p>請先執行內容產生腳本：</p>
        <div class="cmd">cd scripts && npm install && ANTHROPIC_API_KEY=sk-... node generate-content.js --chapter=${chId}</div>
        <p style="margin-top:12px;font-size:0.85rem">或執行全部章節：<code>node generate-content.js</code></p>
      </div>`;
    return;
  }

  // Render chapter header
  if (chInfo) {
    const header = document.getElementById('chapter-header');
    if (header) {
      header.innerHTML = `
        <div class="chapter-header">
          <h1>${chapterData.title}</h1>
          <div class="meta">
            <span class="tag" style="background:${chInfo.color}20;color:${chInfo.color}">${chInfo.priorityLabel}</span>
            <span class="tag" style="background:#f0f1f5;color:#6b7280">${chInfo.examWeight}</span>
            <span class="tag" style="background:#eef0ff;color:#4e6ef2">${chapterData.sections?.length || 0} 個小節・${chInfo.totalExercises} 道練習題</span>
          </div>
        </div>`;
    }
  }

  if (!chapterData.sections || chapterData.sections.length === 0) {
    contentEl.innerHTML = `<div class="not-generated"><h3>此章節尚無內容</h3></div>`;
    return;
  }

  // Render TOC
  if (tocEl) {
    tocEl.innerHTML = chapterData.sections.map(s => {
      const done = Progress.countDone(chId, s.id, s.exercises?.length || 0);
      const total = s.exercises?.length || 0;
      return `
        <div class="toc-item ${done === total && total > 0 ? 'done' : ''}" id="toc-${s.id}"
             onclick="document.getElementById('section-${s.id}').scrollIntoView({behavior:'smooth',block:'start'})">
          ${s.title}
          <span class="toc-check">${done}/${total}</span>
        </div>`;
    }).join('');
  }

  // Render sections
  contentEl.innerHTML = chapterData.sections.map((section, idx) => {
    const exercises = section.exercises || [];
    const exercisesHTML = exercises.length > 0 ? `
      <div class="exercises-header">
        練習題
        <span class="ex-count">${exercises.length} 題</span>
      </div>
      ${exercises.map(ex => renderExercise(ex, chId, section.id)).join('')}` : '';

    return `
      <div class="section-block" id="section-${section.id}">
        <h2><span class="section-mark">§${idx+1}</span>${section.title}</h2>
        <div class="content-text">${formatContent(section.content)}</div>
        ${section.codeExample ? renderCodeBlock(section.codeExample, 'csharp') : ''}
        ${section.keyPoints?.length ? `
          <div class="key-points">
            <h4>📌 考試重點</h4>
            <ul>${section.keyPoints.map(kp => `<li>${escapeHTML(kp)}</li>`).join('')}</ul>
          </div>` : ''}
        ${exercisesHTML}
      </div>`;
  }).join('');

  // Syntax highlight all code blocks
  if (window.Prism) {
    document.querySelectorAll('code[class*="language-"]').forEach(el => Prism.highlightElement(el));
  }

  // Scroll to anchor if present
  const hash = window.location.hash;
  if (hash) {
    setTimeout(() => {
      const el = document.querySelector(hash);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);
  }

  updateSidebarProgress();
}

// ─── Mobile menu ──────────────────────────────────────────────

window.toggleMenu = function() {
  document.getElementById('sidebar').classList.toggle('open');
};

// ─── Init ─────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;
  if (page === 'home') initHome();
  else if (page === 'chapter') initChapter();
});
