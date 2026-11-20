# Đảo Đèn Lồng (Phase 3 / Ticket-03 "Đèn cạn dầu")

> 🎬 **Video demo:** _(dán link video `.mp4` ở đây — bắt buộc đặt ở đầu README)_

Game 3D: **Mây**, người giữ đèn nhỏ tuổi, gom **đom đóm** (ánh sáng) để thắp và **giữ cho các Đèn Lồng Lớn còn dầu** qua **3 Đêm** (Đảo Bến → Đảo Cau → Đảo Chuông), né **Bóng Mực** (chúng hút dầu đèn yếu) và **Gió Lạc** chuyên cướp đèn. Còn sống tới **bình minh** với ít nhất 60% số đèn đang sáng là **thắng** Đêm đó. Thắng cả 3 Đêm → **Bình Minh**.

Gồm: bản chơi 3D trên web (Three.js) và **chế độ headless** (Node) theo **Test Contract v1.2** — dùng chung một lõi mô phỏng **tất định**.

---

## Cài đặt và chạy (tối đa 3 lệnh)

Yêu cầu: **Node.js ≥ 18** (không có phụ thuộc ngoài). Chạy trên macOS/Linux/Windows.

```bash
npm install          # 1) không có dependency
npm run web          # 2) mở http://localhost:8080
# 3) mở http://localhost:8080 trong trình duyệt và chơi
```

> Bản web nạp Three.js từ CDN (cần mạng lần đầu). **Headless không cần mạng, không cần GPU.**

## Điều khiển

| Phím | Hành động |
|---|---|
| `W A S D` | Di chuyển (theo hướng camera) |
| `◀ ▶` | Xoay camera |
| `Space` | Nhảy |
| `Shift` | Lướt (dash) — 14 m/s trong 0.2 s, hồi chiêu 1.5 s |
| `E` | Nạp ánh sáng vào đèn tắt / châm dầu đèn đang sáng (khi đứng gần) |
| `Q` | Tỏa sáng (pulse) — làm choáng/đẩy Bóng Mực, tốn 3 đom đóm |
| `Esc` / `P` | Tạm dừng |
| `C` | Bật/tắt **Bảng màu dễ phân biệt** (được lưu; cũng có ô chọn ở màn hình mở đầu) |

Đom đóm **tự nhặt** khi đi ngang qua. **Bùa Gió** (lá đỏ) tăng tốc chạy và bỏ hồi chiêu lướt trong 10 s.

## Luật chơi & cách tính điểm (số chuẩn Ticket-02 + Ticket-03)

- **Sức chứa** = 10 + 2 × số lần thắp thành công trong Đêm (tính cả thắp lại), tối đa **20**.
- Đèn chưa từng sáng cần **10** đom đóm, đèn đã từng sáng chỉ cần **5** để thắp lại (nạp nhiều lần, nhớ tiến độ).
- **Dầu đèn:** vừa thắp có 100, hao **1/giây**. Bấm `E` ở đèn đang sáng để châm dầu: mỗi đom đóm +10 (tối đa 100). Hết dầu thì đèn tắt. Đèn đang sáng hiện **thanh dầu**; khi dầu < 30 thì đèn và thanh **nhấp nháy 1 Hz**.
- **Bóng Mực** (4.0 m/s, Đêm 3: 4.5) đuổi khi Mây cách ≤ 12 m; chạm (khi không bất tử) **−1 lửa** + rơi nửa số đom đóm; bất tử 90 tick. Đèn sáng có dầu ≥ 30 tạo **vùng an toàn 6 m**. Đèn có dầu < 30 mất vùng an toàn: Bóng Mực đang lang thang sẽ tới sát đèn và **hút 5 dầu/giây** (nhiều con thì cộng dồn), cho tới khi Mây lại gần trong 6 m, đèn được châm lên ≥ 30, hoặc bị Tỏa Sáng.
- **Gió Lạc** (Đêm 2–3): để ý khi Mây mang ≥ 5, chạm thì **cướp tối đa 3** đom đóm rồi bỏ chạy. Tỏa sáng trúng nó → thả lại.
- **Rơi khỏi đảo** (ra biển mây): −1 lửa, mất hết đom đóm, chờ 60 tick rồi hồi sinh ở điểm xuất phát.
- **Đêm 3** có **gió mạnh** mỗi 30 s đẩy người chơi; đảo 3 tầng, dốc, bục nhảy.
- Thời gian mỗi Đêm: **240 / 270 / 300 s**. Thắp đủ đèn **không** kết thúc Đêm sớm.
- **Thắng** (`dawn_survived`): còn sống lúc bình minh và số đèn đang sáng ≥ `ceil(0.6 × tổng)`: **3/5, 4/6, 5/7**. **Thua**: hết lửa (`no_flames`, luôn xét trước) hoặc tới bình minh mà thiếu đèn (`dawn`).

| Điểm | Khi |
|---|---|
| +5 | mỗi đom đóm nạp vào đèn (thắp mới, thắp lại hoặc châm dầu) |
| +100 / +40 | thắp lần đầu / thắp lại |
| +5 (+15 nếu nó đang hút dầu) | mỗi Bóng Mực trúng Tỏa Sáng |
| +50 + floor(dầu) mỗi đèn đang sáng, +50 mỗi lửa còn lại | ở bình minh, chỉ khi **thắng** |

Tổng điểm = tổng điểm các Đêm đã thắng. Mọi con số ở [`game.contract.json`](game.contract.json) và [`src/core/config.js`](src/core/config.js).

---

## Chế độ headless (Test Contract v1.2)

Logic cố định **60 tick/giây**, tất định, không cửa sổ/GPU. Một Đêm đầy đủ chạy ≤ 30 s.

```bash
node bin/headless.js --seed <int> --night <1|2|3> [--scenario f.json] [--inputs f.json] \
     --ticks <int> --out <file.jsonl> [--snapshot-every <int, mặc định 10>]
```

- Thoát mã **0** nếu thành công; mã khác 0 + stderr nếu lỗi; **mã 2** nếu file inputs/scenario sai định dạng.
- Đơn vị mét, trục Y lên, người chơi bắt đầu tại điểm xuất phát của Đêm.

Ví dụ (Đêm 1 dựng sẵn: còn 1 s, 3/5 đèn sáng → thắng ở bình minh):

```bash
node bin/headless.js --seed 1 --night 1 \
  --scenario tests/scenarios/p3-dawn-win.scenario.json \
  --ticks 120 --out out.jsonl --snapshot-every 60
```

### Đầu ra JSONL (v1.2)

- **snapshot** (tick 0 và mỗi `--snapshot-every`): `type,tick,sim_tick,state,night,time_left_s,score,wind{active,dir_deg}, player{pos,vel,grounded,flames,carried,capacity,invuln,dash_cd_s,pulse_cd_s,charm_s}, lanterns[{id,pos,lit,deposited,fuel,ever_lit,relit_count}], shades[{id,pos,state}], motes[{id,pos,kind,ttl_s}], drifters[{id,pos,state,stolen}], charms[{id,available,respawn_s}]`. `fuel` có 1 chữ số thập phân; đèn tắt có `fuel: 0`.
- **event** (`tick=k+1`): `type:"event",tick,name,data`. `name` ∈ `night_start, mote_picked, deposit, lantern_lit{lantern_id,relight}, refuel{lantern_id,amount,fuel}, lantern_out{lantern_id}, fuel_drain{lantern_id,shade_id,fuel}` (mỗi 60 tick khi đang hút)`, pulse, player_hit, shade_spawned, dash, charm_picked, drifter_steal, drifter_drop, paused, resumed, game_over{reason,state,score}` với `reason ∈ {dawn_survived, dawn, no_flames}`.
- **end** (dòng cuối): `{"type":"end","ticks":…,"state":…,"score":…}`, `state ∈ {playing,won,lost,paused}`.
- **scenario** thêm: đèn `lit, fuel, ever_lit` (`lit: true` mà không có `fuel` thì 100), `player.successful_lights`, `shades[].target_lantern_id`.

Trạng thái Bóng Mực: `spawning, wander, chase, recoil, stunned, drain`. Toạ độ làm tròn 3 chữ số. Khi tạm dừng, `tick` tăng nhưng `sim_tick` đứng yên và `state="paused"`.

Chi tiết đối chiếu contract & giả định: [docs/notes/assumptions.md](docs/notes/assumptions.md). Thứ tự xử lý trong tick: xem comment đánh số trong [src/core/sim.js](src/core/sim.js).

## Chạy test & bằng chứng

```bash
npm test     # 3 cổng: 77 kiểm tra cơ chế + 50 lần chạy kiểm Contract v1.2 + 60 lần fuzz/bất biến/tất định
```

Quyết định thiết kế Phase 3: [docs/notes/adr-001-den-can-dau.md](docs/notes/adr-001-den-can-dau.md). Thay đổi phá vỡ tương thích: [CHANGELOG.md](CHANGELOG.md). Bằng chứng: [docs/proof/phase-3.md](docs/proof/phase-3.md) (Phase 2: [docs/proof/phase-2.md](docs/proof/phase-2.md)).

---

## Sáng tạo của tôi

_(Mục bắt buộc. Phần thêm phải tắt khi headless và không đổi output.)_

- Hiệu ứng hình ảnh: viền sương, ánh đèn ấm, Mây có khăn đỏ + nón lá treo đèn; màu theo bảng màu chuẩn.
- _(Thêm ý riêng của bạn ở đây — nhân vật/kẻ địch/hiệu ứng mới, kèm bằng chứng phần lõi vẫn đúng.)_

## Cấu trúc thư mục

```
game.contract.json     Khai báo Test Contract v1.2
index.html             Bản chơi web (Three.js)
src/core/              Lõi mô phỏng tất định (dùng chung web + headless)
  rng.js config.js geometry.js sim.js headlessRun.js
src/render/main.js     Render 3D + điều khiển + chuỗi 3 Đêm
bin/headless.js        CLI headless (Test Contract)
bin/serve.js           Server tĩnh cho bản web
tests/                 Test 3 cổng + scenario mỗi tính năng (tests/scenarios/)
docs/spec/phase-2.md   Acceptance criteria
docs/proof/            Bằng chứng từng phase (phase-2/, phase-3/)
docs/notes/            Giả định, ADR, nhật ký AI, retro
```

## Tài liệu lab

[GUIDE](GUIDE.md) · [CHECKPOINTS](CHECKPOINTS.md) · [SUBMISSION](SUBMISSION.md) · [RULES](RULES.md) · [RUBRIC](RUBRIC.md) · [AGENTS.md](AGENTS.md) · [CREDITS](CREDITS.md) · [LICENSE](LICENSE)

Lab board: [Đảo Đèn Lồng Lab](https://claude.ai/artifact/Q1RYyv1dxjUczzCbd2ZnoW)
