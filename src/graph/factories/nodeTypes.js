import {HtmlNode} from '../nodes/HtmlNode.js';
import {ShapeNode} from '../nodes/ShapeNode.js';
import {ImageNode} from '../nodes/ImageNode.js';
import {VideoNode} from '../nodes/VideoNode.js';
import {IFrameNode} from '../nodes/IFrameNode.js';
import {GroupNode} from '../nodes/GroupNode.js';
import {DataNode} from '../nodes/DataNode.js';
import {NoteNode} from '../nodes/NoteNode.js';
import {AudioNode} from '../nodes/AudioNode.js';
import {DocumentNode} from '../nodes/DocumentNode.js';
import {ChartNode} from '../nodes/ChartNode.js';
import {ControlPanelNode} from '../nodes/ControlPanelNode.js';
import {ProgressNode} from '../nodes/ProgressNode.js';
import {CanvasNode} from '../nodes/CanvasNode.js';
import {ProceduralShapeNode} from '../nodes/ProceduralShapeNode.js';
import {TextMeshNode} from '../nodes/TextMeshNode.js';
import {MetaWidgetNode} from '../nodes/MetaWidgetNode.js';

/**
 * Core node types organized by category
 */
export const nodeTypes = {
    // Core nodes
    core: [
        {name: HtmlNode.typeName, class: HtmlNode},
        {name: ShapeNode.typeName, class: ShapeNode},
        {name: ImageNode.typeName, class: ImageNode},
        {name: VideoNode.typeName, class: VideoNode},
        {name: IFrameNode.typeName, class: IFrameNode},
        {name: GroupNode.typeName, class: GroupNode},
        {name: DataNode.typeName, class: DataNode},
        {name: NoteNode.typeName, class: NoteNode}
    ],

    // Media nodes
    media: [
        {name: AudioNode.typeName, class: AudioNode},
        {name: DocumentNode.typeName, class: DocumentNode},
        {name: ChartNode.typeName, class: ChartNode}
    ],

    // Advanced widget nodes
    widgets: [
        {name: ControlPanelNode.typeName, class: ControlPanelNode},
        {name: ProgressNode.typeName, class: ProgressNode},
        {name: CanvasNode.typeName, class: CanvasNode}
    ],

    // Advanced shape nodes
    shapes: [
        {name: ProceduralShapeNode.typeName, class: ProceduralShapeNode},
        {name: TextMeshNode.typeName, class: TextMeshNode}
    ],

    // MetaWidget system
    meta: [
        {name: MetaWidgetNode.typeName, class: MetaWidgetNode}
    ]
};

// Default fallback
export const defaultNodeType = {name: 'default', class: ShapeNode};