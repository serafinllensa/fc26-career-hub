"""Pipeline v1: 5 grandes ligas desde Transfermarkt (temporada 26/27).
Genera data/clubes.json y data/plantillas/<clubId>.json. Cachea HTML en /workspace/.tmcache."""
import os, re, json, time, datetime, unicodedata, subprocess, sys
from bs4 import BeautifulSoup
import pycountry
sys.path.insert(0, os.path.dirname(__file__))
UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
BASE="https://www.transfermarkt.com"; C="/workspace/.tmcache"; os.makedirs(C,exist_ok=True)
D="/workspace/fc26-hub/data"; HOY=datetime.date.today().isoformat()
LIGAS=[("GB1","Inglaterra","Premier League"),("ES1","España","LaLiga"),("IT1","Italia","Serie A"),("L1","Alemania","Bundesliga"),("FR1","Francia","Ligue 1")]
def get(url,name):
    p=f"{C}/{name}.html"
    if not os.path.exists(p) or os.path.getsize(p)<20000:
        for i in range(3):
            subprocess.run(["curl","-s","-A",UA,url,"-o",p]); time.sleep(1.2)
            if os.path.getsize(p)>20000: break
    return BeautifulSoup(open(p,encoding='utf-8').read(),'lxml')
def slug(t):
    t=unicodedata.normalize('NFKD',t).encode('ascii','ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+','-',t).strip('-')
from paises import iso, FALTAN
POS={'Goalkeeper':'POR','Centre-Back':'DFC','Left-Back':'LI','Right-Back':'LD','Defensive Midfield':'MCD','Central Midfield':'MC',
 'Attacking Midfield':'MCO','Left Midfield':'MI','Right Midfield':'MD','Left Winger':'EI','Right Winger':'ED','Centre-Forward':'DC','Second Striker':'SD'}
def money(t):
    t=t.replace('€','').replace(',','.').strip().lower()
    m=re.match(r'([\d.]+)\s*(bn|m|k)',t)
    if not m: return None
    v=float(m[1]); return round(v*1000 if m[2]=='bn' else v if m[2]=='m' else v/1000,3)
def fecha(t):
    m=re.match(r'(\d\d)/(\d\d)/(\d{4})',t); return f'{m[3]}-{m[2]}' if m else None
def plantilla(cid,tmid,tmslug):
    url=f"{BASE}/{tmslug}/kader/verein/{tmid}/saison_id/2026/plus/1"; s=get(url,f"k{tmid}")
    js=[]
    for tr in s.select('table.items > tbody > tr'):
        td=tr.find_all('td',recursive=False)
        if len(td)<10: continue
        a=td[1].select_one('td.hauptlink a'); rows=td[1].select('table.inline-table tr')
        pos=rows[-1].get_text(strip=True) if rows else ''
        ed=re.search(r'\((\d+)\)',td[2].get_text()); nac=[i['title'] for i in td[3].select('img')]
        d=td[0].get_text(strip=True)
        j={'id':'tm'+re.search(r'/spieler/(\d+)',a['href'])[1],'nombre':a.get_text(strip=True),'pos':POS.get(pos),'posSec':[],
           'edad':int(ed[1]) if ed else None,'nac':nac[0] if nac else None,'nacCodigo':iso(nac[0]) if nac else None,
           'nac2':nac[1] if len(nac)>1 else None,'valorM':money(td[9].get_text(strip=True)),
           'contratoHasta':fecha(td[8].get_text(strip=True)),'dorsal':int(d) if d.isdigit() else None,'tmUrl':BASE+a['href'].split('/saison_id')[0]}
        if j['nac2'] is None: del j['nac2']
        f=[k for k in ('pos','edad','nac','nacCodigo','valorM','contratoHasta') if j[k] is None]
        j['verificado']=not f
        if f: j['sinVerificar']=f
        js.append(j)
    json.dump({'clubId':cid,'fecha':HOY,'fuente':url,'nota':'Foto de Transfermarkt. posSec pendiente (segunda pasada desde el perfil de cada jugador).','jugadores':js},
              open(f"{D}/plantillas/{cid}.json",'w'),ensure_ascii=False,indent=1)
    return js
def nivel(v):  # regla documentada: por valor de plantilla (M€)
    return 5 if v>=900 else 4 if v>=400 else 3 if v>=200 else 2 if v>=100 else 1
clubes=[]; resumen=[]
for code,pais,liga in LIGAS:
    lurl=f"{BASE}/x/startseite/wettbewerb/{code}/saison_id/2026"; s=get(lurl,f"lg{code}")
    t=get(f"{BASE}/x/tabelle/wettbewerb/{code}/saison_id/2026",f"tb{code}")
    cortos={}
    for a in t.select('table.items td.hauptlink a[href*="/verein/"]'):
        m=re.search(r'/verein/(\d+)',a['href']); 
        if m and a.get_text(strip=True): cortos[m[1]]=a.get_text(strip=True)
    for tr in s.select('table.items > tbody > tr'):
        a=tr.select_one('td.hauptlink a[href*="/startseite/verein/"]')
        if not a: continue
        tmid=re.search(r'/verein/(\d+)',a['href'])[1]; nombre=a.get('title') or a.get_text(strip=True)
        cid=slug(nombre); kslug=[x['href'] for x in tr.select('a[href*="/kader/verein/"]')][0].split('/')[1]
        js=plantilla(cid,tmid,kslug)
        st=get(f"{BASE}/x/startseite/verein/{tmid}/saison_id/2026",f"s{tmid}")
        df=get(f"{BASE}/x/datenfakten/verein/{tmid}",f"d{tmid}")
        mv=st.select_one('.data-header__market-value-wrapper'); vp=money(mv.get_text(' ',strip=True)) if mv else None
        if vp is None: vp=round(sum(j['valorM'] or 0 for j in js),2)
        estadio=None
        for li in st.select('.data-header__items li'):
            if li.get_text(strip=True).startswith('Stadium'):
                e=li.select_one('a'); estadio=e.get_text(strip=True) if e else None
        cols=re.findall(r'background-color:\s*(#[0-9A-Fa-f]{6})',str(df.select_one('p.vereinsfarbe') or ''))
        ciudad=None; oficial=None; rows=df.select('table.profilheader tr')
        for k,tr2 in enumerate(rows):
            txt=tr2.get_text(' | ',strip=True)
            if txt.startswith('Official club name'): oficial=txt.split('|')[1].strip()
            if txt.startswith('Address') and k+1<len(rows): ciudad=rows[k+1].get_text(' | ',strip=True).split('|')[0].strip()
        fu=f"{BASE}/x/startseite/verein/{tmid}"; fd=f"{BASE}/x/datenfakten/verein/{tmid}"
        c={'id':cid,'tmId':int(tmid),'nombre':nombre,'nombreOficial':oficial,'corto':cortos.get(tmid,nombre),'pais':pais,'liga':liga,
           'nivel':nivel(vp),'ciudad':ciudad,'estadio':estadio,'valorPlantillaM':vp,'jugadores':len(js),
           'colores':{'principal':cols[0] if cols else None,'secundario':cols[1] if len(cols)>1 else None},
           'presupuestoFichajesM':None,'masaSalarialM':None,'presidente':{'perfil':None,'nota':'Sin fuente verificable; pendiente de definir.'},
           'estilo':[],'fuentes':[{'campo':'nombre,valorPlantillaM,estadio','url':fu,'fecha':HOY},{'campo':'colores,ciudad,nombreOficial','url':fd,'fecha':HOY},
            {'campo':'nivel','url':None,'fecha':HOY,'nota':'Calculado por valor de plantilla: N5 >=900, N4 >=400, N3 >=200, N2 >=100, N1 <100 M€.'},
            {'campo':'presupuestoFichajesM,masaSalarialM','url':None,'fecha':HOY,'nota':'null a propósito: los estima Motor y se muestran como rango "estimado".'}]}
        clubes.append(c); resumen.append((liga,cid,len(js),sum(1 for j in js if not j['verificado'])))
        print(liga,cid,len(js),vp,c['nivel'],cols,ciudad,flush=True)
json.dump(clubes,open(f"{D}/clubes.json",'w'),ensure_ascii=False,indent=1)
print('CLUBES',len(clubes),'JUGADORES',sum(r[2] for r in resumen),'SIN VERIFICAR',sum(r[3] for r in resumen),'PAISES SIN ISO',sorted(FALTAN))
