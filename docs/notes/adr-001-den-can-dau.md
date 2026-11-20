# ADR-001: Đèn có dầu, Bóng Mực hút dầu, thắng ở bình minh

- **Trạng thái:** Chấp nhận (Phase 3, Ticket-03 "Đèn cạn dầu", Test Contract v1.2)
- **Ngày:** 2026-11-20
- **Thay thế:** luật Ticket-02 "đèn đã sáng không nhận thêm đom đóm", "Bóng Mực không bao giờ vào vùng an toàn", "thắng ngay khi tất cả đèn sáng", công thức điểm cũ.

## Bối cảnh

Người chơi giỏi thắp hết đèn trong khoảng 2 phút rồi Đêm kết thúc, nên cuối Đêm thiếu căng thẳng. Mục tiêu đổi từ "thắp hết" sang "giữ đảo sáng tới bình minh". Ở Phase 2, đèn chỉ có một chiều `chưa sáng → sáng` và việc thắp đèn cuối cùng kết thúc game. Cả hai đều phải đổi.

## Quyết định

### 1. Mô hình trạng thái đèn: từ cờ một chiều sang vòng đời có dầu

```
            nạp đủ (10, hoặc 5 nếu ever_lit)              fuel ≤ 0 (ngay sau bước 2)
 TẮT ─────────────────────────────────────────▶ SÁNG ─────────────────────────────▶ TẮT
 deposited 0..cost, fuel 0                    fuel 0..100, hao 1/s + 5/s mỗi       deposited = 0,
                                              Bóng đang hút; châm dầu +10/đom đóm   ever_lit = true
```

- Mỗi đèn có thêm `fuel`, `ever_lit`, `relit_count`. `deposited` **được giữ** vì luật nạp từng phần của Ticket-02 vẫn còn hiệu lực với đèn tắt.
- **Một hàm tương tác cho cả hai trạng thái.** Đèn tắt thì nạp từng phần; đèn sáng chưa đầy thì châm dầu. Hàm chọn đèn chỉ xét "đèn nhận được" (tắt, hoặc sáng nhưng chưa đầy), gần nhất, hoà thì lấy id nhỏ.
- **Dầu lưu bằng số nguyên đơn vị 1/60** (`fuelU`, tối đa 6000). Mỗi tick hao 1 đơn vị và mỗi Bóng đang hút trừ thêm 5. Không cộng dồn số thực nên không có sai số tích luỹ, và đầu ra tất định giữa các máy. Chỉ khi xuất mới đổi ra `fuel` với 1 chữ số thập phân.
- **Thứ tự trong tick:** trừ dầu ở bước 2, ngay sau đó (bước 2a) đèn hết dầu thì tắt và phát `lantern_out`. Vì vậy mọi bước sau trong cùng tick (vùng an toàn, va chạm, xét thắng) đều thấy trạng thái đèn đã cập nhật.
- **Vùng an toàn phụ thuộc dầu:** chỉ đèn sáng có `fuel ≥ 30` mới chặn Bóng Mực. Đúng 30 vẫn còn vùng.

### 2. Bóng Mực: thêm trạng thái `drain`

```
wander ──(đèn sáng fuel<30 gần nhất, cách ≤ 2 m)──▶ drain ──(Mây ≤ 6 m)──▶ chase
   ▲                                                  │
   └──(đèn tắt / fuel ≥ 30 / cách > 2 m)──────────────┤
                                                      └──(trúng Tỏa Sáng)──▶ stunned ──hết choáng──▶ wander
```

Chỉ Bóng đang `wander` mới chọn đèn yếu; Bóng đang `chase` giữ mục tiêu là Mây. Khi châm dầu lên ≥ 30, mọi Bóng trong vùng 6 m bị đẩy ra mép và miễn sát thương 30 tick, giống lúc đèn vừa thắp. Trúng Tỏa Sáng lúc đang `drain` được 15 điểm thay vì 5, để thưởng việc giải cứu đèn.

### 3. Luật thắng: một điểm kết thúc duy nhất là bình minh

- Bỏ nhánh "tất cả đèn sáng ⇒ thắng". `_checkWinLose` chạy sau mọi cập nhật của tick, kể cả tick bình minh:
  1. `flames ≤ 0` ⇒ thua `no_flames`, luôn xét trước;
  2. hết giờ ⇒ đếm đèn **đang sáng ở tick cuối**: ≥ `ceil(0.6 × tổng)` thì thắng `dawn_survived` (cộng thưởng bình minh), ngược lại thua `dawn`.
- Thời lượng rút xuống 240/270/300 s vì Đêm không còn kết thúc sớm và người chơi giờ phải duy trì đèn liên tục.

### 4. Sức chứa tăng dần

`capacity = min(10 + 2 × successful_lights, 20)` được tính từ bộ đếm số lần thắp thành công trong Đêm (tính cả thắp lại; đèn đặt sẵn bằng scenario không tính). Giá trị này không lưu thành trạng thái riêng nên không thể lệch khỏi bộ đếm.

## Hệ quả

- **Tốt:** áp lực kéo dài tới cuối Đêm; có lựa chọn chiến thuật (thắp đèn mới để tăng sức chứa, hay giữ đèn cũ, hay Tỏa Sáng cứu đèn đang bị hút). Lõi vẫn tất định, headless một Đêm dài nhất mất dưới 1 s.
- **Phá vỡ tương thích:** liệt kê đầy đủ trong [CHANGELOG.md](../../CHANGELOG.md) mục `[phase-3]`. Đầu ra của mọi kịch bản cũ có đèn sáng sẽ khác, vì có hao dầu, điểm mới và không thắng sớm.
- **Test cũ:** được cập nhật hoặc thay thế có ghi lý do, không có test nào bị tắt. Xem bảng trong [docs/proof/phase-3.md](../proof/phase-3.md).
- **Rủi ro còn lại:** một số chỗ ticket chưa nói rõ đã được chốt bằng giả định #19–#28 trong [assumptions.md](assumptions.md). Đáng chú ý nhất là #20, Bóng đi về đèn tắt gần nhất. Nếu bộ chấm hiểu khác thì chỉ cần sửa nhánh `wander` trong `_moveShades`.

## Phương án đã cân nhắc

- **Lưu `fuel` bằng số thực** (bản đầu của Phase 3): đơn giản hơn, nhưng sau hàng nghìn tick `-= 1/60` sẽ cộng dồn sai số. Ticket cũng khuyên dùng số nguyên, nên không chọn.
- **Tách "châm dầu" thành nút riêng:** không đúng ticket (cùng nút Tương tác) và làm HUD phức tạp thêm.
- **Lưu `capacity` thành trạng thái riêng:** dễ lệch khỏi `successful_lights` khi scenario đặt sẵn giá trị; tính lại từ bộ đếm thì luôn đúng.
