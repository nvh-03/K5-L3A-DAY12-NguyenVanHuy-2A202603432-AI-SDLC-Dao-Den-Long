# Retro (Nhìn lại)

## Điều làm tốt
- Tách lõi tất định (`src/core/`) khỏi render ngay từ Phase 1 → Phase 2 mở rộng lớn (3 Đêm, dash, Gió Lạc, pause) mà không phải sửa chéo.
- Dùng test tự động (47 ca) làm lưới an toàn: mỗi tính năng mới có scenario headless, bắt lỗi sớm thay vì chạy agent nhiều vòng.
- Bắt sớm lỗi thiết kế Đêm 3 (spawn (0,0,0) bị coi là trong tháp → rơi vô hạn) nhờ chạy thử headless cả 3 Đêm.

## Điều chưa tốt / gặp khó
- **Git phase-1:** Phase 1 (contract v1.0) chưa được commit/tag riêng trước khi chuẩn hoá số theo Ticket-02. Khi Ticket-02 "thay mọi giá trị tự chọn", code v1.0 bị ghi đè ngay trong cây làm việc. Hệ quả: không còn một commit phase-1 "thuần v1.0" để gắn tag.
- Địa hình nhiều tầng Đêm 3 phức tạp; dùng mô hình mặt-đỡ xấp xỉ, chưa phủ test mọi tình huống vách/dốc.

## Lần sau sẽ làm khác
- **Commit + tag ngay cuối mỗi phase** trước khi nhận ticket sau. Quy trình đúng: `git add -A && git commit && git tag phase-N && git push ...`.
- Viết Test Contract-driven test trước khi code tính năng (TDD nhẹ) cho các mục có số đo rõ.

## Cách xử lý tag phase-1 (gợi ý khi nộp)
Vì v1.0 không được tách commit, chọn một trong hai, ghi trung thực trong bằng chứng:
1. Gắn `phase-1` vào commit đầu tiên có bản chơi được (dù đã mang số chuẩn), và nêu rõ trong `docs/proof` rằng số đã được chuẩn hoá ở Ticket-02.
2. Nếu Coach cho phép, dựng lại một commit phase-1 từ lịch sử (nếu có) rồi tag. Hiện chưa có commit v1.0 nên phương án 1 thực tế hơn.

## Token / chi phí
Xem [ai-log.md](ai-log.md). Tiết kiệm nhờ: đọc ticket một lần chốt giả định, test tự động thay vì chạy mắt, lõi dùng chung web+headless.
