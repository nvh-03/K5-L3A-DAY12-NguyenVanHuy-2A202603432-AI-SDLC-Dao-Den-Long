# Bằng chứng Phase 2 (Ticket-02)

Tái lập: `npm test` (47 kiểm tra) và các lệnh headless dưới đây. File ở [phase-2/](phase-2/). Spec & acceptance criteria: [docs/spec/phase-2.md](../spec/phase-2.md).

## Bảng đối chiếu

| Yêu cầu | Bằng chứng | Kết quả |
|---|---|---|
| Số chuẩn + snapshot v1.1 (night, wind, vel, grounded, dash_cd_s…) | test "Số chuẩn"; mọi *.jsonl | Đạt |
| Nạp đèn cost 10 & thắng; điểm chuẩn | [win.jsonl](phase-2/win.jsonl) | Đạt |
| Lướt 14 m/s, hồi chiêu 1.5 s | [dash.jsonl](phase-2/dash.jsonl) | Đạt |
| Tỏa Sáng choáng Bóng Mực (state stunned) | [pulse.jsonl](phase-2/pulse.jsonl) | Đạt |
| Bóng Mực chạm → −1 lửa, rơi đom đóm, bóng recoil | [shade-hit.jsonl](phase-2/shade-hit.jsonl) | Đạt |
| Rơi khỏi đảo → −1 lửa, mất đom đóm, hồi sinh | [fall.jsonl](phase-2/fall.jsonl) | Đạt |
| Gió Lạc cướp đom đóm (Đêm 2) | [drifter-steal.jsonl](phase-2/drifter-steal.jsonl) | Đạt |
| Gió Lạc trúng pulse → thả đồ | [drifter-drop.jsonl](phase-2/drifter-drop.jsonl) | Đạt |
| Bùa Gió: nhặt, hiệu lực 600 tick | [charm.jsonl](phase-2/charm.jsonl) | Đạt |
| Bục nhảy bắn lên (Đêm 2) | [jump-pad.jsonl](phase-2/jump-pad.jsonl) | Đạt |
| Tạm dừng: sim_tick đứng yên, state paused | [pause.jsonl](phase-2/pause.jsonl) | Đạt |
| Gió mạnh Đêm 3 (wind.active) | [night3-wind.jsonl](phase-2/night3-wind.jsonl) | Đạt |
| Tất định (cả 3 Đêm) | determinism-a/b + fuzz 30 lần (invariants) | Đạt |
| Hiệu năng: Đêm đầy đủ ≤30 s | 21600 tick ~0.2 s (test "Hiệu năng") | Đạt |
| **Tuân thủ Contract v1.1** (schema/nhịp/kiểu) | `npm run test:contract` — 46 lần chạy (5 seed × 3 Đêm × 3 nhịp) + pause, 0 lỗi | Đạt |
| **Fuzz input + bất biến** (carried/flames/điểm/toạ độ/kẹt-mép/vận-tốc) | `npm run test:invariants` — 30 lần chạy, 0 lỗi | Đạt |

> Hai cổng trên là lưới gỡ lỗi tự động: validator ([tests/contract-check.js](../../tests/contract-check.js)) kiểm từng dòng JSONL đúng Contract; fuzz ([tests/invariants.js](../../tests/invariants.js)) chạy input ngẫu nhiên seeded trên 3 Đêm và kiểm bất biến + tất định. Đã tự kiểm validator "có răng" (bắt đúng lỗi khi tiêm dòng sai).

## Lệnh tái lập (rút gọn)

```bash
npm test
S=tests/scenarios ; O=docs/proof/phase-2
node bin/headless.js --seed 1 --night 1 --scenario $S/win-standard.scenario.json --inputs $S/win-standard.inputs.json --ticks 10 --snapshot-every 1 --out $O/win.jsonl
node bin/headless.js --seed 1 --night 1 --scenario $S/dash.scenario.json --inputs $S/dash.inputs.json --ticks 15 --snapshot-every 1 --out $O/dash.jsonl
node bin/headless.js --seed 1 --night 2 --scenario $S/drifter-steal.scenario.json --ticks 60 --snapshot-every 10 --out $O/drifter-steal.jsonl
node bin/headless.js --seed 123 --night 1 --ticks 4000 --out $O/determinism-a.jsonl
node bin/headless.js --seed 123 --night 1 --ticks 4000 --out $O/determinism-b.jsonl
diff $O/determinism-a.jsonl $O/determinism-b.jsonl
```

## Chỗ chưa đạt / ghi chú trung thực

- **Tag phase-1**: Phase 1 (contract v1.0) chưa được commit riêng trước khi chuẩn hoá số theo Ticket-02; xem [retro](../notes/retro.md) để biết cách xử lý git.
- **Bản web ≥30 FPS @1280×720**: cần đo khi demo (chưa có đo tự động trong repo).
- **Đêm 3 địa hình nhiều tầng**: mô hình mặt-đỡ (support-surface) xấp xỉ vách đứng/dốc; đã kiểm chạy được nhưng chưa phủ test mọi ngóc ngách tầng. Xem [assumptions](../notes/assumptions.md).
- **Âm thanh/Cài đặt**: chỉ ở bản web, không thuộc headless.
- Một số schema trường `data` của event theo giả định (ticket không liệt kê từng trường chi tiết) — xem [assumptions](../notes/assumptions.md).
