import {BaseFactory} from '../../core/BaseFactory.js';
import {defaultNodeType, nodeTypes} from './nodeTypes.js';

/**
 * Factory for creating node instances with improved organization
 */
export class NodeFactory extends BaseFactory {
    constructor(space) {
        super();
        this.space = space;
        this.registerCoreNodeTypes();
    }

    /**
     * Registers all core node types from the categorized configuration
     */
    registerCoreNodeTypes() {
        // Register all categorized node types
        Object.values(nodeTypes).flat().forEach(({name, class: nodeClass}) => {
            this.registerType(name, nodeClass);
        });

        // Register default fallback
        this.registerType(defaultNodeType.name, defaultNodeType.class);
    }

    /**
     * Creates a new node instance of a given type.
     * @param {string} id - The unique ID for the node.
     * @param {string} type - The typeName of the node to create.
     * @param {object} position - An object with x, y, z coordinates.
     * @param {object} [data={}] - Custom data for the node.
     * @param {number} [mass=1.0] - The mass of the node.
     * @returns {Node|null} The created node instance, or null if the type is not found.
     */
    createNode(id, type, position, data = {}, mass = 1.0) {
        const effectiveType = data.type ?? type;
        const nodeInstance = this.create(effectiveType, [id, position, data, mass], 'default');
        if (nodeInstance) {
            nodeInstance.space = this.space;
        }
        return nodeInstance;
    }
}