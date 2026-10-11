import json,re,subprocess,os,urllib.parse,time
C='/workspace/.wikicache'; D='/workspace/fc26-hub/data'
def api(q,f):
    p=f"{C}/{f}"
    if not os.path.exists(p):
        r=subprocess.run(['curl','-s','-A','FC26Hub/1.0 (datos)','https://en.wikipedia.org/w/api.php?'+urllib.parse.urlencode(q)],capture_output=True,text=True).stdout
        open(p,'w').write(r); time.sleep(0.3)
    return json.load(open(p))
cl=json.load(open(f'{D}/clubes.json')); out={}
for c in cl:
    s=api({'action':'query','list':'search','srsearch':f"{c['nombre']} football club {c['pais'] if isinstance(c['pais'],str) else ''}",'format':'json','srlimit':1},f"s_{c['id']}.json")
    hits=s['query']['search']
    if not hits: out[c['id']]=None; continue
    t=hits[0]['title']
    w=api({'action':'parse','page':t,'prop':'wikitext','format':'json','redirects':1},f"w_{c['id']}.json")
    tx=w.get('parse',{}).get('wikitext',{}).get('*','')
    m=re.search(r'\|\s*owner\s*=\s*(.+)',tx); ch=re.search(r'\|\s*chairman\s*=\s*(.+)',tx)
    out[c['id']]={'titulo':t,'owner':m[1].strip()[:250] if m else None,'chairman':ch[1].strip()[:120] if ch else None}
json.dump(out,open('/workspace/.wikicache/duenos.json','w'),ensure_ascii=False,indent=1)
