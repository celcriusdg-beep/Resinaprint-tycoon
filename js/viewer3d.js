/* 3D viewer: mini WebGL engine, figure/printer builders and the 3D modal. */
/* ---------- 3D viewer (own mini WebGL engine, no libraries) ---------- */
const V3={
  id:()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),
  mul(a,b){const o=new Float32Array(16);for(let i=0;i<4;i++)for(let j=0;j<4;j++){let s=0;for(let k=0;k<4;k++)s+=a[k*4+j]*b[i*4+k];o[i*4+j]=s}return o},
  T:(x,y,z)=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,x,y,z,1]),
  S:(x,y=x,z=x)=>new Float32Array([x,0,0,0,0,y,0,0,0,0,z,0,0,0,0,1]),
  RX:a=>{const c=Math.cos(a),s=Math.sin(a);return new Float32Array([1,0,0,0,0,c,s,0,0,-s,c,0,0,0,0,1])},
  RY:a=>{const c=Math.cos(a),s=Math.sin(a);return new Float32Array([c,0,-s,0,0,1,0,0,s,0,c,0,0,0,0,1])},
  RZ:a=>{const c=Math.cos(a),s=Math.sin(a);return new Float32Array([c,s,0,0,-s,c,0,0,0,0,1,0,0,0,0,1])},
  persp(f,asp,n,fa){const t=1/Math.tan(f/2),o=new Float32Array(16);o[0]=t/asp;o[5]=t;o[10]=(fa+n)/(n-fa);o[11]=-1;o[14]=2*fa*n/(n-fa);return o},
  look(e,c){let z=[e[0]-c[0],e[1]-c[1],e[2]-c[2]];const zl=Math.hypot(...z);z=z.map(v=>v/zl);let x=[z[2],0,-z[0]];const xl=Math.hypot(...x)||1;x=x.map(v=>v/xl);const y=[z[1]*x[2]-z[2]*x[1],z[2]*x[0]-z[0]*x[2],z[0]*x[1]-z[1]*x[0]];
    return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-(x[0]*e[0]+x[1]*e[1]+x[2]*e[2]),-(y[0]*e[0]+y[1]*e[1]+y[2]*e[2]),-(z[0]*e[0]+z[1]*e[1]+z[2]*e[2]),1])},
  ap(m,p){return[m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]]}
};
const rgb=h=>{if(Array.isArray(h))return h;h=String(h).replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');return[parseInt(h.slice(0,2),16)/255,parseInt(h.slice(2,4),16)/255,parseInt(h.slice(4,6),16)/255]};
const mixc=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
function Scene3(){
  const bs={},st=[V3.id()];let pts=[];
  const cur=()=>st[st.length-1];
  const S={
    push(m){st.push(V3.mul(cur(),m))},pop(){st.pop()},
    batch(o){o=o||{};const k=`${o.alpha||1}|${o.add?1:0}|${o.em||0}|${o.anim||0}|${o.unlit?1:0}`;return bs[k]||(bs[k]={p:[],n:[],c:[],i:[],alpha:o.alpha||1,add:!!o.add,em:o.em||0,anim:o.anim||0,unlit:!!o.unlit})},
    grid(fn,nu,nv,col,o){o=o||{};const b=S.batch(o),m=cur(),cols=o.wrap?nu:nu+1,base=b.p.length/3;
      for(let i=0;i<cols;i++)for(let j=0;j<=nv;j++){const u=i/nu,v=j/nv,p=V3.ap(m,fn(u,v));b.p.push(p[0],p[1],p[2]);const c=typeof col==='function'?col(u,v):col;b.c.push(c[0],c[1],c[2])}
      for(let i=0;i<nu;i++){const i2=o.wrap?(i+1)%nu:i+1;for(let j=0;j<nv;j++){const a=base+i*(nv+1)+j,bb=base+i2*(nv+1)+j,c=a+1,d=bb+1;b.i.push(a,bb,c,bb,d,c)}}},
    sph(cx,cy,cz,rx,ry,rz,col,o){o=o||{};const t0=o.t0||0,t1=o.t1===undefined?Math.PI:o.t1,p0=o.p0||0,p1=o.p1===undefined?Math.PI*2:o.p1;
      if(o.xf)S.push(o.xf);
      S.grid((u,v)=>{const th=t0+(t1-t0)*v,ph=p0+(p1-p0)*u;return[cx+rx*Math.sin(th)*Math.cos(ph),cy+ry*Math.cos(th),cz+rz*Math.sin(th)*Math.sin(ph)]},o.nu||18,o.nv||12,col,Object.assign({wrap:(p1-p0)>=Math.PI*2-1e-6},o));
      if(o.xf)S.pop()},
    lathe(prof,col,o){o=o||{};if(o.xf)S.push(o.xf);const n=prof.length-1;
      S.grid((u,v)=>{const q=prof[Math.min(n,Math.round(v*n))],a=u*Math.PI*2;return[q[0]*Math.cos(a),q[1],q[0]*Math.sin(a)]},o.nu||20,n,col,Object.assign({wrap:true},o));if(o.xf)S.pop()},
    cyl(r0,r1,h,col,o){S.lathe([[0,0],[r0,0],[r1,h],[0,h]],col,o)},
    torus(R,r,col,o){o=o||{};if(o.xf)S.push(o.xf);S.grid((u,v)=>{const a=u*Math.PI*2,b=v*Math.PI*2;return[(R+r*Math.cos(b))*Math.cos(a),r*Math.sin(b),(R+r*Math.cos(b))*Math.sin(a)]},o.nu||36,o.nv||8,col,Object.assign({wrap:true},o));if(o.xf)S.pop()},
    box(w,h,d,col,o){o=o||{};if(o.xf)S.push(o.xf);const x=w/2,y=h/2,z=d/2;
      const F=[[[-x,-y,z],[x,-y,z],[-x,y,z]],[[x,-y,-z],[-x,-y,-z],[x,y,-z]],[[-x,-y,-z],[-x,-y,z],[-x,y,-z]],[[x,-y,z],[x,-y,-z],[x,y,z]],[[-x,y,z],[x,y,z],[-x,y,-z]],[[-x,-y,-z],[x,-y,-z],[-x,-y,z]]];
      for(const [a,b,c] of F)S.grid((u,v)=>[a[0]+(b[0]-a[0])*u+(c[0]-a[0])*v,a[1]+(b[1]-a[1])*u+(c[1]-a[1])*v,a[2]+(b[2]-a[2])*u+(c[2]-a[2])*v],1,1,col,o);
      if(o.xf)S.pop()},
    curve(P,t){const n=P.length-1,f=Math.min(n-.0001,Math.max(0,t*n)),i=Math.floor(f),u=f-i,p0=P[Math.max(0,i-1)],p1=P[i],p2=P[i+1],p3=P[Math.min(n,i+2)];
      return[0,1,2].map(k=>.5*((2*p1[k])+(-p0[k]+p2[k])*u+(2*p0[k]-5*p1[k]+4*p2[k]-p3[k])*u*u+(-p0[k]+3*p1[k]-3*p2[k]+p3[k])*u*u*u))},
    lock(P,r0,r1,cA,cB,n,o){let len=0,pp=S.curve(P,0);for(let i=1;i<=24;i++){const q=S.curve(P,i/24);len+=Math.hypot(q[0]-pp[0],q[1]-pp[1],q[2]-pp[2]);pp=q}
      n=Math.min(46,Math.max(8,Math.ceil(len/(Math.min(r0,Math.max(r1,r0*.5))*.5))));
      for(let i=0;i<n;i++){const t=i/(n-1),p=S.curve(P,t),r=r0+(r1-r0)*t;S.sph(p[0],p[1],p[2],r,r*1.1,r,mixc(cA,cB,Math.pow(t,1.4)),Object.assign({nu:9,nv:6},o))}},
    particles(n,R,H,col){pts={n,R,H,col,d:[]};for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,r=R*(.35+.65*Math.sqrt(Math.random()));pts.d.push(Math.cos(a)*r,Math.random()*H,Math.sin(a)*r,Math.random())}},
    done(){
      let mn=[1e9,1e9,1e9],mx=[-1e9,-1e9,-1e9];
      for(const k in bs){const b=bs[k],nn=new Float32Array(b.p.length);for(let i=0;i<b.i.length;i+=3){const a=b.i[i],bb=b.i[i+1],c=b.i[i+2];
        const ux=b.p[bb*3]-b.p[a*3],uy=b.p[bb*3+1]-b.p[a*3+1],uz=b.p[bb*3+2]-b.p[a*3+2],vx=b.p[c*3]-b.p[a*3],vy=b.p[c*3+1]-b.p[a*3+1],vz=b.p[c*3+2]-b.p[a*3+2];
        const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;for(const q of [a,bb,c]){nn[q*3]+=nx;nn[q*3+1]+=ny;nn[q*3+2]+=nz}}
        for(let i=0;i<nn.length;i+=3){const l=Math.hypot(nn[i],nn[i+1],nn[i+2])||1;nn[i]/=l;nn[i+1]/=l;nn[i+2]/=l}b.n=nn;
        if(!b.add)for(let i=0;i<b.p.length;i+=3)for(let k2=0;k2<3;k2++){mn[k2]=Math.min(mn[k2],b.p[i+k2]);mx[k2]=Math.max(mx[k2],b.p[i+k2])}}
      return{batches:Object.values(bs),pts,min:mn,max:mx}}
  };
  return S;
}
const VS3=`attribute vec3 aP;attribute vec3 aN;attribute vec3 aC;uniform mat4 uVP;uniform mat4 uM;uniform vec3 uOff;varying vec3 vN;varying vec3 vC;varying vec3 vW;
void main(){vec4 w=uM*vec4(aP+uOff,1.);vW=w.xyz;vN=mat3(uM)*aN;vC=aC;gl_Position=uVP*w;}`;
const FS3=`precision mediump float;varying vec3 vN;varying vec3 vC;varying vec3 vW;uniform vec3 uCam;uniform float uAlpha;uniform float uEm;uniform float uUnlit;uniform vec3 uRim;uniform vec3 uGlow;uniform float uPulse;
float band(float x){return smoothstep(.12,.22,x)*.5+smoothstep(.5,.6,x)*.5;}
void main(){
  if(uUnlit>.5){gl_FragColor=vec4(vC*(uEm+uPulse*.5),uAlpha);return;}
  vec3 N=normalize(vN);vec3 V=normalize(uCam-vW);if(dot(N,V)<0.)N=-N;
  float d1=max(dot(N,normalize(vec3(.45,.8,.7))),0.);float d2=max(dot(N,normalize(vec3(-.8,.25,.45))),0.);
  float rim=pow(1.-max(dot(N,V),0.),2.6);float up=max(-N.y,0.);
  vec3 col=vC*(.38+.6*band(d1)+.2*band(d2))+rim*uRim*.5+up*uGlow*.35+vC*uEm*(1.+uPulse);
  gl_FragColor=vec4(col,uAlpha);}`;
const VSP=`attribute vec4 aQ;uniform mat4 uVP;uniform mat4 uM;uniform float uT;uniform float uH;uniform float uSz;void main(){vec3 p=aQ.xyz;p.y=mod(p.y+uT*(.18+aQ.w*.25),uH);p.x+=sin(uT*.8+aQ.w*20.)*.06;vec4 c=uVP*uM*vec4(p,1.);gl_Position=c;gl_PointSize=uSz*(.5+aQ.w)/c.w;}`;
const FSP=`precision mediump float;uniform vec3 uCol;void main(){vec2 d=gl_PointCoord-.5;float a=smoothstep(.5,.0,length(d));gl_FragColor=vec4(uCol*a,a);}`;
function startViewer(cv,sc,opt){
  const gl=cv.getContext('webgl',{antialias:true,alpha:true,premultipliedAlpha:false});if(!gl)return false;
  const sh=(t,s)=>{const o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(o));return o};
  const prog=(v,f)=>{const p=gl.createProgram();gl.attachShader(p,sh(gl.VERTEX_SHADER,v));gl.attachShader(p,sh(gl.FRAGMENT_SHADER,f));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));return p};
  const P=prog(VS3,FS3),PP=prog(VSP,FSP);
  const buf=(arr,type=gl.ARRAY_BUFFER,C=Float32Array)=>{const b=gl.createBuffer();gl.bindBuffer(type,b);gl.bufferData(type,new C(arr),gl.STATIC_DRAW);return b};
  const u32=gl.getExtension('OES_element_index_uint'),IT=u32?Uint32Array:Uint16Array,IG=u32?gl.UNSIGNED_INT:gl.UNSIGNED_SHORT;
  const items=sc.batches.map(b=>({b,p:buf(b.p),n:buf(b.n),c:buf(b.c),i:buf(b.i,gl.ELEMENT_ARRAY_BUFFER,IT),cnt:b.i.length}));
  const pb=sc.pts&&sc.pts.n?buf(sc.pts.d):null;
  const U=(p,n)=>gl.getUniformLocation(p,n),A=(p,n)=>gl.getAttribLocation(p,n);
  const ctr=[(sc.min[0]+sc.max[0])/2,(sc.min[1]+sc.max[1])/2,(sc.min[2]+sc.max[2])/2],rad=Math.hypot(sc.max[0]-sc.min[0],sc.max[1]-sc.min[1],sc.max[2]-sc.min[2])/2;
  let ry=0.6,rp=.2,drag=false,lx=0,ly=0,auto=true,t0=performance.now(),alive=true,idle=0;
  cv.style.touchAction='none';
  cv.addEventListener('pointerdown',e=>{drag=true;auto=false;lx=e.clientX;ly=e.clientY;try{cv.setPointerCapture(e.pointerId)}catch(_){}});
  cv.addEventListener('pointermove',e=>{if(!drag)return;ry+=(e.clientX-lx)*.012;rp=Math.max(-.2,Math.min(.9,rp+(e.clientY-ly)*.006));lx=e.clientX;ly=e.clientY});
  const up=()=>{drag=false;idle=performance.now()};cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
  const accent=rgb(opt.accent||'#ffb547');
  function frame(){
    if(!alive||!cv.isConnected){alive=false;return}
    const t=(performance.now()-t0)/1000;if(!drag&&!auto&&performance.now()-idle>2500)auto=true;if(auto)ry+=.008;
    const dpr=Math.min(window.devicePixelRatio||1,2),w=Math.max(10,Math.round(cv.clientWidth*dpr)),h=Math.max(10,Math.round(cv.clientHeight*dpr));
    if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h}
    gl.viewport(0,0,w,h);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);
    const dist=rad*2.45,eye=[0,ctr[1]+dist*Math.sin(rp)+rad*.15,dist*Math.cos(rp)];
    const VP=V3.mul(V3.persp(.7,w/h,.1,100),V3.look(eye,[0,ctr[1],0])),M=V3.mul(V3.T(0,0,0),V3.RY(ry));
    gl.useProgram(P);
    const l={vp:U(P,'uVP'),m:U(P,'uM'),off:U(P,'uOff'),cam:U(P,'uCam'),al:U(P,'uAlpha'),em:U(P,'uEm'),un:U(P,'uUnlit'),rim:U(P,'uRim'),gl:U(P,'uGlow'),pu:U(P,'uPulse')};
    gl.uniformMatrix4fv(l.vp,false,VP);gl.uniformMatrix4fv(l.m,false,M);gl.uniform3fv(l.cam,eye);gl.uniform3fv(l.rim,accent);gl.uniform3fv(l.gl,accent);
    const pulse=.5+.5*Math.sin(t*3);
    const order=[...items].sort((a,b)=>(a.b.add-b.b.add)||((a.b.alpha<1)-(b.b.alpha<1)));
    for(const it of order){const b=it.b;
      gl.depthMask(!(b.add||b.alpha<1));
      if(b.add){gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE)}else if(b.alpha<1){gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA)}else gl.disable(gl.BLEND);
      gl.uniform1f(l.al,b.alpha);gl.uniform1f(l.em,b.em);gl.uniform1f(l.un,b.unlit?1:0);
      gl.uniform1f(l.pu,b.anim===2?pulse*.8:0);
      gl.uniform3fv(l.off,b.anim===1?[0,.05+.12*(.5+.5*Math.sin(t*1.4)),0]:[0,0,0]);
      for(const [nm,bf,sz] of [['aP',it.p,3],['aN',it.n,3],['aC',it.c,3]]){const a=A(P,nm);gl.bindBuffer(gl.ARRAY_BUFFER,bf);gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,sz,gl.FLOAT,false,0,0)}
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,it.i);gl.drawElements(gl.TRIANGLES,it.cnt,IG,0)}
    if(pb){gl.useProgram(PP);gl.depthMask(false);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
      gl.uniformMatrix4fv(U(PP,'uVP'),false,VP);gl.uniformMatrix4fv(U(PP,'uM'),false,M);gl.uniform1f(U(PP,'uT'),t);gl.uniform1f(U(PP,'uH'),sc.pts.H);gl.uniform1f(U(PP,'uSz'),26*dpr);gl.uniform3fv(U(PP,'uCol'),rgb(sc.pts.col));
      const a=A(PP,'aQ');gl.bindBuffer(gl.ARRAY_BUFFER,pb);gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,4,gl.FLOAT,false,0,0);gl.drawArrays(gl.POINTS,0,sc.pts.n);gl.disableVertexAttribArray(a)}
    requestAnimationFrame(frame)}
  frame();
  return{stop(){alive=false}};
}
/* ---- builders ---- */
const BUSTS=['bust','lux','yasuo','jinhsib'];
function buildFigure3(k){
  const o=FLOOK[k]||FLOOK.desk,S=Scene3(),G=!!o.grey;
  const skin=rgb(G?'#dcdfe4':'#f6d9c2'),skinS=rgb(G?'#c3c7ce':'#eebfa3'),hair=rgb(o.hair),tip=rgb(o.tip||o.hair),out=rgb(o.out),out2=rgb(o.out2||o.out),acc=rgb(o.acc),eye=rgb(o.eye),ink=rgb('#23242c'),white=rgb('#fbfbfd');
  const bust=BUSTS.includes(k),chibi=k==='chibi',deck=k==='deckbox',big=k==='statue'||k==='kaisa';
  const ring=rgb(G?'#cfd3da':(o.acc==='#fff'||o.acc==='#ffffff'?'#c9b8ff':o.acc));
  if(big)S.push(V3.S(1.15));
  /* base */
  S.cyl(1.25,1.25,.16,rgb(G?'#9aa0aa':'#15161d'));S.torus(1.2,.025,ring,{b:{},unlit:true,em:1.3,anim:2,add:true,xf:V3.T(0,.17,0)});
  S.torus(.92,.014,ring,{unlit:true,em:.8,add:true,xf:V3.T(0,.17,0)});
  if(!bust&&!chibi&&!deck){S.sph(0,.2,0,.95,.28,.9,rgb(G?'#a9aeb7':'#4a5160'),{t1:Math.PI*.55,nu:14,nv:6});S.sph(.25,.28,.2,.55,.2,.5,rgb(G?'#bcc1c9':'#5d6678'),{t1:Math.PI*.6,nu:12,nv:5})}
  if(k==='chibi'||bust){}
  if(o.tree&&!bust&&!chibi&&!deck){
    const tc=rgb(o.tree),trunk=rgb(G?'#9a9ea6':'#5a3a2e'),P=[[.95,.2,-.55],[.9,1.0,-.6],[1.0,1.8,-.5],[.85,2.6,-.5],[.95,3.1,-.45]];
    S.lock(P,.11,.05,trunk,trunk,14);
    for(const [x,y,z,r] of [[.9,3.2,-.45,.7],[1.5,2.55,-.5,.55],[.35,2.5,-.55,.5],[1.25,1.75,-.55,.45]]){S.sph(x,y,z,r,r*.28,r*.9,tc,{nu:16,nv:8});S.sph(x-.08,y+.07,z,r*.7,r*.2,r*.6,mixc(tc,[1,1,1],.25),{nu:12,nv:6})}
  }
  const feet=.34;
  if(!bust&&!deck){
    S.push(V3.T(0,0,0)); if(chibi)S.push(V3.mul(V3.T(0,.22,0),V3.S(.5)));
    /* legs */
    for(const sx of [-1,1]){S.cyl(.075,.09,.85,skin,{xf:V3.T(sx*.13,feet+.05,0)});S.sph(sx*.13,feet+.02,.06,.1,.06,.17,rgb(G?'#b6bbc3':'#2a2c35'),{nu:10,nv:6})}
    /* dress */
    const dress=[[.15,1.62],[.2,1.5],[.3,1.25],[.44,.95],[.6,.7],[.7,.5]];
    S.lathe(dress,out,{nu:28});
    S.lathe([[.5,.62],[.71,.5],[.72,.45],[.55,.55]],acc,{nu:28});
    S.torus(.7,.022,acc,{xf:V3.T(0,.49,0)});
    /* front panel */
    S.sph(0,.95,.22,.2,.65,.34,out2,{t1:Math.PI,p0:Math.PI*.1,p1:Math.PI*.9,nu:10,nv:10,xf:V3.RX(.12)});
    /* torso */
    S.cyl(.17,.21,.62,out,{xf:V3.T(0,1.52,0),nu:18});S.torus(.19,.035,acc,{xf:V3.T(0,1.56,0)});
    S.sph(0,1.98,.04,.22,.09,.17,out2,{nu:14,nv:6,t1:Math.PI*.55});
    S.cyl(.055,.055,.14,skin,{xf:V3.T(0,2.06,0)});
    /* arms */
    S.push(V3.mul(V3.T(-.25,2.02,0),V3.RZ(.22)));S.cyl(.05,.045,.62,skin,{xf:V3.T(0,-.6,0)});S.cyl(.12,.17,.5,out,{xf:V3.T(0,-.55,0),nu:14});S.sph(0,-.68,0,.05,.05,.05,skin);S.pop();
    const sw=o.wp;
    if(sw){S.push(V3.mul(V3.T(.25,2.02,0),V3.RZ(-.5)));S.cyl(.05,.045,.62,skin,{xf:V3.T(0,-.6,0)});S.cyl(.12,.17,.5,out,{xf:V3.T(0,-.55,0),nu:14});S.pop();
      const hx=.25+Math.sin(.5)*.62,hy=2.02-Math.cos(.5)*.62;S.sph(hx,hy,.05,.055,.055,.055,skin);
      if(sw==='sword'){S.box(.05,1.6,.015,rgb('#e4eaf2'),{xf:V3.T(hx,hy+.45,.06)});S.box(.3,.04,.05,acc,{xf:V3.T(hx,hy-.2,.06)});S.cyl(.03,.03,.3,rgb('#2b2f38'),{xf:V3.T(hx,hy-.45,.06)})}
      else{S.cyl(.022,.022,2.5,rgb('#8d6a3c'),{xf:V3.T(hx,hy-.5,.06),nu:8});S.sph(hx,hy+2.2,.06,.13,.13,.13,acc,{unlit:true,em:1.2,add:false,anim:2});S.torus(.16,.015,acc,{xf:V3.mul(V3.T(hx,hy+2.2,.06),V3.RX(1.2)),unlit:true,em:1})}}
    else{S.push(V3.mul(V3.T(.25,2.02,0),V3.RZ(-.28)));S.cyl(.05,.045,.62,skin,{xf:V3.T(0,-.6,0)});S.cyl(.12,.17,.5,out,{xf:V3.T(0,-.55,0),nu:14});S.sph(0,-.68,0,.05,.05,.05,skin);S.pop()}
    /* ribbon */
    S.lock([[.2,1.5,.05],[.55,1.2,.1],[.75,.9,.05],[.7,.6,.1]],.035,.015,acc,acc,10);
  }
  if(bust){
    S.cyl(1.0,1.15,.18,rgb('#15161d'),{xf:V3.T(0,.17,0)});
    S.lathe([[.1,1.5],[.2,1.4],[.5,1.27],[.78,1.05],[.84,.75],[.8,.36]],out,{nu:30,xf:V3.mul(V3.T(0,.17,0),V3.S(1.05,1,.62))});
    S.lathe([[.84,.75],[.8,.36],[.78,.34],[.82,.75]],acc,{nu:30,xf:V3.mul(V3.T(0,.17,0),V3.S(1.05,1,.62))});
    S.cyl(.075,.075,.34,skin,{xf:V3.T(0,1.6,0)});S.torus(.2,.03,acc,{xf:V3.mul(V3.T(0,1.62,0),V3.S(1,1,1))});
  }
  if(deck){S.push(V3.T(0,1.15,0));
    S.box(1.5,1.9,.7,rgb('#5646b0'));S.box(1.5,.35,.7,rgb('#6d5acf'),{xf:V3.T(0,1.05,0)});S.box(1.15,1.3,.04,rgb('#241c4a'),{xf:V3.T(0,-.1,.36)});
    S.box(.9,.06,.05,acc,{xf:V3.T(0,.4,.38),unlit:true,em:1,anim:2});S.box(.5,.5,.03,out,{xf:V3.T(0,-.15,.39),unlit:true,em:.8,anim:2});
    S.push(V3.T(0,-.12,.4));S.sph(0,0,0,.2,.24,.06,skin,{nu:12,nv:8});S.sph(0,.06,-.01,.22,.22,.06,hair,{t1:Math.PI*.6,nu:12,nv:6});S.pop();S.pop();
  }
  /* head */
  if(!deck){
    const hy=bust?1.98:2.34,hs=chibi?2.4:(bust?1.35:1);
    S.push(V3.mul(V3.T(0,chibi?1.9:hy,0),V3.S(hs)));
    const R=.27;
    S.sph(0,0,0,R*.93,R,R*.97,skin,{nu:22,nv:16});
    // chin shading
    S.sph(0,-.12,.02,R*.8,R*.55,R*.8,skinS,{t1:Math.PI*.55,nu:14,nv:6,xf:V3.RX(Math.PI)});
    for(const sx of [-1,1]){const ex=sx*.105,ey=-.015,ez=Math.sqrt(R*R-ex*ex-ey*ey)*.985;
      S.sph(ex,ey,ez,.075,.095,.02,white,{nu:12,nv:8});S.sph(ex,ey-.005,ez+.012,.052,.082,.018,eye,{nu:12,nv:8});S.sph(ex,ey-.01,ez+.022,.026,.05,.012,ink,{nu:10,nv:6});S.sph(ex+.018,ey+.035,ez+.03,.012,.012,.008,white,{nu:8,nv:5,unlit:true,em:1.2});
      S.box(.1,.014,.01,hair,{xf:V3.mul(V3.T(ex,ey+.115,ez-.005),V3.RZ(sx*.18))});
      S.sph(sx*.17,-.085,Math.sqrt(R*R-.17*.17-.085*.085)*.97,.045,.025,.01,rgb('#f2a0a0'),{nu:8,nv:5,alpha:.7})}
    S.sph(0,-.13,Math.sqrt(R*R-.13*.13)*.985,.03,.014,.01,rgb('#c9605c'),{nu:8,nv:5});
    S.sph(0,-.055,R*.98,.014,.02,.012,skinS,{nu:6,nv:5});
    // hair
    S.sph(0,.015,-.01,R*1.1,R*1.1,R*1.08,hair,{t1:1.42,nu:26,nv:12});
    S.sph(0,-.02,-.05,R*1.1,R*1.28,R*1.1,mixc(hair,tip,.3),{t0:.5,t1:2.15,p0:Math.PI,p1:Math.PI*2,nu:20,nv:10});
    // bangs
    for(const bx of [-.19,-.1,0,.1,.19])S.sph(bx,.14-Math.abs(bx)*.25,R*.8,.07,.12,.05,hair,{nu:8,nv:6,xf:V3.T(0,0,0)});
    for(const sx of [-1,1])S.lock([[sx*.26,.08,.03],[sx*.28,-.08,.04],[sx*.26,-.22,.03]],.05,.03,hair,tip,6);
    const st=o.st;
    if(st==='long'){S.lock([[0,.2,-.2],[-.06,-.3,-.3],[-.12,-.95,-.32],[-.26,-1.5,-.2]],.17,.05,hair,tip,16);S.lock([[.08,.2,-.2],[.16,-.35,-.28],[.22,-.95,-.26],[.3,-1.4,-.15]],.15,.05,hair,tip,14);
      for(const sx of [-1,1])S.lock([[sx*.27,.0,.05],[sx*.34,-.35,.08],[sx*.32,-.8,.12],[sx*.4,-1.15,.14]],.065,.03,hair,tip,12)}
    else if(st==='twin'){for(const sx of [-1,1])S.lock([[sx*.28,.12,-.02],[sx*.55,-.1,-.05],[sx*.75,-.6,0],[sx*.8,-1.2,.05],[sx*.7,-1.65,.1]],.1,.03,hair,tip,16)}
    else if(st==='pony'){S.lock([[0,.22,-.2],[0,.45,-.45],[.05,.1,-.75],[.1,-.5,-.75],[.08,-1.0,-.6]],.12,.03,hair,tip,16);S.sph(0,.2,-.2,.05,.05,.05,acc,{nu:8,nv:6})}
    else S.sph(0,-.1,-.04,R*1.12,R*.95,R*1.1,hair,{t0:.9,t1:2.1,nu:22,nv:8});
    // ornaments
    for(const sx of [-1,1])S.sph(sx*.24,.2,.05,.035,.035,.035,acc,{nu:8,nv:6,unlit:true,em:.9});
    S.pop();
  }
  if(chibi){S.torus(.2,.03,rgb('#aab1bb'),{xf:V3.mul(V3.T(0,2.95,0),V3.RX(Math.PI/2))});S.torus(.13,.025,rgb('#aab1bb'),{xf:V3.mul(V3.T(0,3.2,0),V3.RX(Math.PI/2))})}
  S.particles(80,1.5,3.4,o.acc==='#fff'||o.acc==='#ffffff'?'#c9b8ff':o.acc);
  if(big)S.pop();
  return S.done();
}
function buildPrinter3(k){
  const L=PLOOK[k]||PLOOK.mars,S=Scene3(),w=(L.w||40)/12,b=rgb(L.b),h=rgb(L.h),a=rgb(L.a),dark=rgb('#14151a'),metal=rgb('#aab1bb');
  const glowCol=rgb('#b58cff');
  S.cyl(w*.75,w*.78,.1,rgb('#15161d'),{xf:V3.T(0,0,0)});
  const kind=L.k,y0=.1;
  if(kind==='vat'){
    const bh=1.05,d=w*.85,H=L.t/11;
    S.box(w,bh,d,b,{xf:V3.T(0,y0+bh/2,0)});S.box(w*.98,.06,d*.98,a,{xf:V3.T(0,y0+.05,0),unlit:true,em:.9,anim:2});
    S.box(w*.55,.34,.04,dark,{xf:V3.T(-w*.12,y0+bh*.55,d/2+.01)});S.box(w*.48,.26,.03,rgb('#6aa7ff'),{xf:V3.T(-w*.12,y0+bh*.55,d/2+.03),unlit:true,em:.9,anim:2});
    S.box(.18,.18,.04,a,{xf:V3.T(w*.32,y0+bh*.55,d/2+.02),unlit:true,em:.8});
    S.box(w*.82,.1,d*.74,rgb('#e8e8ea'),{xf:V3.T(0,y0+bh+.05,0)});
    S.cyl(w*.3,w*.3,.12,rgb('#ffb347'),{xf:V3.T(0,y0+bh+.1,0),unlit:true,em:.55,anim:2});
    S.box(w*.5,.07,d*.4,rgb('#cfd3d8'),{xf:V3.T(0,y0+bh+.75,0),anim:1});S.box(.12,.9,.12,metal,{xf:V3.T(0,y0+bh+1.3,-d*.3)});
    S.box(w*.92,H,d*.92,h,{xf:V3.T(0,y0+bh+H/2+.1,0),alpha:.5});
    S.box(w*.96,.06,d*.96,rgb('#d9801f'),{xf:V3.T(0,y0+bh+H+.12,0)});
  }else if(kind==='sl1'){
    const d=w*.8||2.6;S.box(3.4,1.0,3.0,b,{xf:V3.T(0,y0+.5,0)});S.box(3.0,2.4,2.6,rgb('#1f2227'),{xf:V3.T(0,y0+2.2,0)});S.box(2.7,2.1,.05,rgb('#f08a24'),{xf:V3.T(0,y0+2.2,1.32),alpha:.55});S.box(1.6,.3,.04,dark,{xf:V3.T(-.4,y0+.55,1.52)});S.box(1.4,.2,.03,rgb('#6aa7ff'),{xf:V3.T(-.4,y0+.55,1.54),unlit:true,em:.9});
    S.box(1.4,.07,1.2,rgb('#ffd9a8'),{xf:V3.T(0,y0+2.1,0),anim:1,unlit:true,em:.7});S.box(3.4,.12,3.0,b,{xf:V3.T(0,y0+3.46,0)});
  }else if(kind==='form'){
    const bw=w*.95,H=L.t/9.5,d=bw*.95;
    S.box(bw,H,d,b,{xf:V3.T(0,y0+H/2,0)});S.box(bw*1.01,H*.42,d*1.01,h,{xf:V3.T(0,y0+H*.8,0)});
    S.box(bw*.62,H*.22,.04,dark,{xf:V3.T(0,y0+H*.4,d/2+.01)});S.box(bw*.54,H*.17,.03,a,{xf:V3.T(0,y0+H*.4,d/2+.03),unlit:true,em:.9,anim:2});
    S.box(bw*.3,.05,.04,rgb('#c4c6d0'),{xf:V3.T(0,y0+H*.12,d/2+.02)});
  }else if(kind==='cab'){
    const H=L.t/10+1.2,d=w*.9;
    S.box(w,H,d,b,{xf:V3.T(0,y0+H/2,0)});S.box(w*.82,H*.55,.05,h,{xf:V3.T(0,y0+H*.62,d/2+.01),unlit:!!L.glow,em:L.glow?.9:0,anim:L.glow?2:0});
    S.box(w*.6,H*.28,.03,rgb('#ffffff'),{xf:V3.T(0,y0+H*.68,d/2+.04),unlit:true,em:.7,anim:2});
    S.box(w*.5,H*.14,.04,dark,{xf:V3.T(-w*.15,y0+H*.17,d/2+.01)});S.box(.2,.2,.04,a,{xf:V3.T(w*.3,y0+H*.17,d/2+.02),unlit:true,em:.9,anim:2});
  }else if(kind==='pj'){
    const H=L.big?4.2:3.6,d=w*.62;
    S.box(w,H,d,b,{xf:V3.T(0,y0+H/2,0)});
    for(const sx of [-1,1])S.box(w*.4,H*.58,.05,h,{xf:V3.T(sx*w*.24,y0+H*.58,d/2+.01),alpha:.7});
    S.box(w*.3,.3,.05,dark,{xf:V3.T(-w*.28,y0+H*.15,d/2+.01)});S.box(w*.15,.22,.04,a,{xf:V3.T(w*.3,y0+H*.15,d/2+.02),unlit:true,em:.9,anim:2});S.box(w*.3,.3,.3,dark,{xf:V3.T(0,y0+H+.15,0)});
  }else{
    const sm=L.sm,len=w,H=sm?1.3:1.7;
    S.box(len,H*.55,1.5,b,{xf:V3.T(0,y0+H*.28,0)});S.box(len*.2,H*.8,1.3,rgb('#c9ced6'),{xf:V3.T(len*.34,y0+H*.9,0)});
    S.cyl(.32,.32,len*.5,rgb('#e8742a'),{xf:V3.mul(V3.T(-len*.05,y0+H*.95,0),V3.RZ(Math.PI/2))});S.cyl(.5,.12,.6,rgb('#aab1bb'),{xf:V3.T(-len*.18,y0+H*.95+.3,0)});
    S.box(len*.14,H*.5,1.1,rgb('#6b7686'),{xf:V3.T(-len*.35,y0+H*.9,0)});S.box(.8,.5,.04,dark,{xf:V3.T(len*.1,y0+H*.3,.76)});S.box(.6,.3,.03,a,{xf:V3.T(len*.1,y0+H*.3,.78),unlit:true,em:.9,anim:2});
  }
  S.particles(50,w*.7,3.5,'#b58cff');
  return S.done();
}
/* ---- modal ---- */
let _viewer=null;
function open3D(t,k){
  if(_viewer){_viewer.stop();_viewer=null}
  const isP=t==='p',name=isP?PRINTERS[k].name:PRODUCTS[k].name,fallback=isP?printerArt(k):prodArt(k);
  const L=isP?null:(FLOOK[k]||FLOOK.desk);
  const info=isP?(()=>{const D=PRINTERS[k];return `${D.form?'Cartridge':D.vat?'Open vat':'Machine'} · ${D.slots} slots · ${D.speed}× speed · ${Math.round(D.fail*1000)/10}% fail`})():(()=>{const P=PRODUCTS[k];return `${P.ml} ml resin · list price ${fmt(P.ref)}${P.official?' · official licence':''}`})();
  pending=[{f:()=>{if(_viewer){_viewer.stop();_viewer=null}}}];
  modal(`<div class="kicker">3D view</div><h3>${name}</h3><div class="v3d" id="v3d"><canvas id="v3c"></canvas><div class="v3fb" style="display:none">${fallback}</div></div><p class="s" style="margin:10px 0 14px">${info}<br>Drag to turn it around.</p><div class="acts"><button class="btn primary" data-choice="0">Close</button></div>`);
  try{
    const sc=isP?buildPrinter3(k):buildFigure3(k);
    const acc=isP?'#9d89ff':(L&&L.acc&&L.acc!=='#fff'&&L.acc!=='#ffffff'?L.acc:'#c9b8ff');
    const cv=document.getElementById('v3c');
    if(!startViewer(cv,sc,{accent:acc}))throw new Error('no webgl');
    _viewer=null;
  }catch(e){const f=document.querySelector('.v3fb');if(f){f.style.display='block';document.getElementById('v3c').style.display='none'}}
}
Object.assign(A,{view3d(d){open3D(d.t,d.k)}});

