/**
 * auth.js — shared session guard
 * - Session stored in sessionStorage (cleared when browser closes)
 * - 10-minute inactivity timeout
 * - Call Auth.require() at the top of any protected page
 */

const Auth = (() => {
  const KEY      = 'archive_auth';
  const TS_KEY   = 'archive_auth_ts';
  const TIMEOUT  = 10 * 60 * 1000; // 10 minutes in ms
  // ── Change this to your password ──
  const PASSWORD = 'pw';

  function isLoggedIn() {
    const flag = sessionStorage.getItem(KEY);
    const ts   = parseInt(sessionStorage.getItem(TS_KEY) || '0', 10);
    if (flag !== '1') return false;
    if (Date.now() - ts > TIMEOUT) {
      logout();
      return false;
    }
    return true;
  }

  function login(password) {
    if (password === PASSWORD) {
      sessionStorage.setItem(KEY, '1');
      sessionStorage.setItem(TS_KEY, Date.now().toString());
      return true;
    }
    return false;
  }

  function logout() {
    sessionStorage.removeItem(KEY);
    sessionStorage.removeItem(TS_KEY);
  }

  function touch() {
    if (sessionStorage.getItem(KEY) === '1') {
      sessionStorage.setItem(TS_KEY, Date.now().toString());
    }
  }

  function startActivityTimer() {
    ['mousemove','mousedown','keydown','touchstart','scroll'].forEach(evt => {
      document.addEventListener(evt, touch, { passive: true });
    });
    // Check every 30s; kick if expired
    setInterval(() => {
      if (!isLoggedIn()) {
        window.location.replace('login.html');
      }
    }, 30_000);
  }

  /** Call this at the top of every protected page */
  function require() {
    if (!isLoggedIn()) {
      window.location.replace('login.html');
      return false;
    }
    startActivityTimer();
    return true;
  }

  return { require, login, logout, isLoggedIn, touch };
})();
