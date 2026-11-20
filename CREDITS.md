# CREDITS

Nguồn mọi asset, thư viện và công cụ AI dùng để tạo nội dung.

## Thư viện

| Thành phần | Nguồn / Tác giả | Giấy phép | Ghi chú |
|---|---|---|---|
| Three.js r160 (`vendor/three.module.js`) | three.js authors — https://github.com/mrdoob/three.js | MIT ([vendor/THREE-LICENSE.txt](vendor/THREE-LICENSE.txt)) | Đóng gói sẵn trong repo để chơi/benchmark không cần mạng. Không có phụ thuộc npm nào khác. |

## Hình ảnh, mô hình 3D

Không dùng file ảnh, texture hay mô hình bên ngoài. Mọi hình khối (đảo, sàn tầng, dốc, Mây, đèn lồng, thanh dầu, Bóng Mực, Gió Lạc, đom đóm, bùa, **cây, đá**) đều **tự tạo bằng code** từ hình học có sẵn của Three.js (cylinder, cone, sphere, dodecahedron, box, ring) trong [src/render/view.js](src/render/view.js). Ảnh trong `docs/media/` là ảnh chụp chính game, tạo bằng `node bin/bench.js --screenshot/--preview`.

## Âm thanh / Nhạc

Không có (bản phát hành v1.0.0 chưa có âm thanh).

## Font

Font hệ thống (`system-ui`), không đóng gói font nào.

## Bảng màu

Bảng màu chuẩn do đề bài (Ticket-02) cung cấp; bảng màu dễ phân biệt (#00B3FF, cảnh báo #FFFFFF kèm ⚠) theo Ticket-03.

## Công cụ AI tạo nội dung

| Công cụ | Dùng để làm gì | Ghi chú |
|---|---|---|
| Claude Code (Anthropic) — các model Claude Opus, Sonnet, Haiku, Fable qua từng phiên | Đọc ticket, chốt giả định, viết code lõi/render/CLI, viết test và bộ kiểm contract, sinh scenario, chạy bench/soak, viết tài liệu (README, ADR, CHANGELOG, retro) | Harness: [AGENTS.md](AGENTS.md). Nhật ký và ước tính token: [docs/notes/ai-log.md](docs/notes/ai-log.md). Mọi đầu ra đều được kiểm bằng test tự động trước khi commit. |

Không có asset nào do AI tạo dưới dạng ảnh, âm thanh hay mô hình; AI chỉ tạo mã nguồn và văn bản.
