import { randomInt, randomUUID } from "node:crypto"

const wires = [
  ["Elon Musk", "The robotaxi just gave me one star. Apparently I talked too much.", 4],
  ["Albert Wang", "Revised my Tesla target after checking the parking lot. Three Teslas. Four if Mr. Garcia comes back from lunch.", -3],
  ["Jensen Huang", "Tesla asked for more GPUs. I said yes. My jacket now has a waiting list.", 5],
  ["Albert Wang", "The bull case assumes every robotaxi carries a passenger. Mine is circling the school looking for visitor parking.", -4],
  ["Elon Musk", "New software update lets your Tesla parallel park. It has asked me to get out first.", 3],
  ["Jensen Huang", "Our chips can simulate ten million miles of driving. We still use a human to back the delivery truck in.", -2],
  ["Albert Wang", "My model has twelve tabs. Eleven are the lunch menu. Raising my price target.", 3],
  ["Elon Musk", "Production update: the robot that builds the robots has requested a manager.", -5],
] as const
type Desk={name:string,cash:number,position:number,last:number}
type Market={id:string,host:string,solo:boolean,born:number,start:number,tick:number,history:number[],flow:number,deck:number[],desks:Map<string,Desk>,listeners:Set<()=>void>}
const memory=globalThis as typeof globalThis & {bellRooms?:Map<string,Market>}
const rooms=memory.bellRooms??=new Map()
const ensure=(ok:unknown,message:string)=>{if(!ok)throw Error(message)}
const fresh=(name:string):Desk=>({name,cash:0,position:0,last:-1})
const quote=(r:Market)=>r.history[r.history.length-1]
const beat=(r:Market)=>Math.min(3,Math.floor(r.tick/12))
export function create(solo:boolean){
 for(const [id,r] of rooms) if(Date.now()-r.born>14400000)rooms.delete(id)
 ensure(rooms.size<100,"The floor is full. Try later.")
 let id:string;do{id=String(randomInt(10000,100000))}while(rooms.has(id))
 const host=randomUUID(), deck=[randomInt(2)*4,1+randomInt(2)*2,2+randomInt(2)*3,6+randomInt(2)]
 const r:Market={id,host,solo,born:Date.now(),start:0,tick:0,history:[100],flow:0,deck,desks:new Map(),listeners:new Set()}
 if(solo){r.desks.set(host,fresh("Your desk"));for(const n of ["Margin Call Saul","Buy High LLC","Lunch Money"])r.desks.set(n,fresh(n))}
 rooms.set(id,r);return {r,token:host}
}
export function find(id:string){const r=rooms.get(id);if(!r)throw Error("Room expired. Open a new floor.");advance(r);return r}
function notify(r:Market){for(const fn of r.listeners)fn()}
export function join(r:Market,name:string){
 name=name.trim().slice(0,22)
 ensure(!r.start && !r.solo && r.desks.size<40,"This floor has closed admissions.")
 ensure(name&&!Array.from(r.desks.values()).some(d=>d.name.toLowerCase()===name.toLowerCase()),"Choose a unique desk name.")
 const token=randomUUID();r.desks.set(token,fresh(name));notify(r);return token
}
export function open(r:Market,token:string){ensure(r.host===token&&!r.start&&r.desks.size,"Seat a desk before opening the floor.");r.start=Date.now();notify(r)}
function fill(r:Market,d:Desk,target:number){
 const qty=target-d.position
 d.cash-=qty*quote(r)+Math.abs(qty)*0.25
 d.position=target;r.flow+=qty
}
function advance(r:Market){
 if(!r.start)return
 const due=Math.min(48,Math.floor((Date.now()-r.start)/2000))
 if(due<=r.tick)return
 while(r.tick<due){
 const turn=r.tick%12,news=wires[r.deck[beat(r)]][2]
 if(r.solo && turn%3===0)for(const [id,d] of r.desks)if(id!==r.host)fill(r,d,randomInt(-3,4))
 const gap=quote(r)-100
 const impulse=turn<3?news/2:0
 const drift=gap*(r.tick<24?-0.14:0.035)
 const delta=drift+impulse+1.2*r.flow/Math.max(1,r.desks.size)+randomInt(-45,46)/100
 r.history.push(Math.round(Math.max(5,quote(r)+delta)*100)/100)
 r.tick++;r.flow=0
 }
 notify(r)
}
export function trade(r:Market,token:string,target:number,tick:number){
 const d=r.desks.get(token)
 if(!d)throw Error("Join a trading desk first.")
 ensure(r.start && r.tick<48 && tick===r.tick,"Quote changed. Try your trade again.")
 ensure([-3,0,3].includes(target)&&d.last!==r.tick,"One position change per quote.")
 fill(r,d,target);d.last=r.tick;notify(r)
}
export function snapshot(r:Market,token:string){
 const d=r.desks.get(token)
 const pnl=(d:Desk)=>Math.round((d.cash+d.position*quote(r))*100)/100
 return {id:r.id,host:r.host===token,solo:r.solo,start:r.start,tick:r.tick,history:r.history,rank:Array.from(r.desks.values(),d=>({name:d.name,pnl:pnl(d)})).sort((a,b)=>b.pnl-a.pnl),
 me:d?{name:d.name,position:d.position,pnl:pnl(d),last:d.last}:null,
 feed:r.start?r.deck.slice(0,beat(r)+1).map((id,i)=>({author:wires[id][0],text:wires[id][1],bell:i+1})).reverse():[]}
}
export type Frame=ReturnType<typeof snapshot>
export function subscribe(r:Market,fn:()=>void){r.listeners.add(fn);const t=setInterval(()=>advance(r),350);return ()=>{clearInterval(t);r.listeners.delete(fn)}}
