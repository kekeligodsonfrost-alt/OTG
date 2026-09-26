class AudioManager{
 constructor(){this.ctx=null;this.enabled=true;this.musicEnabled=true;this.master=.42;this.nodes=[];this.timer=null;this.step=0;this.category='';this.variation=0}
 configure(settings){this.enabled=settings.sound!==false;this.musicEnabled=settings.music!==false;this.master=Number(settings.volume??.42)}
 context(){try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;this.ctx ||= new C();if(this.ctx.state==='suspended')this.ctx.resume();return this.ctx}catch{return null}}
 tone(freq=440,duration=.09,type='sine',gain=.06){const c=this.context();if(!c)return;const osc=c.createOscillator(),amp=c.createGain();osc.type=type;osc.frequency.value=freq;amp.gain.setValueAtTime(gain*this.master,c.currentTime);amp.gain.exponentialRampToValueAtTime(.001,c.currentTime+duration);osc.connect(amp);amp.connect(c.destination);osc.start();osc.stop(c.currentTime+duration)}
 effect(name='tap'){if(!this.enabled)return;const map={tap:[520,.035,'sine',.025],success:[690,.12,'triangle',.07],fail:[180,.18,'sawtooth',.04],record:[880,.22,'sine',.08],eat:[260,.07,'triangle',.055],coin:[940,.09,'triangle',.06]};this.tone(...(map[name]||map.tap))}
 start(category){this.stop();if(!this.musicEnabled)return;const c=this.context();if(!c)return;this.category=category;this.variation=Math.floor(Math.random()*3);const tempo={Reaction:132,Accuracy:92,Vision:82,Memory:76,Math:112,Logic:82,Arcade:145,Fun:118,Speed:138,Luck:105}[category]||104;const scale=category==='Memory'?[220,261.63,329.63,392]:category==='Arcade'?[110,146.83,164.81,220]:[164.81,196,246.94,293.66,369.99];const patterns=[[0,2,1,3,2,1,0,3],[0,1,3,2,1,3,2,0],[0,2,3,1,0,3,1,2]][this.variation];let n=0;this.timer=setInterval(()=>{if(!this.musicEnabled||!this.ctx)return;const ix=patterns[n%patterns.length];this.tone(scale[ix],.16,'triangle',.018);if(n%2===0)this.tone(scale[0]/2,.19,'sine',.026);if(n%4===2)this.tone(80,.035,'square',.013);n++},60000/tempo/2)}
 stop(){if(this.timer){clearInterval(this.timer);this.timer=null}this.category=''}
 setMusic(on){this.musicEnabled=on;if(!on)this.stop()}
 setSound(on){this.enabled=on}
}
export const audio=new AudioManager();
