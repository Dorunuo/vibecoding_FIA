// Actual main.js boot/animate/global handlers executed in node:vm with boundary mocks.
// No browser/WebGL/audio/DOM acceptance is claimed. Run: node 任务C/main-integration-test.mjs
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { createDemoController } from '../src/demo.js';
import { GAME_STATE, GAME_MODE, GAME_EVENT } from '../src/config.js';
const original = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
// Remove imports only: execute all production lifecycle/control-flow code unchanged.
const executable = original.replace(/^import .*;\r?\n/gm, '').replace('boot().catch(error => {', 'globalThis.booted = boot().catch(error => {');
assert.notEqual(executable, original);
const neutral = () => ({ moveX:0,moveY:0,lookX:0,lookY:0,jumpPressed:false,interactPressed:false,sprintHeld:false,pausePressed:false,cancelPressed:false,confirmPressed:false });
async function harness({route=[{kind:'exit'}]}={}) {
  const log=[], raf=[], windowEvents=new Map(), documentEvents=new Map();
  const canvas={tabIndex:-1,focus(){log.push('focus');}};
  const nodes=new Map(['game-container','start-button','demo-button','menu-screen'].map(id=>[id,{disabled:false,textContent:''}]));
  const level={spawn:{position:[0,0,0],yaw:0},bounds:{},playerRadius:.45,treasures:[],exit:{position:[10,0,0]},demoRoute:route};
  let frame=neutral(), state=GAME_STATE.MENU, mode=GAME_MODE.HUMAN, terminal=null, callbacks, demo;
  const session={
    start(m){log.push('session.start');state=GAME_STATE.PLAYING;mode=m;},
    returnToMenu(){log.push('session.menu');state=GAME_STATE.MENU;mode=GAME_MODE.HUMAN;},
    togglePause(){log.push('session.pause');state=state===GAME_STATE.PLAYING?GAME_STATE.PAUSED:state===GAME_STATE.PAUSED?GAME_STATE.PLAYING:state;},
    getSnapshot(){return {state,mode,treasures:[]};},
    update(){log.push('session.update');if(terminal){state=terminal;terminal=null;return [{type:state===GAME_STATE.WIN?GAME_EVENT.WIN:GAME_EVENT.GAME_OVER}];}return [];},
  };
  const player={ready:Promise.resolve(),reset(){log.push('player.reset');},getSnapshot(){return {position:{x:0,y:0,z:0},grounded:true,controlLocked:false};},update(){log.push('player.update');return [];}};
  const input={reset(){log.push('input.reset');},setEnabled(flag){log.push(`input.enabled:${flag}`);},readFrame(){const next=frame;frame=neutral();return next;},getLastDevice(){return 'keyboard';}};
  const audio={unlock:()=>Promise.resolve(true),reset(){log.push('audio.reset');},play(type){log.push(`audio:${type}`);},getSnapshot:()=>({}),setVolume(){},toggleMute(){}};
  const ui={render(s){log.push(`ui:${s.state}`);},announce(message,kind){log.push(`toast:${kind}:${message}`);},setInputDevice(){}};
  const environment={ready:Promise.resolve(),scene:{},colliders:[],surfaces:[],cameraObstacles:[],reset(){log.push('environment.reset');},update(){log.push('environment.update');},resize(){},renderer:{domElement:canvas,render(){log.push('render');}}};
  const context=vm.createContext({
    console:{warn(message){log.push(`warn:${message}`);},error(error){throw error;}},
    GAME_STATE,GAME_MODE,GAME_EVENT,LEVEL:level,
    THREE:{Clock:class{getDelta(){return 1/60;}}},
    document:{hidden:false,getElementById:id=>nodes.get(id),querySelector:()=>null,addEventListener:(type,fn)=>documentEvents.set(type,fn)},
    window:{innerWidth:800,innerHeight:600,addEventListener:(type,fn)=>windowEvents.set(type,fn)},
    requestAnimationFrame(fn){raf.push(fn);},
    createEnvironment:()=>environment,createInput:()=>input,createPlayer:()=>player,
    createFollowCamera:()=>({camera:{},yaw:0,reset(){log.push('camera.reset');},update(){log.push('camera.update');},resize(){}}),
    createAudio:()=>audio,createGameSession:()=>session,
    createDemoController(args){demo=createDemoController(args);return demo;},
    createUI(c){callbacks=c;return ui;},
  });
  vm.runInContext(executable,context,{filename:'src/main.js'}); await context.booted;
  assert.equal(raf.length,1,'exactly one initial animation callback'); log.length=0;
  return {log,session,demo,callbacks,document:context.document,
    forceState(s,m=GAME_MODE.DEMO){state=s;mode=m;},terminal(s){terminal=s;},
    event(type){const fn=windowEvents.get(type)??documentEvents.get(type);assert(fn,`registered ${type}`);fn();},
    tick(next={}){frame={...neutral(),...next};assert.equal(raf.length,1,'one scheduled frame before tick');raf.shift()();assert.equal(raf.length,1,'exactly one frame rescheduled');},
  };
}
let passed=0;
async function test(name,fn){await fn();console.log(`PASS ${++passed}: ${name}`);}
await test('Demo WIN/GAME_OVER observed in same production frame; later terminal frames do not update player',async()=>{
  for(const terminal of [GAME_STATE.WIN,GAME_STATE.GAME_OVER]){
    const h=await harness();h.callbacks.onDemo();h.log.length=0;h.terminal(terminal);h.tick();
    assert.equal(h.session.getSnapshot().state,terminal);assert(h.demo.isFinished());
    assert.equal(h.demo.getSnapshot().outcome,terminal===GAME_STATE.WIN?'won':'failed');
    assert.equal(h.demo.getSnapshot().elapsed,1/60,'terminal observation consumes zero extra time');
    assert(h.log.includes(`ui:${terminal}`));h.log.length=0;h.tick();
    assert(!h.log.includes('player.update'));assert(!h.log.includes('session.update'));
  }
});
await test('Demo cancel takes priority over pause from PLAYING/PAUSED/WIN/GAME_OVER',async()=>{
  for(const state of [GAME_STATE.PLAYING,GAME_STATE.PAUSED,GAME_STATE.WIN,GAME_STATE.GAME_OVER]){
    const h=await harness();h.callbacks.onDemo();h.forceState(state);h.log.length=0;h.tick({pausePressed:true,cancelPressed:true});
    assert.equal(h.session.getSnapshot().state,GAME_STATE.MENU);assert.equal(h.demo.getSnapshot().outcome,'stopped');
    assert.equal(h.log.filter(x=>x==='session.menu').length,1);assert(!h.log.includes('session.pause'),'cancel must not briefly pause or resume');
    assert(!h.log.includes('player.update'));assert(h.log.includes('input.enabled:false'));assert(h.log.includes('player.reset'));assert(h.log.includes('environment.reset'));
  }
});
await test('Human Esc pauses/resumes; Demo Start pauses without cancel; paused dt frozen',async()=>{
  for(const demo of [false,true]){
    const h=await harness();h.callbacks[demo?'onDemo':'onStart']();h.tick();const before=h.demo.getSnapshot();h.log.length=0;
    h.tick({pausePressed:true,cancelPressed:!demo});assert.equal(h.session.getSnapshot().state,GAME_STATE.PAUSED);
    assert(h.log.indexOf('input.reset')<h.log.indexOf('session.pause'));assert(h.log.indexOf('audio.reset')<h.log.indexOf('session.pause'));assert(!h.log.includes('player.update'));
    h.tick();assert.deepEqual(h.demo.getSnapshot(),before,'pause must freeze all Demo timers');
    h.tick({pausePressed:true});assert.equal(h.session.getSnapshot().state,GAME_STATE.PLAYING);assert(h.log.includes('focus'));
  }
});
await test('Restart resets route/outcome/timers and preserves Demo mode; menu then human does not consume Demo',async()=>{
  const h=await harness();h.callbacks.onDemo();h.tick();assert(h.demo.getSnapshot().elapsed>0);h.callbacks.onRestart();
  assert.equal(h.session.getSnapshot().mode,GAME_MODE.DEMO);assert.equal(h.demo.getSnapshot().elapsed,0);assert.equal(h.demo.getSnapshot().index,0);
  assert(h.log.includes('player.reset'));assert(h.log.includes('environment.reset'));assert(h.log.includes('audio.reset'));assert(h.log.includes('input.reset'));
  h.callbacks.onMenu();assert.equal(h.demo.getSnapshot().outcome,'stopped');h.callbacks.onStart();const before=h.demo.getSnapshot();h.tick();
  assert.equal(h.session.getSnapshot().mode,GAME_MODE.HUMAN);assert.deepEqual(h.demo.getSnapshot(),before);
});
await test('Route errors return/reset before menu render, then toast, then renderer; no player update or duplicate RAF',async()=>{
  for(const route of [[],[{kind:'not-allowed'}],[{kind:'move',target:[NaN,0,0]}]]){
    const h=await harness({route});h.callbacks.onDemo();h.log.length=0;h.tick();
    assert.equal(h.session.getSnapshot().state,GAME_STATE.MENU);assert.equal(h.demo.getSnapshot().outcome,'failed');assert(h.demo.getSnapshot().failure);
    assert(!h.log.includes('player.update'));assert(!h.log.includes('session.update'));
    const menu=h.log.indexOf('session.menu'),ui=h.log.indexOf('ui:MENU'),toast=h.log.findIndex(x=>x.startsWith('toast:error:')),render=h.log.indexOf('render');
    assert(menu>=0&&ui>menu&&toast>ui&&render>toast,JSON.stringify(h.log));
    assert(h.log.includes('player.reset'));assert(h.log.includes('input.enabled:false'));
  }
});
await test('window blur human pause only; document hidden pauses both and resets input',async()=>{
  for(const demo of [false,true]){
    const h=await harness();h.callbacks[demo?'onDemo':'onStart']();h.log.length=0;h.event('blur');
    assert.equal(h.session.getSnapshot().state,demo?GAME_STATE.PLAYING:GAME_STATE.PAUSED);assert(h.log.includes('input.reset'));
    if(!demo)h.callbacks.onResume();h.document.hidden=true;h.log.length=0;h.event('visibilitychange');
    assert.equal(h.session.getSnapshot().state,GAME_STATE.PAUSED);assert(h.log.includes('audio.reset'));assert(h.log.includes('input.reset'));
  }
});
console.log(`All ${passed} production-main VM integration groups passed. Boundary mocks only: not browser/visual/audio acceptance.`);
