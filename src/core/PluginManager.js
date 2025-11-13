import {Plugin} from './Plugin.js';

export class PluginManager {
    space = null;
    plugins = new Map();

    constructor(space) {
        this.space = space;
    }

    add(plugin) {
        if (!(plugin instanceof Plugin)) {
            throw new TypeError('PluginManager: Attempted to add an object that is not an instance of Plugin.');
        }

        this.plugins.has(plugin.getName()) && console.warn(`PluginManager: Plugin "${plugin.getName()}" already registered. Overwriting.`);
        this.plugins.set(plugin.getName(), plugin);
    }

    getPlugin(name) {
        return this.plugins.get(name);
    }

    getAllPlugins() {
        return Array.from(this.plugins.values());
    }

    async initPlugins() {
        await Promise.all([...this.plugins.values()].map(plugin => plugin.init?.()));
    }

    updatePlugins() {
        this.plugins.forEach(plugin => plugin.update?.());
    }

    disposePlugins() {
        this.plugins.forEach(plugin => plugin.dispose?.());
        this.plugins.clear();
    }
}
