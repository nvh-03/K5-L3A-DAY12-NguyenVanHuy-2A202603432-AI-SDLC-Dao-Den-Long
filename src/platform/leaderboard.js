// Bắt buộc: [A-Za-z0-9_]{3,12}. Điểm cộng: chấp nhận thêm chữ Latin có dấu tiếng Việt (chuẩn hoá NFC, đếm theo ký tự).
const NAME = /^[\p{Script=Latin}\p{Nd}_]{3,12}$/u;
export function validateEntry(e) {
  const name = typeof e?.name === 'string' ? e.name.normalize('NFC').trim() : '';
  if (!NAME.test(name) || /[^\x20-\x7EÀ-ɏḀ-ỿ]/.test(name)) throw new Error('Tên cần 3–12 ký tự: chữ (có thể có dấu tiếng Việt), số hoặc _.');
  e = { ...e, name };
  if (!Number.isInteger(e.score) || e.score < 0 || !Number.isInteger(e.nights_won) || e.nights_won < 0 || e.nights_won > 3 || !Number.isInteger(e.seed)) throw new Error('Điểm, số Đêm hoặc seed không hợp lệ.');
  if (typeof e.achieved_at !== 'string' || !/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(e.achieved_at) || !Number.isFinite(Date.parse(e.achieved_at))) throw new Error('Thời gian cần ISO 8601 có múi giờ.');
  return { name: e.name, score: e.score, nights_won: e.nights_won, achieved_at: e.achieved_at, seed: e.seed };
}
export function rankEntries(entries) {
  return entries.map(validateEntry).sort((a, b) => b.score - a.score || Date.parse(a.achieved_at) - Date.parse(b.achieved_at)).slice(0, 10);
}
