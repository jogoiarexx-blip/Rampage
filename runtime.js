/* ═══════════════════════════════════════════════════════════════
   RAMPAGE 1.3 — REAL GRAPHICS, STATE MACHINE, LOADING & PAUSE
   ═══════════════════════════════════════════════════════════════ */
const RAMPAGE_VERSION='1.5.3';
const GameState=Object.freeze({MENU:'menu',LOADING:'loading',PLAYING:'playing',PAUSED:'paused',RESULT:'result',GAMEOVER:'gameover'});
let gameState=GameState.MENU;
let effectiveQuality='medium';
let renderScale=1;
let fpsEMA=60,fpsFrames=0,fpsAccum=0,fpsStableHigh=0,fpsLow=0,lastQualityToast=0;
let loadingToken=0;
const V13_TIPS=['Destrua os alvos marcados para avançar.','Combos altos melhoram sua pontuação da fase.','Use o especial no momento certo contra chefes.','No modo AUTO a qualidade se ajusta ao desempenho.'];

progress.version=RAMPAGE_VERSION;
if(!['auto','low','medium','high'].includes(progress.quality))progress.quality='auto';
saveProgress();

const loadingScreen=document.createElement('div');
loadingScreen.id='loading-screen';
loadingScreen.innerHTML=`<div class="loading-panel"><div class="loading-kicker">PREPARANDO DESTRUIÇÃO</div><div class="loading-title" id="loading-title">CARREGANDO</div><div class="loading-tip" id="loading-tip"></div><div class="loading-track"><div id="loading-fill"></div></div><div class="loading-meta"><span id="loading-step">INICIANDO</span><span id="loading-pct">0%</span></div></div>`;
document.getElementById('root').appendChild(loadingScreen);
const loadingFill=document.getElementById('loading-fill'),loadingTitle=document.getElementById('loading-title'),loadingTip=document.getElementById('loading-tip'),loadingStep=document.getElementById('loading-step'),loadingPct=document.getElementById('loading-pct');

function clearHeldInputs(){for(const k of Object.keys(keys))keys[k]=false;document.querySelectorAll('.active').forEach(el=>el.classList.remove('active'));specialPressed=false;grabPressed=false;}
function suspendGameAudio(){try{if(audioCtx&&audioCtx.state==='running')audioCtx.suspend();}catch(e){}}
function resumeGameAudio(){try{if(progress.audio&&audioCtx&&audioCtx.state==='suspended')audioCtx.resume();}catch(e){}}

function hardwareQuality(){
  const cores=navigator.hardwareConcurrency||4,mem=navigator.deviceMemory||4,mobile=!desktopMode();
  if(cores<=2||mem<=2)return 'low';
  if(cores>=8&&mem>=6&&!mobile)return 'high';
  return 'medium';
}
function qualityRank(q){return q==='low'?0:q==='medium'?1:2;}
function rankQuality(n){return n<=0?'low':n===1?'medium':'high';}
function qLevel(){return qualityRank(effectiveQuality);}
function applyQuality(reason=''){
  const chosen=progress.quality==='auto'?(effectiveQuality||hardwareQuality()):progress.quality;
  effectiveQuality=chosen;
  renderScale=chosen==='low'?.70:chosen==='medium'?.86:1;
  document.body.classList.toggle('quality-low',chosen==='low');
  resizeCanvas();
  if(monster)monster.y=Math.min(monster.y,GROUND-monster.h);
  if(reason)showQualityToast(reason);
}
function showQualityToast(reason=''){
  const q=progress.quality==='auto'?`AUTO · ${({low:'LEVE',medium:'MÉDIO',high:'FORTE'}[effectiveQuality]||effectiveQuality.toUpperCase())}`:({low:'LEVE',medium:'MÉDIO',high:'FORTE'}[effectiveQuality]||effectiveQuality.toUpperCase());
  qualityIndicator.textContent=`GRÁFICOS: ${q}${reason?' · '+reason:''}`;
  qualityIndicator.classList.add('show');qualityIndicator.style.opacity='1';
  clearTimeout(qualityIndicator._hide);qualityIndicator._hide=setTimeout(()=>{qualityIndicator.style.opacity='0';setTimeout(()=>qualityIndicator.classList.remove('show'),260);},1800);
}
resizeCanvas=function(){
  const vw=window.innerWidth,vh=window.innerHeight,scale=Math.max(.6,renderScale||1);
  W=canvas.width=Math.max(320,Math.round(vw*scale));H=canvas.height=Math.max(240,Math.round(vh*scale));
  GROUND=desktopMode()?H-Math.round(36*scale):H-Math.round(140*scale);
};
effectiveQuality=progress.quality==='auto'?hardwareQuality():progress.quality;
applyQuality();
refreshQuality=function(){if(progress.quality==='auto'&&!effectiveQuality)effectiveQuality=hardwareQuality();showQualityToast();};

// Real particle budgets. Existing V1.2 wrappers are preserved underneath this final cap.
const v13Particles=spawnParticles,v13Rubble=spawnRubble,v13Smoke=spawnSmoke;
spawnParticles=function(x,y,n,col,speed,size,type){const mul=qLevel()===0?.55:qLevel()===1?.78:1,max=qLevel()===0?150:qLevel()===1?300:600;v13Particles(x,y,Math.max(1,Math.round(n*mul)),col,speed,size,type);if(particles&&particles.length>max)particles.splice(0,particles.length-max);};
spawnRubble=function(x,y,n){v13Rubble(x,y,Math.max(1,Math.round(n*(qLevel()===0?.45:qLevel()===1?.72:1))));};
spawnSmoke=function(x,y,n){if(qLevel()===0&&frameT%2)return;v13Smoke(x,y,Math.max(1,Math.round(n*(qLevel()===0?.35:qLevel()===1?.65:1))));};
const v13MakeCivilians=makeCivilians;
makeCivilians=function(){const a=v13MakeCivilians();const cap=qLevel()===0?4:qLevel()===1?10:18;return a.slice(0,Math.min(cap,a.length));};

function updateAutoQuality(dtMs){
  if(progress.quality!=='auto'||gameState!==GameState.PLAYING)return;
  const fps=1000/Math.max(1,dtMs);fpsEMA=fpsEMA*.94+fps*.06;fpsFrames++;fpsAccum+=dtMs;
  if(fpsAccum<1000)return;fpsAccum=0;
  if(fpsEMA<42){fpsLow++;fpsStableHigh=0;}else if(fpsEMA>57){fpsStableHigh++;fpsLow=0;}else{fpsLow=Math.max(0,fpsLow-1);fpsStableHigh=0;}
  let rank=qualityRank(effectiveQuality),next=rank;
  if(fpsLow>=3&&rank>0){next=rank-1;fpsLow=0;}
  else if(fpsStableHigh>=8&&rank<2){next=rank+1;fpsStableHigh=0;}
  if(next!==rank){effectiveQuality=rankQuality(next);applyQuality(next<rank?'FPS BAIXO':'FPS ESTÁVEL');}
}

const v13CoreInit=initLevel;
function setLoadingProgress(p,step){loadingFill.style.width=p+'%';loadingPct.textContent=p+'%';loadingStep.textContent=step;}
function cleanupPhase(){particles=[];powerups=[];debris=[];civilians=[];thrownObjects=[];carried=null;clearHeldInputs();}
function loadCurrentLevel(reason='FASE'){
  const token=++loadingToken;gameState=GameState.LOADING;paused=true;clearHeldInputs();suspendGameAudio();
  document.getElementById('overlay').style.display='none';document.getElementById('pause-btn').style.display='none';document.getElementById('mission-card').style.display='none';document.getElementById('boss-wrap').style.display='none';
  loadingTitle.textContent=`FASE ${level} · ${levelCfg().name}`;loadingTip.textContent=V13_TIPS[(level-1)%V13_TIPS.length];loadingScreen.classList.add('show');setLoadingProgress(8,'LIMPANDO FASE ANTERIOR');
  requestAnimationFrame(()=>{if(token!==loadingToken)return;cleanupPhase();setLoadingProgress(35,'PREPARANDO CIDADE');requestAnimationFrame(()=>{if(token!==loadingToken)return;applyQuality();setLoadingProgress(62,'CRIANDO INIMIGOS E OBJETIVOS');requestAnimationFrame(()=>{if(token!==loadingToken)return;v13CoreInit();setLoadingProgress(88,'FINALIZANDO HUD');requestAnimationFrame(()=>{if(token!==loadingToken)return;setLoadingProgress(100,'PRONTO');loadingScreen.classList.remove('show');paused=false;gameState=GameState.PLAYING;lastTS=performance.now();resumeGameAudio();showQualityToast(progress.quality==='auto'?'AUTO ATIVO':'');});});});});
}

// Run-only bonuses must never leak into a new campaign/phase selection.
const v13ResetRun=resetRun;
resetRun=function(startAt=1){v13ResetRun(startAt);phaseMaxHpBonus=0;nextPhaseShield=false;phaseEnding=false;phaseClock=0;carried=null;thrownObjects=[];clearHeldInputs();};
startGame=function(){ensureAudio();selectedLevel=1;resetRun(1);loadCurrentLevel('INÍCIO');};
startSelectedPhase=function(n){if(n>(progress.unlocked||1))return;ensureAudio();selectedLevel=n;resetRun(n);loadCurrentLevel('SELEÇÃO');};
restartGame=function(){resetRun(Math.min(selectedLevel,progress.unlocked||1));loadCurrentLevel('REINÍCIO');};
nextLevel=function(){phaseMaxHpBonus+=8;nextPhaseShield=true;loadCurrentLevel('PRÓXIMA');};

// Complete pause: simulation/frame counter/audio/input freeze. Rendering is not repeated while paused/menu/result.
let pausedFrameDrawn=false;
loop=function(ts){
  const raw=Math.max(0,ts-lastTS);const dt=Math.min(raw/16.667,3);lastTS=ts;
  if(gameState===GameState.PLAYING&&!paused){frameT++;update(dt);render();pausedFrameDrawn=false;updateAutoQuality(raw);}
  else if(!pausedFrameDrawn&&(gameState===GameState.PAUSED||gameState===GameState.RESULT||gameState===GameState.GAMEOVER)){render();pausedFrameDrawn=true;}
  requestAnimationFrame(loop);
};
function resumeFromPause(){paused=false;gameState=GameState.PLAYING;pausedFrameDrawn=false;document.getElementById('overlay').style.display='none';document.getElementById('pause-btn').style.display='flex';lastTS=performance.now();resumeGameAudio();}
togglePause=function(){
  if(!gameRunning||gameState===GameState.LOADING||gameState===GameState.MENU||gameState===GameState.RESULT||gameState===GameState.GAMEOVER)return;
  const ov=document.getElementById('overlay');
  if(gameState===GameState.PAUSED){resumeFromPause();return;}
  paused=true;gameState=GameState.PAUSED;pausedFrameDrawn=false;clearHeldInputs();suspendGameAudio();ov.style.display='flex';document.getElementById('pause-btn').style.display='none';
  ov.innerHTML=`<div class="ov-title">PAUSA</div><div class="ov-sub">DESTRUIÇÃO CONGELADA</div><div class="ov-body">Física, inimigos, cooldowns, efeitos e áudio estão pausados.<div id="pause-performance">${progress.quality==='auto'?'AUTO · '+({low:'LEVE',medium:'MÉDIO',high:'FORTE'}[effectiveQuality]||effectiveQuality.toUpperCase()):({low:'LEVE',medium:'MÉDIO',high:'FORTE'}[effectiveQuality]||effectiveQuality.toUpperCase())} · ~${Math.round(fpsEMA)} FPS</div></div><button class="ov-btn" id="resumeBtn">CONTINUAR</button><button class="ov-small-btn" id="quitBtn">MENU</button>`;
  ov.querySelector('#resumeBtn').onclick=resumeFromPause;ov.querySelector('#quitBtn').onclick=showMainMenu;
};
const v13OldPauseBtn=document.getElementById('pause-btn');
const v13PauseBtn=v13OldPauseBtn.cloneNode(true);v13OldPauseBtn.replaceWith(v13PauseBtn);v13PauseBtn.onclick=togglePause;

const v13Overlay=showOverlay;
showOverlay=function(type){v13Overlay(type);paused=true;gameState=type==='gameover'?GameState.GAMEOVER:GameState.RESULT;pausedFrameDrawn=false;clearHeldInputs();suspendGameAudio();};

showGraphics=function(){
  paused=true;gameState=GameState.MENU;clearHeldInputs();const ov=document.getElementById('overlay');ov.style.display='flex';document.getElementById('pause-btn').style.display='none';
  const opts=['auto','low','medium','high'],label={auto:'AUTOMÁTICO',low:'LEVE',medium:'MÉDIO',high:'FORTE'};
  ov.innerHTML=`<div class="ov-title" style="font-size:54px">GRÁFICOS</div><div class="ov-sub">QUALIDADE REAL / DESEMPENHO</div><div class="settings-grid">${opts.map(q=>`<button data-q="${q}" class="${progress.quality===q?'selected':''}">${label[q]}</button>`).join('')}</div><div class="ov-body"><b>AUTO</b> mede FPS e ajusta sozinho.<br><b>LEVE</b> 70% de resolução, poucos efeitos/civis e animações reduzidas.<br><b>MÉDIO</b> 86% de resolução e efeitos equilibrados.<br><b>FORTE</b> resolução integral, sprites e efeitos completos.<br><span style="color:#6f8190">Atual: ${({low:'LEVE',medium:'MÉDIO',high:'FORTE'}[effectiveQuality]||effectiveQuality.toUpperCase())} · ${Math.round(fpsEMA)} FPS</span></div><button class="ov-btn" id="backGraphics">VOLTAR</button>`;
  ov.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{progress.quality=b.dataset.q;if(progress.quality==='auto')effectiveQuality=hardwareQuality();else effectiveQuality=progress.quality;saveProgress();applyQuality('CONFIGURADO');showGraphics();});ov.querySelector('#backGraphics').onclick=showMainMenu;
};

showMainMenu=function(){
  gameState=GameState.MENU;paused=true;pausedFrameDrawn=true;clearHeldInputs();suspendGameAudio();upgradeOpen=false;document.getElementById('pause-btn').style.display='none';document.getElementById('mission-card').style.display='none';document.getElementById('boss-wrap').style.display='none';carryIndicator.style.display='none';loadingScreen.classList.remove('show');
  const ov=document.getElementById('overlay');ov.style.display='flex';selectedLevel=Math.min(selectedLevel||1,LEVELS.length);
  const cards=LEVELS.map((l,i)=>{const n=i+1,locked=n>(progress.unlocked||1),st=progress.stars[String(n)]||0,rec=progress.records[String(n)]||0,combo=progress.combos[String(n)]||0;return `<button class="phase-card ${locked?'locked':''} ${selectedLevel===n?'selected':''}" data-phase="${n}" ${locked?'disabled':''}><b>${locked?'🔒 ':''}${n}. ${l.name}</b><span>${l.boss?'☠ '+l.boss:l.objective}</span><span class="stars">${'★'.repeat(st)}${'☆'.repeat(3-st)}</span><span class="record">${rec?rec+' pts · '+combo+'x combo':'não concluída'}</span></button>`;}).join('');
  const monsterCards=Object.values(MONSTERS).map(m=>{const unlocked=monsterUnlocked(m.id),sel=selectedMonster===m.id;return `<button class="monster-card ${unlocked?'':'locked'} ${sel?'selected':''}" data-monster="${m.id}" ${unlocked?'':'disabled'}><span class="m-icon">${unlocked?m.icon:'🔒'}</span><b>${m.name}</b><small>${m.tag} · ${m.desc}</small><div class="m-stats">❤ ${m.hp} · 👊 ${Math.round(m.damage*100)}% · ⚡ ${Math.round(m.speed*100)}%</div></button>`;}).join('');
  const qLabel=progress.quality==='auto'?`AUTO (${({low:'LEVE',medium:'MÉDIO',high:'FORTE'}[effectiveQuality]||effectiveQuality.toUpperCase())})`:progress.quality.toUpperCase();
  ov.innerHTML=`<div class="ov-title">RAMPAGE</div><div class="ov-sub">MONSTER DESTRUCTION · V${RAMPAGE_VERSION} · 10 FASES</div><div class="monster-title">ESCOLHA SEU MONSTRO</div><div class="monster-grid">${monsterCards}</div><div class="monster-title">ESCOLHA A CIDADE</div><div class="menu-grid">${cards}</div><button class="ov-btn" id="playBtn">JOGAR · ${monsterDef().name} · FASE ${selectedLevel}</button><div class="menu-actions"><button class="ov-small-btn" id="galleryBtn">GALERIA / SKINS</button><button class="ov-small-btn" id="graphicsBtn">GRÁFICOS: ${qLabel}</button><button class="ov-small-btn" id="controlsBtn">CONTROLES</button><button class="ov-small-btn" id="audioBtn">SOM: ${progress.audio?'LIGADO':'DESLIGADO'}</button><button class="ov-small-btn" id="resetBtn">ZERAR PROGRESSO</button></div><div class="save-badge">Campanhas concluídas: ${progress.totalWins||0} · Progresso local preservado · Performance adaptativa disponível</div>`;
  ov.querySelectorAll('[data-monster]').forEach(c=>c.onclick=()=>{selectedMonster=c.dataset.monster;progress.selectedMonster=selectedMonster;saveProgress();showMainMenu();});ov.querySelectorAll('[data-phase]').forEach(c=>c.onclick=()=>{selectedLevel=+c.dataset.phase;showMainMenu();});ov.querySelector('#playBtn').onclick=()=>startSelectedPhase(selectedLevel);ov.querySelector('#galleryBtn').onclick=showGallery;ov.querySelector('#graphicsBtn').onclick=showGraphics;ov.querySelector('#controlsBtn').onclick=()=>alert(desktopMode()?'PC\nMover: A/D ou ←/→\nPular: W/↑/ESPAÇO\nSocos: Z/X\nTremor: S/C\nRugido: E/R\nEspecial: F\nAgarrar/Arremessar: Q\nPausa: ESC\n\nGAMEPAD\nLB/RT: especial · LT: agarrar/arremessar':'CELULAR\nUse os controles na tela.\nPause congela completamente a partida.');ov.querySelector('#audioBtn').onclick=()=>{progress.audio=!progress.audio;saveProgress();if(progress.audio)ensureAudio();showMainMenu();};ov.querySelector('#resetBtn').onclick=()=>{if(confirm('Apagar todo o progresso?')){progress=defaultSave();progress.version=RAMPAGE_VERSION;progress.quality='auto';progress.skins={brutus:'classic',gorak:'classic',volt:'classic'};progress.mastery={brutus:{wins:0,bestCombo:0},gorak:{wins:0,bestCombo:0},volt:{wins:0,bestCombo:0}};saveProgress();selectedLevel=1;selectedMonster='brutus';effectiveQuality=hardwareQuality();applyQuality();showMainMenu();}};
};

// Visibility pause prevents hidden-tab simulation spikes and huge delta on return.
document.addEventListener('visibilitychange',()=>{if(document.hidden&&gameState===GameState.PLAYING)togglePause();lastTS=performance.now();});

// Start on the upgraded menu after every legacy bootstrap callback has had a chance to run.
setTimeout(()=>{effectiveQuality=progress.quality==='auto'?hardwareQuality():progress.quality;applyQuality();showMainMenu();},0);
