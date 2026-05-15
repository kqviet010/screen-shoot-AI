let overlay = null;
let selection = null;
let startX, startY;
let isDragging = false;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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

function initCrop() {
  if (overlay) return;

  overlay = document.createElement('div');
  overlay.id = 'screen-shoot-overlay';

  selection = document.createElement('div');
  selection.id = 'screen-shoot-selection';

  const darkBg = document.createElement('div');
  darkBg.style.position = 'absolute';
  darkBg.style.width = '100%';
  darkBg.style.height = '100%';
  darkBg.style.background = 'rgba(0,0,0,0.5)';
  overlay.appendChild(darkBg);
  overlay.appendChild(selection);

  document.body.appendChild(overlay);

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

  overlay.addEventListener('mouseup', (e) => {
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

    overlay.remove();
    overlay = null;
    selection = null;

    if (coords.width > 10 && coords.height > 10) {
      setTimeout(() => {
        chrome.runtime.sendMessage({ action: 'CROP_COORDS', coords });
      }, 100);
    }
  });
}

function updateSelection(currentX, currentY) {
  const x = Math.min(startX, currentX);
  const y = Math.min(startY, currentY);
  const w = Math.abs(currentX - startX);
  const h = Math.abs(currentY - startY);

  selection.style.left = x + 'px';
  selection.style.top = y + 'px';
  selection.style.width = w + 'px';
  selection.style.height = h + 'px';
}

function createUI() {
  if (document.getElementById('ss-container')) return;

  const container = document.createElement('div');
  container.id = 'ss-container';

  // Icon AI
  const btn = document.createElement('img');
  btn.src = chrome.runtime.getURL('image/images.jfif');
  btn.id = 'ss-floating-btn';
  btn.title = 'Chụp ảnh màn hình gửi AI';
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    initCrop();
  });

  // Chat Bubble
  const bubble = document.createElement('div');
  bubble.id = 'ss-bubble';

  const closeBtn = document.createElement('div');
  closeBtn.className = 'ss-close-btn';
  closeBtn.innerHTML = '✖';
  closeBtn.onclick = () => {
    bubble.style.display = 'none';
  };

  const content = document.createElement('div');
  content.className = 'ss-bubble-content';
  content.id = 'ss-bubble-content';

  bubble.appendChild(closeBtn);
  bubble.appendChild(content);

  // Nối vào container
  container.appendChild(btn);
  container.appendChild(bubble);

  document.body.appendChild(container);
}

function getBubbleContentElement() {
  createUI();
  const bubble = document.getElementById('ss-bubble');
  bubble.style.display = 'block';
  return document.getElementById('ss-bubble-content');
}

function showBubbleLoading() {
  const c = getBubbleContentElement();
  c.innerHTML = '<div class="ss-loading"><div class="ss-spinner"></div> AI đang phân tích...</div>';
}

function formatMarkdown(text) {
  let html = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  // In đậm: **text**
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // In nghiêng: *text*
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  // Highlight code inline: `code`
  html = html.replace(/`(.*?)`/g, '<span style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; font-family: monospace; color: #a78bfa;">$1</span>');
  return html;
}

function showBubbleResult(text) {
  const c = getBubbleContentElement();
  c.innerHTML = formatMarkdown(text);
}

function showBubbleError(error) {
  const c = getBubbleContentElement();
  c.innerHTML = `<div class="ss-error">❌ Lỗi: ${error}</div>`;
}

// Khởi tạo UI ngay khi load trang
createUI();

// Bảo vệ UI: Kahoot là một trang web động (SPA), nó có thể tạo ra các lớp phủ 
// hoặc vô tình che mất/xóa mất Icon của chúng ta lúc mới load xong.
setInterval(() => {
  const container = document.getElementById('ss-container');
  if (!container) {
    createUI(); // Mọc lại nếu bị xóa
  }
}, 1000);
