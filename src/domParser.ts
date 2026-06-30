import { FigmaNodeData, FigmaFrameNode, FigmaTextNode, FigmaSvgNode, TextSegment } from './types';

export interface DOMNodeHierarchy {
  element: Element | Node;
  children: DOMNodeHierarchy[];
}

export interface ExtractedStyles {
  width: number;
  height: number;
  viewportX: number;
  viewportY: number;
  isFlex: boolean;
  isWidthAuto: boolean;
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
  letterSpacing?: number;
  backgroundColor?: { r: number; g: number; b: number; a: number };
  gradientFill?: {
    type: 'LINEAR';
    angle: number;
    stops: { color: { r: number; g: number; b: number; a: number }; position: number }[];
  };
  justifyContent?: 'FLEX_START' | 'FLEX_END' | 'CENTER' | 'SPACE_BETWEEN';
  alignItems?: 'FLEX_START' | 'FLEX_END' | 'CENTER' | 'STRETCH';
  positioning?: 'AUTO' | 'ABSOLUTE';
  cornerRadius?: number;
  strokeColor?: { r: number; g: number; b: number; a: number };
  strokeWeight?: number;
  strokeDashPattern?: number[];
  strokeAlign?: 'INSIDE' | 'OUTSIDE' | 'CENTER';
  boxShadow?: {
    offsetX: number;
    offsetY: number;
    blur: number;
    spread: number;
    color: { r: number; g: number; b: number; a: number };
  };
  backgroundBlur?: number;
  opacity?: number;
  textAlign?: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED';
  imageUrls?: string[];
  isGrid?: boolean;
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
    const ignoredTags = [
      'SCRIPT',
      'STYLE',
      'META',
      'NOSCRIPT',
      'BR',
      'HR',
      'SVG',
      'CANVAS',
      'VIDEO',
      'AUDIO',
      'IFRAME',
      'LINK',
      'HEAD',
      'TITLE',
      'OPTION',
    ];
    if (ignoredTags.includes(tagName)) {
      return null;
    }

    // Check visibility using getComputedStyle
    // Ensure the element is actually visible on the screen
    try {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') {
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
    children: validChildren,
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
  // Matches rgb/rgba with commas (CSS3) or spaces (CSS4), e.g., rgb(255, 255, 255) or rgb(255 255 255) or rgba(255 255 255 / 0.5)
  const match = rgbaString.match(
    /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:(?:,|\/)\s*([\d.]+))?\s*\)/,
  );
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

  // Detect if width is naturally 'auto' (shrink-to-fit or stretch)
  // We do this by temporarily overriding width to auto and seeing if the computed width changes
  const originalWidth = (element as HTMLElement).style.getPropertyValue('width');
  const originalWidthPriority = (element as HTMLElement).style.getPropertyPriority('width');

  (element as HTMLElement).style.setProperty('width', 'auto', 'important');
  const autoStyle = win.getComputedStyle(element);
  const autoWidth = autoStyle.width;

  (element as HTMLElement).style.setProperty('width', originalWidth, originalWidthPriority);
  if (!originalWidth) (element as HTMLElement).style.removeProperty('width');

  const isWidthAuto = Math.abs(parseFloat(style.width) - parseFloat(autoWidth)) < 1;

  const result: ExtractedStyles = {
    width: rect.width,
    height: rect.height,
    viewportX: rect.left,
    viewportY: rect.top,
    isFlex: style.display === 'flex' || style.display === 'inline-flex',
    isWidthAuto: isWidthAuto,
    paddingTop: parsePx(style.paddingTop),
    paddingRight: parsePx(style.paddingRight),
    paddingBottom: parsePx(style.paddingBottom),
    paddingLeft: parsePx(style.paddingLeft),
    gap: parsePx(style.gap),
    positioning: style.position === 'absolute' || style.position === 'fixed' ? 'ABSOLUTE' : 'AUTO',
  };

  // Compute actual effective gap from rendered child positions.
  // This accounts for CSS gap + child margins combined, giving accurate spacing.
  if (element.children.length > 1) {
    let totalGap = 0;
    let gapCount = 0;

    for (let i = 0; i < element.children.length - 1; i++) {
      const currentRect = element.children[i].getBoundingClientRect();
      const nextRect = element.children[i + 1].getBoundingClientRect();

      let measuredGap: number;
      if (result.isFlex && result.flexDirection === 'ROW') {
        measuredGap = nextRect.left - currentRect.right;
      } else {
        // Column flex or block containers: vertical gap
        measuredGap = nextRect.top - currentRect.bottom;
      }

      if (measuredGap > 0) {
        totalGap += measuredGap;
        gapCount++;
      }
    }

    if (gapCount > 0) {
      result.gap = Math.round(totalGap / gapCount);
    }
  }

  // Background color (solid)
  if (
    style.backgroundColor &&
    style.backgroundColor !== 'rgba(0, 0, 0, 0)' &&
    style.backgroundColor !== 'transparent'
  ) {
    const parsedColor = rgbaToFigmaColor(style.backgroundColor);
    // Also check for CSS4 format: rgba(0 0 0 / 0) which our regex matches but results in a=0
    if (parsedColor && parsedColor.a > 0) {
      result.backgroundColor = parsedColor;
    }
  }

  // Gradient background (linear-gradient)
  const bgImage = style.backgroundImage;
  if (bgImage && bgImage !== 'none' && bgImage.includes('linear-gradient')) {
    // Parse: linear-gradient(135deg, rgb(240, 171, 252), rgb(59, 130, 246))
    // The browser computes hex colors to rgb() format
    const angleMatch = bgImage.match(/linear-gradient\(\s*(\d+)deg/);
    const angle = angleMatch ? parseInt(angleMatch[1], 10) : 180;

    // Extract all color stops
    const colorStopRegex = /rgba?\([^)]+\)(?:\s+[\d.]+%)?/g;
    const colorMatches = bgImage.match(colorStopRegex);

    if (colorMatches && colorMatches.length >= 2) {
      const stops: { color: { r: number; g: number; b: number; a: number }; position: number }[] =
        [];

      for (let i = 0; i < colorMatches.length; i++) {
        const colorStr = colorMatches[i];
        const parsedColor = rgbaToFigmaColor(colorStr);
        // Extract position percentage if present, otherwise distribute evenly
        const posMatch = colorStr.match(/([\d.]+)%/);
        const position = posMatch ? parseFloat(posMatch[1]) / 100 : i / (colorMatches.length - 1);

        if (parsedColor) {
          stops.push({ color: parsedColor, position });
        }
      }

      if (stops.length >= 2) {
        result.gradientFill = { type: 'LINEAR', angle, stops };
      }
    }
  }

  // Background Image (url(...))
  if (bgImage && bgImage !== 'none' && bgImage.includes('url(')) {
    // There can be multiple comma-separated background images, but we'll extract all url() contents
    const urlRegex = /url\(['"]?(.*?)['"]?\)/g;
    let urlMatch;
    while ((urlMatch = urlRegex.exec(bgImage)) !== null) {
      if (urlMatch[1] && !urlMatch[1].startsWith('data:')) {
        if (!result.imageUrls) result.imageUrls = [];
        result.imageUrls.push(urlMatch[1]);
      }
    }
  }

  // <img src="..."> tags
  if (element.tagName.toLowerCase() === 'img') {
    const src = (element as HTMLImageElement).src;
    // Discard base64 inline images for now as they are too huge and can cause postMessage to fail if very large
    if (src && !src.startsWith('data:')) {
      if (!result.imageUrls) result.imageUrls = [];
      result.imageUrls.push(src);
    }
  }

  // Box shadow
  if (style.boxShadow && style.boxShadow !== 'none') {
    // Parse: rgba(0, 0, 0, 0.1) 0px 10px 30px 0px
    // or: rgb(0 0 0 / 0.1) 0px 10px 30px 0px
    const shadowColorMatch = style.boxShadow.match(/rgba?\([^)]+\)/);
    if (shadowColorMatch) {
      const shadowColor = rgbaToFigmaColor(shadowColorMatch[0]);
      // Extract numeric values after the color
      const afterColor = style.boxShadow.substring(
        shadowColorMatch.index! + shadowColorMatch[0].length,
      );
      const nums = afterColor.match(/-?[\d.]+px/g);

      if (shadowColor && nums && nums.length >= 2) {
        result.boxShadow = {
          offsetX: parsePx(nums[0]),
          offsetY: parsePx(nums[1]),
          blur: nums[2] ? parsePx(nums[2]) : 0,
          spread: nums[3] ? parsePx(nums[3]) : 0,
          color: shadowColor,
        };
      }
    }
  }

  // Backdrop filter (blur effect for glassmorphism)
  const backdropFilter = style.backdropFilter || (style as any).webkitBackdropFilter;
  if (backdropFilter && backdropFilter !== 'none') {
    const blurMatch = backdropFilter.match(/blur\(([\d.]+)px\)/);
    if (blurMatch) {
      result.backgroundBlur = parseFloat(blurMatch[1]);
    }
  }

  // Element opacity
  if (style.opacity && style.opacity !== '1') {
    const opacityVal = parseFloat(style.opacity);
    if (!isNaN(opacityVal) && opacityVal < 1) {
      result.opacity = opacityVal;
    }
  }

  if (style.borderRadius) {
    const radius = parsePx(style.borderRadius);
    if (radius > 0) result.cornerRadius = radius;
  }

  const btw = parsePx(style.borderTopWidth);
  const bbw = parsePx(style.borderBottomWidth);
  const blw = parsePx(style.borderLeftWidth);
  const brw = parsePx(style.borderRightWidth);
  const bw = Math.max(btw, bbw, blw, brw);
  
  if (bw > 0) {
    result.strokeWeight = bw;
    result.strokeAlign = 'INSIDE'; // CSS borders are always inside
    
    // Pick the color of the thickest border, or fallback
    const bc = style.borderBottomColor || style.borderTopColor || style.borderColor;
    if (bc) {
      const parsedStroke = rgbaToFigmaColor(bc);
      if (parsedStroke) result.strokeColor = parsedStroke;
    }
    // Extract border-style for dashed/dotted patterns
    const borderStyle = style.borderBottomStyle || style.borderTopStyle || style.borderStyle;
    if (borderStyle === 'dashed') {
      // Dashed: segments roughly 3x the stroke weight, gaps 3x the stroke weight
      result.strokeDashPattern = [bw * 3, bw * 3];
    } else if (borderStyle === 'dotted') {
      // Dotted: segments equal to stroke weight, gaps equal to stroke weight
      result.strokeDashPattern = [bw, bw];
    }
  }

  // Detect CSS Grid layout (treat as vertical for Figma purposes)
  if (style.display === 'grid' || style.display === 'inline-grid') {
    result.isGrid = true;
  }

  if (result.isFlex) {
    result.flexDirection = style.flexDirection === 'column' ? 'COLUMN' : 'ROW';

    if (style.justifyContent === 'flex-end') result.justifyContent = 'FLEX_END';
    else if (style.justifyContent === 'center') result.justifyContent = 'CENTER';
    else if (style.justifyContent === 'space-between') result.justifyContent = 'SPACE_BETWEEN';
    else result.justifyContent = 'FLEX_START';

    if (style.alignItems === 'flex-end') result.alignItems = 'FLEX_END';
    else if (style.alignItems === 'center') result.alignItems = 'CENTER';
    else if (style.alignItems === 'flex-start') result.alignItems = 'FLEX_START';
    else result.alignItems = 'STRETCH'; // CSS default align-items is 'stretch'
  }

  // Extract text-align (important for centered headings, hero sections, etc.)
  if (style.textAlign) {
    if (style.textAlign === 'center') result.textAlign = 'CENTER';
    else if (style.textAlign === 'right' || style.textAlign === 'end') result.textAlign = 'RIGHT';
    else if (style.textAlign === 'justify') result.textAlign = 'JUSTIFIED';
    else result.textAlign = 'LEFT';
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
  // 4. Extract Text Styles (Always extract for elements that typically contain text or if hasText is true)
  const isTextElement = [
    'H1',
    'H2',
    'H3',
    'H4',
    'H5',
    'H6',
    'P',
    'SPAN',
    'A',
    'STRONG',
    'B',
    'EM',
    'I',
    'BUTTON',
    'LABEL',
  ].includes(element.tagName);
  if (hasText || isTextElement) {
    // Parse font-family: get first font and map generics
    let family = style.fontFamily.replace(/['"]/g, '').split(',')[0].trim();
    if (family.toLowerCase() === 'sans-serif') family = 'Arial';
    else if (family.toLowerCase() === 'serif') family = 'Times New Roman';
    else if (family.toLowerCase() === 'monospace') family = 'Courier New';
    result.fontFamily = family;

    result.fontSize = parsePx(style.fontSize);

    // Extract font-weight properly
    let weight = style.fontWeight;
    if (weight === 'bold') weight = '700';
    else if (weight === 'normal') weight = '400';

    // Map numerical weights to Figma strings
    const weightNum = parseInt(weight, 10);
    if (!isNaN(weightNum)) {
      if (weightNum <= 300) result.fontWeight = 'Light';
      else if (weightNum === 400) result.fontWeight = 'Regular';
      else if (weightNum === 500) result.fontWeight = 'Medium';
      else if (weightNum === 600) result.fontWeight = 'Semi Bold';
      else if (weightNum === 700) result.fontWeight = 'Bold';
      else if (weightNum >= 800) result.fontWeight = 'Extra Bold';
      else result.fontWeight = 'Regular';
    } else {
      result.fontWeight = 'Regular';
    }

    if (style.lineHeight && style.lineHeight !== 'normal') {
      result.lineHeight = parsePx(style.lineHeight);
    }

    if (style.letterSpacing && style.letterSpacing !== 'normal') {
      result.letterSpacing = parsePx(style.letterSpacing);
    }

    if (style.color) {
      const parsedColor = rgbaToFigmaColor(style.color);
      if (parsedColor) {
        // Handle transparent text: CSS tricks like -webkit-text-fill-color: transparent
        // or color: transparent with -webkit-text-stroke are used for gradient text or
        // outlined text effects. Figma doesn't support these, so we need a fallback.
        if (
          parsedColor.a === 0 ||
          (parsedColor.r === 0 && parsedColor.g === 0 && parsedColor.b === 0 && parsedColor.a === 0)
        ) {
          // Check for -webkit-text-fill-color: transparent (gradient clip text)
          const textFillColor = (style as any).webkitTextFillColor;
          if (textFillColor === 'transparent' || textFillColor === 'rgba(0, 0, 0, 0)') {
            // This is likely gradient text (-webkit-background-clip: text)
            // Try to extract the first color from the background gradient
            const bgImage = style.backgroundImage;
            if (bgImage && bgImage.includes('linear-gradient')) {
              const gradColorMatch = bgImage.match(/rgba?\([^)]+\)/);
              if (gradColorMatch) {
                const gradColor = rgbaToFigmaColor(gradColorMatch[0]);
                if (gradColor && gradColor.a > 0) {
                  result.color = gradColor;
                } else {
                  result.color = { r: 1, g: 1, b: 1, a: 1 }; // white fallback
                }
              } else {
                result.color = { r: 1, g: 1, b: 1, a: 1 };
              }
            } else {
              // Check for -webkit-text-stroke (outlined text)
              const textStroke = (style as any).webkitTextStrokeColor;
              if (textStroke) {
                const strokeColor = rgbaToFigmaColor(textStroke);
                if (strokeColor && strokeColor.a > 0) {
                  result.color = strokeColor;
                } else {
                  result.color = { r: 1, g: 1, b: 1, a: 1 };
                }
              } else {
                result.color = { r: 1, g: 1, b: 1, a: 1 };
              }
            }
          } else {
            // Regular transparent color, just use white as fallback
            result.color = { r: 1, g: 1, b: 1, a: 1 };
          }
        } else {
          result.color = parsedColor;
        }
      }
    }
  }

  return result;
}

const INLINE_TAGS = [
  'SPAN', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'SMALL', 'SUB', 'SUP', 'MARK', 'CODE', 'LABEL', 'A'
];

/**
 * Determines if an element contains ONLY text nodes and inline tags.
 */
function isTextContainer(element: Element): boolean {
  if (element.childNodes.length === 0) return false;
  
  for (let i = 0; i < element.childNodes.length; i++) {
    const child = element.childNodes[i];
    if (child.nodeType === Node.TEXT_NODE) {
      continue;
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const tagName = (child as Element).tagName.toUpperCase();
      if (tagName === 'BR') continue;
      if (INLINE_TAGS.includes(tagName)) {
        if (!isTextContainer(child as Element)) {
          return false;
        }
      } else {
        return false; // Found a block-level element
      }
    } else {
      return false; // Comments, etc.
    }
  }
  return true;
}

/**
 * Recursively extracts text segments from a node.
 */
function extractTextSegments(node: Node): TextSegment[] {
  let segments: TextSegment[] = [];

  if (node.nodeType === Node.TEXT_NODE) {
    const textContent = node.textContent;
    if (!textContent) return [];
    
    // Replace newlines/tabs with spaces, but don't fully trim as spaces between tags matter
    const collapsedWhitespace = textContent.replace(/[\n\t\r]+/g, ' ');
    if (collapsedWhitespace === '') return []; // Only whitespace that collapsed to empty? Actually replace gives ' ' if it was just whitespace.
    // Wait, let's keep all spaces. If it's pure whitespace and next to block boundary, HTML collapses it, but for inline it keeps at least one space.

    const parentEl = node.parentElement;
    if (parentEl) {
      const extracted = extractFigmaStyles(parentEl);
      segments.push({
        characters: collapsedWhitespace,
        typography: {
          fontFamily: extracted.fontFamily || 'Inter',
          fontSize: extracted.fontSize || 16,
          fontWeight: extracted.fontWeight || 'Regular',
          lineHeight: extracted.lineHeight,
          letterSpacing: extracted.letterSpacing,
          color: extracted.color || { r: 0, g: 0, b: 0, a: 1 },
          textAlignHorizontal: extracted.textAlign,
        }
      });
    }
  } else if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as Element;
    const tagName = el.tagName.toUpperCase();
    
    if (tagName === 'BR') {
      const parentEl = el.parentElement;
      if (parentEl) {
        const extracted = extractFigmaStyles(parentEl);
        segments.push({
          characters: '\n',
          typography: {
            fontFamily: extracted.fontFamily || 'Inter',
            fontSize: extracted.fontSize || 16,
            fontWeight: extracted.fontWeight || 'Regular',
            lineHeight: extracted.lineHeight,
            letterSpacing: extracted.letterSpacing,
            color: extracted.color || { r: 0, g: 0, b: 0, a: 1 },
            textAlignHorizontal: extracted.textAlign,
          }
        });
      }
    } else {
      for (let i = 0; i < el.childNodes.length; i++) {
        segments = segments.concat(extractTextSegments(el.childNodes[i]));
      }
    }
  }

  return segments;
}

/**
 * Yields execution to the main thread to prevent UI blocking.
 */
const yieldToMain = () => new Promise((resolve) => requestAnimationFrame(resolve));

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

      const ignoredTags = [
        'SCRIPT',
        'STYLE',
        'META',
        'NOSCRIPT',
        'BR',
        'HR',
        'SVG',
        'CANVAS',
        'VIDEO',
        'AUDIO',
        'IFRAME',
        'LINK',
        'HEAD',
        'TITLE',
        'OPTION',
      ];
      if (ignoredTags.includes(tagName)) return null;

      try {
        const win = el.ownerDocument.defaultView || window;
        const style = win.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') {
          return null;
        }

        const elStyles = extractFigmaStyles(el);
        
        // If an element contains only text nodes and inline elements (like paragraphs, headings),
        // we can flatten it into a single FigmaTextNode with segments for rich text formatting.
        // This ensures the text wraps naturally instead of stacking as vertical blocks.
        if (isTextContainer(el)) {
          // Do NOT flatten if the element has background, padding, or borders!
          // It needs to be a FRAME to render these visual properties.
          const hasVisualContainerProperties =
            elStyles.backgroundColor !== undefined ||
            (elStyles.paddingTop !== undefined && elStyles.paddingTop > 0) ||
            (elStyles.paddingLeft !== undefined && elStyles.paddingLeft > 0) ||
            (elStyles.cornerRadius !== undefined && elStyles.cornerRadius > 0) ||
            (elStyles.strokeWeight !== undefined && elStyles.strokeWeight > 0) ||
            elStyles.boxShadow !== undefined;

          if (!hasVisualContainerProperties) {
            const segments = extractTextSegments(el);
            
            // Clean up leading/trailing whitespace across the segments
            if (segments.length > 0) {
              segments[0].characters = segments[0].characters.replace(/^\s+/, '');
              segments[segments.length - 1].characters = segments[segments.length - 1].characters.replace(/\s+$/, '');
            }
            
            // Filter out empty segments after trim
            const validSegments = segments.filter(s => s.characters.length > 0);
            
            if (validSegments.length > 0) {
              const fullText = validSegments.map(s => s.characters).join('');
              
              const textNode: FigmaTextNode = {
                type: 'TEXT',
                name: 'TextContainer',
                characters: fullText,
                segments: validSegments,
                layout: {
                  widthMode: elStyles.isWidthAuto && !['H1','H2','H3','H4','H5','H6','P'].includes(tagName) ? 'HUG' : 'FILL',
                  heightMode: 'HUG',
                },
                typography: {
                  fontFamily: elStyles.fontFamily || 'Inter',
                  fontSize: elStyles.fontSize || 16,
                  fontWeight: elStyles.fontWeight || 'Regular',
                  lineHeight: elStyles.lineHeight,
                  letterSpacing: elStyles.letterSpacing,
                  color: elStyles.color || { r: 0, g: 0, b: 0, a: 1 },
                  textAlignHorizontal: elStyles.textAlign,
                },
              };
              return textNode;
            } else {
              return null; // Empty container
            }
          }
        }
      } catch (e) {
        return null;
      }

      // Valid Element -> Map to FRAME
      const extractedStyles = extractFigmaStyles(el);
      const win = el.ownerDocument.defaultView || window;
      const style = win.getComputedStyle(el);

      // For non-flex block elements, treat as vertical auto layout (COLUMN)
      // This ensures children stack vertically like normal CSS block flow
      let effectiveFlexDirection = extractedStyles.flexDirection;
      let effectiveJustifyContent = extractedStyles.justifyContent;
      let effectiveAlignItems = extractedStyles.alignItems;

      if (!extractedStyles.isFlex && !extractedStyles.isGrid) {
        // Special handling for tables
        if (tagName === 'TR' || style.display === 'table-row') {
          // Table rows are horizontal
          effectiveFlexDirection = 'ROW';
          effectiveJustifyContent = 'FLEX_START'; // Cells have fixed widths from DOM, so pack them
          effectiveAlignItems = 'CENTER'; // Typical table row alignment
        } else {
          // Block elements flow vertically by default
          effectiveFlexDirection = 'COLUMN';
          effectiveJustifyContent = 'FLEX_START';
        }
        
        // If text-align is center, set alignItems to CENTER for the cross axis
        if (extractedStyles.textAlign === 'CENTER') {
          effectiveAlignItems = 'CENTER';
        } else if (extractedStyles.textAlign === 'RIGHT') {
          effectiveAlignItems = 'FLEX_END';
        } else {
          // Detect horizontal centering (e.g. margin: 0 auto) by checking the first child's bounds
          let isCentered = false;
          if (effectiveFlexDirection === 'COLUMN' && el.children.length > 0) {
            const parentRect = el.getBoundingClientRect();
            const childRect = el.children[0].getBoundingClientRect();
            
            // Allow for parent padding when calculating margins
            const leftMargin = childRect.left - (parentRect.left + extractedStyles.paddingLeft);
            const rightMargin = (parentRect.right - extractedStyles.paddingRight) - childRect.right;
            
            // If both margins are positive and approximately equal (within 5px tolerance)
            if (leftMargin > 0 && rightMargin > 0 && Math.abs(leftMargin - rightMargin) < 5) {
              isCentered = true;
            }
          }
          
          effectiveAlignItems = isCentered ? 'CENTER' : 'FLEX_START';
        }
      } else if (extractedStyles.isGrid) {
        // CSS Grid: detect whether children are arranged horizontally or vertically
        // by comparing the bounding rects of the first two visible children
        const visibleChildren = Array.from(el.children).filter((child) => {
          const cs = win.getComputedStyle(child);
          return cs.display !== 'none' && cs.visibility !== 'hidden';
        });

        if (visibleChildren.length >= 2) {
          const firstRect = visibleChildren[0].getBoundingClientRect();
          const secondRect = visibleChildren[1].getBoundingClientRect();
          // If second child is to the right (same vertical position), it's a row layout
          if (
            Math.abs(firstRect.top - secondRect.top) < 10 &&
            secondRect.left > firstRect.right - 5
          ) {
            effectiveFlexDirection = 'ROW';
            effectiveAlignItems = 'FLEX_START';
          } else {
            effectiveFlexDirection = 'COLUMN';
            effectiveAlignItems = 'FLEX_START';
          }
        } else {
          effectiveFlexDirection = 'COLUMN';
          effectiveAlignItems = 'FLEX_START';
        }
      }

      const frameNode: FigmaFrameNode = {
        type: 'FRAME',
        name: el.id ? `#${el.id}` : tagName,
        backgroundColor: extractedStyles.backgroundColor,
        gradientFill: extractedStyles.gradientFill,
        cornerRadius: extractedStyles.cornerRadius,
        strokeColor: extractedStyles.strokeColor,
        strokeWeight: extractedStyles.strokeWeight,
        strokeDashPattern: extractedStyles.strokeDashPattern,
        strokeAlign: extractedStyles.strokeAlign,
        boxShadow: extractedStyles.boxShadow,
        backgroundBlur: extractedStyles.backgroundBlur,
        opacity: extractedStyles.opacity,
        ...(extractedStyles.imageUrls && ({ imageUrls: extractedStyles.imageUrls } as any)),
        layout: {
          widthMode:
            extractedStyles.isWidthAuto &&
            style.display.includes('inline') &&
            !['INPUT', 'TEXTAREA', 'SELECT'].includes(tagName)
              ? 'HUG'
              : 'FIXED',
          heightMode:
            style.display.includes('inline') && !['INPUT', 'TEXTAREA', 'SELECT'].includes(tagName)
              ? 'HUG'
              : 'FIXED',
          width: extractedStyles.width,
          height: extractedStyles.height,
          flexDirection: effectiveFlexDirection,
          gap: extractedStyles.gap,
          paddingTop: extractedStyles.paddingTop,
          paddingRight: extractedStyles.paddingRight,
          paddingBottom: extractedStyles.paddingBottom,
          paddingLeft: extractedStyles.paddingLeft,
          clipsContent:
            style.overflow.includes('hidden') ||
            style.overflow.includes('scroll') ||
            style.overflow.includes('auto'),
          justifyContent: effectiveJustifyContent,
          alignItems: effectiveAlignItems,
          positioning: extractedStyles.positioning,
          x: el.parentElement
            ? extractedStyles.viewportX - el.parentElement.getBoundingClientRect().left
            : 0,
          y: el.parentElement
            ? extractedStyles.viewportY - el.parentElement.getBoundingClientRect().top
            : 0,
        },
        children: [],
      };

      const childNodes = element.childNodes;
      for (let i = 0; i < childNodes.length; i++) {
        const childData = await buildNodeData(childNodes[i]);
        if (childData) {
          frameNode.children!.push(childData);
        }
      }

      // Special handling for form inputs without text node children
      if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') {
        let textValue = '';
        let injectCheckmark = false;
        let injectDropdownArrow = false;
        let injectResizeHandle = false;

        if (tagName === 'INPUT') {
          const inputEl = el as HTMLInputElement;
          if (inputEl.type === 'checkbox' || inputEl.type === 'radio') {
            if (inputEl.checked) {
              frameNode.backgroundColor = extractedStyles.color || { r: 0.31, g: 0.27, b: 0.89, a: 1 };
              injectCheckmark = true;
            }
          } else {
            textValue = inputEl.value || inputEl.placeholder || '';
          }
        } else if (tagName === 'TEXTAREA') {
          const taEl = el as HTMLTextAreaElement;
          textValue = taEl.value || taEl.placeholder || '';
          
          const taStyle = window.getComputedStyle(taEl);
          if (taStyle.resize !== 'none') {
            injectResizeHandle = true;
          }
        } else if (tagName === 'SELECT') {
          const selEl = el as HTMLSelectElement;
          textValue = selEl.options[selEl.selectedIndex]?.text || '';
          injectDropdownArrow = true;
        }

        if (textValue && frameNode.children!.length === 0) {
          const textNode: FigmaTextNode = {
            type: 'TEXT',
            name: 'Value',
            characters: textValue,
            layout: {
              widthMode: 'FILL',
              heightMode: 'HUG',
            },
            typography: {
              fontFamily: extractedStyles.fontFamily || 'Inter',
              fontSize: extractedStyles.fontSize || 14,
              fontWeight: extractedStyles.fontWeight || 'Regular',
              lineHeight: extractedStyles.lineHeight,
              color: extractedStyles.color || { r: 0, g: 0, b: 0, a: 1 },
              textAlignHorizontal: extractedStyles.textAlign,
            },
          };
          frameNode.children!.push(textNode);
        }

        if (injectCheckmark && frameNode.children!.length === 0) {
          const checkNode: FigmaSvgNode = {
            type: 'SVG',
            name: 'Checkmark',
            svgContent: `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
            layout: { widthMode: 'FIXED', heightMode: 'FIXED', width: 10, height: 10 },
          };
          frameNode.children!.push(checkNode);
          frameNode.layout.alignItems = 'CENTER';
          frameNode.layout.justifyContent = 'CENTER';
        }

        if (injectDropdownArrow && frameNode.children!.length === 1) {
          const colorObj = extractedStyles.color || { r: 0, g: 0, b: 0, a: 1 };
          const r = Math.round(colorObj.r * 255).toString(16).padStart(2, '0');
          const g = Math.round(colorObj.g * 255).toString(16).padStart(2, '0');
          const b = Math.round(colorObj.b * 255).toString(16).padStart(2, '0');
          const hexColor = `#${r}${g}${b}`;

          const arrowNode: FigmaSvgNode = {
            type: 'SVG',
            name: 'DropdownChevron',
            svgContent: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${hexColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`,
            layout: { widthMode: 'FIXED', heightMode: 'FIXED', width: 12, height: 12 },
          };
          frameNode.children!.push(arrowNode);
          frameNode.layout.flexDirection = 'ROW';
          frameNode.layout.justifyContent = 'SPACE_BETWEEN';
          frameNode.layout.alignItems = 'CENTER';
        }
        
        if (injectResizeHandle) {
          const resizeNode: FigmaSvgNode = {
            type: 'SVG',
            name: 'ResizeHandle',
            svgContent: `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#C0C0C0" stroke-width="1.5"><line x1="10" y1="2" x2="2" y2="10"></line><line x1="10" y1="6" x2="6" y2="10"></line></svg>`,
            layout: { 
              widthMode: 'FIXED', 
              heightMode: 'FIXED',
              width: 10,
              height: 10,
              positioning: 'ABSOLUTE',
              x: extractedStyles.width - 12,
              y: extractedStyles.height - 12,
            },
          };
          frameNode.children!.push(resizeNode);
        }
      }

      return frameNode;
    } else if (element.nodeType === Node.TEXT_NODE) {
      const textContent = element.textContent || '';
      if (textContent.trim() === '') return null;

      const parentEl = element.parentElement;
      if (!parentEl) return null;

      const parentStyles = extractFigmaStyles(parentEl);

      // Text wraps (FILL) if parent width is not auto (explicit width), OR if parent is a block element stretching to fill.
      // Actually, if parent isWidthAuto is TRUE, and parent is block, parent fills available space, so text should ALSO wrap!
      // The ONLY time text should NOT wrap (HUG) is if parent is shrink-to-fit (isWidthAuto AND (inline or absolute or float)).
      let textWidthMode: 'HUG' | 'FILL' | 'FIXED' = 'FILL';
      const win = parentEl.ownerDocument.defaultView || window;
      const pDisplay = win.getComputedStyle(parentEl).display;
      const pPosition = win.getComputedStyle(parentEl).position;

      const isShrinkToFit =
        parentStyles.isWidthAuto &&
        (pDisplay.includes('inline') || pPosition === 'absolute' || pPosition === 'fixed');

      // Flex items shrink to fit their content by default, so text in flex should HUG.
      if (parentStyles.isFlex) {
        textWidthMode = 'HUG';
      } else if (isShrinkToFit) {
        textWidthMode = 'HUG';
      }

      const textNode: FigmaTextNode = {
        type: 'TEXT',
        name: 'Text',
        characters: textContent.trim(),
        layout: {
          widthMode: textWidthMode,
          heightMode: 'HUG',
        },
        typography: {
          fontFamily: parentStyles.fontFamily || 'Inter',
          fontSize: parentStyles.fontSize || 16,
          fontWeight: parentStyles.fontWeight || 'Regular',
          lineHeight: parentStyles.lineHeight,
          color: parentStyles.color || { r: 0, g: 0, b: 0, a: 1 },
          textAlignHorizontal: parentStyles.textAlign,
        },
      };

      return textNode;
    }

    return null;
  }

  return await buildNodeData(rootElement);
}
