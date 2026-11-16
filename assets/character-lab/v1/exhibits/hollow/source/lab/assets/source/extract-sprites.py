"""Extract tk2d frames with the source geometry, UV orientation, clip order and FPS.
Usage: .venv/bin/python dist/lab/assets/source/extract-sprites.py /tmp/hk-lab-source/knight
"""
import UnityPy,sys,json,math,hashlib,re
from pathlib import Path
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1]
source=Path(sys.argv[1]); raw=source.read_bytes()
expected='5e83b7f549284cf00956dd8b06283e25cefb4e71'
sha=hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()
assert sha==expected,(sha,'Source version differs')
E=UnityPy.load(str(source));O={o.path_id:o for o in E.objects}
D={}
for o in E.objects:
 if o.type.name!='MonoBehaviour':continue
 try:t=o.read_typetree()
 except Exception:continue
 if 'spriteDefinitions' in t or ('clips' in t and len(t['clips']) and 'name' in t['clips'][0]):D[str(o.path_id)]=t
(ROOT/'source/animation-collections.json').write_text(json.dumps(D))
ANIM={'knight':'-4256029039890998113','spells':'-6710095546138630883','hits':'-5371697866328593198','dust':'8064425950683154288','lights':'5995880768243891162','hud':'315537230814903373','soulfill':'2519257442713851190'}
textures={}; frames={}; clips={}; images=[]
def tex(pid):
 if pid not in textures:textures[pid]=O[pid].read().image.convert('RGBA')
 return textures[pid]
def affine(p0,p1,p2,t0,t1,t2):
 dx1,dy1=p1['x']-p0['x'],p1['y']-p0['y'];dx2,dy2=p2['x']-p0['x'],p2['y']-p0['y'];det=dx1*dy2-dx2*dy1
 a=((t1-t0)*dy2-(t2-t0)*dy1)/det;b=(dx1*(t2-t0)-dx2*(t1-t0))/det
 return a,b,t0-a*p0['x']-b*p0['y']
def frame(cid,sid):
 key=f'{cid}:{sid}'
 if key in frames:return key
 col=D[str(cid)];d=col['spriteDefinitions'][sid];ps=d['positions'];uv=d['uvs']
 if len(ps)<3:return None
 xs=[p['x'] for p in ps];ys=[p['y'] for p in ps];xmin,xmax,ymin,ymax=min(xs),max(xs),min(ys),max(ys)
 if xmax-xmin<.001 or ymax-ymin<.001:return None
 tpid=col['textures'][max(0,d['materialId'])]['m_PathID'];img=tex(tpid);tw,th=img.size
 sx,sy=d['texelSize']['x'],d['texelSize']['y'];w=max(1,round((xmax-xmin)/sx));h=max(1,round((ymax-ymin)/sy))
 # tk2d stores rotated atlas quads. Reconstruct their world-aligned pixel image.
 au,bu,cu=affine(ps[0],ps[1],ps[2],uv[0]['x']*tw,uv[1]['x']*tw,uv[2]['x']*tw)
 av,bv,cv=affine(ps[0],ps[1],ps[2],(1-uv[0]['y'])*th,(1-uv[1]['y'])*th,(1-uv[2]['y'])*th)
 im=img.transform((w,h),Image.Transform.AFFINE,(au*sx,-bu*sy,au*xmin+bu*ymax+cu,av*sx,-bv*sy,av*xmin+bv*ymax+cv),resample=Image.Resampling.NEAREST)
 frames[key]={'name':d['name'],'collection':col['spriteCollectionName'],'spriteId':sid,'position':[round(xmin,7),round(ymin,7),round(xmax-xmin,7),round(ymax-ymin,7)],'sourceTextureId':str(tpid),'size':[w,h]}
 images.append((key,im));return key
for group,pid in ANIM.items():
 clips[group]={}
 for c in D[pid]['clips']:
  if not c['name'] or not c['frames']:continue
  if group=='hud' and c['name'] not in ['Health Empty','Health Idle','Health Break','Health Refill','HUD Frame Idle','Soul Orb Glow','V_Full','V_Empty','Coin Idle','Soul Cap Full']:continue
  keys=[frame(f['spriteCollection']['m_PathID'],f['spriteId']) for f in c['frames']]
  clips[group][c['name']]={'fps':c['fps'],'loopStart':c['loopStart'],'wrapMode':c['wrapMode'],'frames':keys}
# Shelf-pack exact extracted pixels into a small number of PNG textures.
pages=[];page=Image.new('RGBA',(2048,4096));x=y=rowh=0
for key,im in sorted(images,key=lambda it:-it[1].height):
 w,h=im.size
 if x+w+4>2048:x=0;y+=rowh+4;rowh=0
 if y+h+4>4096:
  pages.append(page);page=Image.new('RGBA',(2048,4096));x=y=rowh=0
 page.alpha_composite(im,(x+2,y+2));frames[key]['atlas']=len(pages);frames[key]['rect']=[x+2,y+2,w,h];x+=w+4;rowh=max(rowh,h)
pages.append(page)
for i,page in enumerate(pages):
 page.save(ROOT/f'sprites-{i}.png',optimize=True)
idle=D['-8968310614213894173']['spriteDefinitions'][7]
foot=min(p['y'] for p in idle['positions'])
manifest={'schema':1,'source':{'repo':'MCXGK3/KnightInSilkSong','commit':'3c673d3cbf15928f09a4c1f477e8ed1b2c4a8901','gitBlobSha':sha,'bytes':len(raw),'origin':'Hollow Knight Knight resources transported by KnightInSilkSong; original game build not declared by repository'},'unit':'Unity world unit','sourcePixelsPerUnit':64,'footOffset':1.390625,'atlases':[f'sprites-{i}.png' for i in range(len(pages))],'frames':frames,'clips':clips}
(ROOT/'sprites.json').write_text(json.dumps(manifest,separators=(',',':')))
# Visual proof uses the same untrimmed world origin for all body frames.
labels=['Idle','Run','Airborne','Fall','Slash','SlashAlt','UpSlash','DownSlash','Dash','Double Jump','Fireball1 Cast','Scream','Quake Antic','NA Big Slash','Wall Slide','Walljump']
proof=Image.new('RGB',(1200,math.ceil(len(labels)/4)*240),'#202838');q=ImageDraw.Draw(proof)
for i,n in enumerate(labels):
 c=clips['knight'][n];key=c['frames'][min(2,len(c['frames'])-1)];f=frames[key];a=pages[f['atlas']];rx,ry,w,h=f['rect'];im=a.crop((rx,ry,rx+w,ry+h));px,py,pw,ph=f['position'];originx=(i%4)*300+150;originy=(i//4)*240+192
 q.line((originx-135,originy,originx+135,originy),fill='#536179');q.line((originx,originy-175,originx,originy+10),fill='#364258')
 proof.paste(im,(round(originx+px*64),round(originy-(py+ph-foot)*64)),im);q.text(((i%4)*300+12,(i//4)*240+214),f'{n}: {c["fps"]:g}fps / {len(c["frames"])}',fill='#e3eaf1')
proof.save(ROOT/'source/poses-contact.png')
print(json.dumps({'frames':len(frames),'clips':{k:len(v) for k,v in clips.items()},'atlasCount':len(pages),'footOffset':1.390625,'bytes':sum((ROOT/f'sprites-{i}.png').stat().st_size for i in range(len(pages)))}))
