import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ErgonomicsPlugin } from './ErgonomicsPlugin.js';
import * as THREE from 'three';

describe('ErgonomicsPlugin', () => {
    let plugin;
    let mockSpace;
    let mockPluginManager;
    let mockCamera;
    let mockControls;

    beforeEach(() => {
        vi.useFakeTimers();
        // Setup Mock Camera
        mockCamera = new THREE.PerspectiveCamera(75, 1200/800, 0.1, 1000);
        mockCamera.position.set(0, 0, 500);
        mockCamera.updateMatrixWorld();
        mockCamera.matrixWorldInverse.copy(mockCamera.matrixWorld).invert();

        mockControls = {
            zoomSpeed: 1.0,
            panSpeed: 0.8,
            dampingFactor: 0.1
        };

        mockPluginManager = {
            getPlugin: vi.fn((name) => {
                if (name === 'CameraPlugin') return {
                    getCameraInstance: () => mockCamera,
                    getControls: () => mockControls,
                    moveTo: vi.fn()
                };
                if (name === 'NodePlugin') return {
                    getNodes: () => new Map([
                        ['1', {
                            position: new THREE.Vector3(0,0,0),
                            getBoundingSphereRadius: () => 10,
                            mesh: new THREE.Mesh()
                        }],
                        ['2', {
                            position: new THREE.Vector3(20,0,0),
                            getBoundingSphereRadius: () => 10,
                            mesh: new THREE.Mesh()
                        }]
                    ])
                };
                return null;
            })
        };

        mockSpace = {
            on: vi.fn(),
            off: vi.fn(),
            emit: vi.fn(),
            container: {
                clientHeight: 800,
                clientWidth: 1200,
                appendChild: vi.fn()
            },
            plugins: mockPluginManager
        };

        plugin = new ErgonomicsPlugin(mockSpace, mockPluginManager);
        plugin.init();
    });

    afterEach(() => {
        plugin.dispose();
        vi.useRealTimers();
    });

    it('should initialize with comprehensive metrics', () => {
        expect(plugin.metrics).toHaveProperty('textLegibility');
        expect(plugin.metrics).toHaveProperty('visualClutter');
        expect(plugin.metrics).toHaveProperty('opticalFlow');
        expect(plugin.metrics).toHaveProperty('jitterIndex');
        expect(plugin.metrics).toHaveProperty('interactionState');
    });

    it('should measure static metrics correctly', () => {
        plugin._measureStaticMetrics();

        expect(plugin.metrics.visibleNodes).toBeGreaterThan(0);
        expect(plugin.metrics.avgNodeSizePx).toBeGreaterThan(0);
        expect(plugin.metrics.viewportCoverage).toBeGreaterThanOrEqual(0);
        expect(plugin.metrics.textLegibility).toBeGreaterThanOrEqual(0);
    });

    it('should measure dynamic metrics and track sessions', () => {
        // Start with valid time
        plugin.lastFrameTime = Date.now() - 100;

        // Simulate movement
        mockCamera.position.set(0, 0, 490); // Moved 10 units

        // Advance timers to ensure dt > 0
        vi.advanceTimersByTime(100);
        const now = Date.now();
        plugin.lastFrameTime = now - 100; // 100ms delta

        plugin._measureDynamicMetrics();

        // Velocity = 10 / 0.1 = 100
        expect(plugin.metrics.opticalFlow).toBeGreaterThan(0);
        expect(plugin.metrics.interactionState).toBe('SEARCHING');
        expect(plugin.currentSession).not.toBeNull();
    });

    it('should finalize session and calculate quality metrics', () => {
        // 1. Start session (SEARCHING)
        plugin.lastFrameTime = Date.now() - 100;
        mockCamera.position.set(0,0,490);
        plugin._measureDynamicMetrics();
        expect(plugin.metrics.interactionState).toBe('SEARCHING');

        // 2. Stop movement (IDLE -> TARGETING)
        plugin.lastFrameTime = Date.now() - 100;
        mockCamera.position.set(0,0,490.01); // Tiny move < 5.0 velocity

        plugin._measureDynamicMetrics();

        expect(plugin.metrics.interactionState).toBe('TARGETING');
        expect(plugin.currentSession).toBeNull();
        expect(plugin.metrics.pathEfficiency).toBeDefined();
        expect(plugin.metrics.jitterIndex).toBeDefined();
    });

    it('should adjust sensitivities based on interaction state', () => {
        // Force TARGETING state with high jitter
        plugin.metrics.interactionState = 'TARGETING';
        plugin.metrics.jitterIndex = 5.0;

        plugin._updateInteractionSensitivities();

        // Damping should increase
        expect(mockControls.dampingFactor).toBeGreaterThan(0.12);
        expect(mockControls.zoomSpeed).toBeLessThan(1.0);
    });

    describe('CalibrationManager', () => {
        it('should use structured strategies', () => {
            plugin.calibration.start();
            expect(plugin.calibration.active).toBe(true);
            expect(plugin.calibration.variant).toBeDefined();
            expect(plugin.calibration.variant._name).toBe('High Precision');

            plugin.calibration.vote('A'); // Keeps A, Round 2
            expect(plugin.calibration.round).toBe(2);
            expect(plugin.calibration.variant._name).toBe('High Velocity');
        });

        it('should emit events', () => {
            plugin.calibration.start();
            expect(mockSpace.emit).toHaveBeenCalledWith('ergonomics:calibration:started');

            plugin.calibration.vote('B');
            expect(mockSpace.emit).toHaveBeenCalledWith('ergonomics:voted', expect.any(Object));
        });

        it('should reset correctly', () => {
            plugin.calibration.start();
            plugin.calibration.vote('A');
            plugin.calibration.reset();

            expect(plugin.calibration.active).toBe(false);
            expect(plugin.calibration.history.length).toBe(0);
        });
    });
});
