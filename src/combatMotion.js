// Presentation timing only. Fight outcomes remain determined by the seeded model.
export const CONTACT = .44;
export const clamp01 = n => Math.min(1, Math.max(0, n));
export const smooth = (a, b, n) => { const x = clamp01((n-a)/(b-a)); return x*x*(3-2*x); };
export const duration = action => ({takedown:1350,recover:1200,turn:1050,clinch:950,pull:850,tear:1150,bite:900,shot:650,approach:650,break:800,kick:900,'kick-miss':900}[action?.type] ?? 780);
export function newPlayback(){return {index:0,elapsed:0,progress:0,time:0,committed:0,done:false};}
export function advancePlayback(clock, ms, speed, rounds){
 if(clock.done||!rounds.length)return clock;
 const dt=Math.max(0,ms)*speed;clock.elapsed+=dt;clock.time+=dt;
 while(clock.elapsed>=duration(rounds[clock.index])){
  clock.elapsed-=duration(rounds[clock.index]);clock.committed=clock.index+1;
  if(clock.index===rounds.length-1){clock.progress=1;clock.elapsed=duration(rounds[clock.index]);clock.done=true;return clock;}
  clock.index++;
 }
 clock.progress=clamp01(clock.elapsed/duration(rounds[clock.index]));
 if(clock.progress>=CONTACT)clock.committed=clock.index+1;
 return clock;
}
export function beat(progress){
 const p=clamp01(progress);
 return {
  windup:smooth(0,.23,p)*(1-smooth(.25,CONTACT,p)),
  extend:smooth(.25,CONTACT,p)*(1-smooth(.53,.91,p)),
  recoil:smooth(CONTACT,.50,p)*(1-smooth(.53,.86,p)),
  impact:smooth(CONTACT,.455,p)*(1-smooth(.46,.62,p)),
  travel:smooth(.12,.87,p),
  settle:smooth(.27,.90,p),
  tug:smooth(.44,.58,p)*(1-smooth(.68,.92,p)),
 };
}
export function heading(index,seed=0){
 // A reproducible arc around the encounter, so replay keeps the same footwork.
 return .25*Math.sin(index*.69+(seed%11)*.31)+.09*Math.sin(index*1.3);
}
