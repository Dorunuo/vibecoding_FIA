import json,math
from pathlib import Path

def reserve_interactions(manifest,out):
    R=.75;H=manifest.get('character_height',1.79);points=[];checks=[]
    for treasure in manifest['treasures']:
        ident=treasure['id'];li=treasure['level'];x,y,_=treasure['position'];z=-(li-1)*5
        dirt=treasure['type']=='dirt_mound';front=2.05 if dirt else 1.45;side=2.05 if dirt else 1.60
        for name,dx,dy in [('Front',0,-front),('Left',-side,0),('Right',side,0)]:
            px,py=x+dx,y+dy;blocked=[]
            if abs(px)+R>24.75 or abs(py)+R>14.75:blocked.append('outer_boundary')
            for co in manifest['colliders']:
                cx,cy,cz=co['center'];sx,sy,sz=co['size']
                if cz-sz/2>=z+H or cz+sz/2<=z+.05:continue
                dist=math.hypot(max(abs(px-cx)-sx/2,0),max(abs(py-cy)-sy/2,0))
                if dist<R-1e-5:blocked.append(co['name'])
            for hole in manifest['holes']:
                if hole['level']==li:
                    x0,x1,y0,y1=hole['bounds'];dist=math.hypot(max(x0-px,px-x1,0),max(y0-py,py-y1,0))
                    if dist<R:blocked.append('open_hole')
            for h in manifest.get('hazards',[]):
                if h['level']==li:
                    cx,cy,_=h['position'];sx,sy=h['footprint'];dist=math.hypot(max(abs(px-cx)-sx/2,0),max(abs(py-cy)-sy/2,0))
                    if dist<R:blocked.append('spike_hazard_'+str(h['id']))
            # Soil has an irregular radius below 1.23m; keep the player's reserved circle outside it.
            if dirt and math.hypot(dx,dy)<1.25+R:blocked.append('soil_work_area_overlap')
            maxrange=2.30 if dirt else 1.90
            p={'name':f'Interaction_Treasure_{ident}_{name}','treasure_id':ident,'level':li,'preferred':name=='Front','position':[px,py,z],'position_threejs':[px,z,-py],'reserved_body_turn_radius':R,'reserved_height':H,'facing_direction_blender':[-dx/math.hypot(dx,dy),-dy/math.hypot(dx,dy),0],'recommended_interaction_range':maxrange,'animation_runtime_tested':False}
            points.append(p);checks.append({'name':p['name'],'clear':not blocked,'blocked_by':blocked,'ground_distance_to_target':math.hypot(dx,dy),'within_recommended_range':math.hypot(dx,dy)<=maxrange})
    assert all(c['clear'] and c['within_recommended_range'] for c in checks),checks
    manifest['interaction_points']=points
    for t in manifest['treasures']:t['interaction_points']=[p['name'] for p in points if p['treasure_id']==t['id']]
    Path(out,'treasure_interaction_points.json').write_text(json.dumps({'units':'meters','player_radius_for_geometry_checks':manifest['recommended_player_radius'],'reserved_radius':R,'points':points,'runtime_animation_tested':False,'instruction':'Approach from one of these feet positions; never teleport the player to the treasure centre. Final dig/open animations still require game testing.'},ensure_ascii=False,indent=2),encoding='utf-8')
    Path(out,'interaction_space_validation.json').write_text(json.dumps({'method':'Cylindrical standing/turning space against AABBs, holes, hazards and conservative soil radius; game animations not executed.','checks':checks,'all_reserved_spaces_clear':True},ensure_ascii=False,indent=2),encoding='utf-8')
    return points
