import { FigmaNodeData, FlexLayoutProps, RGBAColor } from './types';

figma.showUI(__html__, { width: 400, height: 500 });

/**
 * Convert RGBAColor to SolidPaint for Figma.
 */
function createSolidPaint(color: RGBAColor): SolidPaint {
  return {
    type: 'SOLID',
    color: { r: color.r, g: color.g, b: color.b },
    opacity: color.a !== undefined ? color.a : 1,
  };
}

/**
 * Apply Auto Layout (Flexbox) rules to a Frame.
 */
function applyLayout(node: FrameNode, layout: FlexLayoutProps) {
  // Determine layout direction (flex-direction)
  node.layoutMode = layout.flexDirection === 'ROW' ? 'HORIZONTAL' : 'VERTICAL';

  // Spacing and Padding
  if (layout.gap !== undefined) node.itemSpacing = layout.gap;
  if (layout.paddingTop !== undefined) node.paddingTop = layout.paddingTop;
  if (layout.paddingRight !== undefined) node.paddingRight = layout.paddingRight;
  if (layout.paddingBottom !== undefined) node.paddingBottom = layout.paddingBottom;
  if (layout.paddingLeft !== undefined) node.paddingLeft = layout.paddingLeft;

  // Justify Content (Main Axis Alignment)
  if (layout.justifyContent) {
    switch (layout.justifyContent) {
      case 'FLEX_START': node.primaryAxisAlignItems = 'MIN'; break;
      case 'FLEX_END': node.primaryAxisAlignItems = 'MAX'; break;
      case 'CENTER': node.primaryAxisAlignItems = 'CENTER'; break;
      case 'SPACE_BETWEEN': node.primaryAxisAlignItems = 'SPACE_BETWEEN'; break;
    }
  }

  // Align Items (Cross Axis Alignment)
  if (layout.alignItems) {
    switch (layout.alignItems) {
      case 'FLEX_START': node.counterAxisAlignItems = 'MIN'; break;
      case 'FLEX_END': node.counterAxisAlignItems = 'MAX'; break;
      case 'CENTER': node.counterAxisAlignItems = 'CENTER'; break;
      case 'STRETCH': node.counterAxisAlignItems = 'MIN'; break; // Stretch is handled at child level
    }
  }

  // Sizing Mode (HUG vs FIXED)
  if (node.layoutMode === 'HORIZONTAL') {
    node.primaryAxisSizingMode = layout.widthMode === 'HUG' ? 'AUTO' : 'FIXED';
    node.counterAxisSizingMode = layout.heightMode === 'HUG' ? 'AUTO' : 'FIXED';
  } else {
    node.primaryAxisSizingMode = layout.heightMode === 'HUG' ? 'AUTO' : 'FIXED';
    node.counterAxisSizingMode = layout.widthMode === 'HUG' ? 'AUTO' : 'FIXED';
  }

  // Set absolute dimensions if mode is FIXED
  const w = layout.widthMode === 'FIXED' && layout.width !== undefined ? layout.width : node.width;
  const h = layout.heightMode === 'FIXED' && layout.height !== undefined ? layout.height : node.height;
  
  if (layout.widthMode === 'FIXED' || layout.heightMode === 'FIXED') {
    try {
      node.resize(w, h);
    } catch (e) {
      console.warn('Failed to resize node:', e);
    }
  }
}

/**
 * Apply child behavior inside Auto Layout (e.g. FILL CONTAINER).
 */
function applyChildSizing(node: SceneNode, layout: FlexLayoutProps, parentLayoutMode: 'HORIZONTAL' | 'VERTICAL' | 'NONE', parentAlignItems?: string) {
  if (parentLayoutMode === 'HORIZONTAL') {
    if (layout.widthMode === 'FILL') node.layoutGrow = 1;
    if (layout.heightMode === 'FILL') node.layoutAlign = 'STRETCH';
    // If parent has align-items: stretch (default in CSS flex), stretch children on cross axis
    if (parentAlignItems === 'STRETCH' && layout.positioning !== 'ABSOLUTE') {
      node.layoutAlign = 'STRETCH';
    }
  } else if (parentLayoutMode === 'VERTICAL') {
    if (layout.heightMode === 'FILL') node.layoutGrow = 1;
    if (layout.widthMode === 'FILL') node.layoutAlign = 'STRETCH';
    // If parent has align-items: stretch (default in CSS flex), stretch children on cross axis
    if (parentAlignItems === 'STRETCH' && layout.positioning !== 'ABSOLUTE') {
      node.layoutAlign = 'STRETCH';
    }
  }
}

/**
 * Main recursive function to generate Figma UI from FigmaNodeData structure.
 */
export async function generateFigmaUI(nodeData: FigmaNodeData, parent: FrameNode | PageNode): Promise<SceneNode> {
  let createdNode: SceneNode;

  if (nodeData.type === 'FRAME') {
    const frame = figma.createFrame();
    createdNode = frame;
    
    if (nodeData.name) frame.name = nodeData.name;
    
    // Apply fills (solid color or gradient)
    if (nodeData.gradientFill && nodeData.gradientFill.stops.length >= 2) {
      // Convert CSS angle to Figma gradient transform
      // CSS: 0deg = bottom-to-top, 90deg = left-to-right, 135deg = top-left to bottom-right
      const angleDeg = nodeData.gradientFill.angle;
      const angleRad = (angleDeg - 90) * (Math.PI / 180); // CSS to standard math angle
      
      const cos = Math.cos(angleRad);
      const sin = Math.sin(angleRad);
      
      // Figma gradient transform is a 2x3 matrix mapping from gradient space to object space
      // For a linear gradient, we need to define start and end points
      const cx = 0.5, cy = 0.5; // Center of the gradient
      const startX = cx - cos * 0.5;
      const startY = cy - sin * 0.5;
      
      frame.fills = [{
        type: 'GRADIENT_LINEAR',
        gradientTransform: [
          [cos, sin, startX],
          [-sin, cos, startY]
        ],
        gradientStops: nodeData.gradientFill.stops.map(stop => ({
          color: { r: stop.color.r, g: stop.color.g, b: stop.color.b, a: stop.color.a !== undefined ? stop.color.a : 1 },
          position: stop.position
        }))
      }];
    } else if (nodeData.backgroundColor) {
      frame.fills = [createSolidPaint(nodeData.backgroundColor)];
    } else {
      frame.fills = []; // Ensure transparent background if none specified
    }

    // Apply opacity
    if (nodeData.opacity !== undefined && nodeData.opacity < 1) {
      frame.opacity = nodeData.opacity;
    }

    // Apply effects (shadows and blur)
    const effects: Effect[] = [];
    
    if (nodeData.boxShadow) {
      effects.push({
        type: 'DROP_SHADOW',
        color: {
          r: nodeData.boxShadow.color.r,
          g: nodeData.boxShadow.color.g,
          b: nodeData.boxShadow.color.b,
          a: nodeData.boxShadow.color.a !== undefined ? nodeData.boxShadow.color.a : 1
        },
        offset: { x: nodeData.boxShadow.offsetX, y: nodeData.boxShadow.offsetY },
        radius: nodeData.boxShadow.blur,
        spread: nodeData.boxShadow.spread,
        visible: true,
        blendMode: 'NORMAL'
      });
    }

    if (nodeData.backgroundBlur && nodeData.backgroundBlur > 0) {
      effects.push({
        type: 'BACKGROUND_BLUR',
        radius: nodeData.backgroundBlur,
        visible: true
      });
    }

    if (effects.length > 0) {
      frame.effects = effects;
    }

    if (nodeData.cornerRadius !== undefined && nodeData.cornerRadius > 0) {
      frame.cornerRadius = nodeData.cornerRadius;
    }

    if (nodeData.strokeColor && nodeData.strokeWeight !== undefined) {
      frame.strokes = [createSolidPaint(nodeData.strokeColor)];
      frame.strokeWeight = nodeData.strokeWeight;
      
      // Apply dashed/dotted stroke pattern
      if (nodeData.strokeDashPattern && nodeData.strokeDashPattern.length > 0) {
        frame.dashPattern = nodeData.strokeDashPattern;
      }
      
      // Apply stroke alignment (INSIDE, OUTSIDE, CENTER)
      if (nodeData.strokeAlign) {
        frame.strokeAlign = nodeData.strokeAlign;
      }
    }

    // Apply layout to parent first before populating children
    applyLayout(frame, nodeData.layout);

    // Apply clipsContent (overflow behavior)
    frame.clipsContent = nodeData.layout.clipsContent === true;

    // Recursive iteration for each child
    if (nodeData.children && nodeData.children.length > 0) {
      for (const childData of nodeData.children) {
        const childNode = await generateFigmaUI(childData, frame);
        // Apply responsive child behavior relative to its parent frame
        applyChildSizing(childNode, childData.layout, frame.layoutMode, nodeData.layout.alignItems);
      }
    }

  } else if (nodeData.type === 'TEXT') {
    const textNode = figma.createText();
    createdNode = textNode;
    
    if (nodeData.name) textNode.name = nodeData.name;

    // Asynchronous font loading
    const fontName: FontName = {
      family: nodeData.typography.fontFamily || 'Inter',
      style: nodeData.typography.fontWeight || 'Regular'
    };

    try {
      await figma.loadFontAsync(fontName);
      textNode.fontName = fontName;
    } catch (e) {
      console.warn('Font not found, using Inter Regular as fallback:', fontName);
      await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
      textNode.fontName = { family: 'Inter', style: 'Regular' };
    }

    textNode.characters = nodeData.characters;
    textNode.fontSize = nodeData.typography.fontSize;

    if (nodeData.typography.lineHeight !== undefined) {
      if (typeof nodeData.typography.lineHeight === 'number') {
        textNode.lineHeight = { value: nodeData.typography.lineHeight, unit: 'PIXELS' };
      }
    }

    if (nodeData.typography.letterSpacing !== undefined) {
      textNode.letterSpacing = { value: nodeData.typography.letterSpacing, unit: 'PIXELS' };
    }

    if (nodeData.typography.textAlignHorizontal) {
      textNode.textAlignHorizontal = nodeData.typography.textAlignHorizontal;
    }

    if (nodeData.typography.textAlignVertical) {
      textNode.textAlignVertical = nodeData.typography.textAlignVertical;
    }

    if (nodeData.typography.color) {
      textNode.fills = [createSolidPaint(nodeData.typography.color)];
    }

    // Sizing for text (especially if text content must be FIXED or FILL)
    if (nodeData.layout.widthMode === 'FIXED' && nodeData.layout.width !== undefined) {
      textNode.textAutoResize = 'HEIGHT'; // Fixed width, auto height
      textNode.resize(nodeData.layout.width, textNode.height);
    } else if (nodeData.layout.widthMode === 'HUG') {
      textNode.textAutoResize = 'WIDTH_AND_HEIGHT';
    }

  } else {
    throw new Error('Node type not supported');
  }

  // Insert the created node into the parent
  parent.appendChild(createdNode);

  // Apply layoutPositioning only AFTER appending, and only if parent is an Auto Layout frame
  if (parent.type === 'FRAME' && parent.layoutMode !== 'NONE') {
    if (nodeData.layout.positioning === 'ABSOLUTE') {
      try {
        createdNode.layoutPositioning = 'ABSOLUTE';
        if (nodeData.layout.x !== undefined) createdNode.x = nodeData.layout.x;
        if (nodeData.layout.y !== undefined) createdNode.y = nodeData.layout.y;
      } catch (e) {
        console.warn('Could not set absolute layout properties:', e);
      }
    }
  }

  return createdNode;
}

// Event listener from UI interface
figma.ui.onmessage = async (msg) => {
  if (msg.type === 'import-json' && msg.data) {
    try {
      // Parse the incoming JSON string from the UI
      const nodeData = JSON.parse(msg.data);
      
      // Generate UI asynchronously
      const newNode = await generateFigmaUI(nodeData, figma.currentPage);
      
      // Zoom to the newly created node
      figma.currentPage.selection = [newNode];
      figma.viewport.scrollAndZoomIntoView([newNode]);
    } catch (e: any) {
      console.error("Failed to parse or generate UI:", e);
      figma.notify(`Error: ${e.message || e}`, { error: true });
    }
  }

  if (msg.type === 'cancel') {
    figma.closePlugin();
  }
};
