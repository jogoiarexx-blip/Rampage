/* RAMPAGE 1.4 — PIXIJS GPU SPRITE LAYER */
(() => {
  const SPRITES = {"monsters": {"brutus": [["assets/sprites/brutus_r0_0.webp", "assets/sprites/brutus_r0_1.webp", "assets/sprites/brutus_r0_2.webp", "assets/sprites/brutus_r0_3.webp", "assets/sprites/brutus_r0_4.webp"], ["assets/sprites/brutus_r1_0.webp", "assets/sprites/brutus_r1_1.webp", "assets/sprites/brutus_r1_2.webp", "assets/sprites/brutus_r1_3.webp", "assets/sprites/brutus_r1_4.webp"], ["assets/sprites/brutus_r2_0.webp", "assets/sprites/brutus_r2_1.webp", "assets/sprites/brutus_r2_2.webp", "assets/sprites/brutus_r2_3.webp", "assets/sprites/brutus_r2_4.webp"], ["assets/sprites/brutus_r3_0.webp", "assets/sprites/brutus_r3_1.webp", "assets/sprites/brutus_r3_2.webp", "assets/sprites/brutus_r3_3.webp", "assets/sprites/brutus_r3_4.webp"], ["assets/sprites/brutus_r4_0.webp", "assets/sprites/brutus_r4_1.webp", "assets/sprites/brutus_r4_2.webp"], ["assets/sprites/brutus_r5_0.webp", "assets/sprites/brutus_r5_1.webp", "assets/sprites/brutus_r5_2.webp", "assets/sprites/brutus_r5_3.webp", "assets/sprites/brutus_r5_4.webp"]], "gorak": [["assets/sprites/gorak_r0_0.webp", "assets/sprites/gorak_r0_1.webp", "assets/sprites/gorak_r0_2.webp", "assets/sprites/gorak_r0_3.webp", "assets/sprites/gorak_r0_4.webp"], ["assets/sprites/gorak_r1_0.webp", "assets/sprites/gorak_r1_1.webp", "assets/sprites/gorak_r1_2.webp", "assets/sprites/gorak_r1_3.webp", "assets/sprites/gorak_r1_4.webp"], ["assets/sprites/gorak_r2_0.webp", "assets/sprites/gorak_r2_1.webp", "assets/sprites/gorak_r2_2.webp", "assets/sprites/gorak_r2_3.webp", "assets/sprites/gorak_r2_4.webp"], ["assets/sprites/gorak_r3_0.webp", "assets/sprites/gorak_r3_1.webp", "assets/sprites/gorak_r3_2.webp", "assets/sprites/gorak_r3_3.webp"], ["assets/sprites/gorak_r4_0.webp", "assets/sprites/gorak_r4_1.webp", "assets/sprites/gorak_r4_2.webp", "assets/sprites/gorak_r4_3.webp"], ["assets/sprites/gorak_r5_0.webp", "assets/sprites/gorak_r5_1.webp"], ["assets/sprites/gorak_r6_0.webp"]], "volt": [["assets/sprites/volt_r0_0.webp", "assets/sprites/volt_r0_1.webp", "assets/sprites/volt_r0_2.webp", "assets/sprites/volt_r0_3.webp", "assets/sprites/volt_r0_4.webp"], ["assets/sprites/volt_r1_0.webp", "assets/sprites/volt_r1_1.webp", "assets/sprites/volt_r1_2.webp", "assets/sprites/volt_r1_3.webp", "assets/sprites/volt_r1_4.webp"], ["assets/sprites/volt_r2_0.webp", "assets/sprites/volt_r2_1.webp", "assets/sprites/volt_r2_2.webp", "assets/sprites/volt_r2_3.webp", "assets/sprites/volt_r2_4.webp"], ["assets/sprites/volt_r3_0.webp", "assets/sprites/volt_r3_1.webp", "assets/sprites/volt_r3_2.webp", "assets/sprites/volt_r3_3.webp", "assets/sprites/volt_r3_4.webp"], ["assets/sprites/volt_r4_0.webp", "assets/sprites/volt_r4_1.webp", "assets/sprites/volt_r4_2.webp", "assets/sprites/volt_r4_3.webp", "assets/sprites/volt_r4_4.webp"], ["assets/sprites/volt_r5_0.webp", "assets/sprites/volt_r5_1.webp"], ["assets/sprites/volt_r6_0.webp", "assets/sprites/volt_r6_1.webp", "assets/sprites/volt_r6_2.webp", "assets/sprites/volt_r6_3.webp", "assets/sprites/volt_r6_4.webp"]]}, "enemies": {"civilian": ["assets/sprites/civilian_0.webp", "assets/sprites/civilian_1.webp", "assets/sprites/civilian_2.webp"], "soldier": ["assets/sprites/soldier_0.webp", "assets/sprites/soldier_1.webp", "assets/sprites/soldier_2.webp"], "rocket": ["assets/sprites/rocket_0.webp", "assets/sprites/rocket_1.webp", "assets/sprites/rocket_2.webp", "assets/sprites/rocket_3.webp"], "jeep": ["assets/sprites/jeep_0.webp", "assets/sprites/jeep_1.webp"], "tank": ["assets/sprites/tank_0.webp", "assets/sprites/tank_1.webp", "assets/sprites/tank_2.webp", "assets/sprites/tank_3.webp", "assets/sprites/tank_4.webp", "assets/sprites/tank_5.webp", "assets/sprites/tank_6.webp", "assets/sprites/tank_7.webp"], "helicopter": ["assets/sprites/helicopter_0.webp", "assets/sprites/helicopter_1.webp", "assets/sprites/helicopter_2.webp"], "drone": ["assets/sprites/drone_0.webp", "assets/sprites/drone_1.webp", "assets/sprites/drone_2.webp"]}, "bosses": {"omega": [["assets/sprites/omega_r0_0.webp", "assets/sprites/omega_r0_1.webp", "assets/sprites/omega_r0_2.webp", "assets/sprites/omega_r0_3.webp", "assets/sprites/omega_r0_4.webp"], ["assets/sprites/omega_r1_0.webp", "assets/sprites/omega_r1_1.webp", "assets/sprites/omega_r1_2.webp", "assets/sprites/omega_r1_3.webp", "assets/sprites/omega_r1_4.webp"], ["assets/sprites/omega_r2_0.webp", "assets/sprites/omega_r2_1.webp", "assets/sprites/omega_r2_2.webp", "assets/sprites/omega_r2_3.webp", "assets/sprites/omega_r2_4.webp"], ["assets/sprites/omega_r3_0.webp", "assets/sprites/omega_r3_1.webp", "assets/sprites/omega_r3_2.webp", "assets/sprites/omega_r3_3.webp"], ["assets/sprites/omega_r4_0.webp", "assets/sprites/omega_r4_1.webp", "assets/sprites/omega_r4_2.webp", "assets/sprites/omega_r4_3.webp"], ["assets/sprites/omega_r5_0.webp", "assets/sprites/omega_r5_1.webp"]], "airboss": [["assets/sprites/airboss_r0_0.webp", "assets/sprites/airboss_r0_1.webp", "assets/sprites/airboss_r0_2.webp", "assets/sprites/airboss_r0_3.webp", "assets/sprites/airboss_r0_4.webp"], ["assets/sprites/airboss_r1_0.webp", "assets/sprites/airboss_r1_1.webp", "assets/sprites/airboss_r1_2.webp", "assets/sprites/airboss_r1_3.webp", "assets/sprites/airboss_r1_4.webp"], ["assets/sprites/airboss_r2_0.webp", "assets/sprites/airboss_r2_1.webp", "assets/sprites/airboss_r2_2.webp", "assets/sprites/airboss_r2_3.webp", "assets/sprites/airboss_r2_4.webp"], ["assets/sprites/airboss_r3_0.webp", "assets/sprites/airboss_r3_1.webp", "assets/sprites/airboss_r3_2.webp", "assets/sprites/airboss_r3_3.webp", "assets/sprites/airboss_r3_4.webp"], ["assets/sprites/airboss_r4_0.webp", "assets/sprites/airboss_r4_1.webp", "assets/sprites/airboss_r4_2.webp", "assets/sprites/airboss_r4_3.webp"], ["assets/sprites/airboss_r5_0.webp", "assets/sprites/airboss_r5_1.webp", "assets/sprites/airboss_r5_2.webp", "assets/sprites/airboss_r5_3.webp", "assets/sprites/airboss_r5_4.webp"]]}, "effects": {"fx0": "assets/sprites/fx_0.webp", "fx1": "assets/sprites/fx_1.webp", "fx2": "assets/sprites/fx_2.webp", "fx3": "assets/sprites/fx_3.webp", "fx4": "assets/sprites/fx_4.webp", "fx5": "assets/sprites/fx_5.webp", "fx6": "assets/sprites/fx_6.webp", "fx7": "assets/sprites/fx_7.webp", "fx8": "assets/sprites/fx_8.webp", "fx9": "assets/sprites/fx_9.webp", "fx10": "assets/sprites/fx_10.webp", "fx11": "assets/sprites/fx_11.webp", "fx12": "assets/sprites/fx_12.webp", "fx13": "assets/sprites/fx_13.webp", "fx14": "assets/sprites/fx_14.webp", "fx15": "assets/sprites/fx_15.webp", "fx16": "assets/sprites/fx_16.webp", "fx17": "assets/sprites/fx_17.webp", "fx18": "assets/sprites/fx_18.webp", "fx19": "assets/sprites/fx_19.webp", "fx20": "assets/sprites/fx_20.webp", "fx21": "assets/sprites/fx_21.webp", "fx22": "assets/sprites/fx_22.webp", "fx23": "assets/sprites/fx_23.webp", "fx24": "assets/sprites/fx_24.webp", "fx25": "assets/sprites/fx_25.webp", "fx26": "assets/sprites/fx_26.webp", "fx27": "assets/sprites/fx_27.webp", "fx28": "assets/sprites/fx_28.webp", "fx29": "assets/sprites/fx_29.webp", "fx30": "assets/sprites/fx_30.webp", "fx31": "assets/sprites/fx_31.webp"}};
  let app=null, stage=null, pixiReady=false, pixiFailed=false, monsterSprite=null;
  const enemySprites=new Map();
  const imageCache=new Map();
  const textureCache=new Map();
  let lastW=0,lastH=0,lastAnimTick=0;

  function perfTier(){
    const q=(typeof effectiveQuality!=='undefined'?effectiveQuality:'medium');
    return q==='low'?0:q==='medium'?1:2;
  }
  function loadImage(src){
    if(imageCache.has(src)) return imageCache.get(src);
    const p=new Promise((resolve,reject)=>{
      const img=new Image();
      img.decoding='async';
      img.onload=()=>resolve(img);
      img.onerror=reject;
      img.src=src;
    });
    imageCache.set(src,p); return p;
  }
  async function tex(src){
    if(textureCache.has(src)) return textureCache.get(src);
    const img=await loadImage(src);
    const t=PIXI.Texture.from(img);
    textureCache.set(src,t); return t;
  }
  function flatten(rows){ return (rows||[]).flat().filter(Boolean); }
  function seqForMonster(id,state){
    const rows=SPRITES.monsters[id]||SPRITES.monsters.brutus;
    const map={idle:0,walk:1,attack:2,smash:3,special:4,hurt:Math.max(0,rows.length-2),dead:rows.length-1};
    return rows[Math.min(rows.length-1,map[state]??0)]||rows[0]||[];
  }
  function monsterState(m){
    if(!m) return 'idle';
    if(m.hp<=0) return 'dead';
    if((m.invincible||0)>0 && frameT%10<3) return 'hurt';
    if((m.smashTimer||0)>0) return 'smash';
    if((m.roarTimer||0)>0 || (m.rage||0)>0) return 'special';
    if((m.punchL||0)>0 || (m.punchR||0)>0) return 'attack';
    if(Math.abs(m.vx||0)>.35) return 'walk';
    return 'idle';
  }
  function frameIndex(len,state){
    if(len<=1)return 0;
    const tier=perfTier();
    const step=state==='walk'?(tier===0?8:tier===1?6:4):(tier===0?10:tier===1?7:5);
    return Math.floor(frameT/step)%len;
  }
  async function setSpriteTexture(sp,src){
    if(!src || sp._src===src) return;
    sp._src=src;
    try{ sp.texture=await tex(src); }catch(e){}
  }
  function styleCanvas(){
    if(!app||!app.canvas)return;
    const c=app.canvas;
    c.id='pixiCanvas';
    c.style.position='absolute';c.style.inset='0';c.style.width='100%';c.style.height='100%';
    c.style.pointerEvents='none';c.style.zIndex='2';
    const base=document.getElementById('gameCanvas'); if(base) base.style.zIndex='1';
  }
  async function initPixi(){
    if(pixiReady||pixiFailed||!window.PIXI)return;
    try{
      app=new PIXI.Application();
      const pref=location.protocol==='file:'?'canvas':'webgl';
      await app.init({
        width:Math.max(320,window.innerWidth),height:Math.max(240,window.innerHeight),
        backgroundAlpha:0,antialias:false,autoStart:false,preference:pref,
        powerPreference: perfTier()===2?'high-performance':'low-power',
        resolution:1,hello:false
      });
      stage=app.stage; app.ticker.stop();
      document.getElementById('root').appendChild(app.canvas); styleCanvas();
      monsterSprite=new PIXI.Sprite();
      monsterSprite.anchor.set(.5,1);
      stage.addChild(monsterSprite);
      pixiReady=true;
      document.body.classList.add('pixi-active');
      window.__RAMPAGE_PIXI__={version:PIXI.VERSION||'8.x',renderer:app.renderer?.type||pref,ready:true};
    }catch(err){
      console.warn('PixiJS indisponível; usando Canvas fallback.',err);
      pixiFailed=true; pixiReady=false;
      window.__RAMPAGE_PIXI__={ready:false,error:String(err)};
    }
  }
  function enemySequence(e){
    if(e.type==='boss'){
      const rows=(level===8?SPRITES.bosses.airboss:SPRITES.bosses.omega)||[];
      let row=0;
      if(e.hp<e.maxHp*.28) row=Math.min(rows.length-1,5);
      else if((e.fireTimer||0)<18) row=Math.min(rows.length-1,2);
      return rows[row]||rows[0]||[];
    }
    const key=e.type==='helicopter'?'helicopter':e.type==='tank'?'tank':e.type==='jeep'?'jeep':'soldier';
    return SPRITES.enemies[key]||[];
  }
  async function ensureEnemySprite(e){
    let sp=enemySprites.get(e);
    if(sp)return sp;
    sp=new PIXI.Sprite(); sp.anchor.set(.5,1); stage.addChild(sp); enemySprites.set(e,sp);
    return sp;
  }
  function desiredSize(e){
    if(e.type==='boss') return level===8?[180,105]:[150,118];
    if(e.type==='tank')return [92,58];
    if(e.type==='helicopter')return [96,52];
    if(e.type==='jeep')return [74,46];
    return [44,58];
  }
  async function syncMonster(){
    const m=monster;
    if(!m||!monsterSprite){if(monsterSprite)monsterSprite.visible=false;return;}
    monsterSprite.visible=true;
    const state=monsterState(m), seq=seqForMonster(m.monsterId||selectedMonster,state);
    if(seq.length) await setSpriteTexture(monsterSprite,seq[frameIndex(seq.length,state)]);
    monsterSprite.x=m.x-camX+m.w/2;
    monsterSprite.y=m.y+m.h+3;
    const h=m.h*(m.monsterId==='gorak'?1.22:1.28), w=h*0.95;
    monsterSprite.width=w; monsterSprite.height=h;
    monsterSprite.scale.x=Math.abs(monsterSprite.scale.x)*(m.dir<0?-1:1);
    monsterSprite.alpha=(m.invincible>0&&frameT%6<3)?.35:1;
  }
  async function syncEnemies(){
    const active=new Set();
    const tier=perfTier(),margin=tier===0?90:tier===1?180:300;
    for(const e of (enemies||[])){
      if(!e||e.dead)continue;
      const sx=e.x-camX;
      if(sx+e.w<-margin||sx>W+margin) continue;
      active.add(e);
      const sp=await ensureEnemySprite(e);
      sp.visible=true;
      const seq=enemySequence(e);
      if(seq.length) await setSpriteTexture(sp,seq[frameIndex(seq.length,e.type==='boss'?'attack':'walk')]);
      sp.x=sx+e.w/2; sp.y=e.y+e.h+3;
      const [dw,dh]=desiredSize(e); sp.width=dw;sp.height=dh;
      sp.scale.x=Math.abs(sp.scale.x)*(e.dir<0?-1:1);
      sp.alpha=e.stunTimer>0?.62:1;
    }
    for(const [e,sp] of enemySprites){
      if(!active.has(e)) sp.visible=false;
      if(e.dead || !(enemies||[]).includes(e)){sp.destroy();enemySprites.delete(e);}
    }
  }
  async function syncPixi(){
    if(!pixiReady)return;
    if(W!==lastW||H!==lastH){app.renderer.resize(W,H);lastW=W;lastH=H;}
    try{
      await syncMonster(); await syncEnemies();
      app.renderer.render(stage);
    }catch(e){console.warn('Pixi render fallback',e);pixiFailed=true;pixiReady=false;try{app.canvas.remove();}catch(_e){}}
  }

  const baseDrawMonster=window.drawMonster||drawMonster;
  const baseDrawEnemies=window.drawEnemies||drawEnemies;
  drawMonster=function(){if(!pixiReady)return;baseDrawMonster();};
  drawEnemies=function(){if(!pixiReady)return;baseDrawEnemies();};

  const baseRender=render;
  render=function(){
    baseRender();
    if(pixiReady)syncPixi();
  };

  const baseApplyQuality=applyQuality;
  applyQuality=function(reason=''){
    baseApplyQuality(reason);
    if(app&&pixiReady&&W&&H) app.renderer.resize(W,H);
  };

  initPixi();
  setTimeout(initPixi,400);
})();
