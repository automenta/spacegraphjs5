// Shared constants for graph components
export const GRAPH_CONSTANTS = {
    DEFAULT_NODE_SIZE: 50,
    MIN_NODE_SIZE: 5,
    DEFAULT_LABEL_OFFSET: 10,
    DEFAULT_LOD_DISTANCE_SIMPLE: 700,
    DEFAULT_LOD_DISTANCE_HIDE: 1500,
};

// Shared styles for labels
export const LABEL_STYLES = {
    DEFAULT: {
        color: 'var(--sg-node-text)',
        backgroundColor: 'var(--sg-label-bg, rgba(10, 10, 20, 0.75))',
        fontSize: '14px',
    },
    DATA_NODE: {
        color: 'var(--sg-node-text)',
        backgroundColor: 'var(--sg-label-bg, rgba(10, 10, 20, 0.75))',
        fontSize: '14px',
    },
};

// Shared material properties
export const MATERIAL_PROPERTIES = {
    STANDARD: {
        roughness: 0.7,
        metalness: 0.1,
    },
    CHART: {
        roughness: 0.8,
        metalness: 0.1,
    },
};