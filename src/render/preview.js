// Chụp ảnh cảnh chơi thật (có cây/đá) cho README: node bin/bench.js --preview docs/media/gameplay.png [--night n]
import { GameView } from './view.js';
import { Simulation } from '../core/sim.js';

const q = new URLSearchParams(location.search), token = q.get('token'), night = Number(q.get('night') || 1);
const post = (path, body) => fetch(`/__bench/${path}?token=${token}`, { method: 'POST', body });
// Khung hình theo Đêm: Mây ở tầng ngoài, nhìn về phía hai đèn (một đèn đầy dầu, một đèn dầu < 30).
const SHOTS = {
  1: { player: [2, 0, 13], yaw: 0.12, lit: ['L1', 'L2'], shades: [[-5, 0, 19], [7, 0, 21]] },
  2: { player: [0, 0, 8], yaw: 0, lit: ['L1', 'L2'], shades: [[-5, 0, 14], [6, 0, 16]] },
  3: { player: [4, 0, 33], yaw: Math.PI, lit: ['L2', 'L3'], shades: [[-7, 0, 30], [9, 0, 28]] },
};
const shotCfg = SHOTS[night];
const sim = new Simulation({ seed: 42, night, creative: true, scenario: {
  random_motes: false, random_shades: false, random_drifters: false,
  player: { pos: shotCfg.player, carried: 7 },
  lanterns: [{ id: shotCfg.lit[0], lit: true, fuel: 82 }, { id: shotCfg.lit[1], lit: true, fuel: 22 }],
  shades: shotCfg.shades.map((pos, i) => ({ id: 'S' + (i + 1), pos, state: 'wander' })),
} });
const view = new GameView(document.getElementById('app'));
view.build(night, sim.obstacles);
let frames = 0;
async function loop() {
  view.sync(sim, {}); view.follow(sim, shotCfg.yaw); view.sync(sim, {}); view.render();
  if (++frames === 30) {
    await post('shot', view.renderer.domElement.toDataURL('image/png'));
    await post('result', JSON.stringify({ preview: true, obstacles: sim.obstacles.length }));
    return;
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
