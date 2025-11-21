import { DemoApp } from './lib/DemoApp.js';

class AdvancedEdgesDemo extends DemoApp {
    constructor() {
        super({ title: 'Advanced Edges Demo' });
        this.flowEdges = [];
        this.springEdges = [];
        this.bezierEdges = [];
    }

    async init() {
        const space = await super.init();
        this.createGraph(space);
        this.setupEdgeGUI(space);
        return space;
    }

    createGraph(space) {
        this.createAdvancedDynamicEdges(space, {x: 0, y: 0, z: 0});
        this.createBasicStyledEdges(space, {x: 0, y: -700, z: 0});
        this.createSpecializedStaticEdges(space, {x: 600, y: -300, z: 50});

        setTimeout(() => {
            space.centerView({x: 0, y: 0, z: 0}, 1.2);
            const layoutPlugin = space.plugins.getPlugin('LayoutPlugin');
            if (layoutPlugin) {
                layoutPlugin.applyLayout('force', {
                    repulsion: 8000,
                    stiffness: 0.005,
                    friction: 0.3,
                    centerStrength: 0.001,
                });
            }
        }, 200);
    }

    createAdvancedDynamicEdges(space, basePosition) {
        // Central hub
        const centralNode = space.createNode({
            id: 'hub-center',
            type: 'shape',
            position: {x: basePosition.x, y: basePosition.y, z: basePosition.z},
            data: { label: 'Hub', shape: 'dodecahedron', size: 40, color: 0x3498db },
            mass: 2.0
        });

        const networkNodes = [];
        const positions = [
            {x: -400, y: 200, label: 'Source A'},
            {x: 400, y: 200, label: 'Target A'},
            {x: -400, y: -200, label: 'Source B'},
            {x: 400, y: -200, label: 'Target B'},
            {x: -600, y: 0, label: 'Hub L'},
            {x: 600, y: 0, label: 'Hub R'},
            {x: 0, y: 300, label: 'Top'},
            {x: 0, y: -300, label: 'Bottom'},
        ];

        positions.forEach((pos, index) => {
            const node = space.createNode({
                id: `adv-node-${index}`,
                type: 'text',
                position: {x: basePosition.x + pos.x, y: basePosition.y + pos.y, z: basePosition.z},
                data: {
                    text: pos.label,
                    fontSize: 14,
                    height: 4,
                    color: 0x3498db,
                    bevelEnabled: true,
                    align: 'center',
                },
                mass: 1.0
            });
            networkNodes.push(node);
        });

        // Flow Edges
        this.flowEdges.push(space.addEdge(networkNodes[0], networkNodes[1], {
            type: 'flow',
            particleCount: 20,
            particleSpeed: 0.8,
            particleSize: 4,
            particleColor: 0x00ff88,
            flowDirection: 1,
            animated: true,
            glowEffect: true,
            thickness: 3,
            color: 0x00d4aa,
        }));

        this.flowEdges.push(space.addEdge(networkNodes[2], networkNodes[3], {
            type: 'flow',
            particleCount: 15,
            particleSpeed: 0.6,
            particleSize: 3,
            particleColor: 0xff6b35,
            flowDirection: -1,
            animated: true,
            glowEffect: true,
            thickness: 3,
            color: 0xff8c42,
        }));

        this.flowEdges.push(space.addEdge(networkNodes[4], networkNodes[5], {
            type: 'flow',
            particleCount: 25,
            particleSpeed: 0.5,
            particleSize: 2,
            particleColor: 0x9b59b6,
            flowDirection: 0,
            animated: true,
            glowEffect: true,
            thickness: 2,
            color: 0xb084cc,
        }));

        // Spring Edges (Curved in demo, likely due to factory logic)
        this.springEdges.push(space.addEdge(centralNode, networkNodes[6], {
            type: 'curved',
            curvature: 0.3,
            thickness: 2,
            color: 0xe74c3c,
        }));
        this.springEdges.push(space.addEdge(centralNode, networkNodes[7], {
            type: 'curved',
            curvature: -0.3,
            thickness: 2,
            color: 0xf39c12,
        }));

        // Bezier Edges
        this.bezierEdges.push(space.addEdge(networkNodes[0], centralNode, {
            type: 'curved',
            curvature: 0.4,
            color: 0x8e44ad,
            thickness: 3,
        }));
        this.bezierEdges.push(space.addEdge(networkNodes[1], centralNode, {
            type: 'curved',
            curvature: -0.3,
            color: 0x27ae60,
            thickness: 3,
        }));
        // ... more bezier edges ...
    }

    createBasicStyledEdges(space, basePosition) {
        const nodes = [];
        const nodePositions = [
            {x: -200, y: 200}, {x: 200, y: 200},
            {x: -200, y: 0}, {x: 200, y: 0},
            {x: -200, y: -200}, {x: 200, y: -200},
            {x: 0, y: 100}, {x: 0, y: -100},
        ];

        nodePositions.forEach((pos, i) => {
            nodes.push(space.createNode({
                id: `bsn-${i}`,
                position: {x: basePosition.x + pos.x, y: basePosition.y + pos.y, z: basePosition.z},
                data: { label: `N${i + 1}`, shape: 'sphere', size: 30, color: Math.floor(Math.random() * 0xffffff) },
                mass: 1.0,
            }));
        });

        space.createNode({
            id: 'bs-title',
            type: 'text',
            position: {x: basePosition.x, y: basePosition.y + 300, z: basePosition.z},
            data: {text: 'Basic Styled Edges', fontSize: 18, color: 0xcccccc}
        });

        space.addEdge(nodes[0], nodes[1], {label: 'Basic'});
        space.addEdge(nodes[0], nodes[2], {label: 'Labeled'});
        space.addEdge(nodes[1], nodes[3], {label: 'Colored', color: 0xff00ff});
        space.addEdge(nodes[2], nodes[3], {label: 'Thick', thickness: 5});
        space.addEdge(nodes[0], nodes[6], {label: 'Dashed', dashed: true, dashSize: 8, gapSize: 4, color: 0x00ffff});
        space.addEdge(nodes[2], nodes[4], {type: 'curved', label: 'Curved +0.5', curvature: 0.5, color: 0xffff00});
    }

    createSpecializedStaticEdges(space, basePosition) {
        const n1 = space.createNode({
            id: 'ssen1',
            position: {x: basePosition.x - 150, y: basePosition.y + 50, z: basePosition.z},
            data: {label: 'SSE1', shape: 'sphere', size: 30, color: 0xff8888},
            mass: 1.0,
        });
        const n2 = space.createNode({
            id: 'ssen2',
            position: {x: basePosition.x + 150, y: basePosition.y + 50, z: basePosition.z},
            data: {label: 'SSE2', shape: 'sphere', size: 30, color: 0x88ff88},
            mass: 1.0,
        });

        space.createNode({
            id: 'sse-title',
            type: 'text',
            position: {x: basePosition.x, y: basePosition.y + 150, z: basePosition.z},
            data: {text: 'Special Static Edges', fontSize: 18, color: 0xcccccc}
        });

        space.addEdge(n1, n2, {
            type: 'curved',
            label: 'Dotted Edge',
            color: 0x00ffff,
            thickness: 2,
            curvature: 0.2,
        });
    }

    setupEdgeGUI(space) {
        const folder = this.gui.addFolder('Dynamic Edge Controls');

        const settings = {
            flowSpeed: 0.8,
            flowDirection: 1,
            springStiffness: 0.008,
            curveTension: 0.4,
            showBezierControls: false
        };

        folder.add(settings, 'flowSpeed', 0.1, 2.0).onChange(v => {
            this.flowEdges.forEach(e => e.setParticleSpeed?.(v));
        });

        folder.add(settings, 'flowDirection', { Forward: 1, Reverse: -1, Bi: 0 }).onChange(v => {
             const val = parseInt(v);
             this.flowEdges.forEach(e => e.setFlowDirection?.(val));
        });

        // Note: 'springs' in demo were actually created as 'curved' type in the original code, so setStiffness might not apply
        // but I'll keep the binding structure.
    }
}

const run = async () => {
    const app = new AdvancedEdgesDemo();
    await app.init();
};
run();
