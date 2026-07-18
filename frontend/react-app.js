import React, { useMemo, useState } from 'https://esm.sh/react@19.1.1';
import { createRoot } from 'https://esm.sh/react-dom@19.1.1/client';

const h = React.createElement;
const LANGUAGES = ['Python', 'JavaScript', 'Java', 'C++'];
const comments = { Python: '# WRITE / PASTE YOUR PYTHON CODE HERE', JavaScript: '// WRITE / PASTE YOUR JAVASCRIPT CODE HERE', Java: '// WRITE / PASTE YOUR JAVA CODE HERE', 'C++': '// WRITE / PASTE YOUR C++ CODE HERE' };

function Icon({ children }) { return h('span', { className: 'icon', 'aria-hidden': 'true' }, children); }

function App() {
  const [language, setLanguage] = useState('Python');
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [dark, setDark] = useState(false);
  const lines = useMemo(() => Math.max(1, code.split(/\r?\n/).length), [code]);

  async function improve() {
    if (!code.trim()) { setError('Paste some code first, then try again.'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const response = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ input: code, language }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not analyze this code.');
      setResult(data);
    } catch (issue) { setError(issue.message); }
    finally { setLoading(false); }
  }

  async function copyCode() {
    if (!result?.productionCode) return;
    await navigator.clipboard.writeText(result.productionCode);
    setError('Copied the production-ready code.');
  }

  return h('div', { className: dark ? 'app dark' : 'app' },
    h('header', { className: 'topbar' },
      h('a', { className: 'logo', href: '/' }, h('span', null, 'Bug'), h('strong', null, 'Free')),
      h('div', { className: 'top-actions' }, h('span', { className: 'secure-note' }, h(Icon, null, '●'), ' Works locally — no API key'), h('button', { className: 'theme-button', onClick: () => setDark(!dark), type: 'button' }, dark ? 'Light mode' : 'Dark mode'))
    ),
    h('main', { className: 'shell' },
      h('section', { className: 'hero' }, h('p', { className: 'eyebrow' }, 'LOCAL PRODUCTION CODE REVIEW'), h('h1', null, 'Turn working code into ', h('em', null, 'stronger code.')), h('p', null, 'Paste your code. BugFree checks known mistakes locally, explains safe fixes, and never asks for an API key.')),
      h('section', { className: 'workbench' },
        h('section', { className: 'editor-panel' },
          h('div', { className: 'panel-head' }, h('div', null, h('span', { className: 'step' }, '01'), h('h2', null, 'Your code')), h('label', { className: 'language-picker' }, 'Language', h('select', { value: language, onChange: event => setLanguage(event.target.value) }, LANGUAGES.map(item => h('option', { key: item }, item))))),
          h('div', { className: 'code-shell' }, h('div', { className: 'line-numbers' }, Array.from({ length: lines }, (_, i) => h('span', { key: i }, i + 1))), h('textarea', { value: code, onChange: event => setCode(event.target.value), spellCheck: 'false', placeholder: comments[language], 'aria-label': `Paste ${language} code` })),
          h('div', { className: 'editor-footer' }, h('span', null, `${code.length.toLocaleString()} characters`), h('button', { type: 'button', className: 'clear', onClick: () => { setCode(''); setResult(null); } }, 'Clear code')),
          h('button', { className: 'improve-button', onClick: improve, disabled: loading, type: 'button' }, loading ? 'Reviewing your code...' : h(React.Fragment, null, 'Review and improve my code ', h('span', null, '→'))),
          h('p', { className: 'shortcut' }, 'Runs locally. No API key required. Ctrl + Enter to run.')
        ),
        h('section', { className: 'result-panel', 'aria-live': 'polite' },
          !result && !loading && h('div', { className: 'empty-result' }, h('div', { className: 'empty-icon' }, '< >'), h('h2', null, 'Your improved code will appear here'), h('p', null, 'BugFree checks local, language-specific mistakes in your code—no account or API key needed.'), h('div', { className: 'result-pills' }, h('span', null, 'Local checks'), h('span', null, 'Security patterns'), h('span', null, 'Test ideas')),
          loading && h('div', { className: 'loading-result' }, h('div', { className: 'loader' }), h('h2', null, 'Reviewing your code'), h('p', null, 'Checking logic, security, and production practices...')),
          result && h(ResultView, { result, copyCode })
        )
      ),
      error && h('div', { className: error.startsWith('Copied') ? 'toast success' : 'toast' }, h('button', { type: 'button', onClick: () => setError(''), 'aria-label': 'Close message' }, '×'), error),
      h('section', { className: 'trust-row' }, h('div', null, h('b', null, 'One clear result'), h('span', null, 'A complete rewrite first, explanations second.')), h('div', null, h('b', null, 'No pretend certainty'), h('span', null, 'AI flags assumptions instead of inventing requirements.')), h('div', null, h('b', null, 'Four focused languages'), h('span', null, 'C++, Python, Java, and JavaScript.'))
    )
  );
}

function ResultView({ result, copyCode }) {
  const readiness = result.readiness || {};
  return h(React.Fragment, null,
    h('div', { className: 'result-title' }, h('div', null, h('span', { className: 'step' }, '02'), h('p', null, 'YOUR SAFER VERSION'), h('h2', null, "Here's your safer, modernized code — based on local checks.")), h('span', { className: `severity ${String(result.severity || 'Low').toLowerCase()}` }, `${result.severity || 'Low'} risk`)),
    h('p', { className: 'summary' }, result.summary),
    h('section', { className: 'rewritten-code' }, h('div', { className: 'code-head' }, h('span', null, 'IMPROVED CODE'), h('button', { type: 'button', onClick: copyCode }, 'Copy code')), h('pre', null, h('code', null, result.productionCode || 'No safe rewrite was returned.'))),
    h('section', { className: 'readiness' }, h('h3', null, 'Production readiness'), h('div', { className: 'readiness-grid' }, h('article', null, h('span', null, 'SECURITY'), h('p', null, readiness.security || 'Review required.')), h('article', null, h('span', null, 'RELIABILITY'), h('p', null, readiness.reliability || 'Review required.')), h('article', null, h('span', null, 'SCALE'), h('p', null, readiness.scalability || 'Review required.')))),
    h('section', { className: 'changes' }, h('h3', null, 'What BugFree changed and why'), ...(result.changes || []).map((change, index) => h('article', { key: index }, h('b', null, String(index + 1).padStart(2, '0')), h('div', null, h('h4', null, change.title), h('p', null, change.reason))))),
    h('section', { className: 'tests' }, h('h3', null, 'Tests to run'), ...(result.tests || []).map((test, index) => h('article', { key: index }, h('b', null, test.name), h('span', null, test.purpose))))
  );
}

createRoot(document.getElementById('root')).render(h(App));
