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

## Phase 3 (Ticket-03)

| Bước | Công cụ | Việc làm |
|---|---|---|
| Bản đầu | Claude Code (Haiku) | Thêm dầu/drain/luật thắng; tự viết ADR/CHANGELOG. Lệch ticket nhiều chỗ (xem retro §3) |
| Review & sửa | Claude Code (Opus/Fable) | Đối chiếu từng dòng ticket; viết lại lõi (dầu số nguyên 1/60, nạp từng phần, thắp lại 5), 18 scenario `p3-*`, nâng bộ kiểm contract/fuzz lên v1.2, kiểm chéo bộ kiểm bằng 7 đầu ra hỏng, ADR-001, bằng chứng; làm trong git worktree để không đè WIP Phase 4 |

## Phase 4 (Ticket-04)

| Bước | Công cụ | Việc làm |
|---|---|---|
| WIP | Claude Code (phiên khác) | Bench/soak/leaderboard/settings, `GameView` instanced, cây/đá |
| Gộp & hoàn thiện | Claude Code (Opus) | Gộp WIP lên lõi Phase 3; cảnh bench dùng luật wander của lõi; vsync off, viewport 1280×720; soak đo RSS sau GC và kiểm rò rỉ tới 400 Đêm; sửa trợ năng (chữ lớn, 18 px, mũi tên Bóng Mực, rung/chớp), tên tiếng Việt; sửa sàn Đêm 3; cổng test `platform.js`; chạy bench/soak thật; ảnh `--preview`; tài liệu và gói phát hành |

## Tổng ước tính

Số đo chính xác: chạy `/cost` trong mỗi phiên Claude Code, hoặc xem trang Usage của tài khoản, rồi cộng lại. Ước tính thô dưới đây dựa trên số lượt và độ dài ngữ cảnh:

| Phase | Token đầu vào (phần lớn từ prompt cache) | Token đầu ra |
|---|---|---|
| 1 | ~2–3 triệu | ~60–90 nghìn |
| 2 | ~3–4 triệu | ~100–150 nghìn |
| 3 | ~2–3 triệu | ~80–120 nghìn |
| 4 | ~3–5 triệu | ~100–150 nghìn |
| **Tổng** | **~10–15 triệu** | **~0.3–0.5 triệu** |

- **Tổng chi phí ước tính:** phụ thuộc model và tỉ lệ cache của từng phiên. Với phần lớn đầu vào đọc từ cache, chi phí chủ yếu nằm ở token đầu ra và lần ghi cache đầu tiên. Hãy điền số thật từ `/cost` trước khi nộp.
