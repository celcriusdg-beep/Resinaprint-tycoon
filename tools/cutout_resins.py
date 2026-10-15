"""Downloads official resin product photos, cuts out the background and keeps only the bottle.
Writes square transparent WebP tiles to assets/official/resins/.  Run: python3 tools/cutout_resins.py"""
import json,io,os,urllib.request
import numpy as np
from PIL import Image
from rembg import remove,new_session
UA={'User-Agent':'Mozilla/5.0'}
E='https://cdn.shopify.com/s/files/1/0684/4792/8423/files/';A='https://cdn.shopify.com/s/files/1/0245/5519/2380/files/';SI='https://cdn.shopify.com/s/files/1/0255/7539/1341/files/'
J=json.load(open('/tmp/rsn/imgs.json')) if os.path.exists('/tmp/rsn/imgs.json') else {}
SRC={k:J[k][0] for k in ('aplant','atough','aww','sblu','sten','ssculpt','estd','ewater','erapid','eabs','mono') if k in J}
if 'siraya' in J:SRC['siraya']=J['siraya'][6]
FORM='https://formlabs-media.formlabs.com/filer_public/5c/c1/5cc1c4db-5db1-490c-9146-755d0bdcceb2/optimized_for_web_png-f41l_color_base_v1_resin_spine_label_02_no_shadow.png'
sess=new_session('isnet-general-use')
def fetch(u):
    u=u.split('?')[0]+('?width=1000' if 'shopify' in u else '')
    return Image.open(io.BytesIO(urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=60).read()))
def first_object(im):
    """keep only the bottle: the leftmost run of columns that are mostly filled (slivers of the model next to it are thin)"""
    a=np.asarray(im.getchannel('A'))>40;rows=np.where(a.any(1))[0]
    if not len(rows):return im
    h=rows.max()-rows.min();cols=a.sum(0);good=cols>h*.3;nz=np.where(good)[0]
    if not len(nz):return im
    x0=nz[0];x=x0
    while x<a.shape[1] and good[x]:x+=1
    out=im.crop((max(0,x0-2),0,min(a.shape[1],x+2),a.shape[0]))
    return out
def tile(im,size=320,pad=.06):
    a=im.getchannel('A').point(lambda v:255 if v>12 else 0);b=a.getbbox();im=im.crop(b) if b else im
    s=int(max(im.size)*(1+pad*2));c=Image.new('RGBA',(s,s),(0,0,0,0));c.paste(im,((s-im.width)//2,(s-im.height)//2),im);return c.resize((size,size),Image.LANCZOS)
os.makedirs('assets/official/resins',exist_ok=True)
for k,u in SRC.items():
    im=fetch(u).convert('RGB');cut=remove(im,session=sess,post_process_mask=True)
    tile(first_object(cut)).save(f'assets/official/resins/{k}.webp','WEBP',quality=88,method=6);print('resin',k,flush=True)
form=tile(remove(fetch(FORM).convert('RGB'),session=sess,post_process_mask=True))
for k in ('fgrey','fwhite','fclear','fdraft','ftough','fflex','frigid','fhigh','fcast'):form.save(f'assets/official/resins/{k}.webp','WEBP',quality=88,method=6)
print('formlabs cartridge x9')
