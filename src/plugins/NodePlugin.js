import {Plugin} from '../core/Plugin.js';
import {Utils} from '../utils.js';
import {NodeFactory} from '../graph/NodeFactory.js';

// Import all node types
import {HtmlNode} from '../graph/nodes/HtmlNode.js';
import {ShapeNode} from '../graph/nodes/ShapeNode.js';
import {ImageNode} from '../graph/nodes/ImageNode.js';
import {VideoNode} from '../graph/nodes/VideoNode.js';
import {IFrameNode} from '../graph/nodes/IFrameNode.js';
import {GroupNode} from '../graph/nodes/GroupNode.js';
import {DataNode} from '../graph/nodes/DataNode.js';
import {NoteNode} from '../graph/nodes/NoteNode.js';
import {AudioNode} from '../graph/nodes/AudioNode.js';
import {DocumentNode} from '../graph/nodes/DocumentNode.js';
import {ChartNode} from '../graph/nodes/ChartNode.js';

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
        this._registerNodeTypes();
    }

    _registerNodeTypes() {
        this.nodeFactory.registerType(HtmlNode.typeName, HtmlNode);
        this.nodeFactory.registerType(ShapeNode.typeName, ShapeNode);
        this.nodeFactory.registerType(ImageNode.typeName, ImageNode);
        this.nodeFactory.registerType(VideoNode.typeName, VideoNode);
        this.nodeFactory.registerType(IFrameNode.typeName, IFrameNode);
        this.nodeFactory.registerType(GroupNode.typeName, GroupNode);
        this.nodeFactory.registerType(DataNode.typeName, DataNode);
        this.nodeFactory.registerType(NoteNode.typeName, NoteNode);
        this.nodeFactory.registerType(AudioNode.typeName, AudioNode);
        this.nodeFactory.registerType(DocumentNode.typeName, DocumentNode);
        this.nodeFactory.registerType(ChartNode.typeName, ChartNode);
        this.nodeFactory.registerType('default', ShapeNode);
    }

    getName() {
        return 'NodePlugin';
    }

    init() {
        super.init();
        this._edgePlugin = this.pluginManager.getPlugin('EdgePlugin');
        this._uiPlugin = this.pluginManager.getPlugin('UIPlugin');
        this._layoutPlugin = this.pluginManager.getPlugin('LayoutPlugin');
        this._renderingPlugin = this.pluginManager.getPlugin('RenderingPlugin');
        this.instancedMeshManager = this._renderingPlugin?.getInstancedMeshManager();
    }

    // Node management
    addNode(nodeInstance) {
        nodeInstance.id ??= Utils.generateId('node');
        if (this.nodes.has(nodeInstance.id)) {
            console.warn(`NodePlugin: Node ${nodeInstance.id} already exists.`);
            return this.nodes.get(nodeInstance.id);
        }

        this.nodes.set(nodeInstance.id, nodeInstance);
        nodeInstance.space = this.space;

        const cssScene = this._renderingPlugin?.getCSS3DScene();
        const webglScene = this._renderingPlugin?.getWebGLScene();

        let successfullyInstanced = false;
        if (
            this.instancedMeshManager &&
            nodeInstance instanceof ShapeNode &&
            nodeInstance.data.shape === 'sphere'
        ) {
            successfullyInstanced = this.instancedMeshManager.addNode(nodeInstance);
        }

        if (nodeInstance.cssObject && cssScene) cssScene.add(nodeInstance.cssObject);
        if (nodeInstance.labelObject && cssScene) cssScene.add(nodeInstance.labelObject);
        if (!successfullyInstanced && nodeInstance.mesh && webglScene)
            webglScene.add(nodeInstance.mesh);

        this.space.emit('node:added', nodeInstance.id, nodeInstance);
        return nodeInstance;
    }

    createAndAddNode({id, type, position, data = {}, mass = 1.0}) {
        const nodeId = id || Utils.generateId('node');
        if (!type || !position) {
            console.error('NodePlugin: Type and position required.');
            return undefined;
        }

        const nodeInstance = this.nodeFactory.createNode(nodeId, type, position, data, mass);
        return nodeInstance ? this.addNode(nodeInstance) : undefined;
    }

    removeNode(nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node) return console.warn(`NodePlugin: Node ${nodeId} not found.`);

        if (this._uiPlugin?.getSelectedNode() === node) this._uiPlugin.setSelectedNode(null);
        if (this._uiPlugin?.getLinkSourceNode() === node) this._uiPlugin.cancelLinking();

        this._edgePlugin?.getEdgesForNode(node).forEach(edge => this._edgePlugin?.removeEdge(edge.id));

        this._layoutPlugin?.removeNodeFromLayout(node);

        if (node.isInstanced && this.instancedMeshManager) this.instancedMeshManager.removeNode(node);
        node.dispose();
        this.nodes.delete(nodeId);
        this.space.emit('node:removed', nodeId, node);
    }

    getNodeById(id) {
        return this.nodes.get(id);
    }

    getNodes() {
        return this.nodes;
    }

    // Updates
    update() {
        this.nodes.forEach(node => {
            if (node.isInstanced && this.instancedMeshManager) this.instancedMeshManager.updateNode(node);
            node.update?.(this.space);
        });
    }

    dispose() {
        super.dispose();
        this.nodes.forEach(node => node.dispose());
        this.nodes.clear();
    }
}
