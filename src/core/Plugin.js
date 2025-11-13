export class Plugin {
    space = null;
    pluginManager = null;
    _initialized = false;
    _disposed = false;

    constructor(spaceGraphInstance, pluginManagerInstance) {
        if (!spaceGraphInstance) {
            throw new TypeError('Plugin requires a valid spaceGraphInstance');
        }
        if (!pluginManagerInstance) {
            throw new TypeError('Plugin requires a valid pluginManagerInstance');
        }
        
        this.space = spaceGraphInstance;
        this.pluginManager = pluginManagerInstance;
    }

    async init() {
        if (this._initialized) {
            console.warn(`${this.getName()}: Plugin already initialized`);
            return;
        }
        
        try {
            await this._init();
            this._initialized = true;
        } catch (error) {
            console.error(`${this.getName()} initialization failed:`, error);
            throw new Error(`Plugin initialization failed: ${this.getName()}`);
        }
    }

    async _init() {
        // Override in subclasses
    }

    update(deltaTime = 0) {
        if (!this._initialized || this._disposed) return;
        
        try {
            this._update(deltaTime);
        } catch (error) {
            console.error(`${this.getName()} update failed:`, error);
        }
    }

    _update(deltaTime) {
        // Override in subclasses
    }

    dispose() {
        if (this._disposed) return;
        
        try {
            this._dispose();
            this.space = null;
            this.pluginManager = null;
            this._disposed = true;
            this._initialized = false;
        } catch (error) {
            console.error(`${this.getName()} disposal failed:`, error);
        }
    }

    _dispose() {
        // Override in subclasses
    }

    getName() {
        return this.constructor.name;
    }

    isInitialized() {
        return this._initialized;
    }

    isDisposed() {
        return this._disposed;
    }
}
