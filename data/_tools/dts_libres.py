"""DTs libres: entrenadores que dirigieron (como primer entrenador) a alguno de los 96 clubes desde 2016/17 y hoy no tienen cargo de DT. Fuente: Transfermarkt."""
import json, re, os, subprocess, time, datetime, unicodedata
from bs4 import BeautifulSoup
from paises import iso
UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36"; B="https://www.transfermarkt.com"; C="/workspace/.tmcache"
D="/workspace/fc26-hub/data"; HOY=datetime.date.today().isoformat()
def get(url,name,minsize=20000):
    p=f"{C}/{name}"
    if not os.path.exists(p) or os.path.getsize(p)<minsize:
        for _ in range(3):
            subprocess.run(["curl","-s","-A",UA,url,"-o",p]); time.sleep(1.1)
            if os.path.exists(p) and os.path.getsize(p)>=minsize: break
    return open(p,encoding='utf-8').read()
slug=lambda t: re.sub(r'[^a-z0-9]+','-',unicodedata.normalize('NFKD',t).encode('ascii','ignore').decode().lower()).strip('-')
cl=json.load(open(f"{D}/clubes.json")); porTm={str(c['tmId']):c['id'] for c in cl}
niv={k:v['nivel'] for k,v in json.load(open('/workspace/fc26-hub/js/motor/niveles.json'))['niveles'].items()}
actuales=json.load(open(f"{D}/dts.json")); actIds={str(t['tmId']) for t in actuales}
cand={}
for c in cl:
    s=BeautifulSoup(get(f"{B}/x/mitarbeiterhistorie/verein/{c['tmId']}/personalie_id/1",f"mh{c['tmId']}.html"),'lxml')
    t=s.select_one('table.items')
    if not t: continue
    for tr in t.select('tbody > tr'):
        a=tr.select_one('a[href*="/profil/trainer/"]'); m=re.search(r'(\d\d)/(\d\d)/(\d{4})',' '.join(td.get_text(' ',strip=True) for td in tr.find_all('td')[2:4]) )
        if not a: continue
        txt=tr.get_text(' | ',strip=True); fechas=re.findall(r'(\d\d)/(\d\d)/(\d{4})',txt)
        if len(fechas)<2: continue
        ini=fechas[1]; 
        if int(ini[2])<2016 or (int(ini[2])==2016 and int(ini[1])<7): continue
        tid=re.search(r'/trainer/(\d+)',a['href'])[1]
        if tid not in actIds: cand.setdefault(tid,a.get_text(strip=True))
print('candidatos',len(cand),flush=True)
libres=[]
for tid,nombre in cand.items():
    st=BeautifulSoup(get(f"{B}/x/stationen/trainer/{tid}",f"st{tid}.html"),'lxml'); hist=[]
    for tr in st.select('table.items > tbody > tr'):
        ca=tr.select_one('a[href*="/verein/"]')
        if not ca: continue
        vid=re.search(r'/verein/(\d+)',ca['href'])[1]; txt=tr.get_text(' | ',strip=True).split(' | ')
        hist.append({'club':txt[0],'tmClubId':int(vid),'clubId':porTm.get(vid),'rol':txt[1] if len(txt)>1 else None,'desde':txt[2] if len(txt)>2 else None,'hasta':txt[3] if len(txt)>3 else None})
    if not hist: continue
    # ¿tiene cargo vigente? (cualquier fila con 'expected' o sin fecha de fin)
    vigente=[h for h in hist if h['hasta'] and ('expected' in h['hasta'] or not re.search(r'\d{2}/\d{2}/\d{4}',h['hasta']))]
    vig_dt=[h for h in vigente if h['rol'] in ('Manager','Head Coach','Caretaker Manager','Interim Manager')]
    if vig_dt: continue
    dirig=list(dict.fromkeys(h['clubId'] for h in hist if h['clubId'] and h['rol'] in ('Manager','Head Coach')))
    if not dirig: continue
    p=get(f"{B}/x/profil/trainer/{tid}",f"t{tid}.html"); ps=BeautifulSoup(p,'lxml')
    info={li.get_text(' ',strip=True).split(':')[0].strip():li.get_text(' ',strip=True).split(':',1)[-1].strip() for li in ps.select('.data-header__items li')}
    nac=info.get('Citizenship','').split('  ')[0].strip() or None; m=re.search(r'\((\d+)\)',info.get('Date of birth/Age','')); form=info.get('Preferred formation')
    if 'Date of death' in info: continue
    jug=[]; sp=ps.select_one('a.data-header__box--link[href*="/profil/spieler/"]'); sid=None
    if sp:
        sid=re.search(r'/spieler/(\d+)',sp['href'])[1]
        try:
            th=json.loads(get(f"{B}/ceapi/transferHistory/list/{sid}",f"th{sid}.json",50))
            for t in th.get('transfers',[]):
                for side in ('from','to'):
                    v=re.search(r'/verein/(\d+)',t[side]['href'])
                    if v and not t[side]['isSpecial']: jug.append(v[1])
        except Exception: pass
    ultimo=next((h for h in hist if h['rol'] in ('Manager','Head Coach')),None)
    nvs=[niv.get(x) for x in dirig if niv.get(x)]
    libres.append({'id':slug(nombre),'tmId':int(tid),'nombre':nombre,'nac':nac,'nacCodigo':iso(nac) if nac else None,'edad':int(m[1]) if m else None,
      'clubActual':None,'estado':'libre','otroCargoActual':(vigente[0]['rol']+' en '+vigente[0]['club']) if vigente else None,
      'ultimoClubDT':ultimo and {'club':ultimo['club'],'clubId':ultimo['clubId'],'hasta':ultimo['hasta']},
      'clubesDirigidos':dirig,'clubesJugados':list(dict.fromkeys(porTm[v] for v in jug if v in porTm)),'historialDT':hist,
      'formaciones':[form] if form else [],'filosofia':[],'temperamento':None,'nivel':max(nvs) if nvs else 1,
      'fuentes':[{'campo':'nombre,nac,edad,formaciones','url':f"{B}/x/profil/trainer/{tid}",'fecha':HOY},
                 {'campo':'historialDT,clubesDirigidos,estado','url':f"{B}/x/stationen/trainer/{tid}",'fecha':HOY,'nota':'Libre = sin cargo vigente de primer entrenador en Transfermarkt. clubesDirigidos solo cuenta Manager o Head Coach.'},
                 {'campo':'clubesJugados','url':(f"{B}/x/profil/spieler/{sid}" if sid else None),'fecha':HOY},
                 {'campo':'nivel','url':None,'fecha':HOY,'nota':'Calculado: nivel más alto (js/motor/niveles.json) entre los clubes de la v1 que dirigió.'},
                 {'campo':'filosofia,temperamento','url':None,'fecha':HOY,'nota':'Vacío hasta tener una fuente citable.'}]})
    print('LIBRE',nombre,dirig,libres[-1]['otroCargoActual'],flush=True)
for t in actuales: t.setdefault('estado','con-club')
ids={t['id'] for t in actuales}
for l in libres:
    if l['id'] in ids: l['id']+='-'+str(l['tmId'])
json.dump(actuales+sorted(libres,key=lambda x:(-x['nivel'],x['nombre'])),open(f"{D}/dts.json",'w'),ensure_ascii=False,indent=1)
print('LIBRES',len(libres),'TOTAL',len(actuales)+len(libres))
