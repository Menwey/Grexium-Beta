// ==UserScript==
// @name         Grexium [Beta]
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Grexium Suite - Trading, Mass Trader
// @author       @Menwx
// @homepage     https://github.com/Menwey/Grexium-Beta
// @updateURL    https://raw.githubusercontent.com/Menwey/Grexium-Beta/refs/heads/main/grexium.js
// @downloadURL  https://raw.githubusercontent.com/Menwey/Grexium-Beta/refs/heads/main/grexium.js
// @match        https://pekora.pro/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      pekora.pro
// @connect      www.koromons.net
// @run-at       document-end
// ==/UserScript==

// Grexium, Free for everyone. Join us: discord.gg/kHcNNkXH4a

(function () {
    'use strict';

    if (typeof GM_xmlhttpRequest !== 'function') {
        console.warn('[Grexium] Not running in a Tampermonkey context — aborting.'); // абортики убийство!!!! а так бортики вкусные
        return;
    }

    const AUTH_SESSION_KEY   = 'pks_auth_pekora_v1';
    const PANEL_HIDDEN_KEY   = 'pks_panel_hidden';
    const FIRST_RUN_KEY      = 'grexium_first_run_v1';
    const RAPVAL_PROMPT_KEY  = 'grexium_rapval_prompted_v1';


    const GREXIUM_WORKER_URL = 'https://grexium-worker.menwey.workers.dev';  // dont change it or HEX dont will work!!!!! ы


    const getSessionToken = () => null;
    const acquireSessionToken = async () => null;

    const BADGE_BASE = 'https://raw.githubusercontent.com/Menwey/hexium-crack/main/badges/';



    let _koromonsCache = null;
    let _koromonsLoading = false;
    const _koromonsWaiters = [];

    const getKoromonsData = () => new Promise((resolve) => {
        if (_koromonsCache) { resolve(_koromonsCache); return; }
        if (_koromonsLoading) { _koromonsWaiters.push(resolve); return; }
        _koromonsLoading = true;
        fetch('https://www.koromons.net/items.json', { headers: { accept: 'application/json' } })
            .then(r => r.json())
            .then(data => {
                const map = {};
                if (Array.isArray(data)) {
                    data.forEach(item => {
                        if (item?.itemId) {
                            map[String(item.itemId)] = {
                                value: item.Value || 0,
                                rap: item.RAP || item.Value || 0,
                                demand: (item.Demand || 'unvalued').toLowerCase(),
                                rarity: item.IsRare ? 'rare' : 'common'
                            };
                        }
                    });
                }
                _koromonsCache = map;
                _koromonsLoading = false;
                _koromonsWaiters.forEach(fn => fn(map));
                _koromonsWaiters.length = 0;
                resolve(map);
            })
            .catch(() => {
                _koromonsCache = {};
                _koromonsLoading = false;
                _koromonsWaiters.forEach(fn => fn({}));
                _koromonsWaiters.length = 0;
                resolve({});
            });
    });

    const getKolVal = (assetId) => _koromonsCache?.[String(assetId)]?.value || 0;
    const getKolRap = (assetId) => _koromonsCache?.[String(assetId)]?.rap || 0;
    const getKolDemand = (assetId) => _koromonsCache?.[String(assetId)]?.demand || 'unvalued';

    const _gmGet = (url, timeoutMs = 8000) => new Promise((resolve) => {
        try {
            GM_xmlhttpRequest({
                method: 'GET',
                url,
                headers: { accept: 'application/json, text/plain, */*', 'Cache-Control': 'no-cache' },
                timeout: timeoutMs,
                onload:    (r) => resolve(r),
                onerror:   ()  => resolve(null),
                ontimeout: ()  => resolve(null),
            });
        } catch { resolve(null); }
    });

    const checkPekoraOwnership = async () => true;

    const getAuthSession = () => {
        try { return GM_getValue(AUTH_SESSION_KEY, null) || null; } catch { return null; }
    };
    const setAuthSession = (pekoraId) => {
        try { GM_setValue(AUTH_SESSION_KEY, String(pekoraId)); } catch {}
    };
    const clearAuthSession = () => {
        try { GM_setValue(AUTH_SESSION_KEY, null); } catch {}
    };


    const showAuthGate = () => new Promise((resolve) => {
        const runCheck = async (forceUI = false) => {

            if (!forceUI) {
                const cached = getAuthSession();
                if (cached) {
                    resolve({ pekoraId: cached });
                    return;
                }
            }

            const overlay = document.createElement('div');
            overlay.id = 'pks-auth-overlay';
            overlay.style.cssText = `
                all:initial;position:fixed;inset:0;z-index:2147483647;
                display:flex;align-items:center;justify-content:center;
                background:rgba(4,4,7,0.97);backdrop-filter:blur(28px);
                font-family:'Share Tech Mono',monospace;
            `;
            overlay.innerHTML = `
                <style>
                    @keyframes pks-gate-fadein { from{opacity:0;transform:translateY(20px) scale(0.95)} to{opacity:1;transform:translateY(0) scale(1)} }
                    @keyframes pks-border-spin { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
                    @keyframes pks-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
                    @keyframes pks-success-glow { 0%{box-shadow:0 0 0 0 rgba(0,232,122,0)} 50%{box-shadow:0 0 40px 8px rgba(0,232,122,0.25)} 100%{box-shadow:0 0 0 0 rgba(0,232,122,0)} }
                    @keyframes pks-checkmark { from{stroke-dashoffset:40;opacity:0} to{stroke-dashoffset:0;opacity:1} }
                    @keyframes pks-success-text { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
                    #pks-auth-box { animation:pks-gate-fadein 0.45s cubic-bezier(0.22,1,0.36,1) forwards; }
                    #pks-auth-box.success { animation:pks-success-glow 1.2s ease forwards !important; }
                    #pks-success-overlay { position:absolute;inset:0;border-radius:15px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;background:rgba(5,5,12,0.96);opacity:0;pointer-events:none;transition:opacity 0.35s ease;z-index:10; }
                    #pks-success-overlay.visible { opacity:1;pointer-events:all; }
                    .pks-success-ring { width:64px;height:64px;border-radius:50%;border:2px solid rgba(0,232,122,0.2);display:flex;align-items:center;justify-content:center;background:radial-gradient(circle,rgba(0,232,122,0.08) 0%,transparent 70%);position:relative; }
                    .pks-success-ring::after { content:'';position:absolute;inset:-6px;border-radius:50%;border:1px solid rgba(0,232,122,0.15);animation:pks-success-glow 2s ease infinite; }
                    .pks-success-check { stroke-dasharray:40;stroke-dashoffset:40;opacity:0;animation:pks-checkmark 0.5s 0.1s cubic-bezier(0.22,1,0.36,1) forwards; }
                    .pks-success-label { opacity:0;animation:pks-success-text 0.4s 0.3s ease forwards;text-align:center; }
                    .pks-spinner { width:36px;height:36px;border:3px solid rgba(0,232,122,0.15);border-top-color:#00e87a;border-radius:50%;animation:pks-spin 0.8s linear infinite; }
                </style>
                <div id="pks-auth-box" style="background:#07070f;border:1px solid #18182a;border-radius:16px;padding:0;width:390px;overflow:hidden;position:relative;box-shadow:0 40px 120px rgba(0,0,0,0.98),0 0 0 1px rgba(255,255,255,0.03);">
                    <div style="height:2px;background:linear-gradient(90deg,#00e5ff,#a855f7,#fbbf24,#00e87a);background-size:300% 100%;animation:pks-border-spin 4s linear infinite;"></div>
                    <div id="pks-success-overlay">
                        <div class="pks-success-ring">
                            <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
                                <polyline class="pks-success-check" points="5,13 11,19 21,7" stroke="#00e87a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </div>
                        <div class="pks-success-label">
                            <div style="color:#00e87a;font-family:'Share Tech Mono',monospace;font-size:14px;font-weight:700;letter-spacing:0.12em;">ACCESS GRANTED</div>
                            <div style="color:rgba(255,255,255,0.3);font-family:'Share Tech Mono',monospace;font-size:10px;letter-spacing:0.08em;margin-top:5px;">Loading Grexium\u2026</div>
                        </div>
                    </div>
                    <div style="padding:22px 22px 16px;background:#0a0a15;border-bottom:1px solid #111120;">
                        <div style="display:flex;align-items:center;gap:14px;">
                            <div style="width:40px;height:40px;border-radius:11px;background:linear-gradient(135deg,rgba(0,232,122,0.12),rgba(0,232,122,0.04));border:1px solid rgba(0,232,122,0.2);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00e87a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                            </div>
                            <div>
                                <div style="color:rgba(255,255,255,0.15);font-size:8px;letter-spacing:0.24em;text-transform:uppercase;margin-bottom:3px;font-family:'Share Tech Mono',monospace;">Grexium</div>
                                <div style="color:#fff;font-size:15px;font-weight:700;letter-spacing:0.02em;font-family:'Share Tech Mono',monospace;">Loading your account\u2026</div>
                            </div>
                        </div>
                    </div>
                    <div style="padding:28px 22px;display:flex;flex-direction:column;align-items:center;gap:14px;">
                        <div class="pks-spinner"></div>
                        <div id="pks-auth-status" style="color:#444;font-family:'Share Tech Mono',monospace;font-size:11px;letter-spacing:0.06em;">Fetching your account\u2026</div>
                        <div id="pks-auth-error" style="color:#ff4466;font-size:11px;letter-spacing:0.06em;display:none;text-align:center;font-family:'Share Tech Mono',monospace;line-height:1.6;"></div>
                        <button id="pks-auth-retry" style="display:none;all:unset;padding:10px 24px;border-radius:8px;background:#00e87a;color:#050508;font-family:'Share Tech Mono',monospace;font-size:11px;font-weight:700;letter-spacing:0.1em;cursor:pointer;">RETRY</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);

            const statusEl  = document.getElementById('pks-auth-status');
            const errorEl   = document.getElementById('pks-auth-error');
            const retryBtn  = document.getElementById('pks-auth-retry');
            const box       = document.getElementById('pks-auth-box');
            const successOv = document.getElementById('pks-success-overlay');

            const showError = (msg) => {
                statusEl.style.display = 'none';
                overlay.querySelector('.pks-spinner').style.display = 'none';
                errorEl.textContent = msg; errorEl.style.display = 'block';
                retryBtn.style.display = '';
            };

            const grantAccess = (pekoraId) => {
                overlay.querySelector('.pks-spinner').style.display = 'none';
                statusEl.style.display = 'none';
                const lbl = successOv.querySelector('.pks-success-label');
                if (lbl) lbl.innerHTML = `<div style="color:#00e87a;font-family:'Share Tech Mono',monospace;font-size:14px;font-weight:700;letter-spacing:0.12em;">WELCOME TO GREXIUM</div><div style="color:rgba(255,255,255,0.3);font-family:'Share Tech Mono',monospace;font-size:10px;letter-spacing:0.08em;margin-top:5px;">Loading Grexium\u2026</div>`;
                successOv.classList.add('visible');
                box.classList.add('success');
                setTimeout(() => {
                    overlay.style.transition = 'opacity 0.5s ease';
                    overlay.style.opacity = '0';
                    setTimeout(() => { overlay.remove(); resolve({ pekoraId }); }, 500);
                }, 1400);
            };

            const doCheck = async () => {
                statusEl.style.display = '';
                errorEl.style.display = 'none';
                retryBtn.style.display = 'none';
                overlay.querySelector('.pks-spinner').style.display = '';

                let pekoraId;
                try {
                    statusEl.textContent = 'Fetching your account\u2026';
                    const res = await fetch('https://pekora.pro/apisite/users/v1/users/authenticated', { credentials: 'include' });
                    if (!res.ok) throw new Error('Not logged in (HTTP ' + res.status + ')');
                    const data = await res.json();
                    pekoraId = String(data.id);
                    if (!pekoraId || pekoraId === '0') throw new Error('Could not read user ID \u2014 are you logged in?');
                } catch (e) {
                    showError('Could not fetch your account.\n' + e.message + '\n\nMake sure you are logged in to pekora.pro.');
                    return;
                }

                setAuthSession(pekoraId);
                grantAccess(pekoraId);
            };

            retryBtn.addEventListener('click', doCheck);
            doCheck();
        };

        runCheck();
    });

    const THEMES = {
        purple: {
            name: 'Void',
            accent:'#c084fc',accentDim:'#9333ea',accentRgb:'192,132,252',
            topBorder:'linear-gradient(90deg,#c084fc,#818cf8,#38bdf8)',
            panelBg:'#0e0d13',headerBg:'#13111a',tabBarBg:'#0e0d13',tabBorder:'#1e1a2e',
            activeBg:'#1c1828',activeText:'#c084fc',border:'#2a2438',inputBg:'#171520',
            inputBorder:'#2d2840',sectionText:'#4a4060',labelText:'#9988bb',
            mutedText:'rgba(192,132,252,0.55)',valueText:'#e8e0f8',
            cardBorder:'#c084fc22',cardGlow:'0 0 0 1px #c084fc18, 0 4px 24px rgba(192,132,252,0.10)',
            cardHoverBorder:'#c084fc55',cardHoverGlow:'0 0 0 1px #c084fc44, 0 8px 32px rgba(192,132,252,0.18)',
            glowColor:'rgba(192,132,252,0.18)',
        },
        crimson: {
            name: 'Crimson',
            accent:'#ff4466',accentDim:'#cc2244',accentRgb:'255,68,102',
            topBorder:'linear-gradient(90deg,#ff4466,#ff8800,#ff4466)',
            panelBg:'#0d0b0b',headerBg:'#130f0f',tabBarBg:'#0d0b0b',tabBorder:'#2a1a1a',
            activeBg:'#221414',activeText:'#ff4466',border:'#3a2020',inputBg:'#1a1010',
            inputBorder:'#3a2020',sectionText:'#5a3030',labelText:'#bb8888',
            mutedText:'rgba(255,68,102,0.55)',valueText:'#f0dede',
            cardBorder:'#ff446622',cardGlow:'0 0 0 1px #ff446618, 0 4px 24px rgba(255,68,102,0.10)',
            cardHoverBorder:'#ff446655',cardHoverGlow:'0 0 0 1px #ff446644, 0 8px 32px rgba(255,68,102,0.18)',
            glowColor:'rgba(255,68,102,0.18)',
        },
        blue: {
            name: 'Arctic',
            accent:'#38bdf8',accentDim:'#0284c7',accentRgb:'56,189,248',
            topBorder:'linear-gradient(90deg,#38bdf8,#818cf8,#c084fc,#38bdf8)',
            panelBg:'#0a0c10',headerBg:'#0e1018',tabBarBg:'#0a0c10',tabBorder:'#161a28',
            activeBg:'#131828',activeText:'#38bdf8',border:'#1e2436',inputBg:'#10131e',
            inputBorder:'#1e2436',sectionText:'#303858',labelText:'#7888aa',
            mutedText:'rgba(56,189,248,0.55)',valueText:'#d0e8f8',
            cardBorder:'#38bdf822',cardGlow:'0 0 0 1px #38bdf818, 0 4px 24px rgba(56,189,248,0.10)',
            cardHoverBorder:'#38bdf855',cardHoverGlow:'0 0 0 1px #38bdf844, 0 8px 32px rgba(56,189,248,0.18)',
            glowColor:'rgba(56,189,248,0.18)',
        },
        midnight: {
            name: 'Gold',
            accent:'#f0a500',accentDim:'#c07800',accentRgb:'240,165,0',
            topBorder:'linear-gradient(90deg,#f0a500,#fbbf24,#f0a500)',
            panelBg:'#090909',headerBg:'#0e0e0e',tabBarBg:'#090909',tabBorder:'#1a1a1a',
            activeBg:'#1a1700',activeText:'#f0a500',border:'#2a2510',inputBg:'#111100',
            inputBorder:'#2a2510',sectionText:'#444',labelText:'#aaa',
            mutedText:'rgba(240,165,0,0.55)',valueText:'#f5e8cc',
            cardBorder:'#f0a50022',cardGlow:'0 0 0 1px #f0a50018, 0 4px 24px rgba(240,165,0,0.10)',
            cardHoverBorder:'#f0a50055',cardHoverGlow:'0 0 0 1px #f0a50044, 0 8px 32px rgba(240,165,0,0.18)',
            glowColor:'rgba(240,165,0,0.18)',
        },
        matrix: {
            name: 'Matrix',
            accent:'#00ff41',accentDim:'#00bb30',accentRgb:'0,255,65',
            topBorder:'linear-gradient(90deg,#00ff41,#00cc30,#00ff41)',
            panelBg:'#050a05',headerBg:'#080d08',tabBarBg:'#050a05',tabBorder:'#0a180a',
            activeBg:'#0a200a',activeText:'#00ff41',border:'#143014',inputBg:'#070e07',
            inputBorder:'#143014',sectionText:'#1a401a',labelText:'#449944',
            mutedText:'rgba(0,255,65,0.55)',valueText:'#ccffcc',
            cardBorder:'#00ff4122',cardGlow:'0 0 0 1px #00ff4118, 0 4px 24px rgba(0,255,65,0.10)',
            cardHoverBorder:'#00ff4155',cardHoverGlow:'0 0 0 1px #00ff4144, 0 8px 32px rgba(0,255,65,0.18)',
            glowColor:'rgba(0,255,65,0.18)',
        },
        rose: {
            name: 'Rose',
            accent:'#fb7185',accentDim:'#e11d48',accentRgb:'251,113,133',
            topBorder:'linear-gradient(90deg,#fb7185,#f472b6,#fb7185)',
            panelBg:'#120a0c',headerBg:'#180e11',tabBarBg:'#120a0c',tabBorder:'#2a151a',
            activeBg:'#26141a',activeText:'#fb7185',border:'#3a1f26',inputBg:'#1a1013',
            inputBorder:'#3a1f26',sectionText:'#5a3038',labelText:'#bb8893',
            mutedText:'rgba(251,113,133,0.55)',valueText:'#f5dde2',
            cardBorder:'#fb718522',cardGlow:'0 0 0 1px #fb718518, 0 4px 24px rgba(251,113,133,0.10)',
            cardHoverBorder:'#fb718555',cardHoverGlow:'0 0 0 1px #fb718544, 0 8px 32px rgba(251,113,133,0.18)',
            glowColor:'rgba(251,113,133,0.18)',
        },
        mono: {
            name: 'Mono',
            accent:'#e5e7eb',accentDim:'#9ca3af',accentRgb:'229,231,235',
            topBorder:'linear-gradient(90deg,#9ca3af,#e5e7eb,#9ca3af)',
            panelBg:'#0c0c0d',headerBg:'#101011',tabBarBg:'#0c0c0d',tabBorder:'#1c1c1e',
            activeBg:'#1c1c1e',activeText:'#e5e7eb',border:'#2b2b2e',inputBg:'#131314',
            inputBorder:'#2b2b2e',sectionText:'#4a4a4e',labelText:'#a0a0a6',
            mutedText:'rgba(229,231,235,0.55)',valueText:'#f0f0f2',
            cardBorder:'#e5e7eb22',cardGlow:'0 0 0 1px #e5e7eb14, 0 4px 24px rgba(229,231,235,0.07)',
            cardHoverBorder:'#e5e7eb44',cardHoverGlow:'0 0 0 1px #e5e7eb33, 0 8px 32px rgba(229,231,235,0.12)',
            glowColor:'rgba(229,231,235,0.14)',
        },
        sakura: {
            name: 'Sakura',
            accent:'#f9a8d4',accentDim:'#f472b6',accentRgb:'249,168,212',
            topBorder:'linear-gradient(90deg,#f9a8d4,#c084fc,#f9a8d4)',
            panelBg:'#100b0f',headerBg:'#160f15',tabBarBg:'#100b0f',tabBorder:'#281a26',
            activeBg:'#241824',activeText:'#f9a8d4',border:'#382438',inputBg:'#171018',
            inputBorder:'#382438',sectionText:'#553a54',labelText:'#bb96b6',
            mutedText:'rgba(249,168,212,0.55)',valueText:'#f5e4f0',
            cardBorder:'#f9a8d422',cardGlow:'0 0 0 1px #f9a8d418, 0 4px 24px rgba(249,168,212,0.10)',
            cardHoverBorder:'#f9a8d455',cardHoverGlow:'0 0 0 1px #f9a8d444, 0 8px 32px rgba(249,168,212,0.18)',
            glowColor:'rgba(249,168,212,0.18)',
        },
    };

    const DEFAULTS = {
        showNotifications:     true,
        notificationDuration:  5000,
        notificationPosition:  'bottom-right',
        theme:                 'purple',
        guiScale:              100,
        hotkeyRefresher:       'F',
        hotkeyHardRefresh:     'R',
        hotkeyToggleGui:       'Insert',
        clickInterval:         1500,
        hardRefreshInterval:   60000,
        miscBgUrl:                  '',
        miscBgBlur:                 false,
        miscBgBlurAmount:           8,
        miscBgDarkOverlay:          false,
        miscBgDarkOpacity:          50,
        sidebarEnabled:             false,
        sidebarMode:                'transparent',
        sidebarBlurAmount:          8,
        sidebarColour:              '#0d0d14',
        sidebarOpacity:             80,
        navbarEnabled:              false,
        navbarMode:                 'transparent',
        navbarColour:               '#0d0d14',
        navbarOpacity:              80,
        miscHideAds:                true,
        miscHideAlert:              false,
        miscHideNavbar:             false,
        miscPageFont:               'Default (Site Font)',
        miscGuiFont:                'Exo 2',
        miscHideMyFeed:             false,
        miscHideBlogNews:           false,
        miscModernGameCards:        false,
        miscGamesGlassify:          true,
        miscGamesHideComments:      false,
        miscGamesHideRecommended:   false,
        miscGamesHeroBackdrop:      true,
        miscCatalogFrameTransparent:false,
        miscCatalogHideSidebar:     false,
        miscCatalogItemCards:       true,
        miscProfileFrameTransparent:false,
        miscProfileNameAnimate:     false,
        miscProfileNameColor1:      '#5100e8',
        miscProfileNameColor2:      '#f238f8',
        miscFriendsFrameTransparent:false,
        miscAvatarFrameTransparent: false,
        miscHomeFramesTransparent:  false,
        miscFooterTransparent:      false,
        profileBannerEnabled:       false,
        profileBannerImage:         '',
        profileBannerBlur:          0,
        profileBannerTint:          '#000000',
        profileBannerTintOpacity:   0,
        profileBannerTintGradient:  false,
        profileBannerTint2:         '#3f2550',
        profileBannerTintAngle:     135,
        profileBannerBrightness:    100,
        hideHexBadge:               false,
        tradesBgColor:              '#262626',
        tradesOpacity:              100,
        tradesBlur:                 0,
        tradesAccent:               '#ffffff',
        tradesGlassCards:           false,
        tradesMetric:               'value',
        tradesPillOpacity:          5,
        watermarkEnabled:       true,
        watermarkPosition:      'bottom-center',
        watermarkShowPing:      true,
        watermarkShowTime:      true,
        watermarkShowUser:      true,
        watermarkScale:         120,
        watermarkOpacity:       90,
        watermarkAccentColor:   '',
        customAccentEnabled:    false,
        customAccentColor:      '#00e87a',
        panelGlass:             true,
        panelOpacity:           85,
        panelBlur:              14,
        panelRadius:            16,
        panelGradientEnabled:   false,
        panelGradientColor1:    '#0d0d12',
        panelGradientColor2:    '#1a1830',
        effectType:             'none',
        effectIntensity:        50,
        effectSpeed:            50,
        effectColor:            '',
        larpEnabled:            false,
        larpVerify:             false,
        larpRobux:              0,
        larpTix:                0,
        avatarBgEnabled:        false,
        avatarBgImage:          '',
        avatarBgBlur:           0,
        avatarGlassify:         false,
        avatarFakeItems:        [],
        avatarFakeQty:          {},
        anonymous:             false,
    };

    const loadCfg = () => {
        try {
            const s = GM_getValue('pekora_suite_cfg_v5', null);
            return s ? Object.assign({}, DEFAULTS, JSON.parse(s)) : Object.assign({}, DEFAULTS);
        } catch { return Object.assign({}, DEFAULTS); }
    };
    const saveCfg = (c) => { try { GM_setValue('pekora_suite_cfg_v5', JSON.stringify(c)); } catch {} };
    let cfg = loadCfg();

    const hexToRgbObj = (h) => {
        let s = String(h || '').replace('#', '').trim();
        if (s.length === 3) s = s.split('').map(c => c + c).join('');
        if (s.length !== 6) return null;
        const n = parseInt(s, 16);
        if (Number.isNaN(n)) return null;
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    };
    const darkenHex = (h, f = 0.66) => {
        const c = hexToRgbObj(h); if (!c) return h;
        const d = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
        return '#' + [d(c.r), d(c.g), d(c.b)].map(v => v.toString(16).padStart(2, '0')).join('');
    };
    const deriveAccent = (hex) => {
        const c = hexToRgbObj(hex); if (!c) return null;
        const rgb = `${c.r},${c.g},${c.b}`;
        return {
            accent: hex, accentDim: darkenHex(hex, 0.66), accentRgb: rgb, activeText: hex,
            glowColor: `rgba(${rgb},0.18)`,
            topBorder: `linear-gradient(90deg,${hex},${darkenHex(hex, 0.55)},${hex})`,
            cardBorder: `rgba(${rgb},0.13)`,
            cardGlow: `0 0 0 1px rgba(${rgb},0.10), 0 4px 24px rgba(${rgb},0.10)`,
            cardHoverBorder: `rgba(${rgb},0.33)`,
            cardHoverGlow: `0 0 0 1px rgba(${rgb},0.27), 0 8px 32px rgba(${rgb},0.18)`,
        };
    };
    const getTheme = () => {
        const base = THEMES[cfg.theme] || THEMES.purple;
        if (cfg.customAccentEnabled && cfg.customAccentColor?.trim()) {
            const derived = deriveAccent(cfg.customAccentColor.trim());
            if (derived) return Object.assign({}, base, derived);
        }
        return base;
    };

    const PAGE_FONT_SPECS = {
        'Source Sans Pro Light': { family: 'Source Sans 3', weight: 300 },
    };

    const applyPageFont = (font) => {
        let el = document.getElementById('pks-page-font-style');
        if (!el) { el = document.createElement('style'); el.id = 'pks-page-font-style'; document.head.appendChild(el); }
        if (!font || font === 'Default (Site Font)') { el.textContent = ''; return; }
        const { family, weight } = PAGE_FONT_SPECS[font] || { family: font };
        const famParam = encodeURIComponent(family) + (weight ? `:wght@${weight}` : '');
        const url = `https://fonts.googleapis.com/css2?family=${famParam}&display=swap`;
        el.textContent = `@import url('${url}'); body, body * { font-family:'${family}',sans-serif!important;${weight ? ` font-weight:${weight}!important;` : ''} }`;
    };

    const applyGuiFont = (font) => {
        const resolved = (!font || font === 'Share Tech Mono') ? 'Share Tech Mono' : font;
        const linkId = 'pks-gui-font-link';
        let link = document.getElementById(linkId);
        if (!link) {
            link = document.createElement('link');
            link.id = linkId;
            link.rel = 'stylesheet';
            document.head.appendChild(link);
        }
        link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(resolved)}:wght@400;600;700&display=swap`;
        const varId = 'pks-gui-font-var';
        let varEl = document.getElementById(varId);
        if (!varEl) {
            varEl = document.createElement('style');
            varEl.id = varId;
            document.head.appendChild(varEl);
        }
        varEl.textContent = `:root { --pks-font: '${resolved}', 'Share Tech Mono', monospace; }`;
    };

    const injectFont = () => {
        const baseId = 'pks-base-font-link';
        if (!document.getElementById(baseId)) {
            const link = document.createElement('link');
            link.id = baseId;
            link.rel = 'stylesheet';
            link.href = 'https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap';
            document.head.appendChild(link);
        }
        applyGuiFont(cfg.miscGuiFont || 'Share Tech Mono');
    };

    const SIDEBAR_SELECTORS = [
        '.container-0-2-79 .card-0-2-80',
        '.card-d0-0-2-87',
        '.container-0-2-96 .card-0-2-97',
        '.card-d0-0-2-104',
        '[class*="container-0-2-"] > [class*="card-0-2-"]',
    ].join(',\n                    ');

    const applySidebarNavStyle = () => {
        let el = document.getElementById('pks-sidebar-nav-style');
        if (!el) { el = document.createElement('style'); el.id = 'pks-sidebar-nav-style'; document.head.appendChild(el); }
        let css = '';
        if (cfg.sidebarEnabled) {
            const op   = (cfg.sidebarOpacity ?? 80) / 100;
            const blur = cfg.sidebarBlurAmount ?? 8;
            if (cfg.sidebarMode === 'transparent') {
                css += `${SIDEBAR_SELECTORS} { background:transparent!important;border-color:rgba(255,255,255,0.07)!important;box-shadow:none!important; }`;
            } else if (cfg.sidebarMode === 'blur') {
                css += `${SIDEBAR_SELECTORS} { background:rgba(13,13,20,${op})!important;backdrop-filter:blur(${blur}px)!important;-webkit-backdrop-filter:blur(${blur}px)!important;border-color:rgba(255,255,255,0.07)!important;box-shadow:none!important; }`;
            } else if (cfg.sidebarMode === 'colour') {
                const col = cfg.sidebarColour || '#0d0d14';
                const r = parseInt(col.slice(1,3),16), g = parseInt(col.slice(3,5),16), b = parseInt(col.slice(5,7),16);
                css += `${SIDEBAR_SELECTORS} { background:rgba(${r},${g},${b},${op})!important;border-color:rgba(255,255,255,0.07)!important;box-shadow:none!important; }`;
            }
        }
        if (cfg.navbarEnabled) {
            const op   = (cfg.navbarOpacity ?? 80) / 100;
            const blur = cfg.sidebarBlurAmount ?? 8;
            if (cfg.navbarMode === 'transparent') {
                css += `.navbar-0-2-49,nav.navbar.navbar-0-2-49,.navbar-wrapper-main .navbar{background:transparent!important;border-bottom:1px solid rgba(255,255,255,0.06)!important;box-shadow:none!important;}`;
            } else if (cfg.navbarMode === 'blur') {
                css += `.navbar-0-2-49,nav.navbar.navbar-0-2-49,.navbar-wrapper-main .navbar{background:rgba(13,13,20,${op})!important;backdrop-filter:blur(${blur}px)!important;-webkit-backdrop-filter:blur(${blur}px)!important;border-bottom:1px solid rgba(255,255,255,0.06)!important;box-shadow:none!important;}`;
            } else if (cfg.navbarMode === 'colour') {
                const col = cfg.navbarColour || '#0d0d14';
                const r = parseInt(col.slice(1,3),16), g = parseInt(col.slice(3,5),16), b = parseInt(col.slice(5,7),16);
                css += `.navbar-0-2-49,nav.navbar.navbar-0-2-49,.navbar-wrapper-main .navbar{background:rgba(${r},${g},${b},${op})!important;border-bottom:1px solid rgba(255,255,255,0.06)!important;box-shadow:none!important;}`;
            }
        }
        el.textContent = css;
    };

    const applySidebarDirect = () => {
        if (!cfg.sidebarEnabled) return;
        const card = document.querySelector('.container-0-2-96 .card-0-2-97')
            || document.querySelector('.card-d0-0-2-104')
            || document.querySelector('.container-0-2-79 .card-0-2-80')
            || document.querySelector('.card-d0-0-2-87')
            || (() => {
                const containers = document.querySelectorAll('[class*="container-0-2-"]');
                for (const c of containers) {
                    const card = c.querySelector('[class*="card-0-2-"]');
                    if (card && card.querySelector('a[href*="/profile"], a[href="/home"]')) return card;
                }
                return null;
            })();
        if (!card) return;
        const op   = (cfg.sidebarOpacity ?? 80) / 100;
        const blur = cfg.sidebarBlurAmount ?? 8;
        if (cfg.sidebarMode === 'transparent') {
            card.style.setProperty('background', 'transparent', 'important');
            card.style.setProperty('border-color', 'rgba(255,255,255,0.07)', 'important');
            card.style.setProperty('box-shadow', 'none', 'important');
        } else if (cfg.sidebarMode === 'blur') {
            card.style.setProperty('background', `rgba(13,13,20,${op})`, 'important');
            card.style.setProperty('backdrop-filter', `blur(${blur}px)`, 'important');
            card.style.setProperty('-webkit-backdrop-filter', `blur(${blur}px)`, 'important');
            card.style.setProperty('border-color', 'rgba(255,255,255,0.07)', 'important');
            card.style.setProperty('box-shadow', 'none', 'important');
        } else if (cfg.sidebarMode === 'colour') {
            const col = cfg.sidebarColour || '#0d0d14';
            const r = parseInt(col.slice(1,3),16), g = parseInt(col.slice(3,5),16), b = parseInt(col.slice(5,7),16);
            card.style.setProperty('background', `rgba(${r},${g},${b},${op})`, 'important');
            card.style.setProperty('border-color', 'rgba(255,255,255,0.07)', 'important');
            card.style.setProperty('box-shadow', 'none', 'important');
        }
    };


    const SIDEBAR_LINKS = [
        { href: '/internal/robuxexchange', name: 'Robux Exchange' },
        { href: '/internal/tixexchange',   name: 'Tix Exchange' },
        { href: '/My/Trades.aspx',         name: 'My Trades' },
    ];
    const injectSidebarLinks = () => {
        const groups = document.querySelector('a[href="/groups"][class*="link-0-2-"]') || document.querySelector('[class*="card-0-2-"] a[href="/groups"]');
        if (!groups || !groups.parentElement) return;
        let after = groups;
        SIDEBAR_LINKS.forEach(spec => {
            const existing = document.querySelector(`a[data-pks-navlink="${spec.href}"]`);
            if (existing) { after = existing; return; }
            const clone = groups.cloneNode(true);
            clone.setAttribute('data-pks-navlink', spec.href);
            clone.setAttribute('href', spec.href);
            clone.querySelectorAll('[class*="icon-nav-"]').forEach(e => e.remove());
            const wrap = clone.querySelector('[class*="wrapper-0-2-"]');
            if (wrap) wrap.className = wrap.className.replace(/\s*hover-icon-nav-\S+/, '');
            const name = clone.querySelector('[class*="name-0-2-"]');
            if (name) name.textContent = spec.name;
            clone.querySelectorAll('[class*="countWrapper"]').forEach(e => e.remove());
            after.parentElement.insertBefore(clone, after.nextSibling);
            after = clone;
        });
    };

    const applyPageFrameTransparency = () => {
        let el = document.getElementById('pks-frame-style');
        if (!el) { el = document.createElement('style'); el.id = 'pks-frame-style'; document.head.appendChild(el); }
        const t = getTheme();
        let css = `[class*="headshotWrapper"]{background:transparent!important;background-color:transparent!important;box-shadow:none!important;}`;
        css += `li[class*="messagesContainer-"]{display:none!important;}`;
        css += `[class*="dropdownWrapper"]{position:relative!important;z-index:1500!important;}[class*="dropdownNew"],[class*="dropdownClass"]{z-index:1500!important;}`;
        css += `[class*="userStatus"],[class*="statHeader"],[class*="statText"]{font-weight:700!important;}`;
        const FRAME_CSS = `background:transparent!important;backdrop-filter:blur(0px)!important;border-color:rgba(255,255,255,0.06)!important;box-shadow:none!important;`;
        if (cfg.miscHomeFramesTransparent) {
            css += `.container.container-0-2-162,.container-0-2-162{${FRAME_CSS}}.myFeedContainer-0-2-176,.blogNewsContainer-0-2-177,.homeGamesContainer-0-2-172{${FRAME_CSS}}`;
            css += `[class*="friendSection"] .section-content,[class*="friendSection"]{background:transparent!important;}[class*="thumbnailWrapper"]{box-shadow:none!important;}`;
        }
        if (cfg.miscCatalogFrameTransparent) css += `.catalogContainer-0-2-4,.detailsWrapper-0-2-117{${FRAME_CSS}}`;
        if (cfg.miscProfileFrameTransparent) {
            let glassEl = document.getElementById('pks-profile-glass-style');
            if (!glassEl) { glassEl = document.createElement('style'); glassEl.id = 'pks-profile-glass-style'; document.head.appendChild(glassEl); }
            glassEl.textContent = `
                .card,
                [class*="card-0-2-"],
                .card-body,
                [class*="cardBody-0-2-"],
                .avatarImageCard-0-2-334,
                .groupCard-0-2-402 {
                    background: rgba(255,255,255,0.05) !important;
                    backdrop-filter: blur(20px) saturate(180%) !important;
                    -webkit-backdrop-filter: blur(20px) saturate(180%) !important;
                    border: 1px solid rgba(255,255,255,0.15) !important;
                    border-radius: 12px !important;
                    box-shadow: 0 8px 32px rgba(0,0,0,.20), inset 0 1px 0 rgba(255,255,255,.15) !important;
                }
                /* Sidebar nav card — strip glass so backdrop-filter doesn't break its stacking context */
                [class*="card-0-2-"]:has(a[href="/home"]),
                [class*="card-0-2-"]:has(a[href="/groups"]),
                [class*="card-0-2-"]:has(a[href*="/friends"]),
                [class*="card-0-2-"]:has([class*="link-0-2-"]) {
                    background: unset !important;
                    backdrop-filter: none !important;
                    -webkit-backdrop-filter: none !important;
                    border: unset !important;
                    box-shadow: unset !important;
                }
                .avatarWrapper-0-2-191,
                .avatarContainer-0-2-189,
                .image-0-2-193,
                .listItemFriend-0-2-188,
                .friendLink-0-2-190 {
                    background: transparent !important;
                    background-color: transparent !important;
                    box-shadow: none !important;
                    border: none !important;
                }
                .avatarWrapper-0-2-191 {
                    backdrop-filter: blur(12px) !important;
                    -webkit-backdrop-filter: blur(12px) !important;
                }
                .card:hover,
                [class*="card-0-2-"]:hover:not([class*="dropdown"]),
                [class*="cardBody-0-2-"]:hover {
                    position: relative !important;
                    z-index: 100 !important;
                }
                .popover,
                [class*="popover"] {
                    z-index: 2000 !important;
                }
            `;
        } else {
            document.getElementById('pks-profile-glass-style')?.remove();
        }
        if (cfg.miscFriendsFrameTransparent) {
            css += `.section-content{background:rgba(255,255,255,0.04)!important;backdrop-filter:blur(20px) saturate(180%)!important;-webkit-backdrop-filter:blur(20px) saturate(180%)!important;border:1px solid rgba(255,255,255,0.12)!important;border-radius:14px!important;box-shadow:0 8px 32px rgba(0,0,0,.20),inset 0 1px 0 rgba(255,255,255,.15)!important;}`;
            css += `.friendEntry-0-2-180,.friendWrapper-0-2-181,.thumbnailWrapper-0-2-182{background:transparent!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;}`;
        }
        if (cfg.miscAvatarFrameTransparent) css += `.avatarCardContainer-0-2-570,.catalogContainer-0-2-4{${FRAME_CSS}}.pillToggle-0-2-553{background:rgba(255,255,255,0.05)!important;border-color:rgba(255,255,255,0.1)!important;}`;
        if (cfg.miscFooterTransparent) css += `[class*="footerContainer"],footer[class*="footerContainer"]{background:transparent!important;border-top:1px solid rgba(255,255,255,0.06)!important;box-shadow:none!important;backdrop-filter:none!important;}`;
        if (cfg.miscGamesGlassify) {
            const accentDark = darkenHex(t.accent, 0.62);
            const GLASS = `background:rgba(255,255,255,0.05)!important;backdrop-filter:blur(16px) saturate(160%)!important;-webkit-backdrop-filter:blur(16px) saturate(160%)!important;border:1px solid rgba(255,255,255,0.12)!important;border-radius:16px!important;box-shadow:0 8px 30px rgba(0,0,0,0.3)!important;`;
            css += `
                /* every major frame → glass */
                [class*="callsToAction"],[class*="recommendedGamesContainer"],[class*="serverContainer"],[class*="subSectionContainer"],[class*="gameDescription"],[class*="contentContainer"]{${GLASS}padding:16px!important;}
                [class*="callsToAction"]{padding:14px!important;}
                [class*="carouselGameDetails"],[class*="thumbContainer"],[class*="innerCarousel"],[class*="carouselItem"]{border-radius:16px!important;overflow:hidden!important;}
                [class*="gameName"],[class*="containerHeader"] h3{color:#fff!important;}
                [class*="creatorName"]{color:${t.accent}!important;}
                [class*="descriptionText"]{color:#dfe3f0!important;background:transparent!important;}
                [class*="voteText"],[class*="voteNumbers"],[class*="playerCount"],[class*="creatorLabel"]{color:#e6e9f5!important;}
                /* game stats → modern glass chips */
                [class*="gameStatsContainer"]{display:flex!important;flex-wrap:wrap!important;gap:8px!important;border:none!important;padding:0!important;margin-top:12px!important;}
                [class*="gameStat-"]{list-style:none!important;background:rgba(255,255,255,0.05)!important;backdrop-filter:blur(10px)!important;-webkit-backdrop-filter:blur(10px)!important;border:1px solid rgba(255,255,255,0.1)!important;border-radius:12px!important;padding:8px 13px!important;transition:border-color 0.15s ease,transform 0.12s ease!important;}
                [class*="gameStat-"]:hover{border-color:${t.accent}66!important;transform:translateY(-1px)!important;}
                [class*="gameStatLabel"]{color:#9aa0c0!important;}
                [class*="gameStatStat"]{color:#fff!important;font-weight:700!important;}
                [class*="reportAbuseContainer"] a,[class*="abuseLink"]{color:${t.accent}!important;}
                /* comments → glass */
                [class*="commentContainer"]{background:rgba(255,255,255,0.04)!important;backdrop-filter:blur(10px)!important;-webkit-backdrop-filter:blur(10px)!important;border:1px solid rgba(255,255,255,0.1)!important;border-radius:12px!important;padding:10px!important;margin-bottom:8px!important;}
                [class*="createCommentContainer"],[class*="commentBox"]{background:rgba(255,255,255,0.05)!important;backdrop-filter:blur(12px)!important;-webkit-backdrop-filter:blur(12px)!important;border:1px solid rgba(255,255,255,0.12)!important;border-radius:12px!important;}
                [class*="commentBox"] input,[class*="createCommentContainer"] input{background:transparent!important;color:#fff!important;border:none!important;}
                /* modern, sleek buttons */
                [class*="actionButtonsContainer"]{gap:8px!important;}
                [class*="playButtonContainer"] button,[class*="buttonWrapper"] button{background:linear-gradient(135deg,${t.accent},${accentDark})!important;border:none!important;border-radius:14px!important;box-shadow:0 6px 22px ${t.accent}55!important;transition:transform 0.16s ease,box-shadow 0.16s ease,filter 0.16s ease!important;}
                [class*="playButtonContainer"] button:hover,[class*="buttonWrapper"] button:hover{transform:translateY(-2px) scale(1.02)!important;filter:brightness(1.08)!important;box-shadow:0 12px 30px ${t.accent}88!important;}
                [class*="playButtonContainer"] button [class*="iconPlay"]{filter:drop-shadow(0 1px 2px rgba(0,0,0,0.4))!important;}
                [class*="gameContainer"] [class*="favoriteButton"],[class*="gameContainer"] [class*="followButton"]{display:flex!important;align-items:center!important;justify-content:center!important;gap:6px!important;background:rgba(255,255,255,0.06)!important;backdrop-filter:blur(10px)!important;-webkit-backdrop-filter:blur(10px)!important;border:1px solid rgba(255,255,255,0.14)!important;border-radius:14px!important;padding:8px 14px!important;transition:background 0.15s ease,border-color 0.15s ease,transform 0.15s ease!important;}
                [class*="gameContainer"] [class*="favoriteButton"]:hover,[class*="gameContainer"] [class*="followButton"]:hover{background:rgba(255,255,255,0.11)!important;border-color:${t.accent}99!important;transform:translateY(-1px)!important;}
                [class*="gameContainer"] [class*="favoriteLabel"],[class*="gameContainer"] [class*="followLabel"]{color:#fff!important;font-weight:600!important;}
                /* About / Store / Servers tabs → modern glass segmented control */
                [class*="buttonCol"]{display:flex!important;gap:8px!important;flex-wrap:wrap!important;}
                [class*="vTab-"]{background:rgba(255,255,255,0.05)!important;backdrop-filter:blur(10px)!important;-webkit-backdrop-filter:blur(10px)!important;border:1px solid rgba(255,255,255,0.12)!important;border-radius:12px!important;overflow:hidden!important;transition:border-color 0.15s ease,transform 0.12s ease,background 0.15s ease!important;}
                [class*="vTab-"]:hover{border-color:${t.accent}66!important;transform:translateY(-1px)!important;}
                [class*="vTabLabel"]{color:#cfd3e6!important;font-weight:600!important;margin:0!important;padding:9px 16px!important;text-align:center!important;cursor:pointer!important;}
                [class*="vTabLabel"]:not([class*="vTabUnselected"]){color:#fff!important;background:linear-gradient(135deg,${t.accent}33,${t.accent}11)!important;box-shadow:inset 0 -2px 0 ${t.accent}!important;}
                [class*="vTabUnselected"]{color:#8a90ad!important;}
            `;
        }
        css += `[class*="gameContainer"] [class*="background-"],[class*="gameContainer"] [class*="thumbContainer"],[class*="gameContainer"] [class*="carouselGameDetails"],[class*="gameContainer"] [class*="descriptionContainer"]{background:transparent!important;background-color:transparent!important;border:none!important;box-shadow:none!important;}`;
        if (!cfg.miscGamesGlassify) css += `[class*="gameContainer"] [class*="contentContainer"],[class*="gameContainer"] [class*="callsToAction"],[class*="gameContainer"] [class*="recommendedGamesContainer"],[class*="gameContainer"] [class*="commentsContainer"],[class*="gameContainer"] [class*="createCommentContainer"],[class*="gameContainer"] [class*="commentBox"]{background:transparent!important;background-color:transparent!important;border:none!important;box-shadow:none!important;}`;
        if (cfg.miscGamesHideRecommended) css += `[class*="recommendedGamesContainer"]{display:none!important;}`;
        if (cfg.miscGamesHideComments) css += `[class*="commentsContainer"]{display:none!important;}[class*="containerHeader"]:has(+[class*="commentsContainer"]){display:none!important;}`;
        el.textContent = css;
        applyGamesHeroBackdrop();
        applyMessagesGlass();
    };

    const applyMessagesGlass = () => {
        if (!document.querySelector('div[class*="messagesContainer-"]')) {
            document.getElementById('pks-messages-glass-style')?.remove();
            return;
        }
        let el = document.getElementById('pks-messages-glass-style');
        if (!el) { el = document.createElement('style'); el.id = 'pks-messages-glass-style'; document.head.appendChild(el); }
        const t = getTheme();
        const GLASS = `background:rgba(255,255,255,0.05)!important;backdrop-filter:blur(16px) saturate(160%)!important;-webkit-backdrop-filter:blur(16px) saturate(160%)!important;border:1px solid rgba(255,255,255,0.12)!important;border-radius:16px!important;box-shadow:0 8px 30px rgba(0,0,0,0.3)!important;`;
        const M = 'div[class*="messagesContainer-"]';
        el.textContent = `
            ${M}{${GLASS}padding:18px!important;color:#e6e9f5!important;}
            /* tabs (Inbox / Sent / Notifications / Archive) */
            ${M} [class*="vTab-0-2"]{background:rgba(255,255,255,0.05)!important;backdrop-filter:blur(10px)!important;-webkit-backdrop-filter:blur(10px)!important;border:1px solid rgba(255,255,255,0.12)!important;border-radius:12px!important;overflow:hidden!important;margin-bottom:8px!important;transition:border-color 0.15s ease,transform 0.12s ease!important;}
            ${M} [class*="vTab-0-2"]:hover{border-color:${t.accent}66!important;transform:translateY(-1px)!important;}
            ${M} [class*="vTabLabel"]{margin:0!important;padding:10px 16px!important;color:#cfd3e6!important;font-weight:600!important;cursor:pointer!important;}
            ${M} [class*="vTabLabel"]:not([class*="vTabUnselected"]){color:#fff!important;background:linear-gradient(135deg,${t.accent}33,${t.accent}11)!important;box-shadow:inset 3px 0 0 ${t.accent}!important;}
            ${M} [class*="vTabUnselected"]{color:#8a90ad!important;}
            ${M} [class*="count-0-2"]{background:${t.accent}!important;color:#050508!important;border-radius:10px!important;padding:1px 7px!important;font-weight:700!important;margin-left:6px!important;}
            ${M} [class*="btnBottomSeperator"]{display:none!important;}
            /* message rows → individual glass cards */
            ${M} [class*="messageRow-"]{${GLASS}display:flex!important;align-items:center!important;gap:12px!important;padding:12px 14px!important;margin-bottom:8px!important;transition:border-color 0.15s ease,transform 0.12s ease,background 0.15s ease!important;}
            ${M} [class*="messageRow-"]:hover{border-color:${t.accent}66!important;transform:translateY(-1px)!important;background:rgba(255,255,255,0.08)!important;}
            ${M} [class*="userImage-"] img{border-radius:50%!important;border:1px solid rgba(255,255,255,0.15)!important;}
            ${M} [class*="username-"]{color:#fff!important;font-weight:700!important;}
            ${M} [class*="subjectUnread"]{color:${t.accent}!important;font-weight:700!important;}
            ${M} [class*="subject-0-2"]:not([class*="subjectUnread"]){color:#dfe3f0!important;}
            ${M} [class*="body-0-2"]{color:#9aa0c0!important;}
            ${M} [class*="divider-top"]{display:none!important;}
            /* action + pagination buttons → glass */
            ${M} button{background:rgba(255,255,255,0.06)!important;color:#e6e9f5!important;border:1px solid rgba(255,255,255,0.14)!important;border-radius:10px!important;transition:all 0.15s ease!important;}
            ${M} button:hover:not(:disabled){border-color:${t.accent}99!important;background:rgba(255,255,255,0.1)!important;transform:translateY(-1px)!important;}
            ${M} button:disabled{opacity:0.4!important;}
            /* checkboxes */
            ${M} input[type="checkbox"]{accent-color:${t.accent}!important;cursor:pointer!important;}
        `;
    };

    const isGamePage = () => /\/games\/\d+/i.test(location.pathname);
    const applyGamesHeroBackdrop = () => {
        let el = document.getElementById('pks-games-hero-style');
        if (!cfg.miscGamesHeroBackdrop || !isGamePage() || cfg.miscBgUrl?.trim()) { el?.remove(); return; }
        const tryApply = () => {
            const img = document.querySelector('[class*="carouselItem"] img, [class*="thumbContainer"] img, [class*="imageContainer"] img');
            const url = img?.src;
            if (!url) return false;
            if (!el) { el = document.createElement('style'); el.id = 'pks-games-hero-style'; document.head.appendChild(el); }
            el.textContent = `
                body::before{content:'';position:fixed;inset:-40px;z-index:0;background:url('${url.replace(/'/g, "\\'")}') center/cover no-repeat;filter:blur(38px) saturate(135%) brightness(0.55);transform:scale(1.1);pointer-events:none;}
                body::after{content:'';position:fixed;inset:0;z-index:0;background:linear-gradient(180deg,rgba(8,8,14,0.55),rgba(8,8,14,0.88))!important;pointer-events:none;}
                body>*{position:relative;z-index:1;}#pks-panel,#pks-watermark{z-index:2147483647!important;}
            `;
            return true;
        };
        if (tryApply()) return;
        let tries = 0;
        const obs = new MutationObserver(() => { if (tries++ > 120) { obs.disconnect(); return; } if (tryApply()) obs.disconnect(); });
        obs.observe(document.body, { childList: true, subtree: true });
    };

    const applyThemeToDom = () => {
        const t = getTheme();
        let styleEl = document.getElementById('pks-theme-style');
        if (!styleEl) { styleEl = document.createElement('style'); styleEl.id = 'pks-theme-style'; document.head.appendChild(styleEl); }
        styleEl.textContent = `
            #pks-panel input:focus, #pks-panel select:focus { border-color:${t.accent}!important;box-shadow:0 0 0 2px ${t.accent}22!important; }
            #pks-panel input[type=checkbox] { accent-color:${t.accent}; }
            .pks-tab-btn.active { background:${t.activeBg}!important;color:${t.activeText}!important;border-bottom:2px solid ${t.accent}!important; }
            #pks-r-dot.on { background:${t.accent}!important;box-shadow:0 0 8px ${t.accent}!important; }
            .pks-stat-val { color:${t.accent}!important; }
            #pks-panel input[type=text], #pks-panel input[type=number], #pks-panel select { background:${t.inputBg};border-color:${t.inputBorder};color:${t.valueText}; }
            #pks-panel { background:${t.panelBg};border-color:${t.border}; }
            #pks-header { background:${t.headerBg}; }
            #pks-tab-bar { background:${t.tabBarBg};border-bottom-color:${t.tabBorder}; }
            .pks-section-title { color:${t.sectionText}!important; }
            .pks-row label { color:${t.labelText}!important; }
            #pks-top-border { background:${t.topBorder}!important; }
            #pks-r-start.pks-action-btn { background:${t.accent}!important;color:#050508!important; }
            #pks-avatar-img { border-color:${t.accent}44!important; }
            .pks-currency-pill { border-color:${t.border}!important;background:${t.inputBg}!important; }
            .pks-stat { background:${t.inputBg}!important;border-color:${t.border}!important; }
            .pks-action-btn:hover { filter:brightness(1.2); }
            @keyframes pks-title-color { 0%{color:${t.accent}} 50%{color:${t.accentDim}} 100%{color:${t.accent}} }
            #pks-header-title { color:${t.accent};animation:pks-title-color 3s ease-in-out infinite; }
        `;
        updatePanelGlow();
        applyPanelAppearance();
        updateWatermarkTheme();
        applyCardStyle();
        applyMisc();
        applyTradeStyle();
    };

    const updatePanelGlow = () => {
        const panel = document.getElementById('pks-panel');
        if (!panel) return;
        const t = getTheme();
        panel.style.boxShadow = `0 14px 60px rgba(0,0,0,0.9),0 0 0 1px rgba(255,255,255,0.04),0 0 28px 4px ${t.glowColor},0 0 60px 8px ${t.glowColor.replace('0.18','0.07')}`;
    };

    const applyPanelAppearance = () => {
        const panel = document.getElementById('pks-panel');
        if (!panel) return;
        const t = getTheme();
        const header = document.getElementById('pks-header');
        const tabbar = document.getElementById('pks-tab-bar');
        panel.style.borderRadius = (cfg.panelRadius ?? 16) + 'px';

        if (cfg.panelGradientEnabled) {
            const c1 = cfg.panelGradientColor1 || '#0d0d12';
            const c2 = cfg.panelGradientColor2 || '#1a1830';
            panel.style.setProperty('background', `linear-gradient(160deg, ${c1}, ${c2})`, 'important');
            panel.style.removeProperty('backdrop-filter');
            panel.style.removeProperty('-webkit-backdrop-filter');
            header?.style.setProperty('background', 'transparent', 'important');
            tabbar?.style.setProperty('background', 'transparent', 'important');
            return;
        }
        header?.style.removeProperty('background');
        tabbar?.style.removeProperty('background');

        if (cfg.panelGlass) {
            const op   = (cfg.panelOpacity ?? 85) / 100;
            const blur = cfg.panelBlur ?? 14;
            const c    = hexToRgbObj(t.panelBg) || { r: 12, g: 12, b: 14 };
            panel.style.setProperty('background', `rgba(${c.r},${c.g},${c.b},${op})`, 'important');
            panel.style.setProperty('backdrop-filter', `blur(${blur}px) saturate(180%)`, 'important');
            panel.style.setProperty('-webkit-backdrop-filter', `blur(${blur}px) saturate(180%)`, 'important');
        } else {
            panel.style.removeProperty('background');
            panel.style.removeProperty('backdrop-filter');
            panel.style.removeProperty('-webkit-backdrop-filter');
        }
    };

    const state = {
        session:   { lastUrl: location.href, cachedCsrf: null },
        dom:       { observer: null, retryTimer: null },
        refresher: { running: false, clickTimer: null, reloadTimer: null, clicks: 0, reloads: 0 },
        profile:   { id: null, name: null, robux: 0, tickets: 0, avatar: null },
        watermark: { startTime: Date.now(), pingTimer: null, ping: null, dragX: null, dragY: null },
        authInfo:  {},
        authKey:   null,
        trade: {
            tradeTabActive: false,
            massModal: null,
            massBlastState: { myItems:[], mySelected:[], targetAssetId:null, targetOwners:[], sending:false, stopped:false, delaySeconds:20, logs:[] },
            massCustomState: { myItems:[], mySelected:[], targets:[], sending:false, logs:[] },
            assetThumbs: {},
            myUserId: null,
        }
    };

    let twMyItems = [], twTheirItems = [], twMySelected = [], twTheirSelected = [];
    let twMyPage = 0, twTheirPage = 0, twMySearch = '', twTheirSearch = '';
    const TW_PER_PAGE = 10, TW_MAX_SEL = 4;

    const isTradePage    = () => /\/My\/Trades/i.test(location.pathname) || /\/trade/i.test(location.pathname);
    const isTradeWindow  = () => /\/Trade\/TradeWindow/i.test(location.pathname);
    const isHomePage     = () => location.pathname === '/' || location.pathname.toLowerCase() === '/home';
    const isProfilePage  = () => /\/users\/\d+\/profile/i.test(location.pathname);

    let _csrfToken = null;
    const getCsrf = () => {
        const m = document.cookie.match(/rbxcsrf4=([^;]+)/);
        return m ? m[1] : _csrfToken || '';
    };

    const postApi = async (url, body = {}) => {
        let csrf = getCsrf();
        const doPost = async (token) => {
            const h = { 'Content-Type': 'application/json' };
            if (token) h['x-csrf-token'] = token;
            const r = await fetch(url, { method: 'POST', headers: h, credentials: 'include', body: JSON.stringify(body) });
            if (r.status === 403) {
                const t = r.headers.get('x-csrf-token');
                if (t && t !== token) { _csrfToken = t; return doPost(t); }
            }
            return r;
        };
        return doPost(csrf);
    };

    const apiGet = (url) => fetch(url, { credentials: 'include', headers: { Accept: 'application/json' } });

    const notify = (message, type = 'success') => {
        if (!cfg.showNotifications) return;
        const colors = {
            success: { bg:'#0d1f16', border:'#00e87a', accent:'#00e87a' },
            error:   { bg:'#1f0d0d', border:'#ff4466', accent:'#ff4466' },
            info:    { bg:'#0d1120', border:'#5b8cff', accent:'#5b8cff' },
            warning: { bg:'#1f1a0d', border:'#f0a500', accent:'#f0a500' },
        };
        const icons = {
            success: `<svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="2,6 5,9 10,3"/></svg>`,
            error:   `<svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="3" y1="3" x2="9" y2="9"/><line x1="9" y1="3" x2="3" y2="9"/></svg>`,
            info:    `<svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="6" y1="5" x2="6" y2="9"/><circle cx="6" cy="3" r="0.5" fill="currentColor"/></svg>`,
            warning: `<svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L10.5 10H1.5Z"/><line x1="6" y1="5.5" x2="6" y2="7.5"/></svg>`,
        };
        const c = colors[type] || colors.info;
        const icon = icons[type] || icons.info;
        const posStyles = {
            'top-center':    'top:16px;left:50%;transform:translateX(-50%);',
            'bottom-center': 'bottom:16px;left:50%;transform:translateX(-50%);',
            'top-right':     'top:16px;right:16px;',
            'bottom-right':  'bottom:16px;right:16px;',
        };
        const pos = posStyles[cfg.notificationPosition] || posStyles['top-center'];
        const existing = document.querySelectorAll('.pks-notif');
        existing.forEach((el, i) => {
            if (cfg.notificationPosition?.includes('bottom')) el.style.bottom = (16 + (existing.length - i) * 56) + 'px';
            else el.style.top = (16 + (existing.length - i) * 56) + 'px';
        });
        const el = document.createElement('div');
        el.className = 'pks-notif';
        el.style.cssText = `all:initial;position:fixed;${pos}z-index:2147483647;display:inline-flex;align-items:center;gap:9px;background:${c.bg};border:1px solid ${c.border};border-radius:10px;padding:10px 14px;width:auto;max-width:340px;white-space:nowrap;font-family:var(--pks-font),'Share Tech Mono',monospace;font-size:11px;color:#e0e0e0;box-shadow:0 0 18px ${c.border}33,0 4px 14px rgba(0,0,0,0.5);opacity:0;transition:opacity 0.2s,top 0.2s,bottom 0.2s;pointer-events:none;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);overflow:hidden;`;
        el.innerHTML = `<div style="width:20px;height:20px;border-radius:50%;border:1.5px solid ${c.accent};display:flex;align-items:center;justify-content:center;color:${c.accent};flex-shrink:0;">${icon}</div><span style="flex:1;line-height:1.3;white-space:normal;max-width:260px;">${message}</span><div style="width:2px;height:28px;border-radius:2px;background:${c.accent};flex-shrink:0;"></div>`;
        document.body.appendChild(el);
        requestAnimationFrame(() => requestAnimationFrame(() => { el.style.opacity = '1'; }));
        setTimeout(() => {
            el.style.opacity = '0';
            el.addEventListener('transitionend', () => el.remove(), { once: true });
        }, cfg.notificationDuration);
    };

    const notifyAnnounce = (message) => {
        document.getElementById('pks-announce-banner')?.remove();
        const t = getTheme();
        const DURATION = 10000;

        if (!document.getElementById('pks-announce-style')) {
            const st = document.createElement('style');
            st.id = 'pks-announce-style';
            st.textContent = `
                @keyframes pksAnnIn{0%{opacity:0;transform:translateX(-50%) translateY(-20px) scale(0.96);}100%{opacity:1;transform:translateX(-50%) translateY(0) scale(1);}}
                @keyframes pksAnnOut{0%{opacity:1;transform:translateX(-50%) translateY(0) scale(1);}100%{opacity:0;transform:translateX(-50%) translateY(-20px) scale(0.96);}}
                @keyframes pksAnnBar{0%{width:100%;}100%{width:0%;}}
                @keyframes pksAnnPulse{0%,100%{box-shadow:0 0 0 0 var(--pks-ann-accent)55;}50%{box-shadow:0 0 0 6px transparent;}}
                #pks-announce-banner .pks-ann-close:hover{background:var(--pks-ann-accent)!important;color:#fff!important;border-color:transparent!important;transform:rotate(90deg);}
            `;
            document.head.appendChild(st);
        }

        const el = document.createElement('div');
        el.id = 'pks-announce-banner';
        el.style.setProperty('--pks-ann-accent', t.accent);
        el.style.cssText += `all:initial;--pks-ann-accent:${t.accent};position:fixed;top:18px;left:50%;transform:translateX(-50%);z-index:2147483647;display:flex;align-items:center;gap:13px;`
            + `background:linear-gradient(135deg,rgba(18,18,30,0.72),rgba(10,10,20,0.6));`
            + `border:1px solid ${t.accent}55;border-radius:14px;padding:13px 16px 15px 15px;max-width:460px;min-width:280px;`
            + `font-family:var(--pks-font),'Share Tech Mono',monospace;font-size:12.5px;color:#eef0f8;`
            + `box-shadow:0 8px 40px rgba(0,0,0,0.55),0 0 0 1px rgba(255,255,255,0.04) inset,0 0 40px ${t.accent}22;`
            + `backdrop-filter:blur(22px) saturate(170%);-webkit-backdrop-filter:blur(22px) saturate(170%);`
            + `overflow:hidden;animation:pksAnnIn 0.45s cubic-bezier(0.22,1,0.36,1) both;`;

        el.innerHTML =
            `<div style="width:34px;height:34px;border-radius:11px;background:linear-gradient(135deg,${t.accent}33,${t.accent}11);border:1px solid ${t.accent}66;display:flex;align-items:center;justify-content:center;color:${t.accent};flex-shrink:0;animation:pksAnnPulse 2.4s ease-in-out infinite;">`
            +   `<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l9-5v9l-9-5z"/><path d="M3 8.5H1.7a.7.7 0 0 0-.7.7v.8c0 .4.3.7.7.7H3"/><path d="M4.5 11.2l.6 2.5a.8.8 0 0 0 1.5.1l.4-2"/></svg></div>`
            + `<div style="flex:1;line-height:1.45;white-space:normal;min-width:0;">`
            +   `<div style="color:${t.accent};font-size:8.5px;letter-spacing:0.18em;text-transform:uppercase;font-weight:700;margin-bottom:4px;opacity:0.9;">Announcement</div>`
            +   `<div style="color:#eef0f8;word-break:break-word;">${message}</div></div>`
            + `<div class="pks-ann-close" id="pks-announce-close" style="width:22px;height:22px;flex-shrink:0;align-self:flex-start;display:flex;align-items:center;justify-content:center;color:#9aa;font-size:11px;cursor:pointer;border:1px solid rgba(255,255,255,0.12);border-radius:7px;background:rgba(255,255,255,0.04);transition:all 0.22s cubic-bezier(0.22,1,0.36,1);">\u2715</div>`
            + `<div id="pks-announce-bar" style="position:absolute;left:0;bottom:0;height:2.5px;width:100%;background:linear-gradient(90deg,${t.accent},${t.accent}88);border-radius:0 0 14px 14px;animation:pksAnnBar ${DURATION}ms linear forwards;box-shadow:0 0 10px ${t.accent};"></div>`;

        document.body.appendChild(el);

        let done = false;
        const dismiss = () => {
            if (done) return; done = true;
            el.style.animation = 'pksAnnOut 0.35s cubic-bezier(0.4,0,1,1) both';
            el.addEventListener('animationend', () => el.remove(), { once: true });
        };
        document.getElementById('pks-announce-close')?.addEventListener('click', dismiss);
        setTimeout(dismiss, DURATION);
    };

    const fetchProfile = async () => {
        try {
            const userRes = await fetch('https://pekora.pro/apisite/users/v1/users/authenticated', { credentials:'include' });
            if (!userRes.ok) return;
            const user = await userRes.json();
            state.profile.id   = user.id;
            state.profile.name = user.displayName || user.name;
            state.trade.myUserId = user.id;
            const currRes = await fetch(`https://pekora.pro/apisite/economy/v1/users/${user.id}/currency`, { credentials:'include' });
            if (currRes.ok) { const curr = await currRes.json(); state.profile.robux = curr.robux ?? 0; state.profile.tickets = curr.tickets ?? 0; }
            updateProfileUI();
            updateWatermark();
        } catch {}
    };

    const updateProfileUI = () => {
        const nameEl   = document.getElementById('pks-profile-name');
        const robuxEl  = document.getElementById('pks-profile-robux');
        const ticketEl = document.getElementById('pks-profile-tickets');
        const avatarEl = document.getElementById('pks-avatar-img');
        const avatarX  = document.getElementById('pks-avatar-anon');
        const t        = getTheme();
        if (cfg.anonymous) {
            if (nameEl)   nameEl.textContent = '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022';
            if (robuxEl)  robuxEl.textContent = '\u2022\u2022\u2022';
            if (ticketEl) ticketEl.textContent = '\u2022\u2022\u2022';
            if (avatarEl) avatarEl.style.display = 'none';
            if (avatarX)  avatarX.style.display = 'flex';
        } else {
            if (nameEl)   nameEl.textContent = state.profile.name ?? '\u2014';
            if (robuxEl)  robuxEl.innerHTML  = `<span style="color:${t.accent};font-weight:700;">${(state.profile.robux ?? 0).toLocaleString()}</span>`;
            if (ticketEl) ticketEl.innerHTML = `<span style="color:#f0a500;font-weight:700;">${(state.profile.tickets ?? 0).toLocaleString()}</span>`;
            if (avatarEl) avatarEl.style.display = 'block';
            if (avatarX)  avatarX.style.display = 'none';
        }
    };

    const getWatermarkAccent = () => cfg.watermarkAccentColor?.trim() || getTheme().accent;

    const measurePing = async () => {
        try {
            const t0 = performance.now();
            await fetch('https://pekora.pro/apisite/users/v1/users/authenticated', { credentials:'include', cache:'no-store', signal:AbortSignal.timeout(5000) });
            state.watermark.ping = Math.round(performance.now() - t0);
        } catch { state.watermark.ping = null; }
        updateWatermark();
    };

    const formatSessionTime = () => {
        const ms = Date.now() - state.watermark.startTime;
        const s = Math.floor(ms / 1000), m = Math.floor(s / 60), h = Math.floor(m / 60);
        if (h > 0) return `${h}h ${m % 60}m`; if (m > 0) return `${m}m ${s % 60}s`; return `${s}s`;
    };

    const updateWatermark = () => {
        const wm = document.getElementById('pks-watermark');
        if (!wm) return;
        if (!cfg.watermarkEnabled) { wm.style.display = 'none'; return; }
        wm.style.display = '';
        const wmAccent = getWatermarkAccent();
        const scale = (cfg.watermarkScale ?? 100) / 100;
        const op    = (cfg.watermarkOpacity ?? 90) / 100;
        const parts = [{ text:'Grexium', logo:true }];
        if (cfg.watermarkShowTime) parts.push({ text:formatSessionTime() });
        if (cfg.watermarkShowPing) {
            const p = state.watermark.ping;
            const pingColor = p === null ? '#555' : p < 80 ? '#00e87a' : p < 200 ? '#f0a500' : '#ff4466';
            parts.push({ text:p !== null ? `${p}ms` : '\u2014ms', color:pingColor });
        }
        if (cfg.watermarkShowUser) parts.push({ text:cfg.anonymous ? '\u2022\u2022\u2022\u2022\u2022\u2022' : (state.profile.name || '\u2026') });
        wm.innerHTML = '';
        parts.forEach((p, i) => {
            if (i > 0) { const sep = document.createElement('span'); sep.textContent = '\u00b7'; sep.style.cssText = `color:rgba(255,255,255,0.15);margin:0 5px;font-size:${10 * scale}px;`; wm.appendChild(sep); }
            const span = document.createElement('span');
            span.textContent = p.text;
            span.style.cssText = p.logo ? `color:${wmAccent};font-weight:700;letter-spacing:0.1em;font-size:${10 * scale}px;` : `color:${p.color || 'rgba(255,255,255,0.5)'};font-size:${10 * scale}px;`;
            wm.appendChild(span);
        });
        let shimmer = wm.querySelector('.pks-wm-shimmer');
        if (!shimmer) { shimmer = document.createElement('div'); shimmer.className = 'pks-wm-shimmer'; wm.appendChild(shimmer); }
        shimmer.style.cssText = `position:absolute;bottom:0;left:0;width:100%;height:1px;background:linear-gradient(90deg,transparent,${wmAccent}99,transparent);animation:pks-wm-slide 2.5s linear infinite;`;
        if (state.watermark.dragX === null) {
            const positions = {
                'bottom-left':  'bottom:12px;left:12px;','bottom-right':'bottom:12px;right:12px;',
                'top-left':     'top:12px;left:12px;','top-right':'top:12px;right:420px;',
                'bottom-center':'bottom:12px;left:50%;transform:translateX(-50%);','top-center':'top:12px;left:50%;transform:translateX(-50%);',
            };
            const pos = positions[cfg.watermarkPosition] || positions['bottom-left'];
            wm.style.cssText = `all:initial;position:fixed;${pos}z-index:2147483640;display:flex;align-items:center;gap:0;font-family:var(--pks-font),'Share Tech Mono',monospace;font-weight:600;letter-spacing:0.06em;background:rgba(5,5,8,0.75);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.08);border-radius:6px;padding:${5*scale}px ${12*scale}px;pointer-events:auto;user-select:none;overflow:hidden;opacity:${op};cursor:grab;`;
        } else {
            wm.style.left = state.watermark.dragX + 'px'; wm.style.top = state.watermark.dragY + 'px';
            wm.style.opacity = String(op); wm.style.padding = `${5*scale}px ${12*scale}px`;
        }
    };

    const updateWatermarkTheme = () => updateWatermark();

    const buildWatermark = () => {
        let kf = document.getElementById('pks-wm-kf');
        if (!kf) { kf = document.createElement('style'); kf.id = 'pks-wm-kf'; kf.textContent = `@keyframes pks-wm-slide{0%{transform:translateX(-100%)}100%{transform:translateX(400%)}}`; document.head.appendChild(kf); }
        let wm = document.getElementById('pks-watermark');
        if (!wm) { wm = document.createElement('div'); wm.id = 'pks-watermark'; document.body.appendChild(wm); }
        let isDragging = false, dox = 0, doy = 0, dsx = 0, dsy = 0;
        wm.addEventListener('mousedown', (e) => {
            isDragging = true; const r = wm.getBoundingClientRect(); dox = r.left; doy = r.top; dsx = e.clientX; dsy = e.clientY; wm.style.cursor = 'grabbing'; e.preventDefault();
        });
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            state.watermark.dragX = dox + (e.clientX - dsx); state.watermark.dragY = doy + (e.clientY - dsy);
            wm.style.left = state.watermark.dragX + 'px'; wm.style.top = state.watermark.dragY + 'px'; wm.style.bottom = 'auto'; wm.style.right = 'auto'; wm.style.transform = 'none';
        });
        document.addEventListener('mouseup', () => { isDragging = false; wm.style.cursor = 'grab'; });
        updateWatermark();
        setInterval(updateWatermark, 1000);
        measurePing();
        state.watermark.pingTimer = setInterval(measurePing, 10000);
    };

    let _fxCanvas = null, _fxCtx = null, _fxRaf = null, _fxParticles = [], _fxCols = [], _fxResize = null, _fxLast = 0;
    const MATRIX_CHARS = 'アウエカキクケコサシスセソダツナニノハホマミムメモヤユヨリワ0123456789'.split('');

    const fxResolveColor = (type) => {
        if (cfg.effectColor?.trim()) return cfg.effectColor.trim();
        const t = getTheme();
        if (type === 'matrix') return t.accent;
        if (type === 'rain')   return '#9fc4ff';
        return '#ffffff';
    };

    const stopEffects = () => {
        if (_fxRaf) cancelAnimationFrame(_fxRaf);
        _fxRaf = null;
        if (_fxResize) { window.removeEventListener('resize', _fxResize); _fxResize = null; }
        if (_fxCanvas) { _fxCanvas.remove(); _fxCanvas = null; _fxCtx = null; }
        document.getElementById('pks-effects-style')?.remove();
        _fxParticles = []; _fxCols = [];
    };

    const fxInit = (type, w, h) => {
        _fxParticles = []; _fxCols = [];
        const intensity = Math.max(10, Math.min(100, cfg.effectIntensity ?? 50)) / 100;
        if (type === 'rain') {
            const n = Math.round(60 + intensity * 240);
            for (let i = 0; i < n; i++) _fxParticles.push({ x: Math.random()*w, y: Math.random()*h, len: 8+Math.random()*14, vy: 6+Math.random()*6, vx: -1-Math.random()*1.2 });
        } else if (type === 'snow') {
            const n = Math.round(40 + intensity * 160);
            for (let i = 0; i < n; i++) _fxParticles.push({ x: Math.random()*w, y: Math.random()*h, r: 1+Math.random()*2.5, vy: 0.4+Math.random()*1.1, phase: Math.random()*Math.PI*2, drift: 0.3+Math.random()*0.7 });
        } else if (type === 'stars') {
            const n = Math.round(50 + intensity * 200);
            for (let i = 0; i < n; i++) _fxParticles.push({ x: Math.random()*w, y: Math.random()*h, r: 0.5+Math.random()*1.6, phase: Math.random()*Math.PI*2, tw: 0.01+Math.random()*0.03 });
        } else if (type === 'matrix') {
            const fs = 14, cols = Math.ceil(w / fs);
            for (let i = 0; i < cols; i++) _fxCols.push({ y: (Math.random()*h)/fs, speed: 0.3+Math.random()*0.7 });
        }
    };

    const fxDraw = (type, dt) => {
        const ctx = _fxCtx, c = _fxCanvas;
        if (!ctx || !c) return;
        const w = c.width, h = c.height;
        const speed = Math.max(10, Math.min(100, cfg.effectSpeed ?? 50)) / 50;
        const color = fxResolveColor(type);
        ctx.clearRect(0, 0, w, h);
        if (type === 'rain') {
            ctx.strokeStyle = color; ctx.globalAlpha = 0.4; ctx.lineWidth = 1.1;
            ctx.beginPath();
            for (const p of _fxParticles) {
                ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + p.vx*2, p.y + p.len);
                p.y += p.vy * speed * dt; p.x += p.vx * speed * dt;
                if (p.y > h) { p.y = -p.len; p.x = Math.random()*w; }
                if (p.x < 0) p.x = w;
            }
            ctx.stroke(); ctx.globalAlpha = 1;
        } else if (type === 'snow') {
            ctx.fillStyle = color;
            for (const p of _fxParticles) {
                ctx.globalAlpha = 0.75;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
                p.phase += 0.02 * dt;
                p.y += p.vy * speed * dt; p.x += Math.sin(p.phase) * p.drift * speed * dt * 0.5;
                if (p.y > h) { p.y = -p.r; p.x = Math.random()*w; }
            }
            ctx.globalAlpha = 1;
        } else if (type === 'stars') {
            ctx.fillStyle = color;
            for (const p of _fxParticles) {
                p.phase += p.tw * dt * speed;
                ctx.globalAlpha = 0.25 + 0.6 * Math.abs(Math.sin(p.phase));
                ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
            }
            ctx.globalAlpha = 1;
        } else if (type === 'matrix') {
            const fs = 14;
            ctx.font = fs + 'px monospace'; ctx.textAlign = 'center';
            for (let i = 0; i < _fxCols.length; i++) {
                const col = _fxCols[i];
                const x = i * fs + fs/2, headY = col.y * fs;
                for (let k = 0; k < 6; k++) {
                    const yy = headY - k*fs;
                    if (yy < 0 || yy > h) continue;
                    ctx.globalAlpha = k === 0 ? 1 : Math.max(0, 0.5 - k*0.08);
                    ctx.fillStyle = k === 0 ? '#ffffff' : color;
                    ctx.fillText(MATRIX_CHARS[(Math.random()*MATRIX_CHARS.length)|0], x, yy);
                }
                col.y += col.speed * speed * 0.6 * dt;
                if (headY > h + 40) { col.y = Math.random()*-10; col.speed = 0.3+Math.random()*0.7; }
            }
            ctx.globalAlpha = 1;
        }
    };

    const applyEffects = () => {
        const type = cfg.effectType || 'none';
        stopEffects();
        if (type === 'none' || !document.body) return;
        const canvas = document.createElement('canvas');
        canvas.id = 'pks-effects-canvas';
        canvas.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:1;';
        document.body.insertBefore(canvas, document.body.firstChild);
        let fxStyle = document.getElementById('pks-effects-style');
        if (!fxStyle) { fxStyle = document.createElement('style'); fxStyle.id = 'pks-effects-style'; document.head.appendChild(fxStyle); }
        fxStyle.textContent = `body > *:not(#pks-effects-canvas):not(#pks-tr-overlay):not(#pks-tw-root){position:relative;z-index:2;} #pks-effects-canvas{z-index:1!important;}`;
        _fxCanvas = canvas; _fxCtx = canvas.getContext('2d');
        const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; fxInit(type, canvas.width, canvas.height); };
        resize(); _fxResize = resize; window.addEventListener('resize', resize);
        _fxLast = performance.now();
        const loop = (now) => {
            const dt = Math.min(3, (now - _fxLast) / 16.67); _fxLast = now;
            fxDraw(type, dt);
            _fxRaf = requestAnimationFrame(loop);
        };
        _fxRaf = requestAnimationFrame(loop);
    };

    let _larpTimer = null, _larpOriginals = null, _larpObserver = null, _larpScheduled = false;
    const ROBUX_SEL = '[class*="robuxContainer"] [class*="currencySpan"]';
    const TIX_SEL   = '[class*="tixContainer"] [class*="currencySpan"]';

    const formatLarp = (raw) => {
        const n = Math.max(0, Math.floor(Number(raw) || 0));
        if (n >= 1e6) {
            const m = Math.round((n / 1e6) * 10) / 10;
            return (Number.isInteger(m) ? String(m) : m.toFixed(1)) + 'M+';
        }
        return n.toLocaleString('en-US');
    };

    const applyLarpToNav = () => {
        const robEls = document.querySelectorAll(ROBUX_SEL);
        const tixEls = document.querySelectorAll(TIX_SEL);
        if (!robEls.length && !tixEls.length) return;
        if (_larpOriginals === null) {
            _larpOriginals = { robux: robEls[0]?.textContent ?? null, tix: tixEls[0]?.textContent ?? null };
        }
        const rob = formatLarp(cfg.larpRobux);
        const tix = formatLarp(cfg.larpTix);
        robEls.forEach(el => { if (el.textContent !== rob) el.textContent = rob; });
        tixEls.forEach(el => { if (el.textContent !== tix) el.textContent = tix; });
    };

    const restoreLarpNav = () => {
        if (!_larpOriginals) return;
        if (_larpOriginals.robux !== null) document.querySelectorAll(ROBUX_SEL).forEach(el => el.textContent = _larpOriginals.robux);
        if (_larpOriginals.tix   !== null) document.querySelectorAll(TIX_SEL).forEach(el => el.textContent = _larpOriginals.tix);
        _larpOriginals = null;
    };

    const getPurchaseItemInfo = () => {
        const nameEl = document.querySelector('[class*="itemHeaderContainer"] h2, h2[class*="itemName"], [class*="itemName"] h2');
        const name = nameEl?.textContent?.trim() || 'this item';
        const creatorEl = document.querySelector('[class*="itemHeaderInfo"] a[href*="User.aspx"], [class*="itemHeaderInfo"] a[href*="/users/"], [class*="creatorName"] a');
        const creator = creatorEl?.textContent?.trim() || 'ROBLOX';
        let thumb = '';
        if (name !== 'this item') {
            const m = [...document.querySelectorAll('img')].find(i => i.alt === name && /thumbnails|asset|cdn/i.test(i.src || ''));
            thumb = m?.src || '';
        }
        return { name, creator, thumb };
    };

    const handleBuyModal = () => {
        if (!cfg.larpEnabled) return;
        const header = document.querySelector('[class*="modalHeaderText"]');
        if (!header || !/Insufficient Funds/i.test(header.textContent || '')) return;
        const content = header.closest('[class*="modalContent"]') || document;
        const modalBody = content.querySelector('[class*="modalBody"]');
        const footer = content.querySelector('[class*="modalFooter"]');
        if (!modalBody || !footer) return;


        const neededEl = modalBody.querySelector('[class*="priceLabel"]');
        const needed = parseInt((neededEl?.textContent || '').replace(/[^\d]/g, '')) || 0;
        const realBal = parseInt((_larpOriginals?.robux ?? '').toString().replace(/[^\d]/g, ''));
        let price = !isNaN(realBal) ? realBal + needed : 0;
        if (!price) { const pe = document.querySelector('[class*="priceContainer"] [class*="priceLabel"]'); price = parseInt((pe?.textContent || '').replace(/[^\d]/g, '')) || needed; }
        const fake = Math.floor(Number(cfg.larpRobux) || 0);
        if (price <= 0 || fake < price) return;

        const info = getPurchaseItemInfo();
        header.textContent = 'Buy Item';


        const dialog = header.closest('[class*="modalDialog"]');
        if (dialog) {
            dialog.style.setProperty('position', 'fixed', 'important');
            dialog.style.setProperty('left', '50%', 'important');
            dialog.style.setProperty('top', '50%', 'important');
            dialog.style.setProperty('transform', 'translate(-50%, -50%)', 'important');
            dialog.style.setProperty('margin', '0', 'important');
            dialog.style.setProperty('z-index', '99999', 'important');
        }


        const span = modalBody.querySelector('[class*="spanText"]');
        const priceBlock = span?.querySelector('div');
        const priceLbl = priceBlock?.querySelector('[class*="priceLabel"]');
        if (priceLbl) priceLbl.textContent = price.toLocaleString('en-US');

        let afterBlock = null;
        if (priceBlock) {
            afterBlock = priceBlock.cloneNode(true);
            const aic = afterBlock.querySelector('[class*="icon-robux"]');
            if (aic) aic.className = aic.className.replace('icon-robux-16x16', 'icon-robux-gray-16x16');
            const alb = afterBlock.querySelector('[class*="priceLabel"]');
            if (alb) { alb.textContent = Math.max(0, fake - price).toLocaleString('en-US'); alb.style.color = 'rgb(184,184,184)'; }
        }

        if (span) {
            span.textContent = '';
            span.appendChild(document.createTextNode('Would you like to buy the '));
            const b = document.createElement('b'); b.style.padding = '0px 3px'; b.textContent = info.name;
            span.appendChild(b);
            span.appendChild(document.createTextNode(` from ${info.creator} for `));
            if (priceBlock) span.appendChild(priceBlock);
            span.appendChild(document.createTextNode('?'));
        }
        const img = modalBody.querySelector('img');
        if (img && info.thumb) {
            img.removeAttribute('srcset'); img.src = info.thumb; img.alt = info.name;

            img.style.cssText = 'width:55%;height:auto;padding:0;display:block;margin:0 auto;';
        }


        const buyBtn = footer.querySelector('[class*="newBuyButton"]');
        if (buyBtn && !buyBtn.dataset.pksBuy) {
            const cloneBtn = buyBtn.cloneNode(true);
            cloneBtn.textContent = 'Buy Now';
            cloneBtn.dataset.pksBuy = '1';
            buyBtn.replaceWith(cloneBtn);
            cloneBtn.addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                notify('Purchased ' + (info.name === 'this item' ? 'item' : info.name) + ' (visual only)', 'success');
                (footer.querySelector('[class*="newCancelButton"]') || content.querySelector('[class*="exitButton"]'))?.click();
            });
        }


        footer.querySelector('[data-pks-after]')?.remove();
        const afterSpan = document.createElement('span');
        afterSpan.setAttribute('data-pks-after', '1');
        afterSpan.className = 'flex flex-wrap align-items-center';
        afterSpan.style.cssText = 'margin-top:12px;color:rgb(184,184,184);';
        afterSpan.appendChild(document.createTextNode('Your balance after this transaction will be '));
        if (afterBlock) afterSpan.appendChild(afterBlock);
        else afterSpan.appendChild(document.createTextNode(Math.max(0, fake - price).toLocaleString('en-US')));
        footer.appendChild(afterSpan);
    };

    const applyLarp = () => {
        if (_larpTimer) { clearInterval(_larpTimer); _larpTimer = null; }
        if (_larpObserver) { _larpObserver.disconnect(); _larpObserver = null; }
        if (!cfg.larpEnabled) { restoreLarpNav(); return; }
        applyLarpToNav();
        handleBuyModal();
        const schedule = () => {
            if (_larpScheduled) return;
            _larpScheduled = true;
            requestAnimationFrame(() => { _larpScheduled = false; applyLarpToNav(); handleBuyModal(); });
        };
        _larpObserver = new MutationObserver(schedule);
        const root = document.documentElement || document.body;
        if (root) _larpObserver.observe(root, { childList: true, subtree: true, characterData: true });
        _larpTimer = setInterval(() => { applyLarpToNav(); handleBuyModal(); }, 700);
    };

    let _verifyTimer = null, _verifyObserver = null, _verifyScheduled = false;
    const VERIFY_SEL = 'h2[class*="username"], [class*="usernameContainer"] a[class*="username"]';

    let _myNames = null;
    const fetchMyNames = async () => {
        if (_myNames) return _myNames;
        try {
            const r = await apiGet('https://pekora.pro/apisite/users/v1/users/authenticated');
            const d = await r.json();
            _myNames = [d.name, d.displayName].filter(Boolean).map(s => String(s).trim().toLowerCase());
        } catch {}
        return _myNames;
    };
    const extractUsername = (el) => {
        const a = el.tagName === 'A' ? el : el.querySelector('a[href*="/users/"], a[href*="/User.aspx"]');
        if (a) return a.textContent.trim();
        const tn = [...el.childNodes].find(n => n.nodeType === 3 && n.textContent.trim());
        return (tn ? tn.textContent : el.textContent).trim();
    };

    const applyFakeVerifyToDom = () => {
        if (!cfg.larpVerify) return;
        const names = _myNames;
        if (!names || !names.length) return;
        document.querySelectorAll(VERIFY_SEL).forEach(el => {
            if (el.querySelector('[data-pks-verify]')) return;
            if (!names.includes(extractUsername(el).toLowerCase())) return;
            const textNode = [...el.childNodes].find(n => n.nodeType === 3 && n.textContent.trim());
            const ref = textNode ? textNode.nextSibling : null;
            const space = document.createTextNode(' ');
            const icon = document.createElement('span');
            icon.setAttribute('data-pks-verify', '1');
            icon.className = 'icon-verified';
            const isNav = el.tagName === 'A';
            icon.style.cssText = isNav
                ? 'display:inline-block;vertical-align:middle;transform:scale(0.62);transform-origin:left center;margin-left:-1px;'
                : 'display:inline-block;vertical-align:middle;';
            el.insertBefore(space, ref);
            el.insertBefore(icon, ref);
        });
    };
    const removeFakeVerify = () => {
        document.querySelectorAll('[data-pks-verify]').forEach(icon => {
            const prev = icon.previousSibling;
            if (prev && prev.nodeType === 3 && !prev.textContent.trim()) prev.remove();
            icon.remove();
        });
    };
    const applyFakeVerify = () => {
        if (_verifyTimer) { clearInterval(_verifyTimer); _verifyTimer = null; }
        if (_verifyObserver) { _verifyObserver.disconnect(); _verifyObserver = null; }
        if (!cfg.larpVerify) { removeFakeVerify(); return; }
        fetchMyNames().then(() => applyFakeVerifyToDom());
        applyFakeVerifyToDom();
        const schedule = () => {
            if (_verifyScheduled) return;
            _verifyScheduled = true;
            requestAnimationFrame(() => { _verifyScheduled = false; applyFakeVerifyToDom(); });
        };
        _verifyObserver = new MutationObserver(schedule);
        const root = document.documentElement || document.body;
        if (root) _verifyObserver.observe(root, { childList: true, subtree: true });
        _verifyTimer = setInterval(applyFakeVerifyToDom, 800);
    };

    const BADGE_DEFS = [
        { type: 'owner',     label: 'Owner' },
        { type: 'developer', label: 'Developer' },
        { type: 'admin',     label: 'Admin' },
        { type: 'staff',     label: 'Staff' },
        { type: 'featured',  label: 'Featured' },
        { type: 'beta',      label: 'Beta Tester' },
        { type: 'hexium',    label: 'Grexium developer' },
    ];
    const BADGE_LABEL = Object.fromEntries(BADGE_DEFS.map(b => [b.type, b.label]));
    const BADGE_ORDER = Object.fromEntries(BADGE_DEFS.map((b, i) => [b.type, i]));

    let _badgeProfileId = null;
    let _badgeList = undefined;
    let _badgeFetching = false;

    const profileId = () => { const m = location.pathname.match(/\/users\/(\d+)/); return m ? m[1] : null; };

    let _badgeTip = null, _badgeTipStyled = false;
    const ensureBadgeStyles = () => {
        if (_badgeTipStyled) return;
        _badgeTipStyled = true;
        const st = document.createElement('style');
        st.id = 'pks-badge-tip-style';
        st.textContent = `
            .pks-badge-bar{position:absolute;top:12px;left:50%;transform:translateX(-50%);z-index:1000;
                display:inline-flex;align-items:center;gap:6px;padding:6px 10px;
                background:rgba(255,255,255,0.045);backdrop-filter:blur(20px) saturate(150%);-webkit-backdrop-filter:blur(20px) saturate(150%);
                border:1px solid rgba(255,255,255,0.10);border-radius:14px;
                box-shadow:0 8px 24px rgba(0,0,0,0.28);}
            .pks-badge-bar .pks-badge{height:32px;width:auto;display:block;border-radius:5px;cursor:default;flex:none;}
            #pks-badge-tip{position:fixed;z-index:2147483647;pointer-events:none;
                background:rgba(12,12,20,0.97);color:#fff;font:600 12px/1.4 'Share Tech Mono',system-ui,sans-serif;
                padding:5px 9px;border-radius:8px;border:1px solid rgba(255,255,255,0.16);
                box-shadow:0 8px 24px rgba(0,0,0,0.5);white-space:nowrap;letter-spacing:0.02em;
                opacity:0;transition:opacity 0.12s ease;}
            #pks-badge-tip.show{opacity:1;}`;
        document.head.appendChild(st);
    };
    const badgeTipEl = () => {
        ensureBadgeStyles();
        if (!_badgeTip || !_badgeTip.isConnected) {
            _badgeTip = document.createElement('div');
            _badgeTip.id = 'pks-badge-tip';
            document.body.appendChild(_badgeTip);
        }
        return _badgeTip;
    };
    const showBadgeTip = (el, label) => {
        const tip = badgeTipEl();
        tip.textContent = label;
        tip.classList.add('show');
        const r = el.getBoundingClientRect();
        let left = Math.round(r.left + r.width / 2 - tip.offsetWidth / 2);
        left = Math.max(6, Math.min(left, window.innerWidth - tip.offsetWidth - 6));
        let top = Math.round(r.top - tip.offsetHeight - 9);
        if (top < 6) top = Math.round(r.bottom + 9);
        tip.style.left = left + 'px';
        tip.style.top  = top + 'px';
    };
    const hideBadgeTip = () => { if (_badgeTip) _badgeTip.classList.remove('show'); };

    const makeBadgeImg = (type) => {
        const label = BADGE_LABEL[type];
        const img = document.createElement('img');
        img.className = 'pks-badge';
        img.src = `${BADGE_BASE}${type}.png`;
        img.alt = label; img.title = label;
        img.addEventListener('mouseenter', () => showBadgeTip(img, label));
        img.addEventListener('mouseleave', hideBadgeTip);
        return img;
    };

    // headerCard removed — badges now render inline below the username h2.

    const renderProfileBadges = () => {
        const id = profileId();
        if (!id || id !== _badgeProfileId || !Array.isArray(_badgeList)) return;

        const _myId = String((state.authInfo && state.authInfo.pekoraId) || getAuthSession() || '');
        let _bl = _badgeList;
        if (cfg.hideHexBadge && id && id === _myId) _bl = _bl.filter(t => t !== 'hexium');
        const ordered = [...new Set(_bl)]
            .filter(t => BADGE_ORDER[t] !== undefined)
            .sort((a, b) => BADGE_ORDER[a] - BADGE_ORDER[b]);

        // Remove any old inline badge rows
        document.querySelectorAll('.pks-badge-inline-row').forEach(el => el.remove());
        // Remove old floating bar
        document.querySelectorAll('.pks-badge-bar').forEach(el => el.remove());

        if (!ordered.length) return;

        // Find the username h2 and inject badges on the same line below it
        const h = document.querySelector('h2[class*="username"]');
        if (!h) return;

        ensureBadgeStyles();

        // Build an inline row of badge pills right below the username
        const row = document.createElement('div');
        row.className = 'pks-badge-inline-row';
        row.style.cssText = `
            display:inline-flex;align-items:center;gap:5px;flex-wrap:wrap;
            margin-top:6px;padding:4px 8px;
            background:rgba(255,255,255,0.04);
            backdrop-filter:blur(16px) saturate(150%);
            -webkit-backdrop-filter:blur(16px) saturate(150%);
            border:1px solid rgba(255,255,255,0.09);
            border-radius:10px;
        `;

        ordered.forEach(type => {
            const label = BADGE_LABEL[type];
            const pill = document.createElement('div');
            pill.style.cssText = `
                display:inline-flex;align-items:center;gap:5px;
                padding:3px 8px;border-radius:6px;
                background:rgba(255,255,255,0.06);
                border:1px solid rgba(255,255,255,0.12);
                cursor:default;transition:background 0.15s,border-color 0.15s;
            `;
            pill.addEventListener('mouseenter', () => {
                pill.style.background = 'rgba(255,255,255,0.12)';
                pill.style.borderColor = 'rgba(255,255,255,0.25)';
            });
            pill.addEventListener('mouseleave', () => {
                pill.style.background = 'rgba(255,255,255,0.06)';
                pill.style.borderColor = 'rgba(255,255,255,0.12)';
            });

            const img = document.createElement('img');
            img.src = `${BADGE_BASE}${type}.png`;
            img.alt = label;
            img.style.cssText = 'width:14px;height:14px;object-fit:contain;display:block;';
            img.onerror = () => { img.style.display = 'none'; };

            const txt = document.createElement('span');
            txt.textContent = label;
            txt.style.cssText = `
                color:rgba(255,255,255,0.75);
                font-family:'Share Tech Mono',monospace;
                font-size:10px;font-weight:700;
                letter-spacing:0.06em;white-space:nowrap;
            `;

            pill.appendChild(img);
            pill.appendChild(txt);
            pill.addEventListener('mouseenter', () => showBadgeTip(pill, label));
            pill.addEventListener('mouseleave', hideBadgeTip);
            row.appendChild(pill);
        });

        // Insert the row right after the h2
        if (h.nextSibling) {
            h.parentElement.insertBefore(row, h.nextSibling);
        } else {
            h.parentElement.appendChild(row);
        }
    };

    const fetchProfileBadges = () => {
        const id = profileId();
        if (!id) return;
        if (id === _badgeProfileId && Array.isArray(_badgeList)) return;
        _badgeProfileId = id;
        _badgeList = null; // loading state

        fetch(`${GREXIUM_WORKER_URL}/badges?id=${encodeURIComponent(id)}`, {
            headers: { accept: 'application/json' },
        })
            .then(r => r.ok ? r.json() : Promise.reject('HTTP ' + r.status))
            .then(d => {
                if (id !== profileId()) return; // navigated away
                _badgeList = Array.isArray(d.badges) ? d.badges : [];
                renderProfileBadges();
            })
            .catch(() => {
                if (id !== profileId()) return;
                _badgeList = [];
                renderProfileBadges();
            });
    };

    const applyBadges = () => {
        if (!profileId()) return;
        fetchProfileBadges();
        renderProfileBadges();
    };

    const myPekoraId = () => String((state.authInfo && state.authInfo.pekoraId) || getAuthSession() || '');

    const getProfileFrame = () => {
        const h = document.querySelector('h2[class*="username"]');
        if (!h) return null;
        return h.closest('[class*="cardBody-0-2-"]') || h.closest('[class*="card-0-2-"]') || null;
    };

    const applyProfileBanner = (data) => {
        const frame = getProfileFrame();
        if (!frame) return;
        let layer = frame.querySelector(':scope > .pks-prof-banner');
        if (!data || !data.img) { if (layer) layer.remove(); return; }
        if (getComputedStyle(frame).position === 'static') frame.style.position = 'relative';
        if (!layer) {
            layer = document.createElement('div');
            layer.className = 'pks-prof-banner';
            layer.style.cssText = 'position:absolute;inset:0;z-index:0;border-radius:inherit;overflow:hidden;pointer-events:none;';
            frame.insertBefore(layer, frame.firstChild);
        }
        Array.from(frame.children).forEach(c => {
            if (c === layer) return;
            if (getComputedStyle(c).position === 'static') c.style.position = 'relative';
            c.style.zIndex = '1';
        });
        const img    = String(data.img).replace(/'/g, "\\'");
        const blur   = Math.max(0, Math.min(40, +data.blur || 0));
        const bright = Math.max(30, Math.min(150, +data.bright || 100)) / 100;
        const tint   = /^#[0-9a-fA-F]{6}$/.test(data.tint || '') ? data.tint : '#000000';
        const tint2  = /^#[0-9a-fA-F]{6}$/.test(data.tint2 || '') ? data.tint2 : tint;
        const angle  = Math.max(0, Math.min(360, +data.tintAngle || 135));
        const grad   = !!data.tintGradient;
        const tintBg = grad ? `linear-gradient(${angle}deg, ${tint}, ${tint2})` : tint;
        const tintOp = Math.max(0, Math.min(100, +data.tintOp || 0)) / 100;
        const sig = `${img}|${blur}|${bright}|${tint}|${tint2}|${angle}|${grad}|${tintOp}`;
        if (layer.getAttribute('data-sig') === sig) return;
        layer.setAttribute('data-sig', sig);
        layer.innerHTML = `
            <div style="position:absolute;inset:-${blur * 2 + 2}px;background-image:url('${img}');background-size:cover;background-position:center;filter:blur(${blur}px) brightness(${bright});"></div>
            <div style="position:absolute;inset:0;background:${tintBg};opacity:${tintOp};"></div>`;
    };

    let _bannerFetchedId = null, _bannerFetchedData = null;
    const localBannerData = () => (cfg.profileBannerEnabled && cfg.profileBannerImage) ? {
        img: cfg.profileBannerImage, blur: cfg.profileBannerBlur, tint: cfg.profileBannerTint,
        tintOp: cfg.profileBannerTintOpacity, bright: cfg.profileBannerBrightness,
        tint2: cfg.profileBannerTint2, tintGradient: cfg.profileBannerTintGradient, tintAngle: cfg.profileBannerTintAngle,
    } : null;

    const applyProfileBannerForPage = () => {
        const id = profileId();
        if (!id) return;

        // Own profile → use local config
        if (id === myPekoraId()) {
            applyProfileBanner(localBannerData());
            return;
        }

        // Already fetched for this profile → apply cached result
        if (id === _bannerFetchedId) {
            applyProfileBanner(_bannerFetchedData);
            return;
        }

        // Fetch from worker
        _bannerFetchedId = id;
        _bannerFetchedData = null;
        fetch(`${GREXIUM_WORKER_URL}/profile?id=${encodeURIComponent(id)}`, {
            headers: { accept: 'application/json' },
        })
            .then(r => r.ok ? r.json() : Promise.reject('HTTP ' + r.status))
            .then(d => {
                if (id !== profileId()) return; // navigated away
                _bannerFetchedData = (d && d.data) ? d.data : null;
                applyProfileBanner(_bannerFetchedData);
            })
            .catch(() => {});
    };

    const saveProfileBanner = async (btn) => {
        const myId = myPekoraId();
        if (!myId) { notify('Not logged in yet — reload and try again.', 'error'); return; }

        const statusEl = document.getElementById('pks-hex-save-status');
        const setStatus = (msg, color = '#555') => { if (statusEl) { statusEl.textContent = msg; statusEl.style.color = color; } };

        if (btn) { btn.disabled = true; btn.textContent = 'Saving\u2026'; }
        setStatus('Applying locally\u2026');

        // Apply locally immediately
        cfg.profileBannerEnabled = true;
        saveCfg(cfg);
        const en = document.getElementById('cfg-profileBannerEnabled');
        if (en) en.checked = true;
        applyProfileBannerForPage();

        // Push to worker
        const data = localBannerData();
        if (data && GREXIUM_WORKER_URL && !GREXIUM_WORKER_URL.includes('YOUR_SUBDOMAIN')) {
            setStatus('Saving to server\u2026');
            try {
                const r = await fetch(`${GREXIUM_WORKER_URL}/profile`, {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ id: myId, data }),
                });
                const d = await r.json().catch(() => ({}));
                if (d.ok) {
                    setStatus('\u2713 Saved — visible to all Grexium users', '#00e87a');
                    notify('Banner saved to server!', 'success');
                } else {
                    setStatus('\u26a0 Server error: ' + (d.error || 'unknown'), '#f0a500');
                }
            } catch (e) {
                setStatus('\u26a0 Could not reach server — saved locally only', '#f0a500');
            }
        } else {
            setStatus('\u2713 Applied locally (configure GREXIUM_WORKER_URL to share)', '#00e87a');
            notify('Banner applied!', 'success');
        }

        if (btn) { btn.disabled = false; btn.textContent = '\u21ba Apply & Save'; }
    };

    let _modalFixedEls = [];
    const fixGameModal = () => {
        const modal = document.querySelector('[class*="modalWrapper"]');
        if (modal) {
            modal.style.setProperty('position', 'fixed', 'important');
            modal.style.setProperty('top', '50%', 'important');
            modal.style.setProperty('left', '50%', 'important');
            modal.style.setProperty('right', 'auto', 'important');
            modal.style.setProperty('bottom', 'auto', 'important');
            modal.style.setProperty('margin', '0', 'important');
            modal.style.setProperty('transform', 'translate(-50%, -50%)', 'important');
            modal.style.setProperty('z-index', '2147483647', 'important');
            for (let el = modal.parentElement; el && el !== document.body && el.nodeType === 1; el = el.parentElement) {
                if (el.hasAttribute('data-pks-modalfix')) continue;
                const cs = getComputedStyle(el);
                const traps = cs.transform !== 'none' || cs.perspective !== 'none' || cs.filter !== 'none'
                    || (cs.backdropFilter && cs.backdropFilter !== 'none')
                    || /transform|perspective|filter/.test(cs.willChange || '')
                    || /paint|layout|strict|content/.test(cs.contain || '');
                if (!traps) continue;
                el.setAttribute('data-pks-modalfix', '1');
                ['transform', 'perspective', 'filter', 'backdrop-filter', '-webkit-backdrop-filter'].forEach(p => el.style.setProperty(p, 'none', 'important'));
                el.style.setProperty('will-change', 'auto', 'important');
                el.style.setProperty('contain', 'none', 'important');
                _modalFixedEls.push(el);
            }
        } else if (_modalFixedEls.length) {
            _modalFixedEls.forEach(el => {
                el.removeAttribute('data-pks-modalfix');
                ['transform', 'perspective', 'filter', 'backdrop-filter', '-webkit-backdrop-filter', 'will-change', 'contain'].forEach(p => el.style.removeProperty(p));
            });
            _modalFixedEls = [];
        }
    };

    const applyCardStyle = () => {
        let cs = document.getElementById('pks-card-style');
        if (!cs) { cs = document.createElement('style'); cs.id = 'pks-card-style'; document.head.appendChild(cs); }
        if (!cfg.miscModernGameCards && !cfg.miscCatalogItemCards) { cs.textContent = ''; return; }
        const t = getTheme();
        let cssOut = '';
        if (cfg.miscModernGameCards) {
            cssOut += `.gameCardContainer-0-2-207,[class*="gameCardContainer"]{background:rgba(12,12,18,0.9)!important;border-radius:14px!important;border:1px solid ${t.cardBorder}!important;box-shadow:${t.cardGlow}!important;transition:border-color 0.22s,box-shadow 0.22s,transform 0.18s!important;overflow:hidden!important;}.gameCardContainer-0-2-207:hover,[class*="gameCardContainer"]:hover{border-color:${t.cardHoverBorder}!important;box-shadow:${t.cardHoverGlow}!important;transform:translateY(-3px)!important;z-index:2!important;}`;
        }
        if (cfg.miscCatalogItemCards) {
            cssOut += `
                div[class*="imageBig"],div[class*="imageSmall"]{max-width:none!important;background:rgba(255,255,255,0.045)!important;backdrop-filter:blur(13px) saturate(160%)!important;-webkit-backdrop-filter:blur(13px) saturate(160%)!important;border:1px solid rgba(255,255,255,0.12)!important;border-radius:16px!important;box-shadow:0 8px 28px rgba(0,0,0,0.28)!important;padding:10px!important;overflow:hidden!important;transition:transform 0.16s ease,box-shadow 0.16s ease,border-color 0.16s ease!important;}
                div[class*="imageBig"]:hover,div[class*="imageSmall"]:hover{transform:translateY(-5px)!important;box-shadow:0 16px 44px rgba(0,0,0,0.45)!important;border-color:${t.accent}77!important;}
                div[class*="imageBig"] img:not([class*="overlay"]),div[class*="imageSmall"] img:not([class*="overlay"]){border:none!important;border-radius:12px!important;background:transparent!important;}
                [class*="overviewDetails"]{background:linear-gradient(to top,rgba(0,0,0,0.82),rgba(0,0,0,0.12),transparent)!important;border-radius:0 0 12px 12px!important;padding:16px 8px 6px!important;}
                [class*="itemName"]{color:#fff!important;font-weight:700!important;text-shadow:0 1px 3px rgba(0,0,0,0.65)!important;}
                [class*="overviewDetails"] p{color:#e3e8ff!important;}
                [class*="detailsWrapper"]{background:rgba(12,12,20,0.9)!important;backdrop-filter:blur(16px) saturate(160%)!important;-webkit-backdrop-filter:blur(16px) saturate(160%)!important;border:1px solid ${t.accent}55!important;border-radius:12px!important;box-shadow:0 12px 32px rgba(0,0,0,0.5)!important;color:#fff!important;}
                [class*="detailsKey"]{color:#9aa0c0!important;}
                [class*="detailsValue"]{color:#fff!important;}
                [class*="detailsValue"] a,[class*="detailsWrapper"] a{color:${t.accent}!important;}
            `;
            const catDark = darkenHex(t.accent, 0.6);
            cssOut += `
                [class*="catalogContainer"]{background:transparent!important;}
                [class*="catalogContainer"] h1,[class*="catalogContainer"] h2,[class*="catalogContainer"] [class*="bottom-0-2"],[class*="catalogContainer"] [class*="top-0-2"]{color:#fff!important;}
                [class*="catalogContainer"] h3,[class*="catalogContainer"] label,[class*="catalogContainer"] summary,[class*="catalogContainer"] p,[class*="catalogContainer"] [class*="sortByLabel"]{color:#dfe3f0!important;}
                [class*="catalogContainer"] a{color:${t.accent}!important;}
                [class*="catalogContainer"] input[type="text"],[class*="catalogContainer"] select{background:rgba(255,255,255,0.06)!important;border:1px solid rgba(255,255,255,0.14)!important;border-radius:8px!important;color:#fff!important;padding:5px 9px!important;}
                [class*="catalogContainer"] select option{background:#16161f!important;color:#fff!important;}
                [class*="catalogContainer"] [class*="caret-0-2"]{background:transparent!important;border:none!important;color:#fff!important;}
                [class*="catalogContainer"] .buttons_legacyButton__vUgL2,[class*="catalogContainer"] [class*="button-0-2"]:not([class*="favoriteButton"]):not([class*="followButton"]):not([class*="purchaseButton"]):not([class*="buyButton"]){background:linear-gradient(135deg,${t.accent},${catDark})!important;border:none!important;color:#050508!important;border-radius:8px!important;font-weight:700!important;transition:filter 0.15s ease!important;}
                [class*="catalogContainer"] .buttons_legacyButton__vUgL2:hover,[class*="catalogContainer"] [class*="button-0-2"]:not([class*="favoriteButton"]):not([class*="followButton"]):not([class*="purchaseButton"]):not([class*="buyButton"]):hover{filter:brightness(1.12)!important;color:#050508!important;}
                [class*="catalogContainer"] [class*="itemDiv-0-2"]{background:rgba(255,255,255,0.04)!important;border:1px solid rgba(255,255,255,0.08)!important;border-radius:8px!important;margin-bottom:4px!important;padding:2px 8px!important;transition:background 0.15s ease,border-color 0.15s ease!important;}
                [class*="catalogContainer"] [class*="itemDiv-0-2"]:hover{background:${t.accent}1f!important;border-color:${t.accent}66!important;}
                [class*="catalogContainer"] [class*="separator-0-2"]{border-color:rgba(255,255,255,0.1)!important;background:rgba(255,255,255,0.1)!important;}
                [class*="catalogContainer"] [class*="divider-right"]{border-color:rgba(255,255,255,0.1)!important;}
                [class*="catalogContainer"] [class*="wrapper-0-2"]:not([class*="itemActionContainer"]):not([class*="purchaseContainer"]):not([class*="favoriteContainer"]){background:rgba(255,255,255,0.04)!important;backdrop-filter:blur(12px) saturate(150%)!important;-webkit-backdrop-filter:blur(12px) saturate(150%)!important;border:1px solid rgba(255,255,255,0.1)!important;border-radius:12px!important;padding:10px!important;}
            `;
        }
        cs.textContent = cssOut;
    };

    const applyTradeStyle = () => {
        if (!isTradePage()) return;
        let el = document.getElementById('pks-trade-style');
        if (!el) { el = document.createElement('style'); el.id = 'pks-trade-style'; document.head.appendChild(el); }
        const t = getTheme();
        el.textContent = `
            .container-0-2-9{max-width:1100px!important;}
            .offerRequestCard-0-2-6{background:rgba(10,10,16,0.85)!important;border:1px solid ${t.border}!important;border-radius:14px!important;padding:16px!important;box-shadow:0 8px 32px rgba(0,0,0,0.5)!important;backdrop-filter:blur(8px)!important;}
            .amount-0-2-100{color:${t.accent}!important;font-weight:700!important;font-size:13px!important;}
            .sendButton-0-2-8{background:${t.accent}!important;color:#050508!important;border:none!important;border-radius:9px!important;padding:12px 24px!important;font-family:var(--pks-font),'Share Tech Mono',monospace!important;font-size:12px!important;font-weight:700!important;letter-spacing:0.12em!important;cursor:pointer!important;width:100%!important;box-shadow:0 4px 20px ${t.accent}44!important;text-transform:uppercase!important;}
            .itemCard-0-2-107{background:rgba(10,10,18,0.88)!important;border:1px solid ${t.cardBorder}!important;border-radius:10px!important;overflow:hidden!important;cursor:pointer!important;transition:border-color 0.2s,box-shadow 0.2s,transform 0.15s!important;}
            .itemCard-0-2-107:hover{border-color:${t.cardHoverBorder}!important;box-shadow:${t.cardHoverGlow}!important;transform:translateY(-2px)!important;}
        `;
    };

    let _tradeWindowInjected = false;
    let _tradesPageInjected = false;
    let _tradesInjecting = false;
    let _tradesClosed = false;
    let _tradesRepaint = null;

    const escHtml = (s) => {
        const d = document.createElement('div');
        d.textContent = String(s ?? '');
        return d.innerHTML;
    };

    const fmtNum = (n) => {
        if (n >= 1e6) return (n/1e6).toFixed(1).replace(/\.0$/,'') + 'M';
        if (n >= 1e3) return (n/1e3).toFixed(1).replace(/\.0$/,'') + 'K';
        return n.toLocaleString();
    };

    const injectTradeWindow = async () => {
        if (_tradeWindowInjected) return;
        if (!isTradeWindow()) return;
        _tradeWindowInjected = true;

        if (!document.getElementById('pks-tw-font-link')) {
            const lnk = document.createElement('link');
            lnk.id = 'pks-tw-font-link';
            lnk.rel = 'stylesheet';
            lnk.href = 'https://fonts.googleapis.com/css2?family=Source+Sans+Pro:wght@400;600;700;900&display=swap';
            document.head.appendChild(lnk);
        }

        const params = new URLSearchParams(location.search);
        const partnerId = params.get('TradePartnerID');
        const tradeSessionId = params.get('TradeSessionId');

        const koromonsP = getKoromonsData();
        const profileP  = state.trade.myUserId ? Promise.resolve() : fetchProfile();
        const partnerP  = partnerId
            ? fetch(`https://pekora.pro/apisite/users/v1/users/${partnerId}`, { credentials:'include' })
                .then(r => r.json()).then(d => d.displayName || d.name || 'Trade Partner').catch(() => 'Trade Partner')
            : Promise.resolve('Trade Partner');
        const settleP   = new Promise(r => setTimeout(r, 600));

        await Promise.all([koromonsP, profileP, settleP]);
        if (!isTradeWindow()) return;

        const myId = state.trade.myUserId;
        if (!myId || !partnerId) return;

        const partnerName = await partnerP;

        const COIN = (sz, col) => `<img src="https://raw.githubusercontent.com/Menwey/hexium-crack/main/robuxicon.png" width="${sz}" height="${sz}" style="display:inline-block;vertical-align:middle;flex:none;object-fit:contain;" alt="R$">`;
        const STAR = (sz, col) => `<svg width="${sz}" height="${sz}" viewBox="0 0 24 24" fill="${col||'#c4c4c4'}" style="display:inline-block;vertical-align:middle;flex:none;"><path d="M12 0 L14.3 9.7 L24 12 L14.3 14.3 L12 24 L9.7 14.3 L0 12 L9.7 9.7 Z"/></svg>`;
        const thumbUrl = (assetId) => `https://pekora.pro/thumbs/asset.ashx?assetId=${assetId}&width=110&height=110&format=png`;
        const CHEVRON = encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9a9a9a" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>');
        const CAT_OPTIONS = `<option value="null">All Items</option><option value="8">Hats</option><option value="41">Hair</option><option value="42">Face Accessory</option><option value="43">Neck</option><option value="44">Shoulder</option><option value="45">Front</option><option value="46">Back</option><option value="47">Waist</option><option value="19">Gear</option><option value="18">Faces</option>`;

        if (!document.getElementById('pks-tw-styles')) {
            const s = document.createElement('style');
            s.id = 'pks-tw-styles';
            s.textContent = `
                @font-face{font-family:'Builder Sans';font-weight:400;font-style:normal;font-display:swap;src:url('https://cdn.jsdelivr.net/gh/Shuiux/Roblox-Builder-Fonts@main/fonts/BuilderSans/BuilderSans-Regular-400.otf') format('opentype');}
                @font-face{font-family:'Builder Sans';font-weight:600;font-style:normal;font-display:swap;src:url('https://cdn.jsdelivr.net/gh/Shuiux/Roblox-Builder-Fonts@main/fonts/BuilderSans/BuilderSans-SemiBold-600.otf') format('opentype');}
                @font-face{font-family:'Builder Sans';font-weight:700;font-style:normal;font-display:swap;src:url('https://cdn.jsdelivr.net/gh/Shuiux/Roblox-Builder-Fonts@main/fonts/BuilderSans/BuilderSans-Bold-700.otf') format('opentype');}
                @font-face{font-family:'Builder Sans';font-weight:800;font-style:normal;font-display:swap;src:url('https://cdn.jsdelivr.net/gh/Shuiux/Roblox-Builder-Fonts@main/fonts/BuilderSans/BuilderSans-ExtraBold-800.otf') format('opentype');}
                #pks-tw-root, #pks-tw-root *{box-sizing:border-box;font-family:'Builder Sans','Source Sans Pro',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;}
                #pks-tw-root input[type=number]{-moz-appearance:textfield;}
                #pks-tw-root input[type=number]::-webkit-outer-spin-button,#pks-tw-root input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;margin:0;}
                .pks-tw-back{color:#9a9a9a;font-size:16px;text-decoration:none;display:inline-flex;align-items:center;gap:7px;}
                .pks-tw-back:hover{color:#d0d0d0;text-decoration:none;}
                .pks-tw-title{color:#fff;font-size:32px;font-weight:700;margin:10px 0 0;letter-spacing:-0.01em;}
                .pks-tw-h2{color:#fff;font-size:22px;font-weight:700;margin:0;}
                .pks-tw-select{appearance:none;-webkit-appearance:none;-moz-appearance:none;background-color:#2a2a2a;background-image:url("data:image/svg+xml,${CHEVRON}");background-repeat:no-repeat;background-position:right 13px center;border:none;border-radius:8px;color:#cfcfcf;font-size:15px;padding:11px 40px 11px 15px;min-width:240px;cursor:pointer;outline:none;}
                .pks-tw-select option{background:#2a2a2a;color:#cfcfcf;}
                .pks-tw-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:16px 10px;}
                .pks-tw-card{cursor:pointer;border-radius:10px;padding:7px 7px 10px;transition:background .12s;}
                .pks-tw-card:hover{background:#202022;}
                .pks-tw-card.selected .pks-tw-thumb::after{content:'';position:absolute;inset:0;background:rgba(0,0,0,.45);pointer-events:none;}
                .pks-tw-card.maxed{opacity:.32;cursor:not-allowed;pointer-events:none;}
                .pks-tw-thumb{position:relative;width:100%;aspect-ratio:1;background:#2c2c2e;border-radius:8px;overflow:hidden;}
                .pks-tw-thumb img{width:100%;height:100%;object-fit:contain;}
                .pks-tw-serial{position:absolute;left:6px;bottom:6px;z-index:2;display:flex;align-items:center;gap:3px;background:rgba(120,120,126,.8);border-radius:6px;padding:3px 7px 3px 5px;font-size:12px;line-height:1;color:#e8e8e8;font-weight:600;}
                .pks-tw-check{position:absolute;top:7px;right:7px;z-index:2;width:21px;height:21px;border-radius:5px;background:#fff;display:none;align-items:center;justify-content:center;color:#111;font-size:13px;font-weight:800;}
                .pks-tw-card.selected .pks-tw-check{display:flex;}
                .pks-tw-name{color:#f2f2f2;font-size:14px;font-weight:600;line-height:1.22;margin-top:9px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
                .pks-tw-val{display:flex;align-items:center;gap:5px;color:#cfcfcf;font-size:14px;margin-top:5px;}
                .pks-tw-pag{display:flex;align-items:center;justify-content:center;gap:12px;margin-top:18px;}
                .pks-tw-pag-btn{min-width:34px;height:30px;background:#2a2a2a;border:none;border-radius:8px;color:#cfcfcf;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0 10px;}
                .pks-tw-pag-btn:hover:not(:disabled){background:#343434;}
                .pks-tw-pag-btn:disabled{opacity:.4;cursor:not-allowed;}
                .pks-tw-pag-info{color:#cfcfcf;font-size:15px;font-weight:600;}
                .pks-tw-divider{border-top:1px solid #2a2a2a;margin-top:20px;}
                .pks-tw-slot-row{display:flex;align-items:center;gap:12px;background:#262626;border-radius:9px;padding:10px 12px;margin-bottom:11px;}
                .pks-tw-slot-thumb{width:46px;height:46px;flex:none;background:#1b1b1b;border-radius:7px;overflow:hidden;}
                .pks-tw-slot-thumb img{width:100%;height:100%;object-fit:contain;}
                .pks-tw-slot-name{color:#f0f0f0;font-size:15px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
                .pks-tw-x{width:30px;height:30px;flex:none;border:1.5px solid #4a4a4a;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#9a9a9a;font-size:18px;line-height:1;cursor:pointer;transition:all .12s;}
                .pks-tw-x:hover{border-color:#ff5a5a;color:#ff5a5a;}
                .pks-tw-empty-dashed{border:2px dashed #343434;border-radius:9px;height:66px;margin-bottom:11px;}
                .pks-tw-empty-solid{background:#0c0c0c;border-radius:9px;height:66px;margin-bottom:11px;}
                .pks-tw-robux-input{display:flex;align-items:center;gap:9px;background:#0c0c0c;border-radius:9px;padding:13px 15px;}
                .pks-tw-robux-input input{flex:1;min-width:0;background:transparent;border:none;outline:none;color:#e8e8e8;font-size:15px;}
                .pks-tw-robux-input input::placeholder{color:#6a6a6a;}
                .pks-tw-total{display:flex;align-items:center;justify-content:space-between;margin-top:15px;}
                .pks-tw-total-lbl{color:#f0f0f0;font-size:16px;font-weight:700;}
                .pks-tw-total-val{display:flex;align-items:center;gap:6px;color:#fff;font-size:19px;font-weight:700;}
                .pks-tw-pills{display:flex;gap:8px;margin:10px 0 4px;}
                .pks-tw-pill{height:30px;background-color:rgb(60,60,60);border:none;border-radius:0;align-items:center;padding:5px 12px;cursor:default;flex-grow:1;display:flex;justify-content:center;font-size:14px;font-weight:700!important;}
                .pks-tw-fee{display:flex;align-items:center;justify-content:space-between;margin-top:11px;}
                .pks-tw-fee-lbl{color:#8a8a8a;font-size:13px;}
                .pks-tw-fee-val{display:flex;align-items:center;gap:5px;color:#8a8a8a;font-size:14px;}
                .pks-tw-make{width:100%;padding:14px;background:#fff;color:#141414;border:none;border-radius:9px;font-size:17px;font-weight:700;cursor:pointer;margin-top:18px;transition:background .12s;}
                .pks-tw-make:hover{background:#e6e6e6;}
                .pks-tw-make:disabled{opacity:.6;cursor:not-allowed;}
                .pks-tw-empty-msg,.pks-tw-loading{grid-column:1/-1;text-align:center;padding:46px;color:#555;font-size:14px;}
            `;
            document.head.appendChild(s);
        }

        document.body.style.cssText = `margin:0;padding:0;background:#1a1a1a;overflow-x:hidden;`;
        document.body.innerHTML = '';

        const root = document.createElement('div');
        root.id = 'pks-tw-root';
        root.style.cssText = `min-height:100vh;background:#1a1a1a;color:#d0d4e0;`;

        root.innerHTML = `
        <div style="max-width:1160px;margin:0 auto;padding:24px 28px 60px;zoom:0.85;">
            <a href="https://pekora.pro/My/Trades.aspx" class="pks-tw-back"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>Back to Trades List</a>
            <h1 class="pks-tw-title">Trade with ${escHtml(partnerName)}</h1>
            <div style="display:grid;grid-template-columns:1fr 360px;gap:36px;align-items:start;margin-top:22px;">
                <div>
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:20px;">
                        <h2 class="pks-tw-h2">My Inventory</h2>
                        <select id="pks-tw-my-cat" class="pks-tw-select">${CAT_OPTIONS}</select>
                    </div>
                    <div id="pks-tw-my-inv" class="pks-tw-grid"><div class="pks-tw-loading">Loading inventory\u2026</div></div>
                    <div id="pks-tw-my-pag" class="pks-tw-pag"></div>
                    <div id="pks-tw-div-slot" style="margin:20px 0;">
                        <div class="pks-tw-divider" id="pks-tw-divider-line"></div>
                        <div id="pks-tw-pills" class="pks-tw-pills" style="display:none;"></div>
                    </div>
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 20px;">
                        <h2 class="pks-tw-h2">${escHtml(partnerName)}'s Inventory</h2>
                        <select id="pks-tw-their-cat" class="pks-tw-select">${CAT_OPTIONS}</select>
                    </div>
                    <div id="pks-tw-their-inv" class="pks-tw-grid"><div class="pks-tw-loading">Loading inventory\u2026</div></div>
                    <div id="pks-tw-their-pag" class="pks-tw-pag"></div>
                </div>
                <div>
                    <h2 class="pks-tw-h2" style="margin-bottom:18px;">Your Offer</h2>
                    <div id="pks-tw-my-slots"></div>
                    <div class="pks-tw-robux-input">${COIN(17)}<input id="pks-tw-my-robux" type="number" min="0" placeholder="Robux amount"></div>
                    <div class="pks-tw-fee"><span class="pks-tw-fee-lbl">After 30% fee:</span><span id="pks-tw-my-fee" class="pks-tw-fee-val">${COIN(13)}0</span></div>
                    <div class="pks-tw-total"><span class="pks-tw-total-lbl">Total Value:</span><span id="pks-tw-my-total" class="pks-tw-total-val">${COIN(17)}0</span></div>
                    <h2 class="pks-tw-h2" style="margin:30px 0 18px;">Your Request</h2>
                    <div id="pks-tw-their-slots"></div>
                    <div class="pks-tw-robux-input">${COIN(17)}<input id="pks-tw-their-robux" type="number" min="0" placeholder="Plus Robux amount"></div>
                    <div class="pks-tw-total"><span class="pks-tw-total-lbl">Total Value:</span><span id="pks-tw-their-total" class="pks-tw-total-val">${COIN(17)}0</span></div>
                    ${tradeSessionId ? `<div style="background:rgba(240,165,0,0.1);border:1px solid rgba(240,165,0,0.25);color:#f0a500;border-radius:8px;padding:9px 12px;font-size:13px;font-weight:600;margin-top:16px;text-align:center;">Countering Trade #${tradeSessionId}</div>` : ''}
                    <!-- Value display toggle -->
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-top:18px;margin-bottom:4px;">
                        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;color:#9a9a9a;user-select:none;">
                            <input type="checkbox" id="pks-tw-show-val" checked
                                style="width:34px;height:18px;appearance:none;background:#444;border-radius:9px;position:relative;cursor:pointer;transition:background .15s;flex:none;">
                            <span>Show Value/RAP</span>
                        </label>
                        <div style="display:flex;gap:4px;">
                            <button id="pks-tw-metric-val" style="all:unset;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;background:#3fcf6a22;color:#3fcf6a;border:1px solid #3fcf6a44;">Value</button>
                            <button id="pks-tw-metric-rap" style="all:unset;padding:3px 10px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;background:transparent;color:#555;border:1px solid #333;">RAP</button>
                        </div>
                    </div>
                    <style>
                        #pks-tw-show-val::after{content:'';position:absolute;width:14px;height:14px;border-radius:50%;background:#fff;top:2px;left:2px;transition:left .15s;}
                        #pks-tw-show-val:checked{background:#3fcf6a;}
                        #pks-tw-show-val:checked::after{left:18px;}
                    </style>
                    <button id="pks-tw-send-btn" class="pks-tw-make" style="margin-top:14px;">${tradeSessionId ? 'Send Counter' : 'Make Offer'}</button>
                    <div id="pks-tw-status" style="text-align:center;font-size:13px;margin-top:12px;min-height:16px;color:#888;"></div>
                </div>
            </div>
        </div>`;

        document.body.appendChild(root);

        // ── Value/RAP toggle and metric switcher ─────────────────────────────
        let twShowVal = true;
        let twMetric = 'value'; // 'value' | 'rap'

        const twApplyValToggle = () => {
            const pillsEl = document.getElementById('pks-tw-pills');
            const divEl   = document.getElementById('pks-tw-divider-line');
            if (!pillsEl) return;
            if (twShowVal && (pillsEl.innerHTML !== '')) {
                pillsEl.style.display = '';
                if (divEl) divEl.style.display = 'none';
            } else {
                pillsEl.style.display = 'none';
                if (divEl) divEl.style.display = '';
            }
        };

        const twSetMetric = (m) => {
            twMetric = m;
            const vBtn = document.getElementById('pks-tw-metric-val');
            const rBtn = document.getElementById('pks-tw-metric-rap');
            if (vBtn) { vBtn.style.background = m === 'value' ? '#3fcf6a22' : 'transparent'; vBtn.style.color = m === 'value' ? '#3fcf6a' : '#555'; vBtn.style.borderColor = m === 'value' ? '#3fcf6a44' : '#333'; }
            if (rBtn) { rBtn.style.background = m === 'rap' ? '#38bdf822' : 'transparent'; rBtn.style.color = m === 'rap' ? '#38bdf8' : '#555'; rBtn.style.borderColor = m === 'rap' ? '#38bdf844' : '#333'; }
            updateTotals();
        };

        document.getElementById('pks-tw-show-val')?.addEventListener('change', (e) => {
            twShowVal = e.target.checked;
            twApplyValToggle();
        });
        document.getElementById('pks-tw-metric-val')?.addEventListener('click', () => twSetMetric('value'));
        document.getElementById('pks-tw-metric-rap')?.addEventListener('click', () => twSetMetric('rap'));

        const getEffVal = (item) => getKolVal(item.assetId) || item.recentAveragePrice || 0;
        const getEffRap = (item) => getKolRap(item.assetId) || item.recentAveragePrice || 0;
        const twPill = (label, mine, theirs) => {
            const diff = theirs - mine;
            const pct  = mine > 0 ? Math.round((diff / mine) * 100) : (theirs > 0 ? 100 : 0);
            const up   = diff >= 0, col = up ? 'rgb(32,215,66)' : 'rgb(255,90,90)', sign = diff >= 0 ? '+' : '';
            const arrowPath = up ? 'M15 20H9v-8H4.16L12 4.16L19.84 12H15v8Z' : 'M9 4h6v8h5.84L12 19.84L4.16 12H9V4Z';
            return `<div class="pks-tw-pill">`
                + `<span style="display:flex;align-items:center;gap:5px;color:#e8e8e8;font-family:'Builder Sans','Source Sans Pro',sans-serif!important;">`
                + `<svg xmlns="http://www.w3.org/2000/svg" style="transform:scale(1.3);margin-right:3px;flex-shrink:0;" width="24" height="24" viewBox="0 0 24 24"><path fill="${col}" d="${arrowPath}"></path></svg>`
                + `${sign} ${diff.toLocaleString()} ${label} <span style="color:${col}!important;">(${sign} ${pct}%)</span></span></div>`;
        };

        const matchCat = (item, cat) => {
            if (!cat || cat === 'null') return true;
            const t = String(item.assetTypeId ?? item.assetType?.id ?? item.assetType ?? item.assetTypeName ?? '');
            if (!t) return true;
            return t === String(cat);
        };

        const updateTotals = () => {
            const myItemsVal = twMySelected.reduce((s, i) => s + getEffVal(i), 0);
            const theirItemsVal = twTheirSelected.reduce((s, i) => s + getEffVal(i), 0);
            const myItemsRap = twMySelected.reduce((s, i) => s + getEffRap(i), 0);
            const theirItemsRap = twTheirSelected.reduce((s, i) => s + getEffRap(i), 0);
            const myRobux = parseInt(document.getElementById('pks-tw-my-robux')?.value) || 0;
            const theirRobux = parseInt(document.getElementById('pks-tw-their-robux')?.value) || 0;
            const myAfterFee = Math.floor(myRobux * 0.7);
            const feeEl = document.getElementById('pks-tw-my-fee');
            const myTotalEl = document.getElementById('pks-tw-my-total');
            const theirTotalEl = document.getElementById('pks-tw-their-total');
            if (feeEl) feeEl.innerHTML = COIN(13) + myAfterFee.toLocaleString();
            if (myTotalEl) myTotalEl.innerHTML = COIN(17) + (myItemsVal + myAfterFee).toLocaleString();
            if (theirTotalEl) theirTotalEl.innerHTML = COIN(17) + (theirItemsVal + theirRobux).toLocaleString();
            const pillsEl = document.getElementById('pks-tw-pills');
            const dividerEl = document.getElementById('pks-tw-divider-line');
            if (pillsEl) {
                const has = twMySelected.length || twTheirSelected.length || myRobux || theirRobux;
                if (has && twShowVal) {
                    // show the metric the user picked
                    if (twMetric === 'rap') {
                        pillsEl.innerHTML = twPill('RAP', myItemsRap + myAfterFee, theirItemsRap + theirRobux);
                    } else {
                        pillsEl.innerHTML = twPill('RAP', myItemsRap + myAfterFee, theirItemsRap + theirRobux)
                            + twPill('Value', myItemsVal + myAfterFee, theirItemsVal + theirRobux);
                    }
                    pillsEl.style.display = '';
                    if (dividerEl) dividerEl.style.display = 'none';
                } else {
                    pillsEl.innerHTML = '';
                    pillsEl.style.display = 'none';
                    if (dividerEl) dividerEl.style.display = '';
                }
            }
        };

        const renderSlots = (side) => {
            const isMy = side === 'my';
            const sel = isMy ? twMySelected : twTheirSelected;
            const el = document.getElementById(isMy ? 'pks-tw-my-slots' : 'pks-tw-their-slots');
            if (!el) return;
            el.innerHTML = '';
            for (let i = 0; i < TW_MAX_SEL; i++) {
                if (sel[i]) {
                    const item = sel[i];
                    const row = document.createElement('div');
                    row.className = 'pks-tw-slot-row';
                    row.innerHTML = `
                        <div class="pks-tw-slot-thumb"><img src="${thumbUrl(item.assetId)}" onerror="this.style.opacity=0"></div>
                        <div style="flex:1;min-width:0;">
                            <div class="pks-tw-slot-name" title="${escHtml(item.name||'Item')}">${escHtml(item.name||'Item')}</div>
                            <div class="pks-tw-val" style="margin-top:3px;">${COIN(14)}<span>${getEffVal(item).toLocaleString()}</span></div>
                        </div>
                        <div class="pks-tw-x" title="Remove">\u00d7</div>`;
                    row.querySelector('.pks-tw-x').addEventListener('click', () => {
                        sel.splice(i, 1);
                        renderSlots(side);
                        renderInv(side);
                    });
                    el.appendChild(row);
                } else {
                    const empty = document.createElement('div');
                    empty.className = (i === sel.length) ? 'pks-tw-empty-dashed' : 'pks-tw-empty-solid';
                    el.appendChild(empty);
                }
            }
            updateTotals();
        };

        const renderInv = (side) => {
            const isMy = side === 'my';
            const all = isMy ? twMyItems : twTheirItems;
            const sel = isMy ? twMySelected : twTheirSelected;
            const cat = document.getElementById(isMy ? 'pks-tw-my-cat' : 'pks-tw-their-cat')?.value || 'null';
            const filtered = all.filter(i => matchCat(i, cat));
            const totalPages = Math.max(1, Math.ceil(filtered.length / TW_PER_PAGE));
            let pg = isMy ? twMyPage : twTheirPage;
            if (pg >= totalPages) pg = totalPages - 1;
            if (pg < 0) pg = 0;
            if (isMy) twMyPage = pg; else twTheirPage = pg;
            const pageItems = filtered.slice(pg * TW_PER_PAGE, (pg + 1) * TW_PER_PAGE);
            const inv = document.getElementById(isMy ? 'pks-tw-my-inv' : 'pks-tw-their-inv');
            if (!inv) return;
            inv.innerHTML = '';
            if (!pageItems.length) {
                inv.innerHTML = `<div class="pks-tw-empty-msg">${all.length ? 'No items in this category' : 'No collectibles found'}</div>`;
            } else {
                for (const item of pageItems) {
                    const isSel = sel.some(s => s.userAssetId === item.userAssetId);
                    const isMaxed = sel.length >= TW_MAX_SEL && !isSel;
                    const val = getEffVal(item);
                    const card = document.createElement('div');
                    card.className = 'pks-tw-card' + (isSel ? ' selected' : '') + (isMaxed ? ' maxed' : '');
                    card.innerHTML = `
                        <div class="pks-tw-thumb">
                            <img src="${thumbUrl(item.assetId)}" onerror="this.style.opacity=0">
                            <div class="pks-tw-serial">${STAR(11)}${item.serialNumber ? '#'+item.serialNumber : ''}</div>
                            <div class="pks-tw-check">\u2713</div>
                        </div>
                        <div class="pks-tw-name" title="${escHtml(item.name||'Item')}">${escHtml(item.name||'Item')}</div>
                        <div class="pks-tw-val">${COIN(14)}<span>${val.toLocaleString()}</span></div>`;
                    if (!isMaxed) {
                        card.addEventListener('click', () => {
                            const idx = sel.findIndex(s => s.userAssetId === item.userAssetId);
                            if (idx >= 0) sel.splice(idx, 1);
                            else if (sel.length < TW_MAX_SEL) sel.push(item);
                            renderSlots(side);
                            renderInv(side);
                        });
                    }
                    inv.appendChild(card);
                }
            }
            const pagEl = document.getElementById(isMy ? 'pks-tw-my-pag' : 'pks-tw-their-pag');
            if (pagEl) {
                pagEl.innerHTML = '';
                const prev = document.createElement('button');
                prev.className = 'pks-tw-pag-btn'; prev.innerHTML = '\u2039'; prev.disabled = pg <= 0;
                prev.onclick = () => { if (isMy) twMyPage = Math.max(0, pg - 1); else twTheirPage = Math.max(0, pg - 1); renderInv(side); };
                const info = document.createElement('span');
                info.className = 'pks-tw-pag-info'; info.textContent = `Page ${pg + 1}`;
                const next = document.createElement('button');
                next.className = 'pks-tw-pag-btn'; next.innerHTML = '\u203a'; next.disabled = pg >= totalPages - 1;
                next.onclick = () => { if (isMy) twMyPage = Math.min(totalPages - 1, pg + 1); else twTheirPage = Math.min(totalPages - 1, pg + 1); renderInv(side); };
                pagEl.appendChild(prev); pagEl.appendChild(info); pagEl.appendChild(next);
            }
        };

        twMySelected = []; twTheirSelected = [];
        twMyItems = []; twTheirItems = [];
        twMyPage = 0; twTheirPage = 0;
        twMySearch = ''; twTheirSearch = '';

        renderSlots('my');
        renderSlots('their');

        if (tradeSessionId) {
            try {
                const tr = await fetch(`https://pekora.pro/apisite/trades/v1/trades/${tradeSessionId}`, { credentials:'include' });
                const td = await tr.json();
                if (td.offers) {
                    for (const offer of td.offers) {
                        const uid = String(offer.user?.id), isMe = uid === String(myId);
                        const sel = isMe ? twMySelected : twTheirSelected;
                        for (const ua of (offer.userAssets || [])) {
                            if (sel.length < TW_MAX_SEL) sel.push({ userAssetId: ua.id, assetId: ua.assetId, name: ua.name, recentAveragePrice: ua.recentAveragePrice, serialNumber: ua.serialNumber });
                        }
                        const rf = document.getElementById(isMe ? 'pks-tw-my-robux' : 'pks-tw-their-robux');
                        if (rf && offer.robux) rf.value = offer.robux;
                    }
                    renderSlots('my');
                    renderSlots('their');
                }
            } catch {}
        }

        document.getElementById('pks-tw-my-cat')?.addEventListener('change', () => { twMyPage = 0; renderInv('my'); });
        document.getElementById('pks-tw-their-cat')?.addEventListener('change', () => { twTheirPage = 0; renderInv('their'); });
        document.getElementById('pks-tw-my-robux')?.addEventListener('input', updateTotals);
        document.getElementById('pks-tw-their-robux')?.addEventListener('input', updateTotals);

        document.getElementById('pks-tw-send-btn')?.addEventListener('click', async () => {
            const statusEl = document.getElementById('pks-tw-status');
            if (!twMySelected.length && !twTheirSelected.length) {
                statusEl.textContent = 'Select at least one item'; statusEl.style.color = '#ff5a5a'; return;
            }
            const btn = document.getElementById('pks-tw-send-btn');
            const orig = btn.textContent;
            btn.disabled = true; btn.textContent = 'Sending\u2026'; statusEl.textContent = '';
            const myRobux  = parseInt(document.getElementById('pks-tw-my-robux')?.value) || 0;
            const thRobux  = parseInt(document.getElementById('pks-tw-their-robux')?.value) || 0;
            const body = {
                offers: [
                    { userId: parseInt(myId), userAssetIds: twMySelected.map(i => i.userAssetId), robux: myRobux || null },
                    { userId: parseInt(partnerId), userAssetIds: twTheirSelected.map(i => i.userAssetId), robux: thRobux || null }
                ]
            };
            try {
                const url = tradeSessionId
                    ? `https://pekora.pro/apisite/trades/v1/trades/${tradeSessionId}/counter`
                    : `https://pekora.pro/apisite/trades/v1/trades/send`;
                const r = await postApi(url, body);
                if (r.ok || r.status < 300) {
                    statusEl.textContent = tradeSessionId ? 'Counter sent!' : 'Offer sent!';
                    statusEl.style.color = '#00e87a';
                    twMySelected = []; twTheirSelected = [];
                    const mr = document.getElementById('pks-tw-my-robux'); if (mr) mr.value = '';
                    const trx = document.getElementById('pks-tw-their-robux'); if (trx) trx.value = '';
                    renderSlots('my'); renderSlots('their');
                    renderInv('my'); renderInv('their');
                } else {
                    const d = await r.json().catch(() => ({}));
                    throw new Error(d?.errors?.[0]?.message || d?.message || 'HTTP ' + r.status);
                }
            } catch (e) {
                statusEl.textContent = 'Error: ' + e.message;
                statusEl.style.color = '#ff5a5a';
            }
            btn.disabled = false;
            btn.textContent = orig;
        });

        const loadInv = async (side, userId) => {
            const items = [];
            let cursor = '';
            try {
                while (true) {
                    const url = `https://pekora.pro/apisite/inventory/v1/users/${userId}/assets/collectibles?limit=100${cursor ? '&cursor='+cursor : ''}`;
                    const r = await fetch(url, { credentials:'include' });
                    const d = await r.json();
                    if (d.data) items.push(...d.data);
                    if (d.nextPageCursor) cursor = d.nextPageCursor; else break;
                }
            } catch {}
            if (side === 'my') twMyItems = items;
            else twTheirItems = items;
            renderInv(side);
            try {
                const ids = [...new Set(items.map(i => i.assetId).filter(Boolean))];
                const typeMap = {};
                for (let i = 0; i < ids.length; i += 100) {
                    const chunk = ids.slice(i, i + 100);
                    const dr = await fetch('https://pekora.pro/apisite/catalog/v1/catalog/items/details', {
                        method:'POST', credentials:'include',
                        headers:{ accept:'application/json', 'content-type':'application/json' },
                        body: JSON.stringify({ items: chunk.map(id => ({ itemType:'Asset', id })) }),
                    });
                    const dd = await dr.json();
                    (dd.data || []).forEach(e => { const at = e.assetType ?? e.assetTypeId; if (e.id != null && at != null) typeMap[e.id] = at; });
                }
                items.forEach(it => { if (typeMap[it.assetId] != null) it.assetTypeId = typeMap[it.assetId]; });
                renderInv(side);
            } catch {}
        };

        loadInv('my', myId);
        loadInv('their', partnerId);
    };

    const applyMisc = () => {
        let miscStyle = document.getElementById('pks-misc-style');
        if (!miscStyle) { miscStyle = document.createElement('style'); miscStyle.id = 'pks-misc-style'; document.head.appendChild(miscStyle); }
        const t = getTheme();
        let css = '';
        css += `img[src*="headshot"],img[src*="thumbnail"]{background-color:transparent!important;}[class*="avatarHeadshotContainer"],[class*="avatarContainer"],[class*="avatarWrapper"],[class*="userIconContainer"],[class*="userIcon"]{background-color:transparent!important;}`;
        css += `[class*="iconCard"],[class*="iconCard"] [class*="imageWrapper"]{background:transparent!important;background-color:transparent!important;border:none!important;box-shadow:none!important;}`;

        /* ── Empty-state sections ("No games found." / "User has no favourited games.") ── */
        css += `
            .section-content-off,
            [class*="noGames"],
            [class*="section-content-off"] {
                background:rgba(255,255,255,0.03)!important;
                border:1px solid rgba(255,255,255,0.07)!important;
                border-radius:12px!important;
                color:rgba(255,255,255,0.25)!important;
                font-family:var(--pks-font),'Share Tech Mono',monospace!important;
                font-size:12px!important;
                letter-spacing:0.06em!important;
                text-align:center!important;
                padding:32px 16px!important;
                min-height:60px!important;
                display:flex!important;
                align-items:center!important;
                justify-content:center!important;
            }
            /* Section headers (Recently Played, My Favorites etc.) */
            [class*="containerHeader"] h3 {
                color:rgba(255,255,255,0.75)!important;
                font-size:16px!important;
                font-weight:700!important;
            }
            /* Wrapper around each game sort section */
            [class*="sortContainer"] {
                margin-bottom:16px!important;
            }
        `;

        css += `
            [class*="moneyContainer"]{overflow:visible!important;}
            [class*="moneyContainer"] .col-lg-10{flex:0 0 100%!important;max-width:100%!important;background:rgba(255,255,255,0.05)!important;backdrop-filter:blur(16px) saturate(160%)!important;-webkit-backdrop-filter:blur(16px) saturate(160%)!important;border-radius:16px!important;padding:16px!important;box-shadow:0 8px 30px rgba(0,0,0,0.3)!important;}
            [class*="moneyContainer"] table{width:100%!important;border-collapse:separate!important;border-spacing:0!important;}
            [class*="moneyContainer"] thead{background:rgba(255,255,255,0.05)!important;border:none!important;}
            [class*="moneyContainer"] thead th{color:#9aa0c0!important;font-weight:700!important;text-transform:uppercase!important;letter-spacing:0.05em!important;font-size:11px!important;border:none!important;padding:11px 14px!important;}
            [class*="moneyContainer"] thead tr th:first-child{border-top-left-radius:10px!important;border-bottom-left-radius:10px!important;}
            [class*="moneyContainer"] thead tr th:last-child{border-top-right-radius:10px!important;border-bottom-right-radius:10px!important;}
            [class*="moneyContainer"] tbody tr{transition:background 0.15s ease!important;}
            [class*="moneyContainer"] tbody tr:hover{background:rgba(255,255,255,0.06)!important;}
            [class*="moneyContainer"] tbody td{color:#dfe3f0!important;border:none!important;border-top:1px solid rgba(255,255,255,0.06)!important;padding:12px 14px!important;vertical-align:middle!important;}
            [class*="moneyContainer"] tbody [class*="image-"]{border:1px solid rgba(255,255,255,0.15)!important;}
            [class*="senderName"]{color:#fff!important;font-weight:600!important;}
            [class*="viewDetails"]{color:${t.accent}!important;font-weight:700!important;cursor:pointer!important;}
            [class*="viewDetails"]:hover{text-decoration:underline!important;}
            [class*="tradeTypeActions"]{color:#cfd3e6!important;}
            [class*="tradeTypeActions"] a{color:${t.accent}!important;}
            [class*="tradeTypeActions"] select{background:rgba(255,255,255,0.06)!important;color:#fff!important;border:1px solid rgba(255,255,255,0.14)!important;border-radius:8px!important;padding:4px 8px!important;}
        `;
        css += `
            [class*="modalWrapper"]{position:fixed!important;top:50%!important;left:50%!important;transform:translate(-50%,-50%)!important;z-index:2147483647!important;margin:0!important;max-width:92vw!important;background:rgba(20,20,30,0.5)!important;backdrop-filter:blur(26px) saturate(170%)!important;-webkit-backdrop-filter:blur(26px) saturate(170%)!important;border:none!important;border-radius:16px!important;box-shadow:0 20px 60px rgba(0,0,0,0.6)!important;color:#fff!important;overflow:hidden!important;}
            [class*="modalWrapper"] [class*="innerSection"]{background:transparent!important;border:none!important;}
            [class*="modalWrapper"] [class*="title-"]{color:#fff!important;font-weight:700!important;}
            [class*="modalWrapper"] p,[class*="modalWrapper"] span{color:#e6e9f5;}
            [class*="modalWrapper"] a{color:${t.accent}!important;}
            [class*="modalWrapper"] [class*="robuxLabel"]{color:#3fd07e!important;}
            [class*="modalWrapper"] [class*="imageWrapper"]{background:transparent!important;}
            [class*="modalWrapper"] [class*="col-0-2"]{background:rgba(255,255,255,0.05)!important;border:1px solid rgba(255,255,255,0.1)!important;border-radius:10px!important;}
            [class*="modalWrapper"] [class*="divider-right"],[class*="modalWrapper"] [class*="divider-top"]{border-color:rgba(255,255,255,0.14)!important;}
            [class*="modalWrapper"] [class*="closeButton"]{color:#fff!important;cursor:pointer!important;opacity:0.85!important;}
            [class*="modalWrapper"] [class*="closeButton"]:hover{opacity:1!important;}
            [class*="modalWrapper"] [class*="iconLogo"]{background-image:url('https://raw.githubusercontent.com/Menwey/hexium-crack/main/hexium-logo.png')!important;background-size:contain!important;background-repeat:no-repeat!important;background-position:center!important;-webkit-mask:none!important;mask:none!important;}
            /* Profile friend-action buttons — only on /users/ID/profile pages */
            ${isProfilePage() ? `
            [class*="actionContainer"]{display:flex!important;gap:8px!important;flex-wrap:wrap!important;align-items:center!important;}
            [class*="actionContainer"] [class*="buttonContainer"]{margin:0!important;}
            [class*="actionContainer"] button{background:rgba(255,255,255,0.06)!important;backdrop-filter:blur(10px) saturate(160%)!important;-webkit-backdrop-filter:blur(10px) saturate(160%)!important;border:1px solid rgba(255,255,255,0.14)!important;border-radius:12px!important;color:#fff!important;font-weight:600!important;letter-spacing:0.02em!important;padding:8px 18px!important;box-shadow:0 4px 16px rgba(0,0,0,0.25)!important;transition:background 0.16s ease,border-color 0.16s ease,transform 0.14s ease,box-shadow 0.16s ease!important;}
            [class*="actionContainer"] button:hover{background:rgba(255,255,255,0.12)!important;border-color:${t.accent}!important;transform:translateY(-2px)!important;box-shadow:0 8px 24px ${t.accent}55!important;}
            ` : ''}
            /* Remove the (disabled) Chat button entirely */
            [class*="actionContainer"] [class*="newDisabledCancelButton"]{display:none!important;}
            [class*="actionContainer"] [class*="buttonContainer"]:has([class*="newDisabledCancelButton"]){display:none!important;}
            /* About / Creations tab bar → transparent frame (scoped to profile, beats glassify) */
            [class*="buttonCol"]{background:transparent!important;border:none!important;box-shadow:none!important;}
            [class*="buttonCol"] [class*="vTab-"]{background:transparent!important;border:none!important;box-shadow:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;}
            /* Auto-remove the OBC flair icon everywhere */
            .icon-obc,[class*="icon-obc"]{display:none!important;}
        `;
        if (cfg.miscBgUrl?.trim()) {
            const blur = cfg.miscBgBlur ? `blur(${cfg.miscBgBlurAmount ?? 8}px)` : 'none';
            const darkOp = cfg.miscBgDarkOverlay ? ((cfg.miscBgDarkOpacity ?? 50) / 100) : 0;
            css += `body{background-image:url('${cfg.miscBgUrl.trim()}')!important;background-size:cover!important;background-position:center!important;background-attachment:fixed!important;background-repeat:no-repeat!important;}body::before{content:'';position:fixed;inset:0;z-index:0;background:inherit;filter:${blur};pointer-events:none;}body::after{content:'';position:fixed;inset:0;z-index:1;background:rgba(0,0,0,${darkOp});pointer-events:none;}body>*{position:relative;z-index:2;}#pks-panel,#pks-watermark{z-index:2147483647!important;}`;
        }
        if (cfg.miscHideAds) css += `[class*="adWrapper"],[class*="adImage"]{display:none!important;}`;
        if (cfg.miscHideAlert) css += `[class*="alertBg"],[class*="alertText"],[class*="alertLink"],[class*="fakeAlert"]{display:none!important;}`;
        if (cfg.miscHideNavbar) css += `.navbar-wrapper-main,.navbar-0-2-49,nav.navbar,[class*="navBar"]{display:none!important;}.main-0-2-1{padding-top:0!important;}`;
        if (cfg.miscHideMyFeed) css += `[class*="myFeedContainer"]{display:none!important;}`;
        if (cfg.miscHideBlogNews) css += `[class*="blogNewsContainer"]{display:none!important;}`;
        if (cfg.miscCatalogHideSidebar) css += `.divider-right,.col-12.col-md-4.col-lg-2,[class*="sideBar"],[class*="sidebar"]{display:none!important;}.col-12.col-md-8.col-lg-10{flex:0 0 100%!important;max-width:100%!important;}`;
        if (cfg.miscProfileNameAnimate) {
            const c1 = cfg.miscProfileNameColor1 || t.accent;
            const c2 = cfg.miscProfileNameColor2 || '#38bdf8';
            css += `@keyframes pks-name-anim{0%{color:${c1}}50%{color:${c2}}100%{color:${c1}}}.username-0-2-278,[class*="username"],[class*="helloMessage"]{animation:pks-name-anim 3s ease-in-out infinite!important;font-weight:700!important;}`;
        }
        miscStyle.textContent = css;
        applySidebarNavStyle();
        applyPageFrameTransparency();
        applyPageFont(cfg.miscPageFont || 'Default (Site Font)');
        applyGuiFont(cfg.miscGuiFont || 'Share Tech Mono');
    };

    const setupHotkeys = () => {
        document.addEventListener('keydown', (e) => {
            if (['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;
            if (document.querySelector('.pks-hk-record.recording')) return;
            const key = e.key.toUpperCase();
            if (cfg.hotkeyRefresher && key === cfg.hotkeyRefresher.toUpperCase()) {
                e.preventDefault();
                if (state.refresher.running) stopRefresher(); else startRefresher();
                notify(`Refresher ${state.refresher.running ? 'started' : 'stopped'}`, 'info');
            }
            if (cfg.hotkeyToggleGui && key === cfg.hotkeyToggleGui.toUpperCase()) {
                e.preventDefault();
                const panel = document.getElementById('pks-panel');
                if (!panel) {
                    try { GM_setValue(PANEL_HIDDEN_KEY, false); } catch {}
                    buildPanel(state.authInfo || {});
                } else {
                    const willHide = panel.style.display !== 'none';
                    panel.style.display = willHide ? 'none' : '';
                    try { GM_setValue(PANEL_HIDDEN_KEY, willHide); } catch {}
                }
            }
            if (cfg.hotkeyHardRefresh && key === cfg.hotkeyHardRefresh.toUpperCase()) {
                e.preventDefault(); notify('Hard refresh\u2026', 'info'); setTimeout(() => location.reload(true), 150);
            }
        });
    };

    const GENRE_SEL = '[class*="allGenres"]';
    let logLines = [];
    const panelLog = (msg, type = 'info') => {
        const el = document.getElementById('pks-r-log');
        if (!el) return;
        const ts = new Date().toTimeString().slice(0, 8);
        const t = getTheme();
        const colMap = { click: t.accent, warn: '#f0a500', reload: '#ff4466', info: '#444' };
        logLines.push(`<div style="color:${colMap[type] || '#444'}">[${ts}] ${msg}</div>`);
        if (logLines.length > 60) logLines.shift();
        el.innerHTML = logLines.join(''); el.scrollTop = el.scrollHeight;
    };

    const refresherClick = () => {
        const el = document.querySelector(GENRE_SEL);
        if (el) { el.click(); state.refresher.clicks++; updateRefresherUI(); panelLog(`Click #${state.refresher.clicks}`, 'click'); }
        else panelLog('Element not found \u2014 waiting', 'warn');
    };
    const refresherHard = () => { state.refresher.reloads++; updateRefresherUI(); panelLog(`Hard refresh #${state.refresher.reloads}\u2026`, 'reload'); setTimeout(() => location.reload(true), 150); };

    const startRefresher = () => {
        if (state.refresher.running) return;
        const clickMs  = Math.max(100,  parseInt(document.getElementById('pks-r-click-ms')?.value) || cfg.clickInterval);
        const reloadMs = Math.max(5000, parseInt(document.getElementById('pks-r-reload-ms')?.value) || cfg.hardRefreshInterval);
        state.refresher.running = true; updateRefresherStatus();
        panelLog(`Started \u2014 click ${clickMs}ms, reload ${reloadMs}ms`, 'info');
        refresherClick(); state.refresher.clickTimer = setInterval(refresherClick, clickMs); state.refresher.reloadTimer = setInterval(refresherHard, reloadMs);
    };
    const stopRefresher = () => {
        if (!state.refresher.running) return;
        clearInterval(state.refresher.clickTimer); clearInterval(state.refresher.reloadTimer);
        state.refresher.running = false; updateRefresherStatus(); panelLog('Stopped.', 'info');
    };
    const updateRefresherStatus = () => {
        const dot = document.getElementById('pks-r-dot'), status = document.getElementById('pks-r-status');
        const startB = document.getElementById('pks-r-start'), stopB = document.getElementById('pks-r-stop');
        if (!dot) return;
        const on = state.refresher.running, t = getTheme();
        dot.className = on ? 'on' : ''; dot.style.background = on ? t.accent : '#2e2e3a'; dot.style.boxShadow = on ? `0 0 8px ${t.accent}` : 'none';
        if (status) status.innerHTML = `Status: <span style="color:#ccc">${on ? 'Running' : 'Idle'}</span>`;
        if (startB) startB.style.opacity = on ? '0.4' : '1';
        if (stopB) { stopB.style.background = on ? '#2a1a1a' : '#1a1a2a'; stopB.style.color = on ? '#ff4466' : '#666'; stopB.style.borderColor = on ? '#ff446666' : '#252535'; }
    };
    const updateRefresherUI = () => {
        const c = document.getElementById('pks-r-clicks'), r = document.getElementById('pks-r-reloads');
        if (c) c.textContent = state.refresher.clicks; if (r) r.textContent = state.refresher.reloads;
    };

    const initOldTradesChecker = async () => {
        if (!/\/My\/Trades\.aspx/i.test(location.pathname)) return;
        if (document.getElementById('pks-tr-overlay')) return;
        _tradesPageInjected = true;
        await getKoromonsData();
        if (!/\/My\/Trades\.aspx/i.test(location.pathname)) return;

        const BASE_T  = 'https://pekora.pro/apisite/trades/v1/trades';
        const THUMB_T = 'https://pekora.pro/apisite/thumbnails/v1';
        const LIMIT_T = 100;
        let MY_ID_T   = null;

        const tApiFetch = (url) => new Promise((resolve, reject) => {
            fetch(url, { credentials:'include', headers:{ accept:'application/json' } })
                .then(r => { if (r.status >= 400) reject(new Error('HTTP ' + r.status)); else r.json().then(resolve).catch(reject); })
                .catch(reject);
        });

        const tApiPost = (url) => new Promise((resolve, reject) => {
            postApi(url, {}).then(r => { if (r.status >= 400) reject(new Error('HTTP ' + r.status)); else resolve(r); }).catch(reject);
        });

        fetch('https://pekora.pro/apisite/users/v1/users/authenticated', { credentials:'include' })
            .then(r => r.json()).then(d => { MY_ID_T = d.id; }).catch(() => {});

        const fetchAllTrades = async (type) => {
            let all = [], cursor = '';
            while (true) {
                const data = await tApiFetch(BASE_T + '/' + type + '?cursor=' + encodeURIComponent(cursor) + '&limit=' + LIMIT_T);
                const items = data.data || data.trades || data.items || [];
                all = all.concat(items);
                const next = data.nextPageCursor || data.nextCursor || null;
                if (!next || items.length === 0) break;
                cursor = next;
            }
            return all;
        };

        const fetchAvatar = (userId) => tApiFetch(THUMB_T + '/users/avatar-headshot?userIds=' + userId + '&size=150x150&format=Png')
            .then(d => (d.data && d.data[0] && d.data[0].imageUrl) || '').catch(() => '');

        const fetchAssetThumbs = (assetIds) => {
            if (!assetIds.length) return Promise.resolve({});
            return tApiFetch(THUMB_T + '/assets?assetIds=' + assetIds.join(',') + '&size=110x110&format=Png')
                .then(d => { const m = {}; (d.data||[]).forEach(e => { if (e.imageUrl) m[e.targetId] = e.imageUrl; }); return m; })
                .catch(() => ({}));
        };

        const fmt = (s) => { if (!s) return '\u2014'; const d = new Date(s); return (d.getMonth()+1)+'/'+d.getDate()+'/'+String(d.getFullYear()).slice(2); };
        const escT = (s) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        const absUrl = (url) => !url ? '' : url.startsWith('http') ? url : 'https://pekora.pro' + url;

        const COIN = (sz) => `<img src="https://raw.githubusercontent.com/Menwey/hexium-crack/main/robuxicon.png" width="${sz}" height="${sz}" style="display:inline-block;vertical-align:middle;flex:none;object-fit:contain;" alt="R$">`;
        const STAR = (sz, col) => `<svg width="${sz}" height="${sz}" viewBox="0 0 24 24" fill="${col||'#c4c4c4'}" style="display:inline-block;vertical-align:middle;flex:none;"><path d="M12 0 L14.3 9.7 L24 12 L14.3 14.3 L12 24 L9.7 14.3 L0 12 L9.7 9.7 Z"/></svg>`;
        const CHEV = encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9a9a9a" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>');
        const cap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : 'Open';

        const fetchAvatars = (userIds) => {
            const ids = [...new Set(userIds.filter(Boolean))];
            if (!ids.length) return Promise.resolve({});
            return tApiFetch(THUMB_T + '/users/avatar-headshot?userIds=' + ids.join(',') + '&size=150x150&format=Png')
                .then(d => { const m = {}; (d.data||[]).forEach(e => { if (e.imageUrl) m[e.targetId] = e.imageUrl; }); return m; })
                .catch(() => ({}));
        };

        const _detailCache = new Map();
        const _totalsCache = new Map();
        const getTradeDetail = (id) => {
            if (!_detailCache.has(id)) {
                _detailCache.set(id, tApiFetch(BASE_T + '/' + id).catch(e => { _detailCache.delete(id); throw e; }));
            }
            return _detailCache.get(id);
        };
        const computeTotals = (td, partnerId) => {
            const offers = td.offers || [];
            let theirOffer = offers.find(o => o.user && o.user.id === partnerId)
                          || offers.find(o => MY_ID_T && o.user && o.user.id !== MY_ID_T)
                          || offers[1] || offers[0] || { userAssets: [] };
            const myOffer = offers.find(o => o !== theirOffer) || { userAssets: [] };
            const valOf = (a) => getKolVal(a.assetId) || a.recentAveragePrice || 0;
            const rapOf = (a) => getKolRap(a.assetId) || a.recentAveragePrice || 0;
            const myRobux    = Math.floor((myOffer.robux || 0) * 0.7);
            const theirRobux = Math.floor((theirOffer.robux || 0) * 0.7);
            const sum = (arr, f) => (arr || []).reduce((s, a) => s + f(a), 0);
            return {
                myOffer, theirOffer,
                myVal:    sum(myOffer.userAssets, valOf) + myRobux,
                theirVal: sum(theirOffer.userAssets, valOf) + theirRobux,
                myRap:    sum(myOffer.userAssets, rapOf) + myRobux,
                theirRap: sum(theirOffer.userAssets, rapOf) + theirRobux,
            };
        };
        let trOverlayMetric = 'value'; // controlled by RAP/Value buttons in the overlay
        const tradeMetric = () => trOverlayMetric || (cfg.tradesMetric === 'rap' ? 'rap' : 'value');
        const gainPill = (label, mine, theirs) => {
            const diff = theirs - mine;
            const pct  = mine > 0 ? Math.round((diff / mine) * 100) : (theirs > 0 ? 100 : 0);
            const up   = diff >= 0;
            const col  = up ? 'rgb(32,215,66)' : 'rgb(255,90,90)';
            const sign = diff >= 0 ? '+' : '';
            const arrowPath = up ? 'M15 20H9v-8H4.16L12 4.16L19.84 12H15v8Z' : 'M9 4h6v8h5.84L12 19.84L4.16 12H9V4Z';
            const tooltip = `You are ${up ? 'gaining' : 'losing'} ${Math.abs(diff).toLocaleString()} ${label} on this trade, and ${up ? 'winning' : 'losing'} in ${label} by ${Math.abs(pct)}%.`;
            return `<div class="pks-tr-pill" title="${tooltip}">`
                + `<span style="display:flex;align-items:center;gap:5px;color:#e8e8e8;font-family:'Builder Sans','Source Sans Pro',sans-serif!important;">`
                + `<svg xmlns="http://www.w3.org/2000/svg" style="transform:scale(1.3);margin-right:3px;flex-shrink:0;" width="24" height="24" viewBox="0 0 24 24"><path fill="${col}" d="${arrowPath}"></path></svg>`
                + `${sign} ${diff.toLocaleString()} ${label} <span style="color:${col}!important;">(${sign} ${pct}%)</span></span></div>`;
        };

        if (!document.getElementById('pks-tr-font')) {
            const lnk = document.createElement('link'); lnk.id = 'pks-tr-font'; lnk.rel = 'stylesheet';
            lnk.href = 'https://fonts.googleapis.com/css2?family=Source+Sans+Pro:wght@400;600;700;900&display=swap';
            document.head.appendChild(lnk);
        }
        if (!document.getElementById('pks-tr-styles')) {
            const s = document.createElement('style'); s.id = 'pks-tr-styles';
            s.textContent = `
                #pks-tr-overlay{background:#262626;border-radius:10px;color:#e8e8e8;margin-bottom:20px;font-family:'Builder Sans','Source Sans Pro',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-weight:400;}
                #pks-tr-overlay *{box-sizing:border-box;font-family:'Builder Sans','Source Sans Pro',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif!important;}
                .pks-tr-wrap{margin:0 auto;padding:22px 26px 30px;display:grid;grid-template-columns:300px 1fr;gap:36px;align-items:start;}
                .pks-tr-shead{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:7px;}
                .pks-tr-h1{color:#fff;font-size:28px;font-weight:800;margin:0;letter-spacing:-0.01em;}
                .pks-tr-sel{appearance:none;-webkit-appearance:none;-moz-appearance:none;background:#262626 url("data:image/svg+xml,${CHEV}") no-repeat right 10px center;border:none;border-radius:8px;color:#e0e0e0;font-size:14px;font-weight:600;padding:9px 34px 9px 13px;cursor:pointer;outline:none;}
                .pks-tr-sel option{background:#262626;color:#e0e0e0;}
                .pks-tr-help{display:inline-block;color:#fff;font-size:13px;text-decoration:underline;cursor:pointer;margin:0 0 16px;}
                .pks-tr-list{display:flex;flex-direction:column;max-height:calc(100vh - 180px);overflow-y:auto;overflow-x:hidden;}
                .pks-tr-list::-webkit-scrollbar{width:7px;}
                .pks-tr-list::-webkit-scrollbar-track{background:transparent;}
                .pks-tr-list::-webkit-scrollbar-thumb{background:transparent;border-radius:4px;}
                .pks-tr-list::-webkit-scrollbar-thumb:hover{background:transparent;}
                .pks-tr-item{display:flex;align-items:center;gap:12px;padding:12px 12px 12px 11px;border-bottom:1px solid #333333;cursor:pointer;border-left:3px solid transparent;}
                .pks-tr-item:hover{background:#2e2e2e;}
                .pks-tr-item.sel{background:#383838;border-left-color:#fff;}
                .pks-tr-av{width:46px;height:46px;border-radius:50%;object-fit:cover;background:#454545;flex:none;}
                .pks-tr-meta{flex:1;min-width:0;}
                .pks-tr-iname{color:#fff;font-size:16px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
                .pks-tr-istat{color:#8a8a8a;font-size:13px;margin-top:2px;}
                .pks-tr-idate{color:#8a8a8a;font-size:13px;flex:none;align-self:flex-start;}
                .pks-tr-dh{color:#fff;font-size:28px;font-weight:800;margin:0;letter-spacing:-0.01em;}
                .pks-tr-at{color:#6f6f73;font-weight:800;}
                .pks-tr-exp{color:#8a8a8a;font-size:14px;margin:4px 0 26px;}
                .pks-tr-sec{color:#fff;font-size:18px;font-weight:700;margin:0 0 16px;}
                .pks-tr-grid{display:grid;grid-template-columns:repeat(auto-fill,124px);justify-content:start;gap:18px 14px;}
                .pks-tr-thumb{position:relative;width:100%;aspect-ratio:1;background:#303030;border-radius:10px;overflow:hidden;}
                .pks-tr-thumb img{width:100%;height:100%;object-fit:contain;}
                .pks-tr-serial{position:absolute;left:7px;bottom:7px;display:flex;align-items:center;gap:3px;background:rgba(120,120,126,.8);border-radius:6px;padding:3px 7px 3px 5px;font-size:12px;line-height:1;color:#e8e8e8;font-weight:600;}
                .pks-tr-cname{color:#f2f2f2;font-size:14px;font-weight:600;line-height:1.25;margin-top:9px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
                .pks-tr-cval{display:flex;align-items:center;gap:5px;color:#cfcfcf;font-size:14px;margin-top:5px;}
                .pks-tr-total{display:flex;align-items:center;justify-content:space-between;margin-top:24px;}
                .pks-tr-tlbl{color:#f0f0f0;font-size:17px;font-weight:700;}
                .pks-tr-tval{display:flex;align-items:center;gap:6px;color:#fff;font-size:20px;font-weight:800;}
                .pks-tr-robux{display:flex;align-items:center;justify-content:space-between;margin-top:18px;}
                .pks-tr-rlbl{color:#b8b8c0;font-size:14px;font-weight:600;}
                .pks-tr-rval{display:flex;align-items:center;gap:6px;color:#e8e8e8;font-size:16px;font-weight:700;}
                .pks-tr-div{border-top:1px solid #3a3a3a;margin:28px 0;}
                .pks-tr-divider-slot{margin:0;}
                .pks-tr-div-fallback{display:none;}
                .pks-tr-actions{display:flex;gap:12px;margin-top:34px;}
                .pks-tr-btn{padding:11px 26px;border-radius:9px;font-size:15px;font-weight:700;cursor:pointer;border:1px solid #3a3a3c;background:transparent;color:#e8e8e8;transition:all .12s;font-family:inherit;}
                .pks-tr-btn:hover{background:#232325;}
                .pks-tr-btn.primary{background:#fff;color:#141414;border-color:#fff;}
                .pks-tr-btn.primary:hover{background:#e6e6e6;}
                .pks-tr-btn.danger:hover{border-color:#ff5a5a;color:#ff5a5a;background:transparent;}
                .pks-tr-btn:disabled{opacity:.5;cursor:not-allowed;}
                .pks-tr-empty{color:#6a6a6a;font-size:14px;padding:42px 12px;text-align:center;}
                .pks-tr-close{position:fixed;top:64px;right:20px;width:38px;height:38px;border-radius:50%;border:1px solid #4a4a4d;background:#333536;color:#fff;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:2000;box-shadow:0 2px 10px rgba(0,0,0,.4);}
                .pks-tr-close:hover{background:#404244;border-color:#6a6a6d;}
                .pks-tr-h1,.pks-tr-dh{font-weight:700!important;}
                .pks-tr-sec,.pks-tr-iname,.pks-tr-tlbl,.pks-tr-tval,.pks-tr-btn{font-weight:600!important;}
                .pks-tr-sel,.pks-tr-cname,.pks-tr-cval,.pks-tr-serial,.pks-tr-help,.pks-tr-at{font-weight:500!important;}
                .pks-tr-istat,.pks-tr-idate,.pks-tr-empty{font-weight:400!important;}
                .pks-tr-right{display:flex;flex-direction:column;align-items:flex-end;gap:7px;flex:none;align-self:stretch;justify-content:space-between;}
                .pks-tr-ind{display:flex;align-items:stretch;gap:8px;min-height:30px;justify-content:flex-end;opacity:0;transition:opacity .18s;}
                .pks-tr-ind.show{opacity:1;}
                .pks-tr-nums{display:flex;flex-direction:column;justify-content:center;align-items:flex-end;line-height:1.18;font-size:12px;font-weight:700!important;}
                .pks-tr-nums .give{color:#9a9a9a;}
                .pks-tr-bar{width:8px;border-radius:3px;align-self:stretch;flex:none;}
                .pks-tr-pills{display:flex;gap:8px;margin:18px 0 18px;}
                .pks-tr-pill{height:30px;background-color:#1a1a1a;border:none;border-radius:0;align-items:center;padding:5px 12px;cursor:default;flex-grow:1;display:flex;justify-content:center;font-size:14px;font-weight:700!important;}
                .pks-tr-dispval-toggle{display:flex;align-items:center;gap:7px;cursor:pointer;user-select:none;font-size:13px;color:#9a9a9a;margin-bottom:10px;}
                .pks-tr-dispval-toggle input{width:34px;height:18px;appearance:none;background:#444;border-radius:9px;position:relative;cursor:pointer;transition:background .15s;flex:none;}
                .pks-tr-dispval-toggle input:checked{background:#3fcf6a;}
                .pks-tr-dispval-toggle input::after{content:'';position:absolute;width:14px;height:14px;border-radius:50%;background:#fff;top:2px;left:2px;transition:left .15s;}
                .pks-tr-dispval-toggle input:checked::after{left:18px;}
            `;
            document.head.appendChild(s);
        }

        document.getElementById('pks-tr-overlay')?.remove();
        const overlay = document.createElement('div');
        overlay.id = 'pks-tr-overlay';
        overlay.innerHTML = `
            <button class="pks-tr-close" title="Close (Esc)">\u2715</button>
            <div class="pks-tr-wrap">
                <div>
                    <div class="pks-tr-shead">
                        <h1 class="pks-tr-h1">Trades</h1>
                        <select class="pks-tr-sel" id="pks-tr-type">
                            <option value="inbound">Inbound</option>
                            <option value="outbound">Outbound</option>
                            <option value="completed">Completed</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                    <a class="pks-tr-help" href="https://pekora.pro/help" target="_blank" rel="noopener">How do I trade?</a>
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
                        <label class="pks-tr-dispval-toggle" style="margin-bottom:0;"><input type="checkbox" id="pks-tr-dispval" checked><span>Display Value</span></label>
                        <div style="display:flex;gap:4px;">
                            <button id="pks-tr-metric-val" style="all:unset;padding:2px 9px;border-radius:5px;font-size:11px;font-weight:700;cursor:pointer;background:#3fcf6a22;color:#3fcf6a;border:1px solid #3fcf6a44;">Value</button>
                            <button id="pks-tr-metric-rap" style="all:unset;padding:2px 9px;border-radius:5px;font-size:11px;font-weight:700;cursor:pointer;background:transparent;color:#555;border:1px solid #333;">RAP</button>
                        </div>
                    </div>
                    <div class="pks-tr-list" id="pks-tr-list"><div class="pks-tr-empty">Loading\u2026</div></div>
                </div>
                <div id="pks-tr-detail"><div class="pks-tr-empty">Select a trade to view details.</div></div>
            </div>`;
        const nativeContent = document.querySelector('[class*="moneyContainer"]');
        if (!nativeContent || !nativeContent.parentElement) { _tradesPageInjected = false; return; }
        nativeContent.parentElement.insertBefore(overlay, nativeContent);
        let hideEl = document.getElementById('pks-tr-hide');
        if (!hideEl) { hideEl = document.createElement('style'); hideEl.id = 'pks-tr-hide'; document.head.appendChild(hideEl); }
        hideEl.textContent = `[class*="moneyContainer"]{display:none!important;}`;
        const _fs = (el, p, v) => el && el.style.setProperty(p, v, 'important');
        _fs(overlay, 'display', 'block'); _fs(overlay, 'visibility', 'visible'); _fs(overlay, 'opacity', '1');
        applyTradesCustom();
        console.log('[Grexium] Trades panel injected');

        const listEl   = overlay.querySelector('#pks-tr-list');
        const detailEl = overlay.querySelector('#pks-tr-detail');
        const typeEl   = overlay.querySelector('#pks-tr-type');

        let curType = 'inbound', curTrades = [], selectedId = null;

        const closeOverlay = () => { overlay.remove(); document.getElementById('pks-tr-hide')?.remove(); _tradesPageInjected = false; _tradesClosed = true; document.removeEventListener('keydown', onKey); };
        const onKey = (e) => { if (e.key === 'Escape') closeOverlay(); };
        overlay._onKey = onKey;
        overlay.querySelector('.pks-tr-close').addEventListener('click', closeOverlay);
        document.addEventListener('keydown', onKey);

        const renderDetail = async (trade) => {
            detailEl.innerHTML = `<div class="pks-tr-empty">Loading trade\u2026</div>`;
            let td;
            try { td = await getTradeDetail(trade.id); }
            catch (e) { detailEl.innerHTML = `<div class="pks-tr-empty" style="color:#ff5a5a;">Error: ${escT(e.message)}</div>`; return; }
            const partnerId = (trade.user && trade.user.id) || null;
            const tot = computeTotals(td, partnerId);
            _totalsCache.set(trade.id, tot);
            paintRowIndicator(trade.id);
            const { myOffer, theirOffer } = tot;
            const myAssets    = myOffer.userAssets || [];
            const theirAssets = theirOffer.userAssets || [];
            const partner = theirOffer.user || trade.user || {};
            const pName   = partner.displayName || partner.name || 'Unknown';
            const allIds  = [...myAssets, ...theirAssets].map(a => a.assetId).filter(Boolean);
            const thumbMap = await fetchAssetThumbs(allIds);
            const valOf = (a) => getKolVal(a.assetId) || a.recentAveragePrice || 0;
            const myRobux    = Math.floor((myOffer.robux || 0) * 0.7);
            const theirRobux = Math.floor((theirOffer.robux || 0) * 0.7);
            const myTotal    = tot.myVal;
            const theirTotal = tot.theirVal;
            const robuxRow   = (r) => r > 0 ? `<div class="pks-tr-robux"><span class="pks-tr-rlbl">Robux Offered (After 30% fee):</span><span class="pks-tr-rval">${COIN(14)}${r.toLocaleString()}</span></div>` : '';
            const card = (a) => `
                <div class="pks-tr-card">
                    <div class="pks-tr-thumb"><img src="${absUrl(thumbMap[a.assetId] || '')}" onerror="this.style.opacity=0">${a.serialNumber ? `<div class="pks-tr-serial">${STAR(11)}#${a.serialNumber}</div>` : ''}</div>
                    <div class="pks-tr-cname" title="${escT(a.name||'Item')}">${escT(a.name||'Item')}</div>
                    <div class="pks-tr-cval">${COIN(14)}<span>${valOf(a).toLocaleString()}</span></div>
                </div>`;
            const cards = (arr) => arr.length ? arr.map(card).join('') : `<div class="pks-tr-empty" style="grid-column:1/-1;padding:24px;">No items</div>`;
            const isInbound  = curType === 'inbound';
            const isOutbound = curType === 'outbound';
            const isPast     = curType === 'completed' || curType === 'inactive';
            const pUser      = partner.name || '';
            const recvLabel  = isPast ? 'Items you received' : 'Items you will receive';
            const giveLabel  = isPast ? 'Items you gave' : 'Items you will give';
            const subLine    = isInbound ? `<div class="pks-tr-exp">Expires on ${fmt(trade.expiration)}</div>` : `<div style="height:28px;"></div>`;
            const recvSec = `<div class="pks-tr-sec">${recvLabel}</div>
                <div class="pks-tr-grid">${cards(theirAssets)}</div>
                ${robuxRow(theirRobux)}
                <div class="pks-tr-total"><span class="pks-tr-tlbl">Total Value:</span><span class="pks-tr-tval">${COIN(17)}${theirTotal.toLocaleString()}</span></div>`;
            const giveSec = `<div class="pks-tr-sec">${giveLabel}</div>
                <div class="pks-tr-grid">${cards(myAssets)}</div>
                ${robuxRow(myRobux)}
                <div class="pks-tr-total"><span class="pks-tr-tlbl">Total Value:</span><span class="pks-tr-tval">${COIN(17)}${myTotal.toLocaleString()}</span></div>`;
            detailEl.innerHTML = `
                <h2 class="pks-tr-dh">Trade with @${escT(partner.name || partner.displayName || 'Unknown')}</h2>
                ${subLine}
                ${giveSec}
                <div class="pks-tr-divider-slot">
                    <div class="pks-tr-pills">${gainPill('RAP', tot.myRap, tot.theirRap)}${gainPill('Value', tot.myVal, tot.theirVal)}</div>
                    <div class="pks-tr-div pks-tr-div-fallback"></div>
                </div>
                ${recvSec}
                ${isInbound ? `<div class="pks-tr-actions">
                    <button class="pks-tr-btn primary" id="pks-tr-accept">Accept</button>
                    <button class="pks-tr-btn" id="pks-tr-counter">Counter</button>
                    <button class="pks-tr-btn danger" id="pks-tr-decline">Decline</button>
                </div>` : ''}
                ${isOutbound ? `<div class="pks-tr-actions">
                    <button class="pks-tr-btn primary" id="pks-tr-cancel">Cancel Trade</button>
                </div>` : ''}
                <div id="pks-tr-msg" style="margin-top:14px;font-size:13px;color:#8a8a8a;min-height:17px;"></div>`;

            applyDispVal();
            const msg = detailEl.querySelector('#pks-tr-msg');
            const settle = (label) => { msg.textContent = label; curTrades = curTrades.filter(x => x.id !== trade.id); selectedId = null; setTimeout(() => { renderList(); detailEl.innerHTML = `<div class="pks-tr-empty">Select a trade to view details.</div>`; }, 900); };

            if (isInbound) {
                const acc = detailEl.querySelector('#pks-tr-accept');
                const dec = detailEl.querySelector('#pks-tr-decline');
                const cnt = detailEl.querySelector('#pks-tr-counter');
                const lock = () => { [acc, dec, cnt].forEach(b => b && (b.disabled = true)); };
                const unlock = () => { [acc, dec, cnt].forEach(b => b && (b.disabled = false)); };
                acc.addEventListener('click', () => {
                    lock(); acc.textContent = 'Accepting\u2026';
                    tApiPost(BASE_T + '/' + trade.id + '/accept')
                        .then(() => { acc.textContent = '\u2713 Accepted'; settle('Trade accepted.'); })
                        .catch(e => { unlock(); acc.textContent = 'Accept'; msg.style.color = '#ff5a5a'; msg.textContent = 'Failed to accept: ' + e.message; });
                });
                dec.addEventListener('click', () => {
                    lock(); dec.textContent = 'Declining\u2026';
                    tApiPost(BASE_T + '/' + trade.id + '/decline')
                        .then(() => { dec.textContent = '\u2713 Declined'; settle('Trade declined.'); })
                        .catch(e => { unlock(); dec.textContent = 'Decline'; msg.style.color = '#ff5a5a'; msg.textContent = 'Failed to decline: ' + e.message; });
                });
                cnt.addEventListener('click', () => {
                    if (!partner.id) { msg.style.color = '#ff5a5a'; msg.textContent = 'Cannot counter: unknown partner.'; return; }
                    const url = 'https://pekora.pro/Trade/TradeWindow.aspx?TradePartnerID=' + partner.id + '&TradeSessionId=' + trade.id;
                    const w = 900, h = 700;
                    const left = Math.max(0, Math.round(((window.screen?.width  || 1280) - w) / 2));
                    const top  = Math.max(0, Math.round(((window.screen?.height || 800)  - h) / 2));
                    const win = window.open(url, 'pks_trade_' + partner.id, `popup,width=${w},height=${h},left=${left},top=${top}`);
                    if (!win) location.href = url;
                });
            }

            if (isOutbound) {
                const can = detailEl.querySelector('#pks-tr-cancel');
                can.addEventListener('click', () => {
                    can.disabled = true; can.textContent = 'Cancelling…';
                    tApiPost(BASE_T + '/' + trade.id + '/decline')
                        .then(() => { can.textContent = '✓ Cancelled'; settle('Trade cancelled.'); })
                        .catch(e => { can.disabled = false; can.textContent = 'Cancel Trade'; msg.style.color = '#ff5a5a'; msg.textContent = 'Failed to cancel: ' + e.message; });
                });
            }
        };

        const paintRowIndicator = (id) => {
            const row = listEl.querySelector(`.pks-tr-item[data-id="${id}"]`);
            const ind = row && row.querySelector('.pks-tr-ind');
            if (!ind) return;
            const t = _totalsCache.get(id);
            if (!t || t === 'loading') { ind.classList.remove('show'); ind.innerHTML = ''; return; }
            const m = tradeMetric();
            const mine   = m === 'rap' ? t.myRap : t.myVal;
            const theirs = m === 'rap' ? t.theirRap : t.theirVal;
            const col = theirs >= mine ? '#3fcf6a' : '#ff5a5a';
            ind.innerHTML = `<div class="pks-tr-nums"><span class="give">${mine.toLocaleString()}</span><span class="give">${theirs.toLocaleString()}</span></div><div class="pks-tr-bar" style="background:${col}"></div>`;
            ind.classList.add('show');
        };
        const repaintAll = () => { curTrades.forEach(tr => paintRowIndicator(tr.id)); };
        _tradesRepaint = repaintAll;
        const streamIndicators = () => {
            const queue = curTrades.filter(tr => !_totalsCache.has(tr.id));
            queue.forEach(tr => _totalsCache.set(tr.id, 'loading'));
            let i = 0;
            const worker = async () => {
                while (i < queue.length) {
                    const tr = queue[i++];
                    try { _totalsCache.set(tr.id, computeTotals(await getTradeDetail(tr.id), (tr.user && tr.user.id) || null)); }
                    catch { _totalsCache.set(tr.id, null); }
                    paintRowIndicator(tr.id);
                }
            };
            for (let k = 0; k < Math.min(6, queue.length); k++) worker();
        };

        const renderList = () => {
            if (!curTrades.length) { listEl.innerHTML = `<div class="pks-tr-empty">No ${curType} trades.</div>`; return; }
            listEl.innerHTML = curTrades.map(tr => {
                const partner = tr.user ? (tr.user.displayName || tr.user.name || 'Unknown') : 'Unknown';
                const statLine = `<div class="pks-tr-istat">${escT(cap(tr.status))}</div>`;
                return `<div class="pks-tr-item${tr.id === selectedId ? ' sel' : ''}" data-id="${tr.id}">
                    <img class="pks-tr-av" data-uid="${tr.user && tr.user.id ? tr.user.id : ''}" src="" alt="">
                    <div class="pks-tr-meta"><div class="pks-tr-iname">${escT(partner)}</div>${statLine}</div>
                    <div class="pks-tr-right">
                        <div class="pks-tr-idate">${fmt(tr.created)}</div>
                        <div class="pks-tr-ind"></div>
                    </div>
                </div>`;
            }).join('');
            listEl.querySelectorAll('.pks-tr-item').forEach(it => it.addEventListener('click', () => {
                const id = parseInt(it.dataset.id);
                const tr = curTrades.find(x => x.id === id); if (!tr) return;
                selectedId = id;
                listEl.querySelectorAll('.pks-tr-item').forEach(n => n.classList.toggle('sel', parseInt(n.dataset.id) === id));
                renderDetail(tr);
            }));
            fetchAvatars(curTrades.map(tr => tr.user && tr.user.id)).then(map => {
                listEl.querySelectorAll('.pks-tr-av[data-uid]').forEach(img => {
                    const u = map[img.dataset.uid]; if (u) img.src = absUrl(u);
                });
            });
            curTrades.forEach(tr => paintRowIndicator(tr.id));
            streamIndicators();
        };

        const loadList = async (type) => {
            curType = type; selectedId = null;
            detailEl.innerHTML = `<div class="pks-tr-empty">Select a trade to view details.</div>`;
            listEl.innerHTML = `<div class="pks-tr-empty">Loading\u2026</div>`;
            try {
                curTrades = await fetchAllTrades(type);
                selectedId = curTrades.length ? curTrades[0].id : null;
                renderList();
                if (curTrades.length) renderDetail(curTrades[0]);
            } catch (e) {
                listEl.innerHTML = `<div class="pks-tr-empty" style="color:#ff5a5a;">Error: ${escT(e.message)}</div>`;
            }
        };

        typeEl.addEventListener('change', () => loadList(typeEl.value));

        const dispValEl = overlay.querySelector('#pks-tr-dispval');
        const setTradeMetric = (m) => {
            trOverlayMetric = m;
            const vBtn = overlay.querySelector('#pks-tr-metric-val');
            const rBtn = overlay.querySelector('#pks-tr-metric-rap');
            if (vBtn) { vBtn.style.background = m === 'value' ? '#3fcf6a22' : 'transparent'; vBtn.style.color = m === 'value' ? '#3fcf6a' : '#555'; vBtn.style.borderColor = m === 'value' ? '#3fcf6a44' : '#333'; }
            if (rBtn) { rBtn.style.background = m === 'rap' ? '#38bdf822' : 'transparent'; rBtn.style.color = m === 'rap' ? '#38bdf8' : '#555'; rBtn.style.borderColor = m === 'rap' ? '#38bdf844' : '#333'; }
            // repaint all row indicators with new metric
            if (_tradesRepaint) _tradesRepaint();
        };

        overlay.querySelector('#pks-tr-metric-val')?.addEventListener('click', () => setTradeMetric('value'));
        overlay.querySelector('#pks-tr-metric-rap')?.addEventListener('click', () => setTradeMetric('rap'));

        const applyDispVal = () => {
            const on = dispValEl.checked;
            overlay.querySelectorAll('.pks-tr-ind').forEach(el => el.style.visibility = on ? '' : 'hidden');
            overlay.querySelectorAll('.pks-tr-pills').forEach(el => el.style.display = on ? '' : 'none');
            overlay.querySelectorAll('.pks-tr-div-fallback').forEach(el => el.style.display = on ? 'none' : '');
        };
        dispValEl.addEventListener('change', applyDispVal);

        loadList('inbound');
    };

    const applyTradesCustom = () => {
        let el = document.getElementById('pks-tr-custom');
        if (!el) { el = document.createElement('style'); el.id = 'pks-tr-custom'; document.head.appendChild(el); }
        const hex = (cfg.tradesBgColor || '#262626').trim();
        const r = parseInt(hex.slice(1, 3), 16); const g = parseInt(hex.slice(3, 5), 16); const b = parseInt(hex.slice(5, 7), 16);
        const rr = isNaN(r) ? 38 : r, gg = isNaN(g) ? 38 : g, bb = isNaN(b) ? 38 : b;
        const op = Math.max(0, Math.min(100, cfg.tradesOpacity ?? 100)) / 100;
        const blur = Math.max(0, cfg.tradesBlur ?? 0);
        const accent = (cfg.tradesAccent || '#ffffff').trim();
        const glass = cfg.tradesGlassCards ? `
            #pks-tr-overlay .pks-tr-card{box-sizing:border-box!important;background:rgba(255,255,255,0.05)!important;backdrop-filter:blur(16px) saturate(160%)!important;-webkit-backdrop-filter:blur(16px) saturate(160%)!important;border:1px solid rgba(255,255,255,0.12)!important;border-radius:14px!important;padding:10px!important;box-shadow:0 8px 30px rgba(0,0,0,0.3)!important;}
            #pks-tr-overlay .pks-tr-card .pks-tr-thumb{background:rgba(255,255,255,0.04)!important;}` : '';
        el.textContent = `
            #pks-tr-overlay{background:rgba(${rr},${gg},${bb},${op})!important;${blur ? `backdrop-filter:blur(${blur}px)!important;-webkit-backdrop-filter:blur(${blur}px)!important;` : 'backdrop-filter:none!important;'}}
            #pks-tr-overlay .pks-tr-item.sel{border-left-color:${accent}!important;}
            #pks-tr-overlay .pks-tr-btn.primary{background:${accent}!important;border-color:${accent}!important;color:#141414!important;}
            #pks-tr-overlay .pks-tr-sel{background-color:rgba(${rr},${gg},${bb},${op})!important;border:1px solid rgba(255,255,255,0.18)!important;border-radius:8px!important;}
            #pks-tr-overlay .pks-tr-pill{background-color:rgba(60,60,60,${(Math.max(0,Math.min(100,cfg.tradesPillOpacity??100))/100).toFixed(2)})!important;}
            ${glass}
        `;
    };

    const ensureTradesOverlay = () => {
        if (!/\/My\/Trades\.aspx/i.test(location.pathname)) return;
        if (_tradesClosed) return;
        if (_tradesInjecting) return;
        if (document.getElementById('pks-tr-overlay')) return;
        _tradesInjecting = true;
        Promise.resolve()
            .then(() => initOldTradesChecker())
            .catch(e => console.error('[Grexium] Trades overlay failed to inject:', e))
            .finally(() => { _tradesInjecting = false; });
    };

    const fetchMyInventory = async () => {
        if (!state.trade.myUserId) await fetchProfile();
        const uid = state.trade.myUserId;
        if (!uid) throw new Error('Not logged in');
        const items = [];
        let cursor = '';
        while (true) {
            const r = await fetch(`https://pekora.pro/apisite/inventory/v1/users/${uid}/assets/collectibles?limit=100${cursor ? '&cursor='+cursor : ''}`, { credentials:'include' });
            const d = await r.json();
            if (d.data) items.push(...d.data);
            if (d.nextPageCursor) cursor = d.nextPageCursor; else break;
        }
        return items;
    };

    const fetchAssetOwners = async (assetId) => {
        const owners = [];
        let cursor = '', pages = 0;
        if (!state.trade.myUserId) await fetchProfile();
        const myId = state.trade.myUserId;
        while (pages < 50) {
            pages++;
            const url = `https://pekora.pro/apisite/inventory/v2/assets/${assetId}/owners?limit=100${cursor ? '&cursor='+encodeURIComponent(cursor) : ''}`;
            try {
                const r = await fetch(url, { credentials:'include' });
                const d = await r.json();
                const items = d.data || [];
                for (const e of items) {
                    const ownerId = e.owner?.id || e.userId;
                    const ownerName = e.owner?.displayName || e.owner?.name || ('User #' + ownerId);
                    const userAssetId = e.userAssetId || e.id;
                    if (ownerId && userAssetId && String(ownerId) !== String(myId)) {
                        owners.push({ userId: ownerId, username: ownerName, userAssetId });
                    }
                }
                if (d.nextPageCursor) cursor = d.nextPageCursor; else break;
            } catch { break; }
        }
        return owners;
    };

    const getTradeAssetThumbs = async (assetIds) => {
        const needed = assetIds.filter(id => !state.trade.assetThumbs[id]);
        if (!needed.length) return;
        for (let i = 0; i < needed.length; i += 30) {
            const chunk = needed.slice(i, i + 30);
            try {
                const r = await fetch(`https://pekora.pro/apisite/thumbnails/v1/assets?assetIds=${chunk.join(',')}&format=png&size=110x110`, { credentials:'include' });
                const d = await r.json();
                for (const e of (d.data || [])) {
                    if (e.state === 'Completed' && e.imageUrl) state.trade.assetThumbs[e.targetId] = e.imageUrl;
                }
            } catch {}
        }
    };

    const buildMassTradeUI = () => {
        const t = getTheme();
        const bs = state.trade.massBlastState;
        const cs = state.trade.massCustomState;

        const mtLog = (msg, type, mode) => {
            const s = mode === 'blast' ? bs : cs;
            s.logs.push({ msg, type });
            const el = document.getElementById(mode === 'blast' ? 'mt-blast-log' : 'mt-custom-log');
            if (!el) return;
            const d = document.createElement('div');
            d.style.cssText = `font-size:10px;padding:3px 6px;border-radius:3px;margin-bottom:2px;background:${type === 'ok' ? 'rgba(0,232,122,0.08)' : type === 'err' ? 'rgba(255,68,102,0.08)' : 'rgba(255,255,255,0.03)'};color:${type === 'ok' ? '#00e87a' : type === 'err' ? '#ff4466' : t.sectionText};`;
            d.textContent = msg;
            el.appendChild(d); el.scrollTop = el.scrollHeight;
        };

        const container = document.getElementById('pks-tab-trade');
        if (!container) return;
        container.innerHTML = '';

        const tabBar = document.createElement('div');
        tabBar.style.cssText = `display:flex;gap:0;margin-bottom:12px;border-bottom:1px solid ${t.border};`;
        ['blast', 'custom'].forEach((mode, idx) => {
            const btn = document.createElement('button');
            btn.id = `mt-tab-${mode}`;
            btn.style.cssText = `all:unset;flex:1;text-align:center;padding:8px;font-size:10px;font-weight:700;letter-spacing:0.08em;cursor:pointer;border-bottom:2px solid ${idx === 0 ? t.accent : 'transparent'};color:${idx === 0 ? t.accent : t.sectionText};transition:color 0.15s,border-color 0.15s;`;
            btn.textContent = mode === 'blast' ? 'BLAST OWNERS' : 'CUSTOM';
            btn.addEventListener('click', () => {
                document.querySelectorAll('[id^="mt-tab-"]').forEach(b => { b.style.borderBottomColor = 'transparent'; b.style.color = t.sectionText; });
                document.querySelectorAll('[id^="mt-mode-"]').forEach(p => p.style.display = 'none');
                btn.style.borderBottomColor = t.accent; btn.style.color = t.accent;
                document.getElementById(`mt-mode-${mode}`).style.display = '';
            });
            tabBar.appendChild(btn);
        });
        container.appendChild(tabBar);

        const blastPanel = document.createElement('div'); blastPanel.id = 'mt-mode-blast';
        blastPanel.innerHTML = `
            <div style="margin-bottom:10px;">
                <div class="pks-section-title">1. Your Items (max 4)</div>
                <button id="mt-blast-load" class="pks-action-btn" style="width:100%;background:${t.inputBg};color:${t.labelText};border-color:${t.border};padding:7px;font-size:10px;margin-bottom:8px;">Load My Inventory</button>
                <div id="mt-blast-my-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:3px;max-height:168px;overflow-y:auto;overflow-x:hidden;"></div>
            </div>
            <div style="margin-bottom:10px;">
                <div class="pks-section-title">2. Target Item (Asset ID)</div>
                <div style="display:flex;gap:6px;margin-bottom:6px;">
                    <input type="text" id="mt-blast-assetid" placeholder="Asset ID" style="flex:1;background:${t.inputBg};border:1px solid ${t.inputBorder};border-radius:5px;color:${t.valueText};font-size:11px;padding:5px 8px;outline:none;font-family:inherit;">
                    <button id="mt-blast-find" class="pks-action-btn" style="background:${t.inputBg};color:${t.labelText};border-color:${t.border};padding:5px 10px;font-size:10px;">Find Owners</button>
                </div>
                <div id="mt-blast-owner-info" style="font-size:10px;color:${t.sectionText};min-height:14px;"></div>
            </div>
            <div style="margin-bottom:10px;">
                <div class="pks-section-title">3. Send</div>
                <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px;">
                    <span style="font-size:10px;color:${t.sectionText};">Delay:</span>
                    <button id="mt-delay-dec" style="all:unset;width:22px;height:22px;background:${t.inputBg};border:1px solid ${t.border};border-radius:4px;color:${t.valueText};text-align:center;cursor:pointer;font-size:12px;line-height:22px;">\u2212</button>
                    <span id="mt-delay-val" style="font-size:11px;color:${t.valueText};font-weight:700;min-width:40px;text-align:center;">20s</span>
                    <button id="mt-delay-inc" style="all:unset;width:22px;height:22px;background:${t.inputBg};border:1px solid ${t.border};border-radius:4px;color:${t.valueText};text-align:center;cursor:pointer;font-size:12px;line-height:22px;">+</button>
                </div>
                <div style="display:flex;gap:6px;margin-bottom:6px;">
                    <button id="mt-blast-send" class="pks-action-btn" style="flex:1;background:${t.accent};color:#050508;padding:8px;" disabled>\u25b6 Send to All Owners</button>
                    <button id="mt-blast-stop" class="pks-action-btn" style="background:#2a1a1a;color:#ff4466;border-color:#ff446633;padding:8px;display:none;">\u25a0 Stop</button>
                </div>
                <div id="mt-blast-progress-wrap" style="display:none;height:4px;background:${t.inputBg};border-radius:2px;overflow:hidden;margin-bottom:6px;"><div id="mt-blast-progress-bar" style="height:100%;width:0%;background:${t.accent};border-radius:2px;transition:width 0.3s;"></div></div>
                <div id="mt-blast-log" style="max-height:100px;overflow-y:auto;background:${t.inputBg};border:1px solid ${t.border};border-radius:5px;padding:4px;"></div>
            </div>
        `;
        container.appendChild(blastPanel);

        const customPanel = document.createElement('div'); customPanel.id = 'mt-mode-custom'; customPanel.style.display = 'none';
        customPanel.innerHTML = `
            <div style="margin-bottom:10px;">
                <div class="pks-section-title">1. Your Items (max 4)</div>
                <button id="mt-custom-load" class="pks-action-btn" style="width:100%;background:${t.inputBg};color:${t.labelText};border-color:${t.border};padding:7px;font-size:10px;margin-bottom:8px;">Load My Inventory</button>
                <div id="mt-custom-my-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:3px;max-height:168px;overflow-y:auto;overflow-x:hidden;"></div>
            </div>
            <div style="margin-bottom:10px;">
                <div class="pks-section-title">2. Add Targets</div>
                <div style="display:flex;gap:5px;margin-bottom:6px;">
                    <input type="text" id="mt-custom-user" placeholder="Username or ID" style="flex:1;background:${t.inputBg};border:1px solid ${t.inputBorder};border-radius:5px;color:${t.valueText};font-size:11px;padding:5px 8px;outline:none;font-family:inherit;">
                    <input type="text" id="mt-custom-asset" placeholder="Asset ID" style="width:90px;background:${t.inputBg};border:1px solid ${t.inputBorder};border-radius:5px;color:${t.valueText};font-size:11px;padding:5px 8px;outline:none;font-family:inherit;">
                    <button id="mt-custom-add" class="pks-action-btn" style="background:${t.inputBg};color:${t.labelText};border-color:${t.border};padding:5px 10px;font-size:10px;">Add</button>
                </div>
                <div id="mt-custom-targets" style="max-height:120px;overflow-y:auto;display:flex;flex-direction:column;gap:4px;"></div>
            </div>
            <div>
                <button id="mt-custom-send" class="pks-action-btn" style="width:100%;background:${t.accent};color:#050508;padding:8px;" disabled>\u25b6 Send All Trades</button>
                <div id="mt-custom-log" style="max-height:100px;overflow-y:auto;background:${t.inputBg};border:1px solid ${t.border};border-radius:5px;padding:4px;margin-top:6px;"></div>
            </div>
        `;
        container.appendChild(customPanel);

        const renderBlastMyGrid = () => {
            const grid = document.getElementById('mt-blast-my-grid');
            if (!grid) return;
            grid.innerHTML = '';
            bs.myItems.forEach(item => {
                const isSel = bs.mySelected.some(s => s.userAssetId === item.userAssetId);
                const isMax = bs.mySelected.length >= 4 && !isSel;
                const card = document.createElement('div');
                card.style.cssText = `background:${t.inputBg};border:1px solid ${isSel ? t.accent : t.border};border-radius:6px;padding:3px;cursor:${isMax ? 'not-allowed' : 'pointer'};opacity:${isMax ? '0.25' : '1'};text-align:center;transition:border-color 0.15s;overflow:hidden;`;
                const thumb = state.trade.assetThumbs[item.assetId] || '';
                card.innerHTML = `${thumb ? `<img src="${thumb}" style="width:100%;aspect-ratio:1;object-fit:contain;border-radius:4px;background:${t.headerBg};display:block;">` : `<div style="width:100%;aspect-ratio:1;background:${t.headerBg};border-radius:4px;"></div>`}<div style="font-size:8px;color:${t.valueText};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:2px;">${item.name||'Item'}</div>`;
                if (!isMax) {
                    card.addEventListener('click', () => {
                        const idx = bs.mySelected.findIndex(s => s.userAssetId === item.userAssetId);
                        if (idx >= 0) bs.mySelected.splice(idx, 1); else if (bs.mySelected.length < 4) bs.mySelected.push(item);
                        renderBlastMyGrid();
                        const sendBtn = document.getElementById('mt-blast-send');
                        if (sendBtn) sendBtn.disabled = !bs.mySelected.length || !bs.targetOwners.length;
                    });
                }
                grid.appendChild(card);
            });
        };

        document.getElementById('mt-blast-load').addEventListener('click', async () => {
            const btn = document.getElementById('mt-blast-load');
            btn.disabled = true; btn.textContent = 'Loading\u2026';
            try {
                await getKoromonsData();
                const items = await fetchMyInventory();
                bs.myItems = items; bs.mySelected = [];
                const ids = [...new Set(items.map(i => i.assetId).filter(Boolean))];
                if (ids.length) await getTradeAssetThumbs(ids);
                renderBlastMyGrid();
                btn.textContent = `Loaded (${items.length})`;
            } catch (e) { btn.textContent = 'Load My Inventory'; btn.disabled = false; mtLog('Error: ' + e.message, 'err', 'blast'); }
        });

        document.getElementById('mt-blast-find').addEventListener('click', async () => {
            const assetId = parseInt(document.getElementById('mt-blast-assetid').value.trim());
            if (!assetId) { mtLog('Enter an asset ID', 'err', 'blast'); return; }
            const btn = document.getElementById('mt-blast-find');
            btn.disabled = true; btn.textContent = '\u2026';
            const info = document.getElementById('mt-blast-owner-info');
            if (info) info.textContent = 'Finding owners\u2026';
            try {
                const owners = await fetchAssetOwners(assetId);
                bs.targetAssetId = assetId;
                bs.targetOwners = owners;
                if (info) info.textContent = `Found ${owners.length} owners`;
                mtLog(`Found ${owners.length} owners of asset ${assetId}`, 'ok', 'blast');
                const sendBtn = document.getElementById('mt-blast-send');
                if (sendBtn) sendBtn.disabled = !bs.mySelected.length || !owners.length;
            } catch (e) { mtLog('Error: ' + e.message, 'err', 'blast'); if (info) info.textContent = ''; }
            btn.disabled = false; btn.textContent = 'Find Owners';
        });

        let blastDelay = 20;
        const updateDelayDisplay = () => {
            const el = document.getElementById('mt-delay-val');
            if (el) el.textContent = blastDelay + 's';
        };
        document.getElementById('mt-delay-dec').addEventListener('click', () => { if (blastDelay > 5) blastDelay -= 5; updateDelayDisplay(); });
        document.getElementById('mt-delay-inc').addEventListener('click', () => { if (blastDelay < 120) blastDelay += 5; updateDelayDisplay(); });

        document.getElementById('mt-blast-send').addEventListener('click', async () => {
            if (!bs.mySelected.length || !bs.targetOwners.length) return;
            bs.sending = true; bs.stopped = false;
            const sendBtn = document.getElementById('mt-blast-send');
            const stopBtn = document.getElementById('mt-blast-stop');
            const progWrap = document.getElementById('mt-blast-progress-wrap');
            const progBar  = document.getElementById('mt-blast-progress-bar');
            if (sendBtn) sendBtn.style.display = 'none';
            if (stopBtn) stopBtn.style.display = '';
            if (progWrap) progWrap.style.display = 'block';
            if (!state.trade.myUserId) await fetchProfile();
            const myId = state.trade.myUserId;
            let sent = 0, failed = 0;
            mtLog(`Blasting to ${bs.targetOwners.length} owners\u2026`, 'info', 'blast');
            for (let i = 0; i < bs.targetOwners.length; i++) {
                if (bs.stopped) { mtLog('Stopped.', 'info', 'blast'); break; }
                if (progBar) progBar.style.width = Math.round((i / bs.targetOwners.length) * 100) + '%';
                const owner = bs.targetOwners[i];
                try {
                    const r = await postApi('https://pekora.pro/apisite/trades/v1/trades/send', {
                        offers: [
                            { userId: parseInt(myId), userAssetIds: bs.mySelected.map(x => x.userAssetId) },
                            { userId: owner.userId, userAssetIds: [owner.userAssetId] }
                        ]
                    });
                    if (r.ok) { sent++; mtLog(`\u2713 [${i+1}/${bs.targetOwners.length}] ${owner.username}`, 'ok', 'blast'); }
                    else throw new Error('HTTP ' + r.status);
                } catch (e) { failed++; mtLog(`\u2717 ${owner.username}: ${e.message}`, 'err', 'blast'); }
                if (i < bs.targetOwners.length - 1 && !bs.stopped) await new Promise(r => setTimeout(r, blastDelay * 1000));
            }
            if (progBar) progBar.style.width = '100%';
            mtLog(`Done! Sent: ${sent} | Failed: ${failed}`, sent > 0 ? 'ok' : 'err', 'blast');
            bs.sending = false;
            if (sendBtn) sendBtn.style.display = '';
            if (stopBtn) stopBtn.style.display = 'none';
        });

        document.getElementById('mt-blast-stop').addEventListener('click', () => { bs.stopped = true; });

        const renderCustomMyGrid = () => {
            const grid = document.getElementById('mt-custom-my-grid');
            if (!grid) return;
            grid.innerHTML = '';
            cs.myItems.forEach(item => {
                const isSel = cs.mySelected.some(s => s.userAssetId === item.userAssetId);
                const isMax = cs.mySelected.length >= 4 && !isSel;
                const card = document.createElement('div');
                card.style.cssText = `background:${t.inputBg};border:1px solid ${isSel ? t.accent : t.border};border-radius:6px;padding:3px;cursor:${isMax ? 'not-allowed' : 'pointer'};opacity:${isMax ? '0.25' : '1'};text-align:center;transition:border-color 0.15s;overflow:hidden;`;
                const thumb = state.trade.assetThumbs[item.assetId] || '';
                card.innerHTML = `${thumb ? `<img src="${thumb}" style="width:100%;aspect-ratio:1;object-fit:contain;border-radius:4px;background:${t.headerBg};display:block;">` : `<div style="width:100%;aspect-ratio:1;background:${t.headerBg};border-radius:4px;"></div>`}<div style="font-size:8px;color:${t.valueText};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:2px;">${item.name||'Item'}</div>`;
                if (!isMax) {
                    card.addEventListener('click', () => {
                        const idx = cs.mySelected.findIndex(s => s.userAssetId === item.userAssetId);
                        if (idx >= 0) cs.mySelected.splice(idx, 1); else if (cs.mySelected.length < 4) cs.mySelected.push(item);
                        renderCustomMyGrid();
                        const sendBtn = document.getElementById('mt-custom-send');
                        if (sendBtn) sendBtn.disabled = !cs.mySelected.length || !cs.targets.filter(x => x.status === 'ready').length;
                    });
                }
                grid.appendChild(card);
            });
        };

        document.getElementById('mt-custom-load').addEventListener('click', async () => {
            const btn = document.getElementById('mt-custom-load');
            btn.disabled = true; btn.textContent = 'Loading\u2026';
            try {
                await getKoromonsData();
                const items = await fetchMyInventory();
                cs.myItems = items; cs.mySelected = [];
                const ids = [...new Set(items.map(i => i.assetId).filter(Boolean))];
                if (ids.length) await getTradeAssetThumbs(ids);
                renderCustomMyGrid();
                btn.textContent = `\u2713 Loaded (${items.length})`;
            } catch (e) { btn.textContent = 'Load My Inventory'; btn.disabled = false; mtLog('Error: ' + e.message, 'err', 'custom'); }
        });

        const renderTargetsList = () => {
            const list = document.getElementById('mt-custom-targets');
            if (!list) return;
            list.innerHTML = '';
            cs.targets.forEach((target, i) => {
                const row = document.createElement('div');
                row.style.cssText = `display:flex;align-items:center;gap:6px;padding:5px 8px;background:${t.inputBg};border:1px solid ${t.border};border-radius:5px;font-size:10px;`;
                const statusColor = target.status === 'ready' ? '#00e87a' : target.status === 'error' ? '#ff4466' : target.status === 'sent' ? '#38bdf8' : t.sectionText;
                const statusIcon  = target.status === 'ready' ? '\u2713' : target.status === 'error' ? '\u2717' : target.status === 'sent' ? '\u2192' : '\u2026';
                row.innerHTML = `<span style="color:${statusColor};font-weight:700;flex-shrink:0;">${statusIcon}</span><span style="flex:1;color:${t.valueText};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${target.username}</span><span style="color:${t.sectionText};font-size:9px;flex-shrink:0;">${target.assetName || target.assetId}</span>`;
                if (target.status !== 'sent') {
                    const rm = document.createElement('button');
                    rm.style.cssText = `all:unset;color:#ff4466;cursor:pointer;font-size:12px;padding:0 2px;font-weight:700;flex-shrink:0;`;
                    rm.textContent = '\u00d7';
                    rm.addEventListener('click', () => { cs.targets.splice(i, 1); renderTargetsList(); updateCustomSendBtn(); });
                    row.appendChild(rm);
                }
                list.appendChild(row);
            });
        };

        const updateCustomSendBtn = () => {
            const btn = document.getElementById('mt-custom-send');
            if (!btn) return;
            const ready = cs.targets.filter(x => x.status === 'ready').length;
            btn.disabled = !cs.mySelected.length || !ready;
            btn.textContent = ready ? `\u25b6 Send ${ready} Trade${ready > 1 ? 's' : ''}` : '\u25b6 Send All Trades';
        };

        document.getElementById('mt-custom-add').addEventListener('click', async () => {
            const userRaw  = document.getElementById('mt-custom-user').value.trim();
            const assetRaw = document.getElementById('mt-custom-asset').value.trim();
            if (!userRaw || !assetRaw || !/^\d+$/.test(assetRaw)) { mtLog('Enter username/ID and asset ID', 'err', 'custom'); return; }
            const assetId = parseInt(assetRaw);
            const entry = { userId: null, username: userRaw, assetId, assetName: '', userAssetId: null, status: 'loading' };
            cs.targets.push(entry); renderTargetsList();
            try {
                let userId;
                if (/^\d+$/.test(userRaw)) { userId = parseInt(userRaw); }
                else {
                    const r = await postApi('https://pekora.pro/apisite/users/v1/usernames/users', { usernames: [userRaw], excludeBannedUsers: false });
                    const d = await r.json();
                    if (!d.data?.length) throw new Error('User not found');
                    userId = d.data[0].id;
                    entry.username = d.data[0].displayName || d.data[0].name || userRaw;
                }
                entry.userId = userId;
                try {
                    const ar = await fetch(`https://pekora.pro/apisite/catalog/v1/catalog/items/${assetId}/details?itemType=Asset`, { credentials:'include' });
                    const ad = await ar.json();
                    if (ad.name) entry.assetName = ad.name;
                } catch {}
                let found = null;
                let cursor = '';
                outer: while (true) {
                    const r2 = await fetch(`https://pekora.pro/apisite/inventory/v1/users/${userId}/assets/collectibles?limit=100${cursor ? '&cursor='+cursor : ''}`, { credentials:'include' });
                    const d2 = await r2.json();
                    for (const item of (d2.data || [])) {
                        if (item.assetId === assetId) { found = item; break outer; }
                    }
                    if (d2.nextPageCursor) cursor = d2.nextPageCursor; else break;
                }
                if (found) { entry.userAssetId = found.userAssetId; entry.status = 'ready'; mtLog(`\u2713 ${entry.username} has ${entry.assetName || assetId}`, 'ok', 'custom'); }
                else { entry.status = 'error'; mtLog(`\u2717 ${entry.username} doesn't have item ${assetId}`, 'err', 'custom'); }
            } catch (e) { entry.status = 'error'; mtLog('Error: ' + e.message, 'err', 'custom'); }
            renderTargetsList(); updateCustomSendBtn();
            document.getElementById('mt-custom-user').value = '';
            document.getElementById('mt-custom-asset').value = '';
        });

        document.getElementById('mt-custom-send').addEventListener('click', async () => {
            const ready = cs.targets.filter(x => x.status === 'ready');
            if (!cs.mySelected.length || !ready.length) return;
            if (!state.trade.myUserId) await fetchProfile();
            const myId = state.trade.myUserId;
            mtLog(`Sending ${ready.length} trades\u2026`, 'info', 'custom');
            for (let i = 0; i < ready.length; i++) {
                const target = ready[i];
                try {
                    const r = await postApi('https://pekora.pro/apisite/trades/v1/trades/send', {
                        offers: [
                            { userId: parseInt(myId), userAssetIds: cs.mySelected.map(x => x.userAssetId) },
                            { userId: target.userId, userAssetIds: [target.userAssetId] }
                        ]
                    });
                    if (r.ok) { target.status = 'sent'; mtLog(`Sent to ${target.username}`, 'ok', 'custom'); }
                    else throw new Error('HTTP ' + r.status);
                } catch (e) { mtLog(`${target.username}: ${e.message}`, 'err', 'custom'); }
                renderTargetsList();
                if (i < ready.length - 1) await new Promise(r => setTimeout(r, 20000));
            }
            mtLog('Done!', 'ok', 'custom');
            updateCustomSendBtn();
        });

        bs.logs.forEach(({ msg, type }) => {
            const el = document.getElementById('mt-blast-log');
            if (!el) return;
            const d = document.createElement('div');
            d.style.cssText = `font-size:10px;padding:3px 6px;border-radius:3px;margin-bottom:2px;background:${type === 'ok' ? 'rgba(0,232,122,0.08)' : type === 'err' ? 'rgba(255,68,102,0.08)' : 'rgba(255,255,255,0.03)'};color:${type === 'ok' ? '#00e87a' : type === 'err' ? '#ff4466' : t.sectionText};`;
            d.textContent = msg; el.appendChild(d); el.scrollTop = el.scrollHeight;
        });
    };

    const buildPanel = (authInfo = {}) => {
        const style = document.createElement('style');
        style.id = 'pks-panel-style';
        style.textContent = `
            /* ── design tokens (deduped surfaces/lines) ───────────────── */
            #pks-panel {
                --pks-surface:#15151d; --pks-surface-2:#101017; --pks-surface-3:#0a0a10;
                --pks-line:#262633; --pks-line-soft:#1d1d28; --pks-radius:9px;
            }
            #pks-panel * { box-sizing:border-box; }
            #pks-panel, #pks-panel input, #pks-panel select, #pks-panel button, #pks-panel span, #pks-panel div, #pks-panel label {
                font-family:var(--pks-font),'Share Tech Mono',monospace;
            }
            @keyframes pks-panel-in { from{opacity:0;transform:translateY(-10px) scale(0.97);} to{opacity:1;transform:translateY(0) scale(1);} }
            @keyframes pks-fade-in { from{opacity:0;transform:translateY(4px);} to{opacity:1;transform:translateY(0);} }
            @keyframes pks-border-flow { 0%{background-position:0% 50%;} 100%{background-position:200% 50%;} }
            #pks-panel [id^="pks-tab-"][style*="block"] { animation:pks-fade-in 0.22s ease; }
            #pks-panel input[type=number], #pks-panel input[type=text], #pks-panel select {
                background:var(--pks-surface);border:1px solid var(--pks-line);border-radius:var(--pks-radius);color:#e6e6f2;font-size:11px;padding:6px 9px;transition:border-color 0.15s,box-shadow 0.15s,background 0.15s;outline:none;
            }
            #pks-panel input[type=text]:hover, #pks-panel input[type=number]:hover, #pks-panel select:hover { background:#1a1a24; }
            #pks-panel input[type=color] { padding:2px;width:38px;height:28px;cursor:pointer;background:var(--pks-surface);border:1px solid var(--pks-line);border-radius:7px; }
            #pks-panel input[type=checkbox] { -webkit-appearance:none;appearance:none;width:32px;height:18px;border-radius:9px;background:var(--pks-surface-3);border:1px solid var(--pks-line);cursor:pointer;position:relative;transition:background 0.2s,border-color 0.2s;flex-shrink:0; }
            #pks-panel input[type=checkbox]::after { content:'';position:absolute;top:1px;left:1px;width:14px;height:14px;border-radius:50%;background:#54545f;transition:transform 0.2s,background 0.2s; }
            #pks-panel input[type=checkbox]:checked::after { transform:translateX(14px);background:#fff; }
            #pks-panel select { cursor:pointer; }
            #pks-panel ::-webkit-scrollbar { width:6px;height:6px; }
            #pks-panel ::-webkit-scrollbar-track { background:transparent; }
            #pks-panel ::-webkit-scrollbar-thumb { background:#2c2c3a;border-radius:3px;border:1px solid transparent;background-clip:padding-box; }
            #pks-panel ::-webkit-scrollbar-thumb:hover { background:#3a3a4c; }
            #pks-panel label { cursor:pointer; }
            #pks-tab-bar::-webkit-scrollbar { display:none; }
            .pks-tab-btn { all:unset;padding:11px 5px 9px;font-size:8.5px;font-weight:700;letter-spacing:0.07em;cursor:pointer;color:#5a5a68;transition:color 0.15s,background 0.15s,border-color 0.15s;border-bottom:2px solid transparent;white-space:nowrap;flex:1;text-align:center;position:relative;border-radius:7px 7px 0 0; }
            .pks-tab-btn:hover { color:#a8a8bb;background:rgba(255,255,255,0.03); }
            .pks-tab-btn svg { transition:transform 0.15s; }
            .pks-tab-btn:hover svg { transform:translateY(-1px); }
            .pks-section-title { color:#3a3a48;font-size:8px;letter-spacing:0.16em;text-transform:uppercase;margin:16px 0 9px;font-weight:700;display:flex;align-items:center;gap:8px; }
            .pks-section-title::after { content:'';flex:1;height:1px;background:linear-gradient(90deg,currentColor,transparent);opacity:0.35; }
            .pks-row { display:flex;align-items:center;justify-content:space-between;margin-bottom:9px;gap:8px;padding:1px 0; }
            .pks-row label { color:#b0b0c0;font-size:11px;flex:1; }
            .pks-row .pks-row-right { display:flex;align-items:center;gap:6px;flex-shrink:0; }
            .pks-stat { flex:1;background:linear-gradient(160deg,var(--pks-surface),var(--pks-surface-2));border:1px solid var(--pks-line-soft);border-radius:10px;padding:10px 8px;text-align:center;transition:border-color 0.18s,transform 0.18s; }
            .pks-stat:hover { transform:translateY(-1px);border-color:var(--pks-line); }
            .pks-stat-val { color:#00e87a;font-size:21px;font-weight:700;display:block;line-height:1;letter-spacing:-0.02em; }
            .pks-stat-lbl { color:#45454f;font-size:8px;text-transform:uppercase;letter-spacing:0.13em;margin-top:5px;display:block; }
            .pks-action-btn { all:unset;flex:1;text-align:center;padding:9px 0;border-radius:var(--pks-radius);font-size:11px;font-weight:700;letter-spacing:0.08em;cursor:pointer;transition:filter 0.15s,transform 0.12s,box-shadow 0.15s;border:1px solid transparent;position:relative; }
            .pks-action-btn:hover { transform:translateY(-1px); }
            .pks-action-btn:active { transform:scale(0.97)!important; }
            .pks-hk-record { all:unset;padding:5px 13px;border-radius:7px;font-size:11px;font-weight:700;cursor:pointer;border:1px solid var(--pks-line);background:var(--pks-surface);color:#bcbccc;min-width:52px;text-align:center;transition:border-color 0.15s,color 0.15s,background 0.15s; }
            .pks-hk-record:hover { background:#1c1c26;border-color:#33334a; }
            .pks-hk-record.recording { border-color:#f0a500!important;color:#f0a500!important;animation:pks-blink 0.8s infinite; }
            @keyframes pks-blink { 0%,100%{opacity:1}50%{opacity:0.3} }
            .pks-theme-swatch { all:unset;padding:8px 10px;border-radius:8px;font-size:10px;font-weight:700;letter-spacing:0.04em;cursor:pointer;border:1px solid var(--pks-line-soft);background:var(--pks-surface-2);text-align:center;transition:filter 0.15s,transform 0.15s,box-shadow 0.15s;display:flex;align-items:center;gap:7px; }
            .pks-theme-swatch:hover { filter:brightness(1.3);transform:translateY(-1px); }
            .pks-theme-swatch.active { border-width:1.5px;box-shadow:0 2px 14px -4px currentColor; }
            .pks-dot { width:8px;height:8px;border-radius:50%;flex-shrink:0; }
            .pks-currency-pill { display:flex;align-items:center;gap:5px;background:var(--pks-surface);border:1px solid var(--pks-line-soft);border-radius:7px;padding:3px 9px;font-size:11px; }
            .pks-unit-label { color:#4a4a56;font-size:10px; }
            .pks-win-btn { all:unset;width:11px;height:11px;border-radius:50%;cursor:pointer;display:block;flex-shrink:0;transition:filter 0.15s,transform 0.1s,box-shadow 0.15s;box-shadow:inset 0 0 0 1px rgba(0,0,0,0.25); }
            .pks-win-btn:hover { filter:brightness(1.3);transform:scale(1.18); }
            .pks-win-btn:active { transform:scale(0.92); }
            .pks-page-badge { display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:6px;font-size:8px;letter-spacing:0.12em;text-transform:uppercase;font-weight:700;background:rgba(255,255,255,0.045);border:1px solid rgba(255,255,255,0.09);color:#6a6a7a;margin-bottom:9px; }
            .pks-mode-pill { display:inline-flex;border:1px solid var(--pks-line);border-radius:8px;overflow:hidden;background:var(--pks-surface); }
            .pks-mode-pill button { all:unset;padding:5px 11px;font-size:9.5px;font-weight:700;letter-spacing:0.06em;cursor:pointer;color:#52525e;background:transparent;transition:background 0.15s,color 0.15s;white-space:nowrap; }
            .pks-mode-pill button:hover { color:#9a9aae; }
            .pks-mode-pill button.active { background:#2a2a3a;color:#eaeaf5; }
            .pks-mode-pill button:not(:last-child) { border-right:1px solid var(--pks-line); }
        `;
        document.head.appendChild(style);

        const panel = document.createElement('div');
        panel.id = 'pks-panel';
        panel.style.cssText = `all:initial;position:fixed;top:18px;right:18px;z-index:2147483647;font-family:var(--pks-font),'Share Tech Mono',monospace;background:#0c0c0e;border:1px solid #2a2a35;border-radius:16px;width:374px;box-shadow:0 14px 60px rgba(0,0,0,0.9),0 0 0 1px rgba(255,255,255,0.04);overflow:hidden;user-select:none;transform-origin:top right;animation:pks-panel-in 0.34s cubic-bezier(0.22,1,0.36,1);`;

        panel.innerHTML = `
            <div id="pks-top-border" style="height:3px;width:100%;background:linear-gradient(90deg,#00e5ff,#a855f7,#fbbf24);background-size:200% 100%;animation:pks-border-flow 6s linear infinite;flex-shrink:0;"></div>
            <div id="pks-header" style="padding:13px 15px;background:#111116;cursor:move;border-bottom:1px solid #1a1a22;position:relative;">
                <div style="display:flex;align-items:center;gap:11px;">
                    <div style="position:relative;flex-shrink:0;width:40px;height:40px;">
                        <div style="position:absolute;inset:-3px;border-radius:50%;background:conic-gradient(from 0deg,rgba(0,232,122,0.5),rgba(0,232,122,0.05),rgba(0,232,122,0.5));opacity:0.55;"></div>
                        <img id="pks-avatar-img" src="" alt="" style="position:relative;width:40px;height:40px;border-radius:50%;border:2px solid rgba(0,232,122,0.35);background:#1a1a2a;object-fit:cover;display:none;">
                        <div id="pks-avatar-anon" style="position:relative;width:40px;height:40px;border-radius:50%;border:2px solid rgba(255,255,255,0.12);background:#1a1a2a;display:none;align-items:center;justify-content:center;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                        </div>
                        <div style="position:absolute;bottom:0;right:0;width:9px;height:9px;background:#00e87a;border-radius:50%;border:2px solid #111116;box-shadow:0 0 6px #00e87a;z-index:1;"></div>
                    </div>
                    <div style="flex:1;min-width:0;">
                        <div id="pks-header-title" style="font-size:9px;letter-spacing:0.24em;text-transform:uppercase;line-height:1;margin-bottom:3px;font-weight:700;">Grexium [BETA]</div>
                        <div id="pks-profile-name" style="color:#fff;font-size:13.5px;font-weight:700;letter-spacing:0.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:112px;line-height:1.2;">Loading\u2026</div>
                    </div>
                    <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end;">
                        <div class="pks-currency-pill" style="padding:3px 9px;font-size:10px;"><span style="color:#00e87a;font-size:7.5px;font-weight:700;">R$</span><span id="pks-profile-robux" style="color:#fff;font-weight:700;">\u2014</span></div>
                        <div class="pks-currency-pill" style="padding:3px 9px;font-size:10px;"><span style="color:#f0a500;font-size:7.5px;font-weight:700;">TIX</span><span id="pks-profile-tickets" style="color:#fff;font-weight:700;">\u2014</span></div>
                    </div>
                    <div style="display:flex;flex-direction:column;gap:6px;align-items:center;flex-shrink:0;margin-left:3px;">
                        <button id="pks-min-btn" class="pks-win-btn" title="Minimise" style="background:#febc2e;"></button>
                        <button id="pks-close-btn" class="pks-win-btn" title="Close" style="background:#ff5f57;"></button>
                    </div>
                </div>
            </div>
            <div id="pks-body">
                <div id="pks-tab-bar" style="display:flex;align-items:flex-end;padding:0 2px;background:#0d0d0f;border-bottom:1px solid #1a1a24;overflow-x:auto;scrollbar-width:none;">
                    <button class="pks-tab-btn active" data-tab="refresher"><svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="vertical-align:middle;margin-right:3px;"><path d="M14 8A6 6 0 1 1 8 2"/><polyline points="14 2 14 8 8 8"/></svg>REFRESH</button>
                    <button class="pks-tab-btn" data-tab="trade"><svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="vertical-align:middle;margin-right:3px;"><path d="M7 16V4L3 8m4-4l4 4M9 1v12l4-4m-4 4l4-4"/></svg>TRADE</button>
                    <button class="pks-tab-btn" data-tab="larp"><svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="vertical-align:middle;margin-right:3px;"><rect x="1" y="4" width="14" height="8" rx="1"/><circle cx="8" cy="8" r="2"/></svg>LARP</button>
                    <button class="pks-tab-btn" data-tab="hex"><svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:3px;"><path d="M2 5l3 2.2L8 2l3 5.2L14 5l-1.3 8H3.3z"/></svg>HEX</button>
                    <button class="pks-tab-btn" data-tab="misc"><svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="vertical-align:middle;margin-right:3px;"><circle cx="8" cy="8" r="2"/><path d="M8 2v2M8 12v2M2 8h2M12 8h2"/></svg>MISC</button>
                    <button class="pks-tab-btn" data-tab="settings"><svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="vertical-align:middle;margin-right:3px;"><circle cx="8" cy="8" r="2.5"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.5 3.5l1.4 1.4M11.1 11.1l1.4 1.4M3.5 12.5l1.4-1.4M11.1 4.9l1.4-1.4"/></svg>CFG</button>
                </div>
                <div id="pks-tab-refresher" style="padding:12px 13px;display:block;max-height:460px;overflow-y:auto;">
                    <div style="display:flex;align-items:center;gap:8px;padding:9px 11px;border-radius:7px;background:#16161f;border:1px solid #1e1e2a;margin-bottom:12px;">
                        <div id="pks-r-dot" style="width:8px;height:8px;border-radius:50%;background:#2e2e3a;flex-shrink:0;transition:background 0.3s,box-shadow 0.3s;"></div>
                        <div id="pks-r-status" style="font-size:11px;color:#666;flex:1;">Status: <span style="color:#ccc">Idle</span></div>
                    </div>
                    <div class="pks-row"><label>Click interval</label><div class="pks-row-right"><input type="number" id="pks-r-click-ms" min="100" step="100" style="width:80px;"><span class="pks-unit-label">ms</span></div></div>
                    <div class="pks-row"><label>Hard refresh every</label><div class="pks-row-right"><input type="number" id="pks-r-reload-ms" min="5000" step="1000" style="width:80px;"><span class="pks-unit-label">ms</span></div></div>
                    <div style="display:flex;gap:8px;margin:12px 0 10px;">
                        <button id="pks-r-start" class="pks-action-btn" style="background:#00e87a;color:#050508;">\u25b6 START</button>
                        <button id="pks-r-stop" class="pks-action-btn" style="background:#1a1a2a;color:#666;border-color:#252535;">\u25a0 STOP</button>
                    </div>
                    <div style="display:flex;gap:8px;margin-bottom:12px;">
                        <div class="pks-stat"><span class="pks-stat-val" id="pks-r-clicks">0</span><span class="pks-stat-lbl">Clicks</span></div>
                        <div class="pks-stat"><span class="pks-stat-val" id="pks-r-reloads">0</span><span class="pks-stat-lbl">Reloads</span></div>
                    </div>
                    <div id="pks-r-log" style="background:#08080c;border:1px solid #151520;border-radius:6px;padding:8px;height:80px;overflow-y:auto;font-size:10px;line-height:1.65;color:#555;margin-bottom:12px;"></div>
                    <div class="pks-section-title">Keybinds</div>
                    <div class="pks-row"><label>Toggle Refresher</label><button class="pks-hk-record" id="pks-hk-record-refresher" data-cfg="hotkeyRefresher">F</button></div>
                    <div class="pks-row"><label>Hard Refresh Page</label><button class="pks-hk-record" id="pks-hk-record-hardrefresh" data-cfg="hotkeyHardRefresh">R</button></div>
                    <div style="padding:8px 10px;background:#13131c;border:1px solid #1e1e2a;border-radius:6px;margin-top:4px;">
                        <div style="color:#444;font-size:9px;line-height:1.85;letter-spacing:0.06em;">Click a key button to record. Press any key to bind, <span style="color:#ff4466;">ESC</span> to cancel.</div>
                    </div>
                </div>
                <div id="pks-tab-trade" style="padding:12px 13px;display:none;max-height:460px;overflow-y:auto;">
                    <div style="padding:20px;text-align:center;color:#444;font-size:11px;">Loading trade features\u2026</div>
                </div>
                <div id="pks-tab-larp" style="padding:12px 13px;display:none;max-height:460px;overflow-y:auto;">
                    <div style="display:flex;align-items:center;gap:8px;padding:9px 11px;border-radius:7px;background:#16161f;border:1px solid #1e1e2a;margin-bottom:12px;">
                        <div id="pks-larp-dot" style="width:8px;height:8px;border-radius:50%;background:#2e2e3a;flex-shrink:0;transition:background 0.3s,box-shadow 0.3s;"></div>
                        <div id="pks-larp-status" style="font-size:11px;color:#666;flex:1;">Status: <span style="color:#ccc">Off</span></div>
                    </div>
                    <div class="pks-section-title">Fake Balance</div>
                    <div class="pks-row"><label>Enable LARP</label><input type="checkbox" id="cfg-larpEnabled"></div>
                    <div class="pks-row"><label>Enable fake verify <span style="color:#1d9bf0;">✔</span></label><input type="checkbox" id="cfg-larpVerify"></div>
                    <div class="pks-row"><label><span style="color:#00e87a;font-weight:700;">R$</span> Fake Robux</label><div class="pks-row-right"><input type="text" id="cfg-larpRobux" placeholder="e.g. 1000000" style="width:120px;"></div></div>
                    <div class="pks-row"><label><span style="color:#f0a500;font-weight:700;">TIX</span> Fake Tix</label><div class="pks-row-right"><input type="text" id="cfg-larpTix" placeholder="e.g. 5807" style="width:120px;"></div></div>
                    <div class="pks-section-title">Fake Items</div>
                    <div style="display:flex;gap:6px;margin-bottom:8px;">
                        <input type="text" id="pks-larp-assetid" placeholder="Asset ID" style="flex:1;">
                        <input type="number" id="pks-larp-qty" placeholder="Qty" min="1" value="1" title="Owned quantity" style="width:54px;">
                        <button id="pks-larp-add-item" class="pks-action-btn" style="flex:0 0 auto;background:#00e87a;color:#050508;padding:0 16px;">Add</button>
                    </div>
                    <div id="pks-larp-fakelist" style="display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-bottom:8px;"></div>
                    <div style="padding:8px 10px;background:#13131c;border:1px solid #1e1e2a;border-radius:6px;">
                        <div style="color:#444;font-size:9px;line-height:1.85;letter-spacing:0.06em;">One list, both fakes: each asset shows as <span style="color:#00e87a;">Owned</span> on its catalog page <span style="color:#555;">and</span> as a worn item on your <span style="color:#00e87a;">/My/Avatar</span> page. Persists across refresh.</div>
                    </div>
                </div>
                <div id="pks-tab-misc" style="padding:12px 13px;display:none;max-height:460px;overflow-y:auto;">
                    <div style="margin-bottom:4px;"><span class="pks-page-badge">Universal \u2014 all pages</span></div>
                    <div class="pks-section-title">Sidebar Style</div>
                    <div class="pks-row"><label>Enable sidebar styling</label><input type="checkbox" id="cfg-sidebarEnabled"></div>
                    <div class="pks-row"><label>Mode</label><div class="pks-mode-pill" id="pks-sidebar-mode-pill"><button data-mode="transparent" class="active">Transparent</button><button data-mode="blur">Blur</button><button data-mode="colour">Colour</button></div></div>
                    <div class="pks-row" id="pks-sidebar-blur-row"><label style="font-size:10px;color:#555;padding-left:10px;">\u21b3 Blur amount</label><div class="pks-row-right"><input type="number" id="cfg-sidebarBlurAmount" min="1" max="40" step="1" style="width:55px;"><span class="pks-unit-label">px</span></div></div>
                    <div class="pks-row" id="pks-sidebar-colour-row"><label style="font-size:10px;color:#555;padding-left:10px;">\u21b3 Colour</label><input type="color" id="cfg-sidebarColour"></div>
                    <div class="pks-row"><label style="font-size:10px;color:#555;padding-left:10px;">\u21b3 Opacity</label><div class="pks-row-right"><input type="number" id="cfg-sidebarOpacity" min="0" max="100" step="5" style="width:55px;"><span class="pks-unit-label">%</span></div></div>
                    <div class="pks-section-title">Navbar Style</div>
                    <div class="pks-row"><label>Enable navbar styling</label><input type="checkbox" id="cfg-navbarEnabled"></div>
                    <div class="pks-row"><label>Mode</label><div class="pks-mode-pill" id="pks-navbar-mode-pill"><button data-mode="transparent" class="active">Transparent</button><button data-mode="blur">Blur</button><button data-mode="colour">Colour</button></div></div>
                    <div class="pks-row" id="pks-navbar-colour-row"><label style="font-size:10px;color:#555;padding-left:10px;">\u21b3 Colour</label><input type="color" id="cfg-navbarColour"></div>
                    <div class="pks-row"><label style="font-size:10px;color:#555;padding-left:10px;">\u21b3 Opacity</label><div class="pks-row-right"><input type="number" id="cfg-navbarOpacity" min="0" max="100" step="5" style="width:55px;"><span class="pks-unit-label">%</span></div></div>
                    <div class="pks-section-title">Background Image</div>
                    <div class="pks-row"><label>Image / GIF URL</label></div>
                    <div style="margin-bottom:8px;"><input type="text" id="cfg-miscBgUrl" placeholder="https://i.imgur.com/\u2026 (press Enter to apply)" style="width:100%;font-size:10px;"></div>
                    <div class="pks-row"><label>Blur background</label><div class="pks-row-right"><input type="checkbox" id="cfg-miscBgBlur"><input type="number" id="cfg-miscBgBlurAmount" min="1" max="30" step="1" style="width:50px;"><span class="pks-unit-label">px</span></div></div>
                    <div class="pks-row"><label>Dark overlay</label><div class="pks-row-right"><input type="checkbox" id="cfg-miscBgDarkOverlay"><input type="number" id="cfg-miscBgDarkOpacity" min="0" max="95" step="5" style="width:50px;"><span class="pks-unit-label">%</span></div></div>
                    <div class="pks-section-title">Effects</div>
                    <div class="pks-row"><label>Background effect</label><select id="cfg-effectType" style="width:130px;"><option value="none">None</option><option value="rain">Rain</option><option value="snow">Snow</option><option value="stars">Stars</option><option value="matrix">Matrix</option></select></div>
                    <div class="pks-row"><label>Intensity</label><div class="pks-row-right"><input type="number" id="cfg-effectIntensity" min="10" max="100" step="5" style="width:55px;"><span class="pks-unit-label">%</span></div></div>
                    <div class="pks-row"><label>Speed</label><div class="pks-row-right"><input type="number" id="cfg-effectSpeed" min="10" max="100" step="5" style="width:55px;"><span class="pks-unit-label">%</span></div></div>
                    <div class="pks-row"><label>Colour (blank = auto)</label><div class="pks-row-right"><input type="color" id="cfg-effectColor"><button id="cfg-effectColorClear" style="all:unset;padding:3px 8px;border:1px solid #252535;border-radius:4px;font-size:9px;color:#555;cursor:pointer;background:#16161f;">CLR</button></div></div>
                    <div class="pks-section-title">Other</div>
                    <div class="pks-row"><label>Hide ads</label><input type="checkbox" id="cfg-miscHideAds"></div>
                    <div class="pks-row"><label>Remove alert banner</label><input type="checkbox" id="cfg-miscHideAlert"></div>
                    <div class="pks-row"><label>Hide nav bar entirely</label><input type="checkbox" id="cfg-miscHideNavbar"></div>
                    <div class="pks-row"><label>Transparent footer</label><input type="checkbox" id="cfg-miscFooterTransparent"></div>
                    <div class="pks-section-title">Fonts</div>
                    <div class="pks-row"><label>Page font</label><select id="cfg-miscPageFont" style="width:160px;"><option value="Default (Site Font)">Default (Site Font)</option><option value="Share Tech Mono">Share Tech Mono</option><option value="Inter">Inter</option><option value="Rajdhani">Rajdhani</option><option value="Oxanium">Oxanium</option><option value="Orbitron">Orbitron</option><option value="Space Grotesk">Space Grotesk</option><option value="JetBrains Mono">JetBrains Mono</option><option value="Syne">Syne</option><option value="Exo 2">Exo 2</option><option value="Source Sans Pro Light">Source Sans Pro Light</option></select></div>
                    <div class="pks-row"><label>GUI font</label><select id="cfg-miscGuiFont" style="width:160px;"><option value="Share Tech Mono">Share Tech Mono</option><option value="Inter">Inter</option><option value="Rajdhani">Rajdhani</option><option value="Oxanium">Oxanium</option><option value="Orbitron">Orbitron</option><option value="Space Grotesk">Space Grotesk</option><option value="JetBrains Mono">JetBrains Mono</option><option value="Syne">Syne</option><option value="Exo 2">Exo 2</option></select></div>
                    <div style="margin:14px 0 4px;"><span class="pks-page-badge">/home</span></div>
                    <div class="pks-row"><label>Transparent page frames</label><input type="checkbox" id="cfg-miscHomeFramesTransparent"></div>
                    <div class="pks-row"><label>Hide My Feed</label><input type="checkbox" id="cfg-miscHideMyFeed"></div>
                    <div class="pks-row"><label>Hide Blog / News</label><input type="checkbox" id="cfg-miscHideBlogNews"></div>
                    <div class="pks-row"><label>Modern game cards</label><input type="checkbox" id="cfg-miscModernGameCards"></div>
                    <div style="margin:14px 0 4px;"><span class="pks-page-badge">/games</span></div>
                    <div class="pks-row"><label>Glassify game page</label><input type="checkbox" id="cfg-miscGamesGlassify"></div>
                    <div class="pks-row"><label>Hero backdrop (blurred thumb)</label><input type="checkbox" id="cfg-miscGamesHeroBackdrop"></div>
                    <div class="pks-row"><label>Hide comments</label><input type="checkbox" id="cfg-miscGamesHideComments"></div>
                    <div class="pks-row"><label>Hide recommended games</label><input type="checkbox" id="cfg-miscGamesHideRecommended"></div>
                    <div style="margin:14px 0 4px;"><span class="pks-page-badge">/Catalog.aspx</span></div>
                    <div class="pks-row"><label>Transparent main frame</label><input type="checkbox" id="cfg-miscCatalogFrameTransparent"></div>
                    <div class="pks-row"><label>Hide sidebar</label><input type="checkbox" id="cfg-miscCatalogHideSidebar"></div>
                    <div class="pks-row"><label>Glassify item cards</label><input type="checkbox" id="cfg-miscCatalogItemCards"></div>
                    <div style="margin:14px 0 4px;"><span class="pks-page-badge">/profile</span></div>
                    <div class="pks-row"><label>Transparent frames</label><input type="checkbox" id="cfg-miscProfileFrameTransparent"></div>
                    <div class="pks-row"><label>Animated username colour</label><input type="checkbox" id="cfg-miscProfileNameAnimate"></div>
                    <div class="pks-row"><label style="font-size:10px;color:#555;padding-left:10px;">\u21b3 Colour 1</label><input type="color" id="cfg-miscProfileNameColor1"></div>
                    <div class="pks-row"><label style="font-size:10px;color:#555;padding-left:10px;">\u21b3 Colour 2</label><input type="color" id="cfg-miscProfileNameColor2"></div>
                    <div style="margin:14px 0 4px;"><span class="pks-page-badge">/friends</span></div>
                    <div class="pks-row"><label>Transparent friend cards</label><input type="checkbox" id="cfg-miscFriendsFrameTransparent"></div>
                    <div style="margin:14px 0 4px;"><span class="pks-page-badge">/My/Avatar</span></div>
                    <div class="pks-row"><label>Transparent frames</label><input type="checkbox" id="cfg-miscAvatarFrameTransparent"></div>
                    <div class="pks-row"><label>Glassify item frames</label><input type="checkbox" id="cfg-avatarGlassify"></div>
                    <div class="pks-row"><label>Avatar background</label><input type="checkbox" id="cfg-avatarBgEnabled"></div>
                    <div class="pks-row"><label style="font-size:10px;color:#555;padding-left:10px;">↳ Background blur</label><div class="pks-row-right"><input type="number" id="cfg-avatarBgBlur" min="0" max="40" step="1" style="width:55px;"><span class="pks-unit-label">px</span></div></div>
                    <div style="margin:14px 0 4px;"><span class="pks-page-badge">/My/Trades.aspx</span></div>
                    <div class="pks-row"><label>Panel background</label><input type="color" id="cfg-tradesBgColor"></div>
                    <div class="pks-row"><label>Panel opacity</label><div class="pks-row-right"><input type="number" id="cfg-tradesOpacity" min="0" max="100" step="5" style="width:55px;"><span class="pks-unit-label">%</span></div></div>
                    <div class="pks-row"><label>Panel blur (glass)</label><div class="pks-row-right"><input type="number" id="cfg-tradesBlur" min="0" max="40" step="1" style="width:55px;"><span class="pks-unit-label">px</span></div></div>
                    <div class="pks-row"><label>Accent colour</label><input type="color" id="cfg-tradesAccent"></div>
                    <div class="pks-row"><label>Glassify item cards</label><input type="checkbox" id="cfg-tradesGlassCards"></div>
                    <div class="pks-row"><label>Win/loss shows</label><select id="cfg-tradesMetric" style="width:110px;"><option value="value">Value</option><option value="rap">RAP</option></select></div>
                    <div class="pks-row"><label>Pill frame opacity</label><div class="pks-row-right"><input type="number" id="cfg-tradesPillOpacity" min="0" max="100" step="5" style="width:55px;"><span class="pks-unit-label">%</span></div></div>
                    <div style="margin:14px 0 4px;"><span class="pks-page-badge">Watermark</span></div>
                    <div class="pks-row"><label>Show watermark</label><input type="checkbox" id="cfg-watermarkEnabled"></div>
                    <div class="pks-row"><label>Position</label><select id="cfg-watermarkPosition" style="width:130px;"><option value="bottom-left">Bottom Left</option><option value="bottom-right">Bottom Right</option><option value="bottom-center">Bottom Center</option><option value="top-left">Top Left</option><option value="top-right">Top Right</option><option value="top-center">Top Center</option></select></div>
                    <div class="pks-row"><label>Accent colour</label><div class="pks-row-right"><input type="color" id="cfg-watermarkAccentColor"><button id="cfg-watermarkAccentColorClear" style="all:unset;padding:3px 8px;border:1px solid #252535;border-radius:4px;font-size:9px;color:#555;cursor:pointer;background:#16161f;">CLR</button></div></div>
                    <div class="pks-row"><label>Scale</label><div class="pks-row-right"><input type="number" id="cfg-watermarkScale" min="60" max="200" step="10" style="width:60px;"><span class="pks-unit-label">%</span></div></div>
                    <div class="pks-row"><label>Opacity</label><div class="pks-row-right"><input type="number" id="cfg-watermarkOpacity" min="10" max="100" step="5" style="width:60px;"><span class="pks-unit-label">%</span></div></div>
                    <div class="pks-row"><label>Show session time</label><input type="checkbox" id="cfg-watermarkShowTime"></div>
                    <div class="pks-row"><label>Show ping</label><input type="checkbox" id="cfg-watermarkShowPing"></div>
                    <div class="pks-row"><label>Show username</label><input type="checkbox" id="cfg-watermarkShowUser"></div>
                    <div style="margin-top:4px;"><button id="pks-wm-reset-pos" class="pks-action-btn" style="width:100%;background:#16161f;color:#666;border-color:#252535;padding:7px;font-size:10px;">\u21ba Reset watermark position</button></div>
                    <div style="margin-top:8px;"><button id="pks-misc-apply" class="pks-action-btn" style="width:100%;background:#16161f;color:#888;border-color:#2a2a35;padding:8px;">\u21ba Re-apply All Misc Settings</button></div>
                </div>
                <div id="pks-tab-hex" style="padding:12px 13px;display:none;max-height:460px;overflow-y:auto;">
                    <div class="pks-section-title">Profile Banner</div>
                    <div class="pks-row"><label>Enable banner</label><input type="checkbox" id="cfg-profileBannerEnabled"></div>
                    <div class="pks-row"><label>Image / GIF URL</label></div>
                    <div style="margin-bottom:8px;"><input type="text" id="cfg-profileBannerImage" placeholder="https://i.imgur.com/\u2026 (press Enter to preview)" style="width:100%;font-size:10px;"></div>
                    <!-- Live preview strip -->
                    <div id="pks-hex-preview-wrap" style="display:none;position:relative;width:100%;height:52px;border-radius:8px;overflow:hidden;margin-bottom:10px;border:1px solid #252535;">
                        <div id="pks-hex-preview-img" style="position:absolute;inset:0;background-size:cover;background-position:center;"></div>
                        <div id="pks-hex-preview-tint" style="position:absolute;inset:0;"></div>
                        <div style="position:relative;z-index:1;padding:8px 10px;display:flex;align-items:center;gap:8px;">
                            <div style="width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,0.15);flex-shrink:0;"></div>
                            <div>
                                <div style="width:72px;height:8px;border-radius:3px;background:rgba(255,255,255,0.7);margin-bottom:4px;"></div>
                                <div style="width:44px;height:6px;border-radius:3px;background:rgba(255,255,255,0.3);"></div>
                            </div>
                        </div>
                    </div>
                    <div class="pks-row"><label>Blur</label><div class="pks-row-right"><input type="number" id="cfg-profileBannerBlur" min="0" max="40" step="1" style="width:55px;"><span class="pks-unit-label">px</span></div></div>
                    <div class="pks-row"><label>Brightness</label><div class="pks-row-right"><input type="number" id="cfg-profileBannerBrightness" min="30" max="150" step="5" style="width:55px;"><span class="pks-unit-label">%</span></div></div>
                    <div class="pks-row"><label>Tint colour</label><input type="color" id="cfg-profileBannerTint"></div>
                    <div class="pks-row"><label>Tint opacity</label><div class="pks-row-right"><input type="number" id="cfg-profileBannerTintOpacity" min="0" max="100" step="5" style="width:55px;"><span class="pks-unit-label">%</span></div></div>
                    <div class="pks-row"><label>Gradient tint</label><input type="checkbox" id="cfg-profileBannerTintGradient"></div>
                    <div class="pks-row"><label style="font-size:10px;color:#555;padding-left:10px;">\u21b3 Colour 2</label><input type="color" id="cfg-profileBannerTint2"></div>
                    <div class="pks-row"><label style="font-size:10px;color:#555;padding-left:10px;">\u21b3 Angle</label><div class="pks-row-right"><input type="number" id="cfg-profileBannerTintAngle" min="0" max="360" step="15" style="width:55px;"><span class="pks-unit-label">\u00b0</span></div></div>
                    <div class="pks-section-title">Badge</div>
                    <div class="pks-row"><label>Hide my Grexium badge</label><input type="checkbox" id="cfg-hideHexBadge"></div>
                    <div style="display:flex;gap:7px;margin-top:10px;">
                        <button id="pks-hex-save" class="pks-action-btn" style="flex:1;background:#00e87a;color:#050508;padding:9px;">\u21ba Apply &amp; Save</button>
                        <button id="pks-hex-clear" class="pks-action-btn" style="flex:0 0 auto;background:#1e1414;color:#ff4466;border-color:#ff446633;padding:9px 14px;">Clear</button>
                    </div>
                    <div id="pks-hex-save-status" style="min-height:14px;margin-top:6px;text-align:center;font-size:9px;letter-spacing:0.06em;color:#555;"></div>
                    <div style="padding:8px 10px;background:#13131c;border:1px solid #1e1e2a;border-radius:6px;margin-top:8px;">
                        <div style="color:#444;font-size:9px;line-height:1.85;letter-spacing:0.06em;">
                            Banner previews live on <span style="color:#00e87a;">your own</span> profile.<br>
                            Press <span style="color:#00e87a;">Apply &amp; Save</span> to share it with other Grexium users.
                        </div>
                    </div>
                </div>
                <div id="pks-tab-settings" style="padding:12px 13px;display:none;max-height:460px;overflow-y:auto;">
                    <div class="pks-section-title">Theme</div>
                    <div id="pks-theme-grid" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px;margin-bottom:6px;"></div>
                    <div class="pks-section-title">GUI Scale</div>
                    <div class="pks-row"><label>Panel scale</label><div class="pks-row-right"><input type="number" id="cfg-guiScale" min="70" max="150" step="5" style="width:64px;"><span class="pks-unit-label">%</span></div></div>
                    <div class="pks-section-title">Keybinds</div>
                    <div class="pks-row"><label>Toggle GUI</label><button class="pks-hk-record" id="pks-hk-record-toggle-gui" data-cfg="hotkeyToggleGui">Insert</button></div>
                    <div class="pks-section-title">Panel Appearance</div>
                    <div class="pks-row"><label>Custom accent colour</label><div class="pks-row-right"><input type="checkbox" id="cfg-customAccentEnabled"><input type="color" id="cfg-customAccentColor"></div></div>
                    <div class="pks-row"><label>Glass / blur panel</label><input type="checkbox" id="cfg-panelGlass"></div>
                    <div class="pks-row"><label style="font-size:10px;color:#555;padding-left:10px;">↳ Opacity</label><div class="pks-row-right"><input type="number" id="cfg-panelOpacity" min="20" max="100" step="5" style="width:55px;"><span class="pks-unit-label">%</span></div></div>
                    <div class="pks-row"><label style="font-size:10px;color:#555;padding-left:10px;">↳ Blur</label><div class="pks-row-right"><input type="number" id="cfg-panelBlur" min="0" max="60" step="1" style="width:55px;"><span class="pks-unit-label">px</span></div></div>
                    <div class="pks-row"><label>Corner radius</label><div class="pks-row-right"><input type="number" id="cfg-panelRadius" min="0" max="28" step="1" style="width:55px;"><span class="pks-unit-label">px</span></div></div>
                    <div class="pks-row"><label>Gradient background</label><input type="checkbox" id="cfg-panelGradientEnabled"></div>
                    <div class="pks-row"><label style="font-size:10px;color:#555;padding-left:10px;">↳ Colour 1</label><input type="color" id="cfg-panelGradientColor1"></div>
                    <div class="pks-row"><label style="font-size:10px;color:#555;padding-left:10px;">↳ Colour 2</label><input type="color" id="cfg-panelGradientColor2"></div>
                    <div class="pks-section-title">Notifications</div>
                    <div class="pks-row"><label>Show notifications</label><input type="checkbox" id="cfg-showNotifications"></div>
                    <div class="pks-row"><label>Duration</label><div class="pks-row-right"><input type="number" id="cfg-notificationDuration" min="1000" max="30000" step="500" style="width:75px;"><span class="pks-unit-label">ms</span></div></div>
                    <div class="pks-row"><label>Position</label><select id="cfg-notificationPosition" style="width:120px;"><option value="top-center">Top Center</option><option value="bottom-center">Bottom Center</option><option value="top-right">Top Right</option><option value="bottom-right">Bottom Right</option></select></div>
                    <div class="pks-section-title">Privacy</div>
                    <div class="pks-row"><label>Anonymous mode</label><input type="checkbox" id="cfg-anonymous"></div>
                    <div class="pks-section-title">Config (JSON)</div>
                    <div style="display:flex;gap:8px;margin-bottom:8px;">
                        <button id="pks-cfg-export" class="pks-action-btn" style="background:#16161f;color:#8a8aff;border-color:#252540;padding:8px;">\u2913 Export</button>
                        <button id="pks-cfg-import" class="pks-action-btn" style="background:#16161f;color:#00e87a;border-color:#1e3a2a;padding:8px;">\u2911 Import</button>
                    </div>
                    <textarea id="pks-cfg-json" spellcheck="false" placeholder="Paste config JSON here, then press Import\u2026" style="width:100%;height:84px;resize:vertical;background:#0c0c12;border:1px solid #232330;border-radius:7px;color:#cfd3e6;font-family:var(--pks-font),monospace;font-size:9.5px;line-height:1.5;padding:8px;outline:none;"></textarea>
                    <div style="color:#444;font-size:9px;line-height:1.8;letter-spacing:0.04em;margin-top:5px;">Export copies your settings to the box (and clipboard). Paste a config and Import to load it.</div>
                    <div style="margin-top:10px;border-top:1px solid #1a1a24;padding-top:12px;">
                        <button id="pks-reset-btn" class="pks-action-btn" style="width:100%;background:#1e1414;color:#ff4466;border-color:#ff446633;padding:8px;">\u21ba Reset all settings</button>
                    </div>
                    <div style="margin-top:8px;text-align:center;color:#1e1e2e;font-size:9px;letter-spacing:0.1em;">Grexium [BETA] \u00b7 @Menwx</div>
                </div>
            </div>
        `;

        document.body.appendChild(panel);

        const applyGuiScale = () => {
            const s = (cfg.guiScale ?? 100) / 100;
            panel.style.transform = `scale(${s})`;
            panel.style.transformOrigin = 'top right';
            panel.style.width = '374px';
        };
        applyGuiScale();
        updatePanelGlow();

        const updateLarpPreview = () => {
            const prev = document.getElementById('pks-larp-preview');
            const t = getTheme(), on = !!cfg.larpEnabled;
            if (prev) prev.style.opacity = on ? '1' : '0.45';
            const rob = document.getElementById('pks-larp-prev-robux');
            const tix = document.getElementById('pks-larp-prev-tix');
            if (rob) rob.textContent = formatLarp(cfg.larpRobux);
            if (tix) { tix.textContent = formatLarp(cfg.larpTix); tix.style.setProperty('color', '#f0a500', 'important'); }
            const st = document.getElementById('pks-larp-status');
            if (st) st.innerHTML = `Status: <span style="color:#ccc">${on ? 'Faking balance' : 'Off'}</span>`;
            const dot = document.getElementById('pks-larp-dot');
            if (dot) { dot.style.background = on ? t.accent : '#2e2e3a'; dot.style.boxShadow = on ? `0 0 8px ${t.accent}` : 'none'; }
        };

        const initModePill = (pillId, cfgKey, onChange) => {
            const pill = document.getElementById(pillId);
            if (!pill) return;
            pill.querySelectorAll('button').forEach(b => { b.classList.toggle('active', b.dataset.mode === cfg[cfgKey]); });
            pill.addEventListener('click', (e) => {
                const btn = e.target.closest('button'); if (!btn) return;
                pill.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                cfg[cfgKey] = btn.dataset.mode; saveCfg(cfg); onChange?.(); applySidebarNavStyle(); applySidebarDirect(); updateModeVisibility();
            });
        };

        const updateModeVisibility = () => {
            const sbBlurRow  = document.getElementById('pks-sidebar-blur-row');
            const sbColorRow = document.getElementById('pks-sidebar-colour-row');
            if (sbBlurRow)  sbBlurRow.style.display  = (cfg.sidebarMode === 'blur' || cfg.navbarMode === 'blur') ? '' : 'none';
            if (sbColorRow) sbColorRow.style.display = cfg.sidebarMode === 'colour' ? '' : 'none';
            const nbColorRow = document.getElementById('pks-navbar-colour-row');
            if (nbColorRow) nbColorRow.style.display = cfg.navbarMode === 'colour' ? '' : 'none';
        };

        initModePill('pks-sidebar-mode-pill', 'sidebarMode', null);
        initModePill('pks-navbar-mode-pill', 'navbarMode', null);
        updateModeVisibility();

        const themeGrid = document.getElementById('pks-theme-grid');
        Object.entries(THEMES).forEach(([key, t]) => {
            const btn = document.createElement('button');
            btn.className = 'pks-theme-swatch' + (cfg.theme === key ? ' active' : '');
            btn.style.color = t.accent; btn.style.borderColor = cfg.theme === key ? t.accent : '#1e1e2a';
            btn.innerHTML = `<span class="pks-dot" style="background:${t.accent};box-shadow:0 0 6px ${t.accent}88;"></span>${t.name}`;
            btn.addEventListener('click', () => {
                cfg.theme = key; saveCfg(cfg);
                themeGrid.querySelectorAll('.pks-theme-swatch').forEach((b, i) => { const tk = Object.keys(THEMES)[i]; b.classList.toggle('active', tk === key); b.style.borderColor = tk === key ? THEMES[tk].accent : '#1e1e2a'; });
                applyThemeToDom();
            });
            themeGrid.appendChild(btn);
        });

        const fieldMap = {
            'cfg-showNotifications':'showNotifications','cfg-notificationDuration':'notificationDuration','cfg-notificationPosition':'notificationPosition',
            'cfg-anonymous':'anonymous','cfg-guiScale':'guiScale',
            'cfg-customAccentEnabled':'customAccentEnabled','cfg-customAccentColor':'customAccentColor',
            'cfg-panelGlass':'panelGlass','cfg-panelOpacity':'panelOpacity','cfg-panelBlur':'panelBlur','cfg-panelRadius':'panelRadius',
            'cfg-panelGradientEnabled':'panelGradientEnabled','cfg-panelGradientColor1':'panelGradientColor1','cfg-panelGradientColor2':'panelGradientColor2',
            'cfg-effectType':'effectType','cfg-effectIntensity':'effectIntensity','cfg-effectSpeed':'effectSpeed','cfg-effectColor':'effectColor',
            'cfg-sidebarEnabled':'sidebarEnabled','cfg-sidebarBlurAmount':'sidebarBlurAmount','cfg-sidebarColour':'sidebarColour','cfg-sidebarOpacity':'sidebarOpacity',
            'cfg-navbarEnabled':'navbarEnabled','cfg-navbarColour':'navbarColour','cfg-navbarOpacity':'navbarOpacity',
            'cfg-miscBgUrl':'miscBgUrl','cfg-miscBgBlur':'miscBgBlur','cfg-miscBgBlurAmount':'miscBgBlurAmount',
            'cfg-miscBgDarkOverlay':'miscBgDarkOverlay','cfg-miscBgDarkOpacity':'miscBgDarkOpacity',
            'cfg-miscHideAds':'miscHideAds','cfg-miscHideAlert':'miscHideAlert','cfg-miscHideNavbar':'miscHideNavbar',
            'cfg-miscFooterTransparent':'miscFooterTransparent',
            'cfg-miscPageFont':'miscPageFont','cfg-miscGuiFont':'miscGuiFont',
            'cfg-miscHomeFramesTransparent':'miscHomeFramesTransparent',
            'cfg-miscHideMyFeed':'miscHideMyFeed','cfg-miscHideBlogNews':'miscHideBlogNews',
            'cfg-miscModernGameCards':'miscModernGameCards',
            'cfg-miscGamesGlassify':'miscGamesGlassify','cfg-miscGamesHeroBackdrop':'miscGamesHeroBackdrop',
            'cfg-miscGamesHideComments':'miscGamesHideComments','cfg-miscGamesHideRecommended':'miscGamesHideRecommended',
            'cfg-miscCatalogFrameTransparent':'miscCatalogFrameTransparent',
            'cfg-miscCatalogHideSidebar':'miscCatalogHideSidebar','cfg-miscCatalogItemCards':'miscCatalogItemCards',
            'cfg-miscProfileFrameTransparent':'miscProfileFrameTransparent',
            'cfg-miscProfileNameAnimate':'miscProfileNameAnimate',
            'cfg-miscProfileNameColor1':'miscProfileNameColor1','cfg-miscProfileNameColor2':'miscProfileNameColor2',
            'cfg-miscFriendsFrameTransparent':'miscFriendsFrameTransparent',
            'cfg-miscAvatarFrameTransparent':'miscAvatarFrameTransparent','cfg-avatarGlassify':'avatarGlassify',
            'cfg-avatarBgEnabled':'avatarBgEnabled','cfg-avatarBgBlur':'avatarBgBlur',
            'cfg-tradesBgColor':'tradesBgColor','cfg-tradesOpacity':'tradesOpacity','cfg-tradesBlur':'tradesBlur','cfg-tradesAccent':'tradesAccent',
            'cfg-profileBannerEnabled':'profileBannerEnabled','cfg-profileBannerImage':'profileBannerImage','cfg-profileBannerBlur':'profileBannerBlur','cfg-profileBannerTint':'profileBannerTint','cfg-profileBannerTintOpacity':'profileBannerTintOpacity','cfg-profileBannerBrightness':'profileBannerBrightness','cfg-hideHexBadge':'hideHexBadge','cfg-profileBannerTintGradient':'profileBannerTintGradient','cfg-profileBannerTint2':'profileBannerTint2','cfg-profileBannerTintAngle':'profileBannerTintAngle','cfg-tradesGlassCards':'tradesGlassCards','cfg-tradesMetric':'tradesMetric','cfg-tradesPillOpacity':'tradesPillOpacity',
            'cfg-watermarkEnabled':'watermarkEnabled','cfg-watermarkPosition':'watermarkPosition',
            'cfg-watermarkAccentColor':'watermarkAccentColor','cfg-watermarkScale':'watermarkScale','cfg-watermarkOpacity':'watermarkOpacity',
            'cfg-watermarkShowTime':'watermarkShowTime','cfg-watermarkShowPing':'watermarkShowPing','cfg-watermarkShowUser':'watermarkShowUser',
        };

        const OPTIONAL_COLOR_FIELDS = new Set(['cfg-watermarkAccentColor','cfg-sidebarColour','cfg-navbarColour','cfg-effectColor']);

        const syncFieldsFromCfg = () => {
            for (const [id, key] of Object.entries(fieldMap)) {
                const el = document.getElementById(id); if (!el) continue;
                if (el.type === 'checkbox') el.checked = !!cfg[key];
                else if (el.type === 'color') { if (cfg[key]?.trim()) el.value = cfg[key]; }
                else el.value = cfg[key] ?? '';
            }
            const clickEl  = document.getElementById('pks-r-click-ms');
            const reloadEl = document.getElementById('pks-r-reload-ms');
            if (clickEl) clickEl.value = cfg.clickInterval; if (reloadEl) reloadEl.value = cfg.hardRefreshInterval;
            [['pks-hk-record-toggle-gui','hotkeyToggleGui'],['pks-hk-record-refresher','hotkeyRefresher'],['pks-hk-record-hardrefresh','hotkeyHardRefresh']].forEach(([elId, cfgKey]) => {
                const el = document.getElementById(elId); if (el) el.textContent = cfg[cfgKey] || 'none';
            });
            ['pks-sidebar-mode-pill','pks-navbar-mode-pill'].forEach(pillId => {
                const pill = document.getElementById(pillId);
                const cfgKey = pillId === 'pks-sidebar-mode-pill' ? 'sidebarMode' : 'navbarMode';
                pill?.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.mode === cfg[cfgKey]));
            });
            const larpR = document.getElementById('cfg-larpRobux'); if (larpR) larpR.value = cfg.larpRobux ? String(cfg.larpRobux) : '';
            const larpT = document.getElementById('cfg-larpTix');   if (larpT) larpT.value = cfg.larpTix   ? String(cfg.larpTix)   : '';
            const larpE = document.getElementById('cfg-larpEnabled'); if (larpE) larpE.checked = !!cfg.larpEnabled;
            const larpV = document.getElementById('cfg-larpVerify'); if (larpV) larpV.checked = !!cfg.larpVerify;
            updateLarpPreview();
            updateModeVisibility();
        };
        syncFieldsFromCfg();

        const reapplyAll = () => {
            applyThemeToDom(); applyMisc(); applyCardStyle(); updateWatermark();
            applySidebarNavStyle(); applySidebarDirect(); applyPageFrameTransparency(); updateModeVisibility();
            applyEffects(); applyAvatarGlass(); applyAvatarBg();
            if (isTradePage()) applyTradeStyle();
            applyTradesCustom();
            applyProfileBannerForPage();
        };

        panel.addEventListener('change', (e) => {
            const el = e.target; const id = el.id; if (!id) return;
            if (id === 'pks-r-click-ms')      { cfg.clickInterval       = Math.max(100,  parseInt(el.value) || 1500); saveCfg(cfg); return; }
            if (id === 'pks-r-reload-ms')     { cfg.hardRefreshInterval = Math.max(5000, parseInt(el.value) || 60000); saveCfg(cfg); return; }
            if (id === 'cfg-miscBgUrl') return;
            const key = fieldMap[id]; if (!key) return;
            if (el.type === 'checkbox')     cfg[key] = el.checked;
            else if (el.type === 'number')  cfg[key] = parseFloat(el.value) || DEFAULTS[key];
            else if (el.type === 'color')   cfg[key] = el.value;
            else                            cfg[key] = el.value || (OPTIONAL_COLOR_FIELDS.has(id) ? '' : DEFAULTS[key]);
            saveCfg(cfg);
            reapplyAll();
            if (id === 'cfg-tradesMetric' && _tradesRepaint) _tradesRepaint();
            if (id === 'cfg-tradesPillOpacity') applyTradesCustom();
            if (id === 'cfg-anonymous') { updateProfileUI(); updateWatermark(); }
            if (id === 'cfg-guiScale') applyGuiScale();
            if (id === 'cfg-miscPageFont') applyPageFont(el.value);
            if (id === 'cfg-miscGuiFont')  applyGuiFont(el.value);
        });

        const bgUrlInput = document.getElementById('cfg-miscBgUrl');
        if (bgUrlInput) {
            bgUrlInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { cfg.miscBgUrl = bgUrlInput.value; saveCfg(cfg); applyMisc(); notify('Background image applied', 'info'); }
            });
        }

        document.getElementById('cfg-watermarkAccentColorClear')?.addEventListener('click', () => {
            cfg.watermarkAccentColor = ''; saveCfg(cfg); applyMisc(); applyCardStyle(); updateWatermark();
            notify('Colour cleared \u2014 using theme default', 'info');
        });

        document.getElementById('cfg-effectColorClear')?.addEventListener('click', () => {
            cfg.effectColor = ''; saveCfg(cfg); applyEffects();
            notify('Effect colour cleared \u2014 using auto', 'info');
        });

        const larpRobuxEl = document.getElementById('cfg-larpRobux');
        const larpTixEl   = document.getElementById('cfg-larpTix');
        const larpToggle  = document.getElementById('cfg-larpEnabled');
        const commitLarp = () => {
            cfg.larpRobux = parseInt((larpRobuxEl?.value || '').replace(/[^\d]/g, '')) || 0;
            cfg.larpTix   = parseInt((larpTixEl?.value   || '').replace(/[^\d]/g, '')) || 0;
            saveCfg(cfg); applyLarp(); updateLarpPreview();
        };
        larpRobuxEl?.addEventListener('input', commitLarp);
        larpTixEl?.addEventListener('input', commitLarp);
        larpToggle?.addEventListener('change', () => {
            cfg.larpEnabled = larpToggle.checked; saveCfg(cfg); applyLarp(); updateLarpPreview();
        });
        const verifyToggle = document.getElementById('cfg-larpVerify');
        verifyToggle?.addEventListener('change', () => {
            cfg.larpVerify = verifyToggle.checked; saveCfg(cfg); applyFakeVerify();
            notify(cfg.larpVerify ? 'Fake verify on' : 'Fake verify off', 'info');
        });

        const _larpCardCache = {};
        const renderLarpFakeList = () => {
            const list = document.getElementById('pks-larp-fakelist');
            if (!list) return;
            list.innerHTML = '';
            const ids = cfg.avatarFakeItems || [];
            if (!ids.length) {
                list.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:18px;color:#3a3a48;font-size:10px;">No fake items yet</div>`;
                return;
            }
            ids.forEach(id => {
                const card = document.createElement('div');
                card.style.cssText = `position:relative;background:#16161f;border:1px solid #252535;border-radius:8px;overflow:hidden;cursor:pointer;transition:border-color 0.15s,transform 0.12s;`;
                const qty = Math.max(1, parseInt((cfg.avatarFakeQty || {})[id]) || 1);
                card.innerHTML = `
                    <div style="width:100%;aspect-ratio:1;background:#0a0b0e;overflow:hidden;">
                        <img src="https://pekora.pro/thumbs/asset.ashx?assetId=${id}&width=110&height=110&format=png" style="width:100%;height:100%;object-fit:contain;" onerror="this.style.opacity=0;">
                    </div>
                    ${qty > 1 ? `<div style="position:absolute;top:4px;right:4px;background:#00e87a;color:#050508;font-size:9px;font-weight:800;padding:1px 5px;border-radius:9px;">×${qty}</div>` : ''}
                    <div style="padding:3px 4px;font-size:9px;color:#9a9ab0;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center;" title="Asset ${id}">${escHtml(_larpCardCache[id] || ('#' + id))}</div>
                    <div class="pks-larp-rm" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(120,10,30,0.78);color:#fff;font-size:11px;font-weight:700;letter-spacing:0.06em;opacity:0;transition:opacity 0.15s;">REMOVE</div>
                `;
                const overlay = card.querySelector('.pks-larp-rm');
                card.addEventListener('mouseenter', () => { card.style.borderColor = '#ff4466'; card.style.transform = 'translateY(-2px)'; overlay.style.opacity = '1'; });
                card.addEventListener('mouseleave', () => { card.style.borderColor = '#252535'; card.style.transform = 'none'; overlay.style.opacity = '0'; });
                card.addEventListener('click', () => { removeFakeAvatarItem(id); renderLarpFakeList(); notify('Removed fake item', 'info'); });
                list.appendChild(card);
                if (_larpCardCache[id] === undefined) {
                    _larpCardCache[id] = null;
                    fetchFakeItemData(id).then(d => {
                        if (d?.name) { _larpCardCache[id] = d.name; const lbl = card.querySelector('div[title]'); if (lbl) lbl.textContent = d.name; }
                    });
                }
            });
        };
        document.getElementById('pks-larp-add-item')?.addEventListener('click', async () => {
            const inp = document.getElementById('pks-larp-assetid');
            const qtyInp = document.getElementById('pks-larp-qty');
            const id = (inp?.value || '').replace(/[^\d]/g, '');
            if (!id) { notify('Enter a valid asset ID', 'error'); return; }
            const qty = Math.max(1, parseInt(qtyInp?.value) || 1);
            cfg.avatarFakeQty = Object.assign({}, cfg.avatarFakeQty, { [id]: qty }); saveCfg(cfg);
            const btn = document.getElementById('pks-larp-add-item');
            if (btn) { btn.disabled = true; btn.textContent = '…'; }
            await addFakeAvatarItem(id, true);
            applyCatalogOwned();
            if (btn) { btn.disabled = false; btn.textContent = 'Add'; }
            if (inp) inp.value = '';
            if (qtyInp) qtyInp.value = '1';
            renderLarpFakeList();
            notify('Fake item saved — faked as owned + worn', 'success');
        });
        renderLarpFakeList();

        const TABS = ['refresher','trade','larp','hex','misc','settings'];
        panel.querySelectorAll('.pks-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                panel.querySelectorAll('.pks-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                TABS.forEach(t => { const el = document.getElementById(`pks-tab-${t}`); if (el) el.style.display = btn.dataset.tab === t ? 'block' : 'none'; });
                applyThemeToDom();
                if (btn.dataset.tab === 'trade' && !state.trade.tradeTabActive) {
                    state.trade.tradeTabActive = true;
                    buildMassTradeUI();
                }
            });
        });

        document.getElementById('pks-r-start')?.addEventListener('click', startRefresher);
        document.getElementById('pks-r-stop')?.addEventListener('click', stopRefresher);
        document.getElementById('pks-misc-apply')?.addEventListener('click', () => {
            applyMisc(); applyCardStyle(); applySidebarNavStyle(); applySidebarDirect(); applyPageFrameTransparency();
            if (isTradePage()) applyTradeStyle();
            notify('Misc settings applied', 'info');
        });
        document.getElementById('pks-hex-save')?.addEventListener('click', (e) => saveProfileBanner(e.currentTarget));

        // Clear banner button
        document.getElementById('pks-hex-clear')?.addEventListener('click', async () => {
            cfg.profileBannerImage = '';
            cfg.profileBannerEnabled = false;
            saveCfg(cfg);
            const en = document.getElementById('cfg-profileBannerEnabled'); if (en) en.checked = false;
            const inp = document.getElementById('cfg-profileBannerImage'); if (inp) inp.value = '';
            updateHexPreview();
            applyProfileBannerForPage();
            // Also clear from worker
            const myId = myPekoraId();
            if (myId && GREXIUM_WORKER_URL && !GREXIUM_WORKER_URL.includes('YOUR_SUBDOMAIN')) {
                try {
                    await fetch(`${GREXIUM_WORKER_URL}/profile`, {
                        method: 'DELETE',
                        headers: { 'content-type': 'application/json' },
                        body: JSON.stringify({ id: myId }),
                    });
                } catch {}
            }
            notify('Banner cleared', 'info');
        });

        // Live preview updater
        const updateHexPreview = () => {
            const wrap    = document.getElementById('pks-hex-preview-wrap');
            const imgEl   = document.getElementById('pks-hex-preview-img');
            const tintEl  = document.getElementById('pks-hex-preview-tint');
            if (!wrap || !imgEl || !tintEl) return;
            const img = cfg.profileBannerImage?.trim();
            if (!img) { wrap.style.display = 'none'; return; }
            wrap.style.display = 'block';
            const blur   = Math.max(0, Math.min(40, +cfg.profileBannerBlur || 0));
            const bright = Math.max(30, Math.min(150, +cfg.profileBannerBrightness || 100)) / 100;
            imgEl.style.backgroundImage = `url('${img.replace(/'/g, "\\'")}')`;
            imgEl.style.filter = `blur(${blur}px) brightness(${bright})`;
            imgEl.style.transform = blur ? 'scale(1.08)' : 'none';
            const tint  = /^#[0-9a-fA-F]{6}$/.test(cfg.profileBannerTint || '') ? cfg.profileBannerTint : '#000000';
            const tint2 = /^#[0-9a-fA-F]{6}$/.test(cfg.profileBannerTint2 || '') ? cfg.profileBannerTint2 : tint;
            const angle = cfg.profileBannerTintAngle || 135;
            const tintOp = Math.max(0, Math.min(100, +cfg.profileBannerTintOpacity || 0)) / 100;
            tintEl.style.background = cfg.profileBannerTintGradient
                ? `linear-gradient(${angle}deg, ${tint}, ${tint2})`
                : tint;
            tintEl.style.opacity = String(tintOp);
        };

        // Trigger preview update on any banner field change
        ['cfg-profileBannerImage','cfg-profileBannerBlur','cfg-profileBannerBrightness',
         'cfg-profileBannerTint','cfg-profileBannerTintOpacity','cfg-profileBannerTintGradient',
         'cfg-profileBannerTint2','cfg-profileBannerTintAngle'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', updateHexPreview);
            document.getElementById(id)?.addEventListener('change', updateHexPreview);
        });
        updateHexPreview();

        document.getElementById('cfg-profileBannerImage')?.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter') return;
            cfg.profileBannerImage = e.target.value.trim();
            if (cfg.profileBannerImage) cfg.profileBannerEnabled = true;
            const en = document.getElementById('cfg-profileBannerEnabled'); if (en) en.checked = cfg.profileBannerEnabled;
            saveCfg(cfg);
            updateHexPreview();
            applyProfileBannerForPage();
            notify('Banner preview updated \u2014 press Apply & Save to share', 'info');
        });
        document.getElementById('pks-wm-reset-pos')?.addEventListener('click', () => {
            state.watermark.dragX = null; state.watermark.dragY = null;
            const wm = document.getElementById('pks-watermark');
            if (wm) { wm.style.left = ''; wm.style.top = ''; wm.style.bottom = ''; wm.style.right = ''; wm.style.transform = ''; }
            updateWatermark(); notify('Watermark position reset', 'info');
        });

        panel.querySelectorAll('.pks-hk-record').forEach(btn => {
            btn.addEventListener('click', () => {
                panel.querySelectorAll('.pks-hk-record.recording').forEach(b => {
                    if (b !== btn) { b.classList.remove('recording'); b.textContent = cfg[b.dataset.cfg] || 'none'; }
                });
                if (btn.classList.contains('recording')) { btn.classList.remove('recording'); btn.textContent = cfg[btn.dataset.cfg] || 'none'; return; }
                btn.classList.add('recording'); btn.textContent = '\u2026';
                const onKey = (e) => {
                    e.preventDefault(); e.stopPropagation(); document.removeEventListener('keydown', onKey, true);
                    btn.classList.remove('recording');
                    if (e.key === 'Escape') { btn.textContent = cfg[btn.dataset.cfg] || 'none'; return; }
                    const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
                    cfg[btn.dataset.cfg] = key; saveCfg(cfg); btn.textContent = key;
                };
                document.addEventListener('keydown', onKey, true);
            });
        });

        document.getElementById('pks-reset-btn')?.addEventListener('click', () => {
            cfg = Object.assign({}, DEFAULTS); saveCfg(cfg); syncFieldsFromCfg();
            applyThemeToDom(); applyMisc(); applyCardStyle(); updateWatermark(); applyGuiScale();
            applySidebarNavStyle(); applySidebarDirect(); applyPageFrameTransparency(); applyEffects(); applyLarp();
            notify('Settings reset to defaults', 'info');
        });

        const reapplyEverything = () => {
            applyThemeToDom(); applyMisc(); applyCardStyle(); updateWatermark(); applyGuiScale();
            applySidebarNavStyle(); applySidebarDirect(); applyPageFrameTransparency(); applyEffects();
            applyLarp(); applyFakeVerify(); applyTradesCustom(); applyProfileBannerForPage();
        };
        document.getElementById('pks-cfg-export')?.addEventListener('click', () => {
            const json = JSON.stringify(cfg, null, 2);
            const box = document.getElementById('pks-cfg-json'); if (box) box.value = json;
            try { navigator.clipboard?.writeText(json); } catch {}
            notify('Config exported (copied to clipboard)', 'success');
        });
        document.getElementById('pks-cfg-import')?.addEventListener('click', () => {
            const box = document.getElementById('pks-cfg-json');
            const raw = (box?.value || '').trim();
            if (!raw) { notify('Paste config JSON first', 'error'); return; }
            let parsed;
            try { parsed = JSON.parse(raw); } catch { notify('Invalid JSON', 'error'); return; }
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) { notify('Invalid config', 'error'); return; }
            const next = Object.assign({}, DEFAULTS);
            for (const k of Object.keys(DEFAULTS)) if (k in parsed) next[k] = parsed[k];
            cfg = next; saveCfg(cfg); syncFieldsFromCfg(); reapplyEverything();
            document.getElementById('pks-theme-grid')?.querySelectorAll('.pks-theme-swatch').forEach((b, i) => {
                const tk = Object.keys(THEMES)[i];
                b.classList.toggle('active', tk === cfg.theme);
                b.style.borderColor = tk === cfg.theme ? THEMES[tk].accent : '#1e1e2a';
            });
            notify('Config imported', 'success');
        });

        const body   = document.getElementById('pks-body');
        const minBtn = document.getElementById('pks-min-btn');
        const closeB = document.getElementById('pks-close-btn');
        let minimised = false;
        minBtn?.addEventListener('click', () => {
            minimised = !minimised; body.style.display = minimised ? 'none' : '';
            minBtn.title = minimised ? 'Restore' : 'Minimise';
        });
        closeB?.addEventListener('click', () => {
            panel.style.transition = 'opacity 0.18s,transform 0.18s';
            panel.style.opacity = '0'; panel.style.transform = 'scale(0.94)';
            stopRefresher();
            setTimeout(() => panel.remove(), 200);
        });

        (() => {
            const header = document.getElementById('pks-header');
            let ox = 0, oy = 0, sx = 0, sy = 0;
            header.addEventListener('mousedown', (e) => {
                if (e.target.tagName === 'BUTTON') return;
                sx = e.clientX; sy = e.clientY; const r = panel.getBoundingClientRect(); ox = r.left; oy = r.top;
                const onMove = (e2) => { panel.style.right = 'auto'; panel.style.left = `${ox + e2.clientX - sx}px`; panel.style.top = `${oy + e2.clientY - sy}px`; };
                const onUp   = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
                document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
            });
        })();

        const trySetAvatar = () => {
            if (!state.profile.id) return;
            const img = document.getElementById('pks-avatar-img');
            const anonEl = document.getElementById('pks-avatar-anon');
            if (!img) return;
            fetch(`https://pekora.pro/apisite/thumbnails/v1/users/avatar-headshot?userIds=${state.profile.id}&size=60x60&format=Png`, { credentials:'include' })
                .then(r => r.ok ? r.json() : null)
                .then(d => {
                    const url = d?.data?.[0]?.imageUrl;
                    if (url) img.src = url;
                    if (!cfg.anonymous) { img.style.display = 'block'; if (anonEl) anonEl.style.display = 'none'; }
                    else { img.style.display = 'none'; if (anonEl) anonEl.style.display = 'flex'; }
                }).catch(() => { if (!cfg.anonymous) img.style.display = 'block'; });
        };

        applyThemeToDom(); applyMisc(); applyCardStyle(); applyEffects(); applyLarp();
        applySidebarNavStyle(); applySidebarDirect(); injectSidebarLinks(); applyPageFrameTransparency();
        applyPageFont(cfg.miscPageFont || 'Default (Site Font)');
        applyGuiFont(cfg.miscGuiFont || 'Share Tech Mono');
        if (isTradePage()) applyTradeStyle();
        fetchProfile().then(trySetAvatar);
        setInterval(() => fetchProfile().then(trySetAvatar), 30000);
        panelLog('Panel ready. Configure intervals and press START.', 'info');
    };

    const isAvatarPage = () => /\/My\/Avatar/i.test(location.pathname) || /(^|\/)avatar(\/|$)/i.test(location.pathname);
    const AV_WRAP_SEL = '[class*="avatarCardWrapper"]';

    const isCatalogItemPage = () => /\/catalog\/\d+/i.test(location.pathname);
    const currentCatalogAssetId = () => { const m = location.pathname.match(/\/catalog\/(\d+)/i); return m ? m[1] : null; };

    const AVATAR_BG_PRESETS = [
        'https://raw.githubusercontent.com/Menwey/hexium-crack/main/avatarbg-img/1.png',
        'https://raw.githubusercontent.com/Menwey/hexium-crack/main/avatarbg-img/2.png',
        'https://raw.githubusercontent.com/Menwey/hexium-crack/main/avatarbg-img/3.png',
        'https://raw.githubusercontent.com/Menwey/hexium-crack/main/avatarbg-img/4.png',
        'https://raw.githubusercontent.com/Menwey/hexium-crack/main/avatarbg-img/5.png',
        'https://raw.githubusercontent.com/Menwey/hexium-crack/main/avatarbg-img/6.png',
        'https://raw.githubusercontent.com/Menwey/hexium-crack/main/avatarbg-img/7.png',
        'https://raw.githubusercontent.com/Menwey/hexium-crack/main/avatarbg-img/8.png',
        'https://raw.githubusercontent.com/Menwey/hexium-crack/main/avatarbg-img/9.png',
        'https://raw.githubusercontent.com/Menwey/hexium-crack/main/avatarbg-img/10.png',
        'https://raw.githubusercontent.com/Menwey/hexium-crack/main/avatarbg-img/11.png',
        'https://raw.githubusercontent.com/Menwey/hexium-crack/main/avatarbg-img/12.png',
        'https://raw.githubusercontent.com/Menwey/hexium-crack/main/avatarbg-img/13.png',
        'https://raw.githubusercontent.com/Menwey/hexium-crack/main/avatarbg-img/14.png',
        'https://raw.githubusercontent.com/Menwey/hexium-crack/main/avatarbg-img/15.png',
        'https://raw.githubusercontent.com/Menwey/hexium-crack/main/avatarbg-img/16.png',
        'https://raw.githubusercontent.com/Menwey/hexium-crack/main/avatarbg-img/17.png',
        'https://raw.githubusercontent.com/Menwey/hexium-crack/main/avatarbg-img/18.png',
        'https://raw.githubusercontent.com/Menwey/hexium-crack/main/avatarbg-img/19.png',
        'https://raw.githubusercontent.com/Menwey/hexium-crack/main/avatarbg-img/20.png',
        'https://raw.githubusercontent.com/Menwey/hexium-crack/main/avatarbg-img/21.png',
        'https://raw.githubusercontent.com/Menwey/hexium-crack/main/avatarbg-img/22.png',
        'https://raw.githubusercontent.com/Menwey/hexium-crack/main/avatarbg-img/23.png',
        'https://raw.githubusercontent.com/Menwey/hexium-crack/main/avatarbg-img/24.png',
        'https://raw.githubusercontent.com/Menwey/hexium-crack/main/avatarbg-img/25.png',
        'https://raw.githubusercontent.com/Menwey/hexium-crack/main/avatarbg-img/26.png',
        'https://raw.githubusercontent.com/Menwey/hexium-crack/main/avatarbg-img/27.png',
    ];

    const applyAvatarBg = () => {
        let el = document.getElementById('pks-avatar-bg-style');
        if (!el) { el = document.createElement('style'); el.id = 'pks-avatar-bg-style'; document.head.appendChild(el); }
        if (!cfg.avatarBgEnabled || !cfg.avatarBgImage?.trim()) { el.textContent = ''; return; }
        const url  = cfg.avatarBgImage.trim().replace(/'/g, "\\'");
        const blur = Math.max(0, cfg.avatarBgBlur ?? 0);
        el.textContent = `
            [class*="avatarThumbContainer"]{position:relative!important;overflow:hidden!important;}
            [class*="avatarThumbContainer"]::before{content:'';position:absolute;inset:0;background-image:url('${url}');background-size:cover;background-position:center;background-repeat:no-repeat;${blur ? `filter:blur(${blur}px);transform:scale(1.12);` : ''}z-index:0;pointer-events:none;}
            [class*="avatarThumbContainer"] > *{position:relative;z-index:1;}
        `;
    };

    const applyAvatarGlass = () => {
        let el = document.getElementById('pks-avatar-glass-style');
        if (!el) { el = document.createElement('style'); el.id = 'pks-avatar-glass-style'; document.head.appendChild(el); }
        el.textContent = cfg.avatarGlassify
            ? `[class*="avatarCardContainer"]{background:rgba(255,255,255,0.05)!important;backdrop-filter:blur(14px) saturate(160%)!important;-webkit-backdrop-filter:blur(14px) saturate(160%)!important;border:1px solid rgba(255,255,255,0.14)!important;border-radius:12px!important;box-shadow:0 8px 28px rgba(0,0,0,0.25)!important;overflow:hidden!important;}[class*="avatarCardImage"]{background:transparent!important;}`
            : '';
    };

    const applyAvatarControls = () => {
        if (!isAvatarPage()) return;
        if (!document.getElementById('pks-avatar-controls-style')) {
            const st = document.createElement('style');
            st.id = 'pks-avatar-controls-style';
            st.textContent = `[class*="thumbnail3DButtonContainer"]{display:none!important;}`;
            document.head.appendChild(st);
        }
        const frame = document.querySelector('[class*="avatarThumbContainer"]');
        if (!frame) return;
        frame.style.setProperty('position', 'relative', 'important');
        const pill = [...document.querySelectorAll('[class*="pillToggle"]')].find(p => p.querySelector('input[name="avatarType"]'));
        if (pill && pill.parentElement !== frame) {
            pill.style.setProperty('position', 'absolute', 'important');
            pill.style.setProperty('top', '8px', 'important');
            pill.style.setProperty('right', '8px', 'important');
            pill.style.setProperty('z-index', '30', 'important');
            pill.style.setProperty('margin', '0', 'important');
            frame.appendChild(pill);
        }
    };

    const fetchFakeItemData = async (assetId) => {
        let name = 'Item ' + assetId, restriction = null;
        try {
            const r = await fetch('https://pekora.pro/apisite/catalog/v1/catalog/items/details', {
                method: 'POST', credentials: 'include',
                headers: { accept: 'application/json', 'content-type': 'application/json' },
                body: JSON.stringify({ items: [{ itemType: 'Asset', id: parseInt(assetId) }] }),
            });
            const d = await r.json();
            const item = (d.data || [])[0];
            if (item) {
                if (item.name) name = item.name;
                const restr = item.itemRestrictions || [];
                if (restr.includes('LimitedUnique') || item.isLimitedUnique) restriction = 'LimitedUnique';
                else if (restr.includes('Limited') || item.isLimited) restriction = 'Limited';
            }
        } catch {}
        return { assetId: String(assetId), name, restriction, thumb: `https://pekora.pro/thumbs/asset.ashx?assetId=${assetId}&width=110&height=110&format=png` };
    };

    let _wornCache = null;
    const getWornAssets = async (force = false) => {
        if (Array.isArray(_wornCache) && !force) return _wornCache;
        try {
            const ar = await fetch('https://pekora.pro/apisite/avatar/v1/avatar', { credentials: 'include', headers: { accept: 'application/json' } });
            const ad = await ar.json();
            const assets = ad.assets || ad.avatar?.assets || [];
            _wornCache = assets.map(a => a.id || a.assetId).filter(Boolean);
        } catch { _wornCache = _wornCache || []; }
        return _wornCache;
    };

    const makeEquippedEl = () => {
        const tmpl = document.querySelector('[class*="avatarCardEquipped"]');
        if (tmpl) return tmpl.cloneNode(true);
        const d = document.createElement('div');
        d.className = 'avatarCardEquipped-0-2-238';
        d.innerHTML = '<span></span>';
        return d;
    };

    const setFakeWearing = async (assetId, name, wear) => {
        const idNum = parseInt(assetId);
        let current = (await getWornAssets()).slice();
        if (wear) { if (!current.includes(idNum)) current.push(idNum); }
        else current = current.filter(x => x !== idNum);
        _wornCache = current;
        try {
            const r = await postApi('https://pekora.pro/apisite/avatar/v1/avatar/set-wearing-assets', { assetIds: current });
            const d = await r.json().catch(() => ({}));
            const serverOk = r.ok && !((d.errors || []).length);
            notify((wear ? 'Now wearing ' : 'Removed ') + name + (serverOk ? '' : ' (visual only)'), serverOk ? (wear ? 'success' : 'info') : 'info');
        } catch { notify((wear ? 'Now wearing ' : 'Removed ') + name + ' (visual only)', 'info'); }
        return true;
    };

    const catalogSlug = (name) => (name || '').trim().replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '') || '-';
    const fakeCatalogHref = (item) => `/catalog/${item.assetId}/${catalogSlug(item.name)}`;
    const getAvatarGrid = () => (document.querySelector(AV_WRAP_SEL) || document.querySelector('[data-pks-skeleton]'))?.parentElement || null;

    const ensureSkeletonStyle = () => {
        if (document.getElementById('pks-skel-style')) return;
        const s = document.createElement('style'); s.id = 'pks-skel-style';
        s.textContent = `@keyframes pks-skel-pulse{0%{opacity:0.45;}50%{opacity:0.85;}100%{opacity:0.45;}}.pks-skel{background:linear-gradient(110deg,#1b1b26 30%,#2a2a3a 50%,#1b1b26 70%);animation:pks-skel-pulse 1.1s ease-in-out infinite;}`;
        document.head.appendChild(s);
    };

    const makeSkeletonCard = (assetId) => {
        ensureSkeletonStyle();
        const tmpl = document.querySelector(AV_WRAP_SEL + ':not([data-pks-fake])');
        const sk = document.createElement('div');
        sk.className = tmpl ? tmpl.className : 'avatarCardWrapper-0-2-421';
        sk.setAttribute('data-pks-fake', assetId);
        sk.setAttribute('data-pks-skeleton', '1');
        sk.style.pointerEvents = 'none';
        sk.innerHTML = `<div style="width:100%;border-radius:8px;overflow:hidden;"><div class="pks-skel" style="width:100%;aspect-ratio:1;border-radius:8px;"></div><div class="pks-skel" style="height:11px;margin:7px 6px 4px;border-radius:4px;"></div></div>`;
        return sk;
    };

    const insertFakeCard = (item, skel) => {
        const dupe = document.querySelector(`[data-pks-fake="${item.assetId}"]:not([data-pks-skeleton])`);
        if (dupe) { if (skel && skel.parentElement) skel.remove(); return true; }
        const template = document.querySelector(AV_WRAP_SEL + ':not([data-pks-fake])');
        const grid = (template || document.querySelector(AV_WRAP_SEL))?.parentElement || getAvatarGrid();
        if (!grid) return false;
        const badgeHtml = item.restriction ? `<span class="icon-labels-18 ${item.restriction}"></span>` : '';
        let card;
        if (template) {
            card = template.cloneNode(true);
            const img = card.querySelector('img');
            if (img) { img.removeAttribute('srcset'); img.src = item.thumb; img.alt = item.name; img.onerror = null; }
            const link = card.querySelector('a');
            if (link) { link.href = fakeCatalogHref(item); const span = link.querySelector('span') || link; span.textContent = item.name; }
            card.querySelectorAll('[class*="avatarCardEquipped"]').forEach(e => e.remove());
            const restr = card.querySelector('[class*="restrictionsContainer"]'); if (restr) restr.innerHTML = badgeHtml;
        } else {
            card = document.createElement('div');
            card.className = 'avatarCardWrapper-0-2-421';
            card.innerHTML = `<div class="avatarCardContainer-0-2-422"><div class="avatarCardImage-0-2-423"><img src="${item.thumb}" alt="${escHtml(item.name)}"><div class="restrictionsContainer-0-2-426">${badgeHtml}</div></div><a class="avatarCardItemLink-0-2-424" href="${fakeCatalogHref(item)}"><span class="text-overflow">${escHtml(item.name)}</span></a></div>`;
        }
        card.setAttribute('data-pks-fake', item.assetId);
        card.style.cursor = 'pointer';
        const cardBody = card.querySelector('[class*="avatarCardContainer"]') || card.firstElementChild;
        if (Array.isArray(_wornCache) && _wornCache.includes(parseInt(item.assetId)) && cardBody && !card.querySelector('[class*="avatarCardEquipped"]')) {
            cardBody.appendChild(makeEquippedEl());
        }
        card.addEventListener('click', async (e) => {
            if (e.target.closest('a')) return;
            e.preventDefault(); e.stopPropagation();
            const equippedEl = card.querySelector('[class*="avatarCardEquipped"]');
            const ok = await setFakeWearing(item.assetId, item.name, !equippedEl);
            if (!ok) return;
            if (equippedEl) equippedEl.remove();
            else if (cardBody) cardBody.appendChild(makeEquippedEl());
        });
        const placeholder = (skel && skel.parentElement) ? skel : document.querySelector(`[data-pks-skeleton="1"][data-pks-fake="${item.assetId}"]`);
        if (placeholder && placeholder.parentElement) placeholder.parentElement.replaceChild(card, placeholder);
        else grid.insertBefore(card, grid.firstChild);
        applyAvatarGlass();
        return true;
    };

    const addFakeAvatarItem = async (assetId, persist = true) => {
        if (persist) {
            const arr = Array.isArray(cfg.avatarFakeItems) ? cfg.avatarFakeItems.slice() : [];
            if (!arr.includes(String(assetId))) { arr.push(String(assetId)); cfg.avatarFakeItems = arr; saveCfg(cfg); }
        }
        let skel = null;
        const grid = getAvatarGrid();
        if (grid && !document.querySelector(`[data-pks-fake="${assetId}"]`)) {
            skel = makeSkeletonCard(assetId);
            grid.insertBefore(skel, grid.firstChild);
        }
        const item = await fetchFakeItemData(assetId);
        await new Promise(r => setTimeout(r, 450 + Math.random() * 650));
        const ok = insertFakeCard(item, skel);
        if (!ok && skel && skel.parentElement) skel.remove();
        return ok;
    };

    const removeFakeAvatarItem = (assetId) => {
        cfg.avatarFakeItems = (cfg.avatarFakeItems || []).filter(x => String(x) !== String(assetId));
        if (cfg.avatarFakeQty && cfg.avatarFakeQty[assetId] !== undefined) { delete cfg.avatarFakeQty[assetId]; }
        saveCfg(cfg);
        document.querySelectorAll(`[data-pks-fake="${assetId}"]`).forEach(el => el.remove());
        if (isCatalogItemPage() && String(currentCatalogAssetId()) === String(assetId)) removeCatalogOwned();
    };


    const removeCatalogOwned = () => document.querySelectorAll('[data-pks-owned]').forEach(el => el.remove());
    const applyCatalogOwned = () => {
        if (!isCatalogItemPage()) return;
        const id = currentCatalogAssetId();
        const owned = (cfg.avatarFakeItems || []).map(String).includes(String(id));
        if (!owned) { removeCatalogOwned(); return; }
        const tryInject = () => {
            if (document.querySelector('[data-pks-owned]')) return true;
            const info = document.querySelector('[class*="itemHeaderInfo"]');
            if (!info) return false;
            if (/Item Owned/i.test(info.textContent || '')) return true;
            const qty = Math.max(1, parseInt((cfg.avatarFakeQty || {})[id]) || 1);
            const wrap = document.createElement('div');
            wrap.setAttribute('data-pks-owned', id);
            wrap.style.cssText = 'display:flex;align-items:center;gap:5px;margin-left:8px;';
            wrap.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" style="flex-shrink:0;"><circle cx="8" cy="8" r="8" fill="#00b06f"/><path d="M4.2 8.2l2.3 2.3 5-5.2" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg><span style="font-weight:500;font-size:14px;">Item Owned (${qty})</span>`;
            info.appendChild(wrap);
            return true;
        };
        if (tryInject()) return;
        let tries = 0;
        const obs = new MutationObserver(() => {
            if (tries++ > 150) { obs.disconnect(); return; }
            if (tryInject()) obs.disconnect();
        });
        obs.observe(document.body, { childList:true, subtree:true });
    };

    const injectAvatarTools = () => {
        if (!isAvatarPage()) return;
        const tryInject = () => {
            if (document.getElementById('pks-avatar-tools')) return true;
            const anchor = document.querySelector('[class*="avatarThumbContainer"]');
            if (!anchor || !anchor.parentElement) return false;
            const t = getTheme();
            const inputCss = `background:#16161f;border:1px solid #2a2a3a;border-radius:7px;color:#e6e6f2;font-size:12px;padding:7px 9px;outline:none;font-family:inherit;`;
            const btnCss = `background:${t.accent};color:#050508;border:none;border-radius:7px;padding:7px 12px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit;letter-spacing:0.04em;`;
            const card = document.createElement('div');
            card.id = 'pks-avatar-tools';
            card.style.cssText = `margin-top:14px;padding:14px;border-radius:14px;background:rgba(10,10,16,0.55);backdrop-filter:blur(16px) saturate(160%);-webkit-backdrop-filter:blur(16px) saturate(160%);border:1px solid #ffffff40;box-shadow:0 8px 30px rgba(0,0,0,0.45);font-family:var(--pks-font),'Share Tech Mono',monospace;color:#d0d0e0;`;
            card.innerHTML = `
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                    <span style="font-size:12px;font-weight:700;letter-spacing:0.12em;color:#fff;text-transform:uppercase;">Background</span>
                </div>
                <div style="font-size:10px;color:#777;margin-bottom:10px;">Choose a background below.</div>
                <div id="pks-av-bg-grid" style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-bottom:8px;max-height:240px;overflow-y:auto;"></div>
                <input type="text" id="pks-av-bgimg" placeholder="Custom image URL (press Enter)" style="width:100%;${inputCss}">
            `;
            anchor.parentElement.insertBefore(card, anchor.nextSibling);

            const grid = document.getElementById('pks-av-bg-grid');
            const renderBgGrid = () => {
                if (!grid) return;
                grid.innerHTML = '';
                const none = document.createElement('div');
                none.title = 'No background';
                none.style.cssText = `aspect-ratio:1;border-radius:8px;background:#16161f;border:2px solid ${!cfg.avatarBgImage ? '#fff' : '#2a2a3a'};cursor:pointer;display:flex;align-items:center;justify-content:center;color:#777;font-size:9px;font-weight:700;`;
                none.textContent = 'OFF';
                none.addEventListener('click', () => { cfg.avatarBgImage = ''; saveCfg(cfg); applyAvatarBg(); renderBgGrid(); });
                grid.appendChild(none);
                AVATAR_BG_PRESETS.forEach(url => {
                    const sel = cfg.avatarBgImage === url;
                    const tile = document.createElement('div');
                    tile.style.cssText = `aspect-ratio:1;border-radius:8px;background-image:url('${url}');background-size:cover;background-position:center;border:2px solid ${sel ? '#fff' : 'transparent'};cursor:pointer;box-shadow:${sel ? `0 0 0 1px #fff,0 0 10px #ffffff66` : '0 1px 4px rgba(0,0,0,0.4)'};transition:transform 0.12s;`;
                    tile.addEventListener('mouseenter', () => { tile.style.transform = 'scale(1.07)'; });
                    tile.addEventListener('mouseleave', () => { tile.style.transform = 'scale(1)'; });
                    tile.addEventListener('click', () => { cfg.avatarBgImage = url; cfg.avatarBgEnabled = true; saveCfg(cfg); applyAvatarBg(); renderBgGrid(); });
                    grid.appendChild(tile);
                });
            };
            renderBgGrid();

            const bgImg = document.getElementById('pks-av-bgimg');
            if (bgImg && cfg.avatarBgImage && !AVATAR_BG_PRESETS.includes(cfg.avatarBgImage)) bgImg.value = cfg.avatarBgImage;
            bgImg?.addEventListener('keydown', (e) => {
                if (e.key !== 'Enter') return;
                cfg.avatarBgImage = bgImg.value.trim(); cfg.avatarBgEnabled = true; saveCfg(cfg); applyAvatarBg(); renderBgGrid();
                notify('Avatar background applied', 'info');
            });

            applyAvatarBg();
            applyAvatarGlass();
            const reAddFakes = async () => {
                await getWornAssets();
                (cfg.avatarFakeItems || []).forEach(id => { if (!document.querySelector(`[data-pks-fake="${id}"]`)) addFakeAvatarItem(id, false); });
            };
            reAddFakes();
            setTimeout(reAddFakes, 1500);
            return true;
        };
        if (tryInject()) return;
        let tries = 0;
        const obs = new MutationObserver(() => {
            if (tries++ > 150) { obs.disconnect(); return; }
            if (tryInject()) obs.disconnect();
        });
        obs.observe(document.body, { childList:true, subtree:true });
    };

    const isFriendsPage = () => /\/friends/i.test(location.pathname);
    const declineFriend = (uid) => postApi(`https://pekora.pro/apisite/friends/v1/users/${uid}/decline-friend-request`, {});
    const unfriendUser  = (uid) => postApi(`https://pekora.pro/apisite/friends/v1/users/${uid}/unfriend`, {});

    const collectRequestIds = async () => {
        const ids = new Set();
        try {
            let cursor = '';
            for (let i = 0; i < 50; i++) {
                const url = `https://pekora.pro/apisite/friends/v1/my/friends/requests?limit=100${cursor ? '&cursor=' + encodeURIComponent(cursor) : ''}`;
                const r = await apiGet(url);
                if (!r.ok) break;
                const d = await r.json();
                (d.data || []).forEach(u => { const id = u.id || u.userId; if (id) ids.add(String(id)); });
                cursor = d.nextPageCursor;
                if (!cursor) break;
            }
        } catch {}
        if (ids.size === 0) {
            document.querySelectorAll('[class*="manageRequestCard"]').forEach(card => {
                const wrap = card.closest('[class*="friendCardWrapper"]') || card.parentElement;
                const m = wrap?.querySelector('a[href*="/users/"]')?.getAttribute('href')?.match(/\/users\/(\d+)/);
                if (m) ids.add(m[1]);
            });
        }
        return [...ids];
    };

    const addFriendRemoveButtons = () => {
        document.querySelectorAll('[class*="friendCardWrapper"]').forEach(wrap => {
            if (wrap.querySelector('[class*="manageRequestCard"]')) return;
            if (wrap.querySelector('.pks-remove-friend')) return;
            const uid = wrap.querySelector('a[href*="/users/"]')?.getAttribute('href')?.match(/\/users\/(\d+)/)?.[1];
            if (!uid) return;
            const host = wrap.querySelector('[class*="friendCard"]') || wrap;
            host.style.position = 'relative';
            const btn = document.createElement('button');
            btn.className = 'pks-remove-friend';
            btn.title = 'Remove friend';
            btn.innerHTML = '✕';
            btn.style.cssText = 'position:absolute;top:6px;right:6px;z-index:5;width:22px;height:22px;border-radius:50%;border:none;background:rgba(0,0,0,0.35);color:#fff;font-size:12px;font-weight:700;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background 0.15s,transform 0.12s;';
            let armed = false, tmr = null;
            btn.addEventListener('mouseenter', () => { if (!armed) btn.style.background = 'rgba(216,40,60,0.9)'; });
            btn.addEventListener('mouseleave', () => { if (!armed) btn.style.background = 'rgba(0,0,0,0.35)'; });
            btn.addEventListener('click', async (e) => {
                e.preventDefault(); e.stopPropagation();
                if (btn.disabled) return;
                if (!armed) { armed = true; btn.style.background = '#d8283c'; btn.style.transform = 'scale(1.15)'; btn.title = 'Click again to remove'; tmr = setTimeout(() => { armed = false; btn.style.transform = 'none'; btn.style.background = 'rgba(0,0,0,0.35)'; btn.title = 'Remove friend'; }, 2500); return; }
                clearTimeout(tmr); armed = false; btn.disabled = true; btn.innerHTML = '…';
                try {
                    const r = await unfriendUser(uid);
                    if (r.ok) { notify('Removed friend', 'success'); wrap.style.transition = 'opacity 0.25s'; wrap.style.opacity = '0'; setTimeout(() => wrap.remove(), 260); }
                    else { notify('Could not remove friend', 'error'); btn.disabled = false; btn.innerHTML = '✕'; }
                } catch { notify('Could not remove friend', 'error'); btn.disabled = false; btn.innerHTML = '✕'; }
            });
            host.appendChild(btn);
        });
    };

    const doBulk = async (btn, label, collectFn, actionFn, noun) => {
        btn.disabled = true; btn.textContent = 'Loading…';
        const ids = await collectFn();
        if (!ids.length) { notify(`No ${noun} found`, 'info'); btn.disabled = false; btn.textContent = label; return; }
        let done = 0, fail = 0;
        for (const id of ids) {
            btn.textContent = `${label} ${done + fail + 1}/${ids.length}…`;
            try { const r = await actionFn(id); r.ok ? done++ : fail++; } catch { fail++; }
            await new Promise(res => setTimeout(res, 120));
        }
        notify(`${label}: ${done} ${noun}${fail ? ` (${fail} failed)` : ''}`, fail ? 'info' : 'success');
        btn.disabled = false; btn.textContent = label;
        setTimeout(() => location.reload(), 700);
    };

    const mkBulkBtn = (id, label, t, runFn) => {
        const btn = document.createElement('button');
        btn.id = id; btn.textContent = label;
        btn.style.cssText = `margin-left:14px;vertical-align:middle;background:${t.accent};color:#050508;border:none;border-radius:7px;padding:6px 14px;font-size:13px;font-weight:700;cursor:pointer;font-family:var(--pks-font),'Exo 2',sans-serif;letter-spacing:0.04em;box-shadow:0 2px 10px ${t.accent}55;`;
        let armed = false, armTimer = null;
        btn.addEventListener('click', async () => {
            if (btn.disabled) return;
            if (!armed) { armed = true; btn.textContent = 'Click again to confirm'; armTimer = setTimeout(() => { armed = false; btn.textContent = label; }, 3000); return; }
            clearTimeout(armTimer); armed = false;
            await runFn(btn);
        });
        return btn;
    };

    let _bulkObserver = null;
    const injectFriendsButtons = () => {
        if (!isFriendsPage()) { _bulkObserver?.disconnect(); _bulkObserver = null; return; }
        const tryInject = () => {
            const t = getTheme();
            const heads = [...document.querySelectorAll('h2')];
            const reqH2 = heads.find(h => /FRIEND REQUESTS/i.test(h.textContent || ''));
            if (reqH2 && !reqH2.querySelector('#pks-bulk-ignore'))
                reqH2.appendChild(mkBulkBtn('pks-bulk-ignore', 'Bulk Ignore', t, (b) => doBulk(b, 'Bulk Ignore', collectRequestIds, declineFriend, 'requests')));
            const activeTab = (document.querySelector('[class*="entryActive"]')?.textContent || '').trim().toLowerCase();
            if (activeTab === 'friends') addFriendRemoveButtons();
            return true;
        };
        tryInject();
        if (_bulkObserver) return;
        let scheduled = false;
        _bulkObserver = new MutationObserver(() => {
            if (scheduled) return; scheduled = true;
            requestAnimationFrame(() => { scheduled = false; tryInject(); });
        });
        _bulkObserver.observe(document.body, { childList: true, subtree: true });
    };

    const applyEmptySectionStyles = () => {
        document.querySelectorAll('.section-content-off,[class*="noGames"]').forEach(el => {
            el.style.setProperty('display', 'flex', 'important');
            el.style.setProperty('align-items', 'center', 'important');
            el.style.setProperty('justify-content', 'center', 'important');
            el.style.setProperty('background', 'rgba(255,255,255,0.03)', 'important');
            el.style.setProperty('border', '1px solid rgba(255,255,255,0.07)', 'important');
            el.style.setProperty('border-radius', '12px', 'important');
            el.style.setProperty('color', 'rgba(255,255,255,0.25)', 'important');
            el.style.setProperty('padding', '32px 16px', 'important');
            el.style.setProperty('min-height', '60px', 'important');
            el.style.setProperty('font-size', '12px', 'important');
            el.style.setProperty('text-align', 'center', 'important');
        });
    };

    const applyAgeOverride = () => {
        document.querySelectorAll('[class*="ageSpan-"]').forEach(el => {
            if (el.textContent !== '13+') el.textContent = '13+';
        });
    };

    const removeNagAlerts = () => {
        document.querySelectorAll('.alert-pjx.alert-warning').forEach(el => el.remove());
    };

    // ── Compatibility with tradenot (tn-panel) ─────────────────────────────
    // When tradenot's panel is open it sits at right:20px — we shift our panel
    // left so they don't overlap.
    const applyThirdPartyCompat = () => {
        const panel = document.getElementById('pks-panel');
        if (!panel) return;
        const tnPanel = document.getElementById('tn-panel');
        if (tnPanel && getComputedStyle(tnPanel).display !== 'none') {
            // tradenot panel width is ~420px + 20px gap
            panel.style.right = '450px';
        } else {
            panel.style.right = '18px';
        }
        // krneallinone: hide our trades overlay if krn's own trades UI is active
        if (document.getElementById('tm-trades-ui') || document.querySelector('[class*="tm-injected"]')) {
            const overlay = document.getElementById('pks-tr-overlay');
            if (overlay) overlay.style.display = 'none';
        }
    };

    const injectProfileTradeButton = () => {
        if (!/\/users\/\d+\/profile/i.test(location.pathname)) return;
        let tradeItem = null;
        document.querySelectorAll('[class*="dropdownItem"]').forEach(li => {
            const a = li.querySelector('a');
            if (a && a.textContent.trim() === 'Trade') tradeItem = li;
        });
        if (!tradeItem) return;
        tradeItem.style.display = 'none';
        const wrapper = tradeItem.closest('[class*="dropdownWrapper"]');
        if (!wrapper) return;
        if (wrapper.querySelector('.pks-profile-trade-btn')) return;
        const dotsBtn = wrapper.querySelector('[class*="dropdownButton"]');
        if (!dotsBtn) return;
        const uid = (location.pathname.match(/\/users\/(\d+)/) || [])[1];
        if (!uid) return;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'pks-profile-trade-btn';
        btn.textContent = 'Trade';
        btn.style.cssText = `display:inline-flex;align-items:center;justify-content:center;margin-right:8px;padding:5px 14px;background:#fff;color:#141414;border:none;border-radius:7px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;vertical-align:middle;line-height:1;letter-spacing:0.02em;`;
        btn.addEventListener('mouseenter', () => { btn.style.background = '#e6e6e6'; });
        btn.addEventListener('mouseleave', () => { btn.style.background = '#fff'; });
        btn.addEventListener('click', (e) => {
            e.preventDefault(); e.stopPropagation();
            const url = 'https://pekora.pro/Trade/TradeWindow.aspx?TradePartnerID=' + uid;
            const w = 900, h = 700;
            const left = Math.max(0, Math.round(((window.screen?.width  || 1280) - w) / 2));
            const top  = Math.max(0, Math.round(((window.screen?.height || 800)  - h) / 2));
            const win = window.open(url, 'pks_trade_' + uid, `popup,width=${w},height=${h},left=${left},top=${top}`);
            if (!win) location.href = url;
        });
        wrapper.insertBefore(btn, dotsBtn);
    };

    const monitorDOM = () => {
        if (state.dom.observer) state.dom.observer.disconnect();
        let debounce = null;
        state.dom.observer = new MutationObserver(() => {
            if (debounce) return;
            debounce = setTimeout(() => {
                debounce = null;
                if (cfg.sidebarEnabled) applySidebarDirect();
                injectSidebarLinks();
                applyAgeOverride();
                applyEmptySectionStyles();
                ensureTradesOverlay();
                removeNagAlerts();
                injectProfileTradeButton();
                applyAvatarControls();
                applyBadges();
                applyProfileBannerForPage();
                applyThirdPartyCompat();
            }, 60);
        });
        state.dom.observer.observe(document.body, { childList:true, subtree:true });
        applyAgeOverride();
        applyEmptySectionStyles();
        removeNagAlerts();
        injectProfileTradeButton();
        applyAvatarControls();
        applyBadges();
        applyProfileBannerForPage();
    };

    const monitorNavigation = () => {
        const origPush    = history.pushState;
        const origReplace = history.replaceState;
        const onNav = () => {
            const url = location.href; if (url === state.session.lastUrl) return;
            state.session.lastUrl = url;
            _tradeWindowInjected = false;
            _tradesPageInjected = false;
            _tradesInjecting = false;
            _tradesClosed = false;
            _badgeProfileId = null; // reset so badges re-render on next profile page
            _bannerFetchedId = null; // reset so banner re-fetches on next profile page
            const _trOv = document.getElementById('pks-tr-overlay');
            if (_trOv) { if (_trOv._onKey) document.removeEventListener('keydown', _trOv._onKey); _trOv.remove(); }
            document.getElementById('pks-tr-hide')?.remove();
            twMyItems = []; twTheirItems = [];
            twMySelected = []; twTheirSelected = [];
            twMyPage = 0; twTheirPage = 0;
            twMySearch = ''; twTheirSearch = '';
            if (/\/My\/Trades\.aspx/i.test(location.pathname)) ensureTradesOverlay();
            setTimeout(() => {
                applyPageFrameTransparency();
                applySidebarNavStyle();
                applySidebarDirect();
                if (isTradePage()) applyTradeStyle();
                if (isTradeWindow()) injectTradeWindow();
                if (/\/My\/Trades\.aspx/i.test(location.pathname)) ensureTradesOverlay();
                if (isAvatarPage()) injectAvatarTools();
                if (isCatalogItemPage()) applyCatalogOwned();
                applyGamesHeroBackdrop();
                injectFriendsButtons();
                applyBadges();
                applyProfileBannerForPage();
                initCollectibles();
                if (!isTradeWindow() && cfg.effectType !== 'none' && !document.getElementById('pks-effects-canvas')) applyEffects();
            }, 400);
        };
        history.pushState    = function (...a) { origPush.apply(this, a);    onNav(); };
        history.replaceState = function (...a) { origReplace.apply(this, a); onNav(); };
        window.addEventListener('popstate', onNav);
    };

    const showFirstRunWelcome = () => {
        try {
            const seen = GM_getValue(FIRST_RUN_KEY, false);
            if (seen) return;
            GM_setValue(FIRST_RUN_KEY, true);
        } catch { return; }

        const overlay = document.createElement('div');
        overlay.id = 'grx-welcome-overlay';
        overlay.style.cssText = `
            all:initial;position:fixed;inset:0;z-index:2147483647;
            display:flex;align-items:center;justify-content:center;
            background:rgba(4,4,7,0.92);backdrop-filter:blur(28px);
            font-family:'Share Tech Mono',monospace;
        `;
        overlay.innerHTML = `
            <style>
                @keyframes grx-fadein { from{opacity:0;transform:translateY(24px) scale(0.95)} to{opacity:1;transform:translateY(0) scale(1)} }
                @keyframes grx-border-flow { 0%{background-position:0% 50%} 100%{background-position:200% 50%} }
                @keyframes grx-pulse { 0%,100%{opacity:0.6} 50%{opacity:1} }
                #grx-welcome-box { animation:grx-fadein 0.5s cubic-bezier(0.22,1,0.36,1) forwards; }
                #grx-discord-btn:hover { filter:brightness(1.15);transform:translateY(-2px);box-shadow:0 8px 28px rgba(88,101,242,0.5)!important; }
                #grx-welcome-close:hover { background:rgba(255,255,255,0.12)!important;border-color:rgba(255,255,255,0.25)!important; }
            </style>
            <div id="grx-welcome-box" style="background:#07070f;border:1px solid #18182a;border-radius:18px;padding:0;width:420px;overflow:hidden;position:relative;box-shadow:0 40px 120px rgba(0,0,0,0.98),0 0 0 1px rgba(255,255,255,0.03);">
                <div style="height:3px;background:linear-gradient(90deg,#5865f2,#a855f7,#00e87a,#5865f2);background-size:200% 100%;animation:grx-border-flow 4s linear infinite;"></div>
                <div style="padding:28px 28px 10px;text-align:center;">
                    <div style="display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,rgba(88,101,242,0.18),rgba(88,101,242,0.05));border:1px solid rgba(88,101,242,0.35);margin-bottom:18px;">
                        <svg width="28" height="22" viewBox="0 0 28 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M23.7 1.8A23.1 23.1 0 0 0 17.9 0c-.3.5-.6 1.1-.8 1.6a21.4 21.4 0 0 0-6.4 0C10.5 1.1 10.2.5 9.9 0A23.2 23.2 0 0 0 4.1 1.8C.6 7 -.4 12 .1 16.9a23.3 23.3 0 0 0 7.1 3.6 17 17 0 0 0 1.5-2.4 15 15 0 0 1-2.4-1.1l.6-.5a16.6 16.6 0 0 0 14.2 0l.6.5a15 15 0 0 1-2.4 1.1 17 17 0 0 0 1.5 2.4 23.2 23.2 0 0 0 7.1-3.6c.6-5.6-.9-10.6-3.2-15.1ZM9.4 13.8c-1.4 0-2.5-1.3-2.5-2.8s1.1-2.8 2.5-2.8 2.5 1.3 2.5 2.8-1.1 2.8-2.5 2.8Zm9.2 0c-1.4 0-2.5-1.3-2.5-2.8s1.1-2.8 2.5-2.8 2.5 1.3 2.5 2.8-1.1 2.8-2.5 2.8Z" fill="#5865f2"/>
                        </svg>
                    </div>
                    <div style="color:rgba(255,255,255,0.2);font-size:8px;letter-spacing:0.28em;text-transform:uppercase;margin-bottom:8px;font-family:'Share Tech Mono',monospace;">Grexium</div>
                    <div style="color:#fff;font-size:22px;font-weight:700;letter-spacing:0.02em;font-family:'Share Tech Mono',monospace;line-height:1.2;margin-bottom:14px;">
                        Hey, that extension<br>is fully free!
                    </div>
                    <div style="color:rgba(255,255,255,0.45);font-size:12px;line-height:1.7;letter-spacing:0.04em;margin-bottom:24px;">
                        No purchases, no keys, no paywalls.<br>
                        Join our community to stay updated, get support, and share feedback.
                    </div>
                    <a id="grx-discord-btn" href="https://discord.gg/kHcNNkXH4a" target="_blank" rel="noopener" style="all:unset;display:inline-flex;align-items:center;gap:10px;background:#5865f2;color:#fff;font-family:'Share Tech Mono',monospace;font-size:13px;font-weight:700;letter-spacing:0.08em;padding:12px 28px;border-radius:10px;cursor:pointer;box-shadow:0 4px 18px rgba(88,101,242,0.35);transition:filter 0.18s,transform 0.18s,box-shadow 0.18s;text-decoration:none;">
                        <svg width="18" height="14" viewBox="0 0 28 22" fill="none"><path d="M23.7 1.8A23.1 23.1 0 0 0 17.9 0c-.3.5-.6 1.1-.8 1.6a21.4 21.4 0 0 0-6.4 0C10.5 1.1 10.2.5 9.9 0A23.2 23.2 0 0 0 4.1 1.8C.6 7 -.4 12 .1 16.9a23.3 23.3 0 0 0 7.1 3.6 17 17 0 0 0 1.5-2.4 15 15 0 0 1-2.4-1.1l.6-.5a16.6 16.6 0 0 0 14.2 0l.6.5a15 15 0 0 1-2.4 1.1 17 17 0 0 0 1.5 2.4 23.2 23.2 0 0 0 7.1-3.6c.6-5.6-.9-10.6-3.2-15.1ZM9.4 13.8c-1.4 0-2.5-1.3-2.5-2.8s1.1-2.8 2.5-2.8 2.5 1.3 2.5 2.8-1.1 2.8-2.5 2.8Zm9.2 0c-1.4 0-2.5-1.3-2.5-2.8s1.1-2.8 2.5-2.8 2.5 1.3 2.5 2.8-1.1 2.8-2.5 2.8Z" fill="#fff"/></svg>
                        Join our Discord
                    </a>
                </div>
                <div style="padding:18px 28px 24px;text-align:center;">
                    <button id="grx-welcome-close" style="all:unset;display:inline-block;padding:8px 22px;border-radius:8px;font-family:'Share Tech Mono',monospace;font-size:10px;font-weight:700;letter-spacing:0.1em;color:rgba(255,255,255,0.3);border:1px solid rgba(255,255,255,0.1);background:transparent;cursor:pointer;transition:background 0.15s,border-color 0.15s;">
                        CONTINUE WITHOUT JOINING
                    </button>
                    <div style="margin-top:12px;color:rgba(255,255,255,0.12);font-size:9px;letter-spacing:0.1em;">discord.gg/kHcNNkXH4a</div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const close = () => {
            overlay.style.transition = 'opacity 0.3s ease';
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 320);
        };

        document.getElementById('grx-welcome-close').addEventListener('click', close);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    };

    // ── RAP/Value extension install prompt ────────────────────────────────────
    const showRapValPrompt = () => {
        try {
            if (GM_getValue(RAPVAL_PROMPT_KEY, false)) return;
        } catch { return; }

        // Show after a short delay so it doesn't appear with the welcome popup
        setTimeout(() => {
            if (document.getElementById('grx-rapval-overlay')) return;

            const t = getTheme();
            const overlay = document.createElement('div');
            overlay.id = 'grx-rapval-overlay';
            overlay.style.cssText = 'all:initial;position:fixed;bottom:24px;left:0;right:0;display:flex;justify-content:center;z-index:2147483646;font-family:var(--pks-font),"Share Tech Mono",monospace;pointer-events:none;';

            overlay.innerHTML = `
                <style>
                    @keyframes grx-rv-in{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
                    #grx-rapval-box{animation:grx-rv-in 0.4s cubic-bezier(0.22,1,0.36,1) both;pointer-events:all;}
                    #grx-rv-install:hover{filter:brightness(1.15);transform:translateY(-1px);}
                    #grx-rv-skip:hover{color:rgba(255,255,255,0.5)!important;}
                </style>
                <div id="grx-rapval-box" style="
                    display:flex;align-items:center;gap:14px;
                    background:rgba(10,10,18,0.97);
                    backdrop-filter:blur(20px) saturate(160%);
                    -webkit-backdrop-filter:blur(20px) saturate(160%);
                    border:1px solid ${t.border};
                    border-radius:14px;
                    padding:16px 20px;
                    box-shadow:0 8px 40px rgba(0,0,0,0.7),0 0 0 1px rgba(255,255,255,0.04);
                    width:560px;
                    max-width:calc(100vw - 48px);
                    box-sizing:border-box;
                ">
                    <!-- icon -->
                    <div style="width:42px;height:42px;flex:none;border-radius:11px;background:linear-gradient(135deg,rgba(56,189,248,0.18),rgba(56,189,248,0.05));border:1px solid rgba(56,189,248,0.3);display:flex;align-items:center;justify-content:center;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
                        </svg>
                    </div>
                    <!-- text -->
                    <div style="flex:1;min-width:0;">
                        <div style="color:#fff;font-size:13px;font-weight:700;letter-spacing:0.04em;margin-bottom:4px;white-space:nowrap;">
                            Get RAP &amp; Value display (doent finished for pekora.pro)
                        </div>
                        <div style="color:rgba(255,255,255,0.6);font-size:11px;letter-spacing:0.03em;line-height:1.5;white-space:normal;">
                            Install the companion extension to see win/loss indicators on trades &amp; collectibles (doent finished for pekora.pro)
                        </div>
                    </div>
                    <!-- buttons -->
                    <div style="display:flex;align-items:center;gap:8px;flex:none;">
                        <a id="grx-rv-install"
                           href="https://raw.githubusercontent.com/Menwey/Grexium-Beta/refs/heads/main/doesnt-finished-yet.txt"
                           target="_blank" rel="noopener"
                           style="all:unset;display:inline-flex;align-items:center;gap:6px;background:${t.accent};color:#050508;font-family:var(--pks-font),'Share Tech Mono',monospace;font-size:11px;font-weight:700;letter-spacing:0.08em;padding:9px 18px;border-radius:8px;cursor:pointer;transition:filter 0.15s,transform 0.15s;white-space:nowrap;">
                            Install
                        </a>
                        <button id="grx-rv-skip" style="all:unset;width:28px;height:28px;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.2);font-family:var(--pks-font),'Share Tech Mono',monospace;font-size:14px;font-weight:700;cursor:pointer;transition:color 0.15s;border-radius:6px;background:rgba(255,255,255,0.04);">
                            ✕
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            const dismiss = (install) => {
                if (install) {
                    try { GM_setValue(RAPVAL_PROMPT_KEY, true); } catch {}
                }
                overlay.style.transition = 'opacity 0.25s';
                overlay.style.opacity = '0';
                setTimeout(() => overlay.remove(), 260);
            };

            document.getElementById('grx-rv-install').addEventListener('click', () => dismiss(true));
            document.getElementById('grx-rv-skip').addEventListener('click', () => dismiss(false));

            // Auto-dismiss after 15 sec
            setTimeout(() => { if (overlay.isConnected) dismiss(false); }, 15000);
        }, 3000);
    };

    // ── Collectibles page (/internal/collectibles) ────────────────────────────
    const initCollectibles = () => {
        if (!location.href.includes('/internal/collectibles')) return;
        const userId = new URLSearchParams(location.search).get('userId');
        if (!userId) return;

        // Redirect away from paginated pages
        const pi = new URLSearchParams(location.search).get('pageIndex');
        if (pi && pi !== '0') { location.href = `/internal/collectibles?userId=${userId}`; return; }

        const ROLIMONS_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1094 1466.2" style="width:15px;height:15px;flex-shrink:0;vertical-align:middle;"><path fill="#0084dd" d="M1094 521.6 0 0v469.5l141-67.4 250 119.2L0 707.8v369.7l815.6 388.7L315 893l779-371.4z"></path></svg>`;

        // Inject styles
        if (!document.getElementById('grx-col-style')) {
            const st = document.createElement('style');
            st.id = 'grx-col-style';
            st.textContent = `
                #grx-col-bar{display:flex;align-items:center;justify-content:flex-end;gap:6px;width:100%;margin-bottom:10px;flex-wrap:wrap;}
                #grx-col-bar button{background:transparent;color:rgba(255,255,255,0.5);border:1px solid rgba(255,255,255,0.15);border-radius:5px;padding:4px 11px;font-size:12px;font-weight:600;cursor:pointer;transition:border-color .15s,color .15s;white-space:nowrap;}
                #grx-col-bar button:hover{border-color:rgba(255,255,255,0.35);color:#fff;}
                #grx-col-bar button.grx-active{border-color:#3fcf6a;color:#3fcf6a;}
                .grx-value{color:#0084dd;font-weight:700;margin-top:4px;font-size:13px;display:flex;align-items:center;gap:4px;}
                #grx-col-total-value{color:#0084dd;font-weight:700;margin-top:6px;font-size:14px;}
                .grx-dupe-badge{position:absolute;top:5px;right:5px;background:#2a2a2a;color:rgba(255,255,255,0.75);font-size:11px;font-weight:700;padding:2px 7px;border-radius:5px;border:1px solid rgba(255,255,255,0.12);pointer-events:none;z-index:10;}
                .grx-serial-btn{display:block;margin:5px auto 0;background:transparent;color:rgba(255,255,255,0.4);border:1px solid rgba(255,255,255,0.12);border-radius:5px;font-size:10px;font-weight:600;padding:2px 8px;cursor:pointer;white-space:nowrap;width:100%;}
                .grx-modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,0.72);z-index:999999;display:flex;align-items:center;justify-content:center;padding:20px;}
                .grx-modal{width:min(440px,95vw);max-height:70vh;overflow:auto;background:#181818;color:#fff;border:1px solid #3a3a3a;border-radius:12px;padding:16px;}
                .grx-modal-head{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #333;padding-bottom:10px;margin-bottom:10px;font-weight:700;font-size:14px;}
                .grx-modal-close{background:#242c36;color:#fff;border:1px solid #4a5666;border-radius:7px;padding:5px 10px;cursor:pointer;}
                .grx-modal-list{display:grid;gap:5px;}
                .grx-modal-row{background:#111;border:1px solid #333;border-radius:7px;padding:7px 10px;font-size:12px;}
            `;
            document.head.appendChild(st);
        }

        const getVal = (assetId) => getKolVal(assetId) || 0;

        const extractSerial = (name) => {
            if (!name) return Infinity;
            const m = name.match(/#\s*(\d+)/);
            if (m) return parseInt(m[1], 10);
            const tokens = (name.match(/\b(\d+)\b/g) || []).map(Number).filter(n => n > 0 && n < 100000 && !(n >= 1900 && n <= 2100));
            return tokens.length ? Math.min(...tokens) : Infinity;
        };

        let stackedMode = false;

        const processCards = () => {
            let totalValue = 0;
            const row = document.querySelector('.col-12.col-lg-9 .row');
            if (!row) return;

            document.querySelectorAll('.col-6.col-md-4.col-lg-2.mb-2').forEach(card => {
                const link = card.querySelector('a');
                if (!link) return;
                const m = link.href.match(/catalog\/(\d+)\//);
                if (!m) return;
                const assetId = m[1];
                const rap = (() => {
                    const p = card.querySelector('.card-body p:nth-of-type(2)');
                    if (!p) return 0;
                    const match = p.textContent.match(/RAP:\s*([\d,]+)/i);
                    return match ? parseInt(match[1].replace(/,/g, ''), 10) : 0;
                })();
                const val = getVal(parseInt(assetId)) || rap;
                totalValue += val;

                // Set data attrs for sorting
                const nameEl = card.querySelector('.card-body p.fw-bolder') || card.querySelector('.card-body p');
                card.dataset.value = val;
                card.dataset.rap = rap;
                card.dataset.name = nameEl ? nameEl.textContent.trim() : '';
                card.dataset.serial = extractSerial(card.dataset.name);
                card.dataset.assetId = assetId;

                // Inject value line
                if (!card.querySelector('.grx-value')) {
                    const p = document.createElement('p');
                    p.className = 'grx-value mb-0';
                    p.innerHTML = `${ROLIMONS_SVG}<span>Value: ${val.toLocaleString()}</span>`;
                    const body = card.querySelector('.card-body') || card;
                    body.appendChild(p);
                }
            });

            // Total value in sidebar
            const rapEl = [...document.querySelectorAll('.fw-bolder')].find(el => /Total RAP/i.test(el.textContent));
            if (rapEl) {
                let valEl = document.getElementById('grx-col-total-value');
                if (!valEl) {
                    valEl = document.createElement('p');
                    valEl.id = 'grx-col-total-value';
                    rapEl.insertAdjacentElement('afterend', valEl);
                }
                valEl.textContent = 'Total Value: ' + totalValue.toLocaleString();
            }
        };

        const sortCards = (type, asc) => {
            const row = document.querySelector('.col-12.col-lg-9 .row');
            if (!row) return;
            const cards = [...row.querySelectorAll('.col-6.col-md-4.col-lg-2.mb-2')];
            cards.sort((a, b) => {
                if (type === 'name') {
                    const A = (a.dataset.name || '').toLowerCase();
                    const B = (b.dataset.name || '').toLowerCase();
                    return asc ? A.localeCompare(B) : B.localeCompare(A);
                }
                if (type === 'serial') {
                    const A = parseFloat(a.dataset.serial) || Infinity;
                    const B = parseFloat(b.dataset.serial) || Infinity;
                    if (A !== B) return asc ? A - B : B - A;
                    return Number(b.dataset.value || 0) - Number(a.dataset.value || 0);
                }
                const A = Number(a.dataset[type] || 0);
                const B = Number(b.dataset[type] || 0);
                return asc ? A - B : B - A;
            });
            cards.forEach(c => row.appendChild(c));
            if (stackedMode) { unstackDupes(); stackDupes(); }
        };

        const showSerialModal = (name, entries) => {
            document.querySelector('.grx-modal-backdrop')?.remove();
            const backdrop = document.createElement('div');
            backdrop.className = 'grx-modal-backdrop';
            backdrop.innerHTML = `
                <div class="grx-modal">
                    <div class="grx-modal-head">
                        <span>${name}</span>
                        <button class="grx-modal-close">Close</button>
                    </div>
                    <div class="grx-modal-list">
                        ${entries.map(e => `<div class="grx-modal-row">${e}</div>`).join('')}
                    </div>
                </div>`;
            backdrop.querySelector('.grx-modal-close').onclick = () => backdrop.remove();
            backdrop.onclick = e => { if (e.target === backdrop) backdrop.remove(); };
            document.body.appendChild(backdrop);
        };

        const stackDupes = () => {
            const row = document.querySelector('.col-12.col-lg-9 .row');
            if (!row) return;
            const groups = new Map();
            [...row.querySelectorAll('.col-6.col-md-4.col-lg-2.mb-2')].forEach(card => {
                const name = (card.dataset.name || '').toLowerCase();
                if (!name) return;
                if (!groups.has(name)) groups.set(name, []);
                groups.get(name).push(card);
            });
            groups.forEach((group) => {
                if (group.length < 2) return;
                const keeper = group[0];
                group.slice(1).forEach(c => c.style.setProperty('display', 'none', 'important'));
                keeper.style.position = 'relative';
                let badge = keeper.querySelector('.grx-dupe-badge');
                if (!badge) { badge = document.createElement('div'); badge.className = 'grx-dupe-badge'; keeper.appendChild(badge); }
                badge.textContent = `×${group.length}`;
                const entries = group.map(c => {
                    const serial = c.dataset.serial;
                    const uaid = c.querySelector('.card-body p:nth-of-type(3)')?.textContent || '';
                    return serial !== 'Infinity' ? `Serial #${serial}` : uaid;
                });
                const body = keeper.querySelector('.card-body');
                if (body && !keeper.querySelector('.grx-serial-btn')) {
                    const btn = document.createElement('button');
                    btn.className = 'grx-serial-btn';
                    btn.textContent = `View serials (${group.length})`;
                    btn.onclick = () => showSerialModal(keeper.dataset.name, entries);
                    body.appendChild(btn);
                }
            });
        };

        const unstackDupes = () => {
            document.querySelectorAll('.col-6.col-md-4.col-lg-2.mb-2').forEach(c => {
                c.style.display = '';
            });
            document.querySelectorAll('.grx-dupe-badge').forEach(b => b.remove());
            document.querySelectorAll('.grx-serial-btn').forEach(b => b.remove());
        };

        const insertSortBar = () => {
            const row = document.querySelector('.col-12.col-lg-9 .row');
            if (!row || document.getElementById('grx-col-bar')) return;
            const bar = document.createElement('div');
            bar.id = 'grx-col-bar';

            const mkBtn = (id, label, onclick) => {
                const btn = document.createElement('button');
                btn.id = id; btn.textContent = label;
                btn.onclick = onclick;
                return btn;
            };

            let valAsc = false;
            bar.appendChild(mkBtn('grx-btn-val', 'Value ↓', () => {
                valAsc = !valAsc;
                document.getElementById('grx-btn-val').textContent = valAsc ? 'Value ↑' : 'Value ↓';
                sortCards('value', valAsc);
            }));

            let rapAsc = false;
            bar.appendChild(mkBtn('grx-btn-rap', 'RAP ↓', () => {
                rapAsc = !rapAsc;
                document.getElementById('grx-btn-rap').textContent = rapAsc ? 'RAP ↑' : 'RAP ↓';
                sortCards('rap', rapAsc);
            }));

            let serAsc = true;
            bar.appendChild(mkBtn('grx-btn-ser', 'Serial ↑', () => {
                serAsc = !serAsc;
                document.getElementById('grx-btn-ser').textContent = serAsc ? 'Serial ↑' : 'Serial ↓';
                sortCards('serial', serAsc);
            }));

            bar.appendChild(mkBtn('grx-btn-az', 'A → Z', () => {
                sortCards('name', true);
            }));

            const stackBtn = mkBtn('grx-btn-stack', 'Stack Dupes', () => {
                stackedMode = !stackedMode;
                if (stackedMode) { stackDupes(); stackBtn.textContent = 'Unstack'; stackBtn.classList.add('grx-active'); }
                else { unstackDupes(); stackBtn.textContent = 'Stack Dupes'; stackBtn.classList.remove('grx-active'); }
            });
            bar.appendChild(stackBtn);

            row.parentElement.insertBefore(bar, row);
        };

        // Wait for koromons data then run
        getKoromonsData().then(() => {
            const tryRun = () => {
                const row = document.querySelector('.col-12.col-lg-9 .row');
                if (!row || !row.querySelector('.col-6')) { setTimeout(tryRun, 300); return; }
                processCards();
                insertSortBar();
            };
            tryRun();
            setInterval(() => { processCards(); insertSortBar(); }, 1500);
        });
    };

    const init = () => {
        injectFont();

        // TradeWindow popup — inject immediately, skip auth gate.
        // Wait briefly to see if krneallinone (which also handles TradeWindow)
        // is installed — if so, let it take over and we only inject our CSS/watermark.
        if (isTradeWindow()) {
            injectFont();
            applyMisc();

            // Check after a short delay — krneallinone runs at document-idle (later than us)
            const handleTW = () => {
                // krneallinone sets rok-trade-ui or its ext manager key exists
                const krnPresent = !!document.getElementById('rok-trade-ui') ||
                                   localStorage.getItem('korone_ext_3') !== null;
                if (krnPresent) {
                    // Let krneallinone handle the UI, we only add watermark
                    buildWatermark();
                    return;
                }
                // krneallinone not present — use our TradeWindow
                if (!state.trade.myUserId) {
                    fetchProfile().then(() => injectTradeWindow());
                } else {
                    injectTradeWindow();
                }
            };

            // Give krneallinone up to 800ms to start
            setTimeout(handleTW, 800);
            return;
        }

        // Collectibles page — run early without auth gate
        if (location.href.includes('/internal/collectibles')) {
            injectFont();
            getKoromonsData(); // preload values
            const earlyCol = () => initCollectibles();
            if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', earlyCol);
            else earlyCol();
            // still continue to full init for panel etc.
        }

        showFirstRunWelcome();
        applyLarp();
        applyFakeVerify();

        const run = (authInfo) => {
            state.authInfo = authInfo || {};
            buildPanel(authInfo);
            try {
                if (GM_getValue(PANEL_HIDDEN_KEY, false)) {
                    const p = document.getElementById('pks-panel');
                    if (p) p.style.display = 'none';
                }
            } catch {}
            buildWatermark();
            setupHotkeys();
            monitorDOM();
            if (isTradeWindow()) injectTradeWindow();
            if (/\/My\/Trades\.aspx/i.test(location.pathname)) ensureTradesOverlay();
            if (isAvatarPage()) injectAvatarTools();
            if (isCatalogItemPage()) applyCatalogOwned();
            injectFriendsButtons();
            initCollectibles();
            setTimeout(() => notify('Welcome to Grexium!', 'success'), 800);
            showRapValPrompt();
        };

        showAuthGate().then((authInfo) => {
            if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => run(authInfo));
            else run(authInfo);
        });

        console.clear();

        const grexiumLogo = [
            "  ██████╗ ██████╗ ███████╗██╗  ██╗██╗██╗   ██╗███╗   ███╗",
            " ██╔════╝ ██╔══██╗██╔════╝╚██╗██╔╝██║██║   ██║████╗ ████║",
            " ██║  ███╗██████╔╝█████╗   ╚███╔╝ ██║██║   ██║██╔████╔██║",
            " ██║   ██║██╔══██╗██╔══╝   ██╔██╗ ██║██║   ██║██║╚██╔╝██║",
            " ╚██████╔╝██║  ██║███████╗██╔╝ ██╗██║╚██████╔╝██║ ╚═╝ ██║",
            "  ╚═════╝ ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝ ╚═════╝ ╚═╝     ╚═╝"
        ];

        const sunset = ["#8b5cf6","#a855f7","#c084fc","#ec4899","#f97316","#fb923c"];

        grexiumLogo.forEach((line, i) => {
            console.log(`%c${line}`, `color:${sunset[i]};font-weight:bold;font-family:Consolas,monospace;text-shadow:0 0 8px ${sunset[i]};`);
        });

        console.log("%c\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501", "color:#c084fc;font-weight:bold;");
        console.log("%c\u2726 Grexium %c// Free for everyone", "color:#22d3ee;font-weight:bold;font-size:14px;", "color:#c084fc;font-weight:bold;font-size:14px;");
        console.log("%c discord.gg/kHcNNkXH4a", "color:#5865f2;font-weight:bold;font-size:12px;");
        console.log("%c\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501", "color:#f97316;font-weight:bold;");
        console.log("%cGREXIUM INITIALIZED", `color:white;font-weight:900;font-size:16px;letter-spacing:3px;text-shadow:0 0 10px #a855f7,0 0 20px #ec4899,0 0 30px #f97316;`);

        monitorNavigation();
    };

    init();
})();
