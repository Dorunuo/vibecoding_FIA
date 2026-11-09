// B: yaw=0 looks toward -Z. Mouse deltas are already radians.
import * as THREE from 'three';
import { LEVEL } from './level.js';

export function createFollowCamera({ aspect, obstacles = [] }) {
  const ray = new THREE.Raycaster();
  const camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 200);
  const target = new THREE.Vector3();
  const desired = new THREE.Vector3();
  let yaw = 0;
  let pitch = 0.18;
  function place(snapshot, dt, immediate = false) {
    const aim = snapshot.position.clone().add(new THREE.Vector3(0, 1.35, 0));
    if (immediate) target.copy(aim);
    else target.lerp(aim, 1 - Math.exp(-14 * dt));
    const offset = new THREE.Vector3(
      Math.sin(yaw) * Math.cos(pitch) * 4.2,
      Math.sin(pitch) * 4.2 + 0.35,
      Math.cos(yaw) * Math.cos(pitch) * 4.2,
    );
    // Shared bounds let us keep the camera inside the current perimeter walls
    // without changing the frozen API. Arbitrary internal-wall occlusion needs
    // an A-approved collider parameter; this is not a general collision system.
    const b = LEVEL.bounds;
    const margin = 0.3;
    let fraction = 1;
    for (const [axis, min, max] of [['x', b.minX + margin, b.maxX - margin], ['z', b.minZ + margin, b.maxZ - margin]]) {
      if (offset[axis] > 0) fraction = Math.min(fraction, Math.max(0, (max - target[axis]) / offset[axis]));
      if (offset[axis] < 0) fraction = Math.min(fraction, Math.max(0, (min - target[axis]) / offset[axis]));
    }
    desired.copy(target).addScaledVector(offset, fraction);
    desired.y = Math.max(snapshot.position.y + 0.3, desired.y);
    const direction = desired.clone().sub(target);
    const distance = direction.length();
    ray.set(target, direction.normalize()); ray.near = 0; ray.far = distance;
    const hit = ray.intersectObjects(obstacles.filter(object => object.visible), false)[0];
    if (hit) desired.copy(target).addScaledVector(direction, Math.max(0.2, hit.distance - 0.25));
    // Position follows a smoothed target, but boundary shortening is immediate.
    camera.position.copy(desired);
    camera.lookAt(target);
  }
  function reset(snapshot) {
    yaw = snapshot.yaw;
    pitch = 0.18;
    place(snapshot, 0, true);
  }
  function update(dt, snapshot, input) {
    yaw = THREE.MathUtils.euclideanModulo(yaw - input.lookX + Math.PI, Math.PI * 2) - Math.PI;
    pitch = THREE.MathUtils.clamp(pitch + input.lookY, -0.12, 1.05);
    place(snapshot, dt);
  }
  function resize(width, height) {
    camera.aspect = Math.max(1, width) / Math.max(1, height);
    camera.updateProjectionMatrix();
  }
  return { camera, get yaw() { return yaw; }, reset, update, resize, dispose() {} };
}
