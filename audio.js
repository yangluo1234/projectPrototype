import {MIN_SIZE,MAX_SIZE} from './model.js';
export const MAX_VOICES=8;
const CHARACTER={circle:{partials:[1],level:.11,tail:.44,extra:.27,cutoff:1450},triangle:{partials:[1,.18],level:.073,tail:.21,extra:.15,cutoff:2450},star:{partials:[1,.2,.055],level:.087,tail:.78,extra:.4,cutoff:3200}};
export function soundFor(type,burstSize,kind='bloom'){
  const n=Math.max(0,Math.min(1,(burstSize-MIN_SIZE)/(MAX_SIZE-MIN_SIZE))),c=CHARACTER[type];
  const notes=[523.25,440,392,329.63,261.63]; // C major pentatonic, one register.
  return {...c,n,frequency:notes[Math.round(n*4)],duration:kind==='place'?.14:c.tail+n*c.extra,level:kind==='place'?.05:c.level,cutoff:c.cutoff*(1-.3*n)};
}
// Independent voices, bounded allocation and master protection; no music loop.
export class BloomAudio {
  constructor(){this.muted=true;this.volume=.45;this.voices=new Set();this.grow=null;this.ctx=null;this.generation=0;}
  async unlock(){
    if(!this.ctx){
      const AudioContext=window.AudioContext||window.webkitAudioContext;if(!AudioContext)throw new Error('Web Audio unavailable');
      this.ctx=new AudioContext();const c=this.ctx;
      this.bus=c.createGain();this.bus.gain.value=.65;
      this.compressor=c.createDynamicsCompressor();this.compressor.threshold.value=-18;this.compressor.knee.value=12;this.compressor.ratio.value=8;this.compressor.attack.value=.003;this.compressor.release.value=.18;
      this.guard=c.createWaveShaper();this.guard.curve=Float32Array.from({length:2048},(_,i)=>Math.tanh(i/2047*2-1)*.8);this.guard.oversample='2x';
      this.master=c.createGain();this.master.gain.value=this.muted?0:this.volume;
      this.bus.connect(this.compressor).connect(this.guard).connect(this.master).connect(c.destination);
    }
    if(this.ctx.state!=='running')await this.ctx.resume();
  }
  setMuted(value){this.muted=value;if(value)this.stopAll();this.updateMaster();}
  setVolume(value){this.volume=Math.max(0,Math.min(1,value));this.updateMaster();}
  updateMaster(){if(this.ctx){const p=this.master.gain,t=this.ctx.currentTime;p.cancelScheduledValues(t);p.setTargetAtTime(this.muted?0:this.volume,t,.02);}}
  stopVoice(v){if(!v||v.stopped)return;v.stopped=true;const t=this.ctx.currentTime;v.gain.gain.cancelScheduledValues(t);v.gain.gain.setTargetAtTime(0,t,.015);v.oscs.forEach(o=>{try{o.stop(t+.08);}catch{}});}
  stopAll(){this.generation++;this.stopGrow();for(const v of this.voices)this.stopVoice(v);}
  voice(type,freq,duration,level){
    if(this.muted||!this.ctx||this.ctx.state!=='running'||this.voices.size>=MAX_VOICES)return null;
    const c=this.ctx,t=c.currentTime,gain=c.createGain(),filter=c.createBiquadFilter(),character=CHARACTER[type];
    filter.type='lowpass';filter.frequency.value=character.cutoff;filter.Q.value=.5;
    gain.connect(filter).connect(this.bus);const v={gain,filter,oscs:[],stopped:false,remaining:character.partials.length};this.voices.add(v);
    character.partials.forEach((level,i)=>{
      const osc=c.createOscillator(),partial=c.createGain();osc.type=type==='triangle'?'triangle':'sine';
      osc.frequency.value=freq*(type==='star'?[1,2.01,3.98][i]:i+1);partial.gain.value=level;
      osc.connect(partial).connect(gain);osc.start(t);osc.stop(t+duration+.15);v.oscs.push(osc);
      osc.onended=()=>{osc.disconnect();partial.disconnect();if(--v.remaining===0){gain.disconnect();filter.disconnect();this.voices.delete(v);}};
    });
    gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(level,t+(type==='triangle'?.006:type==='star'?.025:.018));gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
    return v;
  }
  play(type,burstSize,kind='bloom'){
    const p=soundFor(type,burstSize,kind),v=this.voice(type,p.frequency,p.duration,p.level);if(!v)return;
    const t=this.ctx.currentTime;v.filter.frequency.setValueAtTime(p.cutoff,t);
    if(type==='circle'&&kind==='bloom'){
      v.oscs[0].frequency.setValueAtTime(p.frequency*.8,t);v.oscs[0].frequency.exponentialRampToValueAtTime(p.frequency*1.08,t+.055);v.oscs[0].frequency.exponentialRampToValueAtTime(p.frequency*.65,t+p.duration*.75);
    }
    if(type==='triangle')v.filter.frequency.exponentialRampToValueAtTime(550,t+p.duration);
  }
  startGrow(type='circle'){
    this.stopGrow();const v=this.voice(type,220,30,.03);if(!v)return;
    const t=this.ctx.currentTime;v.gain.gain.cancelScheduledValues(t);v.gain.gain.setValueAtTime(0,t);v.gain.gain.linearRampToValueAtTime(.03,t+.04);this.grow=v;
  }
  updateGrow(n){if(!this.grow||this.grow.stopped)return;const t=this.ctx.currentTime,f=220*2**Math.max(0,Math.min(1,n));this.grow.oscs.forEach((o,i)=>o.frequency.setTargetAtTime(f*(this.grow.oscs.length===3?[1,2.01,3.98][i]:i+1),t,.025));}
  limit(){if(!this.grow)return;this.updateGrow(1);this.grow.gain.gain.setTargetAtTime(.009,this.ctx.currentTime,.12);}
  stopGrow(){this.stopVoice(this.grow);this.grow=null;}
}
