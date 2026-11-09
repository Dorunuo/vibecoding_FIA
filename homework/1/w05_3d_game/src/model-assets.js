// Local glTF loader. The standalone build injects embedded data URLs through
// this module only; game state is never stored on a global object.
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const EMBEDDED_MODELS = {}; // build-browser.mjs replaces this initializer.
export function loadModel(path) {
  return new GLTFLoader().loadAsync(EMBEDDED_MODELS[path] || path);
}
export function disposeModel(root) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  root.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (!material) continue;
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    }
  });
  geometries.forEach(item => item.dispose());
  textures.forEach(item => item.dispose());
  materials.forEach(item => item.dispose());
}
