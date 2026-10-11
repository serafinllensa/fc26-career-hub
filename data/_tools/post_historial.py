import json,re
D='/workspace/fc26-hub/data'; cl=json.load(open(f'{D}/clubes.json'))
DIV={'First Tier':1,'Second Tier':2,'Third Tier':3,'Fourth Tier':4}
def r(e):
    t=e['ronda']
    if t.startswith('Group') or t=='League Phase' or t.startswith('Matchday'): return 'fase'
    if t.startswith('intermediate') or 'Play' in t and 'off' in t.lower() and 'Qual' not in t: return 'playoff'
    if t=='Last 16': return 'octavos'
    if t=='Quarter-Finals': return 'cuartos'
    if t=='Semi-Finals': return 'semis'
    if t=='Final': return 'campeon' if e.get('campeon') else 'final'
    return 'previa'
for c in cl:
    for h in c['historial']:
        h['divisionNivel']=DIV.get(h['division']); 
        main={e['comp'] for e in h['europa'] if not e['comp'].endswith('-previa')}
        out=[]
        for e in h['europa']:
            comp=e['comp'].replace('-previa','')
            if e['comp'].endswith('-previa'):
                if comp in main: continue
                out.append(f'{comp}:previa')
            else: out.append(f'{comp}:{r(e)}')
        h['europaDetalle']=h['europa']; h['europa']=out
        if h['copa']: h['copa']['rondaES']=r(h['copa']) if h['copa']['ronda'] in ('Final','Semi-Finals','Quarter-Finals','Last 16') else h['copa']['ronda']
    c['fuentes']=[f for f in c['fuentes'] if f['campo'] not in ('historial','actual')]
    c['fuentes']+= [{'campo':'historial','url':'https://www.transfermarkt.com/x/platzierungen/verein/%d'%c['tmId'],'fecha':c['actual']['fecha'],'nota':'Posiciones (platzierungen) y rondas europeas y de copa (spielplan de cada temporada), Transfermarkt. europa = comp:ronda; previa = eliminado en clasificación. Campeón se deduce del resultado de la final en 90/120 minutos; si fue por penales queda como final.'},
                    {'campo':'actual','url':'https://www.transfermarkt.com/x/platzierungen/verein/%d'%c['tmId'],'fecha':c['actual']['fecha']}]
json.dump(cl,open(f'{D}/clubes.json','w'),ensure_ascii=False,indent=1)
import collections; print(collections.Counter(e for c in cl for h in c['historial'] for e in h['europa']).most_common())
print('actual sin pos',[c['id'] for c in cl if c['actual']['posicion'] is None])
for i in ('aston-villa','olympique-lyon','tottenham-hotspur','paris-saint-germain','real-madrid'):
    c=[x for x in cl if x['id']==i][0]; print(i,[(h['temporada'],h['posicion'],h['europa']) for h in c['historial']],c['actual']['posicion'])
