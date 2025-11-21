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

    takeScreenshot() {
        const renderer = this.space.plugins.getPlugin('RenderingPlugin').renderGL;
        const canvas = renderer.domElement;

        const link = document.createElement('a');
        link.download = `spacegraph-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }
}
