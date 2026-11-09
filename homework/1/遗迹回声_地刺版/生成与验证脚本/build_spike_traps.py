import bpy,json,math,contextlib,io
from pathlib import Path
from mathutils import Vector
BASE=Path(r'C:\Users\Mis\Documents\deepseek-harness\default-workspace');OUT=BASE/'遗迹回声_地刺版'
s=bpy.data.scenes.get('遗迹回声_金光寻宝版')
if not s:raise RuntimeError('Expected gold treasure scene; reopen the gold project before building traps.')
bpy.context.window.scene=s
manifest=json.loads((OUT/'level_manifest_blender.json').read_text(encoding='utf-8'))
levels=[bpy.data.collections[n] for n in ['L1_GrandHall','L2_Archives','L3_SunkenSanctum']]
proxycol=bpy.data.collections.new('COLLISION_SpikeTraps');s.collection.children.link(proxycol)

def mat(name,color,metallic,rough):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    nodes=m.node_tree.nodes;bs=next((n for n in nodes if n.type=='BSDF_PRINCIPLED'),None) or nodes.new('ShaderNodeBsdfPrincipled');out=next((n for n in nodes if n.type=='OUTPUT_MATERIAL'),None) or nodes.new('ShaderNodeOutputMaterial');m.node_tree.links.new(bs.outputs['BSDF'],out.inputs['Surface']);bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Metallic'].default_value=metallic;bs.inputs['Roughness'].default_value=rough
    return m
black=mat('Trap_Deep_Black_Iron',(.008,.010,.009),.22,.65)
plate_mat=mat('Trap_Charcoal_Base',(.024,.022,.018),.16,.86)
proxy_mat=mat('Trap_Proxy_Debug',(.65,.06,.02),0,1)
faces=[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
def mesh(name,vs,fs,material,c,parent=None,loc=(0,0,0)):
    me=bpy.data.meshes.new(name);me.from_pydata(vs,[],fs);me.update();o=bpy.data.objects.new(name,me);c.objects.link(o);o.parent=parent;o.location=loc;me.materials.append(material);return o

def box(name,loc,size,material,c,parent=None):
    sx,sy,sz=size
    vs=[(a*sx/2,b*sy/2,cc*sz/2) for a,b,cc in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
    return mesh(name,vs,faces,material,c,parent,loc)

traps=[];validation=[]
for i,hole in enumerate(manifest['holes'],1):
    x,y,z=hole['landing'];li=hole['destination_level'];c=levels[li-1]
    root=bpy.data.objects.new(f'Trap_{i}_Root',None);c.objects.link(root);root.parent=bpy.data.objects[f'Level_{li}_Root'];root.location=(x,y,z);root['hazard_type']='static_spikes';root['damage_logic_implemented']=False
    base=box(f'Trap_{i}_Base',(0,0,.05),(2.2,2.2,.10),plate_mat,c,root)
    spikes=[]
    for row in range(4):
        for col in range(4):
            height=[.78,.88,.98][(row+col*2)%3];n=6;phase=(row+col)*.27
            vs=[(.17*math.cos(k*2*math.pi/n+phase),.17*math.sin(k*2*math.pi/n+phase),0) for k in range(n)]+[(0,0,height)]
            fs=[tuple(reversed(range(n)))]+[(k,(k+1)%n,n) for k in range(n)]
            o=mesh(f'Trap_{i}_Spike_{row*4+col+1:02}',vs,fs,black,c,root,(-.75+.5*col,-.75+.5*row,.10));o['low_poly_cone_sides']=6;spikes.append(o)
    # Solid collision only for the thin base. Spike volume is a trigger, not an invisible wall.
    proxy=box(f'COLLIDER_Trap_{i}_Base',(0,0,.05),(2.2,2.2,.10),proxy_mat,proxycol,root)
    bpy.ops.object.select_all(action='DESELECT');proxy.select_set(True);bpy.context.view_layer.objects.active=proxy
    bpy.ops.rigidbody.object_add(type='PASSIVE');proxy.rigid_body.collision_shape='BOX';proxy.rigid_body.use_margin=True;proxy.rigid_body.collision_margin=.005
    proxy.hide_render=True;proxy.display_type='WIRE';proxy['collision_only']=True;proxy['isTrigger']=False
    trigger=box(f'TRIGGER_Trap_{i}',(0,0,.55),(2.2,2.2,1.10),proxy_mat,proxycol,root)
    trigger.hide_render=True;trigger.display_type='WIRE';trigger['collision_only']=True;trigger['isTrigger']=True;trigger['hazard_id']=i;trigger['damage_amount']='To be defined by game logic'
    ld=bpy.data.lights.new(f'Trap_{i}_Subtle_Edge_Light','POINT');ld.energy=40;ld.color=(.8,.70,.5);ld.shadow_soft_size=.65
    lamp=bpy.data.objects.new(ld.name,ld);c.objects.link(lamp);lamp.parent=root;lamp.location=(.9,-.6,1.7)
    hazard={'id':i,'type':'static_spikes','source_hole_level':hole['level'],'level':li,'root':root.name,'spike_count':16,'cone_sides':6,'footprint':[2.2,2.2],'spike_height_range':[.78,.98],'highest_tip_above_floor':1.08,'position':[x,y,z],'trigger_center':[x,y,z+.55],'trigger_size':[2.2,2.2,1.10],'trigger_only':True,'trigger_node':trigger.name,'base_collider':proxy.name,'damage_logic_implemented':False,'damage_amount':None}
    traps.append(hazard)
    hole['hazard_below']=i;hole['landing_is_safe']=False;hole['warning']='Permanent ochre hole lip; deep black spikes underneath. Damage/falling logic must be implemented in the game.'
    manifest['colliders'].append({'name':proxy.name,'center':[x,y,z+.05],'size':[2.2,2.2,.10],'type':'solid_base_only'})
    bpy.context.view_layer.update()
    outside=[]
    for o in [base]+spikes:
        for v in o.data.vertices:
            q=o.matrix_world@v.co-Vector((x,y,z))
            if abs(q.x)>1.1+1e-5 or abs(q.y)>1.1+1e-5 or q.z<-.00001 or q.z>1.10+1e-5:outside.append(o.name);break
    aligned=abs(root.matrix_world.translation.x-hole['center'][0])<1e-5 and abs(root.matrix_world.translation.y-hole['center'][1])<1e-5
    validation.append({'id':i,'spikes':len(spikes),'all_meshes_inside_trigger':not outside,'outside_meshes':outside,'aligned_with_hole':aligned,'base_is_passive_box':proxy.rigid_body.type=='PASSIVE' and proxy.rigid_body.collision_shape=='BOX','visual_triangles':sum(len(p.vertices)-2 for o in [base]+spikes for p in o.data.polygons)})
manifest['hazards']=traps;manifest['notes'].append('Spike revision: former clear hole landings are now intentional hazards. Hazard volumes are triggers, not solid full-height AABBs; only thin bases are solid.')
assert all(v['all_meshes_inside_trigger'] and v['aligned_with_hole'] and v['base_is_passive_box'] and v['spikes']==16 for v in validation),validation
ns={'__name__':'interaction_reservation'}
exec(compile((BASE/'reserve_treasure_interactions.py').read_text(encoding='utf-8'),'reserve_treasure_interactions.py','exec'),ns)
interaction_points=ns['reserve_interactions'](manifest,OUT)
for p in interaction_points:
    root=bpy.data.objects[f"Treasure_{p['treasure_id']}_Root"]
    ob=bpy.data.objects.new(p['name'],None);bpy.data.collections['Gameplay_Markers'].objects.link(ob);ob.parent=root
    x,y,z=p['position'];tx,ty,tz=root.location;ob.location=(x-tx,y-ty,z-tz);ob.empty_display_type='CIRCLE';ob.empty_display_size=p['reserved_body_turn_radius'];ob['interaction_marker']=True
    root['interaction_points_json']=json.dumps([q for q in interaction_points if q['treasure_id']==p['treasure_id']])
(OUT/'level_manifest_blender.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
(OUT/'trap_collision_and_triggers.json').write_text(json.dumps({'units':'meters','blender_axes':'Z up','traps':[{**h,'position_threejs':[h['position'][0],h['position'][2],-h['position'][1]],'trigger_center_threejs':[h['trigger_center'][0],h['trigger_center'][2],-h['trigger_center'][1]],'trigger_size_threejs':[2.2,1.10,2.2]} for h in traps],'game_damage_implemented':False},ensure_ascii=False,indent=2),encoding='utf-8')
(OUT/'trap_geometry_validation.json').write_text(json.dumps(validation,ensure_ascii=False,indent=2),encoding='utf-8')
for filename,objects,lights in [('遗迹回声_金光遗迹.glb',[o for c in levels for o in c.all_objects],True),('遗迹回声_地刺碰撞与触发.glb',list(proxycol.objects),False)]:
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    with contextlib.redirect_stdout(io.StringIO()):bpy.ops.export_scene.gltf(filepath=str(OUT/filename),export_format='GLB',use_selection=True,export_yup=True,export_lights=lights,export_extras=True)
for i,h in enumerate(traps,1):
    li=h['level'];x,y,z=h['position']
    pv=bpy.data.scenes['Preview_L'+str(li)];pv.render.filepath=str(OUT/f'gold_level_{li}.png');bpy.ops.render.render(write_still=True,scene=pv.name)
    pv2=bpy.data.scenes.new(f'Preview_Spikes{i}');pv2.world=s.world
    inst=bpy.data.objects.new('Spike_Level_Instance',None);inst.instance_type='COLLECTION';inst.instance_collection=levels[li-1];inst.location.z=-z;pv2.collection.objects.link(inst)
    cd=bpy.data.cameras.new('Spike_Detail_Camera');cd.type='PERSP';cd.lens=46
    camera=bpy.data.objects.new(cd.name,cd);pv2.collection.objects.link(camera);camera.location=(x+3.3,y-3.8,2.6) if i==1 else (x-2.8,y+3.6,2.6);camera.rotation_euler=(Vector((x,y,.45))-camera.location).to_track_quat('-Z','Y').to_euler();pv2.camera=camera
    pv2.render.engine='CYCLES';pv2.cycles.samples=32;pv2.cycles.use_denoising=True;pv2.view_settings.exposure=.8;pv2.render.resolution_x=1100;pv2.render.resolution_y=850;pv2.render.resolution_percentage=100;pv2.render.filepath=str(OUT/f'trap_{i}_detail.png');bpy.ops.render.render(write_still=True,scene=pv2.name)
    pit=bpy.data.scenes.new(f'Preview_HoleToSpikes{i}');pit.world=s.world
    for levelidx in [li-2,li-1]:
        ob=bpy.data.objects.new('Fall_View_Level',None);ob.instance_type='COLLECTION';ob.instance_collection=levels[levelidx];ob.location.z=-z;pit.collection.objects.link(ob)
    cd2=bpy.data.cameras.new('Hole_Downward_Camera');cd2.lens=40
    cam=bpy.data.objects.new(cd2.name,cd2);pit.collection.objects.link(cam);cam.location=(x+.1,y-.15,6.3);cam.rotation_euler=(Vector((x,y,.2))-cam.location).to_track_quat('-Z','Y').to_euler();pit.camera=cam
    pit.render.engine='CYCLES';pit.cycles.samples=32;pit.cycles.use_denoising=True;pit.view_settings.exposure=.65;pit.render.resolution_x=900;pit.render.resolution_y=900;pit.render.resolution_percentage=100;pit.render.filepath=str(OUT/f'hole_{i}_spikes_below.png');bpy.ops.render.render(write_still=True,scene=pit.name)
for o in proxycol.objects:o.hide_set(True)
s.name='遗迹回声_地刺陷阱版';s['damage_logic_implemented']=False;bpy.context.window.scene=s
for image in bpy.data.images:
    if image.source=='FILE':image.pack()
assert sum(len(p.vertices)-2 for o in bpy.data.collections['Explorer_Character'].all_objects if o.type=='MESH' for p in o.data.polygons)==1000
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'遗迹回声_地刺陷阱版.blend'))
print(json.dumps({'traps':validation,'game_damage_implemented':False,'saved':str(OUT/'遗迹回声_地刺陷阱版.blend')},ensure_ascii=True))
