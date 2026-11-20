# Bằng chứng Phase 1 (PRD-0)

Tái lập: `npm test` và các lệnh headless dưới đây. File ở [phase-1/](phase-1/).

## Bảng đối chiếu yêu cầu → bằng chứng

| Yêu cầu (PRD-0 / Test Contract v1.0) | Bằng chứng | Kết quả |
|---|---|---|
| Chơi được Đêm 1 đến thắng/thua | bản web (`npm run web`); video demo | Đạt |
| 5 Đèn Lồng, thắp đủ là thắng | [win.jsonl](phase-1/win.jsonl) → `end.state=won`, `game_over{result:won,reason:all_lit}` | Đạt |
| Nạp ánh sáng vào đèn | win.jsonl → `deposit{lantern_id,amount,deposited}`, `lantern_lit{lantern_id}` | Đạt |
| Bóng Mực đuổi, chạm mất máu | [chase.jsonl](phase-1/chase.jsonl) → `player_hit{by:"shade",flames,dropped}` | Đạt |
| Tỏa sáng xua/choáng, tốn ánh sáng | [pulse.jsonl](phase-1/pulse.jsonl) → `pulse{stunned_ids}`, shade `stunned` | Đạt |
| HUD, điểm số, chơi lại | `src/render/main.js` | Đạt |
| Headless 60 tick/s, exit 0 | win.jsonl (exit 0) + test | Đạt |
| inputs `{frames}` & tất định | test + [determinism-a](phase-1/determinism-a.jsonl) ≡ [determinism-b](phase-1/determinism-b.jsonl) | Đạt |
| File inputs/scenario sai → exit 2 | test "inputs {frames} sai -> code 2" + chạy tay | Đạt |
| Toạ độ làm tròn 3 số | test "làm tròn 3 số" | Đạt |
| `game.contract.json` (score trong tuning) | [game.contract.json](../../game.contract.json) | Đạt |
| Cài & chạy ≤ 3 lệnh | [README](../../README.md) | Đạt |

## Lệnh tái lập

```bash
npm test
S=tests/scenarios ; O=docs/proof/phase-1
node bin/headless.js --seed 42 --night 1 --scenario $S/win-last-lantern.scenario.json --inputs $S/win-last-lantern.inputs.json --ticks 20 --snapshot-every 5 --out $O/win.jsonl
node bin/headless.js --seed 123 --night 1 --ticks 600 --out $O/determinism-a.jsonl
node bin/headless.js --seed 123 --night 1 --ticks 600 --out $O/determinism-b.jsonl
diff $O/determinism-a.jsonl $O/determinism-b.jsonl
```

## Chỗ chưa đạt / ghi chú trung thực
- Chưa quay video demo (làm ở khâu phát hành).
- "Sáng tạo của tôi" mới ở mức hiệu ứng hình ảnh; ưu tiên lõi đúng contract trước.
- Schema `data` các event bám đúng mẫu trong PRD-0; giả định khác xem [assumptions](../notes/assumptions.md).
