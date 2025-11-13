import {BaseFactory} from '../../core/BaseFactory.js';
import {defaultNodeType, nodeTypes} from './nodeTypes.js';

export class NodeFactory extends BaseFactory {
    constructor(space) {
        super();
        this.space = space;
        this.registerCoreNodeTypes();
    }

    registerCoreNodeTypes() {
        for (const {name, class: nodeClass} of Object.values(nodeTypes).flat()) {
            this.registerType(name, nodeClass);
        }

        this.registerType(defaultNodeType.name, defaultNodeType.class);
    }

    createNode(id, type, position, data = {}, mass = 1.0) {
        const effectiveType = data.type ?? type;
        const nodeInstance = this.create(effectiveType, [id, position, data, mass], 'default');
        if (nodeInstance) {
            nodeInstance.space = this.space;
        }
        return nodeInstance;
    }

    createNodeFromConfig(config) {
        const {id, type, position = {x: 0, y: 0, z: 0}, data = {}, mass = 1.0} = config;
        return this.createNode(id, type, position, data, mass);
    }

    getAvailableTypes() {
        return this.getRegisteredTypes();
    }

    hasType(type) {
        return this.hasType(type);
    }
}