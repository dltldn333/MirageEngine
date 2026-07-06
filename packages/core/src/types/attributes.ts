export const ATTR_DOM = {
  NAME: "data-mirage-dom",
  KEY: "mirageDom",
  VALUES: {
    HIDE: "hide",
  },
} as const;

export const ATTR_TRAVEL = {
  NAME: "data-mirage-travel",
  KEY: "mirageTravel",
  VALUES: {
    TRAVELER: "traveler",
  },
  MAX_LAYERS: 2,
} as const;

export const ATTR_FILTER = {
  NAME: "data-mirage-filter",
  KEY: "mirageFilter",
  VALUES: {
    INCLUDE_TREE: "include-tree",
    EXCLUDE_TREE: "exclude-tree",
    INCLUDE_SELF: "include-self",
    EXCLUDE_SELF: "exclude-self",
    END: "end",
  },
} as const;

export const ATTR_SHADER = {
  NAME: "data-mirage-shader",
  KEY: "mirageShader",
} as const;

export const ATTR_SANDWICH = {
  NAME: "data-mirage-sandwich",
  KEY: "mirageSandwich",
  VALUES: {
    FRONT: "front",
  },
} as const;
