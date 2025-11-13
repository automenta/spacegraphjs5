export class BaseLayout {
    space = null;
    pluginManager = null;
    nodes = [];

    constructor(config = {}) {
        this.settings = {...this.constructor.defaultSettings, ...config};
    }

    static get defaultSettings() {
        return {
            animate: true,
        };
    }

    setContext(space, pluginManager) {
        this.space = space;
        this.pluginManager = pluginManager;
    }

    updateConfig(newConfig) {
        this.settings = {...this.settings, ...newConfig};
    }

    init(nodes, edges, config = {}) {
        if (Object.keys(config).length > 0) this.updateConfig(config);
        this.nodes = [...nodes];
    }

    // Lifecycle methods to be implemented by subclasses
    run() {
    }

    stop() {
    }

    kick() {
    }

    // Node/edge management methods to be implemented by subclasses
    addNode(_node) {
    }

    removeNode(_node) {
    }

    addEdge(_edge) {
    }

    removeEdge(_edge) {
    }

    dispose() {
        this.nodes = [];
        this.space = null;
        this.pluginManager = null;
    }
}
