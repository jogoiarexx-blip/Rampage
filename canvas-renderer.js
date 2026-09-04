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

