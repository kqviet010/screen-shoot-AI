document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('apiKey');
  const promptInput = document.getElementById('prompt');
  const saveBtn = document.getElementById('saveBtn');
  const status = document.getElementById('status');
  const captureBtn = document.getElementById('captureBtn');

  // Load existing config
  chrome.storage.local.get(['apiKey', 'defaultPrompt'], (result) => {
    if (result.apiKey) {
      apiKeyInput.value = result.apiKey;
    }
    if (result.defaultPrompt) {
      promptInput.value = result.defaultPrompt;
    } else {
      promptInput.value = "Trả lời câu hỏi này";
    }
  });

  saveBtn.addEventListener('click', () => {
    const apiKey = apiKeyInput.value.trim();
    const defaultPrompt = promptInput.value.trim() || "Trả lời câu hỏi này";

    chrome.storage.local.set({ apiKey, defaultPrompt }, () => {
      status.textContent = 'Đã lưu cấu hình!';
      setTimeout(() => { status.textContent = ''; }, 2000);
    });
  });

  captureBtn.addEventListener('click', () => {
    // Gửi message cho background để bắt đầu chụp
    chrome.runtime.sendMessage({ action: 'INIT_CAPTURE' });
    window.close(); // Đóng popup
  });
});
