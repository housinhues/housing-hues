/* Housing Hues — hero 3D wordmark.
   Transparent WebGL canvas over the artwork. Starts at the artwork's perspective
   angle (left side near), swings toward flat, follows pointer/touch tilt. */
(function(){
"use strict";
var cv=document.getElementById('hh3d');
if(!cv)return;
function fail(){
  var h=document.querySelector('.hero h1');
  if(h)h.className='wm-fallback';
  if(cv.parentNode)cv.parentNode.removeChild(cv);
}
var gl=null;
try{gl=cv.getContext('webgl',{antialias:true,alpha:true,premultipliedAlpha:true,powerPreference:'low-power'})||cv.getContext('experimental-webgl');}catch(e){}
if(!gl){fail();return;}

var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---- shaders ---- */
var VS='attribute vec3 aP; attribute vec3 aN;\nuniform mat4 uMVP; uniform mat4 uM; uniform mat3 uN;\nvarying vec3 vN; varying vec3 vP;\nvoid main(){ vP=(uM*vec4(aP,1.0)).xyz; vN=uN*aN; gl_Position=uMVP*vec4(aP,1.0); }';
var FS=['precision mediump float;','varying vec3 vN; varying vec3 vP;',
'uniform vec3 uC; uniform vec3 uCam; uniform float uEmis;','void main(){',
' vec3 N=normalize(vN);',
' vec3 L1=normalize(vec3(0.45,0.90,0.80));',
' vec3 L2=normalize(vec3(-0.75,0.20,-0.55));',
' vec3 V=normalize(uCam-vP);',
' vec3 H=normalize(L1+V);',
' float d1=max(dot(N,L1),0.0);',
' float d2=max(dot(N,L2),0.0);',
' float sp=pow(max(dot(N,H),0.0),70.0);',
' float rim=pow(1.0-max(dot(N,V),0.0),2.6);',
' vec3 col=uC*(0.20+0.90*d1+0.30*d2)+vec3(1.0,0.95,0.8)*sp*0.85+uC*rim*0.55+uC*uEmis;',
' gl_FragColor=vec4(col,1.0);','}'].join('\n');

function sh(t,s){var o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))console.error(gl.getShaderInfoLog(o));return o;}
var pr=gl.createProgram();
gl.attachShader(pr,sh(gl.VERTEX_SHADER,VS));
gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,FS));
gl.linkProgram(pr);
if(!gl.getProgramParameter(pr,gl.LINK_STATUS)){fail();return;}
gl.useProgram(pr);
var aP=gl.getAttribLocation(pr,'aP'),aN=gl.getAttribLocation(pr,'aN');
var uMVP=gl.getUniformLocation(pr,'uMVP'),uM=gl.getUniformLocation(pr,'uM'),
    uN=gl.getUniformLocation(pr,'uN'),uC=gl.getUniformLocation(pr,'uC'),
    uCam=gl.getUniformLocation(pr,'uCam'),uEmis=gl.getUniformLocation(pr,'uEmis');
gl.enableVertexAttribArray(aP);gl.enableVertexAttribArray(aN);
gl.enable(gl.DEPTH_TEST);
gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);gl.frontFace(gl.CCW);

/* ---- unit cube ---- */
function mkBox(){
  var F=[
    {n:[1,0,0], v:[[.5,-.5,-.5],[.5,.5,-.5],[.5,.5,.5],[.5,-.5,.5]]},
    {n:[-1,0,0],v:[[-.5,-.5,-.5],[-.5,-.5,.5],[-.5,.5,.5],[-.5,.5,-.5]]},
    {n:[0,1,0], v:[[-.5,.5,-.5],[-.5,.5,.5],[.5,.5,.5],[.5,.5,-.5]]},
    {n:[0,-1,0],v:[[-.5,-.5,-.5],[.5,-.5,-.5],[.5,-.5,.5],[-.5,-.5,.5]]},
    {n:[0,0,1], v:[[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]]},
    {n:[0,0,-1],v:[[-.5,-.5,-.5],[-.5,.5,-.5],[.5,.5,-.5],[.5,-.5,-.5]]}
  ];
  var pos=[],nor=[],idx=[];
  for(var q=0;q<6;q++){
    var f=F[q],b=q*4;
    for(var v=0;v<4;v++){pos.push(f.v[v][0],f.v[v][1],f.v[v][2]);nor.push(f.n[0],f.n[1],f.n[2]);}
    idx.push(b,b+1,b+2,b,b+2,b+3);
  }
  var o={p:gl.createBuffer(),n:gl.createBuffer(),i:gl.createBuffer(),c:idx.length};
  gl.bindBuffer(gl.ARRAY_BUFFER,o.p);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(pos),gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER,o.n);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(nor),gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,o.i);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(idx),gl.STATIC_DRAW);
  return o;
}
var BOX=mkBox();

/* ---- blocky 5x7 stroke font: [x, y, w, h] ---- */
var FONT={
  H:[[0,0,1,7],[4,0,1,7],[1,3,3,1]],
  O:[[0,6,5,1],[0,0,5,1],[0,1,1,5],[4,1,1,5]],
  U:[[0,0,1,7],[4,0,1,7],[1,0,3,1]],
  S:[[0,6,5,1],[0,3,5,1],[0,0,5,1],[0,4,1,2],[4,1,1,2]],
  I:[[2,0,1,7]],
  N:[[0,0,1,7],[4,0,1,7],[1,4.6,1,1.4],[2,3.2,1,1.4],[3,1.8,1,1.4]],
  G:[[0,6,5,1],[0,1,1,5],[1,0,3,1],[4,0,1,3],[2.2,2.5,1.8,1]],
  E:[[0,0,1,7],[1,6,4,1],[1,3,4,1],[1,0,4,1]],
  ' ':[]
};

var GLYPH_W=5,GLYPH_H=7,ADV=5.9,DEPTH=1.6;
var LINE_A='HOUSING',LINE_B='HUES';
var YC_A=4.6,YC_B=-4.6;
/* brand palette: espresso brown (matches the artwork) to gold (site accent #e0b100) */
var C0=[0.27,0.16,0.10], C1=[0.88,0.69,0.00];

function m4(){return new Float32Array(16);}
function lerp3(a,b,t){return[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];}
function setMS(px,py,pz,sx,sy,sz,o){
  o[0]=sx;o[1]=0;o[2]=0;o[3]=0;
  o[4]=0;o[5]=sy;o[6]=0;o[7]=0;
  o[8]=0;o[9]=0;o[10]=sz;o[11]=0;
  o[12]=px;o[13]=py;o[14]=pz;o[15]=1;
}

var GAP=0.9;
function gw(ch){return ch==='I'?3:GLYPH_W;}
function lw(str){var t=0;for(var i=0;i<str.length;i++)t+=gw(str.charAt(i))+(i?GAP:0);return t;}
var TW=Math.max(lw(LINE_A),lw(LINE_B));
var parts=[];
function buildLine(str,yc){
  var x=-lw(str)/2;
  for(var i=0;i<str.length;i++){
    var ch=str.charAt(i), g=FONT[ch]||[], sh=(ch==='I'?1:0);
    for(var r=0;r<g.length;r++){
      var b=g[r], w=b[2], h=b[3];
      var cx=x+(b[0]-sh)+w/2;
      var cy=yc+b[1]+h/2-GLYPH_H/2;
      var m=m4();
      setMS(cx,cy,0,w,h,DEPTH,m);
      var t=Math.min(1,Math.max(0,(cx+TW/2)/TW));
      parts.push({m:m,c:lerp3(C0,C1,t)});
    }
    x+=gw(ch)+GAP;
  }
}
buildLine(LINE_A,YC_A);
buildLine(LINE_B,YC_B);

var HALF_W=TW/2, HALF_H=(YC_A-YC_B)/2+GLYPH_H/2, HALF_D=DEPTH/2;
var FIT_R=Math.sqrt(HALF_W*HALF_W+HALF_H*HALF_H+HALF_D*HALF_D);
var FIT_PAD=1.04, VFOV=0.95, ZOOM=1.22;

var P=m4(),V=m4(),VP=m4(),W=m4(),C=m4(),MVP=m4(),N3=new Float32Array(9),
    R1=m4(),R2=m4(),T1=m4();
function mul(a,b,o){for(var c=0;c<4;c++)for(var r=0;r<4;r++){var s=0;for(var k=0;k<4;k++)s+=a[k*4+r]*b[c*4+k];o[c*4+r]=s;}return o;}
function persp(f,asp,n,fa,o){var t=1/Math.tan(f/2);o.fill(0);o[0]=t/asp;o[5]=t;o[10]=(fa+n)/(n-fa);o[11]=-1;o[14]=2*fa*n/(n-fa);}
function look(e,c,u,o){
  var zx=e[0]-c[0],zy=e[1]-c[1],zz=e[2]-c[2],l=Math.hypot(zx,zy,zz)||1;zx/=l;zy/=l;zz/=l;
  var xx=u[1]*zz-u[2]*zy,xy=u[2]*zx-u[0]*zz,xz=u[0]*zy-u[1]*zx;
  l=Math.hypot(xx,xy,xz)||1;xx/=l;xy/=l;xz/=l;
  var yx=zy*xz-zz*xy,yy=zz*xx-zx*xz,yz=zx*xy-zy*xx;
  o[0]=xx;o[1]=yx;o[2]=zx;o[3]=0;o[4]=xy;o[5]=yy;o[6]=zy;o[7]=0;
  o[8]=xz;o[9]=yz;o[10]=zz;o[11]=0;
  o[12]=-(xx*e[0]+xy*e[1]+xz*e[2]);o[13]=-(yx*e[0]+yy*e[1]+yz*e[2]);o[14]=-(zx*e[0]+zy*e[1]+zz*e[2]);o[15]=1;
}
function setRx(a,o){var c=Math.cos(a),s=Math.sin(a);o[0]=1;o[1]=0;o[2]=0;o[3]=0;o[4]=0;o[5]=c;o[6]=s;o[7]=0;o[8]=0;o[9]=-s;o[10]=c;o[11]=0;o[12]=0;o[13]=0;o[14]=0;o[15]=1;}
function setRy(a,o){var c=Math.cos(a),s=Math.sin(a);o[0]=c;o[1]=0;o[2]=-s;o[3]=0;o[4]=0;o[5]=1;o[6]=0;o[7]=0;o[8]=s;o[9]=0;o[10]=c;o[11]=0;o[12]=0;o[13]=0;o[14]=0;o[15]=1;}
function nrm(m,o){
  var a=m[0],b=m[1],c=m[2],l=Math.hypot(a,b,c)||1;o[0]=a/l;o[1]=b/l;o[2]=c/l;
  a=m[4];b=m[5];c=m[6];l=Math.hypot(a,b,c)||1;o[3]=a/l;o[4]=b/l;o[5]=c/l;
  a=m[8];b=m[9];c=m[10];l=Math.hypot(a,b,c)||1;o[6]=a/l;o[7]=b/l;o[8]=c/l;
}
function drawBox(M,col){
  mul(VP,M,MVP);
  gl.uniformMatrix4fv(uMVP,false,MVP);
  gl.uniformMatrix4fv(uM,false,M);
  nrm(M,N3);gl.uniformMatrix3fv(uN,false,N3);
  gl.uniform3fv(uC,col);gl.uniform1f(uEmis,0.02);
  gl.bindBuffer(gl.ARRAY_BUFFER,BOX.p);gl.vertexAttribPointer(aP,3,gl.FLOAT,false,0,0);
  gl.bindBuffer(gl.ARRAY_BUFFER,BOX.n);gl.vertexAttribPointer(aN,3,gl.FLOAT,false,0,0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,BOX.i);
  gl.drawElements(gl.TRIANGLES,BOX.c,gl.UNSIGNED_SHORT,0);
}

/* ---- orientation state ----
   yaw > 0 pulls the left edge toward the viewer, the same lean as the artwork. */
var BASE_YAW=0.42, BASE_PITCH=-0.12;
var yaw=BASE_YAW, pitch=BASE_PITCH;      /* current */
var tYaw=BASE_YAW, tPitch=BASE_PITCH;    /* target  */
var lastMove=-1e9;

function draw(){
  setRy(yaw,R1);setRx(pitch,R2);
  mul(R1,R2,W);
  mul(P,V,VP);
  gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  for(var i=0;i<parts.length;i++){
    mul(W,parts[i].m,C);
    drawBox(C,parts[i].c);
  }
}

var cam=[0,0,50];
function resize(){
  var d=Math.min(window.devicePixelRatio||1,1.5);
  var w=cv.clientWidth||window.innerWidth, h=cv.clientHeight||200;
  cv.width=Math.max(1,Math.floor(w*d));cv.height=Math.max(1,Math.floor(h*d));
  gl.viewport(0,0,cv.width,cv.height);
  var asp=cv.width/cv.height;
  persp(VFOV,asp,0.1,500,P);
  var halfV=VFOV/2, halfH=Math.atan(Math.tan(halfV)*asp);
  var R=FIT_R*FIT_PAD;
  var dist=Math.max(R/Math.sin(halfV),R/Math.sin(halfH))/ZOOM;
  cam=[0,0,dist];
  look(cam,[0,0,0],[0,1,0],V);
  gl.uniform3fv(uCam,cam);
  draw();
}
gl.clearColor(0,0,0,0);
resize();
addEventListener('resize',resize);
addEventListener('orientationchange',function(){setTimeout(resize,120);});
if(window.visualViewport)window.visualViewport.addEventListener('resize',resize);
if(reduce)return;   /* static, artwork-matched pose */

/* ---- input: pointer / touch tilt ---- */
addEventListener('pointermove',function(e){
  var nx=(e.clientX/Math.max(1,innerWidth)-0.5)*2;
  var ny=(e.clientY/Math.max(1,innerHeight)-0.5)*2;
  tYaw=BASE_YAW+nx*0.45;
  tPitch=BASE_PITCH-ny*0.18;
  lastMove=performance.now();
},{passive:true});

/* ---- loop, paused when hidden or off-screen ---- */
var running=true, visible=true, prev=0;
function loop(ms){
  if(!running||!visible){prev=0;return;}
  var dt=prev?Math.min(0.05,(ms-prev)/1000):0.016;prev=ms;
  var T=ms/1000;
  if(ms-lastMove>2500){                       /* idle sway: artwork angle <-> flat */
    tYaw=BASE_YAW+Math.sin(T*0.5)*0.40;
    tPitch=BASE_PITCH+Math.sin(T*0.31)*0.10;
  }
  var k=1-Math.exp(-dt*4);
  yaw+=(tYaw-yaw)*k;pitch+=(tPitch-pitch)*k;
  draw();
  requestAnimationFrame(loop);
}
function start(){if(running&&visible)requestAnimationFrame(loop);}
document.addEventListener('visibilitychange',function(){running=!document.hidden;start();});
if('IntersectionObserver' in window){
  new IntersectionObserver(function(en){visible=en[0].isIntersecting;start();}).observe(cv);
}
start();
})();
