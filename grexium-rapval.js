// ==UserScript==
// @name         Grexium RAP & Value
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  grexium jopa
// @author       @Menwx
// @homepage     https://github.com/Menwey/Grexium-Beta
// @updateURL    https://raw.githubusercontent.com/Menwey/Grexium-Beta/refs/heads/main/grexium-rapval.js
// @downloadURL  https://raw.githubusercontent.com/Menwey/Grexium-Beta/refs/heads/main/grexium-rapval.js
// @match        https://www.pekora.zip/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      www.koromons.net
// @connect      raw.githubusercontent.com
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    // ── Values source ────────────────────────────────────────────────────────
    const VALUES_URL = 'https://www.koromons.net/items.json';
    const FALLBACK_URL = 'https://raw.githubusercontent.com/unitedbygrief/koronevalues/main/valu.json';

    let NAME_VALUE_MAP = new Map();
    let FETCHED = false;
    let _loadPromise = null;

    function cleanName(name) {
        if (!name) return '';
        return String(name)
            .replace(/[\u200B-\u200F\uFEFF]/g, '')
            .replace(/[^a-zA-Z0-9 ]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
    }

    function fetchJson(url) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET', url,
                headers: { Accept: 'application/json' },
                onload(r) {
                    try { resolve(JSON.parse(r.responseText)); }
                    catch (e) { reject(e); }
                },
                onerror: reject,
            });
        });
    }

    function loadValues() {
        if (FETCHED) return _loadPromise;
        FETCHED = true;
        _loadPromise = (async () => {
            let data = [];
            try { data = await fetchJson(VALUES_URL); }
            catch { try { data = await fetchJson(FALLBACK_URL); } catch { data = []; } }
            NAME_VALUE_MAP = new Map();
            for (const it of (Array.isArray(data) ? data : [])) {
                const n = (it.Name || it.name || '').toString();
                if (!n) continue;
                const v = Number(it.Value ?? it.value ?? 0);
                NAME_VALUE_MAP.set(cleanName(n), isFinite(v) ? v : 0);
            }
        })();
        return _loadPromise;
    }

    function lookupValue(rawName) {
        if (!rawName) return undefined;
        const c = cleanName(rawName);
        if (NAME_VALUE_MAP.has(c)) return NAME_VALUE_MAP.get(c);
        const stripped = cleanName(rawName.replace(/\(.*?\)|\[.*?\]|\{.*?\}/g, ''));
        return NAME_VALUE_MAP.get(stripped);
    }

    function fmt(n) { return Math.round(n).toLocaleString(); }

    // ── Shared styles ────────────────────────────────────────────────────────
    function injectBaseStyle() {
        if (document.getElementById('grv-style')) return;
        const s = document.createElement('style');
        s.id = 'grv-style';
        s.textContent = `
            .grv-pill{height:28px;display:inline-flex;align-items:center;padding:0 10px;font-size:13px;font-weight:700;white-space:nowrap;gap:4px;}
            .grv-val{color:#00b3ff;font-size:12px;font-weight:700;display:inline-flex;align-items:center;gap:3px;margin-top:2px;}
            .grv-total{color:#00b3ff;font-weight:700;font-size:13px;margin-top:4px;}
        `;
        document.head.appendChild(s);
    }

    function makePill(label, diff, pct) {
        const gain = diff >= 0;
        const col  = gain ? 'rgb(43,191,90)' : 'rgb(215,32,32)';
        const sign = diff >= 0 ? '+' : '-';
        const arrowPath = gain
            ? 'M9 4h6v8h4.84L12 19.84L4.16 12H9V4Z'
            : 'M15 20H9v-8H4.16L12 4.16L19.84 12H15v8Z';
        return `<div class="grv-pill" style="background:rgba(30,30,40,0.9);border:1px solid rgba(255,255,255,0.1);border-radius:6px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" style="color:${col};flex:none;">
                <g transform="translate(0 24) scale(1 -1)"><path fill="currentColor" d="${arrowPath}"/></g>
            </svg>
            <span style="color:#fff;">${sign}${fmt(Math.abs(diff))} ${label} (${sign}${Math.abs(pct).toFixed(0)}%)</span>
        </div>`;
    }

    const ROLIMONS_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1094 1466.2" style="width:14px;height:14px;flex-shrink:0;"><path fill="#0084dd" d="M1094 521.6 0 0v469.5l141-67.4 250 119.2L0 707.8v369.7l815.6 388.7L315 893l779-371.4z"/></svg>`;

    // ── Trades page (/trades) ─────────────────────────────────────────────────
    function runTrades() {
        if (!/^\/trades/i.test(location.pathname)) return;

        // Inject per-item value under RAP in trade detail sections
        document.querySelectorAll('[class*="section-0-2-"]').forEach(section => {
            const nameEls = section.querySelectorAll('[class*="itemName"]');
            let sectionVal = 0, sectionRap = 0;

            nameEls.forEach(nameEl => {
                const name = (nameEl.textContent || '').trim();
                if (!name) return;
                const card = nameEl.closest('[class*="itemCard"]') || nameEl.parentElement;
                const rapEl = card?.querySelector('[class*="valueCurrencyLabel"]:not(.grv-item-val *),[class*="priceLabel"]:not(.grv-item-val *)');
                const rap = parseInt((rapEl?.textContent || '').replace(/\D/g, '')) || 0;
                sectionRap += rap;
                const val = lookupValue(name);
                const display = (typeof val === 'number' && val > 0) ? val : rap;
                sectionVal += display;

                const itemValEl = card?.querySelector('[class*="itemValue"]');
                if (itemValEl && !card._grvDone) {
                    card._grvDone = true;
                    const row = document.createElement('div');
                    row.className = 'grv-val';
                    row.innerHTML = `${ROLIMONS_SVG}<span>${display.toLocaleString()}</span>`;
                    itemValEl.appendChild(row);
                }
            });

            // Section total
            const totalRow = section.querySelector('[class*="totalRow"]');
            const totalVal = totalRow?.querySelector('[class*="totalValue"]');
            if (totalVal && !totalRow._grvDone) {
                totalRow._grvDone = true;
                const tot = document.createElement('div');
                tot.className = 'grv-val';
                tot.style.cssText = 'font-size:13px;font-weight:700;justify-content:flex-end;';
                tot.innerHTML = `${ROLIMONS_SVG}<span>${sectionVal.toLocaleString()}</span>`;
                totalVal.appendChild(tot);
            }
        });

        // Win/loss pills between sections
        const sections = [...document.querySelectorAll('[class*="section-0-2-"]')]
            .filter(s => !s.closest('[data-pekora-hidden]'));
        if (sections.length >= 2) {
            const getTotal = (sec) => {
                let val = 0, rap = 0;
                sec.querySelectorAll('[class*="itemName"]').forEach(el => {
                    const name = (el.textContent || '').trim();
                    const card = el.closest('[class*="itemCard"]') || el.parentElement;
                    const rapEl = card?.querySelector('[class*="valueCurrencyLabel"],[class*="priceLabel"]');
                    const r = parseInt((rapEl?.textContent || '').replace(/\D/g, '')) || 0;
                    const v = lookupValue(name);
                    rap += r;
                    val += (typeof v === 'number' && v > 0) ? v : r;
                });
                return { val, rap };
            };

            const give    = getTotal(sections[0]);
            const receive = getTotal(sections[1]);
            const rapDiff = receive.rap - give.rap;
            const valDiff = receive.val - give.val;
            const rapPct  = give.rap > 0 ? (rapDiff / give.rap) * 100 : 0;
            const valPct  = give.val > 0 ? (valDiff / give.val) * 100 : 0;

            let bar = document.getElementById('grv-diff-bar');
            if (!bar) {
                bar = document.createElement('div');
                bar.id = 'grv-diff-bar';
                bar.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;justify-content:center;padding:6px 0;';
                sections[0].insertAdjacentElement('afterend', bar);
            }
            bar.innerHTML = makePill('RAP', rapDiff, rapPct) + makePill('Value', valDiff, valPct);
        }

        // Row indicators in trade list
        document.querySelectorAll('[class*="tradeRow-0-2-"]').forEach(row => {
            if (row.querySelector('.grv-row-pill') || row._grvChecked) return;
            row._grvChecked = true;
        });
    }

    // ── Collectibles page ─────────────────────────────────────────────────────
    function runCollectibles() {
        if (!location.href.includes('/internal/collectibles')) return;

        let totalVal = 0;

        document.querySelectorAll('.col-6.col-md-4.col-lg-2.mb-2').forEach(card => {
            const link = card.querySelector('a');
            if (!link) return;
            const m = link.href.match(/catalog\/(\d+)\//);
            if (!m) return;
            if (card.querySelector('.grv-col-val')) return;

            const rapEl = card.querySelector('.card-body p:nth-of-type(2)');
            const rap = parseInt((rapEl?.textContent || '').replace(/\D/g, '')) || 0;
            const nameEl = card.querySelector('.card-body p.fw-bolder') || card.querySelector('.card-body p');
            const name = nameEl?.textContent?.trim() || '';
            const val = lookupValue(name);
            const display = (typeof val === 'number' && val > 0) ? val : rap;
            totalVal += display;

            const p = document.createElement('p');
            p.className = 'grv-col-val mb-0';
            p.style.cssText = 'color:#0084dd;font-weight:700;font-size:13px;display:flex;align-items:center;gap:4px;margin-top:4px;';
            p.innerHTML = `${ROLIMONS_SVG}<span>${display.toLocaleString()}</span>`;
            const body = card.querySelector('.card-body') || card;
            body.appendChild(p);
        });

        // Total
        const rapEl = [...document.querySelectorAll('.fw-bolder')].find(el => /Total RAP/i.test(el.textContent));
        if (rapEl) {
            let el = document.getElementById('grv-col-total');
            if (!el) {
                el = document.createElement('p');
                el.id = 'grv-col-total';
                el.style.cssText = 'color:#0084dd;font-weight:700;font-size:13px;margin-top:4px;';
                rapEl.insertAdjacentElement('afterend', el);
            }
            el.textContent = 'Total Value: ' + totalVal.toLocaleString();
        }
    }

    function runTradeWindow() {
        if (!/\/Trade\/TradeWindow/i.test(location.pathname)) return;
        if (document.getElementById('pks-tw-root') || document.getElementById('rok-trade-ui')) return;

      
        setInterval(() => {
            document.querySelectorAll('[class*="itemName-0-2-"]').forEach(nameEl => {
                const name = (nameEl.textContent || '').trim();
                if (!name) return;
                const card = nameEl.closest('[class*="itemCard"]') || nameEl.parentElement;
                if (!card || card._grvDone) return;
                const rapEl = card.querySelector('[class*="itemValue"] [class*="valueCurrencyLabel"]');
                const rap = parseInt((rapEl?.textContent || '').replace(/\D/g, '')) || 0;
                const val = lookupValue(name);
                const display = (typeof val === 'number' && val > 0) ? val : rap;
                card._grvDone = true;
                const v = document.createElement('div');
                v.className = 'grv-val';
                v.innerHTML = `${ROLIMONS_SVG}<span>${display.toLocaleString()}</span>`;
                nameEl.parentElement.appendChild(v);
            });
        }, 500);
    }

    // ── Init ──────────────────────────────────────────────────────────────────
    loadValues().then(() => {
        injectBaseStyle();
        runTradeWindow();
        const run = () => { runTrades(); runCollectibles(); };
        run();
        setInterval(run, 600);
    });

})();
