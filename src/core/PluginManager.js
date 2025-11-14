import {Plugin} from './Plugin.js';

/**
 * Manages plugins for the SpaceGraph system
 */
export class PluginManager {
    space = null;
    plugins = new Map();

    /**
     * Create a new PluginManager
     * @param {SpaceGraph} space - The SpaceGraph instance
     */
    constructor(space) {
        if (!space) {
            throw new TypeError('PluginManager requires a space instance');
        }
        this.space = space;
    }

    /**
     * Add a plugin to the manager
     * @param {Plugin} plugin - The plugin to add
     */
    add(plugin) {
        if (!(plugin instanceof Plugin)) {
            throw new TypeError('PluginManager: Attempted to add an object that is not an instance of Plugin.');
        }

        const pluginName = plugin.getName();
        if (this.plugins.has(pluginName)) {
            console.warn(`PluginManager: Plugin "${pluginName}" already registered. Overwriting.`);
        }
        this.plugins.set(pluginName, plugin);
    }

    /**
     * Get a plugin by name
     * @param {string} name - The plugin name
     * @returns {Plugin|undefined} The plugin or undefined
     */
    getPlugin(name) {
        return this.plugins.get(name) ?? undefined;
    }

    /**
     * Get all registered plugins
     * @returns {Plugin[]} Array of plugins
     */
    getAllPlugins() {
        return [...this.plugins.values()];
    }

    /**
     * Initialize all registered plugins
     * @returns {Promise<void>} Promise that resolves when all plugins are initialized
     */
    async initPlugins() {
        const pluginInitPromises = [...this.plugins.values()]
            .map(async plugin => {
                try {
                    await plugin.init?.();
                    return {plugin, success: true};
                } catch (error) {
                    console.error(`Failed to initialize plugin ${plugin.getName()}:`, error);
                    return {plugin, success: false, error};
                }
            });

        const results = await Promise.all(pluginInitPromises);
        const failedPlugins = results.filter(result => !result.success);
        
        if (failedPlugins.length > 0) {
            throw new Error(`Failed to initialize ${failedPlugins.length} plugin(s): ${failedPlugins.map(p => p.plugin.getName()).join(', ')}`);
        }
    }

    /**
     * Update all registered plugins
     */
    updatePlugins() {
        for (const plugin of this.plugins.values()) {
            try {
                plugin.update?.();
            } catch (error) {
                console.error(`Error updating plugin ${plugin.getName()}:`, error);
            }
        }
    }

    /**
     * Dispose all registered plugins
     */
    disposePlugins() {
        for (const plugin of this.plugins.values()) {
            try {
                plugin.dispose?.();
            } catch (error) {
                console.error(`Error disposing plugin ${plugin.getName()}:`, error);
            }
        }
        this.plugins.clear();
    }

    /**
     * Check if a plugin is registered
     * @param {string} name - The plugin name
     * @returns {boolean} True if registered
     */
    hasPlugin(name) {
        return this.plugins.has(name);
    }

    /**
     * Remove a plugin by name
     * @param {string} name - The plugin name
     * @returns {boolean} True if successfully removed
     */
    removePlugin(name) {
        const plugin = this.plugins.get(name);
        if (plugin) {
            try {
                plugin.dispose?.();
            } catch (error) {
                console.error(`Error disposing removed plugin ${name}:`, error);
            }
            this.plugins.delete(name);
            return true;
        }
        return false;
    }

    /**
     * Get the number of registered plugins
     * @returns {number} Plugin count
     */
    getPluginCount() {
        return this.plugins.size;
    }

    /**
     * Get all registered plugin names
     * @returns {string[]} Array of plugin names
     */
    getPluginNames() {
        return [...this.plugins.keys()];
    }
}
