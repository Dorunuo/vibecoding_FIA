from pathlib import Path
import shutil,json
src=Path('遗迹回声_金光版');dst=Path('遗迹回声_地刺版');dst.mkdir(exist_ok=True)
skip={'SHA256.json','验证摘要.json','layout_validation.json','blender_reimport_validation.json'}
for p in src.iterdir():
    if p.is_file() and p.suffix not in ['.blend','.blend1','.blend2'] and p.name not in skip:shutil.copyfile(p,dst/p.name)
# Retain gold treasure instructions, with a clear current project-name note.
p=dst/'金光寻宝与碰撞说明.md'
text=p.read_text(encoding='utf-8')
p.write_text('> 本包已升级为地刺版，当前主工程是「遗迹回声_地刺陷阱版.blend」。金光模型、木盒碰撞与下面的接入说明仍适用。\n\n'+text,encoding='utf-8')
manifest=json.loads((src/'level_manifest_blender.json').read_text(encoding='utf-8'))
report=[]
for idx,h in enumerate(manifest['holes'],1):
    x,y,z=h['landing'];half=1.1;clear=True;obstacles=[]
    for co in manifest['colliders']:
        cx,cy,cz=co['center'];sx,sy,sz=co['size']
        if cz+sz/2<=z+.02 or cz-sz/2>=z+1.15:continue
        if abs(cx-x)<half+sx/2 and abs(cy-y)<half+sy/2:clear=False;obstacles.append(co['name'])
    nearest=min(((x-st[ep][0])**2+(y-st[ep][1])**2)**.5 for st in manifest['stairs'] for ep in ['top','bottom'] if abs(st[ep][2]-z)<.1)
    report.append({'trap_id':idx,'destination_level':h['destination_level'],'center':[x,y,z],'area_clear_before_trap':clear,'obstacles':obstacles,'nearest_same_floor_stair_endpoint_m':nearest})
assert all(r['area_clear_before_trap'] for r in report),report
(dst/'trap_placement_precheck.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=True,indent=2))
