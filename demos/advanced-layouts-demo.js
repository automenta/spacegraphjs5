import { DemoApp } from './lib/DemoApp.js';

class AdvancedLayoutsDemo extends DemoApp {
    constructor() {
        super({ title: 'Advanced Layouts Demo' });
        this.nodes = [];
        this.edges = [];
        this.containers = [];
    }

    async init() {
        const space = await super.init();
        this.createDemoGraph(space);
        this.setupLayoutGUI(space);
        return space;
    }

    createDemoGraph(space) {
        // Create main cluster of nodes
        for (let i = 0; i < 20; i++) {
            const node = space.createNode({
                id: `node_${i}`,
                type: i % 4 === 0 ? 'shape' : 'html',
                position: {
                    x: (Math.random() - 0.5) * 400,
                    y: (Math.random() - 0.5) * 400,
                    z: (Math.random() - 0.5) * 200,
                },
                data: {
                    group: i < 10 ? 'A' : 'B',
                    mass: 1 + Math.random() * 2,
                    clusterId: Math.floor(i / 5),
                    label: `Node ${i}`,
                    shape: 'sphere',
                    size: 20,
                    color: Math.floor(Math.random() * 0xffffff)
                },
            });
            this.nodes.push(node);
        }

        // Create hierarchical structure
        for (let i = 20; i < 30; i++) {
            const parentIndex = Math.floor((i - 20) / 3);
            const parent = this.nodes[parentIndex];

            const node = space.createNode({
                id: `hierarchy_${i}`,
                type: 'shape',
                position: {
                    x: parent.position.x + (Math.random() - 0.5) * 100,
                    y: parent.position.y - 100,
                    z: parent.position.z + (Math.random() - 0.5) * 50,
                },
                data: {
                    group: 'hierarchy',
                    label: `HNode ${i}`,
                    shape: 'box',
                    size: 15,
                    color: Math.floor(Math.random() * 0xffffff)
                },
            });
            this.nodes.push(node);

            // Create edge to parent
            const edge = space.addEdge(parent, node, {
                label: `Edge ${i}`,
                color: 0x888888,
                thickness: 1
            });
            this.edges.push(edge);
        }

        // Create some random connections
        for (let i = 0; i < 25; i++) {
            const source = this.nodes[Math.floor(Math.random() * this.nodes.length)];
            const target = this.nodes[Math.floor(Math.random() * this.nodes.length)];

            if (source !== target && !this.hasEdge(source, target)) {
                const edge = space.addEdge(source, target, {
                    label: `Edge ${i}`,
                    color: 0xaaaaaa,
                    thickness: 1
                });
                this.edges.push(edge);
            }
        }
    }

    hasEdge(source, target) {
        return this.edges.some(
            edge =>
                (edge.source === source && edge.target === target) ||
                (edge.source === target && edge.target === source)
        );
    }

    setupLayoutGUI(space) {
        const folder = this.gui.addFolder('Advanced Layout Systems');

        const state = {
            layoutType: 'force',
            layoutMode: 'standard',
            enableConstraints: false,
            enableNesting: false,
            enableAdaptive: false
        };

        const actions = {
            applyLayout: () => {
                space.plugins.getPlugin('LayoutPlugin').applyLayout(state.layoutType, {
                    animate: true,
                    animationDuration: 0.8
                });
            },
            morphDemo: async () => {
                const layouts = ['circular', 'grid', 'force', 'hierarchical'];
                for (const layout of layouts) {
                    space.plugins.getPlugin('LayoutPlugin').applyLayout(layout, { animate: true, animationDuration: 0.8 });
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            },
            addConstraint: () => {
                if (this.nodes.length < 2) return;
                const n1 = this.nodes[Math.floor(Math.random() * this.nodes.length)];
                const n2 = this.nodes[Math.floor(Math.random() * this.nodes.length)];
                if (n1 !== n2) {
                    console.log(`Added constraint between ${n1.id} and ${n2.id}`);
                    // Real implementation would add constraint here
                }
            },
            addContainer: () => {
                const containerNode = space.createNode({
                    id: `container_${Date.now()}`,
                    type: 'html',
                    position: { x: 0, y: 0, z: 0 },
                    data: {
                        label: 'Container',
                        content: '<div style="background: rgba(100,150,200,0.5); padding: 10px; border-radius: 5px;">Container</div>',
                        width: 120, height: 80
                    }
                });
                this.nodes.push(containerNode);
                this.containers.push(containerNode);
            }
        };

        folder.add(state, 'layoutType', ['force', 'hierarchical', 'circular', 'grid', 'spherical', 'radial', 'treemap'])
            .onChange(() => actions.applyLayout());

        folder.add(actions, 'applyLayout').name('Apply Layout');
        folder.add(actions, 'morphDemo').name('Start Morph Demo');

        const features = folder.addFolder('Features');
        features.add(state, 'enableConstraints');
        features.add(state, 'enableNesting');
        features.add(state, 'enableAdaptive');

        const tools = folder.addFolder('Tools');
        tools.add(actions, 'addConstraint').name('Add Random Constraint');
        tools.add(actions, 'addContainer').name('Add Container');
    }
}

const run = async () => {
    const app = new AdvancedLayoutsDemo();
    await app.init();
};
run();
