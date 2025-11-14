import * as THREE from 'three';
import {Utils} from '../../utils.js';
import {GRAPH_CONSTANTS} from '../constants.js';

/**
 * Base Node class for graph nodes
 */
export class Node {
    /** @type {SpaceGraph|null} SpaceGraph instance */
    space = null;
    
    /** @type {THREE.Vector3} Node position */
    position = new THREE.Vector3();
    
    /** @type {Object} Node data */
    data = {};
    
    /** @type {number} Node mass */
    mass = 1.0;
    
    /** @type {string|number|null} Node ID */
    id = null;
    
    /** @type {THREE.Object3D|null} Mesh object */
    mesh = null;
    
    /** @type {CSS3DObject|null} CSS object */
    cssObject = null;
    
    /** @type {Object|null} Label object */
    labelObject = null;
    
    /** @type {boolean} Pin state */
    isPinned = false;

    /**
     * Create a new Node
     * @param {string|number} id - Node ID
     * @param {Object|number} position - Position object or x coordinate
     * @param {Object} data - Node data
     * @param {number} mass - Node mass
     */
    constructor(id, position = {x: 0, y: 0, z: 0}, data = {}, mass = 1.0) {
        if (!id && id !== 0) {
            throw new TypeError('Node requires a valid id');
        }
        
        this.id = id;
        this.setPosition(position);
        this.data = Utils.mergeDeep({}, this.getDefaultData(), data);
        this.mass = Math.max(0.1, mass);
        this.isPinned = this.data.isPinned ?? false;
    }

    /**
     * Get default node data
     * @returns {Object} Default data
     */
    getDefaultData() {
        return {label: ''};
    }

    /**
     * Update the node
     * @param {SpaceGraph} _space - SpaceGraph instance
     */
    update(_space) {}

    /**
     * Dispose of the node resources
     */
    dispose() {
        try {
            this.mesh?.geometry?.dispose();
            this.mesh?.material?.dispose();
            this.mesh?.parent?.remove(this.mesh);
            this.cssObject?.element?.remove();
            this.cssObject?.parent?.remove(this.cssObject);
            this.labelObject?.element?.remove();
            this.labelObject?.parent?.remove(this.labelObject);
            
            this.space = null;
            this.mesh = null;
            this.cssObject = null;
            this.labelObject = null;
        } catch (error) {
            console.error(`Error disposing node ${this.id}:`, error);
        }
    }

    /**
     * Get bounding sphere radius
     * @returns {number} Radius
     */
    getBoundingSphereRadius() {
        return GRAPH_CONSTANTS.DEFAULT_NODE_SIZE;
    }

    /**
     * Set selected style
     * @param {boolean} _selected - Selected state
     */
    setSelectedStyle(_selected) {}

    /**
     * Set node position
     * @param {Object|number} pos - Position object or x coordinate
     * @param {number} y - Y coordinate
     * @param {number} z - Z coordinate
     */
    setPosition(pos, y, z) {
        let x, finalY, finalZ;
        
        if (typeof pos === 'object' && pos !== null) {
            ({x, y: finalY = 0, z: finalZ = 0} = pos);
        } else {
            x = pos;
            finalY = y ?? 0;
            finalZ = z ?? 0;
        }

        if (![x, finalY, finalZ].every(isFinite)) {
            throw new TypeError(`Invalid position values for node ${this.id}: x=${x}, y=${finalY}, z=${finalZ}`);
        }
        
        this.position.set(x, finalY, finalZ);
    }

    /**
     * Get node position
     * @returns {THREE.Vector3} Position clone
     */
    getPosition() {
        return this.position.clone();
    }

    /**
     * Start dragging the node
     */
    startDrag() {
        this.space?.emit('graph:node:dragstart', {node: this});
    }

    /**
     * Drag the node to a new position
     * @param {Object} newPosition - New position
     */
    drag(newPosition) {
        this.setPosition(newPosition);
    }

    /**
     * End dragging the node
     */
    endDrag() {
        this.space?.emit('graph:node:dragend', {node: this});
    }

    /**
     * Set node data
     * @param {string|Object} key - Data key or object
     * @param {any} value - Data value
     */
    setData(key, value) {
        if (typeof key === 'object' && key !== null) {
            this.data = Utils.mergeDeep({}, this.data, key);
        } else {
            this.data[key] = value;
        }
    }

    /**
     * Get node data
     * @param {string} key - Data key
     * @returns {any} Data value or entire data object
     */
    getData(key) {
        return key ? this.data[key] : this.data;
    }

    /**
     * Toggle pin state
     */
    togglePin() {
        this.isPinned = !this.isPinned;
        this.data.isPinned = this.isPinned;
    }
}
