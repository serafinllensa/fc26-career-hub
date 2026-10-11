"""historial (21/22 a 25/26) y actual (26/27) por club desde Transfermarkt: posiciones (platzierungen) y rondas europeas/copa (spielplan)."""
import json, re, os, subprocess, time, datetime
from bs4 import BeautifulSoup
UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36"; B="https://www.transfermarkt.com"; C="/workspace/.tmcache"
D="/workspace/fc26-hub/data"; HOY=datetime.date.today().isoformat()
def get(url,name):
    p=f"{C}/{name}"
    if not os.path.exists(p) or os.path.getsize(p)<20000:
        for _ in range(3):
            subprocess.run(["curl","-s","-A",UA,url,"-o",p]); time.sleep(1.1)
            if os.path.getsize(p)>=20000: break
    return BeautifulSoup(open(p,encoding='utf-8').read(),'lxml')
EURO={'UEFA Champions League':'ucl','UEFA Europa League':'uel','UEFA Europa Conference League':'uecl','UEFA Conference League':'uecl',
      'UEFA Champions League Qualifying':'ucl-previa','UEFA Europa League Qualifying':'uel-previa','UEFA Conference League Qualifying':'uecl-previa','UEFA Europa Conference League Qualifiers':'uecl-previa'}
COPAS={'FA Cup','Copa del Rey','Italy Cup','Coppa Italia','DFB-Pokal','Coupe de France','EFL Cup'}
def ronda(b):
    rows=[tr for tr in b.select('table tbody tr') if tr.find('td')]
    if not rows: return None
    last=rows[-1]; r=last.find('td').get_text(strip=True); r=re.sub(r'\s*(1st|2nd) Leg$','',r)
    out={'ronda':r}
    if r=='Final':
        tds=[td.get_text(' ',strip=True) for td in last.find_all('td')]
        res=next((t for t in reversed(tds) if re.search(r'\d+:\d+',t)),None); ven=next((t for t in tds if t in ('H','A')),None)
        if res and ven and 'pens' not in res.lower() and 'aet' not in res.lower() or (res and ven):
            m=re.search(r'(\d+):(\d+)',res); a,b2=int(m[1]),int(m[2])
            # en TM el resultado se muestra local:visitante
            if a!=b2: out['campeon']= (a>b2)==(ven=='H')
            else: out['campeon']=None
    return out
cl=json.load(open(f"{D}/clubes.json"))
for c in cl:
    tid=c['tmId']; pu=f"{B}/x/platzierungen/verein/{tid}"; s=get(pu,f"pl{tid}.html"); pos={}
    for tr in s.select('table.items > tbody > tr'):
        t=[x.get_text(' ',strip=True) for x in tr.find_all('td',recursive=False)]
        txt=tr.get_text(' | ',strip=True).split(' | ')
        if len(txt)<10: continue
        pos[txt[0]]={'liga':txt[1],'division':txt[2],'pj':sum(int(x) for x in txt[3:6] if x.isdigit()),'g':int(txt[3]),'e':int(txt[4]),'p':int(txt[5]),'goles':txt[6],'puntos':int(txt[8]) if txt[8].lstrip('-').isdigit() else None,'posicion':int(txt[9]) if txt[9].isdigit() else None,'dt':txt[10] if len(txt)>10 else None}
    hist=[]
    for sid,temp in [(2021,'21/22'),(2022,'22/23'),(2023,'23/24'),(2024,'24/25'),(2025,'25/26')]:
        su=f"{B}/x/spielplan/verein/{tid}/saison_id/{sid}"; sp=get(su,f"sp{tid}_{sid}.html"); eur=[]; copa=None
        for b in sp.select('div.box'):
            h=b.select_one('h2'); h=h.get_text(strip=True) if h else ''
            if h in EURO:
                r=ronda(b)
                if r: eur.append({'comp':EURO[h],**r})
            elif h in COPAS and h!='EFL Cup' and copa is None:
                copa=ronda(b); copa and copa.update({'comp':h})
        p=pos.get(temp,{})
        hist.append({'temporada':temp,'liga':p.get('liga'),'division':p.get('division'),'posicion':p.get('posicion'),'puntos':p.get('puntos'),'pj':p.get('pj'),
                     'europa':eur,'copa':copa,'fuente':[pu,su]})
    a=pos.get('26/27',{})
    c['historial']=hist
    c['actual']={'temporada':'26/27','posicion':a.get('posicion'),'pj':a.get('pj'),'g':a.get('g'),'e':a.get('e'),'p':a.get('p'),'goles':a.get('goles'),'puntos':a.get('puntos'),'fecha':HOY,'fuente':pu}
    print(c['id'],[(h['temporada'],h['division'],h['posicion'],[e['comp']+':'+e['ronda'] for e in h['europa']]) for h in hist][-2:],c['actual']['posicion'],flush=True)
json.dump(cl,open(f"{D}/clubes.json",'w'),ensure_ascii=False,indent=1)
print('LISTO')
