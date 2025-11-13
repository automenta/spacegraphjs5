import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Node} from './Node.js';
import {applyLabelLOD, createCSS3DLabelObject} from '../../utils/labelUtils.js';

export class ShapeNode extends Node {
    static typeName = 'shape';
    shape = 'sphere';
    size = 50;
    color = 0xffffff;
    gltfUrl = null;
    lodData = [];
    isSelected = false;
    isHovered = false;

    constructor(id, position, data = {}, mass = 1.5) {
        super(id, position, data, mass);
        this.shape = this.data.shape ?? 'sphere';
        // Ensure size is a finite number, default to 50 if not
        this.size = Number.isFinite(this.data.size) ? this.data.size : 50;
        this.color = this.data.color ?? 0xffffff;
        this.gltfUrl = this.data.gltfUrl ?? null;
        this.lodData = this.data.lodLevels ?? [];

        this.mesh = new THREE.LOD();
        this.mesh.userData = {nodeId: this.id, type: 'shape-node-lod'};
        this._setupLODLevels();

        if (this.data.label) {
            this.labelObject = this._createLabel();
            this.labelObject.userData = {nodeId: this.id, type: 'shape-label'};
        }
        this.update();
        // Initial bounding sphere update, will be re-updated on GLTF load
        this.updateBoundingSphere();
    }

    getDefaultData() {
        return {
            label: '',
            shape: 'sphere',
            size: 50,
            color: 0xffffff,
            type: 'shape',
            lodLevels: [],
            labelLod: [],
        };
    }

    _setupLODLevels() {
        if (this.lodData?.length) {
            this.lodData.forEach(levelConf => {
                const levelMesh = this._createRepresentationForLevel(levelConf);
                if (levelMesh) this.mesh.addLevel(levelMesh, levelConf.distance);
            });
        } else {
            const mainRepresentation = this._createRepresentationForLevel({
                shape: this.shape,
                gltfUrl: this.gltfUrl,
                gltfScale: this.data.gltfScale,
                size: this.size,
                color: this.color,
            });
            if (mainRepresentation) this.mesh.addLevel(mainRepresentation, 0);

            const placeholderSize = Math.max(10, (this.size || 50) / 3);
            const placeholder = this._createMeshForLevel({
                shape: 'box',
                size: placeholderSize,
                color: this.color,
            });
            if (placeholder) this.mesh.addLevel(placeholder, this.data.lodDistanceSimple ?? 700);
            this.mesh.addLevel(new THREE.Object3D(), this.data.lodDistanceHide ?? 1500);
        }
    }

    _createRepresentationForLevel(levelConfig) {
        return levelConfig.shape === 'gltf' && levelConfig.gltfUrl
            ? (() => {
                const gltfGroup = new THREE.Group();
                gltfGroup.castShadow = true;
                gltfGroup.receiveShadow = true;
                this._loadGltfModelForLevel(levelConfig, gltfGroup);
                return gltfGroup;
            })()
            : levelConfig.shape
                ? this._createMeshForLevel(levelConfig)
                : null;
    }

    _createMeshForLevel(levelConfig) {
        let geometry;
        // Ensure levelConfig.size is a finite number, default to this.size if not
        const effectiveLevelSize = Number.isFinite(levelConfig.size) ? levelConfig.size : this.size;
        const effectiveSize = Math.max(5, effectiveLevelSize); // Ensure minimum size
        const shapeType = levelConfig.shape || 'sphere';
        const color = levelConfig.color || this.color;

        switch (shapeType) {
            case 'box':
                geometry = new THREE.BoxGeometry(effectiveSize, effectiveSize, effectiveSize);
                break;
            case 'sphere':
            default:
                geometry = new THREE.SphereGeometry(effectiveSize / 2, 32, 16);
                break;
        }
        const material = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.7,
            metalness: 0.1,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return mesh;
    }

    _loadGltfModelForLevel(levelConfig, targetGroup) {
        if (!levelConfig.gltfUrl || !targetGroup) return;

        const loader = new GLTFLoader();
        loader.load(
            levelConfig.gltfUrl,
            gltf => {
                const modelScene = gltf.scene;

                // Process meshes in the loaded model
                this._processLoadedModel(modelScene, levelConfig);

                // Scale and position the model
                const {scale, center} = this._calculateModelTransform(modelScene, levelConfig);
                modelScene.scale.set(scale, scale, scale);
                modelScene.position.sub(center.multiplyScalar(scale));

                // Replace existing children and add the new model
                this._replaceGroupChildren(targetGroup, modelScene);

                // Update bounding sphere if this is the main LOD level
                const lodLevelEntry = this.mesh.levels.find(l => l.object === targetGroup);
                if (lodLevelEntry?.distance === 0) {
                    this.updateBoundingSphere();
                }

                this.space?.emit('node:updated', {
                    node: this,
                    property: 'mesh_lod_level_loaded',
                    levelDetail: levelConfig,
                });
            },
            undefined,
            error => {
                console.error(
                    `ShapeNode: Failed to load GLTF model from ${levelConfig.gltfUrl}. Falling back to primitive shape.`,
                    error
                );
                this._handleGltfLoadError(levelConfig, targetGroup);
            }
        );
    }

    /**
     * Processes a loaded GLTF model, setting shadows and applying color overrides.
     * @param {THREE.Object3D} modelScene - The loaded GLTF scene.
     * @param {object} levelConfig - Configuration for this LOD level.
     */
    _processLoadedModel(modelScene, levelConfig) {
        modelScene.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;

                // Apply color override if specified
                if (levelConfig.color && child.material) {
                    this._applyMaterialColor(child.material, levelConfig.color);
                }
            }
        });
    }

    /**
     * Applies a color to a material or array of materials.
     * @param {THREE.Material|Array<THREE.Material>} material - Material or array of materials.
     * @param {number} color - Color to apply.
     */
    _applyMaterialColor(material, color) {
        const isValidMaterial = mat =>
            mat && (mat.isMeshStandardMaterial || mat.isMeshBasicMaterial);

        if (Array.isArray(material)) {
            material.forEach(mat => {
                if (isValidMaterial(mat)) {
                    mat.color.set(color);
                }
            });
        } else if (isValidMaterial(material)) {
            material.color.set(color);
        }
    }

    /**
     * Calculates the scale and center for a loaded model.
     * @param {THREE.Object3D} modelScene - The loaded GLTF scene.
     * @param {object} levelConfig - Configuration for this LOD level.
     * @returns {object} Object containing scale and center vectors.
     */
    _calculateModelTransform(modelScene, levelConfig) {
        const bbox = new THREE.Box3().setFromObject(modelScene);
        const modelSize = new THREE.Vector3();
        bbox.getSize(modelSize);
        const maxDim = Math.max(modelSize.x, modelSize.y, modelSize.z);

        let scale = 1;
        if (maxDim > 0) {
            let targetDimension =
                levelConfig.gltfScale ?? this.data.gltfScale ?? levelConfig.size ?? this.size;
            // Ensure targetDimension is a finite and positive number, default to 50 if not
            if (!Number.isFinite(targetDimension) || targetDimension <= 0) {
                targetDimension = 50; // Fallback to a reasonable default
            }
            scale = targetDimension / maxDim;
        }

        const center = new THREE.Vector3();
        bbox.getCenter(center);

        return {scale, center};
    }

    /**
     * Replaces all children in a group with a new object.
     * @param {THREE.Group} group - The group to modify.
     * @param {THREE.Object3D} newObject - The object to add to the group.
     */
    _replaceGroupChildren(group, newObject) {
        while (group.children.length > 0) {
            group.remove(group.children[0]);
        }
        group.add(newObject);
    }

    /**
     * Handles errors during GLTF loading by creating a fallback mesh.
     * @param {object} levelConfig - Configuration for this LOD level.
     * @param {THREE.Group} targetGroup - The group to add the fallback mesh to.
     */
    _handleGltfLoadError(levelConfig, targetGroup) {
        const fallbackSize = levelConfig.size || this.size || 20;
        const fallbackColor = levelConfig.color || this.color || 0xff0000;
        const fallbackMesh = this._createMeshForLevel({
            shape: 'box',
            size: fallbackSize,
            color: fallbackColor,
        });

        // Clear existing children before adding the fallback mesh
        this._replaceGroupChildren(targetGroup, fallbackMesh);

        // Update bounding sphere if this is the main LOD level
        const lodLevelEntry = this.mesh.levels.find(l => l.object === targetGroup);
        if (lodLevelEntry?.distance === 0) {
            this.updateBoundingSphere();
        }
    }

    updateBoundingSphere() {
        if (!this._boundingSphere) this._boundingSphere = new THREE.Sphere();

        // Get the primary LOD level object
        const objectToBound = this.mesh.levels.length > 0
            ? this.mesh.levels[0].object
            : null;

        if (objectToBound) {
            const box = new THREE.Box3();
            // Compute bounding box in world coordinates, traversing all children
            box.setFromObject(objectToBound, true);

            // Validate bounding box
            if (this._isValidBoundingBox(box)) {
                const size = new THREE.Vector3();
                box.getSize(size);
                // The radius should be half the length of the diagonal of the bounding box
                this._boundingSphere.radius = size.length() / 2;
                // The center of the bounding sphere should be the node's position
                this._boundingSphere.center.copy(this.position);
            } else {
                // Fallback if bounding box computation failed or resulted in invalid values
                this._useFallbackBoundingSphere();
            }
        } else {
            // Fallback if no mesh or LOD levels are available
            this._useFallbackBoundingSphere();
        }
    }

    /**
     * Checks if a bounding box is valid (not empty and contains finite values).
     * @param {THREE.Box3} box - The bounding box to validate.
     * @returns {boolean} True if the box is valid, false otherwise.
     */
    _isValidBoundingBox(box) {
        return (
            box &&
            !box.isEmpty() &&
            isFinite(box.min.x) &&
            isFinite(box.max.x)
        );
    }

    /**
     * Sets the bounding sphere to a fallback value based on node size.
     */
    _useFallbackBoundingSphere() {
        this._boundingSphere.radius = (this.size || 50) / 2;
        this._boundingSphere.center.copy(this.position);
    }

    _createLabel() {
        const styleData = {
            color: 'var(--sg-node-text)',
            backgroundColor: 'var(--sg-label-bg, rgba(10, 10, 20, 0.75))',
            fontSize: '14px',
        };
        return createCSS3DLabelObject(
            this.data.label,
            this.id,
            'node-label-3d',
            styleData,
            'shape-label'
        );
    }

    update(space) {
        if (this.mesh) this.mesh.position.copy(this.position);
        if (this.labelObject) {
            const offset = this.getBoundingSphereRadius() * 1.1 + 10;
            this.labelObject.position.copy(this.position).y += offset;
            if (space?._cam) this.labelObject.quaternion.copy(space._cam.quaternion);
            applyLabelLOD(this.labelObject, this.data.labelLod, space);
        }
    }

    getBoundingSphereRadius() {
        // If bounding sphere hasn't been computed or is invalid for GLTF, recompute or use fallback
        if (
            !this._boundingSphere ||
            (this.shape === 'gltf' &&
                this.mesh?.children.length === 0 &&
                this._boundingSphere.radius === 0)
        ) {
            this.updateBoundingSphere();
        }
        return this._boundingSphere?.radius ?? this.size / 2;
    }

    setSelectedStyle(selected) {
        this.isSelected = selected;
        if (this.mesh instanceof THREE.LOD) {
            this.mesh.levels.forEach(level => {
                level.object?.traverse(child => {
                    if (child.isMesh && child.material) {
                        child.material.emissive?.setHex(selected ? 0xffff00 : 0x000000);
                        child.material.emissiveIntensity =
                            selected && child.material.emissive?.getHex() !== 0x000000 ? 1.0 : 0.0;
                    }
                });
            });
        }
        this.labelObject?.element?.classList.toggle('selected', selected);
        if (selected && this.isHovered) this.setHoverStyle(false, true);
    }

    setHoverStyle(hovered, force = false) {
        if (!force && this.isSelected) return;

        this.isHovered = hovered;

        if (this.mesh instanceof THREE.LOD) {
            this.mesh.levels.forEach(level => {
                level.object?.traverse(child => {
                    if (child.isMesh && child.material) {
                        const targetEmissive = hovered && !this.isSelected ? 0x222200 : 0x000000;
                        const targetIntensity = hovered && !this.isSelected ? 0.4 : 0.0;
                        child.material.emissive?.setHex(targetEmissive);
                        child.material.emissiveIntensity = targetEmissive !== 0x000000 ? targetIntensity : 0.0;
                    }
                });
            });
        }
        if (!this.isSelected) this.labelObject?.element?.classList.toggle('hovered', hovered);
    }

    dispose() {
        if (this.mesh) {
            if (this.mesh instanceof THREE.LOD) {
                // Dispose of all LOD level objects
                this.mesh.levels.forEach(level => {
                    this._disposeObject(level.object);
                });
            } else {
                // Dispose of regular mesh
                this._disposeObject(this.mesh);
            }
            this.mesh.parent?.remove(this.mesh);
            this.mesh = null;
        }

        this.labelObject?.element?.remove();
        this.labelObject = null;
        super.dispose();
    }

    /**
     * Disposes of a THREE.js object and all its children.
     * @param {THREE.Object3D} object - The object to dispose.
     */
    _disposeObject(object) {
        if (!object) return;

        object.traverse(child => {
            if (child.isMesh) {
                child.geometry?.dispose();
                if (Array.isArray(child.material)) {
                    child.material.forEach(mat => mat.dispose());
                } else {
                    child.material?.dispose();
                }
            }
        });
    }
}
