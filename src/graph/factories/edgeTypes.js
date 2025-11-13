import {Edge} from '../edges/Edge.js';
import {CurvedEdge} from '../edges/CurvedEdge.js';
import {LabeledEdge} from '../edges/LabeledEdge.js';
import {DottedEdge} from '../edges/DottedEdge.js';
import {DynamicThicknessEdge} from '../edges/DynamicThicknessEdge.js';
import {FlowEdge} from '../edges/FlowEdge.js';
import {SpringEdge} from '../edges/SpringEdge.js';
import {BezierEdge} from '../edges/BezierEdge.js';

/**
 * Edge types organized by category
 */
export const edgeTypes = {
    // Core edge types
    core: [
        {name: Edge.typeName, class: Edge},
        {name: CurvedEdge.typeName, class: CurvedEdge},
        {name: LabeledEdge.typeName, class: LabeledEdge},
        {name: DottedEdge.typeName, class: DottedEdge},
        {name: DynamicThicknessEdge.typeName, class: DynamicThicknessEdge}
    ],

    // Advanced edge types
    advanced: [
        {name: FlowEdge.typeName, class: FlowEdge},
        {name: SpringEdge.typeName, class: SpringEdge},
        {name: BezierEdge.typeName, class: BezierEdge}
    ]
};

// Default fallback
export const defaultEdgeType = {name: 'default', class: Edge};