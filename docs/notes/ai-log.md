# Nhật ký dùng AI (AI Log)

## Phase 1 (PRD-0)

| Bước | Công cụ | Việc làm | Ước tính |
|---|---|---|---|
| Đọc yêu cầu | Claude Code (Opus) | Đọc PRD-0 + Test Contract từ lab board, tóm tắt yêu cầu & chốt giả định | ~ |
| Thiết kế | Claude Code | Chọn kiến trúc: lõi JS thuần tất định dùng chung cho web (Three.js) và headless (Node) | ~ |
| Xây dựng | Claude Code | Viết `rng, config, sim, headlessRun`, CLI headless, server tĩnh, render 3D, test | ~ |
| Kiểm chứng | Claude Code | Chạy 26 test, chạy headless, kiểm tra tất định + exit code, lưu bằng chứng | ~ |

> Điền ước tính token/chi phí theo công cụ bạn dùng. Nếu dùng Claude Code: xem `/cost` hoặc bảng sử dụng.

### Cách tiết kiệm token đã áp dụng
- Đọc lab board **một lần**, chốt giả định ngay thay vì hỏi lại nhiều vòng.
- Viết lõi tất định rồi dùng **test tự động** bắt lỗi, thay vì để agent chạy đi chạy lại bằng mắt.
- Tách logic khỏi render ngay từ đầu → không phải sửa chéo khi đổi một phía.

## Phase 2 (Ticket-02)

| Bước | Công cụ | Việc làm | Ước tính |
|---|---|---|---|
| Đọc ticket | Claude Code (Opus) | Đọc `phase 2.md` (số chuẩn, 3 bản đồ, tính năng mới, Contract v1.1, DoD), chốt giả định | ~ |
| Thiết kế | Claude Code | Tách `config` (số chuẩn + bản đồ), `geometry` (địa hình/rơi/tầng), rewrite `sim` theo thứ tự tick bắt buộc | ~ |
| Xây dựng | Claude Code | Dash, Gió Lạc, Bùa, gió, rơi/hồi sinh, pause, safe-zone, trạng thái bóng chuẩn; headless v1.1; renderer 3 Đêm | ~ |
| Kiểm chứng | Claude Code | 47 test + scenario mỗi tính năng; tất định; hiệu năng (21600 tick ~0.2 s); sinh bằng chứng | ~ |

### Cách tiết kiệm token
- Đọc ticket một lần, chốt giả định ngay (`assumptions.md`) thay vì hỏi lại nhiều vòng.
- Lớp hoá rõ (config/geometry/sim/headless) để sửa một chỗ không lan ra chỗ khác.
- Test tự động bắt lỗi sớm (ví dụ lỗi spawn Đêm 3) thay vì chạy thử bằng mắt nhiều lần.

## Tổng ước tính
- **Tổng token:** _(điền)_
- **Tổng chi phí ước tính:** _(điền)_
