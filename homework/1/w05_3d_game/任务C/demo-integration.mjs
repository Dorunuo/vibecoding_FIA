// Real B controller + real C session, manifest collision/support, no teleport during run.
import './node-assets.mjs';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { LEVEL } from '../src/level.js';
import { createPlayer } from '../src/player.js';
import { createGameSession } from '../src/gameplay.js';
import { createDemoController } from '../src/demo.js';
const manifest = JSON.parse(await readFile(new URL('../assets/level-manifest.json', import.meta.url)));
const scene = new THREE.Scene(), material = new THREE.MeshBasicMaterial({side: THREE.DoubleSide});
const surfaces = manifest.floor_tiles.map(t => { const mesh = new THREE.Mesh(new THREE.BoxGeometry(...t.size), material); mesh.position.fromArray(t.center); mesh.updateMatrixWorld(); return mesh; });
for (const stair of manifest.stairs) {
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(stair.ramp_corners.flat(),3)); g.setIndex([0,1,2,0,2,3]); g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, material); mesh.updateMatrixWorld(); surfaces.push(mesh);
}
const colliders = manifest.colliders.map(c => { const [x,y,z]=c.center,[w,h,d]=c.size; return { minX:x-w/2,maxX:x+w/2,minY:y-h/2,maxY:y+h/2,minZ:z-d/2,maxZ:z+d/2 }; });
const player = createPlayer({scene,spawn:LEVEL.spawn}); await player.ready;
const session = createGameSession({scene,level:LEVEL});
const demo = createDemoController({level:LEVEL,session});
for (const [dt,yaw] of [[1/60,0],[1/30,Math.PI/2],[1/120,-1.3],[1/20,2.4]]) {
  player.reset(LEVEL.spawn); session.start('DEMO'); demo.reset();
  const events=[]; let oldIndex=-1, previous=player.getSnapshot().position;
  for (let i=0;i<Math.ceil(121/dt);i++) {
    const frame=demo.readFrame(player.getSnapshot(),yaw,dt);
    if(demo.getSnapshot().failure) throw new Error(JSON.stringify({demo:demo.getSnapshot(),player:player.getSnapshot()}));
    player.update(dt,frame,{colliders,surfaces,bounds:LEVEL.bounds,playerRadius:LEVEL.playerRadius,cameraYaw:yaw});
    const p=player.getSnapshot();
    assert(p.position.distanceTo(previous)<0.7,'no teleport'); previous=p.position;
    events.push(...session.update(dt,frame,p,player));
    const index=demo.getSnapshot().index;
    if(process.env.TRACE_DEMO && index!==oldIndex)console.log('step',index,p.position.toArray()); oldIndex=index;
    if(session.getSnapshot().state!=='PLAYING')break;
  }
  assert.equal(session.getSnapshot().state,'WIN'); assert.equal(session.getSnapshot().health,3);
  assert.equal(events.filter(e=>e.type==='dig').length,3); assert.equal(events.filter(e=>e.type==='collect').length,3);
  assert.equal(events.filter(e=>e.type==='exit_open').length,1); assert.equal(events.filter(e=>e.type==='win').length,1);
  demo.readFrame(player.getSnapshot(),yaw,dt); assert.equal(demo.getSnapshot().outcome,'won');
  console.log(`PASS real Demo WIN dt=${dt.toFixed(5)} yaw=${yaw.toFixed(2)} time=${demo.getSnapshot().elapsed.toFixed(2)}s health=3, 3 dig/collect, 1 open/win`);
}
demo.stop(); session.dispose(); player.dispose(); surfaces.forEach(m=>m.geometry.dispose()); material.dispose();
