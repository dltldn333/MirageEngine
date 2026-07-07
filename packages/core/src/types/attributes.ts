const filter_values = {
    INCLUDE_TREE: "include-tree",
    EXCLUDE_TREE: "exclude-tree",
    INCLUDE_SELF: "include-self",
    EXCLUDE_SELF: "exclude-self",
    END: "end",
}

export const ATTR_DOM = {
  NAME: "data-mirage-dom",
  KEY: "mirageDom",
  VALUES: {
    HIDE: "hide",
  },
} as const;

export const TRAVEL_VALUES = {
  TRAVELER: "traveler",
  CAPTURE_1: "1",
  CAPTURE_2: "2",
  CAPTURE_3: "3",
  CAPTURE_4: "4",
  CAPTURE_5: "5",
} as const;

export const ATTR_TRAVEL = {
  NAME: "data-mirage-travel",
  KEY: "mirageTravel",
  VALUES: TRAVEL_VALUES,
  MAX_LAYERS: Object.keys(TRAVEL_VALUES).length - 1,
} as const;

export const ATTR_FILTER = {
  NAME: "data-mirage-filter",
  KEY: "mirageFilter",
  VALUES: filter_values,
} as const;


export const ATTR_SELECTED = {
  NAME: "data-mirage-selected",
  KEY: "mirageSelected",
  VALUES: filter_values,
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
