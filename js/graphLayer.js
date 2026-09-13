// graphLayer.js — everything D3-specific lives here. Talks to KnowledgeLayer
// for data and calls back into RenderLayer/App for click handling, but does
// not itself decide *what* is shown (BusinessLayer/RenderLayer own that).
const GraphLayer = {
  simulation: null,
  zoomBehavior: null,

  render(svgSelector, visibleNodes, onNodeClick) {
    const svg = d3.select(svgSelector);
    svg.selectAll("*").remove();

    const width = CONFIG.GRAPH.width;
    const height = CONFIG.GRAPH.height;
    svg.attr("viewBox", `0 0 ${width} ${height}`);

    // كل عناصر الرسم (روابط + عقد + تسميات) بتتحط جوه <g> واحدة، عشان
    // الـ zoom/pan (تحت) يقدر يكبّرها/يحرّكها كوحدة واحدة بدل ما يلمس
    // إحداثيات كل عنصر لوحده.
    const zoomLayer = svg.append("g").attr("class", "zoom-layer");

    const visibleIds = new Set(visibleNodes.map(n => n.id));
    const links = KnowledgeLayer.edges
      .filter(e => visibleIds.has(e.from) && visibleIds.has(e.to))
      .map(e => ({ ...e, source: e.from, target: e.to }));

    const nodesCopy = visibleNodes.map(n => ({ ...n }));

    if (this.simulation) this.simulation.stop();

    this.simulation = d3.forceSimulation(nodesCopy)
      .force("link", d3.forceLink(links).id(d => d.id).distance(CONFIG.GRAPH.linkDistance))
      .force("charge", d3.forceManyBody().strength(CONFIG.GRAPH.chargeStrength))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(d => (CONFIG.NODE_TYPE_VISUALS[d.type]?.radius || 6) + 4));

    const link = zoomLayer.append("g")
      .attr("stroke", "#8a7a5c")
      .attr("stroke-opacity", 0.35)
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke-width", d => Math.max(1, (d.weight || 3) / 3));

    const node = zoomLayer.append("g")
      .selectAll("circle")
      .data(nodesCopy)
      .join("circle")
      .attr("r", d => CONFIG.NODE_TYPE_VISUALS[d.type]?.radius || 6)
      .attr("fill", d => CONFIG.NODE_TYPE_VISUALS[d.type]?.color || "#999")
      .attr("stroke", "#0f1216")
      .attr("stroke-width", 1)
      .style("cursor", "pointer")
      .call(this._drag(this.simulation))
      .on("click", (_, d) => onNodeClick(d.id));

    node.append("title").text(d => d.title);

    const label = zoomLayer.append("g")
      .selectAll("text")
      .data(nodesCopy)
      .join("text")
      .text(d => d.title)
      .attr("font-size", 9)
      .attr("fill", "#e9e2cf")
      .attr("dy", -10)
      .attr("text-anchor", "middle")
      .style("pointer-events", "none");

    this.simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);
      node.attr("cx", d => d.x).attr("cy", d => d.y);
      label.attr("x", d => d.x).attr("y", d => d.y);
    });

    // تكبير/تصغير بعجلة الماوس أو pinch على الموبايل، وسحب خلفية الشبكة
    // للتحريك (pan). محصور بين 0.2x و4x عشان المستخدم مايضيعش الشبكة كلها
    // ولا يزوم جوه أوي لدرجة إنها تفقد معناها.
    this.zoomBehavior = d3.zoom()
      .scaleExtent([0.2, 4])
      .on("zoom", (event) => zoomLayer.attr("transform", event.transform));
    svg.call(this.zoomBehavior);
  },

  // بتتنادى من أزرار +/-/إعادة الضبط في الواجهة (شوف app.js).
  zoomBy(svgSelector, factor) {
    if (!this.zoomBehavior) return;
    d3.select(svgSelector).transition().duration(200).call(this.zoomBehavior.scaleBy, factor);
  },

  resetZoom(svgSelector) {
    if (!this.zoomBehavior) return;
    d3.select(svgSelector).transition().duration(200).call(this.zoomBehavior.transform, d3.zoomIdentity);
  },

  _drag(simulation) {
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x; d.fy = d.y;
    }
    function dragged(event, d) {
      d.fx = event.x; d.fy = event.y;
    }
    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null; d.fy = null;
    }
    return d3.drag().on("start", dragstarted).on("drag", dragged).on("end", dragended);
  }
};
