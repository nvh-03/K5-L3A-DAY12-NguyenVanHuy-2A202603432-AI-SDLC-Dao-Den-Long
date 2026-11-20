# AGENTS.md — Harness AI

Hướng dẫn cố định cho AI. **Giữ nguyên trong repo và lịch sử git** (bằng chứng chấm điểm). Giữ ngắn.

## Bối cảnh

- **Game:** Đảo Đèn Lồng — game 3D, **3 Đêm** (Đảo Bến / Đảo Cau / Đảo Chuông). Mây gom đom đóm thắp và **giữ dầu** cho đèn tới bình minh, né Bóng Mực (hút dầu) & Gió Lạc.
- **Kiến trúc:** lõi JS thuần **tất định** (`src/core/`) dùng chung cho web (Three.js, `src/render/`) và **headless** (Node, `bin/headless.js`) theo **Test Contract v1.3**.
- **Nguyên tắc vàng:** mọi logic gameplay nằm trong `src/core/`. Render & âm thanh không chứa luật chơi. Phần sáng tạo thêm (vd. cây/đá: `new Simulation({ creative: true })`) phải **tắt khi headless/bench/soak** và không đổi output. Sau khi sửa lõi: so lại `docs/proof/phase-3/full-night1-seed42.jsonl` (bỏ qua CRLF).
- **Render phải khớp `geometry.js`** (từng có lỗi vẽ sàn Đêm 3 ngược nửa). Không thêm event vào lõi chỉ để phục vụ UI.

## Lệnh

| Việc | Lệnh |
|---|---|
| Chạy web | `npm run web` → http://localhost:8080 |
| Headless | `node bin/headless.js --seed <int> --night <1\|2\|3> --ticks <int> --out out.jsonl` |
| Test | `npm test` (4 cổng: cơ chế + tuân thủ Contract + fuzz/bất biến + nền tảng Phase 4) |
| Test lẻ | `npm run test:unit` · `test:contract` · `test:invariants` · `test:platform` |
| Bench / Soak | `npm run bench` (mở Chrome/Edge ~35 s) · `npm run soak` |
| Ảnh README | `node bin/bench.js --preview docs/media/x.png --night <n>` (xem ảnh để tự kiểm đồ hoạ) |

## Quy ước / điều cấm

- **Tất định tuyệt đối:** chỉ dùng RNG seeded (`src/core/rng.js`). Không `Math.random`, `Date.now`, thời gian thực trong `src/core/`.
- **Số chuẩn là bất biến:** mọi hằng số theo `TUNING` trong `src/core/config.js` = Phần 1 Ticket-02, đã cập nhật theo Ticket-03 (dầu, thời lượng 240/270/300, `win_ratio`, sức chứa). Không tự đổi.
- **Thứ tự xử lý trong tick** theo đúng Phần 1 (đánh số 1–11 trong `sim.step`); Ticket-03 thêm việc trừ dầu ở bước 2 và tắt đèn ở bước 2a. Pause xử lý trước; khi pause chỉ `tick` tăng, `sim_tick` đứng yên.
- **Dầu đèn lưu bằng số nguyên đơn vị 1/60** (`fuelU`), không cộng dồn số thực; chỉ làm tròn 1 chữ số khi xuất.
- Toạ độ output làm tròn **3 chữ số**. Trạng thái Bóng Mực đúng tên: spawning/wander/chase/recoil/stunned/drain.
- Luật cũ bị ticket thay: sửa hoặc xoá test **kèm lý do** (đánh dấu `[T03]` trong test + bảng ở `docs/proof/phase-N.md`); không skip âm thầm.
- Chạy `npm test` trước khi tag. Thêm ≥1 scenario cho mỗi tính năng mới (`tests/scenarios/`).
- Không commit `.env`, API key, token. Không thêm dependency ngoài nếu không thật cần.
- Chỗ ticket mơ hồ: ghi `docs/notes/assumptions.md`, đừng bịa yêu cầu.

## Tài liệu

Spec + acceptance criteria: `docs/spec/phase-2.md`. Quyết định thiết kế: `docs/notes/adr-*.md`. Breaking changes: `CHANGELOG.md`. Bằng chứng: `docs/proof/`. Contract: `game.contract.json` + README mục headless.
