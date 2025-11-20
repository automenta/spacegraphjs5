// stdlib imports

// third-party imports

// local imports
import { Plugin } from "../core/Plugin.js";
import { Utils } from "../utils.js";
import { NodeFactory } from "../graph/factories/NodeFactory.js";
import { ShapeNode } from "../graph/nodes/ShapeNode.js";

export class NodePlugin extends Plugin {
  nodes = new Map();
  nodeFactory = null;
  instancedMeshManager = null;

  // Cached plugin references
  _edgePlugin = null;
  _uiPlugin = null;
  _layoutPlugin = null;
  _renderingPlugin = null;

  constructor(spaceGraph, pluginManager) {
    super(spaceGraph, pluginManager);
    this.nodeFactory = new NodeFactory(spaceGraph);
  }

  getName() {
    return "NodePlugin";
  }

  init() {
    super.init();
    this._edgePlugin = this.pluginManager.getPlugin("EdgePlugin");
    this._uiPlugin = this.pluginManager.getPlugin("UIPlugin");
    this._layoutPlugin = this.pluginManager.getPlugin("LayoutPlugin");
    this._renderingPlugin = this.pluginManager.getPlugin("RenderingPlugin");
    this.instancedMeshManager =
      this._renderingPlugin?.getInstancedMeshManager();
  }

  addNode(nodeInstance) {
    nodeInstance.id ??= Utils.generateId("node");
    if (this.nodes.has(nodeInstance.id)) {
      console.warn(`NodePlugin: Node ${nodeInstance.id} already exists.`);
      return this.nodes.get(nodeInstance.id);
    }

    this.nodes.set(nodeInstance.id, nodeInstance);
    nodeInstance.space = this.space;

    const cssScene = this._renderingPlugin?.getCSS3DScene();
    const webglScene = this._renderingPlugin?.getWebGLScene();

    const successfullyInstanced =
      this.instancedMeshManager &&
      nodeInstance instanceof ShapeNode &&
      nodeInstance.data.shape === "sphere" &&
      this.instancedMeshManager.addNode(nodeInstance);

    nodeInstance.cssObject && cssScene?.add(nodeInstance.cssObject);
    nodeInstance.labelObject && cssScene?.add(nodeInstance.labelObject);
    !successfullyInstanced &&
      nodeInstance.mesh &&
      webglScene?.add(nodeInstance.mesh);

    this.space.emit("node:added", nodeInstance.id, nodeInstance);
    return nodeInstance;
  }

  createAndAddNode({ id, type, position, data = {}, mass = 1.0 }) {
    const nodeId = id || Utils.generateId("node");
    if (!type || !position) {
      console.error("NodePlugin: Type and position required.");
      return undefined;
    }

    const nodeInstance = this.nodeFactory.createNode(
      nodeId,
      type,
      position,
      data,
      mass,
    );
    return nodeInstance ? this.addNode(nodeInstance) : undefined;
  }

  removeNode(nodeId) {
    const node = this.nodes.get(nodeId);
    if (!node) return console.warn(`NodePlugin: Node ${nodeId} not found.`);

    this._uiPlugin?.getSelectedNode() === node &&
      this._uiPlugin.setSelectedNode(null);
    this._uiPlugin?.getLinkSourceNode() === node &&
      this._uiPlugin.cancelLinking();

    for (const edge of this._edgePlugin?.getEdgesForNode(node) || []) {
      this._edgePlugin?.removeEdge(edge.id);
    }

    this._layoutPlugin?.removeNodeFromLayout(node);

    node.isInstanced &&
      this.instancedMeshManager &&
      this.instancedMeshManager.removeNode(node);
    node.dispose();
    this.nodes.delete(nodeId);
    this.space.emit("node:removed", nodeId, node);
  }

  getNodeById(id) {
    return this.nodes.get(id);
  }

  getNodes() {
    return this.nodes;
  }

  update() {
    for (const node of this.nodes.values()) {
      if (node.isInstanced && this.instancedMeshManager) {
        this.instancedMeshManager.updateNode(node);
      }
      node.update?.(this.space);
    }
  }

  dispose() {
    super.dispose();
    for (const node of this.nodes.values()) {
      node.dispose();
    }
    this.nodes.clear();
  }
}
