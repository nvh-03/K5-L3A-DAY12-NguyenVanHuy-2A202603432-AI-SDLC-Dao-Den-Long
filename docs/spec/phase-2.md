# Spec Phase 2 (Ticket-02) — Acceptance Criteria

Tiêu chí nghiệm thu cho từng mục. Mỗi tiêu chí là một câu kiểm tra được ("làm A → thấy B"), ưu tiên kiểm bằng headless. Cột "Bằng chứng" trỏ tới [docs/proof/phase-2/](../proof/phase-2/) hoặc test trong `tests/run.js`.

## Phần 1 — Số liệu chuẩn

| Tiêu chí | Bằng chứng |
|---|---|
| `game.contract.json` v1.1, tuning khớp số chuẩn Phần 1 + có dash_*, night2/3_duration_s | [game.contract.json](../../game.contract.json) |
| Đêm 1/2/3 thời lượng 300/330/360 s; đèn 5/6/7 | test "Số chuẩn"; win.jsonl |
| Nạp đèn cost 10, nhớ tiến độ; chọn đèn gần nhất, bằng nhau id nhỏ hơn | test; win.jsonl |
| Thắng = tất cả đèn sáng (kể cả đúng tick hết giờ); thua no_flames / dawn | test "thắng"; sim `_checkWinLose` |
| Điểm: +10/nạp, +100/đèn, +5/pulse hit, +floor(giây)×2 +50×lửa khi thắng | test; win.jsonl |
| Thứ tự xử lý trong tick theo đúng Phần 1 | `sim.js` `step()` (comment đánh số 1–11) |

## Phần 2 — Bản đồ chuẩn

| Tiêu chí | Bằng chứng |
|---|---|
| Toạ độ đèn, điểm sinh đom đóm/Bóng Mực, bục nhảy đúng từng Đêm | [config.js](../../src/core/config.js) `buildNight` |
| Đêm 2: hai đảo + cầu tre; bục nhảy bắn sang đảo kia | test "Bục nhảy"; jump-pad.jsonl |
| Đêm 3: 3 tầng (Y 0/3/6), dốc 30°/150°, tháp chuông chặn tâm | [geometry.js](../../src/core/geometry.js) |
| Rơi khỏi mép đảo (Y<−10): −1 lửa, mất đom đóm, chờ 60 tick, hồi sinh | test "Rơi"; fall.jsonl |

## Phần 3 — Tính năng mới

### Lướt (Dash)
- Nhấn dash (false→true) khi hết hồi chiêu → tốc độ 14 m/s trong 0.2 s, hồi chiêu 1.5 s. **BC:** test "Lướt"; [dash.jsonl](../proof/phase-2/dash.jsonl).
- Lướt trên không giữ nguyên độ cao; không bất tử khi lướt. **BC:** `sim._movePlayer` (vel Y=0 khi dashTimer>0).

### Gió Lạc (Drifter) — Đêm 2 & 3
- idle → chase khi Mây mang ≥5 và cách ≤15 m; mất điều kiện → idle. **BC:** drifter-steal.jsonl.
- Chạm (XZ ≤1.2) cướp min(3, đang mang), chuyển flee 240 tick rồi biến mất; mỗi con cướp 1 lần. **BC:** test "Gió Lạc cướp"; drifter-steal.jsonl (`drifter_steal`).
- Pulse trúng lúc flee mang đồ → thả lại toàn bộ (đom đóm rơi), biến mất sau 120 tick. **BC:** test "thả đồ"; drifter-drop.jsonl (`drifter_drop`).
- Không làm mất lửa; vùng an toàn không chặn; bất tử không ngăn cướp. **BC:** `sim._drifterSteal`/`_pulse`.

### Bùa Gió (Charm)
- Nhặt như đom đóm; hiệu lực 600 tick, nhặt lại làm mới; tái xuất sau 2700 tick. **BC:** test "Bùa Gió"; charm.jsonl (`charm_picked`, `charm_s`).
- Khi có bùa: tốc độ chạy 7.2; Lướt không hồi chiêu. Vị trí đúng Đêm 2/3. **BC:** `sim` (charm_speed, dashCd bỏ qua khi charm).

### Chuỗi 3 Đêm
- Menu → giới thiệu Đêm (tên đảo, lời Ông Đăng) → chơi → kết quả → Đêm kế. Thắng Đêm 3 → Bình Minh với tổng điểm. Thua → chơi lại Đêm đó. **BC:** [src/render/main.js](../../src/render/main.js) (state máy `showIntro/endNight`); headless mỗi Đêm chạy `--night`.

### Tạm dừng (Esc/P)
- Logic dừng hoàn toàn: tick tăng nhưng sim_tick/thời gian/hồi chiêu/spawn/TTL đứng yên; snapshot state "paused". Có Tiếp tục/Chơi lại/Cài đặt/Về menu. **BC:** test "Tạm dừng"; pause.jsonl.

### Cài đặt & Âm thanh
- Âm lượng + độ nhạy chuột, lưu giữa các lần mở (localStorage). **BC:** `src/render/main.js` (phần settings — bản web). *Ghi chú: headless không có âm thanh/UI.*
- Hiệu ứng cho nhặt/thắp/tỏa sáng/bị đánh/nhảy/lướt/thắng/thua/Bóng Mực xuất hiện/đếm ngược 10 s. **BC:** bản web.

### HUD
- Ngọn Lửa (trên trái), đồng hồ mm:ss đổi đỏ & nhấp nháy khi ≤30 s (trên giữa), đèn k/n + điểm (trên phải), thanh 10 ô đom đóm (dưới giữa), hồi chiêu Lướt/Tỏa (dưới phải). **BC:** [index.html](../../index.html) + `updateHUD`.

### Bảng màu & ánh sáng môi trường
- Dùng đúng bảng màu chuẩn (sai ≤10%/kênh) cho các thành phần liệt kê. **BC:** `main.js` hằng `C`; [CREDITS.md](../../CREDITS.md).
- Ánh sáng môi trường = 0.15 + 0.55 × (đèn sáng / tổng). **BC:** `main.js` `ambient.intensity`.

## Phần 4 — Test Contract v1.1

| Tiêu chí | Bằng chứng |
|---|---|
| `--night` nhận 1/2/3 | [bin/headless.js](../../bin/headless.js); test |
| Snapshot thêm night, wind, player.{vel,grounded,invuln,dash_cd_s,pulse_cd_s,charm_s}, mảng motes/drifters/charms | test "snapshot v1.1" |
| Sự kiện mới: dash, charm_picked, drifter_steal, drifter_drop, night_start, paused, resumed; player_hit (rơi) có `lost` | các file *.jsonl |
| Trạng thái Bóng Mực: spawning/wander/chase/recoil/stunned | sim; pulse.jsonl / shade-hit.jsonl |
| Một Đêm đầy đủ ≤ 30 s headless | đo thực: 21600 tick ~0.2 s (test "Hiệu năng") |
| Tất định | determinism-a/b.jsonl byte-identical; test "Tất định" |

## DoD

- [x] Bằng chứng game chạy đúng ([docs/proof/phase-2/](../proof/phase-2/)).
- [x] Regression: cơ chế lõi chạy với số chuẩn (47 test, gồm nạp đèn/pulse/hit/rơi). *Lưu ý tag phase-1: xem [retro](../notes/retro.md).*
- [x] Spec có acceptance criteria cho từng mục Phần 3 (file này).
- [x] AGENTS.md cập nhật cho phạm vi mới.
- [x] ≥1 scenario headless cho mỗi tính năng mới ([tests/scenarios/](../../tests/scenarios/)).
- [ ] Bản web ≥30 FPS @1280×720 — kiểm bằng demo/đo khi chạy (chưa đo tự động).
