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
  const SNAP_HINT_RADIUS = 18;

  const state = {
    image: null,
    imageData: null,
    width: 0,
    height: 0,
    boxes: [],
    originalBoxes: [],
    selectedBoxId: null,
    dragging: null,
    mouseX: 0,
    mouseY: 0,
    hoverHandle: null,
    previewSnap: null
  };

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

  function findHandleAt(px, py) {
    for (let i = state.boxes.length - 1; i >= 0; i--) {
      const box = state.boxes[i];
      for (const h of ['tl', 'tr', 'bl', 'br']) {
        const p = getHandlePosition(box, h);
        if (Math.abs(px - p.x) <= HANDLE_SIZE && Math.abs(py - p.y) <= HANDLE_SIZE) {
          return { boxId: box.id, handle: h, isBox: false };
        }
      }
      if (px >= box.x && px <= box.x + box.w && py >= box.y && py <= box.y + box.h) {
        return { boxId: box.id, handle: null, isBox: true, offsetX: px - box.x, offsetY: py - box.y };
      }
    }
    return null;
  }

  function computeSnapForHandle(box, handle, targetX, targetY) {
    if (!snapToggle.checked) return null;
    if (!state.imageData) return null;
    const radius = parseInt(snapRadiusInput.value, 10) || 30;
    const threshold = parseInt(snapThresholdInput.value, 10) || 35;

    const result = SNAP.snapCorner(state.imageData, targetX, targetY, box, {
      searchRadius: radius,
      threshold
    });
    return result.snapped ? result : null;
  }

  function applyHandleDrag(box, handle, newX, newY, snap) {
    let { x, y, w, h } = box;
    if (snap) {
      newX = snap.x;
      newY = snap.y;
    }
    switch (handle) {
      case 'tl':
        w = x + w - newX;
        h = y + h - newY;
        x = newX;
        y = newY;
        break;
      case 'tr':
        h = y + h - newY;
        y = newY;
        w = newX - x;
        break;
      case 'bl':
        w = x + w - newX;
        x = newX;
        h = newY - y;
        break;
      case 'br':
        w = newX - x;
        h = newY - y;
        break;
    }
    if (w < 5) w = 5;
    if (h < 5) h = 5;
    box.x = Math.round(x);
    box.y = Math.round(y);
    box.w = Math.round(w);
    box.h = Math.round(h);
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

    if (state.previewSnap && state.dragging) {
      ctx.strokeStyle = '#2ecc71';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(state.dragging.startX, state.dragging.startY);
      ctx.lineTo(state.previewSnap.x, state.previewSnap.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#2ecc71';
      ctx.beginPath();
      ctx.arc(state.previewSnap.x, state.previewSnap.y, 4, 0, Math.PI * 2);
      ctx.fill();
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

  stage.addEventListener('mousedown', (e) => {
    const pos = getMousePos(e);
    const hit = findHandleAt(pos.x, pos.y);
    if (!hit) return;
    state.selectedBoxId = hit.boxId;
    const box = getBoxById(hit.boxId);
    state.dragging = {
      boxId: hit.boxId,
      handle: hit.handle,
      isBox: hit.isBox,
      offsetX: hit.offsetX,
      offsetY: hit.offsetY,
      startX: pos.x,
      startY: pos.y,
      startBox: { x: box.x, y: box.y, w: box.w, h: box.h }
    };
    render();
    renderList();
  });

  stage.addEventListener('mousemove', (e) => {
    const pos = getMousePos(e);
    state.mouseX = pos.x;
    state.mouseY = pos.y;

    if (!state.dragging) {
      const hit = findHandleAt(pos.x, pos.y);
      if (hit && hit.handle) {
        stage.style.cursor = hit.handle === 'tl' || hit.handle === 'br' ? 'nwse-resize' : 'nesw-resize';
      } else if (hit && hit.isBox) {
        stage.style.cursor = 'move';
      } else {
        stage.style.cursor = 'default';
      }
      return;
    }

    const box = getBoxById(state.dragging.boxId);
    if (state.dragging.isBox) {
      box.x = Math.round(pos.x - state.dragging.offsetX);
      box.y = Math.round(pos.y - state.dragging.offsetY);
      state.previewSnap = null;
    } else {
      state.previewSnap = computeSnapForHandle(box, state.dragging.handle, pos.x, pos.y);
      applyHandleDrag(box, state.dragging.handle, pos.x, pos.y, state.previewSnap);
    }
    render();
  });

  window.addEventListener('mouseup', () => {
    if (state.dragging) {
      state.dragging = null;
      state.previewSnap = null;
      render();
      renderList();
    }
  });

  stage.addEventListener('mouseleave', () => {
    state.previewSnap = null;
  });

  resetBtn.addEventListener('click', () => {
    state.boxes = state.originalBoxes.map(b => ({ ...b }));
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
