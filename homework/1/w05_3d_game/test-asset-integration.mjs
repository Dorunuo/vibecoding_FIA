// Geometry/controller regression only; image decoding is stubbed, not visual QA.
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { readFileSync } from 'node:fs';
import { createPlayer } from './src/player.js';
globalThis.self = globalThis;
globalThis.ProgressEvent = class { constructor(type, fields) { Object.assign(this, fields); } };
globalThis.createImageBitmap = async () => ({ width: 1, height: 1, close() {} });
const NativeRequest = globalThis.Request;
globalThis.Request = class extends NativeRequest { constructor(url, options) { super(new URL(url, 'http://127.0.0.1:5173/'), options); } };
const manifest = JSON.parse(readFileSync(new URL('assets/level-manifest.json', import.meta.url)));
const scene = new THREE.Scene();
const mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
const surfaces = [];
for (const tile of manifest.floor_tiles) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(...tile.size), mat);
  m.position.fromArray(tile.center); m.updateMatrixWorld(); surfaces.push(m);
}
for (const stair of manifest.stairs) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(stair.ramp_corners.flat(), 3));
  g.setIndex([0, 1, 2, 0, 2, 3]); g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat); m.updateMatrixWorld(); surfaces.push(m);
}
const colliders = manifest.colliders.map(e => {
  const [x,y,z] = e.center, [w,h,d] = e.size;
  return { minX:x-w/2, maxX:x+w/2, minY:y-h/2, maxY:y+h/2, minZ:z-d/2, maxZ:z+d/2 };
});
const player = createPlayer({ scene, spawn: { position: manifest.spawn, yaw: 0 } });
await player.ready;
assert(scene.getObjectByName('ExplorerRoot'));
assert(Math.abs(new THREE.Box3().setFromObject(player.group).getSize(new THREE.Vector3()).y - 1.79) < 0.03);
const frame = { moveX:0, moveY:0, lookX:0, lookY:0, jumpPressed:false, sprintHeld:false };
const world = { cameraYaw:0, bounds:{ minX:-25,maxX:25,minZ:-15,maxZ:15 }, playerRadius:0.62, colliders, surfaces };
for(let i=0;i<60;i++) player.update(1/60,frame,world);
assert(Math.abs(player.getSnapshot().position.y)<0.01);
for(const stair of manifest.stairs) {
  const [x,y,z] = stair.top;
  player.reset({position:[x,y,z],yaw:0});
  const direction = stair.bottom[2] < z ? 1 : -1;
  for(let i=0;i<180;i++)player.update(1/60,{...frame,moveY:direction},world);
  console.log(stair.name,player.getSnapshot().position.toArray());
  assert(player.getSnapshot().position.y<y-4.5,'stairs descend');
  const bottom=stair.bottom;
  player.reset({position:bottom,yaw:0});
  for(let i=0;i<180;i++)player.update(1/60,{...frame,moveY:-direction},world);
  assert(player.getSnapshot().position.y>y-0.5,'stairs ascend');
}
player.reset({position:manifest.holes[0].center,yaw:0});
for(let i=0;i<100;i++)player.update(1/60,frame,world);
assert(player.getSnapshot().position.y<-4.5,'hole drops');
for (const yaw of [0, Math.PI/2, Math.PI, -Math.PI/2]) {
  player.reset({position:manifest.spawn,yaw});
  const origin=player.getSnapshot().position.clone();
  const freeWorld={...world,cameraYaw:yaw,colliders:[]};
  for(let i=0;i<20;i++)player.update(1/60,{...frame,moveY:1},freeWorld);
  player.group.updateMatrixWorld(true);
  const delta=player.getSnapshot().position.clone().sub(origin).setY(0).normalize();
  const asset=scene.getObjectByName('ExplorerRoot');
  const front=new THREE.Vector3(0,0,1).transformDirection(asset.matrixWorld).setY(0).normalize();
  assert(front.dot(delta)>0.99,'imported +Z front must agree with movement');
}
player.dispose();
console.log('PASS: imported character joints/height, spawn floor, both stair descents/ascents, hole fall and imported mesh front vs movement in four camera directions.');
