  // ═══════════════════════════════════════════════════════════════
  // HTML + CSS
  // ═══════════════════════════════════════════════════════════════
  innerRoot.innerHTML = `
<style>
#fb-root {
  --fb-yellow: #4DA8DA !important;
  --fb-yellow-dark: #3A8FBF !important;
  --fb-yellow-soft: rgba(77, 168, 218, 0.10) !important;
  --fb-blue: #4DA8DA !important;
  --fb-blue-soft: rgba(77, 168, 218, 0.10) !important;
  --fb-gold: #4DA8DA !important;
  --fb-paper: #F4F7F9 !important;
  --fb-card: #FAFBFC !important;
  --fb-card-fade: rgba(250, 251, 252, 0) !important;
  --fb-ink: #1A1D23 !important;
  --fb-ink-mute: #5C6779 !important;
  --fb-line: rgba(26, 29, 35, 0.08) !important;
  --fb-line-soft: rgba(26, 29, 35, 0.04) !important;
  transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease !important;
}

#fb-root.dark {
  --fb-paper: #121418 !important;
  --fb-card: rgba(26, 30, 40, 0.85) !important;
  --fb-card-fade: rgba(26, 30, 40, 0) !important;
  --fb-ink: #E8ECF1 !important;
  --fb-ink-mute: #7A8493 !important;
  --fb-yellow: #5CBAE6 !important;
  --fb-yellow-dark: #4DA8DA !important;
  --fb-yellow-soft: rgba(92, 186, 230, 0.10) !important;
  --fb-blue: #5CBAE6 !important;
  --fb-blue-soft: rgba(92, 186, 230, 0.10) !important;
  --fb-gold: #5CBAE6 !important;
  --fb-line: rgba(92, 186, 230, 0.15) !important;
  --fb-line-soft: rgba(92, 186, 230, 0.06) !important;
}

#fb-genangan {
  position:absolute !important; bottom:0; left:50%; transform:translateX(-50%);
  width:120px !important; height:18px !important;
  background:rgba(116,192,252,0.6) !important; border-radius:50% !important; filter:blur(4px);
  pointer-events:none !important; opacity:0 !important; transition:opacity .3s;
}
@keyframes genanganMeluas { 0%{transform:translateX(-50%) scale(0);opacity:0} 100%{transform:translateX(-50%) scale(1);opacity:1} }

#fb-root.quiet-mode #fb-genangan {
  display: none !important;
  opacity: 0 !important;
  animation: none !important;
}

:where(#fb-root div,#fb-root button,#fb-root input,#fb-root textarea,#fb-root span,#fb-root p,#fb-root label,#fb-root select,#fb-root details,#fb-root summary) {
  box-sizing: border-box; font-family: Nunito,system-ui,sans-serif;
  margin: 0; padding: 0; border: 0; outline: 0;
  text-decoration: none; list-style: none;
  -webkit-tap-highlight-color: transparent;
}
:where(#fb-root button) { display:block !important; cursor:pointer !important }
:where(#fb-root input, #fb-root textarea) { display:block !important }
:where(#fb-root select) {
  -webkit-appearance:none !important; appearance:none !important;
  display:block !important; box-sizing:border-box !important;
  font-family:Nunito,system-ui,sans-serif !important;
  background-color:var(--fb-card) !important;
}
:where(#fb-root details) { display:block !important }
:where(#fb-root summary) { display:flex !important; list-style:none !important; cursor:pointer !important }
:where(#fb-root summary)::-webkit-details-marker { display:none !important }

/* ══════════════════════════════════════════════
   BUDDY
══════════════════════════════════════════════ */
#fb-buddy {
  position:absolute !important; bottom:0; right:0;
  width:100px !important; height:130px !important;
  cursor:grab !important; pointer-events:all !important; user-select:none;
  perspective:500px;
  z-index: 2147483640 !important;
}
#fb-root.quiet-mode #fb-buddy {
  pointer-events: none !important;
}
#fb-root.quiet-mode #fb-buddy.dragging {
  pointer-events: all !important;
}
#fb-mini-buddy {
  position: absolute !important;
  bottom: 20px;
  right: -30px;
  width: 74px !important;
  height: 48px !important;
  display: none !important;
  align-items: center;
  justify-content: flex-start;
  pointer-events: all !important;
  cursor: pointer !important;
  z-index: 5 !important;
}
#fb-root.quiet-mode #fb-mini-buddy {
  display: flex !important;
}
.fb-mini-bg {
  width: 64px !important;
  height: 44px !important;
  background: var(--fb-card) !important;
  border: 1px solid var(--fb-line) !important;
  border-right: none !important;
  border-radius: 22px 0 0 22px !important;
  display: flex !important;
  align-items: center;
  justify-content: flex-start;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
  transition: transform 0.2s, background-color 0.2s;
  padding-left: 8px;
}
#fb-mini-buddy:hover .fb-mini-bg {
  transform: translateX(-6px);
  background: var(--fb-line-soft) !important;
}
/* Snapped left-edge styles */
#fb-buddy.on-left #fb-mini-buddy {
  left: -30px;
  right: auto;
  justify-content: flex-end;
}
#fb-buddy.on-left .fb-mini-bg {
  border-radius: 0 22px 22px 0 !important;
  border-right: 1px solid var(--fb-line) !important;
  border-left: none !important;
  padding-left: 0;
  padding-right: 8px;
  justify-content: flex-end;
}
#fb-buddy.on-left #fb-mini-buddy:hover .fb-mini-bg {
  transform: translateX(6px);
}
#fb-buddy.dragging { cursor:grabbing !important }
#fb-drag-dot {
  position:absolute !important; top:8px; left:50%; transform:translateX(-50%);
  width:20px !important; height:4px !important; border-radius:0 !important;
  background:rgba(255,255,255,.25) !important; pointer-events:none !important; z-index:2;
  opacity:0 !important; transition:opacity .2s;
}
#fb-buddy:hover #fb-drag-dot { opacity:1 !important }
#fb-snap-ring {
  position:absolute !important; bottom:-5px; right:-5px;
  width:110px !important; height:110px !important; border-radius:50% !important;
  border:2px dashed rgba(255,255,255,.18) !important;
  pointer-events:none !important; opacity:0 !important; transition:opacity .3s;
  animation:fb-spin 4s linear infinite;
}
#fb-buddy.dragging #fb-snap-ring { opacity:1 !important }
@keyframes fb-spin { to { transform:rotate(360deg) } }

#fb-svg-wrap {
  position:absolute !important; bottom:10px; right:0;
  width:100px !important; height:100px !important;
  animation: melayangHalus 3s infinite ease-in-out;
  transform-style:preserve-3d;
  filter: drop-shadow(0 8px 18px rgba(0,0,0,.35)) drop-shadow(0 2px 4px rgba(0,0,0,.2));
  --w1:#dbe4ff; --w2:#5c8ee8; --wp:#ffc9c9;
}
#fb-bayangan {
  position:absolute !important; bottom:6px; left:50%; transform:translateX(-50%);
  width:56px !important; height:10px !important;
  background:rgba(0,0,0,.2) !important; border-radius:50% !important; filter:blur(4px);
  animation:bayanganHalus 3s infinite ease-in-out; pointer-events:none !important;
}
#fb-badge {
  position:absolute !important; bottom:110px; right:0;
  background:rgba(5,5,16,.97) !important; border:1px solid rgba(255,255,255,.12) !important;
  color:#fff !important; font-size:12px !important; font-weight:500 !important;
  padding:7px 16px !important; border-radius:0 !important; white-space:nowrap !important; pointer-events:none !important;
  backdrop-filter:blur(16px); box-shadow:0 8px 28px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.1);
  opacity:0 !important; transform:translateY(8px) scale(.95); transition:opacity .22s, transform .22s cubic-bezier(.34,1.56,.64,1);
}
#fb-buddy:hover #fb-badge { opacity:1 !important; transform:translateY(0) scale(1) }

/* ══════════════════════════════════════════════
   SVG CHARACTER — BASE STATE (hidden defaults)
══════════════════════════════════════════════ */
.stop-1 { stop-color: var(--w1); transition: stop-color .8s ease }
.stop-2 { stop-color: var(--w2); transition: stop-color .8s ease }
.pipi   { fill:var(--wp); transition:all .8s ease; transform-origin:center; transform-box:fill-box }
.mulut  { transform-origin:100px 125px; transition:d .5s cubic-bezier(.34,1.56,.64,1), fill .4s ease }
.mata-bisa-kedip { transform-origin:100px 95px; animation:mataKedip 4.5s infinite }
.pupil-mata { transition:all .3s ease }

.aura-api,.api-roket,.awan-hujan,.jam-menunggu,.kembang-api,.hati-banyak,
.elemen-mikir,.topi-tidur,.kacamata-tebal,.ikat-kepala,.urat-marah,.alis-sedih,
.alis-marah,.alis-fokus,.mata-tidur,.mata-ngotot,.mata-bintang,.mata-senang,
.mata-sedih,.mata-fokus,.gelembung-ingus,.keringat,.barbel,.biskuit-animasi,
.biskuit-digigit,.remah-terbang,.remah-mulut,.gelembung-zzz,.air-mata-imut,
.permen-karet,.holo-rings,.sparkles-senang,.asap-kepala {
  opacity:0 !important; pointer-events:none !important;
}
.api-roket    { transform-origin:100px 190px }
.kembang-api  { transform-origin:100px 100px }
.topi-tidur   { transform-origin:100px 30px; transform:translateY(-20px); transition:all .5s ease }
.kacamata-tebal { transform:translateY(-20px); transition:all .5s ease }
.ikat-kepala  { transform:translateY(-20px); transition:all .5s ease }
.urat-marah   { transform-origin:150px 50px }
.awan-hujan   { transform:translateY(-40px) scale(.85); transition:all .5s ease; transform-origin:top center }

/* ══════════════════════════════════════════════
   STATE-SPECIFIC CSS
══════════════════════════════════════════════ */

/* TIDUR */
.state-ngantuk #fb-svg-wrap  { animation:napasTidur 4s infinite ease-in-out }
.state-ngantuk .topi-tidur   { opacity:1 !important; transform:translateY(0) }
.state-ngantuk .gelembung-zzz{ opacity:1 !important; animation:zzzNaik 3s infinite linear }
.state-ngantuk .mata-bisa-kedip { opacity:0 !important }
.state-ngantuk .mata-tidur   { opacity:1 !important }
.state-ngantuk .gelembung-ingus { opacity:1 !important; animation:ingusMembesar 4s infinite ease-in-out }

/* SEDIH */
.state-sedih #fb-svg-wrap    { transform:translateY(15px) scale(.95); animation:gemetarSedih 2.5s infinite ease-in-out }
.state-sedih .mata-bisa-kedip{ opacity:0 !important }
.state-sedih .mata-sedih     { opacity:1 !important }
.state-sedih .alis-sedih     { opacity:1 !important }
.state-sedih .air-mata-imut  { opacity:1 !important }
.state-sedih .tetesan-mata   { animation:nangisBanjir 1s infinite ease-in }
.state-sedih .tetesan-mata.delay { animation-delay:.4s }
.state-sedih .awan-hujan     { opacity:1 !important; transform:translateY(-25px) scale(.8) }
.state-sedih .tetes-hujan    { opacity:1 !important; animation:hujanTurun .8s infinite linear }
.state-sedih .mulut          { animation:bibirGemetar 2.5s infinite }
.state-sedih ~ #fb-genangan    { opacity:1 !important; animation:genanganMeluas 3s forwards }


/* MENUNGGU */
.state-menunggu #fb-svg-wrap { animation:nungguBosan 3s infinite ease-in-out }
.state-menunggu .jam-menunggu { opacity:1 !important }
.state-menunggu .jarum-jam   { animation:putarJam 1s infinite steps(8); transform-origin:100px 40px }
.state-menunggu .pupil-mata  { animation:lirikKananKiri 3s infinite ease-in-out }
.state-menunggu .permen-karet{ opacity:1 !important }
.state-menunggu .balon-tiup  { animation:tiupBalon 4s infinite cubic-bezier(.2,.8,.2,1); transform-origin:100px 125px }
.state-menunggu .ledakan-permen { animation:ledakanBalon 4s infinite ease-out; transform-origin:100px 125px }
.state-menunggu .mulut       { transform:scale(0.3) }

/* OLAHRAGA */
.state-olahraga #fb-svg-wrap { animation:squatJump .8s infinite }
.state-olahraga .mata-bisa-kedip { opacity:0 !important }
.state-olahraga .mata-ngotot { opacity:1 !important }
.state-olahraga .ikat-kepala { opacity:1 !important; transform:translateY(0) }
.state-olahraga .pipi        { transform:scale(1.3) }
.state-olahraga .barbel      { opacity:1 !important; animation:angkatBarbel .8s infinite }
.state-olahraga .keringat    { opacity:1 !important; animation:keringatBercucuran .8s infinite }
.state-olahraga #fb-bayangan { animation:bayanganSquat .8s infinite }
.state-olahraga .aura-api    { opacity:1 !important; animation:auraMenyala .4s infinite alternate }

/* FOKUS */
.state-fokus .kacamata-tebal { opacity:1 !important; transform:translateY(0) }
.state-fokus .alis-fokus     { opacity:1 !important }
.state-fokus .elemen-mikir   { opacity:1 !important }
.state-fokus .bohlam         { animation:lampuNyala 1.5s infinite alternate }
.state-fokus .rumus          { animation:melayangRumus 3s infinite linear }
.state-fokus .garis-laser    { opacity:1 !important; animation:scanLaser 2s infinite ease-in-out }
.state-fokus .holo-rings     { opacity:1 !important }
.state-fokus .ring-1         { animation:putarRing1 8s linear infinite }
.state-fokus .ring-2         { animation:putarRing2 12s linear infinite }
.state-fokus .mata-laser     { animation:nyalaLaser 1.5s infinite alternate; transform-origin:center; transform-box:fill-box }

/* SENANG */
.state-senang #fb-svg-wrap   { animation:tarianSenang 1.5s infinite ease-in-out }
.state-senang .mata-bisa-kedip { opacity:0 !important }
.state-senang .mata-senang   { opacity:1 !important }
.state-senang .hati-banyak   { opacity:1 !important; animation:loveTerbangSuper 1.5s infinite ease-out }
.state-senang .sparkles-senang { opacity:1 !important; animation:sparkleKelapKelip 1.5s infinite alternate }
.state-senang .pipi          { transform:scale(1.4); opacity:1 !important }

/* SEMANGAT */
.state-semangat #fb-svg-wrap { animation:lompatRoket .5s infinite alternate cubic-bezier(.2,.8,.2,1) }
.state-semangat .mata-bisa-kedip { opacity:0 !important }
.state-semangat .mata-bintang { opacity:1 !important; transform:scale(1.1); transform-origin:center; transform-box:fill-box }
.state-semangat .kembang-api { opacity:1 !important; animation:kembangApiMeriah .8s infinite alternate }
.state-semangat .api-roket   { opacity:1 !important; animation:apiMembara .1s infinite alternate }
.state-semangat #fb-bayangan { animation:bayanganLompatSuper .5s infinite alternate ease-in }

/* MAKAN */
.state-makan #fb-svg-wrap    { animation:goyangSenang 1s infinite }
.state-makan .mulut          { animation:ngunyah .3s infinite alternate }
.state-makan .pipi           { animation:pipiNgunyah .3s infinite alternate }
.state-makan .biskuit-animasi { opacity:1 !important }
.state-makan .biskuit-utuh   { animation:toggleBiskuit 2.5s infinite }
.state-makan .biskuit-digigit { animation:toggleBiskuitBalik 2.5s infinite }
.state-makan .remah-mulut    { opacity:1 !important; animation:remahNempel 2.5s infinite }
.state-makan .remah-terbang  { opacity:1 !important; animation:hamburRemah 2.5s infinite }

/* KESAL */
.state-kesal #fb-svg-wrap    { animation:gemetarKesal .1s infinite }
.state-kesal .alis-marah     { opacity:1 !important }
.state-kesal .urat-marah     { opacity:1 !important; animation:denyut .5s infinite }
.state-kesal .asap-kepala    { opacity:1 !important; animation:ngepulAsap 1s infinite }
.state-kesal .pipi           { transform:scale(1.4) }

/* ══════════════════════════════════════════════
   KEYFRAMES
══════════════════════════════════════════════ */
@keyframes melayangHalus {
  0%   { transform: translateY(0)    rotateX(0deg)   scaleX(1)    scaleY(1); }
  30%  { transform: translateY(-7px) rotateX(-6deg)  scaleX(1.04) scaleY(1.03); }
  50%  { transform: translateY(-12px) rotateX(-3deg) scaleX(1.02) scaleY(1.06); }
  70%  { transform: translateY(-7px) rotateX(-6deg)  scaleX(1.04) scaleY(1.03); }
  100% { transform: translateY(0)    rotateX(0deg)   scaleX(1)    scaleY(1); }
}
@keyframes bayanganHalus { 0%,100%{transform:translateX(-50%) scale(1);opacity:.22} 50%{transform:translateX(-50%) scale(.65);opacity:.07} }
@keyframes mataKedip { 0%,96%,100%{transform:scaleY(1)} 98%{transform:scaleY(.1)} }

/* Tidur */
@keyframes napasTidur { 0%,100%{transform:translateY(20px) scaleY(.95)} 50%{transform:translateY(15px) scaleY(1)} }
@keyframes zzzNaik    { 0%{transform:translate(0,0) scale(.5);opacity:0} 20%{opacity:1} 100%{transform:translate(30px,-60px) scale(1.5) rotate(20deg);opacity:0} }
@keyframes ingusMembesar { 0%,100%{transform:scale(.5);opacity:.3} 50%{transform:scale(1.3);opacity:.9} }

/* Sedih */
@keyframes nangisBanjir { 0%{transform:translateY(-5px) scaleY(.5);opacity:0} 20%{opacity:1} 100%{transform:translateY(35px) scaleY(1.3);opacity:0} }
@keyframes bibirGemetar { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-2px)} }
@keyframes gemetarSedih { 0%,100%{transform:translateY(15px) translateX(0)} 25%{transform:translateY(16px) translateX(1px)} 75%{transform:translateY(14px) translateX(-1px)} }
@keyframes hujanTurun   { 0%{transform:translateY(-5px);opacity:1} 100%{transform:translateY(25px);opacity:0} }

/* Menunggu */
@keyframes lirikKananKiri { 0%,100%{transform:translateX(0)} 20%,40%{transform:translateX(-6px)} 60%,80%{transform:translateX(6px)} }
@keyframes nungguBosan    { 0%,100%{transform:translateY(0) scaleY(1)} 50%{transform:translateY(8px) scaleY(.95)} }
@keyframes tiupBalon      { 0%{transform:scale(0);opacity:0} 10%{transform:scale(.5);opacity:.9} 75%{transform:scale(2.2);opacity:.9} 76%,100%{opacity:0;transform:scale(0)} }
@keyframes ledakanBalon   { 0%,75%{opacity:0;transform:scale(.5)} 76%{opacity:1;transform:scale(1.5)} 85%,100%{opacity:0;transform:scale(2.5)} }
@keyframes putarJam       { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }

/* Olahraga */
@keyframes squatJump    { 0%,100%{transform:translateY(0)} 30%{transform:translateY(30px) scaleX(1.1) scaleY(.9)} 70%{transform:translateY(-40px) scaleX(.9) scaleY(1.1)} }
@keyframes angkatBarbel { 0%,100%{transform:translateY(0)} 30%{transform:translateY(-10px)} 70%{transform:translateY(-60px)} }
@keyframes keringatBercucuran { 0%{transform:translateY(0);opacity:0} 30%{opacity:1} 100%{transform:translateY(30px) scale(0);opacity:0} }
@keyframes auraMenyala  { 0%{transform:scale(1);opacity:.4} 100%{transform:scale(1.25);opacity:.8;filter:hue-rotate(15deg)} }
@keyframes bayanganSquat { 0%,100%{transform:translateX(-50%) scale(1.2);opacity:.2} 50%{transform:translateX(-50%) scale(.6);opacity:.04} }

/* Fokus */
@keyframes lampuNyala    { 0%{opacity:.5;transform:scale(.9);filter:drop-shadow(0 0 5px #fcc419)} 100%{opacity:1;transform:scale(1.1);filter:drop-shadow(0 0 15px #fcc419)} }
@keyframes melayangRumus { 0%{transform:translateY(0) rotate(0);opacity:0} 20%{opacity:1} 80%{opacity:1} 100%{transform:translateY(-40px) rotate(20deg);opacity:0} }
@keyframes scanLaser     { 0%,100%{transform:translateY(-15px);opacity:0} 10%,90%{opacity:1} 50%{transform:translateY(25px)} }
@keyframes putarRing1    { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
@keyframes putarRing2    { 0%{transform:rotate(360deg)} 100%{transform:rotate(0deg)} }
@keyframes nyalaLaser    { 0%,100%{opacity:.4;transform:scale(.8)} 50%{opacity:1;transform:scale(1.4);filter:drop-shadow(0 0 5px #339af0)} }

/* Senang */
@keyframes tarianSenang  { 0%,100%{transform:translateY(0) scale(1,1)} 25%{transform:translateY(-25px) scale(.9,1.1) rotate(-8deg)} 50%{transform:translateY(0) scale(1.05,.95)} 75%{transform:translateY(-25px) scale(.9,1.1) rotate(8deg)} }
@keyframes loveTerbangSuper { 0%{transform:translate(0,0) scale(.5);opacity:0} 30%{opacity:1} 100%{transform:translate(30px,-80px) scale(1.5) rotate(20deg);opacity:0} }
@keyframes sparkleKelapKelip { 0%,100%{opacity:.3;transform:scale(.8)} 50%{opacity:1;transform:scale(1.2)} }

/* Semangat */
@keyframes lompatRoket   { 0%{transform:translateY(10px) scale(1.1,.9)} 100%{transform:translateY(-80px) scale(.9,1.1)} }
@keyframes apiMembara    { 0%{transform:scaleY(.6);opacity:.7} 100%{transform:scaleY(1.5);opacity:1;filter:brightness(1.5)} }
@keyframes kembangApiMeriah { 0%{transform:scale(.5);opacity:0} 50%{opacity:1} 100%{transform:scale(1.8);opacity:0} }
@keyframes bayanganLompatSuper { 0%{transform:translateX(-50%) scale(1.4);opacity:.2} 100%{transform:translateX(-50%) scale(.2);opacity:0} }

/* Makan */
@keyframes goyangSenang  { 0%,100%{transform:rotate(0)} 25%{transform:rotate(-3deg)} 75%{transform:rotate(3deg)} }
@keyframes ngunyah       { 0%{transform:scaleY(1) translateY(0)} 100%{transform:scaleY(.4) translateY(-5px)} }
@keyframes pipiNgunyah   { 0%{transform:scaleX(1)} 100%{transform:scaleX(1.2) translateX(3px)} }
@keyframes toggleBiskuit { 0%,55%{opacity:1} 60%,100%{opacity:0} }
@keyframes toggleBiskuitBalik { 0%,55%{opacity:0} 60%,95%{opacity:1} 100%{opacity:0} }
@keyframes remahNempel   { 0%,55%{opacity:0} 60%,100%{opacity:1} }
@keyframes hamburRemah   { 0%,55%{opacity:0;transform:translate(0,0)} 60%{opacity:1;transform:translate(0,0)} 85%{opacity:.4} 100%{opacity:0;transform:translate(10px,-20px) scale(.4)} }

/* Kesal */
@keyframes gemetarKesal  { 0%{transform:translate(2px,2px)} 25%{transform:translate(-2px,-2px)} 50%{transform:translate(-2px,2px)} 75%{transform:translate(2px,-2px)} 100%{transform:translate(0,0)} }
@keyframes denyut        { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.3);opacity:.6} }
@keyframes ngepulAsap    { 0%{transform:translateY(0) scale(.5);opacity:0} 50%{opacity:.9} 100%{transform:translateY(-50px) scale(1.5);opacity:0} }

/* ══════════════════════════════════════════════
   PANEL
══════════════════════════════════════════════ */
#fb-panel {
  position:absolute !important; bottom:142px; right:0; width:480px !important; min-width:320px !important; max-width:calc(100vw - 48px) !important;
  background:var(--fb-paper) !important;
  backdrop-filter:blur(24px) !important; -webkit-backdrop-filter:blur(24px) !important;
  border:1.5px solid var(--fb-line) !important;
  border-radius:22px !important; overflow:hidden !important;
  box-shadow:0 20px 60px rgba(0,0,0,.16), 0 6px 20px rgba(0,0,0,.08), 0 0 0 1px rgba(0,0,0,.03) !important;
  transform:scale(.88) translateY(16px); transform-origin:bottom right;
  opacity:0 !important; pointer-events:none !important;
  transition:transform .35s cubic-bezier(.34,1.56,.64,1), opacity .25s ease, background-color .3s, border-color .3s;
  z-index: 2147483647 !important;
}
#fb-panel.open { transform:scale(1) translateY(0); opacity:1 !important; pointer-events:all !important }

/* ── Body & Pane layout — proper spacing ── */
#fb-body {
  padding:20px 22px 24px !important;
  overflow-y:auto !important;
  overflow-x:hidden !important;
  max-height:460px !important;
  scrollbar-width:thin !important;
  scrollbar-color:var(--fb-line) transparent !important;
}
#fb-body::-webkit-scrollbar { width:5px !important; }
#fb-body::-webkit-scrollbar-track { background:transparent !important; }
#fb-body::-webkit-scrollbar-thumb { background:var(--fb-line) !important; border-radius:3px !important; }
.fb-pane { display:none !important; }
.fb-pane.show { display:block !important; }
#fb-resize-handle {
  position:absolute !important; left:0 !important; top:0 !important; bottom:0 !important;
  width:6px !important; cursor:ew-resize !important; z-index:99999 !important;
  background:transparent !important; transition:background 0.2s !important;
}
#fb-resize-handle:hover, #fb-panel.resizing #fb-resize-handle {
  background:var(--fb-blue) !important;
  opacity:0.6 !important;
}

#fb-hdr {
  display:flex !important; flex-direction:column !important;
  padding:18px 22px 0 !important; border-bottom:1px solid var(--fb-line) !important;
  background:linear-gradient(160deg, var(--fb-card) 0%, var(--fb-paper) 100%) !important;
  position:relative !important;
  transition: background-color .3s, border-color .3s;
}
#fb-hdr-accent {
  position:absolute !important; top:0; left:0; right:0; height:4px !important;
  background:linear-gradient(90deg, var(--fb-blue) 0%, var(--fb-gold) 100%) !important;
  border-radius:20px 20px 0 0 !important; z-index:1 !important;
}
#fb-hdr-top {
  display:flex !important; align-items:center !important; justify-content:space-between !important;
  width:100% !important; margin-bottom:4px !important;
}
#fb-hdr-l { display:flex !important; align-items:center !important; gap:12px !important; min-width:0 !important }
#fb-hdr-r { display:flex !important; align-items:center !important; gap:10px !important; flex-shrink:0 !important }
.fb-logo   { font-size:16px !important; font-weight:800 !important; letter-spacing:-.5px !important;
  background:linear-gradient(90deg, var(--fb-blue), var(--fb-gold)) !important; -webkit-background-clip:text !important; -webkit-text-fill-color:transparent !important; background-clip:text !important; }
.fb-date-s { font-size:12px !important; color:var(--fb-ink-mute) !important; font-weight:600 !important; flex-shrink:0 !important }
.fb-pill   { font-size:9px !important; font-weight:800 !important; letter-spacing:1px !important; padding:4px 10px !important; border-radius:12px !important; text-transform:uppercase !important; flex-shrink:0 !important }
#fb-x {
  width:32px !important; height:32px !important; border-radius:10px !important; flex-shrink:0 !important;
  background:var(--fb-line) !important; color:var(--fb-ink-mute) !important;
  cursor:pointer !important; font-size:12px !important;
  display:flex !important; align-items:center !important; justify-content:center !important;
  transition:background .2s,color .2s; border:none !important;
}
#fb-settings-btn {
  width:32px !important; height:32px !important; border-radius:10px !important; flex-shrink:0 !important;
  background:var(--fb-line) !important; color:var(--fb-ink-mute) !important;
  cursor:pointer !important; font-size:14px !important;
  display:flex !important; align-items:center !important; justify-content:center !important;
  transition:background .2s,color .2s, transform .2s; border:none !important;
}
#fb-settings-btn:hover { background:rgba(31,29,27,.10) !important; transform:rotate(45deg); }
#fb-theme-toggle, #fb-web-btn {
  width:32px !important; height:32px !important; border-radius:10px !important; flex-shrink:0 !important;
  background:var(--fb-line) !important; color:var(--fb-ink-mute) !important;
  cursor:pointer !important; font-size:14px !important;
  display:flex !important; align-items:center !important; justify-content:center !important;
  transition:background .2s,color .2s; border:none !important;
}
#fb-theme-toggle:hover, #fb-web-btn:hover { background:rgba(31,29,27,.10) !important; }

/* Identity row */
#fb-identity-row {
  display:none !important; align-items:center !important; gap:12px !important;
  padding:12px 14px !important; margin:14px 0 0 !important;
  background:var(--fb-line-soft) !important; border-radius:12px !important;
  border:1px solid var(--fb-line) !important;
}
#fb-user-name {
  font-size:13px !important; font-weight:700 !important; color:var(--fb-ink) !important;
  white-space:nowrap !important; overflow:hidden !important; text-overflow:ellipsis !important; max-width:120px !important;
}
#fb-user-role {
  font-size:9.5px !important; font-weight:800 !important; letter-spacing:.5px !important;
  padding:3px 8px !important; border-radius:6px !important;
  text-transform:uppercase !important; flex-shrink:0 !important;
}
#fb-user-level {
  font-size:10.5px !important; font-weight:800 !important;
  color:var(--fb-ink) !important; background:var(--fb-line) !important;
  padding:4px 8px !important; border-radius:6px !important;
  flex-shrink:0 !important; margin-left:auto !important;
}
#fb-login-msg {
  display:none !important; font-size:10.5px !important; color:#BDB6AE !important;
  padding:6px 0 8px !important; font-weight:500 !important;
}
/* Settings panel */
#fb-settings-panel {
  display:none; position:absolute !important; top:0; left:0; right:0; bottom:0;
  background:var(--fb-paper) !important; z-index:999 !important;
  flex-direction:column !important;
}
#fb-settings-panel.open { display:flex !important; }
.fb-settings-hdr {
  display:flex !important; align-items:center !important; gap:10px !important;
  padding:16px 18px 14px !important; border-bottom:1.5px solid var(--fb-line) !important;
}
.fb-settings-back {
  width:32px !important; height:32px !important; border-radius:0 !important;
  background:var(--fb-line) !important; color:var(--fb-ink-mute) !important;
  cursor:pointer !important; font-size:14px !important;
  display:flex !important; align-items:center !important; justify-content:center !important;
  border:none !important;
}
.fb-settings-title {
  font-size:15px !important; font-weight:700 !important; color:var(--fb-ink) !important;
}
.fb-settings-body { padding:18px !important; }
.fb-settings-item {
  display:flex !important; align-items:center !important; justify-content:space-between !important;
  padding:14px 0 !important; border-bottom:1px solid var(--fb-line) !important;
}
.fb-settings-item-label {
  font-size:13px !important; font-weight:600 !important; color:var(--fb-ink) !important;
}
.fb-settings-item-sub {
  font-size:10.5px !important; color:var(--fb-ink-mute) !important; margin-top:2px !important;
}
/* Toggle switch */
.fb-toggle {
  position:relative !important; width:42px !important; height:24px !important;
  -webkit-appearance:none !important; appearance:none !important;
  background:rgba(31,29,27,.15) !important; border-radius:0 !important;
  cursor:pointer !important; transition:background .2s !important;
  border:none !important; outline:none !important; flex-shrink:0 !important;
}
.fb-toggle:checked { background:#4A90E2 !important; }
.fb-toggle::before {
  content:'' !important; position:absolute !important; top:2px !important; left:2px !important;
  width:20px !important; height:20px !important; border-radius:0 !important;
  background:white !important; transition:transform .2s !important;
  box-shadow:0 1px 3px rgba(0,0,0,.2) !important;
}
.fb-toggle:checked::before { transform:translateX(18px) !important; }
.fb-settings-user {
  display:flex !important; align-items:center !important; gap:12px !important;
  padding:16px !important; background:rgba(74,144,226,.04) !important;
  border-radius:0 !important; margin-bottom:18px !important;
  border:1px solid rgba(74,144,226,.10) !important;
}
.fb-settings-avatar {
  width:40px !important; height:40px !important; border-radius:0 !important;
  background:linear-gradient(135deg,#4A90E2,#86C0A9) !important;
  display:flex !important; align-items:center !important; justify-content:center !important;
  font-size:18px !important; color:white !important; font-weight:700 !important;
  flex-shrink:0 !important;
}
.fb-settings-user-info { flex:1 !important; min-width:0 !important; }
.fb-settings-user-name {
  font-size:13px !important; font-weight:700 !important; color:var(--fb-ink) !important;
  white-space:nowrap !important; overflow:hidden !important; text-overflow:ellipsis !important;
}
.fb-settings-user-meta {
  font-size:10.5px !important; color:var(--fb-ink-mute) !important; margin-top:2px !important;
}
#fb-x:hover { background:rgba(31,29,27,.10) !important; color:var(--fb-ink) !important }

#fb-tabs {
  display:flex !important; padding:6px !important;
  background:rgba(31,29,27,.04) !important; border-radius:14px !important;
  margin:6px 22px 0 !important; gap:4px !important;
}
.fb-tab {
  flex:1 !important; padding:10px 6px !important; border:none !important; background:transparent !important;
  color:#8A837C !important; font-size:9.5px !important; font-weight:700 !important;
  text-transform:uppercase !important; letter-spacing:.2px !important; cursor:pointer !important;
  display:flex !important; flex-direction:column !important; align-items:center !important; gap:5px !important;
  transition:all .2s cubic-bezier(.34,1.56,.64,1) !important; border-radius:10px !important;
}
.fb-tab .ti { font-size:17px !important; line-height:1 !important; transition:transform .2s !important; display:inline-block !important; }
.fb-tab:hover { color:var(--fb-ink) !important; }
.fb-tab:hover .ti { transform:scale(1.15) !important; }
.fb-tab.act {
  background:var(--fb-paper) !important; color:var(--fb-blue) !important;
  box-shadow:0 2px 8px rgba(0,0,0,.06) !important;
}
.fb-tab.act .ti { transform:scale(1.1) !important; }
.fb-in {
  width:100% !important; display:block !important;
  background:var(--fb-card) !important; border:1.5px solid var(--fb-line) !important;
  color:var(--fb-ink) !important; padding:12px 14px !important; border-radius:12px !important;
  font-size:13px !important; outline:none !important; transition:all .2s;
  color-scheme: light;
}
.fb-in::placeholder { color:var(--fb-ink-mute) !important }
.fb-in:focus { border-color:var(--fb-blue) !important; background:var(--fb-card) !important; box-shadow:0 0 0 3px rgba(0,229,255,0.15) !important; }
textarea.fb-in { resize:none; min-height:88px !important; line-height:1.6 !important }
input[type="date"].fb-in, input[type="time"].fb-in { cursor:pointer !important }
#fb-root.dark .fb-in { color-scheme:dark !important }

.fb-select {
  width:100% !important; box-sizing:border-box !important;
  background-color:var(--fb-card) !important; border:1.5px solid var(--fb-line) !important;
  color:var(--fb-ink) !important; padding:10px 32px 10px 14px !important; border-radius:12px !important;
  font-size:13px !important; outline:none !important; cursor:pointer !important;
  appearance:none !important; -webkit-appearance:none !important;
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%235c6470' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m3 5 3 3 3-3'/%3E%3C/svg%3E") !important;
  background-repeat:no-repeat !important;
  background-position:right 14px center !important;
  background-size:12px !important;
  transition:all .2s !important;
  display:block !important;
  color-scheme: light;
}
.fb-select option {
  background-color: var(--fb-card) !important;
  color: var(--fb-ink) !important;
  padding: 12px !important;
}
#fb-root.dark .fb-select {
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%238ca0b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m3 5 3 3 3-3'/%3E%3C/svg%3E") !important;
  color-scheme: dark !important;
}
.fb-select:hover { border-color:var(--fb-blue) !important }
.fb-select:focus { border-color:var(--fb-blue) !important; box-shadow:0 0 0 3px rgba(0,229,255,0.15) !important }
 
.fb-row { display:flex !important; gap:12px !important; align-items:stretch !important; margin-bottom:16px !important }
.fb-btn {
  display:block !important; cursor:pointer !important; border:none !important; flex-shrink:0 !important;
  padding:12px 18px !important; border-radius:10px !important;
  background:var(--fb-blue) !important; color:#fff !important;
  font-size:13px !important; font-weight:800 !important; white-space:nowrap !important;
  transition:all .2s cubic-bezier(.34,1.56,.64,1) !important; box-shadow:0 2px 6px rgba(0,229,255,.2) !important;
}
.fb-btn:hover { transform:translateY(-1.5px) !important; filter:brightness(1.05) !important; box-shadow:0 4px 12px rgba(0,229,255,.3) !important; }
.fb-btn:active { transform:translateY(0) scale(.98) !important; box-shadow:none !important; }
.fb-btn.sec  { background:var(--fb-line-soft) !important; color:var(--fb-ink) !important; border:1.5px solid var(--fb-line) !important; box-shadow:none !important; }
.fb-btn.sec:hover { background:var(--fb-line) !important; box-shadow:none !important; }
.fb-btn.del  { background:rgba(232,139,125,.1) !important; color:#E88B7D !important; padding:8px 13px !important; font-size:12px !important; box-shadow:none !important; }
.fb-btn.del:hover { background:rgba(232,139,125,.2) !important; box-shadow:none !important; }
.fb-btn.full { width:100% !important; text-align:center !important }

.fb-empty { text-align:center !important; padding:28px 16px 20px !important; color:#8A837C !important; font-size:12.5px !important; font-weight:600 !important }
.fb-empty-ico { font-size:32px !important; margin-bottom:10px !important; opacity:.5 !important; display:block !important }
.fb-list { display:flex !important; flex-direction:column !important; gap:8px !important }

/* ── TASKS REDESIGN ── */

/* Section label: "0/0 SELESAI HARI INI" */
.fb-task-section-hdr {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  margin-bottom: 0 !important;
  background: var(--fb-card) !important;
  padding: 10px 14px 6px !important;
  border: 1px solid var(--fb-line) !important;
  border-bottom: none !important;
  border-radius: 12px 12px 0 0 !important;
}
.fb-task-section-lbl {
  font-size: 10.5px !important;
  font-weight: 700 !important;
  color: var(--fb-ink-mute) !important;
  letter-spacing: 0.8px !important;
  text-transform: uppercase !important;
}
.fb-task-section-stat {
  font-size: 12px !important;
  font-weight: 800 !important;
  color: var(--fb-blue) !important;
  letter-spacing: -.3px !important;
}

/* Progress bar */
.fb-prog-wrap {
  margin-bottom: 18px !important;
  margin-top: 0 !important;
  padding: 0 14px 10px !important;
  background: var(--fb-card) !important;
  border: 1px solid var(--fb-line) !important;
  border-top: none !important;
  border-radius: 0 0 12px 12px !important;
}
.fb-prog {
  height: 6px !important;
  background: var(--fb-line-soft) !important;
  border-radius: 3px !important;
  overflow: hidden !important;
  position: relative !important;
}
.fb-prog-fill {
  height: 100% !important;
  border-radius: 3px !important;
  background: linear-gradient(90deg, var(--fb-blue), var(--fb-gold)) !important;
  transition: width .7s cubic-bezier(.4,0,.2,1);
  position: relative !important;
}
@keyframes progShimmer { 0%{left:-60px} 100%{left:calc(100% + 60px)} }
.fb-prog-fill.running::before {
  content: '' !important;
  position: absolute !important;
  top: 0;
  left: -60px;
  width: 60px !important;
  height: 100% !important;
  background: linear-gradient(90deg,transparent,rgba(255,255,255,.4),transparent) !important;
  animation: progShimmer 1.4s infinite;
}

/* Hero message (hidden but kept for JS) */
.fb-task-hero { display: none !important }
.fb-task-hero-msg {}
.fb-prog-row  { display: none !important }
.fb-prog-stat {}
.fb-prog-pct  {}
.fb-prog-marks { display: none !important }
.fb-prog-mark {}

/* ── Input row ── */
.fb-task-add-row {
  display: flex !important;
  align-items: stretch !important;
  margin-bottom: 24px !important;
}
.fb-task-composer {
  flex: 1 !important;
  min-width: 0 !important;
  background: var(--fb-card) !important;
  border: 1.5px solid var(--fb-line) !important;
  border-radius: 14px !important;
  overflow: visible !important;
  transition: border-color .2s, box-shadow .2s;
  display: flex !important;
  flex-direction: column !important;
  align-items: stretch !important;
}
.fb-task-composer:focus-within {
  border-color: var(--fb-blue) !important;
  box-shadow: 0 0 0 3px var(--fb-blue-soft) !important;
}
.fb-task-input-row {
  display: flex !important;
  align-items: center !important;
  width: 100% !important;
}
/* ── Priority dropdown (single, no double) ── */
.fb-pri-dd {
  position: relative !important;
  flex-shrink: 0 !important;
  border-right: 1px solid var(--fb-line) !important;
}
.fb-pri-sel {
  display: flex !important;
  align-items: center !important;
  gap: 5px !important;
  padding: 0 12px !important;
  height: 100% !important;
  min-height: 40px !important;
  background: transparent !important;
  border: none !important;
  cursor: pointer !important;
  color: var(--fb-ink-mute) !important;
  border-radius: 0 !important;
}
.fb-pri-sel:hover { background: var(--fb-line-soft) !important; }
.fb-pri-dot-sm {
  width: 9px !important;
  height: 9px !important;
  border-radius: 0 !important;
  flex-shrink: 0 !important;
  transition: background .2s, box-shadow .2s;
}
.fb-pri-dd[data-p="high"] .fb-pri-dot-sm { background: #ff6b6b !important; box-shadow: none !important }
.fb-pri-dd[data-p="med"]  .fb-pri-dot-sm { background: #ffd43b !important; box-shadow: none !important }
.fb-pri-dd[data-p="low"]  .fb-pri-dot-sm { background: #69db7c !important; box-shadow: none !important }
.fb-pri-arrow { transition: transform .2s !important; }
.fb-pri-dd.open .fb-pri-arrow { transform: rotate(180deg) !important; }
.fb-pri-menu {
  display: none !important;
  position: absolute !important;
  top: calc(100% + 6px) !important;
  left: 0 !important;
  background: var(--fb-paper) !important;
  border: 1px solid var(--fb-line) !important;
  border-radius: 12px !important;
  padding: 5px !important;
  z-index: 9999 !important;
  min-width: 120px !important;
  box-shadow: 0 4px 12px rgba(0,0,0,.08) !important;
}
.fb-pri-dd.open .fb-pri-menu { display: flex !important; flex-direction: column !important; gap: 2px !important; }
.fb-pri-opt {
  display: flex !important;
  align-items: center !important;
  gap: 9px !important;
  padding: 8px 12px !important;
  border: none !important;
  background: transparent !important;
  color: var(--fb-ink) !important;
  font-size: 13px !important;
  font-weight: 500 !important;
  border-radius: 8px !important;
  cursor: pointer !important;
  text-align: left !important;
  font-family: inherit !important;
  white-space: nowrap !important;
}
.fb-pri-opt:hover { background: var(--fb-line-soft) !important; color: var(--fb-ink) !important; }
.fb-pri-opt.sel { background: var(--fb-blue-soft) !important; color: var(--fb-blue) !important; font-weight: 700 !important; }
.fb-pri-opt-dot {
  width: 8px !important;
  height: 8px !important;
  border-radius: 0 !important;
  flex-shrink: 0 !important;
}
/* ── Premium Task Composer ── */
.fb-task-composer {
  background: var(--fb-card) !important;
  border: 1.5px solid var(--fb-line) !important;
  border-radius: 14px !important;
  margin-bottom: 20px !important;
  overflow: visible !important;
  box-shadow: 0 4px 12px rgba(0,0,0,0.03) !important;
  transition: all 0.3s ease !important;
  display: flex !important;
  flex-direction: column !important;
}
.fb-task-composer:focus-within {
  border-color: var(--fb-blue) !important;
  box-shadow: 0 8px 24px rgba(0,0,0,0.06), 0 0 0 3px var(--fb-blue-soft) !important;
}
.fb-task-main-row {
  display: flex !important;
  align-items: center !important;
  border-bottom: 1px solid var(--fb-line) !important;
}
.fb-task-in-field {
  flex: 1 !important;
  height: 44px !important;
  padding: 0 14px !important;
  border: none !important;
  font-size: 13px !important;
  font-weight: 500 !important;
  outline: none !important;
  background: transparent !important;
  color: var(--fb-ink) !important;
  font-family: inherit !important;
}
.fb-task-in-field::placeholder {
  color: var(--fb-ink-mute) !important;
}
.fb-task-opt-toggle {
  background: transparent !important;
  border: none !important;
  color: var(--fb-ink-mute) !important;
  padding: 0 12px !important;
  height: 44px !important;
  cursor: pointer !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  transition: all 0.2s ease !important;
}
.fb-task-opt-toggle:hover {
  color: var(--fb-ink) !important;
  background: var(--fb-line-soft) !important;
}
.fb-task-opt-toggle.active {
  color: var(--fb-blue) !important;
}
.fb-task-drawer {
  display: none;
  background: var(--fb-card) !important;
  border-top: 1px solid var(--fb-line) !important;
  padding: 20px !important;
  animation: fbSlideDown 0.2s ease-out !important;
}
.fb-task-drawer.open {
  display: block !important;
}
@keyframes fbSlideDown {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}
.fb-task-desc-area {
  width: 100% !important;
  min-height: 60px !important;
  padding: 10px 12px !important;
  border: 1.5px solid var(--fb-line) !important;
  border-radius: 10px !important;
  font-size: 12.5px !important;
  font-family: inherit !important;
  resize: none !important;
  outline: none !important;
  box-sizing: border-box !important;
  color: var(--fb-ink) !important;
  background: var(--fb-line-soft) !important;
  line-height: 1.6 !important;
  margin-bottom: 12px !important;
  transition: background 0.2s, border-color 0.2s !important;
}
.fb-task-desc-area:focus {
  background: var(--fb-card) !important;
  border-color: var(--fb-blue) !important;
}
.fb-task-drawer-row {
  display: flex !important;
  gap: 16px !important;
  margin-bottom: 20px !important;
}
.fb-task-drawer-col {
  flex: 1 !important;
  min-width: 0 !important;
}
.fb-task-field-label {
  font-size: 9.5px !important;
  color: var(--fb-ink-mute) !important;
  margin-bottom: 6px !important;
  font-weight: 800 !important;
  letter-spacing: 0.8px !important;
  text-transform: uppercase !important;
  display: flex !important;
  align-items: center !important;
  gap: 4px !important;
}
.fb-task-actions-row {
  display: flex !important;
  gap: 12px !important;
}
.fb-task-btn {
  padding: 10px 16px !important;
  border-radius: 10px !important;
  font-size: 13px !important;
  font-weight: 700 !important;
  cursor: pointer !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 6px !important;
  transition: all 0.2s ease !important;
  font-family: inherit !important;
}
.fb-task-btn.cancel {
  flex: 1 !important;
  border: 1.5px solid var(--fb-line) !important;
  background: transparent !important;
  color: var(--fb-ink-mute) !important;
}
.fb-task-btn.cancel:hover {
  background: var(--fb-line-soft) !important;
  color: var(--fb-ink) !important;
}
.fb-task-btn.submit {
  flex: 1.8 !important;
  border: none !important;
  background: var(--fb-blue) !important;
  color: #fff !important;
  box-shadow: 0 4px 12px var(--fb-blue-soft) !important;
}
.fb-task-btn.submit:hover {
  opacity: 0.9 !important;
  transform: translateY(-1px) !important;
}
.fb-task-btn.submit:active {
  transform: translateY(0) !important;
}
.fb-task-btn.submit:disabled {
  background: var(--fb-line) !important;
  color: var(--fb-ink-mute) !important;
  cursor: not-allowed !important;
  pointer-events: none !important;
  box-shadow: none !important;
  opacity: 0.7 !important;
}
.fb-task-list2 {
  display: flex !important;
  flex-direction: column !important;
  gap: 14px !important;
}
@keyframes taskSlideIn { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
.fb-task-card {
  display: flex !important;
  align-items: center !important;
  gap: 16px !important;
  padding: 14px 16px !important;
  border-radius: 12px !important;
  background: var(--fb-card) !important;
  border: 1.5px solid var(--fb-line) !important;
  border-left: 4px solid var(--task-color, var(--fb-line)) !important;
  animation: taskSlideIn .25s ease-out;
  transition: all .3s cubic-bezier(.34,1.56,.64,1);
  position: relative !important;
  cursor: default !important;
  box-shadow: 0 4px 16px rgba(0,0,0,.03) !important;
  box-sizing: border-box !important;
}
.fb-task-card.focused {
  border-color: var(--fb-yellow) !important;
  box-shadow: 0 8px 24px rgba(253, 185, 19, 0.15), 0 4px 16px rgba(0,0,0,.03) !important;
}
.fb-task-card.done { border-left-color: var(--fb-line) !important; }
.fb-task-card:hover { transform: translateY(-3px) !important; box-shadow: 0 12px 28px rgba(0,0,0,.06) !important; border-color: var(--fb-line) !important; }
.fb-task-card.done { opacity: .60 !important }
.fb-task-card.done .fb-task-card-txt { text-decoration: line-through !important; color: var(--fb-ink-mute) !important }
.fb-task-card.removing { opacity: 0 !important; transform: translateX(12px) scale(.95) !important }

/* ── Daily Task Actions ── */
.fb-task-actions-group {
  display: flex !important;
  align-items: center !important;
  gap: 6px !important;
  flex-shrink: 0 !important;
}
.fb-task-action-btn {
  width: 30px !important;
  height: 30px !important;
  border-radius: 15px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  border: none !important;
  cursor: pointer !important;
  font-size: 13px !important;
  transition: all 0.2s ease !important;
  padding: 0 !important;
  background: var(--fb-line-soft) !important;
  color: var(--fb-ink) !important;
  box-sizing: border-box !important;
}
.fb-task-action-btn:hover {
  transform: scale(1.15) !important;
}
.fb-task-action-btn:active {
  transform: scale(0.95) !important;
}
.fb-task-action-btn.play-btn {
  background: rgba(81, 207, 102, 0.1) !important;
  color: #2F9E44 !important;
}
.fb-task-action-btn.play-btn.running {
  background: rgba(81, 207, 102, 0.25) !important;
  box-shadow: 0 0 8px rgba(81, 207, 102, 0.4) !important;
  animation: fbPulse 1.5s infinite !important;
}
.fb-task-action-btn.focus-btn {
  background: rgba(253, 185, 19, 0.1) !important;
  color: #D4980A !important;
}
.fb-task-action-btn.del-btn {
  background: rgba(232, 139, 125, 0.1) !important;
  color: #E88B7D !important;
}
.fb-task-action-btn.del-btn:hover {
  background: rgba(232, 139, 125, 0.25) !important;
}
.fb-task-time-tracked-tag.running {
  animation: fbPulse 1.5s infinite !important;
}

@keyframes fbPulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.06); }
  100% { transform: scale(1); }
}

/* Checkbox */
.fb-task-chk2 {
  width: 20px !important;
  height: 20px !important;
  border-radius: 6px !important;
  flex-shrink: 0 !important;
  border: 2px solid var(--fb-line) !important;
  background: var(--fb-card) !important;
  cursor: pointer !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-size: 12px !important;
  color: transparent !important;
  transition: all .25s cubic-bezier(.34,1.56,.64,1);
  box-sizing: border-box !important;
}
.fb-task-chk2:hover { border-color: var(--task-color, var(--fb-blue)) !important; background: var(--fb-line-soft) !important; transform: scale(1.15) !important; }
.fb-task-card.done .fb-task-chk2 {
  background: var(--task-color, var(--fb-blue)) !important;
  color: #fff !important;
  border-color: var(--task-color, var(--fb-blue)) !important;
}
.fb-task-card.done .fb-task-chk2 { animation: none }

.fb-task-card-body {
  flex: 1 !important;
  min-width: 0 !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 8px !important;
  border: none !important;
  background: transparent !important;
  padding: 0 !important;
  margin: 0 !important;
  box-shadow: none !important;
  box-sizing: border-box !important;
}
.fb-task-card-txt {
  font-size: 13.5px !important;
  font-weight: 600 !important;
  color: var(--fb-ink) !important;
  line-height: 1.55 !important;
  word-break: break-word;
  transition: color .2s, text-decoration .2s;
  border: none !important;
  background: transparent !important;
  padding: 0 !important;
  margin: 0 !important;
  box-shadow: none !important;
  box-sizing: border-box !important;
}
.fb-task-card-meta {
  display: flex !important;
  align-items: center !important;
  flex-wrap: wrap !important;
  gap: 8px !important;
  margin-top: 2px !important;
  border: none !important;
  background: transparent !important;
  padding: 0 !important;
  margin: 0 !important;
  box-shadow: none !important;
  box-sizing: border-box !important;
}
.fb-task-pri-tag {
  font-size: 9px !important;
  font-weight: 800 !important;
  letter-spacing: .6px !important;
  text-transform: uppercase !important;
  padding: 3px 8px 3px !important;
  border-radius: 8px !important;
  display: inline-block !important;
  box-sizing: border-box !important;
}
.fb-task-pri-tag.fb-pri-high {
  background: rgba(255, 107, 107, 0.1) !important;
  color: #FF5252 !important;
  border: 1px solid rgba(255, 107, 107, 0.2) !important;
}
.fb-task-pri-tag.fb-pri-med {
  background: rgba(253, 185, 19, 0.1) !important;
  color: #D4980A !important;
  border: 1px solid rgba(253, 185, 19, 0.2) !important;
}
.fb-task-pri-tag.fb-pri-low {
  background: rgba(64, 192, 87, 0.1) !important;
  color: #2F9E44 !important;
  border: 1px solid rgba(64, 192, 87, 0.2) !important;
}
.fb-task-time-tag {
  font-size: 10px !important;
  font-weight: 600 !important;
  color: var(--fb-ink-mute) !important;
  border: none !important;
  background: transparent !important;
  padding: 0 !important;
  margin: 0 !important;
  box-shadow: none !important;
  box-sizing: border-box !important;
}
.fb-task-kpi-tag {
  display: inline-flex !important;
  align-items: center !important;
  gap: 4px !important;
  background: var(--fb-line-soft) !important;
  padding: 3px 8px !important;
  border-radius: 8px !important;
  font-size: 9px !important;
  font-weight: 700 !important;
  color: var(--fb-ink-mute) !important;
  letter-spacing: 0.5px !important;
  border: 1px solid var(--fb-line) !important;
  box-shadow: none !important;
  box-sizing: border-box !important;
  margin: 0 !important;
}

.fb-task-del2 {
  flex-shrink: 0 !important;
  opacity: 0 !important;
  background: none !important;
  border: none !important;
  color: var(--fb-ink-mute) !important;
  cursor: pointer !important;
  font-size: 14px !important;
  padding: 6px 8px !important;
  border-radius: 8px !important;
  transition: all .2s ease;
}
.fb-task-card:hover .fb-task-del2 { opacity: 1 !important }
.fb-task-del2:hover { color: #E88B7D !important; background: rgba(232,139,125,.1) !important; transform: scale(1.1) !important; }

/* All-done celebration banner */
.fb-task-celebrate {
  text-align: center !important;
  padding: 28px 20px 22px !important;
  border-radius: 16px !important;
  background: var(--fb-yellow-soft) !important;
  border: 1px solid var(--fb-yellow-dark) !important;
  animation: taskSlideIn .3s ease;
}
.fb-task-celebrate-ico  { font-size: 40px !important; display: block !important; margin-bottom: 10px !important }
.fb-task-celebrate-msg  { font-size: 14px !important; font-weight: 700 !important; color: var(--fb-yellow-dark) !important }
.fb-task-celebrate-sub  { font-size: 11.5px !important; color: var(--fb-ink-mute) !important; margin-top: 6px !important }

.fb-empty-ico { font-size: 38px !important; margin-bottom: 12px !important; opacity: .5 !important; display: block !important }
.fb-list { display: flex !important; flex-direction: column !important; gap: 8px !important }

@keyframes fb-in { from{opacity:0;transform:translateY(-5px)} to{opacity:1;transform:translateY(0)} }
.fb-task {
  display: flex !important;
  align-items: center !important;
  gap: 12px !important;
  padding: 13px 14px !important;
  border-radius: 12px !important;
  background: var(--fb-card) !important;
  border: 1px solid var(--fb-line) !important;
  animation: fb-in .2s ease;
  transition: all .25s cubic-bezier(.34,1.56,.64,1);
  box-shadow: 0 2px 6px rgba(0,0,0,.03) !important;
}
.fb-task:hover { transform: translateY(-1.5px) !important; box-shadow: 0 6px 12px rgba(0,0,0,.06) !important; border-color: var(--fb-line) !important }
.fb-task.done { opacity: .45 !important }
.fb-chk {
  width: 22px !important;
  height: 22px !important;
  border-radius: 6px !important;
  flex-shrink: 0 !important;
  border: 2px solid var(--fb-blue) !important;
  background: none !important;
  color: transparent !important;
  cursor: pointer !important;
  font-size: 11px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  transition: all .2s cubic-bezier(.34,1.56,.64,1);
}
.fb-chk:hover { transform: scale(1.1) !important; background: var(--fb-blue-soft) !important; }
.fb-task.done .fb-chk { background: var(--fb-blue) !important; color: #fff !important; border-color: var(--fb-blue) !important }
.fb-task-txt { flex: 1 !important; font-size: 13.5px !important; color: var(--fb-ink) !important; line-height: 1.35 !important }
.fb-task.done .fb-task-txt { text-decoration: line-through !important; color: var(--fb-ink-mute) !important }
.fb-del {
  opacity: 0 !important;
  flex-shrink: 0 !important;
  background: none !important;
  border: none !important;
  color: var(--fb-ink-mute) !important;
  cursor: pointer !important;
  font-size: 13px !important;
  padding: 4px 6px !important;
  border-radius: 0 !important;
  transition: opacity .15s, color .15s, background .15s;
}
.fb-task:hover .fb-del { opacity: 1 !important }
.fb-del:hover { color: #E88B7D !important; background: rgba(232,139,125,.12) !important }

/* ── NOTES ── */
.fb-note-composer {
  position: relative !important;
  margin-bottom: 20px !important;
  background: var(--fb-card) !important;
  border: 1px solid var(--fb-line) !important;
  border-left: 4px solid var(--nc,var(--fb-line)) !important;
  border-radius: 14px !important;
  transition: border-color .25s, box-shadow .25s, border-left-color .25s;
  overflow: hidden !important;
  box-shadow: 0 2px 8px rgba(0,0,0,.04) !important;
}
.fb-note-composer:focus-within {
  border-color: var(--nc,var(--fb-blue)) !important;
  border-left-color: var(--nc,var(--fb-blue)) !important;
  background: var(--fb-card) !important;
  box-shadow: 0 8px 24px rgba(0,0,0,.08) !important;
}
.fb-note-composer textarea {
  width: 100% !important;
  display: block !important;
  background: transparent !important;
  border: none !important;
  outline: none !important;
  color: var(--fb-ink) !important;
  padding: 14px 16px 10px !important;
  resize: none;
  font-size: 13px !important;
  line-height: 1.6 !important;
  min-height: 80px !important;
  max-height: 180px !important;
  font-family: inherit !important;
}
.fb-note-composer textarea::placeholder { color: var(--fb-ink-mute) !important }
.fb-note-composer-bar {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  padding: 8px 12px 10px !important;
  gap: 8px !important;
  flex-wrap: wrap !important;
  border-top: 1px solid var(--fb-line) !important;
}

/* Color swatches */
.fb-note-clr-picks { display: flex !important; gap: 6px !important; align-items: center !important }
.fb-clr-dot {
  width: 20px !important;
  height: 20px !important;
  border-radius: 4px !important;
  cursor: pointer !important;
  position: relative !important;
  border: 2px solid transparent !important;
  transition: all .15s ease-in-out;
  flex-shrink: 0 !important;
}
.fb-clr-dot::after {
  content: '' !important;
  position: absolute !important;
  inset: 0;
  border-radius: 4px !important;
  background: rgba(0,0,0,.1) !important;
  opacity: 0 !important;
  transition: opacity .15s;
}
.fb-clr-dot:hover { transform: scale(1.15) }
.fb-clr-dot.sel {
  border: 2px solid var(--fb-ink) !important;
  transform: scale(1.05) !important;
  box-shadow: none !important;
}
.fb-clr-dot.sel::before {
  content: '✓';
  position: absolute !important;
  inset: 0;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-size: 10px !important;
  font-weight: 800 !important;
  color: #fff !important;
  text-shadow: 0 0 2px rgba(0,0,0,0.3);
  z-index: 1;
  line-height: 1 !important;
}

.fb-note-bar-r { display: flex !important; align-items: center !important; gap: 8px !important }
.fb-note-cc2 { font-size: 11.5px !important; color: var(--fb-ink-mute) !important }
.fb-note-save-btn {
  padding: 9px 20px !important;
  border-radius: 10px !important;
  font-size: 13px !important;
  font-weight: 700 !important;
  background: var(--nc,var(--fb-blue)) !important;
  color: #fff !important;
  border: none !important;
  cursor: pointer !important;
  transition: all .2s cubic-bezier(.34,1.56,.64,1);
  letter-spacing: .2px !important;
  box-shadow: 0 2px 6px rgba(0,0,0,.1) !important;
}
.fb-note-save-btn:hover { transform: translateY(-1.5px) !important; box-shadow: 0 4px 12px rgba(0,0,0,.15) !important; filter: brightness(1.05) !important; }
.fb-note-save-btn:active { transform: scale(.96) }

.fb-note-search-wrap { position: relative !important; margin-bottom: 16px !important }
.fb-note-search-wrap input {
  width: 100% !important;
  display: block !important;
  padding: 10px 14px 10px 34px !important;
  background: var(--fb-card) !important;
  border: 1px solid var(--fb-line) !important;
  border-radius: 12px !important;
  color: var(--fb-ink) !important;
  font-size: 13px !important;
  outline: none !important;
  transition: border-color .2s;
  box-shadow: none !important;
}
.fb-note-search-wrap input:focus { border-color: var(--fb-blue) !important; background: var(--fb-card) !important }
.fb-note-search-ico {
  position: absolute !important;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px !important;
  pointer-events: none !important;
  opacity: .45 !important;
}

/* Rich Text Editor */
.fb-rte-btn {
  width: 28px !important; height: 28px !important; display: flex !important; align-items: center !important; justify-content: center !important;
  border: 1px solid var(--fb-line) !important; border-radius: 6px !important; background: transparent !important;
  color: var(--fb-ink) !important; font-size: 12px !important; cursor: pointer !important; transition: all .15s !important;
  font-family: inherit !important; padding: 0 !important; line-height: 1 !important;
}
.fb-rte-btn:hover { background: var(--fb-blue-soft) !important; color: var(--fb-blue) !important; border-color: var(--fb-blue) !important; }
.fb-rte-btn.active { background: var(--fb-blue) !important; color: #fff !important; border-color: var(--fb-blue) !important; }
.fb-rte-editor:empty::before {
  content: attr(data-placeholder); color: var(--fb-ink-mute) !important; font-style: normal; pointer-events: none;
}
.fb-rte-editor:focus { border-color: var(--fb-blue) !important; }
.fb-rte-editor ul, .fb-rte-editor ol { margin: 4px 0 !important; padding-left: 20px !important; }
.fb-rte-editor li { margin-bottom: 2px !important; }
.fb-rte-editor b, .fb-rte-editor strong { font-weight: 800 !important; }

/* Member Picker */
.fb-mp-dept-hdr {
  display: flex !important; align-items: center !important; gap: 8px !important;
  padding: 8px 10px !important; border-radius: 8px !important; background: var(--fb-card) !important;
  border: 1px solid var(--fb-line) !important; cursor: pointer !important;
}
.fb-mp-dept-hdr:hover { border-color: var(--fb-blue) !important; }
.fb-mp-dept-name { flex:1 !important; font-size: 11.5px !important; font-weight: 700 !important; color: var(--fb-ink) !important; }
.fb-mp-dept-selectall {
  padding: 3px 10px !important; border-radius: 6px !important; font-size: 10px !important; font-weight: 800 !important;
  border: none !important; cursor: pointer !important; transition: all .15s !important;
}
.fb-mp-user-row {
  display: flex !important; align-items: center !important; gap: 10px !important;
  padding: 7px 10px 7px 24px !important; border-radius: 8px !important; cursor: pointer !important;
  transition: background .15s !important;
}
.fb-mp-user-row:hover { background: rgba(74,144,226,.06) !important; }
.fb-mp-user-row.selected { background: rgba(74,144,226,.08) !important; }
.fb-mp-avatar {
  width: 28px !important; height: 28px !important; border-radius: 50% !important;
  background: linear-gradient(135deg, var(--fb-blue), #7B6BB5) !important;
  display: flex !important; align-items: center !important; justify-content: center !important;
  color: #fff !important; font-size: 11px !important; font-weight: 800 !important; flex-shrink: 0 !important;
}
.fb-mp-user-info { flex: 1 !important; min-width: 0 !important; }
.fb-mp-user-name { font-size: 12px !important; font-weight: 700 !important; color: var(--fb-ink) !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; }
.fb-mp-user-dept { font-size: 10px !important; color: var(--fb-ink-mute) !important; }
.fb-mp-chk {
  width: 18px !important; height: 18px !important; border-radius: 5px !important; flex-shrink: 0 !important;
  border: 2px solid var(--fb-line) !important; display: flex !important; align-items: center !important; justify-content: center !important;
  transition: all .15s !important; font-size: 10px !important;
}
.fb-mp-chk.checked { background: var(--fb-blue) !important; border-color: var(--fb-blue) !important; color: #fff !important; }
.fb-mp-tag {
  padding: 4px 10px !important; border-radius: 6px !important; font-size: 10.5px !important; font-weight: 800 !important;
  background: var(--fb-blue) !important; color: #fff !important; cursor: pointer !important; white-space: nowrap !important;
  transition: opacity .15s !important;
}
.fb-mp-tag:hover { opacity: .8 !important; }

.fb-note-section-lbl {
  font-size: 9.5px !important;
  font-weight: 800 !important;
  letter-spacing: 1.2px !important;
  text-transform: uppercase !important;
  color: var(--fb-ink-mute) !important;
  margin: 20px 0 10px !important;
  padding: 0 4px !important;
}
.fb-note-section-lbl:first-child { margin-top: 4px !important; }

.fb-note-list-wrap { display: flex !important; flex-direction: column !important; gap: 16px !important; }
.fb-note {
  position: relative !important;
  padding: 18px 20px !important;
  background: var(--note-bg, var(--fb-card)) !important;
  border: 1px solid var(--note-border, var(--fb-line)) !important;
  border-radius: 14px !important;
  animation: fb-in .2s ease;
  transition: all .25s cubic-bezier(.34,1.56,.64,1);
  cursor: default !important;
  box-shadow: 0 2px 8px rgba(0,0,0,.03) !important;
}
.fb-note:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 8px 20px rgba(0,0,0,.08) !important;
  border-color: var(--note-border-hover, var(--fb-line)) !important;
}
.fb-note.pinned {
  border-width: 1.5px !important;
}
.fb-note-top { display: flex !important; align-items: flex-start !important; gap: 6px !important; margin-bottom: 2px !important }
.fb-note-pin-ico { font-size: 10px !important; opacity: .6 !important; flex-shrink: 0 !important; margin-top: 1px !important }
.fb-note-txt {
  font-size: 13px !important;
  color: var(--fb-ink) !important;
  line-height: 1.55 !important;
  white-space: pre-wrap !important;
  word-break: break-word;
  flex: 1 !important;
}
.fb-note-txt.clamped { display: -webkit-box !important; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden !important }
.fb-note-expand {
  font-size: 10.5px !important;
  color: var(--fb-blue) !important;
  background: none !important;
  border: none !important;
  cursor: pointer !important;
  padding: 0 !important;
  margin-top: 4px !important;
  display: block !important;
  transition: opacity .15s;
}
.fb-note-expand:hover { opacity: .75 !important }
.fb-note-meta { display: flex !important; align-items: center !important; justify-content: space-between !important; margin-top: 14px !important }
.fb-note-ts { font-size: 11px !important; color: var(--fb-ink-mute) !important }
.fb-note-actions { display: flex !important; gap: 4px !important; opacity: 0 !important; transition: opacity .15s }
.fb-note:hover .fb-note-actions { opacity: 1 !important }
.fb-note-act {
  padding: 3px 7px !important;
  border-radius: 4px !important;
  font-size: 11px !important;
  background: transparent !important;
  border: none !important;
  color: var(--fb-ink-mute) !important;
  cursor: pointer !important;
  transition: background .15s, color .15s;
}
.fb-note-act:hover { background: var(--fb-line-soft) !important; color: var(--fb-ink) !important }
.fb-note-act.del:hover { background: rgba(232,139,125,.10) !important; color: #E88B7D !important }
.fb-note-act.edit:hover { background: rgba(253,185,19,.08) !important; color: #D4980A !important }
.fb-note-act.pin.active { color: #D4980A !important }

.fb-task-filters {
  display: flex !important;
  gap: 8px !important;
  margin-bottom: 20px !important;
  border-bottom: 1px solid var(--fb-line) !important;
  padding-bottom: 10px !important;
}
.fb-task-filter-btn {
  background: transparent !important;
  border: none !important;
  color: var(--fb-ink-mute) !important;
  font-size: 12px !important;
  font-weight: 600 !important;
  padding: 6px 12px !important;
  cursor: pointer !important;
  transition: all .2s ease !important;
  position: relative !important;
  border-radius: 8px !important;
}
.fb-task-filter-btn:hover {
  color: var(--fb-ink) !important;
}
.fb-task-filter-btn.act {
  color: var(--fb-blue) !important;
  font-weight: 700 !important;
}
.fb-task-filter-btn.act::after {
  content: '' !important;
  position: absolute !important;
  bottom: -9px !important;
  left: 0 !important;
  right: 0 !important;
  height: 2px !important;
  background: var(--fb-blue) !important;
}
.fb-task-count-badge {
  font-size: 10px !important;
  font-weight: 600 !important;
  background: var(--fb-line) !important;
  color: var(--fb-ink-mute) !important;
  padding: 1px 5px !important;
  margin-left: 4px !important;
  border-radius: 4px !important;
}
.fb-task-filter-btn.act .fb-task-count-badge {
  background: var(--fb-blue-soft) !important;
  color: var(--fb-blue) !important;
}

/* --- Timer Card UI (Unified) --- */
.fb-timer-card {
    background: var(--fb-card);
    border-radius: 16px;
    padding: 20px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.06);
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: 100%;
    border: 1px solid var(--fb-line);
}

/* Preset Chips */
.fb-timer-presets {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: center;
}
.fb-timer-preset-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    border-radius: 10px;
    border: 1.5px solid var(--fb-line);
    background: var(--fb-paper);
    color: var(--fb-ink-mute);
    font-size: 11.5px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    flex-shrink: 0;
    white-space: nowrap;
}
.fb-timer-preset-btn:hover {
    border-color: var(--fb-blue);
    color: var(--fb-blue);
    background: var(--fb-blue-soft);
    transform: translateY(-1px);
}
.fb-timer-preset-btn.active {
    background: var(--fb-blue);
    border-color: var(--fb-blue);
    color: #fff;
    box-shadow: 0 4px 12px rgba(74,144,226,0.25);
}

/* Label Row */
.fb-timer-label-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    background: var(--fb-line-soft);
    border: 1.5px solid var(--fb-line);
    border-radius: 12px;
    gap: 12px;
    transition: border-color 0.2s, background 0.2s;
}
.fb-timer-label-row:focus-within {
    border-color: var(--fb-blue);
    background: var(--fb-card);
    box-shadow: 0 0 0 3px var(--fb-blue-soft);
}
.fb-timer-label-key {
    font-size: 11px;
    font-weight: 800;
    color: var(--fb-ink-mute);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    flex-shrink: 0;
}
.fb-timer-label-val {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: var(--fb-ink);
    font-size: 13px;
    font-weight: 700;
    text-align: right;
    font-family: inherit;
    min-width: 0;
}
.fb-timer-label-val::placeholder { color: var(--fb-ink-mute); opacity: 0.6; }

/* Timer Display */
.fb-timer-display {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 16px 0;
}

.fb-timer-input-group {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.fb-timer-input {
    width: 76px;
    height: 72px;
    text-align: center;
    font-size: 46px;
    font-weight: 800;
    color: var(--fb-ink);
    background: var(--fb-line-soft);
    border: 1.5px solid transparent;
    outline: none;
    padding: 0;
    margin: 0;
    border-radius: 14px;
    transition: all 0.2s;
    font-variant-numeric: tabular-nums;
    letter-spacing: -1px;
}
.fb-timer-input:hover { 
    background: var(--fb-line); 
}
.fb-timer-input:focus { 
    background: var(--fb-card);
    border-color: var(--fb-blue);
    box-shadow: 0 4px 16px var(--fb-blue-soft);
}

.fb-timer-colon {
    color: var(--fb-ink-mute);
    font-size: 38px;
    font-weight: 600;
    margin-bottom: 4px;
    line-height: 1;
    opacity: 0.7;
}

/* Action Buttons */
.fb-timer-actions {
    display: flex;
    gap: 12px;
    width: 100%;
    align-items: stretch;
    margin-top: 8px;
}

.fb-timer-btn {
    position: relative !important;
    height: 52px !important;
    border-radius: 16px !important;
    border: none !important;
    font-size: 14.5px !important;
    font-weight: 800 !important;
    cursor: pointer !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 8px !important;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
    font-family: inherit !important;
    line-height: 1 !important;
    box-sizing: border-box !important;
    padding: 0 24px !important;
}

.fb-timer-btn-icon,
.fb-timer-btn-icon svg,
.fb-timer-btn svg {
    position: static !important;
    width: 16px !important;
    height: 16px !important;
    margin: 0 !important;
    padding: 0 !important;
    transform: none !important;
    flex-shrink: 0 !important;
}

.fb-timer-btn-icon {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
}

.fb-timer-btn-text,
#fb-textStartStop {
    position: static !important;
    display: inline-block !important;
    margin: 0 !important;
    padding: 0 !important;
    font-size: 14.5px !important;
    font-weight: 800 !important;
    line-height: 1 !important;
    letter-spacing: 0.3px !important;
}

.fb-btn-reset {
    flex: 0 0 100px !important;
    background: var(--fb-card) !important;
    color: var(--fb-ink-mute) !important;
    border: 1.5px solid var(--fb-line) !important;
}
.fb-btn-reset:hover {
    background: var(--fb-line-soft) !important;
    color: var(--fb-ink) !important;
    border-color: var(--fb-ink-mute) !important;
}

.fb-btn-start {
    flex: 1 !important;
    background: linear-gradient(135deg, #6c5ce7, #845ef7) !important;
    color: white !important;
    box-shadow: 0 6px 20px rgba(108, 92, 231, 0.3) !important;
}
.fb-btn-start:hover {
    background: linear-gradient(135deg, #5b4bc4, #7048e8) !important;
    transform: translateY(-2px) !important;
    box-shadow: 0 8px 24px rgba(108, 92, 231, 0.4) !important;
}
.fb-btn-start:active { transform: translateY(0) !important; }
.fb-btn-start.running {
    background: linear-gradient(135deg, #e84393, #f06595) !important;
    box-shadow: 0 6px 20px rgba(232, 67, 147, 0.3) !important;
}
.fb-btn-start.running:hover { 
    background: linear-gradient(135deg, #cf3a84, #e64980) !important; 
    transform: translateY(-2px) !important; 
}

/* Timer History */
.fb-timer-history-wrap {
    border-top: 1.5px solid var(--fb-line);
    padding-top: 20px;
    margin-top: 12px;
    width: 100%;
}
.fb-timer-history-hdr {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
}
.fb-timer-history-lbl {
    font-size: 10.5px;
    font-weight: 800;
    color: var(--fb-ink-mute);
    text-transform: uppercase;
    letter-spacing: 1px;
}
.fb-timer-history-time {
    font-size: 10px;
    color: var(--fb-ink-mute);
    font-weight: 600;
}
.fb-timer-history-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
    max-height: 280px;
    overflow-y: auto;
    padding-right: 4px;
    scrollbar-width: thin;
}
.fb-timer-history-item {
    display: flex !important;
    align-items: center !important;
    gap: 16px !important;
    padding: 16px 20px !important;
    border-radius: 16px !important;
    background: var(--fb-line-soft) !important;
    border: 1px solid var(--fb-line) !important;
    box-shadow: 0 4px 12px rgba(0,0,0,0.08) !important;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
    box-sizing: border-box !important;
    width: 100% !important;
}
.fb-timer-history-item:hover { 
    border-color: var(--fb-blue); 
    background: var(--fb-paper);
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    transform: translateY(-1px);
}
.fb-timer-history-icon {
    font-size: 18px;
    flex-shrink: 0;
    line-height: 1;
    color: var(--fb-ink-mute);
    opacity: 0.7;
}
.fb-timer-history-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
}
.fb-timer-history-title {
    font-size: 13.5px;
    font-weight: 800;
    color: var(--fb-ink);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.2;
}
.fb-timer-history-dur {
    font-size: 11.5px;
    color: var(--fb-ink-mute);
    margin-top: 4px;
    font-weight: 600;
}
.fb-timer-history-restart {
    padding: 6px 14px;
    border-radius: 20px;
    border: none;
    background: var(--fb-line-soft);
    color: var(--fb-ink);
    font-size: 11.5px;
    font-weight: 800;
    cursor: pointer;
    flex-shrink: 0;
    font-family: inherit;
    transition: all 0.2s;
}
.fb-timer-history-restart:hover {
    background: var(--fb-blue);
    color: #fff;
    transform: scale(1.02);
}
.fb-timer-history-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
}
.fb-timer-history-del {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: transparent;
    border: none;
    color: var(--fb-ink-mute);
    font-size: 16px;
    cursor: pointer;
    border-radius: 50%;
    line-height: 1;
    transition: all 0.2s;
}
.fb-timer-history-del:hover {
    color: #fa5252;
    background: rgba(250,82,82,0.1);
}

/* ── Alarm creator new layout ── */
.fb-al-create-row {
  display:flex !important; gap:8px !important; margin-bottom:8px !important;
}
.fb-al-time-in {
  background:var(--fb-card) !important; color:var(--fb-ink) !important;
  border:1.5px solid var(--fb-line) !important; border-radius:10px !important;
  padding:10px 12px !important; font-size:17px !important; font-weight:600 !important;
  width:110px !important; flex-shrink:0 !important; cursor:pointer !important;
  letter-spacing:.5px !important; text-align:center !important;
}
.fb-al-date-in {
  width:100% !important; background:var(--fb-card) !important; color:var(--fb-ink) !important;
  border:1.5px solid var(--fb-line) !important; border-radius:10px !important;
  padding:8px 12px !important; font-size:12.5px !important; margin-bottom:10px !important;
  cursor:pointer !important;
}
.fb-alarm-lbl-in { flex:1 !important }

/* ── Repeat days row ── */
.fb-al-repeat-row {
  display:none !important;
}
.fb-al-repeat-lbl { font-size:11px !important; color:#8A837C !important; white-space:nowrap !important; font-weight:600 !important }
.fb-al-repeat-btns { display:flex !important; gap:4px !important; flex-wrap:wrap !important }
.fb-al-day {
  width:32px !important; height:28px !important; border-radius:0 !important;
  background:rgba(31,29,27,.04) !important; color:#8A837C !important;
  border:1.5px solid rgba(31,29,27,.08) !important; font-size:10px !important; font-weight:600 !important;
  cursor:pointer !important; transition:all .15s;
}
.fb-al-day.active { background:#4A90E2 !important; color:#fff !important; border-color:transparent !important }
.fb-al-repeat-presets { display:none !important }
.fb-al-preset {
  padding:4px 10px !important; border-radius:8px !important; font-size:11px !important; font-weight:600 !important;
  background:var(--fb-line-soft) !important; color:var(--fb-ink-mute) !important;
  border:1.5px solid var(--fb-line) !important; cursor:pointer !important; transition:all .15s;
}
.fb-al-preset.active { background:var(--fb-blue) !important; color:#fff !important; border-color:transparent !important }
.fb-al-chip {
  padding:6px 12px !important; border-radius:8px !important;
  font-size:11.5px !important; font-weight:600 !important;
  background:var(--fb-card) !important; color:var(--fb-ink-mute) !important;
  border:1.5px solid var(--fb-line) !important; cursor:pointer !important;
  transition:all .18s; white-space:nowrap !important; flex-shrink:0 !important;
}
.fb-al-chip:hover { color:var(--fb-ink) !important; border-color:var(--fb-line) !important }
.fb-al-chip.act {
  background:var(--fb-blue-soft) !important;
  border-color:var(--fb-blue) !important; color:var(--fb-blue) !important;
}

/* ─────────────────────────────────────────────
   MINI CALENDAR WIDGET
   ───────────────────────────────────────────── */
.fb-mini-cal {
  background:var(--fb-card) !important; border:1.5px solid var(--fb-line) !important;
  border-radius:16px !important; padding:16px 18px 18px !important;
  margin-bottom:18px !important; box-shadow:0 4px 20px rgba(0,0,0,.06) !important;
}
.fb-cal-nav-hdr {
  display:flex !important; align-items:center !important; justify-content:space-between !important;
  margin-bottom:12px !important;
}
.fb-cal-nav-btn2 {
  width:30px !important; height:30px !important; border-radius:8px !important; border:none !important;
  background:var(--fb-line-soft) !important; color:var(--fb-ink-mute) !important;
  cursor:pointer !important; font-size:17px !important; font-weight:300 !important;
  display:flex !important; align-items:center !important; justify-content:center !important;
  transition:background .15s, transform .1s; line-height:1 !important;
}
.fb-cal-nav-btn2:hover { background:var(--fb-blue-soft) !important; color:var(--fb-blue) !important; transform:scale(1.05) }
.fb-cal-nav-btn2:active { transform:scale(.92) }
.fb-cal-m-label {
  font-size:14px !important; font-weight:800 !important; color:var(--fb-ink) !important; letter-spacing:-.3px !important;
}
.fb-cal-dow-row2 {
  display:grid !important; grid-template-columns:repeat(7,1fr) !important; margin-bottom:4px !important;
}
.fb-cal-dow2 {
  text-align:center !important; font-size:9px !important; font-weight:700 !important;
  color:var(--fb-ink-mute) !important; letter-spacing:.3px !important; text-transform:uppercase !important;
  padding:3px 0 !important;
}
.fb-cal-grid2 {
  display:grid !important; grid-template-columns:repeat(7,1fr) !important; gap:2px !important;
}
.fb-cal-day2 {
  aspect-ratio:1 !important; display:flex !important; flex-direction:column !important;
  align-items:center !important; justify-content:center !important;
  font-size:11.5px !important; font-weight:500 !important; color:var(--fb-ink) !important;
  border-radius:8px !important; cursor:pointer !important;
  transition:background .12s, color .12s; position:relative !important;
  gap:2px !important; -webkit-user-select:none; user-select:none;
}
.fb-cal-day2:hover:not(.fb-cd-sel) { background:var(--fb-line-soft) !important; }
.fb-cal-day2.fb-cd-other { color:var(--fb-ink-mute) !important; opacity:0.4 !important; }
.fb-cal-day2.fb-cd-today:not(.fb-cd-sel) {
  background:var(--fb-blue-soft) !important; color:var(--fb-blue) !important; font-weight:800 !important;
}
.fb-cal-day2.fb-cd-today:not(.fb-cd-sel)::after {
  content:''; position:absolute !important; inset:0; border-radius:8px !important;
  border:1.5px solid var(--fb-blue) !important; opacity:0.3 !important;
}
.fb-cal-day2.fb-cd-sel {
  background:linear-gradient(135deg,var(--fb-blue),var(--fb-gold)) !important;
  color:#fff !important; font-weight:700 !important;
  box-shadow:0 3px 12px var(--fb-blue-soft) !important;
}
.fb-cd-dots { height:5px !important; display:flex !important; align-items:center !important; justify-content:center !important; gap:2px !important; min-height:5px !important; }
.fb-cd-dot { width:4px !important; height:4px !important; border-radius:50% !important; flex-shrink:0 !important; background:#86C0A9 !important; }
.fb-cd-dot.urg { background:#E88B7D !important; }
.fb-cal-day2.fb-cd-sel .fb-cd-dot, .fb-cal-day2.fb-cd-sel .fb-cd-dot.urg { background:rgba(255,255,255,.65) !important; }
.fb-cal-filter-bar {
  display:flex !important; align-items:center !important; justify-content:space-between !important;
  margin-bottom:12px !important; padding:8px 12px !important;
  background:var(--fb-blue-soft) !important; border-radius:8px !important;
  border:1px solid var(--fb-line) !important; animation:taskSlideIn .2s ease;
}
.fb-cal-filter-lbl { font-size:12px !important; font-weight:600 !important; color:var(--fb-blue) !important; }
.fb-cal-filter-clr {
  font-size:11px !important; color:var(--fb-ink-mute) !important; background:none !important;
  border:none !important; cursor:pointer !important; padding:2px 7px !important;
  border-radius:4px !important; transition:background .15s, color .15s;
}
.fb-cal-filter-clr:hover { background:var(--fb-line-soft) !important; color:var(--fb-ink) !important; }

/* Improved alarm cards */
.fb-alarm-card {
  display:flex !important; align-items:center !important; gap:12px !important;
  padding:13px 14px !important; border-radius:12px !important;
  background:var(--fb-card) !important; border:1.5px solid var(--fb-line) !important;
  border-left:4.5px solid #86C0A9 !important;
  margin-bottom:8px !important; transition:all .2s;
  box-shadow:0 1px 4px rgba(0,0,0,.03) !important;
}
.fb-alarm-card.urgent { border-left-color:#E88B7D !important; }
.fb-alcard-left { flex: 1 !important; display: flex !important; flex-direction: column !important; gap: 3px !important; overflow: hidden !important; }
.fb-alcard-time-big { font-size: 15px !important; font-weight: 800 !important; color: var(--fb-ink) !important; line-height: 1.1 !important; }
.fb-alcard-label { font-size: 13.5px !important; font-weight: 600 !important; color: var(--fb-ink) !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; }
.fb-alcard-repeat { font-size: 11px !important; font-weight: 500 !important; color: var(--fb-ink-mute) !important; }
.fb-alcard-right { display: flex !important; align-items: center !important; gap: 6px !important; flex-shrink: 0 !important; }
.fb-alcard-toggle { padding: 4px 8px !important; border-radius: 6px !important; font-size: 10px !important; font-weight: 800 !important; cursor: pointer !important; border: 1.5px solid var(--fb-line) !important; background: var(--fb-card) !important; color: var(--fb-ink-mute) !important; transition: all .2s !important; }
.fb-alcard-toggle.on { background: rgba(134,192,169,0.15) !important; color: #4A7C59 !important; border-color: rgba(134,192,169,0.3) !important; }
.fb-alcard-del { padding: 4px !important; border-radius: 6px !important; background: transparent !important; color: var(--fb-ink-mute) !important; border: none !important; cursor: pointer !important; font-size: 14px !important; transition: all .2s !important; display: flex !important; align-items: center !important; justify-content: center !important; }
.fb-alcard-del:hover { background: rgba(255,68,68,0.1) !important; color: #FF4444 !important; }

/* ── Overrides for inline/legacy hardcoded colors in HTML ── */
#fb-task-in {
  color: var(--fb-ink) !important;
}
#fb-task-desc {
  color: var(--fb-ink) !important;
  background: var(--fb-line-soft) !important;
  border-top: 1px solid var(--fb-line) !important;
  border-radius: 0 0 12px 12px !important;
}
#fb-task-desc:focus {
  background: var(--fb-card) !important;
}
#fb-task-date, #fb-task-kpi {
  color: var(--fb-ink) !important;
  background-color: var(--fb-card) !important;
  border: 1.5px solid var(--fb-line) !important;
  border-radius: 10px !important;
}
#fb-task-date:focus, #fb-task-kpi:focus {
  border-color: var(--fb-blue) !important;
  box-shadow: 0 0 0 3px var(--fb-blue-soft) !important;
}
.fb-note-composer {
  border-radius: 12px !important;
  border: 1.5px solid var(--fb-line) !important;
  background: var(--fb-card) !important;
}
#fb-note-vis, #fb-note-title, #fb-note-in {
  color: var(--fb-ink) !important;
  background-color: var(--fb-line-soft) !important;
  border: 1.5px solid var(--fb-line) !important;
  border-radius: 8px !important;
}
#fb-note-vis:focus, #fb-note-title:focus, #fb-note-in:focus {
  border-color: var(--fb-blue) !important;
  background-color: var(--fb-card) !important;
}
#fb-chat-active-name {
  color: var(--fb-ink) !important;
}
/* chat UI uses inline styles */
.fb-settings-user-name {
  color: var(--fb-ink) !important;
}
.fb-settings-user-meta {
  color: var(--fb-ink-mute) !important;
}
#fb-x:hover, #fb-settings-btn:hover, #fb-theme-toggle:hover, #fb-web-btn:hover {
  background: var(--fb-line-soft) !important;
  color: var(--fb-ink) !important;
}

/* Quiet Mode — Stops all mascot animations and hides the big character */
#fb-root.quiet-mode #fb-svg-wrap,
#fb-root.quiet-mode #fb-bayangan {
  display: none !important;
}
#fb-root.quiet-mode #fb-badge,
#fb-root.quiet-mode #fb-drag-dot,
#fb-root.quiet-mode #fb-snap-ring {
  display: none !important;
}
#fb-root.quiet-mode .mata-bisa-kedip,
#fb-root.quiet-mode .gelembung-zzz,
#fb-root.quiet-mode .gelembung-ingus,
#fb-root.quiet-mode .tetesan-mata,
#fb-root.quiet-mode .tetes-hujan,
#fb-root.quiet-mode .balon-tiup,
#fb-root.quiet-mode .ledakan-permen,
#fb-root.quiet-mode .jarum-jam,
#fb-root.quiet-mode .pupil-mata,
#fb-root.quiet-mode .barbel,
#fb-root.quiet-mode .keringat,
#fb-root.quiet-mode .aura-api,
#fb-root.quiet-mode .bohlam,
#fb-root.quiet-mode .rumus,
#fb-root.quiet-mode .garis-laser,
#fb-root.quiet-mode .ring-1,
#fb-root.quiet-mode .ring-2,
#fb-root.quiet-mode .mata-laser,
#fb-root.quiet-mode .hati-banyak,
#fb-root.quiet-mode .sparkles-senang,
#fb-root.quiet-mode .kembang-api,
#fb-root.quiet-mode .api-roket,
#fb-root.quiet-mode .biskuit-utuh,
#fb-root.quiet-mode .biskuit-digigit,
#fb-root.quiet-mode .remah-mulut,
#fb-root.quiet-mode .remah-terbang,
#fb-root.quiet-mode .urat-marah,
#fb-root.quiet-mode .asap-kepala {
  animation: none !important;
  transform: none !important;
}

/* ══════════════════════════════════════════════
   TOAST
══════════════════════════════════════════════ */
#fb-toast {
  position: absolute !important;
  top: 10px !important;
  right: 110px !important;
  left: auto !important;
  bottom: auto !important;
  transform: translateX(20px) scale(0.9) !important;
  transform-origin: top right !important;
  background: var(--fb-card) !important;
  border: 1.5px solid var(--fb-line) !important;
  border-radius: 16px !important;
  padding: 16px 40px 16px 20px !important;
  box-shadow: 0 8px 30px rgba(0,0,0,0.12) !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 4px !important;
  z-index: 2147483647 !important;
  opacity: 0 !important;
  pointer-events: none !important;
  transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s ease !important;
  width: 320px !important;
  max-width: 90vw !important;
  box-sizing: border-box !important;
}

#fb-toast.show {
  transform: translateX(0) scale(1) !important;
  opacity: 1 !important;
  pointer-events: auto !important;
}

#fb-toast-ttl {
  font-size: 15px !important;
  font-weight: 800 !important;
  color: var(--fb-ink) !important;
  margin-bottom: 2px !important;
}

#fb-toast-msg {
  font-size: 13.5px !important;
  color: var(--fb-ink-mute) !important;
  line-height: 1.5 !important;
}

#fb-toast-action {
  margin-top: 10px !important;
  padding: 10px 16px !important;
  background: linear-gradient(135deg, var(--fb-blue), #86C0A9) !important;
  color: #fff !important;
  border: none !important;
  border-radius: 10px !important;
  font-weight: 800 !important;
  font-size: 13.5px !important;
  cursor: pointer !important;
  transition: opacity 0.2s, transform 0.1s !important;
  align-self: flex-start !important;
  box-shadow: 0 4px 12px rgba(74,144,226,0.2) !important;
}

#fb-toast-action:hover {
  opacity: 0.9 !important;
  transform: scale(1.02) !important;
}

#fb-toast-action:active {
  transform: scale(0.96) !important;
}

#fb-toast-x {
  position: absolute !important;
  top: 12px !important;
  right: 12px !important;
  width: 28px !important;
  height: 28px !important;
  background: transparent !important;
  border: none !important;
  color: var(--fb-ink-mute) !important;
  font-size: 16px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  cursor: pointer !important;
  border-radius: 8px !important;
  transition: all 0.2s !important;
}

#fb-toast-x:hover {
  background: var(--fb-line-soft) !important;
  color: var(--fb-ink) !important;
}

</style>

<!-- Toast -->
<div id="fb-toast">
  <div id="fb-toast-ttl"></div>
  <div id="fb-toast-msg"></div>
  <button id="fb-toast-action" style="display:none"></button>
  <button id="fb-toast-x">✕</button>
</div>

<!-- Panel -->
<div id="fb-panel">
  <div id="fb-resize-handle"></div>
  <div id="fb-hdr">
    <div id="fb-hdr-accent"></div>
    <div id="fb-hdr-top">
      <div id="fb-hdr-l">
        <span class="fb-logo">FocusBuddy</span>
        <span class="fb-date-s" id="fb-date"></span>
        <span class="fb-pill" id="fb-spill">IDLE</span>
      </div>
      <div id="fb-hdr-r">
        <button id="fb-web-btn" title="Buka Website Happily"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></button>
        <button id="fb-theme-toggle" title="Ubah Tema"></button>
        <button id="fb-settings-btn" title="Pengaturan"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></button>
        <button id="fb-x"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      </div>
    </div>
    <div id="fb-identity-row" style="display:none !important;">
      <div style="width:32px !important; height:32px !important; border-radius:8px !important; background:linear-gradient(135deg,#4A90E2,#86C0A9) !important; color:white !important; display:flex !important; align-items:center !important; justify-content:center !important; font-weight:800 !important; font-size:14px !important; flex-shrink:0 !important;">:)</div>
      <div style="display:flex !important; flex-direction:column !important; flex:1 !important; min-width:0 !important; gap:2px !important;">
        <span id="fb-user-name"></span>
        <span id="fb-user-role"></span>
      </div>
      <span id="fb-user-level"></span>
    </div>
    <div id="fb-login-msg">Login di website untuk sinkronisasi data</div>
  </div>
  <div id="fb-tabs">
    <button class="fb-tab act" data-tab="tasks"><span class="ti"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg></span>Tugas</button>
    <button class="fb-tab"     data-tab="notes"><span class="ti"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg></span>Catatan</button>
    <button class="fb-tab"     data-tab="timer"><span class="ti"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="14" r="8"/><polyline points="12 10 12 14 14 16"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="10" y1="2" x2="14" y2="2"/></svg></span>Timer</button>
    <button class="fb-tab"     data-tab="alarm"><span class="ti"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></span>Kalender</button>
    <button class="fb-tab"     data-tab="chat"><span class="ti"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></span>Chat</button>
  </div>
  <div id="fb-body">

    <!-- LOCKED VIEW -->
    <div class="fb-pane" id="pane-locked" style="display:none; flex-direction:column !important; align-items:center !important; justify-content:center !important; text-align:center !important; padding:45px 24px !important; gap:20px !important;">
      <div style="width:72px !important; height:72px !important; border-radius:24px !important; background:rgba(74,144,226,0.1) !important; display:flex !important; align-items:center !important; justify-content:center !important; font-size:32px !important; animation:melayangHalus 3s infinite ease-in-out !important; border:1px dashed rgba(74,144,226,0.3) !important;">🔒</div>
      <div style="display:flex !important; flex-direction:column !important; gap:8px !important;">
        <div style="font-size:17px !important; font-weight:800 !important; color:var(--fb-ink) !important; letter-spacing:-0.4px !important;">FocusBuddy Terkunci</div>
        <div style="font-size:12.5px !important; color:var(--fb-ink-mute) !important; line-height:1.6 !important; max-width:320px !important; margin:0 auto !important;">Kamu belum login ke Happily. Silakan buka website Happily dan login terlebih dahulu untuk mengaktifkan semua fitur interaktif.</div>
      </div>
      <button id="fb-locked-login-btn" class="fb-btn" style="padding:12px 28px !important; font-size:13.5px !important; border-radius:12px !important; background:linear-gradient(135deg, var(--fb-blue), #86C0A9) !important; border:none !important; color:white !important; font-weight:800 !important; cursor:pointer !important; box-shadow:0 4px 15px rgba(74,144,226,0.3) !important; transition:all 0.2s ease-in-out !important; margin-top:8px !important;">🔗 Buka & Login Happily</button>
    </div>

    <!-- TASKS -->
    <div class="fb-pane show" id="pane-tasks">

      <!-- Section header + slim progress -->
      <div class="fb-task-section-hdr">
        <span class="fb-task-section-lbl">Selesai Hari Ini</span>
        <span class="fb-task-section-stat" id="fb-task-stat">0/0</span>
      </div>
      <div class="fb-prog-wrap">
        <div class="fb-prog">
          <div class="fb-prog-fill" id="fb-pgfill" style="width:0%"></div>
        </div>
      </div>

      <!-- Hidden for JS compat -->
      <div class="fb-task-hero" style="display:none!important">
        <div class="fb-task-hero-msg" id="fb-task-hero-msg"></div>
        <div class="fb-prog-row">
          <span class="fb-prog-stat"></span>
          <span class="fb-prog-pct" id="fb-task-pct">0%</span>
        </div>
        <div class="fb-prog-marks" id="fb-prog-marks"></div>
      </div>

      <!-- Task Add Form — premium unified layout -->
      <div class="fb-task-composer">
        <!-- Main row -->
        <div class="fb-task-main-row">
          <!-- Priority Selector -->
          <div class="fb-pri-dd" id="fb-pri-dd">
            <button class="fb-pri-sel" id="fb-pri-sel" data-p="med" title="Pilih prioritas">
              <span class="fb-pri-dot-sm" id="fb-pri-dot-sm"></span>
              <svg class="fb-pri-arrow" width="8" height="5" viewBox="0 0 8 5" fill="none"><path d="M1 1l3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
            <div class="fb-pri-menu" id="fb-pri-menu">
              <button class="fb-pri-opt" data-p="high"><span class="fb-pri-opt-dot" style="background:#ff8080"></span>Tinggi</button>
              <button class="fb-pri-opt" data-p="med"><span class="fb-pri-opt-dot" style="background:#ffd43b"></span>Sedang</button>
              <button class="fb-pri-opt" data-p="low"><span class="fb-pri-opt-dot" style="background:#69db7c"></span>Rendah</button>
            </div>
          </div>
          
          <!-- Text Input -->
          <input class="fb-task-in-field" id="fb-task-in" placeholder="Apa fokus utamamu hari ini?" />
          
          <!-- Character Count -->
          <span id="fb-task-char-count" style="font-size:10.5px; color:var(--fb-ink-mute); font-weight:700; padding:0 8px; font-variant-numeric:tabular-nums;">0</span>

          <!-- Options Drawer Toggle -->
          <button class="fb-task-opt-toggle" id="fb-task-opt-toggle" title="Opsi lanjutan">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </button>
        </div>

        <!-- Options Drawer -->
        <div class="fb-task-drawer" id="fb-task-form-drawer">
          <!-- Textarea context/description -->
          <textarea class="fb-task-desc-area" id="fb-task-desc" placeholder="Tambahkan deskripsi atau konteks (opsional)…"></textarea>

          <!-- Extra Fields Row (Date + KPI) -->
          <div class="fb-task-drawer-row">
            <div class="fb-task-drawer-col">
              <div class="fb-task-field-label">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> Tanggal
              </div>
              <input type="date" id="fb-task-date" class="fb-in" style="width:100% !important; box-sizing:border-box !important; padding:12px 14px !important; font-size:12.5px !important; display:block !important;" />
            </div>
            <div class="fb-task-drawer-col">
              <div class="fb-task-field-label">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg> KPI Terkait
              </div>
              <select id="fb-task-kpi" class="fb-select" style="width:100% !important; box-sizing:border-box !important; padding:12px 32px 12px 14px !important; font-size:12.5px !important; display:block !important;">
                <option value="">Umum (Tidak ada KPI)</option>
              </select>
            </div>
          </div>

          <!-- Action buttons -->
          <div class="fb-task-actions-row">
            <button id="fb-task-cancel-btn" class="fb-task-btn cancel" type="button">Batal</button>
            <button id="fb-task-add-btn" class="fb-task-btn submit" type="button" disabled>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              <span>Tambah Tugas</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Priority selector — hidden, kept for JS compat -->
      <div class="fb-task-priority-row" style="display:none">
        <span class="fb-task-priority-lbl">Prioritas</span>
        <button class="fb-task-pri-btn" data-p="high">🔴 Tinggi</button>
        <button class="fb-task-pri-btn sel" data-p="med">🟡 Sedang</button>
        <button class="fb-task-pri-btn" data-p="low">🟢 Rendah</button>
      </div>

      <!-- Filter tabs -->
      <div class="fb-task-filters">
        <button class="fb-task-filter-btn act" data-f="all">Semua <span class="fb-task-count-badge" id="fb-fcount-all">0</span></button>
        <button class="fb-task-filter-btn" data-f="active">Aktif <span class="fb-task-count-badge" id="fb-fcount-active">0</span></button>
        <button class="fb-task-filter-btn" data-f="done">Selesai <span class="fb-task-count-badge" id="fb-fcount-done">0</span></button>
      </div>

      <!-- Task list -->
      <div class="fb-task-list2" id="fb-task-list"></div>

      <!-- Habits list -->
      <div id="fb-habits-section" style="margin-top: 16px !important; border-top: 1.5px solid var(--fb-line) !important; padding-top: 12px !important; display: none;">
        <div style="font-size: 11px !important; font-weight: 800 !important; color: var(--fb-ink-mute) !important; text-transform: uppercase !important; letter-spacing: 0.8px !important; margin-bottom: 8px !important; display: flex !important; justify-content: space-between !important; align-items: center !important;">
          <span>LATIHAN HARIAN (HABITS)</span>
        </div>
        <div id="fb-habits-list" style="display: flex !important; flex-direction: column !important; gap: 8px !important;"></div>
      </div>

      <!-- Attendance Buttons -->
      <button id="fb-absen-masuk-btn" class="fb-btn" style="width: 100% !important; margin-top: 16px !important; background: linear-gradient(135deg, #4A90E2, #86C0A9) !important; color: #fff !important; font-weight: 800 !important; padding: 12px !important; border-radius: 12px !important; font-size: 12.5px !important; border: none !important; cursor: pointer !important; display: none; text-align: center !important; box-shadow: 0 4px 12px rgba(74,144,226,0.2) !important; box-sizing: border-box !important;">⏰ Mulai Hari (Clock In)</button>
      <button id="fb-tutup-hari-btn" class="fb-btn" style="width: 100% !important; margin-top: 16px !important; background: linear-gradient(135deg, #86C0A9, #5c8ee8) !important; color: #fff !important; font-weight: 800 !important; padding: 12px !important; border-radius: 12px !important; font-size: 12.5px !important; border: none !important; cursor: pointer !important; display: none; text-align: center !important; box-shadow: 0 4px 12px rgba(134,192,169,0.2) !important; box-sizing: border-box !important;">📝 Tutup Hari (Reflection & Clock Out)</button>
      <div id="fb-hari-selesai-text" style="width: 100% !important; margin-top: 16px !important; padding: 12px !important; border-radius: 12px !important; font-size: 12.5px !important; display: none; text-align: center !important; border: 1.5px solid rgba(134,192,169,0.3) !important; background: rgba(134,192,169,0.06) !important; color: #4e8a71 !important; font-weight: 800 !important; box-sizing: border-box !important;">✅ Hari Ini Sudah Selesai!</div>

      <!-- AI Coach Insights Section -->
      <div id="fb-coach-section" style="margin-top: 16px !important; border-top: 1.5px solid var(--fb-line) !important; padding-top: 12px !important; display: none;">
        <div style="font-size: 11px !important; font-weight: 800 !important; color: var(--fb-ink-mute) !important; text-transform: uppercase !important; letter-spacing: 0.8px !important; margin-bottom: 8px !important;">
          💡 REKOMENDASI AI COACH
        </div>
        <div id="fb-coach-list" style="display: flex !important; flex-direction: column !important; gap: 8px !important;"></div>
      </div>

    </div>

    <!-- TIMER -->
    <div class="fb-pane" id="pane-timer">
        <div class="fb-timer-card">
            <!-- Preset Chips -->
            <div class="fb-timer-presets">
                <button class="fb-timer-preset-btn" data-h="0" data-m="25" data-s="0" data-label="FOKUS">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    25m (Pomo)
                </button>
                <button class="fb-timer-preset-btn" data-h="0" data-m="15" data-s="0" data-label="ISTIRAHAT">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    15m (Istirahat)
                </button>
                <button class="fb-timer-preset-btn" data-h="0" data-m="5" data-s="0" data-label="FOKUS KILAT">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    5m (Cepat)
                </button>
                <button class="fb-timer-preset-btn" data-h="1" data-m="0" data-s="0" data-label="Sesi Panjang">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    1h (Sesi)
                </button>
            </div>

            <!-- Label Row -->
            <div class="fb-timer-label-row">
                <span class="fb-timer-label-key">Label</span>
                <input type="text" id="fb-timer-label-input" class="fb-timer-label-val" placeholder="Sesi Menulis Fokus" maxlength="40">
            </div>

            <!-- Timer Display -->
            <div class="fb-timer-display">
                <div class="fb-timer-input-group">
                    <input type="number" id="fb-timer-hrs" class="fb-timer-input" value="00" min="0" max="99" title="Jam">
                </div>
                <span class="fb-timer-colon">:</span>
                <div class="fb-timer-input-group">
                    <input type="number" id="fb-timer-min" class="fb-timer-input" value="25" min="0" max="59" title="Menit">
                </div>
                <span class="fb-timer-colon">:</span>
                <div class="fb-timer-input-group">
                    <input type="number" id="fb-timer-sec" class="fb-timer-input" value="00" min="0" max="59" title="Detik">
                </div>
            </div>
            
            <div class="fb-timer-actions">
                <button class="fb-timer-btn fb-btn-reset" id="fb-btnReset">
                    <span class="fb-timer-btn-icon">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                    </span>
                    <span class="fb-timer-btn-text">Reset</span>
                </button>
                <button class="fb-timer-btn fb-btn-start" id="fb-btnStartStop">
                    <span class="fb-timer-btn-icon">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" id="fb-iconPlay"><path d="M5 3l14 9-14 9V3z"/></svg>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" id="fb-iconStop" style="display:none;"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
                    </span>
                    <span id="fb-textStartStop">Mulai</span>
                </button>
            </div>

            <!-- Timer History -->
            <div class="fb-timer-history-wrap" id="fb-timer-history-wrap" style="display:none">
                <div class="fb-timer-history-hdr">
                    <span class="fb-timer-history-lbl">Riwayat Timer &amp; Preset</span>
                    <span class="fb-timer-history-time" id="fb-timer-history-ts"></span>
                </div>
                <div class="fb-timer-history-list" id="fb-timer-history-list"></div>
            </div>

        </div>
    </div><!-- /#pane-timer -->
    <!-- NOTES -->
    <div class="fb-pane" id="pane-notes">
      <!-- Header -->
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:18px;">
        <div>
          <div style="font-size:15px; font-weight:800; color:var(--fb-ink); letter-spacing:-.3px;">Catatan</div>
          <div style="font-size:11px; color:var(--fb-ink-mute); margin-top:1px;">Meeting, ide, dan informasi.</div>
        </div>
        <button id="fb-note-add-toggle" style="display:flex; align-items:center; gap:5px; padding:7px 13px; background:var(--fb-blue); color:#fff; border:none; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer; box-shadow:none; transition:all .2s; white-space:nowrap;" onmouseover="this.style.filter='brightness(1.05)'" onmouseout="this.style.filter='none'">
          <span style="font-size:14px; line-height:1;">+</span> Tambah
        </button>
      </div>

      <!-- Search bar -->
      <div class="fb-note-search-wrap" id="fb-note-search-wrap" style="display:none; margin-bottom:12px;">
        <span class="fb-note-search-ico">🔍</span>
        <input type="text" id="fb-note-search" placeholder="Cari judul atau isi catatan…" maxlength="80"/>
      </div>

      <!-- Composer (collapsible) -->
      <div id="fb-note-composer-wrap" style="display:none; margin-bottom:22px;">
        <div class="fb-note-composer" style="border-radius:12px; background:var(--fb-card); border:1px solid var(--fb-line); overflow:hidden;">
          <div style="padding:16px; display:flex; flex-direction:column; gap:14px;">
            <!-- Row: Access + Permission -->
            <div>
              <div style="font-size:10px; font-weight:700; color:var(--fb-ink-mute); letter-spacing:.5px; text-transform:uppercase; margin-bottom:6px;">Akses & Bagikan Catatan</div>
              <div style="display:flex; gap:12px; align-items:center;">
                <select id="fb-note-vis" class="fb-select"
                  style="flex:2; box-sizing:border-box !important; padding:12px 32px 12px 14px !important; font-size:13.5px !important; display:block !important;">
                  <option value="private">🔒 Pribadi (Hanya Saya)</option>
                  <option value="company">🏢 Seluruh Perusahaan</option>
                  <option value="custom">👥 Pilih Anggota Spesifik...</option>
                </select>
                <select id="fb-note-perm" class="fb-select"
                  style="flex:1; box-sizing:border-box !important; padding:12px 32px 12px 14px !important; font-size:13.5px !important; display:none !important;">
                  <option value="view">👁️ Bisa Lihat</option>
                  <option value="edit">✏️ Bisa Edit</option>
                </select>
              </div>
            </div>
            <!-- Member Picker (hidden by default) -->
            <div id="fb-note-member-picker" style="display:none;">
              <div id="fb-note-member-tags" style="display:none; gap:5px; flex-wrap:wrap; padding:8px 10px; border-radius:10px; background:rgba(74,144,226,.08); margin-bottom:10px;"></div>
              <input type="text" id="fb-note-member-search" placeholder="🔍 Cari nama atau departemen..." class="fb-in"
                style="width:100% !important; box-sizing:border-box !important; font-size:13.5px !important; margin-bottom:10px !important;" />
              <div id="fb-note-member-list" style="max-height:180px; overflow-y:auto; display:flex; flex-direction:column; gap:4px; padding-right:4px;"></div>
            </div>
            <!-- Title field -->
            <div>
              <div style="font-size:10px; font-weight:700; color:var(--fb-ink-mute); letter-spacing:.5px; text-transform:uppercase; margin-bottom:6px;">Judul Catatan</div>
              <input class="fb-note-title-in fb-in" id="fb-note-title" placeholder="Rapat Mingguan, Ide Kreatif, dll." maxlength="80" 
                style="width:100% !important; box-sizing:border-box !important; font-size:14px !important; font-weight:600 !important;" />
            </div>
            <!-- Rich text editor -->
            <div>
              <div style="font-size:10px; font-weight:700; color:var(--fb-ink-mute); letter-spacing:.5px; text-transform:uppercase; margin-bottom:6px;">Isi Catatan</div>
              <div id="fb-note-toolbar" style="display:flex; gap:4px; padding:6px 8px; border:1px solid var(--fb-line) !important; border-bottom:none !important; border-radius:8px 8px 0 0 !important; background:var(--fb-bg) !important;">
                <button type="button" class="fb-rte-btn" data-cmd="bold" title="Bold (Ctrl+B)" style="font-weight:800;">B</button>
                <button type="button" class="fb-rte-btn" data-cmd="italic" title="Italic (Ctrl+I)" style="font-style:italic;">I</button>
                <span style="width:1px; background:var(--fb-line); margin:0 4px;"></span>
                <button type="button" class="fb-rte-btn" data-cmd="insertUnorderedList" title="Bullet List">&bull;</button>
                <button type="button" class="fb-rte-btn" data-cmd="insertOrderedList" title="Numbered List">1.</button>
                <span style="width:1px; background:var(--fb-line); margin:0 4px;"></span>
                <button type="button" class="fb-rte-btn" data-cmd="removeFormat" title="Clear Format" style="font-size:11px;">&#10006;</button>
              </div>
              <div id="fb-note-in" contenteditable="true" class="fb-in fb-rte-editor" 
                style="width:100% !important; min-height:100px !important; max-height:200px !important; overflow-y:auto !important; line-height:1.6 !important; box-sizing:border-box !important; border-radius:0 0 12px 12px !important; font-size:13.5px !important;"
                data-placeholder="Tuliskan semua idemu di sini..."></div>
            </div>
          </div>
          <!-- Footer bar -->
          <div style="display:flex; align-items:center; justify-content:flex-end; padding:0 16px 16px;">
            <div style="display:flex; gap:10px; align-items:center;">
              <button id="fb-note-cancel" style="padding:10px 16px !important; border-radius:8px !important; border:1px solid var(--fb-line) !important; background:transparent !important; color:var(--fb-ink-mute) !important; font-size:12.5px !important; font-weight:700 !important; cursor:pointer !important; font-family:inherit !important; transition:all .2s !important;">Batal</button>
              <button id="fb-note-save" style="padding:10px 18px !important; border-radius:8px !important; border:none !important; background:var(--fb-blue) !important; color:#fff !important; font-size:12.5px !important; font-weight:800 !important; cursor:pointer !important; font-family:inherit !important; transition:all .2s !important; box-shadow:0 2px 4px rgba(0,0,0,.1) !important;">Simpan Catatan</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Lists -->
      <div id="fb-note-list"></div>
    </div>

    <!-- CHAT -->
    <div class="fb-pane" id="pane-chat">
      <!-- Channel List View -->
      <div id="fb-chat-channels-view">
        <div class="fb-note-section-lbl" style="margin-top:0">Pesan Masuk</div>
        <div id="fb-chat-channel-list"></div>
      </div>

      <!-- Messages View (Hidden initially) -->
      <div id="fb-chat-messages-view" style="display:none; flex-direction:column; height:370px; padding:0 4px;">
        <!-- Header -->
        <div style="display:flex;align-items:center;gap:12px;padding:10px 0 14px;border-bottom:1px solid var(--fb-line);margin-bottom:10px;">
          <button id="fb-chat-back-btn" style="background:none;border:none;color:#8b5cf6;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:4px;border-radius:8px;transition:background 0.2s;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg, #e0e7ff, #c7d2fe);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;color:#1f2937;">👤</div>
          <div style="flex:1;display:flex;flex-direction:column;justify-content:center;">
            <div id="fb-chat-active-name" style="color:var(--fb-ink);font-weight:700;font-size:15px;line-height:1.2;">Nama</div>
          </div>
          <button style="background:none;border:none;color:#8b5cf6;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:4px;border-radius:8px;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          </button>
        </div>

        <!-- Messages Area -->
        <div id="fb-chat-msgs" style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:18px;padding-right:6px;padding-bottom:10px;scrollbar-width:none;background:transparent;"></div>

        <!-- Composer -->
        <div style="display:flex;gap:10px;margin-top:10px;align-items:center;padding:4px 0;">
          <div style="flex:1;display:flex;align-items:center;background:var(--fb-card);border:1.5px solid var(--fb-line);border-radius:12px;padding:2px 8px;">
            <input id="fb-chat-input" placeholder="Tulis pesan..." style="flex:1;background:transparent;border:none;color:var(--fb-ink);padding:12px 14px;font-size:13.5px;font-family:inherit;outline:none;box-sizing:border-box;margin:0;color-scheme:light dark;"/>
            <button id="fb-chat-send-btn" style="background:transparent;color:var(--fb-blue);border:none;width:36px;height:36px;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;padding:0;margin:0;transition:opacity 0.2s;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transform:translateX(-1px) translateY(1px)"><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2z"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- TEAM PANE (Manager only) -->
    <div class="fb-pane" id="pane-team">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:18px;">
        <div>
          <div style="font-size:15px; font-weight:800; color:var(--fb-ink); letter-spacing:-.3px;">Tim Saya</div>
          <div style="font-size:11px; color:var(--fb-ink-mute); margin-top:2px;">Pantau progres dan verifikasi tugas.</div>
        </div>
      </div>
      <div id="fb-team-list" class="fb-list"></div>
      <div class="fb-empty" id="fb-team-empty" style="display:flex">
        <span class="fb-empty-ico">👥</span>
        Belum terhubung dengan anggota tim
      </div>
    </div>

    <!-- PEOPLE PANE (HR only) -->
    <div class="fb-pane" id="pane-people">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:18px;">
        <div>
          <div style="font-size:15px; font-weight:800; color:var(--fb-ink); letter-spacing:-.3px;">Nadi Perusahaan</div>
          <div style="font-size:11px; color:var(--fb-ink-mute); margin-top:2px;">Metrik karyawan, risiko, dan departemen.</div>
        </div>
      </div>
      <div id="fb-people-list" class="fb-list"></div>
      <div class="fb-empty" id="fb-people-empty" style="display:flex">
        <span class="fb-empty-ico">🏢</span>
        Data karyawan belum tersedia
      </div>
    </div>



    <!-- KALENDER -->
    <div class="fb-pane" id="pane-alarm">

      <!-- RINGING BANNER -->
      <div class="fb-al-ringing" id="fb-al-ringing" style="display:none">
        <span class="fb-al-ring-ico">🔔</span>
        <div class="fb-al-ring-lbl" id="fb-al-ring-lbl">Alarm!</div>
        <button class="fb-al-stop-btn" id="fb-al-stop">Matikan</button>
      </div>

      <!-- ── MINI CALENDAR WIDGET ── -->
      <div class="fb-mini-cal">
        <div class="fb-cal-nav-hdr">
          <button class="fb-cal-nav-btn2" id="fb-cal-prev-btn">&#8249;</button>
          <span class="fb-cal-m-label" id="fb-cal-month-lbl">Mei 2026</span>
          <button class="fb-cal-nav-btn2" id="fb-cal-next-btn">&#8250;</button>
        </div>
        <div class="fb-cal-dow-row2">
          <div class="fb-cal-dow2">Min</div>
          <div class="fb-cal-dow2">Sen</div>
          <div class="fb-cal-dow2">Sel</div>
          <div class="fb-cal-dow2">Rab</div>
          <div class="fb-cal-dow2">Kam</div>
          <div class="fb-cal-dow2">Jum</div>
          <div class="fb-cal-dow2">Sab</div>
        </div>
        <div class="fb-cal-grid2" id="fb-mini-cal-grid"></div>
      </div>

      <!-- Filter strip (shown when a date is selected) -->
      <div class="fb-cal-filter-bar" id="fb-cal-filter-bar" style="display:none">
        <span class="fb-cal-filter-lbl" id="fb-cal-filter-lbl">📅 Semua acara</span>
        <button class="fb-cal-filter-clr" id="fb-cal-filter-clr">Semua &times;</button>
      </div>


      <!-- Event List -->
      <div style="font-size:9.5px; font-weight:800; color:var(--fb-ink-mute); letter-spacing:1px; text-transform:uppercase;
        margin-bottom:10px; padding-left:2px; display:flex; align-items:center; gap:8px;">
        AGENDA<span id="fb-al-cnt-lbl" style="font-size:10px; color:var(--fb-blue); font-weight:700;"></span>
      </div>
      <div class="fb-alarm-list" id="fb-alarm-list"></div>

      <!-- Create Event Form (collapsible) — placed below agenda -->
      <div id="fb-cal-form-details" style="margin-top:16px; border-radius:12px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,.04);">
        <button id="fb-cal-form-toggle" style="width:100%; box-sizing:border-box; display:flex; align-items:center; justify-content:space-between;
          font-size:11px; font-weight:800; color:var(--fb-ink); letter-spacing:0.5px; text-transform:uppercase;
          padding:12px 14px; background:var(--fb-card); border:1.5px solid var(--fb-line); border-radius:12px;
          cursor:pointer; transition:border-color .2s; user-select:none;">
          <span style="display:flex;align-items:center;gap:7px;pointer-events:none;">
            <span style="width:18px;height:18px;background:linear-gradient(135deg,#86C0A9,var(--fb-blue));border-radius:6px;display:inline-flex;align-items:center;justify-content:center;font-size:9px;flex-shrink:0;">📅</span>
            + Buat Acara Baru
          </span>
          <span id="fb-cal-form-arrow" style="font-size:16px; color:var(--fb-ink-mute); transition:transform .2s; line-height:1; flex-shrink:0; pointer-events:none;">›</span>
        </button>
        <div id="fb-cal-form-body" style="display:none; background:var(--fb-card); border:1.5px solid var(--fb-line); border-top:none; border-radius:0 0 12px 12px; overflow:hidden;">
          <div style="padding:16px; display:flex; flex-direction:column; gap:14px;">
            <!-- Event name -->
            <div>
              <div style="font-size:10px; color:var(--fb-ink-mute); margin-bottom:6px; font-weight:700; letter-spacing:.5px; text-transform:uppercase;">Nama acara</div>
              <input id="fb-cal-title" class="fb-in" placeholder="Nama acara…" maxlength="50"
                style="width:100% !important; box-sizing:border-box !important; font-size:14px !important; font-weight:600 !important;" />
            </div>
            <!-- Date + Visibility -->
            <div style="display:flex; gap:12px;">
              <div style="flex:1; min-width:0;">
                <div style="font-size:10px; color:var(--fb-ink-mute); margin-bottom:6px; font-weight:700; letter-spacing:.5px; text-transform:uppercase; display:flex; align-items:center; gap:4px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> Tanggal</div>
                <input type="date" id="fb-cal-date" class="fb-in"
                  style="width:100% !important; box-sizing:border-box !important; font-size:13.5px !important;" />
              </div>
              <div style="flex:1; min-width:0;">
                <div style="font-size:10px; color:var(--fb-ink-mute); margin-bottom:6px; font-weight:700; letter-spacing:.5px; text-transform:uppercase; display:flex; align-items:center; gap:4px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> Visibilitas</div>
                <select id="fb-cal-vis" class="fb-select"
                  style="width:100% !important; box-sizing:border-box !important; padding:12px 32px 12px 14px !important; font-size:13.5px !important; display:block !important;">
                  <option value="private">🔒 Pribadi</option>
                  <option value="company">🏢 Publik</option>
                </select>
              </div>
            </div>
            <!-- Start + End -->
            <div style="display:flex; gap:12px;">
              <div style="flex:1; min-width:0;">
                <div style="font-size:10px; color:var(--fb-ink-mute); margin-bottom:6px; font-weight:700; letter-spacing:.5px; text-transform:uppercase; display:flex; align-items:center; gap:4px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Mulai</div>
                <input type="time" id="fb-cal-start" class="fb-in"
                  style="width:100% !important; box-sizing:border-box !important; font-size:13.5px !important;" />
              </div>
              <div style="flex:1; min-width:0;">
                <div style="font-size:10px; color:var(--fb-ink-mute); margin-bottom:6px; font-weight:700; letter-spacing:.5px; text-transform:uppercase; display:flex; align-items:center; gap:4px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Selesai</div>
                <input type="time" id="fb-cal-end" class="fb-in"
                  style="width:100% !important; box-sizing:border-box !important; font-size:13.5px !important;" />
              </div>
            </div>
          </div>
          <!-- Add button -->
          <button id="fb-cal-add-btn"
            style="width:100% !important; box-sizing:border-box !important; padding:16px !important; border:none !important; border-top:1px solid rgba(31,29,27,.07) !important; cursor:pointer !important;
            background:linear-gradient(135deg,#86C0A9,#4A90E2) !important; color:#fff !important; font-size:13.5px !important; font-weight:800 !important; letter-spacing:.3px !important;
            transition:all .2s cubic-bezier(.34,1.56,.64,1) !important; display:flex !important; align-items:center !important; justify-content:center !important; gap:7px !important; border-radius:0 0 13px 13px !important;"
            onmouseover="this.style.setProperty('transform','translateY(-1px)','important');this.style.setProperty('filter','brightness(1.05)','important')" onmouseout="this.style.setProperty('transform','translateY(0)','important');this.style.setProperty('filter','none','important')">
            <span style="font-size:15px;line-height:1;">+</span> Tambah Acara
          </button>
        </div>
      </div>

    </div>

    <!-- Settings Panel -->
    <div id="fb-settings-panel">
      <div class="fb-settings-hdr">
        <button class="fb-settings-back" id="fb-settings-back">←</button>
        <span class="fb-settings-title">Pengaturan</span>
      </div>
      <div class="fb-settings-body">
        <div class="fb-settings-user" id="fb-settings-user-card" style="display:none;">
          <div class="fb-settings-avatar" id="fb-settings-avatar">👤</div>
          <div class="fb-settings-user-info">
            <div class="fb-settings-user-name" id="fb-settings-user-name">Not logged in</div>
            <div class="fb-settings-user-meta" id="fb-settings-user-meta">Role: None</div>
          </div>
        </div>
        
        <div class="fb-settings-item">
          <div>
            <div class="fb-settings-item-label">Aktifkan FocusBuddy</div>
            <div class="fb-settings-item-sub">Nonaktifkan untuk menyembunyikan FocusBuddy sementara. Klik ikon ekstensi di pojok kanan atas browser untuk memunculkan kembali.</div>
          </div>
          <input type="checkbox" class="fb-toggle" id="fb-settings-toggle" checked />
        </div>
        
        <div class="fb-settings-item">
          <div>
            <div class="fb-settings-item-label">Mode Animasi Karakter</div>
            <div class="fb-settings-item-sub">Matikan untuk membuat mascot diam (Mode Diam)</div>
          </div>
          <input type="checkbox" class="fb-toggle" id="fb-settings-mascot-anim-toggle" checked />
        </div>
      </div>
    </div>

    <!-- Evening Reflection Overlay Modal -->
    <div id="fb-reflection-modal" style="display: none; position: absolute !important; inset: 0 !important; background: var(--fb-paper) !important; z-index: 2000000000 !important; padding: 16px !important; overflow-y: auto !important; flex-direction: column !important; gap: 14px !important; box-sizing: border-box !important;">
      <div style="display: flex !important; justify-content: space-between !important; align-items: center !important; margin-bottom: 4px !important; flex-shrink: 0 !important;">
        <div style="display: flex !important; align-items: center !important; gap: 6px !important;">
          <span style="font-size: 20px !important;">🧘‍♂️</span>
          <span style="font-size: 14px !important; font-weight: 850 !important; color: var(--fb-ink) !important;">Tutup Hari (Clock Out)</span>
        </div>
        <button id="fb-reflection-close" style="background: transparent !important; border: none !important; cursor: pointer !important; color: var(--fb-ink-mute) !important; font-size: 16px !important; font-weight: bold !important; padding: 4px !important;">✕</button>
      </div>

      <div style="background: rgba(134,192,169,0.1) !important; border: 1px solid rgba(134,192,169,0.2) !important; padding: 10px !important; border-radius: 10px !important; font-size: 11.5px !important; color: var(--fb-ink-mute) !important; line-height: 1.4 !important; flex-shrink: 0 !important;">
        Refleksi singkat membantu menjernihkan pikiran sebelum istirahat.
      </div>

      <!-- Mood Selector -->
      <div style="flex-shrink: 0 !important;">
        <div style="font-size: 11.5px !important; font-weight: 800 !important; color: var(--fb-ink) !important; margin-bottom: 6px !important;">Bagaimana perasaanmu saat ini?</div>
        <div style="display: flex !important; gap: 6px !important;">
          <button class="fb-reflect-mood-btn sel" data-mood="joy" style="flex: 1 !important; padding: 10px 4px !important; border-radius: 10px !important; border: 1.5px solid var(--fb-line) !important; background: var(--fb-card) !important; cursor: pointer !important; text-align: center !important; display: block !important;">
            <div style="font-size: 18px !important; margin-bottom: 3px !important; pointer-events: none !important;">😊</div>
            <div style="font-size: 9px !important; font-weight: 700 !important; color: var(--fb-ink-mute) !important; pointer-events: none !important;">Senang</div>
          </button>
          <button class="fb-reflect-mood-btn" data-mood="calm" style="flex: 1 !important; padding: 10px 4px !important; border-radius: 10px !important; border: 1.5px solid var(--fb-line) !important; background: var(--fb-card) !important; cursor: pointer !important; text-align: center !important; display: block !important;">
            <div style="font-size: 18px !important; margin-bottom: 3px !important; pointer-events: none !important;">😌</div>
            <div style="font-size: 9px !important; font-weight: 700 !important; color: var(--fb-ink-mute) !important; pointer-events: none !important;">Tenang</div>
          </button>
          <button class="fb-reflect-mood-btn" data-mood="neutral" style="flex: 1 !important; padding: 10px 4px !important; border-radius: 10px !important; border: 1.5px solid var(--fb-line) !important; background: var(--fb-card) !important; cursor: pointer !important; text-align: center !important; display: block !important;">
            <div style="font-size: 18px !important; margin-bottom: 3px !important; pointer-events: none !important;">😐</div>
            <div style="font-size: 9px !important; font-weight: 700 !important; color: var(--fb-ink-mute) !important; pointer-events: none !important;">Biasa</div>
          </button>
          <button class="fb-reflect-mood-btn" data-mood="tired" style="flex: 1 !important; padding: 10px 4px !important; border-radius: 10px !important; border: 1.5px solid var(--fb-line) !important; background: var(--fb-card) !important; cursor: pointer !important; text-align: center !important; display: block !important;">
            <div style="font-size: 18px !important; margin-bottom: 3px !important; pointer-events: none !important;">🥱</div>
            <div style="font-size: 9px !important; font-weight: 700 !important; color: var(--fb-ink-mute) !important; pointer-events: none !important;">Lelah</div>
          </button>
          <button class="fb-reflect-mood-btn" data-mood="stress" style="flex: 1 !important; padding: 10px 4px !important; border-radius: 10px !important; border: 1.5px solid var(--fb-line) !important; background: var(--fb-card) !important; cursor: pointer !important; text-align: center !important; display: block !important;">
            <div style="font-size: 18px !important; margin-bottom: 3px !important; pointer-events: none !important;">😰</div>
            <div style="font-size: 9px !important; font-weight: 700 !important; color: var(--fb-ink-mute) !important; pointer-events: none !important;">Stres</div>
          </button>
        </div>
      </div>

      <!-- Productivity Selector -->
      <div style="flex-shrink: 0 !important;">
        <div style="font-size: 11.5px !important; font-weight: 800 !important; color: var(--fb-ink) !important; margin-bottom: 6px !important;">Seberapa produktif kamu hari ini?</div>
        <div style="display: flex !important; gap: 8px !important;">
          <button class="fb-reflect-prod-btn sel" data-prod="high" style="flex: 1 !important; padding: 8px !important; border-radius: 10px !important; border: 1.5px solid var(--fb-line) !important; background: var(--fb-card) !important; font-size: 10px !important; font-weight: 700 !important; color: var(--fb-ink-mute) !important; cursor: pointer !important; text-align: center !important; display: block !important;">🤩 Tinggi</button>
          <button class="fb-reflect-prod-btn" data-prod="mid" style="flex: 1 !important; padding: 8px !important; border-radius: 10px !important; border: 1.5px solid var(--fb-line) !important; background: var(--fb-card) !important; font-size: 10px !important; font-weight: 700 !important; color: var(--fb-ink-mute) !important; cursor: pointer !important; text-align: center !important; display: block !important;">🙂 Sedang</button>
          <button class="fb-reflect-prod-btn" data-prod="low" style="flex: 1 !important; padding: 8px !important; border-radius: 10px !important; border: 1.5px solid var(--fb-line) !important; background: var(--fb-card) !important; font-size: 10px !important; font-weight: 700 !important; color: var(--fb-ink-mute) !important; cursor: pointer !important; text-align: center !important; display: block !important;">🥱 Rendah</button>
        </div>
      </div>

      <!-- Work-Life Balance Selector -->
      <div style="flex-shrink: 0 !important;">
        <div style="font-size: 11.5px !important; font-weight: 800 !important; color: var(--fb-ink) !important; margin-bottom: 6px !important;">Bagaimana keseimbangan kerjamu?</div>
        <div style="display: flex !important; gap: 8px !important;">
          <button class="fb-reflect-wl-btn sel" data-wl="balanced" style="flex: 1 !important; padding: 8px !important; border-radius: 10px !important; border: 1.5px solid var(--fb-line) !important; background: var(--fb-card) !important; font-size: 10px !important; font-weight: 700 !important; color: var(--fb-ink-mute) !important; cursor: pointer !important; text-align: center !important; display: block !important;">😎 Seimbang</button>
          <button class="fb-reflect-wl-btn" data-wl="ok" style="flex: 1 !important; padding: 8px !important; border-radius: 10px !important; border: 1.5px solid var(--fb-line) !important; background: var(--fb-card) !important; font-size: 10px !important; font-weight: 700 !important; color: var(--fb-ink-mute) !important; cursor: pointer !important; text-align: center !important; display: block !important;">😐 Lumayan</button>
          <button class="fb-reflect-wl-btn" data-wl="burnout" style="flex: 1 !important; padding: 8px !important; border-radius: 10px !important; border: 1.5px solid var(--fb-line) !important; background: var(--fb-card) !important; font-size: 10px !important; font-weight: 700 !important; color: var(--fb-ink-mute) !important; cursor: pointer !important; text-align: center !important; display: block !important;">😵‍💫 Kewalahan</button>
        </div>
      </div>

      <!-- Blockers Input -->
      <div style="flex-shrink: 0 !important;">
        <div style="font-size: 11.5px !important; font-weight: 800 !important; color: var(--fb-ink) !important; margin-bottom: 4px !important;">Ada hambatan hari ini? <span style="font-weight: 400 !important; color: var(--fb-ink-mute) !important;">(Opsional)</span></div>
        <textarea id="fb-reflect-blockers" placeholder="Tulis hambatanmu (jika ada)..." style="width: 100% !important; padding: 8px !important; border-radius: 10px !important; border: 1.5px solid var(--fb-line) !important; background: var(--fb-card) !important; color: var(--fb-ink) !important; font-size: 11px !important; resize: none !important; min-height: 48px !important; outline: none !important; font-family: inherit !important; box-sizing: border-box !important; margin: 0 !important;"></textarea>
      </div>

    </div>

    <!-- Clock In Overlay Modal -->
    <div id="fb-clockin-modal" style="display: none; position: absolute !important; inset: 0 !important; background: var(--fb-paper) !important; z-index: 2000000000 !important; padding: 16px !important; overflow-y: auto !important; flex-direction: column !important; gap: 14px !important; box-sizing: border-box !important;">
      <div style="display: flex !important; justify-content: space-between !important; align-items: center !important; margin-bottom: 4px !important; flex-shrink: 0 !important;">
        <div style="display: flex !important; align-items: center !important; gap: 6px !important;">
          <span style="font-size: 20px !important;">⏰</span>
          <span style="font-size: 14px !important; font-weight: 850 !important; color: var(--fb-ink) !important;">Clock In Kehadiran</span>
        </div>
        <button id="fb-clockin-close" style="background: transparent !important; border: none !important; cursor: pointer !important; color: var(--fb-ink-mute) !important; font-size: 16px !important; font-weight: bold !important; padding: 4px !important;">✕</button>
      </div>

      <div style="background: rgba(74,144,226,0.1) !important; border: 1px solid rgba(74,144,226,0.2) !important; padding: 10px !important; border-radius: 10px !important; font-size: 11.5px !important; color: var(--fb-ink-mute) !important; line-height: 1.4 !important; flex-shrink: 0 !important;">
        Mulai harimu dengan melakukan check-in kehadiran di bawah ini.
      </div>

      <!-- Tipe Kehadiran Selector -->
      <div style="flex-shrink: 0 !important;">
        <div style="font-size: 11.5px !important; font-weight: 800 !important; color: var(--fb-ink) !important; margin-bottom: 6px !important;">Tipe Kehadiran</div>
        <select id="fb-clockin-type" class="fb-select" style="width: 100% !important; box-sizing: border-box !important; padding: 12px 32px 12px 14px !important; font-size: 12.5px !important; display: block !important;">
          <option value="WFO">Work From Office (WFO)</option>
          <option value="WFA">Work From Anywhere (WFA)</option>
          <option value="DINAS">Perjalanan Dinas (DINAS)</option>
        </select>
      </div>

      <!-- Lokasi Kantor (WFO Only) -->
      <div id="fb-clockin-office-container" style="flex-shrink: 0 !important;">
        <div style="font-size: 11.5px !important; font-weight: 800 !important; color: var(--fb-ink) !important; margin-bottom: 6px !important;">Lokasi Kantor</div>
        <select id="fb-clockin-office" class="fb-select" style="width: 100% !important; box-sizing: border-box !important; padding: 12px 32px 12px 14px !important; font-size: 12.5px !important; display: block !important;">
          <option value="">Memuat kantor...</option>
        </select>
      </div>

      <!-- Catatan/Alasan (Non-WFO or Optional) -->
      <div style="flex-shrink: 0 !important;">
        <div style="font-size: 11.5px !important; font-weight: 800 !important; color: var(--fb-ink) !important; margin-bottom: 4px !important;">Catatan / Alasan</div>
        <input type="text" id="fb-clockin-notes" placeholder="Tulis catatan (misal: wfa cafe)..." style="width: 100% !important; padding: 10px !important; border-radius: 10px !important; border: 1.5px solid var(--fb-line) !important; background: var(--fb-card) !important; color: var(--fb-ink) !important; font-size: 12px !important; outline: none !important; font-family: inherit !important; box-sizing: border-box !important; margin: 0 !important;" />
      </div>

      <!-- Geolocation Status -->
      <div id="fb-clockin-geo" style="background: var(--fb-line-soft) !important; border: 1px solid var(--fb-line) !important; padding: 10px !important; border-radius: 10px !important; font-size: 11px !important; color: var(--fb-ink-mute) !important; line-height: 1.4 !important; display: flex !important; align-items: center !important; gap: 8px !important;">
        <span>📍 Mengambil lokasi...</span>
      </div>

      <button id="fb-clockin-submit" class="fb-btn" style="width: 100% !important; padding: 12px !important; border-radius: 12px !important; background: var(--fb-blue) !important; color: white !important; font-weight: 800 !important; font-size: 13px !important; margin-top: 4px !important; cursor: pointer !important; text-align: center !important; border: none !important; box-shadow: 0 4px 12px var(--fb-blue-soft) !important;">Clock In Sekarang (+20 EXP)</button>
    </div>
  </div>
</div>

<!-- Buddy (SVG character) -->
<div id="fb-buddy">
  <div id="fb-snap-ring"></div>
  <div id="fb-drag-dot"></div>

  <!-- Mini Buddy (Quiet Mode Edge Button) -->
  <div id="fb-mini-buddy">
    <div class="fb-mini-bg">
      <img src="${chrome.runtime.getURL('icons/icon.png')}" width="32" height="32" style="object-fit: contain !important; pointer-events: none !important;" />
    </div>
  </div>

  <div id="fb-svg-wrap" class="state-idle">
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100" height="100" overflow="visible">
      <defs>
        <radialGradient id="fb-grad-badan" cx="40%" cy="30%" r="70%">
          <stop class="stop-1" offset="0%"/>
          <stop class="stop-2" offset="100%"/>
        </radialGradient>
        <!-- Specular highlight (upper-left gloss for 3D sphere effect) -->
        <radialGradient id="fb-grad-specular" cx="35%" cy="25%" r="45%">
          <stop offset="0%"   stop-color="rgba(255,255,255,0.65)"/>
          <stop offset="60%"  stop-color="rgba(255,255,255,0.15)"/>
          <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
        </radialGradient>
        <!-- Rim shadow (bottom-right darkening for depth) -->
        <radialGradient id="fb-grad-rim" cx="70%" cy="75%" r="55%">
          <stop offset="0%"   stop-color="rgba(0,0,0,0.22)"/>
          <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
        </radialGradient>
        <filter id="fb-blur-pipi" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4"/>
        </filter>
        <!-- Text/glow drop shadow for ZZZ and other text elements -->
        <filter id="fb-text-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="2" dy="2" stdDeviation="1.5" flood-color="#3b5bdb" flood-opacity="0.9"/>
        </filter>
      </defs>

      <!-- ── BACKGROUND EFFECTS ── -->

      <!-- Api Roket (semangat) -->
      <g class="api-roket">
        <path d="M 80 195 C 88 170 100 158 100 158 C 100 158 112 170 120 195 Z" fill="#fcc419"/>
        <path d="M 85 195 C 92 175 100 163 100 163 C 100 163 108 175 115 195 Z" fill="#ff922b"/>
        <path d="M 88 195 C 94 180 100 170 100 170 C 100 170 106 180 112 195 Z" fill="#ff6b6b"/>
      </g>

      <!-- Aura Api (olahraga) -->
      <g class="aura-api">
        <ellipse cx="100" cy="168" rx="85" ry="18" fill="#ff6b6b" opacity="0.35"/>
        <ellipse cx="100" cy="172" rx="60" ry="12" fill="#ff922b" opacity="0.4"/>
      </g>

      <!-- Awan Hujan (sedih) -->
      <g class="awan-hujan">
        <circle cx="60"  cy="32" r="22" fill="#dee2e6"/>
        <circle cx="85"  cy="20" r="28" fill="#dee2e6"/>
        <circle cx="115" cy="20" r="28" fill="#dee2e6"/>
        <circle cx="140" cy="32" r="22" fill="#dee2e6"/>
        <circle cx="160" cy="44" r="16" fill="#dee2e6"/>
        <g class="tetes-hujan">
          <line x1="72"  y1="52" x2="66"  y2="74" stroke="#74c0fc" stroke-width="3" stroke-linecap="round"/>
          <line x1="100" y1="48" x2="94"  y2="70" stroke="#74c0fc" stroke-width="3" stroke-linecap="round"/>
          <line x1="128" y1="48" x2="122" y2="70" stroke="#74c0fc" stroke-width="3" stroke-linecap="round"/>
          <line x1="150" y1="55" x2="144" y2="77" stroke="#74c0fc" stroke-width="3" stroke-linecap="round"/>
        </g>
      </g>

      <!-- Jam Menunggu (menunggu) -->
      <g class="jam-menunggu">
        <circle cx="165" cy="38" r="26" fill="white" stroke="#20c997" stroke-width="4"/>
        <line x1="165" y1="38" x2="165" y2="16" stroke="#20c997" stroke-width="3.5" stroke-linecap="round" class="jarum-jam"/>
        <line x1="165" y1="38" x2="183" y2="38" stroke="#20c997" stroke-width="3.5" stroke-linecap="round"/>
        <circle cx="165" cy="38" r="4" fill="#20c997"/>
        <!-- Tick marks -->
        <line x1="165" y1="14" x2="165" y2="18" stroke="#20c997" stroke-width="2"/>
        <line x1="165" y1="58" x2="165" y2="62" stroke="#20c997" stroke-width="2"/>
        <line x1="141" y1="38" x2="145" y2="38" stroke="#20c997" stroke-width="2"/>
        <line x1="185" y1="38" x2="189" y2="38" stroke="#20c997" stroke-width="2"/>
      </g>

      <!-- Kembang Api (semangat) -->
      <g class="kembang-api">
        <g transform="translate(18,45)">
          <line x1="0" y1="0" x2="0"  y2="-18" stroke="#ff922b" stroke-width="3" stroke-linecap="round"/>
          <line x1="0" y1="0" x2="13" y2="-13" stroke="#ffd43b" stroke-width="3" stroke-linecap="round"/>
          <line x1="0" y1="0" x2="18" y2="0"   stroke="#ff922b" stroke-width="3" stroke-linecap="round"/>
          <line x1="0" y1="0" x2="0"  y2="18"  stroke="#ffd43b" stroke-width="3" stroke-linecap="round"/>
          <line x1="0" y1="0" x2="-13" y2="-13" stroke="#ff6b6b" stroke-width="3" stroke-linecap="round"/>
        </g>
        <g transform="translate(182,42)">
          <line x1="0" y1="0" x2="0"   y2="-18" stroke="#ffd43b" stroke-width="3" stroke-linecap="round"/>
          <line x1="0" y1="0" x2="-13" y2="-13" stroke="#ff922b" stroke-width="3" stroke-linecap="round"/>
          <line x1="0" y1="0" x2="-18" y2="0"   stroke="#ffd43b" stroke-width="3" stroke-linecap="round"/>
          <line x1="0" y1="0" x2="13"  y2="-13" stroke="#ff6b6b" stroke-width="3" stroke-linecap="round"/>
          <line x1="0" y1="0" x2="0"   y2="18"  stroke="#ff922b" stroke-width="3" stroke-linecap="round"/>
        </g>
        <g transform="translate(22,162)">
          <circle cx="0" cy="0" r="4" fill="#ff6b6b"/>
          <line x1="0" y1="0" x2="0"  y2="-14" stroke="#ff6b6b" stroke-width="2.5" stroke-linecap="round"/>
          <line x1="0" y1="0" x2="10" y2="-10" stroke="#ffd43b" stroke-width="2.5" stroke-linecap="round"/>
          <line x1="0" y1="0" x2="14" y2="0"   stroke="#ff922b" stroke-width="2.5" stroke-linecap="round"/>
        </g>
      </g>

      <!-- Hati Banyak (senang) -->
      <g class="hati-banyak">
        <path d="M 22 70 A 8 8 0 0 1 38 70 A 8 8 0 0 1 54 70 Q 54 82 38 94 Q 22 82 22 70 Z" fill="#ff8787" opacity="0.9"/>
        <path d="M 155 25 A 7 7 0 0 1 169 25 A 7 7 0 0 1 183 25 Q 183 35 169 45 Q 155 35 155 25 Z" fill="#ff8787" opacity="0.9"/>
        <path d="M 8 128 A 5 5 0 0 1 18 128 A 5 5 0 0 1 28 128 Q 28 136 18 144 Q 8 136 8 128 Z" fill="#ff8787" opacity="0.7"/>
      </g>

      <!-- Elemen Mikir (fokus) -->
      <g class="elemen-mikir">
        <g class="bohlam">
          <path d="M 90 18 Q 100 0 110 18 Q 116 32 106 44 L 94 44 Q 84 32 90 18 Z" fill="#fcc419"/>
          <rect x="96" y="44" width="8" height="10" rx="3" fill="#adb5bd"/>
          <line x1="93" y1="52" x2="107" y2="52" stroke="#adb5bd" stroke-width="2"/>
        </g>
        <g class="rumus">
          <text x="5" y="38" fill="#845ef7" font-size="18" font-weight="bold" font-family="monospace">E=mc²</text>
          <text x="168" y="60" fill="#845ef7" font-size="26" font-weight="bold">∞</text>
          <text x="172" y="20" fill="#845ef7" font-size="22" font-weight="bold">∑</text>
        </g>
      </g>

      <!-- Asap Kepala (kesal) -->
      <g class="asap-kepala">
        <circle cx="65"  cy="18" r="9"  fill="#adb5bd" opacity="0.8"/>
        <circle cx="100" cy="8"  r="13" fill="#adb5bd" opacity="0.8"/>
        <circle cx="135" cy="18" r="9"  fill="#adb5bd" opacity="0.8"/>
        <circle cx="82"  cy="4"  r="7"  fill="#ced4da" opacity="0.6"/>
        <circle cx="118" cy="4"  r="7"  fill="#ced4da" opacity="0.6"/>
      </g>

      <!-- Sparkles Senang -->
      <g class="sparkles-senang">
        <path d="M 24 90 L 28 100 L 18 100 Z" fill="#ffd43b"/>
        <path d="M 176 90 L 180 100 L 170 100 Z" fill="#ffd43b"/>
        <path d="M 14 140 L 18 150 L 8 150 Z"  fill="#ffd43b"/>
        <path d="M 186 135 L 190 145 L 180 145 Z" fill="#ffd43b"/>
        <circle cx="20"  cy="60" r="3" fill="#ffd43b"/>
        <circle cx="180" cy="60" r="3" fill="#ffd43b"/>
        <circle cx="10"  cy="115" r="2" fill="#ffd43b"/>
        <circle cx="190" cy="115" r="2" fill="#ffd43b"/>
      </g>

      <!-- Holo Rings (fokus) -->
      <g class="holo-rings" style="transform-origin:100px 110px">
        <ellipse class="ring-1" cx="100" cy="110" rx="96" ry="30" fill="none" stroke="#339af0" stroke-width="2" opacity="0.5" style="transform-origin:100px 110px"/>
        <ellipse class="ring-2" cx="100" cy="110" rx="78" ry="24" fill="none" stroke="#845ef7" stroke-width="1.5" opacity="0.4" style="transform-origin:100px 110px"/>
      </g>

      <!-- ── BADAN UTAMA ── -->
      <path d="M100,25 C150,25 190,65 190,110 C190,155 150,190 100,190 C50,190 10,155 10,110 C10,65 50,25 100,25 Z"
            fill="url(#fb-grad-badan)"/>
      <!-- Specular gloss (upper-left) for 3D sphere look -->
      <path d="M100,25 C150,25 190,65 190,110 C190,155 150,190 100,190 C50,190 10,155 10,110 C10,65 50,25 100,25 Z"
            fill="url(#fb-grad-specular)" pointer-events="none"/>
      <!-- Rim shadow (lower-right) for depth -->
      <path d="M100,25 C150,25 190,65 190,110 C190,155 150,190 100,190 C50,190 10,155 10,110 C10,65 50,25 100,25 Z"
            fill="url(#fb-grad-rim)" pointer-events="none"/>

      <!-- ── AKSESORI ── -->

      <!-- Topi Tidur -->
      <g class="topi-tidur">
        <path d="M 48 42 L 142 42 L 178 62 L 148 18 Z" fill="#3b5bdb"/>
        <rect x="48" y="37" width="94" height="14" rx="7" fill="white"/>
        <circle cx="172" cy="68" r="13" fill="#fcc419"/>
        <path d="M 160 62 L 172 55 L 184 62" fill="none" stroke="#fcc419" stroke-width="2"/>
      </g>

      <!-- Kacamata Tebal (fokus) -->
      <g class="kacamata-tebal">
        <rect x="34" y="76" width="54" height="38" rx="10" fill="rgba(255,255,255,0.35)" stroke="#212529" stroke-width="6"/>
        <rect x="112" y="76" width="54" height="38" rx="10" fill="rgba(255,255,255,0.35)" stroke="#212529" stroke-width="6"/>
        <line x1="88"  y1="95" x2="112" y2="95" stroke="#212529" stroke-width="6"/>
        <line x1="8"   y1="95" x2="34"  y2="95" stroke="#212529" stroke-width="5"/>
        <line x1="166" y1="95" x2="192" y2="95" stroke="#212529" stroke-width="5"/>
        <line x1="40"  y1="95" x2="160" y2="95" stroke="#339af0" stroke-width="3.5" class="garis-laser" opacity="0"/>
      </g>

      <!-- Ikat Kepala (olahraga) -->
      <g class="ikat-kepala">
        <path d="M 16 72 Q 100 92 184 72 L 178 52 Q 100 72 22 52 Z" fill="#ff6b6b"/>
        <path d="M 16 72 Q 100 92 184 72" fill="none" stroke="#fa5252" stroke-width="2.5"/>
      </g>

      <!-- Urat Marah (kesal) -->
      <g class="urat-marah">
        <path d="M 148 48 L 158 48 L 158 38 L 163 38 L 163 48 L 173 48 L 173 53 L 163 53 L 163 63 L 158 63 L 158 53 L 148 53 Z" fill="#fa5252"/>
      </g>

      <!-- Pipi -->
      <g class="pipi-container">
        <ellipse class="pipi" cx="44"  cy="122" rx="17" ry="10" filter="url(#fb-blur-pipi)" opacity="0.75"/>
        <ellipse class="pipi" cx="156" cy="122" rx="17" ry="10" filter="url(#fb-blur-pipi)" opacity="0.75"/>
      </g>

      <!-- ── ALIS ── -->
      <g class="alis-group">
        <g class="alis-sedih">
          <path d="M 44 80 Q 60 64 76 75" fill="none" stroke="#212529" stroke-width="5.5" stroke-linecap="round"/>
          <path d="M 156 80 Q 140 64 124 75" fill="none" stroke="#212529" stroke-width="5.5" stroke-linecap="round"/>
        </g>
        <g class="alis-marah">
          <line x1="44" y1="74" x2="80" y2="94" stroke="#212529" stroke-width="7" stroke-linecap="round"/>
          <line x1="156" y1="74" x2="120" y2="94" stroke="#212529" stroke-width="7" stroke-linecap="round"/>
        </g>
        <g class="alis-fokus">
          <line x1="44" y1="80" x2="80" y2="85" stroke="#212529" stroke-width="5" stroke-linecap="round"/>
          <line x1="156" y1="76" x2="120" y2="85" stroke="#212529" stroke-width="5" stroke-linecap="round"/>
        </g>
      </g>

      <!-- ── MATA (default kedip) ── -->
      <g class="mata-bisa-kedip">
        <g class="mata-kiri">
          <circle cx="65" cy="95" r="14" fill="#212529"/>
          <g class="pupil-mata">
            <circle cx="68" cy="90" r="5.5" fill="#ffffff"/>
            <circle cx="60" cy="99" r="2.5" fill="#ffffff"/>
          </g>
        </g>
        <g class="mata-kanan">
          <circle cx="135" cy="95" r="14" fill="#212529"/>
          <g class="pupil-mata">
            <circle cx="132" cy="90" r="5.5" fill="#ffffff"/>
            <circle cx="140" cy="99" r="2.5" fill="#ffffff"/>
          </g>
        </g>
      </g>

      <!-- ── MATA KHUSUS ── -->
      <g class="mata-khusus">
        <!-- Sedih -->
        <g class="mata-sedih">
          <circle cx="65" cy="95" r="14" fill="#212529"/>
          <path d="M 52 95 A 13 13 0 0 0 78 95 Z" fill="#74c0fc" opacity="0.8"/>
          <circle cx="68" cy="90" r="4.5" fill="#ffffff"/>
          <circle cx="60" cy="99" r="2" fill="#ffffff"/>
          <circle cx="135" cy="95" r="14" fill="#212529"/>
          <path d="M 122 95 A 13 13 0 0 0 148 95 Z" fill="#74c0fc" opacity="0.8"/>
          <circle cx="132" cy="90" r="4.5" fill="#ffffff"/>
          <circle cx="140" cy="99" r="2" fill="#ffffff"/>
        </g>
        <!-- Fokus laser -->
        <g class="mata-fokus">
          <circle cx="65"  cy="95" r="14" fill="#212529"/>
          <circle cx="65"  cy="95" r="5"  fill="#339af0" class="mata-laser"/>
          <circle cx="135" cy="95" r="14" fill="#212529"/>
          <circle cx="135" cy="95" r="5"  fill="#339af0" class="mata-laser"/>
        </g>
        <!-- Tidur -->
        <g class="mata-tidur">
          <path d="M 50 100 L 80 100" fill="none" stroke="#212529" stroke-width="5.5" stroke-linecap="round"/>
          <path d="M 120 100 L 150 100" fill="none" stroke="#212529" stroke-width="5.5" stroke-linecap="round"/>
        </g>
        <!-- Olahraga (> <) -->
        <g class="mata-ngotot">
          <path d="M 48 88 L 74 100 L 48 112" fill="none" stroke="#212529" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M 152 88 L 126 100 L 152 112" fill="none" stroke="#212529" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
        </g>
        <!-- Semangat bintang -->
        <g class="mata-bintang">
          <path d="M 65 74 L 72 88 L 88 90 L 76 102 L 80 117 L 65 109 L 50 117 L 54 102 L 42 90 L 58 88 Z" fill="#212529"/>
          <path d="M 65 82 L 69 90 L 77 91 L 71 97 L 73 105 L 65 101 L 57 105 L 59 97 L 53 91 L 61 90 Z" fill="#fff"/>
          <path d="M 135 74 L 142 88 L 158 90 L 146 102 L 150 117 L 135 109 L 120 117 L 124 102 L 112 90 L 128 88 Z" fill="#212529"/>
          <path d="M 135 82 L 139 90 L 147 91 L 141 97 L 143 105 L 135 101 L 127 105 L 129 97 L 123 91 L 131 90 Z" fill="#fff"/>
        </g>
        <!-- Senang (^ ^) -->
        <g class="mata-senang">
          <path d="M 50 105 Q 65 84 80 105" fill="none" stroke="#212529" stroke-width="7" stroke-linecap="round"/>
          <path d="M 120 105 Q 135 84 150 105" fill="none" stroke="#212529" stroke-width="7" stroke-linecap="round"/>
        </g>
      </g>

      <!-- ── MULUT ── -->
      <path class="mulut" d="M 90 125 Q 100 130 110 125"
            fill="none" stroke="#212529" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>

      <!-- ── PROPERTI DEPAN ── -->

      <!-- Permen Karet (menunggu) -->
      <g class="permen-karet">
        <circle cx="100" cy="140" r="16" fill="#ffb8fc" stroke="#f06595" stroke-width="2.5" class="balon-tiup"/>
        <g class="ledakan-permen">
          <line x1="100" y1="120" x2="100" y2="106" stroke="#f06595" stroke-width="3" stroke-linecap="round"/>
          <line x1="100" y1="160" x2="100" y2="174" stroke="#f06595" stroke-width="3" stroke-linecap="round"/>
          <line x1="80"  y1="140" x2="66"  y2="140" stroke="#f06595" stroke-width="3" stroke-linecap="round"/>
          <line x1="120" y1="140" x2="134" y2="140" stroke="#f06595" stroke-width="3" stroke-linecap="round"/>
          <line x1="86"  y1="126" x2="76"  y2="116" stroke="#f06595" stroke-width="3" stroke-linecap="round"/>
          <line x1="114" y1="126" x2="124" y2="116" stroke="#f06595" stroke-width="3" stroke-linecap="round"/>
          <line x1="86"  y1="154" x2="76"  y2="164" stroke="#f06595" stroke-width="3" stroke-linecap="round"/>
          <line x1="114" y1="154" x2="124" y2="164" stroke="#f06595" stroke-width="3" stroke-linecap="round"/>
        </g>
      </g>

      <!-- Gelembung Ingus (tidur) -->
      <path class="gelembung-ingus"
            d="M 108 108 C 130 98 136 124 116 130 C 96 136 90 118 108 108 Z"
            fill="rgba(255,255,255,0.65)" stroke="white" stroke-width="2.5"/>

      <!-- Air Mata (sedih) -->
      <g class="air-mata-imut">
        <rect class="tetesan-mata"       x="60" y="107" width="9" height="16" rx="4.5" fill="#74c0fc"/>
        <rect class="tetesan-mata delay" x="130" y="107" width="9" height="16" rx="4.5" fill="#74c0fc"/>
      </g>

      <!-- Keringat (olahraga) -->
      <g class="keringat">
        <path d="M 168 78 C 178 93 178 106 168 106 C 158 106 158 93 168 78 Z" fill="#74c0fc"/>
        <path d="M 32  88 C 42  103 42  116 32  116 C 22  116 22  103 32  88 Z" fill="#74c0fc"/>
      </g>

      <!-- Barbel (olahraga) -->
      <g class="barbel">
        <rect x="0"   y="114" width="46" height="12" fill="#adb5bd" rx="6"/>
        <rect x="4"   y="99"  width="16" height="42" fill="#212529" rx="5"/>
        <rect x="25"  y="99"  width="16" height="42" fill="#212529" rx="5"/>
        <rect x="154" y="114" width="46" height="12" fill="#adb5bd" rx="6"/>
        <rect x="158" y="99"  width="16" height="42" fill="#212529" rx="5"/>
        <rect x="179" y="99"  width="16" height="42" fill="#212529" rx="5"/>
      </g>

      <!-- Biskuit (makan) -->
      <g class="biskuit-animasi">
        <g class="biskuit-utuh">
          <circle cx="100" cy="148" r="26" fill="#e85d04"/>
          <circle cx="90"  cy="138" r="4.5" fill="#370617"/>
          <circle cx="112" cy="143" r="5.5" fill="#370617"/>
          <circle cx="94"  cy="158" r="3.5" fill="#370617"/>
          <circle cx="116" cy="155" r="4"   fill="#370617"/>
          <circle cx="103" cy="148" r="3"   fill="#370617"/>
        </g>
        <g class="biskuit-digigit">
          <path d="M 74 148 A 26 26 0 1 0 126 148 A 10 10 0 0 1 116 136 A 10 10 0 0 1 94 130 A 10 10 0 0 1 78 140 Z" fill="#e85d04"/>
          <circle cx="94"  cy="158" r="3.5" fill="#370617"/>
          <circle cx="116" cy="155" r="4"   fill="#370617"/>
          <circle cx="107" cy="162" r="3"   fill="#370617"/>
        </g>
        <g class="remah-terbang">
          <circle cx="88"  cy="142" r="4.5" fill="#e85d04"/>
          <circle cx="112" cy="136" r="3.5" fill="#e85d04"/>
          <circle cx="100" cy="130" r="5.5" fill="#e85d04"/>
          <circle cx="94"  cy="136" r="2.5" fill="#370617"/>
          <circle cx="106" cy="147" r="3"   fill="#e85d04"/>
        </g>
      </g>

      <!-- Remah Mulut (makan) -->
      <g class="remah-mulut">
        <circle cx="80"  cy="148" r="4"   fill="#d9480f"/>
        <circle cx="85"  cy="156" r="2.5" fill="#d9480f"/>
        <circle cx="120" cy="150" r="4.5" fill="#d9480f"/>
        <circle cx="116" cy="158" r="3"   fill="#d9480f"/>
        <circle cx="104" cy="163" r="3.5" fill="#370617" opacity="0.8"/>
      </g>

      <!-- ZZZ (tidur) -->
      <g class="gelembung-zzz">
        <text x="138" y="50" fill="white" font-size="32" font-weight="900" font-family="Nunito,sans-serif" filter="url(#fb-text-shadow)">Z</text>
        <text x="163" y="28" fill="white" font-size="22" font-weight="900" font-family="Nunito,sans-serif" filter="url(#fb-text-shadow)">z</text>
        <text x="178" y="12" fill="white" font-size="15" font-weight="900" font-family="Nunito,sans-serif" filter="url(#fb-text-shadow)">z</text>
      </g>

    </svg>
  </div>

  <div id="fb-bayangan"></div>
  <div id="fb-genangan"></div>

  <div id="fb-badge"></div>
</div>`

  // ── Refs ──
  const $ = id => root.querySelector('#' + id)
  const panel = $('fb-panel')
  const buddy = $('fb-buddy')
  const badge = $('fb-badge')
  const toast = $('fb-toast')
  const svgWrap = $('fb-svg-wrap')

  // ── Ensure buddy is visible immediately after DOM creation ──
  if (buddy) {
    buddy.style.display = '';
    buddy.style.visibility = 'visible';
    buddy.style.opacity = '1';
  }

  // ── Start user detection & sync AFTER DOM is ready ──
  detectFlowbeeUser()
  initReflectionModal()
  initClockInModal()
  
  // Initial render of habits and coach insights
  renderHabits()
  renderCoachInsights()

  setInterval(() => {
    detectFlowbeeUser()
    if (!availableKPIs || !availableKPIs.length) loadKPIs()
    flowbeeSyncAll()
    checkReflectionReminder()
  }, 30000)

  $('fb-date').textContent = new Date().toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })

  const da = new Date(Date.now() + 3600000); da.setSeconds(0, 0)
  const p2 = n => String(n).padStart(2, '0')
  // Pre-fill hidden manual fields with +1hr as a sensible default
  if ($('fb-al-date')) $('fb-al-date').value = `${da.getFullYear()}-${p2(da.getMonth() + 1)}-${p2(da.getDate())}`
  if ($('fb-al-time')) $('fb-al-time').value = `${p2(da.getHours())}:${p2(da.getMinutes())}`

