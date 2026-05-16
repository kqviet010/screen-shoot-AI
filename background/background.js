chrome.commands.onCommand.addListener((command) => {
  if (command === "capture_region") {
    startCaptureFlow();
  }
});

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.action === 'INIT_CAPTURE') {
    startCaptureFlow();
  } else if (message.action === 'CROP_COORDS') {
    handleCroppedImage(message.coords, sender.tab.id);
  }
});

async function startCaptureFlow() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  try {
    await chrome.tabs.sendMessage(tab.id, { action: 'START_CROP' });
  } catch (e) {
    try {
      await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ['content/content.css'] });
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content/content.js'] });
      await chrome.tabs.sendMessage(tab.id, { action: 'START_CROP' });
    } catch (injectError) {
      console.warn("Không thể chạy Extension trên trang này:", injectError);
    }
  }
}

// Thay thế FileReader bằng arrayBuffer để dùng async/await thuần
async function blobToBase64DataUrl(blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const chunks = [];
  for (let i = 0; i < bytes.length; i += 0x8000) {
    chunks.push(String.fromCharCode(...bytes.subarray(i, i + 0x8000)));
  }
  return `data:image/jpeg;base64,${btoa(chunks.join(''))}`;
}

async function handleCroppedImage(coords, tabId) {
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 85 });

    chrome.tabs.sendMessage(tabId, { action: 'SHOW_LOADING' });

    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);

    let cropX = 0, cropY = 0, cropW = bitmap.width, cropH = bitmap.height;

    if (coords) {
      const dpr = coords.dpr || 1;
      cropX = coords.x * dpr;
      cropY = coords.y * dpr;
      cropW = coords.width * dpr;
      cropH = coords.height * dpr;
    }

    let finalW = cropW;
    let finalH = cropH;
    const MAX_DIMENSION = 1024;
    if (finalW > MAX_DIMENSION || finalH > MAX_DIMENSION) {
      if (finalW > finalH) {
        finalH = Math.round(finalH * (MAX_DIMENSION / finalW));
        finalW = MAX_DIMENSION;
      } else {
        finalW = Math.round(finalW * (MAX_DIMENSION / finalH));
        finalH = MAX_DIMENSION;
      }
    }

    const canvas = new OffscreenCanvas(finalW, finalH);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, cropX, cropY, cropW, cropH, 0, 0, finalW, finalH);

    const croppedBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
    const base64data = await blobToBase64DataUrl(croppedBlob);

    await callGroq(base64data, tabId);

  } catch (error) {
    console.error(error);
    chrome.tabs.sendMessage(tabId, { action: 'SHOW_ERROR', error: error.message });
  }
}

async function callGroq(base64Image, tabId) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const { apiKey, defaultPrompt } = await chrome.storage.local.get(['apiKey', 'defaultPrompt']);
    if (!apiKey) {
      throw new Error("Chưa cài đặt API Key. Vui lòng mở popup để nhập.");
    }

    const prompt = (defaultPrompt || "Trả lời câu hỏi này") + "\n(Hãy trả lời ngắn gọn, chỉ đưa ra đáp án, không giải thích dài dòng).";
    const url = 'https://api.groq.com/openai/v1/chat/completions';

    const payload = {
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: base64Image } }
          ]
        }
      ],
      stream: true,
      max_tokens: 1024,
      temperature: 0.0,
      top_p: 1
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || "Lỗi API Groq");
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let fullAnswer = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const dataStr = line.slice(6).trim();
        if (dataStr === '[DONE]' || !dataStr) continue;

        try {
          const dataObj = JSON.parse(dataStr);
          const textPart = dataObj.choices?.[0]?.delta?.content;
          if (textPart) {
            fullAnswer += textPart;
            chrome.tabs.sendMessage(tabId, { action: 'UPDATE_STREAM_RESULT', text: fullAnswer });
          }
        } catch (e) {
          // Bỏ qua SSE chunk lỗi
        }
      }
    }

  } catch (error) {
    const msg = error.name === 'AbortError'
      ? 'Yêu cầu quá thời gian (30 giây). Vui lòng thử lại.'
      : error.message;
    chrome.tabs.sendMessage(tabId, { action: 'SHOW_ERROR', error: msg });
  } finally {
    clearTimeout(timeoutId);
  }
}
