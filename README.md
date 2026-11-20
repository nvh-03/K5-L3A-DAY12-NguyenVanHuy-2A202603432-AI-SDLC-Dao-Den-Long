# Đảo Đèn Lồng (Phase 2 / Ticket-02)

> 🎬 **Video demo:** _(dán link video `.mp4` ở đây — bắt buộc đặt ở đầu README)_

Game 3D: **Mây**, người giữ đèn nhỏ tuổi, gom **đom đóm** (ánh sáng) để thắp các **Đèn Lồng Lớn** qua **3 Đêm** (Đảo Bến → Đảo Cau → Đảo Chuông), né **Bóng Mực** trong sương đen và **Gió Lạc** chuyên cướp đèn. Thắp đủ đèn một Đêm là **thắng** Đêm đó; hết lửa trên nón hoặc hết giờ là **thua**. Thắng cả 3 Đêm → **Bình Minh**.

Gồm: bản chơi 3D trên web (Three.js) và **chế độ headless** (Node) theo **Test Contract v1.1** — dùng chung một lõi mô phỏng **tất định**.

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
| `E` | Nạp ánh sáng vào Đèn Lồng (khi đứng gần) |
| `Q` | Tỏa sáng (pulse) — làm choáng/đẩy Bóng Mực, tốn 3 đom đóm |
| `Esc` / `P` | Tạm dừng |

Đom đóm **tự nhặt** khi đi ngang qua. **Bùa Gió** (lá đỏ) tăng tốc chạy và bỏ hồi chiêu lướt trong 10 s.

## Luật chơi & cách tính điểm (số chuẩn Ticket-02)

- Mang tối đa **10** đom đóm. Mỗi đèn cần **10** đom đóm (nạp nhiều lần, nhớ tiến độ).
- **Bóng Mực** (4.0 m/s, Đêm 3: 4.5) đuổi khi Mây cách ≤12 m; chạm (khi không bất tử) **−1 lửa** + rơi nửa số đom đóm; bất tử 90 tick. Đèn đã thắp tạo **vùng an toàn 6 m** — Bóng Mực sợ, không vào.
- **Gió Lạc** (Đêm 2–3): để ý khi Mây mang ≥5, chạm thì **cướp tối đa 3** đom đóm rồi bỏ chạy. Tỏa sáng trúng nó → thả lại.
- **Rơi khỏi đảo** (ra biển mây): −1 lửa, mất hết đom đóm, chờ 60 tick rồi hồi sinh ở điểm xuất phát.
- **Đêm 3** có **gió mạnh** mỗi 30 s đẩy người chơi; đảo 3 tầng, dốc, bục nhảy.
- Thắng = tất cả đèn sáng (kể cả đúng tick hết giờ). Thua = hết lửa (`no_flames`) hoặc hết giờ chưa đủ đèn (`dawn`).

| Điểm | Khi |
|---|---|
| +10 | mỗi đom đóm **nạp** vào đèn |
| +100 | mỗi đèn thắp sáng |
| +5 | mỗi Bóng Mực trúng Tỏa Sáng |
| + floor(giây còn lại)×2 + 50×lửa còn lại | khi **thắng** một Đêm |

Tổng điểm = tổng điểm các Đêm đã thắng. Mọi con số ở [`game.contract.json`](game.contract.json) và [`src/core/config.js`](src/core/config.js).

---

## Chế độ headless (Test Contract v1.1)

Logic cố định **60 tick/giây**, tất định, không cửa sổ/GPU. Một Đêm đầy đủ chạy ≤ 30 s.

```bash
node bin/headless.js --seed <int> --night <1|2|3> [--scenario f.json] [--inputs f.json] \
     --ticks <int> --out <file.jsonl> [--snapshot-every <int, mặc định 10>]
```

- Thoát mã **0** nếu thành công; mã khác 0 + stderr nếu lỗi; **mã 2** nếu file inputs/scenario sai định dạng.
- Đơn vị mét, trục Y lên, người chơi bắt đầu tại điểm xuất phát của Đêm.

Ví dụ (một Đêm 1 dựng sẵn thắng):

```bash
node bin/headless.js --seed 1 --night 1 \
  --scenario tests/scenarios/win-standard.scenario.json \
  --inputs tests/scenarios/win-standard.inputs.json \
  --ticks 10 --out out.jsonl --snapshot-every 1
```

### Đầu ra JSONL (v1.1)

- **snapshot** (tick 0 và mỗi `--snapshot-every`): `type,tick,sim_tick,state,night,time_left_s,score,wind{active,dir_deg}, player{pos,vel,grounded,flames,carried,invuln,dash_cd_s,pulse_cd_s,charm_s}, lanterns[], shades[{id,pos,state}], motes[{id,pos,kind,ttl_s}], drifters[{id,pos,state,stolen}], charms[{id,available,respawn_s}]`.
- **event** (`tick=k+1`): `type:"event",tick,name,data`. `name` ∈ `night_start, mote_picked, deposit, lantern_lit, pulse, player_hit, shade_spawned, dash, charm_picked, drifter_steal, drifter_drop, paused, resumed, game_over`.
- **end** (dòng cuối): `{"type":"end","ticks":…,"state":…,"score":…}`, `state ∈ {playing,won,lost,paused}`.

Trạng thái Bóng Mực: `spawning, wander, chase, recoil, stunned`. Toạ độ làm tròn 3 chữ số. Khi tạm dừng, `tick` tăng nhưng `sim_tick` đứng yên và `state="paused"`.

Chi tiết đối chiếu contract & giả định: [docs/notes/assumptions.md](docs/notes/assumptions.md). Thứ tự xử lý trong tick: xem comment đánh số trong [src/core/sim.js](src/core/sim.js).

## Chạy test & bằng chứng

```bash
npm test     # 47 kiểm tra: số chuẩn, từng tính năng mới, tất định, hiệu năng, mã lỗi
```

Spec + acceptance criteria: [docs/spec/phase-2.md](docs/spec/phase-2.md). Bằng chứng headless: [docs/proof/phase-2/](docs/proof/phase-2/) và bảng [docs/proof/phase-2.md](docs/proof/phase-2.md).

---

## Sáng tạo của tôi

_(Mục bắt buộc. Phần thêm phải tắt khi headless và không đổi output.)_

- Hiệu ứng hình ảnh: viền sương, ánh đèn ấm, Mây có khăn đỏ + nón lá treo đèn; màu theo bảng màu chuẩn.
- _(Thêm ý riêng của bạn ở đây — nhân vật/kẻ địch/hiệu ứng mới, kèm bằng chứng phần lõi vẫn đúng.)_

## Cấu trúc thư mục

```
game.contract.json     Khai báo Test Contract v1.1
index.html             Bản chơi web (Three.js)
src/core/              Lõi mô phỏng tất định (dùng chung web + headless)
  rng.js config.js geometry.js sim.js headlessRun.js
src/render/main.js     Render 3D + điều khiển + chuỗi 3 Đêm
bin/headless.js        CLI headless (Test Contract)
bin/serve.js           Server tĩnh cho bản web
tests/                 Test (47) + scenario mỗi tính năng
docs/spec/phase-2.md   Acceptance criteria
docs/proof/phase-2/    Bằng chứng headless
docs/notes/            Giả định, nhật ký AI, retro
```

## Tài liệu lab

[GUIDE](GUIDE.md) · [CHECKPOINTS](CHECKPOINTS.md) · [SUBMISSION](SUBMISSION.md) · [RULES](RULES.md) · [RUBRIC](RUBRIC.md) · [AGENTS.md](AGENTS.md) · [CREDITS](CREDITS.md) · [LICENSE](LICENSE)

Lab board: [Đảo Đèn Lồng Lab](https://claude.ai/artifact/Q1RYyv1dxjUczzCbd2ZnoW)
