import {Plugin} from './Plugin.js';

export class PluginManager {
    space = null;
    plugins = new Map();

    constructor(space) {
        if (!space) {
            throw new TypeError('PluginManager requires a space instance');
        }
        this.space = space;
    }

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

    getPlugin(name) {
        return this.plugins.get(name) ?? undefined;
    }

    getAllPlugins() {
        return [...this.plugins.values()];
    }

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

    updatePlugins() {
        for (const plugin of this.plugins.values()) {
            try {
                plugin.update?.();
            } catch (error) {
                console.error(`Error updating plugin ${plugin.getName()}:`, error);
            }
        }
    }

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

    hasPlugin(name) {
        return this.plugins.has(name);
    }

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

    getPluginCount() {
        return this.plugins.size;
    }

    getPluginNames() {
        return [...this.plugins.keys()];
    }
}
