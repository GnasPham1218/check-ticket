# Dò vé số bằng ảnh

Web app React + Node.js cho phép người dùng chụp ảnh tờ vé số, dùng API key Gemini hoặc ChatGPT/OpenAI của chính họ để OCR thông tin vé, sau đó gọi API kết quả xổ số theo tỉnh/thành để dò số.

## Tính năng

- Chụp/chọn ảnh vé số trên mobile hoặc desktop.
- Người dùng tự nhập API key Gemini/OpenAI; server không lưu key.
- Trích xuất `province`, `drawDate`, `ticketNumber`, `series` từ ảnh.
- Dò kết quả qua adapter API cấu hình được theo tỉnh/thành.
- Có dữ liệu demo cho Đồng Nai ngày `2026-05-20`.
- Đăng nhập Google không bắt buộc để lưu thống kê theo email.
- Lưu lịch sử dò vé, thống kê tháng này và tổng cộng.
- Dò nhiều vé cùng lúc bằng cách nhập danh sách số vé.

## Cài đặt

```bash
npm install
npm run dev
```

Frontend chạy mặc định tại `http://localhost:5173`, backend tại `http://localhost:4000`.

Nếu muốn đổi URL backend cho frontend:

```bash
VITE_API_BASE=http://localhost:4000 npm run dev:client
```

## Chạy qua ngrok

App đã cấu hình Vite proxy, nên chỉ cần tunnel frontend:

```bash
npm run dev
ngrok http 5173
```

Mở URL HTTPS của ngrok. Frontend sẽ gọi `/api` cùng host ngrok và Vite tự proxy về backend `localhost:4000`.

Nếu ngrok báo host bị chặn, kiểm tra `vite.config.js` đã có `allowedHosts: true`.

## Đăng nhập, lịch sử và thống kê

App hỗ trợ Google Identity Services nếu bạn cấu hình `VITE_GOOGLE_CLIENT_ID`. Nếu chưa cấu hình, nút đăng nhập sẽ fallback sang nhập email demo để vẫn lưu thống kê theo email. Dữ liệu được lưu bằng SQLite trong file `server/data/check-ticket.sqlite`.

Các thống kê hiện có:

- Tháng này dò được bao nhiêu vé.
- Tháng này trúng bao nhiêu vé.
- Tiền đã mua vé trong tháng.
- Tiền trúng trong tháng.
- Tổng số vé đã dò.
- Tổng lãi/lỗ toàn bộ lịch sử.

Để bật Google OAuth thật:

1. Vào Google Cloud Console và tạo OAuth Client ID loại Web.
2. Thêm Authorized JavaScript origins:
   - `http://localhost:5173`
   - URL ngrok nếu dùng tunnel.
3. Thêm vào `.env`:

```bash
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

4. Chạy lại `npm run dev`.

## Dò nhiều vé nâng cao

Tính năng này hỗ trợ nhiều vé khác tỉnh và khác ngày trong cùng một lần dò.

Bạn có 2 cách nhập:

1. Bấm `+ Thêm vé thủ công`, rồi nhập từng dòng gồm tỉnh/đài, ngày xổ, số vé, seri.
2. Bấm `Scan nhiều ảnh vé`, chọn nhiều ảnh cùng lúc. AI sẽ đọc từng ảnh và tự thêm vào danh sách vé để bạn kiểm tra/sửa lại trước khi dò.

Backend giới hạn tối đa `50` vé mỗi lần gọi để tránh spam nguồn kết quả. Backend cũng tự gom nhóm theo `province + drawDate`, nên nhiều vé chung tỉnh/ngày chỉ fetch kết quả xổ số 1 lần.

## SQLite database

App dùng SQLite qua package `better-sqlite3`.

File database mặc định:

```text
server/data/check-ticket.sqlite
```

Schema được tự tạo khi server khởi động, gồm:

- `users`: thông tin user guest/email/Google.
- `ticket_checks`: lịch sử từng lần dò vé, tiền mua vé, tiền trúng, giải trúng, nguồn kết quả.

Nếu muốn đổi vị trí file database, thêm vào `.env`:

```bash
SQLITE_PATH=C:/data/check-ticket.sqlite
```

Khi deploy production, hãy backup file SQLite định kỳ và dùng persistent disk/volume để tránh mất dữ liệu.

## Cấu hình model AI

Server mặc định dùng:

- Gemini: `gemini-2.5-flash`
- OpenAI: `gpt-4o-mini`

Có thể đổi bằng biến môi trường:

```bash
GEMINI_MODEL=gemini-2.5-flash OPENAI_MODEL=gpt-4o-mini npm run dev:server
```

Nếu Gemini báo lỗi model không tồn tại, gọi danh sách model bằng API key của bạn:

```bash
curl "https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_GEMINI_API_KEY"
```

Sau đó chọn model có `supportedGenerationMethods` chứa `generateContent`, ví dụ `gemini-2.5-flash`, `gemini-2.0-flash`, hoặc model mới hơn mà tài khoản của bạn hỗ trợ.

## Cấu hình API kết quả xổ số

Mình đã tích hợp sẵn 2 nguồn kết quả:

### Minh Ngọc

- Nguồn: https://www.minhngoc.net.vn/demo/
- Không cần API key.
- Đã cấu hình tất cả tỉnh/đài xổ số truyền thống trên Minh Ngọc.
- Hỗ trợ mọi ngày mà Minh Ngọc còn lưu trang kết quả.
- Backend tự lấy trang theo dạng:
  `https://www.minhngoc.net.vn/ket-qua-xo-so/{mien}/{tinh}/DD-MM-YYYY.html`

Ví dụ cấu hình trong `server/lottery/providers/lotteryApis.json`:

```json
{
  "province": "*",
  "provider": "minhngoc"
}
```

Lưu ý: đây là cách scrape HTML nên có thể cần cập nhật parser nếu Minh Ngọc đổi giao diện/bảng HTML.

Các tỉnh/đài truyền thống đã map:

- Miền Nam: An Giang, Bạc Liêu, Bến Tre, Bình Dương, Bình Phước, Bình Thuận, Cà Mau, Cần Thơ, Đà Lạt, Đồng Nai, Đồng Tháp, Hậu Giang, Kiên Giang, Long An, Sóc Trăng, Tây Ninh, Tiền Giang, TP. HCM, Trà Vinh, Vĩnh Long, Vũng Tàu.
- Miền Trung: Bình Định, Đà Nẵng, Đắk Lắk, Đắk Nông, Gia Lai, Khánh Hòa, Kon Tum, Ninh Thuận, Phú Yên, Quảng Bình, Quảng Nam, Quảng Ngãi, Quảng Trị, Huế.
- Miền Bắc: Bắc Ninh, Hà Nội, Hải Phòng, Nam Định, Quảng Ninh, Thái Bình.

Các loại Vietlott/điện toán như Mega 6/45, Power 6/55, Max 4D có cấu trúc trang khác; cần thêm parser riêng nếu muốn dò các loại đó bằng ảnh.

### XoSoAPI

Provider API JSON từ XoSoAPI vẫn được giữ làm lựa chọn dự phòng nếu bạn có API key:

- Docs: https://xosoapi.online/docs
- Endpoint kết quả xổ số Việt Nam: `GET /api/v1/vietnam/draws`
- Header xác thực: `X-API-Key: YOUR_API_KEY`
- Free tier theo docs: 100 requests/ngày, 10 requests/phút.

Tạo `.env` từ `.env.example` rồi điền key:

```bash
XOSO_API_KEY=your_xosoapi_key
```

Nếu không có `XOSO_API_KEY`, app sẽ tự bỏ qua provider thật và dùng dữ liệu demo local nếu tỉnh/ngày đó đã có sample.

Bạn có thể sửa hoặc thêm provider trong `server/lottery/providers/lotteryApis.json`.

Ví dụ:

```json
{
  "apis": [
    {
      "province": "Đồng Nai",
      "aliases": ["Dong Nai"],
      "url": "https://example.com/api/results?province={province}&date={date}",
      "dataPath": "data",
      "prizePath": "prizes"
    }
  ]
}
```

Các placeholder hỗ trợ:

- `{province}`: tỉnh/đài đã scan.
- `{date}`: ngày xổ dạng `YYYY-MM-DD`.
- `{ticketNumber}`: số vé đã scan.

Adapter chấp nhận `prizes` dạng mảng:

```json
[
  { "prize": "Giải tám", "numbers": ["56"] },
  { "prize": "Giải đặc biệt", "number": "123456" }
]
```

Hoặc object:

```json
{
  "giai8": ["56"],
  "dacBiet": ["123456"]
}
```

## Kiểm thử nhanh dữ liệu demo

1. Chạy `npm run dev`.
2. Nhập thủ công:
   - Tỉnh / đài: `Đồng Nai`
   - Ngày xổ: `2026-05-20`
   - Số vé: `123456`
3. Bấm `Dò vé`, kết quả sẽ báo trúng giải đặc biệt và giải tám vì số vé kết thúc bằng `56`.

## Ghi chú bảo mật

- Không hard-code API key vào source code.
- Nên thêm rate limit và CAPTCHA nếu deploy public.
- Nên proxy API kết quả xổ số qua backend để tránh lộ endpoint/private token của nhà cung cấp dữ liệu.
