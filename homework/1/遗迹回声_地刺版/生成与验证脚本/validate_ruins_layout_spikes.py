from pathlib import Path
from collections import deque
import json,math
P=Path('遗迹回声_地刺版');m=json.loads((P/'level_manifest_blender.json').read_text(encoding='utf-8'))
R=m.get('recommended_player_radius',.32);H=m.get('character_height',1.75);STEP=.5

def world(k):return (-24.5+k[0]*STEP,-14.5+k[1]*STEP)
def key(x,y):return (round((x+24.5)/STEP),round((y+14.5)/STEP))
def inrect(x,y,b,pad=0):return b[0]-pad<x<b[1]+pad and b[2]-pad<y<b[3]+pad

def valid(li,k):
    x,y=world(k);z=-(li-1)*5
    if abs(x)>24.5-R or abs(y)>14.5-R:return False
    for co in m['colliders']:
        cx,cy,cz=co['center'];sx,sy,sz=co['size']
        if cz-sz/2>=z+H or cz+sz/2<=z+.05:continue
        if abs(x-cx)<sx/2+R and abs(y-cy)<sy/2+R:return False
    for hole in m['holes']:
        if hole['level']==li and inrect(x,y,hole['bounds'],R):return False
    for hz in m.get('hazards',[]):
        if hz['level']==li:
            cx,cy,_=hz['position'];sx,sy=hz['footprint']
            if abs(x-cx)<sx/2+R and abs(y-cy)<sy/2+R:return False
    for st in m['stairs']:
        if st['from_level']==li:
            xx,yy,zz=st['top']
            if xx-2.5-R<x<xx+2.5+R and yy-R<y<yy+10+R:return False
        if st['to_level']==li:
            # Physical stairs are not walkable floor; use virtual stair edge instead.
            xx,yy,zz=st['top']
            if xx-1.75-R<x<xx+1.75+R and yy-R<y<yy+10-R:return False
    return True

def nearest(li,x,y):
    k=key(x,y)
    candidates=[(k[0]+a,k[1]+b) for a in range(-3,4) for b in range(-3,4)]
    candidates.sort(key=lambda p:(world(p)[0]-x)**2+(world(p)[1]-y)**2)
    return next((c for c in candidates if valid(li,c)),None)

def flood(li,start):
    q=deque([start]);seen={start}
    while q:
        a,b=q.popleft()
        for kk in [(a+1,b),(a-1,b),(a,b+1),(a,b-1)]:
            if kk not in seen and valid(li,kk):seen.add(kk);q.append(kk)
    return seen
report={'method':f'0.5m 2D floor sampling per layer; radius {R}m, body {H}m; virtual stair links. Not game physics acceptance.','levels':[],'holes':[],'failures':[]}
starts=[m['spawn'][:2],[-20,1],[20,13.5]]
for li in range(1,4):
    start=nearest(li,*starts[li-1]);seen=flood(li,start)
    targets=[]
    for r in m['rooms']:
        if r['level']==li:targets.append((r['name'],r['center'][:2]))
    for relic in m['crystals']:
        if relic['level']==li:targets.append(('relic_'+str(relic['id']),relic['position'][:2]))
    for st in m['stairs']:
        if st['from_level']==li:targets.append((st['name']+'_top',[st['top'][0],st['top'][1]-.8]))
    for p in m.get('interaction_points',[]):
        if p['level']==li:targets.append((p['name'],p['position'][:2]))
    for hz in m.get('hazards',[]):
        if hz['level']==li:
            x,y,_=hz['position'];sx,sy=hz['footprint']
            targets.append((f"trap_{hz['id']}_left_bypass",[x-sx/2-R-.2,y]))
            targets.append((f"trap_{hz['id']}_right_bypass",[x+sx/2+R+.2,y]))
    if li==3:targets.append(('exit',m['exit'][:2]))
    checks=[]
    for name,xy in targets:
        k=nearest(li,*xy);ok=k in seen
        checks.append({'target':name,'reachable':ok,'sampled_position':world(k) if k else None})
        if not ok:report['failures'].append(f'L{li}:{name} unreachable')
    report['levels'].append({'level':li,'reachable_samples':len(seen),'checks':checks})
for h in m['holes']:
    x,y,z=h['landing'];li=h['destination_level'];safe=valid(li,key(x,y))
    distances=[]
    for st in m['stairs']:
        for ep in ['top','bottom']:
            sx,sy,sz=st[ep]
            if abs(sz-h['center'][2])<.1:distances.append(math.hypot(x-sx,y-sy))
    result={'from':h['level'],'landing_clear_at_player_radius':safe,'nearest_same_level_stair_endpoint_m':min(distances) if distances else None}
    report['holes'].append(result)
    result['intentionally_hazardous']=bool(h.get('hazard_below'))
    result['landing_description']='spikes intentionally placed below hole' if h.get('hazard_below') else 'normal landing'
    if not safe and not h.get('hazard_below'):report['failures'].append('Unexpected unsafe hole landing '+str(h['level']))
    if h.get('hazard_below') and safe:report['failures'].append('Expected hazard not excluded from route mask')
report['geometry_checks_passed']=not report['failures']
(P/'layout_validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=True,indent=2))
