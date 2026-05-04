const BACKEND_URL = 'https://factwise-backend.onrender.com';
const SUPABASE_URL = 'https://dnxzkzpolkmwlhaqnfyy.supabase.co/rest/v1/';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRueHprenBvbGttd2xoYXFuZnl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4NzU5MjIsImV4cCI6MjA5MzQ1MTkyMn0._2w-r8v0cLjxeHeYA71PQmg4sMulmlk6EMJymUNNF2c';


// ── Supabase Client ────────────────────────────────────────────────────────────
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Auth State ─────────────────────────────────────────────────────────────────
let currentUser = null;

async function initAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    currentUser = session.user;
    updateNavForUser(currentUser);
    if (window.location.pathname.includes('history.html')) {
      loadHistory();
    }
  } else {
    updateNavForGuest();
  }

  supabase.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user || null;
    if (currentUser) {
      updateNavForUser(currentUser);
    } else {
      updateNavForGuest();
    }
  });
}

// ── Nav Updates ────────────────────────────────────────────────────────────────
function updateNavForUser(user) {
  const navLinks = document.querySelector('.nav-links');
  if (!navLinks) return;
  navLinks.innerHTML = `
    <a href="index.html#how-it-works" class="nav-link">How it works</a>
    <a href="index.html#pricing" class="nav-link">Pricing</a>
    <a href="history.html" class="nav-link">My History</a>
    <span class="nav-email">${user.email}</span>
    <button class="btn-outline" onclick="signOut()">Sign out</button>
  `;
}

function updateNavForGuest() {
  const navLinks = document.querySelector('.nav-links');
  if (!navLinks) return;
  navLinks.innerHTML = `
    <a href="index.html#how-it-works" class="nav-link">How it works</a>
    <a href="index.html#pricing" class="nav-link">Pricing</a>
    <a href="login.html" class="nav-link">Log in</a>
    <button class="btn-primary" onclick="window.location.href='signup.html'">Sign up free</button>
  `;
}

// ── Sign Out ───────────────────────────────────────────────────────────────────
async function signOut() {
  await supabase.auth.signOut();
  currentUser = null;
  window.location.href = 'index.html';
}

// ── Character Counter ──────────────────────────────────────────────────────────
const inputText = document.getElementById('inputText');
const charCount = document.getElementById('charCount');

if (inputText) {
  inputText.addEventListener('input', () => {
    const count = inputText.value.length;
    charCount.textContent = count;
    charCount.style.color = count > 9000 ? '#ef4444' : count > 7000 ? '#f59e0b' : '#9090a8';
  });
}

// ── Scroll Helpers ─────────────────────────────────────────────────────────────
function scrollToChecker() {
  document.getElementById('checker').scrollIntoView({ behavior: 'smooth' });
  setTimeout(() => inputText.focus(), 600);
}

// ── Verify ─────────────────────────────────────────────────────────────────────
async function verifyText() {
  const text = inputText.value.trim();

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
      body: JSON.stringify({
        text,
        userId: currentUser?.id || null,
      }),
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

  const verdictCard = document.getElementById('verdictCard');
  verdictCard.className = `verdict-card verdict-${overall}`;

  const icons = { trusted: '✅', questionable: '⚠️', unreliable: '❌' };
  const labels = { trusted: 'Trusted', questionable: 'Questionable', unreliable: 'Unreliable' };

  document.getElementById('verdictIcon').textContent = icons[overall] || '🔍';
  document.getElementById('verdictValue').textContent = labels[overall] || overall;
  document.getElementById('verdictSummary').textContent = summary;

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

  document.getElementById('tipText').textContent = tip;

  const results = document.getElementById('results');
  results.classList.remove('hidden');
  results.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Show save prompt if not logged in
  if (!currentUser) {
    showSavePrompt();
  }
}

// ── Save Prompt for guests ─────────────────────────────────────────────────────
function showSavePrompt() {
  const existing = document.getElementById('savePrompt');
  if (existing) return;

  const prompt = document.createElement('div');
  prompt.id = 'savePrompt';
  prompt.className = 'save-prompt';
  prompt.innerHTML = `
    <p>🔒 <strong>Sign up free</strong> to save this result and access your verification history.</p>
    <button class="btn-primary" onclick="window.location.href='signup.html'">Save my results</button>
  `;
  document.getElementById('results').prepend(prompt);
}

// ── History ────────────────────────────────────────────────────────────────────
async function loadHistory() {
  if (!currentUser) {
    window.location.href = 'login.html';
    return;
  }

  const container = document.getElementById('historyList');
  if (!container) return;

  container.innerHTML = '<p class="loading-text">Loading your history...</p>';

  try {
    const response = await fetch(`${BACKEND_URL}/api/history/${currentUser.id}`);
    const data = await response.json();

    if (!data.success || data.history.length === 0) {
      container.innerHTML = '<p class="empty-text">No verifications yet. Go check some text!</p>';
      return;
    }

    container.innerHTML = '';
    data.history.forEach(item => {
      const date = new Date(item.created_at).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric'
      });
      const icons = { trusted: '✅', questionable: '⚠️', unreliable: '❌' };
      const card = document.createElement('div');
      card.className = 'history-card';
      card.innerHTML = `
        <div class="history-top">
          <span class="history-verdict verdict-${item.overall}">${icons[item.overall]} ${item.overall}</span>
          <span class="history-date">${date}</span>
        </div>
        <p class="history-text">${escapeHTML(item.input_text.substring(0, 120))}...</p>
        <p class="history-summary">${escapeHTML(item.summary)}</p>
      `;
      container.appendChild(card);
    });

  } catch (err) {
    container.innerHTML = '<p class="empty-text">Could not load history. Please try again.</p>';
  }
}

// ── Reset ──────────────────────────────────────────────────────────────────────
function resetChecker() {
  inputText.value = '';
  charCount.textContent = '0';
  charCount.style.color = '#9090a8';
  hideResults();
  hideError();
  const savePrompt = document.getElementById('savePrompt');
  if (savePrompt) savePrompt.remove();
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

function escapeHTML(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

// ── Keyboard shortcut ──────────────────────────────────────────────────────────
if (inputText) {
  inputText.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') verifyText();
  });
}

// ── Auth Forms ─────────────────────────────────────────────────────────────────
async function handleSignup() {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const errorEl = document.getElementById('authError');
  const btn = document.getElementById('authBtn');

  if (!email || !password) {
    errorEl.textContent = 'Please fill in all fields.';
    return;
  }

  if (password.length < 6) {
    errorEl.textContent = 'Password must be at least 6 characters.';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Creating account...';

  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    errorEl.textContent = error.message;
    btn.disabled = false;
    btn.textContent = 'Create account';
  } else {
    document.getElementById('authForm').classList.add('hidden');
    document.getElementById('authSuccess').classList.remove('hidden');
  }
}

async function handleLogin() {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const errorEl = document.getElementById('authError');
  const btn = document.getElementById('authBtn');

  if (!email || !password) {
    errorEl.textContent = 'Please fill in all fields.';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Logging in...';

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    errorEl.textContent = error.message;
    btn.disabled = false;
    btn.textContent = 'Log in';
  } else {
    window.location.href = 'index.html';
  }
}

// ── Init ───────────────────────────────────────────────────────────────────────
initAuth();

// ── Expose functions to global scope ──────────────────────────────────────────
window.scrollToChecker = scrollToChecker;
window.verifyText = verifyText;
window.resetChecker = resetChecker;
window.signOut = signOut;
window.handleSignup = handleSignup;
window.handleLogin = handleLogin;
window.loadHistory = loadHistory;
