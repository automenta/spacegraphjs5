import * as THREE from 'three';

/**
 * Helper class for managing edge arrowheads
 */
export class ArrowheadHelper {
    static DEFAULT_OPACITY = 0.8;

    /**
     * Creates arrowhead meshes based on arrowhead configuration
     * @param {object} data - Edge data containing arrowhead configuration
     * @param {string} edgeId - ID of the edge
     * @param {number} color - Color for the arrowhead
     * @param {number} renderOrder - Render order for the arrowhead
     * @returns {object} Object containing source and target arrowhead meshes
     */
    static createArrowheads(data, edgeId, color, renderOrder) {
        const arrowheads = {source: null, target: null};
        const {arrowhead} = data;

        if (arrowhead === true || arrowhead === 'target' || arrowhead === 'both') {
            arrowheads.target = this._createSingleArrowhead(data, edgeId, color, renderOrder, 'target');
        }
        if (arrowhead === 'source' || arrowhead === 'both') {
            arrowheads.source = this._createSingleArrowhead(data, edgeId, color, renderOrder, 'source');
        }

        return arrowheads;
    }

    /**
     * Updates arrowhead positions and orientations based on edge endpoints
     * @param {object} arrowheads - Object containing source and target arrowhead meshes
     * @param {THREE.Vector3} sourcePos - Source position
     * @param {THREE.Vector3} targetPos - Target position
     */
    static updateArrowheads(arrowheads, sourcePos, targetPos) {
        if (arrowheads.target) {
            arrowheads.target.position.copy(targetPos);
            const direction = new THREE.Vector3().subVectors(targetPos, sourcePos).normalize();
            this._orientArrowhead(arrowheads.target, direction);
        }

        if (arrowheads.source) {
            arrowheads.source.position.copy(sourcePos);
            const direction = new THREE.Vector3().subVectors(sourcePos, targetPos).normalize();
            this._orientArrowhead(arrowheads.source, direction);
        }
    }

    /**
     * Updates arrowhead styles based on highlight state
     * @param {THREE.Mesh} arrowhead - Arrowhead mesh to update
     * @param {boolean} isHighlighted - Whether the edge is highlighted
     * @param {object} data - Edge data
     * @param {number} highlightColor - Highlight color
     * @param {number} defaultOpacity - Default opacity
     * @param {number} highlightOpacity - Highlight opacity
     */
    static updateArrowheadStyle(arrowhead, isHighlighted, data, highlightColor, defaultOpacity, highlightOpacity) {
        if (!arrowhead?.material) return;

        const color = isHighlighted
            ? highlightColor
            : data.arrowheadColor ?? data.color;

        arrowhead.material.color.set(color);
        arrowhead.material.opacity = isHighlighted ? highlightOpacity : defaultOpacity;
    }

    /**
     * Updates arrowhead opacity based on hover state
     * @param {THREE.Mesh} arrowhead - Arrowhead mesh to update
     * @param {boolean} isHovered - Whether the edge is hovered
     * @param {number} defaultOpacity - Default opacity
     * @param {number} opacityBoost - Opacity boost when hovered
     */
    static updateArrowheadOpacity(arrowhead, isHovered, defaultOpacity, opacityBoost) {
        if (!arrowhead?.material) return;

        arrowhead.material.opacity = isHovered
            ? Math.min(1.0, defaultOpacity + opacityBoost)
            : defaultOpacity;
    }

    /**
     * Disposes of arrowhead resources
     * @param {THREE.Mesh} arrowhead - Arrowhead mesh to dispose
     */
    static disposeArrowhead(arrowhead) {
        if (!arrowhead) return;
        arrowhead.geometry?.dispose();
        arrowhead.material?.dispose();
        arrowhead.parent?.remove(arrowhead);
    }

    /**
     * Creates a single arrowhead mesh
     * @private
     */
    static _createSingleArrowhead(data, edgeId, color, renderOrder, _type) {
        const size = data.arrowheadSize || 10;
        const geometry = new THREE.ConeGeometry(size / 2, size, 8);
        const material = new THREE.MeshBasicMaterial({
            color: data.arrowheadColor || color,
            opacity: this.DEFAULT_OPACITY,
            transparent: true,
            depthTest: false,
        });
        const arrowhead = new THREE.Mesh(geometry, material);
        arrowhead.renderOrder = renderOrder + 1;
        arrowhead.userData = {edgeId, type: 'edge-arrowhead'};
        return arrowhead;
    }

    /**
     * Orients an arrowhead to point in the specified direction
     * @private
     */
    static _orientArrowhead(arrowhead, direction) {
        const coneUp = new THREE.Vector3(0, 1, 0);
        arrowhead.quaternion.setFromUnitVectors(coneUp, direction);
    }
}