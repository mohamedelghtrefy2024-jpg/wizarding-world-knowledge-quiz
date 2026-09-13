// storageLayer.js — thin wrapper around localStorage. Deliberately small:
// all real data lives in the read-only /data JSON files for this v1;
// this layer only remembers UI preferences (current view, language).
const StorageLayer = {
  getView() {
    return localStorage.getItem(CONFIG.STORAGE_KEYS.view) || "rows";
  },
  setView(view) {
    localStorage.setItem(CONFIG.STORAGE_KEYS.view, view);
  },

  // ---- كاش صور TMDB/ويكيبيديا (عشان منضربش نفس الـ API كل مرة يتفتح فيها نفس العنصر) ----
  getImageCache() {
    try { return JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.imageCache)) || {}; }
    catch (e) { console.warn("فشل قراءة كاش الصور من localStorage، هيتم البدء بكاش فاضي", e); return {}; }
  },
  setImageCache(cache) {
    localStorage.setItem(CONFIG.STORAGE_KEYS.imageCache, JSON.stringify(cache));
  }
};
