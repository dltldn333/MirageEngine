import {
  DIRTY_RECT,
  DIRTY_STYLE,
  DIRTY_CONTENT,
  DIRTY_ZINDEX,
  DIRTY_STRUCTURE,
  SceneNode,
  Visibility,
  USER_LAYER,
  SELECT_LAYER,
  ALLOWED_FILTERS,
  ATTR_DOM,
  ATTR_FILTER,
  ATTR_SELECT,
  ATTR_TRAVEL,
  ATTR_SHADER,
} from "../types";

import { BoxStyles, TextStyles, ShaderHooks } from "@mirage-engine/painter";

// Helper function: getTextNodeRect, isValidTextNode, isLeafTextElement, extractTextStyles

function extractTextLines(textNode: Text): {
  text: string;
  rect: { left: number; top: number; width: number; height: number };
}[] {
  const text = textNode.textContent || "";
  const lines: {
    text: string;
    rect: { left: number; top: number; width: number; height: number };
  }[] = [];

  let currentLineText = "";
  let currentLineRect: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  } | null = null;
  let currentTop = -1;

  const processChunk = (chunkText: string, offset: number) => {
    for (let i = 0; i < chunkText.length; i++) {
      const char = chunkText[i];
      const range = document.createRange();
      range.setStart(textNode, offset + i);
      range.setEnd(textNode, offset + i + 1);
      const rect = range.getBoundingClientRect();

      if (rect.width === 0 && rect.height === 0) {
        currentLineText += char;
        continue;
      }

      if (
        currentTop === -1 ||
        Math.abs(rect.top - currentTop) > rect.height / 2
      ) {
        if (currentLineText && currentLineRect) {
          lines.push({
            text: currentLineText,
            rect: {
              left: currentLineRect.left,
              top: currentLineRect.top,
              width: currentLineRect.right - currentLineRect.left,
              height: currentLineRect.bottom - currentLineRect.top,
            },
          });
        }
        currentLineText = char;
        currentLineRect = {
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
        };
        currentTop = rect.top;
      } else {
        currentLineText += char;
        if (currentLineRect) {
          currentLineRect.left = Math.min(currentLineRect.left, rect.left);
          currentLineRect.top = Math.min(currentLineRect.top, rect.top);
          currentLineRect.right = Math.max(currentLineRect.right, rect.right);
          currentLineRect.bottom = Math.max(
            currentLineRect.bottom,
            rect.bottom,
          );
        }
      }
    }
  };

  const tokens = text.match(/[^\s\-]+\-?|\-|\s+/g) || [];
  let currentOffset = 0;

  for (const token of tokens) {
    const range = document.createRange();
    range.setStart(textNode, currentOffset);
    range.setEnd(textNode, currentOffset + token.length);
    const rects = range.getClientRects();

    if (rects.length > 1) {
      // Token wraps across lines (e.g. word-break: break-all)
      // Fallback to precise character-by-character iteration for this token
      processChunk(token, currentOffset);
    } else {
      // Token is on a single line. Process it as a single block!
      const rect =
        rects.length === 1 ? rects[0] : range.getBoundingClientRect();

      if (rect.width === 0 && rect.height === 0) {
        currentLineText += token;
        currentOffset += token.length;
        continue;
      }

      if (
        currentTop === -1 ||
        Math.abs(rect.top - currentTop) > rect.height / 2
      ) {
        if (currentLineText && currentLineRect) {
          lines.push({
            text: currentLineText,
            rect: {
              left: currentLineRect.left,
              top: currentLineRect.top,
              width: currentLineRect.right - currentLineRect.left,
              height: currentLineRect.bottom - currentLineRect.top,
            },
          });
        }
        currentLineText = token;
        currentLineRect = {
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
        };
        currentTop = rect.top;
      } else {
        currentLineText += token;
        if (currentLineRect) {
          currentLineRect.left = Math.min(currentLineRect.left, rect.left);
          currentLineRect.top = Math.min(currentLineRect.top, rect.top);
          currentLineRect.right = Math.max(currentLineRect.right, rect.right);
          currentLineRect.bottom = Math.max(
            currentLineRect.bottom,
            rect.bottom,
          );
        }
      }
    }

    currentOffset += token.length;
  }

  if (currentLineText && currentLineRect) {
    lines.push({
      text: currentLineText,
      rect: {
        left: currentLineRect.left,
        top: currentLineRect.top,
        width: currentLineRect.right - currentLineRect.left,
        height: currentLineRect.bottom - currentLineRect.top,
      },
    });
  }

  return lines.filter(
    (line) =>
      line.text.trim().length > 0 &&
      line.rect.width > 0 &&
      line.rect.height > 0,
  );
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
    fontSize: computed.fontSize,
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
  captureLayer: number = 1,
  inheritedZIndex: number = 0,
  qualityFactor: number = 2,
  inheritedNativeLayer?: number,
  inheritedNativeStyles?: any,
  inheritedClipElements?: HTMLElement[],
): SceneNode | null {
  // Check text node
  if (sourceNode.nodeType === Node.TEXT_NODE) {
    const textNode = sourceNode as Text;
    // empthy text check
    if (!textNode.textContent || !textNode.textContent.trim()) return null;
    const normalizedText = textNode.textContent.replace(/\s+/g, " ");
    if (normalizedText.length === 0) return null;

    const textLines = extractTextLines(textNode);

    if (textLines.length === 0) return null;

    // Cascading Styles
    const parent = textNode.parentElement;
    const computed = parent ? window.getComputedStyle(parent) : null;
    if (!computed) return null;

    // Calculate overall bounding box of the lines
    const minX = Math.min(...textLines.map((l) => l.rect.left));
    const minY = Math.min(...textLines.map((l) => l.rect.top));
    const maxX = Math.max(...textLines.map((l) => l.rect.left + l.rect.width));
    const maxY = Math.max(...textLines.map((l) => l.rect.top + l.rect.height));

    // Create SceneNode for the text node
    return {
      id: Math.random().toString(36).substring(2, 9),
      type: "TEXT",
      element: textNode as unknown as HTMLElement,
      rect: {
        x: minX + window.scrollX,
        y: minY + window.scrollY,
        width: maxX - minX,
        height: maxY - minY,
      },
      styles: {
        backgroundColor: "transparent",
        backgroundImage: "",
        opacity:
          parent && parent.dataset[ATTR_DOM.KEY] === ATTR_DOM.VALUES.HIDE
            ? 1
            : parseFloat(computed.opacity),
        zIndex:
          (isNaN(parseInt(computed.zIndex)) ? 0 : parseInt(computed.zIndex)) +
          inheritedZIndex,
        borderRadius: "0px",
        borderColor: "transparent",
        borderWidth: "0px",
        isTraveler: false,
      },
      textContent: normalizedText,
      textLines: textLines.map((l) => ({
        text: l.text.trim(),
        rect: {
          x: l.rect.left + window.scrollX,
          y: l.rect.top + window.scrollY,
          width: l.rect.width,
          height: l.rect.height,
        },
      })),
      textStyles: extractTextStyles(computed),
      dirtyMask: initialMask,
      visibility: inheritedFlow,
      isTraveler: false,
      captureLayer,
      isFixed: computed.position === "fixed",
      nativeLayer: inheritedNativeLayer,
      nativeStyles: inheritedNativeStyles
        ? {
            backgroundColor: "transparent",
            backgroundImage: "",
            opacity:
              parent && parent.dataset[ATTR_DOM.KEY] === ATTR_DOM.VALUES.HIDE
                ? 1
                : parseFloat(computed.opacity),
            zIndex:
              (isNaN(parseInt(computed.zIndex))
                ? 0
                : parseInt(computed.zIndex)) + inheritedZIndex,
            borderRadius: "0px",
            borderColor: "transparent",
            borderWidth: "0px",
            isTraveler: false,
            ...extractTextStyles(computed),
            ...inheritedNativeStyles,
          }
        : undefined,
      nativeRect: inheritedNativeStyles
        ? {
            x: minX + window.scrollX,
            y: minY + window.scrollY,
            width: maxX - minX,
            height: maxY - minY,
          }
        : undefined,
      clipElements: inheritedClipElements,
      children: [],
    };
  }

  if (sourceNode.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const element = sourceNode as HTMLElement;
  // [[Filter]] data attribute based filtering
  const filterData = element.dataset[ATTR_FILTER.KEY];
  let visibleFlow = inheritedFlow;
  let visibleFlag = inheritedFlow;
  if (filterData) {
    const filterSet = new Set(filterData.split(/\s+/));
    // error check
    for (const token of filterSet) {
      if (!ALLOWED_FILTERS.includes(token as any)) {
        throw new Error(
          `[MirageEngine] Invalid filter token: '${token}'. ` +
            `Expected one of: 'include-tree', 'exclude-tree', 'include-self', 'exclude-self', 'end'.`,
        );
      }
    }

    if (filterSet.has(ATTR_FILTER.VALUES.END)) return null;

    // error check
    if (
      filterSet.has(ATTR_FILTER.VALUES.INCLUDE_TREE) &&
      filterSet.has(ATTR_FILTER.VALUES.EXCLUDE_TREE)
    ) {
      throw new Error(
        `[MirageEngine] Conflicting filters: 'include-tree' and 'exclude-tree' cannot be used together on the same element.`,
      );
    }
    if (
      filterSet.has(ATTR_FILTER.VALUES.INCLUDE_SELF) &&
      filterSet.has(ATTR_FILTER.VALUES.EXCLUDE_SELF)
    ) {
      throw new Error(
        `[MirageEngine] Conflicting filters: 'include-self' and 'exclude-self' cannot be used together on the same element.`,
      );
    }

    if (filterSet.has(ATTR_FILTER.VALUES.INCLUDE_TREE)) {
      visibleFlow = (visibleFlow | USER_LAYER) as Visibility;
    } else if (filterSet.has(ATTR_FILTER.VALUES.EXCLUDE_TREE)) {
      visibleFlow = (visibleFlow & ~USER_LAYER) as Visibility;
    }

    visibleFlag = visibleFlow;

    if (filterSet.has(ATTR_FILTER.VALUES.INCLUDE_SELF)) {
      visibleFlag = (visibleFlag | USER_LAYER) as Visibility;
    } else if (filterSet.has(ATTR_FILTER.VALUES.EXCLUDE_SELF)) {
      visibleFlag = (visibleFlag & ~USER_LAYER) as Visibility;
    }
  }

  // [[Select]] data attribute based selecting
  const selectData = element.dataset[ATTR_SELECT.KEY];
  if (selectData) {
    const selectSet = new Set(selectData.split(/\s+/));
    // error check
    for (const token of selectSet) {
      if (!ALLOWED_FILTERS.includes(token as any)) {
        throw new Error(
          `[MirageEngine] Invalid select token: '${token}'. ` +
            `Expected one of: 'include-tree', 'exclude-tree', 'include-self', 'exclude-self', 'end'.`,
        );
      }
    }

    if (selectSet.has(ATTR_SELECT.VALUES.END)) return null;

    if (
      selectSet.has(ATTR_SELECT.VALUES.INCLUDE_TREE) &&
      selectSet.has(ATTR_SELECT.VALUES.EXCLUDE_TREE)
    ) {
      throw new Error(
        `[MirageEngine] Conflicting selects: 'include-tree' and 'exclude-tree' cannot be used together on the same element.`,
      );
    }
    if (
      selectSet.has(ATTR_SELECT.VALUES.INCLUDE_SELF) &&
      selectSet.has(ATTR_SELECT.VALUES.EXCLUDE_SELF)
    ) {
      throw new Error(
        `[MirageEngine] Conflicting selects: 'include-self' and 'exclude-self' cannot be used together on the same element.`,
      );
    }

    if (selectSet.has(ATTR_SELECT.VALUES.INCLUDE_TREE)) {
      visibleFlow = (visibleFlow | SELECT_LAYER) as Visibility;
    } else if (selectSet.has(ATTR_SELECT.VALUES.EXCLUDE_TREE)) {
      visibleFlow = (visibleFlow & ~SELECT_LAYER) as Visibility;
    }

    visibleFlag = visibleFlow;

    if (selectSet.has(ATTR_SELECT.VALUES.INCLUDE_SELF)) {
      visibleFlag = (visibleFlag | SELECT_LAYER) as Visibility;
    } else if (selectSet.has(ATTR_SELECT.VALUES.EXCLUDE_SELF)) {
      visibleFlag = (visibleFlag & ~SELECT_LAYER) as Visibility;
    }
  }

  const travelData = element.dataset[ATTR_TRAVEL.KEY];
  let isTraveler = false;
  let nativeParsedStyles: any = inheritedNativeStyles
    ? { ...inheritedNativeStyles }
    : {};
  let nativeLayer: number | undefined = inheritedNativeLayer;
  if (travelData) {
    let explicitLayer = 1;

    // '{' 부터 '}' 까지의 JSON 문자열 추출
    const jsonStart = travelData.indexOf("{");
    const jsonEnd = travelData.lastIndexOf("}");

    let tokensPart = travelData;
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      tokensPart = travelData.substring(0, jsonStart).trim();
      const jsonStr = travelData.substring(jsonStart, jsonEnd + 1);
      try {
        // 싱글 쿼트를 더블 쿼트로 변경하거나 키에 따옴표가 없는 객체를 지원하기 위해
        // Function을 통한 안전한 객체 평가(또는 JSON.parse)를 사용
        nativeParsedStyles = new Function("return " + jsonStr)();
      } catch (e) {
        console.warn(
          `[MirageEngine] Failed to parse travel styles JSON: ${jsonStr}`,
        );
      }
    }

    const tokens = tokensPart.split(/\s+/);

    let hasTravelToken = false;

    const travelerIdx = tokens.indexOf(ATTR_TRAVEL.VALUES.TRAVELER);
    if (travelerIdx !== -1) {
      isTraveler = true;
      hasTravelToken = true;
      const nextToken = tokens[travelerIdx + 1];
      if (nextToken && !isNaN(parseInt(nextToken, 10))) {
        explicitLayer = parseInt(nextToken, 10);
      } else {
        const numToken = tokens.find((t) => !isNaN(parseInt(t, 10)));
        if (numToken) explicitLayer = parseInt(numToken, 10);
      }
    }

    const nativeIdx = tokens.indexOf(ATTR_TRAVEL.VALUES.NATIVE);
    if (nativeIdx !== -1) {
      const nextToken = tokens[nativeIdx + 1];
      if (nextToken && !isNaN(parseInt(nextToken, 10))) {
        nativeLayer = parseInt(nextToken, 10);
      } else if (!isTraveler) {
        const numToken = tokens.find((t) => !isNaN(parseInt(t, 10)));
        if (numToken) nativeLayer = parseInt(numToken, 10);
      }
    }

    // traveler만 명시된 레이어에 맞게 captureLayer 컨텍스트를 업데이트해야 함 (계층적 여행)
    if (hasTravelToken) {
      const targetCaptureLayer = explicitLayer + 1;
      if (targetCaptureLayer < captureLayer) {
        throw new Error(
          `[MirageEngine] Traveler layer (${explicitLayer}) cannot be smaller than inherited capture layer (${captureLayer - 1}).`,
        );
      }
      captureLayer = Math.min(targetCaptureLayer, ATTR_TRAVEL.MAX_LAYERS + 1);
    }
  }

  const shaderData = element.dataset[ATTR_SHADER.KEY];
  let shaderHooks: ShaderHooks | undefined;
  if (shaderData) {
    shaderHooks = JSON.parse(shaderData) as ShaderHooks;
    // [TODO] object 형태로 shader hooks 받기
    // [TODO] 변수형태로 저장해서 return scene node에 넣어주기
  }

  const rect = element.getBoundingClientRect();
  const computed = window.getComputedStyle(element);

  // Base Case
  if (rect.width === 0 || rect.height === 0 || computed.display === "none") {
    return null;
  }

  // [TODO] dataset 방식으로 변경
  let id = element.getAttribute("data-mid");
  if (!id) {
    id = Math.random().toString(36).substring(2, 11);
    element.setAttribute("data-mid", id);
  }

  const localZIndex = parseInt(computed.zIndex);
  const effectiveZIndex =
    (isNaN(localZIndex) ? 0 : localZIndex) + inheritedZIndex;
  // console.log(`${element.id}: ${computed.background}`);
  // console.log(computed.backgroundImage);
  let imageSrc: string | undefined;
  let nativeImageSrc: string | undefined;
  if (element.tagName === "IMG") {
    imageSrc = (element as HTMLImageElement).src;
  } else if (element.tagName.toLowerCase() === "svg") {
    const overrideColor = nativeParsedStyles?.color;
    const overrideFill = nativeParsedStyles?.fill;
    const overrideStroke = nativeParsedStyles?.stroke;
    const overrideOpacity = nativeParsedStyles?.opacity;

    const getSvgImageSrc = (useOverrides: boolean) => {
      const clone = element.cloneNode(true) as SVGSVGElement;
      
      const inlineSVGStyles = (orig: Element, cloned: Element) => {
        const computed = window.getComputedStyle(orig);
        const clonedHtml = cloned as HTMLElement;

        const isCurrentColorFill = computed.fill === computed.color;
        const isCurrentColorStroke = computed.stroke === computed.color;

        const fill = (useOverrides ? (overrideFill || (isCurrentColorFill ? overrideColor : undefined)) : undefined) || computed.fill;
        if (fill && fill !== "none") clonedHtml.style.fill = fill;

        const stroke = (useOverrides ? (overrideStroke || (isCurrentColorStroke ? overrideColor : undefined)) : undefined) || computed.stroke;
        if (stroke && stroke !== "none") clonedHtml.style.stroke = stroke;

        if (computed.strokeWidth && computed.strokeWidth !== "0px")
          clonedHtml.style.strokeWidth = computed.strokeWidth;

        const color = (useOverrides ? overrideColor : undefined) || computed.color;
        if (color) clonedHtml.style.color = color;

        const opacity = (useOverrides ? overrideOpacity : undefined) || computed.opacity;
        if (opacity && opacity !== "1") clonedHtml.style.opacity = opacity;

        for (let i = 0; i < orig.children.length; i++) {
          inlineSVGStyles(orig.children[i], cloned.children[i]);
        }
      };

      inlineSVGStyles(element, clone);

      const svgRect = element.getBoundingClientRect();
      const scale = window.devicePixelRatio * qualityFactor;

      if (!clone.hasAttribute("viewBox")) {
        clone.setAttribute("viewBox", `0 0 ${svgRect.width} ${svgRect.height}`);
      }

      clone.setAttribute("width", (svgRect.width * scale).toString());
      clone.setAttribute("height", (svgRect.height * scale).toString());

      let svgString = new XMLSerializer().serializeToString(clone);
      if (!svgString.includes("xmlns=")) {
        svgString = svgString.replace(
          "<svg",
          '<svg xmlns="http://www.w3.org/2000/svg"',
        );
      }
      return `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
    };

    imageSrc = getSvgImageSrc(false);
    if (nativeLayer !== undefined && (overrideColor || overrideFill || overrideStroke || overrideOpacity)) {
      nativeImageSrc = getSvgImageSrc(true);
    }
  } else if (computed.backgroundImage && computed.backgroundImage !== "none") {
    const match = computed.backgroundImage.match(/url\(['"]?(.*?)['"]?\)/);
    if (match) {
      imageSrc = match[1];
    }
  }

  // Base node uses pure DOM styles, unpolluted by travelerStyles
  const baseStyles: BoxStyles = {
    backgroundColor: computed.backgroundColor,
    backgroundImage: computed.backgroundImage,
    opacity:
      element.dataset[ATTR_DOM.KEY] === ATTR_DOM.VALUES.HIDE
        ? 1
        : parseFloat(computed.opacity),
    zIndex: effectiveZIndex,
    borderRadius: computed.borderRadius,
    borderColor: computed.borderColor,
    borderWidth: computed.borderWidth,
    boxShadow: computed.boxShadow,
    imageSrc,
    isTraveler: isTraveler,
  };

  const styles: BoxStyles = baseStyles;

  let textContent: string | undefined;
  let textStyles: TextStyles | undefined;
  const children: SceneNode[] = [];

  const nextClipElements =
    computed.overflow === "hidden"
      ? [...(inheritedClipElements || []), element]
      : inheritedClipElements;

  if (element.tagName.toLowerCase() !== "svg") {
    Array.from(element.childNodes).forEach((child) => {
      const visibleFlowToPass =
        child.nodeType === Node.TEXT_NODE ? visibleFlag : visibleFlow;
      const childNode = extractSceneGraph(
        child,
        initialMask,
        visibleFlowToPass,
        captureLayer,
        effectiveZIndex,
        qualityFactor,
        child.nodeType === Node.TEXT_NODE ? nativeLayer : undefined,
        child.nodeType === Node.TEXT_NODE && Object.keys(nativeParsedStyles).length > 0
          ? nativeParsedStyles
          : undefined,
        nextClipElements,
      );
      if (childNode) {
        children.push(childNode);
      }
    });
  }

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
    captureLayer,
    nativeLayer,
    nativeStyles:
      nativeLayer !== undefined
        ? {
            ...baseStyles,
            backgroundColor:
              nativeParsedStyles.backgroundColor ?? baseStyles.backgroundColor,
            backgroundImage:
              nativeParsedStyles.backgroundImage ?? baseStyles.backgroundImage,
            opacity: nativeParsedStyles.opacity ?? baseStyles.opacity,
            zIndex:
              nativeParsedStyles.zIndex !== undefined
                ? nativeParsedStyles.zIndex + effectiveZIndex
                : baseStyles.zIndex,
            borderRadius:
              nativeParsedStyles.borderRadius ?? baseStyles.borderRadius,
            borderColor:
              nativeParsedStyles.borderColor ?? baseStyles.borderColor,
            borderWidth:
              nativeParsedStyles.borderWidth ?? baseStyles.borderWidth,
            boxShadow:
              nativeParsedStyles.boxShadow ?? baseStyles.boxShadow,
            isTraveler: baseStyles.isTraveler,
            transform: nativeParsedStyles.transform,
            imageSrc: nativeImageSrc ?? imageSrc,
          }
        : undefined,
    nativeRect:
      nativeLayer !== undefined
        ? {
            x:
              nativeParsedStyles.x !== undefined
                ? parseFloat(nativeParsedStyles.x)
                : rect.left + window.scrollX,
            y:
              nativeParsedStyles.y !== undefined
                ? parseFloat(nativeParsedStyles.y)
                : rect.top + window.scrollY,
            width:
              nativeParsedStyles.width !== undefined
                ? parseFloat(nativeParsedStyles.width)
                : rect.width,
            height:
              nativeParsedStyles.height !== undefined
                ? parseFloat(nativeParsedStyles.height)
                : rect.height,
          }
        : undefined,
    isFixed: computed.position === "fixed",
    clipElements: inheritedClipElements,
    children,
    shaderHooks,
  };
}
