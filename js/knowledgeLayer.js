// knowledgeLayer.js — pure data layer. No DOM access here at all.
const KnowledgeLayer = {
  nodes: [],
  edges: [],
  groups: [],
  metadata: {},
  byId: new Map(),
  byGroup: new Map(),

  async load() {
    const [nodes, edges, groups, metadata] = await Promise.all([
      Utils.fetchJSON(CONFIG.DATA_PATHS.nodes),
      Utils.fetchJSON(CONFIG.DATA_PATHS.edges),
      Utils.fetchJSON(CONFIG.DATA_PATHS.groups),
      Utils.fetchJSON(CONFIG.DATA_PATHS.metadata)
    ]);
    this.nodes = nodes;
    this.edges = edges;
    this.groups = groups;
    this.metadata = metadata;
    this._buildIndices();
  },

  _buildIndices() {
    this.byId = new Map(this.nodes.map(n => [n.id, n]));
    this.byGroup = new Map();
    for (const n of this.nodes) {
      if (!n.group) continue;
      if (!this.byGroup.has(n.group)) this.byGroup.set(n.group, []);
      this.byGroup.get(n.group).push(n);
    }
    for (const list of this.byGroup.values()) {
      list.sort((a, b) => (a.storyOrder ?? 999) - (b.storyOrder ?? 999));
    }
  },

  getNode(id) {
    return this.byId.get(id) || null;
  },

  getGroupName(groupId) {
    const g = this.groups.find(g => g.id === groupId);
    return g ? g.name : null;
  },

  // All edges touching a node, in either direction, with the "other side"
  // resolved for convenience.
  getRelated(nodeId) {
    return this.edges
      .filter(e => e.from === nodeId || e.to === nodeId)
      .map(e => {
        const outgoing = e.from === nodeId;
        const otherId = outgoing ? e.to : e.from;
        return { edge: e, outgoing, otherNode: this.getNode(otherId) };
      })
      .filter(r => r.otherNode);
  },

  // Sanity checks: duplicate ids, dangling edges, unknown types, title collisions.
  validateIntegrity() {
    const issues = [];
    const ids = new Set();
    for (const n of this.nodes) {
      if (ids.has(n.id)) issues.push(`Duplicate id: ${n.id}`);
      ids.add(n.id);
      if (!CONFIG.NODE_TYPES.includes(n.type)) issues.push(`Unknown type "${n.type}" on ${n.title}`);
    }
    const titles = new Map();
    for (const n of this.nodes) {
      const key = n.title.trim().toLowerCase();
      if (titles.has(key)) issues.push(`Title collision: "${n.title}"`);
      titles.set(key, n.id);
    }
    for (const e of this.edges) {
      if (!this.byId.has(e.from)) issues.push(`Edge ${e.id} has dangling "from": ${e.from}`);
      if (!this.byId.has(e.to)) issues.push(`Edge ${e.id} has dangling "to": ${e.to}`);
      if (!CONFIG.EDGE_TYPES.includes(e.type)) issues.push(`Unknown edge type "${e.type}" on ${e.id}`);
    }
    return issues;
  },

  // Undirected adjacency list built fresh from edges — used by shortestPath
  // and detectClusters. Treats every relationship as traversable in both
  // directions, since "how are these two connected" doesn't care who
  // pointed at whom.
  _buildAdjacency() {
    const adj = new Map();
    for (const n of this.nodes) adj.set(n.id, []);
    for (const e of this.edges) {
      if (!adj.has(e.from) || !adj.has(e.to)) continue;
      adj.get(e.from).push({ to: e.to, edge: e });
      adj.get(e.to).push({ to: e.from, edge: e });
    }
    return adj;
  },

  // BFS shortest path (fewest hops) between two node ids.
  // Returns { nodes: [Node...], edges: [Edge...] } or null if unreachable.
  shortestPath(fromId, toId) {
    if (!this.byId.has(fromId) || !this.byId.has(toId)) return null;
    if (fromId === toId) return { nodes: [this.getNode(fromId)], edges: [] };

    const adj = this._buildAdjacency();
    const visited = new Set([fromId]);
    const prev = new Map(); // nodeId -> { fromId, edge }
    const queue = [fromId];

    while (queue.length > 0) {
      const current = queue.shift();
      if (current === toId) break;
      for (const { to, edge } of adj.get(current) || []) {
        if (visited.has(to)) continue;
        visited.add(to);
        prev.set(to, { fromId: current, edge });
        queue.push(to);
      }
    }

    if (!prev.has(toId)) return null;

    const nodeIds = [toId];
    const edges = [];
    let cursor = toId;
    while (cursor !== fromId) {
      const step = prev.get(cursor);
      edges.unshift(step.edge);
      nodeIds.unshift(step.fromId);
      cursor = step.fromId;
    }
    return { nodes: nodeIds.map(id => this.getNode(id)), edges };
  },

  // Connected components of the whole graph (undirected), largest first.
  // Isolated nodes with no edges form their own single-node cluster.
  detectClusters() {
    const adj = this._buildAdjacency();
    const visited = new Set();
    const clusters = [];
    for (const n of this.nodes) {
      if (visited.has(n.id)) continue;
      const stack = [n.id];
      visited.add(n.id);
      const componentIds = [];
      while (stack.length > 0) {
        const current = stack.pop();
        componentIds.push(current);
        for (const { to } of adj.get(current) || []) {
          if (!visited.has(to)) {
            visited.add(to);
            stack.push(to);
          }
        }
      }
      clusters.push(componentIds.map(id => this.getNode(id)));
    }
    clusters.sort((a, b) => b.length - a.length);
    return clusters;
  },

  computeMetrics() {
    const byType = {};
    for (const n of this.nodes) byType[n.type] = (byType[n.type] || 0) + 1;

    const edgesByType = {};
    for (const e of this.edges) edgesByType[e.type] = (edgesByType[e.type] || 0) + 1;

    const degree = new Map();
    for (const e of this.edges) {
      degree.set(e.from, (degree.get(e.from) || 0) + 1);
      degree.set(e.to, (degree.get(e.to) || 0) + 1);
    }
    const topConnected = [...degree.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, count]) => ({ node: this.getNode(id), count }))
      .filter(x => x.node);

    return {
      totalNodes: this.nodes.length,
      totalEdges: this.edges.length,
      totalGroups: this.groups.length,
      byType,
      edgesByType,
      topConnected
    };
  },

  // Full in-memory snapshot of the current dataset, ready to serialize.
  // Pure data, no DOM/File APIs here — those live in Utils/app.js.
  exportSnapshot() {
    return {
      schemaVersion: this.metadata.schemaVersion || "1.0.0",
      exportedAt: new Date().toISOString(),
      nodes: this.nodes,
      edges: this.edges,
      groups: this.groups,
      metadata: this.metadata
    };
  },

  // Replaces the in-session dataset with a previously exported snapshot.
  // Validates shape + referential integrity BEFORE committing — on failure,
  // the current dataset is left untouched and the problem list is returned.
  // Never touches localStorage or the /data files on disk; this is a
  // browser-session-only load, mirrored by exportSnapshot() for backup/sharing.
  importSnapshot(snapshot) {
    if (!snapshot || !Array.isArray(snapshot.nodes) || !Array.isArray(snapshot.edges)) {
      return ["الملف غير صالح: لازم يحتوي على nodes[] وedges[]."];
    }

    const previous = {
      nodes: this.nodes, edges: this.edges,
      groups: this.groups, metadata: this.metadata
    };

    this.nodes = snapshot.nodes;
    this.edges = snapshot.edges;
    this.groups = Array.isArray(snapshot.groups) ? snapshot.groups : [];
    this.metadata = snapshot.metadata || {};
    this._buildIndices();

    const issues = this.validateIntegrity();
    if (issues.length > 0) {
      // Roll back — don't leave the app in a half-imported broken state.
      this.nodes = previous.nodes;
      this.edges = previous.edges;
      this.groups = previous.groups;
      this.metadata = previous.metadata;
      this._buildIndices();
      return issues;
    }

    this.metadata.nodeCount = this.nodes.length;
    this.metadata.edgeCount = this.edges.length;
    this.metadata.groupCount = this.groups.length;
    return [];
  }
};
