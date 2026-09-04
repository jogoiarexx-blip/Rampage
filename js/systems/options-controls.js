/* ═══════════════════════════════════════════════════════════════
   RAMPAGE 1.5.3 — VIDEO + CONFIGURABLE KEYBOARD/GAMEPAD
   ═══════════════════════════════════════════════════════════════ */
(function(){
  const DEFAULT_KEYBOARD={left:'KeyA',right:'KeyD',up:'KeyW',down:'ArrowDown',jump:'Space',punchLeft:'KeyZ',punchRight:'KeyX',smash:'KeyS',roar:'KeyE',special:'KeyF',grab:'KeyQ',pause:'Escape'};
  const DEFAULT_GAMEPAD={moveMode:'both',deadzone:.35,buttons:{jump:0,punchLeft:2,punchRight:1,smash:5,roar:3,special:4,grab:6,pause:9}};
  const ACTION_LABELS={left:'Mover Esquerda',right:'Mover Direita',up:'Subir / Cima',down:'Baixar / Agachar',jump:'Pular',punchLeft:'Soco Esquerdo',punchRight:'Soco Direito',smash:'Tremor',roar:'Rugido',special:'Especial',grab:'Agarrar/Arremessar',pause:'Pausar'};
  const ACTION_ICONS={left:'◀',right:'▶',up:'▲',down:'▼',jump:'⬆',punchLeft:'👊',punchRight:'👊',smash:'💥',roar:'😤',special:'⚡',grab:'🤏',pause:'Ⅱ'};
  const LOGICAL_MAP={left:'ArrowLeft',right:'ArrowRight',up:'ArrowUp',down:'ArrowDown',jump:'KeyJ',punchLeft:'KeyZ',punchRight:'KeyX',smash:'KeyS',roar:'KeyE'};
  const VIDEO_RES=[{id:'auto',label:'AUTO',sub:'Segue hardware/qualidade'},{id:'540',label:'540p',sub:'Muito leve'},{id:'720',label:'720p',sub:'HD / leve'},{id:'900',label:'900p',sub:'Equilibrado'},{id:'1080',label:'1080p',sub:'Full HD'},{id:'native',label:'NATIVA',sub:'Máxima da tela'}];
  const QUALITY_LABEL={low:'LEVE',medium:'MÉDIO',high:'FORTE'};
  let waitingKeyboardAction=null,waitingGamepadAction=null,waitGamepadRAF=0,gamepadActionPrev={};

  function deepClone(v){return JSON.parse(JSON.stringify(v));}
  function ensureConfig(){
    progress.controls=progress.controls||{};
    progress.controls.keyboard=Object.assign({},DEFAULT_KEYBOARD,progress.controls.keyboard||{});
    progress.controls.gamepad=progress.controls.gamepad||{};
    progress.controls.gamepad.moveMode=progress.controls.gamepad.moveMode||DEFAULT_GAMEPAD.moveMode;
    progress.controls.gamepad.deadzone=Number(progress.controls.gamepad.deadzone||DEFAULT_GAMEPAD.deadzone);
    progress.controls.gamepad.buttons=Object.assign({},DEFAULT_GAMEPAD.buttons,progress.controls.gamepad.buttons||{});
    if(!progress.resolution)progress.resolution='auto';
    // migrate old percentage resolution choices
    const old={"0.70":'540',"0.85":'720',"1.00":'native'}; if(old[String(progress.resolution)])progress.resolution=old[String(progress.resolution)];
    if(!VIDEO_RES.some(x=>x.id===String(progress.resolution)))progress.resolution='auto';
    if(typeof progress.fullscreenPreferred!=='boolean')progress.fullscreenPreferred=false;
    saveProgress();
  }
  ensureConfig();
  const kb=()=>progress.controls.keyboard,gpcfg=()=>progress.controls.gamepad;

  function resolutionFactor(){
    const mode=String(progress.resolution||'auto'), vh=Math.max(1,window.innerHeight||720);
    if(mode==='native')return 1;
    if(mode==='auto')return 1;
    const target=Number(mode);return isFinite(target)?Math.max(.5,Math.min(1,target/vh)):1;
  }
  applyQuality=function(reason=''){
    const chosen=progress.quality==='auto'?(effectiveQuality||hardwareQuality()):progress.quality;effectiveQuality=chosen;
    const qScale=chosen==='low'?.70:chosen==='medium'?.86:1;
    renderScale=Math.max(.5,Math.min(1,qScale*resolutionFactor()));
    document.body.classList.toggle('quality-low',chosen==='low');resizeCanvas();if(monster)monster.y=Math.min(monster.y,GROUND-monster.h);updateControlLabels();if(reason)showQualityToast(reason);
  };
  applyQuality();

  function prettifyKey(code){const m={ArrowLeft:'←',ArrowRight:'→',ArrowUp:'↑',ArrowDown:'↓',Space:'ESPAÇO',Escape:'ESC',ShiftLeft:'SHIFT E',ShiftRight:'SHIFT D',ControlLeft:'CTRL E',ControlRight:'CTRL D',Enter:'ENTER',Backspace:'BACKSPACE',Tab:'TAB',CapsLock:'CAPS',Minus:'-',Equal:'=',BracketLeft:'[',BracketRight:']',Semicolon:';',Quote:"'",Comma:',',Period:'.',Slash:'/',Backquote:'`'};if(m[code])return m[code];if(/^Key[A-Z]$/.test(code))return code.slice(3);if(/^Digit\d$/.test(code))return code.slice(5);return code||'---';}
  const actionKeyLabel=a=>prettifyKey(kb()[a]);
  mapDesktopKey=function(code){for(const [a,p] of Object.entries(kb()))if(p===code&&LOGICAL_MAP[a])return LOGICAL_MAP[a];return code;};

  function currentPad(){const pads=navigator.getGamepads?navigator.getGamepads():[];return [...pads].find(Boolean)||null;}
  function padProfile(pad=currentPad()){
    const id=(pad?.id||'').toLowerCase();
    if(/xbox|xinput|360|one controller|series/.test(id))return 'xbox';
    if(/playstation|dualsense|dualshock|sony|054c/.test(id))return 'playstation';
    if(/nintendo|switch|057e/.test(id))return 'nintendo';
    return 'generic';
  }
  function friendlyPadName(pad=currentPad()){
    if(!pad)return 'Nenhum gamepad conectado';
    let id=(pad.id||'Gamepad').replace(/\s*\(.*?\)\s*/g,' ').replace(/\s+/g,' ').trim();
    if(padProfile(pad)==='xbox')return 'Xbox / XInput Controller';
    if(padProfile(pad)==='playstation')return /dualsense/i.test(pad.id)?'PlayStation DualSense':'PlayStation Controller';
    if(padProfile(pad)==='nintendo')return 'Nintendo / Switch Controller';
    return id.slice(0,56)||'Gamepad genérico';
  }
  function buttonName(idx,pad=currentPad()){
    const p=padProfile(pad);
    const xbox=['A','B','X','Y','LB','RB','LT','RT','VIEW','MENU','LS','RS','DPAD ↑','DPAD ↓','DPAD ←','DPAD →','HOME'];
    const ps=['✕','○','□','△','L1','R1','L2','R2','CREATE','OPTIONS','L3','R3','DPAD ↑','DPAD ↓','DPAD ←','DPAD →','PS'];
    const nin=['B','A','Y','X','L','R','ZL','ZR','−','+','L3','R3','DPAD ↑','DPAD ↓','DPAD ←','DPAD →','HOME'];
    const arr=p==='xbox'?xbox:p==='playstation'?ps:p==='nintendo'?nin:null;return arr?.[idx]||`BOTÃO ${idx}`;
  }
  function padBadge(){const pad=currentPad(),profile=padProfile(pad),connected=!!pad;return `<div class="gamepad-device ${connected?'connected':''}"><div class="gamepad-icon">🎮</div><div><b>${friendlyPadName(pad)}</b><small>${connected?`${profile.toUpperCase()} · ${pad.buttons.length} botões · ${pad.axes.length} eixos`:'Conecte um controle USB ou Bluetooth para configurar.'}</small></div><span>${connected?'CONECTADO':'OFFLINE'}</span></div>`;}

  function updateControlLabels(){
    const help=document.getElementById('desktop-help');if(help)help.innerHTML=`<b>PC:</b> ${actionKeyLabel('left')}/${actionKeyLabel('right')} mover · ${actionKeyLabel('jump')} pular · ${actionKeyLabel('punchLeft')}/${actionKeyLabel('punchRight')} socos · ${actionKeyLabel('smash')} tremor · ${actionKeyLabel('special')} especial · ${actionKeyLabel('grab')} agarrar · ${actionKeyLabel('pause')} pausa · 🎮 ${currentPad()?friendlyPadName():'gamepad'}`;
    const sp=document.getElementById('special-btn');if(sp){const ico=monster&&monster.monsterId==='gorak'?'💥':monster&&monster.monsterId==='volt'?'⚡':'💚';const txt=typeof specialCooldown!=='undefined'&&specialCooldown>0?`RECARGA ${Math.ceil(specialCooldown/60)}s`:`ESPECIAL [${actionKeyLabel('special')}]`;sp.innerHTML=`${ico}<small>${txt}</small>`;}
    const gr=document.getElementById('grab-btn');if(gr)gr.innerHTML=`🤏<small>PEGAR [${actionKeyLabel('grab')}]</small>`;
    const st=document.getElementById('pad-status');if(st&&currentPad()){st.textContent=`🎮 ${friendlyPadName()}`;st.style.display='block';}
  }
  if(typeof uniquePassive==='function'){const b=uniquePassive;uniquePassive=function(dt){b(dt);updateControlLabels();};}

  function blockLegacy(e){if(kb().special!=='KeyF'&&e.code==='KeyF'){e.preventDefault();e.stopImmediatePropagation();}if(kb().grab!=='KeyQ'&&e.code==='KeyQ'){e.preventDefault();e.stopImmediatePropagation();}if(kb().pause!=='Escape'&&e.code==='Escape'){e.preventDefault();e.stopImmediatePropagation();}}
  window.addEventListener('keydown',e=>{if(waitingKeyboardAction){e.preventDefault();e.stopImmediatePropagation();const used=Object.keys(kb()).find(a=>kb()[a]===e.code);if(used&&used!==waitingKeyboardAction)kb()[used]=DEFAULT_KEYBOARD[used];kb()[waitingKeyboardAction]=e.code;waitingKeyboardAction=null;saveProgress();showControlsConfig('keyboard');return;}blockLegacy(e);if(kb().special!=='KeyF'&&e.code===kb().special&&!e.repeat){e.preventDefault();e.stopImmediatePropagation();useSpecial();}if(kb().grab!=='KeyQ'&&e.code===kb().grab&&!e.repeat){e.preventDefault();e.stopImmediatePropagation();grabOrThrow();}if(kb().pause!=='Escape'&&e.code===kb().pause&&!e.repeat&&gameRunning){e.preventDefault();e.stopImmediatePropagation();togglePause();}},true);
  window.addEventListener('keyup',blockLegacy,true);

  const pressed=(pad,i)=>Number.isInteger(i)&&i>=0&&!!pad?.buttons[i]?.pressed;
  function firstPressed(){const pad=currentPad();if(!pad)return null;for(let i=0;i<pad.buttons.length;i++)if(pad.buttons[i]?.pressed)return i;return null;}
  function waitForGamepadBinding(){if(!waitingGamepadAction)return;const i=firstPressed();if(i!==null){const used=Object.keys(gpcfg().buttons).find(a=>gpcfg().buttons[a]===i);if(used&&used!==waitingGamepadAction)gpcfg().buttons[used]=DEFAULT_GAMEPAD.buttons[used];gpcfg().buttons[waitingGamepadAction]=i;waitingGamepadAction=null;saveProgress();showControlsConfig('gamepad');return;}waitGamepadRAF=requestAnimationFrame(waitForGamepadBinding);}

  pollGamepad=function(){const pad=currentPad(),st=document.getElementById('pad-status');if(st)st.style.display=pad?'block':'none';if(!pad)return;const dz=Math.max(.15,Math.min(.8,Number(gpcfg().deadzone||.35))),stick=/stick|both/.test(gpcfg().moveMode),dpad=/dpad|both/.test(gpcfg().moveMode),x=pad.axes[0]||0,y=pad.axes[1]||0;
    const now={left:(stick&&x<-dz)||(dpad&&pad.buttons[14]?.pressed),right:(stick&&x>dz)||(dpad&&pad.buttons[15]?.pressed),up:(stick&&y<-dz)||(dpad&&pad.buttons[12]?.pressed),down:(stick&&y>dz)||(dpad&&pad.buttons[13]?.pressed),jump:pressed(pad,gpcfg().buttons.jump),punchLeft:pressed(pad,gpcfg().buttons.punchLeft),punchRight:pressed(pad,gpcfg().buttons.punchRight),smash:pressed(pad,gpcfg().buttons.smash),roar:pressed(pad,gpcfg().buttons.roar),special:pressed(pad,gpcfg().buttons.special),grab:pressed(pad,gpcfg().buttons.grab),pause:pressed(pad,gpcfg().buttons.pause)};
    const km={left:'ArrowLeft',right:'ArrowRight',up:'ArrowUp',down:'ArrowDown',jump:'KeyJ',punchLeft:'KeyZ',punchRight:'KeyX',smash:'KeyS',roar:'KeyE'};for(const [a,k] of Object.entries(km))if(now[a]!==gamepadActionPrev[a])keys[k]=!!now[a];if(now.special&&!gamepadActionPrev.special)useSpecial();if(now.grab&&!gamepadActionPrev.grab)grabOrThrow();if(now.pause&&!gamepadActionPrev.pause&&gameRunning)togglePause();gamepadActionPrev=now;updateControlLabels();
  };
  window.addEventListener('gamepadconnected',()=>{updateControlLabels();if(gameState===GameState.MENU&&document.getElementById('tab-gp')?.classList.contains('selected'))showControlsConfig('gamepad');});
  window.addEventListener('gamepaddisconnected',()=>{updateControlLabels();});

  function renderBindGrid(type){const list=type==='keyboard'?['left','right','up','down','jump','punchLeft','punchRight','smash','roar','special','grab','pause']:['jump','punchLeft','punchRight','smash','roar','special','grab','pause'];return list.map(a=>`<button class="bind-btn" data-bind-type="${type}" data-action="${a}"><span class="bind-icon">${ACTION_ICONS[a]}</span><span class="bind-copy"><small>${ACTION_LABELS[a]}</small><b>${type==='keyboard'?prettifyKey(kb()[a]):buttonName(gpcfg().buttons[a])}</b></span><i>ALTERAR</i></button>`).join('');}
  function attachBindEvents(tab){document.querySelectorAll('.bind-btn').forEach(btn=>btn.onclick=()=>{const a=btn.dataset.action;if(btn.dataset.bindType==='keyboard'){waitingKeyboardAction=a;waitingGamepadAction=null;cancelAnimationFrame(waitGamepadRAF);document.getElementById('controls-hint').innerHTML=`⌨️ Pressione agora a nova tecla para <b>${ACTION_LABELS[a]}</b>`;}else{if(!currentPad()){document.getElementById('controls-hint').textContent='Conecte um gamepad primeiro.';return;}waitingGamepadAction=a;waitingKeyboardAction=null;cancelAnimationFrame(waitGamepadRAF);waitForGamepadBinding();document.getElementById('controls-hint').innerHTML=`🎮 Pressione agora o novo botão para <b>${ACTION_LABELS[a]}</b>`;}});
    document.getElementById('reset-bindings').onclick=()=>{progress.controls.keyboard=Object.assign({},DEFAULT_KEYBOARD);progress.controls.gamepad=deepClone(DEFAULT_GAMEPAD);saveProgress();showControlsConfig(tab);};document.getElementById('tab-kb').onclick=()=>showControlsConfig('keyboard');document.getElementById('tab-gp').onclick=()=>showControlsConfig('gamepad');document.querySelectorAll('[data-move-mode]').forEach(b=>b.onclick=()=>{gpcfg().moveMode=b.dataset.moveMode;saveProgress();showControlsConfig('gamepad');});document.querySelectorAll('[data-deadzone]').forEach(b=>b.onclick=()=>{gpcfg().deadzone=Number(b.dataset.deadzone);saveProgress();showControlsConfig('gamepad');});document.getElementById('controls-back').onclick=showMainMenu;
  }
  showControlsConfig=function(tab='keyboard'){ensureConfig();gameState=GameState.MENU;paused=true;clearHeldInputs();waitingKeyboardAction=null;waitingGamepadAction=null;cancelAnimationFrame(waitGamepadRAF);const ov=document.getElementById('overlay');ov.style.display='flex';document.getElementById('pause-btn').style.display='none';const mm=[['both','STICK + DPAD'],['stick','SÓ STICK'],['dpad','SÓ DPAD']],dz=[.25,.35,.50];ov.innerHTML=`<div class="ov-title compact-title">CONTROLES</div><div class="ov-sub">CONFIGURAÇÃO PROFISSIONAL</div><div class="tabs-row"><button class="ov-small-btn ${tab==='keyboard'?'selected':''}" id="tab-kb">⌨ TECLADO</button><button class="ov-small-btn ${tab==='gamepad'?'selected':''}" id="tab-gp">🎮 GAMEPAD</button></div>${tab==='gamepad'?padBadge():''}<div class="controls-hint" id="controls-hint">${tab==='keyboard'?'Clique em uma ação e pressione a tecla desejada.':currentPad()?'Clique em uma ação e pressione o botão desejado.':'Conecte um controle USB/Bluetooth para configurar.'}</div><div class="bind-grid">${renderBindGrid(tab)}</div>${tab==='gamepad'?`<div class="control-section-title">MOVIMENTO</div><div class="settings-grid small-grid">${mm.map(([id,l])=>`<button data-move-mode="${id}" class="${gpcfg().moveMode===id?'selected':''}">${l}</button>`).join('')}</div><div class="control-section-title">DEADZONE DO ANALÓGICO</div><div class="settings-grid small-grid">${dz.map(d=>`<button data-deadzone="${d}" class="${Math.abs(gpcfg().deadzone-d)<.001?'selected':''}">${Math.round(d*100)}%</button>`).join('')}</div>`:''}<div class="menu-actions"><button class="ov-small-btn" id="reset-bindings">RESTAURAR PADRÃO</button><button class="ov-btn" id="controls-back">VOLTAR</button></div>`;attachBindEvents(tab);};

  async function setFullscreen(on){try{if(on&&!document.fullscreenElement){await document.documentElement.requestFullscreen();progress.fullscreenPreferred=true;}else if(!on&&document.fullscreenElement){await document.exitFullscreen();progress.fullscreenPreferred=false;}saveProgress();setTimeout(()=>{applyQuality('TELA');showGraphics();},100);}catch(e){console.warn('Fullscreen não disponível',e);progress.fullscreenPreferred=!!document.fullscreenElement;saveProgress();showGraphics();}}
  document.addEventListener('fullscreenchange',()=>{progress.fullscreenPreferred=!!document.fullscreenElement;saveProgress();applyQuality();});
  showGraphics=function(){ensureConfig();paused=true;gameState=GameState.MENU;clearHeldInputs();const ov=document.getElementById('overlay');ov.style.display='flex';document.getElementById('pause-btn').style.display='none';const opts=['auto','low','medium','high'],fs=!!document.fullscreenElement;ov.innerHTML=`<div class="ov-title compact-title">VÍDEO</div><div class="ov-sub">GRÁFICOS · RESOLUÇÃO · TELA</div><div class="video-panel"><div class="control-section-title">QUALIDADE</div><div class="settings-grid">${opts.map(q=>`<button data-q="${q}" class="${progress.quality===q?'selected':''}"><b>${q==='auto'?'AUTO':QUALITY_LABEL[q]}</b><small>${q==='auto'?'Ajuste dinâmico por FPS':q==='low'?'Menos efeitos e entidades':q==='medium'?'Equilíbrio visual/FPS':'Todos os efeitos'}</small></button>`).join('')}</div><div class="control-section-title">RESOLUÇÃO INTERNA</div><div class="resolution-grid">${VIDEO_RES.map(r=>`<button data-res="${r.id}" class="${String(progress.resolution)===r.id?'selected':''}"><b>${r.label}</b><small>${r.sub}</small></button>`).join('')}</div><div class="control-section-title">MODO DE TELA</div><div class="fullscreen-card"><div><b>${fs?'TELA CHEIA ATIVA':'MODO JANELA'}</b><small>${fs?'O jogo está ocupando a tela inteira.':'Ative tela cheia para melhor imersão.'}</small></div><button id="fullscreenToggle" class="${fs?'selected':''}">${fs?'SAIR DA TELA CHEIA':'ATIVAR TELA CHEIA'}</button></div><div class="video-status"><span>QUALIDADE <b>${progress.quality==='auto'?'AUTO · '+QUALITY_LABEL[effectiveQuality]:QUALITY_LABEL[effectiveQuality]}</b></span><span>RESOLUÇÃO <b>${VIDEO_RES.find(x=>x.id===String(progress.resolution))?.label||'AUTO'}</b></span><span>FPS <b>${Math.round(fpsEMA)}</b></span><span>RENDER <b>${Math.round(renderScale*100)}%</b></span></div></div><button class="ov-btn" id="backGraphics">VOLTAR</button>`;ov.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{progress.quality=b.dataset.q;effectiveQuality=progress.quality==='auto'?hardwareQuality():progress.quality;saveProgress();applyQuality('QUALIDADE');showGraphics();});ov.querySelectorAll('[data-res]').forEach(b=>b.onclick=()=>{progress.resolution=b.dataset.res;saveProgress();applyQuality('RESOLUÇÃO');showGraphics();});document.getElementById('fullscreenToggle').onclick=()=>setFullscreen(!document.fullscreenElement);document.getElementById('backGraphics').onclick=showMainMenu;};

  const baseMenu=showMainMenu;showMainMenu=function(){ensureConfig();baseMenu();const c=document.getElementById('controlsBtn');if(c)c.onclick=()=>showControlsConfig('keyboard');const g=document.getElementById('graphicsBtn');if(g){const r=VIDEO_RES.find(x=>x.id===String(progress.resolution));g.textContent=`VÍDEO: ${progress.quality==='auto'?'AUTO':QUALITY_LABEL[effectiveQuality]} · ${r?.label||'AUTO'}`;g.onclick=showGraphics;}updateControlLabels();};
  setTimeout(()=>{updateControlLabels();if(gameState===GameState.MENU)showMainMenu();},0);
})();
