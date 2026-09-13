// storageLayer.js — thin wrapper around localStorage. Deliberately small:
// all real data lives in the read-only /data JSON files for this v1;
// this layer only remembers UI preferences (current view, language).
const StorageLayer = {
  getView() {
    return localStorage.getItem(CONFIG.STORAGE_KEYS.view) || "rows";
  },
  setView(view) {
    localStorage.setItem(CONFIG.STORAGE_KEYS.view, view);
  }
};
