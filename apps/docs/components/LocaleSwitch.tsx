import { useRouter } from "next/router";
import Link from "next/link";

const LOCALES = [
  { code: "en", label: "EN", name: "English" },
  { code: "ko", label: "KO", name: "한국어" },
] as const;

/** Current locale is derived from the URL: `/ko/**` is Korean, anything else English. */
export function currentLocale(pathname: string): "en" | "ko" {
  return pathname === "/ko" || pathname.startsWith("/ko/") ? "ko" : "en";
}

/** Map a path to its counterpart in the other locale, falling back to that locale's home. */
export function counterpartPath(pathname: string, to: "en" | "ko"): string {
  const from = currentLocale(pathname);
  if (from === to) return pathname;
  if (to === "ko") return pathname === "/" ? "/ko" : `/ko${pathname}`;
  const stripped = pathname.replace(/^\/ko/, "");
  return stripped === "" ? "/" : stripped;
}

export function LocaleSwitch() {
  const { pathname } = useRouter();
  const active = currentLocale(pathname);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "2px",
        marginRight: "0.5rem",
        border: "1px solid var(--nextra-navbar-border, rgba(255,255,255,0.15))",
        borderRadius: "6px",
        padding: "2px",
      }}
    >
      {LOCALES.map(({ code, label, name }) => {
        const isActive = code === active;
        return (
          <Link
            key={code}
            href={counterpartPath(pathname, code)}
            aria-label={name}
            aria-current={isActive ? "true" : undefined}
            style={{
              padding: "3px 8px",
              fontSize: "0.72rem",
              fontWeight: 600,
              letterSpacing: "0.04em",
              borderRadius: "4px",
              textDecoration: "none",
              color: isActive ? "#fff" : "rgba(255,255,255,0.5)",
              background: isActive ? "rgba(255,255,255,0.12)" : "transparent",
            }}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
