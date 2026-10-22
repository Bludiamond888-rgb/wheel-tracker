"""Wheel icon: 4 colored quadrants + white hub on a bright tile."""
from PIL import Image, ImageDraw
import os
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'icons')
COLS = [(59,130,246),(16,185,129),(245,158,11),(236,72,153)]
def icon(size, pad, bg=(255,255,255), rounded=False):
    S = size*4; im = Image.new('RGBA',(S,S),(0,0,0,0)); d = ImageDraw.Draw(im)
    if rounded: d.rounded_rectangle([0,0,S-1,S-1], radius=int(S*.22), fill=bg)
    else: d.rectangle([0,0,S,S], fill=bg)
    p = S*pad; box=[p,p,S-p,S-p]
    for i,c in enumerate(COLS): d.pieslice(box, -90+i*90+2, i*90-2, fill=c)
    r=(S-2*p)*.22; c=S/2; d.ellipse([c-r,c-r,c+r,c+r], fill=bg)
    r2=r*.45; d.ellipse([c-r2,c-r2,c+r2,c+r2], fill=(15,23,42))
    return im.resize((size,size), Image.LANCZOS)
os.makedirs(OUT, exist_ok=True)
icon(192,.12,rounded=True).save(f'{OUT}/icon-192.png'); icon(512,.12,rounded=True).save(f'{OUT}/icon-512.png')
icon(512,.2).save(f'{OUT}/icon-maskable-512.png'); icon(180,.12).convert('RGB').save(f'{OUT}/apple-touch-icon.png')
icon(32,.04,rounded=True).save(f'{OUT}/favicon-32.png'); print('ok')
