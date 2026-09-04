
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
function levelCfg(){return LEVELS[Math.min(level-1,LEVELS.length-1)];}
function getBoss(){return enemies?enemies.find(e=>!e.dead&&e.type==='boss'):null;}

/* ── MONSTER ── */
function makeMonster(){
  return{x:120,y:0,w:48,h:88,vx:0,vy:0,onGround:false,
    dir:1,hp:100,maxHp:100,
    punchL:0,punchR:0,punchDmgL:false,punchDmgR:false,
    smashTimer:0,climbing:false,climbBuilding:null,
    frame:0,frameTimer:0,crouching:false,
    knockback:0,invincible:0,rage:0,rageCooldown:0,
    walkCycle:0,roarTimer:0,roarCooldown:0,
    // Progression boosts
    dmgMult:1,speedMult:1,hpRegen:0};
}

/* ── BUILDING PALETTES ── */
const PALETTES=[
  ['#4a6a8a','#2d4f6e','#6a8aaa','#3a5a7a'],
  ['#7a5535','#5a3520','#9a7555','#6a4530'],
  ['#4a5a3a','#2a3a2a','#6a7a5a','#3a4a2a'],
  ['#7a6040','#5a4030','#9a8060','#6a5040'],
  ['#5a3a6a','#3a2050','#7a5a8a','#4a2a5a'],
  ['#6a4040','#4a2a2a','#8a6060','#5a3a3a'],
];

function makeBuildings(lvl){
  const list=[];let x=180;
  const count=4+lvl*2;
  for(let i=0;i<count;i++){
    const floors=3+Math.floor(Math.random()*(3+lvl));
    const fw=Math.round(55+Math.random()*50);
    const fh=Math.round(28+Math.random()*12);
    const totalH=floors*fh;
    const hp=floors*20+lvl*15;
    const winCols=Math.max(1,Math.floor((fw-12)/20));
    const pal=PALETTES[i%PALETTES.length];
    // Some buildings have water tanks on top
    const hasTank=Math.random()>0.5;
    list.push({x,y:GROUND-totalH,w:fw,totalH,floors,fh,fw,hp,maxHp:hp,
      winCols,pal,
      damage:Array.from({length:floors},()=>Array(winCols).fill(0)),
      destroyed:false,hasTank,
      fireTimer:0,isFire:false,fireX:0,fireY:0});
    x+=fw+26+Math.floor(Math.random()*55);
  }
  worldW=Math.max(W*2.5,x+300);
  return list;
}

/* ── ENEMIES ── */
function makeEnemies(lvl){
  const list=[];
  const typePool=['soldier','soldier','jeep','helicopter','tank'];
  const count=2+lvl;
  for(let i=0;i<count;i++){
    const t=typePool[Math.min(i,typePool.length-1)];
    const isHeli=t==='helicopter',isJeep=t==='jeep',isTank=t==='tank';
    const w=isJeep?54:isHeli?62:isTank?68:28;
    const h=isJeep?32:isHeli?30:isTank?38:44;
    list.push({x:500+i*350+Math.random()*120,y:isHeli?GROUND-170:GROUND-h,w,h,vx:0,vy:0,dir:-1,
      hp:isTank?120+lvl*25:35+lvl*20,maxHp:isTank?120+lvl*25:35+lvl*20,type:t,dead:false,
      fireTimer:isTank?70:90+Math.random()*80,flying:isHeli,stunTimer:0,frame:0,walkCycle:0});
  }
  if(levelCfg().boss){
    const hp=520+lvl*120;
    list.push({x:Math.max(900,worldW-560),y:GROUND-82,w:104,h:82,vx:0,vy:0,dir:-1,hp,maxHp:hp,type:'boss',dead:false,
      fireTimer:55,flying:false,stunTimer:0,frame:0,walkCycle:0,bossName:levelCfg().boss});
  }
  return list;
}

/* ── PARTICLES ── */
function spawnParticles(x,y,n,col,speed,size,type){
  speed=speed||5;size=size||5;type=type||'spark';
  for(let i=0;i<n;i++){
    const a=Math.random()*Math.PI*2;const s=speed*(0.3+Math.random()*0.7);
    particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-speed*0.3,
      life:25+Math.random()*25,maxLife:50,col,size:size*(0.4+Math.random()*0.8),type});
  }
}
function spawnRubble(x,y,n){
  const cols=['#888','#777','#999','#666','#aaa','#b0702a'];
  for(let i=0;i<n;i++){
    const a=-Math.PI+Math.random()*Math.PI;const s=2+Math.random()*7;
    particles.push({x:x+Math.random()*30-15,y,vx:Math.cos(a)*s,vy:-1-Math.random()*5,
      life:60+Math.random()*30,maxLife:85,col:cols[Math.floor(Math.random()*cols.length)],
      size:3+Math.random()*10,type:'rubble'});
  }
}
function spawnSmoke(x,y,n){
  for(let i=0;i<n;i++){
    particles.push({x:x+Math.random()*20-10,y,vx:(Math.random()-0.5)*0.8,vy:-0.5-Math.random()*1.5,
      life:60+Math.random()*60,maxLife:120,
      col:`rgba(${100+Math.random()*40|0},${100+Math.random()*40|0},${100+Math.random()*40|0},0.6)`,
      size:10+Math.random()*14,type:'smoke'});
  }
}
function spawnBlood(x,y,n){
  for(let i=0;i<n;i++){
    const a=Math.random()*Math.PI*2;const s=2+Math.random()*5;
    particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-3,
      life:20+Math.random()*20,maxLife:40,col:'#cc2200',size:2+Math.random()*4,type:'spark'});
  }
}

/* ── SHAKE ── */
function shake(amt){shakeTimer=Math.max(shakeTimer,amt);}

/* ── SCORE POP ── */
function scorePop(wx,wy,txt,col){
  const el=document.createElement('div');
  el.className='score-pop';el.textContent=txt;
  el.style.left=(wx-camX)+'px';el.style.top=wy+'px';
  el.style.color=col||'#ffcc00';
  document.getElementById('root').appendChild(el);
  setTimeout(()=>el.remove(),860);
}

/* ── KILL NOTIF ── */
let killY=80;
function killNotif(txt){
  const el=document.createElement('div');
  el.className='kill-notif';el.textContent=txt;
  el.style.top=(killY)+'px';killY+=18;if(killY>160)killY=80;
  document.getElementById('root').appendChild(el);
  setTimeout(()=>el.remove(),1200);
}

/* ── COMBO ── */
function addCombo(n){
  comboCount+=(n||1);comboTimer=90;
  if(comboCount>=3){
    const el=document.getElementById('combo-popup');
    el.textContent=comboCount+'x COMBO!';el.style.opacity='1';
    clearTimeout(el._t);el._t=setTimeout(()=>el.style.opacity='0',900);
  }
}

/* ── MONSTER XP / LEVEL ── */
function gainXP(amount){
  xp+=Math.round(amount*(1+monsterLevel*0.1));
  updateUI();
  if(xp>=xpNext){
    xp-=xpNext;xpNext=Math.round(xpNext*1.5);monsterLevel++;
    // Stat boosts
    monster.maxHp+=20;monster.hp=Math.min(monster.hp+20,monster.maxHp);
    monster.dmgMult=(monster.dmgMult||1)+0.15;
    monster.speedMult=(monster.speedMult||1)+0.08;
    spawnParticles(monster.x+monster.w/2,monster.y,20,'#88ffff',6,6,'spark');
    shake(5);
    const lu=document.getElementById('levelup-msg');
    lu.textContent='⬆ PODER UP! Lv.'+monsterLevel;
    lu.classList.add('show');lu.style.opacity='1';
    setTimeout(()=>{lu.classList.remove('show');lu.style.opacity='0';},1800);
    document.getElementById('lvl-badge').textContent='★ MONSTRO Nv.'+monsterLevel;
    document.getElementById('lvl-badge').style.opacity='1';
    updateUI();
  }
}

/* ── UI ── */
function updateUI(){
  document.getElementById('hud-score').textContent=score;
  document.getElementById('hud-level').textContent=level;
  const lv=document.getElementById('hud-lives');lv.innerHTML='';
  for(let i=0;i<lives;i++)lv.innerHTML+='<span class="hud-heart">❤</span>';
  const hpr=Math.max(0,monster.hp/monster.maxHp);
  const hpBar=document.getElementById('hp-bar');
  hpBar.style.width=(hpr*100)+'%';
  hpBar.style.background=hpr>0.6?'linear-gradient(to right,#22cc44,#88ff44)':hpr>0.3?'linear-gradient(to right,#ff8800,#ffcc00)':'linear-gradient(to right,#ff0000,#ff5500)';
  document.getElementById('xp-bar').style.width=((xp/xpNext)*100)+'%';
  // Rage bar
  const rageWrap=document.getElementById('rage-bar-wrap');
  if(monster&&monster.rage>0){
    rageWrap.style.opacity='1';
    document.getElementById('rage-bar-fill').style.width=((monster.rage/300)*100)+'%';
  }else rageWrap.style.opacity='0';
  if(buildings&&enemies){
    const total=buildings.length+enemies.length;
    const done=buildings.filter(b=>b.destroyed).length+enemies.filter(e=>e.dead).length;
    document.getElementById('objective-progress').textContent=Math.round((done/Math.max(1,total))*100)+'% CONCLUÍDO';
    const boss=getBoss(),bw=document.getElementById('boss-wrap');
    if(boss){bw.style.display='block';document.getElementById('boss-name').textContent='☠ '+boss.bossName;document.getElementById('boss-fill').style.width=(Math.max(0,boss.hp/boss.maxHp)*100)+'%';}
    else bw.style.display='none';
  }
}

/* ── GAME FLOW ── */
document.getElementById('startBtn').addEventListener('click',startGame);
document.getElementById('startBtn').addEventListener('touchend',e=>{e.preventDefault();startGame();});

function startGame(){
  document.getElementById('overlay').style.display='none';
  score=0;lives=3;level=1;monsterLevel=1;xp=0;xpNext=100;
  document.getElementById('lvl-badge').style.opacity='0';
  initLevel();
}

function initLevel(){
  monster=makeMonster();
  // Carry over progression boosts
  if(monsterLevel>1){monster.maxHp+=20*(monsterLevel-1);monster.hp=monster.maxHp;monster.dmgMult=1+0.15*(monsterLevel-1);monster.speedMult=1+0.08*(monsterLevel-1);}
  monster.y=GROUND-monster.h;
  buildings=makeBuildings(level);particles=[];enemies=makeEnemies(level);powerups=[];debris=[];
  const cfg=levelCfg();document.getElementById('mission-card').style.display='block';document.getElementById('mission-name').textContent='FASE '+level+' · '+cfg.name;document.getElementById('mission-text').textContent=cfg.objective;document.getElementById('pause-btn').style.display='flex';
  camX=0;frameT=0;comboCount=0;comboTimer=0;killY=80;

  // Powerups
  for(let i=0;i<2+level;i++){
    powerups.push({
      x:250+Math.random()*(worldW-500),y:GROUND-22,
      type:['heal','rage','score','shield'][Math.floor(Math.random()*4)],
      w:26,h:26,collected:false,bob:Math.random()*Math.PI*2
    });
  }
  updateUI();
  const pb=document.getElementById('phase-banner');
  pb.textContent='FASE '+level+' · '+levelCfg().name;pb.style.opacity='1';
  setTimeout(()=>pb.style.opacity='0',1500);
  if(!gameRunning){gameRunning=true;requestAnimationFrame(loop);}
}

/* ── LOOP ── */
let lastTS=0;
function loop(ts){
  const dt=Math.min((ts-lastTS)/16.667,3);lastTS=ts;frameT++;
  if(!paused)update(dt);render();requestAnimationFrame(loop);
}

function update(dt){
  updateMonster(dt);updateEnemies(dt);updateParticles(dt);updatePowerups();
  comboTimer=Math.max(0,comboTimer-dt);if(comboTimer===0)comboCount=0;
  if(shakeTimer>0)shakeTimer=Math.max(0,shakeTimer-dt*1.3);
  // Passive HP regen from level
  if(monster&&monster.onGround&&monster.hpRegen>0&&frameT%60===0){
    monster.hp=Math.min(monster.maxHp,monster.hp+monster.hpRegen);updateUI();
  }
  checkWin();
}

/* ── MONSTER UPDATE ── */
function updateMonster(dt){
  const m=monster;
  m.invincible=Math.max(0,m.invincible-dt);
  m.punchL=Math.max(0,m.punchL-dt);m.punchR=Math.max(0,m.punchR-dt);
  m.knockback=Math.max(0,m.knockback-dt);m.rage=Math.max(0,m.rage-dt);
  m.rageCooldown=Math.max(0,m.rageCooldown-dt);
  m.roarTimer=Math.max(0,m.roarTimer-dt);m.roarCooldown=Math.max(0,m.roarCooldown-dt);
  if(m.smashTimer>0)m.smashTimer-=dt;

  const crouching=keys['ArrowDown']&&m.onGround&&!m.climbing;m.crouching=crouching;
  const spd=(m.rage>0?8:5.5)*(m.speedMult||1);

  if(!m.climbing&&m.knockback<1){
    if(keys['ArrowLeft']){m.vx-=1.15*dt;m.dir=-1;}
    else if(keys['ArrowRight']){m.vx+=1.15*dt;m.dir=1;}
    else m.vx*=Math.pow(0.72,dt);
    m.vx=Math.max(-spd,Math.min(spd,m.vx));
  }else if(m.knockback>=1)m.vx*=Math.pow(0.88,dt);

  if(m.onGround&&Math.abs(m.vx)>0.5)m.walkCycle+=Math.abs(m.vx)*0.11*dt;

  if((keys['ArrowUp']||keys['KeyJ'])&&m.onGround&&!crouching&&!m.climbing){m.vy=-15;m.onGround=false;spawnParticles(m.x+m.w/2,GROUND,6,'#888',3,4,'spark');}
  if((keys['ArrowUp']||keys['KeyJ'])&&m.climbing){m.climbing=false;m.climbBuilding=null;m.vy=-10;m.vx=m.dir*3;}
  if(keys['KeyZ']&&m.punchL<=0){m.punchL=20;m.punchDmgL=false;}
  if(keys['KeyX']&&m.punchR<=0){m.punchR=20;m.punchDmgR=false;}
  if(keys['KeyS']&&m.smashTimer<=0&&m.onGround){m.smashTimer=30;doSmash(m);}
  // ROAR ability
  if(keys['KeyE']&&m.roarCooldown<=0){doRoar(m);}

  if(!m.climbing)m.vy+=GRAVITY*dt;
  m.x+=m.vx*dt;m.y+=m.vy*dt;
  m.x=Math.max(0,Math.min(worldW-m.w,m.x));
  m.onGround=false;
  if(m.y+m.h>=GROUND){
    const fs=m.vy;m.y=GROUND-m.h;m.vy=0;m.onGround=true;m.climbing=false;m.climbBuilding=null;
    if(fs>16){hurtMonster((fs-16)*3);shake(5);spawnParticles(m.x+m.w/2,GROUND,8,'#888',3,4,'spark');}
  }
  if(m.climbBuilding&&m.climbBuilding.destroyed){m.climbing=false;m.climbBuilding=null;}
  for(const b of buildings){
    if(b.destroyed)continue;
    const ov=m.x+m.w>b.x+4&&m.x<b.x+b.fw-4;
    if(ov&&m.y+m.h>=b.y&&m.y+m.h<=b.y+22&&m.vy>=0){m.y=b.y-m.h;m.vy=0;m.onGround=true;m.climbing=false;m.climbBuilding=null;}
    if(!m.onGround&&!m.climbing&&m.x+m.w>=b.x-2&&m.x<=b.x+b.fw+2&&m.y<GROUND-10&&m.y+m.h>b.y){
      if(keys['ArrowLeft']||keys['ArrowRight']){m.climbing=true;m.climbBuilding=b;}
    }
  }
  if(m.climbing&&m.climbBuilding){
    const b=m.climbBuilding;m.vx=0;
    if(keys['ArrowUp'])m.vy=-3.5;else if(keys['ArrowDown'])m.vy=3;else m.vy=0;
    m.x=Math.max(b.x-m.w+4,Math.min(b.x+b.fw-4,m.x));
    if(m.y+m.h<b.y){m.climbing=false;m.climbBuilding=null;}
    if(m.y>GROUND-m.h){m.climbing=false;m.climbBuilding=null;m.y=GROUND-m.h;}
  }
  tryPunch(m,'L',m.punchL,m.punchDmgL,()=>m.punchDmgL=true);
  tryPunch(m,'R',m.punchR,m.punchDmgR,()=>m.punchDmgR=true);
  tryPunchEnemies(m);
  const targetCam=m.x+m.w/2-W/2;
  camX+=(targetCam-camX)*Math.min(0.12*dt,0.25);
  camX=Math.max(0,Math.min(worldW-W,camX));
  m.frameTimer+=dt;if(m.frameTimer>6){m.frame=(m.frame+1)%4;m.frameTimer=0;}
  if(m.y>H+200)loseLife();
}

/* ── ROAR ── */
function doRoar(m){
  if(m.roarCooldown>0)return;
  m.roarTimer=40;m.roarCooldown=300;
  // Stun nearby enemies
  let stunned=0;
  for(const e of enemies){
    if(e.dead)continue;
    const dx=(e.x+e.w/2)-(m.x+m.w/2);
    if(Math.abs(dx)<220){e.stunTimer=120;stunned++;spawnParticles(e.x+e.w/2,e.y,8,'#ffff88',3,4,'spark');}
  }
  // Flash effect
  const fl=document.getElementById('roar-flash');
  fl.style.background='rgba(255,150,0,0.18)';
  setTimeout(()=>fl.style.background='rgba(255,80,0,0)',200);
  // Big particle burst
  for(let i=0;i<4;i++)spawnParticles(m.x+m.w/2,m.y+m.h/2,10,'#ffaa00',8+i*2,5+i,'spark');
  shake(6);
  if(stunned>0)scorePop(m.x+m.w/2,m.y,'RUGIDO!','#ffaa00');
}

/* ── PUNCH BUILDINGS ── */
function tryPunch(m,side,timer,dmgDone,setDone){
  if(timer<=0||dmgDone||timer<12)return;
  const crouching=m.crouching;
  const punchY=crouching?m.y+m.h-25:m.y+24;
  const reach=54;
  const punchX=side==='L'?(m.dir===-1?m.x-reach:m.x-10):(m.dir===1?m.x+m.w+5:m.x+m.w-reach);
  for(const b of buildings){
    if(b.destroyed)continue;
    if(punchX>b.x-28&&punchX<b.x+b.fw+28&&punchY>b.y&&punchY<b.y+b.totalH){
      const fi=Math.max(0,Math.min(b.floors-1,Math.floor((punchY-b.y)/b.fh)));
      const wci=Math.max(0,Math.min(b.winCols-1,Math.floor((punchX-b.x)/(b.fw/Math.max(1,b.winCols)))));
      if(b.damage[fi])b.damage[fi][wci]=Math.min(3,(b.damage[fi][wci]||0)+1);
      const dmg=(crouching?22:12)*(m.rage>0?2:1)*(m.dmgMult||1);
      b.hp-=dmg;score+=10;gainXP(5);
      setDone();addCombo();
      spawnParticles(punchX,punchY,10,'#ccaa88',6,5,'spark');
      spawnRubble(punchX,punchY,4);shake(3);
      if(b.hp<=0&&!b.destroyed)destroyBuilding(b);
      updateUI();break;
    }
  }
}

/* ── SMASH ── */
function doSmash(m){
  spawnParticles(m.x+m.w/2,GROUND,18,'#ff8800',7,7,'spark');
  spawnParticles(m.x+m.w/2,GROUND,6,'#ffcc00',4,5,'spark');
  // Crack effect particles radiating outward
  for(let i=0;i<8;i++){
    const a=(i/8)*Math.PI*2;
    particles.push({x:m.x+m.w/2,y:GROUND,vx:Math.cos(a)*8,vy:Math.sin(a)*3-2,
      life:18,maxLife:18,col:'#885500',size:6,type:'rubble'});
  }
  shake(12);
  for(const b of buildings){
    if(b.destroyed)continue;
    const dx=(m.x+m.w/2)-(b.x+b.fw/2);
    if(Math.abs(dx)<140){
      const dmg=38*(m.rage>0?2:1)*(m.dmgMult||1);
      b.hp-=dmg;score+=25;gainXP(12);addCombo(2);
      spawnRubble(b.x+b.fw/2,b.y+b.totalH*0.5,7);
      if(b.hp<=0&&!b.destroyed)destroyBuilding(b);
    }
  }
  for(const e of enemies){
    if(e.dead||e.flying)continue;
    if(Math.abs((m.x+m.w/2)-(e.x+e.w/2))<160){
      e.hp-=45;e.vy=-6;e.vx=(e.x<m.x)?-4:4;
      if(e.hp<=0){e.dead=true;score+=100;gainXP(40);addCombo(3);killNotif(e.type.toUpperCase()+' DESTRUÍDO!');}
    }
  }
  updateUI();
}

/* ── DESTROY BUILDING ── */
function destroyBuilding(b){
  b.destroyed=true;score+=150+b.floors*30;gainXP(60+b.floors*15);
  spawnRubble(b.x+b.fw/2,b.y+b.totalH*0.4,28);
  spawnParticles(b.x+b.fw/2,b.y+b.totalH/2,20,'#ff8800',8,8,'spark');
  spawnParticles(b.x+b.fw/2,b.y,8,'#ffcc00',4,5,'spark');
  spawnSmoke(b.x+b.fw/2,b.y+b.totalH*0.3,6);
  // Scatter debris
  for(let i=0;i<5;i++){
    debris.push({x:b.x+Math.random()*b.fw,y:b.y+Math.random()*b.totalH*0.5,
      vx:(Math.random()-0.5)*10,vy:-3-Math.random()*6,
      w:8+Math.random()*20,h:8+Math.random()*16,
      col:b.pal[Math.floor(Math.random()*b.pal.length)],
      rot:Math.random()*Math.PI*2,rv:(Math.random()-0.5)*0.3,life:90});
  }
  shake(14);addCombo(5);scorePop(b.x+b.fw/2,b.y,'DESTRUÍDO! +'+Math.round(150+b.floors*30),'#ff8800');
  updateUI();
}

/* ── PUNCH ENEMIES ── */
function tryPunchEnemies(m){
  for(const e of enemies){
    if(e.dead)continue;
    const reach=74;
    const px=m.dir===1?m.x+m.w+10:m.x-10;
    const py=m.y+m.h*0.4;
    if(Math.abs((e.x+e.w/2)-px)<reach&&Math.abs((e.y+e.h/2)-py)<55){
      const punching=(m.punchL>12&&!m.punchDmgL)||(m.punchR>12&&!m.punchDmgR);
      if(punching){
        const dmg=32*(m.rage>0?2:1)*(m.dmgMult||1);
        e.hp-=dmg;e.vx=m.dir*5;e.vy=-4;
        spawnParticles(e.x+e.w/2,e.y+e.h/2,8,'#ff2200',4,4,'spark');
        if(e.type!=='helicopter')spawnBlood(e.x+e.w/2,e.y+e.h*0.4,4);
        m.punchDmgL=true;m.punchDmgR=true;
        score+=60;gainXP(20);addCombo(2);shake(4);
        if(e.hp<=0){e.dead=true;const bossBonus=e.type==='boss'?1200:100;score+=bossBonus;gainXP(e.type==='boss'?250:50);addCombo(e.type==='boss'?10:3);
          spawnParticles(e.x+e.w/2,e.y,18,'#ff4400',6,7,'spark');
          spawnSmoke(e.x+e.w/2,e.y+e.h/2,4);
          killNotif(e.type.toUpperCase()+' ELIMINADO!');
        }
        updateUI();
      }
    }
  }
}

/* ── HURT MONSTER ── */
function hurtMonster(dmg){
  if(monster.invincible>0)return;
  if(monster.shield){monster.shield=false;spawnParticles(monster.x+monster.w/2,monster.y+monster.h/2,8,'#4488ff',4,5,'spark');return;}
  monster.hp-=dmg;monster.invincible=45;monster.knockback=12;monster.vx=-monster.dir*3;
  spawnParticles(monster.x+monster.w/2,monster.y+monster.h/2,6,'#ff0000',3,5,'spark');
  updateUI();
  if(monster.hp<=0)loseLife();
}

function loseLife(){
  lives--;spawnParticles(monster.x+monster.w/2,monster.y+monster.h/2,30,'#ff2200',8,9,'spark');updateUI();
  if(lives<=0)showOverlay('gameover');
  else{monster=makeMonster();monster.y=GROUND-monster.h;if(monsterLevel>1){monster.maxHp+=20*(monsterLevel-1);monster.hp=monster.maxHp;monster.dmgMult=1+0.15*(monsterLevel-1);monster.speedMult=1+0.08*(monsterLevel-1);}}
}

/* ── ENEMIES UPDATE ── */
function updateEnemies(dt){
  for(const e of enemies){
    if(e.dead)continue;
    if(e.stunTimer>0){e.stunTimer-=dt;continue;}// stunned = frozen
    if(!e.flying)e.vy+=GRAVITY*dt;
    const mx=monster.x+monster.w/2,ex=e.x+e.w/2,dist=mx-ex;
    if(e.type==='helicopter'){
      e.vx+=(dist>0?1:-1)*0.06*dt;e.vx=Math.max(-2,Math.min(2,e.vx));
      e.vy=Math.sin(frameT*0.03)*0.9;
    }else if(e.type==='boss'){
      if(Math.abs(dist)>125){e.vx+=(dist>0?0.045:-0.045)*dt;e.vx=Math.max(-1.0,Math.min(1.0,e.vx));e.dir=dist>0?1:-1;}else e.vx*=Math.pow(0.9,dt);
      e.walkCycle=(e.walkCycle||0)+Math.abs(e.vx)*0.1*dt;
    }else if(e.type==='tank'){
      if(Math.abs(dist)>100){e.vx+=(dist>0?0.06:-0.06)*dt;e.vx=Math.max(-1.2,Math.min(1.2,e.vx));e.dir=dist>0?1:-1;}
      else e.vx*=Math.pow(0.9,dt);
      e.walkCycle=(e.walkCycle||0)+Math.abs(e.vx)*0.08*dt;
    }else{
      if(Math.abs(dist)>90){e.vx+=(dist>0?0.1:-0.1)*dt;e.vx=Math.max(-2.5,Math.min(2.5,e.vx));e.dir=dist>0?1:-1;}
      else e.vx*=Math.pow(0.85,dt);
    }
    e.x+=e.vx*dt;e.y+=e.vy*dt;
    if(!e.flying&&e.y+e.h>=GROUND){e.y=GROUND-e.h;e.vy=0;}
    e.fireTimer-=dt;
    if(e.fireTimer<=0){
      e.fireTimer=(e.type==='boss'?42:e.type==='tank'?65:80)+Math.random()*(e.type==='boss'?25:60);
      const speed=e.type==='boss'?6.2:e.type==='helicopter'?5.5:e.type==='tank'?5:4;
      const angle=Math.atan2((monster.y+monster.h/2)-(e.y+e.h/2),mx-ex);
      const col=e.type==='boss'?'#ff2266':e.type==='helicopter'?'#ff4400':e.type==='tank'?'#aaff44':'#ffff00';
      const dmg=e.type==='boss'?24:e.type==='helicopter'?14:e.type==='tank'?18:8;
      particles.push({x:e.x+e.w/2,y:e.y+e.h/2,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,
        life:65,maxLife:65,col,size:e.type==='boss'?12:e.type==='tank'?9:7,type:'bullet',dmg});
    }
    if(!e.dead&&rectsOverlap(e,monster)){hurtMonster(0.22*dt);monster.knockback=6;}
  }
}

/* ── PARTICLES UPDATE ── */
function updateParticles(dt){
  for(let i=particles.length-1;i>=0;i--){
    const p=particles[i];p.life-=dt;
    if(p.life<=0){particles.splice(i,1);continue;}
    p.x+=p.vx*dt;p.y+=p.vy*dt;
    if(p.type==='rubble'){p.vy+=GRAVITY*0.55*dt;if(p.y+p.size>=GROUND){p.vy*=-0.35;p.vx*=0.7;p.y=GROUND-p.size;}}
    if(p.type==='smoke'){p.size+=0.05*dt;p.vx*=0.99;}
    if(p.type==='bullet'){
      if(rectsOverlap({x:p.x-5,y:p.y-5,w:10,h:10},monster)){
        hurtMonster(p.dmg||7);spawnParticles(p.x,p.y,5,'#ff8800',3,4,'spark');p.life=0;
      }
    }
  }
  // Debris
  for(let i=debris.length-1;i>=0;i--){
    const d=debris[i];d.life-=dt;if(d.life<=0){debris.splice(i,1);continue;}
    d.vy+=GRAVITY*0.8*dt;d.x+=d.vx*dt;d.y+=d.vy*dt;d.rot+=d.rv*dt;
    if(d.y+d.h>=GROUND){d.vy*=-0.3;d.vx*=0.7;d.y=GROUND-d.h;d.rv*=0.6;}
  }
}

/* ── POWERUPS ── */
function updatePowerups(){
  for(const pu of powerups){
    if(pu.collected)continue;
    pu.bob=(pu.bob||0)+0.058;
    const py=pu.y-12+Math.sin(pu.bob)*6;
    if(rectsOverlap({x:pu.x,y:py,w:pu.w,h:pu.h},monster)){
      pu.collected=true;
      if(pu.type==='heal'){monster.hp=Math.min(monster.maxHp,monster.hp+40);spawnParticles(pu.x+pu.w/2,pu.y,14,'#00ff88',5,5,'spark');scorePop(pu.x,pu.y,'+40 HP','#00ff88');}
      else if(pu.type==='rage'){monster.rage=320;spawnParticles(pu.x+pu.w/2,pu.y,14,'#ff4400',6,6,'spark');scorePop(pu.x,pu.y,'FÚRIA!','#ff4400');}
      else if(pu.type==='shield'){monster.shield=true;spawnParticles(pu.x+pu.w/2,pu.y,14,'#4488ff',5,5,'spark');scorePop(pu.x,pu.y,'ESCUDO!','#4488ff');}
      else{score+=300;gainXP(80);addCombo(4);spawnParticles(pu.x+pu.w/2,pu.y,14,'#ffcc00',5,5,'spark');scorePop(pu.x,pu.y,'+300','#ffcc00');}
      shake(5);updateUI();
    }
  }
}

/* ── WIN CHECK ── */
function checkWin(){
  if(buildings.every(b=>b.destroyed)&&enemies.every(e=>e.dead)){
    score+=500*level;level++;
    if(level>LEVELS.length)showOverlay('win');else showOverlay('nextlevel');
  }
}
function rectsOverlap(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}

function phaseStars(){
  let stars=1;if(monster&&monster.hp/monster.maxHp>=0.5)stars++;if(comboCount>=8||score>=level*1200)stars++;return stars;
}
function showOverlay(type){
  paused=true;
  const ov=document.getElementById('overlay');ov.style.display='flex';ov.innerHTML='';
  document.getElementById('pause-btn').style.display='none';
  if(type==='gameover')ov.innerHTML=`<div class="ov-title">GAME<br>OVER</div><div class="ov-sub">VOCÊ FOI DERRUBADO</div><div class="ov-divider"></div><div class="ov-score-big">${score} PTS</div><div class="ov-body">Monstro Nv.${monsterLevel}</div><button class="ov-btn" id="restartBtn">TENTAR DE NOVO</button><button class="ov-small-btn" id="menuBtn">MENU</button>`;
  else if(type==='win')ov.innerHTML=`<div class="ov-title" style="color:#00ffaa;text-shadow:0 0 50px #00ffaa,4px 4px 0 #006644">VITÓRIA!</div><div class="ov-sub" style="color:#00ffaa">TODAS AS CIDADES DESTRUÍDAS</div><div class="ov-divider" style="background:#00ffaa"></div><div class="ov-score-big">${score} PTS</div><div class="ov-body">Monstro Nv.${monsterLevel}<br>Você derrotou a operação ÔMEGA.</div><button class="ov-btn" id="restartBtn">JOGAR DE NOVO</button><button class="ov-small-btn" id="menuBtn">MENU</button>`;
  else if(type==='nextlevel'){const doneLevel=level-1,cfg=LEVELS[doneLevel-1],stars=phaseStars();ov.innerHTML=`<div class="ov-title">FASE ${doneLevel}</div><div class="ov-sub">${cfg.name}</div><div class="ov-divider"></div><div class="ov-score-big">${'★'.repeat(stars)}${'☆'.repeat(3-stars)}</div><div class="ov-body">${score} PTS<br>+30 HP de bônus<br>Monstro Nv.${monsterLevel} | XP: ${xp}/${xpNext}</div><button class="ov-btn" id="nextBtn">PRÓXIMA CIDADE</button>`;}
  const nb=ov.querySelector('#nextBtn');if(nb){nb.addEventListener('click',nextLevel);nb.addEventListener('touchend',e=>{e.preventDefault();nextLevel();});}
  const rb=ov.querySelector('#restartBtn');if(rb){rb.addEventListener('click',restartGame);rb.addEventListener('touchend',e=>{e.preventDefault();restartGame();});}
  const mb=ov.querySelector('#menuBtn');if(mb)mb.addEventListener('click',showMainMenu);
}
function nextLevel(){paused=false;document.getElementById('overlay').style.display='none';monster.hp=Math.min(monster.maxHp,monster.hp+30);initLevel();}
function restartGame(){paused=false;document.getElementById('overlay').style.display='none';score=0;lives=3;level=1;monsterLevel=1;xp=0;xpNext=100;document.getElementById('lvl-badge').style.opacity='0';initLevel();}
function showMainMenu(){
  paused=true;gameRunning=gameRunning||false;
  document.getElementById('pause-btn').style.display='none';document.getElementById('mission-card').style.display='none';document.getElementById('boss-wrap').style.display='none';
  const ov=document.getElementById('overlay');ov.style.display='flex';
  ov.innerHTML=`<div class="ov-title">RAMPAGE</div><div class="ov-sub">MONSTER DESTRUCTION · V2</div><div class="ov-divider"></div><div class="menu-grid">${LEVELS.map((l,i)=>`<div class="phase-card"><b>${i+1}. ${l.name}</b>${l.boss?'☠ '+l.boss:'DESTRUIÇÃO'}</div>`).join('')}</div><div class="ov-body">Destrua cidades, evolua o monstro e derrote os chefes militares.</div><button class="ov-btn" id="playBtn">JOGAR</button><button class="ov-small-btn" id="controlsBtn">CONTROLES</button>`;
  ov.querySelector('#playBtn').addEventListener('click',()=>{paused=false;startGame();});
  ov.querySelector('#controlsBtn').addEventListener('click',()=>{alert(desktopMode()?'PC\nMover: ← → ou A / D\nPular/Escalar: ↑, W ou ESPAÇO\nSoco E/D: Z / X\nTremor: S ou C\nRugido: E ou R\nPausa: ESC':'CELULAR\nMover/Escalar: D-Pad\nSoco E/D: botões de soco\nTremor: botão 💥\nRugido: botão 😤\nPular: botão ⬆️');});
}


/* ══════════════════ RENDER ══════════════════ */
function render(){
  ctx.save();
  if(shakeTimer>0){const s=shakeTimer*0.6;ctx.translate((Math.random()-0.5)*s,(Math.random()-0.5)*s);}
  ctx.clearRect(-20,-20,W+40,H+40);
  ctx.save();ctx.translate(-camX,0);
  drawSky();drawBgCity();drawGround();
  drawPowerups();drawBuildings();drawDebris();
  drawEnemies();drawParticles();drawMonster();
  drawShield();
  ctx.restore();ctx.restore();
}

/* ── SKY ── */
// Pre-generate stars once
const STARS=Array.from({length:80},(_,i)=>({
  sx:Math.random()*4000,sy:6+Math.random()*200,
  sz:0.4+Math.random()*1.2,phase:Math.random()*Math.PI*2
}));

function drawSky(){
  const g=ctx.createLinearGradient(0,0,0,GROUND);
  const sc=levelCfg().sky;g.addColorStop(0,sc[0]);g.addColorStop(0.5,sc[1]);g.addColorStop(1,sc[2]);
  ctx.fillStyle=g;ctx.fillRect(camX,0,W,GROUND);

  // Moon with halo
  const moonX=camX+W*0.82,moonY=50;
  ctx.save();
  ctx.fillStyle='rgba(255,250,220,0.08)';ctx.beginPath();ctx.arc(moonX,moonY,55,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='rgba(255,250,220,0.04)';ctx.beginPath();ctx.arc(moonX,moonY,80,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fffce0';ctx.shadowColor='#ffff88';ctx.shadowBlur=28;
  ctx.beginPath();ctx.arc(moonX,moonY,21,0,Math.PI*2);ctx.fill();
  ctx.shadowBlur=0;ctx.restore();

  // Stars with twinkle (use precomputed, mod worldW for parallax)
  ctx.fillStyle='rgba(255,255,255,0.8)';
  for(const s of STARS){
    const bright=Math.sin(frameT*0.04+s.phase)>0.4;
    if(!bright)continue;
    const sx=camX+((s.sx-camX*0.05)%W+W)%W;
    if(sx<camX||sx>camX+W)continue;
    ctx.fillRect(sx,s.sy,s.sz,s.sz);
  }
  // Clouds (slow parallax)
  drawClouds();
  // Ground glow
  const haze=ctx.createLinearGradient(0,GROUND-70,0,GROUND);
  haze.addColorStop(0,'rgba(20,14,50,0)');haze.addColorStop(1,'rgba(20,14,50,0.4)');
  ctx.fillStyle=haze;ctx.fillRect(camX,GROUND-70,W,70);
}

// Cloud data (stable per session)
const CLOUDS=Array.from({length:6},(_,i)=>({
  ox:i*700,y:30+Math.random()*60,w:120+Math.random()*100,h:30+Math.random()*20
}));
function drawClouds(){
  ctx.save();ctx.globalAlpha=0.06;ctx.fillStyle='#aaccff';
  for(const c of CLOUDS){
    const cx=camX*0.08+c.ox;
    const rx=camX+((cx%worldW+worldW)%worldW)-camX;
    if(rx<-200||rx>W+200)continue;
    ctx.beginPath();
    ctx.ellipse(rx,c.y,c.w/2,c.h/2,0,0,Math.PI*2);ctx.fill();
    ctx.ellipse(rx-c.w*0.28,c.y+5,c.w*0.32,c.h*0.45,0,0,Math.PI*2);ctx.fill();
    ctx.ellipse(rx+c.w*0.28,c.y+3,c.w*0.32,c.h*0.45,0,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
}

/* ── BG CITY ── */
// Pre-generate bg buildings
const BG_BLDS=Array.from({length:22},(_,i)=>({
  ox:i*180+30,bh:25+((i*73)%100),bw:36+((i*41)%28),
  wins:Math.random()>0.5
}));
function drawBgCity(){
  ctx.fillStyle='rgba(10,13,30,0.88)';
  for(const b of BG_BLDS){
    const bx=camX+(b.ox-camX*0.18+worldW)%worldW;
    if(bx<camX-50||bx>camX+W+50)continue;
    ctx.fillRect(bx,GROUND-b.bh,b.bw,b.bh);
    // Tiny glowing windows
    if(b.wins){
      const lit=Math.sin(frameT*0.012+b.ox*0.02)>0.2;
      if(lit){ctx.fillStyle='rgba(255,220,120,0.07)';ctx.fillRect(bx+5,GROUND-b.bh+5,7,6);ctx.fillStyle='rgba(10,13,30,0.88)';}
    }
  }
}

/* ── GROUND ── */
function drawGround(){
  const gg=ctx.createLinearGradient(0,GROUND,0,H);
  gg.addColorStop(0,'#252525');gg.addColorStop(1,'#111');
  ctx.fillStyle=gg;ctx.fillRect(0,GROUND,worldW,H-GROUND);
  // Road
  ctx.fillStyle=levelCfg().ground;ctx.fillRect(0,GROUND,worldW,22);
  // Curb
  ctx.fillStyle='#363636';ctx.fillRect(0,GROUND,worldW,3);
  // Center line
  ctx.save();ctx.strokeStyle='#333';ctx.lineWidth=2;ctx.setLineDash([24,22]);
  ctx.beginPath();ctx.moveTo(0,GROUND+11);ctx.lineTo(worldW,GROUND+11);ctx.stroke();
  ctx.setLineDash([]);ctx.restore();
  // Puddles / cracks (static detail)
  ctx.fillStyle='rgba(60,80,120,0.12)';
  for(let i=0;i<8;i++){ctx.beginPath();ctx.ellipse(i*340+80,GROUND+16,22,5,0,0,Math.PI*2);ctx.fill();}
}

/* ── DEBRIS (flying building chunks) ── */
function drawDebris(){
  for(const d of debris){
    const a=Math.max(0,d.life/90);
    ctx.save();ctx.globalAlpha=a;
    ctx.translate(d.x+d.w/2,d.y+d.h/2);ctx.rotate(d.rot);
    ctx.fillStyle=d.col;ctx.fillRect(-d.w/2,-d.h/2,d.w,d.h);
    ctx.fillStyle='rgba(0,0,0,0.3)';ctx.fillRect(-d.w/2+1,-d.h/2+1,d.w-2,2);
    ctx.restore();
  }
}

/* ── BUILDINGS ── */
function drawBuildings(){
  for(const b of buildings){
    if(b.destroyed){
      // Rubble mound
      const rg=ctx.createRadialGradient(b.x+b.fw/2,GROUND,0,b.x+b.fw/2,GROUND,b.fw*0.7);
      rg.addColorStop(0,'#4a4a4a');rg.addColorStop(1,'#282828');
      ctx.fillStyle=rg;ctx.beginPath();ctx.ellipse(b.x+b.fw/2,GROUND,b.fw*0.6,13,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#3a3a3a';ctx.fillRect(b.x+6,GROUND-9,b.fw-12,9);
      // Smoke from rubble
      if(frameT%8===0&&Math.random()>0.7)spawnSmoke(b.x+b.fw/2,GROUND-5,1);
      continue;
    }
    const hpRatio=b.hp/b.maxHp;
    // Shadow
    ctx.fillStyle='rgba(0,0,0,0.25)';ctx.fillRect(b.x+5,b.y+5,b.fw,b.totalH);
    // Floors
    for(let f=0;f<b.floors;f++){
      const fy=b.y+f*b.fh;
      const dmgAmt=hpRatio<0.45?(1-hpRatio)*0.55:0;
      ctx.fillStyle=lerpColor(b.pal[0],'#4a1a0a',dmgAmt);ctx.fillRect(b.x,fy,b.fw,b.fh);
      ctx.fillStyle=b.pal[1];ctx.fillRect(b.x,fy+b.fh-3,b.fw,3);
      ctx.fillStyle='rgba(255,255,255,0.04)';ctx.fillRect(b.x,fy,b.fw,4);
      const gap=b.winCols>1?Math.floor((b.fw-14)/(b.winCols-1)):0;
      for(let wc=0;wc<b.winCols;wc++){
        const wx=b.x+7+wc*(gap||b.fw-14),wy=fy+7;
        const dmgLvl=(b.damage[f]&&b.damage[f][wc])||0;
        if(dmgLvl>=3){ctx.fillStyle='#100300';ctx.fillRect(wx,wy,12,14);ctx.strokeStyle='#555';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(wx,wy);ctx.lineTo(wx+12,wy+14);ctx.moveTo(wx+12,wy);ctx.lineTo(wx,wy+14);ctx.stroke();}
        else if(dmgLvl>0){ctx.fillStyle='#3a1500';ctx.fillRect(wx,wy,12,14);}
        else{
          const lit=Math.sin(frameT*0.032+f*1.3+wc*2.1+b.x*0.01)>-0.2;
          ctx.fillStyle=lit?'#ffe090':'#12182a';ctx.fillRect(wx,wy,12,14);
          if(lit){ctx.fillStyle='rgba(255,225,100,0.1)';ctx.fillRect(wx-2,wy-2,16,18);}
          ctx.strokeStyle='rgba(0,0,0,0.35)';ctx.lineWidth=1;ctx.strokeRect(wx,wy,12,14);
        }
      }
      // Cracks when damaged
      if(hpRatio<0.5&&f<2){
        ctx.strokeStyle=`rgba(0,0,0,${(1-hpRatio)*0.6})`;ctx.lineWidth=1;
        ctx.beginPath();ctx.moveTo(b.x+b.fw*0.3,fy+4);ctx.lineTo(b.x+b.fw*0.4,fy+b.fh-4);ctx.stroke();
      }
    }
    // Roof
    ctx.fillStyle=b.pal[2];ctx.fillRect(b.x-2,b.y,b.fw+4,7);
    ctx.fillStyle=b.pal[3];ctx.fillRect(b.x,b.y,b.fw,4);
    // Water tank
    if(b.hasTank){
      ctx.fillStyle='#3a3a3a';ctx.fillRect(b.x+b.fw*0.55,b.y-20,16,20);
      ctx.fillStyle='#555';ctx.beginPath();ctx.ellipse(b.x+b.fw*0.55+8,b.y-20,9,4,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#2a2a2a';ctx.fillRect(b.x+b.fw*0.55+4,b.y-20,2,4);ctx.fillRect(b.x+b.fw*0.55+10,b.y-20,2,4);
    }
    // Antenna
    ctx.strokeStyle='#666';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(b.x+b.fw/2,b.y);ctx.lineTo(b.x+b.fw/2,b.y-16);ctx.stroke();
    ctx.fillStyle=frameT%60<30?'#ff2200':'#660000';
    ctx.beginPath();ctx.arc(b.x+b.fw/2,b.y-16,3,0,Math.PI*2);ctx.fill();
    // HP bar
    ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(b.x,b.y-10,b.fw,5);
    ctx.fillStyle=hpRatio>0.5?'#44ff44':hpRatio>0.25?'#ffaa00':'#ff2200';
    ctx.fillRect(b.x,b.y-10,b.fw*hpRatio,5);
    // Fire when low HP
    if(hpRatio<0.35&&frameT%5===0)spawnParticles(b.x+Math.random()*b.fw,b.y+b.totalH*0.2,1,'#ff6600',1,5,'spark');
  }
}

/* ── COLOR LERP ── */
function lerpColor(a,b,t){
  const ah=a.replace('#',''),bh=b.replace('#','');
  const ar=parseInt(ah.slice(0,2),16),ag=parseInt(ah.slice(2,4),16),ab2=parseInt(ah.slice(4,6),16);
  const br=parseInt(bh.slice(0,2),16),bg=parseInt(bh.slice(2,4),16),bb2=parseInt(bh.slice(4,6),16);
  return`rgb(${Math.round(ar+(br-ar)*t)},${Math.round(ag+(bg-ag)*t)},${Math.round(ab2+(bb2-ab2)*t)})`;
}

/* ── MONSTER DRAW ── */
function drawMonster(){
  const m=monster;if(!m)return;
  const d=MONSTERS[m.monsterId]||MONSTERS.brutus;
  const x=Math.round(m.x),y=Math.round(m.y),rage=m.rage>0;
  const blink=m.invincible>0&&(frameT%6<3);if(blink)ctx.globalAlpha=.3;
  const palettes={
    brutus:{dark:'#075b25',mid:'#16a044',light:'#61d86e',hi:'#9aff9a',eye:'#ff2b16',glow:'#35ff77'},
    gorak:{dark:'#67210d',mid:'#b83b17',light:'#ed6b23',hi:'#ffb13b',eye:'#fff36a',glow:'#ff5b1f'},
    volt:{dark:'#183d79',mid:'#246fd0',light:'#35bce9',hi:'#9cf5ff',eye:'#e86cff',glow:'#47e8ff'}
  };
  let p=palettes[d.id];if(rage)p={...p,mid:'#d84c0d',light:'#ff7a16',hi:'#ffd34d',eye:'#fff06a',glow:'#ff7a00'};

  const levelScale=1+Math.min(monsterLevel-1,5)*.035;
  const breathe=Math.sin(frameT*.075)*1.2;
  const walk=m.onGround?Math.sin(m.walkCycle):0;
  const bob=m.onGround&&Math.abs(m.vx)>.45?Math.abs(walk)*1.8:0;
  const scale=levelScale*(d.id==='gorak'?1.06:d.id==='volt'?.96:1);
  const ox=x+m.w/2,oy=y+m.h;

  // Ground contact + glow makes the monster read better against dark backgrounds.
  ctx.save();ctx.globalAlpha=blink?.08:.34;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(ox,GROUND+2,m.w*.62*scale,8,0,0,Math.PI*2);ctx.fill();
  if(d.id==='volt'||rage){ctx.globalAlpha=.12+.05*Math.sin(frameT*.12);ctx.fillStyle=p.glow;ctx.beginPath();ctx.ellipse(ox,GROUND,m.w*.72*scale,12,0,0,Math.PI*2);ctx.fill();}ctx.restore();

  ctx.save();ctx.translate(ox,oy-bob);ctx.scale(scale,scale);ctx.translate(-m.w/2,-m.h);
  const lx=0,ly=0;
  ctx.lineJoin='round';ctx.lineCap='round';
  const outline=(fn)=>{ctx.save();ctx.strokeStyle='rgba(0,0,0,.72)';ctx.lineWidth=3;fn();ctx.stroke();ctx.restore();};
  const box=(xx,yy,w,h,fill)=>{ctx.fillStyle=fill;ctx.fillRect(xx,yy,w,h);ctx.strokeStyle='rgba(0,0,0,.48)';ctx.lineWidth=1.5;ctx.strokeRect(xx+.75,yy+.75,w-1.5,h-1.5);};

  // Legs: articulated instead of two plain rectangles.
  const ls=walk*4;
  box(8,61+ls*.18,13,19,p.dark);box(27,61-ls*.18,13,19,p.dark);
  box(7,76+ls*.30,14,11,p.mid);box(27,76-ls*.30,14,11,p.mid);
  box(3,84+ls*.22,19,7,p.dark);box(27,84-ls*.22,19,7,p.dark);
  ctx.fillStyle=p.light;ctx.fillRect(9,64+ls*.18,3,11);ctx.fillRect(28,64-ls*.18,3,11);

  // Torso with shoulder silhouette and layered shading.
  ctx.beginPath();ctx.moveTo(7,28);ctx.lineTo(41,28);ctx.lineTo(45,40);ctx.lineTo(41,67+breathe);ctx.lineTo(8,67+breathe);ctx.lineTo(3,40);ctx.closePath();ctx.fillStyle=p.mid;ctx.fill();outline(()=>{ctx.beginPath();ctx.moveTo(7,28);ctx.lineTo(41,28);ctx.lineTo(45,40);ctx.lineTo(41,67+breathe);ctx.lineTo(8,67+breathe);ctx.lineTo(3,40);ctx.closePath();});
  ctx.fillStyle=p.dark;ctx.fillRect(7,51,34,15);ctx.fillStyle=p.light;ctx.fillRect(9,32,5,18);ctx.fillStyle='rgba(255,255,255,.10)';ctx.fillRect(14,32,23,5);
  for(let r=0;r<3;r++){ctx.fillStyle=r===0?p.light:p.dark;ctx.globalAlpha=.18;ctx.fillRect(10,42+r*7,28,3);}ctx.globalAlpha=blink?.3:1;

  // Archetype details.
  if(d.id==='gorak'){
    ctx.fillStyle=p.hi;ctx.beginPath();ctx.moveTo(8,30);ctx.lineTo(0,23);ctx.lineTo(11,25);ctx.fill();ctx.beginPath();ctx.moveTo(40,30);ctx.lineTo(48,23);ctx.lineTo(37,25);ctx.fill();
    ctx.strokeStyle='#421208';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(17,38);ctx.lineTo(22,47);ctx.lineTo(18,55);ctx.stroke();ctx.beginPath();ctx.moveTo(31,40);ctx.lineTo(27,49);ctx.lineTo(32,57);ctx.stroke();
  }else if(d.id==='volt'){
    ctx.fillStyle=p.hi;for(const [px,py] of [[10,42],[38,42],[24,58]]){ctx.beginPath();ctx.arc(px,py,2.4,0,Math.PI*2);ctx.fill();}
    ctx.strokeStyle=p.glow;ctx.globalAlpha=.55;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(11,42);ctx.lineTo(24,58);ctx.lineTo(38,42);ctx.stroke();ctx.globalAlpha=blink?.3:1;
  }

  // Arms and fists; punches now extend the entire forearm.
  const extL=m.punchL>12?18:0,extR=m.punchR>12?18:0;
  box(-4-extL,31,12+extL,18,p.mid);box(40,31,12+extR,18,p.mid);
  const fistSize=d.id==='gorak'?15:13;
  box(-10-extL-(fistSize-13),31,fistSize,15,p.light);box(45+extR,31,fistSize,15,p.light);
  ctx.fillStyle=p.hi;ctx.globalAlpha=.32;ctx.fillRect(-8-extL,33,3,8);ctx.fillRect(47+extR,33,3,8);ctx.globalAlpha=blink?.3:1;

  // Neck + head with brow, jaw and directional pupils.
  box(14,22,20,10,p.dark);
  ctx.beginPath();ctx.moveTo(7,5);ctx.lineTo(13,0);ctx.lineTo(36,0);ctx.lineTo(42,5);ctx.lineTo(40,28);ctx.lineTo(8,28);ctx.closePath();ctx.fillStyle=p.light;ctx.fill();outline(()=>{ctx.beginPath();ctx.moveTo(7,5);ctx.lineTo(13,0);ctx.lineTo(36,0);ctx.lineTo(42,5);ctx.lineTo(40,28);ctx.lineTo(8,28);ctx.closePath();});
  ctx.fillStyle=p.mid;ctx.fillRect(9,5,31,5);ctx.fillStyle='rgba(255,255,255,.14)';ctx.fillRect(12,3,18,3);
  // brow
  ctx.fillStyle=p.dark;ctx.fillRect(11,9,11,4);ctx.fillRect(26,9,11,4);
  const es=m.dir===1?2:-1;ctx.fillStyle=p.eye;ctx.fillRect(13,12,8,7);ctx.fillRect(27,12,8,7);ctx.fillStyle='#fff';ctx.fillRect(15+es,13,3,3);ctx.fillRect(29+es,13,3,3);
  ctx.fillStyle=p.dark;ctx.fillRect(21,18,6,4);
  ctx.fillStyle='#0d0d0d';ctx.fillRect(12,22,24,6);ctx.fillStyle='#f2f0df';for(let t=0;t<4;t++)ctx.fillRect(13+t*6,22,4,3);
  // forehead crest / horns differentiate silhouettes.
  if(d.id==='gorak'){ctx.fillStyle=p.hi;ctx.beginPath();ctx.moveTo(12,3);ctx.lineTo(7,-8);ctx.lineTo(18,1);ctx.fill();ctx.beginPath();ctx.moveTo(35,3);ctx.lineTo(41,-8);ctx.lineTo(30,1);ctx.fill();}
  if(d.id==='volt'){ctx.fillStyle=p.hi;ctx.beginPath();ctx.moveTo(20,1);ctx.lineTo(24,-10);ctx.lineTo(28,1);ctx.fill();ctx.strokeStyle=p.glow;ctx.lineWidth=2;ctx.globalAlpha=.55+.25*Math.sin(frameT*.16);ctx.strokeRect(12,11,9,8);ctx.strokeRect(26,11,9,8);ctx.globalAlpha=blink?.3:1;}

  // Smash / roar / rage feedback.
  if(m.smashTimer>14){ctx.save();ctx.globalAlpha=.42;ctx.fillStyle=p.glow;ctx.fillRect(-25,80,m.w+50,8);ctx.restore();}
  if(m.roarTimer>0){const rp=m.roarTimer/40;ctx.save();ctx.globalAlpha=rp*.72;ctx.strokeStyle=p.hi;ctx.lineWidth=3;for(let r=1;r<=3;r++){ctx.beginPath();ctx.arc(24,20,r*18*rp,Math.PI*.78,Math.PI*2.22);ctx.stroke();}ctx.restore();}
  if(rage||d.id==='volt'){ctx.save();ctx.globalAlpha=(rage?.32:.10)+Math.sin(frameT*.12)*.03;ctx.strokeStyle=p.glow;ctx.lineWidth=rage?5:2;ctx.shadowColor=p.glow;ctx.shadowBlur=rage?15:8;ctx.beginPath();ctx.ellipse(24,45,35,48,0,0,Math.PI*2);ctx.stroke();ctx.restore();}

  ctx.restore();ctx.globalAlpha=1;
}
/* ── SHIELD DRAW ── */
function drawShield(){
  if(!monster||!monster.shield)return;
  const m=monster;
  ctx.save();
  ctx.globalAlpha=0.35+Math.sin(frameT*0.15)*0.1;
  ctx.strokeStyle='#4488ff';ctx.lineWidth=3;
  ctx.shadowColor='#4488ff';ctx.shadowBlur=14;
  ctx.beginPath();ctx.ellipse(m.x+m.w/2,m.y+m.h/2,m.w*0.72,m.h*0.62,0,0,Math.PI*2);ctx.stroke();
  ctx.restore();
}

/* ── ENEMIES DRAW ── */
function drawEnemies(){
  for(const e of enemies){
    if(e.dead)continue;
    const x=Math.round(e.x),y=Math.round(e.y);
    ctx.save();
    // Stun visual
    if(e.stunTimer>0){ctx.globalAlpha=0.6+Math.sin(frameT*0.3)*0.3;}

    if(e.type==='soldier'){
      // Walk animation
      const wk=e.vx?Math.sin((e.walkCycle||0)+frameT*0.2)*4:0;
      ctx.fillStyle='#446633';ctx.fillRect(x+4,y+14,e.w-8,e.h-14);
      ctx.fillStyle='#334422';ctx.fillRect(x+4,y,e.w-8,14);
      ctx.fillStyle='#223311';ctx.fillRect(x+3,y+3,e.w-6,6);
      ctx.fillStyle='#88aa66';ctx.fillRect(x+7,y+7,e.w-14,8);
      ctx.fillStyle='#111';ctx.fillRect(x+9,y+9,3,3);ctx.fillRect(x+15,y+9,3,3);
      ctx.fillStyle='#222';ctx.fillRect(e.dir===1?x+e.w-2:x-12,y+15,14,4);
      ctx.fillStyle='#335522';
      ctx.fillRect(x+4,y+e.h-10+wk,7,10);ctx.fillRect(x+e.w-11,y+e.h-10-wk,7,10);
    }else if(e.type==='jeep'){
      const wk=Math.sin(frameT*0.15+e.x*0.01)*1;
      ctx.fillStyle='#556633';ctx.fillRect(x,y+10+wk,e.w,e.h-10);
      ctx.fillStyle='#445522';ctx.fillRect(x+4,y+wk,e.w-8,14);
      ctx.fillStyle='rgba(140,190,255,0.3)';ctx.fillRect(x+6,y+2+wk,e.w-12,10);
      ctx.fillStyle='#1a1a1a';
      ctx.beginPath();ctx.arc(x+10,y+e.h+wk,8,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.arc(x+e.w-10,y+e.h+wk,8,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#444';
      ctx.beginPath();ctx.arc(x+10,y+e.h+wk,4,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.arc(x+e.w-10,y+e.h+wk,4,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#333';ctx.fillRect(e.dir===1?x+e.w-2:x-14,y+12+wk,14,5);
    }else if(e.type==='boss'){
      const pulse=0.75+Math.sin(frameT*0.12)*0.25;
      ctx.shadowColor='#ff2255';ctx.shadowBlur=18*pulse;
      ctx.fillStyle='#34151d';ctx.fillRect(x,y+18,e.w,e.h-18);
      ctx.fillStyle='#5c1d2d';ctx.fillRect(x+12,y+6,e.w-24,34);
      ctx.fillStyle='#1a1014';ctx.fillRect(x+8,y+e.h-16,e.w-16,16);
      ctx.fillStyle='#ff3355';ctx.fillRect(x+20,y+18,14,8);ctx.fillRect(x+e.w-34,y+18,14,8);
      ctx.fillStyle='#22070c';ctx.fillRect(e.dir===1?x+e.w-4:x-38,y+27,42,9);
      ctx.fillStyle='#bbb';for(let a=0;a<4;a++)ctx.fillRect(x+15+a*22,y+e.h-12,12,7);
      ctx.shadowBlur=0;
      ctx.fillStyle='#ff7788';ctx.font='10px Bebas Neue';ctx.textAlign='center';ctx.fillText(e.bossName||'CHEFE',x+e.w/2,y-14);
    }else if(e.type==='tank'){
      // TANK — new enemy!
      ctx.fillStyle='#5a6830';ctx.fillRect(x,y+14,e.w,e.h-14);
      ctx.fillStyle='#4a5820';ctx.fillRect(x+6,y+6,e.w-12,14);
      // Tracks
      ctx.fillStyle='#222';ctx.fillRect(x,y+e.h-10,e.w,10);
      const tw=6,ts=frameT*0.1*(e.dir||1);
      for(let t=0;t<6;t++){const tx=((t*14+ts)%e.w+e.w)%e.w;ctx.fillStyle='#333';ctx.fillRect(x+tx,y+e.h-8,tw,8);}
      // Turret
      ctx.fillStyle='#3a4818';ctx.beginPath();ctx.arc(x+e.w/2,y+10,14,0,Math.PI*2);ctx.fill();
      // Barrel
      const barrelLen=28;
      ctx.fillStyle='#2a3010';ctx.fillRect(e.dir===1?x+e.w/2:x+e.w/2-barrelLen,y+7,barrelLen,7);
      // Hatch
      ctx.fillStyle='#2a3010';ctx.beginPath();ctx.ellipse(x+e.w/2,y+10,6,5,0,0,Math.PI*2);ctx.fill();
    }else{
      // Helicopter
      ctx.fillStyle='#446688';ctx.fillRect(x+8,y+8,e.w-16,e.h-8);
      ctx.fillStyle='#335577';ctx.fillRect(x+4,y+12,e.w-8,e.h-14);
      ctx.fillStyle='rgba(140,200,255,0.4)';ctx.fillRect(x+12,y+10,e.w-24,12);
      ctx.fillStyle='#335577';ctx.fillRect(e.dir===1?x-12:x+e.w,y+14,12,6);
      ctx.save();ctx.translate(x+e.w/2,y+7);ctx.rotate(frameT*0.2);
      ctx.fillStyle='rgba(100,150,200,0.6)';ctx.fillRect(-30,-2,60,4);ctx.restore();
      // Tail rotor
      ctx.save();ctx.translate(e.dir===1?x-6:x+e.w+6,y+14+6);ctx.rotate(frameT*0.35);
      ctx.fillStyle='rgba(100,150,200,0.5)';ctx.fillRect(-10,-1.5,20,3);ctx.restore();
      ctx.fillStyle='#222';ctx.fillRect(e.dir===1?x+e.w-4:x-10,y+e.h-4,14,4);
      // Spotlight
      if(Math.sin(frameT*0.04+e.x*0.01)>0.3){
        const lx2=x+e.w/2,ly2=y+e.h;
        ctx.save();ctx.globalAlpha=0.08;ctx.fillStyle='#ffffaa';
        ctx.beginPath();ctx.moveTo(lx2-3,ly2);ctx.lineTo(lx2-22,GROUND);ctx.lineTo(lx2+22,GROUND);ctx.closePath();ctx.fill();ctx.restore();
      }
    }
    // HP bar
    const hpr=e.hp/e.maxHp;
    ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(x,y-9,e.w,5);
    ctx.fillStyle=hpr>0.5?'#44ff44':'#ff4400';ctx.fillRect(x,y-9,e.w*hpr,5);
    // Stun stars
    if(e.stunTimer>0){
      for(let s=0;s<3;s++){const a=frameT*0.1+s*2.1;ctx.fillStyle='#ffff44';ctx.beginPath();ctx.arc(x+e.w/2+Math.cos(a)*14,y-15+Math.sin(a)*4,3,0,Math.PI*2);ctx.fill();}
    }
    ctx.restore();
  }
}

/* ── PARTICLES DRAW ── */
function drawParticles(){
  for(const p of particles){
    const a=Math.max(0,p.life/p.maxLife);
    ctx.save();ctx.globalAlpha=a;ctx.fillStyle=p.col;
    if(p.type==='rubble'){ctx.fillRect(p.x-p.size/2,p.y-p.size/2,p.size,p.size);}
    else if(p.type==='bullet'){ctx.shadowColor=p.col;ctx.shadowBlur=9;ctx.beginPath();ctx.arc(p.x,p.y,p.size/2,0,Math.PI*2);ctx.fill();}
    else if(p.type==='smoke'){ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill();}
    else{ctx.beginPath();ctx.arc(p.x,p.y,p.size*a+0.5,0,Math.PI*2);ctx.fill();}
    ctx.restore();
  }
}

/* ── POWERUPS DRAW ── */
function drawPowerups(){
  const cols={heal:'#00ff88',rage:'#ff4400',score:'#ffcc00',shield:'#4488ff'};
  const icons={heal:'❤',rage:'🔥',score:'★',shield:'🛡'};
  for(const pu of powerups){
    if(pu.collected)continue;
    const py=pu.y-12+Math.sin(pu.bob)*6;
    ctx.save();
    ctx.shadowColor=cols[pu.type];ctx.shadowBlur=14+Math.sin(pu.bob)*5;ctx.fillStyle=cols[pu.type];
    // Rounded rect
    const r=5,px2=pu.x,pw=pu.w,ph=pu.h;
    ctx.beginPath();ctx.moveTo(px2+r,py);
    ctx.lineTo(px2+pw-r,py);ctx.arcTo(px2+pw,py,px2+pw,py+r,r);
    ctx.lineTo(px2+pw,py+ph-r);ctx.arcTo(px2+pw,py+ph,px2+pw-r,py+ph,r);
    ctx.lineTo(px2+r,py+ph);ctx.arcTo(px2,py+ph,px2,py+ph-r,r);
    ctx.lineTo(px2,py+r);ctx.arcTo(px2,py,px2+r,py,r);
    ctx.closePath();ctx.fill();
    ctx.shadowBlur=0;ctx.fillStyle='#fff';
    ctx.font='bold 13px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(icons[pu.type],px2+pw/2,py+ph/2);
    ctx.restore();
  }
}

// Pause/menu controls
function togglePause(){
  if(!gameRunning)return;
  const ov=document.getElementById('overlay');
  if(paused&&ov.style.display==='flex'&&ov.querySelector('#resumeBtn')){
    paused=false;ov.style.display='none';document.getElementById('pause-btn').style.display='flex';return;
  }
  paused=true;ov.style.display='flex';
  ov.innerHTML='<div class="ov-title">PAUSA</div><div class="ov-sub">A CIDADE AINDA ESTÁ DE PÉ</div><div class="ov-body">PC: pressione ESC para continuar</div><button class="ov-btn" id="resumeBtn">CONTINUAR</button><button class="ov-small-btn" id="quitBtn">MENU</button>';
  document.getElementById('pause-btn').style.display='none';
  ov.querySelector('#resumeBtn').addEventListener('click',()=>{paused=false;ov.style.display='none';document.getElementById('pause-btn').style.display='flex';});
  ov.querySelector('#quitBtn').addEventListener('click',showMainMenu);
}
document.getElementById('pause-btn').addEventListener('click',togglePause);

/* ═══════════════════════════════════════════════════════
   RAMPAGE V4 — monster roster, progression, themes, bosses, audio,
   civilians and gamepad. Kept in one self-contained HTML.
   ═══════════════════════════════════════════════════════ */

const SAVE_KEY='rampage_v3_save';
const defaultSave=()=>({version:4,unlocked:1,stars:{},records:{},combos:{},audio:true,totalWins:0,selectedMonster:'brutus'});
function loadSave(){
  try{const raw=localStorage.getItem(SAVE_KEY);if(!raw)return defaultSave();return Object.assign(defaultSave(),JSON.parse(raw));}
  catch(e){return defaultSave();}
}
let progress=loadSave();
function saveProgress(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(progress));}catch(e){}}

// ── Monster roster / unlocks ──
const MONSTERS={
  brutus:{id:'brutus',name:'BRUTUS',icon:'🟩',tag:'Equilibrado',hp:100,damage:1,speed:1,desc:'O destruidor original. Equilíbrio entre força, resistência e velocidade.'},
  gorak:{id:'gorak',name:'GORAK',icon:'🔥',tag:'Tanque',hp:135,damage:1.28,speed:.88,desc:'Mais vida e golpes pesados. Libera ao vencer a Fase 3.'},
  volt:{id:'volt',name:'VOLT',icon:'⚡',tag:'Ágil',hp:88,damage:1.08,speed:1.27,desc:'Muito rápido e com rugido recarregando antes. Libera ao concluir a campanha.'}
};
function monsterUnlocked(id){
  if(id==='brutus')return true;
  if(id==='gorak')return (progress.unlocked||1)>=4;
  if(id==='volt')return (progress.totalWins||0)>0;
  return false;
}
if(!MONSTERS[progress.selectedMonster]||!monsterUnlocked(progress.selectedMonster))progress.selectedMonster='brutus';
let selectedMonster=progress.selectedMonster;
function monsterDef(){return MONSTERS[selectedMonster]||MONSTERS.brutus;}

// Every respawn uses the selected monster archetype.
const baseMakeMonster=makeMonster;
makeMonster=function(){
  const m=baseMakeMonster(),d=monsterDef();
  m.monsterId=d.id;m.maxHp=d.hp;m.hp=d.hp;m.dmgMult=d.damage;m.speedMult=d.speed;
  return m;
};
const baseDoRoar=doRoar;
doRoar=function(m){baseDoRoar(m);if(m&&m.monsterId==='volt'&&m.roarCooldown>0)m.roarCooldown*=.72;};

let selectedLevel=Math.min(Math.max(1,progress.unlocked||1),LEVELS.length);
let phaseStartScore=0,bestCombo=0,upgradeOpen=false,civilians=[];
let runSkills={power:0,armor:0,rage:0,quake:0,roar:0,regen:0};

// ── Lightweight generated audio: no external files required ──
let audioCtx=null;
function ensureAudio(){
  if(!progress.audio)return null;
  try{if(!audioCtx)audioCtx=new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();return audioCtx;}catch(e){return null;}
}
function tone(freq=120,dur=.08,type='square',vol=.035,slide=0){
  const ac=ensureAudio();if(!ac)return;
  const o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.setValueAtTime(freq,ac.currentTime);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,freq+slide),ac.currentTime+dur);
  g.gain.setValueAtTime(vol,ac.currentTime);g.gain.exponentialRampToValueAtTime(.0001,ac.currentTime+dur);o.connect(g);g.connect(ac.destination);o.start();o.stop(ac.currentTime+dur);
}
function sfx(name){
  if(!progress.audio)return;
  if(name==='punch'){tone(105,.055,'square',.025,-35);}
  else if(name==='smash'){tone(62,.18,'sawtooth',.055,-25);setTimeout(()=>tone(42,.14,'square',.035,-12),30);}
  else if(name==='roar'){tone(95,.32,'sawtooth',.04,-45);}
  else if(name==='boom'){tone(72,.24,'sawtooth',.06,-42);tone(38,.30,'square',.035,-10);}
  else if(name==='hurt'){tone(150,.09,'square',.025,-70);}
  else if(name==='power'){tone(320,.08,'sine',.035,240);setTimeout(()=>tone(520,.11,'sine',.03,260),70);}
  else if(name==='boss'){tone(55,.4,'sawtooth',.05,-18);}
  else if(name==='pickup'){tone(480,.07,'sine',.025,180);}
}
window.addEventListener('pointerdown',ensureAudio,{once:true});

// ── Better combo tracking ──
const v2AddCombo=addCombo;
addCombo=function(n){v2AddCombo(n);bestCombo=Math.max(bestCombo,comboCount);};

// ── Phase-specific building generation ──
const THEME_PALS=[
  [['#4f6f91','#294a67','#7899ba','#365c7e'],['#7b5b43','#553825','#a27b5b','#684834']],
  [['#57483d','#342b25','#806958','#493c33'],['#5b4c35','#33291c','#8a724a','#4a3b28']],
  [['#4b5946','#28342a','#718369','#36463a'],['#5e6257','#343932','#858b7a','#474d43']],
  [['#3f6070','#233c48','#65899a','#2f4d5a'],['#74563c','#4a3525','#9c7654','#5a432f']],
  [['#55416e','#302442','#7b5d9c','#413151'],['#35516d','#20334a','#547da0','#2b435b']],
  [['#353152','#1e1b35','#5c5585','#282440'],['#4a2f54','#2b1b35','#70437d','#392542']]
];
makeBuildings=function(lvl){
  const list=[];let x=180;const phase=Math.min(lvl-1,5);const cfg=levelCfg();
  const count=phase===2?7+lvl:phase===3?6+lvl:4+lvl*2;
  for(let i=0;i<count;i++){
    let floors,fw,fh;
    if(phase===1){floors=2+Math.floor(Math.random()*4);fw=Math.round(80+Math.random()*60);fh=Math.round(32+Math.random()*10);}
    else if(phase===2){floors=2+Math.floor(Math.random()*3);fw=Math.round(70+Math.random()*55);fh=Math.round(28+Math.random()*8);}
    else if(phase===3){floors=2+Math.floor(Math.random()*4);fw=Math.round(72+Math.random()*70);fh=Math.round(30+Math.random()*9);}
    else if(phase===4){floors=6+Math.floor(Math.random()*(5+lvl));fw=Math.round(48+Math.random()*45);fh=Math.round(24+Math.random()*8);}
    else if(phase===5){floors=4+Math.floor(Math.random()*(5+lvl));fw=Math.round(58+Math.random()*52);fh=Math.round(27+Math.random()*8);}
    else{floors=3+Math.floor(Math.random()*(3+lvl));fw=Math.round(55+Math.random()*50);fh=Math.round(28+Math.random()*12);}
    const totalH=floors*fh,hp=floors*22+lvl*18,winCols=Math.max(1,Math.floor((fw-12)/20));
    const pals=THEME_PALS[phase],pal=pals[i%pals.length];
    list.push({x,y:GROUND-totalH,w:fw,totalH,floors,fh,fw,hp,maxHp:hp,winCols,pal,
      damage:Array.from({length:floors},()=>Array(winCols).fill(0)),destroyed:false,hasTank:phase===0&&Math.random()>.5,
      fireTimer:0,isFire:false,fireX:0,fireY:0,kind:phase,ruinFire:0});
    x+=fw+22+Math.floor(Math.random()*(phase===4?38:58));
  }
  worldW=Math.max(W*2.5,x+350);return list;
};

// ── Run upgrades ──
const UPGRADES=[
  {id:'power',ico:'👊',name:'SOCO PESADO',desc:'+18% de dano em todos os golpes.',apply:()=>{runSkills.power++;monster.dmgMult*=1.18;}},
  {id:'armor',ico:'❤️',name:'PELE DE AÇO',desc:'+35 de vida máxima e cura imediata.',apply:()=>{runSkills.armor++;monster.maxHp+=35;monster.hp=Math.min(monster.maxHp,monster.hp+35);}},
  {id:'rage',ico:'🔥',name:'FÚRIA LONGA',desc:'Power-up de fúria dura 35% mais.',apply:()=>runSkills.rage++},
  {id:'quake',ico:'💥',name:'TREMOR BRUTAL',desc:'Tremor causa +25% de dano.',apply:()=>runSkills.quake++},
  {id:'roar',ico:'😤',name:'RUGIDO DE GUERRA',desc:'Rugido também fere inimigos próximos.',apply:()=>runSkills.roar++},
  {id:'regen',ico:'♻️',name:'REGENERAÇÃO',desc:'Recupera vida lentamente em segurança.',apply:()=>{runSkills.regen++;monster.hpRegen=(monster.hpRegen||0)+1;}}
];
function chooseUpgradeSet(){return [...UPGRADES].sort(()=>Math.random()-.5).slice(0,3);}
function showUpgradeChoice(){
  if(upgradeOpen||!monster)return;upgradeOpen=true;paused=true;sfx('power');
  const choices=chooseUpgradeSet(),ov=document.getElementById('overlay');ov.style.display='flex';document.getElementById('pause-btn').style.display='none';
  ov.innerHTML=`<div class="ov-title" style="font-size:clamp(42px,10vw,72px);color:#7deaff;text-shadow:0 0 34px #39cfff">EVOLUÇÃO</div><div class="ov-sub">MONSTRO Nv.${monsterLevel} · ESCOLHA UM PODER</div><div class="upgrade-grid">${choices.map((u,i)=>`<button class="upgrade-card" data-up="${i}"><span class="ico">${u.ico}</span><b>${u.name}</b><small>${u.desc}</small></button>`).join('')}</div><div class="save-badge">A escolha vale durante esta partida.</div>`;
  ov.querySelectorAll('[data-up]').forEach(btn=>btn.addEventListener('click',()=>{
    const u=choices[+btn.dataset.up];u.apply();upgradeOpen=false;paused=false;ov.style.display='none';document.getElementById('pause-btn').style.display='flex';updateUI();
  }));
}
gainXP=function(amount){
  xp+=Math.round(amount*(1+monsterLevel*.1));updateUI();
  if(xp>=xpNext){
    xp-=xpNext;xpNext=Math.round(xpNext*1.5);monsterLevel++;
    monster.maxHp+=12;monster.hp=Math.min(monster.maxHp,monster.hp+12);monster.dmgMult=(monster.dmgMult||1)+.07;monster.speedMult=(monster.speedMult||1)+.035;
    spawnParticles(monster.x+monster.w/2,monster.y,24,'#88ffff',6,6,'spark');shake(6);
    document.getElementById('lvl-badge').textContent='★ MONSTRO Nv.'+monsterLevel;document.getElementById('lvl-badge').style.opacity='1';updateUI();
    setTimeout(showUpgradeChoice,80);
  }
};

// ── Apply chosen upgrades when a life/phase recreates the monster ──
const v2MakeMonster=makeMonster;
makeMonster=function(){
  const m=v2MakeMonster();
  if(runSkills){m.maxHp+=runSkills.armor*35;m.hp=m.maxHp;m.dmgMult*=Math.pow(1.18,runSkills.power);m.hpRegen=runSkills.regen;}
  return m;
};

// ── Audio + stronger skills around existing combat ──
const v2DoSmash=doSmash;
doSmash=function(m){const boss=getBoss(),before=boss?boss.hp:0;v2DoSmash(m);if(runSkills.quake){for(const b of buildings)if(!b.destroyed&&Math.abs((m.x+m.w/2)-(b.x+b.fw/2))<155)b.hp-=10*runSkills.quake*(m.dmgMult||1);for(const e of enemies)if(!e.dead&&!e.flying&&Math.abs((m.x+m.w/2)-(e.x+e.w/2))<175)e.hp-=12*runSkills.quake;}if(boss&&boss.bossShield&&boss.hp<before)boss.hp+=((before-boss.hp)*.65);sfx('smash');};
const v2DoRoar=doRoar;
doRoar=function(m){v2DoRoar(m);if(runSkills.roar){for(const e of enemies){if(e.dead)continue;if(Math.abs((e.x+e.w/2)-(m.x+m.w/2))<235){e.hp-=14*runSkills.roar*(m.dmgMult||1);if(e.hp<=0){e.dead=true;score+=120;gainXP(45);}}}}sfx('roar');};
const v2HurtMonster=hurtMonster;
hurtMonster=function(dmg){const before=monster?monster.hp:0;v2HurtMonster(dmg);if(monster&&monster.hp<before)sfx('hurt');};
const v2DestroyBuilding=destroyBuilding;
destroyBuilding=function(b){v2DestroyBuilding(b);b.ruinFire=260;sfx('boom');if(Math.random()<.28){powerups.push({x:b.x+b.fw/2-13,y:GROUND-22,type:['heal','rage','shield','score'][Math.floor(Math.random()*4)],w:26,h:26,collected:false,bob:Math.random()*6});}};
const v2UpdatePowerups=updatePowerups;
updatePowerups=function(){for(const pu of powerups){if(!pu.collected&&pu.type==='rage'&&runSkills.rage)pu._rageBoost=runSkills.rage;}const before=powerups.filter(p=>p.collected).length;v2UpdatePowerups();for(const pu of powerups){if(pu.collected&&pu._rageBoost&&!pu._boostDone){monster.rage+=110*pu._rageBoost;pu._boostDone=true;}}if(powerups.filter(p=>p.collected).length>before)sfx('pickup');};

// ── Civilians: simple city life that reacts to the monster ──
function makeCivilians(){
  const arr=[];for(let i=0;i<10+level*2;i++)arr.push({x:240+Math.random()*Math.max(200,worldW-480),y:GROUND-15,vx:(Math.random()>.5?1:-1)*(.35+Math.random()*.45),h:13,panic:Math.random()*100});return arr;
}
function updateCivilians(dt){
  if(!monster)return;for(const c of civilians){const dx=c.x-(monster.x+monster.w/2);if(Math.abs(dx)<300)c.vx+=(dx>0?.055:-.055)*dt;c.vx=Math.max(-2.4,Math.min(2.4,c.vx));c.x+=c.vx*dt;c.panic+=dt;if(c.x<20)c.x=worldW-20;if(c.x>worldW-20)c.x=20;}
}
function drawCivilians(){
  for(const c of civilians){ctx.save();ctx.translate(c.x,c.y);const step=Math.sin(c.panic*.25)*2;ctx.fillStyle='#d6a47d';ctx.fillRect(-2,-12,4,4);ctx.fillStyle=['#55aaff','#ff6655','#ffee66','#88dd88'][Math.abs((c.x|0))%4];ctx.fillRect(-3,-8,6,6);ctx.strokeStyle='#ddd';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-1,-2);ctx.lineTo(-3+step,1);ctx.moveTo(1,-2);ctx.lineTo(3-step,1);ctx.stroke();ctx.restore();}
}

// ── Boss identity: COLOSSO charges/missiles, TITAN shields/laser ──
const v2UpdateEnemies=updateEnemies;
updateEnemies=function(dt){
  v2UpdateEnemies(dt);const b=getBoss();if(!b)return;
  b.specialTimer=(b.specialTimer??150)-dt;b.bossShield=Math.max(0,(b.bossShield||0)-dt);
  if(b.bossName==='COLOSSO-X'){
    if(b.chargeTime>0){b.chargeTime-=dt;const d=(monster.x>b.x?1:-1);b.x+=d*5.3*dt;spawnParticles(b.x+b.w/2,b.y+b.h,1,'#ff9911',2,4,'spark');if(rectsOverlap(b,monster))hurtMonster(20);}
    if(b.specialTimer<=0){b.specialTimer=170+Math.random()*90;b.specialCount=(b.specialCount||0)+1;if(b.specialCount%2){b.chargeTime=42;sfx('boss');scorePop(b.x,b.y,'⚠ INVESTIDA!','#ff6644');}else{for(let k=-1;k<=1;k++){const ang=Math.atan2((monster.y+monster.h/2)-(b.y+10),(monster.x+monster.w/2)-(b.x+b.w/2))+k*.16;particles.push({x:b.x+b.w/2,y:b.y+8,vx:Math.cos(ang)*4.8,vy:Math.sin(ang)*4.8,life:85,maxLife:85,col:'#ff7733',size:11,type:'bullet',dmg:18});}sfx('boss');}}
  }else if(b.bossName==='TITAN-01'){
    if(b.specialTimer<=0){b.specialTimer=145+Math.random()*70;b.specialCount=(b.specialCount||0)+1;if(b.specialCount%2){b.bossShield=95;scorePop(b.x,b.y,'ESCUDO ÔMEGA','#66aaff');spawnParticles(b.x+b.w/2,b.y+b.h/2,25,'#4488ff',5,5,'spark');}else{const ang=Math.atan2((monster.y+monster.h/2)-(b.y+b.h/2),(monster.x+monster.w/2)-(b.x+b.w/2));for(let k=-2;k<=2;k++)particles.push({x:b.x+b.w/2,y:b.y+b.h*.4,vx:Math.cos(ang+k*.035)*8.5,vy:Math.sin(ang+k*.035)*8.5,life:58,maxLife:58,col:'#ff22cc',size:13,type:'bullet',dmg:25});scorePop(b.x,b.y,'LASER ÔMEGA!','#ff55dd');sfx('boss');}}
  }
};

// Shield reduces direct punch damage to TITAN.
const v2TryPunchEnemies=tryPunchEnemies;
tryPunchEnemies=function(m){const b=getBoss(),before=b?b.hp:0;v2TryPunchEnemies(m);if(b&&b.bossShield&&b.hp<before){const delta=before-b.hp;b.hp+=delta*.65;spawnParticles(b.x+b.w/2,b.y+b.h/2,5,'#66aaff',3,4,'spark');}};

// ── Phase decorations ──
function drawThemeBack(){
  const p=Math.min(level-1,5);ctx.save();
  if(p===1){for(let x=260;x<worldW;x+=520){ctx.fillStyle='#25201d';ctx.fillRect(x,GROUND-190,55,190);ctx.fillStyle='#44362e';ctx.fillRect(x+10,GROUND-245,15,58);ctx.fillRect(x+31,GROUND-225,12,38);ctx.fillStyle='rgba(160,150,140,.10)';ctx.beginPath();ctx.arc(x+17,GROUND-255,30,0,Math.PI*2);ctx.fill();}}
  else if(p===2){for(let x=220;x<worldW;x+=600){ctx.strokeStyle='#687061';ctx.lineWidth=2;for(let k=0;k<7;k++){ctx.beginPath();ctx.moveTo(x+k*28,GROUND);ctx.lineTo(x+k*28,GROUND-42);ctx.stroke();}ctx.beginPath();ctx.moveTo(x,GROUND-35);ctx.lineTo(x+168,GROUND-35);ctx.stroke();ctx.fillStyle='#303b30';ctx.fillRect(x+195,GROUND-95,42,95);ctx.strokeStyle='#8a9c83';ctx.beginPath();ctx.arc(x+216,GROUND-105,18,Math.PI,0);ctx.stroke();}}
  else if(p===3){for(let x=180;x<worldW;x+=480){ctx.fillStyle='#493725';for(let r=0;r<3;r++)for(let c=0;c<3;c++)ctx.fillRect(x+c*34,GROUND-30-r*22,30,19);ctx.strokeStyle='#4d6672';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(x+145,GROUND);ctx.lineTo(x+145,GROUND-160);ctx.lineTo(x+260,GROUND-160);ctx.stroke();ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+230,GROUND-160);ctx.lineTo(x+230,GROUND-75);ctx.stroke();}}
  else if(p===4){for(let x=190;x<worldW;x+=390){ctx.fillStyle='rgba(255,40,220,.16)';ctx.fillRect(x,GROUND-210,78,22);ctx.fillStyle='#ff55dd';ctx.font='16px Bebas Neue';ctx.textAlign='center';ctx.fillText(['NOVA','BYTE','RAGE'][((x/390)|0)%3],x+39,GROUND-194);}}
  else if(p===5){for(let x=240;x<worldW;x+=500){ctx.strokeStyle='rgba(100,170,255,.5)';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x,GROUND);ctx.lineTo(x+20,GROUND-145);ctx.lineTo(x+40,GROUND);ctx.stroke();ctx.fillStyle='rgba(80,150,255,.12)';ctx.beginPath();ctx.arc(x+20,GROUND-150,30+Math.sin(frameT*.04)*3,0,Math.PI*2);ctx.fill();ctx.fillStyle='#88ccff';ctx.beginPath();ctx.arc(x+20,GROUND-150,6,0,Math.PI*2);ctx.fill();}}
  else{for(let x=260;x<worldW;x+=520){ctx.strokeStyle='#606060';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,GROUND);ctx.lineTo(x,GROUND-65);ctx.stroke();ctx.fillStyle='rgba(255,230,160,.18)';ctx.beginPath();ctx.arc(x,GROUND-68,14,0,Math.PI*2);ctx.fill();}}
  ctx.restore();
}
function drawBossExtra(){
  const b=getBoss();if(!b)return;
  if(b.bossShield){ctx.save();ctx.strokeStyle='#66aaff';ctx.lineWidth=4;ctx.globalAlpha=.45+.2*Math.sin(frameT*.12);ctx.shadowColor='#66aaff';ctx.shadowBlur=18;ctx.beginPath();ctx.ellipse(b.x+b.w/2,b.y+b.h/2,b.w*.68,b.h*.75,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
  if(b.chargeTime>0){ctx.save();ctx.globalAlpha=.35;ctx.fillStyle='#ff6633';ctx.beginPath();ctx.ellipse(b.x+b.w/2,GROUND+1,b.w*.8,8,0,0,Math.PI*2);ctx.fill();ctx.restore();}
}
function drawDamageFx(){
  for(const b of buildings){if(b.destroyed&&b.ruinFire>0){for(let i=0;i<2;i++){const xx=b.x+b.fw*(.25+i*.45),yy=GROUND-6-Math.sin(frameT*.12+i)*4;ctx.fillStyle=i?'#ff3300':'#ffaa00';ctx.beginPath();ctx.moveTo(xx-5,GROUND-5);ctx.lineTo(xx,yy-12);ctx.lineTo(xx+5,GROUND-5);ctx.fill();}}else if(!b.destroyed&&b.hp/b.maxHp<.65){const r=1-b.hp/b.maxHp;ctx.strokeStyle=`rgba(30,5,0,${.25+r*.55})`;ctx.lineWidth=1.5;for(let k=0;k<Math.ceil(r*5);k++){const sx=b.x+b.fw*((k+1)/(Math.ceil(r*5)+1));ctx.beginPath();ctx.moveTo(sx,b.y+8);ctx.lineTo(sx-6,b.y+b.totalH*.32);ctx.lineTo(sx+5,b.y+b.totalH*.52);ctx.stroke();}}}
}

// ── Gamepad ──
let gamepadPrev={};
function pollGamepad(){
  const pads=navigator.getGamepads?navigator.getGamepads():[];const gp=[...pads].find(Boolean);const st=document.getElementById('pad-status');if(st)st.style.display=gp?'block':'none';if(!gp)return;
  const now={left:gp.axes[0]<-.28||gp.buttons[14]?.pressed,right:gp.axes[0]>.28||gp.buttons[15]?.pressed,up:gp.axes[1]<-.45||gp.buttons[12]?.pressed||gp.buttons[0]?.pressed,down:gp.axes[1]>.55||gp.buttons[13]?.pressed,z:gp.buttons[2]?.pressed,x:gp.buttons[1]?.pressed,s:gp.buttons[5]?.pressed,e:gp.buttons[3]?.pressed,pause:gp.buttons[9]?.pressed};
  const map={left:'ArrowLeft',right:'ArrowRight',up:'ArrowUp',down:'ArrowDown',z:'KeyZ',x:'KeyX',s:'KeyS',e:'KeyE'};for(const k in map){if(now[k]!==gamepadPrev[k])keys[map[k]]=!!now[k];}
  if(now.pause&&!gamepadPrev.pause&&gameRunning)togglePause();gamepadPrev=now;
}
window.addEventListener('gamepadconnected',()=>{const st=document.getElementById('pad-status');if(st)st.style.display='block';});

// ── Enhanced update/render/init ──
const v2InitLevel=initLevel;
initLevel=function(){
  v2InitLevel();selectedLevel=Math.min(level,LEVELS.length);
  const md=monsterDef();
  monster.dmgMult=md.damage*(1+.15*Math.max(0,monsterLevel-1))*Math.pow(1.18,runSkills.power);
  monster.speedMult=md.speed*(1+.08*Math.max(0,monsterLevel-1));
  monster.hpRegen=runSkills.regen;phaseStartScore=score;bestCombo=0;civilians=makeCivilians();for(const b of buildings)b.ruinFire=0;
};
const v2Update=update;
update=function(dt){pollGamepad();v2Update(dt);updateCivilians(dt);for(const b of buildings||[]){if(b.ruinFire>0){b.ruinFire-=dt;if(frameT%12===0)spawnSmoke(b.x+b.fw/2,GROUND-12,1);}}};
render=function(){
  ctx.save();if(shakeTimer>0){const s=shakeTimer*.6;ctx.translate((Math.random()-.5)*s,(Math.random()-.5)*s);}ctx.clearRect(-20,-20,W+40,H+40);ctx.save();ctx.translate(-camX,0);
  drawSky();drawBgCity();drawThemeBack();drawGround();drawPowerups();drawBuildings();drawDamageFx();drawDebris();drawCivilians();drawEnemies();drawBossExtra();drawParticles();drawMonster();drawShield();ctx.restore();ctx.restore();
};

// ── Fair stars + persistent campaign progression ──
phaseStars=function(){const phaseScore=Math.max(0,score-phaseStartScore);let stars=1;if(monster&&monster.hp/monster.maxHp>=.5)stars++;if(bestCombo>=8||phaseScore>=Math.max(900,level*850))stars++;return Math.min(3,stars);};
function recordPhase(doneLevel,stars){
  const k=String(doneLevel),phaseScore=Math.max(0,score-phaseStartScore);progress.stars[k]=Math.max(progress.stars[k]||0,stars);progress.records[k]=Math.max(progress.records[k]||0,phaseScore);progress.combos[k]=Math.max(progress.combos[k]||0,bestCombo);progress.unlocked=Math.max(progress.unlocked||1,Math.min(LEVELS.length,doneLevel+1));saveProgress();
}
checkWin=function(){
  if(buildings.every(b=>b.destroyed)&&enemies.every(e=>e.dead)){
    const done=level,stars=phaseStars();recordPhase(done,stars);score+=500*level;level++;
    if(level>LEVELS.length){progress.totalWins=(progress.totalWins||0)+1;saveProgress();showOverlay('win');}else showOverlay('nextlevel');
  }
};

// ── Campaign/start flow ──
function resetRun(startAt=1){score=0;lives=3;level=startAt;monsterLevel=1;xp=0;xpNext=100;runSkills={power:0,armor:0,rage:0,quake:0,roar:0,regen:0};upgradeOpen=false;document.getElementById('lvl-badge').style.opacity='0';}
startGame=function(){ensureAudio();resetRun(1);paused=false;document.getElementById('overlay').style.display='none';initLevel();};
function startSelectedPhase(n){if(n>(progress.unlocked||1))return;ensureAudio();selectedLevel=n;resetRun(n);paused=false;document.getElementById('overlay').style.display='none';initLevel();}
restartGame=function(){startSelectedPhase(Math.min(selectedLevel,progress.unlocked||1));};
nextLevel=function(){paused=false;document.getElementById('overlay').style.display='none';if(monster)monster.hp=Math.min(monster.maxHp,monster.hp+30);initLevel();};

showOverlay=function(type){
  paused=true;const ov=document.getElementById('overlay');ov.style.display='flex';ov.innerHTML='';document.getElementById('pause-btn').style.display='none';
  if(type==='gameover')ov.innerHTML=`<div class="ov-title">GAME<br>OVER</div><div class="ov-sub">VOCÊ FOI DERRUBADO</div><div class="ov-divider"></div><div class="ov-score-big">${score} PTS</div><div class="ov-body">Monstro Nv.${monsterLevel}<br>Melhor combo: ${bestCombo}x</div><button class="ov-btn" id="restartBtn">TENTAR DE NOVO</button><button class="ov-small-btn" id="menuBtn">MENU</button>`;
  else if(type==='win')ov.innerHTML=`<div class="ov-title" style="color:#00ffaa;text-shadow:0 0 50px #00ffaa,4px 4px 0 #006644">VITÓRIA!</div><div class="ov-sub" style="color:#00ffaa">OPERAÇÃO ÔMEGA DESTRUÍDA</div><div class="ov-divider" style="background:#00ffaa"></div><div class="ov-score-big">${score} PTS</div><div class="ov-body">Campanha concluída · Monstro Nv.${monsterLevel}<br>⚡ VOLT DESBLOQUEADO! · Seu progresso foi salvo.</div><button class="ov-btn" id="restartBtn">JOGAR DE NOVO</button><button class="ov-small-btn" id="menuBtn">MENU</button>`;
  else if(type==='nextlevel'){const doneLevel=level-1,cfg=LEVELS[doneLevel-1],stars=progress.stars[String(doneLevel)]||phaseStars();ov.innerHTML=`<div class="ov-title">FASE ${doneLevel}</div><div class="ov-sub">${cfg.name}</div><div class="ov-divider"></div><div class="ov-score-big">${'★'.repeat(stars)}${'☆'.repeat(3-stars)}</div><div class="ov-body">${Math.max(0,score-phaseStartScore)} PTS NA FASE · MELHOR COMBO ${bestCombo}x<br>+30 HP de bônus · Progresso salvo${doneLevel===3?'<br><b style="color:#ff8a32">🔥 GORAK DESBLOQUEADO!</b>':''}</div><button class="ov-btn" id="nextBtn">PRÓXIMA CIDADE</button><button class="ov-small-btn" id="menuBtn">MENU</button>`;}
  const nb=ov.querySelector('#nextBtn');if(nb)nb.addEventListener('click',nextLevel);const rb=ov.querySelector('#restartBtn');if(rb)rb.addEventListener('click',restartGame);const mb=ov.querySelector('#menuBtn');if(mb)mb.addEventListener('click',showMainMenu);
};

showMainMenu=function(){
  paused=true;upgradeOpen=false;document.getElementById('pause-btn').style.display='none';document.getElementById('mission-card').style.display='none';document.getElementById('boss-wrap').style.display='none';
  const ov=document.getElementById('overlay');ov.style.display='flex';
  const cards=LEVELS.map((l,i)=>{const n=i+1,locked=n>(progress.unlocked||1),st=progress.stars[String(n)]||0,rec=progress.records[String(n)]||0,combo=progress.combos[String(n)]||0;return `<button class="phase-card ${locked?'locked':''} ${selectedLevel===n?'selected':''}" data-phase="${n}" ${locked?'disabled':''}><b>${locked?'🔒 ':''}${n}. ${l.name}</b><span>${l.boss?'☠ '+l.boss:'DESTRUIÇÃO'}</span><span class="stars">${'★'.repeat(st)}${'☆'.repeat(3-st)}</span><span class="record">${rec?rec+' pts · '+combo+'x combo':'não concluída'}</span></button>`;}).join('');
  const monsterCards=Object.values(MONSTERS).map(m=>{const unlocked=monsterUnlocked(m.id),sel=selectedMonster===m.id;return `<button class="monster-card ${unlocked?'':'locked'} ${sel?'selected':''}" data-monster="${m.id}" ${unlocked?'':'disabled'}><span class="m-icon">${unlocked?m.icon:'🔒'}</span><b>${m.name}</b><small>${m.tag} · ${m.desc}</small><div class="m-stats">❤ ${m.hp} · 👊 ${Math.round(m.damage*100)}% · ⚡ ${Math.round(m.speed*100)}%</div></button>`;}).join('');
  ov.innerHTML=`<div class="ov-title">RAMPAGE</div><div class="ov-sub">MONSTER DESTRUCTION · V4</div><div class="ov-divider"></div><div class="monster-title">ESCOLHA SEU MONSTRO</div><div class="monster-grid">${monsterCards}</div><div class="monster-title">ESCOLHA A CIDADE</div><div class="menu-grid">${cards}</div><div class="ov-body">GORAK libera ao vencer a Fase 3. VOLT libera ao concluir a campanha.<br>Monstros, estrelas, recordes e fases ficam salvos neste navegador.</div><button class="ov-btn" id="playBtn">JOGAR · ${monsterDef().name} · FASE ${selectedLevel}</button><div class="menu-actions"><button class="ov-small-btn" id="controlsBtn">CONTROLES</button><button class="ov-small-btn" id="audioBtn">SOM: ${progress.audio?'LIGADO':'DESLIGADO'}</button><button class="ov-small-btn" id="resetBtn">ZERAR PROGRESSO</button></div><div class="save-badge">Campanhas concluídas: ${progress.totalWins||0}</div>`;
  ov.querySelectorAll('[data-monster]').forEach(card=>card.addEventListener('click',()=>{const id=card.dataset.monster;if(!monsterUnlocked(id))return;selectedMonster=id;progress.selectedMonster=id;saveProgress();showMainMenu();}));
  ov.querySelectorAll('[data-phase]').forEach(card=>card.addEventListener('click',()=>{selectedLevel=+card.dataset.phase;showMainMenu();}));
  ov.querySelector('#playBtn').addEventListener('click',()=>startSelectedPhase(selectedLevel));
  ov.querySelector('#controlsBtn').addEventListener('click',()=>alert(desktopMode()?'PC\nMover: ← → ou A / D\nPular/Escalar: ↑, W ou ESPAÇO\nSoco E/D: Z / X\nTremor: S ou C\nRugido: E ou R\nPausa: ESC\n\nGAMEPAD\nAnalógico/D-Pad: mover\nA: pular\nX/B: socos\nRB: tremor\nY: rugido\nStart: pausa':'CELULAR\nMover/Escalar: D-Pad\nSoco E/D: botões de soco\nTremor: botão 💥\nRugido: botão 😤\nPular: botão ⬆️'));
  ov.querySelector('#audioBtn').addEventListener('click',()=>{progress.audio=!progress.audio;saveProgress();if(progress.audio)ensureAudio();showMainMenu();});
  ov.querySelector('#resetBtn').addEventListener('click',()=>{if(confirm('Apagar estrelas, recordes, monstros e fases liberadas?')){progress=defaultSave();saveProgress();selectedLevel=1;selectedMonster='brutus';showMainMenu();}});
};



/* ═══════════════════════════════════════════════════════════════
   RAMPAGE 1.2 — 10 fases, objetivos, habilidades, boss phase 2,
   arremesso, música, galeria/skins e qualidade gráfica.
   ═══════════════════════════════════════════════════════════════ */
progress.version='1.2';
progress.quality=progress.quality||'high';
progress.skins=progress.skins||{brutus:'classic',gorak:'classic',volt:'classic'};
progress.mastery=progress.mastery||{brutus:{wins:0,bestCombo:0},gorak:{wins:0,bestCombo:0},volt:{wins:0,bestCombo:0}};
saveProgress();

// New HUD controls created dynamically, keeping the original HTML self-contained.
const specialBtn=document.createElement('button');specialBtn.id='special-btn';specialBtn.innerHTML='⚡<small>ESPECIAL [F]</small>';document.body.appendChild(specialBtn);
const grabBtn=document.createElement('button');grabBtn.id='grab-btn';grabBtn.innerHTML='✊<small>PEGAR [Q]</small>';document.body.appendChild(grabBtn);
const carryIndicator=document.createElement('div');carryIndicator.id='carry-indicator';document.body.appendChild(carryIndicator);
const qualityIndicator=document.createElement('div');qualityIndicator.id='quality-indicator';document.body.appendChild(qualityIndicator);
let specialPressed=false,grabPressed=false,carried=null,specialCooldown=0,phaseClock=0,objectiveTargets=[],bossPhaseShown=false,quakeCharge=0,thrownObjects=[];
let musicTimer=0,musicStep=0,musicMode='game';

function qLevel(){return progress.quality==='low'?0:progress.quality==='medium'?1:2;}
function refreshQuality(){qualityIndicator.textContent='GRÁFICOS: '+String(progress.quality).toUpperCase();}
refreshQuality();

// Extended palettes and themed city generation for all ten phases.
const V5_PALS=[
 [['#4f6f91','#294a67','#7899ba','#365c7e'],['#7b5b43','#553825','#a27b5b','#684834']],
 [['#57483d','#342b25','#806958','#493c33'],['#5b4c35','#33291c','#8a724a','#4a3b28']],
 [['#4b5946','#28342a','#718369','#36463a'],['#5e6257','#343932','#858b7a','#474d43']],
 [['#3f6070','#233c48','#65899a','#2f4d5a'],['#74563c','#4a3525','#9c7654','#5a432f']],
 [['#55416e','#302442','#7b5d9c','#413151'],['#35516d','#20334a','#547da0','#2b435b']],
 [['#353152','#1e1b35','#5c5585','#282440'],['#4a2f54','#2b1b35','#70437d','#392542']],
 [['#355948','#1e382b','#5d8d70','#284837'],['#536b5a','#304438','#78927f','#3e5949']],
 [['#29496d','#182e49','#4a78a6','#203a59'],['#3b526b','#233648','#607995','#30475d']],
 [['#456779','#294454','#6e94a8','#36576a'],['#5a6f78','#344b55','#8299a1','#465d67']],
 [['#63304e','#391b34','#934b73','#4e2941'],['#4c2849','#2d1930','#75416d','#3b213c']]
];
makeBuildings=function(lvl){
 const list=[];let x=180,phase=Math.min(lvl-1,9),cfg=levelCfg(),count=5+Math.min(12,lvl*2);
 if(phase===4)count=13;if(phase===7)count=15;if(phase===9)count=18;
 for(let i=0;i<count;i++){
   let floors=3+Math.floor(Math.random()*(3+Math.min(lvl,7))),fw=55+Math.floor(Math.random()*58),fh=27+Math.floor(Math.random()*11);
   if([1,3,6].includes(phase)){floors=2+Math.floor(Math.random()*4);fw=75+Math.floor(Math.random()*70);}
   if(phase===7){floors=4+Math.floor(Math.random()*6);fw=50+Math.floor(Math.random()*55);}if(phase===9){floors=5+Math.floor(Math.random()*7);}
   const totalH=floors*fh,hp=floors*(22+lvl*2)+lvl*18,winCols=Math.max(1,Math.floor((fw-12)/20)),pal=V5_PALS[phase][i%2];
   list.push({x,y:GROUND-totalH,w:fw,totalH,floors,fh,fw,hp,maxHp:hp,winCols,pal,damage:Array.from({length:floors},()=>Array(winCols).fill(0)),destroyed:false,hasTank:Math.random()>.62,fireTimer:0,isFire:false,fireX:0,fireY:0,kind:phase,ruinFire:0,objective:false});
   x+=fw+22+Math.floor(Math.random()*50);
 }
 worldW=Math.max(W*2.7,x+360);
 // Tag objective structures evenly across the map.
 if(cfg.type==='targets'){
   const need=Math.min(cfg.target,list.length);for(let j=0;j<need;j++){const idx=Math.floor((j+.5)*list.length/need);const b=list[Math.min(list.length-1,idx)];b.objective=true;b.maxHp*=1.25;b.hp=b.maxHp;}
 }
 return list;
};

// Bosses on 3, 6, 8 and 10, plus more varied enemy composition.
makeEnemies=function(lvl){
 const list=[],count=3+Math.min(12,lvl+2),pool=lvl<3?['soldier','soldier','jeep']:lvl<6?['soldier','jeep','tank','helicopter']:['soldier','jeep','tank','helicopter','tank'];
 for(let i=0;i<count;i++){const t=pool[i%pool.length],heli=t==='helicopter',jeep=t==='jeep',tank=t==='tank',w=jeep?54:heli?62:tank?68:28,h=jeep?32:heli?30:tank?38:44,hp=tank?125+lvl*27:45+lvl*21;list.push({x:480+i*(270+Math.random()*95),y:heli?GROUND-155-Math.random()*50:GROUND-h,w,h,vx:0,vy:0,dir:-1,hp,maxHp:hp,type:t,dead:false,fireTimer:tank?65:80+Math.random()*70,flying:heli,stunTimer:0,frame:0,walkCycle:0});}
 const name=levelCfg().boss;if(name){let mult=name==='OMEGA PRIME'?1.7:name==='AERON-X'?1.25:1;let hp=(560+lvl*130)*mult;list.push({x:Math.max(950,worldW-580),y:name==='AERON-X'?GROUND-145:GROUND-88,w:name==='OMEGA PRIME'?124:106,h:name==='OMEGA PRIME'?94:84,vx:0,vy:0,dir:-1,hp,maxHp:hp,type:'boss',dead:false,fireTimer:50,flying:name==='AERON-X',stunTimer:0,frame:0,walkCycle:0,bossName:name,bossPhase:1});}
 return list;
};

// Objective tracking and correct cross-phase reward.
function destroyedPct(){return buildings.length?buildings.filter(b=>b.destroyed).length/buildings.length:0;}
function targetDone(){return buildings.filter(b=>b.objective&&b.destroyed).length;}
function objectiveComplete(){
  const cfg=levelCfg(),boss=getBoss(),pct=destroyedPct();
  if(cfg.type==='destroyPct')return pct+0.0001>=cfg.target;
  if(cfg.type==='targets')return targetDone()>=cfg.target;
  if(cfg.type==='bossPct')return pct+0.0001>=cfg.target&&!boss;
  if(cfg.type==='survive')return phaseClock>=cfg.target&&pct+0.0001>=cfg.pct;
  if(cfg.type==='destroyEnemies')return pct+0.0001>=cfg.target&&enemies.every(e=>e.dead);
  return false;
}
let phaseEnding=false;
function objectiveText(){const cfg=levelCfg();if(cfg.type==='targets')return `${cfg.targetLabel||'ALVOS'} ${targetDone()}/${cfg.target}`;if(cfg.type==='survive')return `TEMPO ${Math.min(35,Math.floor(phaseClock/60))}/35s · DESTRUIÇÃO ${Math.floor(destroyedPct()*100)}%`;if(cfg.type==='bossPct')return `DESTRUIÇÃO ${Math.floor(destroyedPct()*100)}%/${Math.round(cfg.target*100)}% · ${getBoss()?'CHEFE ATIVO':'CHEFE DERROTADO'}`;if(cfg.type==='destroyEnemies')return `DESTRUIÇÃO ${Math.floor(destroyedPct()*100)}% · INIMIGOS ${enemies.filter(e=>!e.dead).length}`;return `DESTRUIÇÃO ${Math.floor(destroyedPct()*100)}%/${Math.round(cfg.target*100)}%`;}

let phaseMaxHpBonus=0,nextPhaseShield=false;
const v5BaseInit=initLevel;
initLevel=function(){phaseEnding=false;v5BaseInit();phaseClock=0;bossPhaseShown=false;carried=null;thrownObjects=[];specialCooldown=0;quakeCharge=0;objectiveTargets=buildings.filter(b=>b.objective);if(phaseMaxHpBonus){monster.maxHp+=phaseMaxHpBonus;monster.hp=monster.maxHp;}if(nextPhaseShield){monster.shield=true;nextPhaseShield=false;}refreshQuality();};
const v5BaseUpdateUI=updateUI;
updateUI=function(){
  v5BaseUpdateUI();
  const progressEl=document.getElementById('objective-progress');
  if(progressEl)progressEl.textContent=objectiveText();
};
checkWin=function(){
  if(phaseEnding||!objectiveComplete())return;
  phaseEnding=true;
  const done=level,stars=phaseStars();
  recordPhase(done,stars);
  score+=500*level;
  const md=progress.mastery[selectedMonster]||(progress.mastery[selectedMonster]={wins:0,bestCombo:0});
  md.wins++;md.bestCombo=Math.max(md.bestCombo||0,bestCombo);
  level++;saveProgress();
  if(level>LEVELS.length){progress.totalWins=(progress.totalWins||0)+1;saveProgress();showOverlay('win');}
  else showOverlay('nextlevel');
};
nextLevel=function(){paused=false;document.getElementById('overlay').style.display='none';phaseMaxHpBonus+=8;nextPhaseShield=true;initLevel();};

// Unique monster abilities: F. Brutus = berserk heal, Gorak = charged quake, Volt = electric dash.
function useSpecial(){if(paused||!monster||specialCooldown>0)return;const id=monster.monsterId;
 if(id==='brutus'){specialCooldown=420;monster.hp=Math.min(monster.maxHp,monster.hp+28);monster.rage=Math.max(monster.rage,150);spawnParticles(monster.x+monster.w/2,monster.y+monster.h/2,30,'#55ff88',7,6,'spark');scorePop(monster.x,monster.y,'INSTINTO BRUTAL!','#55ff88');sfx('power');}
 else if(id==='gorak'){specialCooldown=500;const range=260,dmg=95*(monster.dmgMult||1);shake(18);spawnParticles(monster.x+monster.w/2,GROUND,38,'#ff6a22',10,9,'rubble');for(const b of buildings)if(!b.destroyed&&Math.abs((b.x+b.fw/2)-(monster.x+monster.w/2))<range){b.hp-=dmg;if(b.hp<=0)destroyBuilding(b);}for(const e of enemies)if(!e.dead&&!e.flying&&Math.abs((e.x+e.w/2)-(monster.x+monster.w/2))<range){e.hp-=dmg*.75;if(e.hp<=0)e.dead=true;}scorePop(monster.x,monster.y,'FÚRIA SÍSMICA!','#ff8a33');sfx('smash');}
 else{specialCooldown=260;const dir=monster.dir||1;monster.vx=dir*18;monster.invincible=36;spawnParticles(monster.x+monster.w/2,monster.y+monster.h/2,28,'#55eaff',10,5,'spark');for(const e of enemies)if(!e.dead&&Math.abs((e.x+e.w/2)-(monster.x+monster.w/2))<150){e.hp-=55*(monster.dmgMult||1);if(e.hp<=0)e.dead=true;}scorePop(monster.x,monster.y,'DASH ELÉTRICO!','#66eeff');sfx('power');}
}
specialBtn.addEventListener('pointerdown',e=>{e.preventDefault();useSpecial();});
grabBtn.addEventListener('pointerdown',e=>{e.preventDefault();grabOrThrow();});
window.addEventListener('keydown',e=>{if(e.code==='KeyF'&&!e.repeat)useSpecial();if(e.code==='KeyQ'&&!e.repeat)grabOrThrow();});

// Brutus passive regeneration is now archetype-specific, in addition to upgrade regen.
function uniquePassive(dt){if(!monster)return;if(monster.monsterId==='brutus'&&monster.onGround&&monster.invincible<=0&&frameT%90===0)monster.hp=Math.min(monster.maxHp,monster.hp+.8);if(specialCooldown>0)specialCooldown=Math.max(0,specialCooldown-dt);specialBtn.style.opacity=specialCooldown>0?.42:1;specialBtn.innerHTML=(monster.monsterId==='gorak'?'💥':monster.monsterId==='volt'?'⚡':'💚')+`<small>${specialCooldown>0?'RECARGA '+Math.ceil(specialCooldown/60)+'s':'ESPECIAL [F]'}</small>`;}

// Grab / throw nearby jeep, tank or soldier with Q. Carried unit becomes a projectile.
function grabOrThrow(){if(paused||!monster)return;if(carried){const e=carried;carried=null;e.dead=false;e.carried=false;e.flying=true;e.type='thrown';e.vx=monster.dir*13;e.vy=-5;e.throwLife=95;e.throwDamage=e.w>60?150:95;e.life=95;e.maxLife=95;thrownObjects.push(e);carryIndicator.style.display='none';sfx('smash');return;}let cand=enemies.filter(e=>!e.dead&&e.type!=='boss'&&['jeep','tank','soldier'].includes(e.type)).sort((a,b)=>Math.abs(a.x-monster.x)-Math.abs(b.x-monster.x))[0];if(cand&&Math.abs((cand.x+cand.w/2)-(monster.x+monster.w/2))<90){cand.dead=true;cand.carried=true;carried=cand;carryIndicator.textContent='SEGURANDO '+cand.type.toUpperCase()+' · Q ARREMESSA';carryIndicator.style.display='block';sfx('pickup');}}
function updateThrown(dt){if(carried){carried.x=monster.x+monster.w/2-carried.w/2+monster.dir*30;carried.y=monster.y-10;}for(let i=thrownObjects.length-1;i>=0;i--){const p=thrownObjects[i];p.throwLife-=dt;p.vy+=GRAVITY*.45*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;let hit=false;for(const b of buildings)if(!b.destroyed&&p.x+p.w>b.x&&p.x<b.x+b.fw&&p.y+p.h>b.y){b.hp-=p.throwDamage;spawnRubble(p.x,p.y,12);shake(10);if(b.hp<=0)destroyBuilding(b);hit=true;break;}if(p.y+p.h>=GROUND||p.throwLife<=0||hit){spawnParticles(p.x,p.y,12,'#ff8833',6,6,'spark');thrownObjects.splice(i,1);}}}

// Boss second phases at 50% HP, with stronger patterns.
const v5EnemyUpdate=updateEnemies;
updateEnemies=function(dt){v5EnemyUpdate(dt);const b=getBoss();if(!b)return;const ratio=b.hp/b.maxHp;if(ratio<=.5&&b.bossPhase!==2){b.bossPhase=2;b.specialTimer=20;b.fireTimer=Math.min(b.fireTimer,28);shake(14);scorePop(b.x,b.y,'⚠ FASE 2!','#ff3355');spawnParticles(b.x+b.w/2,b.y+b.h/2,35,'#ff3355',8,7,'spark');sfx('boss');}
 if(b.bossPhase===2){b.fireTimer-=.35*dt;if(b.bossName==='COLOSSO-X')b.vx+=(monster.x>b.x?.03:-.03)*dt;else if(b.bossName==='TITAN-01'&&frameT%95===0){for(let k=-2;k<=2;k++)particles.push({x:b.x+b.w/2,y:b.y+20,vx:k*1.3,vy:5.5,life:75,maxLife:75,col:'#ff22cc',size:11,type:'bullet',dmg:20});}else if(b.bossName==='AERON-X'){b.vx+=(monster.x>b.x?.05:-.05)*dt;b.y=GROUND-150+Math.sin(frameT*.08)*35;if(frameT%75===0)for(let k=0;k<5;k++)particles.push({x:b.x+b.w/2+k*6,y:b.y+b.h,vx:(k-2)*.7,vy:5,life:85,maxLife:85,col:'#66ddff',size:10,type:'bullet',dmg:19});}else if(b.bossName==='OMEGA PRIME'){if(frameT%65===0){const a=Math.atan2(monster.y-b.y,monster.x-b.x);for(let k=-3;k<=3;k++)particles.push({x:b.x+b.w/2,y:b.y+b.h*.4,vx:Math.cos(a+k*.08)*7,vy:Math.sin(a+k*.08)*7,life:70,maxLife:70,col:'#ff44aa',size:12,type:'bullet',dmg:24});}b.bossShield=(frameT%240<70)?40:0;}}
};

// Procedural music: tiny dynamic sequencer, no external MP3.
function musicTick(){if(!progress.audio||paused)return;musicTimer--;if(musicTimer>0)return;musicTimer=13;const boss=!!getBoss(),root=boss?55:(level>=7?73:65),seq=boss?[0,0,7,3,0,10,7,3]:[0,7,5,3,0,7,10,7],semi=seq[musicStep++%seq.length],freq=root*Math.pow(2,semi/12);tone(freq,.10,boss?'sawtooth':'square',boss?.012:.008,-4);if(musicStep%4===0)tone(root/2,.08,'square',.008,-8);}

// Graphics quality controls particle/civilian load.
const v5SpawnParticles=spawnParticles;
spawnParticles=function(x,y,n,col,speed,size,type){const q=qLevel(),mul=q===0?.38:q===1?.68:1;return v5SpawnParticles(x,y,Math.max(1,Math.round(n*mul)),col,speed,size,type);};
const v5MakeCivilians=makeCivilians;
makeCivilians=function(){const a=v5MakeCivilians();return qLevel()===0?a.slice(0,Math.min(6,a.length)):qLevel()===1?a.slice(0,Math.min(12,a.length)):a;};

// Objective structures, carried objects, and extra phase landmarks.
const v5DrawBuildings=drawBuildings;
drawBuildings=function(){v5DrawBuildings();for(const b of buildings){if(!b.objective||b.destroyed)continue;ctx.save();ctx.strokeStyle=levelCfg().accent;ctx.lineWidth=3;ctx.globalAlpha=.55+.25*Math.sin(frameT*.1);ctx.shadowColor=levelCfg().accent;ctx.shadowBlur=14;ctx.strokeRect(b.x-3,b.y-3,b.fw+6,b.totalH+6);ctx.fillStyle=levelCfg().accent;ctx.font='11px Bebas Neue';ctx.textAlign='center';ctx.fillText(levelCfg().targetLabel||'ALVO',b.x+b.fw/2,b.y-16);ctx.restore();}};
const v5DrawTheme=drawThemeBack;
drawThemeBack=function(){v5DrawTheme();const p=level-1;ctx.save();if(p===6){for(let x=350;x<worldW;x+=600){ctx.fillStyle='#183d2a';ctx.fillRect(x,GROUND-150,75,150);ctx.strokeStyle='#76ff8d';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x+38,GROUND-112,26,0,Math.PI*2);ctx.stroke();ctx.fillStyle='rgba(70,255,110,.18)';ctx.fillRect(x+10,GROUND-105,56,75);}}else if(p===7){for(let x=280;x<worldW;x+=650){ctx.strokeStyle='#527da8';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(x,GROUND);ctx.lineTo(x+60,GROUND-210);ctx.lineTo(x+120,GROUND);ctx.stroke();ctx.fillStyle='rgba(80,170,255,.12)';ctx.fillRect(x+15,GROUND-180,90,25);}}else if(p===8){ctx.fillStyle='rgba(190,240,255,.08)';for(let x=100;x<worldW;x+=300){ctx.beginPath();ctx.moveTo(x,GROUND);ctx.lineTo(x+100,GROUND-60);ctx.lineTo(x+180,GROUND);ctx.fill();}}else if(p===9){for(let x=240;x<worldW;x+=520){ctx.strokeStyle='rgba(255,70,180,.45)';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x,GROUND);ctx.lineTo(x+30,GROUND-190);ctx.lineTo(x+60,GROUND);ctx.stroke();ctx.fillStyle='rgba(255,50,170,.12)';ctx.beginPath();ctx.arc(x+30,GROUND-195,36+Math.sin(frameT*.05)*4,0,Math.PI*2);ctx.fill();}}ctx.restore();};

const v5BaseRender=render;
render=function(){v5BaseRender();ctx.save();ctx.translate(-camX,0);if(carried)drawCarriedObject(carried);for(const t of thrownObjects)drawCarriedObject(t);ctx.restore();};
function drawCarriedObject(e){ctx.save();ctx.translate(e.x,e.y);ctx.globalAlpha=.95;ctx.fillStyle=e.type==='tank'?'#596337':e.type==='jeep'?'#52633d':'#668855';ctx.fillRect(0,0,e.w,e.h);ctx.strokeStyle='#111';ctx.lineWidth=2;ctx.strokeRect(0,0,e.w,e.h);ctx.restore();}

// Replace update to add objectives, music, thrown objects and unique passive.
const v5BaseUpdate=update;
update=function(dt){
  v5BaseUpdate(dt);
  if(!paused){
    phaseClock+=dt;
    uniquePassive(dt);
    updateThrown(dt);
    musicTick();
    if(frameT%10===0)updateUI();
    checkWin();
  }
};

// Extend gamepad: LT/RT special and grab.
const v5PollGamepad=pollGamepad;
pollGamepad=function(){v5PollGamepad();const pads=navigator.getGamepads?navigator.getGamepads():[],gp=[...pads].find(Boolean);if(!gp)return;const sp=gp.buttons[4]?.pressed||gp.buttons[7]?.pressed,gr=gp.buttons[6]?.pressed;if(sp&&!specialPressed)useSpecial();if(gr&&!grabPressed)grabOrThrow();specialPressed=sp;grabPressed=gr;};

// Skins alter the rendered palette by temporarily changing selected archetype colors using canvas tint glow.
const SKINS={brutus:['classic','nuclear','obsidian'],gorak:['classic','magma','bones'],volt:['classic','neon','omega']};
const SKIN_NAMES={classic:'Clássico',nuclear:'Nuclear',obsidian:'Obsidiana',magma:'Magma',bones:'Ossos',neon:'Neon',omega:'Ômega'};
const v5DrawMonster=drawMonster;
drawMonster=function(){v5DrawMonster();const skin=(progress.skins||{})[selectedMonster]||'classic';if(skin==='classic'||!monster)return;ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=.10+.03*Math.sin(frameT*.1);ctx.fillStyle=skin==='nuclear'?'#8cff2f':skin==='obsidian'?'#8d55ff':skin==='magma'?'#ff3b00':skin==='bones'?'#fff0bb':skin==='neon'?'#00ffcc':'#ff33dd';ctx.beginPath();ctx.ellipse(monster.x+monster.w/2,monster.y+monster.h/2,monster.w*.68,monster.h*.58,0,0,Math.PI*2);ctx.fill();ctx.restore();};

function showGallery(){paused=true;const ov=document.getElementById('overlay');ov.style.display='flex';document.getElementById('pause-btn').style.display='none';const cards=Object.values(MONSTERS).map(m=>{const unlocked=monsterUnlocked(m.id),ma=progress.mastery[m.id]||{wins:0,bestCombo:0};return `<div class="gallery-card"><b>${unlocked?m.icon:'🔒'} ${m.name}</b><div>${m.desc}</div><div style="margin-top:7px;color:#999">Vitórias: ${ma.wins||0} · Melhor combo: ${ma.bestCombo||0}x</div><div class="skin-row">${SKINS[m.id].map((sk,i)=>`<button class="skin-chip ${progress.skins[m.id]===sk?'selected':''}" data-skin="${m.id}:${sk}" ${(!unlocked||i>0&&ma.wins<(i*2))?'disabled':''}>${SKIN_NAMES[sk]}${i?` · ${i*2} vit.`:''}</button>`).join('')}</div></div>`}).join('');ov.innerHTML=`<div class="ov-title" style="font-size:55px">GALERIA</div><div class="ov-sub">MONSTROS E SKINS</div><div class="gallery-grid">${cards}</div><button class="ov-btn" id="backGallery">VOLTAR</button>`;ov.querySelectorAll('[data-skin]').forEach(b=>b.addEventListener('click',()=>{const [id,sk]=b.dataset.skin.split(':');progress.skins[id]=sk;saveProgress();showGallery();}));ov.querySelector('#backGallery').onclick=showMainMenu;}
function showGraphics(){paused=true;const ov=document.getElementById('overlay');ov.style.display='flex';const opts=['low','medium','high'];ov.innerHTML=`<div class="ov-title" style="font-size:54px">GRÁFICOS</div><div class="ov-sub">QUALIDADE / DESEMPENHO</div><div class="settings-grid">${opts.map(q=>`<button data-q="${q}" class="${progress.quality===q?'selected':''}">${q==='low'?'BAIXO':q==='medium'?'MÉDIO':'ALTO'}</button>`).join('')}</div><div class="ov-body">BAIXO reduz partículas e civis. MÉDIO equilibra. ALTO usa todos os efeitos.</div><button class="ov-btn" id="backGraphics">VOLTAR</button>`;ov.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{progress.quality=b.dataset.q;saveProgress();refreshQuality();showGraphics();});ov.querySelector('#backGraphics').onclick=showMainMenu;}

// V1.2 menu: 10 phases + gallery + graphics.
showMainMenu=function(){paused=true;upgradeOpen=false;document.getElementById('pause-btn').style.display='none';document.getElementById('mission-card').style.display='none';document.getElementById('boss-wrap').style.display='none';carryIndicator.style.display='none';const ov=document.getElementById('overlay');ov.style.display='flex';selectedLevel=Math.min(selectedLevel||1,LEVELS.length);const cards=LEVELS.map((l,i)=>{const n=i+1,locked=n>(progress.unlocked||1),st=progress.stars[String(n)]||0,rec=progress.records[String(n)]||0,combo=progress.combos[String(n)]||0;return `<button class="phase-card ${locked?'locked':''} ${selectedLevel===n?'selected':''}" data-phase="${n}" ${locked?'disabled':''}><b>${locked?'🔒 ':''}${n}. ${l.name}</b><span>${l.boss?'☠ '+l.boss:l.objective}</span><span class="stars">${'★'.repeat(st)}${'☆'.repeat(3-st)}</span><span class="record">${rec?rec+' pts · '+combo+'x combo':'não concluída'}</span></button>`;}).join('');const monsterCards=Object.values(MONSTERS).map(m=>{const unlocked=monsterUnlocked(m.id),sel=selectedMonster===m.id;return `<button class="monster-card ${unlocked?'':'locked'} ${sel?'selected':''}" data-monster="${m.id}" ${unlocked?'':'disabled'}><span class="m-icon">${unlocked?m.icon:'🔒'}</span><b>${m.name}</b><small>${m.tag} · ${m.desc}</small><div class="m-stats">❤ ${m.hp} · 👊 ${Math.round(m.damage*100)}% · ⚡ ${Math.round(m.speed*100)}%</div></button>`;}).join('');ov.innerHTML=`<div class="ov-title">RAMPAGE</div><div class="ov-sub">MONSTER DESTRUCTION · V1.2 · 10 FASES</div><div class="monster-title">ESCOLHA SEU MONSTRO</div><div class="monster-grid">${monsterCards}</div><div class="monster-title">ESCOLHA A CIDADE</div><div class="menu-grid">${cards}</div><button class="ov-btn" id="playBtn">JOGAR · ${monsterDef().name} · FASE ${selectedLevel}</button><div class="menu-actions"><button class="ov-small-btn" id="galleryBtn">GALERIA / SKINS</button><button class="ov-small-btn" id="graphicsBtn">GRÁFICOS</button><button class="ov-small-btn" id="controlsBtn">CONTROLES</button><button class="ov-small-btn" id="audioBtn">SOM: ${progress.audio?'LIGADO':'DESLIGADO'}</button><button class="ov-small-btn" id="resetBtn">ZERAR PROGRESSO</button></div><div class="save-badge">Campanhas concluídas: ${progress.totalWins||0} · Progresso salvo neste navegador</div>`;ov.querySelectorAll('[data-monster]').forEach(c=>c.onclick=()=>{selectedMonster=c.dataset.monster;progress.selectedMonster=selectedMonster;saveProgress();showMainMenu();});ov.querySelectorAll('[data-phase]').forEach(c=>c.onclick=()=>{selectedLevel=+c.dataset.phase;showMainMenu();});ov.querySelector('#playBtn').onclick=()=>startSelectedPhase(selectedLevel);ov.querySelector('#galleryBtn').onclick=showGallery;ov.querySelector('#graphicsBtn').onclick=showGraphics;ov.querySelector('#controlsBtn').onclick=()=>alert(desktopMode()?'PC\nMover: A/D ou ←/→\nPular: W/↑/ESPAÇO\nSocos: Z/X\nTremor: S/C\nRugido: E/R\nHabilidade exclusiva: F\nAgarrar/Arremessar: Q\nPausa: ESC\n\nGAMEPAD\nLB/RT: especial · LT: agarrar/arremessar':'CELULAR\nUse os botões na tela.\nBotão especial fica acima dos ataques.\nToque no especial para a habilidade exclusiva.');ov.querySelector('#audioBtn').onclick=()=>{progress.audio=!progress.audio;saveProgress();showMainMenu();};ov.querySelector('#resetBtn').onclick=()=>{if(confirm('Apagar todo o progresso?')){progress=defaultSave();progress.version='1.2';progress.quality='high';progress.skins={brutus:'classic',gorak:'classic',volt:'classic'};progress.mastery={brutus:{wins:0,bestCombo:0},gorak:{wins:0,bestCombo:0},volt:{wins:0,bestCombo:0}};saveProgress();selectedLevel=1;selectedMonster='brutus';showMainMenu();}};};

// V1.2 result screens mention the actual phase rewards.
showOverlay=function(type){paused=true;const ov=document.getElementById('overlay');ov.style.display='flex';ov.innerHTML='';document.getElementById('pause-btn').style.display='none';if(type==='gameover')ov.innerHTML=`<div class="ov-title">GAME<br>OVER</div><div class="ov-sub">VOCÊ FOI DERRUBADO</div><div class="ov-score-big">${score} PTS</div><div class="ov-body">${monsterDef().name} Nv.${monsterLevel} · Melhor combo ${bestCombo}x</div><button class="ov-btn" id="restartBtn">TENTAR DE NOVO</button><button class="ov-small-btn" id="menuBtn">MENU</button>`;else if(type==='win')ov.innerHTML=`<div class="ov-title" style="color:#00ffaa">VITÓRIA!</div><div class="ov-sub">AS 10 ZONAS FORAM DESTRUÍDAS</div><div class="ov-score-big">${score} PTS</div><div class="ov-body">Campanha concluída com ${monsterDef().name}. Novas skins podem ter sido liberadas pela maestria.</div><button class="ov-btn" id="restartBtn">JOGAR DE NOVO</button><button class="ov-small-btn" id="menuBtn">MENU</button>`;else if(type==='nextlevel'){const done=level-1,cfg=LEVELS[done-1],stars=progress.stars[String(done)]||phaseStars();ov.innerHTML=`<div class="ov-title">FASE ${done}</div><div class="ov-sub">${cfg.name}</div><div class="ov-score-big">${'★'.repeat(stars)}${'☆'.repeat(3-stars)}</div><div class="ov-body">Melhor combo ${bestCombo}x · próxima fase: +8 HP máximo e escudo inicial.${done===3?'<br><b style="color:#ff8a32">🔥 GORAK DESBLOQUEADO!</b>':''}</div><button class="ov-btn" id="nextBtn">PRÓXIMA FASE</button><button class="ov-small-btn" id="menuBtn">MENU</button>`;}const nb=ov.querySelector('#nextBtn');if(nb)nb.onclick=nextLevel;const rb=ov.querySelector('#restartBtn');if(rb)rb.onclick=restartGame;const mb=ov.querySelector('#menuBtn');if(mb)mb.onclick=showMainMenu;};

setTimeout(showMainMenu,0);
