export const MIN_SIZE = 16, MAX_SIZE = 68, GROW_MS = 1500;
export const PALETTE = [['Rose','#f783af'],['Apricot','#ffab78'],['Butter','#f5d777'],['Lime','#c2df82'],['Mint','#7cdbc1'],['Sky','#86c9ef'],['Lilac','#b4a0ed'],['White','#ffffff']];
export const sizeAt = ms => MIN_SIZE + (MAX_SIZE - MIN_SIZE) * Math.min(1, Math.max(0, ms / GROW_MS));
export function particlesFor(shape, random = Math.random) {
  const count = {circle:14,triangle:12,star:18}[shape.type];
  const direction = random() * Math.PI * 2;
  return Array.from({length:count}, (_,i) => {
    const angle = shape.type === 'triangle' ? direction + (random()-.5)*1.4 : i/count*Math.PI*2 + (random()-.5)*.5;
    const distance = shape.size * (.65 + random()*1.65);
    return {dx:Math.cos(angle)*distance,dy:Math.sin(angle)*distance,size:shape.size*(shape.type==='circle'?.09+random()*.14:.06+random()*.11),rotation:angle+(shape.type==='triangle'?Math.PI/2:0),delay:shape.type==='star'?(i%3)*65:0};
  });
}
export class Artwork {
  constructor(){this.items=[];this.history=[];this.nextId=1;this.revision=0;}
  record(action){this.history.push(action);if(this.history.length>100)this.history.shift();this.revision++;}
  add(shape){const item={...shape,id:this.nextId++,state:'ready'};this.items.push(item);this.record({type:'add',id:item.id});return item;}
  bloom(id){const item=this.items.find(s=>s.id===id);if(!item||item.state!=='ready')return null;const before={...item};item.state='bloom';item.particles=particlesFor(item);this.record({type:'bloom',id,before});return item;}
  clear(){if(!this.items.length)return;this.record({type:'clear',items:this.items.slice()});this.items=[];}
  undo(){const action=this.history.pop();if(!action)return false;if(action.type==='add')this.items=this.items.filter(s=>s.id!==action.id);if(action.type==='bloom'){const i=this.items.findIndex(s=>s.id===action.id);if(i>=0)this.items[i]=action.before;}if(action.type==='clear')this.items=action.items;this.revision++;return true;}
}
