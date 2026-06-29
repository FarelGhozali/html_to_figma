import { FigmaNodeData, FigmaFrameNode, FigmaTextNode } from './types';

export interface DOMNodeHierarchy {
  element: Element | Node;
  children: DOMNodeHierarchy[];
}

export interface ExtractedStyles {
  width: number;
  height: number;
  isFlex: boolean;
  flexDirection?: 'ROW' | 'COLUMN';
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
  gap: number;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  color?: { r: number; g: number; b: number; a: number }; // Figma RGB 0-1
  lineHeight?: number;
  backgroundColor?: { r: number; g: number; b: number; a: number };
  justifyContent?: 'FLEX_START' | 'FLEX_END' | 'CENTER' | 'SPACE_BETWEEN';
  alignItems?: 'FLEX_START' | 'FLEX_END' | 'CENTER' | 'STRETCH';
  positioning?: 'AUTO' | 'ABSOLUTE';
  cornerRadius?: number;
  strokeColor?: { r: number; g: number; b: number; a: number };
  strokeWeight?: number;
}

/**
 * Pure Vanilla JavaScript function (enhanced with TypeScript types)
 * to recursively traverse the DOM Tree and validate elements.
 *
 * @param element The initial DOM element (usually document.body or main container)
 * @returns Basic object hierarchy structure or null if invalid
 */
export function traverseDOM(element: Element | Node): DOMNodeHierarchy | null {
  // 1. Ignore irrelevant Nodes (such as Comments which have nodeType 8)
  // Only process Element Nodes (1) and Text Nodes (3)
  if (element.nodeType !== Node.ELEMENT_NODE && element.nodeType !== Node.TEXT_NODE) {
    return null;
  }

  // 2. Strict Quality Check for Element Nodes
  if (element.nodeType === Node.ELEMENT_NODE) {
    const el = element as Element;
    const tagName = el.tagName.toUpperCase();

    // Ignore structural/injection tags that have no visual output
    const ignoredTags = ['SCRIPT', 'STYLE', 'META', 'NOSCRIPT'];
    if (ignoredTags.includes(tagName)) {
      return null;
    }

    // Check visibility using getComputedStyle
    // Ensure the element is actually visible on the screen
    try {
      const style = window.getComputedStyle(el);
      if (
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        parseFloat(style.opacity || '1') === 0
      ) {
        return null; // Skip this element and all its children
      }
    } catch (e) {
      // Fallback if the element is not connected to the DOM (e.g. DocumentFragment)
      console.warn('Failed to process style for element:', el);
    }
  } 
  // 3. Quality Check for Text Nodes
  else if (element.nodeType === Node.TEXT_NODE) {
    const textContent = element.textContent || '';
    // Ignore text that only contains spaces, tabs, or empty line-breaks
    if (textContent.trim() === '') {
      return null;
    }
  }

  // 4. Traverse the element's children
  const validChildren: DOMNodeHierarchy[] = [];
  const childNodes = element.childNodes; // childNodes includes both Element and Text Nodes

  for (let i = 0; i < childNodes.length; i++) {
    const childNode = childNodes[i];
    const parsedChild = traverseDOM(childNode);
    
    // If valid, insert into array
    if (parsedChild !== null) {
      validChildren.push(parsedChild);
    }
  }

  // 5. Return the basic object hierarchy structure
  return {
    element: element,
    children: validChildren
  };
}

/**
 * Helper to parse a pixel string to a float number.
 */
function parsePx(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Converts a browser CSS color string (rgb, rgba) to Figma's 0-1 RGBA format.
 */
export function rgbaToFigmaColor(rgbaString: string) {
  // Matches rgb(r, g, b) or rgba(r, g, b, a)
  const match = rgbaString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!match) return undefined;

  const r = parseInt(match[1], 10) / 255;
  const g = parseInt(match[2], 10) / 255;
  const b = parseInt(match[3], 10) / 255;
  const a = match[4] !== undefined ? parseFloat(match[4]) : 1;

  return { r, g, b, a };
}

/**
 * Extracts styling rules from a valid HTML Element.
 */
export function extractFigmaStyles(element: Element): ExtractedStyles {
  const rect = element.getBoundingClientRect();
  const win = element.ownerDocument.defaultView || window;
  const style = win.getComputedStyle(element);

  const result: ExtractedStyles = {
    width: rect.width,
    height: rect.height,
    isFlex: style.display === 'flex' || style.display === 'inline-flex',
    paddingTop: parsePx(style.paddingTop),
    paddingRight: parsePx(style.paddingRight),
    paddingBottom: parsePx(style.paddingBottom),
    paddingLeft: parsePx(style.paddingLeft),
    gap: parsePx(style.gap),
    positioning: (style.position === 'absolute' || style.position === 'fixed') ? 'ABSOLUTE' : 'AUTO'
  };

  if (style.backgroundColor && style.backgroundColor !== 'rgba(0, 0, 0, 0)' && style.backgroundColor !== 'transparent') {
    const parsedColor = rgbaToFigmaColor(style.backgroundColor);
    if (parsedColor) {
      result.backgroundColor = parsedColor;
    }
  }

  if (style.borderRadius) {
    const radius = parsePx(style.borderRadius);
    if (radius > 0) result.cornerRadius = radius;
  }

  if (style.borderWidth && style.borderWidth !== '0px') {
    const weight = parsePx(style.borderWidth);
    if (weight > 0) {
      result.strokeWeight = weight;
      if (style.borderColor) {
        const parsedStroke = rgbaToFigmaColor(style.borderColor);
        if (parsedStroke) result.strokeColor = parsedStroke;
      }
    }
  }

  if (result.isFlex) {
    result.flexDirection = style.flexDirection === 'column' ? 'COLUMN' : 'ROW';

    if (style.justifyContent === 'flex-end') result.justifyContent = 'FLEX_END';
    else if (style.justifyContent === 'center') result.justifyContent = 'CENTER';
    else if (style.justifyContent === 'space-between') result.justifyContent = 'SPACE_BETWEEN';
    else result.justifyContent = 'FLEX_START';

    if (style.alignItems === 'flex-end') result.alignItems = 'FLEX_END';
    else if (style.alignItems === 'center') result.alignItems = 'CENTER';
    else if (style.alignItems === 'stretch') result.alignItems = 'STRETCH';
    else result.alignItems = 'FLEX_START';
  }

  // Check if it has any text nodes as direct children to extract typography
  let hasText = false;
  for (let i = 0; i < element.childNodes.length; i++) {
    const child = element.childNodes[i];
    if (child.nodeType === Node.TEXT_NODE && (child.textContent || '').trim() !== '') {
      hasText = true;
      break;
    }
  }

  if (hasText) {
    result.fontFamily = style.fontFamily;
    result.fontSize = parsePx(style.fontSize);
    result.fontWeight = style.fontWeight;
    
    if (style.lineHeight && style.lineHeight !== 'normal') {
      result.lineHeight = parsePx(style.lineHeight);
    }
    
    if (style.color) {
      const parsedColor = rgbaToFigmaColor(style.color);
      if (parsedColor) {
        result.color = parsedColor;
      }
    }
  }

  return result;
}

/**
 * Yields execution to the main thread to prevent UI blocking.
 */
const yieldToMain = () => new Promise(resolve => requestAnimationFrame(resolve));

/**
 * Main function to traverse the DOM, extract styles, and generate Figma JSON.
 * Executes asynchronously using requestAnimationFrame to avoid UI blocking.
 * 
 * @param rootElementId The ID of the root element to start traversal from.
 */
export async function generateFigmaJSON(rootElement: Element): Promise<FigmaNodeData | null> {
  async function buildNodeData(element: Element | Node): Promise<FigmaNodeData | null> {
    await yieldToMain(); // Prevent blocking

    // 1. Basic validation
    if (element.nodeType !== Node.ELEMENT_NODE && element.nodeType !== Node.TEXT_NODE) {
      return null;
    }

    if (element.nodeType === Node.ELEMENT_NODE) {
      const el = element as Element;
      const tagName = el.tagName.toUpperCase();

      const ignoredTags = ['SCRIPT', 'STYLE', 'META', 'NOSCRIPT'];
      if (ignoredTags.includes(tagName)) return null;

      try {
        const win = el.ownerDocument.defaultView || window;
        const style = win.getComputedStyle(el);
        if (
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          parseFloat(style.opacity || '1') === 0
        ) {
          return null;
        }
      } catch (e) {
        return null;
      }

      // Valid Element -> Map to FRAME
      const extractedStyles = extractFigmaStyles(el);
      
      const frameNode: FigmaFrameNode = {
        type: 'FRAME',
        name: el.id ? `#${el.id}` : tagName,
        backgroundColor: extractedStyles.backgroundColor,
        cornerRadius: extractedStyles.cornerRadius,
        strokeColor: extractedStyles.strokeColor,
        strokeWeight: extractedStyles.strokeWeight,
        layout: {
          widthMode: 'FIXED', 
          heightMode: 'FIXED',
          width: extractedStyles.width,
          height: extractedStyles.height,
          flexDirection: extractedStyles.flexDirection,
          gap: extractedStyles.gap,
          paddingTop: extractedStyles.paddingTop,
          paddingRight: extractedStyles.paddingRight,
          paddingBottom: extractedStyles.paddingBottom,
          paddingLeft: extractedStyles.paddingLeft,
          justifyContent: extractedStyles.justifyContent,
          alignItems: extractedStyles.alignItems,
          positioning: extractedStyles.positioning,
        },
        children: []
      };

      const childNodes = element.childNodes;
      for (let i = 0; i < childNodes.length; i++) {
        const childData = await buildNodeData(childNodes[i]);
        if (childData) {
          frameNode.children!.push(childData);
        }
      }

      return frameNode;

    } else if (element.nodeType === Node.TEXT_NODE) {
      const textContent = element.textContent || '';
      if (textContent.trim() === '') return null;

      const parentEl = element.parentElement;
      if (!parentEl) return null;

      const parentStyles = extractFigmaStyles(parentEl);
      
      const textNode: FigmaTextNode = {
        type: 'TEXT',
        name: 'Text',
        characters: textContent.trim(),
        layout: {
          widthMode: 'HUG',
          heightMode: 'HUG'
        },
        typography: {
          fontFamily: parentStyles.fontFamily || 'Inter',
          fontSize: parentStyles.fontSize || 16,
          fontWeight: parentStyles.fontWeight || 'Regular',
          lineHeight: parentStyles.lineHeight,
          color: parentStyles.color || { r: 0, g: 0, b: 0, a: 1 }
        }
      };

      return textNode;
    }

    return null;
  }

  return await buildNodeData(rootElement);
}
