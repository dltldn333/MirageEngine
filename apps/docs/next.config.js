// apps/docs/next.config.js
const withNextra = require("nextra")({
  theme: "nextra-theme-docs",
  themeConfig: "./theme.config.tsx",
});

// Locales are directory-based (`pages/**` = English, `pages/ko/**` = Korean)
// rather than Next.js i18n routing: Nextra 2's `page.<locale>.mdx` convention
// rewrites its own page map but never emits matching Next routes, so every
// path 404s. Plain directories give real routes and a real 404 for typos.
module.exports = withNextra({
  reactStrictMode: true,
});
