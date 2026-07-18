const input = document.querySelector('#input');
const language = document.querySelector('#language');
const button = document.querySelector('#analyze');
const results = document.querySelector('#results');
const demoMode = document.querySelector('#demo-mode');
const themeToggle = document.querySelector('#theme-toggle');
const charCount = document.querySelector('#char-count');
const clearInput = document.querySelector('#clear-input');
button.textContent = 'Improve my code ->';

function updateCharCount() { charCount.textContent = `${input.value.length.toLocaleString()} characters`; }
input.addEventListener('input', updateCharCount);
clearInput.addEventListener('click', () => { input.value = ''; updateCharCount(); input.focus(); });
document.addEventListener('keydown', event => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') button.click(); });

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeToggle.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
  themeToggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  localStorage.setItem('bugfree-theme', theme);
}

setTheme(localStorage.getItem('bugfree-theme') === 'dark' ? 'dark' : 'light');
themeToggle.addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));

const escapeHtml = value => String(value).replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));

function list(title, items) {
  if (!items || !items.length) return '';
  return `<div class="result-section"><h3>${title}</h3><ul>${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div>`;
}

function fixes(items) {
  if (!items || !items.length) return '';
  return `<div class="result-section"><h3>HOW TO FIX IT</h3>${items.map(fix => `<div class="fix"><strong>${escapeHtml(fix.title)}</strong><p>${escapeHtml(fix.explanation)}</p><div class="code-label">CHANGE THIS</div><pre>${escapeHtml(fix.before)}</pre><div class="code-label">TO THIS</div><pre>${escapeHtml(fix.after)}</pre><p><b>Avoid it:</b> ${escapeHtml(fix.avoid)}</p></div>`).join('')}</div>`;
}

function demoFixes(bugs) {
  const text = (bugs || []).join(' ').toLowerCase();
  if (text.includes('dividing by zero')) return [{ title: 'Check the divisor first', explanation: 'A program cannot safely divide by zero.', before: 'result = a / b;', after: 'if (b === 0) throw new Error("Cannot divide by zero");\nresult = a / b;', avoid: 'Validate a divisor before calculating.' }];
  if (text.includes('user.name')) return [{ title: 'Check that user exists', explanation: 'Reading a property from a missing user causes a crash.', before: 'const greeting = user.name.toUpperCase();', after: 'const greeting = user?.name?.toUpperCase() ?? "GUEST";', avoid: 'Treat data from users and APIs as possibly missing.' }];
  if (text.includes('api call')) return [{ title: 'Handle a failed request', explanation: 'Network requests can fail even when your code is correct.', before: "fetch('/api/profile').then(showProfile);", after: "try {\n  const response = await fetch('/api/profile');\n  if (!response.ok) throw new Error('Request failed');\n} catch (error) { showError('Please try again.'); }", avoid: 'Check response.ok and use a catch block for every request.' }];
  if (text.includes('hard-coded password')) return [{ title: 'Remove the password from code', explanation: 'Anyone who can view the code can find a hard-coded password.', before: "if (password === 'admin123') loginUser();", after: '// Send credentials to a secure server.\n// Store only password hashes on that server.', avoid: 'Never store passwords or secret keys in frontend code.' }];
  if (text.includes('one extra time')) return [{ title: 'Use less than, not less than or equal to', explanation: 'The final valid array position is length - 1.', before: 'for (let i = 0; i <= items.length; i++)', after: 'for (let i = 0; i < items.length; i++)', avoid: 'Use < with length or size() in loops.' }];
  return [];
}

function findCodeIssues(source, selectedLanguage) {
  return source.split(/\r?\n/).map((line, index) => {
    const code = line.toLowerCase();
    const isPreprocessorOrComment = line.trim().startsWith('#') || line.trim().startsWith('//');
    let label = '';
    let color = '';
    if (selectedLanguage === 'C++' && /<=\s*\w+\.size\s*\(/.test(code)) { label = 'Loop may run one extra time'; color = 'pink'; }
    else if (selectedLanguage === 'JavaScript' && /\.innerhtml\s*=/.test(code)) { label = 'Untrusted HTML can be unsafe'; color = 'pink'; }
    else if (selectedLanguage === 'JavaScript' && /fetch\(/.test(code) && !/\.catch\s*\(/.test(source) && !/try\s*\{/.test(source)) { label = 'Handle request failure'; color = 'blue'; }
    else if (selectedLanguage === 'JavaScript' && /password\s*===\s*['"]/.test(code)) { label = 'Hard-coded password'; color = 'pink'; }
    else if (selectedLanguage === 'C++' && /\bgets\s*\(|strcpy\s*\(/.test(code)) { label = 'Unsafe string operation'; color = 'pink'; }
    else if (selectedLanguage === 'C++' && /\bnew\s+\w+/.test(code) && !/\b(unique_ptr|shared_ptr)\b/.test(source)) { label = 'Check memory ownership'; color = 'yellow'; }
    else if (selectedLanguage === 'Python' && /\bprint\(\s*[a-z_]\w*\s*\)/.test(code) && !new RegExp(`^\\s*${(line.match(/\bprint\(\s*([A-Za-z_]\w*)\s*\)/) || ['', ''])[1]}\\s*=`, 'm').test(source)) { label = 'Name is not defined'; color = 'pink'; }
    else if (selectedLanguage === 'Python' && /^(print|input|len|range)\s*\(.*\)\s*:$/.test(line.trim())) { label = 'Colon is not valid here'; color = 'pink'; }
    else if (selectedLanguage === 'Python' && /\b(eval|exec)\s*\(/.test(code)) { label = 'Dynamic execution is unsafe'; color = 'pink'; }
    else if (selectedLanguage === 'Python' && /except\s*:/.test(code)) { label = 'Bare exception handler'; color = 'yellow'; }
    else if (selectedLanguage === 'Java' && /\b\w+\s*==\s*"[^"]*"/.test(line)) { label = 'Use equals for strings'; color = 'pink'; }
    return { line, number: index + 1, label, color };
  });
}

function codeReview(source, selectedLanguage) {
  const issues = findCodeIssues(source, selectedLanguage);
  const flagged = issues.filter(issue => issue.label);
  if (!flagged.length) return '';
  return `<div class="review"><div class="review-title"><h3>CODE REVIEW</h3><span>${flagged.length} line${flagged.length === 1 ? '' : 's'} flagged</span></div><pre class="review-code">${issues.map(issue => `<span class="review-line ${issue.color}"><i>${issue.number}</i>${escapeHtml(issue.line || ' ') }${issue.label ? `<b>${escapeHtml(issue.label)}</b>` : ''}</span>`).join('')}</pre></div>`;
}

function productionPanel(data) {
  const availableFixes = data.fixes && data.fixes.length ? data.fixes : demoFixes(data.likelyBugs);
  const improvedCode = data.improvedCode || (availableFixes[0] && availableFixes[0].after) || '';
  const security = data.securityChecklist || (data.severity === 'Critical' || data.severity === 'High' ? 'Review before deployment' : 'No high-risk pattern found');
  return `<section class="production-panel"><h3>PRODUCTION READINESS</h3><div class="readiness"><div><b>Reliability</b>${escapeHtml(data.severity || 'Review needed')} risk level</div><div><b>Security</b>${escapeHtml(security)}</div><div><b>Scale</b>${escapeHtml(data.scalabilityTip || 'Test larger inputs and failure paths')}</div></div>${improvedCode ? `<div class="improved-code"><button class="copy-code" data-copy="${escapeHtml(improvedCode)}">Copy safer code</button><h3>SAFER CODE STARTER</h3><pre>${escapeHtml(improvedCode)}</pre></div>` : ''}</section>`;
}

function perfectMoment(data) {
  const isClean = data.severity === 'Low' && (!data.likelyBugs || data.likelyBugs.length === 0);
  if (!isClean) return '';
  const messages = [
    ['Perfect code!', 'Clean, safe-looking, and ready for your next challenge.'],
    ['BugFree win!', 'No confirmed issue found. That is clean work.'],
    ['Ship it with confidence!', 'This snippet passed BugFree Demo Mode with no red flags.']
  ];
  const [title, text] = messages[Math.floor(Math.random() * messages.length)];
  return `<section class="perfect-moment" role="status"><div class="perfect-icon">OK</div><div><h2>${title}</h2><p>${text}</p></div><span class="confetti">+ + +</span></section>`;
}

function showAnalysis(data) {
  const severity = (data.severity || 'Medium').toLowerCase();
  results.className = 'results';
  results.innerHTML = `
    <div class="result-top"><div><h2>Testing report</h2><p>${escapeHtml(data.summary)}</p></div><span class="severity ${severity}">${escapeHtml(data.severity)} severity</span></div>
    ${perfectMoment(data)}
    ${productionPanel(data)}
    ${codeReview(input.value, language.value)}
    ${list('LIKELY BUGS', data.likelyBugs || [])}
    ${fixes(data.fixes && data.fixes.length ? data.fixes : demoFixes(data.likelyBugs))}
    ${list('EDGE CASES TO TEST', data.edgeCases || [])}
    <div class="result-section"><h3>SUGGESTED TEST CASES</h3>${(data.testCases || []).map(test => `<div class="test"><strong>${escapeHtml(test.name)}</strong><p><b>Try:</b> ${escapeHtml(test.steps)}<br><b>Expect:</b> ${escapeHtml(test.expected)}</p></div>`).join('')}</div>
    <p class="source-note">${data.source === 'sample' ? '✦ Sample analysis mode — add an API key for tailored results.' : '✦ AI-powered analysis'}</p>`;
}

button.addEventListener('click', async () => {
  if (!input.value.trim()) { input.focus(); return; }
  button.disabled = true; button.innerHTML = 'Analyzing…';
  results.className = 'results empty';
  results.innerHTML = '<div class="empty-state"><div class="spark">...</div><h2>Building your test plan...</h2><p>Looking for bugs and edge cases.</p></div>';
  try {
    const response = await fetch('/api/analyze', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({input: input.value, language: language.value, demoMode: demoMode.checked}) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    showAnalysis(data);
  } catch (error) {
    results.className = 'results empty';
    results.innerHTML = `<div class="empty-state"><div class="spark">!</div><h2>Couldn’t analyze that yet</h2><p>${escapeHtml(error.message)}</p></div>`;
  } finally { button.disabled = false; button.innerHTML = 'Analyze <span>→</span>'; }
});

document.querySelectorAll('.example').forEach(example => example.addEventListener('click', () => {
  input.value = example.dataset.example;
  input.focus();
}));

results.addEventListener('click', async event => {
  const copyButton = event.target.closest('.copy-code');
  if (!copyButton) return;
  try {
    await navigator.clipboard.writeText(copyButton.dataset.copy);
    copyButton.textContent = 'Copied';
    setTimeout(() => copyButton.textContent = 'Copy safer code', 1500);
  } catch { copyButton.textContent = 'Select code to copy'; }
});
