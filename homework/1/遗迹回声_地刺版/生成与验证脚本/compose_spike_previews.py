from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json
P=Path('遗迹回声_地刺版');m=json.loads((P/'level_manifest_blender.json').read_text(encoding='utf-8'))
f=ImageFont.truetype(r'C:\Windows\Fonts\msyh.ttc',26);sm=ImageFont.truetype(r'C:\Windows\Fonts\msyh.ttc',17)
im=Image.new('RGB',(1500,730),'#121b1c');d=ImageDraw.Draw(im);d.text((25,18),'遗迹回声  /  深黑低模地刺',font=f,fill='#e2d9bd')
for i,label in enumerate(['第一处洞口下方 · 二层','第二处洞口下方 · 三层'],1):
    x=20+(i-1)*745;src=Image.open(P/f'trap_{i}_detail.png').convert('RGB').resize((720,556));im.paste(src,(x,100));d.text((x+10,66),label,font=sm,fill='#b7c4af')
d.text((25,676),'每组16根六棱圆锥尖刺，保持深黑色；位置在侧房洞口下方，避开宝藏交互站位。',font=sm,fill='#c4c6b5')
d.text((25,706),'Blender 渲染示意，非实际游戏截图；伤害和最终动作判定尚未接入游戏。',font=sm,fill='#b8a685');im.save(P/'地刺陷阱_预览.png')
# Coordinate-accurate top plans; green circles show reserved standing/turning cylinders.
im=Image.new('RGB',(1800,600),'#161d1d');d=ImageDraw.Draw(im);d.text((25,18),'陷阱与宝藏交互空间  /  平面示意',font=f,fill='#e2d9bd')
S=10
for li in [1,2,3]:
    ox=50+(li-1)*590;oy=100
    def xy(x,y):return (ox+(x+25)*S,oy+(15-y)*S)
    def rect(cx,cy,sx,sy,fill,outline=None):
        a=xy(cx-sx/2,cy+sy/2);b=xy(cx+sx/2,cy-sy/2);d.rectangle((*a,*b),fill=fill,outline=outline)
    d.text((ox,70),f'{li}层',font=sm,fill='#d5d3b7');rect(0,0,50,30,'#322b21','#8b7e5a');z=-(li-1)*5
    for c in m['colliders']:
        x,y,zz=c['center'];sx,sy,sz=c['size']
        if zz-sz/2>=z+1.79 or zz+sz/2<=z+.05:continue
        rect(x,y,sx,sy,'#6e6856')
    for hole in m['holes']:
        if hole['level']==li:
            x0,x1,y0,y1=hole['bounds'];rect((x0+x1)/2,(y0+y1)/2,x1-x0,y1-y0,'#101212','#b29142')
    for h in m['hazards']:
        if h['level']==li:
            x,y,_=h['position'];rect(x,y,2.2,2.2,'#030504','#bc6c50')
            for row in range(4):
                for col in range(4):
                    px,py=xy(x-.75+.5*col,y-.75+.5*row);d.polygon([(px,py-2),(px-2,py+2),(px+2,py+2)],fill='#77725d')
    for t in m['treasures']:
        if t['level']==li:
            x,y,_=t['position'];px,py=xy(x,y)
            if t['type']=='dirt_mound':d.ellipse((px-11,py-11,px+11,py+11),fill='#80633c',outline='#c5a354')
            else:rect(x,y,1.36,1.08,'#9c7437','#ecd184')
            d.text((px+13,py-22),f"T{t['id']}",font=sm,fill='#ebcd77')
    for p in m['interaction_points']:
        if p['level']==li:
            px,py=xy(*p['position'][:2]);rr=p['reserved_body_turn_radius']*S
            d.ellipse((px-rr,py-rr,px+rr,py+rr),outline='#7bd594',width=2)
            d.ellipse((px-1,py-1,px+1,py+1),fill='#dcf0cb')
    d.text((ox,420),'绿色圆圈：已检查的站位 / 转身空间',font=sm,fill='#8fd2a0')
    d.text((ox,450),'金色：土堆或木盒   黑色红边：地刺',font=sm,fill='#cbb585')
d.text((25,510),'每处宝藏保留正面及左右共3处站位，检查半径0.75米；交互时面向目标，不把人物移到宝藏中心。',font=sm,fill='#d2d5bf')
d.text((25,546),'图中空间与路线通过几何采样；最终挖掘/开盒动作、镜头和触发距离仍需实际游戏复测。',font=sm,fill='#b5b7a6')
im.save(P/'地刺与交互空间_平面示意.png');print('Spike preview and interaction-space plan generated.')
