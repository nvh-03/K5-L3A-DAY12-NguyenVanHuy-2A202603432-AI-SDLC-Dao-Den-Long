# AGENTS.md — Harness AI

Hướng dẫn cố định cho AI. **Giữ nguyên trong repo và lịch sử git** (bằng chứng chấm điểm). Giữ ngắn.

## Bối cảnh

- **Game:** Đảo Đèn Lồng — game 3D, **3 Đêm** (Đảo Bến / Đảo Cau / Đảo Chuông). Mây gom đom đóm thắp đèn, né Bóng Mực & Gió Lạc.
- **Kiến trúc:** lõi JS thuần **tất định** (`src/core/`) dùng chung cho web (Three.js, `src/render/`) và **headless** (Node, `bin/headless.js`) theo **Test Contract v1.1**.
- **Nguyên tắc vàng:** mọi logic gameplay nằm trong `src/core/`. Render & âm thanh không chứa luật chơi. Phần sáng tạo thêm phải **tắt khi headless** và không đổi output.

## Lệnh

| Việc | Lệnh |
|---|---|
| Chạy web | `npm run web` → http://localhost:8080 |
| Headless | `node bin/headless.js --seed <int> --night <1\|2\|3> --ticks <int> --out out.jsonl` |
| Test | `npm test` (3 cổng: đơn vị/cơ chế + tuân thủ Contract + fuzz/bất biến) |
| Test lẻ | `npm run test:unit` · `test:contract` · `test:invariants` |

## Quy ước / điều cấm

- **Tất định tuyệt đối:** chỉ dùng RNG seeded (`src/core/rng.js`). Không `Math.random`, `Date.now`, thời gian thực trong `src/core/`.
- **Số chuẩn là bất biến:** mọi hằng số theo `TUNING` trong `src/core/config.js` = Phần 1 Ticket-02. Không tự đổi.
- **Thứ tự xử lý trong tick** theo đúng Phần 1 (đánh số 1–11 trong `sim.step`). Pause xử lý trước; khi pause chỉ `tick` tăng, `sim_tick` đứng yên.
- Toạ độ output làm tròn **3 chữ số**. Trạng thái Bóng Mực đúng tên: spawning/wander/chase/recoil/stunned.
- Chạy `npm test` trước khi tag. Thêm ≥1 scenario cho mỗi tính năng mới (`tests/scenarios/`).
- Không commit `.env`, API key, token. Không thêm dependency ngoài nếu không thật cần.
- Chỗ ticket mơ hồ: ghi `docs/notes/assumptions.md`, đừng bịa yêu cầu.

## Tài liệu

Spec + acceptance criteria: `docs/spec/phase-2.md`. Bằng chứng: `docs/proof/`. Contract: `game.contract.json` + README mục headless.
