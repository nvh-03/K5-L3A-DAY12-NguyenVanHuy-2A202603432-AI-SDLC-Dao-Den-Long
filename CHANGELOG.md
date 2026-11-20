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

## [phase-3] — Ticket-03 "Đèn cạn dầu", Test Contract v1.2

Quyết định thiết kế: [docs/notes/adr-001-den-can-dau.md](docs/notes/adr-001-den-can-dau.md). Bằng chứng: [docs/proof/phase-3.md](docs/proof/phase-3.md).

### Thay đổi phá vỡ tương thích (breaking)
- **Luật thắng:** bỏ "thắng ngay khi tất cả đèn sáng". Giờ chỉ thắng ở bình minh nếu còn sống và số đèn đang sáng ≥ `ceil(0.6 × tổng)` (3/5, 4/6, 5/7). `game_over.reason`: `dawn_survived` (thắng), `dawn` hoặc `no_flames` (thua); không còn kết thúc sớm khi thắp đủ.
- **Thời lượng Đêm:** 300/330/360 s → **240/270/300 s**.
- **Đèn sáng có thể tắt:** dầu tối đa 100, hao 1/s; hết dầu thì tắt (`deposited = 0`, giữ `ever_lit`), phát `lantern_out`.
- **Đèn đã sáng nhận thêm đom đóm** (thay luật "không nhận"): châm dầu `used = min(mang, ceil((100 − fuel)/10))`, event `refuel`.
- **Bóng Mực được vào vùng an toàn** của đèn có fuel < 30 (thay luật "không bao giờ vào"); trạng thái mới `drain` (hút 5/s, cộng dồn).
- **Công thức điểm thay toàn bộ:** +5/đom đóm nạp (trước +10), +100 thắp lần đầu, +40 thắp lại, +5 trúng Tỏa Sáng (+15 nếu đang drain), thưởng bình minh khi thắng: +50 + floor(fuel) mỗi đèn sáng và +50 mỗi Ngọn Lửa; **bỏ thưởng thời gian**.
- **Sức chứa** không còn cố định 10: `10 + 2 × successful_lights`, tối đa 20.
- **Contract v1.2:** snapshot đèn thêm `fuel` (1 chữ số), `ever_lit`, `relit_count`; `player.capacity`; `lantern_lit.relight`; event `refuel`, `lantern_out`, `fuel_drain`; scenario nhận `fuel`, `ever_lit`, `successful_lights`, `target_lantern_id`. `game.contract.json`: `contract_version "1.2"` và các khoá tuning mới; khoá `score` đổi tên theo công thức mới.

### Thêm
- Thắp lại đèn từng sáng chỉ tốn 5 đom đóm.
- Web: thanh dầu trên đèn sáng, đèn và thanh nhấp nháy 1 Hz khi fuel < 30, đèn tắt xẹp 20% và có vết rách giấy, HUD "mang / sức chứa" và "đèn sáng / cần", ánh sáng môi trường giảm khi đèn tắt.
- Cài đặt **Bảng màu dễ phân biệt** (lưu localStorage, phím C): viền và mắt Bóng Mực #00B3FF, cảnh báo UI trắng kèm ⚠.
- 18 scenario mới `tests/scenarios/p3-*`; bộ kiểm contract v1.2 (schema event mới, đối chiếu `game.contract.json`); fuzz có biến thể đèn/dầu và cổng độ phủ nhánh dầu.

### Gỡ bỏ
- Scenario `win-standard` (thắng khi thắp đủ đèn): luật không còn đúng, thay bằng `p3-no-early-win`.

## [phase-4] / [v1.0.0] — Ticket-04 "Bình minh: phát hành v1.0.0", Test Contract v1.3

Bằng chứng: [docs/proof/phase-4.md](docs/proof/phase-4.md). Đầu ra headless **không đổi** so với phase-3 (đã so nội dung file bằng chứng trọn Đêm).

### Thêm
- **Benchmark** `node bin/bench.js --seed 42 --duration 30 --out bench.json`: cảnh chuẩn 200 Bóng Mực wander + 100 đom đóm + L1–L3 sáng, camera bay vòng, cửa sổ Chrome/Edge 1280×720, vsync tắt bằng cờ Chromium, công thức avg/p1-low/p95 đúng ticket. `bench.json` tự chạy được commit.
- **Soak test** `node --expose-gc --max-semi-space-size=1 bin/soak.js --seed 7 --nights 10 --out soak.json`: 10 Đêm xoay vòng trong một tiến trình, input ngẫu nhiên theo seed; ghi thêm `mem_ratio` và chi tiết từng Đêm. `soak.json` được commit.
- **Bảng xếp hạng cục bộ**: nhập tên sau Bình Minh hoặc khi thua; top 10, bằng điểm thì ai đạt trước đứng trên; lưu `data/leaderboard.json` qua API của `bin/serve.js`; màn hình Bảng xếp hạng từ menu chính; `node bin/serve.js --export-leaderboard out.json`; nhận tên tiếng Việt có dấu.
- **Trợ năng**: đổi phím mọi hành động (báo trùng phím, khôi phục mặc định, được lưu); chỉ báo Bóng Mực xuất hiện kèm mũi tên mép màn hình, gió sắp thổi, 10 s cuối, đèn dầu < 30; giảm chuyển động (tắt rung camera và chớp màn hình khi bị đánh); chữ tối thiểu 18 px và tùy chọn ×1.25.
- **Đồ hoạ**: cây và đá trên cả 3 đảo, **có va chạm** (Mây trượt dọc mép, không đi xuyên; chỉ bật ở bản chơi để headless/bench/soak giữ cảnh chuẩn). Renderer tách `GameView` (instanced mesh cho Bóng Mực/đom đóm), Three.js đóng gói sẵn trong `vendor/` để chạy không cần mạng.
- Ảnh chụp cho README (`docs/media/`), tạo bằng `node bin/bench.js --preview <png> --night <n>`.
- Cổng test thứ 4 `tests/platform.js` (50 kiểm tra) và kiểm `bench_cmd`/`soak_cmd` trong bộ kiểm contract.

### Sửa
- **Sàn tầng 1 Đêm 3 bị vẽ ngược nửa** (z < 0) so với lõi vật lý (z > 0): đèn L2/L3 lơ lửng, sàn che mất Mây. Nay vẽ đúng nửa, có mép, cột đỡ và hai dốc.
- Mũi tên báo Bóng Mực xuất hiện không bao giờ hiện (chờ event `shade_spawned` mà lõi không phát); nay renderer phát hiện id Bóng mới, không đổi đầu ra headless.
- Tùy chọn chữ lớn không có tác dụng với phần lớn UI (đặt trên `body` trong khi UI dùng `rem`).
- Thanh help và thanh đồ mang dưới 18 px.

### Thay đổi contract
- `contract_version: "1.3"`; thêm `bench_cmd`, `soak_cmd`. Mọi yêu cầu v1.0–v1.2 giữ nguyên.
