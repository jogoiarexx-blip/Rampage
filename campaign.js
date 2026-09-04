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
progress.version='1.5.3';
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
showMainMenu=function(){paused=true;upgradeOpen=false;document.getElementById('pause-btn').style.display='none';document.getElementById('mission-card').style.display='none';document.getElementById('boss-wrap').style.display='none';carryIndicator.style.display='none';const ov=document.getElementById('overlay');ov.style.display='flex';selectedLevel=Math.min(selectedLevel||1,LEVELS.length);const cards=LEVELS.map((l,i)=>{const n=i+1,locked=n>(progress.unlocked||1),st=progress.stars[String(n)]||0,rec=progress.records[String(n)]||0,combo=progress.combos[String(n)]||0;return `<button class="phase-card ${locked?'locked':''} ${selectedLevel===n?'selected':''}" data-phase="${n}" ${locked?'disabled':''}><b>${locked?'🔒 ':''}${n}. ${l.name}</b><span>${l.boss?'☠ '+l.boss:l.objective}</span><span class="stars">${'★'.repeat(st)}${'☆'.repeat(3-st)}</span><span class="record">${rec?rec+' pts · '+combo+'x combo':'não concluída'}</span></button>`;}).join('');const monsterCards=Object.values(MONSTERS).map(m=>{const unlocked=monsterUnlocked(m.id),sel=selectedMonster===m.id;return `<button class="monster-card ${unlocked?'':'locked'} ${sel?'selected':''}" data-monster="${m.id}" ${unlocked?'':'disabled'}><span class="m-icon">${unlocked?m.icon:'🔒'}</span><b>${m.name}</b><small>${m.tag} · ${m.desc}</small><div class="m-stats">❤ ${m.hp} · 👊 ${Math.round(m.damage*100)}% · ⚡ ${Math.round(m.speed*100)}%</div></button>`;}).join('');ov.innerHTML=`<div class="ov-title">RAMPAGE</div><div class="ov-sub">MONSTER DESTRUCTION · V1.5.3 · 10 FASES</div><div class="monster-title">ESCOLHA SEU MONSTRO</div><div class="monster-grid">${monsterCards}</div><div class="monster-title">ESCOLHA A CIDADE</div><div class="menu-grid">${cards}</div><button class="ov-btn" id="playBtn">JOGAR · ${monsterDef().name} · FASE ${selectedLevel}</button><div class="menu-actions"><button class="ov-small-btn" id="galleryBtn">GALERIA / SKINS</button><button class="ov-small-btn" id="graphicsBtn">GRÁFICOS</button><button class="ov-small-btn" id="controlsBtn">CONTROLES</button><button class="ov-small-btn" id="audioBtn">SOM: ${progress.audio?'LIGADO':'DESLIGADO'}</button><button class="ov-small-btn" id="resetBtn">ZERAR PROGRESSO</button></div><div class="save-badge">Campanhas concluídas: ${progress.totalWins||0} · Progresso salvo neste navegador</div>`;ov.querySelectorAll('[data-monster]').forEach(c=>c.onclick=()=>{selectedMonster=c.dataset.monster;progress.selectedMonster=selectedMonster;saveProgress();showMainMenu();});ov.querySelectorAll('[data-phase]').forEach(c=>c.onclick=()=>{selectedLevel=+c.dataset.phase;showMainMenu();});ov.querySelector('#playBtn').onclick=()=>startSelectedPhase(selectedLevel);ov.querySelector('#galleryBtn').onclick=showGallery;ov.querySelector('#graphicsBtn').onclick=showGraphics;ov.querySelector('#controlsBtn').onclick=()=>alert(desktopMode()?'PC\nMover: A/D ou ←/→\nPular: W/↑/ESPAÇO\nSocos: Z/X\nTremor: S/C\nRugido: E/R\nHabilidade exclusiva: F\nAgarrar/Arremessar: Q\nPausa: ESC\n\nGAMEPAD\nLB/RT: especial · LT: agarrar/arremessar':'CELULAR\nUse os botões na tela.\nBotão especial fica acima dos ataques.\nToque no especial para a habilidade exclusiva.');ov.querySelector('#audioBtn').onclick=()=>{progress.audio=!progress.audio;saveProgress();showMainMenu();};ov.querySelector('#resetBtn').onclick=()=>{if(confirm('Apagar todo o progresso?')){progress=defaultSave();progress.version='1.5.3';progress.quality='high';progress.skins={brutus:'classic',gorak:'classic',volt:'classic'};progress.mastery={brutus:{wins:0,bestCombo:0},gorak:{wins:0,bestCombo:0},volt:{wins:0,bestCombo:0}};saveProgress();selectedLevel=1;selectedMonster='brutus';showMainMenu();}};};

// V1.2 result screens mention the actual phase rewards.
showOverlay=function(type){paused=true;const ov=document.getElementById('overlay');ov.style.display='flex';ov.innerHTML='';document.getElementById('pause-btn').style.display='none';if(type==='gameover')ov.innerHTML=`<div class="ov-title">GAME<br>OVER</div><div class="ov-sub">VOCÊ FOI DERRUBADO</div><div class="ov-score-big">${score} PTS</div><div class="ov-body">${monsterDef().name} Nv.${monsterLevel} · Melhor combo ${bestCombo}x</div><button class="ov-btn" id="restartBtn">TENTAR DE NOVO</button><button class="ov-small-btn" id="menuBtn">MENU</button>`;else if(type==='win')ov.innerHTML=`<div class="ov-title" style="color:#00ffaa">VITÓRIA!</div><div class="ov-sub">AS 10 ZONAS FORAM DESTRUÍDAS</div><div class="ov-score-big">${score} PTS</div><div class="ov-body">Campanha concluída com ${monsterDef().name}. Novas skins podem ter sido liberadas pela maestria.</div><button class="ov-btn" id="restartBtn">JOGAR DE NOVO</button><button class="ov-small-btn" id="menuBtn">MENU</button>`;else if(type==='nextlevel'){const done=level-1,cfg=LEVELS[done-1],stars=progress.stars[String(done)]||phaseStars();ov.innerHTML=`<div class="ov-title">FASE ${done}</div><div class="ov-sub">${cfg.name}</div><div class="ov-score-big">${'★'.repeat(stars)}${'☆'.repeat(3-stars)}</div><div class="ov-body">Melhor combo ${bestCombo}x · próxima fase: +8 HP máximo e escudo inicial.${done===3?'<br><b style="color:#ff8a32">🔥 GORAK DESBLOQUEADO!</b>':''}</div><button class="ov-btn" id="nextBtn">PRÓXIMA FASE</button><button class="ov-small-btn" id="menuBtn">MENU</button>`;}const nb=ov.querySelector('#nextBtn');if(nb)nb.onclick=nextLevel;const rb=ov.querySelector('#restartBtn');if(rb)rb.onclick=restartGame;const mb=ov.querySelector('#menuBtn');if(mb)mb.onclick=showMainMenu;};

setTimeout(showMainMenu,0);
