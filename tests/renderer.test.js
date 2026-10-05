import test from 'node:test';
import assert from 'node:assert/strict';
import {Renderer} from '../konvaSetup.js';
import {Artwork} from '../model.js';
function context(){return new Proxy({createRadialGradient:()=>({addColorStop(){}})}, {get:(target,key)=>key in target?target[key]:()=>{},set:(target,key,value)=>(target[key]=value,true)});}
const canvas=()=>({width:0,height:0,getContext:()=>context()});
test('1000 finished blooms are appended once, then skipped during live rendering',()=>{
  globalThis.document={createElement:canvas};globalThis.devicePixelRatio=2;
  const r=new Renderer(canvas());r.resize(1280,800);const a=new Artwork();for(let i=0;i<1000;i++){const s=a.add({x:.5,y:.5,type:'circle',size:32,colour:'#fff'});a.bloom(s.id);}
  let calls=0;r.pattern=()=>calls++;r.cache(a.items,new Map());assert.equal(calls,1000);r.cache(a.items,new Map());assert.equal(calls,1000);r.render(a.items,new Map(),null,null,0,false);assert.equal(calls,1000);
  const last=a.add({x:.2,y:.2,type:'star',size:20,colour:'#fff'});a.bloom(last.id);r.cache(a.items,new Map());assert.equal(calls,1001);
  a.undo();r.cache(a.items,new Map());assert.equal(r.ready.length,1);assert.equal(r.cached.size,1000);
  r.resize(390,844);r.cache(a.items,new Map());assert.equal(r.cached.size,1000);assert.equal(r.canvas.width,780);assert.equal(r.canvas.height,1688);
  const output=r.export(a.items);assert.equal(output.width,780);assert.equal(output.height,1688);
  a.clear();r.cache(a.items,new Map());assert.equal(r.cached.size,0);assert.equal(r.ready.length,0);
});
