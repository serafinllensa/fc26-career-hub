"""Segunda pasada: posSec desde el perfil de cada jugador en Transfermarkt. Reanudable (cache en /workspace/.tmcache/p<id>.html)."""
import json, glob, os, subprocess, time, re, datetime
from bs4 import BeautifulSoup
UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
POS={'Goalkeeper':'POR','Centre-Back':'DFC','Left-Back':'LI','Right-Back':'LD','Defensive Midfield':'MCD','Central Midfield':'MC',
 'Attacking Midfield':'MCO','Left Midfield':'MI','Right Midfield':'MD','Left Winger':'EI','Right Winger':'ED','Centre-Forward':'DC','Second Striker':'SD'}
for f in sorted(glob.glob('/workspace/fc26-hub/data/plantillas/*.json')):
    d=json.load(open(f)); falt=0
    for j in d['jugadores']:
        p=f"/workspace/.tmcache/p{j['id']}.html"
        if not os.path.exists(p) or os.path.getsize(p)<20000:
            subprocess.run(['curl','-s','-A',UA,j['tmUrl'],'-o',p]); time.sleep(1.0)
        try:
            s=BeautifulSoup(open(p,encoding='utf-8').read(),'lxml'); box=s.select_one('.detail-position__box')
            if box is None: raise ValueError
            otras=[POS.get(dd.get_text(strip=True)) for dd in box.select('.detail-position__position')[1:]]
            j['posSec']=[x for x in otras if x and x!=j['pos']]
            j.pop('posSecPendiente',None)
        except Exception:
            j['posSecPendiente']=True; falt+=1
    d['nota']='Foto de Transfermarkt. posSec desde el perfil de cada jugador ('+datetime.date.today().isoformat()+').'
    json.dump(d,open(f,'w'),ensure_ascii=False,indent=1); print(os.path.basename(f),len(d['jugadores']),'pendientes',falt,flush=True)
