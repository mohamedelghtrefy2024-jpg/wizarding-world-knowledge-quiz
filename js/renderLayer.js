// renderLayer.js — the only file allowed to touch the DOM directly.
// Every dynamic string goes through textContent, never innerHTML.
const RenderLayer = {
  onNodeClick: null, // set by app.js

  typeLabel(type) {
    return I18n.t(`type.${type}`);
  },

  edgeLabel(type) {
    return I18n.t(`edge.${type}`) || type;
  },

  // Small transient message in the corner — used for import/export feedback.
  // No queueing: a new toast simply replaces whatever is currently shown.
  showToast(message, kind = "info") {
    let toast = Utils.byId("toast");
    if (!toast) {
      toast = Utils.el("div", "toast");
      toast.id = "toast";
      document.body.appendChild(toast);
    }
    toast.className = `toast toast--${kind}`;
    Utils.setText(toast, message);
    toast.classList.add("toast--visible");
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => toast.classList.remove("toast--visible"), 4000);
  },

  renderToolbarLabels() {
    document.querySelectorAll("[data-i18n]").forEach(el => {
      Utils.setText(el, I18n.t(el.dataset.i18n));
    });
    const search = Utils.byId("searchInput");
    if (search) search.placeholder = I18n.t("search.placeholder");
  },

  renderFilterChips(container) {
    container.innerHTML = "";
    const allChip = Utils.el("button", "chip chip--active", I18n.t("filter.all"));
    allChip.dataset.type = "all";
    container.appendChild(allChip);
    for (const type of CONFIG.NODE_TYPES) {
      const chip = Utils.el("button", "chip", this.typeLabel(type));
      chip.dataset.type = type;
      container.appendChild(chip);
    }
  },

  setActiveChip(container, type) {
    container.querySelectorAll(".chip").forEach(c => {
      c.classList.toggle("chip--active", c.dataset.type === type);
    });
  },

  renderRows(container, nodes) {
    container.innerHTML = "";
    if (nodes.length === 0) {
      container.appendChild(Utils.el("p", "empty-state", "—"));
      return;
    }
    // Group nodes that belong to a timeline era first, in era order; then
    // everything else (characters/families/etc without a single era) in a
    // trailing section — mirrors the Marvel project's "un-grouped row".
    const grouped = new Map();
    const loose = [];
    for (const n of nodes) {
      if (n.group) {
        if (!grouped.has(n.group)) grouped.set(n.group, []);
        grouped.get(n.group).push(n);
      } else {
        loose.push(n);
      }
    }
    for (const group of KnowledgeLayer.groups) {
      const list = grouped.get(group.id);
      if (!list || list.length === 0) continue;
      container.appendChild(this._rowSection(group.name, list));
    }
    if (loose.length > 0) {
      container.appendChild(this._rowSection(I18n.t("filter.all"), loose));
    }
  },

  _rowSection(title, nodes) {
    const section = Utils.el("section", "row-section");
    section.appendChild(Utils.el("h3", "row-section__title", title));
    const grid = Utils.el("div", "card-grid");
    for (const n of nodes) grid.appendChild(this._card(n));
    section.appendChild(grid);
    return section;
  },

  _card(n) {
    const card = Utils.el("article", "card");
    card.dataset.type = n.type;
    const badge = Utils.el("span", "card__badge", this.typeLabel(n.type));
    const title = Utils.el("h4", "card__title", n.title);
    const desc = Utils.el("p", "card__desc", n.shortDescription || "");
    card.appendChild(badge);
    card.appendChild(title);
    card.appendChild(desc);
    card.addEventListener("click", () => this.onNodeClick(n.id));
    return card;
  },

  renderTimeline(container) {
    container.innerHTML = "";
    container.appendChild(Utils.el("h2", "timeline__title", I18n.t("timeline.title")));
    for (const group of KnowledgeLayer.groups) {
      const nodesInGroup = (KnowledgeLayer.byGroup.get(group.id) || [])
        .filter(n => ["movie", "tv", "play", "game"].includes(n.type));
      const track = Utils.el("div", "timeline__track");
      track.appendChild(Utils.el("div", "timeline__era", group.name));
      const items = Utils.el("div", "timeline__items");
      for (const n of nodesInGroup) {
        const item = Utils.el("div", "timeline__item", n.title);
        item.addEventListener("click", () => this.onNodeClick(n.id));
        items.appendChild(item);
      }
      if (nodesInGroup.length === 0) {
        items.appendChild(Utils.el("div", "timeline__item timeline__item--muted", "—"));
      }
      track.appendChild(items);
      container.appendChild(track);
    }
  },

  renderStats(container, metrics) {
    container.innerHTML = "";
    container.appendChild(Utils.el("h2", "stats__title", I18n.t("stats.title")));

    const summary = Utils.el("div", "stats__summary");
    summary.appendChild(this._statCard(I18n.t("stats.totalNodes"), metrics.totalNodes));
    summary.appendChild(this._statCard(I18n.t("stats.totalEdges"), metrics.totalEdges));
    summary.appendChild(this._statCard(I18n.t("stats.totalGroups"), metrics.totalGroups));
    container.appendChild(summary);

    container.appendChild(Utils.el("h3", "stats__subtitle", I18n.t("stats.byType")));
    const bars = Utils.el("div", "stats__bars");
    const maxCount = Math.max(...Object.values(metrics.byType));
    for (const [type, count] of Object.entries(metrics.byType)) {
      const row = Utils.el("div", "stats__bar-row");
      row.appendChild(Utils.el("span", "stats__bar-label", this.typeLabel(type)));
      const track = Utils.el("div", "stats__bar-track");
      const fill = Utils.el("div", "stats__bar-fill");
      fill.style.width = `${(count / maxCount) * 100}%`;
      fill.style.background = CONFIG.NODE_TYPE_VISUALS[type]?.color || "#999";
      track.appendChild(fill);
      row.appendChild(track);
      row.appendChild(Utils.el("span", "stats__bar-count", String(count)));
      bars.appendChild(row);
    }
    container.appendChild(bars);

    container.appendChild(Utils.el("h3", "stats__subtitle", I18n.t("stats.topConnected")));
    const list = Utils.el("ol", "stats__top-list");
    for (const { node, count } of metrics.topConnected) {
      const li = Utils.el("li", "stats__top-item");
      const link = Utils.el("button", "stats__top-link", `${node.title} (${count})`);
      link.addEventListener("click", () => this.onNodeClick(node.id));
      li.appendChild(link);
      list.appendChild(li);
    }
    container.appendChild(list);
  },

  _statCard(label, value) {
    const card = Utils.el("div", "stat-card");
    card.appendChild(Utils.el("div", "stat-card__value", String(value)));
    card.appendChild(Utils.el("div", "stat-card__label", label));
    return card;
  },

  renderPathFinder(container) {
    container.innerHTML = "";
    container.appendChild(Utils.el("h2", "path__title", I18n.t("path.title")));

    const sorted = [...KnowledgeLayer.nodes].sort((a, b) => a.title.localeCompare(b.title));

    const form = Utils.el("div", "path-finder");
    const fromField = this._nodeSelect(sorted, I18n.t("path.fromLabel"));
    const toField = this._nodeSelect(sorted, I18n.t("path.toLabel"));
    const btn = Utils.el("button", "path-finder__btn", I18n.t("path.findBtn"));
    form.appendChild(fromField.wrapper);
    form.appendChild(toField.wrapper);
    form.appendChild(btn);
    container.appendChild(form);

    const resultBox = Utils.el("div", "path-result");
    container.appendChild(resultBox);

    btn.addEventListener("click", () => {
      resultBox.innerHTML = "";
      const fromId = fromField.select.value;
      const toId = toField.select.value;
      if (!fromId || !toId) return;
      const result = KnowledgeLayer.shortestPath(fromId, toId);
      if (!result) {
        resultBox.appendChild(Utils.el("p", "path-result__empty", I18n.t("path.noPath")));
        return;
      }
      this._renderPathResult(resultBox, result);
    });

    container.appendChild(Utils.el("h3", "path__subtitle", I18n.t("clusters.title")));
    const clustersBox = Utils.el("div", "clusters-list");
    KnowledgeLayer.detectClusters().forEach((members, idx) => {
      clustersBox.appendChild(this._clusterCard(members, idx));
    });
    container.appendChild(clustersBox);
  },

  _nodeSelect(sortedNodes, labelText) {
    const wrapper = Utils.el("label", "path-finder__field");
    wrapper.appendChild(Utils.el("span", "path-finder__label", labelText));
    const select = document.createElement("select");
    select.className = "path-finder__select";
    const emptyOpt = document.createElement("option");
    emptyOpt.value = "";
    emptyOpt.textContent = "—";
    select.appendChild(emptyOpt);
    for (const n of sortedNodes) {
      const opt = document.createElement("option");
      opt.value = n.id;
      opt.textContent = `${n.title} (${this.typeLabel(n.type)})`;
      select.appendChild(opt);
    }
    wrapper.appendChild(select);
    return { wrapper, select };
  },

  _renderPathResult(container, result) {
    const chain = Utils.el("div", "path-result__chain");
    result.nodes.forEach((node, i) => {
      const stepBtn = Utils.el("button", "path-result__step", node.title);
      stepBtn.addEventListener("click", () => this.onNodeClick(node.id));
      chain.appendChild(stepBtn);
      if (i < result.edges.length) {
        chain.appendChild(Utils.el("span", "path-result__arrow",
          `→ ${this.edgeLabel(result.edges[i].type)} →`));
      }
    });
    container.appendChild(chain);
    container.appendChild(Utils.el("p", "path-result__length",
      `${I18n.t("path.lengthLabel")}: ${result.edges.length}`));
  },

  _clusterCard(members, idx) {
    const card = Utils.el("div", "cluster-card");
    const header = Utils.el("div", "cluster-card__header");
    header.appendChild(Utils.el("span", "cluster-card__title",
      `${I18n.t("clusters.clusterLabel")} ${idx + 1}`));
    header.appendChild(Utils.el("span", "cluster-card__count",
      `${members.length} ${I18n.t("clusters.nodesLabel")}`));
    card.appendChild(header);
    const chips = Utils.el("div", "cluster-card__members");
    for (const n of members) {
      const chip = Utils.el("button", "cluster-chip", n.title);
      chip.addEventListener("click", () => this.onNodeClick(n.id));
      chips.appendChild(chip);
    }
    card.appendChild(chips);
    return card;
  },

  renderLegend(container) {
    container.innerHTML = "";
    container.appendChild(Utils.el("span", "legend__title", I18n.t("graph.legend")));
    for (const type of CONFIG.NODE_TYPES) {
      const item = Utils.el("span", "legend__item");
      const dot = Utils.el("span", "legend__dot");
      dot.style.background = CONFIG.NODE_TYPE_VISUALS[type]?.color || "#999";
      item.appendChild(dot);
      item.appendChild(Utils.el("span", null, this.typeLabel(type)));
      container.appendChild(item);
    }
  },

  renderDetail(overlay, node) {
    overlay.innerHTML = "";
    const panel = Utils.el("div", "detail-panel");

    const header = Utils.el("div", "detail-panel__header");
    header.appendChild(Utils.el("span", "detail-panel__badge", this.typeLabel(node.type)));
    const closeBtn = Utils.el("button", "detail-panel__close", "✕");
    closeBtn.addEventListener("click", () => overlay.classList.remove("overlay--open"));
    header.appendChild(closeBtn);
    panel.appendChild(header);

    panel.appendChild(Utils.el("h2", "detail-panel__title", node.title));

    if (node.group) {
      panel.appendChild(Utils.el("p", "detail-panel__era", KnowledgeLayer.getGroupName(node.group)));
    }

    panel.appendChild(Utils.el("h3", "detail-panel__section-title", I18n.t("detail.description")));
    panel.appendChild(Utils.el("p", "detail-panel__desc",
      node.description || node.shortDescription || I18n.t("detail.noDescription")));

    const related = KnowledgeLayer.getRelated(node.id);
    if (related.length > 0) {
      panel.appendChild(Utils.el("h3", "detail-panel__section-title", I18n.t("detail.relationships")));
      const list = Utils.el("ul", "relations-list");
      for (const { edge, outgoing, otherNode } of related) {
        const li = Utils.el("li", "relations-list__item");
        const verb = this.edgeLabel(edge.type);
        const text = outgoing ? `${verb} ${otherNode.title}` : `${otherNode.title} ${verb} ${node.title}`;
        const btn = Utils.el("button", "relations-list__link", text);
        btn.addEventListener("click", () => this.onNodeClick(otherNode.id));
        li.appendChild(btn);
        if (edge.description) {
          li.appendChild(Utils.el("div", "relations-list__note", edge.description));
        }
        list.appendChild(li);
      }
      panel.appendChild(list);
    }

    overlay.appendChild(panel);
    overlay.classList.add("overlay--open");
  }
};
