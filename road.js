class Road{
  constructor(width=460){
    this.width=width;this.left=-width/2;this.right=width/2;this.top=-100000;this.bottom=100000;
    this.borders=[
      [{x:this.left,y:this.top},{x:this.left,y:this.bottom}],
      [{x:this.right,y:this.top},{x:this.right,y:this.bottom}]
    ];
  }
  draw(ctx,viewWidth){
    ctx.save();
    ctx.fillStyle='#5b5d60';ctx.fillRect(this.left,this.top,this.width,this.bottom-this.top);
    ctx.strokeStyle='#b8b9ba';ctx.lineWidth=6;ctx.setLineDash([]);
    for(const b of this.borders){ctx.beginPath();ctx.moveTo(b[0].x,b[0].y);ctx.lineTo(b[1].x,b[1].y);ctx.stroke();}
    // No lane markings: add subtle patches/textures to reinforce unstructured-road conditions.
    ctx.fillStyle='rgba(20,20,20,.12)';
    for(let y=Math.floor(-1000/110)*110;y<=1000;y+=110){
      const x=((y*37)%300)-150;ctx.fillRect(x,y,Math.abs(((y*13)%45))+18,5);
    }
    ctx.fillStyle='rgba(230,214,145,.24)';
    for(const x of [this.left+17,this.right-17]){ctx.fillRect(x,this.top,2,this.bottom-this.top);}
    ctx.restore();
  }
  clampX(x,margin=24){return clamp(x,this.left+margin,this.right-margin)}
}
