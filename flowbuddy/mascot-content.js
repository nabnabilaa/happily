// mascot-content.js - Floating Mascot with Rich Animations & Injected UI Panel
(function() {
  if (document.getElementById('flowbuddy-mascot-container')) return;

  const container = document.createElement('div');
  container.id = 'flowbuddy-mascot-container';
  container.style.position = 'fixed';
  // Default position
  container.style.bottom = '20px';
  container.style.right = '20px';
  container.style.zIndex = '2147483647';
  container.style.fontFamily = "'Inter', system-ui, sans-serif";
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.alignItems = 'flex-end';
  container.style.pointerEvents = 'none'; // Only allow clicks on actual elements
  
  // Create Panel (Iframe)
  const panelWrapper = document.createElement('div');
  panelWrapper.id = 'flowbuddy-panel-wrapper';
  panelWrapper.style.width = '420px';
  panelWrapper.style.height = '600px';
  panelWrapper.style.minHeight = '300px';
  panelWrapper.style.minWidth = '300px';
  panelWrapper.style.maxWidth = '90vw';
  panelWrapper.style.maxHeight = '80vh';
  panelWrapper.style.background = '#ffffff';
  panelWrapper.style.borderRadius = '24px';
  panelWrapper.style.boxShadow = '0 10px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)';
  panelWrapper.style.marginBottom = '16px';
  panelWrapper.style.overflow = 'hidden';
  panelWrapper.style.display = 'none'; // Hidden initially
  panelWrapper.style.opacity = '0';
  panelWrapper.style.transform = 'translateY(-45%) scale(0.95)';
  panelWrapper.style.transition = 'opacity 0.3s ease, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), left 0.3s ease, right 0.3s ease';
  panelWrapper.style.pointerEvents = 'auto';
  panelWrapper.style.position = 'absolute';
  panelWrapper.style.top = '50%';

  // Iframe for popup.html
  const iframe = document.createElement('iframe');
  iframe.src = chrome.runtime.getURL('popup.html');
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = 'none';
  panelWrapper.appendChild(iframe);

  // Resize handle for panel
  const resizeHandle = document.createElement('div');
  resizeHandle.style.position = 'absolute';
  resizeHandle.style.bottom = '0';
  resizeHandle.style.left = '0'; // Resize from bottom-left since it's anchored bottom-right
  resizeHandle.style.width = '20px';
  resizeHandle.style.height = '20px';
  resizeHandle.style.cursor = 'sw-resize';
  resizeHandle.style.zIndex = '10';
  panelWrapper.appendChild(resizeHandle);

  container.appendChild(panelWrapper);

  // Mascot Wrapper
  const mascotWrapper = document.createElement('div');
  mascotWrapper.id = 'flowbuddy-mascot-btn';
  mascotWrapper.style.width = '100px';
  mascotWrapper.style.height = '100px';
  mascotWrapper.style.position = 'relative';
  mascotWrapper.style.cursor = 'grab';
  mascotWrapper.style.pointerEvents = 'auto';
  
  const tooltip = document.createElement('div');
  tooltip.id = 'flowbuddy-mascot-tooltip';
  tooltip.textContent = 'Halo! 👋';
  mascotWrapper.appendChild(tooltip);

  mascotWrapper.innerHTML += `
<div id="fb-buddy">
  <div id="flowbuddy-mini-mascot">
    <div class="fb-mini-bg">
      <img src="${chrome.runtime.getURL('icons/icon.png')}" width="32" height="32" style="object-fit: contain; pointer-events: none;" />
    </div>
  </div>
  <div id="fb-ext-svg-wrap" class="hp-buddy-svg-wrap state-idle">
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" width="100" height="100" overflow="visible">
      <defs>
        <radialGradient id="fb-ext-grad-badan" cx="40%" cy="30%" r="70%">
          <stop class="stop-1" offset="0%"/>
          <stop class="stop-2" offset="100%"/>
        </radialGradient>
        <radialGradient id="fb-ext-grad-specular" cx="35%" cy="25%" r="45%">
          <stop offset="0%"   stop-color="rgba(255,255,255,0.65)"/>
          <stop offset="60%"  stop-color="rgba(255,255,255,0.15)"/>
          <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
        </radialGradient>
        <radialGradient id="fb-ext-grad-rim" cx="70%" cy="75%" r="55%">
          <stop offset="0%"   stop-color="rgba(0,0,0,0.22)"/>
          <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
        </radialGradient>
        <filter id="fb-ext-blur-pipi" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4"/>
        </filter>
        <filter id="fb-ext-text-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="2" dy="2" stdDeviation="1.5" flood-color="#3b5bdb" flood-opacity="0.9"/>
        </filter>
      </defs>

      <!-- BACKGROUND EFFECTS -->
      <g class="api-roket">
        <path d="M 80 195 C 88 170 100 158 100 158 C 100 158 112 170 120 195 Z" fill="#fcc419"/>
        <path d="M 85 195 C 92 175 100 163 100 163 C 100 163 108 175 115 195 Z" fill="#ff922b"/>
        <path d="M 88 195 C 94 180 100 170 100 170 C 100 170 106 180 112 195 Z" fill="#ff6b6b"/>
      </g>

      <g class="aura-api">
        <ellipse cx="100" cy="168" rx="85" ry="18" fill="#ff6b6b" opacity="0.35"/>
        <ellipse cx="100" cy="172" rx="60" ry="12" fill="#ff922b" opacity="0.4"/>
      </g>

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

      <g class="jam-menunggu">
        <circle cx="165" cy="38" r="26" fill="white" stroke="#20c997" stroke-width="4"/>
        <line x1="165" y1="38" x2="165" y2="16" stroke="#20c997" stroke-width="3.5" stroke-linecap="round" class="jarum-jam"/>
        <line x1="165" y1="38" x2="183" y2="38" stroke="#20c997" stroke-width="3.5" stroke-linecap="round"/>
        <circle cx="165" cy="38" r="4" fill="#20c997"/>
        <line x1="165" y1="14" x2="165" y2="18" stroke="#20c997" stroke-width="2"/>
        <line x1="165" y1="58" x2="165" y2="62" stroke="#20c997" stroke-width="2"/>
        <line x1="141" y1="38" x2="145" y2="38" stroke="#20c997" stroke-width="2"/>
        <line x1="185" y1="38" x2="189" y2="38" stroke="#20c997" stroke-width="2"/>
      </g>

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
      </g>

      <g class="hati-banyak">
        <path d="M 22 70 A 8 8 0 0 1 38 70 A 8 8 0 0 1 54 70 Q 54 82 38 94 Q 22 82 22 70 Z" fill="#ff8787" opacity="0.9"/>
        <path d="M 155 25 A 7 7 0 0 1 169 25 A 7 7 0 0 1 183 25 Q 183 35 169 45 Q 155 35 155 25 Z" fill="#ff8787" opacity="0.9"/>
        <path d="M 8 128 A 5 5 0 0 1 18 128 A 5 5 0 0 1 28 128 Q 28 136 18 144 Q 8 136 8 128 Z" fill="#ff8787" opacity="0.7"/>
      </g>

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

      <g class="asap-kepala">
        <circle cx="65"  cy="18" r="9"  fill="#adb5bd" opacity="0.8"/>
        <circle cx="100" cy="8"  r="13" fill="#adb5bd" opacity="0.8"/>
        <circle cx="135" cy="18" r="9"  fill="#adb5bd" opacity="0.8"/>
        <circle cx="82"  cy="4"  r="7"  fill="#ced4da" opacity="0.6"/>
        <circle cx="118" cy="4"  r="7"  fill="#ced4da" opacity="0.6"/>
      </g>

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

      <g class="holo-rings" style="transform-origin:100px 110px">
        <ellipse class="ring-1" cx="100" cy="110" rx="96" ry="30" fill="none" stroke="#339af0" stroke-width="2" opacity="0.5" style="transform-origin:100px 110px"/>
        <ellipse class="ring-2" cx="100" cy="110" rx="78" ry="24" fill="none" stroke="#845ef7" stroke-width="1.5" opacity="0.4" style="transform-origin:100px 110px"/>
      </g>

      <!-- BADAN UTAMA -->
      <path d="M100,25 C150,25 190,65 190,110 C190,155 150,190 100,190 C50,190 10,155 10,110 C10,65 50,25 100,25 Z" fill="url(#fb-ext-grad-badan)"/>
      <path d="M100,25 C150,25 190,65 190,110 C190,155 150,190 100,190 C50,190 10,155 10,110 C10,65 50,25 100,25 Z" fill="url(#fb-ext-grad-specular)" pointer-events="none"/>
      <path d="M100,25 C150,25 190,65 190,110 C190,155 150,190 100,190 C50,190 10,155 10,110 C10,65 50,25 100,25 Z" fill="url(#fb-ext-grad-rim)" pointer-events="none"/>

      <!-- AKSESORI -->
      <g class="topi-tidur">
        <path d="M 48 42 L 142 42 L 178 62 L 148 18 Z" fill="#3b5bdb"/>
        <rect x="48" y="37" width="94" height="14" rx="7" fill="white"/>
        <circle cx="172" cy="68" r="13" fill="#fcc419"/>
        <path d="M 160 62 L 172 55 L 184 62" fill="none" stroke="#fcc419" stroke-width="2"/>
      </g>

      <g class="kacamata-tebal">
        <rect x="34" y="76" width="54" height="38" rx="10" fill="rgba(255,255,255,0.35)" stroke="#212529" stroke-width="6"/>
        <rect x="112" y="76" width="54" height="38" rx="10" fill="rgba(255,255,255,0.35)" stroke="#212529" stroke-width="6"/>
        <line x1="88"  y1="95" x2="112" y2="95" stroke="#212529" stroke-width="6"/>
        <line x1="8"   y1="95" x2="34"  y2="95" stroke="#212529" stroke-width="5"/>
        <line x1="166" y1="95" x2="192" y2="95" stroke="#212529" stroke-width="5"/>
        <line x1="40"  y1="95" x2="160" y2="95" stroke="#339af0" stroke-width="3.5" class="garis-laser" opacity="0"/>
      </g>

      <g class="ikat-kepala">
        <path d="M 16 72 Q 100 92 184 72 L 178 52 Q 100 72 22 52 Z" fill="#ff6b6b"/>
        <path d="M 16 72 Q 100 92 184 72" fill="none" stroke="#fa5252" stroke-width="2.5"/>
      </g>

      <g class="urat-marah">
        <path d="M 148 48 L 158 48 L 158 38 L 163 38 L 163 48 L 173 48 L 173 53 L 163 53 L 163 63 L 158 63 L 158 53 L 148 53 Z" fill="#fa5252"/>
      </g>

      <g class="pipi-container">
        <ellipse class="pipi" cx="44"  cy="122" rx="17" ry="10" filter="url(#fb-ext-blur-pipi)" opacity="0.75"/>
        <ellipse class="pipi" cx="156" cy="122" rx="17" ry="10" filter="url(#fb-ext-blur-pipi)" opacity="0.75"/>
      </g>

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

      <g class="mata-khusus">
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
        <g class="mata-fokus">
          <circle cx="65"  cy="95" r="14" fill="#212529"/>
          <circle cx="65"  cy="95" r="5"  fill="#339af0" class="mata-laser"/>
          <circle cx="135" cy="95" r="14" fill="#212529"/>
          <circle cx="135" cy="95" r="5"  fill="#339af0" class="mata-laser"/>
        </g>
        <g class="mata-tidur">
          <path d="M 50 100 L 80 100" fill="none" stroke="#212529" stroke-width="5.5" stroke-linecap="round"/>
          <path d="M 120 100 L 150 100" fill="none" stroke="#212529" stroke-width="5.5" stroke-linecap="round"/>
        </g>
        <g class="mata-ngotot">
          <path d="M 48 88 L 74 100 L 48 112" fill="none" stroke="#212529" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M 152 88 L 126 100 L 152 112" fill="none" stroke="#212529" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
        </g>
        <g class="mata-bintang">
          <path d="M 65 74 L 72 88 L 88 90 L 76 102 L 80 117 L 65 109 L 50 117 L 54 102 L 42 90 L 58 88 Z" fill="#212529"/>
          <path d="M 65 82 L 69 90 L 77 91 L 71 97 L 73 105 L 65 101 L 57 105 L 59 97 L 53 91 L 61 90 Z" fill="#fff"/>
          <path d="M 135 74 L 142 88 L 158 90 L 146 102 L 150 117 L 135 109 L 120 117 L 124 102 L 112 90 L 128 88 Z" fill="#212529"/>
          <path d="M 135 82 L 139 90 L 147 91 L 141 97 L 143 105 L 135 101 L 127 105 L 129 97 L 123 91 L 131 90 Z" fill="#fff"/>
        </g>
        <g class="mata-senang">
          <path d="M 50 105 Q 65 84 80 105" fill="none" stroke="#212529" stroke-width="7" stroke-linecap="round"/>
          <path d="M 120 105 Q 135 84 150 105" fill="none" stroke="#212529" stroke-width="7" stroke-linecap="round"/>
        </g>
      </g>

      <path class="mulut" d="M 90 125 Q 100 130 110 125" fill="none" stroke="#212529" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>

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

      <path class="gelembung-ingus" d="M 108 108 C 130 98 136 124 116 130 C 96 136 90 118 108 108 Z" fill="rgba(255,255,255,0.65)" stroke="white" stroke-width="2.5"/>

      <g class="air-mata-imut">
        <rect class="tetesan-mata"       x="60" y="107" width="9" height="16" rx="4.5" fill="#74c0fc"/>
        <rect class="tetesan-mata delay" x="130" y="107" width="9" height="16" rx="4.5" fill="#74c0fc"/>
      </g>

      <g class="keringat">
        <path d="M 168 78 C 178 93 178 106 168 106 C 158 106 158 93 168 78 Z" fill="#74c0fc"/>
        <path d="M 32  88 C 42  103 42  116 32  116 C 22  116 22  103 32  88 Z" fill="#74c0fc"/>
      </g>

      <g class="barbel">
        <rect x="0"   y="114" width="46" height="12" fill="#adb5bd" rx="6"/>
        <rect x="4"   y="99"  width="16" height="42" fill="#212529" rx="5"/>
        <rect x="25"  y="99"  width="16" height="42" fill="#212529" rx="5"/>
        <rect x="154" y="114" width="46" height="12" fill="#adb5bd" rx="6"/>
        <rect x="158" y="99"  width="16" height="42" fill="#212529" rx="5"/>
        <rect x="179" y="99"  width="16" height="42" fill="#212529" rx="5"/>
      </g>

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

      <g class="remah-mulut">
        <circle cx="80"  cy="148" r="4"   fill="#d9480f"/>
        <circle cx="85"  cy="156" r="2.5" fill="#d9480f"/>
        <circle cx="120" cy="150" r="4.5" fill="#d9480f"/>
        <circle cx="116" cy="158" r="3"   fill="#d9480f"/>
        <circle cx="104" cy="163" r="3.5" fill="#370617" opacity="0.8"/>
      </g>

      <g class="gelembung-zzz">
        <text x="138" y="50" fill="white" font-size="32" font-weight="900" font-family="Nunito,sans-serif" filter="url(#fb-ext-text-shadow)">Z</text>
        <text x="163" y="28" fill="white" font-size="22" font-weight="900" font-family="Nunito,sans-serif" filter="url(#fb-ext-text-shadow)">z</text>
        <text x="178" y="12" fill="white" font-size="15" font-weight="900" font-family="Nunito,sans-serif" filter="url(#fb-ext-text-shadow)">z</text>
      </g>
    </svg>
  </div>
  <div class="hp-buddy-bayangan"></div>
  <div class="hp-buddy-genangan"></div>
</div>
  `;

  container.appendChild(mascotWrapper);
  document.body.appendChild(container);

  // Default state initialization is handled by js/mascot-state.js
  if (window.updateBuddySVG) {
    window.updateBuddySVG('IDLE');
  }

  // --- INTERACTION LOGIC (PANEL TOGGLE) ---
  let isPanelOpen = false;
  
  function updatePanelPosition() {
    if (!isPanelOpen) return;
    const rect = container.getBoundingClientRect();
    const centerX = window.innerWidth / 2;
    const isLeft = rect.left < centerX;

    if (isLeft) {
      // Mascot is on left. Panel should be on its right.
      panelWrapper.style.right = 'auto';
      panelWrapper.style.left = '120px'; // 100px mascot + 20px gap
      resizeHandle.style.left = 'auto';
      resizeHandle.style.right = '0';
      resizeHandle.style.cursor = 'se-resize';
    } else {
      // Mascot is on right. Panel should be on its left.
      panelWrapper.style.left = 'auto';
      panelWrapper.style.right = '120px';
      resizeHandle.style.right = 'auto';
      resizeHandle.style.left = '0';
      resizeHandle.style.cursor = 'sw-resize';
    }
    
    // Vertical center
    panelWrapper.style.top = '50%';
    panelWrapper.style.bottom = 'auto';
  }

  function togglePanel() {
    isPanelOpen = !isPanelOpen;
    if (isPanelOpen) {
      updatePanelPosition();
      panelWrapper.style.display = 'block';
      setTimeout(() => {
        panelWrapper.style.opacity = '1';
        panelWrapper.style.transform = 'translateY(-50%) scale(1)';
      }, 10);
      window.forceFbState && window.forceFbState('IDLE', 100);
    } else {
      panelWrapper.style.opacity = '0';
      panelWrapper.style.transform = 'translateY(-45%) scale(0.95)';
      setTimeout(() => {
        panelWrapper.style.display = 'none';
      }, 300);
    }
  }

  // Handle messages from the iframe (e.g. close panel)
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'FB_CLOSE_PANEL') {
      if (isPanelOpen) togglePanel();
    }
  });

  // --- DRAG LOGIC ---
  let isDragging = false;
  let dragDidMove = false;
  let offsetX, offsetY;

  mascotWrapper.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    isDragging = true;
    dragDidMove = false;
    const rect = container.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    mascotWrapper.style.cursor = 'grabbing';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    dragDidMove = true;
    let targetX = e.clientX - offsetX;
    let targetY = e.clientY - offsetY;
    
    const W = window.innerWidth;
    
    // Un-snap if pulled away from edge
    if (container.classList.contains('quiet-mode')) {
      const isLeft = container.classList.contains('on-left');
      if (isLeft && targetX > 50) {
        container.classList.remove('quiet-mode');
      } else if (!isLeft && targetX < W - container.offsetWidth - 50) {
        container.classList.remove('quiet-mode');
      }
    }
    
    // Clamp to viewport
    const maxX = window.innerWidth - container.offsetWidth;
    const maxY = window.innerHeight - container.offsetHeight;
    
    targetX = Math.max(0, Math.min(targetX, maxX));
    targetY = Math.max(0, Math.min(targetY, maxY));

    container.style.left = targetX + 'px';
    container.style.top = targetY + 'px';
    container.style.right = 'auto';
    container.style.bottom = 'auto';
    
    // Update panel position fluidly while dragging
    if (isPanelOpen) {
      updatePanelPosition();
    }
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      mascotWrapper.style.cursor = 'grab';
      
      if (dragDidMove) {
        // Snap to edge quiet-mode
        const W = window.innerWidth;
        const ax = parseInt(container.style.left) + container.offsetWidth / 2;
        
        if (!container.classList.contains('quiet-mode')) {
          if (ax < 95 || ax > W - 95) {
            container.classList.add('quiet-mode');
            if (ax < W / 2) {
              container.style.left = '0px';
              container.classList.add('on-left');
            } else {
              container.style.left = (W - container.offsetWidth) + 'px';
              container.classList.remove('on-left');
            }
          }
        }
      }
    }
  });

  // Toggle on click (if not dragged)
  mascotWrapper.addEventListener('click', (e) => {
    if (dragDidMove) {
      dragDidMove = false;
      return;
    }
    
    if (container.classList.contains('quiet-mode')) {
      container.classList.remove('quiet-mode');
      return; // Exit quiet mode first, don't open panel yet
    }
    
    togglePanel();
  });

  // --- RESIZE LOGIC ---
  let isResizing = false;
  let startW, startH, startX, startY;

  resizeHandle.addEventListener('mousedown', (e) => {
    isResizing = true;
    startW = panelWrapper.offsetWidth;
    startH = panelWrapper.offsetHeight;
    startX = e.clientX;
    startY = e.clientY;
    document.body.style.cursor = 'sw-resize';
    e.preventDefault();
    e.stopPropagation();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    
    let newWidth, newHeight;
    const isLeftAligned = panelWrapper.style.left === '120px';

    if (isLeftAligned) {
      newWidth = startW + (e.clientX - startX);
    } else {
      newWidth = startW - (e.clientX - startX);
    }

    // Because panel is centered with translateY(-50%), 
    // increasing height by 2x the mouse Y movement makes the bottom edge follow the mouse perfectly.
    newHeight = startH + (e.clientY - startY) * 2;
    
    panelWrapper.style.width = newWidth + 'px';
    panelWrapper.style.height = newHeight + 'px';
  });

  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      document.body.style.cursor = '';
    }
  });

  // Hook for interaction to update state machine
  mascotWrapper.addEventListener('mousemove', () => {
    if (window.fbCtx) {
      window.fbCtx.rubScore += 1;
      window.fbCtx.lastActivity = Date.now();
    }
  });

})();
