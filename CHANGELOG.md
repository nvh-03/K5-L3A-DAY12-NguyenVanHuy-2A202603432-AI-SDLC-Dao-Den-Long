# Changelog

## [phase-1] — PRD-0
- Lõi mô phỏng tất định Đêm 1 (`src/core/`): di chuyển/nhảy, nhặt đom đóm, nạp & thắp 5 đèn, Bóng Mực đuổi + tránh đèn, tỏa sáng (pulse), máu/thắng/thua, điểm số.
- Chế độ headless theo **Test Contract v1.0** (`bin/headless.js`, `game.contract.json`): JSONL, 60 tick/s, exit 0/2, tất định; inputs dạng `{ "frames": [...] }`.
- Bản chơi web 3D (Three.js) + server tĩnh.
- 26 test (`npm test`) và bằng chứng headless (`docs/proof/phase-1/`).
