import React,{useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const assetCache=new Map();
function loadCharacter(kind){
 if(!assetCache.has(kind))assetCache.set(kind,new GLTFLoader().loadAsync('/models/'+kind+'.glb'));
 return assetCache.get(kind);
}
export function buildCharacter(isHuman,profile){
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);
 return {g,body,head:new THREE.Group(),arms:[],legs:[],isHuman,ready:false,injuryMarks:[]};
}
function bindCharacter(f,asset,profile){
 f.g.remove(f.body);const model=asset.scene.clone(true);f.g.add(model);
 const prefix=f.isHuman?'human':'chimp',node=name=>model.getObjectByName(prefix+'_'+name);
 f.body=node('body');f.head=node('head');f.jaw=node('jaw');
 f.arms=['L','R'].map((label,i)=>({shoulder:node('shoulder_'+label),elbow:node('elbow_'+label),hand:node('hand_'+label),side:i?1:-1}));
 f.legs=['L','R'].map((label,i)=>({hip:node('hip_'+label),knee:node('knee_'+label),side:i?1:-1}));
 model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.material=o.material.clone();o.geometry=o.geometry.clone();}});
 const markMaterial=new THREE.MeshBasicMaterial({color:'#a5654d',side:THREE.DoubleSide});
 for(let i=0;i<3;i++){
  const mark=new THREE.Mesh(new THREE.PlaneGeometry(.12,.027),markMaterial);
  mark.position.set(.02,-.15-i*.065,.129);mark.rotation.z=-.35;mark.visible=false;
  f.arms[1].elbow.add(mark);f.injuryMarks.push(mark);
 }
 if(f.isHuman&&profile.weapon){
  f.weapon=new THREE.Group();f.body.add(f.weapon);f.weapon.position.set(.46,1.76,.34);
  const part=(geometry,color,x,y,z)=>{const o=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color,roughness:.85}));o.position.set(x,y,z);o.castShadow=true;f.weapon.add(o);return o;};
  if(profile.weapon==='spear'){part(new THREE.CylinderGeometry(.03,.03,3.1,8),'#725536',0,0,.6).rotation.x=Math.PI/2;part(new THREE.ConeGeometry(.105,.40,4),'#b6b69e',0,0,2.32).rotation.x=Math.PI/2;}
  else{part(new THREE.BoxGeometry(.13,.18,.68),'#3d443d',0,0,.26);part(new THREE.BoxGeometry(.12,.15,.38),'#725637',0,0,-.23);part(new THREE.CylinderGeometry(.034,.034,.74,8),'#2d352e',0,.055,.94).rotation.x=Math.PI/2;}
 }
 f.ready=true;
}

export default function FieldStage({human,chimp,view,round=0,status='idle',last=null,winner=null,startDistance=4,onOrbit,command}){
 const host=useRef(null),live=useRef({}),[error,setError]=useState(false),[loading,setLoading]=useState(true);
 live.current={human,chimp,view,round,status,last,winner,startDistance,onOrbit,command};
 useEffect(()=>{
  const el=host.current;let renderer;try{renderer=new THREE.WebGLRenderer({antialias:true})}catch{setError(true);return}
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.setClearColor('#dfdcc4');renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','3D arena. Drag to rotate, scroll to zoom. Arrow keys rotate; plus and minus zoom; R resets.');el.appendChild(renderer.domElement);
  const scene=new THREE.Scene();scene.fog=new THREE.Fog('#dfdcc4',38,105);const camera=new THREE.PerspectiveCamera(39,1,.1,180);
  const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,1.1,0);controls.enableDamping=true;controls.dampingFactor=.10;controls.enablePan=false;controls.minDistance=4.5;controls.maxDistance=48;controls.minPolarAngle=.02;controls.maxPolarAngle=Math.PI*.49;controls.rotateSpeed=.65;controls.zoomSpeed=.75;
  const initial=[12,10,17];camera.position.set(...({side:[0,4.6,18],overhead:[.01,24,.01],detail:[7,3.8,9]}[view]||initial));controls.update();let transition=false,previousView=view,previousCommand=command?.id,zoomTarget=null;const destination=new THREE.Vector3(...initial);
  const startDrag=()=>{transition=false;zoomTarget=null;live.current.onOrbit?.()};controls.addEventListener('start',startDrag);
  const zoom=(factor)=>{zoomTarget=THREE.MathUtils.clamp(camera.position.distanceTo(controls.target)*factor,controls.minDistance,controls.maxDistance);transition=false};
  const keydown=e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','r','R'].includes(e.key))return;e.preventDefault();startDrag();if(['+','='].includes(e.key))zoom(.8);else if(e.key==='-')zoom(1.25);else if(e.key.toLowerCase()==='r'){destination.set(...initial);transition=true}else{const offset=camera.position.clone().sub(controls.target),spherical=new THREE.Spherical().setFromVector3(offset);spherical.theta+=(e.key==='ArrowLeft'?.15:e.key==='ArrowRight'?-.15:0);spherical.phi=THREE.MathUtils.clamp(spherical.phi+(e.key==='ArrowUp'?-.12:e.key==='ArrowDown'?.12:0),controls.minPolarAngle,controls.maxPolarAngle);camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));controls.update()}};renderer.domElement.addEventListener('keydown',keydown);
  scene.add(new THREE.HemisphereLight('#ffefd1','#626345',2.4));const sun=new THREE.DirectionalLight('#fff1cc',3.2);sun.position.set(-12,22,8);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-30,right:30,top:30,bottom:-30,near:1,far:75});sun.shadow.normalBias=.02;scene.add(sun);
  const materials=new Map();const mat=c=>{if(!materials.has(c))materials.set(c,new THREE.MeshStandardMaterial({color:c,roughness:1,flatShading:true}));return materials.get(c)};
  function cube(w,h,d,x,y,z,color){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color));m.position.set(x,y,z);m.receiveShadow=true;m.castShadow=true;scene.add(m);return m}
  cube(220,.6,220,0,-.33,0,'#91935b');let seed=4839;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
  const grass=new THREE.InstancedMesh(new THREE.BoxGeometry(.028,.18,.028),mat('#71794c'),9000),dummy=new THREE.Object3D();for(let i=0;i<9000;i++){dummy.position.set((rand()-.5)*85,0,(rand()-.5)*85);dummy.scale.set(1,.5+rand()*1.7,1);dummy.updateMatrix();grass.setMatrixAt(i,dummy.matrix)}grass.receiveShadow=true;scene.add(grass);
  for(let i=0;i<65;i++)cube(rand()*4+.5,.01,rand()*3+.5,(rand()-.5)*100,-.023,(rand()-.5)*100,['#949762','#96985f','#8c8e54'][i%3]);
  function tree(x,z,scale){cube(.43*scale,3.2*scale,.45*scale,x,1.6*scale,z,'#685b3d');for(let i=0;i<4;i++){const canopy=new THREE.Mesh(new THREE.IcosahedronGeometry((1.3+i*.12)*scale,1),mat(['#647040','#727e49','#7e8650','#596739'][i]));canopy.scale.set(1.1,.78,1);canopy.position.set(x+(i%2?.55:-.5)*scale,(3.5+i*.38)*scale,z+(i>1?.6:-.4)*scale);canopy.castShadow=true;canopy.receiveShadow=true;scene.add(canopy)}}
  [[-17,-14,1.5],[-24,5,1.8],[22,-18,1.2],[24,10,1.7],[-8,-29,1.4],[10,-35,1.5],[-30,-30,2],[34,-4,1.7]].forEach(t=>tree(...t));
  for(let i=0;i<23;i++){const x=(rand()-.5)*45,z=(rand()-.5)*38;if(Math.abs(x)<10&&Math.abs(z)<6)continue;const rock=new THREE.Mesh(new THREE.IcosahedronGeometry(.25+rand()*.3,0),mat('#a9a28b'));rock.position.set(x,.1,z);rock.scale.set(1.3,.6,1);rock.castShadow=true;scene.add(rock)}
  const ring=new THREE.Mesh(new THREE.RingGeometry(5.8,5.84,120),new THREE.MeshBasicMaterial({color:'#e6dcc0',transparent:true,opacity:.40,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.002;scene.add(ring);
  const h=buildCharacter(true,human),c=buildCharacter(false,chimp);scene.add(h.g,c.g);let disposed=false;setLoading(true);setError(false);
  Promise.all([loadCharacter('human'),loadCharacter('chimp')]).then(([ha,ca])=>{if(disposed)return;bindCharacter(h,ha,human);bindCharacter(c,ca,chimp);setLoading(false)}).catch(()=>{if(!disposed){setError(true);setLoading(false)}});
 h.g.rotation.y=Math.PI/2;c.g.rotation.y=-Math.PI/2;h.g.position.x=-startDistance*.75;c.g.position.x=startDistance*.75;
  const views={isometric:initial,side:[0,4.6,18],overhead:[.01,24,.01],detail:[7,3.8,9]};const resize=()=>{renderer.setSize(el.clientWidth,el.clientHeight);camera.aspect=el.clientWidth/Math.max(el.clientHeight,1);camera.updateProjectionMatrix()};const ro=new ResizeObserver(resize);ro.observe(el);resize();
  if(camera.aspect<.8){camera.position.set(16,13,23);controls.update()}
  let frame,previousRound=0,impact=-10;const begin=performance.now(),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;const offset=new THREE.Vector3();
  function pose(f,s,t,pulse){
   if(!f.ready)return;
   const side=f.isHuman?'human':'chimp',humanSide=f.isHuman,actor=s.last?.side===side,type=s.last?.type;
   const ground=s.last?.position==='ground',top=ground&&s.last?.groundController===side,under=ground&&!top;
   const clinch=s.last?.position==='clinch',defending=humanSide&&['frame','cover'].includes(type);
   const lost=s.status==='done'&&s.winner&&s.winner!==side,moving=s.status==='running'&&['approach','prepare','break','recover'].includes(type);
   const mix=(current,target)=>THREE.MathUtils.lerp(current,target,reduced?1:.16);
   f.body.rotation.z=mix(f.body.rotation.z,lost&&!ground?1.35:0);
   f.body.rotation.x=mix(f.body.rotation.x,under?-1.52:top?.28:clinch?(humanSide?.08:.14):humanSide?0:.13);
   f.body.position.y=mix(f.body.position.y,under?.27:top?-.25:lost?-.07:reduced?0:Math.sin(t*2)*.009);
   f.head.rotation.x=mix(f.head.rotation.x,actor&&['bite','tear'].includes(type)?.22:under?.19:0);
   f.head.rotation.y=mix(f.head.rotation.y,actor&&type==='miss'?pulse*.18:0);
   if(f.jaw)f.jaw.rotation.x=mix(f.jaw.rotation.x,actor&&['bite','tear'].includes(type)?-.22*pulse:0);
   f.injuryMarks.forEach((mark,i)=>{mark.visible=i<(humanSide?s.last?.injuryH??0:s.last?.injuryC??0)});
   for(const leg of f.legs){
    leg.hip.rotation.x=mix(leg.hip.rotation.x,under?-.55:top?-1.05:moving&&!reduced?Math.sin(t*7+leg.side*Math.PI/2)*.32:humanSide?-.035:-.19);
    leg.hip.rotation.z=mix(leg.hip.rotation.z,ground?leg.side*.19:0);
    leg.knee.rotation.x=mix(leg.knee.rotation.x,under?1.05:top?1.48:moving&&!reduced?Math.max(0,Math.sin(t*7+leg.side*Math.PI/2))*.48:humanSide?.05:.25);
   }
   for(const arm of f.arms){
    const reach=clinch||top,attack=actor&&['strike','grapple','ground-strike','pull','tear','pin','clinch'].includes(type);
    let shoulder=humanSide?-(s.human.weapon?.75:s.human.id==='mma'?.95:.45):-.12,elbow=humanSide?-.70:-.17;
    if(reach){shoulder=top?-1.05:-.85;elbow=top?-.35:-.90}
    if(attack){shoulder-=pulse*(arm.side===1?.62:.23);elbow+=pulse*.18}
    if(defending||under){shoulder=-1.75+(arm.side===1?.12:0);elbow=-1.15}
    if(type==='break'||type==='recover'){shoulder=-.85;elbow=-.35}
    if(moving&&!reduced){shoulder+=Math.sin(t*7-arm.side*Math.PI/2)*.18}
    arm.shoulder.rotation.x=mix(arm.shoulder.rotation.x,shoulder);
    arm.shoulder.rotation.z=mix(arm.shoulder.rotation.z,arm.side*(defending?.12:ground?.24:humanSide?.06:.15));
    arm.elbow.rotation.x=mix(arm.elbow.rotation.x,elbow);
    arm.hand.rotation.x=mix(arm.hand.rotation.x,attack?-.15:.06);
   }
   if(f.weapon){f.weapon.visible=!ground;f.weapon.position.z=.34+(actor&&type==='spear'?pulse*.32:0)}
  }
  function animate(now){const t=(now-begin)/1000,s=live.current;if(s.round!==previousRound){impact=t;previousRound=s.round}const pulse=reduced||s.status==='paused'?0:Math.max(0,1-(t-impact)*1.65),gap=Math.max((s.last?.distance??s.startDistance)*.75,s.last?.position==='clinch'?.95:.85);
   h.g.scale.set(Math.pow(s.human.mass/85,.23),s.human.height/190.5,Math.pow(s.human.mass/85,.23));c.g.scale.setScalar(Math.cbrt(s.chimp.mass/50));
   const ground=s.last?.position==='ground',chimpTop=s.last?.groundController==='chimp';
   const hx=ground?(chimpTop?1.05:.10):-gap+(s.last?.side==='human'&&s.last?.landed?pulse*.16:0);
   const cx=ground?(chimpTop?-.10:-1.05):gap-(s.last?.side==='chimp'&&s.last?.landed?pulse*.16:0);
   h.g.position.x=THREE.MathUtils.lerp(h.g.position.x,hx,.10);c.g.position.x=THREE.MathUtils.lerp(c.g.position.x,cx,.10);
   h.g.position.z=THREE.MathUtils.lerp(h.g.position.z,ground&&!chimpTop?.38:0,.10);
   c.g.position.z=THREE.MathUtils.lerp(c.g.position.z,ground&&chimpTop?.38:0,.10);pose(h,s,t,pulse);pose(c,s,t,pulse);
   if(s.view!==previousView){previousView=s.view;if(views[s.view]){destination.set(...views[s.view]);transition=true;zoomTarget=null}}
   if(s.command?.id!==previousCommand){previousCommand=s.command?.id;if(s.command?.type==='in')zoom(.78);if(s.command?.type==='out')zoom(1.28);if(s.command?.type==='reset'){destination.set(...initial);transition=true;zoomTarget=null}}
   if(transition){camera.position.lerp(destination,reduced?1:.1);if(camera.position.distanceTo(destination)<.015)transition=false}
   if(zoomTarget!==null){offset.copy(camera.position).sub(controls.target);const radius=THREE.MathUtils.lerp(offset.length(),zoomTarget,reduced?1:.17);offset.setLength(radius);camera.position.copy(controls.target).add(offset);if(Math.abs(radius-zoomTarget)<.01)zoomTarget=null}
   controls.update();renderer.render(scene,camera);frame=requestAnimationFrame(animate)
  }frame=requestAnimationFrame(animate);
  return()=>{disposed=true;cancelAnimationFrame(frame);ro.disconnect();controls.removeEventListener('start',startDrag);controls.dispose();renderer.domElement.removeEventListener('keydown',keydown);const geometries=new Set(),allMaterials=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>allMaterials.add(m))});geometries.forEach(g=>g.dispose());allMaterials.forEach(m=>m.dispose());renderer.dispose();renderer.domElement.remove()}
 },[human.id,chimp.id]);
 return <div className="world" ref={host}>{loading&&<div className="world-error">Loading characters…</div>}{error&&<div className="world-error">The 3D characters could not load. Reload to try again.</div>}</div>
}
