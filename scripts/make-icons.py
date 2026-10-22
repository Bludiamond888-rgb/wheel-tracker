"""Wheel icon: navy tile, jewel-tone quadrants, gold-rimmed navy hub, gold pointer."""
from PIL import Image, ImageDraw
import os
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'icons')
COLS = [(61,111,214),(31,156,140),(201,150,44),(138,79,160)]
NAVY=(11,20,48); NAVY2=(17,29,63); GOLD=(212,175,55); GOLD2=(240,207,107)
def bg(S):
    im=Image.new('RGBA',(S,S)); d=ImageDraw.Draw(im)
    for y in range(S):
        t=y/S; d.line([(0,y),(S,y)],fill=tuple(int(NAVY2[k]*(1-t)+NAVY[k]*t) for k in range(3))+(255,))
    return im
def icon(size, pad, rounded=False):
    S=size*4; im=bg(S)
    if rounded:
        m=Image.new('L',(S,S),0); ImageDraw.Draw(m).rounded_rectangle([0,0,S-1,S-1],radius=int(S*.22),fill=255); im.putalpha(m)
    d=ImageDraw.Draw(im); p=S*pad; c=S/2; R=c-p
    d.ellipse([c-R,c-R,c+R,c+R],outline=GOLD,width=max(2,int(S*.012)))
    r=R*.9
    for i,col in enumerate(COLS): d.pieslice([c-r,c-r,c+r,c+r],-135+i*90+3,-45+i*90-3,fill=col)
    h=r*.42; d.ellipse([c-h,c-h,c+h,c+h],fill=GOLD)
    h2=h*.84; d.ellipse([c-h2,c-h2,c+h2,c+h2],fill=NAVY)
    h3=h*.3; d.ellipse([c-h3,c-h3,c+h3,c+h3],fill=GOLD2)
    w=R*.2; d.polygon([(c-w,c-R-w*.2),(c+w,c-R-w*.2),(c,c-R+w*1.3)],fill=GOLD2,outline=GOLD)
    return im.resize((size,size),Image.LANCZOS)
os.makedirs(OUT,exist_ok=True)
icon(192,.14,True).save(f'{OUT}/icon-192.png'); icon(512,.14,True).save(f'{OUT}/icon-512.png')
icon(512,.22).save(f'{OUT}/icon-maskable-512.png'); icon(180,.14).convert('RGB').save(f'{OUT}/apple-touch-icon.png')
icon(32,.06,True).save(f'{OUT}/favicon-32.png'); print('ok')
