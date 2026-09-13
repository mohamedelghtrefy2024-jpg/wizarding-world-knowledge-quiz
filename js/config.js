// config.js — no logic, only constants. Mirrors the layered pattern used in
// the Marvel Knowledge Graph project: data/behavior separated from config.
const CONFIG = {
  DATA_PATHS: {
    nodes: "data/nodes.json",
    edges: "data/edges.json",
    groups: "data/groups.json",
    metadata: "data/metadata.json",
    settings: "data/settings.json",
    i18n: (lang) => `data/i18n/${lang}.json`
  },

  STORAGE_KEYS: {
    language: "hpmap_lang_v1",
    view: "hpmap_view_v1"
  },

  // Visual identity per node type: color + relative radius in the graph view.
  NODE_TYPE_VISUALS: {
    movie:        { color: "#8B1E2E", radius: 10 }, // burgundy
    tv:           { color: "#B8860B", radius: 10 }, // antique gold
    play:         { color: "#5A3E85", radius: 10 }, // amethyst
    game:         { color: "#3A6B5C", radius: 9  }, // deep teal
    character:    { color: "#C9A227", radius: 7  }, // gold
    family:       { color: "#6B4A2F", radius: 6  }, // wood brown
    house:        { color: "#9E2A2B", radius: 6  }, // house red
    organization: { color: "#3F5D7D", radius: 6  }, // steel blue
    location:     { color: "#2F6E4E", radius: 6  }, // emerald
    artifact:     { color: "#B08D57", radius: 5  }, // bronze
    event:        { color: "#7A1F2B", radius: 8  }, // deep red
    creature:     { color: "#4E7A3D", radius: 6  }, // forest green
    spell:        { color: "#8E44AD", radius: 4  }  // violet
  },

  EDGE_TYPES: [
    "founded", "created", "enemy_of", "ally_of", "member_of", "mentor_of",
    "student_of", "parent_of", "child_of", "sibling_of", "married_to",
    "owns", "defeated", "first_appeared", "appears_in", "connected_to",
    "located_in", "attends"
  ],

  NODE_TYPES: [
    "movie", "tv", "play", "game", "character", "family", "house",
    "organization", "location", "artifact", "event", "creature", "spell"
  ],

  GRAPH: {
    width: 900,
    height: 600,
    chargeStrength: -220,
    linkDistance: 90
  }
};
