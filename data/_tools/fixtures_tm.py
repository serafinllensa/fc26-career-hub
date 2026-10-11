"""data/fixtures/<liga>.json (calendario oficial 26/27 desde Transfermarkt) y data/ligas.json (coeficiente UEFA de asociaciones)."""
import json, re, subprocess, time, datetime, os
from bs4 import BeautifulSoup
UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36"; D="/workspace/fc26-hub/data"; HOY=datetime.date.today().isoformat()
SLUG=lambda l: re.sub(r'[^a-z0-9]+','-',__import__('unicodedata').normalize('NFKD',l).encode('ascii','ignore').decode().lower())
cl=json.load(open(f"{D}/clubes.json")); porTm={str(c['tmId']):c['id'] for c in cl}
LIGAS=[("GB1","Premier League","ENG"),("ES1","LaLiga","ESP"),("IT1","Serie A","ITA"),("L1","Bundesliga","GER"),("FR1","Ligue 1","FRA")]
for code,liga,_ in LIGAS:
    url=f"https://www.transfermarkt.com/x/gesamtspielplan/wettbewerb/{code}/saison_id/2026"; p=f"/tmp/gs{code}.html"
    if not os.path.exists(p) or os.path.getsize(p)<20000: subprocess.run(["curl","-s","-A",UA,url,"-o",p]); time.sleep(1.2)
    s=BeautifulSoup(open(p,encoding='utf-8').read(),'lxml'); jornadas=[]; faltan=set()
    for b in s.select('div.box'):
        h=b.select_one('.content-box-headline'); m=re.match(r'(\d+)\.Matchday',h.get_text(strip=True)) if h else None
        if not m: continue
        fecha=None; partidos=[]
        for tr in b.select('tbody tr'):
            dm=re.search(r'(\d\d)/(\d\d)/(\d\d)',tr.get_text(' ',strip=True))
            if dm: fecha=f"20{dm[3]}-{dm[2]}-{dm[1]}"
            ids=[]
            for a in tr.select('a[href*="/spielplan/verein/"]'):
                v=re.search(r'/verein/(\d+)',a['href'])[1]
                if v not in ids: ids.append(v)
            if len(ids)<2: continue
            hora=re.search(r'\d{1,2}:\d\d [AP]M',tr.get_text(' ',strip=True))
            res=tr.select_one('a.ergebnis-link'); r=res.get_text(strip=True) if res else ''
            mm=re.fullmatch(r'(\d+):(\d+)',r)
            for v in ids[:2]:
                if v not in porTm: faltan.add(v)
            pa={'local':porTm.get(ids[0]),'visitante':porTm.get(ids[1]),'fecha':fecha}
            if mm and fecha and fecha<=HOY: pa['resultadoReal']={'gl':int(mm[1]),'gv':int(mm[2])}
            partidos.append(pa)
        fs=sorted(x['fecha'] for x in partidos if x['fecha']); med=fs[len(fs)//2] if fs else None
        for x in partidos:
            if x['fecha'] and med and abs((datetime.date.fromisoformat(x['fecha'])-datetime.date.fromisoformat(med)).days)>4: x['reprogramado']=True
        jornadas.append({'n':int(m[1]),'fecha':med,'partidos':partidos})
    out={'liga':liga,'temporada':'26/27','fuente':url,'fecha':HOY,'nota':'Calendario oficial publicado (vía Transfermarkt). Fechas de partidos posteriores pueden moverse por TV; resultadoReal = partidos ya jugados en la vida real. fecha de jornada = fecha mediana; reprogramado=true si el partido se juega a más de 4 días de su jornada (adelantado o postergado en la vida real).','jornadas':jornadas}
    json.dump(out,open(f"{D}/fixtures/{SLUG(liga)}.json",'w'),ensure_ascii=False,indent=1)
    print(liga,len(jornadas),sum(len(j['partidos']) for j in jornadas),'clubes sin mapear',faltan)
u="https://comp.uefa.com/v2/coefficients?coefficientRange=OVERALL&coefficientType=MEN_ASSOCIATION&language=EN&page=1&pagesize=60&seasonYear=2027"
d=json.loads(subprocess.run(["curl","-s","-A","Mozilla/5.0",u],capture_output=True).stdout)['data']
cc={m['member']['countryCode']:m for m in d['members']}
ligas=[{'liga':liga,'pais':pc,'coef':cc[pc]['overallRanking']['totalValue'],'ranking':cc[pc]['overallRanking']['position'],
        'fuente':{'url':'https://www.uefa.com/nationalassociations/uefarankings/country/','fecha':HOY,'nota':'Coeficiente UEFA de asociaciones 5 temporadas, actualizado '+d['lastUpdateDate'][:10]}} for _,liga,pc in LIGAS]
json.dump(ligas,open(f"{D}/ligas.json",'w'),ensure_ascii=False,indent=1); print(ligas)
