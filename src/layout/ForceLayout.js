import * as THREE from 'three';
import {BaseLayout} from './BaseLayout.js';

export class ForceLayout extends BaseLayout {
    nodesMap = new Map();
    edgesMap = new Map();

    worker = null;
    isRunning = false;
    totalEnergy = Infinity;

    constructor(config = {}) {
        super(config);
        this.worker = new Worker(new URL('./forceLayout.worker.js', import.meta.url), {
            type: 'module',
        });
        this.worker.onmessage = this._handleWorkerMessage.bind(this);
        this.worker.onerror = error => {
            console.error('ForceLayout Worker Error:', error);
            this.isRunning = false;
            this.space?.emit('layout:error', {error});
        };
    }

    static get defaultSettings() {
        return {
            repulsion: 3000,
            centerStrength: 0.0005,
            damping: 0.92,
            minEnergyThreshold: 0.1,
            gravityCenter: new THREE.Vector3(0, 0, 0),
            zSpreadFactor: 0.15,
            autoStopDelay: 4000,
            nodePadding: 1.2,
            defaultElasticStiffness: 0.001,
            defaultElasticIdealLength: 200,
            defaultRigidStiffness: 0.1,
            defaultWeldStiffness: 0.5,
            enableClustering: false,
            clusterAttribute: 'clusterId',
            clusterStrength: 0.005,
        };
    }

    _handleWorkerMessage(event) {
        const {type, positions, energy, error} = event.data;
        switch (type) {
            case 'positionsUpdate':
                this.totalEnergy = energy;
                positions.forEach(p => {
                    const node = this.nodesMap.get(p.id);
                    node?.position.set(p.x, p.y, p.z);
                });
                break;
            case 'stopped':
                this.isRunning = false;
                this.totalEnergy = energy;
                this.space?.emit('layout:stopped', {name: 'force (worker)'});
                break;
            case 'error':
                console.error('ForceLayout Worker error:', error);
                this.space?.emit('layout:error', {error});
                break;
        }
    }

    init(initialNodes, initialEdges, config = {}) {
        if (Object.keys(config).length > 0) this.updateConfig(config);

        // Clear and populate maps
        this.nodesMap.clear();
        initialNodes.forEach(n => this.nodesMap.set(n.id, n));

        this.edgesMap.clear();
        initialEdges.forEach(e => this.edgesMap.set(e.id, e));

        // Prepare data for worker
        const workerNodes = initialNodes.map(n => ({
            id: n.id,
            x: n.position.x,
            y: n.position.y,
            z: n.position.z,
            vx: 0,
            vy: 0,
            vz: 0,
            mass: n.mass ?? 1.0,
            isFixed: n.isPinned ?? false,
            isPinned: n.isPinned ?? false,
            radius: n.getBoundingSphereRadius?.() ?? 50,
            clusterId: n.data?.clusterId,
        }));

        const workerEdges = initialEdges.map(e => ({
            sourceId: e.source.id,
            targetId: e.target.id,
            constraintType: e.data?.constraintType,
            constraintParams: e.data?.constraintParams,
        }));

        // Normalize gravity center
        const gravityCenter = this.settings.gravityCenter ?? {x: 0, y: 0, z: 0};
        const plainGravityCenter = {
            x: gravityCenter.x ?? 0,
            y: gravityCenter.y ?? 0,
            z: gravityCenter.z ?? 0,
        };

        this.worker.postMessage({
            type: 'init',
            payload: {
                nodes: workerNodes,
                edges: workerEdges,
                settings: {...this.settings, gravityCenter: plainGravityCenter},
            },
        });
    }

    isRunningCheck() {
        return this.isRunning;
    }

    getConfig() {
        return {...this.settings};
    }

    setPinState(node, isPinned) {
        if (!this.nodesMap.has(node.id)) return;
        node.isPinned = isPinned;
        this.worker.postMessage({
            type: 'updateNodeState',
            payload: {
                nodeId: node.id,
                isFixed: node.isPinned,
                isPinned: node.isPinned
            },
        });
        if (this.isRunning) this.kick();
    }

    fixNode(node) {
        if (!this.nodesMap.has(node.id)) return;
        this.worker.postMessage({
            type: 'updateNodeState',
            payload: {
                nodeId: node.id,
                isFixed: true,
                isPinned: node.isPinned ?? false,
                position: {
                    x: node.position.x,
                    y: node.position.y,
                    z: node.position.z
                },
            },
        });
    }

    releaseNode(node) {
        if (!this.nodesMap.has(node.id)) return;
        if (!node.isPinned) {
            this.worker.postMessage({
                type: 'updateNodeState',
                payload: {
                    nodeId: node.id,
                    isFixed: false,
                    isPinned: node.isPinned ?? false
                },
            });
        }
        this.kick();
    }

    addNode(node) {
        // Early return if node is invalid or already exists
        if (!node?.id || this.nodesMap.has(node.id)) return;

        this.nodesMap.set(node.id, node);

        // Send node data to worker
        this.worker.postMessage({
            type: 'addNode',
            payload: {
                node: {
                    id: node.id,
                    x: node.position?.x ?? 0,
                    y: node.position?.y ?? 0,
                    z: node.position?.z ?? 0,
                    vx: 0,
                    vy: 0,
                    vz: 0,
                    mass: node.mass ?? 1.0,
                    isFixed: node.isPinned ?? false,
                    isPinned: node.isPinned ?? false,
                    radius: node.getBoundingSphereRadius?.() ?? 50,
                    clusterId: node.data?.clusterId,
                },
            },
        });

        if (this.isRunning || this.nodesMap.size > 1) this.kick();
    }

    removeNode(node) {
        if (!this.nodesMap.has(node.id)) return;
        this.nodesMap.delete(node.id);
        this.worker.postMessage({
            type: 'removeNode',
            payload: {nodeId: node.id}
        });

        if (this.isRunning) {
            if (this.nodesMap.size < 2) {
                this.stop();
            } else {
                this.kick();
            }
        }
    }

    addEdge(edge) {
        if (this.edgesMap.has(edge.id)) return;
        this.edgesMap.set(edge.id, edge);
        this.worker.postMessage({
            type: 'addEdge',
            payload: {
                edge: {
                    id: edge.id,
                    sourceId: edge.source.id,
                    targetId: edge.target.id,
                    constraintType: edge.data?.constraintType,
                    constraintParams: edge.data?.constraintParams,
                },
            },
        });
        if (this.isRunning) this.kick();
    }

    removeEdge(edge) {
        if (!this.edgesMap.has(edge.id)) return;
        this.edgesMap.delete(edge.id);
        this.worker.postMessage({
            type: 'removeEdge',
            payload: {
                sourceId: edge.source.id,
                targetId: edge.target.id
            },
        });
        if (this.isRunning) this.kick();
    }

    runOnce() {
        if (!this.isRunning) this.run();
    }

    run() {
        if (this.isRunning || this.nodesMap.size < 1) {
            if (this.isRunning) this.kick();
            return;
        }
        this.isRunning = true;
        this.worker.postMessage({type: 'start'});
        this.space?.emit('layout:started', {name: 'force (worker)'});
    }

    stop() {
        if (!this.worker) return;
        this.worker.postMessage({type: 'stop'});
    }

    kick(intensity = 1) {
        if (this.nodesMap.size < 1 || !this.worker) return;
        this.worker.postMessage({
            type: 'kick',
            payload: {intensity}
        });
        if (!this.isRunning) this.run();
    }

    setSettings(newSettings) {
        this.settings = {...this.settings, ...newSettings};

        // Normalize gravity center
        const gravityCenter = this.settings.gravityCenter ?? {x: 0, y: 0, z: 0};
        const plainGravityCenter = {
            x: gravityCenter.x ?? 0,
            y: gravityCenter.y ?? 0,
            z: gravityCenter.z ?? 0,
        };

        this.worker.postMessage({
            type: 'updateSettings',
            payload: {
                settings: {...this.settings, gravityCenter: plainGravityCenter}
            },
        });
    }

    dispose() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        this.nodesMap.clear();
        this.edgesMap.clear();
        this.isRunning = false;
        super.dispose();
    }
}
