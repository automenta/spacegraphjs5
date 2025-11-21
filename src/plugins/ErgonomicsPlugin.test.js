import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErgonomicsPlugin } from './ErgonomicsPlugin.js';
import * as THREE from 'three';

describe('ErgonomicsPlugin', () => {
    let plugin;
    let mockSpace;
    let mockPluginManager;

    beforeEach(() => {
        mockPluginManager = {
            getPlugin: vi.fn()
        };

        mockSpace = {
            on: vi.fn(),
            off: vi.fn(),
            container: document.createElement('div'),
            plugins: mockPluginManager
        };

        plugin = new ErgonomicsPlugin(mockSpace, mockPluginManager);
    });

    it('should initialize correctly', () => {
        plugin.init();
        expect(mockSpace.on).toHaveBeenCalledWith('camera:changed', expect.any(Function));
        expect(mockSpace.on).toHaveBeenCalledWith('graph:changed', expect.any(Function));
        expect(plugin.overlay).toBeDefined();
    });

    it('should have autotune method', () => {
        expect(typeof plugin.autotune).toBe('function');
    });

    it('should calculate metrics (mocked)', () => {
        const mockCam = {
            position: new THREE.Vector3(0, 0, 1000),
            projectionMatrix: new THREE.Matrix4(),
            matrixWorldInverse: new THREE.Matrix4(),
            fov: 50
        };

        const mockNodePlugin = {
            getNodes: () => new Map([
                ['1', {
                    position: new THREE.Vector3(0,0,0),
                    mesh: new THREE.Mesh(),
                    getBoundingSphereRadius: () => 10
                }]
            ])
        };

        const mockControls = {
            zoomSpeed: 1.0,
            panSpeed: 0.8,
            dampingFactor: 0.1
        };

        mockPluginManager.getPlugin.mockImplementation((name) => {
            if (name === 'CameraPlugin') return {
                getCameraInstance: () => mockCam,
                getControls: () => mockControls
            };
            if (name === 'NodePlugin') return mockNodePlugin;
            return null;
        });

        plugin._measureMetrics();
        expect(plugin.metrics.cameraDistance).toBeCloseTo(1000);
        // visibleNodes might be 0 because Frustum isn't set up with valid matrices in mock,
        // but we just want to ensure it runs without error.
    });
});
