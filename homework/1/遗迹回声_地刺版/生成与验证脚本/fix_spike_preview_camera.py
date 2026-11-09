import bpy
from pathlib import Path
from mathutils import Vector
P=Path(r'C:\Users\Mis\Documents\deepseek-harness\default-workspace\遗迹回声_地刺版')
pv=bpy.data.scenes['Preview_Spikes2'];cam=pv.camera;x,y=-13.75,-11.25
cam.location=(x-2.8,y+3.6,2.6);cam.rotation_euler=(Vector((x,y,.45))-cam.location).to_track_quat('-Z','Y').to_euler()
pv.render.filepath=str(P/'trap_2_detail.png');bpy.ops.render.render(write_still=True,scene=pv.name)
bpy.context.window.scene=bpy.data.scenes['遗迹回声_地刺陷阱版']
bpy.ops.wm.save_as_mainfile(filepath=str(P/'遗迹回声_地刺陷阱版.blend'))
print('Second trap detail camera moved inside room, render regenerated, project saved.')
