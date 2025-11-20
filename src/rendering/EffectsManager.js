import * as THREE from "three";
import {
  BlendFunction,
  BloomEffect,
  EffectPass,
  KernelSize,
  NormalPass,
  OutlineEffect,
  Selection,
  SSAOEffect,
} from "postprocessing";
import { Line2 } from "three/addons/lines/Line2.js";

export class EffectsManager {
  constructor(renderingPlugin) {
    this.renderingPlugin = renderingPlugin;
    this.space = renderingPlugin.space;
    this.scene = renderingPlugin.scene;

    this.bloomEffect = null;
    this.ssaoEffect = null;
    this.outlineEffect = null;
    this.normalPass = null;
    this.selection = null;

    this.normalPassInstance = null;
    this.effectPassBloom = null;
    this.effectPassSSAO = null;
    this.effectPassOutline = null;

    this.effectsConfig = {
      bloom: {
        enabled: true,
        intensity: 0.5,
        kernelSize: KernelSize.MEDIUM,
        luminanceThreshold: 0.85,
        luminanceSmoothing: 0.4,
      },
      ssao: {
        enabled: true,
        blendFunction: BlendFunction.MULTIPLY,
        samples: 16,
        rings: 4,
        distanceThreshold: 0.05,
        distanceFalloff: 0.01,
        rangeThreshold: 0.005,
        rangeFalloff: 0.001,
        luminanceInfluence: 0.6,
        radius: 15,
        scale: 0.6,
        bias: 0.03,
        intensity: 1.5,
        color: 0x000000,
      },
      outline: {
        enabled: true,
        blendFunction: BlendFunction.SCREEN,
        edgeStrength: 2.5,
        pulseSpeed: 0.0,
        visibleEdgeColor: 0xffaa00,
        hiddenEdgeColor: 0x22090a,
        kernelSize: KernelSize.VERY_SMALL,
        blur: false,
        xRay: true,
      },
    };

    this._setupSelectionListener();
  }

  init() {
    this.rebuildEffectPasses();
  }

  _setupSelectionListener() {
    this.space.on("selection:changed", this.handleSelectionChange.bind(this));
  }

  handleSelectionChange(payload) {
    if (
      !this.outlineEffect ||
      !this.selection ||
      !this.effectsConfig.outline.enabled
    )
      return;

    this.selection.clear();
    for (const selectedItem of payload.selected ?? []) {
      const object = selectedItem.mesh || selectedItem.line;
      if (object && this._isObjectInMainScene(object)) {
        if (
          object instanceof THREE.Mesh ||
          object instanceof Line2 ||
          object instanceof THREE.Line
        ) {
          this.selection.add(object);
        }
      }
    }
  }

  _isObjectInMainScene(object) {
    let current = object;
    while (current) {
      if (current === this.scene) return true;
      current = current.parent;
    }
    return false;
  }

  rebuildEffectPasses() {
    const composer = this.renderingPlugin.composer;
    if (!composer || !this.renderingPlugin.renderPass || !composer.renderer)
      return;

    const cam = this.renderingPlugin._cameraPlugin?.getCameraInstance();
    if (!cam) return;

    this._disposeAndRemovePasses();
    this._createEnabledEffectPasses(cam);
  }

  _disposeAndRemovePasses() {
    const composer = this.renderingPlugin.composer;
    if (!composer) return;

    const passes = [
      ["normalPassInstance", this.normalPassInstance],
      ["effectPassSSAO", this.effectPassSSAO],
      ["effectPassOutline", this.effectPassOutline],
      ["effectPassBloom", this.effectPassBloom],
    ];

    for (const [key, pass] of passes) {
      pass?.dispose();
      if (pass) composer.removePass(pass);
      this[key] = null;
    }

    const effects = ["ssaoEffect", "outlineEffect", "bloomEffect"];
    for (const effectKey of effects) {
      this[effectKey]?.dispose();
      this[effectKey] = null;
    }
  }

  _createEnabledEffectPasses(cam) {
    if (this.effectsConfig.ssao.enabled) {
      this._createSSAOEffect(cam);
    }

    if (this.effectsConfig.outline.enabled) {
      this._createOutlineEffect(cam);
    }

    if (this.effectsConfig.bloom.enabled) {
      this._createBloomEffect(cam);
    }
  }

  _createSSAOEffect(cam) {
    this.normalPassInstance = new NormalPass(this.scene, cam, {
      renderTarget: new THREE.WebGLRenderTarget(1, 1, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
      }),
    });
    this.renderingPlugin.composer.addPass(this.normalPassInstance);
    this.ssaoEffect = new SSAOEffect(
      cam,
      this.normalPassInstance.texture,
      this.effectsConfig.ssao,
    );
    this.effectPassSSAO = new EffectPass(cam, this.ssaoEffect);
    this.renderingPlugin.composer.addPass(this.effectPassSSAO);
  }

  _createOutlineEffect(cam) {
    this.selection ??= new Selection();
    this.outlineEffect = new OutlineEffect(
      this.scene,
      cam,
      this.effectsConfig.outline,
    );
    this.outlineEffect.selection = this.selection;
    this.effectPassOutline = new EffectPass(cam, this.outlineEffect);
    this.renderingPlugin.composer.addPass(this.effectPassOutline);
  }

  _createBloomEffect(cam) {
    // Passed cam here although not strictly needed for constructor, for consistency
    this.bloomEffect = new BloomEffect(this.effectsConfig.bloom);
    this.effectPassBloom = new EffectPass(cam, this.bloomEffect);
    this.renderingPlugin.composer.addPass(this.effectPassBloom);
  }

  setEffectEnabled(effectName, enabled) {
    if (!this.effectsConfig[effectName])
      return console.warn(`EffectsManager: Effect "${effectName}" not found.`);
    this.effectsConfig[effectName].enabled = enabled;
    this.rebuildEffectPasses();
    this.space.emit("effect:enabled:changed", { effectName, enabled });
  }

  configureEffect(effectName, settings) {
    if (!this.effectsConfig[effectName])
      return console.warn(`EffectsManager: Effect "${effectName}" not found.`);
    Object.assign(this.effectsConfig[effectName], settings);
    this.rebuildEffectPasses();
    this.space.emit("effect:settings:changed", { effectName, settings });
  }

  getEffectConfiguration(effectName) {
    return this.effectsConfig[effectName]
      ? { ...this.effectsConfig[effectName] }
      : null;
  }

  dispose() {
    this.space.off("selection:changed", this.handleSelectionChange);
    this._disposeAndRemovePasses();
    this.selection?.dispose();
  }
}
