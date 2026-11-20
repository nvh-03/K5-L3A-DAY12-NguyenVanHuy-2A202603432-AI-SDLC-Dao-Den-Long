# AGENTS.md — Harness AI

Hướng dẫn cố định cho AI. **Giữ nguyên trong repo và lịch sử git** (bằng chứng chấm điểm). Giữ ngắn.

## Bối cảnh

- **Game:** Đảo Đèn Lồng — game 3D. Mây gom đom đóm thắp 5 Đèn Lồng Lớn (Đêm 1), né Bóng Mực.
- **Kiến trúc:** lõi JS thuần **tất định** (`src/core/`) dùng chung cho web (Three.js, `src/render/`) và **headless** (Node, `bin/headless.js`) theo **Test Contract v1.0**.
- **Nguyên tắc vàng:** mọi logic gameplay nằm trong `src/core/`. Render không chứa luật chơi. Phần sáng tạo thêm phải **tắt khi headless** và không đổi output.

## Lệnh

| Việc | Lệnh |
|---|---|
| Chạy web | `npm run web` → http://localhost:8080 |
| Headless | `node bin/headless.js --seed <int> --night 1 --ticks <int> --out out.jsonl` |
| Test | `npm test` (26 kiểm tra) |

## Quy ước / điều cấm

- **Tất định tuyệt đối:** chỉ dùng RNG seeded (`src/core/rng.js`). Không `Math.random`, `Date.now`, thời gian thực trong `src/core/`.
- Toạ độ output làm tròn **3 chữ số**. `sim_tick = tick` ở Phase 1. Trạng thái Bóng Mực tối thiểu có `stunned`.
- Inputs headless là object `{ "frames": [...] }`; `score` nằm trong `tuning` của `game.contract.json`.
- Schema `data` của event theo đúng contract: `mote_picked{carried}`, `deposit{lantern_id,amount,deposited}`, `lantern_lit{lantern_id}`, `pulse{stunned_ids}`, `player_hit{by,flames,dropped}`, `shade_spawned{id}`, `game_over{result,reason}`.
- Chạy `npm test` trước khi tag. Không commit `.env`, API key, token. Không thêm dependency ngoài nếu không thật cần.
- Chỗ PRD mơ hồ: ghi `docs/notes/assumptions.md`, đừng bịa yêu cầu.
