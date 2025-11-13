import {beforeEach, describe, expect, it, vi} from 'vitest';
import {FlowEdge} from './FlowEdge.js';

// Mock Three.js module
vi.mock('three', async importOriginal => {
    const actualThree = await importOriginal(); // Import to allow spreading other exports
    return {
        ...actualThree,
        BufferGeometry: class {
            constructor() {
                this.setAttribute = vi.fn();
                this.dispose = vi.fn();
            }
        },
        BufferAttribute: class {
            constructor() {
                // Mock implementation
            }
        },
        ShaderMaterial: class {
            constructor() {
                this.dispose = vi.fn();
                this.uniforms = {time: {value: 0}, glowIntensity: {value: 0}};
            }
        },
        Points: class {
            constructor() {
                this.position = {copy: vi.fn()};
                this.lookAt = vi.fn();
                this.geometry = {
                    attributes: {
                        position: {array: [], needsUpdate: false},
                        size: {array: [], needsUpdate: false},
                        color: {array: [], needsUpdate: false},
                    },
                    dispose: vi.fn(),
                };
                this.material = {uniforms: {time: {value: 0}, glowIntensity: {value: 0}}, dispose: vi.fn()};
                this.parent = {remove: vi.fn()};
                this.userData = {};
            }
        },
        Vector3: class {
            constructor(x = 0, y = 0, z = 0) {
                this.x = x;
                this.y = y;
                this.z = z;
                this.copy = vi.fn().mockReturnThis();
                this.lerp = vi.fn().mockReturnThis();
                this.lerpVectors = vi.fn().mockReturnThis();
                this.distanceTo = vi.fn(() => 5);
            }
        },
        Color: class {
            constructor(r = 0, g = 1, b = 0) {
                this.r = r;
                this.g = g;
                this.b = b;
            }
        },
        AdditiveBlending: 'AdditiveBlendingConstant', // Mock constant
    };
});

describe('FlowEdge', () => {
    let edge;
    let sourceNode;
    let targetNode;

    beforeEach(() => {
        sourceNode = {
            id: 'source',
            position: {x: 0, y: 0, z: 0},
            getWorldPosition: vi.fn(() => ({x: 0, y: 0, z: 0})),
        };

        targetNode = {
            id: 'target',
            position: {x: 10, y: 0, z: 0},
            getWorldPosition: vi.fn(() => ({x: 10, y: 0, z: 0})),
        };

        edge = new FlowEdge('flow-edge-1', sourceNode, targetNode, {
            particleSpeed: 2.0,
            particleCount: 20,
            particleSize: 0.1,
            flowColor: 0x00ff00,
            bidirectional: false,
        });
    });

    it('should create a FlowEdge with correct properties', () => {
        expect(edge.id).toBe('flow-edge-1');
        expect(edge.source).toBe(sourceNode);
        expect(edge.target).toBe(targetNode);
        expect(edge.particleSpeed).toBe(2.0);
        expect(edge.data.particleSpeed).toBe(2.0);
        expect(edge.particleCount).toBe(20);
        expect(edge.data.particleCount).toBe(20);
    });

    it('should initialize particle system', () => {
        expect(edge.particles).toBeDefined();
        expect(edge.particles.length).toBe(20);
    });

    it('should have animation control methods', () => {
        expect(typeof edge.setAnimated).toBe('function');
        expect(typeof edge.setParticleSpeed).toBe('function');
    });

    it('should control animation state correctly via setAnimated', () => {
        expect(edge.data.animated).toBe(true);
        expect(edge.animationFrame).not.toBeNull();

        edge.setAnimated(false);
        expect(edge.data.animated).toBe(false);
        expect(edge.animationFrame).toBeNull();

        edge.setAnimated(true);
        expect(edge.data.animated).toBe(true);
        expect(edge.animationFrame).not.toBeNull();
    });

    it('should update particle speed', () => {
        edge.setParticleSpeed(5.0);
        expect(edge.particleSpeed).toBe(5.0);
        expect(edge.data.particleSpeed).toBe(5.0);
    });

    it('should handle bidirectional flow via flowDirection in data', () => {
        const biFlowEdge = new FlowEdge('bi-flow', sourceNode, targetNode, {flowDirection: 0});
        expect(biFlowEdge.flowDirection).toBe(0);
        expect(biFlowEdge.data.flowDirection).toBe(0);

        const forwardFlowEdge = new FlowEdge('forward-flow', sourceNode, targetNode, {
            flowDirection: 1,
        });
        expect(forwardFlowEdge.flowDirection).toBe(1);

        const backwardFlowEdge = new FlowEdge('backward-flow', sourceNode, targetNode, {
            flowDirection: -1,
        });
        expect(backwardFlowEdge.flowDirection).toBe(-1);
    });

    it('should call _updateParticles when edge public update is called', () => {
        const updateInternalSpy = vi.spyOn(edge, '_updateParticles');
        edge.update();
        expect(updateInternalSpy).toHaveBeenCalled();
        updateInternalSpy.mockRestore();
    });

    it('should have correct flowDirection property access and modification', () => {
        expect(edge.flowDirection).toBe(1);

        edge.setFlowDirection(-1);
        expect(edge.flowDirection).toBe(-1);
        expect(edge.data.flowDirection).toBe(-1);
    });

    it('should have particles with progress property', () => {
        expect(edge.particles.length).toBeGreaterThan(0);
        const particle = edge.particles[0];
        expect(particle).toHaveProperty('progress');
        expect(particle.progress).toBeGreaterThanOrEqual(0);
    });

    it('particle progress should change after animation updates', () => {
        const initialProgress = edge.particles[0].progress;

        edge.setAnimated(true);
        edge._updateParticles();
        edge._updateParticles();

        expect(edge.particles[0].progress).not.toBe(initialProgress);
    });
});
