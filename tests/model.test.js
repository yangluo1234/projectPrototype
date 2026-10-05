import test from 'node:test';
import assert from 'node:assert/strict';
import {Artwork,particlesFor,sizeAt,MIN_SIZE,MAX_SIZE} from '../model.js';
const shape={x:.5,y:.5,size:32,type:'circle',colour:'#ffffff'};
test('growth clamps both ends and is continuous at midpoint',()=>{assert.equal(sizeAt(-1),MIN_SIZE);assert.equal(sizeAt(750),42);assert.equal(sizeAt(1500),MAX_SIZE);assert.equal(sizeAt(9000),MAX_SIZE);});
test('undo traverses clear, bloom and placement without losing original shape',()=>{const a=new Artwork(),s=a.add(shape);a.bloom(s.id);const particles=a.items[0].particles;a.clear();assert.equal(a.items.length,0);a.undo();assert.equal(a.items[0].particles,particles);a.undo();assert.equal(a.items[0].state,'ready');assert.equal(a.items[0].size,32);a.undo();assert.equal(a.items.length,0);assert.equal(a.undo(),false);});
test('bloom is idempotent and creates no duplicate history',()=>{const a=new Artwork(),s=a.add(shape);a.bloom(s.id);const n=a.history.length;assert.equal(a.bloom(s.id),null);assert.equal(a.history.length,n);});
test('finished particles retain deterministic positions through clear undo',()=>{const a=new Artwork(),s=a.add(shape);a.bloom(s.id);const snapshot=JSON.stringify(a.items);a.clear();a.undo();assert.equal(JSON.stringify(a.items),snapshot);});
test('triangle direction differs from radial circle and stars are staggered',()=>{const fixed=()=>.5,c=particlesFor(shape,fixed),t=particlesFor({...shape,type:'triangle'},fixed),s=particlesFor({...shape,type:'star'},fixed);assert.ok(c.some(p=>p.dx>0)&&c.some(p=>p.dx<0));assert.ok(t.every(p=>p.dx<0));assert.deepEqual([...new Set(s.map(p=>p.delay))],[0,65,130]);});
test('history is bounded while completed artwork is preserved',()=>{const a=new Artwork();for(let i=0;i<120;i++)a.add(shape);assert.equal(a.history.length,100);assert.equal(a.items.length,120);for(let i=0;i<100;i++)a.undo();assert.equal(a.items.length,20);});

test('shape hit testing rejects empty polygon corners',async()=>{const {contains}=await import('../konvaSetup.js');assert.equal(contains({...shape,type:'triangle'},30,0),false);assert.equal(contains({...shape,type:'triangle'},0,0),true);assert.equal(contains({...shape,type:'star'},30,0),false);assert.equal(contains(shape,30,0),true);});
