import * as THREE from 'three';
import {Utils} from '../../utils.js';
import {GRAPH_CONSTANTS} from '../constants.js';

export class Node {
    space = null;
    position = new THREE.Vector3();
    data = {};
    mass = 1.0;
    id = null;
    mesh = null;
    cssObject = null;
    labelObject = null;
    isPinned = false;

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

    getDefaultData() {
        return {label: ''};
    }

    update(_space) {}

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

    getBoundingSphereRadius() {
        return GRAPH_CONSTANTS.DEFAULT_NODE_SIZE;
    }

    setSelectedStyle(_selected) {}

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

    getPosition() {
        return this.position.clone();
    }

    startDrag() {
        this.space?.emit('graph:node:dragstart', {node: this});
    }

    drag(newPosition) {
        this.setPosition(newPosition);
    }

    endDrag() {
        this.space?.emit('graph:node:dragend', {node: this});
    }

    setData(key, value) {
        if (typeof key === 'object' && key !== null) {
            this.data = Utils.mergeDeep({}, this.data, key);
        } else {
            this.data[key] = value;
        }
    }

    getData(key) {
        return key ? this.data[key] : this.data;
    }

    togglePin() {
        this.isPinned = !this.isPinned;
        this.data.isPinned = this.isPinned;
    }
}
