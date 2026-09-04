/* RAMPAGE 1.5.4 — SPRITE BUILDINGS */
(()=>{
  const BUILDING_THEMES=['downtown','industrial','military','port','megacity','omega','nuclear','frozen'];
  const cache=new Map();
  function image(src){
    if(cache.has(src)) return cache.get(src);
    const im=new Image(); im.decoding='async'; im.src=src; cache.set(src,im); return im;
  }
  for(const theme of BUILDING_THEMES) for(const state of ['intact','damaged','ruin']) image(`assets/buildings/${theme}_${state}.webp`);
  function themeForLevel(){
    const map=['downtown','industrial','military','port','megacity','omega','nuclear','omega','frozen','omega'];
    return map[Math.max(0,Math.min(map.length-1,(level||1)-1))]||'downtown';
  }
  function drawFallbackHp(b,hpRatio){
    ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(b.x,b.y-10,b.fw,5);
    ctx.fillStyle=hpRatio>.5?'#44ff44':hpRatio>.25?'#ffaa00':'#ff2200';ctx.fillRect(b.x,b.y-10,b.fw*hpRatio,5);
  }
  const legacyDrawBuildings=drawBuildings;
  drawBuildings=function(){
    if(!buildings)return;
    const theme=themeForLevel();
    for(const b of buildings){
      const hpRatio=Math.max(0,Math.min(1,b.hp/b.maxHp));
      const state=b.destroyed?'ruin':hpRatio<.55?'damaged':'intact';
      const im=image(`assets/buildings/${theme}_${state}.webp`);
      if(!im.complete||!im.naturalWidth){ legacyDrawBuildings(); return; }
      const targetW=Math.max(54,b.fw*1.08), targetH=b.destroyed?Math.min(72,b.totalH*.42):Math.max(90,b.totalH+26);
      const x=b.x+(b.fw-targetW)/2, y=b.destroyed?GROUND-targetH+8:b.y-24;
      ctx.save();
      ctx.imageSmoothingEnabled=false;
      if(state==='damaged'){
        ctx.shadowColor='rgba(255,70,20,.2)';ctx.shadowBlur=qLevel&&qLevel()===2?10:0;
      }
      ctx.drawImage(im,x,y,targetW,targetH);
      ctx.restore();
      if(!b.destroyed){
        drawFallbackHp(b,hpRatio);
        if(hpRatio<.35&&frameT%8===0) spawnParticles(b.x+Math.random()*b.fw,b.y+b.totalH*.2,1,'#ff6600',1,5,'spark');
      } else if(frameT%14===0&&Math.random()>.78) spawnSmoke(b.x+b.fw/2,GROUND-9,1);
    }
  };
  window.__RAMPAGE_BUILDING_SPRITES__={version:'1.5.4',themes:BUILDING_THEMES,count:24};
})();
