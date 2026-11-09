from pathlib import Path
old=Path('validate_ruins_layout_gold.py').read_text(encoding='utf-8')
code=old.replace("Path('遗迹回声_金光版')","Path('遗迹回声_地刺版')")
needle="    for st in m['stairs']:\n"
block="    for hz in m.get('hazards',[]):\n        if hz['level']==li:\n            cx,cy,_=hz['position'];sx,sy=hz['footprint']\n            if abs(x-cx)<sx/2+R and abs(y-cy)<sy/2+R:return False\n"
assert code.count(needle)>=2
code=code.replace(needle,block+needle,1)
needle="    if li==3:targets.append(('exit',m['exit'][:2]))"
block="    for p in m.get('interaction_points',[]):\n        if p['level']==li:targets.append((p['name'],p['position'][:2]))\n    for hz in m.get('hazards',[]):\n        if hz['level']==li:\n            x,y,_=hz['position'];sx,sy=hz['footprint']\n            targets.append((f\"trap_{hz['id']}_left_bypass\",[x-sx/2-R-.2,y]))\n            targets.append((f\"trap_{hz['id']}_right_bypass\",[x+sx/2+R+.2,y]))\n"
assert needle in code;code=code.replace(needle,block+needle)
needle="    if not safe:report['failures'].append('Unsafe hole landing '+str(h['level']))"
new="    result['intentionally_hazardous']=bool(h.get('hazard_below'))\n    result['landing_description']='spikes intentionally placed below hole' if h.get('hazard_below') else 'normal landing'\n    if not safe and not h.get('hazard_below'):report['failures'].append('Unexpected unsafe hole landing '+str(h['level']))\n    if h.get('hazard_below') and safe:report['failures'].append('Expected hazard not excluded from route mask')"
assert needle in code;code=code.replace(needle,new)
compile(code,'validate_ruins_layout_spikes.py','exec');Path('validate_ruins_layout_spikes.py').write_text(code,encoding='utf-8')
code=Path('convert_manifest_threejs_gold.py').read_text(encoding='utf-8').replace("Path('遗迹回声_金光版')","Path('遗迹回声_地刺版')")
needle="(P/'level_manifest_threejs.json').write_text"
block="n['hazards']=[{**h,'position':vec(h['position']),'trigger_center':vec(h['trigger_center']),'trigger_size':size(h['trigger_size'])} for h in m.get('hazards',[])]\nn['interaction_points']=[{**p,'position':vec(p['position']),'facing_direction':vec(p['facing_direction_blender'])} for p in m.get('interaction_points',[])]\n"
assert needle in code;code=code.replace(needle,block+needle);Path('convert_manifest_threejs_spikes.py').write_text(code,encoding='utf-8')
code=Path('check_blender_reimport_gold.py').read_text(encoding='utf-8').replace('default-workspace\\遗迹回声_金光版','default-workspace\\遗迹回声_地刺版').replace("bpy.data.scenes['遗迹回声_金光寻宝版']","bpy.data.scenes['遗迹回声_地刺陷阱版']")
Path('check_blender_reimport_spikes.py').write_text(code,encoding='utf-8')
code=Path('test_gold_box_collision.mjs').read_text(encoding='utf-8').replace('遗迹回声_金光版','遗迹回声_地刺版')
Path('test_spike_revision_box_collision.mjs').write_text(code,encoding='utf-8')
print('Validators updated: hazards are avoided, former safe landings are intentionally hazardous, interaction stand points must be reachable.')
