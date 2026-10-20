// ==UserScript==
// @name         Pekora Shout Manager
// @namespace    pekora-shout-manager
// @author       1dev2 aka Menwx
// @version      1.0
// @description  Custom group shout manager for Pekora
// @match        https://pekora.pro/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

// Grexium addon, but can be used without grexium, our discord server - https://discord.gg/7QnpT9Ktaj (cat games) and https://discord.gg/kHcNNkXH4a (grexium)

(function () {
    "use strict";

    if (window.__pekoraShoutManager) return;
    window.__pekoraShoutManager = true;

    const MAX_LEN = 255;
    const API_USER = "/apisite/users/v1/users/authenticated"; // ы
    const API_GROUP = (id) => `/apisite/groups/v1/groups/${id}`;
    const API_STATUS = (id) => `/apisite/groups/v1/groups/${id}/status`;
    const state = {
        groupId: null,
        group: null,        // { name, shout }
        user: null,         // { id, name, displayName, avatar }
        userError: null,
        groupError: null,
        loadingGroup: false,
        loadingUser: false,
        publishing: false,
        open: false,
        navToken: 0,        // increments on every group change, guards against stale responses
    };

    /* ------------------------------------------------------------------ */
    /* CSS                                                                */
    /* ------------------------------------------------------------------ */
    const FONT_URL = "https://fonts.googleapis.com/css2?family=Unbounded:wght@500;700&family=Manrope:wght@400;500;700&family=JetBrains+Mono:wght@500&display=swap";

    const CSS = `
    .psm-root, .psm-root * { box-sizing: border-box; }
    .psm-root {
        --psm-bg: #0d0e13;
        --psm-panel: #15171f;
        --psm-card: #1c1f2a;
        --psm-border: #2b2d3a;
        --psm-text: #f1f1f5;
        --psm-muted: #a2a5b6;
        --psm-accent: #c6f432;
        --psm-ink: #0d0e13;
        --psm-ok: #7ee2a8;
        --psm-err: #ff7a8a;
        --psm-warn: #ffc266;
        --psm-display: "Unbounded", "Segoe UI", system-ui, sans-serif;
        --psm-body: "Manrope", "Segoe UI", system-ui, -apple-system, Roboto, sans-serif;
        --psm-mono: "JetBrains Mono", ui-monospace, Consolas, monospace;
        font-family: var(--psm-body);
        color: var(--psm-text);
    }
    .psm-fab {
        position: fixed; right: 22px; bottom: 22px; z-index: 2147483000;
        display: inline-flex; align-items: center; gap: 10px;
        min-height: 48px; padding: 0 22px 0 14px; border: 0; border-radius: 999px; cursor: pointer;
        font: 700 13px/1 var(--psm-display); letter-spacing: 1px; color: var(--psm-ink);
        background: var(--psm-accent);
        box-shadow: 0 12px 30px rgba(0,0,0,0.5);
        transition: transform .18s ease, box-shadow .18s ease, opacity .18s ease;
    }
    .psm-fab:hover { transform: translateY(-2px); box-shadow: 0 16px 36px rgba(0,0,0,0.6); }
    .psm-fab:focus-visible, .psm-btn:focus-visible, .psm-close:focus-visible { outline: 2px solid var(--psm-accent); outline-offset: 2px; }
    .psm-fab.psm-hidden { opacity: 0; pointer-events: none; transform: scale(.8); }
    .psm-logo {
        display: inline-flex; align-items: center; justify-content: center;
        width: 24px; height: 24px; border-radius: 7px;
        background: var(--psm-ink); color: var(--psm-accent);
        font: 700 16px/1 var(--psm-display);
    }
    .psm-panel {
        position: fixed; right: 22px; bottom: 22px; z-index: 2147483001;
        width: 420px; max-width: calc(100vw - 24px); max-height: calc(100vh - 24px);
        overflow-y: auto; border-radius: 24px; padding: 20px;
        background: var(--psm-panel);
        border: 1px solid var(--psm-border);
        box-shadow: 0 40px 80px rgba(0,0,0,0.6);
        opacity: 0; transform: translateY(16px) scale(.97); pointer-events: none;
        transition: opacity .22s ease, transform .22s ease;
    }
    .psm-panel.psm-open { opacity: 1; transform: none; pointer-events: auto; }
    .psm-panel::-webkit-scrollbar { width: 6px; }
    .psm-panel::-webkit-scrollbar-thumb { background: var(--psm-border); border-radius: 3px; }
    .psm-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 18px; }
    .psm-brand { display: flex; align-items: center; gap: 10px; min-width: 0; }
    .psm-brand .psm-logo { width: 30px; height: 30px; border-radius: 9px; background: var(--psm-accent); color: var(--psm-ink); font-size: 18px; flex: 0 0 30px; }
    .psm-title {
        font: 500 15px/1.2 var(--psm-display); margin: 0; color: var(--psm-text);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .psm-close {
        flex: 0 0 36px; width: 36px; height: 36px; border-radius: 10px; border: 1px solid var(--psm-border);
        background: var(--psm-card); color: var(--psm-muted); cursor: pointer; font-size: 15px; line-height: 1;
        transition: all .15s ease;
    }
    .psm-close:hover { color: var(--psm-text); border-color: var(--psm-err); }
    .psm-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 18px; }
    .psm-card {
        display: flex; align-items: center; gap: 10px; min-width: 0;
        padding: 10px 12px; border-radius: 14px;
        background: var(--psm-card);
    }
    .psm-avatar {
        flex: 0 0 36px; width: 36px; height: 36px; border-radius: 50%; overflow: hidden;
        display: flex; align-items: center; justify-content: center;
        font: 700 14px/1 var(--psm-display); color: var(--psm-ink);
        background: var(--psm-accent);
    }
    .psm-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .psm-card-body { min-width: 0; }
    .psm-card-label { font: 500 10px/1.4 var(--psm-mono); text-transform: uppercase; letter-spacing: 1px; color: var(--psm-muted); }
    .psm-card-name { font-size: 14px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .psm-card-id { font: 500 11px/1.4 var(--psm-mono); color: var(--psm-muted); }
    .psm-label { display: block; font: 500 11px/1.4 var(--psm-mono); text-transform: uppercase; letter-spacing: 1px; color: var(--psm-muted); margin: 0 0 8px; }
    .psm-textarea {
        width: 100%; min-height: 92px; resize: vertical; padding: 12px 14px;
        border-radius: 14px; border: 1px solid var(--psm-border);
        background: var(--psm-bg); color: var(--psm-text);
        font: 400 14px/1.5 var(--psm-body); outline: none;
        transition: border-color .15s ease, box-shadow .15s ease;
    }
    .psm-textarea::placeholder { color: #7d8093; }
    .psm-textarea:focus { border-color: var(--psm-accent); box-shadow: 0 0 0 3px rgba(198,244,50,0.18); }
    .psm-textarea:disabled { opacity: .55; cursor: not-allowed; }
    .psm-counter { text-align: right; font: 500 12px/1.4 var(--psm-mono); color: var(--psm-muted); margin: 6px 2px 14px; }
    .psm-counter.psm-over { color: var(--psm-err); }
    .psm-preview {
        margin-bottom: 16px; padding: 12px 14px; border-radius: 14px;
        background: var(--psm-card);
    }
    .psm-preview .psm-label { margin-bottom: 6px; }
    .psm-preview-text { font-size: 14px; line-height: 1.5; word-break: break-word; white-space: pre-wrap; }
    .psm-preview-meta { margin-top: 8px; font: 500 11px/1.4 var(--psm-mono); color: var(--psm-muted); }
    .psm-empty { color: var(--psm-muted); font-style: italic; }
    .psm-actions { display: flex; gap: 10px; }
    .psm-btn {
        flex: 1; min-height: 48px; padding: 0 16px; border-radius: 14px; border: 1px solid var(--psm-border);
        font: 700 14px/1 var(--psm-body); cursor: pointer; color: var(--psm-text);
        background: transparent; transition: transform .15s ease, opacity .15s ease, border-color .15s ease;
        display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    }
    .psm-btn:hover:not(:disabled) { transform: translateY(-1px); border-color: #3a3d4e; }
    .psm-btn:disabled { opacity: .45; cursor: not-allowed; }
    .psm-btn-primary {
        flex: 2; border: 0; color: var(--psm-ink);
        background: var(--psm-accent);
    }
    .psm-btn-primary:hover:not(:disabled) { border-color: transparent; }
    .psm-spinner {
        display: none; width: 14px; height: 14px; border-radius: 50%;
        border: 2px solid rgba(13,14,19,0.3); border-top-color: var(--psm-ink);
        animation: psm-spin .7s linear infinite;
    }
    .psm-publishing .psm-spinner { display: inline-block; }
    @keyframes psm-spin { to { transform: rotate(360deg); } }
    .psm-progress { height: 3px; margin-top: 14px; border-radius: 2px; overflow: hidden; background: var(--psm-card); opacity: 0; transition: opacity .2s; }
    .psm-publishing .psm-progress { opacity: 1; }
    .psm-progress::after {
        content: ""; display: block; height: 100%; width: 40%;
        background: var(--psm-accent);
        animation: psm-slide 1s ease-in-out infinite;
    }
    @keyframes psm-slide { 0% { transform: translateX(-100%); } 100% { transform: translateX(260%); } }
    .psm-toasts { margin-top: 14px; display: flex; flex-direction: column; gap: 8px; }
    .psm-toast {
        padding: 10px 14px; border-radius: 12px; font-size: 13px; line-height: 1.4; word-break: break-word;
        border: 1px solid; background: var(--psm-card); animation: psm-in .22s ease;
    }
    .psm-toast.psm-ok { border-color: rgba(126,226,168,0.5); color: var(--psm-ok); }
    .psm-toast.psm-err { border-color: rgba(255,122,138,0.5); color: var(--psm-err); }
    .psm-toast.psm-warn { border-color: rgba(255,194,102,0.5); color: var(--psm-warn); }
    @keyframes psm-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
    @media (max-width: 480px) {
        .psm-panel { right: 8px; bottom: 8px; left: 8px; width: auto; max-width: none; padding: 16px; }
        .psm-cards { grid-template-columns: 1fr; }
        .psm-fab { right: 14px; bottom: 14px; }
    }
    @media (prefers-reduced-motion: reduce) {
        .psm-root *, .psm-root *::before, .psm-root *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; }
    }
    `;


    function el(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text != null) node.textContent = text;
        return node;
    }

    function setAvatar(box, url, fallbackName) {
        box.textContent = "";
        if (url) {
            const img = document.createElement("img");
            img.alt = fallbackName || "";
            img.referrerPolicy = "no-referrer";
            img.addEventListener("error", () => {
                box.textContent = (fallbackName || "?").charAt(0).toUpperCase();
            }, { once: true });
            img.src = url;
            box.appendChild(img);
        } else {
            box.textContent = (fallbackName || "?").charAt(0).toUpperCase();
        }
    }

    const ui = {};

    function buildUI() {
        if (!document.getElementById("psm-fonts")) {
            const fonts = document.createElement("link");
            fonts.id = "psm-fonts";
            fonts.rel = "stylesheet";
            fonts.href = FONT_URL;
            document.head.appendChild(fonts);
        }

        const style = document.createElement("style");
        style.id = "psm-style";
        style.textContent = CSS;
        document.head.appendChild(style);
        const root = el("div", "psm-root");
        root.id = "psm-root";
        ui.fab = el("button", "psm-fab psm-hidden");
        ui.fab.type = "button";
        ui.fab.title = "Shouts";
        ui.fab.append(el("span", "psm-logo", "+"), el("span", null, "SHOUT"));
        ui.fab.addEventListener("click", () => setOpen(true));
        ui.panel = el("div", "psm-panel");
        ui.panel.setAttribute("role", "dialog");
        ui.panel.setAttribute("aria-label", "Shouts");
        const header = el("div", "psm-header");
        const brand = el("div", "psm-brand");
        brand.append(el("span", "psm-logo", "+"), el("h2", "psm-title", "Shouts"));
        header.appendChild(brand);
        ui.closeBtn = el("button", "psm-close", "✕");
        ui.closeBtn.type = "button";
        ui.closeBtn.title = "Close";
        ui.closeBtn.setAttribute("aria-label", "Close");
        ui.closeBtn.addEventListener("click", () => setOpen(false));
        header.appendChild(ui.closeBtn);
        ui.panel.appendChild(header);
        const cards = el("div", "psm-cards");
        const groupCard = el("div", "psm-card");
        ui.groupAvatar = el("div", "psm-avatar", "G");
        const gBody = el("div", "psm-card-body");
        gBody.appendChild(el("div", "psm-card-label", "Group"));
        ui.groupName = el("div", "psm-card-name", "Loading…");
        ui.groupIdText = el("div", "psm-card-id", "ID: —");
        gBody.append(ui.groupName, ui.groupIdText);
        groupCard.append(ui.groupAvatar, gBody);
        const userCard = el("div", "psm-card");
        ui.userAvatar = el("div", "psm-avatar", "?");
        const uBody = el("div", "psm-card-body");
        uBody.appendChild(el("div", "psm-card-label", "Account"));
        ui.userName = el("div", "psm-card-name", "Loading…");
        ui.userIdText = el("div", "psm-card-id", "ID: —");
        uBody.append(ui.userName, ui.userIdText);
        userCard.append(ui.userAvatar, uBody);
        cards.append(groupCard, userCard);
        ui.panel.appendChild(cards);
        const label = el("label", "psm-label", "New shout");
        ui.textarea = el("textarea", "psm-textarea");
        ui.textarea.placeholder = "Enter your shout!";
        ui.textarea.maxLength = 1000;
        ui.textarea.rows = 3;
        ui.textarea.id = "psm-input";
        label.htmlFor = "psm-input";
        ui.textarea.addEventListener("input", updateControls);
        ui.textarea.addEventListener("keydown", (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                e.preventDefault();
                onPublish();
            }
        });
        ui.counter = el("div", "psm-counter", `0 / ${MAX_LEN}`);
        ui.panel.append(label, ui.textarea, ui.counter);
        const preview = el("div", "psm-preview");
        preview.appendChild(el("div", "psm-label", "Current shout"));
        ui.previewText = el("div", "psm-preview-text psm-empty", "—");
        ui.previewMeta = el("div", "psm-preview-meta", "");
        preview.append(ui.previewText, ui.previewMeta);
        ui.panel.appendChild(preview);
        const actions = el("div", "psm-actions");
        ui.clearBtn = el("button", "psm-btn", "Clear");
        ui.clearBtn.type = "button";
        ui.clearBtn.addEventListener("click", () => {
            ui.textarea.value = "";
            updateControls();
            ui.textarea.focus();
        });
        ui.publishBtn = el("button", "psm-btn psm-btn-primary");
        ui.publishBtn.type = "button";
        ui.spinner = el("span", "psm-spinner");
        ui.publishLabel = el("span", null, "Publish Shout");
        ui.publishBtn.append(ui.spinner, ui.publishLabel);
        ui.publishBtn.addEventListener("click", onPublish);
        actions.append(ui.clearBtn, ui.publishBtn);
        ui.panel.appendChild(actions);

        ui.progress = el("div", "psm-progress");
        ui.panel.appendChild(ui.progress);

        ui.toasts = el("div", "psm-toasts");
        ui.toasts.setAttribute("aria-live", "polite");
        ui.panel.appendChild(ui.toasts);

        root.append(ui.fab, ui.panel);
        document.body.appendChild(root);
        ui.root = root;

        document.addEventListener("keydown", onDocKeydown);
    }

    function onDocKeydown(e) {
        if (e.key === "Escape" && state.open) setOpen(false);
    }

    function setOpen(open) {
        state.open = open;
        ui.panel.classList.toggle("psm-open", open);
        ui.fab.classList.toggle("psm-hidden", open || state.groupId == null);
        if (open) {

            if (!state.user && !state.loadingUser) loadUser();
            if (!state.group && !state.loadingGroup) loadGroup();
            setTimeout(() => { if (state.open) ui.textarea.focus(); }, 120);
        }
    }

    function toast(type, message, ttl) {
        const node = el("div", `psm-toast psm-${type}`, message);
        ui.toasts.appendChild(node);
        while (ui.toasts.children.length > 3) ui.toasts.removeChild(ui.toasts.firstChild);
        const life = ttl == null ? (type === "ok" ? 5000 : 9000) : ttl;
        if (life > 0) setTimeout(() => node.remove(), life);
        return node;
    }

    function clearToasts() {
        ui.toasts.textContent = "";
    }

    /* ------------------------------------------------------------------ */
    /* render                                                             */
    /* ------------------------------------------------------------------ */
    function formatDate(value) {
        const d = value ? new Date(value) : new Date();
        if (isNaN(d.getTime())) return "";
        const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
        return `${date} | ${time}`;
    }

    function extractShout(group) {

        const s = group && group.shout;
        if (!s) return null;
        if (typeof s === "string") return { body: s, author: null, updated: null };
        const poster = s.poster || s.user || null;
        return {
            body: typeof s.body === "string" ? s.body : (typeof s.message === "string" ? s.message : ""),
            author: poster
                ? {
                    id: poster.userId ?? poster.id ?? null,
                    name: poster.username ?? poster.name ?? poster.displayName ?? null,
                }
                : null,
            updated: s.updated || s.created || s.updatedAt || null,
        };
    }

    function renderCards() {
        ui.groupIdText.textContent = `ID: ${state.groupId ?? "—"}`;
        if (state.group) {
            ui.groupName.textContent = state.group.name || `Group ${state.groupId}`;
            setAvatar(ui.groupAvatar, null, state.group.name || "G");
        } else if (state.groupError) {
            ui.groupName.textContent = "Failed to load";
            setAvatar(ui.groupAvatar, null, "!");
        } else {
            ui.groupName.textContent = "Loading…";
            setAvatar(ui.groupAvatar, null, "G");
        }

        if (state.user) {
            ui.userName.textContent = state.user.name || state.user.displayName || "—";
            ui.userIdText.textContent = `ID: ${state.user.id}`;
            setAvatar(ui.userAvatar, state.user.avatar, state.user.name || state.user.displayName);
        } else if (state.userError) {
            ui.userName.textContent = "Not signed in";
            ui.userIdText.textContent = "ID: —";
            setAvatar(ui.userAvatar, null, "!");
        } else {
            ui.userName.textContent = "Loading…";
            ui.userIdText.textContent = "ID: —";
            setAvatar(ui.userAvatar, null, "?");
        }
    }

    function renderPreview() {
        const shout = state.group ? extractShout(state.group) : null;
        if (shout && shout.body) {
            ui.previewText.classList.remove("psm-empty");
            ui.previewText.textContent = shout.body;
            const parts = [];
            if (shout.author && shout.author.name) parts.push(shout.author.name);
            if (shout.updated) {
                const f = formatDate(shout.updated);
                if (f) parts.push(f);
            }
            ui.previewMeta.textContent = parts.join(" • ");
        } else {
            ui.previewText.classList.add("psm-empty");
            ui.previewText.textContent = "No shout set";
            ui.previewMeta.textContent = "";
        }
    }

    function updateControls() {
        const len = ui.textarea.value.length;
        const trimmedLen = ui.textarea.value.trim().length;
        ui.counter.textContent = `${len} / ${MAX_LEN}`;
        ui.counter.classList.toggle("psm-over", len > MAX_LEN);

        const ready = !!state.user && state.groupId != null && !state.publishing;
        ui.publishBtn.disabled = !ready || trimmedLen === 0 || len > MAX_LEN;
        ui.clearBtn.disabled = state.publishing || len === 0;
        ui.textarea.disabled = state.publishing;
        ui.panel.classList.toggle("psm-publishing", state.publishing);
        ui.publishLabel.textContent = state.publishing ? "Publishing…" : "Publish Shout";
    }

    function renderAll() {
        renderCards();
        renderPreview();
        updateControls();
    }

    /* ------------------------------------------------------------------ */
    /* api                                                                */
    /* ------------------------------------------------------------------ */
    class ApiError extends Error {
        constructor(status, body, network) {
            super(`HTTP ${status}: ${body}`);
            this.status = status;
            this.body = body;
            this.network = !!network;
        }
    }

    function describeError(err) {
        if (err instanceof ApiError) {
            if (err.network) return "Network error: Pekora is unreachable or the connection was lost.";
            const detail = err.body ? ` (${String(err.body).slice(0, 160)})` : "";
            switch (err.status) {
                case 400: return `400 — bad request.${detail}`;
                case 401: return "401 — you are not signed in. Please log in to Pekora.";
                case 403: return `403 — not enough permissions, or the request was forbidden.${detail}`;
                case 404: return "404 — group or endpoint not found.";
                case 405: return "405 — HTTP method not allowed.";
                case 429: return "429 — too many requests. Wait a moment and try again.";
                default:
                    if (err.status >= 500) return `${err.status} — Pekora server error. Try again later.`;
                    return `Error ${err.status}.${detail}`;
            }
        }
        return `Unexpected error: ${err && err.message ? err.message : err}`;
    }

    async function apiGetJson(url) {
        let response;
        try {
            response = await fetch(url, {
                method: "GET",
                credentials: "include",
                headers: { "Accept": "application/json, text/plain, */*" },
            });
        } catch (e) {
            throw new ApiError(0, String(e && e.message), true);
        }
        const text = await response.text();
        if (!response.ok) throw new ApiError(response.status, text);
        try {
            return JSON.parse(text);
        } catch (_) {
            throw new ApiError(response.status, "Invalid JSON in response");
        }
    }

    async function publishShout(groupId, message) {
        let response;
        try {
            response = await fetch(API_STATUS(groupId), {
                method: "PATCH",
                credentials: "include",
                headers: {
                    "Accept": "application/json, text/plain, */*",
                    "Content-Type": "application/json",
                    "x-csrf-token": "",
                },
                body: JSON.stringify({ message: message }),
            });
        } catch (e) {
            throw new ApiError(0, String(e && e.message), true);
        }
        const body = await response.text();
        if (!response.ok) throw new ApiError(response.status, body);
        return body;
    }

    function pickAvatar(data) {
        const candidates = [data.avatarUrl, data.avatar, data.thumbnailUrl, data.imageUrl, data.headshotUrl];
        for (const c of candidates) {
            if (typeof c === "string" && c) return c;
        }
        return null;
    }

    async function loadUser() {
        state.loadingUser = true;
        state.userError = null;
        renderAll();
        try {
            const data = await apiGetJson(API_USER);
            if (!data || data.id == null) throw new ApiError(401, "User not identified");
            state.user = {
                id: data.id,
                name: data.name,
                displayName: data.displayName,
                avatar: pickAvatar(data),
            };
        } catch (err) {
            state.user = null;
            state.userError = err;
            if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
                toast("warn", "You are not signed in to Pekora, Publishing is disabled", 0);
            } else {
                toast("err", `Could not verify your account. ${describeError(err)}`);
            }
        } finally {
            state.loadingUser = false;
            renderAll();
        }
    }

    async function loadGroup() {
        const token = state.navToken;
        const id = state.groupId;
        if (id == null) return;
        state.loadingGroup = true;
        state.groupError = null;
        renderAll();
        try {
            const data = await apiGetJson(API_GROUP(id));
            if (token !== state.navToken) return; // user already navigated to another group
            state.group = { name: data && data.name, shout: data ? data.shout : null };
        } catch (err) {
            if (token !== state.navToken) return;
            state.group = null;
            state.groupError = err;
            toast("err", `Could not load the group. ${describeError(err)}`);
        } finally {
            if (token === state.navToken) {
                state.loadingGroup = false;
                renderAll();
            }
        }
    }


    function findShoutSection() {
        const bodies = document.querySelectorAll('[class*="shoutBody"]');
        for (const b of bodies) {
            const info = b.closest('[class*="shoutInfo-"]');
            if (info) return { body: b, info };
        }
        return null;
    }

    function updatePageShout(message, author, whenIso) {
        const found = findShoutSection();
        if (!found) return false;
        found.body.textContent = message;

        if (author) {
            const link = found.info.querySelector('a[class*="aLink"]');
            if (link) {
                if (author.name) link.textContent = author.name;
                if (author.id != null) link.setAttribute("href", `/User.aspx?ID=${encodeURIComponent(author.id)}`);
            }
            const headshotLink = found.info.parentElement
                ? found.info.parentElement.querySelector('a[class*="shoutHeadshotContainer"]')
                : null;
            if (headshotLink) {
                if (author.id != null) headshotLink.setAttribute("href", `/users/${encodeURIComponent(author.id)}/profile`);
                const img = headshotLink.querySelector("img");
                if (img && author.name) img.alt = author.name;
            }
        }


        const dateDiv = Array.from(found.info.children).find((c) => c.tagName === "DIV");
        if (dateDiv) dateDiv.textContent = formatDate(whenIso);
        return true;
    }


    async function onPublish() {
        if (state.publishing) return;

        const message = ui.textarea.value.trim();

        if (!state.user) {
            toast("warn", "Account not verified. Log in to Pekora and reopen the panel.");
            loadUser();
            return;
        }
        if (state.groupId == null) {
            toast("err", "Could not detect the group ID from the URL.");
            return;
        }
        if (!message) {
            toast("warn", "Enter your shout text.");
            return;
        }
        if (message.length > MAX_LEN) {
            toast("warn", `Shout is too long: ${message.length} / ${MAX_LEN}.`);
            return;
        }

        const token = state.navToken;
        const groupId = state.groupId;
        const user = state.user;

        state.publishing = true;
        clearToasts();
        updateControls();

        try {
            const raw = await publishShout(groupId, message);

            let parsed = null;
            try { parsed = raw ? JSON.parse(raw) : null; } catch (_) { /* response may not be JSON */ }

            if (token === state.navToken) {
                toast("ok", "Shout published successfully.");
                ui.textarea.value = "";
            }


            let author = { id: user.id, name: user.name || user.displayName };
            const pPoster = parsed && (parsed.poster || (parsed.shout && parsed.shout.poster));
            if (pPoster) {
                author = {
                    id: pPoster.userId ?? pPoster.id ?? author.id,
                    name: pPoster.username ?? pPoster.name ?? author.name,
                };
            }
            const when = (parsed && (parsed.updated || (parsed.shout && parsed.shout.updated))) || new Date().toISOString();

            if (token === state.navToken) {
                const updated = updatePageShout(message, author, when);

                state.group = Object.assign({}, state.group || {}, {
                    shout: { body: message, poster: { userId: author.id, username: author.name }, updated: when },
                });
                state.publishing = false;
                renderAll();

                if (!updated) {

                    toast("ok", "Reloading the page to show your shout…", 1500);
                    setTimeout(() => {
                        if (token === state.navToken) location.reload();
                    }, 1200);
                } else {

                    loadGroup();
                }
            }
        } catch (err) {
            if (token === state.navToken) toast("err", describeError(err));
        } finally {
            state.publishing = false;
            if (token === state.navToken) updateControls();
        }
    }


    function parseGroupId(pathname) {
        const m = pathname.match(/^\/groups\/(\d+)(?:\/|$)/i);
        return m ? m[1] : null;
    }

    let lastUrl = location.href;

    function onUrlChange() {
        if (location.href === lastUrl) return;
        lastUrl = location.href;
        syncWithUrl();
    }

    function syncWithUrl() {
        const newId = parseGroupId(location.pathname);
        if (newId === state.groupId) {

            ui.fab.classList.toggle("psm-hidden", state.open || state.groupId == null);
            return;
        }

        state.navToken++;
        state.groupId = newId;
        state.group = null;
        state.groupError = null;
        state.loadingGroup = false;
        state.publishing = false;
        ui.textarea.value = "";
        clearToasts();

        if (newId == null) {

            setOpen(false);
            ui.fab.classList.add("psm-hidden");
            renderAll();
            return;
        }

        ui.fab.classList.toggle("psm-hidden", state.open);
        renderAll();
        loadGroup();
        if (!state.user && !state.loadingUser) loadUser();
    }

    function hookHistory() {
        ["pushState", "replaceState"].forEach((fn) => {
            const original = history[fn];
            history[fn] = function () {
                const result = original.apply(this, arguments);

                setTimeout(onUrlChange, 0);
                return result;
            };
        });
        window.addEventListener("popstate", () => setTimeout(onUrlChange, 0));
        window.addEventListener("hashchange", () => setTimeout(onUrlChange, 0));
    }


    function init() {
        if (document.getElementById("psm-root")) return;
        buildUI();
        hookHistory();
        renderAll();
        syncWithUrl();
        if (state.groupId != null && !state.user && !state.loadingUser) loadUser();
    }

    if (document.body) {
        init();
    } else {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    }
})();
