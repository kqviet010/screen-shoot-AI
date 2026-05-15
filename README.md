# 🤖 Screen Shoot AI - Chrome Extension

Một tiện ích mở rộng Chrome cực kỳ thông minh, hoạt động như một trợ lý ảo trực quan. Extension cho phép bạn chụp màn hình toàn bộ trang web hoặc cắt một khu vực cụ thể và lập tức gửi hình ảnh đó cho AI phân tích. 

Kết quả sẽ được trả về **thời gian thực (Streaming)** và hiển thị ngay trên màn hình dưới dạng một hộp thoại Chat (Bubble) phong cách Glassmorphism sang trọng. Extension được tối ưu hóa đặc biệt để vượt qua các lớp phủ phức tạp của các trang web SPA (như Kahoot).

![Giao diện Screenshot AI](image/images.jfif) *(Minh họa Icon)*

---

## ✨ Tính năng nổi bật

- ⚡ **Chụp ảnh siêu tốc (One-Click):** Click trực tiếp vào Icon AI trôi nổi ở góc dưới bên trái màn hình để chụp toàn bộ nội dung web đang xem.
- 🎯 **Cắt vùng tùy chỉnh (Crop):** Nhấn phím tắt `Ctrl + Shift + X` để làm mờ màn hình và kéo chuột chọn vùng ảnh chứa câu hỏi/nội dung cần phân tích.
- 🚀 **Phản hồi thời gian thực (Streaming):** Dữ liệu được trả về theo từng chữ (như ChatGPT đang gõ) với độ trễ gần như bằng 0 (Time-To-First-Token cực thấp).
- 🧠 **Sức mạnh từ Llama Vision:** Được cấu hình sẵn để sử dụng API siêu tốc của Groq / OpenRouter với các model mạnh mẽ như `Llama-3.2-90b-Vision` hoặc `Llama-4-Scout-17b`.
- 🛡️ **Chống che khuất (Anti-Shield):** Được thiết kế với cơ chế tự động bảo vệ giao diện, giữ `z-index` ở mức tuyệt đối (`2147483647`). Hoạt động mượt mà, không bị kẹt hay mất nút bấm trên các trang web động (SPA) như Kahoot.
- 🎨 **Giao diện Glassmorphism Dark Mode:** Hộp thoại kết quả có nền kính mờ sang trọng, hỗ trợ tự động render Markdown (in đậm, in nghiêng, code highlight) siêu đẹp mắt.
- 📸 **Tối ưu hóa Băng thông:** Trình duyệt tự động chụp thẳng ra định dạng `JPEG` nén (50%) và thu nhỏ ảnh về kích thước chuẩn trước khi upload, tiết kiệm tài nguyên mạng tối đa.

---

## 🛠️ Cài đặt (Installation)

1. Tải toàn bộ mã nguồn của kho lưu trữ (repository) này về máy tính.
2. Mở trình duyệt Google Chrome, truy cập vào trang quản lý tiện ích: `chrome://extensions/`.
3. Bật chế độ **Developer mode (Chế độ dành cho nhà phát triển)** ở góc trên cùng bên phải.
4. Bấm vào nút **Load unpacked (Tải tiện ích đã giải nén)** và chọn thư mục chứa mã nguồn vừa tải.
5. Hãy ghim (Pin) extension này lên thanh công cụ của Chrome để dễ dàng cài đặt.

---

## ⚙️ Cấu hình (Configuration)

1. Bấm vào biểu tượng của Extension trên thanh công cụ Chrome để mở bảng cài đặt (Popup).
2. Dán **API Key** của bạn vào ô tương ứng (Hỗ trợ Groq API hoặc OpenRouter).
3. *(Tùy chọn)* Sửa đổi **Prompt mặc định**. Hệ thống đã ngầm tối ưu hóa prompt để ép AI phải trả lời ngắn gọn nhất, không dài dòng.
4. Mở một tab mới (hoặc F5 lại các tab đang mở) để bắt đầu sử dụng.

---

## 🎮 Cách sử dụng (Usage)

- **Cách 1 - Chụp toàn màn hình:** Bấm trực tiếp vào **Icon AI (Hình tròn)** ở góc dưới bên trái màn hình trang web. Mọi thứ trên trang web sẽ được AI đọc hiểu.
- **Cách 2 - Cắt vùng (Crop):** Nhấn phím tắt `Ctrl + Shift + X` (hoặc `Cmd + Shift + X` trên Mac), màn hình sẽ tối đi. Kéo và thả chuột bao quanh vùng bạn muốn AI giải đáp.
- Tận hưởng kết quả AI "nhảy" ra ngay lập tức từ Icon góc trái!

---

## 📂 Cấu trúc dự án

- `manifest.json`: Trái tim của extension (Manifest V3), cấp quyền hoạt động.
- `background/background.js`: Service Worker hoạt động ngầm. Chịu trách nhiệm nén ảnh, xử lý ảnh (OffscreenCanvas) và gọi API tới AI (xử lý luồng SSE Streaming).
- `content/content.js`: Script được tiêm (inject) vào mọi trang web để tạo UI (Icon & Chat bubble) và thao tác DOM. Bắt sự kiện người dùng và render Markdown.
- `content/content.css`: CSS dùng để "trang điểm" cho UI thành phong cách Dark Glassmorphism.
- `popup/`: Giao diện nhỏ khi bấm vào icon trên thanh công cụ dùng để lưu trữ Key API.

---
