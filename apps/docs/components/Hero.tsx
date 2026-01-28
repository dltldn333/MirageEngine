// apps/docs/components/Hero.tsx
import Link from "next/link";
import styles from "./Hero.module.css"; // 만약 CSS 모듈을 쓴다면 이렇게 하겠지만, 일단 인라인으로 갑니다.

export function Hero() {
  return (
    <div
      style={{
        position: "relative",
        padding: "5rem 0 4rem",
        textAlign: "center",
        overflow: "hidden",
      }}
    >
      {/* 배경에 은은한 빛 효과 (선택사항) */}
      <div
        style={{
          position: "absolute",
          top: "-50%",
          left: "50%",
          transform: "translate(-50%, 0)",
          width: "600px",
          height: "600px",
          background:
            "radial-gradient(circle, rgba(120,0,255,0.15) 0%, rgba(0,0,0,0) 70%)",
          zIndex: -1,
          pointerEvents: "none",
        }}
      />

      {/* 1. 상단 뱃지 (작은 포인트) */}
      <div
        style={{
          marginBottom: "1.5rem",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            padding: "6px 16px",
            borderRadius: "99px",
            fontSize: "0.85rem",
            fontWeight: 600,
            background: "rgba(128, 128, 128, 0.1)",
            border: "1px solid rgba(128, 128, 128, 0.2)",
            color: "#888",
          }}
        >
          🚀 MirageEngine v0.2.10 Released
        </span>
      </div>

      {/* 2. 메인 타이틀 */}
      <h1
        style={{
          fontSize: "clamp(3rem, 8vw, 5rem)", // 반응형 폰트 크기
          fontWeight: "800",
          lineHeight: 1.1,
          marginBottom: "1.5rem",
          letterSpacing: "-0.03em",
        }}
      >
        Make your DOM <br />
        <span
          style={{
            background: "linear-gradient(90deg, #7928CA, #FF0080)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Alive with WebGL
        </span>
      </h1>

      {/* 3. 서브 타이틀 (p 태그 대신 div 사용으로 에러 방지) */}
      <div
        style={{
          fontSize: "1.25rem",
          color: "#888",
          maxWidth: "600px",
          margin: "0 auto 2.5rem",
          lineHeight: 1.6,
        }}
      >
        MirageEngine은 HTML 요소를 실시간으로 3D 씬으로 동기화합니다.
        <br className="hidden sm:block" />
        복잡한 캔버스 레이어링 없이, <strong>성능과 생산성</strong>을 모두
        잡으세요.
      </div>

      {/* 4. 버튼 그룹 */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Link
          href="/get-started/quick-start"
          style={{
            padding: "0.8rem 2rem",
            borderRadius: "99px",
            fontWeight: "bold",
            textDecoration: "none",
            background: "#fff",
            color: "#000",
            border: "1px solid #fff",
            transition: "opacity 0.2s",
          }}
        >
          Get Started
        </Link>
        <a
          href="https://github.com/dltldn333/MirageEngine"
          target="_blank"
          rel="noreferrer"
          style={{
            padding: "0.8rem 2rem",
            borderRadius: "99px",
            fontWeight: "bold",
            textDecoration: "none",
            background: "transparent",
            color: "inherit",
            border: "1px solid #444",
            transition: "background 0.2s",
          }}
        >
          View on GitHub
        </a>
      </div>
    </div>
  );
}
