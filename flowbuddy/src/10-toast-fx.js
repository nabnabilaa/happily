  // ═══════════════════════════════════════════════════════════════
  // TOAST & FX
  // ═══════════════════════════════════════════════════════════════
  function showToast(title, msg, ms = 4500, actionLabel, actionFn) {
    $('fb-toast-ttl').textContent = title
    $('fb-toast-msg').textContent = msg
    const actBtn = $('fb-toast-action')
    if (actBtn) {
      if (actionLabel && actionFn) {
        actBtn.textContent = actionLabel
        actBtn.style.display = 'block'
        actBtn.onclick = () => { actionFn(); toast.classList.remove('show'); actBtn.style.display = 'none' }
      } else {
        actBtn.style.display = 'none'
      }
    }
    toast.classList.add('show')
    if (ms > 0) setTimeout(() => toast.classList.remove('show'), ms)
  }

  function burst() {
    const color = STATES[currentState].color
    for (let i = 0; i < 10; i++) {
      const p = document.createElement('div')
      p.className = 'fb-pt'
      const ang = (i / 10) * 360, d = 30 + Math.random() * 22, sz = 4 + Math.random() * 5
      p.style.cssText = `width:${sz}px;height:${sz}px;background:${color};bottom:${38 + Math.random() * 10}px;right:${38 + Math.random() * 10}px;--tx:${Math.cos(ang * Math.PI / 180) * d}px;--ty:${Math.sin(ang * Math.PI / 180) * d}px`
      root.appendChild(p); setTimeout(() => p.remove(), 750)
    }
  }

  let _chimeAC = null, _chimeNodes = [], _chimeLoopIv = null
  function stopChime() {
    clearInterval(_chimeLoopIv); _chimeLoopIv = null
    _chimeNodes.forEach(n => { try { n.stop() } catch (_) { } }); _chimeNodes = []
    if (_chimeAC) { try { _chimeAC.close() } catch (_) { }; _chimeAC = null }
  }
  function playChimeCycle(ac) {
    const freqs = [880, 1100, 1320, 880]
    freqs.forEach((f, i) => {
      const o = ac.createOscillator(), g = ac.createGain()
      o.connect(g); g.connect(ac.destination)
      o.type = 'sine'; o.frequency.setValueAtTime(f, ac.currentTime + i * .22)
      g.gain.setValueAtTime(0, ac.currentTime + i * .22)
      g.gain.linearRampToValueAtTime(.28, ac.currentTime + i * .22 + .04)
      g.gain.exponentialRampToValueAtTime(.001, ac.currentTime + i * .22 + .44)
      o.start(ac.currentTime + i * .22); o.stop(ac.currentTime + i * .22 + .5)
      _chimeNodes.push(o)
    })
  }
  function playChime(loop) {
    try {
      stopChime()
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return
      _chimeAC = new AC()
      playChimeCycle(_chimeAC)
      if (loop) {
        _chimeLoopIv = setInterval(() => {
          if (_chimeAC) { _chimeNodes = []; playChimeCycle(_chimeAC) }
        }, 1200)
      }
    } catch (_) { }
  }

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }

