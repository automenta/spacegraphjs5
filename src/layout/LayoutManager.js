import {gsap} from 'gsap';

export class LayoutManager {
    constructor(space, pluginManager) {
        this.space = space;
        this.pluginManager = pluginManager;
        this.layouts = new Map();
        this.activeLayout = null;
        this.activeLayoutName = null;
    }

    registerLayout(name, layoutInstance) {
        if (this.layouts.has(name)) {
            console.warn(`LayoutManager: Layout "${name}" already registered. Overwriting.`);
        }
        layoutInstance.setContext?.(this.space, this.pluginManager);
        this.layouts.set(name, layoutInstance);
    }

    async applyLayout(name, config = {}) {
        const newLayout = this.layouts.get(name);
        if (!newLayout) {
            console.error(`LayoutManager: Layout "${name}" not found.`);
            return false;
        }

        // Stop current layout if exists
        if (this.activeLayout) {
            this.activeLayout.stop?.();
            this.space.emit('layout:stopped', {
                name: this.activeLayoutName,
                layout: this.activeLayout
            });
        }

        // Set new active layout
        this.activeLayout = newLayout;
        this.activeLayoutName = name;

        // Update configuration
        this.activeLayout.updateConfig?.(config);

        // Get nodes and edges from plugins
        const nodePlugin = this.pluginManager.getPlugin('NodePlugin');
        const edgePlugin = this.pluginManager.getPlugin('EdgePlugin');

        const nodes = nodePlugin ? [...nodePlugin.getNodes().values()] : [];
        const edges = edgePlugin ? [...edgePlugin.getEdges().values()] : [];

        // Initialize layout with animation
        if (this.activeLayout.init) {
            const oldPositions = new Map(nodes.map(node => [node.id, node.position.clone()]));
            await this.activeLayout.init(nodes, edges, config);

            // Animate position transitions
            await Promise.all(
                nodes.map(node => {
                    const currentPos = oldPositions.get(node.id);
                    const targetPos = node.position;

                    node.position.copy(currentPos);

                    return new Promise(resolve => {
                        gsap.to(node.position, {
                            x: targetPos.x,
                            y: targetPos.y,
                            z: targetPos.z,
                            duration: 0.7,
                            ease: 'power2.inOut',
                            overwrite: true,
                            onComplete: resolve,
                        });
                    });
                })
            );
        }

        // Run the layout
        if (this.activeLayout.run) {
            this.space.emit('layout:started', {name: this.activeLayoutName, layout: this.activeLayout});
            await this.activeLayout.run();
        }
        return true;
    }

    stopLayout() {
        if (this.activeLayout) {
            this.activeLayout.stop?.();
            this.space.emit('layout:stopped', {
                name: this.activeLayoutName,
                layout: this.activeLayout
            });
        }
    }

    update() {
        this.activeLayout?.update?.();
    }

    // Node/edge management
    addNodeToLayout(node) {
        this.activeLayout?.addNode?.(node);
    }

    removeNodeFromLayout(node) {
        this.activeLayout?.removeNode?.(node);
    }

    addEdgeToLayout(edge) {
        this.activeLayout?.addEdge?.(edge);
    }

    removeEdgeFromLayout(edge) {
        this.activeLayout?.removeEdge?.(edge);
    }

    kick() {
        this.activeLayout?.kick?.();
    }

    // Getters
    getActiveLayout() {
        return this.activeLayout;
    }

    getActiveLayoutName() {
        return this.activeLayoutName;
    }

    dispose() {
        this.stopLayout();
        this.layouts.forEach(layout => layout.dispose?.());
        this.layouts.clear();
        this.activeLayout = null;
        this.activeLayoutName = null;
        this.space = null;
        this.pluginManager = null;
    }
}
