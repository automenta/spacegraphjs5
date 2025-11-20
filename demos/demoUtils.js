/**
 * Demo utilities for SpaceGraphJS demos
 * Provides common functions to reduce boilerplate across all demo files
 */

/**
 * Creates a standard page layout for demos
 * @param {string} title - The title of the demo
 * @param {string} infoTitle - The title for the info panel
 * @param {string|Element} infoContent - The content for the info panel (HTML string or element)
 * @returns {Object} Object containing container and info elements
 */
export function createDemoLayout(title, infoTitle, infoContent) {
  // Create document head content if not already present
  if (!document.head.querySelector('meta[name="viewport"]')) {
    document.head.insertAdjacentHTML(
      "beforeend",
      `
            <meta charset="UTF-8"/>
            <meta content="width=device-width, initial-scale=1.0" name="viewport"/>
            <title>${title}</title>
            <style>
                body {
                    margin: 0;
                    padding: 0;
                    background: #0f0f1a;
                    color: white;
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    overflow: hidden;
                }
                #container {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                }
                #info-panel {
                    position: absolute;
                    top: 20px;
                    left: 20px;
                    max-width: 350px;
                    background: rgba(20, 20, 30, 0.85);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    padding: 20px;
                    border-radius: 12px;
                    font-size: 14px;
                    line-height: 1.5;
                    z-index: 100;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                    transition: transform 0.3s ease, opacity 0.3s ease;
                }
                #info-panel.minimized {
                    transform: translateX(-120%);
                    opacity: 0;
                    pointer-events: none;
                }
                #info-toggle {
                    position: absolute;
                    top: 20px;
                    left: 20px;
                    width: 40px;
                    height: 40px;
                    background: rgba(20, 20, 30, 0.85);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 50%;
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    z-index: 99;
                    transition: background 0.2s ease;
                }
                #info-toggle:hover {
                    background: rgba(40, 40, 50, 0.95);
                }
                #info-close {
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    background: none;
                    border: none;
                    color: rgba(255, 255, 255, 0.5);
                    cursor: pointer;
                    font-size: 18px;
                    padding: 5px;
                }
                #info-close:hover {
                    color: white;
                }
                h3 {
                    margin-top: 0;
                    margin-bottom: 10px;
                    color: #4CAF50;
                    font-weight: 600;
                }
                ul {
                    padding-left: 20px;
                    margin: 10px 0;
                }
                li {
                    margin-bottom: 5px;
                }
                code {
                    background: rgba(255, 255, 255, 0.1);
                    padding: 2px 4px;
                    border-radius: 4px;
                    font-family: 'Consolas', monospace;
                    font-size: 0.9em;
                }
            </style>
        `,
    );
  }

  // Create body content if not already present
  if (!document.getElementById("container")) {
    document.body.insertAdjacentHTML(
      "beforeend",
      `
            <div id="container">
                <button id="info-toggle" title="Show Info">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="16" x2="12" y2="12"></line>
                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                </button>
                <div id="info-panel">
                    <button id="info-close" title="Hide Info">×</button>
                    <h3>${infoTitle}</h3>
                    <div id="info-content">
                        ${typeof infoContent === "string" ? infoContent : ""}
                    </div>
                </div>
                <canvas id="webgl-canvas"></canvas>
                <div id="css3d-container"></div>
            </div>
        `,
    );

    // Insert content if it's an element
    if (infoContent instanceof Element) {
      document.getElementById("info-content").appendChild(infoContent);
    }

    // Add event listeners for toggle
    const panel = document.getElementById("info-panel");
    const toggle = document.getElementById("info-toggle");
    const close = document.getElementById("info-close");

    close.addEventListener("click", () => {
      panel.classList.add("minimized");
    });

    toggle.addEventListener("click", () => {
      panel.classList.remove("minimized");
    });
  }

  return {
    container: document.getElementById("container"),
    info: document.getElementById("info-panel"),
    canvas: document.getElementById("webgl-canvas"),
    css3dContainer: document.getElementById("css3d-container"),
  };
}

/**
 * Common initialization pattern for demos
 * @param {Function} demoInitFn - The function to run after SpaceGraph is initialized
 * @param {string} title - The title of the demo
 * @param {string} infoTitle - The title for the info panel
 * @param {string|Element} infoContent - The content for the info panel
 */
export async function initDemo(demoInitFn, title, infoTitle, infoContent) {
  const { container } = createDemoLayout(title, infoTitle, infoContent);
  return { container };
}

/**
 * Creates a node with common properties and applies standard positioning
 * @param {SpaceGraph} space - The SpaceGraph instance
 * @param {Object} nodeData - Node configuration object
 * @param {Object} commonProps - Common properties to apply to all nodes
 * @returns {Node} The created node
 */
export function createNode(space, nodeData, commonProps = {}) {
  // Only apply commonProps if they don't override explicit nodeData properties
  const finalNodeData = {
    ...commonProps,
    ...nodeData,
    // If position is provided in nodeData, use it; otherwise create it
    position: nodeData.position
      ? { ...nodeData.position }
      : commonProps.position
        ? { ...commonProps.position }
        : {
            x: 0,
            y: 0,
            z: 0,
          },
    // Merge data properties, with nodeData taking precedence
    data: {
      ...commonProps.data,
      ...nodeData.data,
    },
  };

  return space.createNode(finalNodeData);
}

/**
 * Creates multiple nodes efficiently from a configuration array
 * @param {SpaceGraph} space - The SpaceGraph instance
 * @param {Array<Object>} nodeConfigs - Array of node configurations
 * @param {Object} commonProps - Common properties to apply to all nodes
 * @returns {Array<Node>} The created nodes
 */
export function createMultipleNodes(space, nodeConfigs, commonProps = {}) {
  return nodeConfigs.map((config) => createNode(space, config, commonProps));
}

/**
 * Helper to create edges with default styling
 * @param {SpaceGraph} space - The SpaceGraph instance
 * @param {Node|String} source - Source node or ID
 * @param {Node|String} target - Target node or ID
 * @param {Object} edgeData - Edge configuration object
 * @param {Object} defaultEdgeProps - Default properties for edges
 * @returns {Edge} The created edge
 */
export function createEdge(
  space,
  source,
  target,
  edgeData = {},
  defaultEdgeProps = { color: 0x888888, thickness: 1 },
) {
  const finalEdgeData = {
    ...defaultEdgeProps,
    ...edgeData,
  };

  return space.addEdge(source, target, finalEdgeData);
}

/**
 * Utility to create a node with common properties
 * @param {SpaceGraph} space - The SpaceGraph instance
 * @param {Object} nodeData - Node configuration object
 * @param {Object} commonProps - Common properties to apply to all nodes
 * @returns {Node} The created node
 */
export function createNodeWithCommonProps(
  space,
  nodeData,
  commonProps = { mass: 1.0 },
) {
  return space.createNode({
    ...commonProps,
    ...nodeData,
  });
}

/**
 * Creates a list element for demo info panels
 * @param {Array<string>} items - List of items to display
 * @returns {HTMLElement} A UL element with the list items
 */
export function createInfoList(items) {
  const ul = document.createElement("ul");
  items.forEach((item) => {
    const li = document.createElement("li");
    li.innerHTML = item;
    ul.appendChild(li);
  });
  return ul;
}
