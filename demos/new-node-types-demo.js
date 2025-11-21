import { DemoApp } from './lib/DemoApp.js';

class NewNodeTypesDemo extends DemoApp {
    constructor() {
        super({ title: 'New Node Types (Stubs)' });
    }

    async init() {
        const space = await super.init();
        this.createGraph(space);
        return space;
    }

    createGraph(space) {
        let xPos = -300;
        const xIncrement = 250;

        space.createNode({
            id: 'audioNode1', type: 'shape',
            position: {x: xPos, y: 0, z: 0},
            data: { label: 'Audio Clip 🎵', shape: 'sphere', color: 0x00ccff, size: 50 },
            mass: 1.0
        });

        xPos += xIncrement;
        space.createNode({
            id: 'docNode1', type: 'shape',
            position: {x: xPos, y: 0, z: 0},
            data: { label: 'Report.pdf 📄', shape: 'box', color: 0xffaa00, size: 60 },
            mass: 1.0
        });

        xPos += xIncrement;
        space.createNode({
            id: 'chartNode1', type: 'html',
            position: {x: xPos, y: 0, z: 0},
            data: {
                label: 'Sales Data 📊',
                content: '<div style="padding:10px; background:#2a2a2b; border-radius:5px; color:white; height: 100%; display: flex; align-items: center; justify-content: center;">Chart Placeholder</div>',
                width: 280, height: 180,
            },
            mass: 1.0
        });

        setTimeout(() => {
             space.plugins.getPlugin('LayoutPlugin')?.applyLayout('grid', {columns: 3, padding: {x: 200, y: 100}});
        }, 100);
    }
}

const run = async () => {
    const app = new NewNodeTypesDemo();
    await app.init();
};
run();
