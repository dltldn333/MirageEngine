import {
  DIRTY_RECT,
  DIRTY_STYLE,
  DIRTY_CONTENT,
  DIRTY_ZINDEX,
  DIRTY_STRUCTURE,
  SceneNode,
} from "../types";

import { BoxStyles, TextStyles } from "@mirage-engine/painter";
import { FilterConfig } from "../types/config";

// Helper function: getTextNodeRect, isValidTextNode, isLeafTextElement, extractTextStyles

function getTextNodeRect(textNode: Text) {
  const range = document.createRange();
  range.selectNodeContents(textNode);
  const rect = range.getBoundingClientRect();
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  };
}



function extractTextStyles(computed: CSSStyleDeclaration): TextStyles {
  const fontSize = parseFloat(computed.fontSize);
  let lineHeight = parseFloat(computed.lineHeight);
  if (isNaN(lineHeight)) {
    lineHeight = fontSize * 1.2;
  }
  let letterSpacing = parseFloat(computed.letterSpacing);
  if (isNaN(letterSpacing)) {
    letterSpacing = 0;
  }
  return {
    font: `${computed.fontStyle} ${computed.fontWeight} ${computed.fontSize} ${computed.fontFamily}`,
    color: computed.color,
    textAlign: (computed.textAlign as CanvasTextAlign) || "start",
    textBaseline: "alphabetic",
    direction: (computed.direction as CanvasDirection) || "inherit",
    lineHeight,
    letterSpacing,
  };
}

export function extractSceneGraph(
  sourceNode: HTMLElement | Node,
  initialMask = DIRTY_RECT |
    DIRTY_STYLE |
    DIRTY_ZINDEX |
    DIRTY_CONTENT |
    DIRTY_STRUCTURE,
  filter?: FilterConfig,
): SceneNode | null {
  // Check text node
  if (sourceNode.nodeType === Node.TEXT_NODE) {
    const textNode = sourceNode as Text;

    // empthy text check
    if (!textNode.textContent || !textNode.textContent.trim()) return null;
    const normalizedText = textNode.textContent.replace(/\s+/g, " ").trim();
    if (normalizedText.length === 0) return null;

    const rect = getTextNodeRect(textNode);

    // size check
    if (rect.width === 0 || rect.height === 0) return null;

    // Cascading Styles
    const parent = textNode.parentElement;
    const computed = parent ? window.getComputedStyle(parent) : null;
    if (!computed) return null;

    // Create SceneNode for text node
    return {
      id: Math.random().toString(36).substring(2, 9),
      type: "TEXT",
      element: textNode as unknown as HTMLElement,
      rect: {
        x: rect.left + window.scrollX,
        y: rect.top + window.scrollY,
        width: rect.width,
        height: rect.height,
      },
      styles: {
        backgroundColor: "transparent",
        opacity: parseFloat(computed.opacity),
        zIndex: 0,
        borderRadius: "0px",
        borderColor: "transparent",
        borderWidth: "0px",
      },
      textContent: normalizedText,
      textStyles: extractTextStyles(computed),
      dirtyMask: initialMask,
      children: [],
    };
  }

  const element = sourceNode as HTMLElement;

  // [Filter] end
  // by data attribute
  const filterData = element.dataset.mirageFilter;
  if (filterData && filterData.includes("end")) return null;
  // by class
  if (filter && filter.end && filter.end.length > 0) {
    const isEnd = filter.end.some((cls) =>
      element.classList.contains(cls),
    );
    if (isEnd) return null;
  }

  const rect = element.getBoundingClientRect();
  const computed = window.getComputedStyle(element);

  // Base Case
  if (rect.width === 0 || rect.height === 0 || computed.display === "none") {
    return null;
  }

  let id = element.getAttribute("data-mid");
  if (!id) {
    id = Math.random().toString(36).substring(2, 11);
    element.setAttribute("data-mid", id);
  }

  const zIndex = parseInt(computed.zIndex);
  const styles: BoxStyles = {
    backgroundColor: computed.backgroundColor,
    opacity: parseFloat(computed.opacity),
    zIndex: isNaN(zIndex) ? 0 : zIndex,
    borderRadius: computed.borderRadius,
    borderColor: computed.borderColor,
    borderWidth: computed.borderWidth,
  };

  let textContent: string | undefined;
  let textStyles: TextStyles | undefined;
  const children: SceneNode[] = [];

  Array.from(element.childNodes).forEach((child) => {
    // Recurring
    const childNode = extractSceneGraph(child, initialMask, filter);
    if (childNode) {
      children.push(childNode);
    }
  });

  return {
    id,
    type: "BOX",
    element,
    rect: {
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY,
      width: rect.width,
      height: rect.height,
    },
    styles,
    textContent,
    textStyles,
    dirtyMask: initialMask,
    children,
  };
}
