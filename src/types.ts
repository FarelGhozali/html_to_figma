/**
 * Sizing mode of the element, representing Fixed, Hug Contents, or Fill Container in Figma.
 */
export type SizeMode = 'FIXED' | 'HUG' | 'FILL';

/**
 * Represents color in RGBA format (0-1 for Figma) or Hex format.
 */
export interface RGBAColor {
  r: number;
  g: number;
  b: number;
  a?: number;
  hex?: string; // Stores hex format (#FFFFFF) for quick reference from CSS
}

/**
 * Basic typography properties for text.
 */
export interface TypographyProps {
  fontFamily: string;
  fontWeight: string;
  fontSize: number;
  lineHeight?: number | string; // Can be a number (px) or percentage
  letterSpacing?: number;
  textAlignHorizontal?: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED';
  textAlignVertical?: 'TOP' | 'CENTER' | 'BOTTOM';
  color?: RGBAColor;
}

/**
 * Groups all properties that simulate Flexbox / Figma Auto Layout.
 */
export interface FlexLayoutProps {
  widthMode: SizeMode;
  heightMode: SizeMode;
  width?: number; // Required if widthMode === 'FIXED'
  height?: number; // Required if heightMode === 'FIXED'

  flexDirection?: 'ROW' | 'COLUMN'; // Equivalent to layoutMode 'HORIZONTAL' | 'VERTICAL'
  gap?: number; // Distance between child elements (itemSpacing)

  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;

  // Equivalent to justify-content
  justifyContent?: 'FLEX_START' | 'FLEX_END' | 'CENTER' | 'SPACE_BETWEEN';

  // Equivalent to align-items
  alignItems?: 'FLEX_START' | 'FLEX_END' | 'CENTER' | 'STRETCH';

  // Equivalent to position: absolute or fixed
  positioning?: 'AUTO' | 'ABSOLUTE';

  // Coordinates for absolute positioning relative to parent
  x?: number;
  y?: number;

  // Whether the frame clips its children (overflow: hidden)
  clipsContent?: boolean;
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
  gap?: number;
  justifyContent?: 'FLEX_START' | 'FLEX_END' | 'CENTER' | 'SPACE_BETWEEN';
  alignItems?: 'FLEX_START' | 'FLEX_END' | 'CENTER' | 'STRETCH';
  backgroundColor?: RGBAColor;
  gradientFill?: {
    type: 'LINEAR';
    angle: number; // degrees
    stops: { color: RGBAColor; position: number }[];
  };
  imageUrls?: string[];
  cornerRadius?: number;
  strokeColor?: RGBAColor;
  strokeWeight?: number;
  strokeDashPattern?: number[];
  strokeAlign?: 'INSIDE' | 'OUTSIDE' | 'CENTER';
  boxShadow?: {
    offsetX: number;
    offsetY: number;
    blur: number;
    spread: number;
    color: RGBAColor;
  };
  backgroundBlur?: number;
  opacity?: number;
}

/**
 * Base interface shared by every node.
 */
export interface BaseFigmaNode {
  type: 'FRAME' | 'TEXT' | 'SVG';
  name?: string;
  layout: FlexLayoutProps;
  backgroundColor?: RGBAColor;
  gradientFill?: {
    type: 'LINEAR';
    angle: number; // degrees
    stops: { color: RGBAColor; position: number }[];
  };
  imageFills?: Uint8Array[];
  cornerRadius?: number;
  strokeColor?: RGBAColor;
  strokeWeight?: number;
  strokeDashPattern?: number[];
  strokeAlign?: 'INSIDE' | 'OUTSIDE' | 'CENTER';
  boxShadow?: {
    offsetX: number;
    offsetY: number;
    blur: number;
    spread: number;
    color: RGBAColor;
  };
  backgroundBlur?: number;
  opacity?: number;
}

/**
 * Specific node for Frame (can contain children).
 */
export interface FigmaFrameNode extends BaseFigmaNode {
  type: 'FRAME';
  children?: FigmaNodeData[]; // Recursive hierarchical structure
}

/**
 * Represents typography for a specific range of characters inside a TextNode.
 */
export interface TextSegment {
  characters: string;
  typography: TypographyProps;
}

/**
 * Specific node for Text.
 */
export interface FigmaTextNode extends BaseFigmaNode {
  type: 'TEXT';
  characters: string;
  typography: TypographyProps;
  segments?: TextSegment[]; // For rich text formatting
}

/**
 * Specific node for SVG.
 */
export interface FigmaSvgNode extends BaseFigmaNode {
  type: 'SVG';
  svgContent: string;
}

/**
 * FigmaNodeData is the Main Union Type representing the UI Tree structure.
 */
export type FigmaNodeData = FigmaFrameNode | FigmaTextNode | FigmaSvgNode;
