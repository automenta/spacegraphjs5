import { DemoApp } from './lib/DemoApp.js';

class AdvancedWidgetsDemo extends DemoApp {
    constructor() {
        super({ title: 'Advanced Widgets Demo' });
    }

    async init() {
        const space = await super.init();
        this.createGraph(space);
        this.setupAnimation(space);

        this.gui.add({ info: 'Interact with nodes directly' }, 'info').name('Note').disable();

        return space;
    }

    createGraph(space) {
         // Central hub node
        const hubNode = space.createNode({
            id: 'hub',
            type: 'text',
            position: {x: 0, y: 0, z: 0},
            data: {
                text: 'Advanced\\nWidgets',
                fontSize: 24,
                height: 8,
                color: 0x4a9eff,
                bevelEnabled: true,
                align: 'center',
                animated: true,
                label: 'Advanced Widgets'
            }
        });

        // Control Panel Node
        const controlPanel = space.createNode({
            id: 'control-panel',
            type: 'html',
            position: {x: -300, y: 150, z: 0},
            data: {
                label: 'System Controls',
                content: `
                    <div style="background: #2c3e50; padding: 15px; border-radius: 8px; color: white; font-family: Arial, sans-serif; height: 100%;">
                        <h3 style="margin-top: 0; color: #3498db;">System Controls</h3>
                        <div style="margin-bottom: 10px;">
                            <label style="display: block; margin-bottom: 5px;">Volume</label>
                            <input type="range" id="volume" min="0" max="100" value="75" style="width: 100%;">
                            <span id="volume-value">75%</span>
                        </div>
                        <div style="margin-bottom: 10px;">
                            <label style="display: block; margin-bottom: 5px;">Quality</label>
                            <select id="quality" style="width: 100%; padding: 5px;">
                                <option value="low">Low</option>
                                <option value="medium" selected>Medium</option>
                                <option value="high">High</option>
                                <option value="ultra">Ultra</option>
                            </select>
                        </div>
                        <div style="margin-bottom: 10px;">
                            <label style="display: flex; align-items: center;">
                                <input type="checkbox" id="enabled" checked style="margin-right: 8px;">
                                Enable Effects
                            </label>
                        </div>
                        <div style="margin-bottom: 10px;">
                            <button id="apply" style="width: 100%; padding: 8px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer;">Apply</button>
                        </div>
                    </div>
                `,
                width: 280,
                height: 250,
            }
        });

        // Progress indicators showcase
        const progressBar = space.createNode({
            id: 'progress-bar',
            type: 'html',
            position: {x: 300, y: 150, z: 0},
            data: {
                label: 'Loading Progress',
                content: `
                    <div style="background: #2c3e50; padding: 10px; border-radius: 5px; color: white;">
                        <h4 style="margin: 0 0 10px 0;">Loading Progress</h4>
                        <div style="background: #34495e; height: 20px; border-radius: 10px; overflow: hidden;">
                            <div id="progress-bar-fill" style="height: 100%; width: 65%; background: linear-gradient(to right, #00ff88, #00cc6a); border-radius: 10px;"></div>
                        </div>
                    </div>
                `,
                width: 200,
                height: 80,
            }
        });

        const progressCircle = space.createNode({
            id: 'progress-circle',
            type: 'html',
            position: {x: 450, y: 150, z: 0},
            data: {
                label: 'CPU Usage',
                content: `
                    <div style="background: #2c3e50; padding: 15px; border-radius: 5px; color: white; text-align: center;">
                        <h4 style="margin: 0 0 10px 0;">CPU Usage</h4>
                        <div style="position: relative; width: 100px; height: 100px; margin: 0 auto;">
                            <svg width="100" height="100" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="45" fill="none" stroke="#34495e" stroke-width="8"/>
                                <circle id="progress-circle-fill" cx="50" cy="50" r="45" fill="none" stroke="#ff6b35" stroke-width="8" stroke-linecap="round"
                                        stroke-dasharray="283" stroke-dashoffset="106" transform="rotate(-90 50 50)"/>
                            </svg>
                            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 18px; font-weight: bold;">45%</div>
                        </div>
                    </div>
                `,
                width: 120,
                height: 120,
            }
        });

        const progressGauge = space.createNode({
            id: 'progress-gauge',
            type: 'html',
            position: {x: 600, y: 150, z: 0},
            data: {
                label: 'Temperature',
                content: `
                    <div style="background: #2c3e50; padding: 15px; border-radius: 5px; color: white; text-align: center;">
                        <h4 style="margin: 0 0 10px 0;">Temperature</h4>
                        <div style="position: relative; width: 140px; height: 100px;">
                            <svg width="140" height="100" viewBox="0 0 140 100">
                                <path d="M 20 90 A 50 50 0 0 1 120 90" fill="none" stroke="#34495e" stroke-width="15"/>
                                <path id="progress-gauge-fill" d="M 20 90 A 50 50 0 0 1 120 90" fill="none" stroke="#ff4757" stroke-width="15" stroke-linecap="round"/>
                            </svg>
                            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 18px; font-weight: bold;">72%</div>
                        </div>
                    </div>
                `,
                width: 140,
                height: 100,
            }
        });

        // Canvas drawing node
        const canvas = space.createNode({
            id: 'canvas',
            type: 'html',
            position: {x: -400, y: -150, z: 0},
            data: {
                label: 'Drawing Canvas',
                content: `
                    <div style="background: #0f0f23; padding: 10px; border-radius: 5px; height: 100%;">
                        <h4 style="margin: 0 0 10px 0; color: white;">Drawing Canvas</h4>
                        <canvas id="drawing-canvas" width="300" height="180" style="border: 1px solid #34495e; background: #0a0a15; width: 100%; height: 180px;"></canvas>
                        <div style="margin-top: 10px; display: flex; gap: 5px;">
                            <button id="pen-tool" style="flex: 1; padding: 5px; background: #3498db; color: white; border: none; border-radius: 3px; cursor: pointer;">Pen</button>
                            <button id="eraser-tool" style="flex: 1; padding: 5px; background: #e74c3c; color: white; border: none; border-radius: 3px; cursor: pointer;">Eraser</button>
                            <button id="clear-canvas" style="flex: 1; padding: 5px; background: #95a5a6; color: white; border: none; border-radius: 3px; cursor: pointer;">Clear</button>
                        </div>
                    </div>
                `,
                width: 320,
                height: 250,
            }
        });

        const fractalShape = space.createNode({
            id: 'fractal',
            type: 'shape',
            position: {x: 200, y: -150, z: 0},
            data: { label: 'Fractal Shape', shape: 'sphere', size: 60, color: 0x8e44ad }
        });

        const organicShape = space.createNode({
            id: 'organic',
            type: 'shape',
            position: {x: 350, y: -150, z: 0},
            data: { label: 'Organic Shape', shape: 'box', size: 60, color: 0x27ae60 }
        });

        const crystalShape = space.createNode({
            id: 'crystal',
            type: 'shape',
            position: {x: 500, y: -150, z: 0},
            data: { label: 'Crystal Shape', shape: 'cone', size: 60, color: 0x3498db }
        });

        const titleText = space.createNode({
            id: 'title',
            type: 'text',
            position: {x: -150, y: 280, z: 0},
            data: { text: 'Interactive\\nWidgets', fontSize: 18, height: 6, color: 0xe74c3c, bevelEnabled: true, align: 'center' }
        });

        const subtitleText = space.createNode({
            id: 'subtitle',
            type: 'text',
            position: {x: 150, y: 280, z: 0},
            data: { text: 'Procedural\\nShapes', fontSize: 18, height: 6, color: 0xf39c12, bevelEnabled: true, align: 'center' }
        });

        // Edges
        space.addEdge(hubNode, controlPanel, { type: 'curved', curvature: 0.3, color: 0x4a9eff, thickness: 2, label: 'Flow' });
        space.addEdge(hubNode, canvas, { type: 'curved', curvature: -0.2, color: 0x9b59b6, thickness: 2 });
        space.addEdge(fractalShape, organicShape, { type: 'curved', curvature: 0.2, color: 0x27ae60, thickness: 3 });
        space.addEdge(organicShape, crystalShape, { type: 'curved', curvature: -0.2, color: 0x3498db, thickness: 3 });
        space.addEdge(progressBar, progressCircle, { type: 'curved', curvature: 0.1, color: 0x00ff88, thickness: 2 });
        space.addEdge(progressCircle, progressGauge, { type: 'curved', curvature: -0.1, color: 0xff6b35, thickness: 2 });
        space.addEdge(titleText, controlPanel, { type: 'curved', curvature: 0.3, color: 0xe74c3c, thickness: 2, label: 'Controls' });
        space.addEdge(subtitleText, fractalShape, { type: 'curved', curvature: 0.3, color: 0xf39c12, thickness: 2, label: 'Shapes' });

        // Hook up interactions
        this.setupInteractions();
    }

    setupInteractions() {
        setTimeout(() => {
            const volumeSlider = document.getElementById('volume');
            const volumeValue = document.getElementById('volume-value');
            if (volumeSlider && volumeValue) {
                volumeSlider.addEventListener('input', e => {
                    volumeValue.textContent = e.target.value + '%';
                    const bar = document.getElementById('progress-bar-fill');
                    if(bar) bar.style.width = e.target.value + '%';
                });
            }

            const canvasElement = document.getElementById('drawing-canvas');
            if (canvasElement) {
                const ctx = canvasElement.getContext('2d');
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.lineCap = 'round';
                let isDrawing = false;
                let lastX = 0, lastY = 0;

                canvasElement.addEventListener('mousedown', e => { isDrawing = true; [lastX, lastY] = [e.offsetX, e.offsetY]; });
                canvasElement.addEventListener('mousemove', e => {
                    if (!isDrawing) return;
                    ctx.beginPath();
                    ctx.moveTo(lastX, lastY);
                    ctx.lineTo(e.offsetX, e.offsetY);
                    ctx.stroke();
                    [lastX, lastY] = [e.offsetX, e.offsetY];
                });
                canvasElement.addEventListener('mouseup', () => isDrawing = false);
                canvasElement.addEventListener('mouseout', () => isDrawing = false);

                document.getElementById('clear-canvas')?.addEventListener('click', () => ctx.clearRect(0, 0, canvasElement.width, canvasElement.height));
            }
        }, 500);
    }

    setupAnimation(space) {
        let animationTime = 0;
        space.on('render:beforeRender', () => {
            animationTime += 0.016;
            const waveValue = 50 + Math.sin(animationTime * 0.5) * 30;
            const progressCircleFill = document.getElementById('progress-circle-fill');
            if (progressCircleFill) {
                const progress = Math.max(0, Math.min(100, waveValue));
                const circumference = 283;
                const offset = circumference - (progress / 100) * circumference;
                progressCircleFill.style.strokeDashoffset = offset;
            }
        });
    }
}

const run = async () => {
    const app = new AdvancedWidgetsDemo();
    await app.init();
};
run();
