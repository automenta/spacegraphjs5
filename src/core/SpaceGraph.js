// stdlib imports
import * as THREE from "three";

// local imports
import { PluginManager } from "./PluginManager.js";
import { RenderingPlugin } from "../plugins/RenderingPlugin.js";
import { CameraPlugin } from "../plugins/CameraPlugin.js";
import { NodePlugin } from "../plugins/NodePlugin.js";
import { EdgePlugin } from "../plugins/EdgePlugin.js";
import { LayoutPlugin } from "../plugins/LayoutPlugin.js";
import { UIPlugin } from "../plugins/UIPlugin.js";
import { MinimapPlugin } from "../plugins/MinimapPlugin.js";
import { DataPlugin } from "../plugins/DataPlugin.js";
import { FractalZoomPlugin } from "../plugins/FractalZoomPlugin.js";
import { PerformancePlugin } from "../plugins/PerformancePlugin.js";

/**
 * Main SpaceGraph class for creating and managing graph visualizations
 */
export class SpaceGraph {
  /** @type {Map<string, Set<Function>>} Event listeners map */
  _listeners = new Map();

  /** @type {PluginManager} Plugin manager instance */
  plugins = null;

  /** @type {Object} Configuration options */
  options = {};

  // Camera mouse control properties
  _isDragging = false;
  _lastMouseX = 0;
  _lastMouseY = 0;

  // Bound event handlers
  _boundHandlers = new Map();

  /**
   * Create a new SpaceGraph instance
   * @param {HTMLElement} containerElement - Container element for the graph
   * @param {Object} options - Configuration options
   */
  constructor(containerElement, options = {}) {
    if (!containerElement) {
      throw new TypeError(
        "SpaceGraph requires a valid HTML container element.",
      );
    }

    this.container = containerElement;
    this.options = options;
    this.plugins = new PluginManager(this);

    const uiOptions = options.ui || {};
    const { contextMenuElement, confirmDialogElement } = uiOptions;

    // Register core plugins
    this._registerCorePlugins([
      [CameraPlugin, [this, this.plugins]],
      [RenderingPlugin, [this, this.plugins]],
      [NodePlugin, [this, this.plugins]],
      [EdgePlugin, [this, this.plugins]],
      [LayoutPlugin, [this, this.plugins]],
      [
        UIPlugin,
        [this, this.plugins, contextMenuElement, confirmDialogElement],
      ],
      [MinimapPlugin, [this, this.plugins]],
      [DataPlugin, [this, this.plugins]],
      [FractalZoomPlugin, [this, this.plugins]],
      [PerformancePlugin, [this, this.plugins]],
    ]);
  }

  /**
   * Register core plugins
   * @param {Array} pluginConfigs - Array of plugin configurations
   * @private
   */
  _registerCorePlugins(pluginConfigs) {
    for (const [PluginClass, args] of pluginConfigs) {
      try {
        this.plugins.add(new PluginClass(...args));
      } catch (error) {
        console.error(`Failed to register plugin ${PluginClass.name}:`, error);
        throw new Error(`Plugin registration failed: ${PluginClass.name}`);
      }
    }
  }

  /**
   * Get the layout manager
   * @returns {LayoutManager|undefined} Layout manager instance
   */
  get layoutManager() {
    return this._layoutPlugin?.layoutManager;
  }

  /**
   * Static factory method to create and initialize a SpaceGraph instance
   * @param {string|HTMLElement} containerOrContainerID - Container element or ID
   * @param {Object} options - Configuration options
   * @returns {Promise<SpaceGraph>} Initialized SpaceGraph instance
   */
  static async the(containerOrContainerID, options = {}) {
    const container =
      typeof containerOrContainerID === "string"
        ? document.getElementById(containerOrContainerID)
        : containerOrContainerID;

    if (!container) {
      throw new ReferenceError(
        `Container not found: ${containerOrContainerID}`,
      );
    }

    const config = this._mergeOptions(options);
    const space = new SpaceGraph(container, config);
    await space.init();
    space.animate();

    return space;
  }

  /**
   * Merge options with defaults
   * @param {Object} options - User-provided options
   * @returns {Object} Merged options
   * @private
   */
  static _mergeOptions(options) {
    const defaultOptions = {
      ui: {
        contextMenuElement: document.createElement("div"),
        confirmDialogElement: document.createElement("div"),
      },
    };

    return {
      ...defaultOptions,
      ...options,
      ui: {
        ...defaultOptions.ui,
        ...(options.ui || {}),
      },
    };
  }

  /**
   * Initialize the SpaceGraph
   * @returns {Promise<void>}
   */
  async init() {
    try {
      await this.plugins.initPlugins();
      this._cachePlugins();
      this._initializeCamera();
      this._bindEventHandlers();
      this._setupAllEventListeners();
    } catch (error) {
      console.error("SpaceGraph initialization failed:", error);
      throw new Error(`Initialization failed: ${error.message}`);
    }
  }

  /**
   * Cache plugin references for performance
   * @private
   */
  _cachePlugins() {
    this._cameraPlugin = this.plugins.getPlugin("CameraPlugin");
    this._nodePlugin = this.plugins.getPlugin("NodePlugin");
    this._edgePlugin = this.plugins.getPlugin("EdgePlugin");
    this._layoutPlugin = this.plugins.getPlugin("LayoutPlugin");
    this._uiPlugin = this.plugins.getPlugin("UIPlugin");
    this._renderingPlugin = this.plugins.getPlugin("RenderingPlugin");
    this._dataPlugin = this.plugins.getPlugin("DataPlugin");
  }

  /**
   * Initialize camera settings
   * @private
   */
  _initializeCamera() {
    this._cameraPlugin?.centerView(null, 0);
    this._cameraPlugin?.setInitialState();
  }

  /**
   * Bind event handlers to preserve context
   * @private
   */
  _bindEventHandlers() {
    // Handlers are now managed by plugins (mainly UIPlugin/UIManager).
  }

  /**
   * Add an event listener
   * @param {string} eventName - Event name
   * @param {Function} callback - Event callback
   */
  on(eventName, callback) {
    this._listeners.has(eventName) || this._listeners.set(eventName, new Set());
    this._listeners.get(eventName).add(callback);
  }

  /**
   * Remove an event listener
   * @param {string} eventName - Event name
   * @param {Function} callback - Event callback
   */
  off(eventName, callback) {
    this._listeners.get(eventName)?.delete(callback);
  }

  /**
   * Emit an event
   * @param {string} eventName - Event name
   * @param {...any} args - Event arguments
   */
  emit(eventName, ...args) {
    this._listeners.get(eventName)?.forEach((callback) => callback(...args));
  }

  /**
   * Setup all event listeners
   * @private
   */
  _setupAllEventListeners() {
    this._setupNodeEventListeners();
    this._setupEdgeEventListeners();
    this._setupUIEventListeners();
    this._setupCameraEventListeners();
  }

  /**
   * Setup node event listeners
   * @private
   */
  _setupNodeEventListeners() {
    this.on("ui:request:addNode", (nodeInstance) =>
      this._nodePlugin?.addNode(nodeInstance),
    );
    this.on("ui:request:createNode", (nodeConfig) =>
      this._nodePlugin?.createAndAddNode(nodeConfig),
    );
    this.on("node:added", this._handleNodeAdded.bind(this));
    this.on("ui:request:removeNode", (nodeId) =>
      this._nodePlugin?.removeNode(nodeId),
    );
    this.on(
      "ui:request:adjustContentScale",
      this._handleAdjustContentScale.bind(this),
    );
    this.on("ui:request:adjustNodeSize", this._handleAdjustNodeSize.bind(this));
  }

  /**
   * Handle node added event
   * @param {string} addedNodeId - Added node ID
   * @param {Node} addedNodeInstance - Added node instance
   * @private
   */
  _handleNodeAdded(addedNodeId, addedNodeInstance) {
    if (!addedNodeInstance) return;

    setTimeout(() => {
      this.focusOnNode(addedNodeInstance, 0.6, true);
      this._uiPlugin?.setSelectedNode(addedNodeInstance);
      if (
        addedNodeInstance.data?.editable &&
        addedNodeInstance.htmlElement?.querySelector
      ) {
        addedNodeInstance.htmlElement.querySelector(".node-content")?.focus();
      }
    }, 100);
  }

  /**
   * Handle adjust content scale event
   * @param {Node} node - Node to adjust
   * @param {number} factor - Scale factor
   * @private
   */
  _handleAdjustContentScale(node, factor) {
    if (typeof node.adjustContentScale === "function") {
      node.adjustContentScale(factor);
    }
  }

  /**
   * Handle adjust node size event
   * @param {Node} node - Node to adjust
   * @param {number} factor - Size factor
   * @private
   */
  _handleAdjustNodeSize(node, factor) {
    if (typeof node.adjustNodeSize === "function") {
      node.adjustNodeSize(factor);
    }
  }

  /**
   * Setup edge event listeners
   * @private
   */
  _setupEdgeEventListeners() {
    this.on("ui:request:addEdge", (sourceNode, targetNode, data) =>
      this._edgePlugin?.addEdge(sourceNode, targetNode, data),
    );
    this.on("ui:request:removeEdge", (edgeId) =>
      this._edgePlugin?.removeEdge(edgeId),
    );
    this.on("ui:request:reverseEdge", this._handleReverseEdge.bind(this));
    this.on("ui:request:updateEdge", this._handleUpdateEdge.bind(this));
  }

  /**
   * Handle reverse edge event
   * @param {string} edgeId - Edge ID to reverse
   * @private
   */
  _handleReverseEdge(edgeId) {
    const edge = this._edgePlugin?.getEdgeById(edgeId);
    if (!edge) return;

    [edge.source, edge.target] = [edge.target, edge.source];
    edge.update();
    this._layoutPlugin?.kick();
  }

  /**
   * Handle update edge event
   * @param {string} edgeId - Edge ID to update
   * @param {string} property - Property to update
   * @param {any} value - New value
   * @private
   */
  _handleUpdateEdge(edgeId, property, value) {
    const edge = this._edgePlugin?.getEdgeById(edgeId);
    if (!edge) return;

    this._updateEdgeProperty(edge, property, value);
  }

  /**
   * Update edge property
   * @param {Edge} edge - Edge to update
   * @param {string} property - Property to update
   * @param {any} value - New value
   * @private
   */
  _updateEdgeProperty(edge, property, value) {
    switch (property) {
      case "color":
        edge.data.color = value;
        edge.setHighlight(this._uiPlugin?.getSelectedEdges().has(edge));
        break;
      case "thickness":
        edge.data.thickness = value;
        if (edge.line?.material)
          edge.line.material.linewidth = edge.data.thickness;
        break;
      case "constraintType":
        this._updateEdgeConstraint(edge, value);
        this._layoutPlugin?.kick();
        break;
    }
  }

  /**
   * Update edge constraint
   * @param {Edge} edge - Edge to update
   * @param {string} constraintType - Constraint type
   * @private
   */
  _updateEdgeConstraint(edge, constraintType) {
    edge.data.constraintType = constraintType;
    const params = edge.data.constraintParams || {};

    const constraintDefaults = {
      rigid: {
        distance: edge.source.position.distanceTo(edge.target.position),
        stiffness: 0.1,
      },
      weld: {
        distance:
          edge.source.getBoundingSphereRadius() +
          edge.target.getBoundingSphereRadius(),
        stiffness: 0.5,
      },
      elastic: { stiffness: 0.001, idealLength: 200 },
    };

    edge.data.constraintParams = {
      ...constraintDefaults[constraintType],
      ...params,
    };
  }

  /**
   * Setup UI event listeners
   * @private
   */
  _setupUIEventListeners() {
    this.on("ui:request:toggleBackground", (color, alpha) =>
      this._renderingPlugin?.setBackground(color, alpha),
    );
  }

  /**
   * Setup camera event listeners
   * @private
   */
  _setupCameraEventListeners() {
    this.on("ui:request:autoZoomNode", (node) => this.autoZoom(node));
    this.on("ui:request:centerView", () => this.centerView());
    this.on("ui:request:resetView", () => this._cameraPlugin?.resetView());
    this.on("ui:request:zoomCamera", (deltaY) =>
      this._cameraPlugin?.zoom(deltaY),
    );
    this.on("ui:request:focusOnNode", (node, duration, pushHistory) =>
      this.focusOnNode(node, duration, pushHistory),
    );
  }

  /**
   * Add a node to the graph
   * @param {Node} nodeInstance - Node instance to add
   * @returns {Node|undefined} Added node or undefined
   */
  addNode(nodeInstance) {
    const addedNode = this._nodePlugin?.addNode(nodeInstance);
    if (addedNode && this._layoutPlugin) this._layoutPlugin.kick();
    return addedNode;
  }

  /**
   * Add an edge to the graph
   * @param {Node} sourceNode - Source node
   * @param {Node} targetNode - Target node
   * @param {Object} data - Edge data
   * @returns {Edge|undefined} Added edge or undefined
   */
  addEdge(sourceNode, targetNode, data = {}) {
    const addedEdge = this._edgePlugin?.addEdge(sourceNode, targetNode, data);
    if (addedEdge && this._layoutPlugin) this._layoutPlugin.kick();
    return addedEdge;
  }

  /**
   * Create and add a node to the graph
   * @param {Object} nodeConfig - Node configuration
   * @returns {Node|undefined} Created node or undefined
   */
  createNode(nodeConfig) {
    return this._nodePlugin?.createAndAddNode(nodeConfig);
  }

  /**
   * Toggle pin state of a node
   * @param {string} nodeId - Node ID
   */
  togglePinNode(nodeId) {
    this._layoutPlugin?.layoutManager?.togglePinNode(nodeId);
  }

  /**
   * Center the view on a position or all content
   * @param {THREE.Vector3|null} targetPosition - Target position or null for all content
   * @param {number} duration - Animation duration
   */
  centerView(targetPosition = null, duration = 0.7) {
    this._cameraPlugin?.centerView(targetPosition, duration);
  }

  /**
   * Focus on a specific node
   * @param {Node} node - Node to focus on
   * @param {number} duration - Animation duration
   * @param {boolean} pushHistory - Whether to push to history
   */
  focusOnNode(node, duration = 0.6, pushHistory = false) {
    this._cameraPlugin?.focusOnNode(node, duration, pushHistory);
  }

  /**
   * Auto zoom to a node
   * @param {Node} node - Node to zoom to
   */
  autoZoom(node) {
    if (!node || !this._cameraPlugin) return;

    const currentTargetId = this._cameraPlugin.getCurrentTargetNodeId();
    if (currentTargetId === node.id) {
      this._cameraPlugin.popState();
      this._cameraPlugin.setCurrentTargetNodeId(null);
    } else {
      this._cameraPlugin.pushState();
      this._cameraPlugin.setCurrentTargetNodeId(node.id);
      this._cameraPlugin.focusOnNode(node, 0.6, false);
    }
  }

  /**
   * Convert screen coordinates to world coordinates
   * @param {number} screenX - Screen X coordinate
   * @param {number} screenY - Screen Y coordinate
   * @param {number} targetZ - Target Z coordinate
   * @returns {THREE.Vector3|null} World position or null
   */
  screenToWorld(screenX, screenY, targetZ = 0) {
    const camInstance = this._cameraPlugin?.getCameraInstance();
    if (!camInstance) return null;

    camInstance.updateMatrixWorld();
    const raycaster = new THREE.Raycaster();
    const vec = new THREE.Vector2(
      (screenX / window.innerWidth) * 2 - 1,
      -(screenY / window.innerHeight) * 2 + 1,
    );
    raycaster.setFromCamera(vec, camInstance);
    const targetPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -targetZ);
    const intersectPoint = new THREE.Vector3();
    return raycaster.ray.intersectPlane(targetPlane, intersectPoint) ?? null;
  }

  /**
   * Intersect objects with a raycaster
   * @param {THREE.Raycaster} raycaster - Raycaster instance
   * @param {Function[]} intersectionHandlers - Intersection handlers
   * @returns {Object|null} Closest intersection or null
   * @private
   */
  _intersectObjects(raycaster, intersectionHandlers) {
    let closest = null;
    for (const handler of intersectionHandlers) {
      const intersection = handler(raycaster);
      if (
        intersection &&
        (!closest || intersection.distance < closest.distance)
      ) {
        closest = intersection;
      }
    }
    return closest;
  }

  /**
   * Intersect instanced nodes
   * @param {THREE.Raycaster} raycaster - Raycaster instance
   * @returns {Object|null} Intersection result or null
   * @private
   */
  _intersectInstancedNodes(raycaster) {
    const instancedNodeManager =
      this._renderingPlugin?.getInstancedMeshManager();
    const intersection = instancedNodeManager?.raycast(raycaster);
    const node =
      intersection && this._nodePlugin?.getNodeById(intersection.nodeId);
    return node
      ? { node, distance: intersection.distance, type: "node" }
      : null;
  }

  /**
   * Intersect non-instanced nodes
   * @param {THREE.Raycaster} raycaster - Raycaster instance
   * @returns {Object|null} Intersection result or null
   * @private
   */
  _intersectNonInstancedNodes(raycaster) {
    const currentNodes = this._nodePlugin?.getNodes();
    const nonInstancedNodeMeshes = currentNodes
      ? [...currentNodes.values()]
          .filter((n) => !n.isInstanced && n.mesh?.visible)
          .map((n) => n.mesh)
      : [];

    if (nonInstancedNodeMeshes.length === 0) return null;

    const [firstIntersect] = raycaster.intersectObjects(
      nonInstancedNodeMeshes,
      false,
    );
    const node =
      firstIntersect &&
      this._nodePlugin.getNodeById(firstIntersect.object.userData?.nodeId);
    return node
      ? { node, distance: firstIntersect.distance, type: "node" }
      : null;
  }

  /**
   * Intersect instanced edges
   * @param {THREE.Raycaster} raycaster - Raycaster instance
   * @returns {Object|null} Intersection result or null
   * @private
   */
  _intersectInstancedEdges(raycaster) {
    const instancedEdgeManager = this._edgePlugin?.instancedEdgeManager;
    const intersection = instancedEdgeManager?.raycast(raycaster);
    const edge =
      intersection && this._edgePlugin?.getEdgeById(intersection.edgeId);
    return edge
      ? { edge, distance: intersection.distance, type: "edge" }
      : null;
  }

  /**
   * Intersect non-instanced edges
   * @param {THREE.Raycaster} raycaster - Raycaster instance
   * @returns {Object|null} Intersection result or null
   * @private
   */
  _intersectNonInstancedEdges(raycaster) {
    const currentEdges = this._edgePlugin?.getEdges();
    const nonInstancedEdgeLines = currentEdges
      ? [...currentEdges.values()]
          .filter((e) => !e.isInstanced && e.line?.visible)
          .map((e) => e.line)
      : [];

    if (nonInstancedEdgeLines.length === 0) return null;

    const [firstIntersect] = raycaster.intersectObjects(
      nonInstancedEdgeLines,
      false,
    );
    const edge =
      firstIntersect &&
      this._edgePlugin.getEdgeById(firstIntersect.object.userData?.edgeId);
    return edge
      ? { edge, distance: firstIntersect.distance, type: "edge" }
      : null;
  }

  /**
   * Get intersected objects at screen coordinates
   * @param {number} screenX - Screen X coordinate
   * @param {number} screenY - Screen Y coordinate
   * @returns {Object|null} Intersected object or null
   */
  intersectedObjects(screenX, screenY) {
    const camInstance = this._cameraPlugin?.getCameraInstance();
    if (!camInstance) return null;

    camInstance.updateMatrixWorld();
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(
      new THREE.Vector2(
        (screenX / window.innerWidth) * 2 - 1,
        -(screenY / window.innerHeight) * 2 + 1,
      ),
      camInstance,
    );
    raycaster.params.Line.threshold = 5;

    const closestIntersect = this._intersectObjects(raycaster, [
      this._intersectInstancedNodes.bind(this),
      this._intersectNonInstancedNodes.bind(this),
      this._intersectInstancedEdges.bind(this),
      this._intersectNonInstancedEdges.bind(this),
    ]);

    if (!closestIntersect) return null;

    return closestIntersect.type === "node"
      ? { node: closestIntersect.node, distance: closestIntersect.distance }
      : { edge: closestIntersect.edge, distance: closestIntersect.distance };
  }

  /**
   * Start the animation loop
   */
  animate() {
    const frame = () => {
      this.plugins.updatePlugins();
      requestAnimationFrame(frame);
    };
    frame();
  }

  /**
   * Dispose of the SpaceGraph instance
   */
  dispose() {
    this.plugins.disposePlugins();
    this._listeners.clear();
    this._removeCameraMouseControls();
  }

  /**
   * Export graph to JSON
   * @param {Object} options - Export options
   * @returns {Object|null} Exported data or null
   */
  exportGraphToJSON(options) {
    return this._dataPlugin?.exportGraphToJSON(options) ?? null;
  }

  /**
   * Import graph from JSON
   * @param {Object} jsonData - JSON data to import
   * @param {Object} options - Import options
   * @returns {Promise<boolean>} True if successful
   */
  async importGraphFromJSON(jsonData, options) {
    return (
      (await this._dataPlugin?.importGraphFromJSON(jsonData, options)) ?? false
    );
  }

  /**
   * Remove camera mouse controls
   * @private
   */
  _removeCameraMouseControls() {
    // Cleanup handled by plugins
  }
}
