const BACKEND_URL = 'http://localhost:5000';

// ── Character Counter ──────────────────────────────────────────────────────────
const inputText = document.getElementById('inputText');
const charCount = document.getElementById('charCount');

inputText.addEventListener('input', () => {
  const count = inputText.value.length;
  charCount.textContent = count;
  charCount.style.color = count > 9000 ? '#ef4444' : count > 7000 ? '#f59e0b' : '#9090a8';
});

// ── Scroll Helpers ─────────────────────────────────────────────────────────────
function scrollToChecker() {
  document.getElementById('checker').scrollIntoView({ behavior: 'smooth' });
  setTimeout(() => inputText.focus(), 600);
}

// ── Verify ─────────────────────────────────────────────────────────────────────
async function verifyText() {
  const text = inputText.value.trim();

  // Client side validation
  if (text.length < 10) {
    showError('Please paste at least a sentence to verify.');
    return;
  }

  if (text.length > 10000) {
    showError('Text is too long. Please keep it under 10,000 characters.');
    return;
  }

  setLoading(true);
  hideError();
  hideResults();

  try {
    const response = await fetch(`${BACKEND_URL}/api/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    const data = await response.json();

    if (!response.ok) {
      showError(data.error || 'Something went wrong. Please try again.');
      return;
    }

    if (data.success && data.result) {
      renderResults(data.result);
    } else {
      showError('Could not process the result. Please try again.');
    }

  } catch (err) {
    showError('Could not connect to Factwise. Please check your connection and try again.');
  } finally {
    setLoading(false);
  }
}

// ── Render Results ─────────────────────────────────────────────────────────────
function renderResults(result) {
  const { overall, summary, claims, tip } = result;

  // Verdict card
  const verdictCard = document.getElementById('verdictCard');
  verdictCard.className = `verdict-card verdict-${overall}`;

  const icons = { trusted: '✅', questionable: '⚠️', unreliable: '❌' };
  const labels = { trusted: 'Trusted', questionable: 'Questionable', unreliable: 'Unreliable' };

  document.getElementById('verdictIcon').textContent = icons[overall] || '🔍';
  document.getElementById('verdictValue').textContent = labels[overall] || overall;
  document.getElementById('verdictSummary').textContent = summary;

  // Claims
  const claimsList = document.getElementById('claimsList');
  claimsList.innerHTML = '';

  claims.forEach(claim => {
    const statusLabels = { verified: 'Verified', questionable: 'Questionable', incorrect: 'Incorrect' };

    const item = document.createElement('div');
    item.className = `claim-item ${claim.status}`;
    item.innerHTML = `
      <div class="claim-top">
        <span class="claim-badge">${statusLabels[claim.status] || claim.status}</span>
        <p class="claim-text">${escapeHTML(claim.claim)}</p>
      </div>
      <p class="claim-explanation">${escapeHTML(claim.explanation)}</p>
    `;
    claimsList.appendChild(item);
  });

  // Tip
  document.getElementById('tipText').textContent = tip;

  // Show results
  const results = document.getElementById('results');
  results.classList.remove('hidden');
  results.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Reset ──────────────────────────────────────────────────────────────────────
function resetChecker() {
  inputText.value = '';
  charCount.textContent = '0';
  charCount.style.color = '#9090a8';
  hideResults();
  hideError();
  document.getElementById('checker').scrollIntoView({ behavior: 'smooth' });
  setTimeout(() => inputText.focus(), 600);
}

// ── UI Helpers ─────────────────────────────────────────────────────────────────
function setLoading(state) {
  const btn = document.getElementById('verifyBtn');
  const btnText = document.getElementById('btnText');
  const btnLoader = document.getElementById('btnLoader');

  btn.disabled = state;
  btnText.textContent = state ? 'Verifying...' : 'Verify Text';
  btnLoader.classList.toggle('hidden', !state);
}

function showError(message) {
  const errorBox = document.getElementById('errorBox');
  const errorText = document.getElementById('errorText');
  errorText.textContent = message;
  errorBox.classList.remove('hidden');
  errorBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideError() {
  document.getElementById('errorBox').classList.add('hidden');
}

function hideResults() {
  document.getElementById('results').classList.add('hidden');
}

// ── Security: Escape HTML to prevent XSS in rendered results ──────────────────
function escapeHTML(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

// ── Keyboard shortcut: Ctrl+Enter to verify ───────────────────────────────────
inputText.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'Enter') verifyText();
});
