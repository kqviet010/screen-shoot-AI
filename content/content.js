let overlay = null;
let selection = null;
let startX, startY;
let isDragging = false;
let lastResultText = '';
let observer = null;

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'START_CROP') {
    initCrop();
  } else if (message.action === 'SHOW_LOADING') {
    showBubbleLoading();
  } else if (message.action === 'SHOW_RESULT' || message.action === 'UPDATE_STREAM_RESULT') {
    showBubbleResult(message.text);
  } else if (message.action === 'SHOW_ERROR') {
    showBubbleError(message.error);
  }
});

function handleEscKey(e) {
  if (e.key === 'Escape') cleanupCrop();
}

function cleanupCrop() {
  if (overlay) {
    overlay.remove();
    overlay = null;
    selection = null;
    isDragging = false;
  }
  document.removeEventListener('keydown', handleEscKey);
  setIconState(null);
}

function initCrop() {
  if (overlay) return;

  overlay = document.createElement('div');
  overlay.id = 'screen-shoot-overlay';

  selection = document.createElement('div');
  selection.id = 'screen-shoot-selection';

  const darkBg = document.createElement('div');
  darkBg.style.cssText = 'position:absolute;width:100%;height:100%;background:rgba(0,0,0,0.5)';
  overlay.appendChild(darkBg);
  overlay.appendChild(selection);
  document.body.appendChild(overlay);
  document.addEventListener('keydown', handleEscKey);
  setIconState('crop');

  overlay.addEventListener('mousedown', (e) => {
    isDragging = true;
    darkBg.style.display = 'none';
    selection.style.display = 'block';
    startX = e.clientX;
    startY = e.clientY;
    updateSelection(e.clientX, e.clientY);
  });

  overlay.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    updateSelection(e.clientX, e.clientY);
  });

  overlay.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;

    const rect = selection.getBoundingClientRect();
    const coords = {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
      dpr: window.devicePixelRatio || 1
    };

    cleanupCrop();

    if (coords.width > 10 && coords.height > 10) {
      setTimeout(() => chrome.runtime.sendMessage({ action: 'CROP_COORDS', coords }), 100);
    }
  });
}

function updateSelection(currentX, currentY) {
  const x = Math.min(startX, currentX);
  const y = Math.min(startY, currentY);
  selection.style.left = x + 'px';
  selection.style.top = y + 'px';
  selection.style.width = Math.abs(currentX - startX) + 'px';
  selection.style.height = Math.abs(currentY - startY) + 'px';
}

function setIconState(state) {
  const btn = document.getElementById('ss-floating-btn');
  if (!btn) return;
  btn.classList.remove('ss-state-crop', 'ss-state-loading', 'ss-state-result');
  if (state) btn.classList.add(`ss-state-${state}`);
}

function createUI() {
  if (!document.getElementById('ss-container')) {
    const container = document.createElement('div');
    container.id = 'ss-container';

    const btnWrapper = document.createElement('div');
    btnWrapper.innerHTML = `<svg id="ss-floating-btn" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" title="Chụp ảnh màn hình gửi AI">
  <defs>
    <linearGradient id="ss-ext-grad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#7c3aed"/>
      <stop offset="100%" stop-color="#06b6d4"/>
    </linearGradient>
  </defs>
  <circle class="ss-icon-glow" cx="30" cy="30" r="29" fill="url(#ss-ext-grad)"/>
  <circle cx="30" cy="30" r="26" fill="url(#ss-ext-grad)"/>
  <circle class="ss-spin-ring" cx="30" cy="30" r="29" fill="none"
    stroke="#06b6d4" stroke-width="3"
    stroke-dasharray="44 132" stroke-linecap="round"/>
  <path class="ss-sparkle" fill="white" opacity="0.95"
    d="M30,17 L32.8,27.2 L43,30 L32.8,32.8 L30,43 L27.2,32.8 L17,30 L27.2,27.2 Z"/>
  <circle class="ss-result-dot" cx="45" cy="15" r="5" fill="#22c55e"/>
</svg>`;
    const btn = btnWrapper.firstChild;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      initCrop();
    });

    container.appendChild(btn);
    document.body.appendChild(container);
  }

  if (!document.getElementById('ss-bubble')) {
    const bubble = document.createElement('div');
    bubble.id = 'ss-bubble';

    // Header: drag handle + label + close
    const header = document.createElement('div');
    header.id = 'ss-bubble-header';

    const label = document.createElement('span');
    label.textContent = 'AI Response';
    header.appendChild(label);

    const closeBtn = document.createElement('div');
    closeBtn.className = 'ss-close-btn';
    closeBtn.innerHTML = '✖';
    closeBtn.onclick = () => { bubble.style.display = 'none'; };
    header.appendChild(closeBtn);

    const content = document.createElement('div');
    content.className = 'ss-bubble-content';
    content.id = 'ss-bubble-content';

    const actions = document.createElement('div');
    actions.id = 'ss-bubble-actions';
    actions.style.display = 'none';

    const copyBtn = document.createElement('button');
    copyBtn.id = 'ss-copy-btn';
    copyBtn.textContent = 'Copy';
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(lastResultText).then(() => {
        copyBtn.textContent = '✓ Copied!';
        setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
      }).catch(() => {
        copyBtn.textContent = '✗ Lỗi';
        setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
      });
    };
    actions.appendChild(copyBtn);

    bubble.appendChild(header);
    bubble.appendChild(content);
    bubble.appendChild(actions);

    // Kéo bubble bằng header
    let isDraggingBubble = false;
    let dragStartX = 0, dragStartY = 0;
    let bubbleStartLeft = 0, bubbleStartTop = 0;

    header.addEventListener('mousedown', (e) => {
      if (closeBtn.contains(e.target)) return;
      isDraggingBubble = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      const rect = bubble.getBoundingClientRect();
      bubbleStartLeft = rect.left;
      bubbleStartTop = rect.top;
      header.style.cursor = 'grabbing';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDraggingBubble) return;
      bubble.style.left = (bubbleStartLeft + e.clientX - dragStartX) + 'px';
      bubble.style.top = (bubbleStartTop + e.clientY - dragStartY) + 'px';
      bubble.style.right = 'auto';
      bubble.style.bottom = 'auto';
    });

    document.addEventListener('mouseup', () => {
      if (isDraggingBubble) {
        isDraggingBubble = false;
        header.style.cursor = 'grab';
      }
    });

    document.body.appendChild(bubble);
  }
}

function showBubbleLoading() {
  createUI();
  setIconState('loading');
  document.getElementById('ss-bubble').style.display = 'block';
  document.getElementById('ss-bubble-content').innerHTML =
    '<div class="ss-loading"><div class="ss-spinner"></div> AI đang phân tích...</div>';
  document.getElementById('ss-bubble-actions').style.display = 'none';
}

function formatMarkdown(text) {
  let html = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/`(.*?)`/g, '<span style="background:rgba(255,255,255,0.1);padding:2px 6px;border-radius:4px;font-family:monospace;color:#a78bfa">$1</span>');
  return html;
}

function showBubbleResult(text) {
  lastResultText = text;
  createUI();
  setIconState('result');
  setTimeout(() => setIconState(null), 3000);
  document.getElementById('ss-bubble').style.display = 'block';
  document.getElementById('ss-bubble-content').innerHTML = formatMarkdown(text);
  document.getElementById('ss-bubble-actions').style.display = 'flex';
}

function showBubbleError(error) {
  createUI();
  setIconState(null);
  document.getElementById('ss-bubble').style.display = 'block';
  document.getElementById('ss-bubble-content').innerHTML = `<div class="ss-error">❌ Lỗi: ${error}</div>`;
  document.getElementById('ss-bubble-actions').style.display = 'none';
}

function startObserver() {
  if (observer) return;
  // MutationObserver thay cho setInterval: chỉ kích hoạt khi DOM thực sự thay đổi
  observer = new MutationObserver(() => {
    if (!document.getElementById('ss-container') || !document.getElementById('ss-bubble')) {
      createUI();
    }
  });
  observer.observe(document.body, { childList: true });
}

createUI();
startObserver();
