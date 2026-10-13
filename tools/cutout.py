"""Cuts the background out of every source photo and writes square transparent WebP tiles to assets/official/.
Usage: python3 tools/cutout.py <folder with source images> [model]   (ONLY=key to redo one image; use model birefnet-general for hard ones)"""
import sys,os,re,base64,io
from PIL import Image
from rembg import remove,new_session
SRC=sys.argv[1]
MAP_P={'mars':'mars-1.jpg','mars5':'mars5-1.jpg','photon':'photon-0.jpg','m5s':'m5s-0.jpg','sonic8k':'sonic8k-1.img','mage':'mage-0.img','saturn':'saturn-1.jpg','saturn16':'saturn16-1.jpg','mighty':'mighty-0.img','m7max':'m7max-0.jpg','prusa':'prusa-0.img','form3':'form3-clean.img','form4':'form4-clean.img','form4b':'form4b-clean.img','asiga':'asiga-0.img','jupiter':'jupiter-0.jpg','mega':'mega-1.img','form4l':'form4l-clean.img','nexa':'nexa-0.img','carbon':'carbon-0.img','pj35':'pj35-0.img','mjp':'mjp-0.img','pj55':'pj55-2.img','pj850':'pj850-0.img','baby':'baby-0.img','arburg':'arburg-0.img','engel':'engel-0.img'}
CROP={'pj55':None}
MAP_F={'chibi':('p-chibi-L.img',None),'bust':('p-bust-a3.img',(0,0.04,1,0.82)),'desk':('p-desk-L.img',None),'premium':('r-premium-0.img',None),'statue':('r-statue-0.img',None),'fullcolor':('r-fullcolor-0.img',None),'licensed':('r-licensed-0.img',None),'deckbox':('p-deckbox-0.img',None),'akali':('r-akali-0.img',None),'yone':('r-yone-0.img',None),'jhin':('r-jhin-0.img',None),'jinx':('r-jinx-0.img',None),'lux':('r-lux-0.img',(0,0,1,.52)),'yasuo':('r-yasuo2-0.img',(0,0,1,.55)),'jinhsi':('p-jinhsi-0.img',None),'jinhsib':('p-jinhsi-0.img',(0,0,1,.5)),'kaisa':('r-kaisa-0.img',None)}
sess=new_session(sys.argv[2] if len(sys.argv)>2 else 'isnet-general-use')
def load(path):
    im=Image.open(path).convert('RGBA');bg=Image.new('RGBA',im.size,(255,255,255,255));bg.alpha_composite(im);return bg.convert('RGB')
def tile(im,size=320,pad=.05):
    a=im.getchannel('A').point(lambda v:255 if v>12 else 0);b=a.getbbox();im=im.crop(b) if b else im
    s=int(max(im.size)*(1+pad*2));c=Image.new('RGBA',(s,s),(0,0,0,0));c.paste(im,((s-im.width)//2,(s-im.height)//2),im);return c.resize((size,size),Image.LANCZOS)
def run(path,out,box=None):
    im=load(path)
    if box:
        w,h=im.size;im=im.crop((int(box[0]*w),int(box[1]*h),int(box[2]*w),int(box[3]*h)))
    cut=remove(im,session=sess,alpha_matting=False,post_process_mask=True)
    tile(cut).save(out,'WEBP',quality=88,method=6)
os.makedirs('assets/official/printers',exist_ok=True);os.makedirs('assets/official/products',exist_ok=True)
ONLY=os.environ.get('ONLY')
for k,f in MAP_P.items():
    if ONLY and k!=ONLY:continue
    run(os.path.join(SRC,f),f'assets/official/printers/{k}.webp');print('printer',k,flush=True)
for k,(f,box) in MAP_F.items():
    if ONLY and k!=ONLY:continue
    run(os.path.join(SRC,f),f'assets/official/products/{k}.webp',box);print('product',k,flush=True)
if ONLY:sys.exit()
# the two photos that were embedded in js/images.js
s=open('js/images.js').read()
for k in ('ahri','kit'):
    m=re.search(k+r":'data:image/jpeg;base64,([^']+)'",s)
    if m:
        open('/tmp/_p.jpg','wb').write(base64.b64decode(m.group(1)));run('/tmp/_p.jpg',f'assets/official/products/{k}.webp');print('product',k,flush=True)
