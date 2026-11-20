# Bằng chứng Phase 3 — Ticket-03 "Đèn cạn dầu" (Test Contract v1.2)

- Quyết định thiết kế (ADR): [../notes/adr-001-den-can-dau.md](../notes/adr-001-den-can-dau.md)
- Thay đổi phá vỡ tương thích: [../../CHANGELOG.md](../../CHANGELOG.md) mục `[phase-3]`
- Giả định mới #19–#28: [../notes/assumptions.md](../notes/assumptions.md)
- Môi trường: Node v24.22.1, Windows 11.

## Lệnh đã chạy và kết quả

```bash
npm test                      # -> phase-3/test-output.txt
```

| Cổng | Kết quả |
|---|---|
| `tests/run.js`: cơ chế, gồm số chuẩn, từng luật mới và các tính năng Phase 1–2 còn hiệu lực | **77 đạt, 0 trượt** |
| `tests/contract-check.js`: schema JSONL v1.2 trên 5 seed × 3 Đêm × 3 nhịp snapshot, 4 ca kịch bản (pause, vòng đời dầu, thắp lại + châm dầu, trọn Đêm tới bình minh) và đối chiếu `game.contract.json` | **50 lần chạy, 0 lỗi** |
| `tests/invariants.js`: fuzz input × 10 seed × 3 Đêm × 2 biến thể (thường / đèn-dầu), kiểm bất biến và tất định | **60 lần chạy, 0 lỗi**. Độ phủ nhánh dầu: refuel 15, lantern_out 21, fuel_drain 46, relight 15 |

Kiểm tra chéo bộ kiểm contract: tôi cố ý làm hỏng 7 kiểu đầu ra (đèn tắt có fuel, fuel 3 chữ số, carried > capacity, `refuel` thiếu `fuel`, `lantern_lit` thiếu `relight`, `reason: all_lit`, trạng thái Bóng lạ) và **cả 7 đều bị bắt**.

Mỗi file JSONL trong `phase-3/` được tạo bằng chính CLI, ví dụ:

```bash
node bin/headless.js --seed 1 --night 1 --scenario tests/scenarios/p3-dawn-win.scenario.json \
  --ticks 120 --out docs/proof/phase-3/p3-dawn-win.jsonl --snapshot-every 60
```

## Yêu cầu → bằng chứng

| Ticket-03 | Yêu cầu | Bằng chứng (`phase-3/…jsonl`, test) | Đạt |
|---|---|---|---|
| §1 | Thắp: fuel = 100; thắp lần đầu 10, thắp lại (`ever_lit`) 5 | `p3-no-early-win`: `deposit 10` → `lantern_lit relight:false`. `p3-relight`: `deposit 5` → `lantern_lit relight:true`, `relit_count 1`, điểm 65 | ✅ |
| §1 | Hao 1/s, tính bằng đơn vị nguyên 1/60 | `p3-no-early-win`: 59 tick sau khi thắp còn `fuel 99`. Bất biến: mỗi tick giảm tối đa (1 + 5·drain)/60 | ✅ |
| §1 | Châm dầu `used = min(mang, ceil((100−fuel)/10))`; đèn đầy không được chọn | `p3-refuel`: fuel 45.5 → `refuel amount 6, fuel 100`, còn mang 14, +30 điểm | ✅ |
| §1 | Hết dầu → tắt, `deposited 0`, `lantern_out`, nhớ `ever_lit` | `p3-lantern-out`: fuel 0.5 → `lantern_out` đúng tick 30, `ever_lit true` | ✅ |
| §1 | Thanh dầu; nhấp nháy 1 Hz khi fuel < 30 | `src/render/main.js` (`sync`: thanh dầu quay theo camera, 30 tick sáng / 30 tick mờ theo `sim_tick`) | ⚠️ Chưa xem bằng trình duyệt (xem "Chưa kiểm") |
| §2 | fuel < 30 mất vùng an toàn; đúng 30 vẫn còn | test "Vùng an toàn theo dầu": fuel 29.5 không đẩy, fuel 30.1 đẩy ra mép 6 m | ✅ |
| §2 | Chỉ Bóng `wander` nhắm đèn yếu gần nhất; ≤ 2 m → `drain`, đứng yên, hút 5/s, cộng dồn, đèn vẫn tự hao | `p3-drain`: `drain`, vị trí không đổi, `fuel_drain` ở tick 61 và 121 (fuel 14 → 8). `p3-drain-stack`: 2 con → 20 − 11 = 9 | ✅ |
| §2 | `drain` → `chase` (Mây ≤ 6 m), `stunned` (Tỏa Sáng), `wander` (đèn tắt / fuel ≥ 30 / > 2 m) | `p3-drain-chase`, `p3-drain-pulse`, `p3-drain-refuel`, ca `fuel-cycle` trong contract-check | ✅ |
| §2 | Châm lên ≥ 30 khi có Bóng trong 6 m → đẩy ra mép, không gây sát thương | `p3-drain-refuel`: Bóng từ 1.5 m bị đẩy ra 6 m (z = 31), 30 tick không có `player_hit` | ✅ |
| §3 | Thời lượng 240/270/300 s | test "Số chuẩn"; `full-night1-seed42`: `game_over` ở tick 14400 | ✅ |
| §3 | Thắng: sống + đèn sáng ≥ ceil(0.6 × tổng); không thắng sớm | `p3-dawn-win`: `dawn_survived`, 547 điểm. `p3-dawn-lose`: `dawn`. `p3-no-early-win`: 5/5 sáng nhưng `state playing`. Test "cần 3/4/5 đèn" cho cả 3 Đêm | ✅ |
| §3 | Hết Ngọn Lửa thua ngay, xét trước kể cả ở tick bình minh | `p3-no-flames-dawn`: tick bình minh, đủ 3 đèn, bị chạm mất lửa cuối → `no_flames` | ✅ |
| §4 | Sức chứa 10 + 2 × successful_lights, tối đa 20; đèn đặt sẵn không tính | `p3-capacity`: 12 sau 1 lần thắp; test trần 20; scenario 2 đèn sáng sẵn → vẫn 10 | ✅ |
| §5 | Điểm mới (+5/đom đóm, +100/+40, +5/+15, thưởng bình minh, bỏ thưởng thời gian) | các tổng điểm 20, 65, 30, 150, 15, 547 trong test đều tính tay khớp | ✅ |
| §6 | Bảng màu dễ phân biệt (lưu), Bóng #00B3FF, cảnh báo trắng + ⚠, đèn tắt xẹp 20% + vết rách | `index.html` (`body.cb`, ô chọn), `main.js` (`setColorBlind` lưu `localStorage`, phím C, `paintShade`, `globe.scale 0.8`, `tear`) | ⚠️ Chưa xem bằng trình duyệt |
| §7 | Contract v1.2: `game.contract.json`, snapshot/scenario/event mới, `all_lit` bỏ | `contract-check.js` kiểm schema từng event mới và đối chiếu 11 khoá tuning; 50/50 đạt | ✅ |

## Test cũ bị luật mới làm sai: đã sửa hoặc xoá, kèm lý do

Không có test nào bị skip. Test sửa theo Ticket-03 được đánh dấu `[T03]` trong `tests/run.js`.

| Test cũ (tag `phase-2`) | Xử lý | Lý do |
|---|---|---|
| `Đêm 1 time_left = 300`, `Đêm 2 = 330`, `Đêm 3 = 360` | **Sửa** thành 240 / 270 / 300 | §3 đổi thời lượng |
| Nhóm "Nạp đèn & thắng": `game_over reason won`, `end.state won`, `điểm có thưởng thắng (>400)` | **Thay** bằng "Thắp lần đầu" (vẫn kiểm `deposit` 10 và `lantern_lit`, thêm **không** thắng sớm, điểm 150) và nhóm "Luật thắng mới" (`dawn_survived` / `dawn` / `no_flames`) | §3 bỏ "thắng ngay khi tất cả đèn sáng"; `reason won` không còn; §5 bỏ thưởng thời gian |
| Scenario `tests/scenarios/win-standard.*` | **Xoá**, thay bằng `p3-no-early-win.*` (cùng thiết lập, kỳ vọng ngược lại) | Kỳ vọng "thắng" không còn đúng luật |
| Hiệu năng "18000 tick Đêm 1" | **Sửa**: chạy Đêm 3 (18000 tick = Đêm dài nhất) | Đêm 1 giờ chỉ có 14400 tick; giữ nguyên tải đo |
| Bất biến `đèn sáng ⇒ deposited ≥ 10` | **Sửa** thành `≥ 5` | §1: thắp lại chỉ tốn 5 |
| Bất biến / contract `carried ≤ 10` | **Sửa** thành `carried ≤ player.capacity` (10..20, chẵn) | §4 sức chứa tăng dần |
| Contract: tập trạng thái Bóng, tập event | **Mở rộng**: thêm `drain`; `refuel`, `lantern_out`, `fuel_drain`; kiểm schema | §2, §7 |
| Test trong commit `3635b11` ("update phase 3") | **Viết lại** | Kỳ vọng quá lỏng (vd. chấp nhận cả `dawn` lẫn `dawn_survived`) và lõi lúc đó còn sai so với ticket (không nạp từng phần, thắp lại tốn 10, fuel số thực) |

Các test Phase 1–2 còn lại (dash, pulse, hit/recoil, rơi, Gió Lạc, Bùa Gió, pause, bục nhảy, gió Đêm 3, tất định, mã lỗi 2, làm tròn 3 số) **giữ nguyên kỳ vọng** và đạt. Riêng test pulse thêm kiểm +5 điểm.

## Chưa kiểm / ghi chú trung thực

- **Hiển thị web (§1 thanh dầu và nhấp nháy, §6 bảng màu):** code đã viết, `node --check` đạt, server trả trang đúng, nhưng **chưa được xem bằng trình duyệt** trong phiên làm việc này (không có công cụ trình duyệt). Cần mở `npm run web`, thắp một đèn, chờ dầu < 30 để xem nhấp nháy, rồi bấm `C`.
- Hệ quả của giả định #20 (Bóng `wander` đi về đèn tắt gần nhất): trong `full-night1-seed42` Mây đứng yên ở điểm xuất phát mà không bị chạm lần nào, vì Bóng tụ ở các đèn chưa thắp (cách 25 m, ngoài tầm phát hiện 12 m). Đêm vẫn thua `dawn` vì thiếu đèn.
- FPS ≥ 30 @ 1280×720 chưa đo, để Phase 4.
