'use strict';
(() => {
  const menu = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.header nav');
  menu.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    menu.textContent = open ? '×' : '☰';
    nav.classList.toggle('open', open);
  });
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('open'); menu.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-label', 'Open navigation'); menu.textContent = '☰';
  }));
  const solutionDialog=document.getElementById('solution-dialog');
  const researchAreas={
    dna:{index:'01 / 03',title:'DNA & RNA',intro:'Begin with the molecules that store and carry biological information. A molecular workflow connects sample preparation with a clear biological question.',points:['Prepare nucleic acids from an appropriate biological sample.','Assess quantity, purity and integrity before downstream analysis.','Explore sequence information with methods such as PCR or sequencing.']},
    epigenetics:{index:'02 / 03',title:'Epigenetics',intro:'Explore how chemical marks and chromatin organization relate to gene activity, without changing the underlying DNA sequence.',points:['Study DNA methylation in a defined biological context.','Investigate chromatin accessibility and regulatory regions.','Interpret results alongside cell type, experimental controls and sequence data.']},
    microbiomics:{index:'03 / 03',title:'Microbiomics',intro:'Study microbial communities and their genetic material. Reliable comparisons begin with thoughtful sampling and controls.',points:['Preserve representative microbial samples and reduce contamination.','Use appropriate extraction methods and positive and negative controls.','Explore community composition or functional potential using sequencing.']}
  };
  document.querySelectorAll('[data-solution]').forEach(button=>button.addEventListener('click',()=>{
    const area=researchAreas[button.dataset.solution];
    document.getElementById('solution-title').textContent=area.title;
    document.getElementById('solution-intro').textContent=area.intro;
    document.getElementById('solution-index').textContent=area.index;
    document.getElementById('solution-points').replaceChildren(...area.points.map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));
    solutionDialog.showModal();
  }));
  solutionDialog.querySelector('.dialog-close').addEventListener('click',()=>solutionDialog.close());
  solutionDialog.addEventListener('click',e=>{if(e.target===solutionDialog){const r=solutionDialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)solutionDialog.close();}});
  const canvas = document.getElementById('dna');
  const fallback = document.getElementById('webgl-fallback');
  const toggle = document.getElementById('motion-toggle');
  const hero = document.querySelector('.hero');
  const inspector = document.getElementById('dna-inspector');
  const hotspotLayer = document.querySelector('.dna-hotspots');
  const gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: false });
  if (!gl) {
    fallback.hidden = false; canvas.hidden = true; hotspotLayer.hidden = true;
    document.querySelector('.interaction').hidden = true;
    document.getElementById('solution-explore').hidden=true;
    return;
  }
  const vertex = `
    attribute vec3 aPosition;
    attribute vec3 aNormal;
    attribute float aMaterial;
    uniform mat4 uModel;
    uniform mat4 uProjection;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying float vMaterial;
    varying float vLocalY;
    varying vec3 vLocalPosition;
    void main(){
      vec4 p = uModel * vec4(aPosition,1.0);
      vPosition = p.xyz;
      vNormal = mat3(uModel)*aNormal;
      vMaterial = aMaterial;
      vLocalY = aPosition.y;
      vLocalPosition = aPosition;
      gl_Position = uProjection*p;
    }`;
  const fragment = `
    precision highp float;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying float vMaterial;
    varying float vLocalY;
    varying vec3 vLocalPosition;
    uniform float uSelectedY;
    uniform float uFocus;
    void main(){
      vec3 N=normalize(vNormal);
      vec3 V=normalize(-vPosition);
      vec3 L=normalize(vec3(-3.0,5.0,5.0));
      vec3 L2=normalize(vec3(2.0,-4.0,1.5));
      float facing=max(dot(N,V),0.0);
      float rim=pow(1.0-facing,2.4);
      float diffuse=max(dot(N,L),0.0);
      float spec=pow(max(dot(N,normalize(L+V)),0.0),95.0);
      float spec2=pow(max(dot(N,normalize(L2+V)),0.0),58.0);
      float inner=pow(facing,9.0);
      vec3 dark=vec3(.12,.18,.14);
      vec3 glass=vec3(.85,.92,.78);
      vec3 color=dark*(.65+diffuse*.5);
      color+=glass*rim*1.7;
      float reflection=pow(abs(dot(N,normalize(vec3(-.8,.35,1.0)))),22.0);
      color+=vec3(.86,.95,.86)*reflection*.95;
      color+=vec3(.93,1.0,.85)*spec*1.7;
      color+=vec3(.84,.98,.30)*spec2*1.5;
      color+=vec3(.20,.31,.14)*inner*.38;
      color+=vec3(.58,.73,.13)*max(dot(N,L2),0.0)*.22;
      color+=glass*pow(diffuse,14.0)*.35;
      color=mix(color,color*vec3(.78,1.0,.52),min(vMaterial,1.0)*.2);
      float collar=1.0-step(.25,abs(vMaterial-2.0));
      vec3 collarColor=vec3(.68,.87,.18)*(.7+rim*.8)+vec3(1.0,.98,.56)*spec;
      color=mix(color,collarColor,collar);
      float socket=1.0-step(.25,abs(vMaterial-3.0));
      color=mix(color,vec3(.13,.19,.09)+glass*rim*.65+spec*.9,socket);
      float lens=1.0-step(.25,abs(vMaterial-4.0));
      color=mix(color,vec3(.63,.87,.18)*(.8+facing*.3)+spec*.5,lens);
      float glassSurface=1.0-step(1.5,vMaterial);
      float etching=pow(max(0.0,sin(vLocalY*110.0+vLocalPosition.x*3.0)),64.0);
      color+=glassSurface*etching*vec3(.04,.06,.025)*diffuse;
      float depth=clamp((vPosition.z+13.0)/8.0,.42,1.0);
      float selectedBand=1.0-smoothstep(.14,.30,abs(vLocalY-uSelectedY));
      color=mix(color*.55,color+vec3(.34,.42,.10),selectedBand)*uFocus+color*(1.0-uFocus);
      gl_FragColor=vec4(color*depth,1.0);
    }`;
  function shader(type, source) {
    const s=gl.createShader(type); gl.shaderSource(s,source); gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  let program;
  try {
    program=gl.createProgram(); gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));
    gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment)); gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  } catch(error) {
    console.error('DNA renderer initialization failed:',error);
    fallback.hidden=false; canvas.hidden=true; hotspotLayer.hidden=true; toggle.disabled=true; return;
  }
  gl.useProgram(program);
  const positions=[],normals=[],materials=[];
  function point(p,n,m) {positions.push(...p);normals.push(...n);materials.push(m);}
  function sphere(center,radius,m) {
    const slices=16,stacks=12;
    function v(i,j){
      const a=i/slices*Math.PI*2,b=j/stacks*Math.PI;
      const n=[Math.cos(a)*Math.sin(b),Math.cos(b),Math.sin(a)*Math.sin(b)];
      return [center.map((c,k)=>c+n[k]*radius),n];
    }
    for(let j=0;j<stacks;j++)for(let i=0;i<slices;i++){
      const a=v(i,j),b=v(i+1,j),c=v(i,j+1),d=v(i+1,j+1);
      [a,c,b,b,c,d].forEach(x=>point(x[0],x[1],m));
    }
  }
  function cylinder(a,b,r,m,endRadius=r) {
    const delta=b.map((v,i)=>v-a[i]),len=Math.hypot(...delta),w=delta.map(v=>v/len);
    let u=Math.abs(w[1])<.9?[-w[2],0,w[0]]:[0,w[2],-w[1]];
    const ul=Math.hypot(...u);u=u.map(v=>v/ul);
    const v=[w[1]*u[2]-w[2]*u[1],w[2]*u[0]-w[0]*u[2],w[0]*u[1]-w[1]*u[0]];
    function edge(t,c,radius){const n=u.map((x,i)=>x*Math.cos(t)+v[i]*Math.sin(t));return [c.map((x,i)=>x+n[i]*radius),n];}
    for(let i=0;i<12;i++){
      const t=i/12*Math.PI*2,t2=(i+1)/12*Math.PI*2;
      const p=edge(t,a,r),q=edge(t2,a,r),s=edge(t,b,endRadius),z=edge(t2,b,endRadius);
      [p,s,q,q,s,z].forEach(x=>point(x[0],x[1],m));
    }
  }
  function collar(center,axis,radius=.14,thickness=.025){
    const length=Math.hypot(...axis),w=axis.map(v=>v/length);
    let u=Math.abs(w[1])<.9?[-w[2],0,w[0]]:[0,w[2],-w[1]];
    const l=Math.hypot(...u);u=u.map(v=>v/l);
    const v=[w[1]*u[2]-w[2]*u[1],w[2]*u[0]-w[0]*u[2],w[0]*u[1]-w[1]*u[0]];
    function vertex(a,b){
      const radial=u.map((x,i)=>x*Math.cos(a)+v[i]*Math.sin(a));
      const n=radial.map((x,i)=>x*Math.cos(b)+w[i]*Math.sin(b));
      return [center.map((x,i)=>x+radial[i]*radius+n[i]*thickness),n];
    }
    for(let i=0;i<18;i++)for(let j=0;j<6;j++){
      const a=i/18*Math.PI*2,b=j/6*Math.PI*2,an=(i+1)/18*Math.PI*2,bn=(j+1)/6*Math.PI*2;
      const p=vertex(a,b),q=vertex(an,b),s=vertex(a,bn),t=vertex(an,bn);
      [p,s,q,q,s,t].forEach(x=>point(x[0],x[1],2));
    }
  }
  function helix(y,side){const angle=y*1.18+side*Math.PI;return [Math.cos(angle)*1.22,y,Math.sin(angle)*1.22];}
  // Open-ended base arms and separated backbone segments, inspired by the reference.
  // The central gap is intentional: no rod, sphere or luminous bridge crosses it.
  const MODEL={rungs:47,spacing:.335,halfGap:.62,backboneGap:.075};
  const mixPoint=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
  function axisFrame(axis){
    const length=Math.hypot(...axis),w=axis.map(v=>v/length);
    let u=Math.abs(w[1])<.9?[-w[2],0,w[0]]:[0,w[2],-w[1]];
    const l=Math.hypot(...u);u=u.map(v=>v/l);
    return {w,u,v:[w[1]*u[2]-w[2]*u[1],w[2]*u[0]-w[0]*u[2],w[0]*u[1]-w[1]*u[0]]};
  }
  function disk(center,normal,radius,material,innerRadius=0){
    const {w,u,v}=axisFrame(normal);
    const rim=(angle,r)=>center.map((c,i)=>c+(u[i]*Math.cos(angle)+v[i]*Math.sin(angle))*r);
    for(let i=0;i<20;i++){
      const a=i/20*Math.PI*2,b=(i+1)/20*Math.PI*2;
      const outerA=rim(a,radius),outerB=rim(b,radius);
      if(innerRadius){
        const innerA=rim(a,innerRadius),innerB=rim(b,innerRadius);
        [outerA,innerA,outerB,outerB,innerA,innerB].forEach(p=>point(p,w,material));
      }else [center,outerA,outerB].forEach(p=>point(p,w,material));
    }
  }
  function backboneTube(start,end,side){
    const stacks=Math.ceil((end-start)/.04),slices=14;
    function vertex(j,i){
      const y=start+(end-start)*j/stacks,theta=y*1.18+side*Math.PI;
      const center=helix(y,side),{u,v}=axisFrame([-Math.sin(theta)*1.4396,1,Math.cos(theta)*1.4396]);
      const angle=i/slices*Math.PI*2,n=u.map((x,k)=>x*Math.cos(angle)+v[k]*Math.sin(angle));
      return [center.map((x,k)=>x+n[k]*.092),n];
    }
    for(let j=0;j<stacks;j++)for(let i=0;i<slices;i++){
      const a=vertex(j,i),b=vertex(j,i+1),c=vertex(j+1,i),d=vertex(j+1,i+1);
      [a,c,b,b,c,d].forEach(x=>point(x[0],x[1],side));
    }
    for(const [y,direction] of [[start,-1],[end,1]]){
      const center=helix(y,side),next=helix(y+.01,side),axis=next.map((x,i)=>(x-center[i])*direction);
      disk(center,axis,.095,3,.052);
      collar(center,axis,.113,.014);
    }
  }
  for(let side=0;side<2;side++)for(let i=0;i<MODEL.rungs-1;i++){
    const y=(i-23)*MODEL.spacing;
    backboneTube(y+MODEL.backboneGap/2,y+MODEL.spacing-MODEL.backboneGap/2,side);
  }
  for(let i=0;i<MODEL.rungs;i++){
    const y=(i-23)*MODEL.spacing;
    for(let side=0;side<2;side++){
      const root=helix(y,side),unit=[root[0]/1.22,0,root[2]/1.22];
      const tip=[unit[0]*MODEL.halfGap,y,unit[2]*MODEL.halfGap];
      const inward=unit.map(v=>-v),shoulder=mixPoint(root,tip,.22),neck=mixPoint(root,tip,.78);
      // A tapered glass sleeve, narrow core, dark socket and recessed terminal lens.
      cylinder(root,shoulder,.087,side,.058);
      cylinder(shoulder,neck,.044,side);
      cylinder(neck,tip,.073,3,.096);
      collar(shoulder,inward,.075,.012);
      collar(mixPoint(neck,tip,.78),inward,.103,.014);
      disk(tip,inward,.096,3,.050);
      // Recess the lens into the socket, away from the open space between the arms.
      const lens=tip.map((v,k)=>v+unit[k]*.014);
      disk(lens,inward,.047,4);
      cylinder(lens,tip,.050,3);
      for(const offset of [-.018,.018]){
        const seam=mixPoint(root,shoulder,.5+offset/.2);
        collar(seam,inward,.083,.006);
      }
    }
  }
  function attribute(name,data,size) {
    const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);
    const index=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(index);
    gl.vertexAttribPointer(index,size,gl.FLOAT,false,0,0);
  }
  attribute('aPosition',positions,3);attribute('aNormal',normals,3);attribute('aMaterial',materials,1);
  const uModel=gl.getUniformLocation(program,'uModel'),uProjection=gl.getUniformLocation(program,'uProjection');
  const uSelectedY=gl.getUniformLocation(program,'uSelectedY'),uFocus=gl.getUniformLocation(program,'uFocus');
  let projection=null,lastModel=null,focus=0,selected=null,lastSelection=null,returnFocus=null,cameraAnchor=[0,0,0],inspectionYaw=0,inspectionTargetYaw=0;
  gl.enable(gl.DEPTH_TEST); gl.clearColor(0,0,0,0);
  function multiply(a,b){const out=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)out[c*4+r]+=a[k*4+r]*b[c*4+k];return out;}
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  let paused=reduced.matches,visible=true,dragging=false,lastX=0,lastY=0,angle=.5,targetAngle=.5,tilt=0,targetTilt=0,pointerX=0,pointerY=0,lastTime=0,frame=0,contextLost=false;
  const features={
    at:{index:'01',y:2.345,point:[0,2.345,0],symbol:'A<span>··</span>T',title:'Adenine meets thymine.',description:'Adenine (A) pairs with thymine (T) through two hydrogen bonds. These complementary bases form one of the rungs joining the two DNA strands. Their sequence, alongside G–C pairs, contributes to the information stored in DNA.',factLabel:'HYDROGEN BONDS',factValue:'2 per A–T pair',role:'Complementary base pairing'},
    gc:{index:'02',y:0,point:[0,0,0],symbol:'G<span>···</span>C',title:'Guanine meets cytosine.',description:'Guanine (G) pairs with cytosine (C) through three hydrogen bonds. Complementary pairing helps each DNA strand act as a template during copying. DNA stability also depends on base stacking, sequence and surrounding conditions.',factLabel:'HYDROGEN BONDS',factValue:'3 per G–C pair',role:'Complementary base pairing'},
    backbone:{index:'03',y:-2.345,point:helix(-2.345,0),symbol:'S<span>—</span>P',title:'The structure behind the code.',description:'Alternating deoxyribose sugars and phosphate groups form the outside of each DNA strand, joined by covalent phosphodiester bonds. Bases attach to the sugars and face inward. The two backbones run in opposite directions: 5′ to 3′ and 3′ to 5′.',factLabel:'COVALENT LINK',factValue:'Phosphodiester bond',role:'Structural support & direction'}
  };
  function inspect(key,custom=null){
    const feature=features[key];
    if(!selected){returnFocus=document.activeElement;cameraAnchor=[...(custom?.point??feature.point)];inspectionYaw=angle;}
    selected={key,y:custom?.y??feature.y,point:custom?.point??feature.point};
    lastSelection=selected;
    inspectionTargetYaw=selected.y*1.18;
    targetAngle=angle;targetTilt=tilt;pointerX=0;pointerY=0;
    hero.classList.add('is-focused');inspector.hidden=false;
    document.getElementById('detail-index').textContent=feature.index+' / 03';
    document.getElementById('detail-symbol').innerHTML=feature.symbol;
    document.getElementById('detail-title').textContent=feature.title;
    document.getElementById('detail-description').textContent=feature.description;
    document.getElementById('detail-fact-label').textContent=feature.factLabel;
    document.getElementById('detail-fact-value').textContent=feature.factValue;
    document.getElementById('detail-role').textContent=feature.role;
    document.querySelectorAll('[data-detail]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.detail===key)));
    document.querySelectorAll('[data-feature]').forEach(b=>b.setAttribute('aria-expanded',String(b.dataset.feature===key)));
    inspector.scrollTop=0;updateToggle();
    document.getElementById('detail-title').focus({preventScroll:true});requestDraw();
  }
  function closeInspector(){
    if(!selected)return;
    selected=null;hero.classList.remove('is-focused');inspector.hidden=true;
    document.querySelectorAll('[data-feature]').forEach(b=>b.setAttribute('aria-expanded','false'));
    updateToggle();(returnFocus&&returnFocus.isConnected?returnFocus:canvas).focus({preventScroll:true});requestDraw();
  }
  document.querySelectorAll('[data-feature]').forEach(b=>b.addEventListener('click',()=>inspect(b.dataset.feature)));
  document.querySelectorAll('[data-detail]').forEach(b=>b.addEventListener('click',()=>inspect(b.dataset.detail)));
  document.getElementById('explorer-back').addEventListener('click',closeInspector);
  document.querySelector('.detail-next').addEventListener('click',closeInspector);
  document.getElementById('solution-explore').addEventListener('click',()=>{
    solutionDialog.close();hero.scrollIntoView({behavior:reduced.matches?'instant':'smooth'});inspect('gc');
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&selected){e.preventDefault();closeInspector();}});
  function project(point,rect=canvas.getBoundingClientRect()){
    if(!lastModel||!projection)return null;
    const p=[...point,1],world=[0,0,0,0],clip=[0,0,0,0];
    for(let r=0;r<4;r++)for(let k=0;k<4;k++)world[r]+=lastModel[k*4+r]*p[k];
    for(let r=0;r<4;r++)for(let k=0;k<4;k++)clip[r]+=projection[k*4+r]*world[k];
    if(clip[3]<=0)return null;
    return {depth:clip[3],x:(clip[0]/clip[3]*.5+.5)*rect.width,y:(.5-clip[1]/clip[3]*.5)*rect.height};
  }
  function positionHotspots(){
    if(selected)return;
    document.querySelectorAll('[data-feature]').forEach(b=>{
      const p=project(features[b.dataset.feature].point);
      if(!p)return;
      b.style.left=p.x+'px';b.style.top=p.y+'px';
      const rect=canvas.getBoundingClientRect();
      b.classList.toggle('positioned',p.x>10&&p.x<rect.width-35&&p.y>25&&p.y<rect.height-25);
    });
  }
  function pick(clientX,clientY){
    if(selected)return;
    const rect=canvas.getBoundingClientRect(),x=clientX-rect.left,y=clientY-rect.top;
    let nearest=null,distance=30;
    for(let i=0;i<47;i++){
      const localY=(i-23)*MODEL.spacing;
      for(let side=0;side<2;side++){
        const root=helix(localY,side),tip=[root[0]/1.22*MODEL.halfGap,localY,root[2]/1.22*MODEL.halfGap];
        const a=project(root),b=project(tip);
        if(!a||!b)continue;
        const dx=b.x-a.x,dy=b.y-a.y,length=dx*dx+dy*dy;
        const t=length?Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/length)):0;
        const d=Math.hypot(x-a.x-t*dx,y-a.y-t*dy);
        if(d<distance){distance=d;nearest={key:i%2===0?'at':'gc',y:localY,point:[0,localY,0]};}
      }
    }
    if(nearest)inspect(nearest.key,nearest);
  }
  function updateToggle(){
    toggle.disabled=!!selected;
    if(selected){toggle.setAttribute('aria-label','Animation paused while inspecting');document.getElementById('motion-icon').textContent='Ⅱ';document.getElementById('motion-text').textContent='Inspecting fragment';return;}

    toggle.setAttribute('aria-pressed',String(paused));
    toggle.setAttribute('aria-label',paused?'Resume DNA animation':'Pause DNA animation');
    document.getElementById('motion-icon').textContent=paused?'▷':'Ⅱ';
    document.getElementById('motion-text').textContent=paused?'Resume motion':'Pause motion';
  }
  updateToggle();toggle.addEventListener('click',()=>{paused=!paused;updateToggle();requestDraw();});
  reduced.addEventListener('change',e=>{paused=e.matches;updateToggle();requestDraw();});
  // Decorative dust shares the model's projection and animation lifecycle.
  // No extra animation loop; it freezes with Pause/reduced motion and when offscreen.
  const particleCanvas=document.createElement('canvas');
  particleCanvas.id='dna-particles';particleCanvas.setAttribute('aria-hidden','true');
  canvas.before(particleCanvas);
  const particleContext=particleCanvas.getContext('2d');
  const particleSprites=[['#f1ffbd','#c6e95c'],['#fff5d1','#cbd66d']].map(colors=>{
    const sprite=document.createElement('canvas');sprite.width=sprite.height=32;
    const c=sprite.getContext('2d'),glow=c.createRadialGradient(16,16,0,16,16,16);
    glow.addColorStop(0,colors[0]);glow.addColorStop(.12,colors[0]);
    glow.addColorStop(.32,colors[1]+'b0');glow.addColorStop(1,colors[1]+'00');
    c.fillStyle=glow;c.fillRect(0,0,32,32);return sprite;
  });
  let particleTime=0,particleSeed=1729;
  function randomParticle(){particleSeed=(particleSeed*1664525+1013904223)>>>0;return particleSeed/4294967296;}
  const particles=Array.from({length:160},()=>({angle:randomParticle()*Math.PI*2,radius:1.85+randomParticle()*2.6,y:randomParticle()*16-8,speed:.065+randomParticle()*.12,size:randomParticle(),phase:randomParticle()*Math.PI*2}));
  function drawParticles(){
    if(!particleContext)return;
    const rect=canvas.getBoundingClientRect(),ratio=canvas.width/rect.width;
    particleContext.setTransform(ratio,0,0,ratio,0,0);
    particleContext.clearRect(0,0,rect.width,rect.height);
    const count=window.innerWidth<701?72:particles.length;
    for(let i=0;i<count;i++){
      const p=particles[i],a=p.angle+particleTime*.025;
      const y=((p.y+particleTime*p.speed+8)%16)-8;
      const projected=project([Math.cos(a)*p.radius,y,Math.sin(a)*p.radius],rect);
      if(!projected||projected.depth<.8)continue;
      const size=Math.min(13,(3.2+p.size*4.5)*12/projected.depth);
      if(projected.x<-size||projected.x>rect.width+size||projected.y<-size||projected.y>rect.height+size)continue;
      const edge=Math.max(0,Math.min(1,(8-Math.abs(y))/1.5));
      particleContext.globalAlpha=(.32+p.size*.42)*edge*(.85+.15*Math.sin(p.phase+particleTime*.7))*(1-focus*.2);
      particleContext.drawImage(particleSprites[i%2],projected.x-size/2,projected.y-size/2,size,size);
    }
    particleContext.globalAlpha=1;
  }
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)requestDraw();});observer.observe(canvas);
  function resize(){
    const r=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,window.innerWidth<701?1.5:1.75);
    const w=Math.round(r.width*dpr),h=Math.round(r.height*dpr);
    if(!w||!h)return;
    canvas.width=w;canvas.height=h;particleCanvas.width=w;particleCanvas.height=h;gl.viewport(0,0,w,h);
    const f=1/Math.tan(43*Math.PI/360),aspect=w/h,near=.1,far=100;
    projection=new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0]);
    gl.uniformMatrix4fv(uProjection,false,projection);
    requestDraw();
  }
  new ResizeObserver(resize).observe(canvas);resize();
  let downX=0,downY=0,travel=0;
  canvas.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse'&&e.button!==0)return;
    downX=e.clientX;downY=e.clientY;travel=0;
    dragging=true;lastX=e.clientX;lastY=e.clientY;canvas.classList.add('dragging');canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove',e=>{
    const r=canvas.getBoundingClientRect();pointerX=(e.clientX-r.left)/r.width-.5;pointerY=(e.clientY-r.top)/r.height-.5;
    if(dragging){travel=Math.max(travel,Math.hypot(e.clientX-downX,e.clientY-downY));if(selected)inspectionTargetYaw+=(e.clientX-lastX)*.009;else targetAngle+=(e.clientX-lastX)*.009;targetTilt=Math.max(-.35,Math.min(.35,targetTilt+(e.clientY-lastY)*.003));lastX=e.clientX;lastY=e.clientY;}
    requestDraw();
  });
  function release(){dragging=false;canvas.classList.remove('dragging');}
  canvas.addEventListener('pointerup',e=>{const clicked=dragging&&travel<7;release();if(clicked)pick(e.clientX,e.clientY);});canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',release);
  canvas.addEventListener('pointerleave',()=>{pointerX=0;pointerY=0;requestDraw();});
  canvas.addEventListener('keydown',e=>{
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key))e.preventDefault();
    if(e.key==='ArrowLeft'){if(selected)inspectionTargetYaw-=.2;else targetAngle-=.2;}if(e.key==='ArrowRight'){if(selected)inspectionTargetYaw+=.2;else targetAngle+=.2;}
    if(e.key==='ArrowUp')targetTilt=Math.max(-.35,targetTilt-.08);if(e.key==='ArrowDown')targetTilt=Math.min(.35,targetTilt+.08);
    if(e.key===' '&&!selected){paused=!paused;updateToggle();}
    if(e.key==='Enter'){e.preventDefault();if(!selected)inspect('gc');}
    requestDraw();
  });
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();contextLost=true;closeInspector();fallback.hidden=false;hotspotLayer.hidden=true;toggle.disabled=true;document.getElementById('solution-explore').hidden=true;cancelAnimationFrame(frame);frame=0;});
  canvas.addEventListener('webglcontextrestored',()=>window.location.reload());
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)requestDraw();});
  function requestDraw(){if(!frame&&!document.hidden&&!contextLost)frame=requestAnimationFrame(draw);}
  function draw(time){
    frame=0;if(contextLost||document.hidden||!visible){lastTime=0;return;}
    const dt=lastTime?Math.min((time-lastTime)/1000,.05):0;lastTime=time;
    if(!paused&&!dragging&&!selected)targetAngle+=dt*.13;
    if(!paused&&!selected&&!reduced.matches)particleTime+=dt;
    const easing=1-Math.exp(-dt*7);angle+=(targetAngle-angle)*easing;tilt+=(targetTilt-tilt)*easing;
    const goal=selected?1:0;
    const flightEase=1-Math.exp(-dt*3.5);
    focus=reduced.matches?goal:focus+(goal-focus)*flightEase;
    if(Math.abs(focus-goal)<.001)focus=goal;
    if(lastSelection){
      cameraAnchor=cameraAnchor.map((v,i)=>reduced.matches?lastSelection.point[i]:v+(lastSelection.point[i]-v)*flightEase);
    }
    const yawDelta=Math.atan2(Math.sin(inspectionTargetYaw-inspectionYaw),Math.cos(inspectionTargetYaw-inspectionYaw));
    inspectionYaw+=reduced.matches?yawDelta:yawDelta*flightEase;
    const y=angle*(1-focus)+inspectionYaw*focus+(!reduced.matches&&!selected?pointerX*.17:0),x=tilt+focus*.16+(!reduced.matches&&!selected?pointerY*.06:0),z=-.43+focus*.68;
    const cy=Math.cos(y),sy=Math.sin(y),cx=Math.cos(x),sx=Math.sin(x),cz=Math.cos(z),sz=Math.sin(z);
    const ry=[cy,0,-sy,0,0,1,0,0,sy,0,cy,0,0,0,0,1];
    const rx=[1,0,0,0,0,cx,sx,0,0,-sx,cx,0,0,0,0,1];
    const rz=[cz,sz,0,0,-sz,cz,0,0,0,0,1,0,0,0,0,1];
    const model=multiply(rz,multiply(rx,ry));
    const mobile=window.innerWidth<701;
    const baseX=mobile?.1:.35,baseZ=mobile?-15.5:-13.9;
    model[12]=baseX;model[13]=-.1;model[14]=baseZ;
    if(lastSelection&&focus>0){
      const p=cameraAnchor;
      const rx=model[0]*p[0]+model[4]*p[1]+model[8]*p[2];
      const ry=model[1]*p[0]+model[5]*p[1]+model[9]*p[2];
      const rz=model[2]*p[0]+model[6]*p[1]+model[10]*p[2];
      model[12]=baseX*(1-focus)-rx*focus;
      model[13]=-.1*(1-focus)-ry*focus;
      model[14]=baseZ*(1-focus)+(-4.9-rz)*focus;
    }
    lastModel=model;
    drawParticles();
    gl.uniform1f(uSelectedY,lastSelection?.y??0);gl.uniform1f(uFocus,focus);
    positionHotspots();
    gl.uniformMatrix4fv(uModel,false,model);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES,0,positions.length/3);
    const movingCamera=(focus>0&&Math.abs(yawDelta)>.0001)||Math.abs(focus-goal)>.0001 || Math.abs(angle-targetAngle)>.0001 || Math.abs(tilt-targetTilt)>.0001 || (lastSelection&&cameraAnchor.some((v,i)=>Math.abs(v-lastSelection.point[i])>.0001));
    if((!paused&&!selected&&!reduced.matches)||dragging||movingCamera)requestDraw();
  }
  requestDraw();
})();
