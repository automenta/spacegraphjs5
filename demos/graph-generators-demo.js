import { DemoApp } from './lib/DemoApp.js';
import { FileSystemGenerator, ObjectPropertyGenerator } from '../src/index.js';

class GraphGeneratorsDemo extends DemoApp {
    constructor() {
        super({ title: 'Graph Generators Demo' });
    }

    async init() {
        const space = await super.init();
        this.createGraph(space);
        return space;
    }

    createGraph(space) {
        // 1. FileSystemGenerator
        const fsData = {
            name: 'ProjectRoot', type: 'directory',
            children: [
                {
                    name: 'src', type: 'directory',
                    children: [
                        {name: 'index.js', type: 'file', size: 1500},
                        {name: 'utils.js', type: 'file', size: 800},
                        { name: 'components', type: 'directory', children: [{name: 'Button.js', type:'file'}, {name:'Card.js', type:'file'}] }
                    ],
                },
                { name: 'docs', type: 'directory', children: [{name: 'README.md', type: 'file'}] },
                {name: 'package.json', type: 'file'},
            ],
        };
        const fsGenerator = new FileSystemGenerator();
        fsGenerator.generate(fsData, space, {rootPosition: {x: -300, y: 200, z: 0}});

        // 2. ObjectPropertyGenerator
        const complexObject = {
            id: 'user123', name: 'Alice',
            email: 'alice@example.com',
            preferences: { theme: 'dark', notifications: { email: true } },
            friends: [{id: 'user456', name: 'Bob'}]
        };
        const objGenerator = new ObjectPropertyGenerator();
        objGenerator.generate(complexObject, space, {
            rootPosition: {x: 300, y: 200, z: -50},
            maxDepth: 4,
        });

        setTimeout(() => {
            space.plugins.getPlugin('LayoutPlugin')?.applyLayout('force', {repulsion: 4000, centerStrength: 0.001});
        }, 500);
    }
}

const run = async () => {
    const app = new GraphGeneratorsDemo();
    await app.init();
};
run();
