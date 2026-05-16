# Screen Shoot AI - Chrome Extension

Một tiện ích mở rộng Chrome hoạt động như trợ lý ảo trực quan. Extension cho phép chụp hoặc cắt vùng màn hình và lập tức gửi hình ảnh đó cho AI phân tích.

Kết quả được trả về **thời gian thực (Streaming)** và hiển thị ngay trên màn hình dưới dạng hộp thoại Chat (Bubble) phong cách dark mode lấy cảm hứng từ Claude.ai.

---

## Tính năng

- **Cắt vùng tùy chỉnh:** Nhấn phím tắt `Ctrl + Shift + X` để làm mờ màn hình và kéo chuột chọn vùng cần phân tích.
- **Phản hồi Streaming:** Dữ liệu trả về theo từng ký tự (như ChatGPT đang gõ) với độ trễ gần như bằng 0.
- **Sức mạnh AI Vision:** Hỗ trợ Groq API và OpenRouter với các model như `Llama-3.2-90b-Vision`, `Llama-4-Scout-17b`.
- **Icon Sharingan kéo thả:** Icon AI trôi nổi có thể kéo đến bất kỳ vị trí nào trên màn hình. Vị trí được lưu lại qua `localStorage` và khôi phục khi reload trang.
- **Bubble chat đồng bộ:** Khung chat tự động di chuyển theo icon khi kéo. Có thể kéo khung chat độc lập bằng thanh tiêu đề.
- **Giao diện Claude-inspired:** Khung chat dark mode màu zinc, accent cam (`#da7756`), font `ui-sans-serif / system-ui`, animation mượt mà khi xuất hiện.
- **Markdown đầy đủ:** Tự động render heading, bold, italic, inline code, code block, danh sách có thứ tự / không thứ tự, blockquote.
- **Chống che khuất (Anti-Shield):** `z-index: 2147483647`, hoạt động mượt trên các trang SPA động (Kahoot, v.v.).
- **Tối ưu băng thông:** Ảnh được nén sang JPEG (50%) và thu nhỏ về kích thước chuẩn trước khi gửi API.

---

## Cài đặt

1. Tải toàn bộ mã nguồn về máy.
2. Mở Chrome, truy cập `chrome://extensions/`.
3. Bật **Developer mode** ở góc trên bên phải.
4. Bấm **Load unpacked** và chọn thư mục mã nguồn.
5. Ghim extension lên thanh công cụ Chrome.

---

## Cấu hình

1. Bấm vào biểu tượng extension trên thanh công cụ để mở Popup.
2. Dán **API Key** vào ô tương ứng (Groq hoặc OpenRouter).
3. *(Tùy chọn)* Chỉnh sửa **Prompt mặc định**.
4. Mở tab mới hoặc F5 lại tab đang mở để bắt đầu sử dụng.

---

## Cách sử dụng

- **Cắt vùng (Crop):** Nhấn `Ctrl + Shift + X`, màn hình tối lại, kéo chuột quanh vùng muốn AI phân tích.
- **Di chuyển icon:** Giữ chuột và kéo icon Sharingan đến vị trí bất kỳ — khung chat sẽ theo.
- **Di chuyển khung chat:** Kéo thanh tiêu đề "Claude AI" để đặt khung chat độc lập với icon.

---

## Cấu trúc dự án

| File | Vai trò |
|---|---|
| `manifest.json` | Cấu hình Manifest V3, cấp quyền hoạt động |
| `background/background.js` | Service Worker: nén ảnh, xử lý OffscreenCanvas, gọi API, xử lý SSE Streaming |
| `content/content.js` | Inject vào trang web: tạo Icon & Bubble, drag-and-drop, render Markdown |
| `content/content.css` | Giao diện dark mode Claude-inspired, animation, Markdown styling |
| `popup/` | Giao diện lưu trữ API Key |
