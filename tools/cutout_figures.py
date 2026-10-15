"""Cuts out the licensed figure photos (Solaris Japan product shots and Epic Seven wiki art) to transparent tiles in assets/official/products/.
Run: python3 tools/cutout_figures.py <folder with <key>_0.jpg files> <folder with Epic Seven art>"""
import sys,os,glob
from PIL import Image
from rembg import remove,new_session
SRC,E7=sys.argv[1],sys.argv[2]
sess=new_session('isnet-general-use')
def tile(im,size=320,pad=.05):
    a=im.getchannel('A').point(lambda v:255 if v>16 else 0);b=a.getbbox();im=im.crop(b) if b else im
    s=int(max(im.size)*(1+pad*2));c=Image.new('RGBA',(s,s),(0,0,0,0));c.paste(im,((s-im.width)//2,(s-im.height)//2),im);return c.resize((size,size),Image.LANCZOS)
ONLY=os.environ.get('ONLY','').split(',') if os.environ.get('ONLY') else None
pick={k:int(v) for k,v in (x.split('=') for x in os.environ.get('PICK','').split(',') if x)}
for f in sorted(glob.glob(os.path.join(SRC,'*_0.jpg'))):
    k=os.path.basename(f)[:-6]
    if ONLY and k not in ONLY:continue
    f=os.path.join(SRC,f'{k}_{pick.get(k,0)}.jpg')
    cut=remove(Image.open(f).convert('RGB'),session=sess,post_process_mask=True)
    tile(cut).save(f'assets/official/products/{k}.webp','WEBP',quality=86,method=6);print('fig',k,flush=True)
E7MAP={'ras':'Ras_big.png','iseria':'Iseria_big.png','tamarinne':'Tamarinne_big.png','yufine':'Yufine_big.png','bellona':'Seaside_Bellona_big.png','ken':'Ken_big.png','diene':'x_Diene_big.png','vivian':'x_Vivian_big.png'}
for k,f in E7MAP.items():
    if ONLY and k not in ONLY:continue
    im=Image.open(os.path.join(E7,f)).convert('RGBA')
    if im.getchannel('A').getextrema()[0]>200:im=remove(im.convert('RGB'),session=sess,post_process_mask=True)
    tile(im).save(f'assets/official/products/{k}.webp','WEBP',quality=86,method=6);print('e7',k,flush=True)
