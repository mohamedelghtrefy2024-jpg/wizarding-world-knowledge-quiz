// i18n.js — language loading + lookup. No rendering here.
const I18n = {
  lang: "ar",
  dict: {},

  async init() {
    this.lang = localStorage.getItem(CONFIG.STORAGE_KEYS.language) || "ar";
    await this.load(this.lang);
  },

  async load(lang) {
    this.dict = await Utils.fetchJSON(CONFIG.DATA_PATHS.i18n(lang));
    this.lang = lang;
    localStorage.setItem(CONFIG.STORAGE_KEYS.language, lang);
    document.documentElement.lang = lang === "ar" ? "ar" : "en";
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  },

  t(key) {
    return this.dict[key] || key;
  },

  async toggle() {
    await this.load(this.lang === "ar" ? "en" : "ar");
  }
};
