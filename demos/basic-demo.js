import { DemoApp } from './lib/DemoApp.js';

async function run() {
    const app = new DemoApp({ title: 'Basic Demo' });
    const space = await app.init();

    // Create content
    const node1 = space.createNode({
        id: 'basic-node-1',
        type: 'shape',
        position: {x: -100, y: 0, z: 0},
        data: {
            label: 'Basic Node 1',
            shape: 'sphere',
            size: 40,
            color: 0x4a9eff
        },
        mass: 1.0
    });

    const node2 = space.createNode({
        id: 'basic-node-2',
        type: 'shape',
        position: {x: 100, y: 0, z: 0},
        data: {
            label: 'Basic Node 2',
            shape: 'box',
            size: 40,
            color: 0xff6b6b
        },
        mass: 1.0
    });

    space.addEdge(node1, node2, {
        label: 'Basic Connection',
        color: 0x888888,
        thickness: 1
    });

    space.centerView();
}

run();
