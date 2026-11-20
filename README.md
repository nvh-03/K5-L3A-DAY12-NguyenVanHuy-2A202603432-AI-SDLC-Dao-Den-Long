# Đảo Đèn Lồng — Đêm 1 (Phase 1 / PRD-0)

> 🎬 **Video demo:** _(dán link video `.mp4` ở đây — bắt buộc đặt ở đầu README)_

Game 3D: **Mây**, người giữ đèn nhỏ tuổi, chạy quanh đảo gom **đom đóm** (ánh sáng) để thắp **5 Đèn Lồng Lớn**, né **Bóng Mực** trong sương đen. Thắp đủ 5 đèn là **thắng**; hết lửa trên nón là **thua**.

Gồm: bản chơi 3D trên web (Three.js) và **chế độ headless** (Node) theo **Test Contract v1.0** — dùng chung một lõi mô phỏng **tất định**.

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
| `E` | Nạp ánh sáng vào Đèn Lồng (khi đứng gần) |
| `Q` | Tỏa sáng — xua & làm choáng Bóng Mực, tốn đom đóm |
| `R` | Chơi lại |

Đom đóm **tự nhặt** khi đi ngang qua.

## Luật chơi & cách tính điểm

- Mang tối đa `carry_capacity` (5) đom đóm. Mỗi đèn cần `lantern_cost` (3) đom đóm.
- Bóng Mực đuổi Mây; chạm (khi không bất tử) **−1 lửa** + rơi một phần đom đóm; bất tử `invuln_s`. Đèn đã thắp tạo vùng an toàn `safe_radius` — Bóng Mực không vào.
- `Q` tỏa sáng: tốn `pulse_cost` (2) đom đóm, choáng + đẩy Bóng Mực trong `pulse_radius`, có hồi chiêu.
- Hết giờ đêm mà chưa đủ đèn: thua (`dawn`). Hết lửa: thua (`no_flames`). Đủ 5 đèn: thắng (`all_lit`).

| Điểm | Khi |
|---|---|
| `per_mote` (5) | nhặt mỗi đom đóm |
| `per_lantern` (100) | thắp mỗi đèn |
| `per_stun` (10) | mỗi Bóng Mực trúng tỏa sáng |
| `per_second_left` (1) | mỗi giây còn lại (khi thắng) |
| `per_flame_left` (50) | mỗi lửa còn lại khi kết thúc |

Mọi con số ở [`game.contract.json`](game.contract.json) (khối `tuning`, `score` lồng trong `tuning`).

---

## Chế độ headless (Test Contract v1.0)

Logic cố định **60 tick/giây**, tất định (cùng seed + scenario + inputs ⇒ cùng output).

```bash
node bin/headless.js --seed <int> --night 1 [--scenario f.json] [--inputs f.json] \
     --ticks <int> --out <file.jsonl> [--snapshot-every <int, mặc định 10>]
```

- Thoát **0** nếu thành công; mã khác 0 + stderr nếu lỗi; **mã 2** nếu file inputs/scenario sai định dạng.
- Đơn vị mét, Y hướng lên, mặt đất Y=0, Mây bắt đầu tại `(0,0,0)`.
- **inputs** là object `{ "frames": [ { "tick":0, "move":[0,1] }, ... ] }` (tick tăng nghiêm ngặt; nút kích hoạt khi false→true).
- **scenario.motes** là mảng toạ độ `[[x,y,z], ...]`; `shades` là `[{ "pos":[...], "id"? }]`.

Ví dụ (ván thắng dựng sẵn):

```bash
node bin/headless.js --seed 42 --night 1 \
  --scenario tests/scenarios/win-last-lantern.scenario.json \
  --inputs tests/scenarios/win-last-lantern.inputs.json \
  --ticks 20 --out out.jsonl --snapshot-every 5
```

### Đầu ra JSONL

- **snapshot** (tick 0 và mỗi `--snapshot-every`): `type,tick,sim_tick,state,time_left_s,score,player{pos,flames,carried},lanterns[{id,pos,lit,deposited}],shades[{id,pos,state}],motes_active,motes[]`.
- **event** (`tick=k+1`): `mote_picked{carried}`, `deposit{lantern_id,amount,deposited}`, `lantern_lit{lantern_id}`, `pulse{stunned_ids}`, `player_hit{by,flames,dropped}`, `shade_spawned{id}`, `game_over{result,reason}`.
- **end** (dòng cuối): `{"type":"end","ticks":…,"state":…,"score":…}`, `state ∈ {playing,won,lost}`.

Toạ độ làm tròn 3 số. `sim_tick = tick` ở Phase 1. Chi tiết giả định: [docs/notes/assumptions.md](docs/notes/assumptions.md).

## Chạy test & bằng chứng

```bash
npm test     # 26 kiểm tra: hình dạng output, tất định, cơ chế, mã lỗi, làm tròn
```

Bằng chứng: [docs/proof/phase-1/](docs/proof/phase-1/) và bảng [docs/proof/phase-1.md](docs/proof/phase-1.md).

---

## Sáng tạo của tôi

_(Mục bắt buộc. Phần thêm phải tắt khi headless, không đổi output.)_
- Viền sương tím quanh đảo, ánh đèn ấm, Mây đội nón lá treo đèn lồng nhỏ.

## Cấu trúc thư mục

```
game.contract.json     Test Contract v1.0
index.html             Bản chơi web (Three.js)
src/core/              Lõi mô phỏng tất định (rng, config, sim, headlessRun)
src/render/main.js     Render 3D + điều khiển
bin/headless.js        CLI headless
bin/serve.js           Server tĩnh cho bản web
tests/                 Test + scenario mẫu
docs/proof/phase-1/    Bằng chứng headless
docs/notes/            Giả định, nhật ký AI, retro
```

## Tài liệu lab

[GUIDE](GUIDE.md) · [CHECKPOINTS](CHECKPOINTS.md) · [SUBMISSION](SUBMISSION.md) · [RULES](RULES.md) · [RUBRIC](RUBRIC.md) · [AGENTS.md](AGENTS.md) · [CREDITS](CREDITS.md) · [LICENSE](LICENSE)

Lab board: [Đảo Đèn Lồng Lab](https://claude.ai/artifact/Q1RYyv1dxjUczzCbd2ZnoW)
