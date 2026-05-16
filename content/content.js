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
  <circle class="ss-icon-glow" cx="30" cy="30" r="29" fill="#cc0000"/>
  <circle cx="30" cy="30" r="27" fill="#110000"/>
  <circle cx="30" cy="30" r="24" fill="#c50000"/>
  <circle cx="30" cy="30" r="21" fill="#9a0000"/>
  <g class="ss-sharingan-rotor">
    <g transform="translate(30,30) rotate(0)">
      <circle cx="0" cy="-17" r="4.2" fill="#0d0d0d"/>
      <path fill="#0d0d0d" d="M 0,-21 A 21,21 0 0,1 21,0 L 13,0 A 13,13 0 0,0 0,-13 Z"/>
    </g>
    <g transform="translate(30,30) rotate(120)">
      <circle cx="0" cy="-17" r="4.2" fill="#0d0d0d"/>
      <path fill="#0d0d0d" d="M 0,-21 A 21,21 0 0,1 21,0 L 13,0 A 13,13 0 0,0 0,-13 Z"/>
    </g>
    <g transform="translate(30,30) rotate(240)">
      <circle cx="0" cy="-17" r="4.2" fill="#0d0d0d"/>
      <path fill="#0d0d0d" d="M 0,-21 A 21,21 0 0,1 21,0 L 13,0 A 13,13 0 0,0 0,-13 Z"/>
    </g>
  </g>
  <circle cx="30" cy="30" r="21" fill="none" stroke="#110000" stroke-width="1.2"/>
  <circle cx="30" cy="30" r="13" fill="#160000"/>
  <circle cx="30" cy="30" r="13" fill="none" stroke="#660000" stroke-width="0.8"/>
  <circle cx="30" cy="30" r="6" fill="#0d0d0d"/>
  <circle cx="27.8" cy="27.8" r="1.8" fill="rgba(255,160,160,0.22)"/>
</svg>`;
    const btn = btnWrapper.firstChild;

    container.appendChild(btn);

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      initCrop();
    });

    document.body.appendChild(container);
  }

  if (!document.getElementById('ss-bubble')) {
    const bubble = document.createElement('div');
    bubble.id = 'ss-bubble';

    // Header: drag handle + label + close
    const header = document.createElement('div');
    header.id = 'ss-bubble-header';

    const headerLeft = document.createElement('div');
    headerLeft.className = 'ss-header-left';
    const headerIcon = document.createElement('div');
    headerIcon.className = 'ss-header-icon';
    headerIcon.textContent = 'A';
    const title = document.createElement('span');
    title.className = 'ss-title';
    title.textContent = 'Claude AI';
    headerLeft.append(headerIcon, title);
    header.appendChild(headerLeft);

    const closeBtn = document.createElement('div');
    closeBtn.className = 'ss-close-btn';
    closeBtn.innerHTML = '✕';
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

function positionBubbleNearIcon() {
  const bubble = document.getElementById('ss-bubble');
  const container = document.getElementById('ss-container');
  if (!bubble || !container || bubble.style.display !== 'none') return;
  const rect = container.getBoundingClientRect();
  const gap = 12;
  // Canh phải theo icon
  const right = Math.max(10, window.innerWidth - rect.right);
  // Đặt bubble ngay phía trên icon dùng bottom (khoảng cách từ đáy viewport đến đỉnh icon + gap)
  const bottom = Math.max(10, window.innerHeight - rect.top + gap);
  bubble.style.right  = right  + 'px';
  bubble.style.bottom = bottom + 'px';
  bubble.style.left   = 'auto';
  bubble.style.top    = 'auto';
}

function showBubbleLoading() {
  createUI();
  setIconState('loading');
  positionBubbleNearIcon();
  document.getElementById('ss-bubble').style.display = 'block';
  document.getElementById('ss-bubble-content').innerHTML =
    '<div class="ss-loading"><div class="ss-dots"><span></span><span></span><span></span></div><span>Đang phân tích...</span></div>';
  document.getElementById('ss-bubble-actions').style.display = 'none';
}

function formatMarkdown(text) {
  let h = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // fenced code blocks
  h = h.replace(/```[\w]*\n?([\s\S]*?)```/g, (_, c) => `<pre><code>${c.trim()}</code></pre>`);
  // headers
  h = h.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  h = h.replace(/^## (.+)$/gm,  '<h2>$1</h2>');
  h = h.replace(/^# (.+)$/gm,   '<h1>$1</h1>');
  // blockquote (&gt; was escaped)
  h = h.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
  // bold + italic
  h = h.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
  h = h.replace(/\*\*(.*?)\*\*/g,     '<strong>$1</strong>');
  h = h.replace(/\*(.*?)\*/g,         '<em>$1</em>');
  // inline code
  h = h.replace(/`([^`]+)`/g, '<code>$1</code>');
  // unordered lists
  h = h.replace(/((?:^[*-] .+\n?)+)/gm, block => {
    const items = block.trim().split('\n')
      .map(l => `<li>${l.replace(/^[*-] /, '')}</li>`).join('');
    return `<ul>${items}</ul>`;
  });
  // ordered lists
  h = h.replace(/((?:^\d+\. .+\n?)+)/gm, block => {
    const items = block.trim().split('\n')
      .map(l => `<li>${l.replace(/^\d+\. /, '')}</li>`).join('');
    return `<ol>${items}</ol>`;
  });
  // paragraphs — split on double newlines
  const blockRe = /^<(h[123]|pre|ul|ol|blockquote)/;
  h = h.split(/\n\n+/).map(chunk => {
    chunk = chunk.trim();
    if (!chunk || blockRe.test(chunk)) return chunk;
    return `<p>${chunk.replace(/\n/g, '<br>')}</p>`;
  }).join('\n');
  return h;
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
