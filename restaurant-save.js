/* ==========================================================================
   restaurant-save.js — persists Quán Cơm Việt Ký upgrades AND run progress.

   Saved between visits:
     - purchased upgrades (tables, assistant, ingredient quality)
     - current day, in-game clock, chosen shift, and which screen you were on
     - today's revenue counters (so the end-of-day report still makes sense)

   The live queue / tray is not saved — customers leave while you're away.
   ========================================================================== */
(function (global) {
  const KEY = "hoangGiaClub_restaurant_upgrades_v1";
  const DEFAULTS = {
    maxQueueSize: 3,
    hasAssistant: false,
    qualityLevel: 1,
    day: 1,
    timeMinutes: 11 * 60,
    isNightShift: false,
    shiftPhase: "intro", // intro | shift-select | playing | summary
    dailyServedCount: 0,
    dailyScamCount: 0,
    dailyLeftCount: 0,
    dailyRevenue: 0,
    dailyCost: 0,
  };

  function getProgress() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return { ...DEFAULTS };
      const parsed = JSON.parse(raw);
      return { ...DEFAULTS, ...parsed };
    } catch (e) {
      return { ...DEFAULTS };
    }
  }

  function saveProgress(partial) {
    const merged = { ...getProgress(), ...partial };
    localStorage.setItem(KEY, JSON.stringify(merged));
    return merged;
  }

  function reset() {
    localStorage.removeItem(KEY);
  }

  // Back-compat names used by older pages / the shop.
  function getUpgrades() {
    const p = getProgress();
    return {
      maxQueueSize: p.maxQueueSize,
      hasAssistant: p.hasAssistant,
      qualityLevel: p.qualityLevel,
    };
  }

  function saveUpgrades(partial) {
    return saveProgress(partial);
  }

  global.RestaurantSave = {
    getProgress,
    saveProgress,
    getUpgrades,
    saveUpgrades,
    reset,
    DEFAULTS,
  };
})(window);
