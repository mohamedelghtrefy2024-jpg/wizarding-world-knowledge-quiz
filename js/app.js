// app.js — glue only. No business logic lives here.
const App = {
  currentView: "rows",

  async init() {
    await I18n.init();
    await KnowledgeLayer.load();

    const issues = KnowledgeLayer.validateIntegrity();
    if (issues.length > 0) {
      console.warn("Data integrity issues:", issues);
    }

    RenderLayer.onNodeClick = (id) => this.openDetail(id);

    this._wireToolbar();
    this._wireSearch();
    this._wireFilters();
    this._wireLangToggle();
    this._wireDataTransfer();
    this._wireGraphControls();

    this.currentView = StorageLayer.getView();
    this._applyI18nStatic();
    this.renderCurrentView();
  },

  _applyI18nStatic() {
    Utils.setText(Utils.byId("appTitle"), I18n.t("app.title"));
    Utils.setText(Utils.byId("appSubtitle"), I18n.t("app.subtitle"));
    RenderLayer.renderToolbarLabels();
    RenderLayer.renderFilterChips(Utils.byId("filterChips"));
    RenderLayer.setActiveChip(Utils.byId("filterChips"), BusinessLayer.activeType);
    RenderLayer.renderLegend(Utils.byId("legend"));
  },

  _wireToolbar() {
    Utils.byId("btnRows").addEventListener("click", () => this.switchView("rows"));
    Utils.byId("btnGraph").addEventListener("click", () => this.switchView("graph"));
    Utils.byId("btnTimeline").addEventListener("click", () => this.switchView("timeline"));
    Utils.byId("btnStats").addEventListener("click", () => this.switchView("stats"));
    Utils.byId("btnPath").addEventListener("click", () => this.switchView("path"));
    Utils.byId("overlay").addEventListener("click", (e) => {
      if (e.target.id === "overlay") e.target.classList.remove("overlay--open");
    });
  },

  _wireSearch() {
    const input = Utils.byId("searchInput");
    input.addEventListener("input", Utils.debounce((e) => {
      BusinessLayer.setQuery(e.target.value);
      this.renderCurrentView();
    }, 150));
  },

  _wireFilters() {
    const container = Utils.byId("filterChips");
    container.addEventListener("click", (e) => {
      const btn = e.target.closest(".chip");
      if (!btn) return;
      BusinessLayer.setFilter(btn.dataset.type);
      RenderLayer.setActiveChip(container, btn.dataset.type);
      this.renderCurrentView();
    });
  },

  _wireLangToggle() {
    Utils.byId("btnLang").addEventListener("click", async () => {
      await I18n.toggle();
      this._applyI18nStatic();
      this.renderCurrentView();
    });
  },

  _wireDataTransfer() {
    Utils.byId("btnExport").addEventListener("click", () => {
      const snapshot = KnowledgeLayer.exportSnapshot();
      Utils.downloadJSON(`wizarding-world-knowledge-graph-${Date.now()}.json`, snapshot);
      RenderLayer.showToast(I18n.t("data.exportSuccess"), "success");
    });

    const fileInput = Utils.byId("importFileInput");
    Utils.byId("btnImport").addEventListener("click", () => fileInput.click());

    fileInput.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      fileInput.value = ""; // allow re-selecting the same file later
      if (!file) return;

      try {
        const snapshot = await Utils.readFileAsJSON(file);
        const issues = KnowledgeLayer.importSnapshot(snapshot);
        if (issues.length > 0) {
          console.warn("Import rejected — integrity issues:", issues);
          RenderLayer.showToast(I18n.t("data.importError"), "error");
          return;
        }
        this._applyI18nStatic();
        this.renderCurrentView();
        RenderLayer.showToast(I18n.t("data.importSuccess"), "success");
      } catch (err) {
        console.warn("Import failed:", err.message);
        RenderLayer.showToast(I18n.t("data.importError"), "error");
      }
    });
  },

  _wireGraphControls() {
    Utils.byId("btnZoomIn").addEventListener("click", () => GraphLayer.zoomBy("#graphSvg", 1.4));
    Utils.byId("btnZoomOut").addEventListener("click", () => GraphLayer.zoomBy("#graphSvg", 1 / 1.4));
    Utils.byId("btnZoomReset").addEventListener("click", () => GraphLayer.resetZoom("#graphSvg"));
  },

  switchView(view) {
    this.currentView = view;
    StorageLayer.setView(view);
    document.querySelectorAll(".view").forEach(v => v.classList.remove("view--active"));
    Utils.byId(`view-${view}`).classList.add("view--active");
    document.querySelectorAll(".toolbar__btn").forEach(b => b.classList.remove("toolbar__btn--active"));
    Utils.byId(`btn${view.charAt(0).toUpperCase()}${view.slice(1)}`).classList.add("toolbar__btn--active");
    this.renderCurrentView();
  },

  renderCurrentView() {
    const visible = BusinessLayer.visibleNodes();
    if (this.currentView === "rows") {
      RenderLayer.renderRows(Utils.byId("view-rows"), visible);
    } else if (this.currentView === "graph") {
      GraphLayer.render("#graphSvg", visible, (id) => this.openDetail(id));
    } else if (this.currentView === "timeline") {
      RenderLayer.renderTimeline(Utils.byId("view-timeline"));
    } else if (this.currentView === "stats") {
      RenderLayer.renderStats(Utils.byId("view-stats"), KnowledgeLayer.computeMetrics());
    } else if (this.currentView === "path") {
      RenderLayer.renderPathFinder(Utils.byId("view-path"));
    }
  },

  openDetail(id) {
    const node = KnowledgeLayer.getNode(id);
    if (!node) return;
    RenderLayer.renderDetail(Utils.byId("overlay"), node);
  }
};

document.addEventListener("DOMContentLoaded", () => App.init());
