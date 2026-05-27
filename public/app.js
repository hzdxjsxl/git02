(function () {
  const stage = document.getElementById('stage');
  const ctx = stage.getContext('2d');
  const hintEl = document.getElementById('hint');
  const boxListEl = document.getElementById('boxList');
  const outputEl = document.getElementById('output');
  const snapToggle = document.getElementById('snapToggle');
  const snapRadiusInput = document.getElementById('snapRadius');
  const snapThresholdInput = document.getElementById('snapThreshold');
  const resetBtn = document.getElementById('resetBtn');
  const saveBtn = document.getElementById('saveBtn');

  const HANDLE_SIZE = 8;

  const DragState = {
    IDLE: 'idle',
    HANDLE_ACTIVE: 'handle_active',
    BOX_TRANSLATE: 'box_translate',
    REBOUND_ANIM: 'rebound_anim'
  };

  const state = {
    image: null,
    imageData: null,
    width: 0,
    height: 0,
    boxes: [],
    originalBoxes: [],
    selectedBoxId: null,
    dragState: DragState.IDLE,
    dragPayload: null,
    previewSnap: null,
    animFrame: null,
    statusMessage: ''
  };

  function getDragOptions() {
    return {
      snapEnabled: snapToggle.checked,
      searchRadius: parseInt(snapRadiusInput.value, 10) || 30,
      threshold: parseInt(snapThresholdInput.value, 10) || 35
    };
  }

  function loadSample() {
    fetch('/api/sample')
      .then(r => r.json())
      .then(data => {
        const img = new Image();
        img.onload = () => {
          state.image = img;
          state.width = data.width;
          state.height = data.height;
          stage.width = data.width;
          stage.height = data.height;

          const tmp = document.createElement('canvas');
          tmp.width = data.width;
          tmp.height = data.height;
          const tctx = tmp.getContext('2d');
          tctx.drawImage(img, 0, 0);
          state.imageData = tctx.getImageData(0, 0, data.width, data.height);

          state.boxes = data.boxes.map(b => ({ ...b }));
          state.originalBoxes = data.boxes.map(b => ({ ...b }));
          state.selectedBoxId = data.boxes[0] ? data.boxes[0].id : null;
          render();
          renderList();
        };
        img.src = data.image;
      })
      .catch(err => {
        hintEl.textContent = '加载失败：' + err.message;
      });
  }

  function getBoxById(id) {
    return state.boxes.find(b => b.id === id);
  }

  function getHandlePosition(box, handle) {
    const { x, y, w, h } = box;
    switch (handle) {
      case 'tl': return { x, y };
      case 'tr': return { x: x + w, y };
      case 'bl': return { x, y: y + h };
      case 'br': return { x: x + w, y: y + h };
    }
    return null;
  }

  function hitTestHandle(px, py) {
    for (let i = state.boxes.length - 1; i >= 0; i--) {
      const box = state.boxes[i];
      for (const h of ['tl', 'tr', 'bl', 'br']) {
        const p = getHandlePosition(box, h);
        if (Math.abs(px - p.x) <= HANDLE_SIZE && Math.abs(py - p.y) <= HANDLE_SIZE) {
          return { type: 'handle', boxId: box.id, handle: h, boxIndex: i };
        }
      }
    }
    return null;
  }

  function hitTestBoxBody(px, py) {
    for (let i = state.boxes.length - 1; i >= 0; i--) {
      const box = state.boxes[i];
      if (px >= box.x && px <= box.x + box.w && py >= box.y && py <= box.y + box.h) {
        return {
          type: 'body',
          boxId: box.id,
          boxIndex: i,
          offsetX: px - box.x,
          offsetY: py - box.y
        };
      }
    }
    return null;
  }

  function applyHandleTransform(box, handle, targetX, targetY) {
    let { x, y, w, h } = box;
    switch (handle) {
      case 'tl':
        w = x + w - targetX;
        h = y + h - targetY;
        x = targetX;
        break;
      case 'tr':
        h = y + h - targetY;
        y = targetY;
        w = targetX - x;
        break;
      case 'bl':
        w = x + w - targetX;
        x = targetX;
        h = targetY - y;
        break;
      case 'br':
        w = targetX - x;
        h = targetY - y;
        break;
    }
    if (w < 10) w = 10;
    if (h < 10) h = 10;
    return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
  }

  function computeSnapForHandle(box, handle, pointerX, pointerY) {
    const opts = getDragOptions();
    if (!opts.snapEnabled) return null;
    if (!state.imageData) return null;

    const result = SNAP.snapCorner(state.imageData, pointerX, pointerY, box, {
      searchRadius: opts.searchRadius,
      threshold: opts.threshold,
      enforceBoundary: true
    });

    return result.snapped ? result : null;
  }

  function validateAndEnforceBoundary(box, originalBox) {
    if (!state.imageData) return { valid: true, box };
    return SNAP.validateBoxPosition(state.imageData, box, originalBox);
  }

  function animateRebound(fromBox, toBox, callback) {
    state.dragState = DragState.REBOUND_ANIM;
    const duration = 220;
    const startTime = performance.now();

    function tick(t) {
      const elapsed = t - startTime;
      const progress = Math.min(1, elapsed / duration);
      const ease = 1 - Math.pow(1 - progress, 3);

      const box = getBoxById(fromBox.id);
      if (box) {
        box.x = Math.round(fromBox.x + (toBox.x - fromBox.x) * ease);
        box.y = Math.round(fromBox.y + (toBox.y - fromBox.y) * ease);
        box.w = Math.round(fromBox.w + (toBox.w - fromBox.w) * ease);
        box.h = Math.round(fromBox.h + (toBox.h - fromBox.h) * ease);
      }
      render();

      if (progress < 1) {
        state.animFrame = requestAnimationFrame(tick);
      } else {
        state.dragState = DragState.IDLE;
        state.dragPayload = null;
        state.statusMessage = '';
        if (callback) callback();
        render();
        renderList();
      }
    }
    state.animFrame = requestAnimationFrame(tick);
  }

  function render() {
    ctx.clearRect(0, 0, stage.width, stage.height);
    if (state.image) {
      ctx.drawImage(state.image, 0, 0);
    }

    for (const box of state.boxes) {
      const isSelected = box.id === state.selectedBoxId;

      ctx.lineWidth = isSelected ? 2 : 1.5;
      ctx.strokeStyle = isSelected ? '#e74c3c' : '#3498db';
      ctx.fillStyle = isSelected ? 'rgba(231,76,60,0.08)' : 'rgba(52,152,219,0.06)';
      ctx.fillRect(box.x, box.y, box.w, box.h);
      ctx.strokeRect(box.x, box.y, box.w, box.h);

      ctx.font = '13px sans-serif';
      ctx.fillStyle = isSelected ? '#e74c3c' : '#2980b9';
      ctx.fillText(box.text, box.x + 4, box.y - 4);

      for (const h of ['tl', 'tr', 'bl', 'br']) {
        const p = getHandlePosition(box, h);
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = isSelected ? '#e74c3c' : '#3498db';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(p.x - HANDLE_SIZE / 2, p.y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
        ctx.fillRect(p.x - HANDLE_SIZE / 2, p.y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
      }
    }

    if (state.previewSnap && (state.dragState === DragState.HANDLE_ACTIVE)) {
      const payload = state.dragPayload;
      if (payload && payload.pointerStartX != null) {
        ctx.strokeStyle = state.previewSnap.boundaryFallback ? '#f39c12' : '#2ecc71';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(payload.pointerStartX, payload.pointerStartY);
        ctx.lineTo(state.previewSnap.x, state.previewSnap.y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = state.previewSnap.boundaryFallback ? '#f39c12' : '#2ecc71';
        ctx.beginPath();
        ctx.arc(state.previewSnap.x, state.previewSnap.y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (state.statusMessage) {
      ctx.fillStyle = 'rgba(231,76,60,0.9)';
      ctx.fillRect(stage.width / 2 - 160, 10, 320, 32);
      ctx.fillStyle = '#fff';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(state.statusMessage, stage.width / 2, 31);
      ctx.textAlign = 'left';
    }
  }

  function renderList() {
    boxListEl.innerHTML = '';
    for (const box of state.boxes) {
      const el = document.createElement('div');
      el.className = 'box-item' + (box.id === state.selectedBoxId ? ' active' : '');
      el.innerHTML = `
        <div><span class="id">${box.id}</span> · ${box.w}×${box.h}</div>
        <div class="coord">(${box.x}, ${box.y})</div>
        <input type="text" value="${box.text.replace(/"/g, '&quot;')}" data-id="${box.id}" />
      `;
      el.addEventListener('click', (e) => {
        if (e.target.tagName === 'INPUT') return;
        state.selectedBoxId = box.id;
        render();
        renderList();
      });
      const input = el.querySelector('input');
      input.addEventListener('change', () => {
        box.text = input.value;
        render();
        renderList();
        updateOutput();
      });
      boxListEl.appendChild(el);
    }
    updateOutput();
  }

  function updateOutput() {
    outputEl.textContent = JSON.stringify(state.boxes, null, 2);
  }

  function getMousePos(e) {
    const rect = stage.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (stage.width / rect.width),
      y: (e.clientY - rect.top) * (stage.height / rect.height)
    };
  }

  function updateCursor(px, py) {
    const handleHit = hitTestHandle(px, py);
    if (handleHit) {
      stage.style.cursor = handleHit.handle === 'tl' || handleHit.handle === 'br' ? 'nwse-resize' : 'nesw-resize';
      return;
    }
    const bodyHit = hitTestBoxBody(px, py);
    if (bodyHit) {
      stage.style.cursor = 'move';
      return;
    }
    stage.style.cursor = 'default';
  }

  stage.addEventListener('mousedown', (e) => {
    if (state.dragState !== DragState.IDLE) return;

    const pos = getMousePos(e);

    const handleHit = hitTestHandle(pos.x, pos.y);
    if (handleHit) {
      state.selectedBoxId = handleHit.boxId;
      const box = getBoxById(handleHit.boxId);
      const handlePos = getHandlePosition(box, handleHit.handle);

      state.dragState = DragState.HANDLE_ACTIVE;
      state.dragPayload = {
        boxId: handleHit.boxId,
        handle: handleHit.handle,
        handleStartX: handlePos.x,
        handleStartY: handlePos.y,
        pointerStartX: pos.x,
        pointerStartY: pos.y,
        boxStart: { x: box.x, y: box.y, w: box.w, h: box.h, id: box.id, text: box.text }
      };
      render();
      renderList();
      return;
    }

    const bodyHit = hitTestBoxBody(pos.x, pos.y);
    if (bodyHit) {
      state.selectedBoxId = bodyHit.boxId;
      const box = getBoxById(bodyHit.boxId);

      state.dragState = DragState.BOX_TRANSLATE;
      state.dragPayload = {
        boxId: bodyHit.boxId,
        offsetX: bodyHit.offsetX,
        offsetY: bodyHit.offsetY,
        boxStart: { x: box.x, y: box.y, w: box.w, h: box.h, id: box.id, text: box.text }
      };
      render();
      renderList();
      return;
    }
  });

  stage.addEventListener('mousemove', (e) => {
    const pos = getMousePos(e);

    if (state.dragState === DragState.IDLE) {
      updateCursor(pos.x, pos.y);
      return;
    }

    if (state.dragState === DragState.HANDLE_ACTIVE) {
      const payload = state.dragPayload;
      const box = getBoxById(payload.boxId);

      const snap = computeSnapForHandle(payload.boxStart, payload.handle, pos.x, pos.y);
      state.previewSnap = snap;

      const useX = snap ? snap.x : pos.x;
      const useY = snap ? snap.y : pos.y;

      const newGeom = applyHandleTransform(payload.boxStart, payload.handle, useX, useY);
      box.x = newGeom.x;
      box.y = newGeom.y;
      box.w = newGeom.w;
      box.h = newGeom.h;

      render();
      return;
    }

    if (state.dragState === DragState.BOX_TRANSLATE) {
      const payload = state.dragPayload;
      const box = getBoxById(payload.boxId);

      const newX = Math.round(pos.x - payload.offsetX);
      const newY = Math.round(pos.y - payload.offsetY);

      const proposedBox = { ...box, x: newX, y: newY };
      const validation = validateAndEnforceBoundary(proposedBox, payload.boxStart);

      if (validation.valid) {
        box.x = newX;
        box.y = newY;
        state.statusMessage = '';
      } else if (validation.rebound) {
        box.x = newX;
        box.y = newY;
        state.statusMessage = '⚠ 警告：接近空白区域';
      } else {
        state.statusMessage = '⚠ 已拦截：禁止拖入纯白区域';
      }
      state.previewSnap = null;
      render();
    }
  });

  window.addEventListener('mouseup', () => {
    if (state.dragState === DragState.HANDLE_ACTIVE) {
      const payload = state.dragPayload;
      const box = getBoxById(payload.boxId);

      const finalGeom = {
        x: box.x, y: box.y, w: box.w, h: box.h, id: box.id, text: box.text
      };

      const validation = validateAndEnforceBoundary(finalGeom, payload.boxStart);

      if (!validation.valid) {
        if (validation.rebound) {
          state.statusMessage = '⟲ 正在回弹至最近文字边界...';
          animateRebound(finalGeom, validation.box, () => {
            state.statusMessage = '';
          });
        } else {
          state.statusMessage = '✗ 拦截：无文字像素，已恢复原位';
          box.x = payload.boxStart.x;
          box.y = payload.boxStart.y;
          box.w = payload.boxStart.w;
          box.h = payload.boxStart.h;
          setTimeout(() => {
            state.statusMessage = '';
            render();
          }, 1200);
        }
      }

      if (state.dragState !== DragState.REBOUND_ANIM) {
        state.dragState = DragState.IDLE;
        state.dragPayload = null;
        state.previewSnap = null;
      }
      render();
      renderList();
      return;
    }

    if (state.dragState === DragState.BOX_TRANSLATE) {
      const payload = state.dragPayload;
      const box = getBoxById(payload.boxId);

      const finalBox = {
        x: box.x, y: box.y, w: box.w, h: box.h, id: box.id, text: box.text
      };

      const validation = validateAndEnforceBoundary(finalBox, payload.boxStart);

      if (!validation.valid) {
        if (validation.rebound) {
          state.statusMessage = '⟲ 正在回弹至最近文字边界...';
          animateRebound(finalBox, validation.box, () => {
            state.statusMessage = '';
          });
        } else {
          state.statusMessage = '✗ 拦截：无文字像素，已恢复原位';
          box.x = payload.boxStart.x;
          box.y = payload.boxStart.y;
          box.w = payload.boxStart.w;
          box.h = payload.boxStart.h;
          setTimeout(() => {
            state.statusMessage = '';
            render();
          }, 1200);
        }
      }

      if (state.dragState !== DragState.REBOUND_ANIM) {
        state.dragState = DragState.IDLE;
        state.dragPayload = null;
        state.previewSnap = null;
      }
      render();
      renderList();
    }
  });

  stage.addEventListener('mouseleave', () => {
    if (state.dragState === DragState.IDLE) {
      state.previewSnap = null;
      render();
    }
  });

  resetBtn.addEventListener('click', () => {
    if (state.animFrame) cancelAnimationFrame(state.animFrame);
    state.boxes = state.originalBoxes.map(b => ({ ...b }));
    state.dragState = DragState.IDLE;
    state.dragPayload = null;
    state.previewSnap = null;
    state.statusMessage = '';
    render();
    renderList();
  });

  saveBtn.addEventListener('click', () => {
    const data = JSON.stringify(state.boxes, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ocr-corrected.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  loadSample();
})();
