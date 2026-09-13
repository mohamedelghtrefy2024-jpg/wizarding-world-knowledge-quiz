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
  }
};
