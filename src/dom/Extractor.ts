import { NodeRect, SceneNode, BoxStyles } from "../types";
import { DIRTY_RECT, DIRTY_STYLE } from "../types";

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
