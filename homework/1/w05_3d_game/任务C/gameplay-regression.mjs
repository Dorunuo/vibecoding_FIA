// Node 自动回归；不等于真人操作/画面/声音验收。运行：node 任务C/gameplay-regression.mjs
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { readFile } from 'node:fs/promises';
import { createGameSession } from '../src/gameplay.js';
import { createCollectibles, TREASURE_STATE as T } from '../src/collectibles.js';
import { createHazards } from '../src/hazards.js';
import { createExit } from '../src/exit.js';
import { createPlayer } from '../src/player.js';
import { LEVEL } from '../src/level.js';
import { GAME_RULES as R, GAME_STATE as S, GAME_EVENT as E, PLAYER_ACTION as A } from '../src/config.js';
let passed = 0;
async function test(name, fn) { await fn(); console.log(`PASS ${++passed}: ${name}`); }
const snapshot = (x = 0, y = 0, z = 0, extra = {}) => ({ position: new THREE.Vector3(x,y,z), grounded: true, action: A.IDLE, controlLocked: false, ...extra });
const level = (overrides = {}) => ({ floorHeights: [0,-5,-10], playerRadius: 0.45, playerHeight: 1.79,
  treasures: [{ id:'t1', position:[0,0,0] }], hazards: [],
  exit: { position:[10,0,0], approach:[8,0,0], size:[3,3,1] }, ...overrides });
function fakePlayer(initial = snapshot()) {
  let current = initial; const calls = [];
  return { calls, getSnapshot: () => ({ ...current, position:current.position.clone() }),
    playAction(name,duration,options = {}) { calls.push({name,duration,options}); current = { ...current, action:name, controlLocked:options.lockMovement === true }; },
    set(next) { current = next; } };
}
const spike = (damage = 1) => ({ id:'h', type:'static_spikes', trigger_center:[0,0.5,0], trigger_size:[1,1,1], damage });

await test('伤害中断临近完成收集，同帧E不能重启，hurt锁保留', () => {
  const scene = new THREE.Scene(), session = createGameSession({scene,level:level({hazards:[spike()]})});
  const p = fakePlayer(snapshot(1.5)); session.start();
  assert.deepEqual(session.update(0,{interactPressed:true},p.getSnapshot(),p).map(e=>e.type),[E.DIG]);
  session.update(R.collectDuration-0.01,{},p.getSnapshot(),p);
  p.set(snapshot(0,0,0,{action:A.COLLECT,controlLocked:true}));
  const input = Object.freeze({interactPressed:true});
  assert.deepEqual(session.update(0.02,input,p.getSnapshot(),p).map(e=>e.type),[E.HURT]);
  const s = session.getSnapshot(); assert.equal(s.health,R.maxHealth-1); assert.equal(s.collected,0);
  assert.equal(s.treasures[0].state,T.IN_RANGE); assert.equal(s.treasures[0].progress,0);
  assert.equal(p.getSnapshot().action,A.HURT); assert(p.getSnapshot().controlLocked);
  assert.equal(p.calls.at(-1).name,A.HURT);
  session.dispose(); assert.equal(scene.children.length,0);
});

await test('伤害前未锁定旧快照也不能启动采集；致死优先于收集、开门、胜利', () => {
  for (const damage of [1,R.maxHealth]) {
    const session = createGameSession({scene:new THREE.Scene(),level:level({hazards:[spike(damage)],exit:{position:[0,0,0],approach:[0,0,1],size:[3,3,1]}})});
    const p=fakePlayer(); session.start(); const events=session.update(0,{interactPressed:true},p.getSnapshot(),p);
    assert(!events.some(e=>[E.DIG,E.COLLECT,E.EXIT_OPEN,E.WIN].includes(e.type)));
    if(damage===R.maxHealth) {
      assert.deepEqual(events.map(e=>e.type),[E.HURT,E.GAME_OVER]); assert.equal(session.getSnapshot().state,S.GAME_OVER);
      assert.deepEqual(session.update(5,{interactPressed:true},p.getSnapshot(),p),[]);
    }
    session.dispose();
  }
});

await test('临近完成的最后宝藏/出口同帧致死：取消进度且不发collect/open/win', () => {
  const l=level({hazards:[spike(R.maxHealth)],exit:{position:[0,0,0],approach:[0,0,1],size:[3,3,1]}});
  const session=createGameSession({scene:new THREE.Scene(),level:l}),p=fakePlayer(snapshot(1.5)); session.start();
  session.update(0,{interactPressed:true},p.getSnapshot(),p); session.update(R.collectDuration-0.01,{},p.getSnapshot(),p);
  p.set(snapshot(0,0,0,{action:A.COLLECT,controlLocked:true}));
  assert.deepEqual(session.update(0.02,{interactPressed:true},p.getSnapshot(),p).map(e=>e.type),[E.HURT,E.GAME_OVER]);
  assert.equal(session.getSnapshot().treasures[0].progress,0); assert.equal(session.getSnapshot().collected,0); assert(!session.getSnapshot().exitOpen);
  assert.equal(p.getSnapshot().action,A.HURT); session.dispose();
});

await test('离开范围/跌落取消释放collect余锁，但绝不清除hurt锁', () => {
  for (const reason of ['range','fall','hurt']) {
    const c=createCollectibles(new THREE.Scene(),level()), p=fakePlayer();
    c.update(0,{interactPressed:true},p.getSnapshot(),p);
    const next=reason==='range'?snapshot(4,0,0,{action:A.COLLECT,controlLocked:true}):reason==='fall'?snapshot(0,0,0,{grounded:false,action:A.COLLECT,controlLocked:true}):snapshot(0,0,0,{action:A.HURT,controlLocked:true});
    p.set(next); assert.deepEqual(c.update(0.1,{interactPressed:true},next,p),[]);
    assert.equal(c.getStates()[0].progress,0);
    assert.equal(p.getSnapshot().action,reason==='hurt'?A.HURT:A.IDLE);
    assert.equal(p.getSnapshot().controlLocked,reason==='hurt'); c.dispose();
  }
});

await test('收集必须站稳同层按边沿；重复E不重置，完成只计一次；快照隔离', () => {
  const c=createCollectibles(new THREE.Scene(),level()),p=fakePlayer();
  for(const s of [snapshot(0,-5),snapshot(0,0,0,{grounded:false}),snapshot(0,0,0,{controlLocked:true})]) assert.deepEqual(c.update(0,{interactPressed:true},s,p),[]);
  assert.deepEqual(c.update(0,{},snapshot(),p),[]);
  assert.equal(c.update(0,{interactPressed:true},snapshot(),p)[0].type,E.DIG);
  assert.deepEqual(c.update(0.3,{interactPressed:true},p.getSnapshot(),p),[]);
  assert(Math.abs(c.getStates()[0].progress-1/3)<1e-9);
  assert.deepEqual(c.update(0.6,{interactPressed:true},p.getSnapshot(),p).map(e=>e.type),[E.COLLECT]);
  assert.deepEqual(c.update(10,{interactPressed:true},snapshot(),p),[]);
  const states=c.getStates(); states[0].position.x=999; assert.equal(c.getStates()[0].position.x,0); c.dispose();
});

await test('暂停冻结收集/陷阱/门；重置模式、生命、相位、无敌、计时与事件', () => {
  const scene=new THREE.Scene(),session=createGameSession({scene,level:level({hazards:[spike()]})}),p=fakePlayer(snapshot(1.5));
  session.start('DEMO'); session.update(0,{interactPressed:true},p.getSnapshot(),p); session.update(0.3,{},p.getSnapshot(),p);
  session.togglePause(); const before=session.getSnapshot();
  assert.deepEqual(session.update(10,{interactPressed:true},snapshot(),p),[]); assert.deepEqual(session.getSnapshot(),before);
  session.togglePause(); assert.equal(session.update(0.6,{},p.getSnapshot(),p)[0].type,E.COLLECT);
  session.update(1,{},snapshot(),p); assert.equal(session.getSnapshot().health,R.maxHealth-1);
  const count=scene.children.length; session.restart(); assert.equal(scene.children.length,count);
  assert.equal(session.getSnapshot().mode,'DEMO'); assert.equal(session.getSnapshot().health,R.maxHealth);
  assert.equal(session.getSnapshot().exitOpen,false); assert.equal(session.getSnapshot().treasures[0].progress,0);
  assert.equal(session.update(0,{},snapshot(),p)[0].type,E.HURT);
  session.returnToMenu(); assert.equal(session.getSnapshot().state,S.MENU); assert.equal(session.getSnapshot().mode,'HUMAN');
  assert.deepEqual(session.update(1,{},snapshot(),p),[]); session.dispose(); session.dispose(); assert.equal(scene.children.length,0);
});

await test('陷阱三维、扫掠、重叠仅一次、无敌间隔、周期与非法dt', () => {
  const h=createHazards(null,level({hazards:[spike(),{...spike(),id:'h2'}]}));
  assert.deepEqual(h.update(0,snapshot(0,5)),[]); assert.equal(h.update(0.01,snapshot(0,-5)).length,1);
  assert.deepEqual(h.update(R.hurtInvulnerability-0.01,snapshot()),[]);
  assert.equal(h.update(0.01,snapshot()).length,1);
  h.reset(); assert.deepEqual(h.update(NaN,snapshot()),[]); assert.equal(h.update(0,snapshot()).length,1); h.dispose();
  assert.deepEqual(h.update(1,snapshot()),[]);
  const timed=createHazards(null,level({hazards:[{id:'timed',type:'timed',position:[0,0,0],size:[1,1,1],period:2,activeDuration:0.5,damage:1}]}));
  assert.deepEqual(timed.update(0.6,snapshot()),[]); assert.equal(timed.update(1.4,snapshot()).length,1); timed.reset(); assert.equal(timed.update(0,snapshot()).length,1); timed.dispose();
});

await test('出口锁定限频、跨层不触发、集齐开门/胜利各一次与公开胜利动作', () => {
  const session=createGameSession({scene:new THREE.Scene(),level:level()}),p=fakePlayer(); session.start();
  assert.equal(session.update(0,{},snapshot(10),p)[0].type,E.EXIT_LOCKED);
  assert.deepEqual(session.update(0,{interactPressed:true},snapshot(10),p),[]);
  session.update(0,{},snapshot(10,-5),p); assert.equal(session.update(0,{},snapshot(10),p)[0].type,E.EXIT_LOCKED);
  session.update(0,{interactPressed:true},snapshot(),p);
  assert.deepEqual(session.update(R.collectDuration,{},p.getSnapshot(),p).map(e=>e.type),[E.COLLECT,E.EXIT_OPEN]);
  assert.deepEqual(session.update(0,{},snapshot(10,-5),p),[]);
  assert.deepEqual(session.update(0,{},snapshot(10),p).map(e=>e.type),[E.WIN]);
  assert.equal(session.getSnapshot().state,S.WIN); assert.equal(p.calls.at(-1).name,A.VICTORY);
  assert.deepEqual(session.update(10,{},snapshot(10),p),[]); session.dispose();
});

await test('视觉收集清理/重置/销毁恢复材质与光晕，容器不移位；门复位释放资源', () => {
  const scene=new THREE.Scene(),root=new THREE.Group(); root.name='Treasure_t1_Root';
  const material=new THREE.MeshStandardMaterial({emissive:0xffcc00,emissiveIntensity:2});
  const box=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),material); root.add(box);
  const glow=new THREE.Mesh(new THREE.SphereGeometry(0.2),new THREE.MeshBasicMaterial()); glow.name='aura'; root.add(glow);
  const light=new THREE.PointLight(0xffffff,3); root.add(light); scene.add(root);
  const c=createCollectibles(scene,level()),p=fakePlayer(); assert.notEqual(box.material,material);
  c.update(0,{interactPressed:true},snapshot(),p); c.update(0.45,{},p.getSnapshot(),p);
  const marker=c.group.children[0]; assert(marker.position.y>1.4); assert.notEqual(marker.rotation.y,0);
  c.update(0.45,{},p.getSnapshot(),p); assert(!marker.visible); assert(!glow.visible); assert.equal(light.intensity,0); assert.equal(box.material.emissiveIntensity,0);
  assert.deepEqual(root.position.toArray(),[0,0,0]); c.reset(); assert(marker.visible); assert.equal(marker.rotation.y,0); assert(glow.visible); assert.equal(light.intensity,3);
  let cloneDisposed=false; box.material.addEventListener('dispose',()=>cloneDisposed=true);
  c.dispose(); c.dispose(); assert.equal(box.material,material); assert(cloneDisposed); assert(glow.visible); assert.equal(light.intensity,3);
  const gate=createExit(scene,level()); gate.setOpen(true); gate.update(0.4); assert.equal(gate.getSnapshot().lift,0.4);
  const copy=gate.getSnapshot(); copy.position[0]=999; assert.equal(gate.getSnapshot().position[0],10);
  assert(!gate.contains(new THREE.Vector3(10,-5,0))); gate.reset(); assert.equal(gate.getSnapshot().lift,0); assert(!gate.isOpen()); gate.dispose(); gate.dispose(); assert.deepEqual(scene.children,[root]);
  box.geometry.dispose(); material.dispose(); glow.geometry.dispose(); glow.material.dispose();
});

await test('实际R2三层配置：同XZ不同楼层不能挖掘，全部可收集并开门', () => {
  const session=createGameSession({scene:new THREE.Scene(),level:LEVEL}),p=fakePlayer(); session.start();
  for(const definition of LEVEL.treasures) {
    const [x,y,z]=definition.interactionPosition;
    p.set(snapshot(x,y+5,z)); assert(!session.update(0,{interactPressed:true},p.getSnapshot(),p).some(e=>e.type===E.DIG));
    p.set(snapshot(x,y,z)); assert(session.update(0,{interactPressed:true},p.getSnapshot(),p).some(e=>e.type===E.DIG));
    assert(session.update(R.collectDuration,{},p.getSnapshot(),p).some(e=>e.type===E.COLLECT));
  }
  assert.equal(session.getSnapshot().collected,LEVEL.treasures.length); assert(session.getSnapshot().exitOpen); session.dispose();
});

await test('真实B公开接口：最短正idle释放collect，不覆盖hurt；胜利无需update同步姿态', async () => {
  // 从本地读取模型，不启动第二服务器；图像解码为占位，仅验证关节姿态与公开锁。
  globalThis.self=globalThis;
  globalThis.ProgressEvent=class { constructor(type,fields) { Object.assign(this,fields); } };
  globalThis.createImageBitmap=async()=>({width:1,height:1,close(){}});
  const nativeFetch=globalThis.fetch;
  globalThis.fetch=async input => {
    const url=typeof input==='string'?input:input.url;
    if (url.startsWith('blob:') || url.startsWith('data:')) return nativeFetch(input);
    const bytes=await readFile(new URL(`../${url.replace(/^.*\/assets\//,'assets/')}`,import.meta.url));
    return new Response(bytes,{headers:{'Content-Type':'model/gltf-binary','Content-Length':String(bytes.length)}});
  };
  const NativeRequest=globalThis.Request;
  globalThis.Request=class extends NativeRequest { constructor(url,options) { super(new URL(url,'http://local/'),options); } };
  let player;
  try {
    const scene=new THREE.Scene(); player=createPlayer({scene,spawn:{position:[0,0,0],yaw:0}}); await player.ready;
    const c=createCollectibles(scene,level()); c.update(0,{interactPressed:true},player.getSnapshot(),player);
    assert(player.getSnapshot().controlLocked); assert.equal(player.getSnapshot().action,A.COLLECT);
    c.update(0.1,{},snapshot(4,0,0,{action:A.COLLECT,controlLocked:true}),player); assert(!player.getSnapshot().controlLocked); assert.equal(player.getSnapshot().action,A.IDLE);
    player.reset(); c.update(0,{interactPressed:true},player.getSnapshot(),player);
    player.playAction(A.HURT,0.3,{lockMovement:true}); c.cancel(snapshot(),player);
    assert.equal(player.getSnapshot().action,A.HURT); assert(player.getSnapshot().controlLocked);
    const shoulder=scene.getObjectByName('L_Shoulder'); player.playAction(A.VICTORY,1,{lockMovement:true});
    const z=shoulder.rotation.z; assert(Math.abs(z)>2); assert.equal(player.getSnapshot().action,A.VICTORY);
    // 不调用 player.update：模拟 main 在 WIN 后仅 renderer.render 的动作定格。
    scene.updateMatrixWorld(true); assert.equal(shoulder.rotation.z,z); c.dispose();
  } finally { player?.dispose(); globalThis.fetch=nativeFetch; globalThis.Request=NativeRequest; }
});
console.log(`All ${passed} gameplay regression groups passed. Automated logic/geometry only; no human visual/audio acceptance claimed.`);
