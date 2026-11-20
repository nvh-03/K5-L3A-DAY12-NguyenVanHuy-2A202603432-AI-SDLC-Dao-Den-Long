# Nhật ký dùng AI (AI Log)

## Phase 1 (PRD-0)

| Bước | Công cụ | Việc làm | Ước tính |
|---|---|---|---|
| Đọc yêu cầu | Claude Code (Opus) | Đọc PRD-0 + Test Contract v1.0, chốt giả định | ~ |
| Thiết kế | Claude Code | Lõi JS thuần tất định dùng chung web (Three.js) + headless (Node) | ~ |
| Xây dựng | Claude Code | `rng/config/sim/headlessRun`, CLI headless, server tĩnh, render 3D, test | ~ |
| Kiểm chứng | Claude Code | 26 test, chạy headless, kiểm tất định + exit code, lưu bằng chứng | ~ |

### Cách tiết kiệm token
- Đọc contract một lần, chốt giả định ngay thay vì hỏi lại nhiều vòng.
- Viết lõi tất định rồi dùng test tự động bắt lỗi thay vì chạy agent nhiều lần.
- Tách logic khỏi render ngay từ đầu.

## Tổng ước tính
- **Tổng token:** _(điền)_
- **Tổng chi phí ước tính:** _(điền)_
