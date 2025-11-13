import {Plugin} from '../core/Plugin.js';
import {Utils} from '../utils.js';
import {EdgeFactory} from '../graph/factories/EdgeFactory.js';
import {InstancedEdgeManager} from '../rendering/InstancedEdgeManager.js';


const INSTANCE_THRESHOLD = 50;

export class EdgePlugin extends Plugin {
    edges = new Map();
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
        return 'EdgePlugin';
    }

    init() {
        super.init();
        this.space.on('renderer:resize', this.handleRendererResize.bind(this));

        this._renderingPlugin = this.pluginManager.getPlugin('RenderingPlugin');
        this._uiPlugin = this.pluginManager.getPlugin('UIPlugin');
        this._layoutPlugin = this.pluginManager.getPlugin('LayoutPlugin');

        if (!this._renderingPlugin?.getWebGLScene()) {
            console.error('EdgePlugin: RenderingPlugin or scene not available.');
            return;
        }
        this.instancedEdgeManager = new InstancedEdgeManager(this._renderingPlugin.getWebGLScene());
    }

    // Event handlers
    handleRendererResize({width, height}) {
        this.edges.forEach(edge => {
            if (!edge.isInstanced && edge.updateResolution) edge.updateResolution(width, height);
        });
    }

    // Instancing management
    _checkAndSwitchInstancingMode() {
        const shouldUseInstancing = this.edges.size >= INSTANCE_THRESHOLD;
        if (this.useInstancedEdges === shouldUseInstancing) return;

        this.useInstancedEdges = shouldUseInstancing;

        if (!this._renderingPlugin || !this.instancedEdgeManager) return;

        const webglScene = this._renderingPlugin.getWebGLScene();
        const cssScene = this._renderingPlugin.getCSS3DScene();

        this.edges.forEach(edge => {
            if (this.useInstancedEdges) {
                if (!edge.isInstanced) {
                    webglScene?.remove(edge.line);
                    if (edge.arrowheads?.source) webglScene?.remove(edge.arrowheads.source);
                    if (edge.arrowheads?.target) webglScene?.remove(edge.arrowheads.target);
                    this.instancedEdgeManager.addEdge(edge);
                }
            } else {
                if (edge.isInstanced) {
                    this.instancedEdgeManager.removeEdge(edge);
                }
                if (edge.line) webglScene?.add(edge.line);
                if (edge.arrowheads?.source) webglScene?.add(edge.arrowheads.source);
                if (edge.arrowheads?.target) webglScene?.add(edge.arrowheads.target);
            }
            if (edge.labelObject) {
                cssScene?.add(edge.labelObject);
            }
        });
    }

    // Edge management
    addEdge(sourceNode, targetNode, data = {}) {
        if (!sourceNode || !targetNode || sourceNode === targetNode) {
            console.warn('EdgePlugin: Invalid source or target.');
            return null;
        }

        // Check for duplicate edges
        for (const existingEdge of this.edges.values()) {
            if (
                (existingEdge.source === sourceNode && existingEdge.target === targetNode) ||
                (existingEdge.source === targetNode && existingEdge.target === sourceNode)
            ) {
                console.warn(
                    `EdgePlugin: Duplicate edge ignored between ${sourceNode.id} and ${targetNode.id}.`
                );
                return existingEdge;
            }
        }

        const edge = this.edgeFactory.createEdge(
            Utils.generateId('edge'),
            data.type || 'default',
            sourceNode,
            targetNode,
            data
        );

        if (!edge) {
            console.error(`EdgePlugin: Failed to create edge type "${data.type || 'default'}".`);
            return null;
        }

        this.edges.set(edge.id, edge);

        const webglScene = this._renderingPlugin?.getWebGLScene();
        const cssScene = this._renderingPlugin?.getCSS3DScene();

        if (this.edges.size >= INSTANCE_THRESHOLD) {
            this.instancedEdgeManager.addEdge(edge);
        } else {
            if (edge.line) webglScene?.add(edge.line);
            if (edge.arrowheads?.source) webglScene?.add(edge.arrowheads.source);
            if (edge.arrowheads?.target) webglScene?.add(edge.arrowheads.target);
        }
        if (edge.labelObject) cssScene?.add(edge.labelObject);

        this._checkAndSwitchInstancingMode();
        this.space.emit('edge:added', edge);
        return edge;
    }

    removeEdge(edgeId) {
        const edge = this.edges.get(edgeId);
        if (!edge) return console.warn(`EdgePlugin: Edge ${edgeId} not found.`);

        this._uiPlugin?.getSelectedEdge() === edge && this._uiPlugin?.setSelectedEdge(null);

        this._layoutPlugin?.removeEdgeFromLayout(edge);

        if (edge.isInstanced && this.instancedEdgeManager) {
            this.instancedEdgeManager.removeEdge(edge);
        } else {
            this._renderingPlugin?.getWebGLScene()?.remove(edge.line);
            if (edge.arrowheads?.source)
                this._renderingPlugin?.getWebGLScene()?.remove(edge.arrowheads.source);
            if (edge.arrowheads?.target)
                this._renderingPlugin?.getWebGLScene()?.remove(edge.arrowheads.target);
            if (edge.labelObject) this._renderingPlugin?.getCSS3DScene()?.remove(edge.labelObject);
        }

        edge.dispose();
        this.edges.delete(edgeId);
        this._checkAndSwitchInstancingMode();
        this.space.emit('edge:removed', edgeId, edge);
    }

    getEdgeById(id) {
        return this.edges.get(id);
    }

    getEdges() {
        return this.edges;
    }

    getEdgesForNode(node) {
        const connectedEdges = [];
        for (const edge of this.edges.values()) {
            if (edge.source === node || edge.target === node) connectedEdges.push(edge);
        }
        return connectedEdges;
    }

    // Updates
    update() {
        this.edges.forEach(edge => {
            if (edge.isInstanced && this.instancedEdgeManager) {
                this.instancedEdgeManager.updateEdge(edge);
            } else {
                edge.update?.();
            }
            edge.updateLabelPosition?.();
        });
    }

    dispose() {
        super.dispose();
        this.instancedEdgeManager?.dispose();
        this.instancedEdgeManager = null;
        this.edges.forEach(edge => edge.dispose());
        this.edges.clear();
    }
}
