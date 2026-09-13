// businessLayer.js — search/filter rules. Depends on KnowledgeLayer's data,
// never touches the DOM.
const BusinessLayer = {
  activeType: "all",
  activeQuery: "",

  setFilter(type) {
    this.activeType = type;
  },

  setQuery(query) {
    this.activeQuery = (query || "").trim().toLowerCase();
  },

  matches(node) {
    if (this.activeType !== "all" && node.type !== this.activeType) return false;
    if (!this.activeQuery) return true;
    const haystack = [
      node.title,
      node.shortDescription || "",
      node.description || "",
      ...(node.aliases || [])
    ].join(" ").toLowerCase();
    return haystack.includes(this.activeQuery);
  },

  visibleNodes() {
    return KnowledgeLayer.nodes.filter(n => this.matches(n));
  },

  // ---------------- صور/نبذات خارجية (TMDB / ويكيبيديا) ----------------
  // أفلام ومسلسلات -> TMDB (search/movie, search/tv). أي نوع تاني — شخصية،
  // عائلة، بيت، منظمة، مكان، تعويذة، أداة، مخلوق، لعبة، مسرحية — بيروح
  // لويكيبيديا مباشرة (عربي أولًا، وإنجليزي fallback لو مفيش صفحة عربي أو
  // مفيهاش extract). بترجع null لو مفيش نتيجة، والاستدعاء بيتخزن في كاش
  // localStorage عشان منكررش نفس الطلب في كل مرة يتفتح فيها نفس العنصر.

  _imageCache: null,

  _cache() {
    if (!this._imageCache) this._imageCache = StorageLayer.getImageCache();
    return this._imageCache;
  },

  _cacheGet(key) {
    return Object.prototype.hasOwnProperty.call(this._cache(), key) ? this._cache()[key] : undefined;
  },

  _cacheSet(key, value) {
    const cache = this._cache();
    cache[key] = value;
    StorageLayer.setImageCache(cache);
  },

  async fetchNodeImage(node) {
    if (node.type === "movie" || node.type === "tv") {
      return this._fetchTmdb(node.title, node.type);
    }
    return this._fetchWikipedia(node.title);
  },

  async _fetchTmdb(title, type) {
    const key = `tmdb:${type}:${title}`;
    const cached = this._cacheGet(key);
    if (cached !== undefined) return cached;

    const endpoint = type === "tv" ? "search/tv" : "search/movie";
    try {
      const res = await fetch(`${CONFIG.API.TMDB_API_BASE}/${endpoint}?api_key=${CONFIG.API.TMDB_KEY}&language=ar&query=${encodeURIComponent(title)}`);
      const data = await res.json();
      const item = data.results && data.results[0];
      let overview = item ? item.overview : "";
      if (item && (!overview || overview.trim() === "")) {
        const resEn = await fetch(`${CONFIG.API.TMDB_API_BASE}/${endpoint}?api_key=${CONFIG.API.TMDB_KEY}&language=en-US&query=${encodeURIComponent(title)}`);
        const dataEn = await resEn.json();
        const itemEn = dataEn.results && dataEn.results[0];
        if (itemEn) overview = itemEn.overview;
      }
      const result = item ? {
        poster: item.poster_path ? CONFIG.API.TMDB_IMG + item.poster_path : null,
        overview: overview || "",
        sourceUrl: `https://www.themoviedb.org/${type}/${item.id}`,
        viaEnglish: false
      } : null;
      this._cacheSet(key, result);
      return result;
    } catch (e) {
      console.warn(`فشل الاتصال بـ TMDB لعنصر "${title}"`, e);
      return null;
    }
  },

  async _fetchWikipedia(title) {
    const key = `wiki:${title}`;
    const cached = this._cacheGet(key);
    if (cached !== undefined) return cached;

    const tryLang = async (lang) => {
      try {
        const res = await fetch(`${CONFIG.API.WIKIPEDIA_SUMMARY(lang)}${encodeURIComponent(title)}`);
        if (!res.ok) return null;
        const data = await res.json();
        if (data.type === "disambiguation") return null;
        return data;
      } catch (e) {
        return null;
      }
    };

    try {
      let data = await tryLang("ar");
      let viaEnglish = false;
      if (!data || !data.extract) {
        const dataEn = await tryLang("en");
        if (dataEn) { data = dataEn; viaEnglish = true; }
      }
      const result = data ? {
        poster: data.thumbnail ? data.thumbnail.source : null,
        overview: data.extract || "",
        sourceUrl: (data.content_urls && data.content_urls.desktop && data.content_urls.desktop.page) || null,
        viaEnglish
      } : null;
      this._cacheSet(key, result);
      return result;
    } catch (e) {
      console.warn(`فشل الاتصال بويكيبيديا لعنصر "${title}"`, e);
      return null;
    }
  }
};
