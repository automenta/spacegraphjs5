export class BaseFactory {
    constructor() {
        this.types = new Map();
    }

    registerType(typeName, typeClass) {
        if (!typeName || typeof typeName !== 'string') {
            throw new TypeError(`${this.constructor.name}: Invalid typeName provided`);
        }
        if (!typeClass || typeof typeClass !== 'function') {
            throw new TypeError(`${this.constructor.name}: Invalid typeClass provided`);
        }
        this.types.set(typeName, typeClass);
    }

    create(type, args = [], defaultType = null) {
        const TypeClass = this.types.get(type) ?? (defaultType ? this.types.get(defaultType) : null);
        return TypeClass ? new TypeClass(...args) : null;
    }

    hasType(typeName) {
        return this.types.has(typeName);
    }

    getType(typeName) {
        return this.types.get(typeName);
    }

    unregisterType(typeName) {
        return this.types.delete(typeName);
    }

    clearTypes() {
        this.types.clear();
    }

    getRegisteredTypes() {
        return [...this.types.keys()];
    }
}
