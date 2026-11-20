export const ACTIONS = { forward: 'Tiến', backward: 'Lùi', left: 'Sang trái', right: 'Sang phải', jump: 'Nhảy', dash: 'Lướt', interact: 'Tương tác', pulse: 'Tỏa sáng', pause: 'Tạm dừng', cameraLeft: 'Xoay camera trái', cameraRight: 'Xoay camera phải' };
export const DEFAULT_KEYS = { forward: 'KeyW', backward: 'KeyS', left: 'KeyA', right: 'KeyD', jump: 'Space', dash: 'ShiftLeft', interact: 'KeyE', pulse: 'KeyQ', pause: 'Escape', cameraLeft: 'ArrowLeft', cameraRight: 'ArrowRight' };
export function rebind(keys, action, code) {
  const conflict = Object.keys(keys).find(a => a !== action && keys[a] === code);
  if (conflict) throw new Error('Trùng phím với “' + ACTIONS[conflict] + '”.');
  return { ...keys, [action]: code };
}
export function loadSettings(storage) {
  const defaults = { keys: { ...DEFAULT_KEYS }, reducedMotion: false, largeText: false, colorblind: false };
  try {
    const s = JSON.parse(storage.getItem('dao-den-long.settings'));
    if (!s) return defaults;
    if (!Object.keys(DEFAULT_KEYS).every(a => typeof s.keys?.[a] === 'string') || new Set(Object.values(s.keys)).size !== Object.keys(DEFAULT_KEYS).length) return defaults;
    return { keys: { ...s.keys }, reducedMotion: !!s.reducedMotion, largeText: !!s.largeText, colorblind: !!s.colorblind };
  } catch { return defaults; }
}
