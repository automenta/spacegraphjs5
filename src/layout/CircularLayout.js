import {BaseLayout} from './BaseLayout.js';

export class CircularLayout extends BaseLayout {
    constructor(config = {}) {
        super(config);
    }

    static get defaultSettings() {
        return {
            radius: 200,
            plane: 'xy',
            startAngle: 0,
            angularSpacing: 0,
            center: {x: 0, y: 0, z: 0},
            animate: true,
        };
    }

    init(nodes, edges, config = {}) {
        if (Object.keys(config).length > 0) this.updateConfig(config);
        this.nodes = [...nodes];

        if (this.nodes.length === 0) return;

        const numNodes = this.nodes.length;
        const {radius, plane, startAngle, center} = this.settings;
        const angularSpacing =
            this.settings.angularSpacing <= 0 ? (2 * Math.PI) / numNodes : this.settings.angularSpacing;

        // Calculate dynamic radius if needed
        const dynamicRadius = radius <= 0
            ? this._calculateDynamicRadius()
            : radius;

        // Position nodes in circular arrangement
        this.nodes.forEach((node, index) => {
            const angle = startAngle + index * angularSpacing;
            const x = center.x + dynamicRadius * Math.cos(angle);
            const y = center.y + dynamicRadius * Math.sin(angle);

            this._setPositionByPlane(node, x, y, center);
        });
    }

    _calculateDynamicRadius() {
        let totalCircumference = 0;
        this.nodes.forEach(node => {
            const nodeRadius = node.getBoundingSphereRadius?.() || 25;
            totalCircumference += nodeRadius * 3; // 1.5 * 2
        });
        return Math.max(100, totalCircumference / (2 * Math.PI));
    }

    _setPositionByPlane(node, x, y, center) {
        switch (this.settings.plane) {
            case 'xy':
                node.position.set(x, y, center.z);
                break;
            case 'xz':
                node.position.set(x, center.y, y);
                break;
            default: // 'yz'
                node.position.set(center.x, x, y);
                break;
        }
    }

    // Inherit empty implementations from BaseLayout:
    // run(), stop(), addNode(), removeNode(), addEdge(), removeEdge()

    dispose() {
        super.dispose();
    }
}
