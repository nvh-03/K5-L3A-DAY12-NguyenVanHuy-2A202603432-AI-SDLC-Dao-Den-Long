// Địa hình từng Đêm: mặt đứng được, rơi khỏi đảo, vách tầng (Đêm 3), tháp chuông.
// Trả về danh sách mặt đi được tại một (x,z). Logic đứng/rơi do sim xử lý.
const hyp = (x, z) => Math.sqrt(x * x + z * z);

// Trả về: mảng độ cao các mặt đi được tại (x,z); 'tower' nếu bị tháp chặn; [] nếu là biển mây (rơi).
export function candidateSurfaces(night, x, z) {
  if (night === 1) {
    return hyp(x, z) <= 40 ? [0] : [];
  }
  if (night === 2) {
    const rA = hyp(x, z);
    const rB = hyp(x - 70, z);
    const onBridge = x >= 26 && x <= 44 && z >= -2 && z <= 2;
    return rA <= 28 || rB <= 28 || onBridge ? [0] : [];
  }
  // Đêm 3
  const r = hyp(x, z);
  if (r > 45) return [];
  const list = [0]; // tầng 0 phủ toàn đảo (kể cả dưới chân tháp)
  if (r >= 12 && r <= 24 && z > 0) list.push(3); // tầng 1: vành khăn nửa z>0
  if (r >= 2 && r <= 8) list.push(6); // tầng 2: đĩa tâm, trừ trụ tháp (r<2) không đứng được -> bước ra thì rơi
  // 2 dốc rộng 3 m ở góc 30° và 150°, nối r=30 (Y0) tới r=24 (Y3)
  for (const deg of [30, 150]) {
    const a = (deg * Math.PI) / 180;
    const dx = Math.cos(a), dz = Math.sin(a);
    const along = x * dx + z * dz; // toạ độ dọc bán kính
    if (along >= 24 && along <= 30) {
      const perp = Math.hypot(x - along * dx, z - along * dz);
      if (perp <= 1.5) list.push((3 * (30 - along)) / 6);
    }
  }
  return list;
}

// Mặt để đáp: mặt cao nhất <= y + tol. null nếu không có mặt nào đủ thấp.
export function landingSurface(surfaces, y, tol = 0.3) {
  if (surfaces === 'tower' || !surfaces.length) return null;
  let best = null;
  for (const h of surfaces) {
    if (h <= y + tol && (best === null || h > best)) best = h;
  }
  return best;
}

// Có mặt đất nào tại (x,z) không (để biết biển mây / rơi).
export function isVoid(night, x, z) {
  const cs = candidateSurfaces(night, x, z);
  return cs !== 'tower' && cs.length === 0;
}
