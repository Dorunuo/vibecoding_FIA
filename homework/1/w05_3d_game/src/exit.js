// C：出口门体、开门视觉与触发区域；只由 session 推进，不直接改变游戏状态。
import * as THREE from 'three';
import { LEVEL } from './level.js';

// 可选内部关卡依赖，兼容原 createExit(scene)。
export function createExit(scene, level = LEVEL) {
  const exit = {
    position: [...level.exit.position],
    approach: [...level.exit.approach],
    size: [...level.exit.size],
  };
  const [width, height, depth] = exit.size;
  const group = new THREE.Group();
  group.name = 'exit-gate';
  group.position.fromArray(exit.position);
  scene.add(group);
  const material = new THREE.MeshStandardMaterial({
    color: 0xb37736, emissive: 0x6c3510, emissiveIntensity: 0.5,
    transparent: true, opacity: 0.85, roughness: 0.6,
  });
  const gate = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  group.add(gate);
  let open = false;
  let lift = 0;
  let disposed = false;

  function render() {
    gate.position.y = height / 2 + lift * height;
    material.color.setHex(open ? 0x63e6cb : 0xb37736);
    material.emissive.setHex(open ? 0x16856f : 0x6c3510);
    material.emissiveIntensity = open ? 1.2 : 0.5;
  }

  function reset() {
    if (disposed) return;
    open = false;
    lift = 0;
    render();
  }

  function setOpen(flag) {
    if (disposed) return;
    open = Boolean(flag);
    render();
  }

  function isOpen() { return open; }

  function update(dt) {
    if (disposed || !Number.isFinite(dt) || dt < 0) return [];
    // 一秒升起一个门高；只使用游戏 dt，暂停时冻结。
    lift = open ? Math.min(1, lift + dt) : Math.max(0, lift - dt);
    render();
    return [];
  }

  // 必须脚底进入 LEVEL.exit 的实际体积；不是走到 approach 或在远处按 E。
  function contains(position) {
    if (disposed || !position || ![position.x, position.y, position.z].every(Number.isFinite)) return false;
    const [x, y, z] = exit.position;
    return Math.abs(position.x - x) <= width / 2 &&
      Math.abs(position.z - z) <= depth / 2 &&
      position.y >= y - 0.05 && position.y < y + height;
    // 仅容忍落地数值误差；仍使用三维体积，楼上一层不能触发三层出口。
  }

  function getSnapshot() {
    return { position: exit.position.slice(), open, lift };
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    scene.remove(group);
    gate.geometry.dispose();
    material.dispose();
    group.clear();
  }

  reset();
  return { reset, setOpen, isOpen, update, contains, dispose, getSnapshot, exit };
}
