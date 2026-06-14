  // ═══════════════════════════════════════════════════════════════
  // POSITION & DRAG
  // ═══════════════════════════════════════════════════════════════
  let isDragging = false, dragDidMove = false, dragOffX = 0, dragOffY = 0
  let dragOverlay = null

  function applyPos(ax, ay) {
    const W = window.innerWidth, H = window.innerHeight
    
    if (root.classList.contains('quiet-mode')) {
      // Snap to edge in quiet-mode (0px margin)
      if (ax < W / 2) {
        ax = 100 // Left edge (so rect.left = 0)
      } else {
        ax = W   // Right edge (so rect.right = W)
      }
      ay = Math.max(70, Math.min(H + 10, ay))
    } else {
      if (isDragging) {
        // While dragging, allow the big mascot to be dragged slightly off-screen to trigger the quiet mode transition
        ax = Math.max(50, Math.min(W + 50, ax))
        ay = Math.max(130 + 8, Math.min(H - 8, ay))
      } else {
        // Clamp buddy (100x130) with 8px margin from all edges
        ax = Math.max(100 + 8, Math.min(W - 8, ax))
        ay = Math.max(130 + 8, Math.min(H - 8, ay))
      }
    }
    
    root.style.setProperty('left', ax + 'px', 'important')
    root.style.setProperty('top', ay + 'px', 'important')
    root.style.setProperty('right', 'auto', 'important')
    root.style.setProperty('bottom', 'auto', 'important')
    
    // Toggle on-left class dynamically based on screen side
    const buddyEl = root.querySelector('#fb-buddy')
    if (buddyEl) {
      buddyEl.classList.toggle('on-left', ax < W / 2)
    }
    
    positionPanel(ax, ay)
  }

  function positionPanel(ax, ay) {
    const W = window.innerWidth, H = window.innerHeight
    const GAP = 16
    const BUDDY_W = 100, BUDDY_H = 130
    const PW = 480 // fixed width based on CSS update

    // Buddy center coordinates
    const bCenterX = ax - (BUDDY_W / 2)
    const bCenterY = ay - (BUDDY_H / 2)

    // Measured panel height AFTER setting width (reflow)
    const PH = Math.min(panel.scrollHeight || 480, H - 32)

    // ── Candidate positions: Left of Buddy OR Right of Buddy ──
    // Center the panel vertically with the buddy center, clamp within viewport
    const centeredY = Math.max(16, Math.min(bCenterY - (PH / 2), H - PH - 16))

    // Position panel left of buddy
    const leftX = ax - BUDDY_W - GAP - PW
    // Position panel right of buddy
    const rightX = ax + GAP

    const candidates = [
      { pl: leftX, pt: centeredY, ox: 'right', oy: 'center' },   // Left of buddy
      { pl: rightX, pt: centeredY, ox: 'left', oy: 'center' },   // Right of buddy
    ]

    // Score = visible area inside viewport
    function score(c) {
      const pr = c.pl + PW, pb = c.pt + PH
      const visW = Math.max(0, Math.min(pr, W) - Math.max(c.pl, 0))
      const visH = Math.max(0, Math.min(pb, H) - Math.max(c.pt, 0))
      return (visW / PW) * (visH / PH)
    }

    let best = candidates[0]
    // If left position goes out of viewport bounds, prefer right side (which is usually on screen)
    if (score(candidates[1]) > score(best)) {
      best = candidates[1]
    }

    // Hard-clamp so panel is always fully within viewport
    const finalL = Math.max(16, Math.min(W - PW - 16, best.pl))
    const finalT = Math.max(16, Math.min(H - PH - 16, best.pt))

    // Set position relative to root anchor (ax, ay)
    panel.style.left = (finalL - ax) + 'px'
    panel.style.top = (finalT - ay) + 'px'
    panel.style.right = 'auto'
    panel.style.bottom = 'auto'
    panel.style.transformOrigin = best.ox + ' ' + best.oy
  }

  function savePos(ax, ay) {
    chrome.storage.local.get('fb3', r => {
      const d = r.fb3 || {}
      chrome.storage.local.set({ fb3: { ...d, pos: { ax, ay } } })
    })
  }

  // Transparent full-page overlay: captures all pointer events during drag
  // so buddy stays responsive even over iframes, videos, or elements
  // that would normally intercept mouse/touch events
  function createDragOverlay() {
    const ov = document.createElement('div')
    ov.style.position = 'fixed'
    ov.style.top = '0'
    ov.style.left = '0'
    ov.style.width = '100vw'
    ov.style.height = '100vh'
    ov.style.zIndex = '2147483646'
    ov.style.cursor = 'grabbing'
    ov.style.userSelect = 'none'
    document.documentElement.appendChild(ov)
    return ov
  }

  function endDrag() {
    if (!isDragging) return
    isDragging = false
    buddy.classList.remove('dragging')
    if (dragOverlay) { dragOverlay.remove(); dragOverlay = null }
    if (dragDidMove) {
      const W = window.innerWidth
      let ax = parseInt(root.style.left) || W - 8
      let ay = parseInt(root.style.top) || window.innerHeight - 8
      
      // Check if we dragged the big mascot into the screen edge to trigger quiet-mode (small version)
      if (!root.classList.contains('quiet-mode')) {
        if (ax < 95 || ax > W - 15) {
          setMascotAnimated(false);
          const snappedX = parseInt(root.style.left) || (ax < W / 2 ? 100 : W);
          const snappedY = parseInt(root.style.top) || ay;
          savePos(snappedX, snappedY);
          return;
        }
      }
      
      applyPos(ax, ay)
      savePos(ax, ay)
    }
  }

  // ── Mouse drag ──
  buddy.addEventListener('mousedown', e => {
    if (e.button !== 0) return
    isDragging = true; dragDidMove = false
    const rect = buddy.getBoundingClientRect()
    dragOffX = e.clientX - rect.left
    dragOffY = e.clientY - rect.top
    buddy.classList.add('dragging')
    dragOverlay = createDragOverlay()
    e.preventDefault()
  })

  // Use capture phase on window so events fire before any page handler can stop them
  window.addEventListener('mousemove', e => {
    if (!isDragging) return
    dragDidMove = true
    let targetX = e.clientX - dragOffX + 100
    let targetY = e.clientY - dragOffY + 130
    
    if (root.classList.contains('quiet-mode')) {
      const W = window.innerWidth
      const currentSnapX = parseInt(root.style.left) || W
      const currentSnapLeft = currentSnapX < W / 2
      
      if (currentSnapLeft) {
        if (targetX > 140) {
          setMascotAnimated(true)
        }
      } else {
        if (targetX < W - 40) {
          setMascotAnimated(true)
        }
      }
    }
    
    applyPos(targetX, targetY)
  }, true)

  window.addEventListener('mouseup', endDrag, true)

  // ── Touch drag ──
  buddy.addEventListener('touchstart', e => {
    const t = e.touches[0]; isDragging = true; dragDidMove = false
    const rect = buddy.getBoundingClientRect()
    dragOffX = t.clientX - rect.left; dragOffY = t.clientY - rect.top
    buddy.classList.add('dragging')
    dragOverlay = createDragOverlay()
    e.preventDefault()
  }, { passive: false })

  window.addEventListener('touchmove', e => {
    if (!isDragging) return; dragDidMove = true
    const t = e.touches[0]
    let targetX = t.clientX - dragOffX + 100
    let targetY = t.clientY - dragOffY + 130
    
    if (root.classList.contains('quiet-mode')) {
      const W = window.innerWidth
      const currentSnapX = parseInt(root.style.left) || W
      const currentSnapLeft = currentSnapX < W / 2
      
      if (currentSnapLeft) {
        if (targetX > 140) {
          setMascotAnimated(true)
        }
      } else {
        if (targetX < W - 40) {
          setMascotAnimated(true)
        }
      }
    }
    
    applyPos(targetX, targetY)
    e.preventDefault()
  }, { capture: true, passive: false })

  window.addEventListener('touchend', endDrag, true)
  window.addEventListener('touchcancel', endDrag, true)

  // Reposition on resize so buddy + panel stay on-screen
  window.addEventListener('resize', () => {
    const ax = parseInt(root.style.left) || window.innerWidth - 28
    const ay = parseInt(root.style.top) || window.innerHeight - 28
    applyPos(ax, ay)  // re-clamps buddy to new viewport size
    if (panelOpen) positionPanel(parseInt(root.style.left), parseInt(root.style.top))
  })

  // ── Click: toggle panel ──
  buddy.addEventListener('click', () => {
    if (dragDidMove) { dragDidMove = false; return }
    
    // If clicked in quiet mode, exit quiet mode!
    if (root.classList.contains('quiet-mode')) {
      setMascotAnimated(true)
    }
    
    const now = Date.now()
    if (now - ctx.clickWindowStart > 3000) { ctx.clickCount = 1; ctx.clickWindowStart = now }
    else ctx.clickCount++
    if (ctx.clickCount >= 6 && now - ctx.clickWindowStart < 3000) {
      ctx.rubScore = 0; forceState('ANNOYED', 5000)
      currentState = 'ANNOYED'; updateBuddySVG('ANNOYED'); applyMood('ANNOYED')
    }
    panelOpen = !panelOpen
    panel.classList.toggle('open', panelOpen)
    if (panelOpen) {
      positionPanel(parseInt(root.style.left) || window.innerWidth - 28, parseInt(root.style.top) || window.innerHeight - 28)
      renderAll()
    }
  })

  buddy.addEventListener('mousemove', () => {
    if (isDragging) return
    const now = Date.now()
    const decayed = Math.max(0, ctx.rubScore - (now - ctx.rubLastTime) * 0.012)
    ctx.rubScore = Math.min(30, decayed + 1.2)
    ctx.rubLastTime = now; ctx.lastActivity = now
    if (ctx.rubScore > 14 && currentState !== 'HAPPY') {
      forceState('HAPPY', 3000); currentState = 'HAPPY'; updateBuddySVG('HAPPY'); applyMood('HAPPY')
    }
  })
  buddy.addEventListener('mouseleave', () => {
    setTimeout(() => { ctx.rubScore = Math.max(0, ctx.rubScore - 5) }, 500)
  })
  document.addEventListener('mousemove', () => { ctx.lastActivity = Date.now() }, { passive: true })
  document.addEventListener('keydown', () => { ctx.lastActivity = Date.now() }, { passive: true })

  $('fb-x').addEventListener('click', () => {
    panelOpen = false;
    panel.classList.remove('open');
    const settingsPanel = root.querySelector('#fb-settings-panel');
    if (settingsPanel) settingsPanel.classList.remove('open');
  })
  $('fb-toast-x').addEventListener('click', () => { toast.classList.remove('show'); const actBtn = $('fb-toast-action'); if (actBtn) actBtn.style.display = 'none' })

  const webBtn = $('fb-web-btn');
  if (webBtn) {
    webBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.open('https://happily-flowbuddy.vercel.app/', '_blank');
    });
  }

  const lockedLoginBtn = $('fb-locked-login-btn');
  if (lockedLoginBtn) {
    lockedLoginBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.open('https://happily-flowbuddy.vercel.app/', '_blank');
    });
  }

  // Settings Panel wiring
  const settingsPanel = root.querySelector('#fb-settings-panel');
  const settingsBtn = $('fb-settings-btn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      if (settingsPanel) settingsPanel.classList.add('open');
    });
  }
  const settingsBack = $('fb-settings-back');
  if (settingsBack) {
    settingsBack.addEventListener('click', () => {
      if (settingsPanel) settingsPanel.classList.remove('open');
    });
  }
  const settingsToggle = $('fb-settings-toggle');
  if (settingsToggle) {
    settingsToggle.addEventListener('change', () => {
      extensionEnabled = settingsToggle.checked;
      chrome.storage.local.set({ fb_ext_enabled: extensionEnabled });
      applyExtensionEnabled();
    });
  }
  const mascotAnimToggle = $('fb-settings-mascot-anim-toggle');
  if (mascotAnimToggle) {
    mascotAnimToggle.addEventListener('change', () => {
      mascotAnimated = mascotAnimToggle.checked;
      chrome.storage.local.set({ hp_mascot_animated: mascotAnimated });
      applyMascotAnimated();
      // If we are on Happily portal tab, let's also set it in portal's localStorage so it stays perfectly in sync!
      try {
        localStorage.setItem('hp_mascot_animated', mascotAnimated ? '1' : '0');
        // Dispatch event to update mascot on web page instantly if running on Portal
        window.dispatchEvent(new CustomEvent('hp_mascot_anim_change', { detail: mascotAnimated }));
      } catch (e) {}
    });
  }

