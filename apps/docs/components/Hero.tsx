// apps/docs/components/Hero.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

export function Hero() {
  const GRID_SIZE = 60;

  // 움직이는 선(Tracer) 설정
  const tracerVariant = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: (delay: number) => ({
      pathLength: [0, 1, 1],
      opacity: [0, 0.2, 0], // 아주 은은하게 (눈에 띄지 않도록)
      transition: {
        duration: 4,
        ease: "easeInOut",
        repeat: Infinity,
        delay: delay,
        repeatDelay: Math.random() * 5 + 3,
      },
    }),
  };

  // 배경에 깔릴 선 위치
  const horizontalLines = [120, 360, 540];
  const verticalLines = [180, 480];

  return (
    <div className="hero-container">
      {/* === Layer 0: 정적 점선 격자 === */}
      <svg className="grid-background">
        <defs>
          <pattern
            id="grid-pattern"
            width={GRID_SIZE}
            height={GRID_SIZE}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`}
              fill="none"
              stroke="#222"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          </pattern>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="url(#grid-pattern)"
          opacity="0.5"
        />
      </svg>

      {/* === Layer 1: 은은하게 움직이는 추적선 === */}
      <svg className="tracer-layer">
        {horizontalLines.map((y, i) => (
          <motion.line
            key={`h-${i}`}
            x1="0"
            y1={y}
            x2="100%"
            y2={y}
            stroke="#fff"
            strokeWidth="1"
            variants={tracerVariant}
            initial="hidden"
            animate="visible"
            custom={i * 2}
          />
        ))}
        {verticalLines.map((x, i) => (
          <motion.line
            key={`v-${i}`}
            x1={x}
            y1="0"
            x2={x}
            y2="100%"
            stroke="#fff"
            strokeWidth="1"
            variants={tracerVariant}
            initial="hidden"
            animate="visible"
            custom={i * 3 + 1}
          />
        ))}
      </svg>

      {/* === Layer 2: 컨텐츠 (로고 + 텍스트) === */}
      <div className="content-wrapper">
        {/* [좌측] 로고 영역 */}
        <motion.div
          className="logo-wrapper"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
        >
          {/* ✅ 파일명 수정 완료: mirage-logo.svg */}
          {/* 반드시 apps/docs/public/mirage-logo.svg 위치에 파일이 있어야 합니다. */}
          <Image
            src="/mirage-logo.svg"
            alt="Mirage Logo"
            fill
            style={{
              objectFit: "contain",
              filter: "drop-shadow(0 0 30px rgba(255,255,255,0.1))",
            }}
            priority
          />
        </motion.div>

        {/* [우측] 텍스트 영역 */}
        <div className="text-wrapper">
          <div className="badge">
            <span className="dot"></span>
            <span>Structural Analysis Engine</span>
          </div>

          <h1 className="title">Mirage Engine</h1>

          <p className="description">
            DOM의 구조를 점선 그리드 위에서 재해석합니다.
            <br className="hidden-mobile" />
            보이지 않는 설계를 시각적인 현실로 구현하세요.
          </p>

          <div className="button-group">
            <Link href="/get-started/quick-start" className="btn btn-primary">
              Documentation
            </Link>
            <a
              href="https://github.com/dltldn333/MirageEngine"
              target="_blank"
              className="btn btn-secondary"
            >
              GitHub
            </a>
          </div>
        </div>
      </div>

      <style jsx>{`
        .hero-container {
          background-color: #050505;
          color: #fff;
          min-height: 80vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
          position: relative;
          overflow: hidden;
        }

        .grid-background,
        .tracer-layer {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }
        .grid-background {
          z-index: 0;
          mask-image: radial-gradient(
            circle at center,
            black 40%,
            transparent 100%
          );
        }
        .tracer-layer {
          z-index: 1;
        }

        /* === [PC 레이아웃: 가로 배치] === */
        .content-wrapper {
          display: flex;
          flex-direction: row; /* 가로 정렬 (중요) */
          align-items: center;
          justify-content: center;
          gap: 5rem;
          max-width: 1200px;
          width: 100%;
          z-index: 10;
          position: relative;
        }

        .logo-wrapper {
          width: 280px;
          height: 280px;
          position: relative;
          flex-shrink: 0; /* 공간이 좁아져도 찌그러지지 않음 */
        }

        .text-wrapper {
          display: flex;
          flex-direction: column;
          align-items: flex-start; /* 왼쪽 정렬 */
          text-align: left;
          min-width: 300px;
        }

        .badge {
          font-family: monospace;
          color: #888;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.9rem;
        }
        .dot {
          width: 6px;
          height: 6px;
          background: #4ade80;
          border-radius: 50%;
        }

        .title {
          font-size: clamp(3rem, 5vw, 5rem);
          font-weight: 800;
          line-height: 1.1;
          letter-spacing: -0.03em;
          margin-bottom: 1.5rem;
          font-family: sans-serif;
        }

        .description {
          font-size: 1.1rem;
          color: #aaa;
          max-width: 500px;
          margin-bottom: 2.5rem;
          line-height: 1.6;
        }

        .button-group {
          display: flex;
          gap: 1rem;
        }
        .hidden-mobile {
          display: block;
        }

        .btn {
          padding: 14px 32px;
          font-weight: bold;
          text-decoration: none;
          font-size: 1rem;
          border-radius: 2px;
          transition: all 0.2s;
        }
        .btn-primary {
          background: #fff;
          color: #000;
          border: 1px solid #fff;
        }
        .btn-primary:hover {
          background: #e5e5e5;
        }
        .btn-secondary {
          background: transparent;
          color: #fff;
          border: 1px solid #444;
        }
        .btn-secondary:hover {
          border-color: #fff;
        }

        /* === [모바일 레이아웃: 세로 배치 & 중앙 정렬] === */
        @media (max-width: 900px) {
          .content-wrapper {
            flex-direction: column; /* 세로 정렬로 변경 */
            text-align: center;
            gap: 2rem;
          }

          .logo-wrapper {
            width: 180px; /* 로고 크기 줄임 */
            height: 180px;
          }

          .text-wrapper {
            align-items: center; /* 가운데 정렬 */
            text-align: center;
          }

          .button-group {
            justify-content: center;
            width: 100%;
          }
          .hidden-mobile {
            display: none;
          }
          .title {
            font-size: 2.5rem;
          }
        }
      `}</style>
    </div>
  );
}
