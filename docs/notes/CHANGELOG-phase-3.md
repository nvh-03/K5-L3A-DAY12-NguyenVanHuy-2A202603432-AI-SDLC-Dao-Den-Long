# CHANGELOG — Phase 3 (Ticket-03: "Đèn cạn dầu")

## Phiên bản: phase-3

Ngày: 2026-11-20  
Co-Author: Claude Haiku 4.5

### Breaking Changes (Thay đổi không tương thích)

#### Thời gian chơi
- **Night 1 duration:** 300s → **240s** (-60s)
- **Night 2 duration:** 330s → **270s** (-60s)
- **Night 3 duration:** 360s → **300s** (-60s)

#### Luật đèn — Hệ thống nhiên liệu (Fuel System)
- **Lantern data structure:**
  - Thêm: `fuel` (0–100, số thực)
  - Thêm: `ever_lit` (boolean)
  - Thêm: `relit_count` (integer)
  - Xóa: `deposited` field không còn ý nghĩa (thay bằng fuel)
  
- **Thắp lần đầu (unlit):**
  - Cần 10 đom đóm → fuel = 100 (thay vì cứng deposited ≥ 10)
  
- **Thắp lại (relight):**
  - Mới trong Phase 3: đèn từng sáng (ever_lit) chỉ cần 5 đom đóm (thay vì 10)
  - Trigger: tương tác ở đèn sáng nhưng fuel < 100
  
- **Hao dầu (decay):**
  - Mới: đèn sáng tự động hao 1.0/giây (1/60 mỗi tick) dù không có Bóng Mực
  
- **Châm dầu (refuel):**
  - Mới: tương tác ở đèn sáng + fuel < 100 → nạp 10 fuel/đom (tối đa 100)
  - Event mới: `refuel {lantern_id, amount, fuel}`
  
- **Hết dầu (fuel ≤ 0):**
  - Mới: đèn tắt ngay, deposited = 0, nhớ ever_lit = true
  - Event mới: `lantern_out {lantern_id}`

#### Luật Bóng Mực
- **State mới: drain**
  - Trigger: Bóng wander phát hiện đèn sáng có fuel < 30
  - Hành động: di chuyển đến ≤ 2m, chuyển drain (đứng yên + hút dầu)
  - Drain rate: 5 fuel/giây (5/60 mỗi tick)
  - Nếu nhiều Bóng drain cùng đèn → stack drain
  - Event mới (mỗi 60 tick khi draining): `fuel_drain {lantern_id, shade_id, fuel}`
  
- **Thoát drain:**
  - Sang chase: Mây trong 6m (prioritize player)
  - Sang wander: fuel ≥ 30, cách > 2m, hoặc đèn tắt
  - Sang stunned: trúng Tỏa Sáng (thêm +15 điểm bonus)
  
- **Vùng an toàn (safe zone):**
  - **Trước:** đèn sáng → safe_radius = 6m (vĩnh viễn)
  - **Sau:** đèn sáng + fuel ≥ 30 → safe_radius = 6m; fuel < 30 → NO safe zone

#### Luật thắng/thua
- **Thắng (win):**
  - **Trước:** tất cả đèn sáng → thắng ngay (kết thúc ngay)
  - **Sau:** 
    - Mây sống + hết giờ + #lit ≥ ceil(0.6 × #lanterns)
    - Đêm 1: ≥3/5; Đêm 2: ≥4/6; Đêm 3: ≥5/7
    - Không win sớm (thắp đủ không kết thúc)
    - Reason: `dawn_survived` (thay vì `won`)
  
- **Thua (loss):**
  - Hết lửa (flames ≤ 0) → thua ngay (kiểm tra ưu tiên)
    - Reason: `no_flames`
  - Hết giờ + #lit < threshold → thua
    - Reason: `dawn`
  
- **Điểm thắng (dawn bonus):**
  - Mỗi đèn sáng: +50 + floor(fuel) × 1
  - Mỗi ngọn lửa: +50
  - (Trước không có dawn bonus)

#### Sức chứa tăng dần
- **Trước:** capacity = 10 (cứng)
- **Sau:** capacity = min(10 + 2 × successful_lights, 20)
  - successful_lights = #thắp thành công trong đêm (không tính preset scenario)
  - Mỗi khi thắp lần đầu: successful_lights++, capacity cập nhật
  - Reset ở đầu mỗi đêm (chain 3 đêm, mỗi đêm reset)

#### Điểm số
- **Mỗi mote nạp** (thắp/thắp lại/châm dầu):
  - Trước: +10 (per_deposit)
  - Sau: **+5** (per_mote_deposited)
  
- **Thắp lần đầu:**
  - Giữ: **+100** (per_lantern_first_light)
  
- **Thắp lại:**
  - Trước: không có
  - Sau: **+40** (per_lantern_relight, mới)
  
- **Pulse hit shade:**
  - Giữ: **+5** (per_pulse_hit)
  
- **Pulse hit shade ở drain:**
  - Trước: không phân biệt
  - Sau: **+15** (per_pulse_hit_drain, thay vì +5)
  
- **Bình minh / đèn sáng:**
  - Trước: không có
  - Sau: **+50 + floor(fuel)** mỗi đèn (per_lantern_at_dawn + per_fuel_at_dawn)
  
- **Bình minh / lửa:**
  - Trước: +50 × flames left (per_second_left bị xóa)
  - Sau: **+50** mỗi lửa (per_flame_at_dawn)
  
- **Thưởng thời gian (time bonus):**
  - Trước: +2 × floor(timeLeft) (per_second_left)
  - Sau: **XÓA**

#### Test Contract
- **Version:** v1.1 → **v1.2**
- **Tuning mới:**
  - `fuel_max: 100`
  - `fuel_decay_per_s: 1.0`
  - `fuel_per_mote: 10`
  - `relight_cost: 5`
  - `low_fuel_threshold: 30`
  - `drain_per_s: 5.0`
  - `win_ratio: 0.6`
  - `capacity_max: 20`
  - `night1_duration_s: 240`
  - `night2_duration_s: 270`
  - `night3_duration_s: 300`

- **Snapshot mới:**
  - Mỗi lantern: `fuel` (1 chữ số), `ever_lit`, `relit_count`
  - Player: `capacity`
  - Shade: state có thêm `drain`

- **Event mới:**
  - `refuel {lantern_id, amount, fuel}`
  - `lantern_out {lantern_id}`
  - `fuel_drain {lantern_id, shade_id, fuel}` (mỗi 60 tick)
  - `lantern_lit` thêm field `relight: true|false`

- **Event xóa:**
  - `all_lit` (thay bằng dawn_survived)

- **game_over.reason mới:**
  - `dawn_survived` (thắng)
  - Giữ: `dawn`, `no_flames`

#### Scenario format
- Lanterns: thêm `fuel`, `ever_lit`, `relit_count`; nếu `lit: true` → mặc định `fuel: 100`
- Player: thêm `successful_lights`
- Shades: thêm `target_lantern_id`

### Non-breaking (Giữ nguyên từ Phase 2)

- Lõi mô phỏng (deterministic PRNG, tick model)
- Di chuyển Mây, nhảy, lướt, Tỏa Sáng
- Gió Lạc (Drifter)
- Bùa Gió (Charm)
- Gió mạnh (Wind)
- Bục nhảy (Jump pad)
- Rơi khỏi đảo
- Terrain (Night 1–3 surfaces)
- 3 đêm chain

### Các test cũ bị ảnh hưởng

| Test (Phase 2) | Status Phase 3 | Lý do |
|---|---|---|
| Nạp đèn & thắng | ❌ THAY THẾ | Win condition thay đổi (60% ratio, không all_lit) |
| Lướt | ✅ Giữ | Không ảnh hưởng |
| Tỏa Sáng | ❌ CẬP NHẬT | Event pulse khác (refuel → thêm mote), score drain+15 |
| Bóng Mực chạm | ✅ Giữ | Hit logic giữ, nhưng capacity ảnh hưởng drop |
| Rơi | ✅ Giữ | Fall logic không đổi |
| Gió Lạc | ✅ Giữ | Drifter logic không đổi |
| Thắng sớm | ❌ XÓA | Không có win sớm nữa (Phase 3 policy) |
| Tạm dừng | ✅ Giữ | Pause logic không đổi |
| Bục nhảy | ✅ Giữ | Pad logic không đổi |
| Gió mạnh | ✅ Giữ | Wind logic không đổi |

### Hướng dẫn di chuyển từ Phase 2 → Phase 3

1. **Scenario cũ:**
   - Thêm `fuel` cho mỗi lantern (mặc định 100 nếu lit)
   - Thêm `ever_lit` (true nếu lit, false nếu unlit)
   - Thêm `successful_lights` vào player

2. **Test cũ:**
   - Cập nhật expected win reason (all_lit → dawn_survived, kèm 60% check)
   - Cập nhật expected score (old formula → new formula)
   - Cập nhật expected events (refuel, lantern_out mới)

3. **Render (render/main.js, index.html):**
   - HUD fuel bar cho lantern
   - HUD capacity (carried / capacity)
   - Vẻ ngoài: đèn yếu (fuel < 30) nhấp nháy 1 Hz

### Commits trong phase-3

- `src/core/config.js`: TUNING v1.2 (fuel, drain, night duration), SCORE mới
- `src/core/sim.js`: Fuel system, drain state, _interact refuel, _moveShades drain logic, _pulse drain bonus, _checkWinLose v1.2, snapshot v1.2, capacity pickup
- `game.contract.json`: v1.2
- `docs/notes/adr-phase-3-fuel-system.md`: ADR (mới)
- `docs/notes/CHANGELOG-phase-3.md`: Changelog này (mới)
- `tests/`: Thêm/cập nhật test cho Phase 3 features

### Quy trình testing

```bash
npm test                    # run all 3 test suites
npm run test:unit           # Phase 3 unit tests (fuel decay, drain, win ratio, etc.)
npm run test:contract       # Contract v1.2 compliance (snapshot shape, events)
npm run test:invariants     # Invariants (fuel [0,100], drain state, etc.)
```

### Tối ưu hóa & đo lường

- Fuel decay precision: floating point, làm tròn 1 chữ số (0.0–100.0) khi export
- Drain event ghi 1 lần/60 tick (1 lần/giây) → ~20 event/đêm/đèn (compact)
- Capacity capped 20 → no overflow risk
- Scenario parsing: validate fuel [0,100], ever_lit bool

---

**Migration guide:** Xem docs/notes/adr-phase-3-fuel-system.md § "Các giả định và hạn chế"
