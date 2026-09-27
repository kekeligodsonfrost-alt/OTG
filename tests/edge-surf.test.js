import test from 'node:test';
import assert from 'node:assert/strict';
import { mountEdgeSurf } from '../js/games/edge-surf.js';

function fakeGamePlatform(maxTouchPoints=0) {
  const previous = {};
  for (const key of ['navigator','matchMedia','performance','requestAnimationFrame','cancelAnimationFrame','window','localStorage']) {
    previous[key] = Object.getOwnPropertyDescriptor(globalThis,key);
  }
  let time=1000, rafId=0;
  const frames=new Map(), saved=new Map(), windowEvents=new Map();
  const ctx={texts:[],imageSmoothingEnabled:true,transform:null,createLinearGradient(){return {addColorStop(){}}},setTransform(...args){this.transform=args},fillRect(){},beginPath(){},ellipse(){},arc(){},fill(){},stroke(){},roundRect(){},moveTo(){},lineTo(){},quadraticCurveTo(){},closePath(){},save(){},restore(){},translate(){},rotate(){},scale(){},fillText(text){this.texts.push(String(text))}};
  class Element { constructor(){this.style={};this.listeners=new Map();this.classList={add(){},remove(){}};this.value=0;this.textContent=''} addEventListener(type,fn){const a=this.listeners.get(type)||[];a.push(fn);this.listeners.set(type,a)} removeEventListener(type,fn){this.listeners.set(type,(this.listeners.get(type)||[]).filter(x=>x!==fn))} emit(type,event={}){for(const fn of this.listeners.get(type)||[])fn(event)} }
  const canvas=new Element();canvas.width=960;canvas.height=540;canvas.getContext=()=>ctx;canvas.getBoundingClientRect=()=>({left:0,top:0,width:960,height:540});canvas.focus=()=>{};canvas.setPointerCapture=()=>{};
  const progress=new Element(),status=new Element(),controls=new Element(),menuControls=new Element(),raceControls=new Element();controls.hidden=!maxTouchPoints;menuControls.hidden=false;raceControls.hidden=true;const menuButtons=['previous','start','next','settings'].map(action=>{const button=new Element();button.dataset={surfMenu:action};return button});menuControls.querySelectorAll=()=>menuButtons;controls.querySelectorAll=()=>[];controls.querySelector=selector=>selector==='.surf-menu-controls'?menuControls:selector==='.surf-race-controls'?raceControls:null;
  const panel=new Element();panel.innerHTML='';panel.querySelector=selector=>({'canvas':canvas,'#surf-course-progress':progress,'#surf-live-status':status,'.surf-mobile-controls':controls}[selector]||null);
  const define=(key,value)=>Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});
  define('navigator',{maxTouchPoints});define('matchMedia',()=>({matches:false}));define('performance',{now:()=>time});define('requestAnimationFrame',fn=>{const id=++rafId;frames.set(id,fn);return id});define('cancelAnimationFrame',id=>frames.delete(id));
  define('window',{addEventListener(type,fn){const list=windowEvents.get(type)||[];list.push(fn);windowEvents.set(type,list)},removeEventListener(type,fn){windowEvents.set(type,(windowEvents.get(type)||[]).filter(x=>x!==fn))},dispatch(type,event){for(const fn of windowEvents.get(type)||[])fn(event)}});
  define('localStorage',{getItem(key){return saved.get(key)||null},setItem(key,value){saved.set(key,String(value))}});
  const tick=(ms=40)=>{time+=ms;const pending=[...frames.values()];frames.clear();for(const fn of pending)fn(time)};
  const click=(x,y)=>canvas.emit('pointerdown',{pointerType:'mouse',clientX:x,clientY:y,preventDefault(){}});
  const key=(type,key)=>window.dispatch(type,{key,preventDefault(){}});
  const restore=()=>{for(const [key,descriptor]of Object.entries(previous)){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key]}};
  return {panel,canvas,ctx,progress,saved,tick,click,key,restore,controls,menuControls,raceControls,menuButtons};
}

test('Edge Surf menu, level selector, race, progress, finish time, and saved best time work',()=>{
  const env=fakeGamePlatform();let result=null,started=0;let session;
  try {
    session=mountEdgeSurf({panel:env.panel,game:{category:'Arcade'},finish:value=>result=value,sound(){},onStart(){started++}});
    env.tick();assert.equal(env.canvas.width,480);assert.equal(env.canvas.height,270);assert.equal(env.ctx.imageSmoothingEnabled,false);assert.deepEqual(env.ctx.transform,[0.5,0,0,0.5,0,0]);assert.ok(env.ctx.texts.includes('EDGE SURF'));assert.ok(env.ctx.texts.includes('PALM BAY'));
    env.click(585,420);env.tick();assert.ok(env.ctx.texts.includes('REEF RUN'));
    env.click(370,420);env.tick();assert.ok(env.ctx.texts.includes('PALM BAY'));
    env.click(480,495);assert.equal(started,1);
    for(let i=0;i<80;i++)env.tick();
    env.key('keydown','arrowleft');env.key('keydown','arrowup');
    for(let i=0;i<700&&!result;i++)env.tick();
    assert.ok(result,'the surfer should reach the finish');
    assert.ok(result.finalTime>0);assert.ok(result.elapsed>0);assert.ok(result.score>0);
    assert.equal(env.progress.value,100);assert.equal(Number(env.saved.get('osg-edge-surf-best-v1-0')),result.elapsed);
    assert.ok(env.panel.classList);session.cleanup();
  } finally {session?.cleanup();env.restore()}
});

test('Edge Surf exposes separate touch menu and race controls on touch devices',()=>{
  const env=fakeGamePlatform(1);let session;
  try {
    session=mountEdgeSurf({panel:env.panel,game:{category:'Arcade'},finish(){},sound(){}});
    assert.equal(env.menuControls.hidden,false);assert.equal(env.raceControls.hidden,true);
    env.menuButtons.find(button=>button.dataset.surfMenu==='start').emit('click');
    assert.equal(env.menuControls.hidden,true);assert.equal(env.raceControls.hidden,true);
    for(let i=0;i<80;i++)env.tick();
    assert.equal(env.raceControls.hidden,false);
  } finally {session?.cleanup();env.restore()}
});

test('Edge Surf detects a course collision and removes a life',()=>{
  const env=fakeGamePlatform();const effects=[];let session;
  try {
    session=mountEdgeSurf({panel:env.panel,game:{category:'Arcade'},finish(){},sound:name=>effects.push(name)});
    env.click(480,495);for(let i=0;i<80;i++)env.tick();for(let i=0;i<180;i++)env.tick();
    assert.ok(effects.includes('hit'),'a surfer crossing a mapped hazard should register a collision');
  } finally {session?.cleanup();env.restore()}
});
