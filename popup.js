// Ethan Shield — Popup Script
// Ethan Software © 2024

'use strict';

// ── Utility ──────────────────────────────────────────────────────────────────

function $(id) { return document.getElementById(id); }

function fmt(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n || 0);
}

function animateCount(el, target) {
  const start = parseInt(el.textContent.replace(/[KM]/, '')) || 0;
  const end = target;
  const duration = 400;
  const startTime = performance.now();

  function step(now) {
    const p = Math.min((now - startTime) / duration, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt(Math.round(start + (end - start) * ease));
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function showToast(msg, duration = 2200) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), duration);
}

// ── Tabs ─────────────────────────────────────────────────────────────────────

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    $(`tab-${tab.dataset.tab}`).classList.add('active');
  });
});

// ── Load Stats ────────────────────────────────────────────────────────────────

function loadStats() {
  chrome.runtime.sendMessage({ type: 'GET_STATS' }, (res) => {
    if (!res) return;
    const s = res.stats || {};
    animateCount($('statAds'), s.adsBlocked || 0);
    animateCount($('statTrackers'), s.trackersBlocked || 0);
    animateCount($('statFingerprint'), s.fingerprintAttempts || 0);
    animateCount($('statCookies'), s.cookiesCleared || 0);

    const settings = res.settings || {};
    document.querySelectorAll('input[data-setting]').forEach(input => {
      const key = input.dataset.setting;
      if (key in settings) {
        input.checked = settings[key] !== false;
      }
    });
  });
}

// ── Current Tab Info ──────────────────────────────────────────────────────────

function loadTabInfo() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || !tabs[0]) return;
    const tab = tabs[0];
    try {
      const url = new URL(tab.url);
      const domain = url.hostname.replace(/^www\./, '');
      $('currentDomain').textContent = domain || tab.url;

      // Load cookie count for footprint panel
      chrome.cookies.getAll({ domain }, (cookies) => {
        const count = cookies ? cookies.length : 0;
        const fpEl = $('fpCookieCount');
        if (fpEl) {
          fpEl.textContent = count === 0 ? '0 found' : `${count} found`;
          fpEl.className = 'footprint-value ' + (count > 5 ? 'warn' : count > 0 ? '' : 'safe');
        }
        $('siteBlockCount') && ($('siteBlockCount').textContent = count > 0 ? `${count} cookie${count !== 1 ? 's' : ''}` : '');
      });
    } catch (e) {
      $('currentDomain').textContent = 'Internal page';
    }
  });
}

// ── Toggles ───────────────────────────────────────────────────────────────────

document.querySelectorAll('input[data-setting]').forEach(input => {
  input.addEventListener('change', () => {
    chrome.runtime.sendMessage({
      type: 'UPDATE_SETTING',
      key: input.dataset.setting,
      value: input.checked
    }, () => {
      showToast(input.checked ? 'Protection enabled' : 'Protection paused');
    });
  });
});

// ── Buttons ───────────────────────────────────────────────────────────────────

$('btnClearCookies').addEventListener('click', () => {
  $('btnClearCookies').disabled = true;
  chrome.runtime.sendMessage({ type: 'CLEAR_COOKIES_NOW' }, (res) => {
    $('btnClearCookies').disabled = false;
    const n = res?.cleared || 0;
    showToast(n > 0 ? `${n} cookie${n !== 1 ? 's' : ''} cleared` : 'No cookies found');
    loadStats();
    loadTabInfo();
  });
});

$('btnClearAll').addEventListener('click', () => {
  if (!confirm('This will clear all cookies, localStorage, cache, and service workers across all sites. Continue?')) return;
  $('btnClearAll').disabled = true;
  chrome.runtime.sendMessage({ type: 'CLEAR_ALL_BROWSING' }, () => {
    $('btnClearAll').disabled = false;
    showToast('Browsing data wiped');
    loadStats();
    loadTabInfo();
  });
});

$('btnResetStats').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'RESET_STATS' }, () => {
    loadStats();
    showToast('Session stats reset');
  });
});

// Pause on this site
let isPaused = false;
$('btnPauseAll').addEventListener('click', () => {
  isPaused = !isPaused;
  const pill = $('statusPill');
  const statusText = $('statusText');
  const pauseLabel = $('pauseLabel');

  if (isPaused) {
    pill.className = 'status-pill inactive';
    statusText.textContent = 'Paused';
    pauseLabel.textContent = 'Resume on This Site';
    showToast('Shield paused for this site');
  } else {
    pill.className = 'status-pill active';
    statusText.textContent = 'Active';
    pauseLabel.textContent = 'Pause on This Site';
    showToast('Shield reactivated');
  }
});

// Footprint scan
$('btnScanFootprint').addEventListener('click', () => {
  $('btnScanFootprint').disabled = true;
  $('btnScanFootprint').textContent = 'Scanning...';

  setTimeout(() => {
    // Update exposure indicators based on current settings
    chrome.runtime.sendMessage({ type: 'GET_STATS' }, (res) => {
      const settings = res?.settings || {};

      $('fpWebRTC').textContent = settings.blockWebRTC !== false ? 'Blocked' : 'Exposed';
      $('fpWebRTC').className = 'footprint-value ' + (settings.blockWebRTC !== false ? 'safe' : 'warn');

      $('fpCanvas').textContent = settings.blockCanvasFingerprint !== false ? 'Noised' : 'Exposed';
      $('fpCanvas').className = 'footprint-value ' + (settings.blockCanvasFingerprint !== false ? 'safe' : 'warn');

      $('fpFont').textContent = settings.blockFontFingerprint !== false ? 'Masked' : 'Exposed';
      $('fpFont').className = 'footprint-value ' + (settings.blockFontFingerprint !== false ? 'safe' : 'warn');

      $('fpNavigator').textContent = settings.blockFingerprint !== false ? 'Normalized' : 'Exposed';
      $('fpNavigator').className = 'footprint-value ' + (settings.blockFingerprint !== false ? 'safe' : 'warn');

      $('fpAudio').textContent = settings.blockFingerprint !== false ? 'Blocked' : 'Exposed';
      $('fpAudio').className = 'footprint-value ' + (settings.blockFingerprint !== false ? 'safe' : 'warn');

      $('btnScanFootprint').disabled = false;
      $('btnScanFootprint').innerHTML = `
        <svg viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg" width="13" height="13">
          <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" stroke-width="1.5"/>
          <path d="M9 9l2.5 2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        Scan Current Site
      `;
      showToast('Footprint scan complete');
    });
  }, 900);
});

// ── Init ──────────────────────────────────────────────────────────────────────

loadStats();
loadTabInfo();

// Refresh stats every 3 seconds while popup is open
setInterval(loadStats, 3000);
