// Canvas renderer. Finished patterns are cached; only live objects animate.
export function outline(ctx,type,x,y,r,rotation=0){
  ctx.beginPath();if(type==='circle'){ctx.arc(x,y,r,0,Math.PI*2);return;}
  const points=type==='star'?10:3;
  for(let i=0;i<points;i++){const a=-Math.PI/2+rotation+i/points*Math.PI*2,rr=type==='star'&&i%2?r*.45:r;const px=x+Math.cos(a)*rr,py=y+Math.sin(a)*rr;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.closePath();
}
// Exact polygon hit testing avoids blooming through empty star corners.
export function contains(s,x,y){
  if(s.type==='circle')return Math.hypot(x,y)<=s.size+4;
  const points=s.type==='star'?10:3,vertices=[];
  for(let i=0;i<points;i++){const a=-Math.PI/2+i/points*Math.PI*2,r=(s.size+4)*(s.type==='star'&&i%2?.45:1);vertices.push([Math.cos(a)*r,Math.sin(a)*r]);}
  let inside=false;for(let i=0,j=points-1;i<points;j=i++){const [xi,yi]=vertices[i],[xj,yj]=vertices[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;}return inside;
}
export class Renderer {
  constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.static=document.createElement('canvas');this.staticCtx=this.static.getContext('2d');this.dpr=Math.min(devicePixelRatio||1,2);this.tone='dark';this.width=1;this.height=1;this.cached=new Map();this.ready=[];this.active=[];this.cacheTone=null;}
  resize(w,h){this.cached.clear();this.cacheTone=null;this.width=w;this.height=h;this.dpr=Math.min(devicePixelRatio||1,2);for(const c of [this.canvas,this.static]){c.width=Math.round(w*this.dpr);c.height=Math.round(h*this.dpr);}this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);this.staticCtx.setTransform(this.dpr,0,0,this.dpr,0,0);}
  shape(ctx,s,ready=false,scale=1,alpha=1,rotation=0){
    const x=s.x*this.width,y=s.y*this.height,r=s.size*scale;ctx.save();ctx.globalAlpha=alpha;outline(ctx,s.type,x,y,r,rotation);
    if(ready){const g=ctx.createRadialGradient(x-r*.3,y-r*.4,0,x,y,r);g.addColorStop(0,'#ffffff');g.addColorStop(.35,s.colour);g.addColorStop(1,s.colour);ctx.fillStyle=g;}else ctx.fillStyle=s.colour;
    ctx.fill();ctx.strokeStyle=this.tone==='light'?'#49435b99':'#ffffffbd';ctx.lineWidth=ready?1.8:.65;ctx.stroke();
    if(ready){outline(ctx,s.type,x,y,r+5,rotation);ctx.strokeStyle=this.tone==='light'?'#65577855':'#ffffff44';ctx.lineWidth=1;ctx.setLineDash([2,5]);ctx.stroke();}ctx.restore();
  }
  pattern(ctx,s,progress=1,reduced=false){
    const ease=1-(1-progress)**3;
    this.shape(ctx,s,false,(s.type==='circle'?.54:s.type==='triangle'?.4:.38)*(.65+.35*ease),.85,s.type==='triangle'?.35:0);
    for(const p of s.particles){
      const local=reduced?1:Math.max(0,Math.min(1,(progress*700-p.delay)/(700-p.delay))),move=1-(1-local)**3;
      const point={...s,x:s.x+p.dx*move/this.width,y:s.y+p.dy*move/this.height,size:p.size};
      const alpha=s.type==='star'&&!reduced&&progress<1?.35+.6*Math.abs(Math.sin(local*Math.PI*3)):.8;
      if(s.type==='circle'&&progress<1&&!reduced){ctx.save();ctx.globalAlpha=(1-move)*.18;ctx.fillStyle=s.colour;outline(ctx,'circle',point.x*this.width,point.y*this.height,p.size*(1.3+move));ctx.fill();ctx.restore();}
      if(s.type==='triangle'&&progress<1&&!reduced){ctx.save();ctx.globalAlpha=(1-move)*.5;ctx.strokeStyle=s.colour;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(point.x*this.width-p.dx*(1-move)*.25,point.y*this.height-p.dy*(1-move)*.25);ctx.lineTo(point.x*this.width,point.y*this.height);ctx.stroke();ctx.restore();}
      this.shape(ctx,point,false,.25+.75*move,alpha,s.type==='star'?p.rotation+(1-move)*1.5:p.rotation);
    }
  }
  cache(items,animating){
    this.ready=[];this.active=[];const finished=new Map();
    for(const s of items){if(s.state==='ready')this.ready.push(s);else if(animating.has(s.id))this.active.push(s);else finished.set(s.id,s);}
    // Append completed blooms once; undo/clear/background changes rebuild the cache.
    const rebuild=this.cacheTone!==this.tone||[...this.cached].some(([id,s])=>finished.get(id)!==s);
    if(rebuild){this.staticCtx.clearRect(0,0,this.width,this.height);this.cached.clear();}
    for(const [id,s] of finished)if(!this.cached.has(id)){this.pattern(this.staticCtx,s);this.cached.set(id,s);}
    this.cacheTone=this.tone;
  }
  render(items,animations,holding,cursor,now,reduced){
    const c=this.ctx;c.fillStyle=this.tone==='dark'?'#202334':'#f5f2e9';c.fillRect(0,0,this.width,this.height);c.drawImage(this.static,0,0,this.width,this.height);
    for(const s of this.ready)this.shape(c,s,true);
    for(const s of this.active)this.pattern(c,s,Math.min(1,(now-animations.get(s.id))/700),reduced);
    if(holding)this.shape(c,holding.shape,true);
    if(cursor){c.save();c.strokeStyle=this.tone==='dark'?'#ffffff':'#252736';c.lineWidth=1;c.setLineDash([3,4]);c.beginPath();c.arc(cursor.x*this.width,cursor.y*this.height,10,0,Math.PI*2);c.stroke();c.restore();}
  }
  export(items){const out=document.createElement('canvas');out.width=this.canvas.width;out.height=this.canvas.height;const c=out.getContext('2d');c.scale(this.dpr,this.dpr);c.fillStyle=this.tone==='dark'?'#202334':'#f5f2e9';c.fillRect(0,0,this.width,this.height);for(const s of items)if(s.state==='bloom')this.pattern(c,s);for(const s of items)if(s.state==='ready')this.shape(c,s,true);return out;}
}
