"""Genera data/plantillas/<clubId>.json desde la vista detallada de plantilla de Transfermarkt.
Uso: python3 plantilla_tm.py <clubId> <html> <url>"""
import sys, json, re, datetime
from bs4 import BeautifulSoup
POS = {'Goalkeeper':'POR','Centre-Back':'DFC','Left-Back':'LI','Right-Back':'LD','Defensive Midfield':'MCD',
 'Central Midfield':'MC','Attacking Midfield':'MCO','Left Midfield':'MI','Right Midfield':'MD','Left Winger':'EI',
 'Right Winger':'ED','Centre-Forward':'DC','Second Striker':'SD'}
def valor(t):
    t=t.replace('€','').strip()
    if t in ('','-'): return None
    if t.endswith('m'): return round(float(t[:-1]),2)
    if t.endswith('k'): return round(float(t[:-1])/1000,3)
    return None
def contrato(t):
    m=re.match(r'(\d\d)/(\d\d)/(\d{4})',t); return f'{m[3]}-{m[2]}' if m else None
club, path, url = sys.argv[1:4]
s=BeautifulSoup(open(path).read(),'html.parser')
hoy=datetime.date.today().isoformat()
out=[]
for tr in s.select('table.items > tbody > tr'):
    td=tr.find_all('td',recursive=False)
    if len(td)<10: continue
    a=td[1].select_one('td.hauptlink a')
    rows=td[1].select('table.inline-table tr')
    posTxt=rows[-1].get_text(strip=True) if rows else ''
    edad=re.search(r'\((\d+)\)',td[2].get_text())
    nac=[i['title'] for i in td[3].select('img')]
    pid=re.search(r'/spieler/(\d+)',a['href'])[1]
    j={'id':f'tm{pid}','nombre':a.get_text(strip=True),'pos':POS.get(posTxt),'posSec':[],
       'edad':int(edad[1]) if edad else None,'nac':nac[0] if nac else None,
       'valorM':valor(td[9].get_text(strip=True)),'contratoHasta':contrato(td[8].get_text(strip=True)),
       'dorsal':int(td[0].get_text(strip=True)) if td[0].get_text(strip=True).isdigit() else None,
       'tmUrl':'https://www.transfermarkt.com'+a['href']}
    falt=[k for k in ('pos','edad','nac','valorM','contratoHasta') if j[k] is None]
    j['verificado']=not falt
    if falt: j['sinVerificar']=falt
    out.append(j)
json.dump({'clubId':club,'fecha':hoy,'fuente':url,'nota':'posSec vacío: Transfermarkt lo da solo en el perfil de cada jugador; pendiente.','jugadores':out},
          open(f'/workspace/fc26-hub/data/plantillas/{club}.json','w'),ensure_ascii=False,indent=1)
print(club,len(out),'sin verificar:',[(j['nombre'],j['sinVerificar']) for j in out if not j['verificado']])
