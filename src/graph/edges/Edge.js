import * as THREE from 'three';
import {Utils} from '../../utils.js';
import {Line2} from 'three/addons/lines/Line2.js';
import {LineMaterial} from 'three/addons/lines/LineMaterial.js';
import {LineGeometry} from 'three/addons/lines/LineGeometry.js';

/**
 * Base Edge class for graph edges
 */
export class Edge {
    /** @type {string} Default edge type name */
    static typeName = 'straight';
    
    /** @type {number} Highlight color */
    static HIGHLIGHT_COLOR = 0x00ffff;
    
    /** @type {number} Default opacity */
    static DEFAULT_OPACITY = 0.8;
    
    /** @type {number} Highlight opacity */
    static HIGHLIGHT_OPACITY = 1.0;
    
    /** @type {number} Default hover opacity boost */
    static DEFAULT_HOVER_OPACITY_BOOST = 0.1;
    
    /** @type {number} Default hover thickness multiplier */
    static DEFAULT_HOVER_THICKNESS_MULTIPLIER = 1.1;

    /** @type {Line2|null} Line object */
    line = null;
    
    /** @type {Object} Arrowheads object */
    arrowheads = {source: null, target: null};
    
    /** @type {boolean} Instanced state */
    isInstanced = false;
    
    /** @type {number|null} Instance ID */
    instanceId = null;
    
    /** @type {boolean} Highlight state */
    isHighlighted = false;
    
    /** @type {boolean} Hover state */
    isHovered = false;

    // Pre-allocate THREE.Color instances for performance
    /** @type {THREE.Color} Start color */
    _colorStart = new THREE.Color();
    
    /** @type {THREE.Color} End color */
    _colorEnd = new THREE.Color();

    /** @type {Object} Edge data */
    data = {
        color: 0x00d0ff,
        gradientColors: null,
        thickness: 3,
        thicknessInstanced: 0.5,
        constraintType: 'elastic',
        constraintParams: {stiffness: 0.001, idealLength: 200},
        arrowhead: false,
        arrowheadSize: 10,
        arrowheadColor: null,
    };

    /**
     * Create a new Edge
     * @param {string} id - Edge ID
     * @param {Node} sourceNode - Source node
     * @param {Node} targetNode - Target node
     * @param {Object} data - Edge data
     */
    constructor(id, sourceNode, targetNode, data = {}) {
        if (!sourceNode || !targetNode) {
            throw new TypeError('Edge requires valid source and target nodes');
        }
        
        this.id = id;
        this.source = sourceNode;
        this.target = targetNode;
        this.isInstanced = false;
        this.instanceId = null;

        const defaultData = {
            color: 0x00d0ff,
            gradientColors: null,
            thickness: 3,
            thicknessInstanced: 0.5,
            constraintType: 'elastic',
            constraintParams: {stiffness: 0.001, idealLength: 200},
            arrowhead: false,
            arrowheadSize: 10,
            arrowheadColor: null,
        };
        
        this.data = Utils.mergeDeep({}, defaultData, data);
        
        if (this.data.gradientColors?.length === 2) {
            this.data.color = null;
        } else if (this.data.color === null) {
            this.data.color = defaultData.color;
        }

        this.line = this._createLine();
        this._createArrowheads();
        this.update();
    }

    /**
     * Create arrowheads based on data
     * @private
     */
    _createArrowheads() {
        const arrowheadOpt = this.data.arrowhead;
        if (arrowheadOpt === true || arrowheadOpt === 'target' || arrowheadOpt === 'both') {
            this.arrowheads.target = this._createSingleArrowhead('target');
        }
        if (arrowheadOpt === 'source' || arrowheadOpt === 'both') {
            this.arrowheads.source = this._createSingleArrowhead('source');
        }
    }

    /**
     * Create the line object
     * @returns {Line2} Line object
     * @private
     */
    _createLine() {
        const geometry = new LineGeometry();
        geometry.setPositions([0, 0, 0, 0, 0, 0.001]);

        const materialConfig = {
            linewidth: this.data.thickness,
            transparent: true,
            opacity: Edge.DEFAULT_OPACITY,
            depthTest: false,
            resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
            dashed: this.data.dashed ?? false,
            dashScale: this.data.dashScale ?? 1,
            dashSize: this.data.dashSize ?? 3,
            gapSize: this.data.gapSize ?? 1,
        };

        if (this.data.gradientColors?.length === 2) {
            materialConfig.vertexColors = true;
            this._colorStart.set(this.data.gradientColors[0]);
            this._colorEnd.set(this.data.gradientColors[1]);
            geometry.setColors([
                this._colorStart.r, this._colorStart.g, this._colorStart.b,
                this._colorEnd.r, this._colorEnd.g, this._colorEnd.b,
            ]);
        } else {
            materialConfig.vertexColors = false;
            materialConfig.color = this.data.color ?? 0x00d0ff;
        }

        const material = new LineMaterial(materialConfig);
        const line = new Line2(geometry, material);

        if (material.dashed) line.computeLineDistances();
        line.renderOrder = -1;
        line.userData = {edgeId: this.id};
        return line;
    }

    /**
     * Set gradient colors
     * @private
     */
    _setGradientColors() {
        const material = this.line?.material;
        if (!material) return;

        if (this.data.gradientColors?.length === 2) {
            if (!material.vertexColors) {
                material.vertexColors = true;
                material.needsUpdate = true;
            }

            this._colorStart.set(this.data.gradientColors[0]);
            this._colorEnd.set(this.data.gradientColors[1]);

            const colorAttr = this.line.geometry.attributes.color;
            if (colorAttr?.array?.length >= 6) {
                const colors = colorAttr.array;
                colors[0] = this._colorStart.r;
                colors[1] = this._colorStart.g;
                colors[2] = this._colorStart.b;
                colors[3] = this._colorEnd.r;
                colors[4] = this._colorEnd.g;
                colors[5] = this._colorEnd.b;
                colorAttr.needsUpdate = true;
            } else {
                const posAttribute = this.line.geometry.attributes.position;
                if (posAttribute) {
                    const numPoints = posAttribute.count;
                    const newColors = new Float32Array(numPoints * 3);
                    for (let i = 0; i < numPoints; i++) {
                        const t = numPoints > 1 ? i / (numPoints - 1) : 0;
                        const interpolatedColor = this._colorStart.clone().lerp(this._colorEnd, t);
                        newColors[i * 3] = interpolatedColor.r;
                        newColors[i * 3 + 1] = interpolatedColor.g;
                        newColors[i * 3 + 2] = interpolatedColor.b;
                    }
                    this.line.geometry.setColors(newColors);
                }
            }
        } else {
            if (material.vertexColors) {
                material.vertexColors = false;
                material.needsUpdate = true;
            }
            material.color.set(this.data.color ?? 0x00d0ff);
        }
    }

    /**
     * Update the edge
     */
    update() {
        if (!this.line || !this.source || !this.target) return;

        const sourcePos = this.source.position;
        const targetPos = this.target.position;

        // Validate positions
        if (!this._isValidPosition(sourcePos) || !this._isValidPosition(targetPos)) {
            return;
        }

        this.line.geometry.setPositions([
            sourcePos.x,
            sourcePos.y,
            sourcePos.z,
            targetPos.x,
            targetPos.y,
            targetPos.z,
        ]);

        if (this.line.geometry.attributes.position.count === 0) return;

        this._setGradientColors();

        if (this.line.material.dashed) this.line.computeLineDistances();
        this.line.geometry.computeBoundingSphere();

        this._updateArrowheads();
    }

    /**
     * Check if position is valid
     * @param {THREE.Vector3} position - Position to validate
     * @returns {boolean} True if valid
     * @private
     */
    _isValidPosition(position) {
        return (
            position &&
            isFinite(position.x) &&
            isFinite(position.y) &&
            isFinite(position.z)
        );
    }

    /**
     * Update arrowheads
     * @private
     */
    _updateArrowheads() {
        const sourcePos = this.source.position;
        const targetPos = this.target.position;

        if (this.arrowheads.target) {
            this.arrowheads.target.position.copy(targetPos);
            const direction = new THREE.Vector3().subVectors(targetPos, sourcePos).normalize();
            this._orientArrowhead(this.arrowheads.target, direction);
        }

        if (this.arrowheads.source) {
            this.arrowheads.source.position.copy(sourcePos);
            const direction = new THREE.Vector3().subVectors(sourcePos, targetPos).normalize();
            this._orientArrowhead(this.arrowheads.source, direction);
        }
    }

    /**
     * Create a single arrowhead
     * @param {string} _type - Arrowhead type
     * @returns {THREE.Mesh} Arrowhead mesh
     * @private
     */
    _createSingleArrowhead(_type) {
        const size = this.data.arrowheadSize || 10;
        const geometry = new THREE.ConeGeometry(size / 2, size, 8);
        const material = new THREE.MeshBasicMaterial({
            color: this.data.arrowheadColor || this.data.color,
            opacity: Edge.DEFAULT_OPACITY,
            transparent: true,
            depthTest: false,
        });
        const arrowhead = new THREE.Mesh(geometry, material);
        arrowhead.renderOrder = this.line.renderOrder + 1;
        arrowhead.userData = {edgeId: this.id, type: 'edge-arrowhead'};
        return arrowhead;
    }

    /**
     * Orient an arrowhead
     * @param {THREE.Mesh} arrowhead - Arrowhead mesh
     * @param {THREE.Vector3} direction - Direction vector
     * @private
     */
    _orientArrowhead(arrowhead, direction) {
        const coneUp = new THREE.Vector3(0, 1, 0);
        arrowhead.quaternion.setFromUnitVectors(coneUp, direction);
    }

    /**
     * Set highlight state
     * @param {boolean} highlight - Highlight state
     */
    setHighlight(highlight) {
        this.isHighlighted = highlight;
        if (!this.line?.material) return;

        const mat = this.line.material;
        mat.opacity = highlight ? Edge.HIGHLIGHT_OPACITY : Edge.DEFAULT_OPACITY;

        // Calculate thickness multiplier based on gradient usage
        const hasGradient = this.data.gradientColors?.length === 2 && mat.vertexColors;
        const thicknessMultiplier = hasGradient ? 2.0 : 1.5;
        mat.linewidth = highlight ? this.data.thickness * thicknessMultiplier : this.data.thickness;

        // Update color if not using vertex colors
        if (!mat.vertexColors) {
            mat.color.set(highlight ? Edge.HIGHLIGHT_COLOR : this.data.color);
        }
        mat.needsUpdate = true;

        // Update arrowhead styles
        this._updateArrowheadStyle(this.arrowheads.source, highlight);
        this._updateArrowheadStyle(this.arrowheads.target, highlight);

        // Handle hover state override
        if (highlight && this.isHovered) this.setHoverStyle(false, true);
    }

    /**
     * Update arrowhead style
     * @param {THREE.Mesh} arrowhead - Arrowhead mesh
     * @param {boolean} isHighlighted - Highlight state
     * @private
     */
    _updateArrowheadStyle(arrowhead, isHighlighted) {
        if (!arrowhead?.material) return;

        const color = isHighlighted
            ? Edge.HIGHLIGHT_COLOR
            : this.data.arrowheadColor ?? this.data.color;

        arrowhead.material.color.set(color);
        arrowhead.material.opacity = isHighlighted
            ? Edge.HIGHLIGHT_OPACITY
            : Edge.DEFAULT_OPACITY;
    }

    /**
     * Set hover style
     * @param {boolean} hovered - Hover state
     * @param {boolean} force - Force update
     */
    setHoverStyle(hovered, force = false) {
        if (!force && this.isHighlighted) return;
        if (!this.line?.material) return;

        this.isHovered = hovered;

        const mat = this.line.material;
        const baseOpacity = Edge.DEFAULT_OPACITY;
        const baseThickness = this.data.thickness;

        mat.opacity = hovered
            ? Math.min(1.0, baseOpacity + Edge.DEFAULT_HOVER_OPACITY_BOOST)
            : baseOpacity;
        mat.linewidth = hovered
            ? baseThickness * Edge.DEFAULT_HOVER_THICKNESS_MULTIPLIER
            : baseThickness;
        mat.needsUpdate = true;

        // Update arrowhead opacity if not highlighted
        if (!this.isHighlighted) {
            this._updateArrowheadOpacity(this.arrowheads.source, hovered);
            this._updateArrowheadOpacity(this.arrowheads.target, hovered);
        }
    }

    /**
     * Update arrowhead opacity
     * @param {THREE.Mesh} arrowhead - Arrowhead mesh
     * @param {boolean} isHovered - Hover state
     * @private
     */
    _updateArrowheadOpacity(arrowhead, isHovered) {
        if (!arrowhead?.material) return;

        const baseOpacity = Edge.DEFAULT_OPACITY;
        arrowhead.material.opacity = isHovered
            ? Math.min(1.0, baseOpacity + Edge.DEFAULT_HOVER_OPACITY_BOOST)
            : baseOpacity;
    }

    /**
     * Update resolution
     * @param {number} width - Width
     * @param {number} height - Height
     */
    updateResolution(width, height) {
        if (this.line?.material) this.line.material.resolution.set(width, height);
    }

    /**
     * Dispose of the edge resources
     */
    dispose() {
        // Dispose line resources
        this.line?.geometry?.dispose();
        this.line?.material?.dispose();
        this.line?.parent?.remove(this.line);
        this.line = null;

        // Dispose arrowhead resources
        this._disposeArrowhead(this.arrowheads.source);
        this.arrowheads.source = null;
        this._disposeArrowhead(this.arrowheads.target);
        this.arrowheads.target = null;
    }

    /**
     * Dispose of an arrowhead
     * @param {THREE.Mesh} arrowhead - Arrowhead mesh
     * @private
     */
    _disposeArrowhead(arrowhead) {
        if (!arrowhead) return;
        arrowhead.geometry?.dispose();
        arrowhead.material?.dispose();
        arrowhead.parent?.remove(arrowhead);
    }
}
