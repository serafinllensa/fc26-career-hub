import json, re, os, io, subprocess, unicodedata
from PIL import Image
D='/workspace/fc26-hub/data'; cl=json.load(open(f'{D}/clubes.json'))
STOP={'fc','cf','ac','as','ss','us','afc','ssc','acf','sc','vfb','vfl','tsg','rc','ogc','sv','cd','ud','rcd','ca','bc','de','del','la','le','1','04','05','1899','1909','1913','1846','29','fsv','calcio','club','sport','hsc','stade','olympique','real'}
def ascii(t): return unicodedata.normalize('NFKD',t).encode('ascii','ignore').decode().upper()
usadas=set()
def sigla(c):
    pal=[p for p in re.split(r'[^A-Za-z0-9]+',ascii(c['corto'] or c['nombre'])) if p]
    sig=[p for p in pal if p.lower() not in STOP] or pal
    cands=[]
    if len(sig)>=3: cands.append(''.join(p[0] for p in sig[:3]))
    if len(sig)==2: cands+= [sig[0][0]+sig[1][:2], sig[0][:2]+sig[1][0]]
    cands.append(sig[0][:3]); w=''.join(sig)
    cands+= [w[0]+w[i]+w[j] for i in range(1,len(w)) for j in range(i+1,len(w))]
    for s in cands:
        if len(s)==3 and s not in usadas: usadas.add(s); return s
for c in cl:
    pj=json.load(open(f"{D}/plantillas/{c['id']}.json"))['jugadores']
    c['valorPlantillaM']=round(sum(j['valorM'] or 0 for j in pj),2)
    if c['ciudad']:
        x=c['ciudad'].strip()
        if c['pais']=='Inglaterra': x=re.sub(r'^[A-Z]{1,2}\d[A-Z\d]?\s+[\dO][A-Z]{2}\s+','',x)   # postcode UK
        x=re.sub(r'^(D-|F-|I-|E-)?\d{4,5}\s+','',x).strip(); x=re.sub(r'\s+',' ',x)
        c['ciudad']=x
    c['sigla']=sigla(c)
    for f in c['fuentes']:
        if f['campo'].startswith('nombre,valorPlantillaM'): f['campo']='nombre,estadio'
    c['fuentes'].append({'campo':'valorPlantillaM','url':None,'fecha':pj and json.load(open(f"{D}/plantillas/{c['id']}.json"))['fecha'],'nota':'Suma de valorM de data/plantillas/'+c['id']+'.json (Transfermarkt).'})
    c['fuentes'].append({'campo':'sigla','url':None,'nota':'Abreviatura de 3 letras generada para la interfaz; no es un código oficial.'})
    c['fuentes'].append({'campo':'ciudad','url':None,'nota':'Localidad de la dirección oficial del club en Transfermarkt (puede ser la sede o el centro de entrenamiento).'})
    # escudo
    url=f"https://tmssl.akamaized.net/images/wappen/head/{c['tmId']}.png"; out=f"{D}/escudos/{c['id']}.png"
    raw=subprocess.run(['curl','-s',url],capture_output=True).stdout
    try:
        im=Image.open(io.BytesIO(raw)).convert('RGBA'); im.thumbnail((128,128),Image.LANCZOS)
        im.save(out,optimize=True)
        if os.path.getsize(out)>15000:
            im.quantize(colors=128,method=Image.FASTOCTREE).save(out,optimize=True)
        c['escudo']={'archivo':f"escudos/{c['id']}.png",'url':url,'fecha':pj and json.load(open(f"{D}/plantillas/{c['id']}.json"))['fecha'],'nota':'Marca registrada de su club; uso de fans sin fines comerciales.'}
    except Exception as e:
        c['escudo']=None; print('ESCUDO FALLO',c['id'],e)
json.dump(cl,open(f'{D}/clubes.json','w'),ensure_ascii=False,indent=1)
big=[(c['id'],os.path.getsize(f"{D}/escudos/{c['id']}.png")) for c in cl if c['escudo'] and os.path.getsize(f"{D}/escudos/{c['id']}.png")>15000]
print('ok',sum(1 for c in cl if c['escudo']),'>15KB',big)
print('siglas dup',len(cl)-len({c['sigla'] for c in cl}), [c['sigla'] for c in cl][:20])
print([ (c['id'],c['ciudad']) for c in cl if not c['ciudad'] or re.search(r'\d',c['ciudad'])])
