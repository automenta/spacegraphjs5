import {Plugin} from '../core/Plugin.js';
import {FractalZoomManager} from '../zoom/FractalZoomManager.js';
import {createContentAdapter} from '../zoom/ContentAdapter.js';

export class FractalZoomPlugin extends Plugin {
    constructor(spaceGraph, pluginManager, config = {}) {
        super(spaceGraph, pluginManager);

        this.config = {
            enabled: true,
            autoLOD: true,
            zoomStep: 0.5,
            maxZoomIn: 20,
            maxZoomOut: -10,
            transitionDuration: 0.8,
            ...config,
        };

        this.fractalZoomManager = null;
        this.contentAdapters = new Map();
        this.zoomListeners = new Set();
    }

    getName() {
        return 'FractalZoomPlugin';
    }

    init() {
        super.init();

        if (!this.config.enabled) return;

        this.fractalZoomManager = new FractalZoomManager(this.space);

        // Configure zoom parameters
        this.fractalZoomManager.zoomStep = this.config.zoomStep;
        this.fractalZoomManager.maxZoomIn = this.config.maxZoomIn;
        this.fractalZoomManager.maxZoomOut = this.config.maxZoomOut;
        this.fractalZoomManager.transitionDuration = this.config.transitionDuration;

        // Initialize with camera plugin
        const cameraPlugin = this.pluginManager.getPlugin('CameraPlugin');
        if (cameraPlugin) {
            this.fractalZoomManager.init(cameraPlugin);
        }

        this._subscribeToEvents();
        this._setupDefaultContentAdapters();

        // Expose fractal zoom API
        this.space.fractalZoom = {
            zoomToLevel: this.zoomToLevel.bind(this),
            zoomIn: this.zoomIn.bind(this),
            zoomOut: this.zoomOut.bind(this),
            resetZoom: this.resetZoom.bind(this),
            getZoomLevel: this.getZoomLevel.bind(this),
            getZoomRange: this.getZoomRange.bind(this),
            addContentAdapter: this.addContentAdapter.bind(this),
            addLODLevel: this.addLODLevel.bind(this),
            isTransitioning: this.isTransitioning.bind(this),
        };
    }

    _subscribeToEvents() {
        this.space.on('node:added', this._onNodeAdded.bind(this));
        this.space.on('node:removed', this._onNodeRemoved.bind(this));
        this.space.on('fractal-zoom:levelChanged', this._onZoomLevelChanged.bind(this));
        this.space.on('fractal-zoom:lodUpdated', this._onLODUpdated.bind(this));
    }

    _setupDefaultContentAdapters() {
        // Add default content adapters when nodes are created
        // This will be handled in _onNodeAdded
    }

    _onNodeAdded(nodeInstance) {
        if (!this.fractalZoomManager || !nodeInstance || !nodeInstance.id) {
            return;
        }

        try {
            this._createDefaultContentAdapter(nodeInstance.id, nodeInstance);
        } catch (error) {
            // Silently handle in production
        }
    }

    _onNodeRemoved(nodeId, node) {
        try {
            this.removeContentAdapter(nodeId);
        } catch (error) {
            // Silently handle in production
        }
    }

    _onZoomLevelChanged(data) {
        this.space.emit('ui:fractalZoom:levelChanged', data);

        this.zoomListeners.forEach(listener => {
            if (typeof listener === 'function') {
                listener(data);
            }
        });
    }

    _onLODUpdated(data) {
        this.space.emit('ui:fractalZoom:lodUpdated', data);
    }

    _createDefaultContentAdapter(nodeId, node) {
        try {
            if (!node || !node.htmlElement) {
                return;
            }

            const contentElement = node.htmlElement.querySelector('.node-content');
            if (!contentElement) {
                return;
            }

            const text = contentElement.textContent || contentElement.innerHTML || '';
            let adapter;

            if (typeof createContentAdapter !== 'function') {
                return;
            }

            if (text.length > 200) {
                adapter = createContentAdapter(nodeId, 'text');
                if (adapter && typeof adapter.defineProgressiveText === 'function') {
                    const summary = this._extractSummary(text);
                    const detail = this._extractDetail(text);
                    adapter.defineProgressiveText(summary, detail, text);
                } else {
                    adapter = null;
                }
            } else if (contentElement.querySelector('table, chart, canvas')) {
                adapter = createContentAdapter(nodeId, 'data');
            } else {
                adapter = createContentAdapter(nodeId, 'html');
                if (adapter && typeof adapter.defineHTMLLevel === 'function') {
                    adapter.defineHTMLLevel(-10, 10, text);
                } else {
                    adapter = null;
                }
            }

            if (adapter) {
                this.addContentAdapter(nodeId, adapter);
            }
        } catch (error) {
            // Silently handle in production
        }
    }

    _extractSummary(text) {
        const firstSentence = text.match(/[^.!?]*[.!?]/);
        if (firstSentence) {
            return firstSentence[0].trim();
        }
        return text.substring(0, 50) + (text.length > 50 ? '...' : '');
    }

    _extractDetail(text) {
        const firstParagraph = text.split('\n')[0];
        if (firstParagraph.length > 20) {
            return firstParagraph;
        }
        return text.substring(0, 150) + (text.length > 150 ? '...' : '');
    }

    // Zoom controls
    zoomToLevel(level, duration) {
        this.fractalZoomManager?.zoomToLevel(level, duration);
    }

    zoomIn() {
        this.fractalZoomManager?.zoomIn();
    }

    zoomOut() {
        this.fractalZoomManager?.zoomOut();
    }

    resetZoom(duration) {
        this.fractalZoomManager?.resetZoom(duration);
    }

    // Zoom information
    getZoomLevel() {
        return this.fractalZoomManager ? this.fractalZoomManager.getZoomLevel() : 0;
    }

    getZoomRange() {
        return this.fractalZoomManager
            ? this.fractalZoomManager.getZoomRange()
            : {
                min: -10,
                max: 20,
                current: 0,
                target: 0,
            };
    }

    isTransitioning() {
        return this.fractalZoomManager ? this.fractalZoomManager.isTransitioningZoom() : false;
    }

    // Content adapter management
    addContentAdapter(nodeId, adapter) {
        try {
            if (this.contentAdapters.has(nodeId)) {
                const oldAdapter = this.contentAdapters.get(nodeId);
                if (oldAdapter && typeof oldAdapter.dispose === 'function') {
                    oldAdapter.dispose();
                }
            }

            this.contentAdapters.set(nodeId, adapter);

            if (
                this.fractalZoomManager &&
                typeof this.fractalZoomManager.registerContentAdapter === 'function'
            ) {
                this.fractalZoomManager.registerContentAdapter(nodeId, adapter);
            }
        } catch (error) {
            // Silently handle in production
        }
    }

    removeContentAdapter(nodeId) {
        try {
            if (this.contentAdapters.has(nodeId)) {
                const adapter = this.contentAdapters.get(nodeId);
                if (adapter && typeof adapter.dispose === 'function') {
                    adapter.dispose();
                }
                this.contentAdapters.delete(nodeId);

                if (
                    this.fractalZoomManager &&
                    typeof this.fractalZoomManager.unregisterContentAdapter === 'function'
                ) {
                    this.fractalZoomManager.unregisterContentAdapter(nodeId);
                }
            }
        } catch (error) {
            // Silently handle in production
        }
    }

    // LOD management
    addLODLevel(zoomLevel, config) {
        this.fractalZoomManager?.addLODLevel(zoomLevel, config);
    }

    addZoomListener(listener) {
        this.zoomListeners.add(listener);
    }

    removeZoomListener(listener) {
        this.zoomListeners.delete(listener);
    }

    setEnabled(enabled) {
        this.config.enabled = enabled;
        if (!enabled && this.fractalZoomManager) {
            this.fractalZoomManager.resetZoom(0.5);
        }
    }

    updateConfig(newConfig) {
        this.config = {...this.config, ...newConfig};

        if (this.fractalZoomManager) {
            this.fractalZoomManager.zoomStep = this.config.zoomStep;
            this.fractalZoomManager.maxZoomIn = this.config.maxZoomIn;
            this.fractalZoomManager.maxZoomOut = this.config.maxZoomOut;
            this.fractalZoomManager.transitionDuration = this.config.transitionDuration;
        }
    }

    getCurrentLODConfig() {
        return this.fractalZoomManager ? this.fractalZoomManager.getCurrentLODConfig() : null;
    }

    updateLOD() {
        this.fractalZoomManager?._updateLOD();
    }

    dispose() {
        super.dispose();

        try {
            this.contentAdapters.forEach(adapter => {
                try {
                    if (adapter && typeof adapter.dispose === 'function') {
                        adapter.dispose();
                    }
                } catch (adapterError) {
                    // Silently handle in production
                }
            });
            this.contentAdapters.clear();

            this.zoomListeners.clear();

            if (this.fractalZoomManager) {
                if (typeof this.fractalZoomManager.dispose === 'function') {
                    this.fractalZoomManager.dispose();
                }
                this.fractalZoomManager = null;
            }

            if (this.space && this.space.fractalZoom) {
                delete this.space.fractalZoom;
            }
        } catch (error) {
            // Silently handle in production
        }
    }
}
