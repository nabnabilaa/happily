  // ═══════════════════════════════════════════════════════════════
  // UPDATE SVG CHARACTER
  // ═══════════════════════════════════════════════════════════════
  function updateBuddySVG(s) {
    const cfg = STATES[s]
    if (!svgWrap) return

    // Switch state class (drives all CSS animations)
    svgWrap.className = `state-${cfg.svgState}`
    buddy.dataset.state = cfg.svgState

    // Update body gradient colors via CSS custom properties on the wrapper
    svgWrap.style.setProperty('--w1', cfg.w1)
    svgWrap.style.setProperty('--w2', cfg.w2)
    svgWrap.style.setProperty('--wp', cfg.wp)

    // Update mouth path dynamically
    const mouth = svgWrap.querySelector('.mulut')
    if (mouth) {
      mouth.setAttribute('d', cfg.mouth)
      const fillStates = ['senang', 'semangat', 'makan']
      mouth.setAttribute('fill', fillStates.includes(cfg.svgState) ? '#fa5252' : 'none')
    }
  }

  // ── Panel UI accent color (--mc) ──
  function applyMood(s) {
    const cfg = STATES[s]
    root.style.setProperty('--mc', cfg.color)
    root.style.setProperty('--tc', cfg.color)
    badge.textContent = cfg.badge
    const pill = $('fb-spill')
    pill.textContent = s
    pill.style.cssText = `font-size:9px!important;font-weight:800!important;letter-spacing:.9px!important;padding:3px 9px;border-radius:0;text-transform:uppercase;background:${cfg.color}22;color:${cfg.color}`
    const tring = $('fb-tring')
    if (tring) tring.style.stroke = cfg.color
    const tlbl = $('fb-tlbl')
    if (tlbl) tlbl.style.color = cfg.color
    $('fb-pgfill').style.background = cfg.color
    root.querySelectorAll('.fb-tmode.act').forEach(b => { b.style.borderColor = cfg.color; b.style.color = cfg.color })
    root.querySelectorAll('.fb-alarm-time').forEach(b => b.style.color = cfg.color)
  }

