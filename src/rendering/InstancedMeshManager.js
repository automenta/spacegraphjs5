// stdlib imports
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const MAX_INSTANCES_PER_TYPE = 1000;

class InstancedMeshGroup {
  constructor(geometry, material, scene) {
    this.geometry = geometry;
    this.material = material.clone();
    this.material.vertexColors = true;

    this.instancedMesh = new THREE.InstancedMesh(
      this.geometry,
      this.material,
      MAX_INSTANCES_PER_TYPE,
    );
    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.instancedMesh.instanceColor?.setUsage(THREE.DynamicDrawUsage);

    scene.add(this.instancedMesh);

    this.nodeIdToInstanceId = new Map();
    this.instanceIdToNode = new Map(); // Changed to store Node object
    this.activeInstances = 0;
  }

  addNode(node) {
    if (this.activeInstances >= MAX_INSTANCES_PER_TYPE) {
      console.warn("InstancedMeshManager: Max instances reached.");
      return null;
    }

    const instanceId = this.activeInstances++;
    this.nodeIdToInstanceId.set(node.id, instanceId);
    this.instanceIdToNode.set(instanceId, node);

    this.updateNodeTransform(node, instanceId);
    this.updateNodeColor(node, instanceId);

    return instanceId;
  }

  updateNodeTransform(node, instanceId = this.nodeIdToInstanceId.get(node.id)) {
    if (instanceId === undefined) return;

    const matrix = new THREE.Matrix4();
    const position = node.position;
    const rotation = node.mesh?.quaternion || new THREE.Quaternion();
    const scale = new THREE.Vector3(node.size, node.size, node.size);

    matrix.compose(position, rotation, scale);
    this.instancedMesh.setMatrixAt(instanceId, matrix);
    this.instancedMesh.instanceMatrix.needsUpdate = true;
  }

  updateNodeColor(node, instanceId = this.nodeIdToInstanceId.get(node.id)) {
    if (instanceId === undefined || !this.instancedMesh.instanceColor) return;

    const color = new THREE.Color(node.data.color || 0xffffff);
    this.instancedMesh.setColorAt(instanceId, color);
    this.instancedMesh.instanceColor.needsUpdate = true;
  }

  removeNode(node) {
    const instanceId = this.nodeIdToInstanceId.get(node.id);
    if (instanceId === undefined) return;

    const lastInstanceId = this.activeInstances - 1;

    if (instanceId !== lastInstanceId) {
      // Swap with last instance
      const lastNode = this.instanceIdToNode.get(lastInstanceId);

      // Move last instance data to the removed slot
      const matrix = new THREE.Matrix4();
      this.instancedMesh.getMatrixAt(lastInstanceId, matrix);
      this.instancedMesh.setMatrixAt(instanceId, matrix);

      if (this.instancedMesh.instanceColor) {
        const color = new THREE.Color();
        this.instancedMesh.getColorAt(lastInstanceId, color);
        this.instancedMesh.setColorAt(instanceId, color);
      }

      // Update maps
      this.nodeIdToInstanceId.set(lastNode.id, instanceId);
      this.instanceIdToNode.set(instanceId, lastNode);

      // Update the moved node's instanceId
      lastNode.instanceId = instanceId;
    }

    // Clear the used slot (now at lastInstanceId)
    this.instancedMesh.setMatrixAt(
      lastInstanceId,
      new THREE.Matrix4().makeScale(0, 0, 0),
    );

    this.nodeIdToInstanceId.delete(node.id);
    this.instanceIdToNode.delete(lastInstanceId);
    this.activeInstances--;

    this.instancedMesh.instanceMatrix.needsUpdate = true;
    if (this.instancedMesh.instanceColor)
      this.instancedMesh.instanceColor.needsUpdate = true;
  }

  getRaycastIntersection(raycaster) {
    if (!this.instancedMesh || this.activeInstances === 0) return null;

    const intersection = raycaster.intersectObject(this.instancedMesh);
    if (intersection.length === 0) return null;

    const instanceId = intersection[0].instanceId;
    if (instanceId >= this.activeInstances) return null; // Ignore inactive instances

    const node = this.instanceIdToNode.get(instanceId);
    return node ? { ...intersection[0], nodeId: node.id } : null;
  }

  dispose() {
    this.instancedMesh.parent?.remove(this.instancedMesh);
    this.instancedMesh.geometry.dispose();
    this.instancedMesh.material.dispose();
    this.nodeIdToInstanceId.clear();
    this.instanceIdToNode.clear();
  }
}

export class InstancedMeshManager {
  constructor(scene) {
    if (!scene) {
      throw new TypeError("InstancedMeshManager requires a scene");
    }
    this.scene = scene;
    this.meshGroups = new Map();
    this.gltfLoader = new GLTFLoader();
    this.loadedGltfGeometries = new Map();
    this._initDefaultGeometries();
  }

  async _loadGltfModel(url) {
    if (this.loadedGltfGeometries.has(url)) {
      return this.loadedGltfGeometries.get(url);
    }

    try {
      const gltf = await this.gltfLoader.loadAsync(url);
      let geometry = null;
      gltf.scene.traverse((child) => {
        if (child.isMesh) {
          geometry = child.geometry;
        }
      });

      if (geometry) {
        this.loadedGltfGeometries.set(url, geometry);
        return geometry;
      } else {
        console.warn(`GLTF model at ${url} contains no mesh geometry.`);
        return null;
      }
    } catch (error) {
      console.error(`Error loading GLTF model from ${url}:`, error);
      throw new Error(`GLTF loading failed: ${url}`);
    }
  }

  _initDefaultGeometries() {
    const sphereGeometry = new THREE.SphereGeometry(0.5, 16, 12);
    const defaultMaterial = new THREE.MeshStandardMaterial({
      roughness: 0.6,
      metalness: 0.2,
    });
    this.meshGroups.set(
      "sphere",
      new InstancedMeshGroup(sphereGeometry, defaultMaterial, this.scene),
    );
  }

  async getNodeGroup(node) {
    if (!node?.data) return null;

    if (node.data.shape === "sphere") return this.meshGroups.get("sphere");

    if (node.data.gltfUrl) {
      let group = this.meshGroups.get(node.data.gltfUrl);
      if (!group) {
        try {
          const geometry = await this._loadGltfModel(node.data.gltfUrl);
          if (geometry) {
            const material = new THREE.MeshStandardMaterial({
              roughness: 0.6,
              metalness: 0.2,
            });
            group = new InstancedMeshGroup(geometry, material, this.scene);
            this.meshGroups.set(node.data.gltfUrl, group);
          }
        } catch (error) {
          console.error(
            `Failed to create instanced group for ${node.data.gltfUrl}:`,
            error,
          );
          return null;
        }
      }
      return group;
    }

    return null;
  }

  async addNode(node) {
    if (!node?.id) return false;

    const group = await this.getNodeGroup(node);
    if (!group) return ((node.isInstanced = false), false);

    const instanceId = group.addNode(node);
    if (instanceId === null) return ((node.isInstanced = false), false);

    node.isInstanced = true;
    node.instanceId = instanceId;
    node.mesh && (node.mesh.visible = false);
    return true;
  }

  async updateNode(node) {
    if (!node?.isInstanced) return;

    const group = await this.getNodeGroup(node);
    if (group) {
      group.updateNodeTransform(node);
      group.updateNodeColor(node);
    }
  }

  async removeNode(node) {
    if (!node?.isInstanced) return;

    const group = await this.getNodeGroup(node);
    if (group) {
      group.removeNode(node);
      node.isInstanced = false;
    }
  }

  raycast(raycaster) {
    let closestIntersection = null;
    for (const group of this.meshGroups.values()) {
      const intersection = group.getRaycastIntersection(raycaster);
      if (
        intersection &&
        (!closestIntersection ||
          intersection.distance < closestIntersection.distance)
      ) {
        closestIntersection = intersection;
      }
    }
    return closestIntersection;
  }

  dispose() {
    for (const group of this.meshGroups.values()) {
      group.dispose();
    }
    this.meshGroups.clear();
    this.loadedGltfGeometries.clear();
  }
}
