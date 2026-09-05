function lerp(a,b,t){return a+(b-a)*t}
function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function smoothstep(t){t=clamp(t,0,1);return t*t*(3-2*t)}
function getIntersection(A,B,C,D){
  const tTop=(D.x-C.x)*(A.y-C.y)-(D.y-C.y)*(A.x-C.x)
  const uTop=(C.y-A.y)*(A.x-B.x)-(C.x-A.x)*(A.y-B.y)
  const bottom=(D.y-C.y)*(B.x-A.x)-(D.x-C.x)*(B.y-A.y)
  if(bottom!==0){
    const t=tTop/bottom,u=uTop/bottom
    if(t>=0&&t<=1&&u>=0&&u<=1)return {x:lerp(A.x,B.x,t),y:lerp(A.y,B.y,t),offset:t}
  }
  return null
}
function polysIntersect(poly1,poly2){
  for(let i=0;i<poly1.length;i++)for(let j=0;j<poly2.length;j++){
    if(getIntersection(poly1[i],poly1[(i+1)%poly1.length],poly2[j],poly2[(j+1)%poly2.length]))return true
  }
  return false
}
function rectPolygon(x,y,w,h,angle=0){
  const pts=[]; const r=Math.hypot(w,h)/2; const a=Math.atan2(w,h)
  const defs=[angle-a,angle+a,Math.PI+angle-a,Math.PI+angle+a]
  for(const t of defs)pts.push({x:x-Math.sin(t)*r,y:y-Math.cos(t)*r})
  return pts
}
function fmt(n,d=1){return Number.isFinite(n)?n.toFixed(d):'—'}
