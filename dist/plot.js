/* Orthographic views of the measured landmark and focus vectors. */
(() => {
  'use strict';

  const gold = '#ffd277';
  const defaultYaw = 0.84;
  const defaultPitch = 0.24;
  const tau = 2 * Math.PI;
  const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));
  const finitePoint = point => point && [point.x, point.y, point.z].every(Number.isFinite);
  const mixPoint = (a, b, k) => ({
    x: a.x + (b.x - a.x) * k,
    y: a.y + (b.y - a.y) * k,
    z: a.z + (b.z - a.z) * k
  });
  const zero = { x: 0, y: 0, z: 0 };
  const overlap = (a, b, margin = 3) =>
    a.x < b.x + b.w + margin && a.x + a.w + margin > b.x &&
    a.y < b.y + b.h + margin && a.y + a.h + margin > b.y;

  function rotate(point, yaw, pitch, mode) {
    if (mode === '2d') return { x: point.x, y: -point.y, depth: point.z };
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const plane = point.x * sy + point.y * cy;
    const horizontal = point.x * cy - point.y * sy;
    const vertical = plane * sp - point.z * cp;
    // A small fixed camera roll separates the floor grid from horizontal UI edges.
    const roll = 0.12;
    return {
      x: horizontal * Math.cos(roll) - vertical * Math.sin(roll),
      y: horizontal * Math.sin(roll) + vertical * Math.cos(roll),
      depth: plane * cp + point.z * sp
    };
  }

  function create(container, options = {}) {
    if (!container) throw new Error('A plot container is required.');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const tooltip = document.createElement('div');
    const sr = document.createElement('span');
    const live = document.createElement('span');
    const identifier = 'atlas-plot-' + (++create.counter);
    if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
    container.style.overflow = 'hidden';
    canvas.style.cssText = 'width:100%;height:100%;display:block;position:absolute;inset:0;touch-action:none;outline-offset:-3px;cursor:grab;';
    canvas.setAttribute('role', 'group');
    canvas.tabIndex = 0;
    canvas.setAttribute('aria-describedby', identifier);
    canvas.setAttribute('aria-label','Word vector projection');
    sr.id = identifier;
    const srStyle = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0;';
    sr.style.cssText = live.style.cssText = srStyle;
    sr.textContent = 'Drag to rotate in 3D or pan in 2D. Use the left and right arrow keys to inspect neighbors, Shift with arrow keys to rotate, plus or minus to zoom, and Home to reset the view.';
    live.setAttribute('aria-live','polite');
    live.setAttribute('aria-atomic','true');
    tooltip.style.cssText = 'position:absolute;pointer-events:none;display:none;z-index:3;max-width:200px;box-sizing:border-box;background:rgba(23,27,42,.97);border:1px solid #52546b;border-radius:8px;padding:8px 11px;color:#ececf7;box-shadow:0 5px 18px #07091455;font:13px/1.45 "Inter",system-ui,Arial,sans-serif;';
    tooltip.setAttribute('aria-hidden','true');
    container.append(canvas, tooltip, sr, live);

    let scene = null, groups = new Map(), points = [], framePoints = [], byWord = new Map();
    let comparisons = new Map();
    let rank = new Map(), mode = '3d', yaw = defaultYaw, pitch = defaultPitch, zoom = 1;
    let width = 0, height = 0, ratio = 1, pan = {x:0,y:0};
    let worldCenter = zero, floorZ = -1, extent = 1, gridStep = 0.25;
    let frameId = 0, tween = null, currentFocus = null, lastMarks = [], lastLabels = [];
    let selected = null, hovered = null, external = null, pointer = null, pinch = null;
    let lastZoomWording = '', disposed = false;
    const pointers = new Map();
    const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');

    function resetCamera() {
      yaw = defaultYaw;
      pitch = defaultPitch;
      zoom = 1;
      pan = {x:0,y:0};
    }
    function sendView() {
      options.onViewChange?.({mode,zoom});
    }
    function request() {
      if (!frameId && !disposed) frameId = requestAnimationFrame(draw);
    }
    function colorOf(point) {
      return point.color || groups.get(point.group)?.color || '#a5a1da';
    }
    function positionAt(now) {
      if (!tween) return scene?.target || zero;
      const t = clamp((now - tween.start) / tween.duration, 0, 1);
      const eased = t * t * (3 - 2 * t);
      const p = mixPoint(tween.from, scene.target, eased);
      if (t === 1) tween = null;
      return p;
    }
    function measure() {
      const rect = container.getBoundingClientRect();
      width = Math.max(0, Math.round(rect.width));
      height = Math.max(0, Math.round(rect.height));
      ratio = clamp(window.devicePixelRatio || 1, 1, 2.5);
      if (width && height) {
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
        request();
      }
    }
    function setFrame() {
      const anchors = [...framePoints, scene.base || scene.target].filter(finitePoint);
      if (!anchors.length) anchors.push(zero);
      const limits = ['x','y','z'].map(key => {
        const values = anchors.map(p => p[key]);
        return [Math.min(...values), Math.max(...values)];
      });
      worldCenter = Object.fromEntries(['x','y','z'].map((key,i) => [key,(limits[i][0]+limits[i][1])/2]));
      extent = Math.max(0.001, ...limits.map(([lo,hi]) => hi-lo));
      floorZ = limits[2][0] - extent * 0.10;
      const desired = extent / 8;
      const scale = 10 ** Math.floor(Math.log10(desired));
      const steps = [1, 2, 2.5, 5, 10];
      gridStep = (steps.find(s => s >= desired / scale) || 10) * scale;
    }
    function projector() {
      // Keep scale and framing fixed as the camera turns or the query moves.
      const home = [...framePoints, scene.base || scene.target].filter(finitePoint).map(p => rotate(p, defaultYaw, defaultPitch, mode));
      if (!home.length) home.push({x:0,y:0});
      const xs = home.map(p => p.x), ys = home.map(p => p.y);
      const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
      const spanX = Math.max(extent * 0.36, maxX - minX);
      const spanY = Math.max(extent * 0.32, maxY - minY);
      const side = Math.min(width * 0.135, 89);
      const top = Math.min(height * 0.095, 44);
      const bottom = Math.min(height * 0.10, 45);
      const unit = Math.min((width - side * 2) / spanX, (height - top - bottom) / spanY) * zoom;
      const homeCenter = rotate(worldCenter, defaultYaw, defaultPitch, mode);
      const offsetX = (homeCenter.x - (minX+maxX)/2) * unit;
      const offsetY = (homeCenter.y - (minY+maxY)/2) * unit;
      const center = rotate(worldCenter, yaw, pitch, mode);
      const px = width/2 + pan.x + offsetX;
      const py = (height + top - bottom)/2 + pan.y + offsetY;
      const project = point => {
        const v = rotate(point, yaw, pitch, mode);
        return {x:px+(v.x-center.x)*unit, y:py+(v.y-center.y)*unit, depth:v.depth};
      };
      return { project, unit };
    }
    function line(a, b, color, thickness = 1, alpha = 1, dash = []) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = color; ctx.lineWidth = thickness; ctx.globalAlpha = alpha; ctx.setLineDash(dash); ctx.stroke();
      ctx.restore();
    }
    function circle(x, y, radius, fill, stroke, lineWidth=1, alpha=1) {
      ctx.save(); ctx.globalAlpha = alpha;
      ctx.beginPath(); ctx.arc(x,y,radius,0,tau);
      if(fill){ctx.fillStyle=fill;ctx.fill();}
      if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lineWidth;ctx.stroke();}
      ctx.restore();
    }
    function rounded(x,y,w,h,r) {
      ctx.beginPath();
      if(ctx.roundRect) ctx.roundRect(x,y,w,h,r);
      else ctx.rect(x,y,w,h);
    }
    function backdrop() {
      ctx.fillStyle = '#10131f'; ctx.fillRect(0,0,width,height);
      const glow = ctx.createRadialGradient(width*.52,height*.44,0,width*.5,height*.5,Math.max(width,height)*.62);
      glow.addColorStop(0,'#1a2031'); glow.addColorStop(.63,'#131725'); glow.addColorStop(1,'#10131f');
      ctx.fillStyle=glow; ctx.fillRect(0,0,width,height);
    }
    function grid(project, unit) {
      const step = gridStep;
      const z = mode === '3d' ? floorZ : 0;
      const count = Math.min(48,Math.max(12,Math.ceil(Math.max(width,height)/(unit*step))+5));
      const cx = Math.round(worldCenter.x / step), cy = Math.round(worldCenter.y / step);
      const xlo=(cx-count)*step,xhi=(cx+count)*step,ylo=(cy-count)*step,yhi=(cy+count)*step;
      function strokeGrid(a,b,axis,major) {
        line(project(a),project(b),axis?'#8291ac':'#73809a',axis?1.1:.7,axis ? .31 : major ? .22 : .12);
      }
      for(let i=-count;i<=count;i++) {
        const ix = cx+i, iy = cy+i;
        strokeGrid({x:ix*step,y:ylo,z},{x:ix*step,y:yhi,z},ix===0,ix%4===0);
        strokeGrid({x:xlo,y:iy*step,z},{x:xhi,y:iy*step,z},iy===0,iy%4===0);
      }
      if (mode==='3d') {
        line(project({x:0,y:0,z:floorZ}), project({x:0,y:0,z: Math.max(floorZ+extent*.9,0)}), '#8895ac',.9,.28,[3,5]);
      }
    }
    function compass() {
      const x=31, y=height-27;
      const origin={x,y};
      const axes=[['X',{x:1,y:0,z:0},'#a7b6c8'],['Y',{x:0,y:1,z:0},'#a7b6c8']];
      if(mode==='3d')axes.push(['Z',{x:0,y:0,z:1},'#a7b6c8']);
      ctx.font='10px ui-monospace,monospace';ctx.textAlign='center';ctx.textBaseline='middle';
      const labels=[];
      for(const [label,v,color] of axes) {
        const p=rotate(v,yaw,pitch,mode), length=17;
        const end={x:x+p.x*length,y:y+p.y*length};
        line(origin,end,color,1.15,.72);
        const norm=Math.hypot(p.x,p.y);
        if (norm>0.22){
          const lx=end.x+7*p.x/norm, ly=end.y+7*p.y/norm;
          const dx=labels.some(l=>Math.hypot(l.x-lx,l.y-ly)<11)?(p.x<=.1?-8:8):0;
          labels.push({x:lx+dx,y:ly});
          ctx.fillStyle=color;ctx.fillText(label,lx+dx,ly);
        }
      }
      circle(x,y,1.7,'#b8c4d3');
      ctx.textAlign='left';
    }
    function fadeAtEdges(p) {
      const edge = Math.min(p.x,width-p.x,p.y,height-p.y);
      return clamp(edge/28,.20,1);
    }
    function renderLinks(project, focus, marks) {
      const neighbors = marks.filter(m=>m.p.score>0 && rank.has(m.p.word))
        .sort((a,b)=>rank.get(a.p.word)-rank.get(b.p.word)).slice(0,5);
      for(const [i,mark] of neighbors.entries()) {
        const gradient = ctx.createLinearGradient(focus.x,focus.y,mark.x,mark.y);
        gradient.addColorStop(0,'#e6ba6c');gradient.addColorStop(.86,colorOf(mark.p));
        line(focus,mark,gradient,i===0?1.35:1.0,i===0?.41:.26,i<2?[]:[3,4]);
      }
      if(mode==='3d') {
        const foot=project({x:currentFocus.x,y:currentFocus.y,z:floorZ});
        if(Math.hypot(foot.x-focus.x,foot.y-focus.y)>16) {
          line(focus,foot,'#e3bd78',.8,.25,[2,4]);
          ctx.save();ctx.strokeStyle='#e3bd785c';ctx.lineWidth=.8;ctx.beginPath();ctx.ellipse(foot.x,foot.y,4,2,0,0,tau);ctx.stroke();ctx.restore();
        }
      }
      if(!scene.contextApplied || !finitePoint(scene.base)) return;
      const a=project(scene.base), dx=focus.x-a.x,dy=focus.y-a.y,len=Math.hypot(dx,dy);
      if(len<12)return;
      const ux=dx/len, uy=dy/len, tip={x:focus.x-ux*10,y:focus.y-uy*10};
      circle(a.x,a.y,5,'#182030',gold,1.4,.75);
      line(a,tip,gold,1.65,.86,[4,4]);
      line(tip,{x:tip.x-ux*6-uy*3,y:tip.y-uy*6+ux*3},gold,1.4,.85);
      line(tip,{x:tip.x-ux*6+uy*3,y:tip.y-uy*6-ux*3},gold,1.4,.85);
    }
    function drawMark(mark, active) {
      if(mark.x < -12||mark.x > width+12||mark.y < -12||mark.y > height+12)return;
      const col=colorOf(mark.p), index=rank.get(mark.p.word) ?? 100;
      const radius = mark.p.word===active?4.8:index<6?3.55:2.7;
      const alpha = fadeAtEdges(mark) * (index<12?.98:.83);
      circle(mark.x,mark.y,radius+3,col,null,1,alpha*.09);
      circle(mark.x,mark.y,radius,col,'#111522',.8,alpha);
      if(mark.p.word===active)circle(mark.x,mark.y,radius+4,null,col,1.1,.85);
    }
    const markKey = point => point.key || point.word;

    function drawComparison(mark, focus, active) {
      const color = colorOf(mark.p);
      const touchingFocus = Math.hypot(mark.x-focus.x, mark.y-focus.y) < 3;
      const radius = touchingFocus ? 14 : 6.3;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(mark.x,mark.y-radius);
      ctx.lineTo(mark.x+radius,mark.y);
      ctx.lineTo(mark.x,mark.y+radius);
      ctx.lineTo(mark.x-radius,mark.y);
      ctx.closePath();
      ctx.fillStyle=color;
      ctx.globalAlpha=touchingFocus?.13:.88;
      ctx.fill();
      ctx.globalAlpha=1;
      ctx.strokeStyle=active===mark.p.key?'#ffffff':touchingFocus?color:'#e0dce9';
      ctx.lineWidth=active===mark.p.key?2:1.2;
      ctx.stroke();
      ctx.restore();
    }
    function getLabel(mark, text, wide, primary = false, scale = 1) {
      const font = primary?'600 '+(width<480?15:18)+'px "Inter",system-ui,Arial,sans-serif':'500 '+(scale===1?(width>=690?13:12):11)+'px "Inter",system-ui,Arial,sans-serif';
      ctx.font = font;
      const pad=primary?10:mark.p.comparison?6:3;
      const mw=ctx.measureText(text).width+2*pad;
      const h=primary?29:mark.p.comparison?22:18;
      const distance=primary?13:mark.p.comparison?10:6;
      const bias=mark.x>width*0.82?-1:1;
      const right=mark.x+distance, left=mark.x-distance-mw;
      const inside=(x,y)=>x>=7&&x+mw<=width-7&&y>=5&&y+h<=height-6;
      const raw=[
        [bias>0?right:left,mark.y-h/2],[bias>0?left:right,mark.y-h/2],
        [mark.x-mw/2,mark.y-distance-h+1],[mark.x-mw/2,mark.y+distance-1],
        [right,mark.y-distance-h/2],[left,mark.y-distance-h/2],
        [right,mark.y+distance-h/2],[left,mark.y+distance-h/2]
      ];
      if(wide)for(const n of (mark.p.comparison?[18,34,50,69,91,116]:[17,29,41])) {
        raw.push([bias>0?right:left,mark.y-h/2-n],[bias>0?right:left,mark.y-h/2+n],
          [bias>0?left:right,mark.y-h/2-n],[bias>0?left:right,mark.y-h/2+n]);
      }
      return raw.filter(([x,y])=>inside(x,y)).map(([x,y])=>({x,y,w:mw,h,font,pad,mark,primary}));
    }
    function drawLabel(mark, box, primary) {
      const label = mark.p.word;
      const col=primary?gold:colorOf(mark.p);
      const midY=box.y+box.h/2;
      const near={x:clamp(mark.x,box.x,box.x+box.w),y:clamp(mark.y,box.y,box.y+box.h)};
      if(Math.hypot(near.x-mark.x,near.y-mark.y)>11) line(mark,near,col,.9,primary?.7:.5);
      ctx.save();
      if(primary){
        rounded(box.x,box.y,box.w,box.h,5);ctx.fillStyle='#2b2825';ctx.fill();ctx.strokeStyle='#c09e5f';ctx.lineWidth=.95;ctx.stroke();
      }
      if(mark.p.comparison){
        rounded(box.x,box.y,box.w,box.h,4);ctx.fillStyle='#191e2b';ctx.fill();ctx.strokeStyle=col;ctx.lineWidth=.8;ctx.stroke();
      }
      ctx.font=box.font;ctx.textAlign='left';ctx.textBaseline='middle'; ctx.lineJoin='round';
      if(!primary && !mark.p.comparison){ ctx.strokeStyle='#151a29';ctx.lineWidth=4;ctx.strokeText(label,box.x+box.pad,midY+.5); }
      ctx.fillStyle=col;ctx.fillText(label,box.x+box.pad,midY+.5);ctx.restore();
    }
    function placeLabels(marks, focus, active, overlays) {
      const inFrame = p=>p.x>5 && p.x<width-5 && p.y>5 && p.y<height-5;
      const visible=marks.filter(inFrame);
      const result=[];
      const obstacles=[{x:4,y:height-59,w:59,h:55},
        {x:8,y:8,w:Math.min(width*.53,195),h:24},{x:width-128,y:4,w:123,h:36},{x:width-128,y:height-36,w:124,h:32}];
      const highPriority=overlays.filter(inFrame);
      const coversDiamond=(r,p)=>highPriority.some(m=>m!==p && overlap(r,{x:m.x-6,y:m.y-6,w:12,h:12},2));
      const focused={...focus,p:{word:scene.word}};
      const safe=(r,p)=>!coversDiamond(r,p) && !obstacles.some(b=>overlap(r,b,4))&&!visible.some(m=>m!==p && overlap(r,{x:m.x-2.8,y:m.y-2.8,w:5.6,h:5.6},1))&&
        (p===focused || !overlap(r,{x:focus.x-11,y:focus.y-11,w:22,h:22},1));
      if(inFrame(focus)){
        const choices=getLabel(focused,scene.word,true,true);
        const chosen=choices.find(r=>safe(r,focused))||choices.find(r=>!obstacles.some(b=>overlap(r,b)))||choices[0];
        if(chosen){obstacles.push(chosen);result.push({box:chosen,mark:focused,primary:true});}
      }
      for (const m of highPriority){
        const choices=getLabel(m,m.p.word,true);
        const chosen=choices.find(r=>safe(r,m)) || choices.find(r=>!coversDiamond(r,m) && !obstacles.some(b=>overlap(r,b,3)));
        if(chosen){obstacles.push(chosen);result.push({box:chosen,mark:m,primary:false});}
      }
      const picked=[],counts=new Map(),left=new Set(visible);
      const maximum = Math.max(3,(width<475?10:width<700?15:19)-highPriority.length);
      while(left.size && picked.length<maximum) {
        let best=null, score=-Infinity, box=null;
        for(const m of left){
          const key=m.p.word,importance=1/Math.sqrt((rank.get(key)??80)+1);
          // Favour a legible spread and leave each group room to make its neighborhood visible.
          const distance=Math.min(160,...picked.map(k=>Math.hypot(m.x-k.x,m.y-k.y)),Math.hypot(m.x-focus.x,m.y-focus.y));
          const balance=1/(1+(counts.get(m.p.group)||0)*.70);
          const value=(key===active?100:0)+importance*1.6+distance/94+balance*.80;
          if(value<=score)continue;
          const choices=getLabel(m,key,true);
          const fit=choices.find(r=>safe(r,m));
          if(fit){best=m;score=value;box=fit;}
        }
        if(!best)break;
        left.delete(best);picked.push(best);counts.set(best.p.group,(counts.get(best.p.group)||0)+1);
        obstacles.push(box);result.push({box,mark:best,primary:false});
      }
      for(const l of result.slice().reverse())drawLabel(l.mark,l.box,l.primary);
      return result;
    }
    function draw(timestamp) {
      frameId=0;
      if(!ctx || !width || !height || disposed)return;
      ctx.setTransform(ratio,0,0,ratio,0,0);
      backdrop();
      if(!scene || !finitePoint(scene.target))return;
      const {project,unit}=projector();
      grid(project,unit);
      currentFocus=positionAt(timestamp);
      const focus=project(currentFocus);
      const active=hovered||selected||external;
      const marks=points.map(p=>({...project(p),p})).sort((a,b)=>a.depth-b.depth);
      // Tint the neighborhoods around actual visible group centroids.
      for (const [key,g] of groups) {
        const members=marks.filter(m=>m.p.group===key);
        if(members.length<2)continue;
        const center=members.reduce((c,m)=>({x:c.x+m.x/members.length, y:c.y+m.y/members.length}),{x:0,y:0});
        const spread=Math.sqrt(members.reduce((sum,m)=>sum+(m.x-center.x)**2+(m.y-center.y)**2,0)/members.length);
        if (mode==='3d') {
          const representative=members.reduce((a,b)=>Math.hypot(a.x-center.x,a.y-center.y)<Math.hypot(b.x-center.x,b.y-center.y)?a:b);
          const foot=project({...representative.p,z:floorZ});
          if(Math.hypot(foot.x-representative.x,foot.y-representative.y)>20) {
            line(representative,foot,g.color,.8,.22,[2,5]);
            circle(foot.x,foot.y,2,null,g.color,.8,.34);
          }
        }
        const radius=clamp(spread*1.85+39,46,155);
        const wash=ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, radius);
        wash.addColorStop(0,g.color);wash.addColorStop(1,'transparent');
        circle(center.x,center.y,radius,wash,null,1,.065);
      }
      renderLinks(project,focus,marks);
      const overlayMarks=[...comparisons.values()].map(p=>({...project(p),p}));
      const origin=finitePoint(scene.base)?project(scene.base):focus;
      for(const m of overlayMarks) {
        line(origin,m,colorOf(m.p),1.1,.70,[5,3]);
      }
      for(const mark of marks)drawMark(mark,active);
      for(const m of overlayMarks)drawComparison(m,focus,active);
      const halo=ctx.createRadialGradient(focus.x,focus.y,0,focus.x,focus.y,25);
      halo.addColorStop(0,'#ffcd7580');halo.addColorStop(.45,'#ffcd751e');halo.addColorStop(1,'#ffcd7500');
      circle(focus.x,focus.y,25,halo);
      circle(focus.x,focus.y,10,null,gold,1,.71);circle(focus.x,focus.y,5.0,gold,'#ffdfa4',.8);
      lastLabels=placeLabels(marks,focus,active,overlayMarks);
      lastMarks=[...marks,{...focus,p:{...scene.target,word:scene.word,focus:true}},...overlayMarks];
      compass();
      positionTooltip(hovered||selected);
      if(tween)request();
    }
    function positionTooltip(key) {
      const m=lastMarks.find(mark=>markKey(mark.p)===key);
      if(!key || !m || m.x<0 || m.y<0 || m.x>width || m.y>height || pointer?.dragged) {
        tooltip.style.display='none'; return;
      }
      const label=m.p.comparison?('“'+scene.word+'” in context'):m.p.focus?'Focus word':(groups.get(m.p.group)?.label || 'Landmark');
      if (tooltip.dataset.word!==key){
        const name=document.createElement('strong'),desc=document.createElement('div');
        name.textContent=m.p.word;name.style.color=m.p.focus?gold:colorOf(m.p);
        desc.textContent=label;desc.style.color='#b9c2d4';
        const nodes=[name,desc];
        if(m.p.comparison){
          const sentence=document.createElement('div');
          sentence.textContent=m.p.sentence;
          sentence.style.cssText='margin-top:5px;color:#e4e5ef;white-space:normal;';
          nodes.push(sentence);
        }
        if(!m.p.focus && Number.isFinite(m.p.score)) {
          const metric=document.createElement('div');
          metric.textContent='Cosine '+m.p.score.toFixed(3);
          metric.style.cssText='color:#d1d5e1;font:11px ui-monospace,monospace;margin-top:4px;';
          nodes.push(metric);
        }
        tooltip.replaceChildren(...nodes);tooltip.dataset.word=key;
      }
      tooltip.style.display='block';
      const tw=tooltip.offsetWidth, th=tooltip.offsetHeight;
      const x=m.x+15+tw<width-5?m.x+15:m.x-15-tw;
      const y=m.y-th-12>5?m.y-th-12:m.y+15;
      tooltip.style.left=clamp(x,5,Math.max(5,width-tw-5))+'px';
      tooltip.style.top=clamp(y,5,Math.max(5,height-th-5))+'px';
    }
    function hit(x,y) {
      let best=null, distance=13;
      for(let i=lastMarks.length-1;i>=0;i--){
        const mark=lastMarks[i],d=Math.hypot(x-mark.x,y-mark.y);
        if(d<distance){best=mark;distance=d;}
      }
      if(best)return markKey(best.p);
      for(const {box,mark} of lastLabels){
        if(x>=box.x && x<=box.x+box.w && y>=box.y && y<=box.y+box.h)return markKey(mark.p);
      }
      return null;
    }
    function announce(key) {
      if(comparisons.has(key)) {
        const c=comparisons.get(key);
        live.textContent=c.word+'. '+scene.word+' in context. '+c.sentence;
        return;
      }
      const p=byWord.get(key);
      if(p){live.textContent=p.word+', '+(groups.get(p.group)?.label||'landmark')+(Number.isFinite(p.score)?', cosine similarity '+p.score.toFixed(3):'')+'.';}
      else if(key===scene?.word)live.textContent=key+', focus word.';
    }
    function select(key) {
      selected=key;
      if(key) {
        announce(key);
        if(comparisons.has(key)) options.onCompare?.(comparisons.get(key).sentence);
        else {
          const p=byWord.get(key) || {...scene.target,word:scene.word,focus:true};
          options.onSelect?.(p);
        }
      }
      request();
    }
    function normalizedPoint(e){
      const r=canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};
    }
    function updateZoom(newZoom) {
      zoom=clamp(newZoom,0.43,4);sendView();request();
    }
    function wheel(e){
      if (!scene || (!e.ctrlKey && Math.abs(e.deltaX)>Math.abs(e.deltaY))) return;
      e.preventDefault();
      const factor=e.deltaMode===1?15:e.deltaMode===2?height:1;
      updateZoom(zoom*Math.exp(-clamp(e.deltaY*factor,-150,150)*.0019));
    }
    function down(e){
      if(!scene || e.button!==0)return;
      const pos=normalizedPoint(e);pointers.set(e.pointerId,pos);
      canvas.setPointerCapture?.(e.pointerId);
      if(pointers.size===2) {
        const [a,b]=[...pointers.values()];pinch={distance:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)),zoom};
        if(pointer)pointer.dragged=true;
      }else pointer={id:e.pointerId,start:pos,last:pos,dragged:false,shift:e.shiftKey};
      hovered=null;canvas.style.cursor='grabbing';
    }
    function move(e){
      const pos=normalizedPoint(e);
      if(!pointers.has(e.pointerId)){
        const key=hit(pos.x,pos.y);
        if(key!==hovered){hovered=key;canvas.style.cursor=key?'pointer':'grab';request();}
        return;
      }
      pointers.set(e.pointerId,pos);
      if(pinch && pointers.size===2){
        const [a,b]=[...pointers.values()];updateZoom(pinch.zoom*Math.hypot(a.x-b.x,a.y-b.y)/pinch.distance);return;
      }
      if(!pointer || pointer.id!==e.pointerId)return;
      const dx=pos.x-pointer.last.x,dy=pos.y-pointer.last.y;
      if(Math.hypot(pos.x-pointer.start.x,pos.y-pointer.start.y)>4)pointer.dragged=true;
      if(pointer.dragged){
        if(mode==='2d'||pointer.shift){pan.x+=dx;pan.y+=dy;}
        else{yaw+=dx*.008;pitch=clamp(pitch-dy*.007,-1.4,1.48);}
        request();
      }
      pointer.last=pos;
    }
    function up(e) {
      if(!pointers.has(e.pointerId))return;
      pointers.delete(e.pointerId);
      if(!pinch && pointer?.id===e.pointerId && !pointer.dragged){
        const pos=normalizedPoint(e);select(hit(pos.x,pos.y));
      }
      if(pinch && pointers.size===1){
        const [id,p]=[...pointers.entries()][0];pointer={id,start:p,last:p,dragged:true,shift:false};
      }else pointer=null;
      pinch=null;canvas.style.cursor='grab';request();
    }
    function cancel(e){pointers.delete(e.pointerId);pointer=null;pinch=null;canvas.style.cursor='grab';request();}
    function keydown(e){
      if(!scene)return;
      const keys=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','Escape','=','+','-','Enter'];
      if(!keys.includes(e.key))return;
      e.preventDefault();hovered=null;
      if(e.key==='Home'){api.resetView();return;}
      if(e.key==='Escape'){selected=null;request();return;}
      if(e.key==='+'||e.key==='='||e.key==='-'){api.zoomBy(e.key==='-'?1/1.2:1.2);return;}
      if(e.key==='Enter'){if(selected)select(selected);return;}
      const delta=['ArrowLeft','ArrowUp'].includes(e.key)?-1:1;
      if(e.shiftKey){
        if(mode==='3d'){
          if(['ArrowLeft','ArrowRight'].includes(e.key))yaw+=delta*.13;
          else pitch=clamp(pitch-delta*.11,-1.4,1.48);
        }else if(['ArrowLeft','ArrowRight'].includes(e.key))pan.x+=delta*12;else pan.y+=delta*12;
      }else{
        const keys=[scene.word,...comparisons.keys(),...points.slice().sort((a,b)=>(rank.get(a.word)??100)-(rank.get(b.word)??100)).map(p=>p.word)];
        const i=keys.indexOf(selected);selected=keys[(i+delta+keys.length)%keys.length];announce(selected);
      }
      request();
    }
    const events=[['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',cancel],
      ['pointerleave',()=>{if(!pointer){hovered=null;request();}}],['wheel',wheel,{passive:false}],['keydown',keydown]];
    for(const [name,handler,config] of events)canvas.addEventListener(name,handler,config);
    const ro=window.ResizeObserver?new ResizeObserver(measure):null;
    if(ro)ro.observe(container);else window.addEventListener('resize',measure);
    measure();
    const api={
      setScene(next) {
        if(!next || !finitePoint(next.target))return;
        const now=performance.now();
        const modelChange=scene?.model!==next.model || scene?.dimension!==next.dimension;
        const basisKey=object => (object?.framePoints || object?.points || []).slice(0,4).map(p=>[p.word,p.x,p.y,p.z].join(',')).join('/');
        const sameSpace=scene && scene.word===next.word && !modelChange && basisKey(scene)===basisKey(next);
        const from=sameSpace?positionAt(now):null;
        if(!sameSpace){comparisons.clear();resetCamera();sendView();}
        scene=next;groups=new Map((next.groups||[]).map(g=>[g.id,g]));
        points=(next.points||[]).filter(p=>finitePoint(p) && p.word!==next.word);
        framePoints = next.framePoints?.length ? next.framePoints.filter(finitePoint) : points;
        byWord=new Map(points.map(p=>[p.word,p]));
        rank=new Map((next.rankings||[]).map((p,i)=>[p.word,i]));
        hovered=selected=null;tooltip.dataset.word='';
        if(!byWord.has(external))external=null;
        setFrame();
        tween=(from && !reducedMotion?.matches && Math.hypot(from.x-next.target.x,from.y-next.target.y,from.z-next.target.z)>1e-7)?{from,start:now,duration:420}:null;
        currentFocus=next.target;
        canvas.setAttribute('aria-label',mode.toUpperCase()+' vector projection for '+next.word+' with '+points.length+' landmarks.');
        request();
      },
      setComparisons(items) {
        if(!Array.isArray(items))return;
        const previous=comparisons;
        comparisons=new Map();
        for(const item of items){
          if(!finitePoint(item)||typeof item.sentence!=='string'||!item.sentence.trim()||!item.label)continue;
          const key='context/'+item.sentence;
          comparisons.set(key,{...item,key,word:String(item.label),color:item.color||gold,comparison:true});
        }
        if(previous.has(selected) && !comparisons.has(selected))selected=null;
        if(previous.has(hovered) && !comparisons.has(hovered))hovered=null;
        tooltip.dataset.word='';
        request();
      },
      setMode(value){
        const v=String(value).toLowerCase();
        if(v!=='3d'&&v!=='2d')return;
        mode=v;resetCamera();sendView();request();
        if(scene)canvas.setAttribute('aria-label',mode.toUpperCase()+' vector projection for '+scene.word+' with '+points.length+' landmarks.');
      },
      zoomBy(factor){if(Number.isFinite(factor)&&factor>0){updateZoom(zoom*factor);const wording='Zoom '+Math.round(zoom*100)+' percent.';if(lastZoomWording!==wording){live.textContent=wording;lastZoomWording=wording;}}},
      resetView(){resetCamera();hovered=selected=null;sendView();request();},
      highlight(word){external=word||null;request();},
      destroy(){disposed=true;cancelAnimationFrame(frameId);ro?.disconnect();window.removeEventListener('resize',measure);for(const [name,handler,config]of events)canvas.removeEventListener(name,handler,config);canvas.remove();tooltip.remove();sr.remove();live.remove();}
    };
    return api;
  }
  create.counter=0;
  window.AtlasPlot={create};
})();
