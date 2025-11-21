import { SpaceGraph } from '../../src/index.js';
import { VerificationTools } from './VerificationTools.js';
import GUI from 'lil-gui';

export class DemoApp {
    constructor(options = {}) {
        this.title = options.title || 'SpaceGraph Demo';
        this.container = null;
        this.space = null;
        this.gui = null;
        this.verificationTools = null;
    }

    async init(containerId = 'container') {
        this.createLayout();
        this.container = document.getElementById(containerId);

        // Init SpaceGraph
        this.space = await SpaceGraph.the(this.container);

        // Init GUI
        this.gui = new GUI({ title: 'Controls', width: 300 });
        this.gui.domElement.style.zIndex = '1001';

        // Verification Tools
        this.verificationTools = new VerificationTools(this.space);
        this.setupVerificationGUI();

        // Standard Camera GUI
        this.setupCameraGUI();

        // Ergonomics GUI
        this.setupErgonomicsGUI();

        // Render Loop Hook
        this.space.on('render:beforeRender', () => {
            this.verificationTools.update();
        });

        return this.space;
    }

    createLayout() {
        if (!document.getElementById('container')) {
            document.body.style.margin = '0';
            document.body.style.overflow = 'hidden';
            document.body.style.background = '#0f0f1a';
            document.body.style.fontFamily = 'Segoe UI, sans-serif';

            const container = document.createElement('div');
            container.id = 'container';
            container.style.position = 'fixed';
            container.style.top = '0';
            container.style.left = '0';
            container.style.width = '100%';
            container.style.height = '100%';
            document.body.appendChild(container);

            // Title
            const titleDiv = document.createElement('div');
            titleDiv.style.position = 'absolute';
            titleDiv.style.top = '20px';
            titleDiv.style.left = '20px';
            titleDiv.style.color = 'white';
            titleDiv.style.pointerEvents = 'none';
            titleDiv.style.zIndex = '1000';
            titleDiv.innerHTML = `<h1 style="margin:0; font-size: 24px; color: #4CAF50;">${this.title}</h1>`;
            document.body.appendChild(titleDiv);
        }
    }

    setupVerificationGUI() {
        const folder = this.gui.addFolder('Verification');
        const config = {
            grid: false,
            axes: false,
            bounds: false,
            screenshot: () => this.takeScreenshot()
        };

        folder.add(config, 'grid').onChange(v => this.verificationTools.toggleGrid(v));
        folder.add(config, 'axes').onChange(v => this.verificationTools.toggleAxes(v));
        folder.add(config, 'bounds').onChange(v => this.verificationTools.toggleBoundingBoxes(v));
        folder.add(config, 'screenshot').name('Take Screenshot (AI)');
    }

    setupCameraGUI() {
        const folder = this.gui.addFolder('Camera');
        const cameraPlugin = this.space.plugins.getPlugin('CameraPlugin');

        folder.add({ reset: () => cameraPlugin.resetView() }, 'reset').name('Reset View');
    }

    setupErgonomicsGUI() {
        const folder = this.gui.addFolder('Ergonomics');
        const plugin = this.space.plugins.getPlugin('ErgonomicsPlugin');
        if (!plugin) return;

        const config = {
            showOverlay: plugin.config.overlayEnabled,
            overlayPos: plugin.config.overlayPosition,
            autotune: () => plugin.autotune(),
            monitor: plugin.config.enabled,
            targetSize: plugin.config.targetNodeSizePx,
            damping: plugin.config.dampingFactor,
            zoomSpeed: plugin.config.zoomSpeed,
            panSpeed: plugin.config.panSpeed
        };

        folder.add(config, 'showOverlay').name('Show Stats').onChange(v => plugin.toggleOverlay(v));
        folder.add(config, 'overlayPos', ['top-left', 'top-right', 'bottom-left', 'bottom-right'])
              .name('Overlay Pos').onChange(v => plugin.updateConfig({ overlayPosition: v }));
        folder.add(config, 'monitor').name('Continuous Monitor').onChange(v => plugin.updateConfig({ enabled: v }));
        folder.add(config, 'autotune').name('Auto-Tune Visualization');

        const tuning = folder.addFolder('Tuning');
        tuning.add(config, 'targetSize', 10, 200).name('Target Size (px)').onChange(v => plugin.updateConfig({ targetNodeSizePx: v }));
        tuning.add(config, 'damping', 0.01, 0.3).name('Inertia (Damping)').onChange(v => plugin.updateConfig({ dampingFactor: v }));
        tuning.add(config, 'zoomSpeed', 0.1, 5.0).name('Zoom Speed').onChange(v => plugin.updateConfig({ zoomSpeed: v }));
        tuning.add(config, 'panSpeed', 0.1, 3.0).name('Pan Speed').onChange(v => plugin.updateConfig({ panSpeed: v }));

        const rlfp = folder.addFolder('Calibration (RLFP)');
        const calObj = {
            start: () => { plugin.calibration.start(); plugin.toggleOverlay(true); },
            stop: () => plugin.calibration.stop(),
            testA: () => plugin.calibration.apply('A'),
            testB: () => plugin.calibration.apply('B'),
            voteA: () => plugin.calibration.vote('A'),
            voteB: () => plugin.calibration.vote('B'),
            export: () => plugin.calibration.exportDataset()
        };

        rlfp.add(calObj, 'start').name('Start Session');
        rlfp.add(calObj, 'stop').name('Stop Session');
        rlfp.add(calObj, 'testA').name('Test Baseline (A)');
        rlfp.add(calObj, 'testB').name('Test Variant (B)');
        rlfp.add(calObj, 'voteA').name('Vote A (Keep)');
        rlfp.add(calObj, 'voteB').name('Vote B (Adopt)');
        rlfp.add(calObj, 'export').name('Export RLFP Data');
    }

    takeScreenshot() {
        const renderer = this.space.plugins.getPlugin('RenderingPlugin').renderGL;
        const canvas = renderer.domElement;

        const link = document.createElement('a');
        link.download = `spacegraph-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }
}
