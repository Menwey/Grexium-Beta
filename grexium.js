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
// @grant        unsafeWindow
// @connect      raw.githubusercontent.com
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';


    unsafeWindow.__GM_getValue  = GM_getValue;
    unsafeWindow.__GM_setValue  = GM_setValue;
    unsafeWindow.__GM_deleteValue = GM_deleteValue;
    unsafeWindow.__GM_listValues  = GM_listValues;
    unsafeWindow.__GM_xmlhttpRequest = GM_xmlhttpRequest;

    
    const shim = document.createElement('script');
    shim.textContent = `
        window.GM_getValue  = window.__GM_getValue;
        window.GM_setValue  = window.__GM_setValue;
        window.GM_deleteValue = window.__GM_deleteValue;
        window.GM_listValues  = window.__GM_listValues;
        window.GM_xmlhttpRequest = window.__GM_xmlhttpRequest;
    `;
    (document.head || document.documentElement).appendChild(shim);
    shim.remove();

    GM_xmlhttpRequest({
        method: 'GET',
        url: 'https://raw.githubusercontent.com/Menwey/Grexium-Beta/refs/heads/main/grexiumbeta.js?t=' + Date.now(),
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
        onload(res) {
            if (res.status < 200 || res.status >= 300) {
                console.error('[Grexium] Failed to fetch source:', res.status);
                return;
            }
            try {
                const script = document.createElement('script');
                script.textContent = res.responseText;
                (document.head || document.documentElement).appendChild(script);
                script.remove();
            } catch (e) {
                console.error('[Grexium] Error injecting source:', e);
            }
        },
        onerror(err) { console.error('[Grexium] Network error loading source:', err); },
    });
})();
