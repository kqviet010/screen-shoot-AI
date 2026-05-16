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

function createUI() {
  if (!document.getElementById('ss-container')) {
    const container = document.createElement('div');
    container.id = 'ss-container';

    const btn = document.createElement('img');
    btn.src = chrome.runtime.getURL('image/images.jfif');
    btn.id = 'ss-floating-btn';
    btn.title = 'Chụp ảnh màn hình gửi AI';
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
  document.getElementById('ss-bubble').style.display = 'block';
  document.getElementById('ss-bubble-content').innerHTML = formatMarkdown(text);
  document.getElementById('ss-bubble-actions').style.display = 'flex';
}

function showBubbleError(error) {
  createUI();
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
