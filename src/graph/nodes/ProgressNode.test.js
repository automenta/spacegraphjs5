import {beforeEach, describe, expect, it, vi} from 'vitest';
import {ProgressNode} from './ProgressNode.js';

// Mock HTML and Three.js dependencies
global.document = {
    createElement: vi.fn(tagName => {
        const el = {
            tagName: tagName.toLowerCase(),
            style: {setProperty: vi.fn()},
            classList: {add: vi.fn(), toggle: vi.fn(), remove: vi.fn(), contains: vi.fn()},
            dataset: {},
            addEventListener: vi.fn(),
            appendChild: vi.fn(),
            insertBefore: vi.fn(),
            removeChild: vi.fn(),
            setAttribute: vi.fn(),
            removeAttribute: vi.fn(),
            querySelector: vi.fn(function (selector) {
                if (selector === '.progress-container') return {innerHTML: ''};
                return null;
            }),
            querySelectorAll: vi.fn(() => []),
            innerHTML: '',
        };
        return el;
    }),
};

vi.mock('three/addons/renderers/CSS3DRenderer.js', () => ({
    CSS3DObject: class {
        constructor(element) {
            this.element = element;
            this.position = {copy: vi.fn()};
            this.quaternion = {copy: vi.fn()};
            this.userData = {};
        }
    },
}));

describe('ProgressNode', () => {
    let node;
    let mockSpace;

    beforeEach(() => {
        mockSpace = {emit: vi.fn()};
        const initialData = {
            label: 'Test Progress',
            progressType: 'bar',
            value: 50,
            min: 0,
            max: 100,
            color: '#4CAF50',
            showLabel: true,
        };
        node = new ProgressNode('progress-1', {x: 0, y: 0, z: 0}, initialData);
        node.space = mockSpace;
    });

    it('should create a ProgressNode with correct properties', () => {
        expect(node.id).toBe('progress-1');
        expect(node.position).toEqual({x: 0, y: 0, z: 0});
        expect(node.data.label).toBe('Test Progress');
        expect(node.data.progressType).toBe('bar');
        expect(node.data.value).toBe(50);
    });

    it('should have progress-specific methods', () => {
        expect(typeof node.setValue).toBe('function');
        expect(typeof node.setMin).toBe('function');
        expect(typeof node.setMax).toBe('function');
        expect(typeof node.increment).toBe('function');
        expect(typeof node.decrement).toBe('function');
        expect(typeof node.animateToValue).toBe('function');
    });

    it('should set and get values correctly', () => {
        node.setValue(75);
        expect(node.data.value).toBe(75);
        expect(node._getPercent()).toBe(75);
    });

    it('should handle value range correctly with setMin/setMax', () => {
        node.setMin(0);
        node.setMax(200);
        node.setValue(150);
        expect(node.data.value).toBe(150);
        expect(node._getPercent()).toBe(75);
    });

    it('should clamp values to min/max range on setValue', () => {
        node.setValue(-10);
        expect(node.data.value).toBe(node.data.min);

        node.setValue(150);
        expect(node.data.value).toBe(node.data.max);
    });

    it('should support different progress types via data.progressType', () => {
        const circleNode = new ProgressNode(
            'circle',
            {x: 0, y: 0, z: 0},
            {progressType: 'circular'}
        );
        expect(circleNode.data.progressType).toBe('circular');

        const gaugeNode = new ProgressNode('gauge', {x: 0, y: 0, z: 0}, {progressType: 'gauge'});
        expect(gaugeNode.data.progressType).toBe('gauge');
    });

    it('should store color in data (no direct setColor method)', () => {
        expect(node.data.color).toBe('#4CAF50');
    });

    it('should emit dataChanged event when value changes', () => {
        node.setValue(80);
        expect(mockSpace.emit).toHaveBeenCalledWith('graph:node:dataChanged', {
            node: node,
            property: 'value',
            value: 80,
        });
    });
});
