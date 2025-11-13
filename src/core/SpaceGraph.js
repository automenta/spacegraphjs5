// stdlib imports
import * as THREE from 'three';

// local imports
import {HtmlNode} from '../graph/nodes/HtmlNode.js';
import {PluginManager} from './PluginManager.js';
import {RenderingPlugin} from '../plugins/RenderingPlugin.js';
import {CameraPlugin} from '../plugins/CameraPlugin.js';
import {NodePlugin} from '../plugins/NodePlugin.js';
import {EdgePlugin} from '../plugins/EdgePlugin.js';
import {LayoutPlugin} from '../plugins/LayoutPlugin.js';
import {UIPlugin} from '../plugins/UIPlugin.js';
import {MinimapPlugin} from '../plugins/MinimapPlugin.js';
import {DataPlugin} from '../plugins/DataPlugin.js';
import {FractalZoomPlugin} from '../plugins/FractalZoomPlugin.js';
import {PerformancePlugin} from '../plugins/PerformancePlugin.js';

export class SpaceGraph {
    _listeners = new Map();
    plugins = null;
    options = {};
    
    // Camera mouse control properties
    _isDragging = false;
    _lastMouseX = 0;
    _lastMouseY = 0;
    
    // Bound event handlers
    _boundHandlers = new Map();

    constructor(containerElement, options = {}) {
        if (!containerElement) {
            throw new TypeError('SpaceGraph requires a valid HTML container element.');
        }

        this.container = containerElement;
        this.options = options;
        this.plugins = new PluginManager(this);

        const uiOptions = options.ui || {};
        const {contextMenuElement, confirmDialogElement} = uiOptions;

        // Register core plugins
        this._registerCorePlugins([
            [CameraPlugin, [this, this.plugins]],
            [RenderingPlugin, [this, this.plugins]],
            [NodePlugin, [this, this.plugins]],
            [EdgePlugin, [this, this.plugins]],
            [LayoutPlugin, [this, this.plugins]],
            [UIPlugin, [this, this.plugins, contextMenuElement, confirmDialogElement]],
            [MinimapPlugin, [this, this.plugins]],
            [DataPlugin, [this, this.plugins]],
            [FractalZoomPlugin, [this, this.plugins]],
            [PerformancePlugin, [this, this.plugins]]
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
        const container = typeof containerOrContainerID === 'string'
            ? document.getElementById(containerOrContainerID)
            : containerOrContainerID;

        if (!container) {
            throw new ReferenceError(`Container not found: ${containerOrContainerID}`);
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
                contextMenuElement: document.createElement('div'),
                confirmDialogElement: document.createElement('div'),
            }
        };

        return {
            ...defaultOptions,
            ...options,
            ui: {
                ...defaultOptions.ui,
                ...(options.ui || {})
            }
        };
    }

    async init() {
        try {
            await this.plugins.initPlugins();
            this._cachePlugins();
            this._initializeCamera();
            this._bindEventHandlers();
            this._setupAllEventListeners();
            this._setupCameraMouseControls();
        } catch (error) {
            console.error('SpaceGraph initialization failed:', error);
            throw new Error(`Initialization failed: ${error.message}`);
        }
    }

    _cachePlugins() {
        this._cameraPlugin = this.plugins.getPlugin('CameraPlugin');
        this._nodePlugin = this.plugins.getPlugin('NodePlugin');
        this._edgePlugin = this.plugins.getPlugin('EdgePlugin');
        this._layoutPlugin = this.plugins.getPlugin('LayoutPlugin');
        this._uiPlugin = this.plugins.getPlugin('UIPlugin');
        this._renderingPlugin = this.plugins.getPlugin('RenderingPlugin');
        this._dataPlugin = this.plugins.getPlugin('DataPlugin');
    }

    _initializeCamera() {
        this._cameraPlugin?.centerView(null, 0);
        this._cameraPlugin?.setInitialState();
    }

    _bindEventHandlers() {
        const handlers = {
            contextmenu: this._handleContextMenuEvent.bind(this),
            mousedown: this._handleMouseDownEvent.bind(this),
            mousemove: this._handleMouseMoveEvent.bind(this),
            mouseup: this._handleMouseUpOrLeaveEvent.bind(this),
            mouseleave: this._handleMouseUpOrLeaveEvent.bind(this),
            wheel: this._handleWheelEvent.bind(this)
        };

        for (const [event, handler] of Object.entries(handlers)) {
            this._boundHandlers.set(event, handler);
        }
    }

    on(eventName, callback) {
        this._listeners.has(eventName) || this._listeners.set(eventName, new Set());
        this._listeners.get(eventName).add(callback);
    }

    off(eventName, callback) {
        this._listeners.get(eventName)?.delete(callback);
    }

    emit(eventName, ...args) {
        this._listeners.get(eventName)?.forEach(callback => callback(...args));
    }

    _setupAllEventListeners() {
        this._setupNodeEventListeners();
        this._setupEdgeEventListeners();
        this._setupUIEventListeners();
        this._setupCameraEventListeners();
    }

    _setupNodeEventListeners() {
        this.on('ui:request:addNode', nodeInstance => this._nodePlugin?.addNode(nodeInstance));
        this.on('ui:request:createNode', nodeConfig => this._nodePlugin?.createAndAddNode(nodeConfig));
        this.on('node:added', this._handleNodeAdded.bind(this));
        this.on('ui:request:removeNode', nodeId => this._nodePlugin?.removeNode(nodeId));
        this.on('ui:request:adjustContentScale', this._handleAdjustContentScale.bind(this));
        this.on('ui:request:adjustNodeSize', this._handleAdjustNodeSize.bind(this));
    }

    _handleNodeAdded(addedNodeId, addedNodeInstance) {
        if (!addedNodeInstance) return;
        
        setTimeout(() => {
            this.focusOnNode(addedNodeInstance, 0.6, true);
            this._uiPlugin?.setSelectedNode(addedNodeInstance);
            if (addedNodeInstance instanceof HtmlNode && addedNodeInstance.data.editable) {
                addedNodeInstance.htmlElement?.querySelector('.node-content')?.focus();
            }
        }, 100);
    }

    _handleAdjustContentScale(node, factor) {
        if (node instanceof HtmlNode) node.adjustContentScale(factor);
    }

    _handleAdjustNodeSize(node, factor) {
        if (node instanceof HtmlNode) node.adjustNodeSize(factor);
    }

    _setupEdgeEventListeners() {
        this.on('ui:request:addEdge', (sourceNode, targetNode, data) =>
            this._edgePlugin?.addEdge(sourceNode, targetNode, data)
        );
        this.on('ui:request:removeEdge', edgeId => this._edgePlugin?.removeEdge(edgeId));
        this.on('ui:request:reverseEdge', this._handleReverseEdge.bind(this));
        this.on('ui:request:updateEdge', this._handleUpdateEdge.bind(this));
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

        this._updateEdgeProperty(edge, property, value);
    }

    _updateEdgeProperty(edge, property, value) {
        const propertyHandlers = {
            color: (edge, value) => {
                edge.data.color = value;
                edge.setHighlight(this._uiPlugin?.getSelectedEdges().has(edge));
            },
            thickness: (edge, value) => {
                edge.data.thickness = value;
                if (edge.line?.material) edge.line.material.linewidth = edge.data.thickness;
            },
            constraintType: (edge, value) => {
                this._updateEdgeConstraint(edge, value);
                this._layoutPlugin?.kick();
            }
        };

        propertyHandlers[property]?.(edge, value);
    }

    _updateEdgeConstraint(edge, constraintType) {
        edge.data.constraintType = constraintType;
        const params = edge.data.constraintParams || {};

        const constraintDefaults = {
            rigid: { distance: edge.source.position.distanceTo(edge.target.position), stiffness: 0.1 },
            weld: { distance: edge.source.getBoundingSphereRadius() + edge.target.getBoundingSphereRadius(), stiffness: 0.5 },
            elastic: { stiffness: 0.001, idealLength: 200 }
        };

        edge.data.constraintParams = { ...constraintDefaults[constraintType], ...params };
    }

    _setupUIEventListeners() {
        this.on('ui:request:toggleBackground', (color, alpha) =>
            this._renderingPlugin?.setBackground(color, alpha)
        );
    }

    _setupCameraEventListeners() {
        this.on('ui:request:autoZoomNode', node => this.autoZoom(node));
        this.on('ui:request:centerView', () => this.centerView());
        this.on('ui:request:resetView', () => this._cameraPlugin?.resetView());
        this.on('ui:request:zoomCamera', deltaY => this._cameraPlugin?.zoom(deltaY));
        this.on('ui:request:focusOnNode', (node, duration, pushHistory) =>
            this.focusOnNode(node, duration, pushHistory)
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
            -(screenY / window.innerHeight) * 2 + 1
        );
        raycaster.setFromCamera(vec, camInstance);
        const targetPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -targetZ);
        const intersectPoint = new THREE.Vector3();
        return raycaster.ray.intersectPlane(targetPlane, intersectPoint) ?? null;
    }

    _intersectObjects(raycaster, intersectionHandlers) {
        return intersectionHandlers
            .map(handler => handler(raycaster))
            .filter(Boolean)
            .sort((a, b) => a.distance - b.distance)[0];
    }

    _intersectInstancedNodes(raycaster) {
        const instancedNodeManager = this._renderingPlugin?.getInstancedMeshManager();
        const intersection = instancedNodeManager?.raycast(raycaster);
        const node = intersection && this._nodePlugin?.getNodeById(intersection.nodeId);
        return node ? {node, distance: intersection.distance, type: 'node'} : null;
    }

    _intersectNonInstancedNodes(raycaster) {
        const currentNodes = this._nodePlugin?.getNodes();
        const nonInstancedNodeMeshes = currentNodes ? [...currentNodes.values()]
            .filter(n => !n.isInstanced && n.mesh?.visible)
            .map(n => n.mesh) : [];

        if (nonInstancedNodeMeshes.length === 0) return null;

        const [firstIntersect] = raycaster.intersectObjects(nonInstancedNodeMeshes, false);
        const node = firstIntersect && this._nodePlugin.getNodeById(firstIntersect.object.userData?.nodeId);
        return node ? {node, distance: firstIntersect.distance, type: 'node'} : null;
    }

    _intersectInstancedEdges(raycaster) {
        const instancedEdgeManager = this._edgePlugin?.instancedEdgeManager;
        const intersection = instancedEdgeManager?.raycast(raycaster);
        const edge = intersection && this._edgePlugin?.getEdgeById(intersection.edgeId);
        return edge ? {edge, distance: intersection.distance, type: 'edge'} : null;
    }

    _intersectNonInstancedEdges(raycaster) {
        const currentEdges = this._edgePlugin?.getEdges();
        const nonInstancedEdgeLines = currentEdges ? [...currentEdges.values()]
            .filter(e => !e.isInstanced && e.line?.visible)
            .map(e => e.line) : [];

        if (nonInstancedEdgeLines.length === 0) return null;

        const [firstIntersect] = raycaster.intersectObjects(nonInstancedEdgeLines, false);
        const edge = firstIntersect && this._edgePlugin.getEdgeById(firstIntersect.object.userData?.edgeId);
        return edge ? {edge, distance: firstIntersect.distance, type: 'edge'} : null;
    }

    intersectedObjects(screenX, screenY) {
        const camInstance = this._cameraPlugin?.getCameraInstance();
        if (!camInstance) return null;

        camInstance.updateMatrixWorld();
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(
            (screenX / window.innerWidth) * 2 - 1,
            -(screenY / window.innerHeight) * 2 + 1
        ), camInstance);
        raycaster.params.Line.threshold = 5;

        const closestIntersect = this._intersectObjects(raycaster, [
            this._intersectInstancedNodes.bind(this),
            this._intersectNonInstancedNodes.bind(this),
            this._intersectInstancedEdges.bind(this),
            this._intersectNonInstancedEdges.bind(this)
        ]);

        if (!closestIntersect) return null;

        return closestIntersect.type === 'node'
            ? {node: closestIntersect.node, distance: closestIntersect.distance}
            : {edge: closestIntersect.edge, distance: closestIntersect.distance};
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
        this._removeCameraMouseControls();
    }

    exportGraphToJSON(options) {
        return this._dataPlugin?.exportGraphToJSON(options) ?? null;
    }

    async importGraphFromJSON(jsonData, options) {
        return (await this._dataPlugin?.importGraphFromJSON(jsonData, options)) ?? false;
    }

    _setupCameraMouseControls() {
        if (!this._cameraPlugin || !this.container) return;

        for (const [event, handler] of this._boundHandlers) {
            this.container.addEventListener(event, handler, event === 'wheel' ? {passive: false} : undefined);
        }
    }

    _handleContextMenuEvent(event) {
        const cameraControls = this._cameraPlugin?.getControls();
        if (cameraControls?.cameraMode === 'drag_orbit' && cameraControls?.isOrbitDragging) {
            event.preventDefault();
        }
    }

    _handleMouseDownEvent(event) {
        const cameraControls = this._cameraPlugin?.getControls();
        if (!cameraControls) return;

        this._isDragging = true;
        this._lastMouseX = event.clientX;
        this._lastMouseY = event.clientY;

        const {cameraMode, button} = {cameraMode: cameraControls.cameraMode, button: event.button};
        
        switch (cameraMode) {
            case 'drag_orbit':
                button === 0
                    ? cameraControls.startPan(event.clientX, event.clientY)
                    : (button === 1 || button === 2) && (event.preventDefault(), cameraControls.startOrbitDrag(event.clientX, event.clientY));
                break;
            case 'orbit':
            case 'top_down':
                button === 0 && cameraControls.startPan(event.clientX, event.clientY);
                break;
        }
    }

    _handleMouseMoveEvent(event) {
        if (!this._isDragging) return;
        const cameraControls = this._cameraPlugin?.getControls();
        if (!cameraControls) return;

        const deltaX = event.clientX - this._lastMouseX;
        const deltaY = event.clientY - this._lastMouseY;
        this._lastMouseX = event.clientX;
        this._lastMouseY = event.clientY;

        cameraControls.isPanning && cameraControls.pan(deltaX, deltaY);
        cameraControls.isOrbitDragging && cameraControls.orbitDrag(deltaX, deltaY);
    }

    _handleMouseUpOrLeaveEvent() {
        if (!this._isDragging) return;
        const cameraControls = this._cameraPlugin?.getControls();
        if (!cameraControls) return;

        cameraControls.isPanning && cameraControls.endPan();
        cameraControls.isOrbitDragging && cameraControls.endOrbitDrag();
        this._isDragging = false;
    }

    _handleWheelEvent(event) {
        const cameraControls = this._cameraPlugin?.getControls();
        if (!cameraControls) return;
        this.emit('ui:request:zoomCamera', event.deltaY);
        event.preventDefault();
    }

    _removeCameraMouseControls() {
        if (!this.container) return;

        for (const [event, handler] of this._boundHandlers) {
            this.container.removeEventListener(event, handler);
        }
        this._boundHandlers.clear();
    }
}