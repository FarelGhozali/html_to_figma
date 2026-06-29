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
  width?: number;   // Required if widthMode === 'FIXED'
  height?: number;  // Required if heightMode === 'FIXED'
  
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

/**
 * Base interface shared by every node.
 */
export interface BaseFigmaNode {
  type: 'FRAME' | 'TEXT';
  name?: string;
  layout: FlexLayoutProps;
  backgroundColor?: RGBAColor;
  cornerRadius?: number;
  strokeColor?: RGBAColor;
  strokeWeight?: number;
  strokeDashPattern?: readonly number[];
}

/**
 * Specific node for Frame (can contain children).
 */
export interface FigmaFrameNode extends BaseFigmaNode {
  type: 'FRAME';
  children?: FigmaNodeData[]; // Recursive hierarchical structure
}

/**
 * Specific node for Text (does not have children, but has characters).
 */
export interface FigmaTextNode extends BaseFigmaNode {
  type: 'TEXT';
  characters: string;
  typography: TypographyProps;
}

/**
 * FigmaNodeData is the Main Union Type representing the UI Tree structure.
 */
export type FigmaNodeData = FigmaFrameNode | FigmaTextNode;
