// Tuning mặc định Đêm 1 (số tự chọn — khai trong game.contract.json, khối tuning).
// Giả định: xem README mục "Giả định" / docs/notes/assumptions.md.
export const DEFAULT_TUNING = {
  player_speed: 6.0,        // m/s
  carry_capacity: 5,        // số đom đóm (ánh sáng) Mây mang tối đa
  lantern_cost: 3,          // số đom đóm cần nạp để thắp 1 đèn
  lantern_count_night1: 5,
  pickup_radius: 1.5,       // tự nhặt đom đóm (m)
  interact_radius: 2.0,     // nạp đèn (m)
  pulse_cost: 2,            // đom đóm tiêu hao khi tỏa sáng
  pulse_radius: 6.0,        // bán kính tỏa sáng (m)
  night1_duration_s: 180,
  flames: 3,                // máu của Mây (hết = thua)
  invuln_s: 1.5,            // bất tử sau khi trúng đòn (giây)
  hit_drop_ratio: 0.5,      // tỉ lệ đom đóm rơi khi bị chạm
  pulse_stun_s: 2.0,        // thời gian Bóng Mực choáng (giây)
  pulse_push_m: 4.0,        // khoảng đẩy lùi khi tỏa sáng (m)
  pulse_cooldown_s: 3.0,    // hồi chiêu tỏa sáng (giây)
  safe_radius: 5.0,         // bán kính quanh đèn đã thắp Bóng Mực không vào
  shade_speed: 3.5,         // m/s
  shade_hit_radius: 1.0,    // bán kính chạm gây sát thương (m)
  fall_enabled: false,      // Đêm 1 không phạt rơi khỏi đảo
};

export const DEFAULT_SCORE = {
  per_mote: 5,
  per_lantern: 100,
  per_stun: 10,
  per_second_left: 1,
  per_flame_left: 50,
};

// Tham số thế giới (không nằm trong contract; ghi ở README).
export const WORLD = {
  island_radius: 30.0,
  lantern_ring_radius: 18.0,
  motes_initial: 40,
  mote_disk_ratio: 0.85,
  shade_max: 4,
  shade_spawn_interval_s: 12.0,
  shade_first_spawn_s: 4.0,
  gravity: 24.0,
  jump_speed: 7.0,
  tick_rate: 60,
};

export function resolveTuning(t = {}) { return { ...DEFAULT_TUNING, ...t }; }
export function resolveScore(s = {}) { return { ...DEFAULT_SCORE, ...s }; }
