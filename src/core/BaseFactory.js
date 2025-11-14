export class BaseFactory {
    constructor() {
        this.types = new Map();
    }

    /**
     * Register a type with the factory
     * @param {string} typeName - The name of the type
     * @param {Function} typeClass - The class constructor
     */
    registerType(typeName, typeClass) {
        if (!typeName || typeof typeName !== 'string') {
            throw new TypeError(`${this.constructor.name}: Invalid typeName provided`);
        }
        if (!typeClass || typeof typeClass !== 'function') {
            throw new TypeError(`${this.constructor.name}: Invalid typeClass provided`);
        }
        this.types.set(typeName, typeClass);
    }

    /**
     * Create an instance of a registered type
     * @param {string} type - The type name to create
     * @param {Array} args - Arguments to pass to the constructor
     * @param {string|null} defaultType - Default type to use if primary type not found
     * @returns {Object|null} Created instance or null if not found
     */
    create(type, args = [], defaultType = null) {
        const TypeClass = this.types.get(type) ?? (defaultType ? this.types.get(defaultType) : null);
        return TypeClass ? new TypeClass(...args) : null;
    }

    /**
     * Check if a type is registered
     * @param {string} typeName - The type name to check
     * @returns {boolean} True if registered
     */
    hasType(typeName) {
        return this.types.has(typeName);
    }

    /**
     * Get a registered type class
     * @param {string} typeName - The type name to get
     * @returns {Function|undefined} The class constructor or undefined
     */
    getType(typeName) {
        return this.types.get(typeName);
    }

    /**
     * Unregister a type
     * @param {string} typeName - The type name to unregister
     * @returns {boolean} True if successfully unregistered
     */
    unregisterType(typeName) {
        return this.types.delete(typeName);
    }

    /**
     * Clear all registered types
     */
    clearTypes() {
        this.types.clear();
    }

    /**
     * Get all registered type names
     * @returns {string[]} Array of registered type names
     */
    getRegisteredTypes() {
        return [...this.types.keys()];
    }
}
