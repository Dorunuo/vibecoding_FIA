import fs from 'node:fs';
import assert from 'node:assert/strict';
import {resolveTreasureBoxMove as move} from './遗迹回声_地刺版/treasure_box_collision.mjs';
const data=JSON.parse(fs.readFileSync('./遗迹回声_地刺版/treasure_collision.json','utf8'));
const results=[];
const R=.62,H=1.79;
for (const box of data.boxes) {
  const [x,y,z]=box.center_threejs,[sx,sy,sz]=box.size_threejs,ground=y-sy/2,top=y+sy/2;
  const test=(name,start,end,expect)=>{
    const r=move(start,end,R,H,[box]);expect(r);
    results.push({box:box.id,name,passed:true,blocked:r.blocked,initialOverlap:r.initialOverlap});
  };
  test('front_to_back_blocked',{x,y:ground,z:z+3},{x,y:ground,z:z-3},r=>{assert(r.blocked);assert(r.position.z>=z+sz/2+R)});
  test('side_to_side_blocked',{x:x-3,y:ground,z},{x:x+3,y:ground,z},r=>{assert(r.blocked);assert(r.position.x<=x-sx/2-R)});
  test('fast_move_no_tunnelling',{x,y:ground,z:z+30},{x,y:ground,z:z-30},r=>assert(r.blocked));
  test('fall_lands_above_lid',{x,y:top+3,z},{x,y:ground-2,z},r=>{assert(r.blocked);assert(r.position.y>=top);assert.equal(r.normal.y,1)});
  test('walk_above_lid_allowed',{x:x-2,y:top+.01,z},{x:x+2,y:top+.01,z},r=>assert(!r.blocked));
  test('jump_over_box_allowed',{x,y:top+.10,z:z+3},{x,y:top+.10,z:z-3},r=>assert(!r.blocked));
  test('side_bypass_allowed',{x:x+sx/2+R+.05,y:ground,z:z+3},{x:x+sx/2+R+.05,y:ground,z:z-3},r=>assert(!r.blocked));
  test('existing_overlap_reported',{x,y:ground,z},{x:x+.01,y:ground,z},r=>assert(r.initialOverlap));
  test('stationary_outside_allowed',{x:x+3,y:ground,z},{x:x+3,y:ground,z},r=>assert(!r.blocked));
  test('move_away_from_boundary_allowed',{x:x+sx/2+R+.001,y:ground,z},{x:x+sx/2+R+1,y:ground,z},r=>assert(!r.blocked));
}
fs.writeFileSync('./遗迹回声_地刺版/collision_helper_tests.json',JSON.stringify({algorithm:'Conservative 3D swept AABB; tests are not actual game integration.',tests:results,passed:results.length},null,2));
console.log(`Passed ${results.length} independent box-collision tests.`);
