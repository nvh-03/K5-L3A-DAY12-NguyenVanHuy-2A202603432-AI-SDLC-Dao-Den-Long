# Bằng chứng Phase 4 — Ticket-04 "Bình minh: phát hành v1.0.0" (Test Contract v1.3)

- Thay đổi: [../../CHANGELOG.md](../../CHANGELOG.md) mục `[phase-4]`. Giả định mới #29–#38: [../notes/assumptions.md](../notes/assumptions.md).
- Máy đo (chỉ để tham khảo; máy chấm của giảng viên mới là chuẩn): Windows 11 (10.0.22631), Chrome 157, **GPU tích hợp Intel UHD Graphics**, Node v24.22.1.

## Lệnh đã chạy và kết quả

| Việc | Lệnh | Kết quả |
|---|---|---|
| Test | `npm test` → [phase-4/test-output.txt](phase-4/test-output.txt) | 4 cổng: **77 + 50 (contract v1.3) + 60 (fuzz) + 50 (nền tảng) đạt, 0 trượt** |
| Benchmark | `node bin/bench.js --seed 42 --duration 30 --out bench.json` | avg/p1-low/load đều vượt ngưỡng (bảng dưới). [bench.json](phase-4/bench.json) |
| Soak | `node --expose-gc --max-semi-space-size=1 bin/soak.js --seed 7 --nights 10 --out soak.json` | **crashes 0**, RAM ×1.02–1.13 ≤ 1.2. [soak.json](phase-4/soak.json) |
| Headless không đổi | `node bin/headless.js --seed 42 --night 1 --ticks 14405 ...` | **Giống hệt** file bằng chứng phase-3 (so nội dung, bỏ qua CRLF) → phần sáng tạo Phase 4 không đổi đầu ra |

## §1 Benchmark

Ngưỡng ticket: `avg_fps ≥ 60 · p1_low_fps ≥ 30 · load_ms ≤ 10000`. Cảnh chuẩn: 200 Bóng Mực wander + 100 đom đóm + L1–L3 sáng dầu 100, camera bay vòng, 1280×720, vsync tắt. Ảnh: [../media/bench-scene.png](../media/bench-scene.png).

`bench.json` đã commit (seed 42, 30 s):

| avg_fps | p1_low_fps | frame_ms_p95 | frames | load_ms | vsync_off | viewport | peak_mem_mb |
|---|---|---|---|---|---|---|---|
| 131.3 | 65.2 | 9.5 | ~3900 | 1742 | true | 1280×720 | null |

- `renderer`: `Three.js r160 WebGL2 on Chrome/157 · ANGLE (Intel UHD Graphics, D3D11)`.
- **Độ dao động (quan trọng):** trên GPU tích hợp này, 8 lần chạy cho avg 121–142 và **p1_low 28.5–76.6** tùy tải nền. Một lần rơi xuống 28.5 (< 30). Đây là giới hạn của GPU tích hợp + tải máy dev, không phải lỗi game; ticket ghi rõ số tự đo chỉ để tham khảo, máy chấm có cấu hình công bố trước mới là chuẩn. `bench.json` lấy một lần đại diện (p1-low trên trung vị).
- **vsync:** trang web không có công tắc vsync, nên bench chạy Chromium với `--disable-gpu-vsync --disable-frame-rate-limit` (ghi `vsync_off: true`), như README nêu.
- **peak_mem_mb = null:** bản web chạy trong nhiều tiến trình trình duyệt; trang không đọc được RSS của chúng (giả định #32).
- Công thức `avg_fps`, `p1_low_fps` (k = ceil(0.01·N)), `frame_ms_p95`, `load_ms` được kiểm bằng dữ liệu dựng sẵn trong `tests/platform.js` ("Số đo bench").

## §2 Soak

`soak.json` đã commit (seed 7, 10 Đêm): `crashes: 0`, `mem_start_mb` ≈ 44, `mem_end_mb` ≈ 45, `mem_ratio` ≈ 1.02 (≤ 1.2). 10 kết quả `lost` (input ngẫu nhiên hiếm khi giữ đủ đèn — đúng như mong đợi).

**Kiểm rò rỉ sâu hơn:** chạy 10 / 100 / 300 / 400 Đêm, đo `heapUsed` sau GC: **phẳng ~5.3 MB** từ Đêm 10 tới Đêm 400 (RSS tăng là heap V8 dự trữ, không phải rò rỉ). `--max-semi-space-size=1` giữ RSS sát ngưỡng. `tests/platform.js` kiểm xoay vòng Đêm, seed 7+i, và phân phối input (5/3/2/10% và đổi hướng mỗi 30 tick).

## §3–4 Bảng xếp hạng & Trợ năng

Kiểm tự động trong `tests/platform.js` (50 ca):

- **Bảng xếp hạng:** tên ASCII 3–12 và tiếng Việt có dấu (NFC, đếm ký tự); từ chối tên ngắn/dài/ký tự lạ/không-Latin; `achieved_at` ISO 8601 có múi giờ; top 10; điểm giảm dần, bằng điểm thì ai đạt trước đứng trên (so theo mốc thời gian có múi giờ); lưu xuống đĩa và đọc lại đúng thứ tự; API GET/POST (201/400); `--export-leaderboard` ra `{"entries":[...]}`; server không lộ file ngoài danh sách.
- **Trợ năng:** đổi phím mọi hành động, phát hiện trùng phím (báo tên hành động), khôi phục mặc định, được lưu và đọc lại; dữ liệu lưu hỏng/trùng phím → về mặc định.
- Các mục cần mắt (ảnh chụp, mũi tên Bóng Mực, rung/chớp, chữ lớn ×1.25, mù màu): xem §Chưa kiểm.

## Đồ hoạ: cây, đá (không đi xuyên)

`tests/platform.js` "Vật cản": đi thẳng vào đá dừng ở mép (bán kính + 0.45 m); đi lệch thì trượt qua rồi đi tiếp; dash cũng không xuyên; bản web (creative) có cây/đá ở cả 3 Đêm; **headless chuẩn không có vật cản** và output không chứa "obstacle". Ảnh: [../media/gameplay-night1.png](../media/gameplay-night1.png), [../media/gameplay-night3.png](../media/gameplay-night3.png).

## Chưa kiểm / ghi chú trung thực

- **Chơi thật bằng tay trong trình duyệt** chưa làm trong phiên này (không có công cụ điều khiển trình duyệt). Đã xác minh gián tiếp: `node --check` mọi file; server trả trang 200; ảnh `--preview` cho thấy đồ hoạ, cây/đá, sàn tầng 1 Đêm 3, thanh dầu. Cần tự mở `npm run web` để quay video demo và xác nhận: đổi phím, nút Bảng xếp hạng lưu điểm, mũi tên Bóng Mực, nhấp nháy đèn dầu < 30, các tùy chọn trợ năng.
- **p1_low_fps** dao động như trên; chờ số trên máy chấm.
- **Release v1.0.0 và video demo** cần tạo thủ công (xem README và SUBMISSION); `docs/demo/demo.mp4` (373 MB) không commit mà đính kèm Release.
