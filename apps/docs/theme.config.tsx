import React from "react";
import { DocsThemeConfig } from "nextra-theme-docs";

const config: DocsThemeConfig = {
  logo: (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <span style={{ fontWeight: 800, fontSize: "1.2rem" }}>MIRAGE</span>
      <span style={{ fontSize: "0.8rem", opacity: 0.6 }}>ENGINE</span>
    </div>
  ),
  project: {
    link: "https://github.com/dltldn333/MirageEngine",
  },
  docsRepositoryBase:
    "https://github.com/dltldn333/MirageEngine/tree/main/apps/docs",
  footer: {
    text: "Mirage Engine © 2026",
  },
  sidebar: {
    defaultMenuCollapseLevel: 1,
    toggleButton: true,
  },

  darkMode: false,
  nextThemes: {
    defaultTheme: "dark",
    forcedTheme: "dark",
  },
};

export default config;
