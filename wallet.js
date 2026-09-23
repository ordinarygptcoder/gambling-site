/* ==========================================================================
   wallet.js — one shared, fake VND balance used by every game on this site.

   All games are plain static pages, so the only way to share a "balance"
   between them (without a server) is the browser's localStorage. As long as
   every page is served from the same origin (same domain/folder), they all
   read and write the same key, so winnings/losses in one game carry over
   into the others.

   Players start at 0đ on purpose: Quán Cơm Việt Ký (the restaurant sim) is
   the only way to earn a first balance, and reaching 100.000đ / 1.000.000đ
   is what unlocks the gambling games (see achievements.js).

   This money is entirely make-believe — nothing here connects to a real
   payment method, and there is no way to withdraw or cash it out.
   ========================================================================== */
(function (global) {
  const KEY = "hoangGiaClub_wallet_vnd_v1";
  const DEFAULT_BALANCE = 10000; // start with nothing — earn it in the restaurant first

  function getBalance() {
    const raw = localStorage.getItem(KEY);
    if (raw === null) {
      localStorage.setItem(KEY, String(DEFAULT_BALANCE));
      return DEFAULT_BALANCE;
    }
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : DEFAULT_BALANCE;
  }

  function setBalance(amount) {
    const prevRaw = localStorage.getItem(KEY);
    const prev = prevRaw === null ? DEFAULT_BALANCE : (parseInt(prevRaw, 10) || 0);

    const n = Math.max(0, Math.ceil(amount || 0));
    localStorage.setItem(KEY, String(n));
    global.dispatchEvent(new CustomEvent("wallet:changed", { detail: { balance: n } }));

    // Money-milestone / bankrupt achievements, checked centrally here so
    // they fire no matter which game moved the balance.
    if (global.Achievements) {
      if (n <= 0 && prev > 0) global.Achievements.unlock("bankrupt");
      if (n >= 100000) global.Achievements.unlock("humble_beginning");
      if (n >= 1000000) global.Achievements.unlock("millionaire");
    }

    return n;
  }

  function addBalance(delta) {
    return setBalance(getBalance() + delta);
  }

  function resetBalance() {
    return setBalance(DEFAULT_BALANCE);
  }

  function roundReward(amount) {
    return Math.ceil(amount || 0);
  }

  function formatVnd(amount) {
    return roundReward(amount).toLocaleString("vi-VN") + "đ";
  }

  // Keep any other open tab in sync too (fires on the OTHER tabs, not this one).
  global.addEventListener("storage", (e) => {
    if (e.key === KEY) {
      global.dispatchEvent(new CustomEvent("wallet:changed", { detail: { balance: getBalance() } }));
    }
  });

  global.Wallet = { getBalance, setBalance, addBalance, resetBalance, formatVnd, roundReward, DEFAULT_BALANCE };
})(window);
