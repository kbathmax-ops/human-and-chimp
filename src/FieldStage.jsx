import React,{useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {beat,heading,smooth,CONTACT} from './combatMotion.js';

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

export default function FieldStage({human,chimp,view,round=0,status='idle',last=null,winner=null,startDistance=4,onOrbit,command,playback,rounds,seed=0}){
 const host=useRef(null),live=useRef({}),[error,setError]=useState(false),[loading,setLoading]=useState(true);
 live.current={human,chimp,view,round,status,last,winner,startDistance,onOrbit,command,playback,rounds,seed};
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
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,offset=new THREE.Vector3();
  const dust=Array.from({length:24},(_,i)=>{const mesh=new THREE.Mesh(new THREE.IcosahedronGeometry(1,0),new THREE.MeshBasicMaterial({color:i%2?'#c0b58d':'#afa578',transparent:true,opacity:0,depthWrite:false}));mesh.visible=false;scene.add(mesh);return {mesh,born:-10,origin:new THREE.Vector3(),velocity:new THREE.Vector3(),scale:.04+(i%5)*.016};});
  let frame,lastNow=performance.now(),idleTime=0,emittedKey='',oldRun=null;
  const work={root:new THREE.Vector3(),elbow:new THREE.Vector3(),hand:new THREE.Vector3(),target:new THREE.Vector3(),dir:new THREE.Vector3(),pole:new THREE.Vector3(),bend:new THREE.Vector3(),end:new THREE.Vector3(),from:new THREE.Vector3(),to:new THREE.Vector3(),rotation:new THREE.Quaternion(),worldQ:new THREE.Quaternion(),parentQ:new THREE.Quaternion(),localQ:new THREE.Quaternion()};
  function aimJoint(joint,child,target,weight){
   joint.getWorldPosition(work.root);child.getWorldPosition(work.end);
   work.from.copy(work.end).sub(work.root).normalize();work.to.copy(target).sub(work.root).normalize();
   work.rotation.setFromUnitVectors(work.from,work.to);joint.getWorldQuaternion(work.worldQ);joint.parent.getWorldQuaternion(work.parentQ);
   work.localQ.copy(work.parentQ).invert().multiply(work.rotation).multiply(work.worldQ);
   joint.quaternion.slerp(work.localQ,weight);joint.updateWorldMatrix(false,true);
  }
  function reachArm(f,arm,target,weight){
   if(weight<=0)return;
   arm.shoulder.getWorldPosition(work.root);arm.elbow.getWorldPosition(work.elbow);arm.hand.getWorldPosition(work.hand);
   const root=work.root.clone(),length1=root.distanceTo(work.elbow),length2=work.elbow.distanceTo(work.hand);
   work.dir.copy(target).sub(root);const distance=THREE.MathUtils.clamp(work.dir.length(),Math.abs(length1-length2)+.01,(length1+length2)*.985);work.dir.normalize();
   // Pole keeps elbows visibly outside the torso instead of crossing through it.
   work.pole.set(arm.side*.9,-.25,.25).applyQuaternion(f.g.quaternion);
   work.pole.addScaledVector(work.dir,-work.pole.dot(work.dir)).normalize();
   const along=(length1*length1-length2*length2+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,length1*length1-along*along));
   const bend=root.clone().addScaledVector(work.dir,along).addScaledVector(work.pole,height);
   const end=root.clone().addScaledVector(work.dir,distance);
   aimJoint(arm.shoulder,arm.elbow,bend,weight);aimJoint(arm.elbow,arm.hand,end,weight);
  }
  const posture=(step,side)=>{
   const ground=step?.position==='ground',top=ground&&step.groundController===side,under=ground&&!top,clinch=step?.position==='clinch',humanSide=side==='human';
   return {ground,top,under,clinch,x:under?-1.52:top?.28:clinch?(humanSide?.08:.14):humanSide?0:.13,y:under?.27:top?-.25:0,hip:under?-.55:top?-1.05:humanSide?-.035:-.19,knee:under?1.05:top?1.48:humanSide?.05:.25};
  };
  function pose(f,s,action,prev,t,p,m){
   if(!f.ready)return;
   const humanSide=f.isHuman,side=humanSide?'human':'chimp',actor=action?.side===side,type=action?.type;
   const current=posture(action,side),before=posture(prev,side),travel=reduced?1:m.settle;
   const blend=(key)=>THREE.MathUtils.lerp(before[key],current[key],travel);
   const lost=s.winner&&s.winner!==side,active=s.status==='running'||s.status==='paused';
   const reaction=active&&!actor&&action?.landed?m.recoil:0,dodge=active&&!actor&&type==='miss'?m.extend:0;
   const moving=active&&!current.ground&&(['approach','prepare','break','recover'].includes(type)||Math.abs(heading((action?.round??1)-1,s.seed)-heading((action?.round??1)-2,s.seed))>.04);
   const gait=moving&&!reduced?Math.sin(t*7):0,lead=(action?.round??0)%2?1:-1;
   const attack=actor&&['strike','grapple','ground-strike','pull','tear','pin','clinch','spear','bite'].includes(type);
   const defending=humanSide&&['frame','cover'].includes(type);
   f.body.rotation.x=blend('x')+(current.ground?0:reaction*-.12+dodge*-.08+(attack?m.windup*-.08+m.extend*.08:0));
   f.body.rotation.z=lost&&!current.ground?1.35*(reduced?1:smooth(.48,1,p)):current.ground?0:reaction*lead*.10+dodge*lead*.12;
   f.body.rotation.y=current.ground?0:actor?(m.windup*.17-m.extend*.14)*lead:dodge*lead*.16;
   f.body.position.y=blend('y')-(current.ground?0:dodge*.14)+(moving?Math.abs(gait)*.022:0);
   f.head.rotation.x=current.under?.19:reaction*-.15+(actor&&['bite','tear'].includes(type)?m.extend*.25:0);
   f.head.rotation.y=actor&&type==='miss'?m.extend*.20:0;
   if(f.jaw)f.jaw.rotation.x=actor&&['bite','tear'].includes(type)?-.3*m.extend:0;
   f.injuryMarks.forEach((mark,i)=>{mark.visible=i<(humanSide?s.last?.injuryH??0:s.last?.injuryC??0)});
   for(const leg of f.legs){
    leg.hip.rotation.x=blend('hip')+(moving?gait*leg.side*.24:0);
    leg.hip.rotation.z=current.ground?leg.side*.19:leg.side*.025;
    leg.knee.rotation.x=blend('knee')+(moving?Math.max(0,gait*leg.side)*.35:0);
   }
   for(const arm of f.arms){
    const reach=current.clinch||current.top;
    let shoulder=humanSide?-(s.human.weapon?.75:s.human.id==='mma'?.95:.45):-.12,elbow=humanSide?-.70:-.17;
    if(reach){shoulder=current.top?-1.05:-.85;elbow=current.top?-.35:-.90;}
    if(attack&&arm.side===lead){shoulder+=m.windup*.42-m.extend*.68;elbow-=m.windup*.48;elbow+=m.extend*.45;}
    if(defending||current.under){shoulder=-1.75+(arm.side===1?.12:0);elbow=-1.15;}
    if(type==='break'||type==='recover'){shoulder=-.85;elbow=-.35;}
    if(moving){shoulder-=gait*arm.side*.12;}
    arm.shoulder.rotation.set(shoulder,0,arm.side*(defending?.12:current.ground?.24:humanSide?.06:.15));
    arm.elbow.rotation.set(elbow,0,0);arm.hand.rotation.set(attack?-.15:.06,0,0);
   }
   if(f.weapon){f.weapon.visible=!current.ground;f.weapon.position.z=.34+(actor&&type==='spear'?m.extend*.32-m.windup*.13:0);f.weapon.rotation.x=actor&&type==='shot'?m.recoil*-.08:0;}
  }
  function contact(f,other,action,prev,m){
   if(!f.ready||!other.ready)return;
   const side=f.isHuman?'human':'chimp',actor=action?.side===side,ground=action?.position==='ground',clinch=action?.position==='clinch';
   if(ground&&action.groundController!==side)return;
   const lead=(action?.round??0)%2?1:-1;
   for(const arm of f.arms){
    const striking=actor&&['strike','grapple','ground-strike'].includes(action?.type)&&arm.side===lead;
    const gripping=(clinch||ground)&&['clinch','pull','pin','tear','bite','grapple','frame','cover'].includes(action?.type);
    if(f.isHuman&&live.current.human.weapon&&!gripping)continue;
    if(!striking&&!gripping)continue;
    const weight=striking?m.extend*.92:(prev?.position===action?.position? .76 : m.settle*.76);
    // Front shoulder / upper arm contact; scale and ground orientation come from the actual rig.
    const target=new THREE.Vector3(-arm.side*(striking?.12:.38),other.isHuman?1.92:1.49,.27);
    other.body.localToWorld(target);
    if(gripping&&action.type==='pull'){const otherArm=other.arms[arm.side===1?0:1];otherArm.elbow.getWorldPosition(target);}
    reachArm(f,arm,target,weight);
   }
  }
  function coordinates(step,side,startDistance){
   const ground=step?.position==='ground',chimpTop=step?.groundController==='chimp';
   if(ground)return side==='human'?{x:chimpTop?1.05:.10,z:chimpTop?0:.38}:{x:chimpTop?-.10:-1.05,z:chimpTop?.38:0};
   const gap=Math.max((step?.distance??startDistance)*.75,step?.position==='clinch'?.95:.85);
   return {x:side==='human'?-gap:gap,z:0};
  }
  function animate(now){
   const delta=Math.min(.08,Math.max(0,(now-lastNow)/1000));lastNow=now;const s=live.current;
   if(s.status==='idle')idleTime+=delta;
   const clock=s.playback?.current,action=s.rounds?.[clock?.index??0]??s.last,prev=s.rounds?(clock.index>0?s.rounds[clock.index-1]:null):s.last;
   const p=clock&&action?clock.progress:1,t=clock&&action?clock.time/1000:idleTime,m=beat(reduced?1:p);
   const runKey=s.rounds;if(oldRun!==runKey){emittedKey='';dust.forEach(d=>d.mesh.visible=false);oldRun=runKey;}
   h.g.scale.set(Math.pow(s.human.mass/85,.23),s.human.height/190.5,Math.pow(s.human.mass/85,.23));c.g.scale.setScalar(Math.cbrt(s.chimp.mass/50));
   const index=action?.round??0,angle=action?THREE.MathUtils.lerp(heading(Math.max(0,index-1),s.seed),heading(index,s.seed),m.travel):0;
   for(const f of [h,c]){
    const side=f.isHuman?'human':'chimp',sign=f.isHuman?1:-1,from=coordinates(prev,side,s.startDistance),to=coordinates(action,side,s.startDistance);
    const actor=action?.side===side,ground=action?.position==='ground'||prev?.position==='ground';
    const attacked=action&&action.side!=='none'&&!actor&&action.landed,missed=action&&action.side!=='none'&&!actor&&action.type==='miss';
    const travel=reduced?1:(action?.type==='takedown'?smooth(.25,.87,p):m.travel);
    let x=THREE.MathUtils.lerp(from.x,to.x,travel),z=THREE.MathUtils.lerp(from.z,to.z,travel);
    if(!ground&&action&&!reduced){
     if(actor&&action.type!=='approach')x+=sign*(-m.windup*.10+m.extend*.17);
     if(attacked)x-=sign*m.recoil*.12;
     if(missed)z+=((index%2)?1:-1)*m.extend*.27;
    }
    f.g.position.set(x*Math.cos(angle)-z*Math.sin(angle),0,x*Math.sin(angle)+z*Math.cos(angle));
    f.g.rotation.y=(f.isHuman?Math.PI/2:-Math.PI/2)-angle;
    pose(f,s,action,prev,t,p,m);
   }
   scene.updateMatrixWorld(true);contact(h,c,action,prev,m);contact(c,h,action,prev,m);
   const key=String(s.seed)+':'+index;
   if(action?.landed&&p>=CONTACT&&key!==emittedKey&&!reduced){
    emittedKey=key;const center=h.g.position.clone().add(c.g.position).multiplyScalar(.5);
    dust.forEach((d,i)=>{const a=i*2.399;d.origin.copy(center).add(new THREE.Vector3(Math.cos(a)*.2,.04,Math.sin(a)*.2));d.velocity.set(Math.cos(a)*(.3+i%4*.12),.35+(i%3)*.1,Math.sin(a)*(.3+i%4*.12));d.born=t;d.mesh.visible=true;});
   }
   for(const d of dust){if(!d.mesh.visible)continue;const age=t-d.born;if(age>.75||age<0){d.mesh.visible=false;continue}d.mesh.position.copy(d.origin).addScaledVector(d.velocity,age);d.mesh.position.y=Math.max(.015,d.mesh.position.y-age*age*.5);d.mesh.scale.setScalar(d.scale*(1+age));d.mesh.material.opacity=(1-age/.75)*.34;}
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
