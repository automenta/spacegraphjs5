import {Plugin} from './Plugin.js';

export class PluginManager {
    space = null;
    plugins = new Map();

    constructor(space) {
        this.space = space;
    }

    /**
     * Adds a plugin to the manager.
     * @param {Plugin} plugin The plugin instance to add.
     */
    add(plugin) {
        if (!(plugin instanceof Plugin)) {
            throw new Error('PluginManager: Attempted to add an object that is not an instance of Plugin.');
        }

        if (this.plugins.has(plugin.getName())) {
            console.warn(`PluginManager: Plugin "${plugin.getName()}" already registered. Overwriting.`);
        }

        this.plugins.set(plugin.getName(), plugin);
    }

    /**
     * Retrieves a plugin by its name.
     * @param {string} name The name of the plugin.
     * @returns {Plugin|undefined} The plugin instance, or undefined if not found.
     */
    getPlugin(name) {
        return this.plugins.get(name);
    }

    /**
     * Retrieves all registered plugins as an array.
     * @returns {Plugin[]} An array of all plugin instances.
     */
    getAllPlugins() {
        return Array.from(this.plugins.values());
    }

    /**
     * Initializes all registered plugins by calling their init() method.
     * Plugins are initialized in the order they were added.
     */
    async initPlugins() {
        for (const plugin of this.plugins.values()) {
            await plugin.init?.();
        }
    }

    /**
     * Updates all registered plugins by calling their update() method.
     * This is typically called once per animation frame.
     */
    updatePlugins() {
        for (const plugin of this.plugins.values()) {
            plugin.update?.();
        }
    }

    /**
     * Disposes of all registered plugins by calling their dispose() method
     * and clears the plugin map.
     */
    disposePlugins() {
        for (const plugin of this.plugins.values()) {
            plugin.dispose?.();
        }
        this.plugins.clear();
    }
}
