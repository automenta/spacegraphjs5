import * as THREE from 'three';
import { Plugin } from '../core/Plugin.js';
import { Utils } from '../utils.js';

class CalibrationManager {
    constructor(plugin) {
        this.plugin = plugin;
        this.active = false;
        this.round = 0;

        this.baseline = null;
        this.variant = null;
        this.activeVariantKey = 'A'; // 'A' or 'B'
        this.history = [];
    }

    start() {
        this.active = true;
        this.round = 1;
        this.history = [];
        this.baseline = { ...this.plugin.config };
        this._generateVariant();
        this.apply('A');
        console.log('Ergonomics: Calibration started.');
    }

    stop() {
        this.active = false;
        if (this.baseline) {
            this.plugin.updateConfig(this.baseline);
        }
        console.log('Ergonomics: Calibration stopped.');
    }

    _generateVariant() {
        // Create a variant by perturbing the baseline
        const c = { ...this.baseline };

        // Mutate parameters
        // Randomly decide direction for each, or pick one to mutate?
        // Let's mutate all slightly for a "holistic" feel, or maybe just one.
        // Mutating all creates a distinct "feel".

        const factor = () => 1.0 + (Math.random() * 0.4 - 0.2); // +/- 20%

        c.dampingFactor = Utils.clamp(c.dampingFactor * factor(), 0.01, 0.5);
        c.zoomSpeed = Utils.clamp(c.zoomSpeed * factor(), 0.1, 5.0);
        c.panSpeed = Utils.clamp(c.panSpeed * factor(), 0.1, 3.0);
        c.targetNodeSizePx = Utils.clamp(c.targetNodeSizePx * factor(), 10, 200);

        this.variant = c;
        console.log('Ergonomics: Generated Variant B', this.variant);
    }

    apply(key) {
        this.activeVariantKey = key;
        const config = key === 'A' ? this.baseline : this.variant;
        this.plugin.updateConfig(config);
        // If target node size changed, we might want to trigger autotune or adjust sizes?
        // For now, let's just update the config. The user will feel the interaction changes immediately.
        // Visual changes (node size) requires resize.
        if (config.targetNodeSizePx !== this.plugin.metrics.avgNodeSizePx) {
             // We don't force resize here to avoid jarring jumps,
             // unless we want to test "size preference".
             // Let's assume the user explores by zooming, so targetNodeSize affects the "Readability" metric
             // but mainly we want to test Interaction physics.
        }
    }

    vote(key) {
        if (!this.active) return;

        // Record the RLFP example
        this.history.push({
            round: this.round,
            timestamp: Date.now(),
            baseline: { ...this.baseline },
            variant: { ...this.variant },
            choice: key, // 'A' or 'B'
            userPreferredConfig: key === 'B' ? { ...this.variant } : { ...this.baseline }
        });

        console.log(`Ergonomics: Voted for ${key}`);

        if (key === 'B') {
            this.baseline = { ...this.variant };
            // Save to storage?
            this._saveToStorage();
        }

        this.round++;
        this._generateVariant();
        this.apply('A'); // Reset to new baseline
    }

    exportDataset() {
        const data = JSON.stringify(this.history, null, 2);
        const blob = new Blob([data], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `spacegraph-rlfp-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    getDiff() {
        if (!this.baseline || !this.variant) return '';
        const diffs = [];
        const p = (val) => typeof val === 'number' ? val.toFixed(2) : val;

        if (this.variant.dampingFactor !== this.baseline.dampingFactor)
            diffs.push(`Damping: ${p(this.baseline.dampingFactor)} -> ${p(this.variant.dampingFactor)}`);
        if (this.variant.zoomSpeed !== this.baseline.zoomSpeed)
            diffs.push(`Zoom: ${p(this.baseline.zoomSpeed)} -> ${p(this.variant.zoomSpeed)}`);
        if (this.variant.panSpeed !== this.baseline.panSpeed)
            diffs.push(`Pan: ${p(this.baseline.panSpeed)} -> ${p(this.variant.panSpeed)}`);

        return diffs.join('\n');
    }

    _saveToStorage() {
        try {
            const save = {
                dampingFactor: this.baseline.dampingFactor,
                zoomSpeed: this.baseline.zoomSpeed,
                panSpeed: this.baseline.panSpeed,
                targetNodeSizePx: this.baseline.targetNodeSizePx
            };
            localStorage.setItem('spacegraph-ergonomics-pref', JSON.stringify(save));
        } catch (e) {
            console.warn('Failed to save ergonomics pref', e);
        }
    }
}

export class ErgonomicsPlugin extends Plugin {
    constructor(spaceGraph, pluginManager) {
        super(spaceGraph, pluginManager);

        this.config = {
            enabled: true,
            targetNodeSizePx: 40,
            minReadableTextHeightPx: 10,
            autotuneOnLoad: true,
            overlayEnabled: false,
            overlayPosition: 'bottom-right',
            optimizationInterval: 1000,

            // Interaction Tuning
            dampingFactor: 0.12,
            zoomSpeed: 1.0,
            panSpeed: 0.8
        };

        this._loadFromStorage();

        this.metrics = {
            avgNodeSizePx: 0,
            visibleNodes: 0,
            viewportCoverage: 0,
            readabilityScore: 0, // 0-1
            interactionScale: 1, // Multiplier for speed
            cameraDistance: 0
        };

        this.overlay = null;
        this.updateTimer = null;

        this.calibration = new CalibrationManager(this);
    }

    _loadFromStorage() {
        try {
            const stored = localStorage.getItem('spacegraph-ergonomics-pref');
            if (stored) {
                const parsed = JSON.parse(stored);
                this.config = { ...this.config, ...parsed };
            }
        } catch (e) {}
    }

    getName() {
        return 'ErgonomicsPlugin';
    }

    init() {
        super.init();
        this._createOverlay();
        this._subscribeToEvents();

        if (this.config.autotuneOnLoad) {
            setTimeout(() => this.autotune(), 500);
        }

        if (this.config.enabled) {
            this._startMonitoring();
        }
    }

    _subscribeToEvents() {
        this.space.on('camera:changed', () => {
            this._updateInteractionSensitivities();
        });

        this.space.on('graph:changed', () => {
             this._measureMetrics();
        });
    }

    _startMonitoring() {
        if (this.updateTimer) clearInterval(this.updateTimer);
        this.updateTimer = setInterval(() => {
            if (!this.config.enabled) return;
            this._measureMetrics();
            this._updateOverlay();
        }, this.config.optimizationInterval);
    }

    _measureMetrics() {
        const cam = this.space.plugins.getPlugin('CameraPlugin')?.getCameraInstance();
        const nodePlugin = this.space.plugins.getPlugin('NodePlugin');

        if (!cam || !nodePlugin) return;

        const nodes = Array.from(nodePlugin.getNodes().values());
        if (nodes.length === 0) return;

        // 1. Camera Distance & Interaction Scale
        const center = new THREE.Vector3(); // Ideally graph center
        const distance = cam.position.distanceTo(center);
        this.metrics.cameraDistance = distance;

        this.metrics.interactionScale = Math.max(0.1, distance / 1000);

        // 2. Average Node Screen Size
        const sampleSize = Math.min(nodes.length, 50);
        let totalSizePx = 0;
        let visibleCount = 0;

        const frustum = new THREE.Frustum();
        const projScreenMatrix = new THREE.Matrix4();
        projScreenMatrix.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
        frustum.setFromProjectionMatrix(projScreenMatrix);

        const screenHeight = this.space.container.clientHeight;
        const fovFactor = 2 * Math.tan((cam.fov * Utils.DEG2RAD) / 2);

        const step = Math.max(1, Math.floor(nodes.length / sampleSize));
        const sphere = new THREE.Sphere();

        for (let i = 0; i < nodes.length; i += step) {
            const node = nodes[i];
            const object = node.mesh || node.cssObject;
            if (!object) continue;

            sphere.center.copy(node.position);
            sphere.radius = node.getBoundingSphereRadius ? node.getBoundingSphereRadius() : 10;

            if (frustum.intersectsSphere(sphere)) {
                visibleCount++;

                const distToCam = cam.position.distanceTo(node.position);
                const worldRadius = sphere.radius;

                const projectedPx = (worldRadius * 2 / distToCam) * screenHeight / fovFactor;
                totalSizePx += projectedPx;
            }
        }

        this.metrics.visibleNodes = visibleCount * step;
        this.metrics.avgNodeSizePx = visibleCount > 0 ? totalSizePx / visibleCount : 0;

        // 3. Readability Score
        this.metrics.readabilityScore = Utils.clamp(this.metrics.avgNodeSizePx / this.config.targetNodeSizePx, 0, 1);
    }

    _updateInteractionSensitivities() {
        const camPlugin = this.space.plugins.getPlugin('CameraPlugin');
        const camControls = camPlugin?.getControls();

        if (camControls) {
            // Dynamic Zoom Speed
            const dynamicFactor = this.metrics.interactionScale
                ? Utils.clamp(this.metrics.interactionScale, 0.5, 3.0)
                : 1.0;

            camControls.zoomSpeed = this.config.zoomSpeed * dynamicFactor;

            // Static Tuning
            camControls.panSpeed = this.config.panSpeed;
            if (camControls.dampingFactor !== undefined) {
                camControls.dampingFactor = this.config.dampingFactor;
            }
        }
    }

    autotune() {
        console.log('Ergonomics: Autotuning...');
        this._optimizeCamera();
        this._optimizeNodeSizes();
        this._measureMetrics();
        this._updateOverlay();
    }

    _optimizeCamera() {
        const nodePlugin = this.space.plugins.getPlugin('NodePlugin');
        const nodes = Array.from(nodePlugin.getNodes().values());
        if (nodes.length === 0) return;

        const box = new THREE.Box3();
        nodes.forEach(n => box.expandByPoint(n.position));

        const size = new THREE.Vector3();
        box.getSize(size);
        const center = new THREE.Vector3();
        box.getCenter(center);

        const camPlugin = this.space.plugins.getPlugin('CameraPlugin');
        const cam = camPlugin?.getCameraInstance();
        if (!cam) return;

        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = cam.fov * Utils.DEG2RAD;

        let cameraDistance = Math.abs(maxDim / (2 * Math.tan(fov / 2)));
        cameraDistance *= 1.2;
        cameraDistance = Utils.clamp(cameraDistance, 100, 5000);

        console.log(`Ergonomics: Moving camera to fit graph. Dist: ${cameraDistance}`);
        camPlugin.moveTo(center.x, center.y, center.z + cameraDistance, 1.0, center);
    }

    _optimizeNodeSizes() {
        const nodePlugin = this.space.plugins.getPlugin('NodePlugin');
        const nodes = Array.from(nodePlugin.getNodes().values());
        if (nodes.length === 0) return;

        const box = new THREE.Box3();
        nodes.forEach(n => box.expandByPoint(n.position));
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);

        const cam = this.space.plugins.getPlugin('CameraPlugin')?.getCameraInstance();
        const fov = (cam?.fov ?? 70) * Utils.DEG2RAD;
        const targetDist = Math.max(100, Math.abs(maxDim / (2 * Math.tan(fov / 2))) * 1.2);

        const screenHeight = this.space.container.clientHeight;
        const fovFactor = 2 * Math.tan(fov / 2);

        let totalWorldSize = 0;
        let count = 0;
        nodes.forEach(n => {
            const r = n.getBoundingSphereRadius ? n.getBoundingSphereRadius() : 10;
            totalWorldSize += r * 2;
            count++;
        });
        const avgWorldSize = count > 0 ? totalWorldSize / count : 20;

        const predictedPx = (avgWorldSize / targetDist) * screenHeight / fovFactor;

        if (predictedPx < this.config.targetNodeSizePx * 0.5) {
             const scaleFactor = this.config.targetNodeSizePx / predictedPx;
             const safeFactor = Utils.clamp(scaleFactor, 1.0, 5.0);
             console.log(`Ergonomics: Nodes too small (${predictedPx.toFixed(1)}px). Scaling by ${safeFactor.toFixed(2)}`);

             nodes.forEach(n => {
                 if (n.adjustNodeSize) n.adjustNodeSize(safeFactor);
             });
        } else if (predictedPx > this.config.targetNodeSizePx * 3.0) {
             const scaleFactor = this.config.targetNodeSizePx / predictedPx;
             const safeFactor = Utils.clamp(scaleFactor, 0.2, 1.0);
              console.log(`Ergonomics: Nodes too big (${predictedPx.toFixed(1)}px). Scaling by ${safeFactor.toFixed(2)}`);

             nodes.forEach(n => {
                 if (n.adjustNodeSize) n.adjustNodeSize(safeFactor);
             });
        }
    }

    _createOverlay() {
        this.overlay = document.createElement('div');
        Object.assign(this.overlay.style, {
            position: 'absolute',
            padding: '10px',
            background: 'rgba(0, 0, 0, 0.7)',
            color: '#0f0',
            fontFamily: 'monospace',
            fontSize: '12px',
            borderRadius: '4px',
            pointerEvents: 'none',
            display: 'none',
            zIndex: '9999',
            whiteSpace: 'pre',
            backdropFilter: 'blur(4px)',
            border: '1px solid #333'
        });

        this._updateOverlayPosition();
        this.space.container.appendChild(this.overlay);
    }

    _updateOverlayPosition() {
        if (!this.overlay) return;
        this.overlay.style.top = 'auto';
        this.overlay.style.bottom = 'auto';
        this.overlay.style.left = 'auto';
        this.overlay.style.right = 'auto';

        switch(this.config.overlayPosition) {
            case 'top-left': this.overlay.style.top = '10px'; this.overlay.style.left = '10px'; break;
            case 'top-right': this.overlay.style.top = '10px'; this.overlay.style.right = '10px'; break;
            case 'bottom-left': this.overlay.style.bottom = '10px'; this.overlay.style.left = '10px'; break;
            case 'bottom-right': this.overlay.style.bottom = '10px'; this.overlay.style.right = '10px'; break;
        }
    }

    _updateOverlay() {
        if (!this.overlay || !this.config.overlayEnabled) return;

        const { avgNodeSizePx, visibleNodes, readabilityScore, cameraDistance } = this.metrics;

        const status = readabilityScore < 0.5 ? 'POOR' : (readabilityScore < 0.8 ? 'OK' : 'GOOD');
        const color = readabilityScore < 0.5 ? '#f55' : (readabilityScore < 0.8 ? '#fa0' : '#0f0');

        let content = `
<span style="color:#fff">ERGONOMICS</span>
----------------
Visible Nodes: ${visibleNodes}
Avg Node Size: ${avgNodeSizePx.toFixed(1)}px (Target: ${this.config.targetNodeSizePx})
Readability:   <span style="color:${color}">${status}</span>
Cam Distance:  ${Math.round(cameraDistance)}
----------------
Damping: ${this.config.dampingFactor.toFixed(2)}
Zoom Spd: ${this.config.zoomSpeed.toFixed(1)}
Pan Spd:  ${this.config.panSpeed.toFixed(1)}
`.trim();

        if (this.calibration.active) {
            const variant = this.calibration.activeVariantKey === 'A' ? 'A (Baseline)' : 'B (Variant)';
            const diff = this.calibration.getDiff();
            content += `
----------------
CALIBRATION MODE
Round: ${this.calibration.round}
Testing: <span style="color:#0ff">${variant}</span>

${diff}
`;
        }

        this.overlay.innerHTML = content;
    }

    toggleOverlay(enabled) {
        this.config.overlayEnabled = enabled !== undefined ? enabled : !this.config.overlayEnabled;
        if (this.overlay) {
            this.overlay.style.display = this.config.overlayEnabled ? 'block' : 'none';
            if (this.config.overlayEnabled) this._updateOverlay();
        }
    }

    updateConfig(config) {
        this.config = { ...this.config, ...config };
        this._updateOverlayPosition();
        if (config.enabled !== undefined) {
             if (config.enabled) this._startMonitoring();
             else if (this.updateTimer) clearInterval(this.updateTimer);
        }
        this._updateInteractionSensitivities();
    }

    dispose() {
        super.dispose();
        if (this.updateTimer) clearInterval(this.updateTimer);
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
        }
        this.space.off('camera:changed');
        this.space.off('graph:changed');
    }
}
