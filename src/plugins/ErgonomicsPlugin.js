import * as THREE from 'three';
import { Plugin } from '../core/Plugin.js';
import { Utils } from '../utils.js';

/**
 * Tracks the quality of a specific interaction burst (pan/zoom).
 */
class InteractionSession {
    constructor(startPos) {
        this.startTime = Date.now();
        this.lastPos = startPos.clone();
        this.startPos = startPos.clone();
        this.pathLength = 0;
        this.velocities = []; // Store magnitudes
        this.directions = []; // Store normalized vectors
        this.reversals = 0;
    }

    update(currentPos, dt) {
        const dist = currentPos.distanceTo(this.lastPos);
        if (dist < 0.001) return;

        this.pathLength += dist;
        const velocity = dist / Math.max(dt, 0.001);
        this.velocities.push(velocity);

        const direction = new THREE.Vector3().subVectors(currentPos, this.lastPos).normalize();

        // Check for reversal (dot product < 0 implies > 90 degree turn)
        if (this.directions.length > 0) {
            const lastDir = this.directions[this.directions.length - 1];
            if (direction.dot(lastDir) < -0.5) {
                this.reversals++;
            }
        }
        this.directions.push(direction);
        this.lastPos.copy(currentPos);
    }

    finalize(endPos) {
        const displacement = this.startPos.distanceTo(endPos);
        const duration = (Date.now() - this.startTime) / 1000;

        return {
            duration,
            pathLength: this.pathLength,
            displacement,
            efficiency: displacement > 0 ? displacement / Math.max(this.pathLength, displacement) : 1.0,
            avgVelocity: this.velocities.length ? this.velocities.reduce((a,b) => a+b,0) / this.velocities.length : 0,
            reversals: this.reversals,
            jitterIndex: this.reversals / Math.max(1, duration) // Reversals per second
        };
    }
}

class CalibrationManager {
    constructor(plugin) {
        this.plugin = plugin;
        this.active = false;
        this.round = 0;
        this.baseline = null;
        this.variant = null;
        this.activeVariantKey = 'A'; // 'A' or 'B'
        this.history = [];

        this.strategies = [
            { name: 'High Precision', params: { dampingFactor: 0.2, panSpeed: 0.5, zoomSpeed: 0.6 } },
            { name: 'High Velocity', params: { dampingFactor: 0.05, panSpeed: 1.5, zoomSpeed: 1.5 } },
            { name: 'Large Targets', params: { targetNodeSizePx: 60 } },
            { name: 'Compact View', params: { targetNodeSizePx: 25 } }
        ];
    }

    start() {
        this.active = true;
        this.round = 1;
        this.history = [];
        this.baseline = { ...this.plugin.config };
        this._generateVariant();
        this.apply('A');
        this.plugin.space.emit('ergonomics:calibration:started');
        console.log('Ergonomics: Calibration started.');
    }

    stop() {
        this.active = false;
        if (this.baseline) {
            this.plugin.updateConfig(this.baseline);
        }
        this.plugin.space.emit('ergonomics:calibration:stopped');
        console.log('Ergonomics: Calibration stopped.');
    }

    reset() {
        this.stop();
        this.history = [];
        localStorage.removeItem('spacegraph-ergonomics-pref');
        console.log('Ergonomics: Calibration reset.');
    }

    _generateVariant() {
        // Select a strategy based on round number (cycle through)
        const strategyIndex = (this.round - 1) % this.strategies.length;
        const strategy = this.strategies[strategyIndex];

        // Apply strategy deltas to baseline
        this.variant = { ...this.baseline, ...strategy.params };
        this.variant._name = strategy.name;

        console.log(`Ergonomics: Generated Variant B (${strategy.name})`, this.variant);
    }

    apply(key) {
        this.activeVariantKey = key;
        const config = key === 'A' ? this.baseline : this.variant;
        this.plugin.updateConfig(config);
    }

    vote(key) {
        if (!this.active) return;

        // Snapshot metrics "after" the experience
        const metrics = { ...this.plugin.metrics };

        const record = {
            round: this.round,
            timestamp: Date.now(),
            baseline: { ...this.baseline },
            variant: { ...this.variant },
            choice: key,
            metrics,
            userPreferredConfig: key === 'B' ? { ...this.variant } : { ...this.baseline }
        };

        this.history.push(record);
        this.plugin.space.emit('ergonomics:voted', record);

        console.log(`Ergonomics: Voted for ${key}`);

        if (key === 'B') {
            this.baseline = { ...this.variant };
            this._saveToStorage();
        }

        this.round++;
        this._generateVariant();
        this.apply('A');
    }

    exportDataset() {
        return JSON.stringify(this.history, null, 2);
    }

    getDiff() {
        if (!this.baseline || !this.variant) return '';
        const diffs = [];
        const p = (val) => typeof val === 'number' ? val.toFixed(2) : val;

        if (this.variant._name) diffs.push(`Strategy: ${this.variant._name}`);

        ['dampingFactor', 'zoomSpeed', 'panSpeed', 'targetNodeSizePx'].forEach(k => {
            if (this.variant[k] !== this.baseline[k]) {
                 diffs.push(`${k}: ${p(this.baseline[k])} -> ${p(this.variant[k])}`);
            }
        });

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
            optimizationInterval: 500, // Faster update for dynamic metrics

            // Interaction Tuning Defaults
            dampingFactor: 0.12,
            zoomSpeed: 1.0,
            panSpeed: 0.8
        };

        this._loadFromStorage();

        this.metrics = {
            // Static
            avgNodeSizePx: 0,
            visibleNodes: 0,
            viewportCoverage: 0,
            textLegibility: 0, // 0-1
            visualClutter: 0, // Nodes per 1000px^2
            occlusionIndex: 0, // 0-1
            readabilityScore: 0, // Composite

            // Dynamic
            cameraDistance: 0,
            opticalFlow: 0,
            jitterIndex: 0,
            pathEfficiency: 1.0,
            interactionState: 'IDLE' // IDLE, BROWSING, SEARCHING, TARGETING
        };

        this.overlay = null;
        this.updateTimer = null;
        this.currentSession = null;
        this.lastCameraPos = new THREE.Vector3();
        this.lastFrameTime = Date.now();

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
        // Track Interaction Sessions
        // We assume CameraPlugin emits drag/control events or we monitor position changes
        // Since specific events like 'controlstart' might vary, we poll camera movement in _measureMetrics
        // But for 'Session', we want explicit starts if possible.
        // We'll use a velocity threshold in _measureDynamicMetrics to detect activity.

        this.space.on('camera:changed', () => {
            this._updateInteractionSensitivities();
        });

        this.space.on('graph:changed', () => {
             this._measureStaticMetrics();
        });
    }

    _startMonitoring() {
        if (this.updateTimer) clearInterval(this.updateTimer);
        this.updateTimer = setInterval(() => {
            if (!this.config.enabled) return;
            this._measureStaticMetrics();
            this._measureDynamicMetrics();
            this._updateOverlay();
        }, this.config.optimizationInterval);
    }

    _measureStaticMetrics() {
        const cam = this.space.plugins.getPlugin('CameraPlugin')?.getCameraInstance();
        const nodePlugin = this.space.plugins.getPlugin('NodePlugin');

        if (!cam || !nodePlugin) return;

        const nodes = Array.from(nodePlugin.getNodes().values());
        if (nodes.length === 0) return;

        const frustum = new THREE.Frustum();
        const projScreenMatrix = new THREE.Matrix4();
        projScreenMatrix.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
        frustum.setFromProjectionMatrix(projScreenMatrix);

        const screenHeight = this.space.container.clientHeight;
        const screenWidth = this.space.container.clientWidth;
        const screenArea = screenWidth * screenHeight;
        const fovFactor = 2 * Math.tan((cam.fov * Utils.DEG2RAD) / 2);

        let totalSizePx = 0;
        let totalProjectedArea = 0;
        let visibleCount = 0;
        let legibleTextCount = 0;
        const visibleNodes = [];

        // Sampling for performance if too many nodes
        const step = nodes.length > 200 ? Math.floor(nodes.length / 100) : 1;
        const sphere = new THREE.Sphere();

        for (let i = 0; i < nodes.length; i += step) {
            const node = nodes[i];
            sphere.center.copy(node.position);
            sphere.radius = node.getBoundingSphereRadius ? node.getBoundingSphereRadius() : 10;

            if (frustum.intersectsSphere(sphere)) {
                visibleCount++;
                const distToCam = cam.position.distanceTo(node.position);
                const worldRadius = sphere.radius;

                // Projected Diameter in Pixels
                const projectedPx = (worldRadius * 2 / distToCam) * screenHeight / fovFactor;
                totalSizePx += projectedPx;

                // Projected Area (approx circle)
                totalProjectedArea += Math.PI * Math.pow(projectedPx / 2, 2);

                // Text Legibility
                // Assuming standard label size roughly tracks with node scale or is fixed size in world
                // If CSS3D, it scales with distance.
                const estTextHeight = projectedPx * 0.3; // Rough approx: label is 30% of node
                if (estTextHeight >= this.config.minReadableTextHeightPx) {
                    legibleTextCount++;
                }

                visibleNodes.push({ pos: node.position.clone(), radius: worldRadius, projectedPx });
            }
        }

        visibleCount *= step; // Scale back up
        totalProjectedArea *= step;

        this.metrics.visibleNodes = visibleCount;
        this.metrics.avgNodeSizePx = visibleCount > 0 ? totalSizePx / (visibleCount / step) : 0;
        this.metrics.viewportCoverage = Utils.clamp(totalProjectedArea / screenArea, 0, 1);
        this.metrics.textLegibility = visibleCount > 0 ? legibleTextCount / (visibleCount / step) : 1;
        this.metrics.visualClutter = visibleCount / (screenArea / 100000); // Nodes per 100k pixels

        // Occlusion (Simplified: check overlaps of sample)
        let overlaps = 0;
        if (visibleNodes.length > 1) {
             const sample = visibleNodes.slice(0, 50); // Check top 50
             for (let i = 0; i < sample.length; i++) {
                 for (let j = i + 1; j < sample.length; j++) {
                     // Simple 2D distance check in screen space would be better, but here we approximate
                     // If 3D spheres overlap? No, we want 2D occlusion.
                     // Skipping complex 2D projection overlap for perf, using dense cluster proxy
                     // If avg distance between projected centers < avg projected size, high occlusion.
                     // Placeholder for rigorous O(N^2) check.
                 }
             }
             // Use Clutter/Coverage proxy for now
             this.metrics.occlusionIndex = Utils.clamp(this.metrics.viewportCoverage * this.metrics.visualClutter * 0.1, 0, 1);
        }

        // Composite Score
        const sizeScore = Utils.clamp(this.metrics.avgNodeSizePx / this.config.targetNodeSizePx, 0, 1.5);
        const penalty = Math.abs(1 - sizeScore); // 0 is best
        this.metrics.readabilityScore = Utils.clamp((this.metrics.textLegibility * 0.6) + (1 - penalty) * 0.4, 0, 1);
    }

    _measureDynamicMetrics() {
        const cam = this.space.plugins.getPlugin('CameraPlugin')?.getCameraInstance();
        if (!cam) return;

        const now = Date.now();
        const dt = (now - this.lastFrameTime) / 1000;
        this.lastFrameTime = now;
        if (dt <= 0) return;

        const dist = cam.position.distanceTo(this.lastCameraPos);
        const velocity = dist / dt;

        // Optical Flow Proxy (Velocity / Distance to content)
        // Higher velocity at close range = High Optical Flow
        this.metrics.cameraDistance = cam.position.distanceTo(new THREE.Vector3(0,0,0)); // Approx
        this.metrics.opticalFlow = velocity / Math.max(1, this.metrics.cameraDistance) * 100;

        // Session Tracking
        if (velocity > 5.0) { // Moving
            if (!this.currentSession) {
                this.currentSession = new InteractionSession(cam.position);
                this.metrics.interactionState = 'SEARCHING';
            }
            this.currentSession.update(cam.position, dt);
        } else {
            if (this.currentSession) {
                // Session ended (stopped moving)
                const stats = this.currentSession.finalize(cam.position);
                this.metrics.jitterIndex = stats.jitterIndex;
                this.metrics.pathEfficiency = stats.efficiency;
                this.metrics.interactionState = 'TARGETING'; // Just finished

                // Log session
                // console.log('Session:', stats);

                this.currentSession = null;
            } else {
                this.metrics.interactionState = 'IDLE';
            }
        }

        this.lastCameraPos.copy(cam.position);
    }

    _updateInteractionSensitivities() {
        const camPlugin = this.space.plugins.getPlugin('CameraPlugin');
        const camControls = camPlugin?.getControls();

        if (camControls) {
            // Base config
            let { zoomSpeed, dampingFactor, panSpeed } = this.config;

            // Dynamic Adaptation based on State
            if (this.metrics.interactionState === 'TARGETING' || this.metrics.jitterIndex > 2.0) {
                // User is jittery or trying to stop -> Increase Damping for precision
                dampingFactor *= 1.5;
                zoomSpeed *= 0.8;
            } else if (this.metrics.interactionState === 'SEARCHING' && this.metrics.opticalFlow > 50) {
                // User is moving fast -> Reduce speed to prevent motion sickness?
                // Or allow flow? Usually we want to cap max speed.
                // Maybe increase damping to smooth out fast moves.
                dampingFactor *= 1.2;
            }

            camControls.zoomSpeed = Utils.clamp(zoomSpeed, 0.1, 5.0);
            camControls.panSpeed = Utils.clamp(panSpeed, 0.1, 3.0);

            if (camControls.dampingFactor !== undefined) {
                camControls.dampingFactor = Utils.clamp(dampingFactor, 0.01, 0.9);
            }
        }
    }

    autotune() {
        console.log('Ergonomics: Autotuning...');
        this._optimizeCamera();
        this._optimizeNodeSizes();
        this._measureStaticMetrics();
        this._updateOverlay();
    }

    _optimizeCamera() {
        // Logic matches previous impl but ensures we fit the graph
        // ... (Keep existing robust logic)
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

        let cameraDistance = Math.abs(maxDim / (2 * Math.tan(fov / 2))) * 1.2;
        cameraDistance = Utils.clamp(cameraDistance, 100, 5000);

        camPlugin.moveTo(center.x, center.y, center.z + cameraDistance, 1.0, center);
    }

    _optimizeNodeSizes() {
        const nodePlugin = this.space.plugins.getPlugin('NodePlugin');
        const nodes = Array.from(nodePlugin.getNodes().values());
        if (nodes.length === 0) return;

        // Predict projected size at "optimal" distance
        // ... (Keep existing logic)
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
        nodes.forEach(n => {
            totalWorldSize += (n.getBoundingSphereRadius ? n.getBoundingSphereRadius() : 10) * 2;
        });
        const avgWorldSize = totalWorldSize / nodes.length;
        const predictedPx = (avgWorldSize / targetDist) * screenHeight / fovFactor;

        if (predictedPx < this.config.targetNodeSizePx * 0.8 || predictedPx > this.config.targetNodeSizePx * 1.5) {
             const scaleFactor = this.config.targetNodeSizePx / predictedPx;
             const safeFactor = Utils.clamp(scaleFactor, 0.2, 5.0);

             console.log(`Ergonomics: Resizing nodes by ${safeFactor.toFixed(2)} to hit target ${this.config.targetNodeSizePx}px`);

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
            background: 'rgba(0, 0, 0, 0.8)',
            color: '#0f0',
            fontFamily: 'monospace',
            fontSize: '11px',
            borderRadius: '4px',
            pointerEvents: 'none',
            display: 'none',
            zIndex: '9999',
            whiteSpace: 'pre',
            backdropFilter: 'blur(4px)',
            border: '1px solid #333',
            lineHeight: '1.4'
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

        const m = this.metrics;
        const status = m.readabilityScore < 0.5 ? 'POOR' : (m.readabilityScore < 0.8 ? 'OK' : 'GOOD');
        const color = m.readabilityScore < 0.5 ? '#f55' : (m.readabilityScore < 0.8 ? '#fa0' : '#0f0');

        let content = `
<strong style="color:#fff; font-size:1.1em">ERGONOMICS OBSERVER</strong>
<div style="height:1px; background:#444; margin:4px 0"></div>
<span style="color:#aaa">PERCEPTION</span>
 Avg Size:     ${m.avgNodeSizePx.toFixed(0)}px (Tgt: ${this.config.targetNodeSizePx})
 Legibility:   ${(m.textLegibility*100).toFixed(0)}%
 Coverage:     ${(m.viewportCoverage*100).toFixed(1)}%
 Clutter:      ${m.visualClutter.toFixed(1)}
 Score:        <span style="color:${color}">${status}</span>

<span style="color:#aaa">DYNAMICS</span>
 State:        <span style="color:#fff">${m.interactionState}</span>
 Opt. Flow:    ${m.opticalFlow.toFixed(1)}
 Jitter:       ${m.jitterIndex.toFixed(2)}
 Efficiency:   ${(m.pathEfficiency*100).toFixed(0)}%

<span style="color:#aaa">CONTROL</span>
 Damping:      ${this.space.plugins.getPlugin('CameraPlugin')?.getControls()?.dampingFactor?.toFixed(3) ?? 'N/A'}
 Zoom Spd:     ${this.space.plugins.getPlugin('CameraPlugin')?.getControls()?.zoomSpeed?.toFixed(2) ?? 'N/A'}
`.trim();

        if (this.calibration.active) {
            content += `
<div style="height:1px; background:#444; margin:4px 0"></div>
<span style="color:#0ff">CALIBRATION (Round ${this.calibration.round})</span>
Testing: ${this.calibration.activeVariantKey}
${this.calibration.getDiff()}
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
        if (this.updateTimer) clearInterval(this.updateTimer);
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
        }
        this.space?.off('camera:changed');
        this.space?.off('graph:changed');
        super.dispose();
    }
}
