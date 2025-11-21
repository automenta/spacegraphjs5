import { DemoApp } from './lib/DemoApp.js';

class CameraModesDemo extends DemoApp {
    constructor() {
        super({ title: 'Camera Modes Info' });
    }

    async init() {
        const space = await super.init();
        this.createGraph(space);
        this.setupModeGUI(space);

        // Add info note
        this.gui.addFolder('Info').add({
            note: 'See source for description of modes.'
        }, 'note').name('Note').disable();

        return space;
    }

    createGraph(space) {
        const n1 = space.createNode({
            id: 'cam_n1',
            type: 'shape',
            position: {x: 0, y: 0, z: 0},
            data: {label: 'Center', shape: 'sphere', size: 40, color: 0xcccccc},
        });
        const n2 = space.createNode({
            id: 'cam_n2',
            type: 'shape',
            position: {x: 150, y: 0, z: 50},
            data: {label: 'Node A', shape: 'box', size: 30, color: 0xcc6666},
        });
        const n3 = space.createNode({
            id: 'cam_n3',
            type: 'shape',
            position: {x: -100, y: 0, z: -80},
            data: {label: 'Node B', shape: 'sphere', size: 30, color: 0x66cc66},
        });

        space.addEdge(n1, n2);
        space.addEdge(n1, n3);

        setTimeout(() => {
            space.plugins.getPlugin('LayoutPlugin')?.applyLayout('force');
        }, 100);
    }

    setupModeGUI(space) {
        const plugin = space.plugins.getPlugin('CameraPlugin');
        const modes = plugin.getAvailableCameraModes(); // { ORBIT: "Orbit Control", ... }

        // Invert for GUI: { "Orbit Control": "orbit", ... }
        const guiModes = {};
        Object.entries(modes).forEach(([k, v]) => guiModes[v] = k);

        const config = { mode: plugin.getCameraMode() };

        const folder = this.gui.addFolder('Camera Modes');
        folder.add(config, 'mode', guiModes)
            .name('Current Mode')
            .onChange(v => {
                plugin.setCameraMode(v);
                if (v === 'firstPerson' || v === 'free') {
                    alert('Click canvas to capture mouse for First Person / Free Look. ESC to exit.');
                    plugin.requestPointerLock();
                }
            });
    }
}

const run = async () => {
    const app = new CameraModesDemo();
    await app.init();
};
run();
