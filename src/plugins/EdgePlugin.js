// stdlib imports

// third-party imports

// local imports
import { Plugin } from "../core/Plugin.js";
import { Utils } from "../utils.js";
import { EdgeFactory } from "../graph/factories/EdgeFactory.js";
import { InstancedEdgeManager } from "../rendering/InstancedEdgeManager.js";

const INSTANCE_THRESHOLD = 50;

export class EdgePlugin extends Plugin {
  edges = new Map();
  /** @type {Map<string, Set<Edge>>} Map of node ID to Set of edges connected to it */
  nodeEdges = new Map();
  edgeFactory = null;
  instancedEdgeManager = null;
  useInstancedEdges = false;

  // Cached plugin references
  _renderingPlugin = null;
  _uiPlugin = null;
  _layoutPlugin = null;

  constructor(spaceGraph, pluginManager) {
    super(spaceGraph, pluginManager);
    this.edgeFactory = new EdgeFactory(spaceGraph);
  }

  getName() {
    return "EdgePlugin";
  }

  init() {
    super.init();
    this.space.on("renderer:resize", this.handleRendererResize.bind(this));

    this._renderingPlugin = this.pluginManager.getPlugin("RenderingPlugin");
    this._uiPlugin = this.pluginManager.getPlugin("UIPlugin");
    this._layoutPlugin = this.pluginManager.getPlugin("LayoutPlugin");

    if (!this._renderingPlugin?.getWebGLScene()) {
      console.error("EdgePlugin: RenderingPlugin or scene not available.");
      return;
    }
    this.instancedEdgeManager = new InstancedEdgeManager(
      this._renderingPlugin.getWebGLScene(),
    );
  }

  handleRendererResize({ width, height }) {
    for (const edge of this.edges.values()) {
      if (!edge.isInstanced && edge.updateResolution) {
        edge.updateResolution(width, height);
      }
    }
  }

  _checkAndSwitchInstancingMode() {
    const shouldUseInstancing = this.edges.size >= INSTANCE_THRESHOLD;
    if (this.useInstancedEdges === shouldUseInstancing) return;

    this.useInstancedEdges = shouldUseInstancing;

    if (!this._renderingPlugin || !this.instancedEdgeManager) return;

    const webglScene = this._renderingPlugin.getWebGLScene();
    const cssScene = this._renderingPlugin.getCSS3DScene();

    for (const edge of this.edges.values()) {
      if (this.useInstancedEdges) {
        if (!edge.isInstanced) {
          this._removeEdgeFromScene(edge, webglScene, cssScene);
          this.instancedEdgeManager.addEdge(edge);
        }
      } else {
        if (edge.isInstanced) {
          this.instancedEdgeManager.removeEdge(edge);
          this._addEdgeToScene(edge, webglScene, cssScene);
        }
      }
    }
  }

    _removeEdgeFromScene(edge, webglScene, _cssScene) {
    webglScene?.remove(edge.line);
    edge.arrowheads?.source && webglScene?.remove(edge.arrowheads.source);
    edge.arrowheads?.target && webglScene?.remove(edge.arrowheads.target);
  }

  _addEdgeToScene(edge, webglScene, cssScene) {
    edge.line && webglScene?.add(edge.line);
    edge.arrowheads?.source && webglScene?.add(edge.arrowheads.source);
    edge.arrowheads?.target && webglScene?.add(edge.arrowheads.target);
    edge.labelObject && cssScene?.add(edge.labelObject);
  }

  addEdge(sourceNode, targetNode, data = {}) {
    if (!sourceNode || !targetNode || sourceNode === targetNode) {
      console.warn("EdgePlugin: Invalid source or target.");
      return null;
    }

    // Check for duplicate edges using the nodeEdges index
    const sourceEdges = this.nodeEdges.get(sourceNode.id);
    let existingEdge = null;
    if (sourceEdges) {
      for (const edge of sourceEdges) {
        if (
          edge.target === targetNode ||
          (edge.source === targetNode && edge.target === sourceNode)
        ) {
          existingEdge = edge;
          break;
        }
      }
    }

    if (existingEdge) {
      console.warn(
        `EdgePlugin: Duplicate edge ignored between ${sourceNode.id} and ${targetNode.id}.`,
      );
      return existingEdge;
    }

    const edge = this.edgeFactory.createEdge(
      Utils.generateId("edge"),
      data.type || "default",
      sourceNode,
      targetNode,
      data,
    );

    if (!edge) {
      console.error(
        `EdgePlugin: Failed to create edge type "${data.type || "default"}".`,
      );
      return null;
    }

    this.edges.set(edge.id, edge);
    this._addEdgeToNodeIndex(edge);

    const webglScene = this._renderingPlugin?.getWebGLScene();
    const cssScene = this._renderingPlugin?.getCSS3DScene();

    this.edges.size >= INSTANCE_THRESHOLD
      ? this.instancedEdgeManager.addEdge(edge)
      : this._addEdgeToScene(edge, webglScene, cssScene);

    this._checkAndSwitchInstancingMode();
    this.space.emit("edge:added", edge);
    return edge;
  }

  removeEdge(edgeId) {
    const edge = this.edges.get(edgeId);
    if (!edge) return console.warn(`EdgePlugin: Edge ${edgeId} not found.`);

    this._uiPlugin?.getSelectedEdge() === edge &&
      this._uiPlugin.setSelectedEdge(null);
    this._layoutPlugin?.removeEdgeFromLayout(edge);

    if (edge.isInstanced && this.instancedEdgeManager) {
      this.instancedEdgeManager.removeEdge(edge);
    } else {
      const webglScene = this._renderingPlugin?.getWebGLScene();
      const cssScene = this._renderingPlugin?.getCSS3DScene();

      this._removeEdgeFromScene(edge, webglScene, cssScene);
      edge.labelObject && cssScene?.remove(edge.labelObject);
    }

    edge.dispose();
    this.edges.delete(edgeId);
    this._removeEdgeFromNodeIndex(edge);
    this._checkAndSwitchInstancingMode();
    this.space.emit("edge:removed", edgeId, edge);
  }

  getEdgeById(id) {
    return this.edges.get(id);
  }

  getEdges() {
    return this.edges;
  }

  getEdgesForNode(node) {
    const edges = this.nodeEdges.get(node.id);
    return edges ? [...edges] : [];
  }

  _addEdgeToNodeIndex(edge) {
    if (!this.nodeEdges.has(edge.source.id))
      this.nodeEdges.set(edge.source.id, new Set());
    if (!this.nodeEdges.has(edge.target.id))
      this.nodeEdges.set(edge.target.id, new Set());
    this.nodeEdges.get(edge.source.id).add(edge);
    this.nodeEdges.get(edge.target.id).add(edge);
  }

  _removeEdgeFromNodeIndex(edge) {
    this.nodeEdges.get(edge.source.id)?.delete(edge);
    this.nodeEdges.get(edge.target.id)?.delete(edge);
  }

  update() {
    for (const edge of this.edges.values()) {
      if (edge.isInstanced && this.instancedEdgeManager) {
        this.instancedEdgeManager.updateEdge(edge);
      } else {
        edge.update?.();
      }
      edge.updateLabelPosition?.();
    }
  }

  dispose() {
    super.dispose();
    this.instancedEdgeManager?.dispose();
    this.instancedEdgeManager = null;
    for (const edge of this.edges.values()) {
      edge.dispose();
    }
    this.edges.clear();
    this.nodeEdges.clear();
  }
}
