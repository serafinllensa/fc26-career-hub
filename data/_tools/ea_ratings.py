"""Cruza ratings oficiales EA SPORTS FC 26 (drop-api.ea.com, la web de ratings de EA) con las plantillas de Transfermarkt.
Match: misma fecha de nacimiento + nombre parecido (>=0.6) o apellido contenido. Sin match seguro: ea=null."""
import json, glob, os, re, subprocess, time, unicodedata, difflib, datetime
from bs4 import BeautifulSoup
C='/tmp/eacache'; os.makedirs(C,exist_ok=True); HOY=datetime.date.today().isoformat()
items=[]; off=0
while True:
    p=f'{C}/{off}.json'
    if not os.path.exists(p) or os.path.getsize(p)<500:
        subprocess.run(['curl','-s','-A','Mozilla/5.0',f'https://drop-api.ea.com/rating/ea-sports-fc?locale=en&limit=100&offset={off}','-o',p]); time.sleep(0.3)
    d=json.load(open(p)); items+=d['items']; off+=100
    if off>=d['totalItems']: break
print('EA items',len(items),flush=True)
def n(t): return re.sub(r'[^a-z ]','',unicodedata.normalize('NFKD',t or '').encode('ascii','ignore').decode().lower()).strip()
porDOB={}
for it in items:
    m=re.match(r'(\d+)/(\d+)/(\d{4})',it['birthdate'] or '')
    if m: porDOB.setdefault(f'{m[3]}-{int(m[1]):02d}-{int(m[2]):02d}',[]).append(it)
POS={'GK':'POR','CB':'DFC','LB':'LI','RB':'LD','CDM':'MCD','CM':'MC','CAM':'MCO','LM':'MI','RM':'MD','LW':'EI','RW':'ED','ST':'DC','CF':'SD','LWB':'CAI','RWB':'CAD'}
tot=ok=0
for f in sorted(glob.glob('/workspace/fc26-hub/data/plantillas/*.json')):
    d=json.load(open(f)); tmid=re.search(r'/verein/(\d+)',d['fuente'])[1]
    s=BeautifulSoup(open(f'/workspace/.tmcache/k{tmid}.html',encoding='utf-8').read(),'lxml'); dob={}
    for tr in s.select('table.items > tbody > tr'):
        td=tr.find_all('td',recursive=False)
        if len(td)<10: continue
        a=td[1].select_one('td.hauptlink a'); m=re.match(r'(\d\d)/(\d\d)/(\d{4})',td[2].get_text(strip=True))
        if a and m: dob['tm'+re.search(r'/spieler/(\d+)',a['href'])[1]]=f'{m[3]}-{m[2]}-{m[1]}'
    for j in d['jugadores']:
        tot+=1; j['fechaNac']=dob.get(j['id']); best=None
        for it in porDOB.get(j['fechaNac'],[]):
            nm=n(j['nombre']); cands=[n(it.get('commonName')),n(f"{it['firstName']} {it['lastName']}"),n(it['lastName'])]
            r=max(difflib.SequenceMatcher(None,nm,c).ratio() for c in cands if c)
            ln=n(it['lastName']).split(); cn=n(it.get('commonName')).split(); tok=nm.split()
            if r>=0.6 or (ln and all(t in tok for t in ln)) or (cn and all(t in tok for t in cn)):
                if not best or r>best[0]: best=(r,it)
        if best:
            it=best[1]; st=it['stats']; ok+=1
            j['ea']={'eaId':it['id'],'nombreEA':it.get('commonName') or f"{it['firstName']} {it['lastName']}",'ovr':it['overallRating'],
              **{k:st[k]['value'] for k in ('pac','sho','pas','dri','def','phy')},
              'posEA':POS.get(it['position']['shortLabel'],it['position']['shortLabel']),'equipoEA':(it.get('team') or {}).get('label'),
              'pieHabil':'izquierdo' if it['preferredFoot']==2 else 'derecho','filigranas':it['skillMoves'],'piernaMala':it['weakFootAbility']}
            if POS.get(it['position']['shortLabel'])=='POR':
                j['ea']['porteroStats']={k:st[k]['value'] for k in ('gkDiving','gkHandling','gkKicking','gkPositioning','gkReflexes')}
        else: j['ea']=None
    d['fuenteEA']={'url':'https://www.ea.com/games/ea-sports-fc/ratings','fecha':HOY,'nota':'Ratings oficiales EA SPORTS FC 26 (base del juego). Cruce por fecha de nacimiento y nombre; sin cruce seguro, ea=null. equipoEA puede diferir del club real si EA no actualizó el pase.'}
    json.dump(d,open(f,'w'),ensure_ascii=False,indent=1)
print('jugadores',tot,'con EA',ok,'sin EA',tot-ok)
