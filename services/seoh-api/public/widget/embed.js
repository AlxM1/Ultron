(function() {
  'use strict';

  // Config from script tag or container div
  var script = document.currentScript;
  var container = document.getElementById('seoh-widget');
  var cfg = {
    api: (script && script.getAttribute('data-api')) || (container && container.getAttribute('data-api')) || 'https://api.seoh.ca',
    theme: (script && script.getAttribute('data-theme')) || (container && container.getAttribute('data-theme')) || 'dark',
    report: (script && script.getAttribute('data-report-url')) || (container && container.getAttribute('data-report-url')) || 'https://seoh.ca'
  };

  // Remove trailing slash
  cfg.api = cfg.api.replace(/\/+$/, '');

  var DIMENSIONS = [
    { key: 'ai_citability', label: 'AI Citability', weight: '25%' },
    { key: 'schema_readiness', label: 'Schema Readiness', weight: '20%' },
    { key: 'eeat_signals', label: 'E-E-A-T Signals', weight: '20%' },
    { key: 'content_structure', label: 'Content Structure', weight: '15%' },
    { key: 'platform_visibility', label: 'Platform Visibility', weight: '20%' }
  ];

  function getColors(theme) {
    var dark = theme === 'dark';
    return {
      bg: dark ? '#0d1117' : '#ffffff',
      card: dark ? '#161b22' : '#f6f8fa',
      text: dark ? '#e6edf3' : '#1f2328',
      muted: dark ? '#8b949e' : '#656d76',
      accent: '#f0a500',
      accentDim: 'rgba(240,165,0,0.15)',
      border: dark ? '#30363d' : '#d0d7de',
      barBg: dark ? '#21262d' : '#e6e9ec',
      inputBg: dark ? '#0d1117' : '#ffffff',
      inputBorder: dark ? '#30363d' : '#d0d7de',
      success: '#3fb950',
      warning: '#d29922',
      danger: '#f85149'
    };
  }

  function scoreColor(score, c) {
    if (score >= 70) return c.success;
    if (score >= 40) return c.warning;
    return c.danger;
  }

  function createWidget() {
    var host = container || document.createElement('div');
    if (!container) {
      script.parentNode.insertBefore(host, script);
    }

    var shadow = host.attachShadow({ mode: 'open' });
    var c = getColors(cfg.theme);

    shadow.innerHTML = '<style>' +
      '*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }' +
      ':host { display: block; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }' +
      '.seoh-root { background: ' + c.bg + '; border: 1px solid ' + c.border + '; border-radius: 12px; padding: 24px; max-width: 480px; color: ' + c.text + '; }' +
      '.seoh-header { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }' +
      '.seoh-logo { font-size: 20px; font-weight: 700; color: ' + c.accent + '; letter-spacing: -0.5px; }' +
      '.seoh-logo span { color: ' + c.muted + '; font-weight: 400; font-size: 13px; margin-left: 6px; }' +
      '.seoh-form { display: flex; gap: 8px; margin-bottom: 4px; }' +
      '.seoh-input { flex: 1; padding: 10px 14px; border-radius: 8px; border: 1px solid ' + c.inputBorder + '; background: ' + c.inputBg + '; color: ' + c.text + '; font-size: 14px; outline: none; }' +
      '.seoh-input:focus { border-color: ' + c.accent + '; }' +
      '.seoh-btn { padding: 10px 20px; border-radius: 8px; border: none; background: ' + c.accent + '; color: #000; font-weight: 600; font-size: 14px; cursor: pointer; white-space: nowrap; }' +
      '.seoh-btn:hover { opacity: 0.9; }' +
      '.seoh-btn:disabled { opacity: 0.5; cursor: not-allowed; }' +
      '.seoh-error { color: ' + c.danger + '; font-size: 13px; margin-top: 8px; }' +
      '.seoh-status { color: ' + c.muted + '; font-size: 13px; margin-top: 8px; }' +
      '.seoh-results { margin-top: 20px; }' +
      '.seoh-score-row { display: flex; align-items: center; gap: 20px; margin-bottom: 20px; }' +
      '.seoh-ring { position: relative; width: 90px; height: 90px; flex-shrink: 0; }' +
      '.seoh-ring svg { width: 90px; height: 90px; transform: rotate(-90deg); }' +
      '.seoh-ring-bg { fill: none; stroke: ' + c.barBg + '; stroke-width: 8; }' +
      '.seoh-ring-fg { fill: none; stroke-width: 8; stroke-linecap: round; transition: stroke-dashoffset 0.8s ease; }' +
      '.seoh-ring-text { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 24px; font-weight: 700; }' +
      '.seoh-ring-label { font-size: 11px; color: ' + c.muted + '; text-align: center; margin-top: 4px; }' +
      '.seoh-dims { flex: 1; display: flex; flex-direction: column; gap: 10px; }' +
      '.seoh-dim-label { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 3px; }' +
      '.seoh-dim-name { color: ' + c.text + '; }' +
      '.seoh-dim-score { font-weight: 600; }' +
      '.seoh-bar { height: 6px; border-radius: 3px; background: ' + c.barBg + '; overflow: hidden; }' +
      '.seoh-bar-fill { height: 100%; border-radius: 3px; transition: width 0.6s ease; }' +
      '.seoh-issues { margin-top: 16px; }' +
      '.seoh-issues-title { font-size: 13px; font-weight: 600; color: ' + c.muted + '; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }' +
      '.seoh-issue { font-size: 13px; color: ' + c.text + '; padding: 6px 0; border-bottom: 1px solid ' + c.border + '; }' +
      '.seoh-issue:last-child { border-bottom: none; }' +
      '.seoh-cta { display: block; text-align: center; margin-top: 16px; padding: 10px; border-radius: 8px; background: ' + c.accentDim + '; color: ' + c.accent + '; text-decoration: none; font-weight: 600; font-size: 14px; }' +
      '.seoh-cta:hover { background: ' + c.accent + '; color: #000; }' +
      '.seoh-powered { text-align: center; margin-top: 12px; font-size: 11px; color: ' + c.muted + '; }' +
      '.seoh-powered a { color: ' + c.accent + '; text-decoration: none; }' +
    '</style>' +
    '<div class="seoh-root">' +
      '<div class="seoh-header"><div class="seoh-logo">SEO<span style="color:' + c.accent + '">h</span> <span>GEO Audit</span></div></div>' +
      '<form class="seoh-form">' +
        '<input class="seoh-input" type="url" placeholder="https://example.com" required />' +
        '<button class="seoh-btn" type="submit">Analyze</button>' +
      '</form>' +
      '<div class="seoh-msg"></div>' +
      '<div class="seoh-results" style="display:none"></div>' +
      '<div class="seoh-powered">Powered by <a href="https://seoh.ca" target="_blank">SEOh</a></div>' +
    '</div>';

    var form = shadow.querySelector('.seoh-form');
    var input = shadow.querySelector('.seoh-input');
    var btn = shadow.querySelector('.seoh-btn');
    var msg = shadow.querySelector('.seoh-msg');
    var results = shadow.querySelector('.seoh-results');

    form.addEventListener('submit', function(e) {
      e.preventDefault();
      var url = input.value.trim();
      if (!url) return;

      btn.disabled = true;
      btn.textContent = 'Analyzing...';
      msg.className = 'seoh-status';
      msg.textContent = 'Scanning and scoring — this may take 15-30 seconds...';
      results.style.display = 'none';

      fetch(cfg.api + '/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url })
      })
      .then(function(r) {
        if (!r.ok) return r.json().then(function(d) { throw new Error(d.error || 'Audit failed'); });
        return r.json();
      })
      .then(function(data) {
        msg.textContent = '';
        renderResults(data, results, c);
        results.style.display = 'block';
      })
      .catch(function(err) {
        msg.className = 'seoh-error';
        msg.textContent = err.message || 'Something went wrong';
      })
      .finally(function() {
        btn.disabled = false;
        btn.textContent = 'Analyze';
      });
    });
  }

  function renderResults(data, el, c) {
    var score = data.overall_score || 0;
    var dims = data.dimensions || {};
    var recs = data.recommendations || [];
    var circumference = 2 * Math.PI * 38;
    var offset = circumference - (score / 100) * circumference;
    var sc = scoreColor(score, c);

    var html = '<div class="seoh-score-row">' +
      '<div class="seoh-ring">' +
        '<svg viewBox="0 0 90 90">' +
          '<circle class="seoh-ring-bg" cx="45" cy="45" r="38" />' +
          '<circle class="seoh-ring-fg" cx="45" cy="45" r="38" stroke="' + sc + '" stroke-dasharray="' + circumference + '" stroke-dashoffset="' + offset + '" />' +
        '</svg>' +
        '<div class="seoh-ring-text" style="color:' + sc + '">' + score + '</div>' +
      '</div>' +
      '<div class="seoh-dims">';

    DIMENSIONS.forEach(function(d) {
      var dim = dims[d.key];
      var s = dim ? dim.score : 0;
      var dc = scoreColor(s, c);
      html += '<div>' +
        '<div class="seoh-dim-label"><span class="seoh-dim-name">' + d.label + '</span><span class="seoh-dim-score" style="color:' + dc + '">' + s + '</span></div>' +
        '<div class="seoh-bar"><div class="seoh-bar-fill" style="width:' + s + '%;background:' + dc + '"></div></div>' +
      '</div>';
    });

    html += '</div></div>';

    if (recs.length > 0) {
      html += '<div class="seoh-issues"><div class="seoh-issues-title">Top Issues</div>';
      recs.slice(0, 5).forEach(function(r) {
        html += '<div class="seoh-issue">' + r + '</div>';
      });
      html += '</div>';
    }

    html += '<a class="seoh-cta" href="' + cfg.report + '" target="_blank">Get Full Report →</a>';
    el.innerHTML = html;
  }

  // Init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createWidget);
  } else {
    createWidget();
  }
})();
