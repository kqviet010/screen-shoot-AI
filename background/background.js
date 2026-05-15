chrome.commands.onCommand.addListener((command) => {
  if (command === "capture_region") {
    startCaptureFlow();
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
    // Nếu gặp lỗi (có thể do tab mở từ trước khi cài extension), tự động nhúng script vào
    try {
      await chrome.scripting.insertCSS({
        target: { tabId: tab.id },
        files: ['content/content.css']
      });
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content/content.js']
      });
      // Gửi lại tín hiệu sau khi nhúng thành công
      await chrome.tabs.sendMessage(tab.id, { action: 'START_CROP' });
    } catch (injectError) {
      console.warn("Không thể chạy Extension trên trang này (có thể là trang chrome:// hoặc trang bị chặn):", injectError);
    }
  }
}

async function handleCroppedImage(coords, tabId) {
  try {
    // 1. Chụp ảnh màn hình toàn tab (Chụp thẳng JPEG chất lượng 50% để siêu nhanh)
    const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 50 });
    
    // Báo cho tab biết đang xử lý
    chrome.tabs.sendMessage(tabId, { action: 'SHOW_LOADING' });

    // 2. Cắt ảnh bằng OffscreenCanvas
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);
    
    // Fix tỉ lệ (devicePixelRatio) nếu màn hình có scale
    let cropX = 0, cropY = 0, cropW = bitmap.width, cropH = bitmap.height;

    if (coords) {
      const dpr = coords.dpr || 1;
      cropX = coords.x * dpr;
      cropY = coords.y * dpr;
      cropW = coords.width * dpr;
      cropH = coords.height * dpr;
    }

    // Scale down ảnh nếu quá lớn để upload nhanh hơn (AI chỉ cần ảnh vừa đủ nhìn chữ)
    let finalW = cropW;
    let finalH = cropH;
    const MAX_DIMENSION = 800; 
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
    
    // Giảm chất lượng JPEG xuống 0.5 để giảm dung lượng file
    const croppedBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.5 });
    
    // Convert blob to base64
    const reader = new FileReader();
    reader.readAsDataURL(croppedBlob);
    reader.onloadend = async () => {
      const base64data = reader.result;
      
      // 3. Gọi Groq API
      await callGroq(base64data, tabId);
    };

  } catch (error) {
    console.error(error);
    chrome.tabs.sendMessage(tabId, { action: 'SHOW_ERROR', error: error.message });
  }
}

async function callGroq(base64Image, tabId) {
  try {
    const { apiKey, defaultPrompt } = await chrome.storage.local.get(['apiKey', 'defaultPrompt']);
    if (!apiKey) {
      throw new Error("Chưa cài đặt API Key. Vui lòng mở popup để nhập.");
    }
    
    const prompt = (defaultPrompt || "Trả lời câu hỏi này") + "\n(Hãy trả lời cực kỳ ngắn gọn, chỉ đưa ra đáp án, tuyệt đối không giải thích dài dòng để tiết kiệm thời gian).";
    const targetModel = 'meta-llama/llama-4-scout-17b-16e-instruct';
    const url = 'https://api.groq.com/openai/v1/chat/completions';
    
    const payload = {
      model: targetModel,
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
      max_tokens: 20,
      temperature: 0.0,
      top_p: 1
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
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
      buffer = lines.pop(); // Giữ lại mảnh dữ liệu cuối cùng chưa hoàn chỉnh
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.replace('data: ', '').trim();
          if (dataStr === '[DONE]' || !dataStr) continue;
          
          try {
            const dataObj = JSON.parse(dataStr);
            if (dataObj.choices && dataObj.choices[0] && dataObj.choices[0].delta && dataObj.choices[0].delta.content) {
              const textPart = dataObj.choices[0].delta.content;
              fullAnswer += textPart;
              // Báo cho Content Script update Text liên tục từng chữ một
              chrome.tabs.sendMessage(tabId, { action: 'UPDATE_STREAM_RESULT', text: fullAnswer });
            }
          } catch (e) {
            console.error("SSE Parse Error", e);
          }
        }
      }
    }
    
  } catch (error) {
    chrome.tabs.sendMessage(tabId, { action: 'SHOW_ERROR', error: error.message });
  }
}
