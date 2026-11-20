# Retro (Nhìn lại) — Phase 1

## Điều làm tốt
- Tách lõi tất định (`src/core/`) khỏi render ngay từ đầu → headless và web dùng chung một logic.
- Bám sát đúng schema Test Contract v1.0 (inputs `{frames}`, `score` lồng trong `tuning`, `data` từng event) để không trượt test hình dạng.
- Dùng test tự động (26 ca) làm bằng chứng thay vì "agent bảo chạy rồi".

## Điều chưa tốt / gặp khó
- Nên commit + tag ngay cuối mỗi phase trước khi nhận ticket sau.

## Lần sau sẽ làm khác
- Viết vài scenario kiểm chứng trước khi để agent code (test-first) cho các mục có số đo rõ.

## Token / chi phí
Xem [ai-log.md](ai-log.md).
