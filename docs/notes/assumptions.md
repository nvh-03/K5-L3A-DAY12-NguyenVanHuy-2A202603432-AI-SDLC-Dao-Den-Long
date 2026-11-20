# Giả định (Assumptions)

PRD-0 cố tình mơ hồ ở nhiều chỗ. Dưới đây là các giả định đã chọn cho Phase 1, kèm lý do. Con số cụ thể nằm trong [`game.contract.json`](../../game.contract.json).

## Phase 1 — mô hình game

| # | Chỗ mơ hồ | Giả định đã chọn | Lý do |
|---|---|---|---|
| 1 | "Ánh sáng" mà pulse tiêu hao là gì | **Đom đóm đang mang (`carried`) chính là ánh sáng.** Pulse tốn `pulse_cost` đom đóm. | Player state trong contract chỉ có `pos, flames, carried`; đom đóm = ánh sáng để thắp đèn, nên dùng chung làm tài nguyên tạo thế giằng co (thắp đèn ↔ xua địch). |
| 2 | `flames` là gì | **`flames` = máu của Mây** (số ngọn lửa trên nón). Hết lửa = thua. | "Thua: mất hết máu" + "Mây đội nón lá có treo đèn lồng nhỏ". Là trường duy nhất hợp vai máu. |
| 3 | `hit_drop_ratio` | Khi trúng đòn: **mất 1 lửa** và **rơi `floor(carried × ratio)` đom đóm** (mất luôn, không respawn). | Tạo rủi ro kép khi bị chạm; giữ logic đơn giản, tất định. |
| 4 | Nhặt đom đóm | **Tự nhặt** khi trong `pickup_radius` và `carried < carry_capacity`. | "Đom đóm rải rác, nhặt được" — đi ngang là nhặt; `interact` dành cho nạp đèn. |
| 5 | Nạp đèn | `interact` (rising edge) nạp vào **một đèn gần nhất chưa thắp** trong `interact_radius`, lượng `min(carried, lantern_cost − deposited)`. Đủ `lantern_cost` thì sáng. | Khớp "nạp ánh sáng vào đèn để thắp". |
| 6 | Bóng Mực "sợ đèn" | Không đi vào vùng bán kính `safe_radius` quanh đèn **đã thắp**. | Hiện thực hoá "Bóng Mực sợ đèn / sương đen". |
| 7 | Hết giờ đêm | **Tính thua** (`game_over.reason = "timeout"`, `state = "lost"`). | PRD nêu thắng = thắp đủ, thua = hết máu; hết giờ chưa thắp ⇒ coi như thất bại đêm đó. |
| 8 | Sinh đom đóm khi `random_motes=true` | Sinh **40** đom đóm lúc khởi tạo trong đĩa bán kính `island_radius × 0.85` (seeded), không respawn. | Phase 1 giữ đơn giản & tất định. |
| 9 | Sinh Bóng Mực khi `random_shades=true` | Sinh dần tối đa **4** con, con đầu sau **4s**, mỗi **12s** một con, ở rìa đảo (seeded). | Đủ áp lực mà vẫn tất định theo seed. |
| 10 | Vị trí 5 đèn | Cố định thành ngũ giác trên vòng bán kính **18 m** (L1…L5). | Đêm 1 ổn định, dễ kiểm chứng; scenario vẫn ghi đè được. |
| 11 | Nhảy | Có cú nhảy nhỏ (trọng lực), `fall_enabled=false` nên không rơi khỏi đảo. | Đảo phẳng Y=0; nhảy chủ yếu để cảm giác. |

## Tham số ngoài contract (lab tự chọn)

`island_radius = 30`, `lantern_ring_radius = 18`, `motes_initial = 40`, `shade_max = 4`,
`shade_spawn_interval_s = 12`, `shade_first_spawn_s = 4`, `jump_speed = 7`, `gravity = 24`.
Khai trong [`src/core/config.js`](../../src/core/config.js) (`WORLD`) và giải thích tại đây theo yêu cầu contract.

## Phase 2 — giả định bổ sung (Ticket-02)

| # | Chỗ mơ hồ | Giả định đã chọn | Lý do |
|---|---|---|---|
| 12 | 20 đom đóm đầu "tại 20 điểm khác nhau" — điểm nào trong tập ứng viên | Điểm là **slot cố định** theo thứ tự: vòng trong trước, vòng ngoài sau (theo từng đảo/tầng). Khởi tạo lấp 20 slot đầu; respawn (mỗi 240 tick) lấp slot trống đầu tiên. | Cần thứ tự tất định; "điểm trống" ngụ ý slot cố định. |
| 13 | Lịch sinh Bóng Mực Đêm 2/3 (chỉ nói "mỗi X s") | Đêm 2: lần đầu tick 420 rồi mỗi 420 tick, 1 con/lần, trần 8. Đêm 3: lần đầu tick 360 rồi mỗi 360 tick, 1 con/lần, trần 10. (Đêm 1 theo ticket: 2 con ở tick 300 rồi mỗi 480.) | Ticket chỉ chốt rõ Đêm 1; test chấm hành vi bóng thường dùng scenario tường minh. |
| 14 | `player_hit` do rơi có trường `lost` | `lost` = số đom đóm mất do rơi (rơi mất toàn bộ đang mang). | Khớp "mất toàn bộ đom đóm". |
| 15 | Điểm sinh Gió Lạc "điểm sương ngẫu nhiên" | Vị trí seeded trên vòng bán kính 0.6×bán kính đảo. Sinh tick 1200, 2400 (trần 2). | Ticket chỉ nói ngẫu nhiên; dùng RNG seeded để tất định. |
| 16 | Địa hình nhiều tầng Đêm 3 | Mô hình **mặt-đỡ**: tại mỗi (x,z) liệt kê các mặt đi được (tầng 0/1/2, dốc); đáp xuống mặt cao nhất ≤ y+0.3; không leo vách (chỉ lên bằng dốc/bục nhảy); bước khỏi mép → rơi xuống tầng dưới; tâm r<2 (tháp) không đứng được ở tầng 2. | Hiện thực "vách đứng, bước ra thì rơi" mà vẫn tất định; là xấp xỉ hợp lý. |
| 17 | Spawn Đêm 3 | Điểm xuất phát Mây = (0,0,0) tầng 0 (dưới chân tháp vẫn đứng được). | Ticket không nêu riêng; (0,0,0) tầng 0 là chỗ hợp lệ. |
| 18 | `vel`/`grounded`/`invuln` trong snapshot | `vel`=[vx,vy,vz] m/s; `grounded` bool; `invuln` = số tick còn lại; `dash_cd_s/pulse_cd_s/charm_s` = giây. | Tên `_s` ngụ ý giây; `invuln` không có `_s` nên để theo tick. |

## Quy ước output chưa được contract chốt chính xác

Bản tóm tắt PRD nói "mỗi event có cấu trúc `data` riêng" nhưng không liệt kê từng trường. Đã chọn schema rõ ràng, nhất quán (xem [README](../../README.md) mục headless). Nếu bản contract chính thức khác, chỉ cần chỉnh khâu tạo `data` trong [`src/core/sim.js`](../../src/core/sim.js) và `headlessRun.js` — lõi mô phỏng không đổi.
