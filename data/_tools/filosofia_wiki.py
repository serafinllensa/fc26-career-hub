"""Filosofía de los 30 DTs más conocidos: etiquetas sacadas de la sección de estilo/tácticas de su artículo en Wikipedia (en inglés), con la frase que lo respalda."""
import json,re,subprocess,urllib.parse,os,time,datetime
D='/workspace/fc26-hub/data'; C='/workspace/.wikicache'; HOY=datetime.date.today().isoformat()
TOP={'Pep Guardiola':'Pep Guardiola','Jürgen Klopp':'Jürgen Klopp','Carlo Ancelotti':'Carlo Ancelotti','Zinédine Zidane':'Zinedine Zidane','Thomas Tuchel':'Thomas Tuchel',
'José Mourinho':'José Mourinho','Hansi Flick':'Hansi Flick','Luis Enrique':'Luis Enrique','Mikel Arteta':'Mikel Arteta','Arne Slot':'Arne Slot',
'Xabi Alonso':'Xabi Alonso','Diego Simeone':'Diego Simeone','Antonio Conte':'Antonio Conte','Julian Nagelsmann':'Julian Nagelsmann','Massimiliano Allegri':'Massimiliano Allegri',
'Erik ten Hag':'Erik ten Hag','Rúben Amorim':'Rúben Amorim','Unai Emery':'Unai Emery',
'Gian Piero Gasperini':'Gian Piero Gasperini','Maurizio Sarri':'Maurizio Sarri','Luciano Spalletti':'Luciano Spalletti',
'Andoni Iraola':'Andoni Iraola','Roberto De Zerbi':'Roberto De Zerbi','Enzo Maresca':'Enzo Maresca','Vincent Kompany':'Vincent Kompany','Eddie Howe':'Eddie Howe','Rafael Benítez':'Rafael Benítez','Thiago Motta':'Thiago Motta','Gennaro Gattuso':'Gennaro Gattuso','Marcelo Bielsa':'Marcelo Bielsa','Luis de la Fuente':'Ernesto Valverde'}
TOP['Ernesto Valverde']=TOP.pop('Luis de la Fuente')
K={'posesion':r'possession|tiki-taka|juego de posici|positional play|build[- ]up from the back|short passing',
 'presion-alta':r'high press|pressing|gegenpress|counter-press|press high|high defensive line',
 'transiciones':r'transition',
 'contragolpe':r'counter-attack|counterattack|on the break',
 'bloque-bajo':r'low block|defensive solidity|deep defensive|sitting deep|catenaccio|defend deep',
 'juego-directo':r'direct football|long ball|direct style|direct play',
 'juveniles':r'youth (players|academy|system|development)|young players|academy graduates|promot\w+ youth'}
SEC=r'(Style of (management|play|coaching)|Managerial style|Coaching style|Tactics|Tactical|Philosophy|Style)'
def get(q,f):
    p=f'{C}/{f}'
    if not os.path.exists(p):
        open(p,'w').write(subprocess.run(['curl','-s','-A','FC26Hub/1.0','https://en.wikipedia.org/w/api.php?'+urllib.parse.urlencode(q)],capture_output=True,text=True).stdout); time.sleep(0.3)
    return json.load(open(p))
def limpio(t):
    t=re.sub(r'<ref[^>]*/>|<ref[^>]*>.*?</ref>','',t,flags=re.S)
    for _ in range(4): t=re.sub(r'\{\{[^{}]*\}\}','',t)
    t=re.sub(r'\[\[(?:[^|\]]*\|)?([^\]]*)\]\]',r'\1',t); return re.sub(r"'{2,}",'',t)
dts=json.load(open(f'{D}/dts.json')); porNom={t['nombre']:t for t in dts}; rep=[]
for nom,art in TOP.items():
    t=porNom.get(nom)
    if not t: rep.append((nom,'NO EN DTS')); continue
    g=get({'action':'parse','page':art,'prop':'wikitext|revid','format':'json','redirects':1},'dt_'+re.sub(r'\W','_',art)+'.json')
    if 'parse' not in g: rep.append((nom,'SIN ARTICULO')); continue
    w=g['parse']
    tx=w['wikitext']['*']; rev=w.get('revid')
    txt=''; hs=list(re.finditer(r'^(=+)\s*([^=\n]+?)\s*\1\s*$',tx,re.M))
    for i,h in enumerate(hs):
        if re.search(SEC,h[2],re.I):
            lv=len(h[1]); fin=next((x.start() for x in hs[i+1:] if len(x[1])<=lv),len(tx)); txt+=tx[h.end():fin]
    txt=limpio(txt); fil=[]
    url=f"https://en.wikipedia.org/w/index.php?title={urllib.parse.quote(w['title'].replace(' ','_'))}&oldid={rev}"
    if txt:
        fr=re.split(r'(?<=[.!?])\s+',txt)
        cnt={k:[f for f in fr if re.search(v,f,re.I)] for k,v in K.items()}
        orden=sorted([k for k in cnt if cnt[k]],key=lambda k:-len(cnt[k]))
        for k in orden[:3]:
            if len(cnt[k])>=1: fil.append({'valor':k,'fuente':url,'fecha':HOY,'cita':cnt[k][0].strip()[:300]})
    t['filosofia']=fil
    t['fuentes']=[f for f in t['fuentes'] if f.get('campo')!='filosofia' and f.get('campo')!='filosofia,temperamento']+[
        {'campo':'filosofia','url':url if fil else None,'fecha':HOY,'nota':'Etiquetas sacadas de la sección de estilo o tácticas de Wikipedia; cada una trae la frase que la respalda.' if fil else 'Sin sección de estilo con fuente: queda vacío.'}]
    t['preferenciasFuente']='top30'
    rep.append((nom,[f['valor'] for f in fil],t['formaciones']))
json.dump(dts,open(f'{D}/dts.json','w'),ensure_ascii=False,indent=1)
for r in rep: print(r)
