function levelCfg(){return LEVELS[Math.min(level-1,LEVELS.length-1)];}
function getBoss(){return enemies?enemies.find(e=>!e.dead&&e.type==='boss'):null;}

/* ── MONSTER ── */
function makeMonster(){
  return{x:120,y:0,w:48,h:88,vx:0,vy:0,onGround:false,
    dir:1,hp:100,maxHp:100,
    punchL:0,punchR:0,punchDmgL:false,punchDmgR:false,punchDuration:24,
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
  if(keys['KeyZ']&&m.punchL<=0){m.punchL=m.punchDuration||24;m.punchDmgL=false;}
  if(keys['KeyX']&&m.punchR<=0){m.punchR=m.punchDuration||24;m.punchDmgR=false;}
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
  const total=m.punchDuration||24;
  if(timer<=0||dmgDone)return;
  const activeStart=total*0.32, activeEnd=total*0.72;
  if(timer<activeStart||timer>activeEnd)return;
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
      const total=m.punchDuration||24;
      const leftActive=(m.punchL>=total*0.32&&m.punchL<=total*0.72&&!m.punchDmgL);
      const rightActive=(m.punchR>=total*0.32&&m.punchR<=total*0.72&&!m.punchDmgR);
      const punching=leftActive||rightActive;
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


