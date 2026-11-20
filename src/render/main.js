import * as THREE from 'three';
import { Simulation } from '../core/sim.js';
import { TICK_RATE, TUNING } from '../core/config.js';
import { GameView } from './view.js';
import { ACTIONS, DEFAULT_KEYS, rebind, loadSettings } from '../platform/settings.js';

const $ = id => document.getElementById(id), view = new GameView($('app'));
let storage; try { storage = localStorage; } catch { storage = { getItem: () => null, setItem: () => { throw new Error('Trình duyệt chặn lưu cài đặt'); } }; }
let settings = loadSettings(storage), binding = null, mode = 'home', night = 1, seed = 42, totalScore = 0, nightsWon = 0;
let sim = new Simulation({ seed, night, creative: true }), yaw = 0, acc = 0, last = 0, recentShade = null, resumeAfterDialog = false;
let knownShades = new Set(), hitFx = 0;
const keys = new Set(), DT = 1 / TICK_RATE;
const names = ['', 'Đảo Bến', 'Đảo Cau', 'Đảo Chuông'];
view.build(1, sim.obstacles); view.sync(sim, settings);

function formatKey(k) {
  if (!k) return '';
  if (k.startsWith('Key')) return k.slice(3);
  if (k.startsWith('Digit')) return k.slice(5);
  if (k === 'ShiftLeft' || k === 'ShiftRight') return 'Shift';
  if (k === 'ControlLeft' || k === 'ControlRight') return 'Ctrl';
  if (k === 'AltLeft' || k === 'AltRight') return 'Alt';
  if (k === 'Space') return 'Space';
  if (k === 'Escape') return 'Esc';
  return k;
}

function applySettings() {
  document.documentElement.classList.toggle('large-text', settings.largeText); document.body.classList.toggle('colorblind', settings.colorblind);
  $('reduced-motion').checked = settings.reducedMotion; $('large-text').checked = settings.largeText; $('colorblind').checked = settings.colorblind;
  try { storage.setItem('dao-den-long.settings', JSON.stringify(settings)); } catch (e) { $('binding-status').textContent = e.message; }
  const k = settings.keys;
  const moveStr = `${formatKey(k.forward)}${formatKey(k.left)}${formatKey(k.backward)}${formatKey(k.right)}`;
  $('help').textContent = `${moveStr} di chuyển · ${formatKey(k.jump)} nhảy · ${formatKey(k.dash)} lướt · ${formatKey(k.interact)} thắp/nạp · ${formatKey(k.pulse)} tỏa · ${formatKey(k.pause)} menu`;
}
function bindings() {
  $('bindings').replaceChildren();
  for (const [action, label] of Object.entries(ACTIONS)) {
    const btn = document.createElement('button'); btn.textContent = `${label}: ${formatKey(settings.keys[action])}`;
    btn.addEventListener('click', () => { binding = action; $('binding-status').textContent = `Nhấn phím mới cho “${label}”…`; }); $('bindings').append(btn);
  }
}
addEventListener('keydown', e => {
  if (binding) {
    e.preventDefault();
    try { settings.keys = rebind(settings.keys, binding, e.code); $('binding-status').textContent = 'Đã lưu phím.'; binding = null; applySettings(); bindings(); }
    catch (error) { $('binding-status').textContent = error.message; }
    return;
  }
  if (e.target.matches('input') || document.querySelector('dialog[open]') || mode !== 'play') return;
  if (Object.values(settings.keys).includes(e.code)) e.preventDefault();
  keys.add(e.code);
});
addEventListener('keyup', e => keys.delete(e.code)); addEventListener('blur', () => keys.clear());
function readInput() {
  const on = a => keys.has(settings.keys[a]);
  if (on('cameraLeft')) yaw += 1.8 * DT; if (on('cameraRight')) yaw -= 1.8 * DT;
  return { move: [Number(on('right')) - Number(on('left')), Number(on('forward')) - Number(on('backward'))], cam_yaw_deg: yaw * 180 / Math.PI, jump: on('jump'), dash: on('dash'), interact: on('interact'), pulse: on('pulse'), pause: on('pause') };
}
function pauseToggle() { sim.step({ pause: true }); sim.step({ pause: false }); keys.clear(); }
function openDialog(id) {
  resumeAfterDialog = mode === 'play' && !sim.paused;
  if (resumeAfterDialog) pauseToggle();
  keys.clear(); $(id).showModal();
}
for (const id of ['settings-dialog', 'leaderboard-dialog']) $(id).addEventListener('close', () => { binding = null; keys.clear(); if (resumeAfterDialog && sim.paused) pauseToggle(); resumeAfterDialog = false; });
$('settings-button').onclick = () => { bindings(); openDialog('settings-dialog'); };
$('close-settings').onclick = () => $('settings-dialog').close();
$('restore').onclick = () => { settings = { keys: { ...DEFAULT_KEYS }, reducedMotion: false, largeText: false, colorblind: false }; binding = null; $('binding-status').textContent = 'Đã khôi phục mặc định.'; applySettings(); bindings(); };
for (const [id, key] of [['reduced-motion','reducedMotion'],['large-text','largeText'],['colorblind','colorblind']]) $(id).onchange = e => { settings[key] = e.target.checked; applySettings(); };
$('leaderboard-button').onclick = async () => {
  openDialog('leaderboard-dialog'); $('leaderboard-body').replaceChildren(); $('leaderboard-status').textContent = 'Đang đọc…';
  try {
    const response = await fetch('/api/leaderboard'); if (!response.ok) throw new Error('Không đọc được bảng xếp hạng. Hãy chạy bằng npm run web.');
    const { entries } = await response.json();
    entries.forEach((e, i) => { const row = document.createElement('tr'); for (const value of [i + 1, e.name, e.score, e.nights_won + '/3', new Date(e.achieved_at).toLocaleString('vi-VN')]) { const td = document.createElement('td'); td.textContent = value; row.append(td); } $('leaderboard-body').append(row); });
    $('leaderboard-status').textContent = entries.length ? 'Được lưu trên máy này.' : 'Chưa có hành trình nào. Hãy thắp ngọn đèn đầu tiên!';
  } catch (e) { $('leaderboard-status').textContent = e.message; }
};
$('close-leaderboard').onclick = () => $('leaderboard-dialog').close();
$('score-form').onsubmit = async e => {
  e.preventDefault(); const button = $('score-form').querySelector('button'); button.disabled = true;
  try {
    const response = await fetch('/api/leaderboard', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: $('player-name').value, score: totalScore, nights_won: nightsWon, achieved_at: new Date().toISOString(), seed }) });
    const data = await response.json(); if (!response.ok) throw new Error(data.error);
    $('save-status').textContent = 'Đã lưu hành trình vào bảng xếp hạng.';
  } catch (error) { $('save-status').textContent = error.message; button.disabled = false; }
};
function overlay(title, subtitle, button) { $('ov-title').textContent = title; $('ov-sub').textContent = subtitle; $('ov-btn').textContent = button; $('overlay').hidden = false; }
function home() {
  mode = 'home'; keys.clear(); $('score-form').hidden = true; $('seed-label').hidden = false; $('ov-score').textContent = ''; $('home-button').hidden = true;
  overlay('Giữ một ngọn đèn. Đón cả bình minh.', 'Ba hòn đảo. Ba Đêm trong sương. Gom đom đóm, giữ dầu cho đèn và dẫn Mây đi qua bóng tối.', 'Bắt đầu hành trình');
}
function startNight(n) {
  night = n; sim = new Simulation({ seed, night, creative: true }); view.build(night, sim.obstacles); acc = 0; yaw = 0; keys.clear(); recentShade = null; knownShades = new Set(sim.shades.map(s => s.id)); hitFx = 0; mode = 'play';
  $('overlay').hidden = true; $('seed-label').hidden = true; $('home-button').hidden = false; $('menu-button').hidden = false;
  for (const id of ['hud','fuel','inventory','help']) $(id).hidden = false;
}
function endNight() {
  keys.clear(); $('menu-button').hidden = true; $('score-form').hidden = true;
  if (sim.status === 'won') { totalScore += sim.scoreValue; nightsWon++; }
  $('ov-score').textContent = `Tổng điểm các Đêm đã thắng: ${totalScore} · ${nightsWon}/3 Đêm`;
  if (sim.status === 'won' && night < 3) { mode = 'next'; overlay(`Đêm ${night} đã qua`, `Ánh đèn còn sáng. Tiếp tục tới ${names[night + 1]}.`, `Vào Đêm ${night + 1}`); }
  else {
    mode = sim.status === 'won' ? 'dawn' : 'lost';
    overlay(mode === 'dawn' ? 'Bình Minh ☀' : `Đêm ${night} khép lại`, mode === 'dawn' ? 'Mây đã giữ ánh sáng qua cả ba hòn đảo.' : sim.player.flames <= 0 ? 'Ngọn lửa cuối cùng đã tắt. Hành trình vẫn đang đợi bạn.' : 'Bình minh đến, nhưng chưa đủ đèn còn sáng.', mode === 'dawn' ? 'Hành trình mới' : 'Thử lại Đêm này');
    $('score-form').hidden = false; $('save-status').textContent = ''; $('score-form').querySelector('button').disabled = false;
  }
}
$('ov-btn').onclick = () => {
  if (mode === 'home') { seed = Number($('seed').value); if (!Number.isInteger(seed)) return $('seed').reportValidity(); totalScore = 0; nightsWon = 0; startNight(1); }
  else if (mode === 'next') startNight(night + 1);
  else if (mode === 'lost') startNight(night);
  else if (mode === 'dawn') home();
  else if (mode === 'pause-menu') { mode = 'play'; if (sim.paused) pauseToggle(); $('overlay').hidden = true; }
};
$('home-button').onclick = home;
$('menu-button').onclick = () => { if (!sim.paused) pauseToggle(); mode = 'pause-menu'; $('score-form').hidden = true; overlay('Tạm dừng', 'Ánh đèn chờ bạn. Có thể đổi phím và cách hiển thị trong Cài đặt.', 'Tiếp tục'); };

function hud() {
  const p = sim.player, lit = sim.lanterns.filter(L => L.lit).length, capacity = sim._capacity(), fuelOf = L => L.fuelU / TICK_RATE;
  $('hud-night').textContent = `Đêm ${night} · ${names[night]}`; $('hud-flames').textContent = `🔥 ${p.flames}`;
  $('clock').textContent = sim.paused ? 'Ⅱ Tạm dừng' : `${Math.floor(Math.max(0, sim.timeLeft) / 60)}:${String(Math.floor(Math.max(0, sim.timeLeft) % 60)).padStart(2,'0')}`;
  $('clock').classList.toggle('danger', sim.timeLeft <= 10);
  $('hud-lanterns').textContent = `🏮 ${lit}/${sim.lanterns.length} · cần ${sim.winNeed()}`; $('hud-lanterns').classList.toggle('danger', lit < sim.winNeed()); $('hud-score').textContent = `${sim.scoreValue} điểm`;
  $('fuel').replaceChildren();
  for (const L of sim.lanterns) { const el = document.createElement('div'); el.textContent = `${L.lit ? '◉' : '◌'} ${L.id} · ${L.lit ? Math.ceil(fuelOf(L)) + '/100 dầu' : 'Chưa sáng'}`; el.classList.toggle('danger', L.lit && fuelOf(L) < TUNING.low_fuel_threshold); $('fuel').append(el); }
  const cdInfo = [];
  if (p.dashCd > 0) cdInfo.push(`Lướt ${(p.dashCd / 60).toFixed(1)}s`);
  if (p.pulseCd > 0) cdInfo.push(`Tỏa ${(p.pulseCd / 60).toFixed(1)}s`);
  if (p.charm > 0) cdInfo.push(`🍃 Bùa ${(p.charm / 60).toFixed(0)}s`);
  $('inventory').textContent = `✦ ${p.carried}/${capacity}${cdInfo.length ? ' · ' + cdInfo.join(' · ') : ''}`;
  const notices = [];
  if (sim.timeLeft <= 10) notices.push(`⚠ Còn ${Math.ceil(sim.timeLeft)} giây đến bình minh`);
  if (sim.windEnabled) { const phase = sim.simTick % (TUNING.wind_period_s * 60), before = (TUNING.wind_period_s - TUNING.wind_duration_s) * 60 - phase; if (before > 0 && before <= TUNING.wind_warn_s * 60) notices.push('⚠ Gió sắp thổi!'); else if (sim.windActive) notices.push('⚠ Gió đang thổi'); }
  const low = sim.lanterns.filter(L => L.lit && fuelOf(L) < TUNING.low_fuel_threshold); if (low.length) notices.push('⚠ Dầu dưới 30: ' + low.map(L => L.id).join(', '));
  $('shade-arrow').hidden = true;
  if (recentShade && sim.simTick < recentShade.until) {
    notices.push('⚠ Bóng Mực xuất hiện — theo mũi tên ở mép màn hình');
    const s = sim.shades.find(s => s.id === recentShade.id);
    if (s) {
      const v = new THREE.Vector3(...s.pos).project(view.camera), behind = v.z > 1 ? -1 : 1;
      const x = v.x * behind || .001, y = -v.y * behind, scale = 1 / Math.max(Math.abs(x), Math.abs(y), .001);
      const arrow = $('shade-arrow'); arrow.hidden = false; arrow.style.left = `${50 + x * scale * 46}%`; arrow.style.top = `${50 + y * scale * 43}%`; arrow.style.transform = `translate(-50%,-50%) rotate(${Math.atan2(y, x) + Math.PI / 2}rad)`;
    }
  }
  const text = notices.join('\n'); if ($('notices').textContent !== text) $('notices').textContent = text;
}
function loop(now) {
  const dt = Math.min(.1, (now - last) / 1000 || 0); last = now;
  if (mode === 'play' && !document.querySelector('dialog[open]')) {
    acc += dt;
    while (acc >= DT) {
      const events = sim.step(readInput()); acc -= DT;
      // Lõi không phát event khi sinh Bóng (giữ nguyên đầu ra headless) nên phát hiện bằng id mới xuất hiện.
      for (const s of sim.shades) if (!knownShades.has(s.id)) { knownShades.add(s.id); recentShade = { id: s.id, until: sim.simTick + 180 }; }
      if (!settings.reducedMotion && events.some(e => e.name === 'player_hit')) { hitFx = now + 350; $('flash').classList.add('on'); }
      if (sim.status !== 'playing') { endNight(); break; }
    }
    const hitting = now < hitFx;
    if (!hitting) $('flash').classList.remove('on');
    view.follow(sim, yaw, hitting ? .35 : 0); hud();
  }
  view.sync(sim, settings); view.render(); requestAnimationFrame(loop);
}
applySettings(); requestAnimationFrame(loop); window.__gameReady = true;
