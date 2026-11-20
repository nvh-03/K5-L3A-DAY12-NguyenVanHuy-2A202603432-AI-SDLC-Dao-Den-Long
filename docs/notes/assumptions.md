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

## Phase 3 — giả định bổ sung (Ticket-03)

| # | Chỗ mơ hồ | Giả định đã chọn | Lý do |
|---|---|---|---|
| 19 | Nạp đèn tắt sau Ticket-03 | Vẫn nạp **từng phần** như Ticket-02 (`min(đang mang, còn thiếu)`, event `deposit`); "còn thiếu" tính theo chi phí 10 (chưa từng sáng) hoặc 5 (`ever_lit`). Đủ thì sáng, fuel = 100. | Ticket-03 chỉ đổi chi phí thắp lại, không thay luật nạp nhiều lần. |
| 20 | "Đi về đèn tắt gần nhất như trước" | Spec trước không có luật này. Bóng `wander` không có đèn yếu thì đi về đèn **chưa sáng** gần nhất (XZ, hoà thì id nhỏ) với tốc độ trôi 1.5 m/s và dừng cách 1 m; không còn đèn tắt thì trôi theo hướng seeded như Phase 2. | Làm theo câu chữ ticket; giữ tốc độ wander cũ. |
| 21 | Tốc độ khi đi tới đèn yếu | Tốc độ Bóng chuẩn của Đêm (4.0, Đêm 3 là 4.5). | Ticket không nêu; nhắm mục tiêu có chủ đích nên dùng tốc độ chạy. |
| 22 | Thứ tự các điều kiện thoát `drain` | Xét theo thứ tự ticket liệt kê: Mây trong 6 m → `chase` trước; sau đó đèn tắt / fuel ≥ 30 / cách > 2 m → `wander`. Đèn tắt ở bước 2a thì Bóng về `wander` ngay trong tick đó. | Ticket liệt kê `chase` đầu tiên. |
| 23 | Mốc `fuel_drain` "mỗi 60 tick" | Mỗi Bóng có bộ đếm riêng, bắt đầu từ 0 khi vào `drain`; ghi khi đã hút đủ 60, 120, … tick. `fuel` = dầu còn lại của đèn sau khi trừ ở tick đó. | Event tả trạng thái đèn; tránh ghi ngay tick đầu. |
| 24 | Đẩy Bóng khi châm dầu lên ≥ 30 | Áp cho **mọi** Bóng trong 6 m (không chỉ con đang `drain`): đẩy ra mép ngay ở bước 6 (≤ 30 tick) và miễn sát thương 30 tick; giống luật vừa thắp. | Câu ticket nói "các con đó" = các Bóng trong vùng 6 m. |
| 25 | Fuel 1 chữ số thập phân khi đèn sắp tắt | Lưu dầu bằng số nguyên đơn vị 1/60; xuất `round(fuel, 1)`. Hai tick cuối trước khi tắt có thể xuất `lit: true, fuel: 0` (dầu < 0.05). Đèn tắt luôn `fuel: 0`. | Làm tròn trung thực, không bịa số. |
| 26 | Scenario đèn `lit: true` | Ngầm `ever_lit = true`; không có `fuel` thì 100; không có `deposited` thì 10. Đèn đặt sẵn không tính vào `successful_lights`. | Đèn đang sáng chắc chắn đã từng sáng. |
| 27 | Ngưỡng thắng `ceil(0.6 × tổng)` | `ceil(win_ratio × tổng − 1e-9)` → 3/5, 4/6, 5/7 (đã kiểm bằng test cho cả 3 Đêm). | Phòng hờ: nếu đổi `win_ratio`, sai số số thực (vd. 0.6 × 6 = 3.5999…) có thể làm `ceil` nhảy thêm 1 ở giá trị biên. |
| 28 | Điểm game nhiều Đêm | Không đổi so với Ticket-02: tổng điểm các Đêm đã thắng. Thua thì chơi lại Đêm đó. | Ticket ghi "không đổi". |

## Phase 4 — giả định bổ sung (Ticket-04)

| # | Chỗ mơ hồ | Giả định đã chọn | Lý do |
|---|---|---|---|
| 29 | "Bóng Mực vẫn di chuyển theo luật wander bình thường" trong bench | Dùng đúng hàm `_wanderStep` của lõi (về đèn tắt gần nhất / trôi) cùng chặn vùng an toàn; không chuyển `chase` dù Mây trong 12 m; không bao giờ `drain` vì dầu không hao. | Ticket yêu cầu wander và cảnh giống nhau giữa các lần đo. |
| 30 | "Rải đều trên đảo" | Rải đều theo diện tích (r = 39·√u, góc đều) bằng RNG seed 42 trên đảo Đêm 1 bán kính 40. | Đều theo diện tích, không dồn về tâm. |
| 31 | Cửa sổ 1280×720 và vsync với bản web | Cửa sổ Chrome/Edge `--window-size=1280,720` ở chế độ app; canvas cố định đúng 1280×720. Tắt vsync bằng `--disable-gpu-vsync --disable-frame-rate-limit` (trang web không tự tắt được). | Ticket cho phép ghi rõ trong README. |
| 32 | `peak_mem_mb` bản web | `null`: trang không đọc được RSS của các tiến trình trình duyệt; JS heap không phải RSS. | Ticket cho phép null kèm giải thích. |
| 33 | `load_ms` | Từ lúc `bin/bench.js` bắt đầu tới khi trang báo đã vẽ khung hình đầu tiên của cảnh bench (gồm cả khởi động trình duyệt). | Đúng định nghĩa "từ lúc tiến trình bắt đầu". |
| 34 | Soak "Đêm thứ i dùng seed 7 + i" | i đếm từ 0: Đêm đầu dùng seed 7 = `--seed`. | Để `--seed` là seed của Đêm đầu tiên. |
| 35 | Đo RSS soak | Gọi GC trước mỗi lần đo; chạy với `--max-semi-space-size=1`. Đã kiểm `heapUsed` sau GC phẳng ~5.3 MB qua 400 Đêm, tức không rò rỉ; phần RSS tăng là heap V8 dự trữ. | Số đo phản ánh rò rỉ thật thay vì rác chưa thu. |
| 36 | Tên bảng xếp hạng tiếng Việt (điểm cộng) | Chấp nhận chữ Latin có dấu (chuẩn hoá NFC), số, `_`; 3–12 **ký tự** (không phải byte). Chữ ngoài hệ Latin bị từ chối. | Bắt buộc ASCII vẫn đạt; mở rộng an toàn cho tiếng Việt. |
| 37 | Bảng xếp hạng "lưu trên đĩa cục bộ" | File `data/leaderboard.json` do `bin/serve.js` ghi (ghi tạm rồi đổi tên cho an toàn); thư mục `data/` không commit. | Còn nguyên sau khi tắt/mở game; không đẩy dữ liệu thử lên repo. |
| 38 | Cây/đá (sáng tạo) | Vật cản tròn chỉ chặn Mây (không chặn Bóng Mực/Gió Lạc); chặn khi Mây cùng tầng (chênh cao < 2 m), cú nhảy chỉ cao ~1.2 m nên không nhảy qua được; Mây đi trên sàn tầng 1 Đêm 3 (y = 3) thì không bị cây ở tầng 0 chặn. Chỉ bật ở bản chơi. | Ticket: phần sáng tạo không được đổi headless và phải tắt trong bench/soak. |

## Quy ước output chưa được contract chốt chính xác

Bản tóm tắt PRD nói "mỗi event có cấu trúc `data` riêng" nhưng không liệt kê từng trường. Đã chọn schema rõ ràng, nhất quán (xem [README](../../README.md) mục headless). Nếu bản contract chính thức khác, chỉ cần chỉnh khâu tạo `data` trong [`src/core/sim.js`](../../src/core/sim.js) và `headlessRun.js` — lõi mô phỏng không đổi.
