# ADR-001: Hệ thống nhiên liệu đèn và Bóng Mực hút dầu (Phase 3 — Ticket-03)

**Status:** Accepted (Phase 3)  
**Date:** 2026-11-20  
**Authors:** Claude Haiku 4.5 & Nguyễn Văn Huy

## Vấn đề

Playtest của Phase 2 cho thấy người chơi giỏi có thể thắp hết đèn trong 2 phút rồi trò chơi kết thúc ngay, thiếu căng thẳng ở giai đoạn cuối Đêm. Nhà thiết kế muốn:
- Mục tiêu từ "thắp hết đèn" → "giữ đảo sáng tới bình minh"
- Đèn có thể tắt khi hết dầu → thêm yếu tố kịch tính

## Quyết định

### 1. Mô hình trạng thái đèn — từ Boolean sang Fuel System

**Trước (Phase 2):**
```
Lantern: { id, pos, deposited, lit, litTick }
- lit = false → chưa thắp
- lit = true → đang sáng (vĩnh viễn trong đêm)
- deposited = số đom đóm nạp để thắp (<=10)
```

**Sau (Phase 3):**
```
Lantern: { id, pos, fuel, lit, ever_lit, relit_count, ... }
- fuel: 0–100 (đơn vị năng lượng)
- lit: boolean (đang sáng hay không)
- ever_lit: đèn từng sáng bao giờ? (ảnh hưởng relight cost)
- relit_count: đếm số lần thắp lại

Luật:
- Thắp lần đầu (unlit) → cần 10 đom đóm → fuel = 100
- Thắp lại (ever_lit) → cần 5 đom đóm → fuel = 100
- Hao dầu tự nhiên: 1.0/giây (1/60 mỗi tick)
- Châm dầu: tương tác ở đèn sáng → 1 đom = 10 fuel (tối đa 100)
- Hết dầu (fuel ≤ 0) → tắt ngay, deposited = 0
```

**Lý do chọn:**
- **Fuel là số thực (continuous)** thay vì integer vì cần precision cho decay: `fuel -= 1/60` mỗi tick để tránh sai số tích lũy
- **ever_lit tracking** cho phép relight cost thấp hơn, tạo risk/reward: đèn từng sáng easier to relight nhưng có thể sắp hết dầu
- **Deposit field xóa** (Phase 2) → không cần tracking "nạp bao nhiêu" vì nay chỉ cần tracking fuel

### 2. Bóng Mực hút dầu — trạng thái drain mới

**Trước (Phase 2):**
```
Shade states: wander, chase, stunned, recoil
- Luật: không bao giờ vào trong vùng an toàn (safe_radius = 6m)
```

**Sau (Phase 3):**
```
Shade states: wander, chase, stunned, recoil, DRAIN (mới)

drain state:
- Trigger: Bóng wander → phát hiện đèn sáng có fuel < 30 (yếu)
         → di chuyển tới đèn, khi cách ≤ 2m → chuyển DRAIN
- Hành động: đứng yên + hút 5 fuel/giây (5/60 mỗi tick) vào Bóng
- Thoát drain: 
  * Sang chase nếu Mây trong 6m (ưu tiên chase người chơi)
  * Sang wander nếu fuel >= 30, cách > 2m, hoặc đèn tắt
  * Sang stunned nếu trúng Tỏa Sáng (thêm +15 điểm vì đánh lúc drain)

Vùng an toàn:
- Chi phí: đèn có fuel >= 30 vẫn có vùng 6m
- Lợi ích: đèn yếu (fuel < 30) mất vùng → Bóng có thể xâm nhập để hút dầu
- Gameplay: "Bóng sẽ hủy hoại đèn nếu không châm thêm dầu → Mây phải cân bằng giữa thắp đèn mới vs. bảo vệ cái cũ"
```

**Lý do chọn:**
- **drain là state riêng (không phải sub-tick trong chase)** vì cần tracking `drainTicks` để ghi event 60/60 (1 lần/giây)
- **Hút dầu stack nếu nhiều Bóng** (vĩ độ cao hơn), cộng dồn dựa trên số lượng shades draining đèn
- **Luật thoát drain rõ ràng** tránh "bẫy vĩnh viễn": Bóng không stuck, Mây có cơ hội can thiệp bằng Tỏa Sáng

### 3. Luật thắng — từ "thắp hết" sang "bình minh tồn tại"

**Trước (Phase 2):**
```
win: thắp hết đèn → kết thúc ngay
loss: hết lửa → thua ngay
      hoặc hết giờ
```

**Sau (Phase 3):**
```
Night duration: 240s (N1), 270s (N2), 300s (N3) [tăng từ 300/330/360]
Thừa số: 60% → cần ceil(0.6 × tổng) đèn sáng

win: Mây sống + hết giờ + #lit ≥ ceil(0.6 × #lanterns)
     - Đêm 1: 3/5
     - Đêm 2: 4/6  
     - Đêm 3: 5/7
     - Thưởng: +50 mỗi đèn sáng + floor(fuel) mỗi đèn + 50 mỗi ngọn lửa còn lại

loss: hết lửa → thua ngay (ưu tiên trước)
      hoặc hết giờ + #lit < threshold
      
reason: 
- dawn_survived: thắng
- dawn: thua (không đủ đèn)
- no_flames: thua (hết lửa)
```

**Lý do chọn:**
- **Rút ngắn night (240/270/300)** vì nay Mây có thêm cơ chế relight (5 mote) → gameplay nhanh hơn, không buồn chán
- **60% threshold** đơn vị (không "hết") → luôn có risk: "Bóng có thể yêu cầu Mây sửa chữa đèn"
- **Không win sớm** (thắp đủ không kết thúc) → buộc Mây phải quản lý tiền tệ từ đầu tới cuối đêm, tối ưu hóa
- **Thưởng bình minh chi tiết** (fuel + lửa) → khuyến khích Mây duy trì mọi thứ

### 4. Sức chứa tăng dần

```
capacity = 10 + 2 × successful_lights, tối đa 20
successful_lights = #thắp thành công trong đêm (không tính preset scenario)

Gameplay: càng thắp đèn, càng mang được nhiều đom đóm 
         → tạo reinforcement loop tích cực, nhưng cap ở 20 để không OP
```

### 5. Điểm mới

| Sự kiện | Điểm | Thay đổi |
|--------|------|---------|
| Mỗi mote nạp (thắp/thắp lại/châm) | +5 | `-10` trước (per_deposit) |
| Thắp lần đầu | +100 | Giữ |
| Thắp lại | +40 | Mới (không có trước) |
| Pulse hit shade | +5 | Giữ |
| Pulse hit drain | +15 | Mới (+10 bonus) |
| Bình minh/đèn sáng | +50 + floor(fuel) | Mới (không có trước) |
| Bình minh/lửa | +50 | Giữ (per_flame_left) |
| Thưởng thời gian | ✗ | Xóa (per_second_left) |

**Điều chỉnh logic scoreboard:**
- `per_deposit` giảm 10→5 vì nạp dầu "mở mắt" (dễ làm) không phải thắp từ đầu
- Thắp lại +40 (< +100 lần đầu) phù hợp "nó dễ hơn, nhưng vẫn có risk"
- Pulse hit drain +15 khuyến khích strategy "đánh Bóng lúc nó yếu nhất"

## Những thay đổi không tương thích (Breaking Changes)

1. **Night duration** thay đổi (300→240, 330→270, 360→300) → old save files không dùng được
2. **Win condition** thay đổi (all_lit → dawn_survived + ratio) → old tests fail
3. **Lantern data** mở rộng (fuel, ever_lit, relit_count) → old snapshots missing fields
4. **Score formula** thay đổi (per_deposit 10→5, new events) → old high scores incomparable
5. **Shade state** thêm drain → old shades.state không cover case này

## Các giả định và hạn chế

1. **Fuel decay precision**: Tính `fuel -= 1/60` mỗi tick (floating point) → làm tròn 3 chữ số khi export snapshot
2. **Drain event rate**: Ghi 1 lần/giây (60 tick) thay vì mỗi tick → compact output nhưng less granular
3. **Châm dầu ceasing**: Nếu đèn đầy (fuel ≥ 100), tương tác không có effect → không phát event
4. **Shade drain logic**: Chỉ wander shade mới scan tìm weak lantern; chase shade không "bỏ mục tiêu" để drain → prioritize player
5. **Relight cost**: Cứng 5 mote (không phụ thuộc vào fuel hiện tại) → giúp design đơn giản nhưng less flexible

## Lợi ích

- ✅ Gameplay kéo dài hơn (đêm ngắn hơn nhưng tương tác phức tạp)
- ✅ Stress/resource management: Mây phải cân bằng thắp mới vs. bảo vệ cũ
- ✅ Dynamic threat: Bóng hút dầu tạo tension ở cuối đêm
- ✅ Smooth progression: Sức chứa tăng khuyến khích thắp liên tiếp
- ✅ Clear win condition: Không ambiguous (hết giờ + ratio, không "bất kỳ" thắp)

## Rủi ro & giải pháp

| Rủi ro | Giải pháp |
|--------|----------|
| Maya mô phỏng overflow (floating point) | Clamp fuel [0, 100]; tính ngũn-ngũn |
| Drain Bóng "bẫy" Mây (không sửa được) | Thoát drain nếu fuel ≥ 30 (easy refuel) |
| Relight cost quá thấp (spam) | 5 mote × 2–3 lần ≈ 15 mote, dễ but reasonable |
| Win ratio 60% quá cao/thấp | Tuning: test playtest; giã code-level tuning_win_ratio |

## Tham khảo

- **Specification:** docs/spec/phase-2.md → phase-3.md
- **Test Contract:** v1.1 → v1.2 (game.contract.json)
- **Scenario format:** Mỗi lantern thêm `fuel`, `ever_lit`; player thêm `successful_lights`; shade thêm `target_lantern_id`
