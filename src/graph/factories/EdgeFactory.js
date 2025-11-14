import {BaseFactory} from '../../core/BaseFactory.js';
import {defaultEdgeType, edgeTypes} from './edgeTypes.js';

/**
 * Factory for creating edge instances with improved organization
 */
export class EdgeFactory extends BaseFactory {
    /** @type {SpaceGraph} SpaceGraph instance */
    space = null;

    /**
     * Create a new EdgeFactory
     * @param {SpaceGraph} space - SpaceGraph instance
     */
    constructor(space) {
        super();
        this.space = space;
        this.registerCoreEdgeTypes();
    }

    /**
     * Registers all core edge types from the categorized configuration
     */
    registerCoreEdgeTypes() {
        // Register all categorized edge types
        for (const {name, class: edgeClass} of Object.values(edgeTypes).flat()) {
            this.registerType(name, edgeClass);
        }

        // Register default fallback
        this.registerType(defaultEdgeType.name, defaultEdgeType.class);
    }

    /**
     * Creates a new edge instance of a given type.
     * @param {string} id - The unique ID for the edge.
     * @param {string} type - The typeName of the edge to create.
     * @param {Node} sourceNode - The source node instance.
     * @param {Node} targetNode - The target node instance.
     * @param {object} [data={}] - Custom data for the edge.
     * @returns {Edge|null} The created edge instance, or null if the type is not found.
     */
    createEdge(id, type, sourceNode, targetNode, data = {}) {
        const effectiveType = data.type ?? type;
        const edgeInstance = this.create(effectiveType, [id, sourceNode, targetNode, data], 'default');
        if (edgeInstance) {
            edgeInstance.space = this.space;
        }
        return edgeInstance;
    }
}