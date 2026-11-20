# Changelog

Ghi lại thay đổi chính theo từng phase. Định dạng theo [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

## [phase-1]
- Lõi mô phỏng tất định Đêm 1 (`src/core/`): di chuyển, nhặt đom đóm, nạp/thắp 5 đèn, Bóng Mực đuổi, pulse, máu/thắng/thua, điểm số.
- Chế độ headless theo Test Contract v1.0 (`bin/headless.js`, `game.contract.json`): JSONL, 60 tick/s, exit code 0/2, tất định.
- Bản chơi web 3D bằng Three.js (`index.html`, `src/render/main.js`) + server tĩnh (`bin/serve.js`).
- 26 test tự động (`npm test`) và bằng chứng headless (`docs/proof/phase-1/`).

## [phase-2]
- Chuẩn hoá toàn bộ số liệu theo Ticket-02 Phần 1 (`src/core/config.js` `TUNING`/`SCORE`).
- Mở rộng **3 Đêm** (Đảo Bến / Đảo Cau / Đảo Chuông) với bản đồ chuẩn; địa hình nhiều tầng, cầu, bục nhảy (`src/core/geometry.js`).
- Tính năng mới: **Lướt (dash)**, **Gió Lạc** (cướp/thả), **Bùa Gió**, **gió mạnh Đêm 3**, **rơi khỏi đảo & hồi sinh**, **tạm dừng**.
- **Test Contract v1.1** (`game.contract.json`, `bin/headless.js`): `--night 1|2|3`, snapshot thêm night/wind/vel/grounded/…, sự kiện mới, trạng thái Bóng Mực chuẩn, pause (sim_tick đứng yên).
- Thứ tự xử lý trong tick theo đúng Phần 1; giữ tất định; một Đêm đầy đủ chạy headless ~0.2 s.
- Bản web: chuỗi 3 Đêm, HUD đầy đủ, bảng màu chuẩn, ánh sáng môi trường theo tiến độ.
- 47 test (`npm test`), scenario/bằng chứng cho mỗi tính năng (`docs/proof/phase-2/`), spec có acceptance criteria (`docs/spec/phase-2.md`).

## [phase-3]
- _Mô tả những gì hoàn thành ở Phase 3._

## [phase-4] / [v1.0.0]
- _Bản phát hành cuối: mô tả tính năng, bản chạy được, link video demo._
