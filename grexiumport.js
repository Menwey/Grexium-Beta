// Grexium loader (served as grexiumport.js for old loaders)
(function () {
  'use strict';

  const REPO = 'https://raw.githubusercontent.com/Menwey/Grexium-Beta/main/';
  const CORE = 'grexiumcore.js';
  const CACHE_KEY = 'grexium_core_cache';
  const CACHE_VER_KEY = 'grexium_core_version';

  if (/^\/admin/i.test(location.pathname)) return;

  const log = (...a) => console.log('[Grexium]', ...a);

  const getText = (url) => new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: 'GET',
      url: url + '?t=' + Date.now(),
      headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
      timeout: 15000,
      onload: (r) => (r.status >= 200 && r.status < 300 && r.responseText)
        ? resolve(r.responseText)
        : reject(new Error('HTTP ' + r.status)),
      onerror: () => reject(new Error('network error')),
      ontimeout: () => reject(new Error('timeout')),
    });
  });

  const versionOf = (src) => {
    const m = src.match(/@version\s+([^\s]+)/);
    return m ? m[1] : 'unknown';
  };

  const run = (src) => { eval(src); };

  const start = async () => {
    const cached = GM_getValue(CACHE_KEY, '');
    if (cached) {
      try { run(cached); log('started cached v' + GM_getValue(CACHE_VER_KEY, '?')); }
      catch (e) { log('cache run error:', e); }
    }

    try {
      const src = await getText(REPO + CORE);
      if (src.length < 1000) throw new Error('core file too short');
      const ver = versionOf(src);
      const prev = GM_getValue(CACHE_VER_KEY, '');
      GM_setValue(CACHE_KEY, src);
      GM_setValue(CACHE_VER_KEY, ver);

      if (!cached) {
        run(src);
        log('started v' + ver);
      } else if (prev !== ver) {
        log('updated v' + prev + ' -> v' + ver + ', reload the page to apply');
      } else {
        log('up to date v' + ver);
      }
    } catch (e) {
      log('could not load core:', e.message);
    }
  };

  start();
})();
