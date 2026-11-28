import * as THREE from './vendor/three.module.js';
import {initialChapter} from './castle-book-ui.js?v=castle-26';
import {BOOKS,SPREADS} from './castle-book-stories.js?v=castle-26';
import {createStoryScene} from './castle-book-scenes.js?v=castle-26';
const canvas=document.querySelector('#book-canvas'),host=document.querySelector('#book-stage'),card=document.querySelector('#album-art');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});}catch(e){fallback();}
let current=initialChapter,transition=null;
function validTarget(target,switchStory=false){return Number.isInteger(target)&&target>=0&&target<SPREADS.length&&(switchStory||SPREADS[target].bookId===SPREADS[current].bookId);}
function fallbackRequest(e){const target=e.detail.target??current+e.detail.direction;if(validTarget(target,e.detail.switchStory)){current=target;announce(current);}}
function fallback(){canvas.hidden=true;document.querySelector('#book-fallback').hidden=false;card.dataset.renderer='fallback';}
function announce(index){window.dispatchEvent(new CustomEvent('book-chapter',{detail:{index}}));}
if(!renderer){
 window.addEventListener('book-request',fallbackRequest);
}else{
try{
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();fallback();});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setClearColor(0x000000,0);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
const scene=new THREE.Scene();
const camera=new THREE.OrthographicCamera(-5,5,4,-4,.1,60);camera.position.set(2.6,8.8,13);camera.lookAt(0,.9,0);
const key=new THREE.DirectionalLight('#fff2d4',3.4);key.position.set(-3.5,8,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-6,right:6,top:6,bottom:-6});key.shadow.normalBias=.025;key.shadow.bias=-.0007;key.shadow.radius=4;scene.add(key);
const ambient=new THREE.HemisphereLight('#fff8e6','#a4886b',2.0);scene.add(ambient);const rim=new THREE.DirectionalLight('#f6d3b5',.7);rim.position.set(4,3,-4);scene.add(rim);
const paper=(color,extras={})=>new THREE.MeshStandardMaterial({color,roughness:.93,metalness:0,...extras});
const colors={ivory:paper('#f3e2b9'),white:paper('#fff5dd'),sage:paper('#859173'),darkSage:paper('#64775c'),pink:paper('#c58c7b'),blush:paper('#dec1a0'),gold:paper('#c9a15c',{roughness:.7,metalness:.12}),ink:paper('#8b6752'),peach:paper('#e5bd93')};
function mesh(geo,mat,parent=scene,x=0,y=0,z=0){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function shape(points){const s=new THREE.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();return s;}
function rectShape(w,h,r=.08){const s=new THREE.Shape();s.moveTo(-w/2,0);s.lineTo(w/2-r,0);s.quadraticCurveTo(w/2,0,w/2,r);s.lineTo(w/2,h-r);s.quadraticCurveTo(w/2,h,w/2-r,h);s.lineTo(-w/2+r,h);s.quadraticCurveTo(-w/2,h,-w/2,h-r);s.lineTo(-w/2,r);s.quadraticCurveTo(-w/2,0,-w/2+r,0);return s;}
function cut(s,mat,parent=scene,x=0,y=0,z=0,depth=.032){return mesh(new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSize:.008,bevelThickness:.006,bevelSegments:1,curveSegments:18}),mat,parent,x,y,z);}
function disk(r,mat,parent,x,y,z){return mesh(new THREE.CylinderGeometry(r,r,.045,64),mat,parent,x,y,z);}
function line(points,mat,parent=scene,r=.007){return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),22,r,5,false),mat,parent);}
function flatDisk(r,mat,parent,x,y,z){const m=mesh(new THREE.CircleGeometry(r,48),mat,parent,x,y,z);m.castShadow=false;return m;}
function starShape(r=1){const pts=[];for(let i=0;i<10;i++){const a=Math.PI/2+i*Math.PI/5,q=i%2?r*.43:r;pts.push([Math.cos(a)*q,Math.sin(a)*q]);}return shape(pts);}
function addStar(parent,x,y,z,r=.15){const m=cut(starShape(r),colors.gold,parent,x,y,z,.045);m.rotation.z=.1;return m;}
function addCloud(parent,x,y,z,s=1){const sh=new THREE.Shape();sh.moveTo(-.8,0);sh.bezierCurveTo(-1,.22,-.82,.55,-.54,.49);sh.bezierCurveTo(-.5,.93,.21,1.01,.36,.6);sh.bezierCurveTo(.74,.72,1,.28,.75,.02);sh.lineTo(-.8,0);const c=cut(sh,colors.white,parent,x,y,z,.035);c.scale.setScalar(s);return c;}
function seeded(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
function pageTexture(index,side){
 const c=document.createElement('canvas');c.width=512;c.height=684;const g=c.getContext('2d');g.scale(2/3,2/3);const rand=seeded(120+index*9+side);g.fillStyle='#f5e7c7';g.fillRect(0,0,768,1024);
 const wash=g.createRadialGradient(430,430,10,430,430,600);wash.addColorStop(0,SPREADS[index].wash);wash.addColorStop(1,'#f6e9ca');g.fillStyle=wash;g.fillRect(0,0,768,1024);
 for(let i=0;i<16000;i++){const v=rand();g.fillStyle=v>.5?'rgba(132,103,68,.035)':'rgba(255,255,240,.16)';g.fillRect(rand()*768,rand()*1024,rand()*2+.4,rand()*2+.4);}
 const edge=g.createLinearGradient(side?0:768,0,side?90:678,0);edge.addColorStop(0,'rgba(99,69,39,.18)');edge.addColorStop(1,'rgba(100,70,40,0)');g.fillStyle=edge;g.fillRect(0,0,768,1024);
 g.strokeStyle='#b8996355';g.lineWidth=1.4;g.strokeRect(45,45,678,930);g.strokeStyle='#c1a36b40';g.strokeRect(53,53,662,914);
 g.fillStyle='#a78b5d';g.textAlign=side?'right':'left';g.font='20px Georgia';g.fillText(String(SPREADS[index].pageIndex*2+side+1).padStart(2,'0'),side?704:63,942);
 g.font='12px Georgia';g.textAlign='center';g.fillStyle='#b09b74';g.fillText(side?'A LITTLE CASTLE, JUST FOR YOU':'LITTLE MOMENTS, TOGETHER',384,940);
 // Quiet botanical corner engraving, rather than an ornamental UI border.
 for(const [ox,oy,sx,sy] of [[82,100,1,1],[685,880,-1,-1]]){g.save();g.translate(ox,oy);g.scale(sx,sy);g.strokeStyle='#b6986266';g.lineWidth=1.2;g.beginPath();g.moveTo(0,0);g.quadraticCurveTo(28,32,14,90);g.stroke();for(let k=0;k<5;k++){g.beginPath();g.ellipse(13+k*1.3,14+k*14,5,11,k%2?.7:-.6,0,Math.PI*2);g.stroke();}g.restore();}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;
}
const pageMaps=[];function ensureMaps(i){return pageMaps[i]??(pageMaps[i]=[pageTexture(i,0),pageTexture(i,1)]);}
ensureMaps(current);
const book=new THREE.Group();scene.add(book);book.rotation.y=-.08;
// Cloth binding, gilt edge, and individually offset sheets give the book real depth.
mesh(new THREE.BoxGeometry(8.25,.14,4.88),paper('#aa7967'),book,0,.02,0);
mesh(new THREE.BoxGeometry(8.18,.035,4.78),colors.gold,book,0,.105,0);
for(const side of [-1,1]){
 for(let i=0;i<7;i++)mesh(new THREE.BoxGeometry(3.99-i*.006,.025,4.57-i*.008),paper(i%2?'#ddcdaa':'#e8dab7'),book,side*2.01,.14+i*.025,0);
}
const leftPaper=mesh(new THREE.PlaneGeometry(4,4.55,12,1),paper('#fff9e5',{map:pageMaps[current][0]}),book,-2,.33,0);leftPaper.rotation.x=-Math.PI/2;
const rightPaper=mesh(new THREE.PlaneGeometry(4,4.55,12,1),paper('#fff9e5',{map:pageMaps[current][1]}),book,2,.33,0);rightPaper.rotation.x=-Math.PI/2;
const spine=mesh(new THREE.CylinderGeometry(.11,.11,4.65,24),paper('#c6ae83'),book,0,.24,0);spine.rotation.x=Math.PI/2;spine.scale.x=.5;
const ribbon=mesh(new THREE.PlaneGeometry(.15,1.25),paper('#ad7563',{side:THREE.DoubleSide}),book,.19,.22,2.57);ribbon.rotation.x=-Math.PI/2;ribbon.rotation.z=.18;
// Contact shadow fades into the card without drawing a visible tabletop.
const shadow=mesh(new THREE.PlaneGeometry(100,100),new THREE.ShadowMaterial({opacity:.105}),scene,0,-.12,0);shadow.rotation.x=-Math.PI/2;shadow.castShadow=false;
function popup(parent,x,z){const g=new THREE.Group();g.position.set(x,.35,z);parent.add(g);g.userData.pop=true;return g;}
function paperBrace(parent,h=.8,w=.25){const sh=shape([[0,0],[w,0],[0,h]]);const b=cut(sh,colors.ivory,parent,0,0,-.025,.022);b.rotation.y=Math.PI/2;return b;}
function hill(parent,x,z,w,h,color){const p=popup(parent,x,z),s=new THREE.Shape();s.moveTo(-w/2,0);s.bezierCurveTo(-w/2,h*.28,-w*.28,h,w*.05,h*.92);s.bezierCurveTo(w*.3,h,w*.4,h*.35,w/2,0);s.closePath();cut(s,color,p);paperBrace(p,h*.65,.35);return p;}
function plant(parent,x,z,h=.7,mat=colors.sage){const p=popup(parent,x,z);line([[0,0,0],[0,h*.55,0],[.08,h,0]],colors.gold,p,.008);for(let i=0;i<5;i++){const leaf=shape([[0,0],[-.22,.12],[-.15,.24],[0,.22]]);const m=cut(leaf,mat,p,i%2?.03:-.03,.12+i*h*.14,.012,.016);m.rotation.z=i%2?Math.PI+.2:-.12;m.rotation.y=i%2?-.25:.25;m.scale.setScalar(.7);}return p;}
function flower(parent,x,z,color=colors.pink){const p=popup(parent,x,z);line([[0,0,0],[.04,.3,0],[0,.58,0]],colors.sage,p,.012);for(let i=0;i<5;i++){const a=i/5*Math.PI*2;flatDisk(.078,color,p,Math.cos(a)*.095,.58+Math.sin(a)*.095,.025);}flatDisk(.045,colors.gold,p,0,.58,.035);return p;}
function cakeCastle(parent,x,z,scale=1){
 const p=popup(parent,x,z);p.scale.setScalar(scale);p.userData.restScale=scale;p.userData.actor='castle';
 for(const [tx,base,height] of [[-.85,.6,1.35],[.82,.65,1.57],[-.1,1,1.65]]){
  cut(rectShape(.41,height,.03),colors.white,p,tx,base,-.16);
  cut(shape([[-.33,0],[0,.62],[.33,0]]),colors.pink,p,tx,base+height,-.13);
  const win=rectShape(.1,.23,.05);cut(win,colors.ink,p,tx,base+height*.6,-.105,.01);
  addStar(p,tx,base+height+.65,-.12,.065);
 }
 cut(rectShape(2.45,.75,.10),colors.blush,p,0,.08,.02,.07);
 cut(rectShape(2.52,.13,.05),colors.white,p,0,.73,.12,.08);
 cut(rectShape(2.48,.13,.05),colors.white,p,0,.06,.13,.08);
 cut(rectShape(1.76,.7,.07),colors.ivory,p,0,.85,-.02,.06);
 cut(rectShape(1.83,.12,.05),colors.white,p,0,1.46,.08,.08);
 cut(rectShape(.96,.58,.06),colors.white,p,0,1.57,-.07,.06);
 cut(rectShape(1.02,.11,.04),colors.white,p,0,2.08,.01,.08);
 line([[-1.23,.44,.13],[0,.44,.13],[1.23,.44,.13]],colors.gold,p,.012);
 line([[-.85,1.02,.065],[0,1.02,.065],[.85,1.02,.065]],colors.gold,p,.009);
 for(let i=0;i<16;i++)flatDisk(.043,colors.white,p,-1.15+i*.154,.79,.21);
 for(let i=0;i<11;i++)flatDisk(.035,colors.white,p,-.77+i*.154,1.52,.17);
 for(const v of [-.66,.63]){const s=mesh(new THREE.SphereGeometry(.11,12,12),colors.pink,p,v,1.68,.06);s.scale.set(.8,1.15,.38);cut(shape([[-.08,0],[0,.08],[.08,0]]),colors.sage,p,v,1.76,.1,.01);}
 const door=cut(rectShape(.38,.49,.19),colors.ink,p,0,.15,.16,.03);const leaf=cut(rectShape(.31,.45,.15),colors.peach,p,0,.17,.20,.02);flatDisk(.022,colors.gold,p,.09,.37,.235);
 line([[.23,2.1,-.03],[.23,2.65,-.03]],colors.gold,p,.012);cut(shape([[0,0],[.4,-.06],[.3,.08],[.4,.21],[0,.21]]),colors.pink,p,.23,2.44,-.02,.017);
 paperBrace(p,1.5,.6);return p;
}
const loader=new THREE.TextureLoader();
const princessTexture=await loader.loadAsync('./assets/storybook/princess.svg');princessTexture.colorSpace=THREE.SRGBColorSpace;princessTexture.anisotropy=4;
const hugTexture=await loader.loadAsync('./assets/storybook/princess-hug.svg');hugTexture.colorSpace=THREE.SRGBColorSpace;hugTexture.anisotropy=4;
const catTexture=await loader.loadAsync('./assets/storybook/cat.svg');catTexture.colorSpace=THREE.SRGBColorSpace;catTexture.anisotropy=4;
const alphaMasks=new Map();
for(const t of [princessTexture,hugTexture,catTexture]){const c=document.createElement('canvas');c.width=256;c.height=256;c.getContext('2d').drawImage(t.image,0,0,256,256);alphaMasks.set(t,c.getContext('2d').getImageData(0,0,256,256).data);}
function puppet(parent,actor,x,z,h){const p=popup(parent,x,z);const texture=actor==='cat'?catTexture:SPREADS[parent.userData.chapter].scene==='hug'?hugTexture:princessTexture;const ratio=actor==='cat'?460/590:460/700;const mat=paper('#fff9e9',{map:texture,transparent:true,alphaTest:.45,side:THREE.DoubleSide});
 const sprite=mesh(new THREE.PlaneGeometry(h*ratio,h),mat,p,0,h/2,.06);sprite.receiveShadow=false;
 const back=mesh(new THREE.PlaneGeometry(h*ratio,h),paper('#d5bc90',{map:texture,transparent:true,alphaTest:.45,side:THREE.DoubleSide}),p,.012,h/2,-.012);back.receiveShadow=false;
 p.rotation.y=.04;p.userData.actor=actor;paperBrace(p,h*.55,.34);p.userData.sprite=sprite;return p;
}
function sun(parent,night){const p=popup(parent,-2.45,-1.65);p.userData.decor=true;const s=new THREE.Shape();
 if(night){s.absarc(0,2.85,.49,.55,Math.PI*2-.3,false);s.bezierCurveTo(.07,2.37,-.37,2.9,.42,3.13);const m=cut(s,colors.gold,p,0,0,-.1);m.material=paper('#d3b16c',{emissive:'#b88f40',emissiveIntensity:.12});}
 else {const m=flatDisk(.41,colors.gold,p,0,2.7,-.1);for(let i=0;i<12;i++){const a=i*Math.PI/6;line([[Math.cos(a)*.51,2.7+Math.sin(a)*.51,-.1],[Math.cos(a)*.64,2.7+Math.sin(a)*.64,-.1]],colors.gold,p,.011);}}
 // A narrow paper stem makes the sun a physical part of the spread.
 cut(rectShape(.036,2.8,.005),colors.ivory,p,0,0,-.135,.02);return p;
}
const spreads=[];
function buildSpread(i){
 const page=SPREADS[i],kind=page.scene,original=['castle','star','hug','goodnight'].includes(kind);
 const g=new THREE.Group();book.add(g);g.visible=i===current;g.userData.chapter=i;const popups=[];
 hill(g,-.2,-1.8,7.3,1.02,kind==='goodnight'?colors.darkSage:colors.sage);
 hill(g,1.6,-1.33,4.1,.64,colors.blush);hill(g,-2.3,-1.11,2.2,.56,colors.darkSage);
 const sky=sun(g,false),moon=sun(g,true);moon.visible=false;const cloud=popup(g,1.5,-1.8);addCloud(cloud,0,2.5,0,.65);addCloud(cloud,1.05,2.15,-.03,.36);cloud.userData.decor=true;
 const castle=cakeCastle(g,original?(kind==='star'?-2.1:-1.65):-2.25,-.87,original?(kind==='star'?.70:.89):.67);
 const princess=puppet(g,'princess',kind==='hug'?1.22:.86,.55,2.55);
 const cat=puppet(g,'cat',kind==='hug'?1.0:2.25,kind==='hug'?1.1:1.08,kind==='hug'?1.12:1.5);
 if(kind==='hug'){cat.position.y=1.05;cat.rotation.z=-.4;cat.userData.held=true;princess.rotation.z=-.06;
  const skin=paper('#edc7a4');
  const left=new THREE.Shape();left.moveTo(-.27,1.43);left.bezierCurveTo(-.5,1.2,-.4,1.02,-.13,.98);left.quadraticCurveTo(.01,1.0,-.04,1.11);left.bezierCurveTo(-.28,1.15,-.3,1.21,-.16,1.36);left.closePath();cut(left,colors.white,princess,0,0,.69,.025);const l=cut(left,skin,princess,0,.02,.72,.016);l.scale.set(.86,.97,1);
  const right=new THREE.Shape();right.moveTo(.26,1.43);right.bezierCurveTo(.54,1.19,.29,.89,-.14,1.02);right.quadraticCurveTo(-.2,1.1,-.11,1.15);right.bezierCurveTo(.14,1.08,.28,1.22,.17,1.36);right.closePath();cut(right,colors.white,princess,0,0,.74,.026);const r=cut(right,skin,princess,0,.02,.77,.016);r.scale.set(.88,.97,1);
 }
 if(kind==='star'){cat.position.x=1.8;cat.position.y=.6;cat.rotation.z=-.15;princess.rotation.z=.1;}
 if(kind==='goodnight'){princess.position.x=.7;princess.rotation.z=.07;cat.position.x=1.6;cat.rotation.z=-.14;}
 // Broad cream path visibly crosses the central fold.
 const path=shape([[-3,.2],[-2.8,.3],[-.7,.1],[.1,-.1],[1.1,-1.4],[1.4,-2],[2.1,-2],[1.7,-.8],[.7,.35],[-.6,.65]]);const pathmesh=cut(path,colors.white,g,0,.353,0,.008);pathmesh.rotation.x=-Math.PI/2;pathmesh.castShadow=false;
 const plants=[];for(const [x,z,h] of [[-3.3,.6,.85],[-2.9,.95,.7],[3.4,.4,.83],[3.05,.9,.66],[-3.4,-.2,.55]])plants.push(plant(g,x,z,h));
 for(const [x,z] of [[-2.4,1.5],[-2.15,1.6],[2.9,1.45]])flower(g,x,z,kind==='goodnight'?colors.ivory:colors.pink);
 const star=addStar(popup(g,.35,-.25),0,2.7,.02,kind==='star'?.32:.15);star.parent.visible=kind==='star';star.userData.floating=true;
 const stars=[];for(const [x,y,z,r] of [[-1.1,2.9,-1.7,.12],[1.5,3.2,-1.8,.12],[2.7,2.9,-1.4,.09]]){const p=popup(g,x,z);addStar(p,0,y,0,r);p.visible=kind==='goodnight'||kind==='star';p.userData.star=true;stars.push(p);}
 // Tiny paper envelope and lantern are quiet, discoverable details.
 const envelope=popup(g,-2.9,1.58);cut(rectShape(.48,.32,.015),colors.white,envelope);line([[-.24,.32,.06],[0,.13,.06],[.24,.32,.06]],colors.gold,envelope,.008);envelope.rotation.z=.17;envelope.visible=kind!=='goodnight';
 const lamp=popup(g,2.75,.30);cut(rectShape(.26,.41,.045),paper('#eecb80',{emissive:'#cc9a45',emissiveIntensity:.2}),lamp,0,.32,0);cut(rectShape(.34,.04,.01),colors.ink,lamp,0,.28,.03);line([[0,0,0],[0,.92,0],[.18,1,0],[.22,.76,0]],colors.ink,lamp,.015);lamp.visible=kind==='goodnight';
 const blanket=popup(g,1.35,1.45);cut(rectShape(1.4,.65,.12),colors.pink,blanket,0,.22,0,.035);line([[-.58,.76,.055],[0,.81,.055],[.58,.76,.055]],colors.ivory,blanket,.025);for(let k=0;k<3;k++)line([[-.45+k*.45,.26,.06],[-.45+k*.45,.69,.06]],colors.blush,blanket,.006);blanket.visible=false;
 const props=createStoryScene(kind,page.phase??0,{g,princess,cat,castle,popup,cut,shape,rectShape,mesh,paper,line,flatDisk,colors});
 g.children.forEach(c=>{if(c.userData.pop){c.userData.restY=c.position.y;c.userData.restRotX=c.rotation.x;c.userData.restRotZ=c.rotation.z;c.userData.restX=c.position.x;c.userData.restScale=c.scale.y;popups.push(c);}});
 const spread={g,popups,castle,princess,cat,cloud,sky,moon,star,stars,lamp,blanket,props};spreads[i]=spread;return spread;
}
function ensureSpread(i){ensureMaps(i);return spreads[i]??buildSpread(i);}
ensureSpread(current);
const leafGeometry=new THREE.PlaneGeometry(4,4.55,36,3);
const leafMaterial=paper('#fff7df',{map:pageMaps[current][1],side:THREE.DoubleSide});
const leaf=mesh(leafGeometry,leafMaterial,book);leaf.visible=false;leaf.castShadow=true;leaf.frustumCulled=false;
function bendLeaf(p,direction){const pos=leafGeometry.attributes.position;const count=37,depthSteps=4,w=4;
 for(let j=0;j<depthSteps;j++)for(let i=0;i<count;i++){
  const u=i/36;let xx=0,yy=0;const steps=24,ds=u*w/steps;
  for(let s=0;s<steps;s++){const t=(s+.5)/steps*u;const a=p*Math.PI+Math.sin(p*Math.PI)*.55*(t-.35);xx+=Math.cos(a)*ds;yy+=Math.sin(a)*ds;}
  const k=j*count+i;pos.setXYZ(k,xx*direction,.35+Math.max(0,yy),(j/3-.5)*4.55+Math.sin(p*Math.PI)*.045*u*u);
 }
 pos.needsUpdate=true;leafGeometry.computeVertexNormals();
}
const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
function fold(spread,p){for(const pop of spread.popups){pop.scale.y=pop.userData.restScale*Math.max(.025,1-p);pop.rotation.x=pop.userData.restRotX-p*Math.PI*.43;}}
let lastFrame=0,raf=0,visible=true,night=document.documentElement.dataset.theme==='dark'||card.dataset.bedtime==='true',bedtime=card.dataset.bedtime==='true',tap=null;
function setAppearance(){const n=night||SPREADS[current].night===true;card.dataset.night=String(n);key.color.set(n?'#fff0c9':'#fff2d4');key.intensity=n?2.6:3.4;ambient.color.set(n?'#e6e6cb':'#fff8e6');ambient.groundColor.set(n?'#596146':'#a4886b');ambient.intensity=n?1.35:2;rim.color.set(n?'#d9c28e':'#f6d3b5');renderer.toneMappingExposure=n?.96:1.15;spreads.forEach((s,i)=>{const page=SPREADS[i],isNight=night||page.night===true;s.sky.visible=!isNight&&(page.scene!=='rain'||page.phase===3);s.moon.visible=isNight;s.blanket.visible=bedtime&&page.scene==='goodnight';s.stars.forEach(p=>p.visible=isNight||page.scene==='star');});}
function resize(){const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h,false);const height=Math.max(6.9,10.5/(w/h)),span=height*w/h;camera.left=-span/2;camera.right=span/2;camera.top=height/2;camera.bottom=-camera.top;camera.updateProjectionMatrix();render(performance.now());}
new ResizeObserver(resize).observe(host);
window.addEventListener('book-appearance',e=>{night=e.detail.night;bedtime=e.detail.bedtime;setAppearance();resize();});
function turnTo(target,{switchStory=false}={}){if(transition||target===current||!validTarget(target,switchStory))return false;
 ensureSpread(target);
 tap=null;
 if(reduced.matches||!visible){spreads[current].g.visible=false;current=target;spreads[current].g.visible=true;leftPaper.material.map=pageMaps[current][0];rightPaper.material.map=pageMaps[current][1];setAppearance();announce(current);render(performance.now());return true;}
 transition={from:current,to:target,direction:target>current?1:-1,start:performance.now(),switched:false};
 leafMaterial.map=pageMaps[target][target>current?1:0];leafMaterial.needsUpdate=true;return true;
}
window.addEventListener('book-request',e=>turnTo(e.detail.target??current+e.detail.direction,{switchStory:e.detail.switchStory}));
function turnFrame(now){if(!transition)return;const tr=transition,p=Math.min(1,(now-tr.start)/1350);
 const outgoing=spreads[tr.from],incoming=spreads[tr.to];fold(outgoing,ease(Math.min(1,p/.29)));incoming.g.visible=p>.48;
 if(p>.48&&!tr.switched){tr.switched=true;outgoing.g.visible=false;current=tr.to;leftPaper.material.map=pageMaps[current][0];rightPaper.material.map=pageMaps[current][1];setAppearance();announce(current);}
 if(p>.48)fold(incoming,1-ease(Math.max(0,Math.min(1,(p-.63)/.37))));
 leaf.visible=p>.16&&p<.87;bendLeaf(ease(Math.max(0,Math.min(1,(p-.16)/.71))),tr.direction);
 if(p===1){fold(outgoing,0);fold(incoming,0);outgoing.g.visible=false;leaf.visible=false;transition=null;}
}
const raycaster=new THREE.Raycaster(),point=new THREE.Vector2();
function tapAt(x,y){if(transition)return;const r=canvas.getBoundingClientRect();point.set((x-r.left)/r.width*2-1,-(y-r.top)/r.height*2+1);raycaster.setFromCamera(point,camera);
 const s=spreads[current];let actor='all';for(const hit of raycaster.intersectObjects([s.cat,s.princess,s.castle],true)){
  // Transparent texture pixels should not count as a character tap.
  const texture=hit.object.material?.map,alpha=alphaMasks.get(texture);
  if(alpha&&hit.uv){const x=Math.min(255,Math.max(0,Math.floor(hit.uv.x*256))),y=Math.min(255,Math.max(0,Math.floor((1-hit.uv.y)*256)));if(alpha[(y*256+x)*4+3]<115)continue;}
  if(hit.object.userData.actor)actor=hit.object.userData.actor;
  for(let n=hit.object;n;n=n.parent){if(n.userData.actor){actor=n.userData.actor;break;}}if(actor!=='all')break;
 }
 act(actor);
}
function act(actor){if(transition)return;tap={actor,start:performance.now()};document.querySelector('#gesture-hint').classList.add('used');render(performance.now());}
window.addEventListener('book-character',e=>act(e.detail.actor));
let pointer=null;
canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;pointer={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointerup',e=>{if(!pointer||e.pointerId!==pointer.id)return;const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;if(Math.abs(dx)>35&&Math.abs(dx)>Math.abs(dy)*1.2)turnTo(current+(dx<0?1:-1));else if(Math.abs(dx)<12&&Math.abs(dy)<12)tapAt(e.clientX,e.clientY);pointer=null;});
canvas.addEventListener('pointercancel',()=>pointer=null);
host.addEventListener('keydown',e=>{if(e.key==='ArrowRight'){turnTo(current+1);e.preventDefault();e.stopPropagation();}if(e.key==='ArrowLeft'){turnTo(current-1);e.preventDefault();e.stopPropagation();}});
host.tabIndex=0;
function idle(now){const t=now*.001,s=spreads[current],still=reduced.matches||bedtime;if(transition)return;
 for(const p of s.popups){p.rotation.x=p.userData.restRotX;p.rotation.z=p.userData.restRotZ;p.position.x=p.userData.restX;p.position.y=p.userData.restY;p.scale.y=p.userData.restScale;}
 if(!still){s.princess.rotation.z=s.princess.userData.restRotZ+Math.sin(t*1.1)*.018;s.cat.rotation.z=s.cat.userData.restRotZ+Math.sin(t*1.3+.7)*.035;s.cloud.position.y=s.cloud.userData.restY+Math.sin(t*.55)*.04;s.star.position.y=2.7+Math.sin(t*1.5)*.06;}
 if(bedtime){s.princess.rotation.z=s.princess.userData.restRotZ+.05;s.cat.rotation.z=s.cat.userData.restRotZ-.09;s.cat.position.x=s.cat.userData.restX-.2;}
 s.props.update?.(t,still);
 if(tap){const elapsed=(now-tap.start)/1000,duration=bedtime?1.9:1.5,p=Math.min(1,elapsed/duration),bounce=Math.sin(p*Math.PI),wiggle=Math.sin(p*Math.PI*4)*(1-p);
  if(!reduced.matches){if(tap.actor==='princess'){s.princess.rotation.z+=wiggle*(bedtime?.04:.13);s.princess.position.y+=bounce*(bedtime?.03:.12);}
  else if(tap.actor==='castle'){s.castle.scale.y=s.castle.userData.restScale*(1+Math.sin(p*Math.PI*3)*.07*(1-p));s.castle.rotation.z=wiggle*.035;}
  else {s.cat.position.y+=bounce*(bedtime?.05:.36);s.cat.position.x-=bounce*(bedtime?.16:.65);s.cat.rotation.z-=bounce*.3;if(tap.actor==='all'){s.princess.rotation.z+=bounce*.09;s.princess.position.y+=bounce*.04;s.castle.rotation.z=wiggle*.025;}}
  }if(p===1)tap=null;
 }
}
function render(now){if(!visible||document.hidden)return;idle(now);turnFrame(now);renderer.render(scene,camera);lastFrame=now;}
function loop(now){raf=requestAnimationFrame(loop);if(!reduced.matches&&now-lastFrame>1000/32)render(now);}
new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)render(performance.now());},{threshold:0.01}).observe(host);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)render(performance.now());});
reduced.addEventListener('change',()=>{if(reduced.matches&&transition)turnFrame(transition.start+1350);render(performance.now());});
setAppearance();resize();announce(current);card.dataset.renderer='webgl';requestAnimationFrame(loop);
window.castleStorybook={get state(){return{chapter:current,bookId:SPREADS[current].bookId,page:SPREADS[current].pageIndex,pageCount:BOOKS[SPREADS[current].bookIndex].pages.length,bookCount:BOOKS.length,busy:!!transition,night,bedtime,drawCalls:renderer.info.render.calls,loadedSpreads:spreads.filter(Boolean).length};},turnTo,render:()=>render(performance.now())};
window.addEventListener('pagehide',e=>{if(e.persisted)return;cancelAnimationFrame(raf);renderer.dispose();scene.traverse(n=>{if(n.geometry)n.geometry.dispose();if(n.material){for(const m of [].concat(n.material))m.dispose();}});pageMaps.flat().filter(Boolean).forEach(t=>t.dispose());catTexture.dispose();princessTexture.dispose();hugTexture.dispose();});
}catch(error){renderer.dispose();fallback();window.addEventListener('book-request',fallbackRequest);announce(current);}
}
