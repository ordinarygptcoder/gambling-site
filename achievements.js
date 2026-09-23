/* ==========================================================================
   achievements.js — shared achievement tracking for the whole site.

   Achievements persist in localStorage (same-origin, shared across every
   page, just like wallet.js). Two achievements double as unlock gates:
     - "humble_beginning" (reach 100.000đ) unlocks Tài Xỉu & the slot machine
     - "millionaire"      (reach 1.000.000đ) unlocks Blackjack & Roulette
   Load this file BEFORE wallet.js on every page, since wallet.js reports
   money-milestone achievements as the balance changes.
   ========================================================================== */
(function (global) {
  const KEY = "hoangGiaClub_achievements_v1";

  const DEFS = [
    {
      id: "humble_beginning",
      title: "Sự khởi đầu khiêm tốn",
      desc: "Đạt số dư 100.000đ. Mở khóa Tài Xỉu & Máy quay thưởng.",
      icon: "🌱",
    },
    {
      id: "lets_go_gambling",
      title: "Ai cũng có lần đầu",
      desc: "Bước chân vào một sòng bạc lần đầu tiên.",
      icon: "🎰",
    },
    {
      id: "d12",
      title: "D12",
      desc: "Đổ được cặp lục (hai xúc xắc cùng ra 6) ở Tài Xỉu.",
      icon: "🎲",
    },
    {
      id: "bankrupt",
      title: "Kiếp đỏ đen",
      desc: "Số dư rơi về 0đ.",
      icon: "💸",
    },
    {
      id: "millionaire",
      title: "Ai muốn làm triệu phú",
      desc: "Đạt số dư 1.000.000đ. Mở khóa Thợ đụng, Roulette & Đũa sắt hoàng gia.",
      icon: "💰",
    },
    {
      id: "blackjack",
      title: "BLACKJACK",
      desc: "Có Blackjack đầu tiên (21 điểm với 2 lá bài).",
      icon: "🃏",
    },
  ];

  function getState() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function isUnlocked(id) {
    return !!getState()[id];
  }

  function def(id) {
    return DEFS.find((d) => d.id === id);
  }

  function unlock(id) {
    if (!def(id)) return false; // unknown id, ignore
    const state = getState();
    if (state[id]) return false; // already unlocked, no-op
    state[id] = { unlockedAt: Date.now() };
    localStorage.setItem(KEY, JSON.stringify(state));
    global.dispatchEvent(new CustomEvent("achievement:unlocked", { detail: { id } }));
    showToast(id);
    return true;
  }

  function all() {
    return DEFS.map((d) => ({ ...d, unlocked: isUnlocked(d.id) }));
  }

  function resetAll() {
    localStorage.removeItem(KEY);
    global.dispatchEvent(new CustomEvent("achievement:reset"));
  }

  function showToast(id) {
    const d = def(id);
    if (!d || typeof document === "undefined") return;

    const el = document.createElement("div");
    el.style.cssText = [
      "position:fixed", "top:16px", "right:16px", "z-index:99999",
      "display:flex", "align-items:center", "gap:12px",
      "max-width:300px", "padding:12px 16px",
      "background:linear-gradient(135deg,#2b0a0e,#1a0507)",
      "border:2px solid #d4af37", "border-radius:12px",
      "box-shadow:0 10px 30px rgba(0,0,0,0.55)",
      "font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif",
      "color:#f3e5ab", "opacity:0", "transform:translateY(-8px)",
      "transition:opacity .25s ease, transform .25s ease",
    ].join(";");

    el.innerHTML =
      '<div style="font-size:28px;line-height:1;">' + d.icon + "</div>" +
      '<div>' +
        '<div style="font-size:10.5px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#d4af37;">Thành tựu mở khóa</div>' +
        '<div style="font-weight:700;font-size:13.5px;margin-top:2px;">' + d.title + "</div>" +
        '<div style="font-size:11.5px;color:#ccc;margin-top:2px;line-height:1.4;">' + d.desc + "</div>" +
      "</div>";

    document.body.appendChild(el);
    requestAnimationFrame(() => {
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
    });

    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transform = "translateY(-8px)";
      setTimeout(() => el.remove(), 300);
    }, 4500);
  }

  global.Achievements = { isUnlocked, unlock, all, resetAll, DEFS };
})(window);
