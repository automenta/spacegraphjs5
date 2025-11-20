import * as THREE from "three";

export class LightingManager {
  constructor(renderingPlugin) {
    this.renderingPlugin = renderingPlugin;
    this.space = renderingPlugin.space;
    this.scene = renderingPlugin.scene;
    this.managedLights = new Map();
  }

  setupDefaults() {
    this.addLight("defaultAmbient", "ambient", { intensity: 0.8 });
    this.addLight("defaultDirectional", "directional", {
      intensity: 1.2,
      position: { x: 150, y: 200, z: 100 },
      castShadow: true,
      shadowMapSizeWidth: 2048,
      shadowMapSizeHeight: 2048,
      shadowCameraNear: 10,
      shadowCameraFar: 600,
      shadowCameraSize: 150,
    });
  }

  addLight(id, type, options = {}) {
    if (this.managedLights.has(id)) return this.managedLights.get(id);
    let light;
    const color = options.color ?? 0xffffff;
    const intensity = options.intensity ?? 1.0;

    switch (type.toLowerCase()) {
      case "ambient":
        light = new THREE.AmbientLight(color, intensity);
        break;
      case "directional":
        light = new THREE.DirectionalLight(color, intensity);
        light.position.set(
          options.position?.x ?? 50,
          options.position?.y ?? 100,
          options.position?.z ?? 75,
        );
        if (options.target instanceof THREE.Object3D) {
          light.target = options.target;
        } else if (options.target instanceof THREE.Vector3) {
          light.target.position.copy(options.target);
        } else {
          light.target.position.set(0, 0, 0);
        }
        this.scene.add(light.target);
        if (options.castShadow !== false) {
          light.castShadow = true;
          light.shadow.mapSize.width = options.shadowMapSizeWidth ?? 2048;
          light.shadow.mapSize.height = options.shadowMapSizeHeight ?? 2048;
          light.shadow.camera.near = options.shadowCameraNear ?? 0.5;
          light.shadow.camera.far = options.shadowCameraFar ?? 500;
          const d = options.shadowCameraSize ?? 100;
          light.shadow.camera.left = -d;
          light.shadow.camera.right = d;
          light.shadow.camera.top = d;
          light.shadow.camera.bottom = -d;
        }
        break;
      case "point":
        light = new THREE.PointLight(
          color,
          intensity,
          options.distance ?? 1000,
          options.decay ?? 2,
        );
        light.position.set(
          options.position?.x ?? 0,
          options.position?.y ?? 0,
          options.position?.z ?? 0,
        );
        if (options.castShadow) {
          light.castShadow = true;
          light.shadow.mapSize.width = options.shadowMapSizeWidth ?? 1024;
          light.shadow.mapSize.height = options.shadowMapSizeHeight ?? 1024;
          light.shadow.camera.near = options.shadowCameraNear ?? 0.5;
          light.shadow.camera.far = options.shadowCameraFar ?? 500;
        }
        break;
      default:
        console.error(`LightingManager: Unknown light type '${type}'`);
        return null;
    }

    if (!light) return null;
    light.userData.lightId = id;
    this.managedLights.set(id, light);
    this.scene.add(light);
    this.space.emit("light:added", { id, type, light });
    return light;
  }

  removeLight(id) {
    const light = this.managedLights.get(id);
    if (!light)
      return console.warn(`LightingManager: Light '${id}' not found.`) || false;
    if (light.target?.parent === this.scene) this.scene.remove(light.target);
    this.scene.remove(light);
    light.dispose?.();
    this.managedLights.delete(id);
    this.space.emit("light:removed", { id });
    return true;
  }

  getLight(id) {
    return this.managedLights.get(id);
  }

  configureLight(id, options) {
    const light = this.managedLights.get(id);
    if (!light) return false;

    if (options.color !== undefined) light.color.set(options.color);
    if (options.intensity !== undefined) light.intensity = options.intensity;
    if (options.position !== undefined) {
      light.position?.set(
        options.position.x,
        options.position.y,
        options.position.z,
      );
    }
    if (options.castShadow !== undefined && light.castShadow !== undefined) {
      light.castShadow = options.castShadow;
    }

    if (light.shadow) {
      if (options.shadowMapSizeWidth !== undefined) {
        light.shadow.mapSize.width = options.shadowMapSizeWidth;
      }
      if (options.shadowMapSizeHeight !== undefined) {
        light.shadow.mapSize.height = options.shadowMapSizeHeight;
      }
      if (options.shadowCameraNear !== undefined) {
        light.shadow.camera.near = options.shadowCameraNear;
      }
      if (options.shadowCameraFar !== undefined) {
        light.shadow.camera.far = options.shadowCameraFar;
      }
      if (
        light.shadow.camera instanceof THREE.OrthographicCamera &&
        options.shadowCameraSize !== undefined
      ) {
        const d = options.shadowCameraSize;
        light.shadow.camera.left = -d;
        light.shadow.camera.right = d;
        light.shadow.camera.top = d;
        light.shadow.camera.bottom = -d;
      }
      light.shadow.camera.updateProjectionMatrix();
    }
    this.space.emit("light:configured", { id, light, options });
    return true;
  }

  dispose() {
    for (const light of this.managedLights.values()) {
      if (light.target?.parent === this.scene) this.scene.remove(light.target);
      this.scene.remove(light);
      light.dispose?.();
    }
    this.managedLights.clear();
  }
}
