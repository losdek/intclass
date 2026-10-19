/**
 * Sign in with Google (Supabase Auth, PKCE flow, no SDK). Optional: the site works without it.
 * A signed-in pupil keeps progress in the account (supabase/accounts.sql), so it is the same on every device,
 * and the leaderboard nickname follows the account.
 *
 * The session (access and refresh tokens) is kept in this browser's localStorage, like the Supabase SDK does.
 */
(function () {
  const Store = window.IntStore;
  if (!Store) return;
  const cfg = Store.LEADERBOARD;
  const SESSION = "intclass_session";
  const VERIFIER = "intclass_pkce";

  const enabled = () => Store.leaderboardEnabled() && Boolean(window.crypto?.subtle);
  const read = (k) => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } };
  const write = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } };
  const listeners = new Set();
  const emit = () => listeners.forEach((fn) => fn(Auth.user()));

  const b64url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const here = () => location.origin + location.pathname;

  async function api(path, body, token) {
    const res = await fetch(`${cfg.url}/auth/v1/${path}`, {
      method: body ? "POST" : "GET",
      headers: { apikey: cfg.key, "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`auth ${res.status}`);
    return res.status === 204 ? null : res.json();
  }

  function save(s) {
    write(SESSION, {
      access_token: s.access_token,
      refresh_token: s.refresh_token,
      expires_at: s.expires_at || Math.floor(Date.now() / 1000) + (s.expires_in || 3600),
      user: s.user ? { id: s.user.id, email: s.user.email, name: s.user.user_metadata?.full_name || s.user.user_metadata?.name || "" } : read(SESSION)?.user,
    });
  }

  // a valid access token, refreshed when it is about to expire; null when signed out
  async function token() {
    const s = read(SESSION);
    if (!s) return null;
    if (s.expires_at - 60 > Date.now() / 1000) return s.access_token;
    try {
      save(await api("token?grant_type=refresh_token", { refresh_token: s.refresh_token }));
      return read(SESSION).access_token;
    } catch (e) {
      if (navigator.onLine !== false) { write(SESSION, null); emit(); }
      return null;
    }
  }

  const Auth = {
    enabled,
    user: () => read(SESSION)?.user || null,
    onChange: (fn) => listeners.add(fn),

    async signIn() {
      const verifier = b64url(crypto.getRandomValues(new Uint8Array(32)));
      const challenge = b64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
      write(VERIFIER, verifier);
      const q = new URLSearchParams({ provider: "google", redirect_to: here(), code_challenge: challenge, code_challenge_method: "s256" });
      location.assign(`${cfg.url}/auth/v1/authorize?${q}`);
    },

    async signOut() {
      const t = await token();
      write(SESSION, null);
      emit();
      if (t) api("logout", {}, t).catch(() => {});
    },

    // send this device's progress, take the account's back (merged on the server)
    async sync() {
      const t = await token();
      if (!t) return false;
      const p = Store.player();
      const res = await fetch(`${cfg.url}/rest/v1/rpc/account_sync`, {
        method: "POST",
        headers: { apikey: cfg.key, Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
        body: JSON.stringify({ p_progress: Store.exportState(), p_player_id: p?.id || null, p_player_secret: p?.secret || null }),
      });
      if (!res.ok) throw new Error(`sync ${res.status}`);
      const data = await res.json();
      syncing = true;
      try {
        Store.mergeState(data.progress);
        const mine = data.player;
        if (mine && mine.id !== p?.id) Store.adoptPlayer({ ...mine, name: mine.name || p?.name });
      } finally { syncing = false; }
      window.reloadLessonsProgress?.();
      return true;
    },
  };

  // back from Google: ?code=… → session
  async function finishRedirect() {
    const url = new URL(location.href);
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error_description") || url.hash.match(/error_description=([^&]+)/)?.[1];
    if (!code && !error) return false;
    ["code", "error", "error_code", "error_description"].forEach((k) => url.searchParams.delete(k));
    history.replaceState(null, "", url.pathname + url.search + (error ? "" : url.hash));
    const verifier = read(VERIFIER);
    write(VERIFIER, null);
    if (error || !verifier) {
      window.showToast?.("Не удалось войти через Google. Попробуйте ещё раз.", "error", 3600);
      return true;
    }
    try {
      save(await api("token?grant_type=pkce", { auth_code: code, code_verifier: verifier }));
      emit();
      await Auth.sync();
      window.showToast?.("Вы вошли через Google — прогресс сохранится в аккаунте", "success", 3200);
    } catch (e) {
      window.showToast?.("Не удалось войти через Google. Попробуйте ещё раз.", "error", 3600);
    }
    return true;
  }

  // progress changes are pushed to the account a moment later
  let timer = null;
  let syncing = false;
  Store.onChange(() => {
    if (syncing || !Auth.user()) return;
    clearTimeout(timer);
    timer = setTimeout(() => Auth.sync().catch(() => {}), 1500);
  });

  /* ---------------------------------------------------------------- the profile window */
  const GOOGLE_G = `<svg viewBox="0 0 48 48" aria-hidden="true" width="18" height="18"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z"/><path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.2 1.5-4.9 2.3-8.2 2.3-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/></svg>`;

  function render() {
    document.querySelectorAll(".register-box").forEach((box) => {
      let el = box.querySelector(".auth-box");
      if (!enabled()) { el?.remove(); return; }
      if (!el) {
        el = document.createElement("div");
        el.className = "auth-box";
        box.prepend(el);
      }
      const u = Auth.user();
      el.replaceChildren();
      if (u) {
        const p = document.createElement("p");
        p.className = "auth-who";
        p.append("Вы вошли через Google: ");
        const b = document.createElement("strong");
        b.textContent = u.email || u.name || "аккаунт";
        p.append(b, ". Прогресс сохраняется в аккаунте и одинаков на всех устройствах.");
        const out = document.createElement("button");
        out.type = "button";
        out.className = "btn btn-secondary btn-small auth-out";
        out.textContent = "Выйти";
        out.addEventListener("click", () => Auth.signOut());
        el.append(p, out);
      } else {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn auth-google";
        btn.innerHTML = `${GOOGLE_G}<span>Войти через Google</span>`;
        btn.addEventListener("click", () => { btn.disabled = true; Auth.signIn().catch(() => { btn.disabled = false; }); });
        const note = document.createElement("p");
        note.className = "auth-note";
        note.textContent = "Необязательно: с аккаунтом прогресс не потеряется и будет на телефоне и компьютере.";
        el.append(btn, note);
      }
    });
  }

  Auth.onChange(render);
  window.IntAuth = Auth;
  render();
  if (enabled()) {
    // back from Google, or a later visit: bring this device and the account together
    finishRedirect().then((handled) => (!handled && Auth.user() ? Auth.sync() : null)).catch(() => {});
  }
})();
