import { DemoApp } from './lib/DemoApp.js';

class FractalZoomDemo extends DemoApp {
    constructor() {
        super({ title: 'Fractal Zoom Demo' });
    }

    async init() {
        const space = await super.init();

        this.createOverviewNodes(space);
        this.createDetailNodes(space);
        this.createDataNodes(space);
        this.createTextNodes(space);
        this.addZoomInstructions(space);

        this.setupZoomGUI(space);

        return space;
    }

    createOverviewNodes(space) {
        const overviewData = [
            {
                id: 'overview-science',
                position: {x: 0, y: 200, z: 0},
                title: 'Science',
                summary: 'Scientific Domains',
                detail: 'Physics, Chemistry, Biology, Computer Science',
                full: `<h3>Scientific Domains</h3>...` // simplified for brevity
            },
            { id: 'overview-arts', position: {x: 300, y: 200, z: 0}, title: 'Arts', summary: 'Creative Arts', detail: 'Visual Arts...', full: '...' },
            { id: 'overview-tech', position: {x: -300, y: 200, z: 0}, title: 'Technology', summary: 'Tech Fields', detail: 'AI...', full: '...' },
        ];

        overviewData.forEach(data => {
            const node = space.createNode({
                id: data.id,
                type: 'html',
                position: data.position,
                data: { label: data.summary, content: data.summary, width: 150, height: 100, backgroundColor: `hsl(${Math.random() * 360}, 50%, 30%)` }
            });
            node.fractalData = data;
        });
    }

    createDetailNodes(space) {
        const detailData = [
            { id: 'detail-physics', position: {x: -100, y: 50, z: 0}, parent: 'overview-science', data: { summary: 'Physics', full: '...' } },
            { id: 'detail-cs', position: {x: 100, y: 50, z: 0}, parent: 'overview-science', data: { summary: 'CS', full: '...' } },
        ];

        detailData.forEach(data => {
            const node = space.createNode({
                id: data.id,
                type: 'html',
                position: data.position,
                data: { label: data.data.summary, content: data.data.summary, width: 120, height: 80, backgroundColor: `hsl(${Math.random() * 360}, 50%, 30%)` }
            });
            node.fractalData = data.data;

            if(data.parent) {
                const parent = space.plugins.getPlugin('NodePlugin').getNode(data.parent);
                if(parent) {
                    space.addEdge(parent, node, { type: 'curved', curvature: 0.2 });
                }
            }
        });
    }

    createDataNodes(space) {
        const node = space.createNode({
            id: 'data-perf',
            type: 'html',
            position: {x: 200, y: -100, z: 0},
            data: { label: 'Perf Data', content: 'Data', width: 140, height: 90, backgroundColor: '#334455' }
        });
        node.fractalData = { type: 'data', title: 'Performance', data: [{year:2020, value:85}] };
    }

    createTextNodes(space) {
         const node = space.createNode({
            id: 'text-ai',
            type: 'html',
            position: {x: 0, y: -250, z: 0},
            data: { label: 'AI', content: 'AI Summary', width: 160, height: 100, backgroundColor: '#553344' }
        });
        node.fractalData = { title: 'AI', summary: 'AI Overview', full: 'Long AI text...' };
    }

    addZoomInstructions(space) {
        space.createNode({
            id: 'zoom-instructions',
            type: 'html',
            position: {x: 400, y: -200, z: 0},
            data: {
                label: 'Controls',
                content: '<div><h4>Zoom Controls</h4><p>Scroll to zoom</p></div>',
                width: 200, height: 160, backgroundColor: '#2c3e50'
            }
        });
    }

    setupZoomGUI(space) {
        const plugin = space.plugins.getPlugin('FractalZoomPlugin');
        if(!plugin) return;

        const folder = this.gui.addFolder('Fractal Zoom Info');
        const metrics = { level: 0, scale: 1 };
        folder.add(metrics, 'level').listen();
        folder.add(metrics, 'scale').listen();

        space.on('zoom:change', (data) => {
             // Assuming event gives data, or pull from camera
             const cam = space.plugins.getPlugin('CameraPlugin').getCameraInstance();
             metrics.scale = cam.position.z; // rough proxy
        });
    }
}

const run = async () => {
    const app = new FractalZoomDemo();
    await app.init();
};
run();
