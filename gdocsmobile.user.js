// ==UserScript==
// @name         Highlight Google Docs for mobile
// @namespace    https://raw.githubusercontent.com/hooray804/octopus/refs/heads/main/gdocsmobile.user.js
// @version      2.0.0
// @description  모바일 웹사이트에서 지원하지 않는 기능인 텍스트 자동 검색, 강조 기능을 추가합니다.
// @author       hooray804
// @match        https://docs.google.com/document/d/*/mobilebasic*
// @homepage     https://github.com/hooray804/
// @downloadURL  https://raw.githubusercontent.com/hooray804/octopus/refs/heads/main/gdocsmobile.user.js
// @updateURL    https://raw.githubusercontent.com/hooray804/octopus/refs/heads/main/gdocsmobile.user.js
// @grant        none
// ==/UserScript==

(function(){
'use strict';
if(!CSS.highlights)return;

if(!document.getElementById('g_s')){
let s=document.createElement('style');
s.id='g_s';
s.textContent='::highlight(g_h){background-color:#ffeb3b!important;color:#000!important;font-weight:bold!important;padding:2px!important;border-radius:2px!important;box-shadow:0 0 5px rgba(0,0,0,0.2)!important;}::highlight(g_f){background-color:#ff9800!important;color:#fff!important;font-weight:bold!important;padding:2px!important;border-radius:2px!important;box-shadow:0 0 8px rgba(0,0,0,0.5)!important;}';
document.head.append(s);
}

let hl=[],ci=-1;

function gL(){
try{
let d=localStorage.getItem('gdocs_highlight_list');
if(!d)return[];
let p=JSON.parse(d);
if(!Array.isArray(p))return[];
return p.map(x=>{
if(typeof x==='string')return{text:x,isRegex:!1};
if(typeof x==='object'&&x!==null&&x.text)return{text:String(x.text),isRegex:!!x.isRegex};
return null;
}).filter(x=>x!==null&&x.text.trim()!=='');
}catch(e){return[];}
}

function sL(l){
localStorage.setItem('gdocs_highlight_list',JSON.stringify(l));
}

function aH(){
CSS.highlights.clear();
hl=[];ci=-1;
let l=gL();
if(l.length===0)return uN();

let p=[];
l.sort((a,b)=>b.text.length-a.text.length).forEach(x=>{
if(x.text.trim()==='')return;
if(x.isRegex){
try{new RegExp(x.text);p.push(`(?:${x.text})`);}catch(e){}
}else{
p.push(`(?:${x.text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`);
}
});

if(p.length===0)return uN();

let r;
try{r=new RegExp(p.join('|'),'g');}catch(e){return;}

let w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,{
acceptNode:n=>{
let pa=n.parentNode;
if(!pa)return NodeFilter.FILTER_REJECT;
let tg=pa.tagName;
if(tg==='SCRIPT'||tg==='STYLE')return NodeFilter.FILTER_REJECT;
if(pa.closest&&pa.closest('#g_m'))return NodeFilter.FILTER_REJECT;
if(n.textContent.trim()==='')return NodeFilter.FILTER_REJECT;
return NodeFilter.FILTER_ACCEPT;
}},!1);

let n,rg=[];
while(n=w.nextNode()){
let c=n.textContent;
r.lastIndex=0;
if(!r.test(c))continue;
r.lastIndex=0;
let m;
while((m=r.exec(c))!==null){
if(m[0].length===0){r.lastIndex++;continue;}
try{
let ra=document.createRange();
ra.setStart(n,m.index);
ra.setEnd(n,m.index+m[0].length);
rg.push(ra);
}catch(e){}
}
}

if(rg.length>0){
CSS.highlights.set('g_h',new Highlight(...rg));
hl=rg;
}
uN();
}

function uN(){
let t=document.getElementById('g_nt');
if(t)t.textContent=hl.length===0?'0 / 0':`${ci+1} / ${hl.length}`;
}

function nH(d){
if(hl.length===0)return;
ci+=d;
if(ci<0)ci=hl.length-1;
else if(ci>=hl.length)ci=0;

let tg=hl[ci];
CSS.highlights.set('g_f',new Highlight(tg));

let rc=tg.getBoundingClientRect();
if(rc.width>0||rc.height>0){
window.scrollTo({
top:(window.scrollY||window.pageYOffset)+rc.top-(window.innerHeight/2),
left:(window.scrollX||window.pageXOffset)+rc.left-(window.innerWidth/2),
behavior:'smooth'
});
}
uN();
}

function cM(){
if(document.getElementById('g_m'))return;
let hu=localStorage.getItem('g_hu');
if(hu&&Date.now()<parseInt(hu,10))return;

let m=document.createElement('div');
m.id='g_m';
m.style.cssText='position:fixed!important;bottom:0!important;left:0!important;width:100%!important;background:#fff!important;color:#000!important;padding:8px!important;box-sizing:border-box!important;z-index:999999!important;border-top:1px solid #000!important;display:flex!important;flex-direction:column!important;font-family:-apple-system,sans-serif!important;max-height:35vh!important;overflow-y:auto!important;margin:0!important;';

let ir=document.createElement('div');
ir.style.cssText='display:flex!important;gap:6px!important;align-items:center!important;width:100%!important;margin-bottom:6px!important;box-sizing:border-box!important;';

let i=document.createElement('input');
i.type='text';i.placeholder='단어/정규식 입력';
i.style.cssText='flex:1 1 0%!important;padding:4px 8px!important;box-sizing:border-box!important;border:1px solid #000!important;font-size:13px!important;color:#000!important;background:#fff!important;min-width:0!important;height:28px!important;outline:none!important;margin:0!important;';

let rl=document.createElement('label');
rl.style.cssText='display:flex!important;align-items:center!important;gap:4px!important;font-size:12px!important;color:#000!important;white-space:nowrap!important;cursor:pointer!important;margin:0!important;padding:0!important;height:28px!important;font-weight:600!important;';

let rc=document.createElement('input');
rc.type='checkbox';
rc.style.cssText='margin:0!important;width:14px!important;height:14px!important;accent-color:#000!important;';
rl.append(rc,document.createTextNode('Regex'));

let ab=document.createElement('button');
ab.textContent='추가';
ab.style.cssText='padding:0 12px!important;height:28px!important;background:#000!important;color:#fff!important;border:1px solid #000!important;cursor:pointer!important;font-size:13px!important;white-space:nowrap!important;font-weight:bold!important;margin:0!important;display:flex!important;align-items:center!important;justify-content:center!important;';
ir.append(i,rl,ab);

let lc=document.createElement('ul');
lc.style.cssText='display:flex!important;flex-wrap:wrap!important;gap:6px!important;margin:0 0 6px 0!important;padding:6px!important;list-style:none!important;max-height:100px!important;min-height:30px!important;overflow-y:auto!important;border:1px solid #000!important;background:#fff!important;box-sizing:border-box!important;width:100%!important;';

function rL(){
lc.innerHTML='';
let ls=gL();
if(ls.length===0){
let em=document.createElement('li');
em.textContent='등록된 단어가 없습니다.';
em.style.cssText='display:block!important;text-align:center!important;color:#000!important;font-size:12px!important;width:100%!important;padding:6px 0!important;font-weight:normal!important;line-height:1.5!important;border:none!important;background:transparent!important;margin:0!important;';
lc.append(em);return;
}
ls.forEach((x,idx)=>{
let rw=document.createElement('li');
rw.style.cssText='display:flex!important;justify-content:space-between!important;align-items:center!important;background:#fff!important;padding:4px 6px!important;margin:0!important;font-size:12px!important;border:1px solid #000!important;box-sizing:border-box!important;width:calc((100% - 12px) / 3)!important;flex-shrink:0!important;height:24px!important;';
let ts=document.createElement('span');
ts.textContent=(x.isRegex?'[R] ':'')+x.text;
ts.style.cssText='display:block!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;flex:1 1 0%!important;min-width:0!important;margin-right:4px!important;color:#000!important;font-weight:600!important;text-align:left!important;line-height:1.2!important;';
let db=document.createElement('button');
db.textContent='✕';
db.style.cssText='background:#000!important;color:#fff!important;border:none!important;cursor:pointer!important;padding:0!important;width:16px!important;height:16px!important;font-size:10px!important;font-weight:bold!important;flex-shrink:0!important;display:flex!important;align-items:center!important;justify-content:center!important;margin:0!important;';
db.onclick=()=>{ls.splice(idx,1);sL(ls);rL();aH();};
rw.append(ts,db);lc.append(rw);
});
}

ab.onclick=()=>{
let v=i.value.trim();
if(v!==''){
if(rc.checked){
try{new RegExp(v);}catch(e){alert('잘못된 정규식입니다:\n'+e.message);return;}
}
let ls=gL();
ls.push({text:v,isRegex:rc.checked});
sL(ls);i.value='';rL();aH();
}
};

let br=document.createElement('div');
br.style.cssText='display:flex!important;gap:6px!important;align-items:center!important;justify-content:space-between!important;width:100%!important;box-sizing:border-box!important;flex-wrap:nowrap!important;';

let ng=document.createElement('div');
ng.style.cssText='display:flex!important;gap:6px!important;align-items:center!important;background:#fff!important;border:1px solid #000!important;padding:2px 6px!important;flex:1!important;justify-content:center!important;';

let pb=document.createElement('button');
pb.textContent='◀';
pb.style.cssText='padding:0 12px!important;height:24px!important;background:#000!important;color:#fff!important;border:none!important;cursor:pointer!important;font-size:12px!important;font-weight:bold!important;margin:0!important;display:flex!important;align-items:center!important;justify-content:center!important;';
pb.onclick=()=>nH(-1);

let nt=document.createElement('span');
nt.id='g_nt';nt.textContent='0 / 0';
nt.style.cssText='font-size:13px!important;min-width:50px!important;text-align:center!important;font-weight:bold!important;color:#000!important;flex-shrink:0!important;display:block!important;';

let nb=document.createElement('button');
nb.textContent='▶';
nb.style.cssText='padding:0 12px!important;height:24px!important;background:#000!important;color:#fff!important;border:none!important;cursor:pointer!important;font-size:12px!important;font-weight:bold!important;margin:0!important;display:flex!important;align-items:center!important;justify-content:center!important;';
nb.onclick=()=>nH(1);
ng.append(pb,nt,nb);

let bg=document.createElement('div');
bg.style.cssText='display:flex!important;gap:6px!important;flex-shrink:0!important;';

let cb=document.createElement('button');
cb.textContent='닫기';
cb.style.cssText='padding:0 12px!important;height:24px!important;background:#000!important;color:#fff!important;border:none!important;cursor:pointer!important;font-size:12px!important;font-weight:bold!important;margin:0!important;display:flex!important;align-items:center!important;justify-content:center!important;';
cb.onclick=()=>m.style.display='none';

let hb=document.createElement('button');
hb.textContent='7일 숨김';
hb.style.cssText='padding:0 12px!important;height:24px!important;background:#000!important;color:#fff!important;border:none!important;cursor:pointer!important;font-size:12px!important;font-weight:bold!important;margin:0!important;display:flex!important;align-items:center!important;justify-content:center!important;';
hb.onclick=()=>{localStorage.setItem('g_hu',Date.now()+604800000);m.style.display='none';};

bg.append(cb,hb);br.append(ng,bg);m.append(ir,lc,br);document.body.append(m);

rL();
}

window.addEventListener('load',()=>{aH();cM();});
setTimeout(()=>{aH();cM();},200);
})();
