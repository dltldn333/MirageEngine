// apps/docs/components/Hero.tsx
"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export function Hero() {
  // 드로잉 애니메이션 설정 (건축 도면처럼 정교하게)
  const draw = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: (i: number) => ({
      pathLength: 1,
      opacity: 1,
      transition: {
        pathLength: {
          delay: i * 0.2,
          type: "spring",
          duration: 1.5,
          bounce: 0,
        },
        opacity: { delay: i * 0.2, duration: 0.01 },
      },
    }),
  };

  // 면(Plane)이 채워지는 애니메이션
  const fillPlane = {
    hidden: { opacity: 0 },
    visible: (i: number) => ({
      opacity: 0.1, // 은은하게 채워짐
      transition: { delay: i * 0.5 + 1, duration: 1 },
    }),
  };

  return (
    <div
      style={{
        backgroundColor: "#000",
        color: "#fff",
        minHeight: "80vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "4rem 2rem",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* 배경: 모눈종이 같은 그리드 (아주 옅게) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          backgroundImage:
            "linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          opacity: 0.2,
          maskImage:
            "radial-gradient(circle at center, black 40%, transparent 100%)", // 중앙만 보이게 마스킹
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: "5rem",
          maxWidth: "1200px",
          width: "100%",
          zIndex: 10,
          flexWrap: "wrap-reverse", // 모바일에서 텍스트가 위로 오게
        }}
      >
        {/* --- [좌측] 추상적 설계도 그래픽 (Abstract Blueprint) --- */}
        <div style={{ width: "400px", height: "400px", position: "relative" }}>
          <motion.svg
            viewBox="0 0 400 400"
            style={{ width: "100%", height: "100%" }}
          >
            {/* 1. 외곽 가이드라인 (점선) - 전체 영역 스캔 */}
            <motion.rect
              x="10"
              y="10"
              width="380"
              height="380"
              rx="2"
              stroke="#444"
              strokeWidth="1"
              fill="transparent"
              strokeDasharray="10 10"
              variants={draw}
              initial="hidden"
              animate="visible"
              custom={0}
            />

            {/* 2. 중심 구조선 (Crosshair) */}
            <motion.line
              x1="200"
              y1="0"
              x2="200"
              y2="400"
              stroke="#666"
              strokeWidth="1"
              variants={draw}
              initial="hidden"
              animate="visible"
              custom={1}
            />
            <motion.line
              x1="0"
              y1="200"
              x2="400"
              y2="200"
              stroke="#666"
              strokeWidth="1"
              variants={draw}
              initial="hidden"
              animate="visible"
              custom={1}
            />

            {/* 3. 주요 레이아웃 박스 (실선) - DOM 요소 형상화 */}
            <motion.rect
              x="50"
              y="50"
              width="120"
              height="120"
              stroke="white"
              strokeWidth="2"
              fill="transparent"
              variants={draw}
              initial="hidden"
              animate="visible"
              custom={2}
            />

            <motion.rect
              x="50"
              y="230"
              width="300"
              height="120"
              stroke="white"
              strokeWidth="2"
              fill="transparent"
              variants={draw}
              initial="hidden"
              animate="visible"
              custom={3}
            />

            <motion.rect
              x="230"
              y="50"
              width="120"
              height="120"
              stroke="white"
              strokeWidth="2"
              fill="transparent"
              variants={draw}
              initial="hidden"
              animate="visible"
              custom={2.5}
            />

            {/* 4. 사각형 면 채우기 (Planes) - Reassemble 과정 */}
            <motion.rect
              x="50"
              y="50"
              width="120"
              height="120"
              fill="white"
              variants={fillPlane}
              initial="hidden"
              animate="visible"
              custom={2}
            />
            <motion.rect
              x="230"
              y="50"
              width="120"
              height="120"
              fill="white"
              variants={fillPlane}
              initial="hidden"
              animate="visible"
              custom={2.5}
            />
            <motion.rect
              x="50"
              y="230"
              width="300"
              height="120"
              fill="white"
              variants={fillPlane}
              initial="hidden"
              animate="visible"
              custom={3}
            />

            {/* 5. 디테일: 코너 포인트 (Anchor Points) - 노드 점 */}
            {[
              [50, 50],
              [170, 50],
              [50, 170],
              [170, 170], // 첫 박스
              [230, 50],
              [350, 50],
              [230, 170],
              [350, 170], // 두번째 박스
              [50, 230],
              [350, 230],
              [50, 350],
              [350, 350], // 하단 박스
            ].map((pos, i) => (
              <motion.rect
                key={i}
                x={pos[0] - 3}
                y={pos[1] - 3}
                width="6"
                height="6"
                fill="#fff"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 2 + i * 0.05 }}
              />
            ))}

            {/* 6. 치수선 (Measurement Lines) - 분석(Analyze) 느낌 */}
            <motion.path
              d="M 40 50 L 30 50 L 30 170 L 40 170"
              stroke="#888"
              fill="none"
              variants={draw}
              initial="hidden"
              animate="visible"
              custom={4}
            />
            <motion.text
              x="10"
              y="115"
              fill="#888"
              fontSize="10"
              fontFamily="monospace"
              style={{ opacity: 0.7 }}
            >
              120px
            </motion.text>
          </motion.svg>
        </div>

        {/* --- [우측] 텍스트 정보 --- */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            textAlign: "left",
            flex: 1,
          }}
        >
          <div
            style={{
              fontFamily: "monospace",
              color: "#888",
              marginBottom: "1.5rem",
              borderLeft: "2px solid #333",
              paddingLeft: "1rem",
            }}
          >
            <div>Target: HTMLDivElement</div>
            <div>
              Status: <span style={{ color: "#4ade80" }}>Synchronized</span>
            </div>
            <div>FPS: 60.0</div>
          </div>

          <h1
            style={{
              fontSize: "clamp(3rem, 6vw, 5rem)",
              fontWeight: "800",
              lineHeight: 1,
              letterSpacing: "-0.03em",
              marginBottom: "2rem",
              fontFamily: "sans-serif",
            }}
          >
            Mirage Engine
          </h1>

          <p
            style={{
              fontSize: "1.1rem",
              color: "#aaa",
              maxWidth: "500px",
              marginBottom: "3rem",
              lineHeight: 1.7,
            }}
          >
            DOM 요소를 3D 공간의 면(Plane)으로 재구축합니다. <br />
            복잡한 레이어 계산은 엔진에게 맡기고, 당신은 설계에만 집중하세요.
          </p>

          <div style={{ display: "flex", gap: "1rem" }}>
            <Link
              href="/get-started/quick-start"
              style={{
                padding: "14px 32px",
                background: "#fff",
                color: "#000",
                borderRadius: "0px",
                fontWeight: "bold",
                textDecoration: "none",
                fontSize: "1rem",
                border: "1px solid #fff",
              }}
            >
              Initialize System
            </Link>
            <a
              href="https://github.com/dltldn333/MirageEngine"
              target="_blank"
              style={{
                padding: "14px 32px",
                background: "transparent",
                color: "#fff",
                borderRadius: "0px",
                border: "1px solid #444",
                fontWeight: "bold",
                textDecoration: "none",
                fontSize: "1rem",
              }}
            >
              View Blueprint
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
