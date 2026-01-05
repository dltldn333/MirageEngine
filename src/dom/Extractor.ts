import { NodeRect, SceneNode, BoxStyles } from "../types";
import { DIRTY_RECT, DIRTY_STYLE } from "../types";

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

export function extractSceneGraph(
  element: HTMLElement,
  initialMask = DIRTY_RECT | DIRTY_STYLE
): SceneNode | null {
  if (element.tagName === "SCRIPT" || element.tagName === "STYLE") {
    return null;
  }

  const rectData = element.getBoundingClientRect();

  const rect: NodeRect = {
    x: rectData.x + window.scrollX,
    y: rectData.y + window.scrollY,
    width: rectData.width,
    height: rectData.height,
  };

  const styles = window.getComputedStyle(element);

  const nodeStyle: BoxStyles = {
    backgroundColor: styles.backgroundColor,
    opacity: parseFloat(styles.opacity),
    zIndex: parseInt(styles.zIndex, 10) || 0,
  };

  const children: SceneNode[] = [];
  for (const child of element.children) {
    const childNode = extractSceneGraph(child as HTMLElement);
    if (childNode) {
      children.push(childNode);
    }
  }
  return {
    type: "BOX",
    element: element,
    rect: rect,
    styles: nodeStyle,
    dirtyMask: initialMask,
    children: children,
  };
}
