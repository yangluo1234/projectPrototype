import test from 'node:test';
import assert from 'node:assert/strict';
class Element{
  constructor(){this.handlers={};this.attrs={};this.children=[];this.dataset={};this.style={setProperty(){}};this.classList={toggle(){}};this.tagName='BUTTON';this.value='';this.open=false;this.captures=new Set();}
  addEventListener(type,fn){(this.handlers[type]??=[]).push(fn);}
  emit(type,event={}){for(const fn of this.handlers[type]??[])fn({preventDefault(){},...event});}
  click(){this.emit('click');} setAttribute(k,v){this.attrs[k]=v;}getAttribute(k){return this.attrs[k];}
  append(e){this.children.push(e);}focus(){}showModal(){this.open=true;}close(){this.open=false;}
  getBoundingClientRect(){return {left:0,top:0,width:1000,height:800};}
  setPointerCapture(id){this.captures.add(id);}hasPointerCapture(id){return this.captures.has(id);}releasePointerCapture(id){this.captures.delete(id);this.emit('lostpointercapture',{pointerId:id});}
  getContext(){return new Proxy({createRadialGradient:()=>({addColorStop(){}})}, {get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});}
}
test('pointer release outside, cancel, blur, resize and keyboard release finish or cancel growth',async()=>{
  const nodes=new Map();const get=id=>{if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);};
  const doc=new Element(),win=new Element();doc.body=new Element();doc.getElementById=get;doc.createElement=()=>new Element();doc.querySelectorAll=()=>[];doc.querySelector=()=>get('panel');
  globalThis.document=doc;globalThis.window=win;globalThis.matchMedia=()=>({matches:false,addEventListener(){}});globalThis.innerWidth=1000;globalThis.innerHeight=800;globalThis.devicePixelRatio=1;
  let now=0;globalThis.performance={now:()=>now};let scheduled=[];globalThis.requestAnimationFrame=fn=>{scheduled.push(fn);return scheduled.length;};
  await import('../main.js');const c=get('canvas');const down=(id=1)=>c.emit('pointerdown',{button:0,isPrimary:true,pointerId:id,clientX:700,clientY:200});
  down();assert.equal(c.hasPointerCapture(1),true);now=2000;c.emit('pointerup',{pointerId:1,clientX:2000,clientY:-100});assert.equal(c.hasPointerCapture(1),false);assert.equal(get('undo').disabled,false);
  c.emit('pointerdown',{button:0,isPrimary:true,pointerId:2,clientX:700,clientY:200});assert.equal(get('count').textContent,'1 bloom');get('clear').click();get('undo').click();assert.equal(get('count').textContent,'1 bloom');get('clear').click();
  down(3);c.emit('pointercancel',{pointerId:3});assert.equal(c.hasPointerCapture(3),false);assert.equal(get('clear').disabled,true);
  down(4);win.emit('blur');assert.equal(c.hasPointerCapture(4),false);assert.equal(get('clear').disabled,true);
  down(5);win.emit('resize');const pending=scheduled;scheduled=[];for(const fn of pending)fn(now);assert.equal(c.hasPointerCapture(5),false);assert.equal(get('clear').disabled,true);
  down(6);c.emit('lostpointercapture',{pointerId:6});assert.equal(get('clear').disabled,true);
  c.emit('keydown',{key:' ',repeat:false});now+=100;c.emit('keyup',{key:' '});assert.equal(get('clear').disabled,false);
  get('undo').click();assert.equal(get('clear').disabled,true);
});
