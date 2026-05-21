import {
  DIRTY_RECT,
  DIRTY_STYLE,
  DIRTY_CONTENT,
  DIRTY_ZINDEX,
  DIRTY_STRUCTURE,
  SceneNode,
  Visibility,
  USER_LAYER,
  SYSTEM_LAYER,
  ALLOWED_FILTERS,
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
  inheritedFlow: Visibility,
  filterConfig?: FilterConfig,
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
      visibility: inheritedFlow,
      isTraveler: false,
      children: [],
    };
  }

  const element = sourceNode as HTMLElement;
  // [[Filter]] data attribute based filtering
  const filterData = element.dataset.mirageFilter;
  let visibleFlow = inheritedFlow;
  let visibleFlag = inheritedFlow;
  if (filterData) {
    const filterSet = new Set(filterData.split(/\s+/));
    // error check
    for (const token of filterSet) {
      if (!ALLOWED_FILTERS.includes(token)) {
        throw new Error(
          `[MirageEngine] Invalid filter token: '${token}'. ` +
            `Expected one of: 'include-tree', 'exclude-tree', 'include-self', 'exclude-self', 'end'.`,
        );
      }
    }

    if (filterSet.has("end")) return null;

    // error check
    if (filterSet.has("include-tree") && filterSet.has("exclude-tree")) {
      throw new Error(
        `[MirageEngine] Conflicting filters: 'include-tree' and 'exclude-tree' cannot be used together on the same element.`,
      );
    }
    if (filterSet.has("include-self") && filterSet.has("exclude-self")) {
      throw new Error(
        `[MirageEngine] Conflicting filters: 'include-self' and 'exclude-self' cannot be used together on the same element.`,
      );
    }

    if (filterSet.has("include-tree")) {
      visibleFlow = (visibleFlow | USER_LAYER) as Visibility;
    } else if (filterSet.has("exclude-tree")) {
      visibleFlow = (visibleFlow & ~USER_LAYER) as Visibility;
    }

    visibleFlag = visibleFlow;

    if (filterSet.has("include-self")) {
      visibleFlag = (visibleFlag | USER_LAYER) as Visibility;
    } else if (filterSet.has("exclude-self")) {
      visibleFlag = (visibleFlag & ~USER_LAYER) as Visibility;
    }
  }

  // [[filter]] class based filtering
  // [Filter] end
  // if (filterConfig && filterConfig.end && filterConfig.end.length > 0) {
  //   const isEnd = filterConfig.end.some((cls) =>
  //     element.classList.contains(cls),
  //   );
  //   if (isEnd) return null;
  // }

  visibleFlag = (visibleFlag | (inheritedFlow & SYSTEM_LAYER)) as Visibility;

  const travelData = element.dataset.mirageTravel;
  let isTraveler = false;
  if (travelData) {
    const travelSet = new Set(travelData.split(/\s+/));
    if (travelSet.has("traveler")) {
      visibleFlag = (visibleFlag & ~SYSTEM_LAYER) as Visibility;
      visibleFlow = (visibleFlow & ~SYSTEM_LAYER) as Visibility;
      isTraveler = true;
    }
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
    const visibleFlowToPass =
      child.nodeType === Node.TEXT_NODE ? visibleFlag : visibleFlow;
    const childNode = extractSceneGraph(
      child,
      initialMask,
      visibleFlowToPass,
      filterConfig,
    );
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
    visibility: visibleFlag,
    isTraveler: isTraveler,
    children,
  };
}
