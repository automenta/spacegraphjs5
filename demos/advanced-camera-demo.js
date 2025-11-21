import { DemoApp } from './lib/DemoApp.js';
import * as THREE from 'three';

class AdvancedCameraDemo extends DemoApp {
    constructor() {
        super({ title: 'Advanced Camera Demo' });
        this.nodes = [];
        this.edges = [];
        this.localSettings = null;
    }

    async init() {
        const space = await super.init();
        this.createDemoGraph(space);
        this.setupAdvancedCameraGUI(space);
        return space;
    }

    createDemoGraph(space) {
        this.createCluster(space, 'center', {x: 0, y: 0, z: 0}, 8, 150);
        this.createCluster(space, 'left', {x: -300, y: 100, z: 50}, 6, 100);
        this.createCluster(space, 'right', {x: 300, y: -100, z: -50}, 7, 120);
        this.createCluster(space, 'top', {x: 0, y: 300, z: 80}, 5, 80);
        this.connectClusters(space);
    }

    createCluster(space, name, center, count, radius) {
        const clusterNodes = [];

        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const distance = radius * (0.3 + Math.random() * 0.7);
            const height = (Math.random() - 0.5) * radius * 0.5;

            const position = {
                x: center.x + Math.cos(angle) * distance,
                y: center.y + Math.sin(angle) * distance + height,
                z: center.z + (Math.random() - 0.5) * 100,
            };

            const nodeTypes = [
                'ControlPanelNode',
                'ProgressNode',
                'TextMeshNode',
                'ProceduralShapeNode',
            ];
            const node = space.createNode({
                id: `${name}_node_${i}`,
                type: nodeTypes[i % nodeTypes.length],
                position,
                data: {
                    cluster: name,
                    mass: 1 + Math.random(),
                    content: `Node ${name}-${i}`,
                },
            });

            this.nodes.push(node);
            clusterNodes.push(node);
        }

        // Connect nodes within cluster
        for (let i = 0; i < clusterNodes.length; i++) {
            const connections = Math.min(3, clusterNodes.length - 1);
            for (let j = 0; j < connections; j++) {
                const targetIndex = (i + j + 1) % clusterNodes.length;
                if (i !== targetIndex && !this.hasEdge(clusterNodes[i], clusterNodes[targetIndex])) {
                    const edge = space.addEdge(clusterNodes[i], clusterNodes[targetIndex], {
                        id: `${name}_edge_${i}_${targetIndex}`,
                        type: Math.random() > 0.5 ? 'SpringEdge' : 'BezierEdge',
                    });
                    this.edges.push(edge);
                }
            }
        }
    }

    connectClusters(space) {
        const clusters = ['center', 'left', 'right', 'top'];

        clusters.forEach((cluster1, i) => {
            clusters.forEach((cluster2, j) => {
                if (i < j) {
                    const nodes1 = this.nodes.filter(n => n.data.cluster === cluster1);
                    const nodes2 = this.nodes.filter(n => n.data.cluster === cluster2);

                    if (nodes1.length > 0 && nodes2.length > 0) {
                        const source = nodes1[Math.floor(Math.random() * nodes1.length)];
                        const target = nodes2[Math.floor(Math.random() * nodes2.length)];

                        const edge = space.addEdge(source, target, {
                            id: `inter_${cluster1}_${cluster2}`,
                            type: 'FlowEdge',
                            data: {isInterCluster: true},
                        });
                        this.edges.push(edge);
                    }
                }
            });
        });
    }

    hasEdge(source, target) {
        return this.edges.some(
            edge =>
                (edge.source === source && edge.target === target) ||
                (edge.source === target && edge.target === source)
        );
    }

    setupAdvancedCameraGUI(space) {
        const cameraPlugin = space.plugins.getPlugin('CameraPlugin');
        const defaults = cameraPlugin.getAdvancedSettings();

        // Clone defaults to local settings for binding
        this.localSettings = JSON.parse(JSON.stringify(defaults));

        const folder = this.gui.addFolder('Advanced Camera Controls');

        // Helper to sync
        const sync = () => {
            cameraPlugin.updateAdvancedSettings(this.localSettings);
        };

        // Auto Zoom
        const az = folder.addFolder('Auto Zoom');
        az.add(this.localSettings.autoZoom, 'enabled').name('Enable').onChange(v => {
             cameraPlugin.toggleAutoZoom(v);
             this.localSettings.autoZoom.enabled = v;
        });
        az.add(this.localSettings.autoZoom, 'targetPadding', 1.0, 3.0).onChange(sync);
        az.add(this.localSettings.autoZoom, 'transitionDuration', 0.1, 5.0).onChange(sync);
        az.add(this.localSettings.autoZoom, 'minDistance', 10, 500).onChange(sync);
        az.add(this.localSettings.autoZoom, 'maxDistance', 500, 5000).onChange(sync);

        // Auto Rotate
        const ar = folder.addFolder('Auto Rotate');
        ar.add(this.localSettings.rotation, 'autoRotate').name('Enable').onChange(v => {
            cameraPlugin.toggleAutoRotation(v);
            this.localSettings.rotation.autoRotate = v;
        });
        ar.add(this.localSettings.rotation, 'autoRotateSpeed', 0.001, 0.1).onChange(v => {
            cameraPlugin.setRotationSpeed(v);
            this.localSettings.rotation.autoRotateSpeed = v;
        });

        // Peek Mode
        const pm = folder.addFolder('Peek Mode');
        pm.add(this.localSettings.peekMode, 'enabled').name('Enable').onChange(v => {
            cameraPlugin.togglePeekMode(v);
            this.localSettings.peekMode.enabled = v;
        });
        pm.add(this.localSettings.peekMode, 'peekDistance', 50, 300).onChange(sync);
        pm.add(this.localSettings.peekMode, 'peekSpeed', 0.1, 2.0).onChange(sync);

        // Cinematic
        const cm = folder.addFolder('Cinematic');
        const cinState = { active: false };
        cm.add(cinState, 'active').name('Active').onChange(v => {
            cameraPlugin.toggleCinematicMode(v);
        });
        cm.add(this.localSettings.cinematic, 'cinematicSpeed', 0.1, 2.0).onChange(sync);
        cm.add(this.localSettings.cinematic, 'cinematicRadius', 200, 1000).onChange(sync);

        // Actions
        const actions = folder.addFolder('Actions');
        actions.add({ fn: () => this.performSmartFocus(space) }, 'fn').name('Smart Focus Random');
        actions.add({ fn: () => this.startViewSequence(space) }, 'fn').name('Start Tour');
        actions.add({ fn: () => this.addRandomNodes(space, 5) }, 'fn').name('Add 5 Nodes');
        actions.add({ fn: () => this.removeRandomNodes(space, 3) }, 'fn').name('Remove 3 Nodes');

        // Verification Hooks
        const verify = folder.addFolder('AI/Verify Hooks');
        verify.add({ fn: () => this.highlightSmartFocusTargets(space) }, 'fn').name('Show Focus Context');
    }

    performSmartFocus(space) {
        if (this.nodes.length === 0) return;
        const randomNode = this.nodes[Math.floor(Math.random() * this.nodes.length)];
        space.plugins.getPlugin('CameraPlugin').smartFocusOnNode(randomNode, {
            considerNeighbors: true,
            includeEdges: true,
            transitionDuration: 1.2,
            contextRadius: 250,
        });
        console.log(`Smart focus on node: ${randomNode.id}`);
    }

    startViewSequence(space) {
        if (this.nodes.length < 4) return;
        const clusters = ['center', 'left', 'right', 'top'];
        const tourNodes = [];
        clusters.forEach(cluster => {
            const clusterNodes = this.nodes.filter(n => n.data.cluster === cluster);
            if (clusterNodes.length > 0) {
                tourNodes.push(clusterNodes[Math.floor(Math.random() * clusterNodes.length)]);
            }
        });
        space.plugins.getPlugin('CameraPlugin').createViewSequence(tourNodes, {
            duration: 1.5,
            pause: 2.0,
            includeOverview: true,
            smoothTransitions: true,
        });
    }

    addRandomNodes(space, count) {
        const clusters = ['center', 'left', 'right', 'top'];
        for (let i = 0; i < count; i++) {
            const cluster = clusters[Math.floor(Math.random() * clusters.length)];
            const existingClusterNodes = this.nodes.filter(n => n.data.cluster === cluster);

            if (existingClusterNodes.length > 0) {
                const centerNode = existingClusterNodes[0];
                const angle = Math.random() * Math.PI * 2;
                const distance = 80 + Math.random() * 120;

                const position = {
                    x: centerNode.position.x + Math.cos(angle) * distance,
                    y: centerNode.position.y + Math.sin(angle) * distance,
                    z: centerNode.position.z + (Math.random() - 0.5) * 100,
                };

                const node = space.createNode({
                    id: `${cluster}_added_${Date.now()}_${i}`,
                    type: 'ProceduralShapeNode',
                    position,
                    data: { cluster: cluster, mass: 1.0 }
                });
                this.nodes.push(node);

                 if (Math.random() > 0.3) {
                    const targetNode = existingClusterNodes[Math.floor(Math.random() * existingClusterNodes.length)];
                    const edge = space.addEdge(node, targetNode, { type: 'BezierEdge' });
                    this.edges.push(edge);
                 }
            }
        }
    }

    removeRandomNodes(space, count) {
        if (this.nodes.length <= 10) return;
        for (let i = 0; i < count && this.nodes.length > 10; i++) {
            const nodeToRemove = this.nodes[Math.floor(Math.random() * this.nodes.length)];
             // Remove associated edges
            this.edges = this.edges.filter(edge => {
                if (edge.source === nodeToRemove || edge.target === nodeToRemove) {
                    space.plugins.getPlugin('EdgePlugin').removeEdge(edge.id);
                    return false;
                }
                return true;
            });
            space.plugins.getPlugin('NodePlugin').removeNode(nodeToRemove.id);
            this.nodes = this.nodes.filter(n => n !== nodeToRemove);
        }
    }

    highlightSmartFocusTargets(space) {
        // Visual verification: Draw spheres around cluster centers to show "Smart Context"
        const debugLayer = this.verificationTools.debugLayer;
        // Clear old debug objects of this type
        const old = debugLayer.children.filter(c => c.userData.type === 'smartFocus');
        old.forEach(o => debugLayer.remove(o));

        if (old.length > 0) return; // Toggle off if existed

        const clusters = ['center', 'left', 'right', 'top'];
        clusters.forEach(cluster => {
             const clusterNodes = this.nodes.filter(n => n.data.cluster === cluster);
             if (clusterNodes.length === 0) return;

             // Calculate bounds
             const box = new THREE.Box3();
             clusterNodes.forEach(n => box.expandByPoint(new THREE.Vector3(n.position.x, n.position.y, n.position.z)));

             const helper = new THREE.Box3Helper(box, 0x00ff00);
             helper.userData.type = 'smartFocus';
             debugLayer.add(helper);
        });
    }
}

const run = async () => {
    const app = new AdvancedCameraDemo();
    await app.init();
};
run();
