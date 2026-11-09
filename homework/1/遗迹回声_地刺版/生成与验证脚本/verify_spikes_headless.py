import bpy,json,contextlib,io
from pathlib import Path
P=Path(r'C:\Users\Mis\Documents\deepseek-harness\default-workspace\遗迹回声_地刺版')
reports=[]
for path in sorted(P.glob('*.glb')):
    before=set(bpy.data.objects)
    with contextlib.redirect_stdout(io.StringIO()):bpy.ops.import_scene.gltf(filepath=str(path))
    created=set(bpy.data.objects)-before;meshes=[o for o in created if o.type=='MESH'];images=set()
    for o in meshes:
        for slot in o.material_slots:
            if slot.material and slot.material.use_nodes:
                for n in slot.material.node_tree.nodes:
                    if n.type=='TEX_IMAGE' and n.image:images.add(n.image)
    reports.append({'file':path.name,'import_success':bool(meshes),'imported_mesh_objects':len(meshes),'triangles':sum(len(p.vertices)-2 for o in meshes for p in o.data.polygons),'textured_meshes_have_uv':all(bool(o.data.uv_layers) for o in meshes if any(s.material and s.material.use_nodes and any(n.type=='TEX_IMAGE' for n in s.material.node_tree.nodes) for s in o.material_slots)),'image_count':len(images),'missing_image_files':[im.name for im in images if not im.packed_file and not Path(bpy.path.abspath(im.filepath)).is_file()],'method':'Independent background Blender import, no UI scene switching or deletion'})
    (P/'blender_reimport_validation.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2),encoding='utf-8')
    print('Verified',path.name,len(meshes),flush=True)
with bpy.data.libraries.load(str(P/'遗迹回声_地刺陷阱版.blend'),link=False) as (data_from,data_to):
    names=list(data_from.objects);scenes=list(data_from.scenes)
assert len([n for n in names if n.startswith('Trap_') and '_Spike_' in n])==32
assert '遗迹回声_地刺陷阱版' in scenes
print(json.dumps(reports,ensure_ascii=True,indent=2),flush=True)
