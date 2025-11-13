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
        document.head.insertAdjacentHTML('beforeend', `
            <meta charset="UTF-8"/>
            <meta content="width=device-width, initial-scale=1.0" name="viewport"/>
            <title>${title}</title>
            <style>
                body {
                    margin: 0;
                    padding: 0;
                    background: #0f0f1a;
                    color: white;
                    font-family: Arial, sans-serif;
                }
                #container {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                }
                #info {
                    position: absolute;
                    top: 10px;
                    left: 10px;
                    max-width: 400px;
                    background: rgba(0, 0, 0, 0.7);
                    padding: 15px;
                    border-radius: 8px;
                    font-size: 14px;
                    z-index: 100;
                }
                h3 {
                    margin-top: 0;
                    color: #4CAF50;
                }
            </style>
        `);
    }

    // Create body content if not already present
    if (!document.getElementById('container')) {
        document.body.insertAdjacentHTML('beforeend', `
            <div id="container">
                <div id="info">
                    <h3>${infoTitle}</h3>
                    ${typeof infoContent === 'string' ? infoContent : ''}
                </div>
                <canvas id="webgl-canvas"></canvas>
                <div id="css3d-container"></div>
            </div>
        `);

        // Insert content if it's an element
        if (infoContent instanceof Element) {
            document.getElementById('info').appendChild(infoContent);
        }
    }

    return {
        container: document.getElementById('container'),
        info: document.getElementById('info'),
        canvas: document.getElementById('webgl-canvas'),
        css3dContainer: document.getElementById('css3d-container')
    };
}

/**
 * Common initialization pattern for demos
 * @param {Function} demoInitFn - The function to run after SpaceGraph is initialized
 * @param {string} title - The title of the demo
 * @param {string} infoTitle - The title for the info panel
 * @param {string|Element} infoContent - The content for the info panel
 * @param {Object} options - SpaceGraph options
 */
export async function initDemo(demoInitFn, title, infoTitle, infoContent, options = {}) {
    const {container} = createDemoLayout(title, infoTitle, infoContent);
    const space = await initSpaceGraph(container, options);

    // Run the initialization function with the space instance
    await demoInitFn(space);

    // Start animation loop
    space.animate();

    return space;
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
        position: nodeData.position ? {...nodeData.position} : commonProps.position ? {...commonProps.position} : {
            x: 0,
            y: 0,
            z: 0
        },
        // Merge data properties, with nodeData taking precedence
        data: {
            ...commonProps.data,
            ...nodeData.data
        }
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
    return nodeConfigs.map(config => createNode(space, config, commonProps));
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
export function createEdge(space, source, target, edgeData = {}, defaultEdgeProps = {color: 0x888888, thickness: 1}) {
    const finalEdgeData = {
        ...defaultEdgeProps,
        ...edgeData
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
export function createNodeWithCommonProps(space, nodeData, commonProps = {mass: 1.0}) {
    return space.createNode({
        ...commonProps,
        ...nodeData
    });
}

/**
 * Creates a list element for demo info panels
 * @param {Array<string>} items - List of items to display
 * @returns {HTMLElement} A UL element with the list items
 */
export function createInfoList(items) {
    const ul = document.createElement('ul');
    items.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = item;
        ul.appendChild(li);
    });
    return ul;
}

