document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('apiKey');
  const promptInput = document.getElementById('prompt');
  const saveBtn = document.getElementById('saveBtn');
  const status = document.getElementById('status');
  const captureBtn = document.getElementById('captureBtn');

  chrome.storage.local.get(['apiKey', 'defaultPrompt'], (result) => {
    if (result.apiKey) apiKeyInput.value = result.apiKey;
    promptInput.value = result.defaultPrompt || "Trả lời câu hỏi này";
  });

  function setStatus(msg, isError) {
    status.textContent = msg;
    status.style.color = isError ? '#e74c3c' : '#27ae60';
    if (!isError) setTimeout(() => { status.textContent = ''; }, 2000);
  }

  saveBtn.addEventListener('click', () => {
    const apiKey = apiKeyInput.value.trim();
    const defaultPrompt = promptInput.value.trim() || "Trả lời câu hỏi này";

    if (!apiKey) {
      setStatus('⚠️ Vui lòng nhập API Key!', true);
      return;
    }
    if (!apiKey.startsWith('gsk_')) {
      setStatus('⚠️ API Key phải bắt đầu bằng gsk_', true);
      return;
    }

    chrome.storage.local.set({ apiKey, defaultPrompt }, () => {
      setStatus('✓ Đã lưu cấu hình!', false);
    });
  });

  captureBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'INIT_CAPTURE' });
    window.close();
  });
});
