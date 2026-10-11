"""dts.json: DT actual de cada uno de los 96 clubes desde Transfermarkt (staff, perfil, trayectoria como DT y como jugador)."""
import json, re, os, subprocess, time, datetime, unicodedata
from bs4 import BeautifulSoup
UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36"; B="https://www.transfermarkt.com"; C="/workspace/.tmcache"
D="/workspace/fc26-hub/data"; HOY=datetime.date.today().isoformat()
def get(url,name,minsize=5000):
    p=f"{C}/{name}"
    if not os.path.exists(p) or os.path.getsize(p)<minsize:
        for _ in range(3):
            subprocess.run(["curl","-s","-A",UA,url,"-o",p]); time.sleep(1.1)
            if os.path.exists(p) and os.path.getsize(p)>=minsize: break
    return open(p,encoding='utf-8').read()
def slug(t): return re.sub(r'[^a-z0-9]+','-',unicodedata.normalize('NFKD',t).encode('ascii','ignore').decode().lower()).strip('-')
cl=json.load(open(f"{D}/clubes.json")); porTm={str(c['tmId']):c['id'] for c in cl}
try: niv={x['id']:x['nivel'] for x in json.load(open('/workspace/fc26-hub/js/motor/niveles-propuesta.json'))}
except Exception: niv={c['id']:c['nivel'] for c in cl}
from pycountry import countries
sys_path=os.path.dirname(__file__); import sys; sys.path.insert(0,sys_path)
dts={}; presis=0
for c in cl:
    s=BeautifulSoup(get(f"{B}/x/mitarbeiter/verein/{c['tmId']}",f"m{c['tmId']}.html",20000),'lxml')
    head=None; presi=None
    for b in s.select('.box'):
        h=(b.select_one('h2') or b).get_text(strip=True)
        for a in b.select('a[href*="/profil/trainer/"]'):
            row=a.find_parent('table'); row=row.find_parent('tr') if row and row.find_parent('tr') else row
            txt=row.get_text(' | ',strip=True) if row else ''
            rol=txt.split('|')[1].strip() if '|' in txt else ''
            if h=='Coaching Staff' and head is None and rol in ('Manager','Head Coach','Caretaker Manager','Interim Manager'): head=(a,rol)
            if presi is None and rol=='President': presi=a.get_text(strip=True)
    if presi:
        c['presidente']['nombre']=presi; presis+=1
        c['fuentes']=[f for f in c['fuentes'] if f['campo']!='presidente.nombre']+[{'campo':'presidente.nombre','url':f"{B}/x/mitarbeiter/verein/{c['tmId']}",'fecha':HOY}]
    if not head: print('SIN DT',c['id'],flush=True); continue
    a,rol=head; tid=re.search(r'/trainer/(\d+)',a['href'])[1]
    p=get(f"{B}/x/profil/trainer/{tid}",f"t{tid}.html",20000); ps=BeautifulSoup(p,'lxml')
    info={li.get_text(' ',strip=True).split(':')[0].strip():li.get_text(' ',strip=True).split(':',1)[-1].strip() for li in ps.select('.data-header__items li')}
    nac=info.get('Citizenship','').split('  ')[0].strip() or None
    form=info.get('Preferred formation'); m=re.search(r'\((\d+)\)',info.get('Date of birth/Age',''))
    st=BeautifulSoup(get(f"{B}/x/stationen/trainer/{tid}",f"st{tid}.html",20000),'lxml'); hist=[]
    for tr in st.select('table.items > tbody > tr'):
        ca=tr.select_one('a[href*="/verein/"]'); td=[x.get_text(' ',strip=True) for x in tr.find_all('td',recursive=False)]
        if not ca: continue
        vid=re.search(r'/verein/(\d+)',ca['href'])[1]; txt=tr.get_text(' | ',strip=True).split(' | ')
        hist.append({'club':txt[0],'tmClubId':int(vid),'clubId':porTm.get(vid),'rol':txt[1] if len(txt)>1 else None,'desde':txt[2] if len(txt)>2 else None,'hasta':txt[3] if len(txt)>3 else None})
    jug=[]; sp=ps.select_one('a.data-header__box--link[href*="/profil/spieler/"]')
    if sp:
        sid=re.search(r'/spieler/(\d+)',sp['href'])[1]
        try:
            th=json.loads(get(f"{B}/ceapi/transferHistory/list/{sid}",f"th{sid}.json",50))
            for t in th.get('transfers',[]):
                for side in ('from','to'):
                    v=re.search(r'/verein/(\d+)',t[side]['href'])
                    if v and not t[side]['isSpecial']: jug.append((v[1],t[side]['clubName']))
        except Exception: pass
    vis=[]; [vis.append(x) for x in jug if x not in vis]
    from paises import iso
    dirig=[h['clubId'] for h in hist if h['clubId'] and h['rol'] in ('Manager','Head Coach')]
    nvs=[niv.get(x) for x in dict.fromkeys(dirig) if niv.get(x)]
    did=slug(a.get_text(strip=True))
    dts[did]={'id':did,'tmId':int(tid),'nombre':a.get_text(strip=True),'nac':nac,'nacCodigo':iso(nac) if nac else None,'edad':int(m[1]) if m else None,
      'clubActual':c['id'],'rolActual':rol,'contratoHasta':None,
      'clubesDirigidos':list(dict.fromkeys(dirig)),'clubesJugados':list(dict.fromkeys(porTm[v] for v,_ in vis if v in porTm)),
      'historialDT':hist,'clubesJugadosTodos':[n for _,n in vis],
      'formaciones':[form] if form else [],'filosofia':[],'temperamento':None,
      'nivel':max(nvs) if nvs else 1,
      'fuentes':[{'campo':'nombre,nac,edad,formaciones','url':f"{B}/x/profil/trainer/{tid}",'fecha':HOY},
                 {'campo':'historialDT,clubesDirigidos','url':f"{B}/x/stationen/trainer/{tid}",'fecha':HOY},
                 {'campo':'clubesJugados','url':(f"{B}/x/profil/spieler/{sid}" if sp else None),'fecha':HOY,'nota':'Trayectoria como jugador (historial de transferencias de Transfermarkt).' if sp else 'Sin perfil de jugador en Transfermarkt.'},
                 {'campo':'nivel','url':None,'fecha':HOY,'nota':'Calculado: el nivel más alto (tabla de Motor) entre los clubes de la v1 que dirigió.'},
                 {'campo':'filosofia,temperamento','url':None,'fecha':HOY,'nota':'Vacío hasta tener una fuente citable (pendiente).'}]}
    print(c['id'],'->',dts[did]['nombre'],form,len(hist),'dirigidos v1',dts[did]['clubesDirigidos'],flush=True)
json.dump(cl,open(f"{D}/clubes.json",'w'),ensure_ascii=False,indent=1)
json.dump(list(dts.values()),open(f"{D}/dts.json",'w'),ensure_ascii=False,indent=1)
print('DTS',len(dts),'presidentes',presis)
