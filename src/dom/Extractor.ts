import {
  DIRTY_RECT,
  DIRTY_STYLE,
  DIRTY_CONTENT,
  DIRTY_ZINDEX,
  DIRTY_STRUCTURE,
  SceneNode,
  BoxStyles,
  TextStyles,
} from "../types";

// Check Whitespace
function isValidTextNode(node: Node): boolean {
  return (
    node.nodeType === Node.TEXT_NODE &&
    (node.textContent?.trim().length || 0) > 0
  );
}

function isLeafTextElement(element: HTMLElement): boolean {
  const childNodes = Array.from(element.childNodes);

  if (childNodes.length === 0) return false;

  const hasElementChlid = childNodes.some(
    (node) => node.nodeType === Node.ELEMENT_NODE
  );
  if (hasElementChlid) return false;

  const hasText = childNodes.some(isValidTextNode);

  return hasText;
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
  element: HTMLElement,
  initialMask = DIRTY_RECT |
    DIRTY_STYLE |
    DIRTY_ZINDEX |
    DIRTY_CONTENT |
    DIRTY_STRUCTURE
): SceneNode | null {
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

  let nodeType: "BOX" | "TEXT" = "BOX";
  let textContent: string | undefined;
  let textStyles: TextStyles | undefined;
  const children: SceneNode[] = [];

  if (isLeafTextElement(element)) {
    nodeType = "TEXT";
    textContent = element.textContent || "";
    textStyles = extractTextStyles(computed);
  } else {
    Array.from(element.children).forEach((child) => {
      const childNode = extractSceneGraph(child as HTMLElement, initialMask);
      if (childNode) {
        children.push(childNode);
      }
    });
  }
  return {
    id,
    type: nodeType,
    element,
    rect: {
      x: rect.left,
      y: rect.top,
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
