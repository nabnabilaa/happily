// @ts-nocheck
"use client";

import React, { useEffect, useRef, useState } from 'react';
import './OnboardingScreen.css';
import BeeMascot from '@/components/ui/BeeMascot';
import { useHP } from '@/lib/HPContext';

export default function OnboardingScreen({ userName, onFinish, skipSplash, previewConfig }: { userName?: string, onFinish?: (data: { job: string }) => void, skipSplash?: boolean, previewConfig?: any[] }) {
    const { state } = useHP();
    const containerRef = useRef<HTMLDivElement>(null);
    const [buddyMood, setBuddyMood] = useState<'neutral'|'happy'|'sad'|'angry'>('neutral');
    const [clickCount, setClickCount] = useState(0);
    const [buddyMsg, setBuddyMsg] = useState('Hai! Senang ketemu kamu 🤜\nAku Buddy, bantu harimu lebih produktif!');
    const [isHovering, setIsHovering] = useState(false);

    useEffect(() => {
        if (!containerRef.current) return;
        
        // Scope DOM selections to container
        const $ = (id) => containerRef.current?.querySelector('#'+id);
        const $$ = (sel) => containerRef.current?.querySelectorAll(sel);
        
        
/* ══ UTILS ══ */

const A=(el,kf,o)=>{ if(!el) return { onfinish: ()=>{} }; return el.animate(kf,{fill:'forwards',...o}); };
const fu=(el,d=0,dur=450)=>A(el,[{opacity:0,transform:'translateY(16px)'},{opacity:1,transform:'none'}],{duration:dur,delay:d,easing:'cubic-bezier(.34,1.2,.64,1)'});
const sc=(el,d=0,dur=550)=>A(el,[{opacity:0,transform:'scale(.3) rotate(-20deg)'},{opacity:1,transform:'scale(1) rotate(0)'}],{duration:dur,delay:d,easing:'cubic-bezier(.34,1.56,.64,1)'});
const sli=(el,d=0)=>A(el,[{opacity:0,transform:'translateX(-22px)'},{opacity:1,transform:'none'}],{duration:380,delay:d,easing:'cubic-bezier(.34,1.2,.64,1)'});

function wipeTransition(fn){
  const w=$('wipe');
  A(w,[{transform:'scaleX(0)',transformOrigin:'left'},{transform:'scaleX(1)',transformOrigin:'left'}],{duration:320,easing:'cubic-bezier(.7,0,.3,1)'}).onfinish=()=>{
    fn();
    A(w,[{transform:'scaleX(1)',transformOrigin:'right'},{transform:'scaleX(0)',transformOrigin:'right'}],{duration:320,delay:80,easing:'cubic-bezier(.7,0,.3,1)'});
  };
}

function showScreen(id,useFade=false){
  const curr=containerRef.current?.querySelector('.screen.active');
  const next=$(id);
  if(useFade){
    A(curr,[{opacity:1},{opacity:0,transform:'scale(.96)'}],{duration:280,fill:'forwards'}).onfinish=()=>{
      curr.classList.remove('active');next.classList.add('active');
      A(next,[{opacity:0,transform:'scale(.96)'},{opacity:1,transform:'none'}],{duration:360,fill:'forwards'});
    };
  } else {
    wipeTransition(()=>{
      curr.classList.remove('active');
      next.classList.add('active');
    });
  }
}

/* ══ RIPPLE ══ */
$$('.btn').forEach(b=>b.addEventListener('click',e=>{
  const r=window.document.createElement('span');r.className='btn-ripple';
  const rect=b.getBoundingClientRect();
  r.style.cssText=`left:${e.clientX-rect.left-5}px;top:${e.clientY-rect.top-5}px`;
  b.appendChild(r);setTimeout(()=>r.remove(),800);
}));

/* ══════════════════════════════
   S1 — SPLASH
══════════════════════════════ */
function initS1(){
  // Stars
  const sf=$('s1stars'),sf2=$('s4stars');
  [sf,sf2].forEach(s=>{
    for(let i=0;i<55;i++){
      const st=window.document.createElement('div');st.className='star';
      const sz=Math.random()>.7?3:Math.random()>.4?2:1.5;
      st.style.cssText=`width:${sz}px;height:${sz}px;left:${Math.random()*100}%;top:${Math.random()*100}%;
        --d:${2+Math.random()*4}s;--de:${Math.random()*6}s;--o:${.2+Math.random()*.6}`;
      s.appendChild(st);
    }
  });

  // Orbs
  const ob=$('s1orbs');
  [{bg:'#FF4D0040',w:280,h:280,t:-60,l:-40,bx:'30px',by:'-20px'},{bg:'#7C5CFC30',w:200,h:200,b:-60,r:-30,bx:'-20px',by:'30px'},{bg:'#FFD16625',w:160,h:160,b:'40%',l:-30,bx:'40px',by:'-40px'}].forEach(c=>{
    const o=window.document.createElement('div');o.className='orb mesh-blob';
    o.style.cssText=`background:${c.bg};width:${c.w}px;height:${c.h}px;${c.t!=null?`top:${c.t}px`:''};${c.b!=null?`bottom:${c.b}${typeof c.b==='number'?'px':''}`:''};${c.l!=null?`left:${c.l}px`:''};${c.r!=null?`right:${c.r}px`:''};--bd:${8+Math.random()*6}s;--bde:${Math.random()*3}s;--bx:${c.bx};--by:${c.by};--bs:${1.05+Math.random()*.1}`;
    ob.appendChild(o);
    A(o,[{opacity:0},{opacity:1}],{duration:800,delay:300,fill:'forwards'});
  });

  // S4 blobs
  const bl=$('s4blobs');
  [{bg:'rgba(255,77,0,.15)',w:200,h:200,b:'15%',l:'10%'},{bg:'rgba(124,92,252,.12)',w:180,h:180,t:'20%',r:'5%'}].forEach(c=>{
    const o=window.document.createElement('div');o.className='mesh-blob';
    o.style.cssText=`background:${c.bg};width:${c.w}px;height:${c.h}px;border-radius:50%;filter:blur(60px);position:absolute;${c.b?`bottom:${c.b}`:''};${c.t?`top:${c.t}`:''};${c.l?`left:${c.l}`:''};${c.r?`right:${c.r}`:''};--bd:10s;--bde:${Math.random()*3}s;--bx:20px;--by:-30px;animation:blobDrift 10s ease-in-out infinite alternate`;
    bl.appendChild(o);
    A(o,[{opacity:0},{opacity:1}],{duration:600,fill:'forwards'});
  });

  // Logo entrance
  const center=$('s1center');
  A(center,[{opacity:0,transform:'translateY(28px) scale(.92)'},{opacity:1,transform:'none'}],{duration:700,delay:400,fill:'forwards',easing:'cubic-bezier(.34,1.4,.64,1)'});

  // Loading
  setTimeout(()=>{
    A($('loadBar'),[{width:'0%'},{width:'100%'}],{duration:2200,fill:'forwards',easing:'cubic-bezier(.4,0,.2,1)'}).onfinish=()=>{
      setTimeout(()=>{showScreen('s2');initS2();},300);
    };
  },500);
}

/* ══════════════════════════════
   S2 — GREET
══════════════════════════════ */
function initS2(){
  const bub=$('s2bubble'),bud=$('s2buddy'),lbl=$('s2lbl'),inp=$('nameIn'),btn=$('s2btn');
  setTimeout(()=>A(bub,[{opacity:0,transform:'translateY(-18px) scale(.92)'},{opacity:1,transform:'none'}],{duration:500,fill:'forwards',easing:'cubic-bezier(.34,1.4,.64,1)'}),80);
  setTimeout(()=>{
    sc(bud,0);
    setTimeout(()=>{bud.classList.add('shown');spawnPring();},600);
  },320);
  setTimeout(()=>{fu(lbl,0);fu(inp,80);A(btn,[{opacity:0,transform:'translateY(12px)'},{opacity:1,transform:'none'}],{duration:450,delay:160,fill:'forwards',easing:'cubic-bezier(.34,1.2,.64,1)'});},680);
}

function spawnPring(){
  const ring=$('s2pring');ring.innerHTML='';
  const colors=['#FF4D00','#FFD166','#00D68F','#7C5CFC','#FF6B9D'];
  for(let i=0;i<8;i++){
    const d=window.document.createElement('div');d.className='pring-dot';
    const angle=(i/8)*360;const r=68;
    const x=Math.cos(angle*Math.PI/180)*r;const y=Math.sin(angle*Math.PI/180)*r;
    d.style.cssText=`left:calc(50% + ${x}px);top:calc(50% + ${y}px);transform:translate(-50%,-50%);background:${colors[i%colors.length]};opacity:.5;--d:${1.5+Math.random()}s;--del:${i*.15}s`;
    ring.appendChild(d);
  }
}

function goStep2(){
  const name=$('nameIn').value.trim()||'Kamu';
  window._name=name;showScreen('s3');initS3();
}
$('nameIn').addEventListener('keypress',e=>{if(e.key==='Enter')goStep2();});
$('nameIn').addEventListener('input',()=>{
  const v=$('nameIn').value.trim();
  $('s2btn').textContent=v?`Halo ${v.split(' ')[0]}, siap! 👋`:'Halo, aku siap! 👋';
});

/* ══════════════════════════════
   S3 — ONBOARD
══════════════════════════════ */
const DEFAULT_STEPS=[
  {tag:'⚡ LANGKAH 1 / 4',q:'Kamu di divisi apa?',hint:'Bantu aku sesuaikan pengalaman yang pas buatmu',
   opts:[{e:'💻',bg:'#EAF4FD',l:'Developer / IT'},{e:'🎨',bg:'#FAF0FF',l:'Desainer / Kreatif'},{e:'📊',bg:'#EAFAF3',l:'Marketing / Sales'},{e:'📋',bg:'#FFF5EA',l:'Manajer / Tim Lead'},{e:'📚',bg:'#F5F3FF',l:'Lainnya'}]},
  {tag:'🎯 LANGKAH 2 / 4',q:'Gimana mood kerjamu hari ini?',hint:'Cerita jujur aja, Buddy siap adaptasi buat kamu',
   opts:[{e:'⚡',bg:'#FFFAEC',l:'Super Semangat!'},{e:'😊',bg:'#EAFAF3',l:'Oke-oke aja'},{e:'😴',bg:'#EEF0FF',l:'Agak Lelah'},{e:'😤',bg:'#FAEAEA',l:'Butuh Motivasi'}]},
  {tag:'🔥 LANGKAH 3 / 4',q:'Apa tantangan terbesar kamu?',hint:'Pilih yang paling sering bikin kamu stuck',
   opts:[{e:'⏰',bg:'#FFF5EA',l:'Susah Fokus'},{e:'📬',bg:'#EAF4FD',l:'Terlalu Banyak Task'},{e:'😴',bg:'#EEF0FF',l:'Gampang Procrastinate'},{e:'🤝',bg:'#EAFAF3',l:'Koordinasi Tim'}]},
  {tag:'🚀 LANGKAH 4 / 4',q:'Mau mulai dari mana duluan?',hint:'Buddy akan siapkan workspace yang sesuai pilihanmu',
   opts:[{e:'✅',bg:'#EAFAF3',l:'Atur To-Do List'},{e:'🎯',bg:'#FFF5EA',l:'Set Target Mingguan'},{e:'⏱️',bg:'#EEF0FF',l:'Mulai Pomodoro'},{e:'📊',bg:'#EAF4FD',l:'Lihat Dashboard'}]},
];
const STEPS = (previewConfig && previewConfig.length > 0) ? previewConfig : (state?.onboardingConfig && state.onboardingConfig.length > 0 ? state.onboardingConfig : DEFAULT_STEPS);

let obCur=0,obSel=null,obAns=[];

function initS3(){
  const sb=$('stepbar');sb.innerHTML='';
  STEPS.forEach((_,i)=>{
    const d=window.document.createElement('div');d.className='stepdot';d.id=`sd${i}`;
    d.innerHTML='<div class="stepdot-fill"></div>';sb.appendChild(d);
  });
  obCur=0;renderOb(true);
}

function renderOb(first=false){
  const s=STEPS[obCur];obSel=null;
  STEPS.forEach((_,i)=>{const d=$(`sd${i}`);if(i<obCur)d.classList.add('done');else d.classList.remove('done');});

  const tag=$('obTag'),q=$('obQ'),hint=$('obHint');
  tag.textContent=s.tag;q.textContent=s.q;hint.textContent=s.hint;

  if(first){fu(tag,50);fu(q,130);fu(hint,200);}
  else{
    [tag,q,hint].forEach((el,i)=>A(el,[{opacity:0,transform:'translateX(18px)'},{opacity:1,transform:'none'}],{duration:320,delay:i*55,fill:'forwards',easing:'cubic-bezier(.34,1.2,.64,1)'}));
  }

  const cont=$('obOpts');cont.innerHTML='';
  s.opts.forEach((o,i)=>{
    const card=window.document.createElement('div');card.className='opt';card.id=`o${i}`;
    card.innerHTML=`<div class="opt-ico" style="background:${o.bg}">${o.e}</div><span class="opt-lbl">${o.l}</span><div class="opt-tick">✓</div>`;
    card.onclick=()=>selectOpt(i,o.l);
    card.addEventListener('mousemove',ev=>{
      const r=card.getBoundingClientRect();
      card.style.setProperty('--mx',((ev.clientX-r.left)/r.width*100)+'%');
      card.style.setProperty('--my',((ev.clientY-r.top)/r.height*100)+'%');
    });
    cont.appendChild(card);
    sli(card,(first?350:100)+i*65);
  });

  const btn=$('obBtn');btn.disabled=true;btn.style.opacity='.35';btn.style.cursor='not-allowed';
  btn.textContent=obCur<STEPS.length-1?'Lanjut →':'Selesai! ✨';
  if(first)A(btn,[{opacity:0},{opacity:.35}],{duration:400,delay:500,fill:'forwards'});
}

function selectOpt(i,lbl){
  $$('.opt').forEach((c,j)=>c.classList.toggle('sel',j===i));
  obSel=lbl;
  A($(`o${i}`),[{transform:'scale(1)'},{transform:'scale(1.04)'},{transform:'scale(1.02) translateX(6px)'}],{duration:280});
  const btn=$('obBtn');btn.disabled=false;btn.style.cursor='pointer';
  A(btn,[{opacity:0.35, transform:'scale(1)'},{opacity:1, transform:'scale(1.03)'},{opacity:1, transform:'scale(1)'}],{duration:260,fill:'forwards',easing:'cubic-bezier(.34,1.56,.64,1)'});
}

function obAdvance(){
  if(!obSel)return;
  obAns[obCur]=obSel;
  if(obCur===0)window._job=obSel;
  if(obCur===1)window._mood=obSel;
  if(obCur<STEPS.length-1){obCur++;renderOb(false);}
  else{showScreen('s4');initGame();}
}

/* ══════════════════════════════
   S4 — GAME
══════════════════════════════ */
const TAP=15;let taps=0,gameOn=false;

function initGame(){
  taps=0;gameOn=true;$('tapNum').textContent='0';
  const ef=$('eFill');if(ef)ef.style.width='0%';
  const est=$('eSt');if(est)est.textContent='💤 Siap dimulai…';
  const pd=$('pdots');pd.innerHTML='';
  for(let i=0;i<TAP;i++){const d=window.document.createElement('div');d.className='pdot';d.id=`pd${i}`;pd.appendChild(d);}
  A($('gameHd'),[{opacity:0,transform:'translateY(-22px)'},{opacity:1,transform:'none'}],{duration:550,delay:100,fill:'forwards',easing:'cubic-bezier(.34,1.4,.64,1)'});
}

function doTap(ev){
  if(!gameOn)return;taps++;
  const numEl=$('tapNum');
  numEl.textContent=taps;
  numEl.classList.remove('bump');requestAnimationFrame(()=>requestAnimationFrame(()=>numEl.classList.add('bump')));
  setTimeout(()=>numEl.classList.remove('bump'),200);

  // Shockwave
  const sw=window.document.createElement('div');sw.className='shockwave';
  const tb=$('tapBtn').getBoundingClientRect();const fr=containerRef.current?.querySelector('.frame').getBoundingClientRect();
  sw.style.cssText=`width:220px;height:220px;left:${tb.left-fr.left}px;top:${tb.top-fr.top}px;`;
  containerRef.current?.querySelector('.frame').appendChild(sw);setTimeout(()=>sw.remove(),600);

  // Float label — varied messages, centered position
  const msgs=['⚡ +1','+1 🔥','💪 +1','+1 💥','+1 🎯','🚀 +1','🔥 +1','+1 ✨'];
  const fl=window.document.createElement('div');fl.className='tap-float-lbl';
  fl.textContent=msgs[(taps-1)%msgs.length];
  fl.style.left=(155+Math.random()*40-20)+'px';fl.style.top=(310+Math.random()*20-10)+'px';
  containerRef.current?.querySelector('.frame').appendChild(fl);setTimeout(()=>fl.remove(),1000);

  // Energy bar + power status
  const ef=$('eFill'),est=$('eSt');
  if(ef)ef.style.width=Math.round((taps/TAP)*100)+'%';
  if(est){const lvl=taps<2?'💤 Siap dimulai…':taps<5?'🌱 Mulai bergerak!':taps<9?'⚡ Makin panas!':taps<13?'🔥 On fire!':'💥 FULL POWER!!!';est.textContent=lvl;}

  // Dot
  if(taps<=TAP){
    const dot=$(`pd${taps-1}`);
    if(dot){dot.classList.add('lit');A(dot,[{transform:'scale(1)'},{transform:'scale(2.4)'},{transform:'scale(1.6)'}],{duration:380,easing:'cubic-bezier(.34,1.56,.64,1)',fill:'forwards'});}
  }

  if(taps>=TAP){gameOn=false;setTimeout(()=>{showScreen('s5');initCeleb();},600);}
}

/* ══════════════════════════════
   S5 — CELEBRATION
══════════════════════════════ */
function initCeleb(){
  const name=window._name||'Kamu';
  $('cName').textContent=name;
  $('cs1').querySelector('.cstat-num').textContent=TAP;
  $('cs2').querySelector('.cstat-num').textContent=STEPS.length+'/'+STEPS.length;

  // Confetti
  const wrap=$('confwrap');wrap.innerHTML='';
  const cols=['#FF4D00','#FFD166','#00D68F','#7C5CFC','#FF6B9D','#3EA6FF','#FF8040','#AEFF6E'];
  for(let i=0;i<80;i++){
    const c=window.document.createElement('div');c.className='conf';
    const w=5+Math.random()*10;const isRect=Math.random()>.35;
    c.style.cssText=`width:${w}px;height:${isRect?w*.45:w}px;background:${cols[i%cols.length]};--r:${isRect?'2px':'50%'};left:${Math.random()*100}%;--d:${2.5+Math.random()*2.5}s;--de:${Math.random()*1.8}s;--spin:${(Math.random()-.5)*720}deg`;
    wrap.appendChild(c);
  }

  sc($('cBuddy'),100,650);
  setTimeout(()=>$('cBuddy').classList.add('shown'),800);
  A($('cBadge'),[{opacity:0,transform:'scale(.7) translateY(10px)'},{opacity:1,transform:'none'}],{duration:500,delay:350,fill:'forwards',easing:'cubic-bezier(.34,1.56,.64,1)'});
  A($('cTitle'),[{opacity:0,transform:'translateY(14px)'},{opacity:1,transform:'none'}],{duration:460,delay:550,fill:'forwards',easing:'cubic-bezier(.34,1.2,.64,1)'});
  fu($('cSub'),700,400);
  [$('cs1'),$('cs2'),$('cs3')].forEach((el,i)=>A(el,[{opacity:0,transform:'translateY(14px) scale(.9)'},{opacity:1,transform:'none'}],{duration:400,delay:900+i*80,fill:'forwards',easing:'cubic-bezier(.34,1.4,.64,1)'}));
  A($('cBtn'),[{opacity:0,transform:'translateY(14px)'},{opacity:1,transform:'none'}],{duration:450,delay:1150,fill:'forwards',easing:'cubic-bezier(.34,1.3,.64,1)'});
}

/* ══════════════════════════════
   S6 — PROFILE
══════════════════════════════ */
function goProfile(){showScreen('s6');initProfile();}

function initProfile(){
  const name=window._name||'Kamu';
  const job=window._job||'Developer / IT';
  const moodMap={'Super Semangat!':'🔥 Semangat','Oke-oke aja':'😊 Santai','Agak Lelah':'😴 Tired','Butuh Motivasi':'💪 Boost'};
  const mood=moodMap[window._mood||'']||'🔥 Semangat';
  $('s6name').textContent=`Semuanya siap, ${name}!`;
  $('rNama').textContent=name;$('rTipe').textContent=job;$('rMood').textContent=mood;

  A($('s6av'),[{opacity:0,transform:'scale(.5) translateY(20px)'},{opacity:1,transform:'none'}],{duration:600,delay:120,fill:'forwards',easing:'cubic-bezier(.34,1.56,.64,1)'});
  fu($('s6name'),350,460);fu($('s6sub'),440,420);
  A($('s6card'),[{opacity:0,transform:'translateY(28px)'},{opacity:1,transform:'none'}],{duration:520,delay:560,fill:'forwards',easing:'cubic-bezier(.34,1.2,.64,1)'});
  ['r1','r2','r3','r4'].forEach((id,i)=>sli($(id),760+i*90));
  A($('s6btn'),[{opacity:0,transform:'translateY(14px)'},{opacity:1,transform:'none'}],{duration:460,delay:1180,fill:'forwards',easing:'cubic-bezier(.34,1.2,.64,1)'});
}

function restart(){
  A(containerRef.current?.querySelector('.frame'),[{transform:'scale(1)'},{transform:'scale(1.04)',filter:'brightness(1.15)'},{transform:'scale(.95)',filter:'brightness(.9)'},{transform:'scale(1)',filter:'none'}],{duration:600,easing:'cubic-bezier(.34,1.2,.64,1)'});
  setTimeout(()=>{
    window._name=null;window._job=null;window._mood=null;obAns=[];obCur=0;taps=0;
    $$('.shockwave,.tap-float-lbl').forEach(e=>e.remove());
    const curr=containerRef.current?.querySelector('.screen.active');curr.classList.remove('active');
    const s1=$('s1');s1.classList.add('active');
    A($('loadBar'),[{width:'100%'},{width:'0%'}],{duration:50,fill:'forwards'});
    setTimeout(()=>{
      A($('loadBar'),[{width:'0%'},{width:'100%'}],{duration:2200,fill:'forwards',easing:'cubic-bezier(.4,0,.2,1)'}).onfinish=()=>{
        setTimeout(()=>{showScreen('s2',true);initS2();},300);
      };
    },200);
  },2200);
}


        // Bind global functions to window so inline onClick works, or replace inline onClick
        window.goStep2 = goStep2;
        window.obAdvance = obAdvance;
        window.doTap = doTap;
        window.goProfile = goProfile;
        
        window.restart = async () => {
            const btn = $('s6btn');
            if (btn) btn.textContent = 'Memulai...';
            if (onFinish) onFinish({ job: window._job || '' });
        };

        // Setup background elemen untuk S4 (game screen) — dipakai baik saat splash maupun skip splash
        function setupS4Background(){
          const sf2=$('s4stars');
          if(sf2){for(let i=0;i<55;i++){const st=window.document.createElement('div');st.className='star';const sz=Math.random()>.7?3:Math.random()>.4?2:1.5;st.style.cssText=`width:${sz}px;height:${sz}px;left:${Math.random()*100}%;top:${Math.random()*100}%;--d:${2+Math.random()*4}s;--de:${Math.random()*6}s;--o:${.2+Math.random()*.6}`;sf2.appendChild(st);}}
          const bl=$('s4blobs');
          if(bl){[{bg:'rgba(255,77,0,.15)',w:200,h:200,b:'15%',l:'10%'},{bg:'rgba(124,92,252,.12)',w:180,h:180,t:'20%',r:'5%'}].forEach(c=>{const o=window.document.createElement('div');o.className='mesh-blob';o.style.cssText=`background:${c.bg};width:${c.w}px;height:${c.h}px;border-radius:50%;filter:blur(60px);position:absolute;${c.b?`bottom:${c.b}`:''};${c.t?`top:${c.t}`:''};${c.l?`left:${c.l}`:''};${c.r?`right:${c.r}`:''}; --bd:10s;--bde:${Math.random()*3}s;--bx:20px;--by:-30px;animation:blobDrift 10s ease-in-out infinite alternate`;bl.appendChild(o);});}
        }

        // Initialize — skip S1 splash jika app sudah menampilkan loading splash sebelumnya
        if (skipSplash) {
          setupS4Background();
          const s1el = $('s1'); const s2el = $('s2');
          if (s1el) s1el.classList.remove('active');
          if (s2el) s2el.classList.add('active');
          initS2();
        } else {
          initS1();
        }

        return () => {
            window.goStep2 = undefined;
            window.obAdvance = undefined;
            window.doTap = undefined;
            window.goProfile = undefined;
            window.restart = undefined;
        };
    }, []);

    const handleBuddyClick = () => {
        const newCount = clickCount + 1;
        setClickCount(newCount);
        if (newCount > 5) {
            setBuddyMood('angry');
            setBuddyMsg('Aduh! Jangan diklik terus, sakit tau! 😠');
        } else if (newCount > 2) {
            setBuddyMood('sad');
            setBuddyMsg('Hei, pelan-pelan dong kliknya... 🥺');
        } else {
            setBuddyMood('happy');
            setBuddyMsg('Hehe, geli! Senang deh kamu main sama aku! ✨');
        }
    };

    const handleBuddyHover = (isHover) => {
        setIsHovering(isHover);
        if (isHover) {
            setBuddyMood('happy');
            setBuddyMsg('Wah, dielus! Nyaman banget... 😌✨');
        } else {
            if (clickCount > 5) {
                setBuddyMood('angry');
                setBuddyMsg('Aduh! Jangan diklik terus, sakit tau! 😠');
            } else if (clickCount > 2) {
                setBuddyMood('sad');
                setBuddyMsg('Hei, pelan-pelan dong kliknya... 🥺');
            } else {
                setBuddyMood('neutral');
                setBuddyMsg('Hai! Senang ketemu kamu 🤜\nAku Buddy, bantu harimu lebih produktif!');
            }
        }
    };

    return (
        <div className="ob-wrapper" style={{ position: 'fixed', inset: 0, zIndex: 9999 }}>
            <div id="ob-app" ref={containerRef}>
                

<div className="frame">


<div className="transition-wipe" id="wipe"></div>


<div className="screen active" id="s1">
  <div className="s1-noise"></div>
  <div className="s1-grid"></div>
  <div className="s1-glow"></div>
  <div className="s1-orbs" id="s1orbs"></div>
  <div className="s1-starfield" id="s1stars"></div>

  <div className="s1-center" id="s1center" style={{opacity: '0'}}>
    <div className="logo-ring" id="logoRing">
      <svg className="logo-ring-svg" viewBox="0 0 108 108" fill="none">
        <circle cx="54" cy="54" r="50" stroke="url(#ringGrad)" strokeWidth="2" strokeDasharray="6 4" opacity=".6"/>
        <defs><linearGradient id="ringGrad" x1="0" y1="0" x2="108" y2="108" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FF4D00"/>
          <stop offset="50%" stopColor="#FFD166"/>
          <stop offset="100%" stopColor="#FF4D00"/>
        </linearGradient></defs>
      </svg>
      <div className="logo-inner" id="logoInner"><BeeMascot mood="neutral" size={60} animated /></div>
    </div>
    <div className="logo-text">
      <div className="logo-brand">Fl<span className="o">ow</span>buddy</div>
      <div className="logo-tagline">Kerja Lebih Cerdas, Lebih Semangat</div>
    </div>
    <div className="s1-loader"><div className="s1-loader-fill" id="loadBar"></div></div>
  </div>
</div>


<div className="screen" id="s2">
  <div className="s2-top" id="s2top">
    <div className="s2-top-shimmer"></div>
    <div className="s2-bubble" id="s2bubble">{buddyMsg.split('\\n').map((line, i) => <React.Fragment key={i}>{line}<br/></React.Fragment>)}</div>
    
                <div 
                    className="s2-buddy" 
                    id="s2buddy"
                    onMouseEnter={() => handleBuddyHover(true)}
                    onMouseLeave={() => handleBuddyHover(false)}
                    onTouchStart={() => handleBuddyHover(true)}
                    onTouchEnd={() => handleBuddyHover(false)}
                    onTouchCancel={() => handleBuddyHover(false)}
                    style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                >
                    <div className="s2-orbit-dot"></div>
                    <div className="s2-orbit-dot reverse"></div>
                    <div className="s2-orbit-dot fast"></div>
                    <div className="buddy-aura"></div>
                    <BeeMascot mood={buddyMood} size={135} animated onClick={handleBuddyClick} />
                </div>
                
    <div className="particle-ring" id="s2pring"></div>
  </div>
  <div className="s2-bottom">
    <div className="s2-label" id="s2lbl">SIAPA NAMA KAMU?</div>
    <input className="s2-input" id="nameIn" type="text" placeholder="Ketik nama kamu..." defaultValue="Test User" autoComplete="off" />
    <button className="btn" id="s2btn" onClick={() => window.goStep2()}>Halo, aku siap! 👋</button>
  </div>
</div>


<div className="screen" id="s3">
  <div className="s3-header">
    <div className="stepbar" id="stepbar"></div>
    <div className="ob-step-tag" id="obTag">⚡ LANGKAH 1 / 4</div>
    <div className="ob-q" id="obQ">Kamu di divisi apa?</div>
    <div className="ob-hint" id="obHint">Bantu aku sesuaikan pengalaman yang pas buatmu</div>
  </div>
  <div className="ob-opts" id="obOpts"></div>
  <div className="ob-foot"><button className="btn" id="obBtn" onClick={() => window.obAdvance()} style={{opacity: '.35', cursor: 'not-allowed'}}>Lanjut →</button></div>
</div>


<div className="screen" id="s4">
  <div className="s4-bg">
    <div className="s1-starfield" id="s4stars"></div>
    <div className="s4-aurora"></div>
    <div className="bg-canvas" id="s4blobs"></div>
  </div>

  <div className="game-hd" id="gameHd">
    <div className="game-badge">⚡ MINI GAME</div>
    <div className="game-title">Tap Buddy sebanyak mungkin!<br />Isi <span className="hl">energimu</span> sekarang</div>
  </div>

  <div className="pdots" id="pdots"></div>

  
  <div className="energy-section">
    <div className="energy-top">
      <span className="energy-label-txt">⚡ ENERGY LEVEL</span>
      <span className="energy-state" id="eSt">💤 Siap dimulai…</span>
    </div>
    <div className="energy-track"><div className="energy-fill" id="eFill"></div></div>
  </div>

  <div className="tap-arena">
    <div className="tap-ring-outer">
      <div className="tap-pulse-ring"></div>
      <div className="tap-pulse-ring"></div>
      <div className="tap-btn" id="tapBtn" onClick={(e) => window.doTap(e)}>
        <div style={{textAlign: 'center'}}>
          <div className="tap-count-num" id="tapNum">0</div>
          <div className="tap-sub">TAP!</div>
        </div>
      </div>
    </div>
  </div>

  <div className="tap-target-txt">Target: <b id="tapTgt">15</b> tap 🎯</div>
</div>


<div className="screen" id="s5">
  <div className="confwrap" id="confwrap"></div>
  <div className="celeb-inner">
    <div className="celeb-buddy" id="cBuddy"><BeeMascot mood="neutral" size={80} animated /></div>
    <div className="celeb-badge" id="cBadge">🎉 Level 1 Terbuka!</div>
    <div className="celeb-title" id="cTitle">Luar biasa,<br /><span className="name" id="cName">Test User</span>!</div>
    <div className="celeb-sub" id="cSub">Semangatmu nyata banget!<br />Yuk mulai atur harimu 🚀</div>
    <div className="celeb-stats" id="cStats">
      <div className="cstat" id="cs1"><div className="cstat-num">15</div><div className="cstat-lbl">TAPS</div></div>
      <div className="cstat" id="cs2"><div className="cstat-num">4/4</div><div className="cstat-lbl">LANGKAH</div></div>
      <div className="cstat" id="cs3"><div className="cstat-num">Lv.1</div><div className="cstat-lbl">LEVEL</div></div>
    </div>
    <button className="btn" id="cBtn" onClick={() => window.goProfile()} style={{opacity: '0', transform: 'translateY(12px)'}}>Lihat Profilku ✨</button>
  </div>
</div>


<div className="screen" id="s6">
  <div className="s6-top">
    <div className="s6-avatar" id="s6av">
      <div className="s6-avatar-inner"><BeeMascot mood="neutral" size={60} animated /></div>
      <div className="s6-avatar-badge">🎯</div>
    </div>
    <div className="s6-name" id="s6name">Semuanya siap, Test User!</div>
    <div className="s6-sub" id="s6sub">Hari pertamamu dimulai hari ini.<br />Satu langkah kecil sudah cukup 🌱</div>
  </div>
  <div className="s6-card" id="s6card">
    <div className="s6-card-hd">RANGKUMAN PROFILMU</div>
    <div className="s6-row" id="r1"><span className="s6-row-key">Nama</span><span className="s6-row-val" id="rNama">Test User</span></div>
    <div className="s6-row" id="r2"><span className="s6-row-key">Divisi</span><span className="s6-row-val orange" id="rTipe">Developer / IT</span></div>
    <div className="s6-row" id="r3"><span className="s6-row-key">Mood</span><span className="s6-row-val"><span className="s6-chip" id="rMood">🔥 Semangat</span></span></div>
    <div className="s6-row" id="r4"><span className="s6-row-key">Level Awal</span><span className="s6-row-val green">🌱 Lv.1 Pemula</span></div>
  </div>
  <div className="s6-foot"><button className="btn" id="s6btn" onClick={() => window.restart()} style={{opacity: '0', transform: 'translateY(14px)'}}>Masuk ke App 👉</button></div>
</div>

</div>



            </div>
        </div>
    );
}
