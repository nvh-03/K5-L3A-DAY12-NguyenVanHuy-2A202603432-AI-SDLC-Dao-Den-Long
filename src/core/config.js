// SỐ LIỆU CHUẨN + BẢN ĐỒ 3 ĐÊM (Ticket-02 / Test Contract v1.1).
// Mọi hằng số theo Phần 1 của ticket. Thời gian nội bộ tính bằng TICK (60/giây).
export const TICK_RATE = 60;
const S = (sec) => Math.round(sec * TICK_RATE); // giây -> tick

export const TUNING = {
  // Di chuyển
  player_speed: 6.0,
  jump_speed: 7.0,
  gravity: 20.0,              // m/s^2 (hướng xuống)
  // Lướt (dash)
  dash_speed: 14.0,
  dash_duration_s: 0.2,      // 12 tick
  dash_cooldown_s: 1.5,      // 90 tick, tính từ lúc bắt đầu lướt
  // Đom đóm
  carry_capacity: 10,
  pickup_radius: 1.0,        // XZ
  pickup_height: 1.5,        // chênh cao chân Mây - mặt đất nơi đặt
  firefly_start: 20,
  firefly_cap: 30,
  firefly_spawn_period: 240, // mỗi 240 tick thêm 1 nếu dưới trần
  // Đèn lồng (Phase 2)
  lantern_cost: 10,
  interact_radius: 2.0,
  safe_radius: 6.0,
  safe_push_ticks: 30,       // bóng trong vùng khi vừa thắp bị đẩy ra tối đa 30 tick
  // Đèn nhiên liệu (Phase 3)
  fuel_max: 100,
  fuel_decay_per_s: 1.0,     // 1/60 mỗi tick
  fuel_per_mote: 10,         // mỗi đom đóm thêm 10 fuel
  relight_cost: 5,           // đèn từng sáng chỉ cần 5
  low_fuel_threshold: 30,    // fuel < 30 mất vùng an toàn, Bóng Mực có thể hút
  drain_per_s: 5.0,          // Bóng Mực hút 5/giây (5/60 mỗi tick)
  // Tỏa Sáng (pulse)
  pulse_cost: 3,
  pulse_radius: 5.0,         // 3D
  pulse_cooldown_s: 3.0,
  pulse_center_offset: 0.8,  // tâm = chân Mây + 0.8 m theo Y
  pulse_stun_ticks: 120,
  pulse_push_m: 4.0,
  pulse_push_ticks: 15,
  pulse_score: 5,
  // Bóng Mực
  shade_speed: 4.0,
  shade_speed_night3: 4.5,
  shade_detect: 12.0,
  shade_giveup: 18.0,
  shade_hit_radius: 1.0,     // XZ
  shade_hit_height: 1.5,
  shade_recoil_m: 2.0,
  shade_recoil_ticks: 60,
  // Bị đánh
  invuln_ticks: 90,
  hit_drop_ratio: 0.5,       // floor(carried/2)
  drop_ring_min: 1.5,
  drop_ring_max: 2.5,
  drop_ttl_ticks: 480,
  // Rơi khỏi đảo
  fall_y: -10.0,
  fall_wait_ticks: 60,
  // Máu / thời gian (Phase 3: thay đổi)
  flames: 3,
  night1_duration_s: 240,
  night2_duration_s: 270,
  night3_duration_s: 300,
  win_ratio: 0.6,            // cần ceil(0.6 * tổng đèn) đèn sáng để thắng
  capacity_max: 20,          // sức chứa tối đa
  // Gió Lạc (Drifter)
  drifter_speed: 7.0,
  drifter_idle_speed: 2.0,
  drifter_max: 2,
  drifter_detect: 15.0,
  drifter_carry_trigger: 5,  // Mây mang >= 5 thì bị để ý
  drifter_steal_radius: 1.2, // XZ
  drifter_steal_amount: 3,
  drifter_flee_ticks: 240,
  drifter_drop_ticks: 120,
  // Bùa Gió (Charm)
  charm_ticks: 600,
  charm_respawn_ticks: 2700,
  charm_speed: 7.2,
  // Gió mạnh (Đêm 3)
  wind_period_s: 30,
  wind_duration_s: 5,
  wind_warn_s: 2,
  wind_push: 2.0,
};

export const SCORE = {
  // Phase 3: điểm mới
  per_mote_deposited: 5,      // +5 mỗi đom đóm nạp (thắp, thắp lại, châm dầu)
  per_lantern_first_light: 100, // +100 thắp lần đầu
  per_lantern_relight: 40,    // +40 thắp lại
  per_pulse_hit: 5,           // +5 mỗi Bóng Mực trúng Tỏa Sáng
  per_pulse_hit_drain: 15,    // +15 nếu trúng lúc đang drain (thay vì +5)
  per_lantern_at_dawn: 50,    // +50 mỗi đèn sáng ở bình minh (khi thắng)
  per_fuel_at_dawn: 1,        // +floor(fuel) mỗi đèn ở bình minh (khi thắng)
  per_flame_at_dawn: 50,      // +50 mỗi ngọn lửa còn lại ở bình minh (khi thắng)
};

// --- Tạo điểm theo vòng: góc đo từ +X, ngược chiều kim đồng hồ, trên mặt XZ ---
function ring(cx, cz, r, startDeg, stepDeg, count, y = 0) {
  const pts = [];
  for (let i = 0; i < count; i++) {
    const a = ((startDeg + stepDeg * i) * Math.PI) / 180;
    pts.push([cx + r * Math.cos(a), y, cz + r * Math.sin(a)]);
  }
  return pts;
}

// --- Dựng dữ liệu bản đồ cho từng Đêm ---
export function buildNight(n) {
  if (n === 1) {
    return {
      night: 1,
      duration_ticks: S(TUNING.night1_duration_s),
      shade_speed: TUNING.shade_speed,
      lanterns: [
        { id: 'L1', pos: [0, 0, 25] },
        { id: 'L2', pos: [23.8, 0, 7.7] },
        { id: 'L3', pos: [14.7, 0, -20.2] },
        { id: 'L4', pos: [-14.7, 0, -20.2] },
        { id: 'L5', pos: [-23.8, 0, 7.7] },
      ],
      // 8 điểm r=12 (mỗi 45°) + 16 điểm r=33 (mỗi 22.5°) = 24 slot
      motePoints: [...ring(0, 0, 12, 0, 45, 8, 0), ...ring(0, 0, 33, 0, 22.5, 16, 0)],
      shadePoints: ring(0, 0, 37, 15, 30, 12, 0),
      shade: { first_tick: 300, first_count: 2, period: S(8), max: 6, min_dist_from_player: 15 },
      charms: [],
      drifters: false,
      wind: false,
      spawnPos: [0, 0, 0],
    };
  }
  if (n === 2) {
    return {
      night: 2,
      duration_ticks: S(TUNING.night2_duration_s),
      shade_speed: TUNING.shade_speed,
      lanterns: [
        { id: 'L1', pos: [0, 0, 20] }, { id: 'L2', pos: [17, 0, -10] }, { id: 'L3', pos: [-17, 0, -10] },
        { id: 'L4', pos: [70, 0, 20] }, { id: 'L5', pos: [87, 0, -10] }, { id: 'L6', pos: [53, 0, -10] },
      ],
      motePoints: [
        ...ring(0, 0, 10, 0, 90, 4, 0), ...ring(0, 0, 22, 0, 45, 8, 0),
        ...ring(70, 0, 10, 0, 90, 4, 0), ...ring(70, 0, 22, 0, 45, 8, 0),
      ],
      shadePoints: [...ring(0, 0, 26, 22.5, 45, 8, 0), ...ring(70, 0, 26, 22.5, 45, 8, 0)],
      shade: { first_tick: S(7), first_count: 1, period: S(7), max: 8, min_dist_from_player: 15 },
      charms: [{ id: 'C1', pos: [35, 0, 0] }],
      drifters: true,
      wind: false,
      spawnPos: [0, 0, 0],
      pads: [
        { pos: [20, 0, 18], target: [70, 0, 0], vy: 14, vh: 24 },
        { pos: [50, 0, -18], target: [0, 0, 0], vy: 14, vh: 24 },
      ],
    };
  }
  // Đêm 3
  return {
    night: 3,
    duration_ticks: S(TUNING.night3_duration_s),
    shade_speed: TUNING.shade_speed_night3,
    lanterns: [
      { id: 'L1', pos: [0, 6, 6] }, { id: 'L2', pos: [18, 3, 10] }, { id: 'L3', pos: [-18, 3, 10] },
      { id: 'L4', pos: [35, 0, -10] }, { id: 'L5', pos: [-35, 0, -10] },
      { id: 'L6', pos: [20, 0, -35] }, { id: 'L7', pos: [-20, 0, -35] },
    ],
    motePoints: [
      ...ring(0, 0, 34, 0, 20, 18, 0),
      ...ring(0, 0, 18, 20, 20, 8, 3),
      ...ring(0, 0, 5, 45, 90, 4, 6),
    ],
    shadePoints: ring(0, 0, 43, 0, 22.5, 16, 0),
    shade: { first_tick: S(6), first_count: 1, period: S(6), max: 10, min_dist_from_player: 15 },
    charms: [{ id: 'C1', pos: [30, 0, 25] }, { id: 'C2', pos: [-30, 0, 25] }],
    drifters: true,
    wind: true,
    spawnPos: [0, 0, 0],
    pads: [{ pos: [0, 3, 13], target: null, dir: [0, 0, -1], vy: 12, vh: 8 }],
  };
}
