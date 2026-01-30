"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, Variants } from "framer-motion";

export function Hero() {
  const GRID_SIZE = 60;

  const tracerVariant: Variants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: (delay: any) => ({
      pathLength: [0, 1, 1],
      opacity: [0, 0.2, 0],
      transition: {
        duration: 4,
        ease: "easeInOut",
        repeat: Infinity,
        delay: delay,
        repeatDelay: Math.random() * 5 + 3,
      },
    }),
  };

  const horizontalLines = [120, 360, 540];
  const verticalLines = [180, 480];

  return (
    <div
      className="hero-container"
      style={{
        backgroundColor: "#050505",
        color: "#fff",
        minHeight: "80vh",
        width: "100vw",
        marginLeft: "calc(-50vw + 50%)",
        marginRight: "calc(-50vw + 50%)",
        marginTop: "-64px",
        paddingTop: "64px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <svg
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          zIndex: 0,
          maskImage:
            "radial-gradient(circle at center, black 40%, transparent 100%)",
          pointerEvents: "none",
        }}
      >
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
              stroke="#777"
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

      <svg
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          zIndex: 1,
          pointerEvents: "none",
        }}
      >
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

      <div className="content-wrapper">
        <motion.div
          className="logo-wrapper"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          style={{
            position: "relative",
            width: "280px",
            height: "280px",
            flexShrink: 0,
          }}
        >
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

        <div
          className="text-wrapper"
          style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          <div
            className="badge-container"
            style={{ display: "flex", flexDirection: "row", gap: "1rem" }}
          >
            {["Deconstruct", "Analyze", "Reassemble"].map((text) => (
              <div
                key={text}
                className="badge"
                style={{
                  fontFamily: "monospace",
                  color: "#888",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "0.9rem",
                }}
              >
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    background: "#4ade80",
                    borderRadius: "50%",
                  }}
                ></span>
                <span>{text}</span>
              </div>
            ))}
          </div>

          <h1
            className="title"
            style={{
              fontSize: "clamp(3rem, 5vw, 5rem)",
              fontWeight: "800",
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              marginBottom: "0.5rem",
              fontFamily: "sans-serif",
            }}
          >
            Mirage Engine
          </h1>

          <p
            className="description"
            style={{
              fontSize: "1.1rem",
              color: "#aaa",
              maxWidth: "500px",
              marginBottom: "0.5rem",
              lineHeight: 1.6,
            }}
          >
            An engine that
            <br /> mirrors{" "}
            <span style={{ color: "#4ade80" }}>HTML DOM elements</span> to a{" "}
            <span style={{ color: "#4ade80" }}>WebGL scene</span> in real-time
          </p>

          <div style={{ display: "flex", gap: "1rem" }}>
            <motion.div
              whileHover={{
                backgroundColor: "rgba(255, 255, 255, 0.2)",
              }}
              whileTap={{
                backgroundColor: "rgba(255, 255, 255, 0.2)",
              }}
            >
              <Link
                href="/get-started/quick-start"
                className="btn"
                style={{
                  display: "inline-block",
                  padding: "14px 32px",
                  fontWeight: "bold",
                  textDecoration: "none",
                  fontSize: "1rem",
                  borderRadius: "2px",
                  background: "rgba(255, 255, 255, 0.1)",
                  color: "#fff",
                  border: "1px solid #444",
                }}
              >
                Documentation
              </Link>
            </motion.div>
            <motion.a
              href="https://github.com/dltldn333/MirageEngine"
              target="_blank"
              className="btn"
              whileHover={{
                backgroundColor: "rgba(255, 255, 255, 0.2)",
              }}
              whileTap={{
                backgroundColor: "rgba(255, 255, 255, 0.2)",
              }}
              style={{
                display: "inline-block",
                padding: "14px 32px",
                fontWeight: "bold",
                textDecoration: "none",
                fontSize: "1rem",
                borderRadius: "2px",
                background: "rgba(255, 255, 255, 0.1)",
                color: "#fff",
                border: "1px solid #444",
              }}
            >
              GitHub
            </motion.a>
          </div>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: "100%",
          height: "200px",
          background:
            "linear-gradient(to bottom, transparent 0%, #121212 100%)",
          zIndex: 20,
          pointerEvents: "none",
        }}
      />

      <style jsx>{`
        .content-wrapper {
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: center;
          gap: 5rem;
          max-width: 1200px;
          width: 100%;
          z-index: 10;
          position: relative;
        }

        .text-wrapper {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          text-align: left;
          min-width: 300px;
        }

        .hidden-mobile {
          display: block;
        }

        @media (max-width: 900px) {
          .content-wrapper {
            flex-direction: column !important;
            text-align: center;
            gap: 2rem;
          }

          :global(.logo-wrapper) {
            width: 140px !important;
            height: 140px !important;
          }

          .text-wrapper {
            align-items: center !important;
            text-align: center !important;
          }

          .badge-container {
            justify-content: center;
            flex-wrap: wrap;
          }

          .hidden-mobile {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
