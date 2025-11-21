import { DemoApp } from './lib/DemoApp.js';

class PerformanceDemo extends DemoApp {
    constructor() {
        super({ title: 'Performance Demo' });
        this.nodes = [];
    }

    async init() {
        const space = await super.init();

        // Configure initial performance settings
        const plugin = space.plugins.getPlugin('PerformancePlugin');
        if (plugin) {
            plugin.updatePerformanceConfig({
                enableInstancing: true,
                enableCulling: true,
                enableLOD: true,
                enableWorkers: true,
                autoOptimize: true,
            });
            plugin.startMonitoring(); // internal method exposed? yes
        }

        this.createGraph(space);
        this.setupPerformanceGUI(space);

        return space;
    }

    createGraph(space) {
        this.createLargeNodeClusters(space);
        this.createRepeatingPatterns(space);
        this.createDistanceBasedLOD(space);
    }

    createLargeNodeClusters(space) {
        const clusterCount = 5;
        const nodesPerCluster = 50;
        const clusterDistance = 800;
        const clusterRadius = 200;

        for (let cluster = 0; cluster < clusterCount; cluster++) {
            const clusterAngle = (cluster / clusterCount) * Math.PI * 2;
            const cx = Math.cos(clusterAngle) * clusterDistance;
            const cy = Math.sin(clusterAngle) * clusterDistance;
            const cz = (cluster - clusterCount / 2) * 100;

            const centerNode = space.createNode({
                id: `cluster-${cluster}-center`,
                type: 'shape',
                position: {x: cx, y: cy, z: cz},
                data: { label: `Cluster ${cluster}`, shape: 'sphere', size: 20, color: Math.floor(Math.random() * 0xffffff) }
            });
            this.nodes.push(centerNode);

            for (let i = 0; i < nodesPerCluster; i++) {
                const angle = (i / nodesPerCluster) * Math.PI * 2;
                const r = Math.random() * clusterRadius + 50;
                const node = space.createNode({
                    id: `cluster-${cluster}-${i}`,
                    type: 'shape',
                    position: { x: cx + Math.cos(angle)*r, y: cy + Math.sin(angle)*r, z: cz + (Math.random()-0.5)*100 },
                    data: { label: `C${cluster}-${i}`, shape: 'box', size: 8 + Math.random()*4, color: 0x45b7d1 }
                });
                this.nodes.push(node);

                if (i % 3 === 0) space.addEdge(centerNode, node, { color: 0x888888 });
            }
        }
    }

    createRepeatingPatterns(space) {
        const gridSize = 15;
        const spacing = 100;
        const start = -gridSize * spacing / 2;

        for(let x=0; x<gridSize; x++) {
            for(let y=0; y<gridSize; y++) {
                const node = space.createNode({
                    id: `pattern-${x}-${y}`,
                    type: 'shape',
                    position: { x: start + x*spacing, y: start + y*spacing, z: -500 + Math.sin(x*0.5)*100 },
                    data: { label: `P${x},${y}`, shape: (x+y)%2===0 ? 'box' : 'sphere', size: 8, color: 0x4ecdc4 }
                });
                this.nodes.push(node);
            }
        }
    }

    createDistanceBasedLOD(space) {
        const distances = [500, 1000, 1500, 2000];
        distances.forEach((d, i) => {
            const angle = (i/distances.length) * Math.PI * 2;
            const pos = { x: Math.cos(angle)*d, y: Math.sin(angle)*d, z: 0 };
            const node = space.createNode({
                id: `lod-${i}`,
                type: 'html',
                position: pos,
                data: {
                    label: `LOD Level ${i}`,
                    content: `<div style="background:rgba(0,0,0,0.5);color:white;padding:10px;">LOD Level ${i}<br>Distance: ${d}</div>`,
                    width: 200, height: 100
                }
            });
            this.nodes.push(node);
        });
    }

    setupPerformanceGUI(space) {
        const plugin = space.plugins.getPlugin('PerformancePlugin');
        if (!plugin) return;

        const folder = this.gui.addFolder('Performance Settings');
        const config = {
            instancing: true,
            culling: true,
            lod: true,
            workers: true,
            optimize: () => plugin.optimizePerformance(),
            stressTest: () => this.addStressNodes(space)
        };

        folder.add(config, 'instancing').onChange(v => plugin.setInstancingEnabled(v));
        folder.add(config, 'culling').onChange(v => plugin.setCullingEnabled(v));
        folder.add(config, 'lod').onChange(v => plugin.setLODEnabled(v));
        folder.add(config, 'workers').onChange(v => plugin.setWorkersEnabled(v));
        folder.add(config, 'optimize').name('Trigger Optimization');
        folder.add(config, 'stressTest').name('Add 100 Nodes');

        const metricsFolder = this.gui.addFolder('Metrics');
        const metrics = { fps: 0, objects: 0, memory: 0 };
        metricsFolder.add(metrics, 'fps').listen();
        metricsFolder.add(metrics, 'objects').listen();
        metricsFolder.add(metrics, 'memory').name('Memory (MB)').listen();

        // Poll metrics or listen to event
        space.on('performance:update', (data) => {
            metrics.fps = Math.round(data.frameRate);
            metrics.objects = data.objectCount;
            metrics.memory = Math.round(data.memoryUsage / 1024 / 1024);
        });

        // Fallback polling if event isn't firing often
        setInterval(() => {
             const m = plugin.getPerformanceMetrics();
             metrics.fps = Math.round(m.frameRate);
             metrics.objects = m.objectCount;
             metrics.memory = Math.round(m.memoryUsage / 1024 / 1024);
        }, 1000);
    }

    addStressNodes(space) {
        for(let i=0; i<100; i++) {
             space.createNode({
                id: `stress-${Date.now()}-${i}`,
                type: 'shape',
                position: { x: (Math.random()-0.5)*2000, y: (Math.random()-0.5)*2000, z: (Math.random()-0.5)*2000 },
                data: { shape: 'box', size: 5, color: Math.random()*0xffffff }
             });
        }
    }
}

const run = async () => {
    const app = new PerformanceDemo();
    await app.init();
};
run();
