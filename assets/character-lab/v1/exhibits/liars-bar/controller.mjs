export const DURATIONS={lift:.55,return:.50,play:1.0,response:1.75,cupLift:.62,cupReturn:.5,stow:.55,reach:.36,restore:.86};
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));export const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
export function createState(){return resetState({});}
export function resetState(s){return Object.assign(s,{time:0,action:'idle',actionTime:0,selected:-1,hover:null,mode:'cards',cupState:'table',lookYaw:0,lookPitch:0,lookYawTarget:0,lookPitchTarget:0,activeOpponent:0,played:0,pendingCup:false,previous:{},events:[],eventSerial:0,cards:['K','Q','A','K','A'].map((rank,i)=>({id:'card-'+i,rank,place:'hand'})),dice:[{x:-.67,z:1.47,face:2},{x:-.745,z:1.47,face:5},{x:-.595,z:1.47,face:3},{x:-.67,z:1.395,face:6},{x:-.67,z:1.545,face:1}]});}
const emit=(s,type,extra={})=>{s.events.push({id:++s.eventSerial,type,time:s.time,...extra});if(s.events.length>60)s.events.shift();};
function start(s,action){s.action=action;s.actionTime=0;}
export function advance(s,dt,input={}){
 s.time+=dt;s.actionTime+=dt;s.hover=input.hover??null;
 const attack=!!(input.attack||input.confirm)&&!s.previous.attack,special=!!input.special&&!s.previous.special,cup=!!input.jump&&!s.previous.jump;
 s.previous={attack:!!(input.attack||input.confirm),special:!!input.special,jump:!!input.jump};
 s.lookYawTarget=clamp(s.lookYawTarget+((input.right?1:0)-(input.left?1:0))*dt*.55,-.66,.66);s.lookPitchTarget=clamp(s.lookPitchTarget+((input.down?1:0)-(input.up?1:0))*dt*.45,-.19,.35);
 s.lookYaw+=(s.lookYawTarget-s.lookYaw)*(1-Math.exp(-dt*9));s.lookPitch+=(s.lookPitchTarget-s.lookPitch)*(1-Math.exp(-dt*9));
 if(cup&&['lift','inspect','return','play','response'].includes(s.action))s.pendingCup=true;
 if(s.action==='idle'){
  if(cup||attack&&s.hover==='cup'){s.lookYawTarget=0;s.lookPitchTarget=0;s.cupState='table';start(s,'stow-cards');emit(s,'cloth');}
  else if(attack){const i=s.hover?.startsWith('card-')?Number(s.hover.slice(5)):s.cards.findIndex(c=>c.place==='hand');if(i>=0&&s.cards[i]?.place==='hand'){s.selected=i;s.mode='cards';s.cards[i].place='held';start(s,'lift');emit(s,'card-lift');}}
 }else if(s.action==='inspect'){
  if(special||s.pendingCup){start(s,'return');emit(s,'card-brush');}else if(attack){start(s,'play');emit(s,'cloth');}
 }else if(s.action==='cup-peek'){
  if(special||cup||attack){s.cupState='returning';start(s,'cup-return');}
 }
 if(s.action==='stow-cards'&&s.actionTime>=DURATIONS.stow){s.mode='dice';start(s,'reach-cup');emit(s,'card-brush');}
 else if(s.action==='reach-cup'&&s.actionTime>=DURATIONS.reach){s.cupState='lifting';start(s,'cup-lift');}
 else if(s.action==='return-cards'&&s.actionTime>=DURATIONS.restore){s.mode='cards';start(s,'idle');emit(s,'card-lift');}
 if(s.action==='play'&&s.actionTime>=.43&&!s.events.some(e=>e.type==='card-table'&&e.time>=s.time-s.actionTime)){emit(s,'card-table');}
 if(s.action==='lift'&&s.actionTime>=DURATIONS.lift){start(s,s.pendingCup?'return':'inspect');if(s.pendingCup)emit(s,'card-brush');}
 else if(s.action==='return'&&s.actionTime>=DURATIONS.return){s.cards[s.selected].place='hand';s.selected=-1;if(s.pendingCup){s.pendingCup=false;s.lookYawTarget=0;s.lookPitchTarget=0;start(s,'stow-cards');emit(s,'cloth');}else start(s,'idle');}
 else if(s.action==='play'&&s.actionTime>=DURATIONS.play){s.cards[s.selected].place='table';s.played++;s.selected=-1;start(s,'response');}
 else if(s.action==='response'){
  if(s.actionTime>=.88&&!s.events.some(e=>e.type==='opponent-card'&&e.time>=s.time-s.actionTime)){emit(s,'opponent-card',{opponent:s.activeOpponent});}
  if(s.actionTime>=DURATIONS.response){s.activeOpponent=(s.activeOpponent+1)%3;s.lookYawTarget=[0,-.45,.45][s.activeOpponent];s.lookPitchTarget=-.12;if(s.cards.every(c=>c.place==='table')){s.cards.forEach(c=>c.place='hand');s.played=0;emit(s,'deal');}if(s.pendingCup){s.pendingCup=false;s.lookYawTarget=0;s.lookPitchTarget=0;start(s,'stow-cards');emit(s,'cloth');}else start(s,'idle');}
 }else if(s.action==='cup-lift'&&s.actionTime>=DURATIONS.cupLift){s.cupState='held';start(s,'cup-peek');emit(s,'cup-peek');}
 else if(s.action==='cup-return'&&s.actionTime>=DURATIONS.cupReturn){s.cupState='table';start(s,'return-cards');emit(s,'cup-table');}
}
