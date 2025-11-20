import * as THREE from "three";
import { CSS3DRenderer } from "three/addons/renderers/CSS3DRenderer.js";
import { Plugin } from "../core/Plugin.js";
import { $ } from "../utils.js";
import { EffectComposer, RenderPass } from "postprocessing";
import { InstancedMeshManager } from "../rendering/InstancedMeshManager.js";
import { LightingManager } from "../rendering/LightingManager.js";
import { EffectsManager } from "../rendering/EffectsManager.js";

export class RenderingPlugin extends Plugin {
  scene = null;
  cssScene = null;
  renderGL = null;
  renderCSS3D = null;
  composer = null;
  clock = null;
  renderPass = null;

  css3dContainer = null;
  webglCanvas = null;
  background = { color: 0x1a1a1d, alpha: 1.0 };

  instancedMeshManager = null;
  lightingManager = null;
  effectsManager = null;

  // Cached plugin references
  _cameraPlugin = null;
  _minimapPlugin = null;

  constructor(spaceGraph, pluginManager) {
    super(spaceGraph, pluginManager);
    this.scene = new THREE.Scene();
    this.cssScene = new THREE.Scene();
    this.clock = new THREE.Clock();
  }

  getName() {
    return "RenderingPlugin";
  }

  init() {
    super.init();
    this._cameraPlugin = this.pluginManager.getPlugin("CameraPlugin");
    this._minimapPlugin = this.pluginManager.getPlugin("MinimapPlugin");

    this._setupRenderersAndComposer();

    this.lightingManager = new LightingManager(this);
    this.lightingManager.setupDefaults(); // was _setupLighting logic

    this.setBackground(this.background.color, this.background.alpha);

    this.instancedMeshManager = new InstancedMeshManager(this.scene);

    this.effectsManager = new EffectsManager(this);
    this.effectsManager.init();

    window.addEventListener("resize", this._onWindowResize, false);
  }

  // Rendering
  update() {
    const cam = this._cameraPlugin?.getCameraInstance();
    const deltaTime = this.clock.getDelta();

    if (cam && this.composer?.renderer) {
      this.composer.render(deltaTime);
      this.renderCSS3D?.render(this.cssScene, cam);
    } else if (cam && this.renderGL) {
      this.renderGL.render(this.scene, cam);
      this.renderCSS3D?.render(this.cssScene, cam);
    }

    this._minimapPlugin?.render?.(this.renderGL);
  }

  // Renderer setup
  _setupRenderersAndComposer() {
    if (!this.space?.container) {
      console.error("RenderingPlugin: SpaceGraph container not available.");
      return;
    }

    const cam = this.pluginManager
      ?.getPlugin("CameraPlugin")
      ?.getCameraInstance();
    if (!cam) {
      console.error("RenderingPlugin: Camera instance not available.");
      return;
    }

    this.webglCanvas = $("#webgl-canvas") || document.createElement("canvas");
    this.webglCanvas.id = "webgl-canvas";
    if (!this.webglCanvas.parentNode) {
      this.space.container.appendChild(this.webglCanvas);
    }

    this.renderGL = new THREE.WebGLRenderer({
      canvas: this.webglCanvas,
      powerPreference: "high-performance",
      antialias: false,
      stencil: true,
      depth: true,
      alpha: true,
    });
    this.renderGL.setSize(window.innerWidth, window.innerHeight);
    this.renderGL.setPixelRatio(window.devicePixelRatio);
    this.renderGL.outputColorSpace = THREE.SRGBColorSpace;
    this.renderGL.shadowMap.enabled = true;
    this.renderGL.shadowMap.type = THREE.PCFSoftShadowMap;

    this.composer = new EffectComposer(this.renderGL);
    this.renderPass = new RenderPass(this.scene, cam);
    this.composer.addPass(this.renderPass);

    this.renderCSS3D = new CSS3DRenderer();
    this.renderCSS3D.setSize(window.innerWidth, window.innerHeight);

    this.css3dContainer = $("#css3d-container");
    if (!this.css3dContainer) {
      this.css3dContainer = document.createElement("div");
      this.css3dContainer.id = "css3d-container";
      this.space.container.appendChild(this.css3dContainer);
    }
    this.css3dContainer.appendChild(this.renderCSS3D.domElement);

    Object.assign(this.renderCSS3D.domElement.style, {
      position: "absolute",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      pointerEvents: "none",
    });
  }

  _onWindowResize = () => {
    const cam = this.pluginManager
      ?.getPlugin("CameraPlugin")
      ?.getCameraInstance();
    if (!cam || !this.renderGL || !this.renderCSS3D || !this.composer) return;

    const { innerWidth: iw, innerHeight: ih } = window;
    cam.aspect = iw / ih;
    cam.updateProjectionMatrix();

    this.renderGL.setSize(iw, ih);
    this.composer.setSize(iw, ih);
    this.renderCSS3D.setSize(iw, ih);
    this.space.emit("renderer:resize", { width: iw, height: ih });
  };

  // Delegated Effects methods
  setEffectEnabled(effectName, enabled) {
    this.effectsManager?.setEffectEnabled(effectName, enabled);
  }

  configureEffect(effectName, settings) {
    this.effectsManager?.configureEffect(effectName, settings);
  }

  getEffectConfiguration(effectName) {
    return this.effectsManager?.getEffectConfiguration(effectName);
  }

  // Delegated Lighting methods
  addLight(id, type, options = {}) {
    return this.lightingManager?.addLight(id, type, options);
  }

  removeLight(id) {
    return this.lightingManager?.removeLight(id);
  }

  getLight(id) {
    return this.lightingManager?.getLight(id);
  }

  configureLight(id, options) {
    return this.lightingManager?.configureLight(id, options);
  }

  // Background
  setBackground(color = 0x000000, alpha = 0) {
    this.background = { color, alpha };
    this.renderGL?.setClearColor(color, alpha);
    if (this.webglCanvas)
      this.webglCanvas.style.backgroundColor =
        alpha === 0
          ? "transparent"
          : `#${new THREE.Color(color).getHexString()}`;
  }

  // Getters
  getWebGLScene() {
    return this.scene;
  }

  getCSS3DScene() {
    return this.cssScene;
  }

  getInstancedMeshManager() {
    return this.instancedMeshManager;
  }

  getCSS3DRenderer() {
    return this.renderCSS3D;
  }

  // Disposal
  dispose() {
    super.dispose();
    window.removeEventListener("resize", this._onWindowResize);

    this.effectsManager?.dispose();
    this.lightingManager?.dispose();
    this.instancedMeshManager?.dispose();

    this.composer?.dispose();
    this.renderPass?.dispose();
    this.renderGL?.dispose();

    this.renderCSS3D?.domElement?.remove();
    this.css3dContainer?.remove();

    this.scene?.traverse((object) => {
      object.geometry?.dispose();
      if (object.material) {
        if (Array.isArray(object.material)) {
          for (const material of object.material) {
            material.dispose();
          }
        } else {
          object.material.dispose();
        }
      }
    });
    this.scene?.clear();
    this.cssScene?.clear();

    this.scene = null;
    this.cssScene = null;
    this.renderGL = null;
    this.effectsManager = null;
    this.lightingManager = null;
    this.instancedMeshManager = null;
  }
}
