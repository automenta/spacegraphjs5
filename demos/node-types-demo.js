import { DemoApp } from './lib/DemoApp.js';

class NodeTypesDemo extends DemoApp {
    constructor() {
        super({ title: 'Node Types Demo' });
    }

    async init() {
        const space = await super.init();
        this.createGraph(space);
        return space;
    }

    createGraph(space) {
        const commonProps = {mass: 1.0};
        let yPos = -200;
        const yIncrement = 180;

        const create = (data) => space.createNode({ ...commonProps, ...data });

        const shapeNodeBox = create({
            id: 'shapeBox',
            type: 'shape',
            position: {x: -300, y: yPos, z: 0},
            data: {label: 'Box (ShapeNode)', shape: 'box', size: 80, color: 0xffaa00},
        });

        const shapeNodeSphere = create({
            id: 'shapeSphere',
            type: 'shape',
            position: {x: -100, y: yPos, z: 0},
            data: {label: 'Sphere (ShapeNode)', shape: 'sphere', size: 50, color: 0x00aaff},
        });

        const shapeNodeCapsule = create({
            id: 'shapeCapsule',
            type: 'shape',
            position: {x: 100, y: yPos, z: 0},
            data: {
                label: 'Capsule (ShapeNode)',
                shape: 'capsule',
                size: {radius: 30, height: 80},
                color: 0x00ffaa,
            },
        });

        yPos += yIncrement;
        const noteNode = create({
            id: 'noteNode',
            type: 'note',
            position: {x: -200, y: yPos, z: 0},
            data: {
                label: 'NoteNode (HTML)',
                content: '<h3>HTML Content</h3><p>This is a <code>NoteNode</code>.</p>',
                width: 250, height: 120, backgroundColor: '#334455',
            },
        });

        yPos += yIncrement;
        const imageNode = create({
            id: 'imageNode',
            type: 'image',
            position: {x: -200, y: yPos, z: 0},
            data: {
                label: 'ImageNode',
                imageUrl: 'https://placehold.co/200x150/FFAA00/000000?text=Image+Node',
                size: 150,
            },
        });

        yPos += yIncrement + 50;
        const videoNode = create({
            id: 'videoNode',
            type: 'video',
            position: {x: -200, y: yPos, z: 0},
            data: {
                label: 'VideoNode',
                videoUrl: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4',
                videoType: 'video/mp4',
                width: 240, height: 135, autoplay: true, muted: true, loop: true,
            },
        });

        yPos = -200;
        const xPosCol2 = 300;

        const iframeNode = create({
            id: 'iframeNode',
            type: 'iframe',
            position: {x: xPosCol2, y: yPos, z: 0},
            data: {label: 'IFrameNode', iframeUrl: 'https://example.com', width: 300, height: 200},
        });

        yPos += yIncrement + 80;

        const groupChild1 = space.createNode({
            id: 'gc1', type: 'html',
            position: {x: xPosCol2 - 50, y: yPos + 50, z: 0},
            data: { label: 'Child A', content: 'Child A', width: 100, height: 50, backgroundColor: '#556677' },
            mass: 0.5,
        });
        const groupChild2 = space.createNode({
            id: 'gc2', type: 'shape',
            position: {x: xPosCol2 + 50, y: yPos - 20, z: 10},
            data: {label: 'Child B', shape: 'sphere', size: 30, color: 0xcc66ff},
            mass: 0.5,
        });

        if (groupChild1 && groupChild2) {
            const groupNode = create({
                id: 'groupNode', type: 'group',
                position: {x: xPosCol2, y: yPos, z: 0},
                data: {
                    label: 'GroupNode',
                    children: [groupChild1.id, groupChild2.id],
                    backgroundColor: 'rgba(60,80,100,0.3)',
                    borderColor: 'rgba(150,180,220,0.7)',
                    headerColor: 'rgba(40,60,80,0.5)',
                },
            });
            space.addEdge(groupChild1, groupChild2, {label: 'Internal', color: 0xaaaaaa, thickness: 1});
            if (iframeNode) space.addEdge(iframeNode, groupNode);
        }

        if (noteNode && imageNode) space.addEdge(noteNode, imageNode, {label: 'related'});
        if (shapeNodeBox && noteNode) space.addEdge(shapeNodeBox, noteNode);
    }
}

const run = async () => {
    const app = new NodeTypesDemo();
    await app.init();
};
run();
