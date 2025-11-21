import * as THREE from 'three';

export class VerificationTools {
    constructor(space) {
        this.space = space;
        this.scene = this.space.plugins.getPlugin('RenderingPlugin').getWebGLScene();
        this.helpers = {
            grid: null,
            axes: null,
            boxHelpers: new Map(),
            frustumHelpers: [],
            vectors: []
        };
        this.debugLayer = new THREE.Group();
        this.debugLayer.name = 'DebugLayer';
        this.scene.add(this.debugLayer);
    }

    toggleGrid(enabled, size = 2000, divisions = 20) {
        if (enabled) {
            if (!this.helpers.grid) {
                this.helpers.grid = new THREE.GridHelper(size, divisions, 0x444444, 0x222222);
                this.debugLayer.add(this.helpers.grid);
            }
            this.helpers.grid.visible = true;
        } else if (this.helpers.grid) {
            this.helpers.grid.visible = false;
        }
    }

    toggleAxes(enabled, size = 100) {
        if (enabled) {
            if (!this.helpers.axes) {
                this.helpers.axes = new THREE.AxesHelper(size);
                this.debugLayer.add(this.helpers.axes);
            }
            this.helpers.axes.visible = true;
        } else if (this.helpers.axes) {
            this.helpers.axes.visible = false;
        }
    }

    toggleBoundingBoxes(enabled) {
        const nodePlugin = this.space.plugins.getPlugin('NodePlugin');
        const nodes = nodePlugin ? Array.from(nodePlugin.getNodes().values()) : [];
        const renderingPlugin = this.space.plugins.getPlugin('RenderingPlugin');

        if (enabled) {
            nodes.forEach(node => {
                // Standard mesh
                if (node.mesh && !this.helpers.boxHelpers.has(node.id)) {
                    const helper = new THREE.BoxHelper(node.mesh, 0xffff00);
                    this.debugLayer.add(helper);
                    this.helpers.boxHelpers.set(node.id, helper);
                }
                // Instanced mesh - tricky, as BoxHelper works on Object3D.
                // For instanced, we might need to calculate manually.
                // For now, just standard nodes.
            });
            this.helpers.boxHelpers.forEach(h => h.visible = true);
        } else {
            this.helpers.boxHelpers.forEach(h => h.visible = false);
        }
    }

    update() {
        this.helpers.boxHelpers.forEach(helper => helper.update());
    }

    dispose() {
        this.scene.remove(this.debugLayer);
        // clean up geometries/materials if needed
    }
}
