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
  const canvas = document.getElementById('dna');
  const fallback = document.getElementById('webgl-fallback');
  const toggle = document.getElementById('motion-toggle');
  const gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: false });
  if (!gl) {
    fallback.hidden = false; canvas.hidden = true;
    document.querySelector('.interaction').hidden = true;
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
    void main(){
      vec4 p = uModel * vec4(aPosition,1.0);
      vPosition = p.xyz;
      vNormal = mat3(uModel)*aNormal;
      vMaterial = aMaterial;
      gl_Position = uProjection*p;
    }`;
  const fragment = `
    precision highp float;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying float vMaterial;
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
      color=mix(color,color*vec3(.78,1.0,.52),vMaterial*.2);
      float depth=clamp((vPosition.z+13.0)/8.0,.42,1.0);
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
    fallback.hidden=false; canvas.hidden=true; toggle.disabled=true; return;
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
  function helix(y,side){const angle=y*1.18+side*Math.PI;return [Math.cos(angle)*1.22,y,Math.sin(angle)*1.22];}
  // Continuous tubular backbones, with paired nucleotides and rounded joints.
  for(let side=0;side<2;side++){
    for(let y=-7.8;y<7.8;y+=.075)cylinder(helix(y,side),helix(y+.075,side),.065,side);
  }
  for(let i=0;i<47;i++){
    const y=(i-23)*.335,a=helix(y,0),b=helix(y,1);
    sphere(a,.205,0);sphere(b,.205,1);
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
  gl.enable(gl.DEPTH_TEST); gl.clearColor(0,0,0,0);
  function multiply(a,b){const out=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)out[c*4+r]+=a[k*4+r]*b[c*4+k];return out;}
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  let paused=reduced.matches,visible=true,dragging=false,lastX=0,lastY=0,angle=.5,targetAngle=.5,tilt=0,targetTilt=0,pointerX=0,pointerY=0,lastTime=0,frame=0,contextLost=false;
  function updateToggle(){
    toggle.setAttribute('aria-pressed',String(paused));
    toggle.setAttribute('aria-label',paused?'Resume DNA animation':'Pause DNA animation');
    document.getElementById('motion-icon').textContent=paused?'▷':'Ⅱ';
    document.getElementById('motion-text').textContent=paused?'Resume motion':'Pause motion';
  }
  updateToggle();toggle.addEventListener('click',()=>{paused=!paused;updateToggle();});
  reduced.addEventListener('change',e=>{paused=e.matches;updateToggle();});
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)requestDraw();});observer.observe(canvas);
  function resize(){
    const r=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,1.75);
    const w=Math.round(r.width*dpr),h=Math.round(r.height*dpr);
    if(!w||!h)return;
    canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);
    const f=1/Math.tan(43*Math.PI/360),aspect=w/h,near=.1,far=100;
    gl.uniformMatrix4fv(uProjection,false,new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0]));
  }
  new ResizeObserver(resize).observe(canvas);resize();
  canvas.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse'&&e.button!==0)return;
    dragging=true;lastX=e.clientX;lastY=e.clientY;canvas.classList.add('dragging');canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove',e=>{
    const r=canvas.getBoundingClientRect();pointerX=(e.clientX-r.left)/r.width-.5;pointerY=(e.clientY-r.top)/r.height-.5;
    if(dragging){targetAngle+=(e.clientX-lastX)*.009;targetTilt=Math.max(-.35,Math.min(.35,targetTilt+(e.clientY-lastY)*.003));lastX=e.clientX;lastY=e.clientY;}
  });
  function release(){dragging=false;canvas.classList.remove('dragging');}
  canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',release);
  canvas.addEventListener('pointerleave',()=>{pointerX=0;pointerY=0;});
  canvas.addEventListener('keydown',e=>{
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key))e.preventDefault();
    if(e.key==='ArrowLeft')targetAngle-=.2;if(e.key==='ArrowRight')targetAngle+=.2;
    if(e.key==='ArrowUp')targetTilt=Math.max(-.35,targetTilt-.08);if(e.key==='ArrowDown')targetTilt=Math.min(.35,targetTilt+.08);
    if(e.key===' '){paused=!paused;updateToggle();}
  });
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();contextLost=true;fallback.hidden=false;cancelAnimationFrame(frame);frame=0;});
  canvas.addEventListener('webglcontextrestored',()=>window.location.reload());
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)requestDraw();});
  function requestDraw(){if(!frame&&!document.hidden&&!contextLost)frame=requestAnimationFrame(draw);}
  function draw(time){
    frame=0;if(contextLost||document.hidden||!visible){lastTime=0;return;}
    const dt=lastTime?Math.min((time-lastTime)/1000,.05):0;lastTime=time;
    if(!paused&&!dragging)targetAngle+=dt*.13;
    const easing=1-Math.exp(-dt*7);angle+=(targetAngle-angle)*easing;tilt+=(targetTilt-tilt)*easing;
    const y=angle+(!reduced.matches?pointerX*.17:0),x=tilt+(!reduced.matches?pointerY*.06:0),z=-.43;
    const cy=Math.cos(y),sy=Math.sin(y),cx=Math.cos(x),sx=Math.sin(x),cz=Math.cos(z),sz=Math.sin(z);
    const ry=[cy,0,-sy,0,0,1,0,0,sy,0,cy,0,0,0,0,1];
    const rx=[1,0,0,0,0,cx,sx,0,0,-sx,cx,0,0,0,0,1];
    const rz=[cz,sz,0,0,-sz,cz,0,0,0,0,1,0,0,0,0,1];
    const model=multiply(rz,multiply(rx,ry));
    const mobile=window.innerWidth<701;
    model[12]=mobile?.1:.35;model[13]=mobile?-.1:-.1;model[14]=mobile?-15.5:-13.9;
    gl.uniformMatrix4fv(uModel,false,model);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES,0,positions.length/3);
    requestDraw();
  }
  requestDraw();
})();
