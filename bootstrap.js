
'use strict';
const canvas=document.getElementById('gameCanvas');
const ctx=canvas.getContext('2d');
let W,H,GROUND;
const desktopMode=()=>window.matchMedia('(hover:hover) and (pointer:fine)').matches;
function resizeCanvas(){W=canvas.width=window.innerWidth;H=canvas.height=window.innerHeight;GROUND=desktopMode()?H-36:H-140;}
resizeCanvas();
window.addEventListener('resize',()=>{resizeCanvas();if(gameRunning&&monster)monster.y=Math.min(monster.y,GROUND-monster.h);});

/* ── INPUT ── */
const keys={};
function mapDesktopKey(code){
  if(code==='KeyA')return 'ArrowLeft';
  if(code==='KeyD')return 'ArrowRight';
  if(code==='KeyW'||code==='Space')return 'ArrowUp';
  if(code==='KeyC')return 'KeyS';
  if(code==='KeyR')return 'KeyE';
  return code;
}
window.addEventListener('keydown',e=>{
  const k=mapDesktopKey(e.code);keys[k]=true;
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space'].includes(e.code))e.preventDefault();
  if(e.code==='Escape'&&gameRunning){e.preventDefault();togglePause();}
});
window.addEventListener('keyup',e=>{keys[mapDesktopKey(e.code)]=false;});

function setupBtn(el){
  const k=el.dataset.key;if(!k)return;
  const on=e=>{e.preventDefault();keys[k]=true;el.classList.add('active');};
  const off=e=>{e.preventDefault();keys[k]=false;el.classList.remove('active');};
  el.addEventListener('touchstart',on,{passive:false});
  el.addEventListener('touchend',off,{passive:false});
  el.addEventListener('touchcancel',off,{passive:false});
  el.addEventListener('mousedown',on);el.addEventListener('mouseup',off);el.addEventListener('mouseleave',off);
}
document.querySelectorAll('[data-key]').forEach(setupBtn);

const dpadEl=document.getElementById('dpad');
const dpadKeys=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'];
function clearDpadKeys(){dpadKeys.forEach(k=>{keys[k]=false;});}
dpadEl.addEventListener('touchstart',handleDpadTouch,{passive:false});
dpadEl.addEventListener('touchmove',handleDpadTouch,{passive:false});
dpadEl.addEventListener('touchend',e=>{e.preventDefault();clearDpadKeys();document.querySelectorAll('.dpad-btn').forEach(b=>b.classList.remove('active'));},{passive:false});
dpadEl.addEventListener('touchcancel',e=>{e.preventDefault();clearDpadKeys();},{passive:false});
function handleDpadTouch(e){
  e.preventDefault();
  const rect=dpadEl.getBoundingClientRect();
  const cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;
  const t=e.touches[0];
  const dx=t.clientX-cx,dy=t.clientY-cy;
  const dist=Math.sqrt(dx*dx+dy*dy);
  if(dist<10){clearDpadKeys();return;}
  clearDpadKeys();document.querySelectorAll('.dpad-btn').forEach(b=>b.classList.remove('active'));
  if(Math.abs(dx)>Math.abs(dy)){
    if(dx>0){keys['ArrowRight']=true;document.getElementById('btn-right').classList.add('active');}
    else{keys['ArrowLeft']=true;document.getElementById('btn-left').classList.add('active');}
  }else{
    if(dy>0){keys['ArrowDown']=true;document.getElementById('btn-down').classList.add('active');}
    else{keys['ArrowUp']=true;document.getElementById('btn-up').classList.add('active');}
  }
}

/* ── STATE ── */
let score,lives,level,monster,buildings,particles,enemies,powerups,debris;
let camX=0,worldW=2400,frameT=0;
let comboCount=0,comboTimer=0,shakeTimer=0;
let gameRunning=false;
// Monster progression
let monsterLevel=1,xp=0,xpNext=100;
const GRAVITY=0.52;
let paused=false;
const LEVELS=[
  {name:'CENTRO EM PÂNICO',objective:'Destrua 75% do centro',type:'destroyPct',target:.75,sky:['#050810','#0c1428','#192040'],ground:'#1e1e1e',accent:'#ffcc00',boss:null},
  {name:'ZONA INDUSTRIAL',objective:'Destrua 4 núcleos industriais',type:'targets',target:4,targetLabel:'NÚCLEO INDUSTRIAL',sky:['#10090a','#2a1310','#4a2415'],ground:'#24201c',accent:'#ff8800',boss:null},
  {name:'BASE MILITAR',objective:'Destrua 60% da base e derrote COLOSSO-X',type:'bossPct',target:.60,sky:['#07100a','#122317','#233a28'],ground:'#20271f',accent:'#88cc55',boss:'COLOSSO-X'},
  {name:'PORTO DE GUERRA',objective:'Destrua 5 estruturas do porto',type:'targets',target:5,targetLabel:'ESTRUTURA DO PORTO',sky:['#05101a','#0d2638','#18455b'],ground:'#18252d',accent:'#44aaff',boss:null},
  {name:'MEGACIDADE',objective:'Sobreviva 35 segundos e cause 50% de destruição',type:'survive',target:2100,pct:.50,sky:['#120717','#27102e','#44204e'],ground:'#241d28',accent:'#dd66ff',boss:null},
  {name:'ÁREA ÔMEGA',objective:'Destrua 65% da instalação e derrote TITAN-01',type:'bossPct',target:.65,sky:['#07070c','#141226','#241b42'],ground:'#171724',accent:'#ff3355',boss:'TITAN-01'},
  {name:'DISTRITO NUCLEAR',objective:'Destrua os 4 reatores antes do colapso',type:'targets',target:4,targetLabel:'REATOR',sky:['#06100c','#10261c','#193d2d'],ground:'#18261d',accent:'#55ff88',boss:null},
  {name:'FORTALEZA AÉREA',objective:'Derrube AERON-X e destrua 50% da fortaleza',type:'bossPct',target:.50,sky:['#070d1c','#102954','#164780'],ground:'#152031',accent:'#66ccff',boss:'AERON-X'},
  {name:'CIDADE CONGELADA',objective:'Destrua 70% da cidade e elimine a resistência',type:'destroyEnemies',target:.70,sky:['#07121a','#12304a','#265a76'],ground:'#1b2c34',accent:'#9deaff',boss:null},
  {name:'NÚCLEO FINAL',objective:'Destrua 80% do núcleo e derrote OMEGA PRIME',type:'bossPct',target:.80,sky:['#10030d','#2b0920','#520d35'],ground:'#26121f',accent:'#ff44aa',boss:'OMEGA PRIME'}
];
