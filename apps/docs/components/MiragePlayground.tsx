import React, { useState } from "react";
import { Sandpack } from "@codesandbox/sandpack-react";

export const MiragePlayground = () => {
  const [mode, setMode] = useState<"duplicate" | "overlay">("duplicate");
  const [quality, setQuality] = useState("medium");
  const [isHighlighted, setIsHighlighted] = useState(false);

  const htmlCode = `
<div id="demo-root">
  <div id="target" class="mini-site">
    <div class="header">
      <div class="dot"></div>
      <div class="dot"></div>
    </div>
    <div class="body-content">
      <div class="skeleton-title"></div>
      <div class="skeleton-text"></div>
      <div class="btn-group">
        <button class="btn primary" onclick="alert('Hello!')">Hello,</button>
        <button class="btn secondary" onclick="alert('Mirage-engine')">Mirage-engine!</button>
      </div>
    </div>
  </div>
</div>`;

  const cssCode = `
#demo-root {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px;
  background: #f5f5f5;
  border-radius: 20px;
}

.mini-site {
  width: 100%;
  background-color: #ffffff;
  border-radius: 24px;
  border: 4px solid #000000;
  z-index: 10;
  overflow: hidden;
}

.header {
  padding: 12px;
  background-color: #eeeeee;
  border-bottom: 2px solid #000000;
  display: flex;
  gap: 6px;
}

.dot {
  width: 8px;
  height: 8px;
  background-color: #ff605c;
  border-radius: 50%;
}

.body-content {
  padding: 16px;
}

.skeleton-title {
  height: 12px;
  width: 70%;
  background-color: #000;
  border-radius: 6px;
  margin-bottom: 8px;
}

.skeleton-text {
  height: 8px;
  width: 100%;
  background-color: #ccc;
  border-radius: 4px;
  margin-bottom: 20px;
}

.btn-group {
  display: flex;
  gap: 8px;
}

.btn {
  height: 30px;
  flex: 1;
  border: none;
  border-radius: 10px;
}

.btn.primary { background-color: #4D96FF; color: #FFFFFF; }
.btn.secondary { background-color: #FFD93D; color: #000000; }

${
  isHighlighted
    ? `
canvas {
  outline: 4px solid #4D96FF !important;
  outline-offset: -4px;
}`
    : ""
}
`;

  const jsCode = `import { Mirage } from "mirage-engine";
import "./styles.css";

const target = document.getElementById("target");

const mirage = new Mirage(target, {
  mode: "${mode}",
  textQuality: "${quality}"
});

mirage.start();
`;

  return (
    <div
      style={{
        border: "1px solid rgba(0,0,0,0.1)",
        borderRadius: "16px",
        overflow: "hidden",
        boxShadow: "0 4px 24px rgba(0,0,0,0.05)",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          background:
            "hsl(var(--nextra-primary-hue) var(--nextra-primary-saturation) 77% / .08)",
          borderBottom: "1px solid rgba(0,0,0,0.08)",
        }}
      >
        <div
          style={{
            padding: "20px 24px",
            borderRight: "1px solid rgba(0,0,0,0.05)",
          }}
        >
          <p
            style={{
              margin: "0 0 10px 0",
              fontSize: "11px",
              fontWeight: 700,
              color: "#888",
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            Engine Mode
          </p>
          <div style={{ display: "flex", gap: "12px" }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              <input
                type="radio"
                checked={mode === "duplicate"}
                onChange={() => setMode("duplicate")}
              />
              Duplicate
            </label>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              <input
                type="radio"
                checked={mode === "overlay"}
                onChange={() => setMode("overlay")}
              />
              Overlay
            </label>
          </div>
        </div>

        <div
          style={{
            padding: "20px 24px",
            borderRight: "1px solid rgba(0,0,0,0.05)",
          }}
        >
          <p
            style={{
              margin: "0 0 10px 0",
              fontSize: "11px",
              fontWeight: 700,
              color: "#888",

              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            Text Quality
          </p>
          <select
            value={quality}
            onChange={(e) => setQuality(e.target.value)}
            style={{
              width: "100%",
              padding: "6px 8px",
              borderRadius: "6px",
              fontSize: "13px",
              border: "1px solid rgba(0,0,0,0.1)",
              cursor: "pointer",
            }}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        <div style={{ padding: "20px 24px" }}>
          <p
            style={{
              margin: "0 0 10px 0",
              fontSize: "11px",
              fontWeight: 700,
              color: "#888",
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            Visualization
          </p>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={isHighlighted}
              onChange={(e) => setIsHighlighted(e.target.checked)}
              style={{
                accentColor: "hsl(var(--nextra-primary-hue), 100%, 50%)",
              }}
            />
            Highlight Canvas
          </label>
        </div>
      </div>

      <Sandpack
        template="vanilla"
        theme="dark"
        customSetup={{
          dependencies: {
            "mirage-engine": "0.2.8",
            three: "^0.150.0",
          },
        }}
        files={{
          "/index.html": htmlCode,
          "/styles.css": cssCode,
          "/index.js": jsCode,
        }}
        options={{
          editorHeight: 500,
        }}
      />
    </div>
  );
};
