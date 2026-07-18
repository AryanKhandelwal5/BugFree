const languageComments = {
  Python: '# WRITE / PASTE YOUR PYTHON CODE HERE',
  JavaScript: '// WRITE / PASTE YOUR JAVASCRIPT CODE HERE',
  Java: '// WRITE / PASTE YOUR JAVA CODE HERE',
  'C++': '// WRITE / PASTE YOUR C++ CODE HERE'
};

const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
const root = document.querySelector('#root');

root.innerHTML = `
  <div class="app" id="app">
    <header class="topbar">
      <a class="logo" href="/"><span>Bug</span><strong>Free</strong></a>
      <div class="top-actions"><span class="secure-note"><span class="icon">●</span> Works locally — no API key</span><button id="theme-toggle" class="theme-button" type="button">Dark mode</button></div>
    </header>
    <main class="shell">
      <section class="hero"><p class="eyebrow">LOCAL PRODUCTION CODE REVIEW</p><h1>Turn working code into <em>stronger code.</em></h1><p>Paste your code. BugFree checks known mistakes locally, explains safe fixes, and never asks for an API key.</p></section>
      <section class="workbench">
        <section class="editor-panel">
          <div class="panel-head"><div><span class="step">01</span><h2>Your code</h2></div><label class="language-picker">Language<select id="language"><option>Python</option><option>JavaScript</option><option>Java</option><option>C++</option></select></label></div>
          <div class="code-shell"><div class="line-numbers" id="line-numbers"><span>1</span></div><textarea id="code-input" spellcheck="false" aria-label="Paste code"></textarea></div>
          <section id="source-review" class="source-review" hidden></section>
          <div class="editor-footer"><span id="character-count">0 characters</span><button id="clear-code" class="clear" type="button">Clear code</button></div>
          <button id="review-button" class="improve-button" type="button">Review and improve my code <span>→</span></button>
        </section>
        <section id="result-panel" class="result-panel" aria-live="polite"></section>
      </section>
      <div id="toast" class="toast" hidden></div>
      <section class="trust-row"><div><b>One clear result</b><span>A safer local version first, explanations second.</span></div><div><b>No pretend certainty</b><span>BugFree only changes patterns it recognizes.</span></div><div><b>Four focused languages</b><span>C++, Python, Java, and JavaScript.</span></div></section>
    </main>
  </div>`;

const app = document.querySelector('#app');
const input = document.querySelector('#code-input');
const language = document.querySelector('#language');
const lineNumbers = document.querySelector('#line-numbers');
const count = document.querySelector('#character-count');
const resultPanel = document.querySelector('#result-panel');
const reviewButton = document.querySelector('#review-button');
const toast = document.querySelector('#toast');
const sourceReview = document.querySelector('#source-review');

function updateEditor() {
  const lineCount = Math.max(1, input.value.split(/\r?\n/).length);
  lineNumbers.innerHTML = Array.from({ length: lineCount }, (_, index) => `<span>${index + 1}</span>`).join('');
  count.textContent = `${input.value.length.toLocaleString()} characters`;
}

function showToast(message, success = false) {
  toast.className = success ? 'toast success' : 'toast';
  toast.innerHTML = `<button type="button" aria-label="Close message">×</button>${escapeHtml(message)}`;
  toast.hidden = false;
  toast.querySelector('button').addEventListener('click', () => { toast.hidden = true; });
}

function emptyState() {
  resultPanel.innerHTML = `<div class="empty-result"><div class="empty-icon">&lt; &gt;</div><h2>Your improved code will appear here</h2><p>BugFree checks local, language-specific mistakes in your code—no account or API key needed.</p><div class="result-pills"><span>Local checks</span><span>Security patterns</span><span>Test ideas</span></div></div>`;
}

function loadingState() {
  resultPanel.innerHTML = `<div class="loading-result"><div class="loader"></div><h2>Reviewing your code</h2><p>Checking known language, security, and reliability patterns...</p></div>`;
}

function renderSourceReview(highlights) {
  if (!highlights || !highlights.length) { sourceReview.hidden = true; sourceReview.innerHTML = ''; return; }
  const byLine = new Map();
  highlights.forEach(issue => { const items = byLine.get(issue.line) || []; items.push(issue); byLine.set(issue.line, items); });
  const lines = input.value.split(/\r?\n/);
  sourceReview.hidden = false;
  sourceReview.innerHTML = `<div class="source-review-head"><span>HIGHLIGHTED ISSUES IN YOUR CODE</span><small>${highlights.length} issue${highlights.length === 1 ? '' : 's'} found</small></div><pre>${lines.map((line, index) => {
    const issues = byLine.get(index + 1);
    const note = issues ? `<mark>${issues.map(issue => escapeHtml(issue.title)).join(' · ')}</mark>` : '';
    return `<span class="source-line ${issues ? 'flagged' : ''}"><i>${index + 1}</i><code>${escapeHtml(line || ' ')}</code>${note}</span>`;
  }).join('')}</pre>`;
}

function resultState(data) {
  const severity = String(data.severity || 'Low').toLowerCase();
  const changes = (data.changes || []).map(item => `<article><div><h4>${escapeHtml(item.title)}</h4><p>${escapeHtml(item.reason)}</p></div></article>`).join('');
  const tests = (data.tests || []).map(item => `<article><b>${escapeHtml(item.name)}</b><span>${escapeHtml(item.purpose)}</span></article>`).join('');
  resultPanel.innerHTML = `
    <div class="result-title"><div><p>YOUR FIXED CODE</p><h2>Here is a safer, cleaner version.</h2></div><span class="severity ${severity}">${escapeHtml(data.severity || 'Low')} risk</span></div>
    <p class="summary">${escapeHtml(data.summary)}</p>
    <section class="rewritten-code"><div class="code-head"><span>IMPROVED CODE</span><button id="copy-code" type="button">Copy code</button></div><pre><code>${escapeHtml(data.productionCode || '')}</code></pre></section>
    <section class="changes"><h3>What was wrong and how to fix it</h3>${changes}</section>
    <section class="tests"><h3>Try these tests</h3>${tests}</section>`;
  renderSourceReview(data.highlights);
  document.querySelector('#copy-code').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(data.productionCode || ''); showToast('Copied the safer code.', true); }
    catch { showToast('Select the code manually to copy it.'); }
  });
}

async function reviewCode() {
  if (!input.value.trim()) { showToast('Paste some code first, then try again.'); input.focus(); return; }
  reviewButton.disabled = true;
  reviewButton.textContent = 'Reviewing your code...';
  loadingState();
  try {
    const response = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ input: input.value, language: language.value }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not review this code.');
    resultState(data);
  } catch (error) {
    emptyState();
    showToast(error.message);
  } finally {
    reviewButton.disabled = false;
    reviewButton.innerHTML = 'Review and improve my code <span>→</span>';
  }
}

language.addEventListener('change', () => { input.placeholder = languageComments[language.value]; });
input.addEventListener('input', () => { updateEditor(); sourceReview.hidden = true; });
document.querySelector('#clear-code').addEventListener('click', () => { input.value = ''; updateEditor(); sourceReview.hidden = true; emptyState(); input.focus(); });
reviewButton.addEventListener('click', reviewCode);
document.querySelector('#theme-toggle').addEventListener('click', event => { const enabled = app.classList.toggle('dark'); event.currentTarget.textContent = enabled ? 'Light mode' : 'Dark mode'; });
document.addEventListener('keydown', event => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') reviewCode(); });
input.placeholder = languageComments[language.value];
updateEditor();
emptyState();
