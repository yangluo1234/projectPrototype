import {Artwork,PALETTE,MIN_SIZE,MAX_SIZE,GROW_MS,sizeAt} from './model.js';
import {Renderer,contains} from './konvaSetup.js';
import {BloomAudio} from './audio.js';
const $=id=>document.getElementById(id),canvas=$('canvas'),renderer=new Renderer(canvas),art=new Artwork(),audio=new BloomAudio();
const preference=matchMedia('(prefers-reduced-motion: reduce)');
let reduced=preference.matches,type='circle',colour=PALETTE[0][1],holding=null,frame=0,cursor=null,keyboardHolding=false;
const animations=new Map();
const announce=text=>{$('status').textContent=text;};
function controls(){
  $('undo').disabled=!art.history.length;$('clear').disabled=!art.items.length;
  const count=art.items.filter(s=>s.state==='bloom').length;$('count').textContent=`${count} bloom${count===1?'':'s'}`;
}
function refresh(){renderer.cache(art.items,animations);controls();requestDraw();}
function requestDraw(){if(!frame)frame=requestAnimationFrame(draw);}
function draw(now){
  frame=0;
  if(holding){const age=now-holding.started;holding.shape.size=sizeAt(age);audio.updateGrow((holding.shape.size-MIN_SIZE)/(MAX_SIZE-MIN_SIZE));if(age>=GROW_MS&&!holding.limited){holding.limited=true;audio.limit();announce('Full bloom size. Release to place.');}}
  let changed=false;for(const [id,start] of animations)if(now-start>=700||reduced){animations.delete(id);changed=true;}
  if(changed)renderer.cache(art.items,animations);
  renderer.render(art.items,animations,holding,cursor,now,reduced);
  if(animations.size||(holding&&!holding.limited))requestDraw();
}
async function unlock(){if(audio.muted)return;try{await audio.unlock();if(holding&&!audio.grow){audio.startGrow(holding.shape.type);audio.updateGrow((holding.shape.size-MIN_SIZE)/(MAX_SIZE-MIN_SIZE));if(holding.limited)audio.limit();}}catch{audio.setMuted(true);updateAudio();announce('Sound is unavailable. You can keep creating silently.');}}
function updateAudio(){$('mute').setAttribute('aria-pressed',String(audio.muted));$('mute').textContent=audio.muted?'Sound off':'Sound on';$('mute').setAttribute('aria-label',audio.muted?'Enable sound':'Mute sound');}
function startHold(pos,pointerId){
  if(holding)return;holding={pointerId,started:performance.now(),limited:false,shape:{x:pos.x,y:pos.y,size:MIN_SIZE,type,colour}};audio.startGrow(type);void unlock();requestDraw();
}
function endHold(commit){
  if(!holding)return;const current=holding;holding=null;keyboardHolding=false;audio.stopGrow();
  if(current.pointerId!==null&&canvas.hasPointerCapture(current.pointerId))canvas.releasePointerCapture(current.pointerId);
  if(commit){current.shape.size=sizeAt(performance.now()-current.started);art.add(current.shape);sound(current.shape,'place');announce('Shape placed. Tap its glowing outline to bloom.');}
  refresh();
}
function position(event){const r=canvas.getBoundingClientRect();return{x:Math.max(0,Math.min(1,(event.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(event.clientY-r.top)/r.height))};}
function hit(pos){for(let i=art.items.length-1;i>=0;i--){const s=art.items[i];if(s.state==='ready'&&contains(s,(pos.x-s.x)*renderer.width,(pos.y-s.y)*renderer.height))return s;}return null;}
function sound(s,kind='bloom'){if(audio.muted)return;const token=audio.generation;void unlock().then(()=>{if(token===audio.generation)audio.play(s.type,s.size,kind);});}
function bloom(s){if(!s)return;const result=art.bloom(s.id);if(!result)return;if(!reduced){if(animations.size>=24)animations.delete(animations.keys().next().value);animations.set(s.id,performance.now());}sound(s);refresh();announce(`${s.type} bloomed. Undo restores the shape.`);}
canvas.addEventListener('pointerdown',event=>{
  if(event.button!==0||!event.isPrimary||holding)return;event.preventDefault();canvas.focus({preventScroll:true});cursor=null;
  const pos=position(event),target=hit(pos);if(target){bloom(target);return;}
  canvas.setPointerCapture(event.pointerId);startHold(pos,event.pointerId);
});
canvas.addEventListener('pointerup',event=>{if(holding?.pointerId===event.pointerId)endHold(true);});
canvas.addEventListener('pointercancel',event=>{if(holding?.pointerId===event.pointerId)endHold(false);});
canvas.addEventListener('lostpointercapture',event=>{if(holding?.pointerId===event.pointerId)endHold(false);});
canvas.addEventListener('pointermove',event=>{if(event.pointerType==='mouse')canvas.style.cursor=hit(position(event))?'pointer':'crosshair';});
window.addEventListener('blur',()=>{endHold(false);audio.stopAll();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){endHold(false);audio.stopAll();}});
canvas.addEventListener('keydown',event=>{
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' ','Enter','Escape'].includes(event.key))event.preventDefault();
  if(event.key.startsWith('Arrow')){cursor??={x:.65,y:.4};const delta=event.shiftKey?40:12;cursor.x=Math.max(.02,Math.min(.98,cursor.x+({ArrowLeft:-delta,ArrowRight:delta}[event.key]||0)/renderer.width));cursor.y=Math.max(.02,Math.min(.98,cursor.y+({ArrowUp:-delta,ArrowDown:delta}[event.key]||0)/renderer.height));requestDraw();}
  if(event.key===' '&&!event.repeat){cursor??={x:.65,y:.4};keyboardHolding=true;startHold(cursor,null);}
  if(event.key==='Enter'&&!event.repeat){cursor??={x:.65,y:.4};const target=hit(cursor);if(target)bloom(target);else announce('Move the cursor over a glowing shape to bloom it.');}
  if(event.key==='Escape')endHold(false);
});
canvas.addEventListener('keyup',event=>{if(event.key===' '&&keyboardHolding){event.preventDefault();endHold(true);}});
canvas.addEventListener('blur',()=>{if(keyboardHolding)endHold(false);});
function undo(){endHold(false);audio.stopAll();animations.clear();if(art.undo()){refresh();announce('Last action undone.');}}
$('undo').addEventListener('click',undo);
$('clear').addEventListener('click',()=>{endHold(false);audio.stopAll();animations.clear();art.clear();refresh();announce('Canvas cleared. Undo brings it back.');});
document.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'&&!event.shiftKey&&!$('intro').open&&!event.target.closest('input,textarea,[contenteditable=true]')){event.preventDefault();undo();}});
for(const [name,value] of PALETTE){const button=document.createElement('button');button.className='swatch';button.style.setProperty('--colour',value);button.dataset.colour=value;button.setAttribute('aria-label',name);button.setAttribute('aria-pressed',String(value===colour));button.addEventListener('click',()=>{colour=value;for(const b of $('colours').children)b.setAttribute('aria-pressed',String(b===button));});$('colours').append(button);}
for(const button of document.querySelectorAll('[data-shape]'))button.addEventListener('click',()=>{type=button.dataset.shape;for(const b of document.querySelectorAll('[data-shape]'))b.setAttribute('aria-pressed',String(b===button));});
for(const button of document.querySelectorAll('[data-tone]'))button.addEventListener('click',()=>{renderer.tone=button.dataset.tone;document.body.classList.toggle('light',renderer.tone==='light');for(const b of document.querySelectorAll('[data-tone]'))b.setAttribute('aria-pressed',String(b===button));refresh();});
function setMotion(value){reduced=value;$('motion').checked=value;document.body.classList.toggle('reduced',value);if(value)animations.clear();refresh();}
$('motion').addEventListener('change',event=>setMotion(event.target.checked));preference.addEventListener('change',event=>setMotion(event.matches));
function enableSound(){audio.setMuted(false);if(audio.volume===0){audio.setVolume(.45);$('volume').value='45';$('volumeValue').value='45%';}updateAudio();const token=audio.generation;void unlock().then(()=>{if(!audio.muted&&token===audio.generation){audio.play('star',32,'place');announce('Sound enabled. Hold a shape to hear it grow.');}});}
$('mute').addEventListener('click',()=>{if(audio.muted)enableSound();else{audio.setMuted(true);updateAudio();announce('Sound muted.');}});
$('volume').addEventListener('input',event=>{audio.setVolume(Number(event.target.value)/100);$('volumeValue').value=`${event.target.value}%`;});
$('collapse').addEventListener('click',()=>{const expanded=$('collapse').getAttribute('aria-expanded')==='true';$('collapse').setAttribute('aria-expanded',String(!expanded));$('collapse').textContent=expanded?'Show tools +':'Hide tools −';$('tools').hidden=expanded;document.querySelector('.panel').classList.toggle('collapsed',expanded);});
$('save').addEventListener('click',()=>{
  endHold(true);const button=$('save');button.disabled=true;
  try{renderer.export(art.items).toBlob(blob=>{button.disabled=false;if(!blob){announce('Export failed. Please try again.');return;}const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`bubble-bloom-${new Date().toISOString().slice(0,10)}.png`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);announce('PNG ready. Your browser will download the image.');},'image/png');}catch{button.disabled=false;announce('Export failed. Please try a smaller window.');}
});
function enter(sound){if(sound)enableSound();else{audio.setMuted(true);updateAudio();}$('intro').close();canvas.focus({preventScroll:true});announce('Ready to play. Hold on the canvas to grow your first shape.');}
$('startSound').addEventListener('click',()=>enter(true));$('startSilent').addEventListener('click',()=>enter(false));$('skip').addEventListener('click',()=>enter(false));
$('intro').addEventListener('cancel',event=>{event.preventDefault();enter(false);});
$('help').addEventListener('click',()=>{endHold(false);audio.stopAll();$('intro').showModal();});
function resize(){endHold(false);animations.clear();renderer.resize(innerWidth,innerHeight);refresh();}
let resizeFrame=0;window.addEventListener('resize',()=>{if(!resizeFrame)resizeFrame=requestAnimationFrame(()=>{resizeFrame=0;resize();});});resize();setMotion(reduced);updateAudio();if(matchMedia('(max-width:600px),(max-height:620px)').matches)$('collapse').click();$('intro').showModal();
