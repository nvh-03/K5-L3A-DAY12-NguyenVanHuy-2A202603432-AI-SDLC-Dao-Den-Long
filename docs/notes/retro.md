# Retro — Đảo Đèn Lồng (4 phase, v1.0.0)

## 1. Tổng hợp Evaluation từng phase

| Phase | Yêu cầu chính | Kết quả | Bằng chứng |
|---|---|---|---|
| 1 — PRD-0, Contract v1.0 | Đêm 1 chơi được + headless JSONL tất định | Đạt (tag `phase-1`, dựng lại theo đúng `phase 1.md` sau khi phát hiện bản đầu lệch contract) | `docs/proof/phase-1*` |
| 2 — Ticket-02, v1.1 | Số chuẩn, 3 Đêm, dash/Gió Lạc/Bùa/gió/rơi/pause | Đạt; 3 cổng test (cơ chế, contract, fuzz) | `docs/proof/phase-2*` |
| 3 — Ticket-03, v1.2 | Dầu đèn, Bóng Mực `drain`, thắng ở bình minh, sức chứa, điểm mới, mù màu | Đạt sau một vòng sửa lớn (xem §3); ADR + CHANGELOG + bảng test cũ sửa/xoá có lý do | `docs/proof/phase-3*`, ADR-001 |
| 4 — Ticket-04, v1.3 | Bench, soak, bảng xếp hạng, trợ năng, đóng gói, Release | Đạt trên máy dev: avg 138 FPS, p1-low 63, load 2.2 s; soak 0 crash, RAM ×1.13 | `docs/proof/phase-4.md`, `bench.json`, `soak.json` |

Cuối cùng: 4 cổng test, 77 + 50 + 60 + 50 kiểm tra, đều đạt. Đầu ra headless không đổi từ phase 3 sang phase 4.

## 2. Điều hiệu quả khi làm với AI

- **Tách lõi tất định khỏi render ngay từ đầu.** Mọi phase sau chỉ sửa `src/core/` cho luật và `src/render/` cho hình, và headless/bench/soak dùng lại cùng một lõi.
- **Test là "người chấm thay mắt".** Mỗi luật có một scenario trong `tests/scenarios/` và một kỳ vọng con số tính tay (ví dụ 547 điểm ở bình minh). AI hay viết test "cho qua". Kỳ vọng cụ thể buộc code phải đúng.
- **Kiểm chính bộ kiểm.** Cố ý làm hỏng 7 kiểu đầu ra để chắc bộ kiểm contract bắt được. Thêm **cổng độ phủ** cho fuzz, vì fuzz ban đầu không hề chạm tới nhánh `drain` và thắp lại.
- **Ảnh chụp tự động thay cho mắt.** `bench.js --preview` chụp cảnh chơi thật để AI xem lại đồ hoạ khi phiên làm việc không có trình duyệt. Nhờ vậy tìm ra một lỗi Phase 2 mà mọi test logic đều không thấy (§3).
- **Worktree + sao lưu trước khi gộp.** Phase 3 được hoàn thiện trong worktree riêng, để không đè lên code Phase 4 đang dở trong thư mục chính.

## 3. Những lần AI sai và cách phát hiện

| Sai | Phát hiện bằng |
|---|---|
| Phase 1 làm theo bản tóm tắt thay vì `phase 1.md` (sai định dạng inputs, chỗ đặt score, schema event) | Đọc đối chiếu từng mục contract khi được yêu cầu "làm lại theo phase 1.md" |
| Code v1.0 bị ghi đè bởi Phase 2 trước khi commit; `.gitignore` mẫu `phase*.md` loại nhầm cả `docs/spec/phase-2.md` | Rà `git status`/nội dung commit trước khi tag; dựng lại lịch sử phase-1 → phase-2 |
| Đêm 3: điểm xuất phát bị coi là trong tháp nên rơi vô hạn | Chạy headless cả 3 Đêm |
| Web đen màn hình: HUD đọc tên trường snapshot (`dash_cd_s`) từ trạng thái nội bộ (`dashCd`), ném lỗi trước `render()` | Ảnh chụp console người dùng gửi; sửa và đưa `render()` lên trước HUD |
| Phase 3 bản đầu: bỏ luật nạp từng phần, thắp lại vẫn tốn 10, fuel số thực, `fuel_drain` ghi sai giá trị, test chấp nhận "dawn hoặc dawn_survived", ADR ghi sai so với code | Review từng dòng ticket ↔ code; viết lại test với số tính tay |
| Fuzz báo `lit: true, fuel: 0` | Bất biến quá chặt, không phải lỗi game: làm tròn 1 chữ số ở 2 tick cuối. Ghi giả định #25 |
| Giả định #27 viết "0.6 × 5 = 3.0000000000000004" | Chạy thử bằng node: thực tế ra đúng 3, nên sửa lại câu chữ |
| Phase 4 WIP: mũi tên báo Bóng Mực không bao giờ hiện (chờ event lõi không phát); chữ lớn không có tác dụng; chữ HUD < 18 px | Đọc code đối chiếu ticket; grep event trong lõi |
| **Sàn tầng 1 Đêm 3 vẽ ngược nửa so với vật lý** (lỗi từ Phase 2) | Ảnh `--preview` Đêm 3 thấy Mây bị sàn che; đối chiếu `geometry.js` |
| Soak RAM ×1.17–1.19, sát ngưỡng 1.2 | Chạy 10/100/300/400 Đêm, đo `heapUsed` sau GC: phẳng ~5.3 MB, tức không rò rỉ; giới hạn semi-space của V8 |

Bài học chung: AI sai nhiều nhất ở chỗ **"gần đúng nhưng không theo chữ ticket"** và **"test xác nhận điều nó vừa viết"**. Cách chặn hiệu quả nhất là kỳ vọng số cụ thể và đối chiếu từng dòng ticket.

## 4. Harness giúp nhiều nhất

1. **`AGENTS.md`**: các quy tắc tất định (không `Math.random`/`Date.now` trong lõi), "mỗi tính năng ≥ 1 scenario", "test cũ bị thay phải ghi lý do", "render phải khớp geometry.js". Quy tắc nào cũng sinh ra từ một lỗi thật ở trên.
2. **`npm test` 4 cổng** chạy trước mỗi commit/tag.
3. **Lệnh tự kiểm hình ảnh** (`--preview`) cho những thứ test logic không nhìn thấy.

Chưa dùng skill/hook riêng. Lần sau sẽ thêm một hook chạy `npm test` trước `git commit`.

## 5. Token / chi phí AI

Không có số đo chính xác cho từng phiên (nhiều model qua các phiên: Opus, Sonnet, Haiku, Fable). Ước tính thô theo số lượt và độ dài ngữ cảnh: **khoảng 10–15 triệu token đầu vào** (phần lớn đọc từ prompt cache) và **khoảng 0.3–0.5 triệu token đầu ra** cho cả 4 phase. Chi tiết và cách điền số chính xác: [ai-log.md](ai-log.md).

Đã tiết kiệm token bằng cách:
- Đọc ticket một lần, chốt giả định vào `assumptions.md` thay vì hỏi lại nhiều vòng.
- Dùng test và headless để kiểm thay cho chạy game bằng mắt.
- Script nhỏ trong scratchpad cho các câu hỏi đo lường (probe luật, rò rỉ bộ nhớ, vị trí vật cản) thay vì đọc lại file lớn.
- Tái dùng code Phase 4 dở dang thay vì viết lại.

## 6. Nếu làm lại

- **Commit + tag ngay cuối mỗi phase**, trước khi đọc ticket sau. Hai lần trong dự án phải gỡ rối lịch sử git vì làm chồng.
- Đọc **file ticket gốc** trước mọi bản tóm tắt; mỗi ticket lập bảng "yêu cầu → test" trước khi code.
- Có ảnh chụp tự động từ Phase 2 thay vì chờ tới Phase 4 mới thấy lỗi vẽ sàn.
- Không để model nhỏ làm phần thay đổi luật cốt lõi mà không có review đối chiếu ticket.
