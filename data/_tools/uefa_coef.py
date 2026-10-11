import json, unicodedata, re, difflib
M=[]
for p in (1,2,3): M+=json.load(open(f'/tmp/uefa{p}.json'))['data']['members']
PA={'Inglaterra':'ENG','España':'ESP','Italia':'ITA','Alemania':'GER','Francia':'FRA'}
def n(t):
    t=unicodedata.normalize('NFKD',t).encode('ascii','ignore').decode().lower()
    t=re.sub(r'\b(fc|cf|ac|as|ss|ssc|acf|afc|sc|vfb|vfl|tsg|rc|ogc|cd|ud|rcd|sv|club|calcio|de|1899|1909|1913|04|05|1|29|hsc|stade|olympique|football|futbol|us|bc|aj|sco|estac|losc)\b',' ',t)
    return re.sub(r'\s+',' ',re.sub(r'[^a-z ]',' ',t)).strip()
OV={'paris-fc':'__ninguno__','manchester-united':'Man Utd','manchester-city':'Man City','bayern-munich':'Bayern München','inter-milan':'Inter','ac-milan':'Milan',
 'paris-saint-germain':'Paris','olympique-marseille':'Marseille','olympique-lyon':'Lyon','athletic-bilbao':'Athletic Club','atletico-de-madrid':'Atleti',
 'borussia-monchengladbach':'Mönchengladbach','eintracht-frankfurt':'Frankfurt','bayer-04-leverkusen':'Leverkusen','ss-lazio':'Lazio','as-roma':'Roma'}
D='/workspace/fc26-hub/data'; cl=json.load(open(f'{D}/clubes.json')); sin=[]
M22=[]
for p in (1,2,3): M22+=json.load(open(f'/tmp/uefa22_{p}.json'))['data']['members']
def buscar(c,M):
    cand=[m for m in M if m['member']['countryCode']==PA[c['pais']]]
    names={m['member']['displayName']:m for m in cand}
    hit=None
    if c['id'] in OV: hit=names.get(OV[c['id']])
    else:
        tgt=[n(c['nombre']),n(c['corto']),n(c.get('nombreOficial') or '')]
        best=(0,None)
        for m in cand:
            for k in ('displayName','displayOfficialName','internationalName'):
                for t in tgt:
                    if not t: continue
                    r=difflib.SequenceMatcher(None,t,n(m['member'][k])).ratio()
                    if r>best[0]: best=(r,m)
        if best[0]>=0.85: hit=best[1]
    return hit
for c in cl:
    hit=buscar(c,M); h22=buscar(c,M22)
    c['coefUEFA5a10']=h22['overallRanking']['totalValue'] if h22 else None
    c['fuentes']=[f for f in c['fuentes'] if f['campo'] not in ('coefUEFA','siglaUEFA')]
    url='https://www.uefa.com/nationalassociations/uefarankings/club/'
    c['coefUEFA10']=round((hit['overallRanking']['totalValue'] if hit else 0)+(c['coefUEFA5a10'] or 0),3)
    c['fuentes']=[f for f in c['fuentes'] if f['campo']!='coefUEFA10']
    c['fuentes'].append({'campo':'coefUEFA10','url':url,'fecha':'2026-10-10','nota':'Suma de dos coeficientes UEFA de 5 temporadas: 2022/23-2026/27 y 2017/18-2021/22 ('+str(c['coefUEFA5a10'])+'). Sin presencia en un período cuenta 0.'})
    if hit:
        c['uefaId']=hit['member']['id']
        o=hit['overallRanking']; c['coefUEFA']=o['totalValue']; c['rankingUEFA']=o['position']; c['uefaNombre']=hit['member']['displayName']
        c['siglaOficial']=hit['member'].get('displayTeamCode')
        c['fuentes'].append({'campo':'coefUEFA,rankingUEFA,siglaOficial','url':url,'fecha':hit and '2026-10-10','nota':'Coeficiente de clubes UEFA 5 temporadas (2022/23 a 2026/27), actualizado por UEFA el '+json.load(open('/tmp/uefa1.json'))['data']['lastUpdateDate'][:10]+'.'})
    else:
        c['coefUEFA']=None; c['rankingUEFA']=None; c['siglaOficial']=None; sin.append(c['id'])
        c['fuentes'].append({'campo':'coefUEFA','url':url,'fecha':'2026-10-10','nota':'No figura en el ranking UEFA: sin partidos europeos en las últimas 5 temporadas.'})
json.dump(cl,open(f'{D}/clubes.json','w'),ensure_ascii=False,indent=1)
print('con coef',96-len(sin)); print('sin',sin)
print([(c['id'],c['uefaNombre'],c['coefUEFA']) for c in cl if c.get('uefaNombre')])
