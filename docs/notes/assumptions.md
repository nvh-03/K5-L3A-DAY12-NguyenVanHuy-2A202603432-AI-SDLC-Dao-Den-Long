# Giả định (Assumptions) — Phase 1 (PRD-0)

PRD-0 cố tình mơ hồ. Dưới đây là các giả định đã chọn, kèm lý do. Con số ở [`game.contract.json`](../../game.contract.json).

| # | Chỗ mơ hồ | Giả định | Lý do |
|---|---|---|---|
| 1 | "Ánh sáng" pulse tiêu hao là gì | **Đom đóm đang mang (`carried`) = ánh sáng.** Pulse tốn `pulse_cost` đom đóm. | Player state chỉ có pos/flames/carried; đom đóm vừa thắp đèn vừa để pulse → tạo giằng co. |
| 2 | `flames` | **Máu của Mây** (ngọn lửa trên nón). Hết = thua. | "Mất hết máu thì thua" + "nón lá treo đèn lồng nhỏ". |
| 3 | `hit_drop_ratio` | Trúng đòn: −1 lửa + rơi `floor(carried×ratio)` đom đóm (mất luôn). | Rủi ro kép, logic đơn giản, tất định. |
| 4 | Nhặt đom đóm | **Tự nhặt** khi trong `pickup_radius`, `carried < capacity`. | "nhặt được" khi đi ngang; `interact` dành cho nạp đèn. |
| 5 | Nạp đèn | `interact` nạp vào **đèn chưa thắp gần nhất** trong `interact_radius`, lượng `min(carried, cost−deposited)`. | Khớp "nạp ánh sáng vào đèn". |
| 6 | Bóng Mực "sợ đèn" | Không vào vùng bán kính `safe_radius` quanh đèn **đã thắp**. | Hiện thực "Bóng Mực sợ đèn". |
| 7 | Hết giờ đêm | Tính thua (`game_over.reason="dawn"`). | PRD: thắng=thắp đủ, thua=hết máu; hết giờ chưa đủ ⇒ thất bại đêm. |
| 8 | `fall_enabled` | **false** — Đêm 1 không phạt rơi, không sự kiện `player_hit{by:"fall"}`. | PRD cho phép; đảo phẳng Y=0, giữ đơn giản. |
| 9 | Vị trí 5 đèn | Ngũ giác trên vòng bán kính 18 m (L1…L5). | Đêm 1 ổn định, dễ kiểm chứng; scenario vẫn ghi đè được. |
| 10 | Sinh đom đóm (random) | 40 đom đóm trong đĩa bán kính `island_radius×0.85` (seeded), không respawn. | Giữ đơn giản & tất định. |
| 11 | Sinh Bóng Mực (random) | Tối đa 4, con đầu sau 4 s, mỗi 12 s một con, ở rìa đảo (seeded). | Đủ áp lực, tất định theo seed. |

Tham số thế giới ngoài contract: `island_radius=30`, `lantern_ring_radius=18`, `motes_initial=40`, `shade_max=4`, `jump_speed=7`, `gravity=24`. Khai trong [`src/core/config.js`](../../src/core/config.js) (`WORLD`).
