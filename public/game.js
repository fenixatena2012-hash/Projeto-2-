import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

const characters = [
 ["Aelion","Cavaleiro", "🛡️",0x6e9de0],["Lyra","Arqueira","🏹",0x63b78c],
 ["Kael","Mago","🔮",0x9c7be0],["Nyria"," Druida","🌿",0x65b88a],
 ["Draven","Ladino","🗡️",0x8c91a8],["Solara","Paladina","☀️",0xe9b95d],
 ["Thorin","Berserker","🪓",0xb86f57],["Mira","Feiticeira","✨",0xb77bd0],
 ["Eryndor","Guardião","🌙",0x6797b7],["Zara","Invocadora","🐉",0xd77b87]
];
const $ = id => document.getElementById(id);
let selected=0, started=false, socket, myId=null, players=new Map(), keys={}, move={x:0,y:0}, yaw=0, pitch=.25, cameraPointers=new Map(), jumpUntil=0;
const colliders=[];
function addCircleCollider(x,z,r){colliders.push({type:"circle",x,z,r})}
function addRectCollider(x,z,hx,hz){colliders.push({type:"rect",x,z,hx,hz})}
const grid=$("character-grid");
characters.forEach((c,i)=>{const b=document.createElement("button");b.className="character"+(i===0?" selected":"");b.innerHTML=`<div class="avatar">${c[2]}</div><b>${c[0]}</b><small>${c[1]}</small>`;b.onclick=()=>{selected=i;document.querySelectorAll(".character").forEach(x=>x.classList.remove("selected"));b.classList.add("selected")};grid.appendChild(b)});
$("loading").classList.add("hidden");$("select").classList.remove("hidden");

const scene=new THREE.Scene();scene.background=new THREE.Color(0x91b9d5);scene.fog=new THREE.Fog(0x91b9d5,28,78);
const camera=new THREE.PerspectiveCamera(62,innerWidth/innerHeight,.1,150);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;$("game").appendChild(renderer.domElement);
const hemi=new THREE.HemisphereLight(0xdceeff,0x536044,2);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffe5bc,2.4);sun.position.set(-12,24,10);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);scene.add(sun);
const daySky=new THREE.Color(0x91b9d5),nightSky=new THREE.Color(0x101a36),dawnSky=new THREE.Color(0xe49a78);
function mat(color,rough=.8,metal=0){return new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal})}
const grass=mat(0x527b57), pathmat=mat(0xbba77e), stone=mat(0x7e8b91), wood=mat(0x76523b), gold=mat(0xe3bd72,.35,.55);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(100,100),grass);floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
const path=new THREE.Mesh(new THREE.PlaneGeometry(9,70),pathmat);path.rotation.x=-Math.PI/2;path.position.set(0,.012,0);scene.add(path);
const plaza=new THREE.Mesh(new THREE.CircleGeometry(8,48),pathmat);plaza.rotation.x=-Math.PI/2;plaza.position.y=.02;scene.add(plaza);
function box(parent,w,h,d,material,x,y,z){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
function tree(x,z,s=1){const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.18*s,.25*s,1.7*s,7),wood);trunk.position.y=.85*s;trunk.castShadow=true;g.add(trunk);for(let i=0;i<3;i++){const crown=new THREE.Mesh(new THREE.IcosahedronGeometry((1.0-i*.12)*s,1),mat([0x3e704d,0x477e54,0x56885c][i]));crown.position.set(0,(2.0+i*.48)*s,0);crown.castShadow=true;g.add(crown)}}
for(let i=0;i<42;i++){let a=i*2.399,r=11+(i%7)*3.4,x=Math.cos(a)*r,z=Math.sin(a)*r,scale=.75+(i%4)*.13;tree(x,z,scale);addCircleCollider(x,z,.38*scale)}
// Portal and little village
const portal=new THREE.Group();portal.position.set(0,0,-13);scene.add(portal);
const arch=new THREE.Mesh(new THREE.TorusGeometry(2.15,.22,12,40,Math.PI),gold);arch.position.y=3;arch.castShadow=true;portal.add(arch);
box(portal,.42,3.1,.55,stone,-2.05,1.55,0);box(portal,.42,3.1,.55,stone,2.05,1.55,0);
const glow=new THREE.Mesh(new THREE.CircleGeometry(1.88,40),new THREE.MeshBasicMaterial({color:0x79d9ff,transparent:true,opacity:.28,side:THREE.DoubleSide}));glow.position.set(0,2.5,-.12);portal.add(glow);
for(let x of [-7,7]){const hut=new THREE.Group();hut.position.set(x,0,-3);scene.add(hut);box(hut,3,2.3,3,mat(0xc5a77d),0,1.15,0);const roof=new THREE.Mesh(new THREE.ConeGeometry(2.45,1.6,4),mat(0x754b48));roof.rotation.y=Math.PI/4;roof.position.y=3;roof.castShadow=true;hut.add(roof);box(hut,.7,1.3,.12,wood,0,.65,1.56);addRectCollider(x,-3,1.8,1.8)}
addRectCollider(-2.05,-13,.42,.48);addRectCollider(2.05,-13,.42,.48)
// stones and flowers
for(let i=0;i<55;i++){const a=Math.random()*Math.PI*2,r=5+Math.random()*25;const f=new THREE.Mesh(new THREE.SphereGeometry(.10+Math.random()*.1,6,5),mat([0xe8c5d0,0xf0d88c,0xb9d8e5][i%3]));f.position.set(Math.cos(a)*r,.12,Math.sin(a)*r);scene.add(f)}
function makeHero(index){const group=new THREE.Group();const color=characters[index][3];const armor=mat(color,.38,.18),dark=mat(0x293248),skin=mat(0xe8bd9b),cloth=mat(index%2?0x394c67:0x55405e);
const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.42,.65,5,9),armor);torso.position.y=1.35;torso.castShadow=true;group.add(torso);
const head=new THREE.Mesh(new THREE.SphereGeometry(.34,16,12),skin);head.position.y=2.12;head.castShadow=true;group.add(head);
const hair=new THREE.Mesh(new THREE.SphereGeometry(.36,12,8,0,Math.PI*2,0,Math.PI*.55),dark);hair.position.y=2.23;group.add(hair);
const cape=new THREE.Mesh(new THREE.ConeGeometry(.52,1.15,5),cloth);cape.position.set(0,1.15,.38);cape.rotation.x=-.12;group.add(cape);
for(const x of [-.23,.23]){const leg=new THREE.Mesh(new THREE.CapsuleGeometry(.16,.55,4,7),dark);leg.position.set(x,.48,0);leg.castShadow=true;group.add(leg);const arm=new THREE.Mesh(new THREE.CapsuleGeometry(.13,.52,4,7),armor);arm.position.set(x*2,1.45,0);arm.rotation.z=x<0?-.16:.16;group.add(arm)}
const aura=new THREE.Mesh(new THREE.RingGeometry(.48,.58,32),new THREE.MeshBasicMaterial({color:0xf6d18b,transparent:true,opacity:.7,side:THREE.DoubleSide}));aura.rotation.x=-Math.PI/2;aura.position.y=.035;group.add(aura);
group.userData={legs:group.children.filter((_,i)=>i===5||i===6)};return group}
function makeOther(p){const g=makeHero(p.character);g.position.set(p.x,0,p.z);scene.add(g);g.userData.name=p.name;return g}
let hero=null, heroName="Aventureiro", lastSend=0, clock=new THREE.Clock();
function start(){if(started)return;started=true;heroName=$("player-name").value.trim()||"Aventureiro";hero=makeHero(selected);scene.add(hero);$("select").classList.add("hidden");["hud","mobile-controls","chat-box","hint","player-tag"].forEach(id=>$(id).classList.remove("hidden"));$("hud-name").textContent=heroName;$("hud-class").textContent=characters[selected][1];$("hint").textContent="Analógico: andar • Arraste com outro dedo à direita: câmera";
socket=io();socket.on("connect",()=>{myId=socket.id;socket.emit("join",{name:heroName,character:selected})});socket.on("world:init",list=>{list.forEach(p=>{if(p.id!==myId)addPlayer(p)});updateOnline()});socket.on("player:joined",p=>{addPlayer(p);updateOnline();toast(`${p.name} chegou ao reino`)});
socket.on("player:moved",p=>{const q=players.get(p.id);if(q){q.target.set(p.x,0,p.z);q.group.rotation.y=p.rot}});
socket.on("player:left",id=>{const p=players.get(id);if(p){scene.remove(p.group);players.delete(id);updateOnline()}});
socket.on("chat",m=>{const d=document.createElement("div");d.innerHTML=`<b>${escapeHtml(m.name)}:</b> ${escapeHtml(m.text)}`;$("chat-lines").appendChild(d);$("chat-lines").scrollTop=99999});
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function addPlayer(p){if(players.has(p.id)||p.id===myId)return;players.set(p.id,{group:makeOther(p),target:new THREE.Vector3(p.x,0,p.z)})}
function updateOnline(){$("online").textContent=`${players.size+1} online`}
function toast(t){$("toast").textContent=t;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),1900)}
$("play").onclick=start;
$("chat-form").onsubmit=e=>{e.preventDefault();const v=$("chat-input").value.trim();if(v&&socket?.connected)socket.emit("chat",v);$("chat-input").value=""};
$("attack").onclick=()=>{if(hero){hero.rotation.y=yaw;toast("⚔ Golpe de treino!")}};
$("jump").onpointerdown=()=>{jumpUntil=performance.now()+480};
const joy=$("joystick"),stick=$("stick");let joyId=null;
joy.addEventListener("pointerdown",e=>{joyId=e.pointerId;joy.setPointerCapture(joyId);moveJoy(e)});
joy.addEventListener("pointermove",e=>{if(e.pointerId===joyId)moveJoy(e)});
function moveJoy(e){const r=joy.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let dx=e.clientX-cx,dy=e.clientY-cy,l=Math.hypot(dx,dy),max=38;if(l>max){dx=dx/l*max;dy=dy/l*max}stick.style.transform=`translate(${dx}px,${dy}px)`;move.x=dx/max;move.y=dy/max}
function endJoy(e){if(e.pointerId===joyId){joyId=null;move={x:0,y:0};stick.style.transform="translate(0,0)"}}
joy.addEventListener("pointerup",endJoy);joy.addEventListener("pointercancel",endJoy);
const canvas=renderer.domElement;
// A câmera é controlada por um segundo dedo na metade direita da tela.
canvas.addEventListener("pointerdown",e=>{
  if(e.pointerType==="mouse" || (e.pointerType==="touch" && e.clientX>innerWidth*.42 && e.clientY<innerHeight-105)){
    cameraPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture(e.pointerId);
  }
});
canvas.addEventListener("pointermove",e=>{const prev=cameraPointers.get(e.pointerId);if(!prev)return;const dx=e.clientX-prev.x,dy=e.clientY-prev.y;yaw-=dx*.006;pitch=Math.max(-.12,Math.min(.9,pitch+dy*.004));cameraPointers.set(e.pointerId,{x:e.clientX,y:e.clientY})});
function endCamera(e){cameraPointers.delete(e.pointerId)}
canvas.addEventListener("pointerup",endCamera);canvas.addEventListener("pointercancel",endCamera);
addEventListener("keydown",e=>{keys[e.key.toLowerCase()]=true});addEventListener("keyup",e=>{keys[e.key.toLowerCase()]=false});
addEventListener("resize",()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.6))});
function canOccupy(x,z){
  const radius=.43;
  if(x < -34+radius || x > 34-radius || z < -34+radius || z > 34-radius)return false;
  for(const c of colliders){
    if(c.type==="circle"){const dx=x-c.x,dz=z-c.z;if(dx*dx+dz*dz < (c.r+radius)*(c.r+radius))return false}
    else if(Math.abs(x-c.x)<c.hx+radius && Math.abs(z-c.z)<c.hz+radius)return false;
  }
  return true;
}
function updateDayNight(time){
  const cycle=(time/180)%(Math.PI*2),sunHeight=Math.sin(cycle-Math.PI/2);
  const daylight=THREE.MathUtils.clamp((sunHeight+.18)/.72,0,1);
  const dawn=Math.max(0,1-Math.abs(sunHeight)*5)*(1-daylight);
  const sky=nightSky.clone().lerp(daySky,daylight).lerp(dawnSky,dawn*.65);
  scene.background.copy(sky);scene.fog.color.copy(sky);
  hemi.intensity=.38+daylight*1.65;sun.intensity=.12+daylight*2.35;
  sun.color.setRGB(1,.72+.25*daylight,.55+.4*daylight);
  sun.position.set(Math.cos(cycle)*24,Math.max(2,sunHeight*30),Math.sin(cycle)*20);
}
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.04),t=clock.elapsedTime;updateDayNight(t);
if(hero){let ix=move.x+(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0),iy=move.y+(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0);let len=Math.hypot(ix,iy);if(len>1){ix/=len;iy/=len}const speed=5.2;const forward=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw)),right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));const vx=(right.x*ix+forward.x*(-iy))*speed*dt,vz=(right.z*ix+forward.z*(-iy))*speed*dt;// Colisão por eixo: encosta nas paredes e ainda permite deslizar ao longo delas.
const nextX=hero.position.x+vx,nextZ=hero.position.z+vz;
if(canOccupy(nextX,hero.position.z))hero.position.x=nextX;
if(canOccupy(hero.position.x,nextZ))hero.position.z=nextZ;
if(Math.abs(ix)+Math.abs(iy)>.08)hero.rotation.y=Math.atan2(vx,vz);hero.position.y=performance.now()<jumpUntil?Math.sin((jumpUntil-performance.now())/480*Math.PI)*.85:0;
const desired=new THREE.Vector3(hero.position.x+Math.sin(yaw)*Math.cos(pitch)*8,hero.position.y+3+Math.sin(pitch)*8,hero.position.z+Math.cos(yaw)*Math.cos(pitch)*8);camera.position.lerp(desired,1-Math.exp(-7*dt));camera.lookAt(hero.position.x,hero.position.y+1.25,hero.position.z);
if(socket?.connected&&performance.now()-lastSend>75){socket.volatile.emit("move",{x:hero.position.x,z:hero.position.z,rot:hero.rotation.y});lastSend=performance.now()}}
for(const p of players.values())p.group.position.lerp(p.target,1-Math.exp(-12*dt));
renderer.render(scene,camera)}
camera.position.set(0,5,9);animate();
