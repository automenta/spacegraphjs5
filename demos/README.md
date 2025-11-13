# SpaceGraphJS Demo Utilities

This directory contains HTML demos that illustrate the usage of SpaceGraphJS. To reduce boilerplate code and improve
consistency across demos, we provide the following utility functions:

## Available Utilities

### `createDefaultUIElements()`

Creates default UI elements commonly needed. (Note: This is now superseded by the new SpaceGraph.the() method in all
demos.)

### `createNode(space, nodeData, commonProps = {})`

Creates a node with common properties merged with specific node data, avoiding repetition of common properties like
mass.

```javascript
import {createNode} from './demoUtils.js';

const node = createNode(space, {
    id: 'my-node',
    type: 'shape',
    position: {x: 0, y: 0, z: 0},
    data: {label: 'My Node', shape: 'sphere', size: 50}
}, { mass: 1.0 });
```

### `createMultipleNodes(space, nodeConfigs, commonProps = {})`

Efficiently creates multiple nodes from an array of configurations.

```javascript
const nodes = createMultipleNodes(space, [
    {id: 'node1', type: 'shape', position: {x: -100, y: 0, z: 0}, data: {label: 'Node 1'}},
    {id: 'node2', type: 'shape', position: {x: 100, y: 0, z: 0}, data: {label: 'Node 2'}}
], {mass: 1.0});
```

### `createEdge(space, source, target, edgeData = {}, defaultEdgeProps = {})`

Helper to create edges with default styling.

```javascript
const edge = createEdge(space, node1, node2, {label: 'My Edge'}, {color: 0x888888, thickness: 2});
```

### `createDemoLayout(title, infoTitle, infoContent)`

Creates a standard page layout for demos with consistent styling.

### `initDemo(demoInitFn, title, infoTitle, infoContent, options = {})`

Common initialization pattern that combines layout creation with SpaceGraph initialization.

## Usage

Each demo HTML file can import these utilities to reduce boilerplate code while keeping the main functionality clear and
illustrative.

## Guidelines

- The ideal API would be `SpaceGraph.the(container)` as an async factory method (this should be added to the core
  library)
- Use `createDefaultUIElements()` when you need the standard UI elements (context menu, confirm dialog) with manual
  setup
- Show the full API usage for SpaceGraph initialization when demonstrating the underlying mechanics
- Use `createNode()` when you have common properties to apply to multiple nodes
- Use the utilities to reduce repetition while maintaining clarity of the core concepts being demonstrated
- The basic-demo.html shows the ideal API that should be implemented in the core library