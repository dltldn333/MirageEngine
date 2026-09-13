import React from "react";
import { useRouter } from "next/router";
import { DocsThemeConfig, useConfig } from "nextra-theme-docs";
import { LocaleSwitch, currentLocale } from "./components/LocaleSwitch";

const GITHUB = "https://github.com/dltldn333/MirageEngine";

/**
 * Locale-scoped UI strings.
 * Locales are directory-based: `pages/**` is English, `pages/ko/**` is Korean.
 * To add one: create `pages/<locale>/**`, add a STRINGS entry, and add it to
 * the LOCALES list in components/LocaleSwitch.tsx.
 */
const STRINGS = {
  en: {
    editText: "Edit this page on GitHub →",
    feedbackText: "Question? Give us feedback →",
    searchPlaceholder: "Search documentation…",
    searchEmpty: "No results found.",
    tocTitle: "On this page",
    lastUpdated: "Last updated on",
    footer: "Mirage Engine — MIT Licensed © 2026 dltldn333",
    description:
      "Mirage Engine mirrors live HTML DOM elements into a WebGL scene in real time.",
  },
  ko: {
    editText: "GitHub에서 이 문서 수정하기 →",
    feedbackText: "궁금한 점이 있나요? 피드백 남기기 →",
    searchPlaceholder: "문서 검색…",
    searchEmpty: "검색 결과가 없습니다.",
    tocTitle: "목차",
    lastUpdated: "마지막 수정",
    footer: "Mirage Engine — MIT 라이선스 © 2026 dltldn333",
    description:
      "Mirage Engine은 살아 있는 HTML DOM 요소를 실시간으로 WebGL 씬에 미러링합니다.",
  },
} as const;

function useStrings() {
  const { pathname } = useRouter();
  return STRINGS[currentLocale(pathname)];
}

const config: DocsThemeConfig = {
  logo: (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <span style={{ fontWeight: 800, fontSize: "1.2rem" }}>MIRAGE</span>
      <span style={{ fontSize: "0.8rem", opacity: 0.6 }}>ENGINE</span>
    </div>
  ),

  project: { link: GITHUB },
  docsRepositoryBase: `${GITHUB}/tree/main/apps/docs`,

  navbar: {
    extraContent: LocaleSwitch,
  },

  head: function Head() {
    const { frontMatter, title } = useConfig();
    const { pathname } = useRouter();
    const s = STRINGS[currentLocale(pathname)];
    const description = frontMatter?.description || s.description;
    const pageTitle = title ? `${title} – Mirage Engine` : "Mirage Engine";
    return (
      <>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="description" content={description} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={description} />
        <meta
          property="og:locale"
          content={currentLocale(pathname) === "ko" ? "ko_KR" : "en_US"}
        />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="icon" href="/mirage-logo.svg" />
      </>
    );
  },

  useNextSeoProps() {
    return { titleTemplate: "%s – Mirage Engine" };
  },

  editLink: { text: () => useStrings().editText },
  feedback: { content: () => useStrings().feedbackText },

  toc: {
    title: () => useStrings().tocTitle,
    backToTop: true,
    float: true,
  },

  search: {
    placeholder: () => useStrings().searchPlaceholder,
    emptyResult: function Empty() {
      return (
        <span style={{ display: "block", padding: "1rem", opacity: 0.6 }}>
          {useStrings().searchEmpty}
        </span>
      );
    },
  },

  gitTimestamp: function Timestamp({ timestamp }) {
    const { pathname } = useRouter();
    const locale = currentLocale(pathname);
    const s = STRINGS[locale];
    return (
      <>
        {s.lastUpdated}{" "}
        {timestamp.toLocaleDateString(locale === "ko" ? "ko-KR" : "en-US", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      </>
    );
  },

  footer: {
    text: function Footer() {
      return <span>{useStrings().footer}</span>;
    },
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
