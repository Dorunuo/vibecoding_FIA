from pathlib import Path
import json
P=Path('遗迹回声_地刺版');m=json.loads((P/'level_manifest_blender.json').read_text(encoding='utf-8'))
def vec(v):return [v[0],v[2],-v[1]]
def size(v):return [v[0],v[2],v[1]]
n={'name':m['name'],'units':'meters','axes':'Three.js / glTF: Y up, ground XZ','source':'level_manifest_blender.json','floor_heights':[0,-5,-10],'size_xz':[50,30],'recommended_player_radius':m['recommended_player_radius'],'character_height':m['character_height'],'spawn':vec(m['spawn']),'exit':vec(m['exit']),'colliders':[],'floor_tiles':[],'stairs':[],'holes':[],'crystals':[],'rooms':[]}
for kind in ['colliders','floor_tiles']:
    for co in m[kind]:
        cc=dict(co);cc['center']=vec(co['center']);cc['size']=size(co['size']);n[kind].append(cc)
for st in m['stairs']:
    q=dict(st)
    for key in ['top','bottom']:q[key]=vec(st[key])
    q['ramp_corners']=[vec(v) for v in st['ramp_corners']];n['stairs'].append(q)
for h in m['holes']:
    q=dict(h);x0,x1,y0,y1=q.pop('bounds');q['bounds_xz']=[x0,x1,-y1,-y0]
    for key in ['center','landing']:q[key]=vec(h[key])
    n['holes'].append(q)
for r in m['crystals']:
    q=dict(r);q['position']=vec(r['position']);n['crystals'].append(q)
n['treasures']=[{**r,'position':vec(r['position'])} for r in m.get('treasures',[])]
n['mesh_colliders']=m.get('mesh_colliders',[])
for r in m['rooms']:
    q=dict(r);q['center']=vec(r['center']);q['approx_size_xz']=q.pop('approx_size');n['rooms'].append(q)
n['hazards']=[{**h,'position':vec(h['position']),'trigger_center':vec(h['trigger_center']),'trigger_size':size(h['trigger_size'])} for h in m.get('hazards',[])]
n['interaction_points']=[{**p,'position':vec(p['position']),'facing_direction':vec(p['facing_direction_blender'])} for p in m.get('interaction_points',[])]
(P/'level_manifest_threejs.json').write_text(json.dumps(n,ensure_ascii=False,indent=2),encoding='utf-8')
print('Three.js Y-up coordinate manifest exported.')
