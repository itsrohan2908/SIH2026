const canvas=document.getElementById('simCanvas');
const ctx=canvas.getContext('2d');
const select=document.getElementById('scenarioSelect');
const resetBtn=document.getElementById('resetBtn');
let W=0,H=0,road,ego,traffic,planner,scenario,scenarioStart=0,lastTime=performance.now(),completed=false,collisions=0,closest=Infinity,minClearance=Infinity;
let lastPathChange=0;
function resize(){W=canvas.clientWidth;H=canvas.clientHeight;const dpr=window.devicePixelRatio||1;canvas.width=Math.max(1,Math.floor(W*dpr));canvas.height=Math.max(1,Math.floor(H*dpr));ctx.setTransform(dpr,0,0,dpr,0,0);}
window.addEventListener('resize',resize);resize();
function reset(name=select.value){
  scenario=name;scenarioStart=performance.now();lastTime=scenarioStart;completed=false;collisions=0;closest=Infinity;minClearance=Infinity;lastPathChange=0;
  road=new Road(Math.min(620,Math.max(560,W*.66)));ego=new Car(0,420,30,52,road);traffic=makeScenario(name,road);planner=new AdaptivePlanner(road);
  updateUI({risk:'LOW',mode:'CRUISE',path:'CENTER',costs:{LEFT:0,CENTER:0,RIGHT:0},objects:0,closest:Infinity,minClearance:Infinity});
}
reset();select.addEventListener('change',()=>reset(select.value));resetBtn.addEventListener('click',()=>reset());
function screenY(worldY){return H*.72+(worldY-ego.y);}
function drawWorld(){
  ctx.clearRect(0,0,W,H);ctx.fillStyle='#174c2a';ctx.fillRect(0,0,W,H);
  ctx.save();ctx.translate(W/2,0);road.draw(ctx,W);
  const y0=ego.y-900,y1=ego.y+400;
  for(let y=Math.floor(y0/120)*120;y<=y1;y+=120){drawTree(ctx,road.left-45,y);drawShop(ctx,road.right+55,y+35);}
  const observations=ego.sensor.getObstacleObservations(traffic);drawPredictedTrajectories();drawRiskRegions(observations);drawCandidatePaths();
  for(const o of traffic)o.draw(ctx);ego.draw(ctx);drawGoal(ctx);drawRoadLabels(ctx);ctx.restore();
}
function drawTree(ctx,x,y){ctx.save();ctx.translate(x,y);ctx.fillStyle='#5d3b22';ctx.fillRect(-3,5,6,18);ctx.fillStyle='#2f8c47';ctx.beginPath();ctx.arc(0,0,18,0,Math.PI*2);ctx.fill();ctx.restore();}
function drawShop(ctx,x,y){ctx.save();ctx.translate(x,y);ctx.fillStyle='#d5b38b';ctx.fillRect(-18,-12,36,24);ctx.fillStyle='#e85b5b';ctx.fillRect(-18,-12,36,5);ctx.restore();}
function drawRoadLabels(ctx){
  ctx.save();ctx.fillStyle='rgba(255,255,255,.42)';ctx.font='11px Segoe UI';ctx.fillText('UNMARKED / MIXED TRAFFIC CORRIDOR',road.left+22,ego.y-300);ctx.fillText('NO FIXED LANE ASSUMPTION',road.left+22,ego.y-282);ctx.restore();
}
function drawPredictedTrajectories(){
  // Visualizes the same future trajectories used by the planner. Every moving
  // road user is projected forward at fixed time steps; the ego planner compares
  // its candidate trajectory against these projected paths.
  for(const o of traffic){
    if(!o.visible)continue;
    ctx.save();
    ctx.strokeStyle='rgba(255,255,255,.18)';
    ctx.lineWidth=1.2;
    ctx.setLineDash([4,6]);
    ctx.beginPath();
    for(let k=0;k<=18;k++){
      const frame=k*7;
      const px=o.x+o.speedX*frame;
      const py=o.y+o.speedY*frame;
      if(px<road.left-80||px>road.right+80)continue;
      if(k===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
    }
    ctx.stroke();
    ctx.restore();
  }
}

function drawRiskRegions(observations){
  for(const o of observations){
    const r=Math.max(34,o.object.width+28);let fill='rgba(70,210,120,.11)';
    if(o.distance<90)fill='rgba(255,80,80,.22)';else if(o.distance<150)fill='rgba(255,175,60,.18)';
    ctx.beginPath();ctx.fillStyle=fill;ctx.arc(o.object.x,o.object.y,r,0,Math.PI*2);ctx.fill();
  }
}
function drawCandidatePaths(){
  const names=['LEFT','CENTER','RIGHT'];
  names.forEach((n)=>{
    const pts=planner.getPathPoints(ego,n);
    const safe=planner.feasibility[n];
    ctx.save();
    ctx.strokeStyle=n===planner.currentPath?'#5ee7ff':safe?'rgba(150,190,205,.26)':'rgba(255,90,90,.34)';
    ctx.lineWidth=n===planner.currentPath?3:1;
    ctx.setLineDash(n===planner.currentPath?[]:[5,7]);
    ctx.beginPath();
    pts.forEach((p,i)=>{if(i===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);});
    ctx.stroke();
    ctx.restore();
  });
}
function drawGoal(ctx){ctx.save();ctx.strokeStyle='rgba(255,255,255,.5)';ctx.lineWidth=2;ctx.setLineDash([6,8]);ctx.beginPath();ctx.moveTo(road.left+25,ego.y-900);ctx.lineTo(road.right-25,ego.y-900);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='rgba(255,255,255,.6)';ctx.font='11px Segoe UI';ctx.fillText('GOAL',road.right-55,ego.y-908);ctx.restore();}
function update(now){
  const dt=Math.min(40,now-lastTime);lastTime=now;
  const elapsed=now-scenarioStart;
  for(const o of traffic)o.update(elapsed,road,ego);
  const obs=ego.sensor.getObstacleObservations(traffic);const beforePath=planner.currentPath;const decision=planner.plan(ego,obs,now);
  if(beforePath!==decision.path){lastPathChange=now;}
  // The planner is the single source of lateral intent. It already evaluates
  // the complete predicted trajectory of ego + obstacles, so we do not apply a
  // second moving lateral target here. That avoids accidentally following an
  // obstacle's motion.
  ego.targetX=decision.targetX;
  ego.emergencyBrake=decision.emergencyBrake;

  // Slow early when risk rises; stop only when no feasible corridor exists.
  if(decision.noSafePath){
    ego.targetSpeed=0;
  }else if(decision.risk==='HIGH'){
    ego.targetSpeed=0.95;
  }else if(decision.risk==='MEDIUM'){
    ego.targetSpeed=1.95;
  }else{
    ego.targetSpeed=3.15;
  }
  ego.update(road,traffic,dt);
  if(ego.damaged)collisions=1;
  for(const o of traffic){if(!o.visible)continue;const clearance=Math.max(0,dist(ego,o)-(ego.width+o.width)/2);minClearance=Math.min(minClearance,clearance);}
  if(obs.length)closest=obs[0].distance;
  // A scenario is considered completed after a full evaluation window without collision.
  if(elapsed>=10000&&!collisions&&!completed)completed=true;
  drawWorld();
  updateUI({risk:decision.risk,mode:collisions?'STOP':decision.risk==='HIGH'?'REPLANNING':decision.risk==='MEDIUM'?'AVOID':'CRUISE',path:decision.path,costs:decision.costs,objects:obs.length,closest,minClearance});
  requestAnimationFrame(update);
}
function updateUI(v){
  document.getElementById('decisionStatus').textContent=v.mode||'—';
  document.getElementById('mScenario').textContent=(select.options[select.selectedIndex]?.text||scenario).split('•').pop().trim();
  document.getElementById('mMode').textContent=v.mode||'—';document.getElementById('mRisk').textContent=v.risk||'—';document.getElementById('mPath').textContent=v.path||'—';
  document.getElementById('mObjects').textContent=v.objects??0;document.getElementById('mClosest').textContent=Number.isFinite(v.closest)?fmt(v.closest,0)+' px':'—';
  document.getElementById('mClearance').textContent=Number.isFinite(v.minClearance)?fmt(v.minClearance,0)+' px':'—';document.getElementById('mReplans').textContent=planner?planner.replans:0;
  document.getElementById('mLatency').textContent=planner&&planner.lastLatency>=0?fmt(planner.lastLatency,2)+' ms':'—';document.getElementById('costLeft').textContent=v.costs?fmt(v.costs.LEFT,1):'—';document.getElementById('costCenter').textContent=v.costs?fmt(v.costs.CENTER,1):'—';document.getElementById('costRight').textContent=v.costs?fmt(v.costs.RIGHT,1):'—';
  document.getElementById('mCollisions').textContent=collisions;document.getElementById('mDistance').textContent=fmt(ego?.distanceTravelled||0,0)+' px';document.getElementById('mCompletion').textContent=completed?'SUCCESS':'RUNNING';
}
requestAnimationFrame(update);
