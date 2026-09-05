const AGENT_COLORS={CAR:'#e85d5d',AUTO:'#f0a83c',BIKE:'#7ca7ff',BUS:'#bf74ea',TRUCK:'#9a7a68',PEDESTRIAN:'#f7e06d',CATTLE:'#c8926f',PUSHCART:'#d5a1d9'};
const AGENT_LABELS={CAR:'CAR',AUTO:'AUTO',BIKE:'BIKE',BUS:'BUS',TRUCK:'TRUCK',PEDESTRIAN:'PED',CATTLE:'CATTLE',PUSHCART:'CART'};
class TrafficAgent{
  constructor(type,x,y,opts={}){
    this.type=type;this.x=x;this.y=y;this.width=opts.width||24;this.height=opts.height||42;
    this.speedX=opts.speedX||0;this.speedY=opts.speedY??-(opts.speed||1.3);this.baseSpeed=Math.abs(this.speedY);
    this.phase=Math.random()*10;this.startY=y;this.activeAt=opts.activeAt||0;this.color=AGENT_COLORS[type]||'#ccc';
    this.behavior=opts.behavior||'forward';this.polygon=rectPolygon(x,y,this.width,this.height,0);this.visible=this.activeAt===0;
  }
  update(elapsedMs,road,ego){
    if(elapsedMs<this.activeAt){this.visible=false;return;}
    // Once an actor has safely fallen well behind the ego vehicle, remove it
    // from the active scene so it cannot cause a false rear-side interference.
    if(this.y > ego.y + 300){this.visible=false;return;}
    this.visible=true;
    if(this.behavior==='sine')this.x+=Math.sin(elapsedMs*.0025+this.phase)*.42;
    if(this.behavior==='wander'){
      this.x+=Math.sin(elapsedMs*.003+this.phase)*.72;
      this.speedY=-this.baseSpeed*(0.85+0.18*Math.sin(elapsedMs*.002+this.phase));
    }
    if(this.behavior==='cross'){this.x+=this.speedX;this.y+=this.speedY;}
    else if(this.behavior==='merge'){this.x+=this.speedX;this.y+=this.speedY;this.speedX=lerp(this.speedX,0,.01);}
    else if(this.behavior==='cattle'){this.x+=this.speedX;this.y+=this.speedY;}
    else this.y+=this.speedY;
    this.x=clamp(this.x,road.left+20,road.right-20);
    this.polygon=rectPolygon(this.x,this.y,this.width,this.height,0);
  }
  draw(ctx){
    if(!this.visible)return;
    ctx.save();ctx.translate(this.x,this.y);ctx.fillStyle=this.color;
    if(this.type==='PEDESTRIAN'){
      ctx.beginPath();ctx.arc(0,0,this.width*.48,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='rgba(20,30,40,.7)';ctx.lineWidth=2;ctx.stroke();
    }else if(this.type==='CATTLE'){
      ctx.beginPath();ctx.ellipse(0,0,this.width*.7,this.height*.45,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#f5e1c0';ctx.beginPath();ctx.moveTo(-this.width*.42,-this.height*.24);ctx.lineTo(-this.width*.7,-this.height*.5);ctx.lineTo(-this.width*.55,-this.height*.18);ctx.fill();
      ctx.fillStyle='#2a231c';ctx.beginPath();ctx.arc(this.width*.36,-this.height*.05,2.5,0,Math.PI*2);ctx.fill();
    }else{
      ctx.fillRect(-this.width/2,-this.height/2,this.width,this.height);
      ctx.fillStyle='rgba(255,255,255,.42)';ctx.fillRect(-this.width*.27,-this.height*.22,this.width*.54,this.height*.2);
      ctx.fillStyle='rgba(10,15,25,.35)';ctx.fillRect(-this.width*.46,this.height*.27,this.width*.92,this.height*.12);
    }
    ctx.fillStyle='rgba(255,255,255,.88)';ctx.font='bold 9px Segoe UI';ctx.textAlign='center';ctx.fillText(AGENT_LABELS[this.type]||this.type,0,-this.height*.68);
    ctx.restore();
  }
}
