import bpy,json,contextlib,io
from pathlib import Path
P=Path(r'C:\Users\Mis\Documents\deepseek-harness\default-workspace\遗迹回声_地刺版')
original=bpy.context.window.scene
reports=[]
for path in sorted(P.glob('*.glb')):
    before=set(bpy.data.objects)
    temp=bpy.data.scenes.new('QA_Temporary_Import');bpy.context.window.scene=temp
    with contextlib.redirect_stdout(io.StringIO()):bpy.ops.import_scene.gltf(filepath=str(path))
    created=set(bpy.data.objects)-before
    meshes=[o for o in created if o.type=='MESH'];tri=sum(len(p.vertices)-2 for o in meshes for p in o.data.polygons)
    images=set()
    for o in meshes:
        for slot in o.material_slots:
            if slot.material and slot.material.use_nodes:
                for node in slot.material.node_tree.nodes:
                    if node.type=='TEX_IMAGE' and node.image:images.add(node.image)
    missing=[im.name for im in images if not im.packed_file and not Path(bpy.path.abspath(im.filepath)).is_file()]
    reports.append({'file':path.name,'import_success':bool(meshes),'imported_mesh_objects':len(meshes),'triangles':tri,'all_meshes_have_uv':all(bool(o.data.uv_layers) for o in meshes),'textured_meshes_have_uv':all(bool(o.data.uv_layers) for o in meshes if any(slot.material and slot.material.use_nodes and any(n.type=='TEX_IMAGE' for n in slot.material.node_tree.nodes) for slot in o.material_slots)),'image_count':len(images),'missing_image_files':missing})
    # Delete only objects known to be created by this verification import.
    bpy.context.window.scene=original
    for o in created:bpy.data.objects.remove(o,do_unlink=True)
    bpy.data.scenes.remove(temp)
(P/'blender_reimport_validation.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(reports,ensure_ascii=True,indent=2))
