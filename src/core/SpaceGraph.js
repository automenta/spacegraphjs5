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

const isStandardNode = (n) => !n.isInstanced && n.mesh?.visible;
const isStandardEdge = (e) => !e.isInstanced && e.line?.visible;

/**
 * Main SpaceGraph class for creating and managing graph visualizations
 */
export class SpaceGraph {
  _listeners = new Map();
  plugins = null;
  options = {};
  _boundHandlers = new Map();

  constructor(containerElement, options = {}) {
    if (!containerElement) {
      throw new TypeError(
        "SpaceGraph requires a valid HTML container element.",
      );
    }

    this.container = containerElement;
    this.options = options;
    this.plugins = new PluginManager(this);

    const { contextMenuElement, confirmDialogElement } = options.ui || {};

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

  get layoutManager() {
    return this._layoutPlugin?.layoutManager;
  }

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

  async init() {
    try {
      await this.plugins.initPlugins();
      this._cachePlugins();
      this._initializeCamera();
      this._setupAllEventListeners();
    } catch (error) {
      console.error("SpaceGraph initialization failed:", error);
      throw new Error(`Initialization failed: ${error.message}`);
    }
  }

  _cachePlugins() {
    this._cameraPlugin = this.plugins.getPlugin("CameraPlugin");
    this._nodePlugin = this.plugins.getPlugin("NodePlugin");
    this._edgePlugin = this.plugins.getPlugin("EdgePlugin");
    this._layoutPlugin = this.plugins.getPlugin("LayoutPlugin");
    this._uiPlugin = this.plugins.getPlugin("UIPlugin");
    this._renderingPlugin = this.plugins.getPlugin("RenderingPlugin");
    this._dataPlugin = this.plugins.getPlugin("DataPlugin");
  }

  _initializeCamera() {
    this._cameraPlugin?.centerView(null, 0);
    this._cameraPlugin?.setInitialState();
  }

  on(eventName, callback) {
    this._listeners.has(eventName) || this._listeners.set(eventName, new Set());
    this._listeners.get(eventName).add(callback);
  }

  off(eventName, callback) {
    this._listeners.get(eventName)?.delete(callback);
  }

  emit(eventName, ...args) {
    const listeners = this._listeners.get(eventName);
    if (listeners) {
      for (const callback of listeners) {
        callback(...args);
      }
    }
  }

  _setupAllEventListeners() {
    this._setupNodeEventListeners();
    this._setupEdgeEventListeners();
    this._setupUIEventListeners();
    this._setupCameraEventListeners();
  }

  _setupNodeEventListeners() {
    this.on("ui:request:addNode", (n) => this._nodePlugin?.addNode(n));
    this.on("ui:request:createNode", (c) =>
      this._nodePlugin?.createAndAddNode(c),
    );
    this.on("node:added", this._handleNodeAdded.bind(this));
    this.on("ui:request:removeNode", (id) =>
      this._nodePlugin?.removeNode(id),
    );
    this.on("ui:request:adjustContentScale", (n, f) =>
      n.adjustContentScale?.(f),
    );
    this.on("ui:request:adjustNodeSize", (n, f) => n.adjustNodeSize?.(f));
  }

  _handleNodeAdded(addedNodeId, addedNodeInstance) {
    if (!addedNodeInstance) return;

    setTimeout(() => {
      this.focusOnNode(addedNodeInstance, 0.6, true);
      this._uiPlugin?.setSelectedNode(addedNodeInstance);
      if (addedNodeInstance.data?.editable) {
        addedNodeInstance.htmlElement
          ?.querySelector(".node-content")
          ?.focus();
      }
    }, 100);
  }

  _setupEdgeEventListeners() {
    this.on("ui:request:addEdge", (s, t, d) =>
      this._edgePlugin?.addEdge(s, t, d),
    );
    this.on("ui:request:removeEdge", (id) =>
      this._edgePlugin?.removeEdge(id),
    );
    this.on("ui:request:reverseEdge", this._handleReverseEdge.bind(this));
    this.on("ui:request:updateEdge", this._handleUpdateEdge.bind(this));
  }

  _handleReverseEdge(edgeId) {
    const edge = this._edgePlugin?.getEdgeById(edgeId);
    if (!edge) return;

    [edge.source, edge.target] = [edge.target, edge.source];
    edge.update();
    this._layoutPlugin?.kick();
  }

  _handleUpdateEdge(edgeId, property, value) {
    const edge = this._edgePlugin?.getEdgeById(edgeId);
    if (!edge) return;

    if (property === "color") {
      edge.data.color = value;
      edge.setHighlight(this._uiPlugin?.getSelectedEdges().has(edge));
    } else if (property === "thickness") {
      edge.data.thickness = value;
      if (edge.line?.material)
        edge.line.material.linewidth = edge.data.thickness;
    } else if (property === "constraintType") {
      this._updateEdgeConstraint(edge, value);
      this._layoutPlugin?.kick();
    }
  }

  _updateEdgeConstraint(edge, constraintType) {
    edge.data.constraintType = constraintType;

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
      ...(constraintDefaults[constraintType] || {}),
      ...(edge.data.constraintParams || {}),
    };
  }

  _setupUIEventListeners() {
    this.on("ui:request:toggleBackground", (c, a) =>
      this._renderingPlugin?.setBackground(c, a),
    );
  }

  _setupCameraEventListeners() {
    this.on("ui:request:autoZoomNode", (n) => this.autoZoom(n));
    this.on("ui:request:centerView", () => this.centerView());
    this.on("ui:request:resetView", () => this._cameraPlugin?.resetView());
    this.on("ui:request:zoomCamera", (d) => this._cameraPlugin?.zoom(d));
    this.on("ui:request:focusOnNode", (n, d, p) =>
      this.focusOnNode(n, d, p),
    );
  }

  addNode(nodeInstance) {
    const addedNode = this._nodePlugin?.addNode(nodeInstance);
    if (addedNode && this._layoutPlugin) this._layoutPlugin.kick();
    return addedNode;
  }

  addEdge(sourceNode, targetNode, data = {}) {
    const addedEdge = this._edgePlugin?.addEdge(sourceNode, targetNode, data);
    if (addedEdge && this._layoutPlugin) this._layoutPlugin.kick();
    return addedEdge;
  }

  createNode(nodeConfig) {
    return this._nodePlugin?.createAndAddNode(nodeConfig);
  }

  togglePinNode(nodeId) {
    this._layoutPlugin?.layoutManager?.togglePinNode(nodeId);
  }

  centerView(targetPosition = null, duration = 0.7) {
    this._cameraPlugin?.centerView(targetPosition, duration);
  }

  focusOnNode(node, duration = 0.6, pushHistory = false) {
    this._cameraPlugin?.focusOnNode(node, duration, pushHistory);
  }

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

  _intersectInstanced(raycaster, manager, map, type) {
    const intersection = manager?.raycast(raycaster);
    const item = intersection && map?.get(intersection[`${type}Id`]);
    return item ? { [type]: item, distance: intersection.distance, type } : null;
  }

  _intersectStandard(raycaster, map, filter, type) {
    if (!map) return null;
    const meshes = [];
    for (const item of map.values()) {
      if (filter(item)) {
        meshes.push(item.mesh || item.line);
      }
    }

    if (meshes.length === 0) return null;

    const [intersect] = raycaster.intersectObjects(meshes, false);
    const item = intersect && map.get(intersect.object.userData?.[`${type}Id`]);
    return item ? { [type]: item, distance: intersect.distance, type } : null;
  }

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

    let closest = null;
    let intersection;

    // Instanced Nodes
    intersection = this._intersectInstanced(
      raycaster,
      this._renderingPlugin?.getInstancedMeshManager(),
      this._nodePlugin?.getNodes(),
      'node'
    );
    if (intersection) closest = intersection;

    // Standard Nodes
    intersection = this._intersectStandard(
      raycaster,
      this._nodePlugin?.getNodes(),
      isStandardNode,
      'node'
    );
    if (intersection && (!closest || intersection.distance < closest.distance)) {
      closest = intersection;
    }

    // Instanced Edges
    intersection = this._intersectInstanced(
      raycaster,
      this._edgePlugin?.instancedEdgeManager,
      this._edgePlugin?.getEdges(),
      'edge'
    );
    if (intersection && (!closest || intersection.distance < closest.distance)) {
      closest = intersection;
    }

    // Standard Edges
    intersection = this._intersectStandard(
      raycaster,
      this._edgePlugin?.getEdges(),
      isStandardEdge,
      'edge'
    );
    if (intersection && (!closest || intersection.distance < closest.distance)) {
      closest = intersection;
    }

    return closest;
  }

  animate() {
    const frame = () => {
      this.plugins.updatePlugins();
      requestAnimationFrame(frame);
    };
    frame();
  }

  dispose() {
    this.plugins.disposePlugins();
    this._listeners.clear();
  }

  exportGraphToJSON(options) {
    return this._dataPlugin?.exportGraphToJSON(options) ?? null;
  }

  async importGraphFromJSON(jsonData, options) {
    return (
      (await this._dataPlugin?.importGraphFromJSON(jsonData, options)) ?? false
    );
  }
}
