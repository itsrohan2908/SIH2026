class Sensor{
  constructor(car){this.car=car;this.rayCount=11;this.rayLength=220;this.raySpread=Math.PI*0.82;this.rays=[];this.readings=[];}
  update(road,traffic){this.#castRays();this.readings=[];for(const ray of this.rays)this.readings.push(this.#getReading(ray,road.borders,traffic));}
  #getReading(ray,borders,traffic){
    const touches=[];
    for(const b of borders){const t=getIntersection(ray[0],ray[1],b[0],b[1]);if(t)touches.push({...t,type:'border'});}
    for(const obj of traffic){if(!obj.visible)continue;const poly=obj.polygon;for(let j=0;j<poly.length;j++){const t=getIntersection(ray[0],ray[1],poly[j],poly[(j+1)%poly.length]);if(t)touches.push({...t,type:obj.type,object:obj});}}
    if(!touches.length)return null;touches.sort((a,b)=>a.offset-b.offset);return touches[0];
  }
  #castRays(){
    this.rays=[];
    for(let i=0;i<this.rayCount;i++){
      const t=this.rayCount===1?.5:i/(this.rayCount-1);
      const rayAngle=lerp(this.raySpread/2,-this.raySpread/2,t)+this.car.angle;
      const start={x:this.car.x,y:this.car.y};
      const end={x:this.car.x-Math.sin(rayAngle)*this.rayLength,y:this.car.y-Math.cos(rayAngle)*this.rayLength};
      this.rays.push([start,end]);
    }
  }
  getObstacleObservations(traffic){
    const out=[];
    for(const o of traffic){
      if(!o.visible)continue;
      const dx=o.x-this.car.x,dy=o.y-this.car.y;const longitudinal=-dy;
      const lateral=Math.abs(dx);
      if(longitudinal>-120&&longitudinal<250&&lateral<250){
        out.push({object:o,distance:Math.hypot(dx,dy),longitudinal,lateral,relativeSpeed:(this.car.speed-(-o.speedY)),type:o.type});
      }
    }
    return out.sort((a,b)=>a.longitudinal-b.longitudinal);
  }
  draw(ctx){
    for(let i=0;i<this.rays.length;i++){
      const ray=this.rays[i],end=this.readings[i]||ray[1];
      ctx.beginPath();ctx.lineWidth=1.5;ctx.strokeStyle=this.readings[i]?'rgba(255,225,90,.8)':'rgba(255,225,90,.28)';ctx.moveTo(ray[0].x,ray[0].y);ctx.lineTo(end.x,end.y);ctx.stroke();
    }
  }
}
