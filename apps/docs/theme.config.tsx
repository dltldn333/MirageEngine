// apps/docs/theme.config.tsx
import React from "react";
import { DocsThemeConfig } from "nextra-theme-docs";

const config: DocsThemeConfig = {
  logo: <span>Mirage Engine</span>,
  project: {
    link: "https://github.com/dltldn333/MirageEngine",
  },
  docsRepositoryBase:
    "https://github.com/dltldn333/MirageEngine/tree/main/apps/docs",
  footer: {
    text: "Mirage Engine Documentation",
  },
  i18n: [
    { locale: "en", text: "English" },
    { locale: "ko", text: "한국어" },
  ],
};

export default config;
