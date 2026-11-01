// Headless check of the back stairs: walks DOWN from the terrace and UP from the ground with the
// same rules as player.js (run:  node tests/spiral_climb_descend_sim.js)
const S={cx:-20.5,cz:12,r0:.4,r1:2.4,per:16,n:44,top:12};
const dA=Math.PI*2/S.per, rise=S.top/S.n, a0=0-((S.n-1)%S.per+.5)*dA, stepUp=.3;
function tread(x,z,feet){const dx=x-S.cx,dz=z-S.cz,r=Math.hypot(dx,dz); if(r<S.r0||r>S.r1)return null;
 let a=Math.atan2(dz,dx)-a0; a=((a%(2*Math.PI))+2*Math.PI)%(2*Math.PI); const sl=Math.min(S.per-1,Math.floor(a/dA)); let best=0;
 for(let i=sl;i<S.n;i+=S.per){const h=(i+1)*rise; if(h<=feet+stepUp&&h>best)best=h;} return best;}
function run(startX,startZ,fx,fz,keys,steps,label){
 let x=startX,z=startZ,feet=12,spDir=0,sp=false,log=[];
 for(let k=0;k<steps;k++){
  let mx=fx*0.05,mz=fz*0.05; const len=Math.hypot(mx,mz);
  const g=tread(x,z,feet); sp=g!==null;
  if(sp){const dx=x-S.cx,dz=z-S.cz,r=Math.hypot(dx,dz),rx=dx/r,rz=dz/r,tx=-rz,tz=rx,along=mx*tx+mz*tz,rad=mx*rx+mz*rz;
   const leaving=feet<.4&&rad>len*.6, fromTop=feet>=S.top-.3&&rad<-len*.25&&r<S.r1-.15, mid=feet>.05&&feet<S.top-.3&&!leaving;
   if(mid||fromTop){if(!spDir)spDir=feet>S.top-2?-1:1; let dir; if(keys.back&&!keys.forward)dir=-spDir; else if(keys.forward&&!keys.back)dir=spDir; else dir=spDir; const m=(S.r0+S.r1)/2+.05, pull=Math.max(-.5,Math.min(.5,(m-r)*.6))*len; mx=tx*dir*len+rx*(rad*.15+pull); mz=tz*dir*len+rz*(rad*.15+pull);}
  } else spDir=0;
  x+=mx; z+=mz; const g2=tread(x,z,feet);
  if(g2!==null){ if(g2>feet+stepUp+1e-9){x-=mx;z-=mz;} else feet=g2; } else if(x>-18.1&&x<-14.9&&Math.abs(z-12)<1.2) feet=12; else feet=Math.max(0,feet-0.2);
  if(k%200===0)log.push(feet.toFixed(2));
  if(feet<=0.01&&k>20){console.log(label,'reached ground after',k,'steps; pos',x.toFixed(1),z.toFixed(1));return;}
 }
 console.log(label,'did NOT reach ground; feet',feet.toFixed(2),'pos',x.toFixed(2),z.toFixed(2),log.join(' '));
}
run(-17,12,-1,0,{forward:true},3000,'descend W facing in');

// climbing from the bottom
function climb(){let x=-17.3,z=12+2.3,feet=0,spDir=0;
 // start outside, walk to the first tread: emulate by direct placing on tread 0 area
 x=S.cx+2.0*Math.cos(a0+0.3*dA); z=S.cz+2.0*Math.sin(a0+0.3*dA); feet=0.27;
 for(let k=0;k<4000;k++){let mx=0.05*Math.cos(0.3),mz=0.05*Math.sin(0.3); const len=.05;
  const dx=x-S.cx,dz=z-S.cz,r=Math.hypot(dx,dz),rx=dx/r,rz=dz/r,tx=-rz,tz=rx,rad=mx*rx+mz*rz;
  const mid=feet>.05&&feet<S.top-.3; if(mid){ if(!spDir)spDir=feet>S.top-2?-1:1; const m=(S.r0+S.r1)/2+.05,pull=Math.max(-.5,Math.min(.5,(m-r)*.6))*len; mx=tx*spDir*len+rx*(rad*.15+pull); mz=tz*spDir*len+rz*(rad*.15+pull);}
  x+=mx;z+=mz; const g=tread(x,z,feet); if(g!==null&&g<=feet+stepUp+1e-9)feet=Math.max(feet,g); 
  if(feet>=S.top-.3){console.log('climb reached top after',k,'steps');return;}}
 console.log('climb FAILED feet',feet.toFixed(2));}
climb();
