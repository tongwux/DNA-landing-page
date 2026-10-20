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
    void main(){
      vec4 p = uModel * vec4(aPosition,1.0);
      vPosition = p.xyz;
      vNormal = mat3(uModel)*aNormal;
      vMaterial = aMaterial;
      vLocalY = aPosition.y;
      gl_Position = uProjection*p;
    }`;
  const fragment = `
    precision highp float;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying float vMaterial;
    varying float vLocalY;
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
      float collar=step(1.5,vMaterial);
      vec3 collarColor=vec3(.68,.87,.18)*(.7+rim*.8)+vec3(1.0,.98,.56)*spec;
      color=mix(color,collarColor,collar);
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
  function cylinder(a,b,r,m) {
    const delta=b.map((v,i)=>v-a[i]),len=Math.hypot(...delta),w=delta.map(v=>v/len);
    let u=Math.abs(w[1])<.9?[-w[2],0,w[0]]:[0,w[2],-w[1]];
    const ul=Math.hypot(...u);u=u.map(v=>v/ul);
    const v=[w[1]*u[2]-w[2]*u[1],w[2]*u[0]-w[0]*u[2],w[0]*u[1]-w[1]*u[0]];
    function edge(t,c){const n=u.map((x,i)=>x*Math.cos(t)+v[i]*Math.sin(t));return [c.map((x,i)=>x+n[i]*r),n];}
    for(let i=0;i<12;i++){
      const t=i/12*Math.PI*2,t2=(i+1)/12*Math.PI*2;
      const p=edge(t,a),q=edge(t2,a),s=edge(t,b),z=edge(t2,b);
      [p,s,q,q,s,z].forEach(x=>point(x[0],x[1],m));
    }
  }
  function collar(center,axis,radius=.14){
    const length=Math.hypot(...axis),w=axis.map(v=>v/length);
    let u=Math.abs(w[1])<.9?[-w[2],0,w[0]]:[0,w[2],-w[1]];
    const l=Math.hypot(...u);u=u.map(v=>v/l);
    const v=[w[1]*u[2]-w[2]*u[1],w[2]*u[0]-w[0]*u[2],w[0]*u[1]-w[1]*u[0]];
    function vertex(a,b){
      const radial=u.map((x,i)=>x*Math.cos(a)+v[i]*Math.sin(a));
      const n=radial.map((x,i)=>x*Math.cos(b)+w[i]*Math.sin(b));
      return [center.map((x,i)=>x+radial[i]*radius+n[i]*.025),n];
    }
    for(let i=0;i<18;i++)for(let j=0;j<6;j++){
      const a=i/18*Math.PI*2,b=j/6*Math.PI*2,an=(i+1)/18*Math.PI*2,bn=(j+1)/6*Math.PI*2;
      const p=vertex(a,b),q=vertex(an,b),s=vertex(a,bn),t=vertex(an,bn);
      [p,s,q,q,s,t].forEach(x=>point(x[0],x[1],2));
    }
  }
  function helix(y,side){const angle=y*1.18+side*Math.PI;return [Math.cos(angle)*1.22,y,Math.sin(angle)*1.22];}
  // Continuous tubular backbones, with paired nucleotides and rounded joints.
  for(let side=0;side<2;side++){
    for(let y=-7.8;y<7.8;y+=.075)cylinder(helix(y,side),helix(y+.075,side),.092,side);
  }
  for(let i=0;i<47;i++){
    const y=(i-23)*.335,a=helix(y,0),b=helix(y,1);
    sphere(a,.105,0);sphere(b,.105,1);
    for(const [center,side] of [[a,0],[b,1]]){
      const next=helix(y+.02,side),axis=next.map((v,k)=>v-center[k]);
      collar(center,axis);
    }
    const mid=a.map((v,k)=>(v+b[k])/2);
    cylinder(a,mid,.075,i%2);cylinder(mid,b,.075,(i+1)%2);
    sphere(mid,.09,.4);
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
  let projection=null,lastModel=null,focus=0,selected=null,lastSelection=null,returnFocus=null,cameraAnchor=[0,0,0];
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
    if(!selected){returnFocus=document.activeElement;cameraAnchor=[...(custom?.point??feature.point)];}
    selected={key,y:custom?.y??feature.y,point:custom?.point??feature.point};
    lastSelection=selected;
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
  function project(point){
    if(!lastModel||!projection)return null;
    const p=[...point,1],world=[0,0,0,0],clip=[0,0,0,0];
    for(let r=0;r<4;r++)for(let k=0;k<4;k++)world[r]+=lastModel[k*4+r]*p[k];
    for(let r=0;r<4;r++)for(let k=0;k<4;k++)clip[r]+=projection[k*4+r]*world[k];
    if(clip[3]<=0)return null;
    const rect=canvas.getBoundingClientRect();
    return {x:(clip[0]/clip[3]*.5+.5)*rect.width,y:(.5-clip[1]/clip[3]*.5)*rect.height};
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
      const localY=(i-23)*.335,a=project(helix(localY,0)),b=project(helix(localY,1));
      if(!a||!b)continue;
      const dx=b.x-a.x,dy=b.y-a.y,length=dx*dx+dy*dy;
      const t=length?Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/length)):0;
      const d=Math.hypot(x-a.x-t*dx,y-a.y-t*dy);
      if(d<distance){distance=d;nearest={key:i%2===0?'at':'gc',y:localY,point:[0,localY,0]};}
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
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)requestDraw();});observer.observe(canvas);
  function resize(){
    const r=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,window.innerWidth<701?1.5:1.75);
    const w=Math.round(r.width*dpr),h=Math.round(r.height*dpr);
    if(!w||!h)return;
    canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);
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
    if(dragging){travel=Math.max(travel,Math.hypot(e.clientX-downX,e.clientY-downY));targetAngle+=(e.clientX-lastX)*.009;targetTilt=Math.max(-.35,Math.min(.35,targetTilt+(e.clientY-lastY)*.003));lastX=e.clientX;lastY=e.clientY;}
    requestDraw();
  });
  function release(){dragging=false;canvas.classList.remove('dragging');}
  canvas.addEventListener('pointerup',e=>{const clicked=dragging&&travel<7;release();if(clicked)pick(e.clientX,e.clientY);});canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',release);
  canvas.addEventListener('pointerleave',()=>{pointerX=0;pointerY=0;requestDraw();});
  canvas.addEventListener('keydown',e=>{
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key))e.preventDefault();
    if(e.key==='ArrowLeft')targetAngle-=.2;if(e.key==='ArrowRight')targetAngle+=.2;
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
    const easing=1-Math.exp(-dt*7);angle+=(targetAngle-angle)*easing;tilt+=(targetTilt-tilt)*easing;
    const goal=selected?1:0;
    const flightEase=1-Math.exp(-dt*3.5);
    focus=reduced.matches?goal:focus+(goal-focus)*flightEase;
    if(Math.abs(focus-goal)<.001)focus=goal;
    if(lastSelection){
      cameraAnchor=cameraAnchor.map((v,i)=>reduced.matches?lastSelection.point[i]:v+(lastSelection.point[i]-v)*flightEase);
    }
    const y=angle+focus*.65+(!reduced.matches&&!selected?pointerX*.17:0),x=tilt+focus*.16+(!reduced.matches&&!selected?pointerY*.06:0),z=-.43+focus*.68;
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
    gl.uniform1f(uSelectedY,lastSelection?.y??0);gl.uniform1f(uFocus,focus);
    positionHotspots();
    gl.uniformMatrix4fv(uModel,false,model);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES,0,positions.length/3);
    const movingCamera=Math.abs(focus-goal)>.0001 || Math.abs(angle-targetAngle)>.0001 || Math.abs(tilt-targetTilt)>.0001 || (lastSelection&&cameraAnchor.some((v,i)=>Math.abs(v-lastSelection.point[i])>.0001));
    if((!paused&&!selected&&!reduced.matches)||dragging||movingCamera)requestDraw();
  }
  requestDraw();
})();
