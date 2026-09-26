# Grexium (korone loader)

```js
// ==UserScript==
// @name         Grexium
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Grexium loader
// @author       @Menwx
// @match        https://www.pekora.zip/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @grant        GM_xmlhttpRequest
// @connect      raw.githubusercontent.com
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';
  GM_xmlhttpRequest({
    method: 'GET',
    url: 'https://raw.githubusercontent.com/Menwey/Grexium-Beta/refs/heads/main/grexium.js?t=' + Date.now(),
    headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
    onload(res) {
      if (res.status < 200 || res.status >= 300) {
        console.error('[Grexium] Failed to fetch source:', res.status);
        return;
      }
      try { eval(res.responseText); }
      catch (e) { console.error('[Grexium] Error running source:', e); }
    },
    onerror(err) { console.error('[Grexium] Network error loading source:', err); },
  });
})();
```

The loader pulls the latest source from this repo each time, so you always run the newest version.

## Notes

- Settings are stored locally via Tampermonkey (`GM_setValue`) and persist across sessions.
- Grexium is a community free project and is not affiliated with Pekora.

---

Made by **@Menwx** Based on Hexium by cardcounting
