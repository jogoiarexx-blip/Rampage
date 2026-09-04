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

