import {Plugin} from '../core/Plugin.js';
import {PerformanceManager} from '../performance/PerformanceManager.js';
import {LayoutWorkerManager, WorkerManager} from '../performance/WorkerManager.js';

export class PerformancePlugin extends Plugin {
    constructor(spaceGraph, pluginManager, config = {}) {
        super(spaceGraph, pluginManager);

        this.config = {
            enabled: true,
            enableInstancing: true,
            enableCulling: true,
            enableLOD: true,
            enableMemoryManagement: true,
            enableWorkers: true,
            autoOptimize: true,
            optimizationInterval: 5000,
            targetFrameRate: 60,
            performanceThreshold: 0.8,
            ...config,
        };

        this.performanceManager = null;
        this.workerManager = null;
        this.layoutWorkerManager = null;
        this.optimizationTimer = null;
        this.performanceMetrics = {
            frameRate: 60,
            frameTime: 16.67,
            memoryUsage: 0,
            objectCount: 0,
        };
        this.isMonitoring = false;
    }

    getName() {
        return 'PerformancePlugin';
    }

    init() {
        super.init();

        if (!this.config.enabled) {
            console.log('PerformancePlugin disabled');
            return;
        }

        this.performanceManager = new PerformanceManager(this.space);
        this.workerManager = new WorkerManager();
        this.layoutWorkerManager = new LayoutWorkerManager();

        const renderingPlugin = this.pluginManager.getPlugin('RenderingPlugin');
        if (renderingPlugin) {
            this.performanceManager.init(renderingPlugin);
        }

        if (this.config.enableWorkers) {
            this._initializeWorkers();
        }

        if (this.config.autoOptimize) {
            this._startPerformanceMonitoring();
        }

        this._exposePerformanceAPI();
        this._subscribeToEvents();
    }

    // Workers
    async _initializeWorkers() {
        try {
            await this.layoutWorkerManager.init();
        } catch (error) {
            console.error('Failed to initialize performance workers:', error);
        }
    }

    _subscribeToEvents() {
        this.space.on('render:beforeRender', () => {
            this.performanceManager?.update();
        });

        this.space.on('graph:changed', this._onGraphChanged.bind(this));
        this.space.on('layout:calculate', this._onLayoutCalculate.bind(this));
    }

    // Monitoring
    _startPerformanceMonitoring() {
        if (this.isMonitoring) return;
        this.isMonitoring = true;

        this.optimizationTimer = setInterval(() => {
            this._updatePerformanceMetrics();
            this._checkPerformanceThresholds();
        }, this.config.optimizationInterval);
    }

    _stopPerformanceMonitoring() {
        if (!this.isMonitoring) return;
        this.isMonitoring = false;

        if (this.optimizationTimer) {
            clearInterval(this.optimizationTimer);
            this.optimizationTimer = null;
        }
    }

    _updatePerformanceMetrics() {
        if (!this.performanceManager) return;

        const stats = this.performanceManager.getStats();
        this.performanceMetrics = {
            frameRate: 1000 / stats.avgFrameTime,
            frameTime: stats.avgFrameTime,
            memoryUsage: stats.memoryUsage,
            objectCount: stats.totalObjects,
            visibleObjects: stats.visibleObjects,
            instancedObjects: stats.instancedObjects,
        };

        this.space.emit('performance:update', this.performanceMetrics);
    }

    _checkPerformanceThresholds() {
        const targetFrameTime = 1000 / this.config.targetFrameRate;
        const performanceRatio = targetFrameTime / this.performanceMetrics.frameTime;

        if (performanceRatio < this.config.performanceThreshold) {
            console.log(
                `Performance below threshold (${(performanceRatio * 100).toFixed(1)}%), triggering optimizations`
            );
            this._triggerOptimizations();
        }
    }

    _triggerOptimizations() {
        if (!this.performanceManager) return;
        this.performanceManager.optimizePerformance();

        this.space.emit('performance:optimized', {
            reason: 'automatic',
            metrics: this.performanceMetrics,
        });
    }

    // Event handlers
    _onGraphChanged(data) {
        if (data.changeType === 'major' || data.objectsChanged > 10) {
            this._updatePerformanceMetrics();
        }
    }

    async _onLayoutCalculate(data) {
        if (!this.config.enableWorkers || !this.layoutWorkerManager.initialized) {
            return;
        }

        try {
            const {layoutType, nodes, edges, config} = data;
            const result = await this.layoutWorkerManager.calculateLayout(
                layoutType,
                nodes,
                edges,
                config
            );
            this.space.emit('layout:result', result);
        } catch (error) {
            console.error('Worker layout calculation failed:', error);
            this.space.emit('layout:error', error);
        }
    }

    // API exposure
    _exposePerformanceAPI() {
        this.space.performance = {
            // Monitoring
            getMetrics: () => this.getPerformanceMetrics(),
            getDetailedReport: () => this.getDetailedPerformanceReport(),

            // Configuration
            updateConfig: config => this.updatePerformanceConfig(config),
            getConfig: () => ({...this.config}),

            // Optimization
            optimize: () => this.optimizePerformance(),
            cleanup: () => this.cleanupPerformance(),

            // Feature controls
            setInstancingEnabled: enabled => this.setInstancingEnabled(enabled),
            setCullingEnabled: enabled => this.setCullingEnabled(enabled),
            setLODEnabled: enabled => this.setLODEnabled(enabled),
            setWorkersEnabled: enabled => this.setWorkersEnabled(enabled),

            // Worker controls
            getWorkerStats: () => this.getWorkerStats(),
            terminateWorkers: () => this.terminateWorkers(),

            // Monitoring controls
            startMonitoring: () => this._startPerformanceMonitoring(),
            stopMonitoring: () => this._stopPerformanceMonitoring(),
            isMonitoring: () => this.isMonitoring,
        };
    }

    // Metrics and reporting
    getPerformanceMetrics() {
        return {...this.performanceMetrics};
    }

    getDetailedPerformanceReport() {
        if (!this.performanceManager) {
            return {error: 'Performance manager not initialized'};
        }

        return {
            metrics: this.getPerformanceMetrics(),
            manager: this.performanceManager.getPerformanceReport(),
            workers: this.workerManager ? this.workerManager.getStats() : null,
            config: {...this.config},
        };
    }

    // Configuration
    updatePerformanceConfig(newConfig) {
        const oldConfig = {...this.config};
        this.config = {...this.config, ...newConfig};

        this.performanceManager?.updateConfig(this.config);
        this.workerManager?.updateConfig?.(this.config);

        if (oldConfig.autoOptimize !== this.config.autoOptimize) {
            if (this.config.autoOptimize) {
                this._startPerformanceMonitoring();
            } else {
                this._stopPerformanceMonitoring();
            }
        }

        this.space.emit('performance:configChanged', {oldConfig, newConfig: this.config});
    }

    // Optimization
    optimizePerformance() {
        if (this.performanceManager) {
            this.performanceManager.optimizePerformance();
            this.space.emit('performance:optimized', {reason: 'manual'});
        }
    }

    cleanupPerformance() {
        this.performanceManager?.cleanup();
        this.workerManager?.cleanupIdleWorkers?.();
        this.space.emit('performance:cleanup');
    }

    // Feature controls
    setInstancingEnabled(enabled) {
        this.config.enableInstancing = enabled;
        this.performanceManager?.updateConfig({enableInstancing: enabled});
    }

    setCullingEnabled(enabled) {
        this.config.enableCulling = enabled;
        this.performanceManager?.updateConfig({enableCulling: enabled});
    }

    setLODEnabled(enabled) {
        this.config.enableLOD = enabled;
        this.performanceManager?.updateConfig({enableLOD: enabled});
    }

    setWorkersEnabled(enabled) {
        this.config.enableWorkers = enabled;
        this.workerManager?.setEnabled?.(enabled);
        this.layoutWorkerManager?.setEnabled?.(enabled);
    }

    // Worker management
    getWorkerStats() {
        return {
            workerManager: this.workerManager?.getStats() ?? null,
            layoutWorkerManager: this.layoutWorkerManager?.getStats() ?? null,
        };
    }

    terminateWorkers() {
        this.workerManager?.terminateAll?.();
        this.layoutWorkerManager?.terminateAll?.();
    }

    // Status
    isEnabled() {
        return this.config.enabled;
    }

    setEnabled(enabled) {
        this.config.enabled = enabled;

        if (!enabled) {
            this._stopPerformanceMonitoring();
            this.terminateWorkers();
        } else if (this.config.autoOptimize) {
            this._startPerformanceMonitoring();
        }
    }

    getStatus() {
        return {
            enabled: this.config.enabled,
            monitoring: this.isMonitoring,
            instancing: this.config.enableInstancing,
            culling: this.config.enableCulling,
            lod: this.config.enableLOD,
            workers: this.config.enableWorkers,
            workerStats: this.getWorkerStats(),
        };
    }

    dispose() {
        super.dispose();
        this._stopPerformanceMonitoring();

        this.performanceManager?.dispose();
        this.performanceManager = null;

        this.workerManager?.dispose();
        this.workerManager = null;

        this.layoutWorkerManager?.dispose();
        this.layoutWorkerManager = null;

        if (this.space.performance) {
            delete this.space.performance;
        }
    }
}
