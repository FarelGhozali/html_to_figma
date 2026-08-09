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
 * Convert gradientFill from JSON to Figma GradientPaint.
 */
function createGradientPaint(gradientFill: {
  type: 'LINEAR';
  angle: number;
  stops: { color: RGBAColor; position: number }[];
}): GradientPaint {
  const angleRad = (gradientFill.angle - 90) * (Math.PI / 180);
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const cx = 0.5,
    cy = 0.5;
  const startX = cx - cos * 0.5;
  const startY = cy - sin * 0.5;

  return {
    type: 'GRADIENT_LINEAR',
    gradientTransform: [
      [cos, sin, startX],
      [-sin, cos, startY],
    ],
    gradientStops: gradientFill.stops.map((stop) => ({
      color: {
        r: stop.color.r,
        g: stop.color.g,
        b: stop.color.b,
        a: stop.color.a !== undefined ? stop.color.a : 1,
      },
      position: stop.position,
    })),
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
      case 'FLEX_START':
        node.primaryAxisAlignItems = 'MIN';
        break;
      case 'FLEX_END':
        node.primaryAxisAlignItems = 'MAX';
        break;
      case 'CENTER':
        node.primaryAxisAlignItems = 'CENTER';
        break;
      case 'SPACE_BETWEEN':
        node.primaryAxisAlignItems = 'SPACE_BETWEEN';
        break;
    }
  }

  // Align Items (Cross Axis Alignment)
  if (layout.alignItems) {
    switch (layout.alignItems) {
      case 'FLEX_START':
        node.counterAxisAlignItems = 'MIN';
        break;
      case 'FLEX_END':
        node.counterAxisAlignItems = 'MAX';
        break;
      case 'CENTER':
        node.counterAxisAlignItems = 'CENTER';
        break;
      case 'STRETCH':
        node.counterAxisAlignItems = 'MIN';
        break; // Stretch is handled at child level
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
  const h =
    layout.heightMode === 'FIXED' && layout.height !== undefined ? layout.height : node.height;

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
function applyChildSizing(
  node: any,
  layout: FlexLayoutProps,
  parentLayoutMode: string,
  parentAlignItems?: string,
) {
  if (layout.positioning === 'ABSOLUTE') {
    node.layoutPositioning = 'ABSOLUTE';
    if (layout.x !== undefined) node.x = layout.x;
    if (layout.y !== undefined) node.y = layout.y;
    return; // Absolute items don't follow flex rules
  }

  if (parentLayoutMode === 'HORIZONTAL') {
    if (layout.widthMode === 'FILL') node.layoutGrow = 1;
    if (layout.heightMode === 'FILL') node.layoutAlign = 'STRETCH';
    // If parent has align-items: stretch (default in CSS flex), stretch children on cross axis
    if (parentAlignItems === 'STRETCH') {
      node.layoutAlign = 'STRETCH';
    }
  } else if (parentLayoutMode === 'VERTICAL') {
    if (layout.heightMode === 'FILL') node.layoutGrow = 1;
    if (layout.widthMode === 'FILL') node.layoutAlign = 'STRETCH';
    // If parent has align-items: stretch (default in CSS flex), stretch children on cross axis
    if (parentAlignItems === 'STRETCH') {
      node.layoutAlign = 'STRETCH';
    }
  }
}

/**
 * Main recursive function to generate Figma UI from FigmaNodeData structure.
 */
export async function generateFigmaUI(
  nodeData: FigmaNodeData,
  parent: FrameNode | PageNode,
): Promise<SceneNode> {
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
      const cx = 0.5,
        cy = 0.5; // Center of the gradient
      const startX = cx - cos * 0.5;
      const startY = cy - sin * 0.5;

      frame.fills = [
        {
          type: 'GRADIENT_LINEAR',
          gradientTransform: [
            [cos, sin, startX],
            [-sin, cos, startY],
          ],
          gradientStops: nodeData.gradientFill.stops.map((stop) => ({
            color: {
              r: stop.color.r,
              g: stop.color.g,
              b: stop.color.b,
              a: stop.color.a !== undefined ? stop.color.a : 1,
            },
            position: stop.position,
          })),
        },
      ];
    } else if (nodeData.backgroundColor) {
      frame.fills = [createSolidPaint(nodeData.backgroundColor)];
    } else {
      frame.fills = []; // Ensure transparent background if none specified
    }

    // Apply images (appended to fills)
    if (nodeData.imageFills && nodeData.imageFills.length > 0) {
      const currentFills = [...(frame.fills as readonly Paint[])];
      for (const imgBuffer of nodeData.imageFills) {
        try {
          const image = figma.createImage(imgBuffer);
          currentFills.push({
            type: 'IMAGE',
            scaleMode: 'FILL', // Use FILL so it covers the bounds, similar to object-fit: cover or background-size: cover
            imageHash: image.hash,
          });
        } catch (e) {
          console.warn('Failed to create Figma image from buffer', e);
        }
      }
      frame.fills = currentFills;
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
          a: nodeData.boxShadow.color.a !== undefined ? nodeData.boxShadow.color.a : 1,
        },
        offset: { x: nodeData.boxShadow.offsetX, y: nodeData.boxShadow.offsetY },
        radius: nodeData.boxShadow.blur,
        spread: nodeData.boxShadow.spread,
        visible: true,
        blendMode: 'NORMAL',
      });
    }

    if (nodeData.backgroundBlur && nodeData.backgroundBlur > 0) {
      effects.push({
        type: 'BACKGROUND_BLUR',
        radius: nodeData.backgroundBlur,
        visible: true,
      } as any);
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

    if (nodeData.segments && nodeData.segments.length > 0) {
      // 1. Load the font for the FIRST segment, apply it to the node, THEN set characters
      const firstFont: FontName = {
        family: nodeData.segments[0].typography.fontFamily || 'Inter',
        style: nodeData.segments[0].typography.fontWeight || 'Regular',
      };

      try {
        await figma.loadFontAsync(firstFont);
        textNode.fontName = firstFont;
      } catch (e) {
        try {
          const fallback = { family: firstFont.family, style: 'Regular' };
          await figma.loadFontAsync(fallback);
          textNode.fontName = fallback;
        } catch (e2) {
          await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
          textNode.fontName = { family: 'Inter', style: 'Regular' };
        }
      }

      // Now it's safe to set characters
      textNode.characters = nodeData.characters;

      let startIndex = 0;
      for (const segment of nodeData.segments) {
        const segmentLen = segment.characters.length;
        if (segmentLen === 0) continue;
        const endIndex = startIndex + segmentLen;

        // Font Fallback Logic for Segments
        const fontName: FontName = {
          family: segment.typography.fontFamily || 'Inter',
          style: segment.typography.fontWeight || 'Regular',
        };

        try {
          await figma.loadFontAsync(fontName);
          textNode.setRangeFontName(startIndex, endIndex, fontName);
        } catch (e) {
          try {
            const fallback = { family: fontName.family, style: 'Regular' };
            await figma.loadFontAsync(fallback);
            textNode.setRangeFontName(startIndex, endIndex, fallback);
          } catch (e2) {
            console.warn('Font not found, using Inter Regular as fallback:', fontName);
            await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
            textNode.setRangeFontName(startIndex, endIndex, { family: 'Inter', style: 'Regular' });
          }
        }

        textNode.setRangeFontSize(startIndex, endIndex, segment.typography.fontSize || 16);

        if (
          segment.typography.lineHeight !== undefined &&
          typeof segment.typography.lineHeight === 'number'
        ) {
          textNode.setRangeLineHeight(startIndex, endIndex, {
            value: segment.typography.lineHeight,
            unit: 'PIXELS',
          });
        }

        if (segment.typography.letterSpacing !== undefined) {
          textNode.setRangeLetterSpacing(startIndex, endIndex, {
            value: segment.typography.letterSpacing,
            unit: 'PIXELS',
          });
        }

        if (segment.typography.gradientFill) {
          textNode.setRangeFills(startIndex, endIndex, [
            createGradientPaint(segment.typography.gradientFill),
          ]);
        } else if (segment.typography.color) {
          textNode.setRangeFills(startIndex, endIndex, [
            createSolidPaint(segment.typography.color),
          ]);
        }

        startIndex = endIndex;
      }

      if (nodeData.typography.textAlignHorizontal) {
        textNode.textAlignHorizontal = nodeData.typography.textAlignHorizontal;
      }
      if (nodeData.typography.textAlignVertical) {
        textNode.textAlignVertical = nodeData.typography.textAlignVertical;
      }
    } else {
      // Standard single-style text node
      // Font Fallback Logic
      const fontName: FontName = {
        family: nodeData.typography.fontFamily || 'Inter',
        style: nodeData.typography.fontWeight || 'Regular',
      };

      try {
        await figma.loadFontAsync(fontName);
        textNode.fontName = fontName;
      } catch (e) {
        try {
          const fallback = { family: fontName.family, style: 'Regular' };
          await figma.loadFontAsync(fallback);
          textNode.fontName = fallback;
        } catch (e2) {
          console.warn('Font not found, using Inter Regular as fallback:', fontName);
          await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
          textNode.fontName = { family: 'Inter', style: 'Regular' };
        }
      }

      // Now safe to set characters
      textNode.characters = nodeData.characters;
      textNode.fontSize = nodeData.typography.fontSize;

      if (
        nodeData.typography.lineHeight !== undefined &&
        typeof nodeData.typography.lineHeight === 'number'
      ) {
        textNode.lineHeight = { value: nodeData.typography.lineHeight, unit: 'PIXELS' };
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

      if (nodeData.typography.gradientFill) {
        textNode.fills = [createGradientPaint(nodeData.typography.gradientFill)];
      } else if (nodeData.typography.color) {
        textNode.fills = [createSolidPaint(nodeData.typography.color)];
      }
    }

    // Apply strokes to text node
    if (nodeData.typography.strokeColor && nodeData.typography.strokeWeight !== undefined) {
      textNode.strokes = [createSolidPaint(nodeData.typography.strokeColor)];
      textNode.strokeWeight = nodeData.typography.strokeWeight;
    }

    // Sizing for text (especially if text content must be FIXED or FILL)
    if (nodeData.layout.widthMode === 'FIXED' && nodeData.layout.width !== undefined) {
      textNode.textAutoResize = 'HEIGHT'; // Fixed width, auto height
      textNode.resize(nodeData.layout.width, textNode.height);
    } else if (nodeData.layout.widthMode === 'HUG') {
      textNode.textAutoResize = 'WIDTH_AND_HEIGHT';
    }
  } else if (nodeData.type === 'SVG') {
    const svgNode = figma.createNodeFromSvg(nodeData.svgContent);
    createdNode = svgNode;

    if (nodeData.name) svgNode.name = nodeData.name;

    // Scale SVG node if width/height mode is FIXED and values are provided
    if (nodeData.layout.width !== undefined && nodeData.layout.height !== undefined) {
      svgNode.resize(nodeData.layout.width, nodeData.layout.height);
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
figma.ui.onmessage = async (msg: any) => {
  if (msg.type === 'import-json' && msg.data) {
    try {
      // The incoming msg.data is already an object (passed natively via Structured Clone algorithm)
      // The incoming msg.data could be a single node data object or an array of them.
      // Generate UI asynchronously for one or multiple nodes
      const nodeDataArray = Array.isArray(msg.data) ? msg.data : [msg.data];
      const createdNodes: SceneNode[] = [];
      let currentXOffset = 0;

      for (const nodeData of nodeDataArray) {
        const newNode = await generateFigmaUI(nodeData, figma.currentPage);

        // Offset the new node so they don't stack on top of each other
        newNode.x = figma.viewport.center.x + currentXOffset;
        newNode.y = figma.viewport.center.y;

        currentXOffset += newNode.width + 100; // Add 100px padding
        createdNodes.push(newNode);
      }

      // Zoom to the newly created nodes
      figma.currentPage.selection = createdNodes;
      figma.viewport.scrollAndZoomIntoView(createdNodes);

      // Notify UI that the rendering process is completely finished
      figma.ui.postMessage({ type: 'import-done' });
    } catch (e: any) {
      console.error('Failed to parse or generate UI:', e);
      figma.notify(`Error: ${e.message || e}`, { error: true });

      // Notify UI to stop loading animation
      figma.ui.postMessage({ type: 'import-error' });
    }
  }

  if (msg.type === 'cancel') {
    figma.closePlugin();
  }
};
