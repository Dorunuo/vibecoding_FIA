// Optional integration helper, NOT automatically installed into the game.
// Three.js/glTF axes: Y up. Player position is the bottom-centre (feet), not capsule centre.
// Conservative swept AABB against a bounding box around the player's cylinder/capsule.
// No stepping, slopes, wall sliding, or existing-overlap recovery is implemented here.
export function resolveTreasureBoxMove(start, end, radius, height, boxes) {
  if (!(radius > 0 && height > 0)) throw new Error('Positive radius and height required');
  const keys = ['x', 'y', 'z'];
  const delta = keys.map(k => end[k] - start[k]);
  const origin = keys.map(k => start[k]);
  let best = null;
  for (const box of boxes) {
    const c = box.center_threejs;
    const s = box.size_threejs;
    if (!Array.isArray(c) || !Array.isArray(s)) throw new Error('Use Three.js-coordinate box data');
    const min = [c[0] - s[0]/2 - radius, c[1] - s[1]/2 - height + 1e-6, c[2] - s[2]/2 - radius];
    const max = [c[0] + s[0]/2 + radius, c[1] + s[1]/2 - 1e-6, c[2] + s[2]/2 + radius];
    if (origin.every((v,i) => v > min[i] + 1e-7 && v < max[i] - 1e-7)) {
      return { position: {...start}, blocked: true, initialOverlap: true, boxId: box.id, normal: null };
    }
    let near = -Infinity, far = Infinity, normal = [0,0,0], missed = false;
    for (let i = 0; i < 3; ++i) {
      if (Math.abs(delta[i]) < 1e-10) {
        if (origin[i] < min[i] || origin[i] > max[i]) { missed = true; break; }
      } else {
        let a = (min[i] - origin[i]) / delta[i];
        let b = (max[i] - origin[i]) / delta[i];
        if (a > b) [a,b] = [b,a];
        if (a > near) { near = a; normal = [0,0,0]; normal[i] = delta[i] > 0 ? -1 : 1; }
        far = Math.min(far,b);
        if (near > far) { missed = true; break; }
      }
    }
    if (!missed && near >= -1e-8 && near <= 1 && far >= 0 && (!best || near < best.t)) {
      best = {t: Math.max(0,near), normal, boxId: box.id};
    }
  }
  if (!best) return {position: {...end}, blocked:false, initialOverlap:false, normal:null};
  const distance = Math.hypot(...delta);
  const t = Math.max(0, best.t - .002 / Math.max(distance, .002));
  return {
    position: Object.fromEntries(keys.map((k,i) => [k,origin[i]+delta[i]*t])),
    blocked:true, initialOverlap:false, boxId:best.boxId,
    normal:Object.fromEntries(keys.map((k,i)=>[k,best.normal[i]]))
  };
}
