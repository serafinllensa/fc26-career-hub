#!/usr/bin/env python3
"""Segundas divisiones 2026/27 desde la Wikipedia en inglés.

Nada inventado: valor de mercado y fin de contrato quedan vacíos.
El puesto fino (lateral, mediapunta…) no está en la fuente: GK→POR,
DF→DFC, MF→MC, FW→DC, y queda marcado como sin verificar.
"""
import json, os, re, time, unicodedata, urllib.parse, urllib.request
from datetime import date
from pathlib import Path

import mwparserfromhell

ROOT = Path('/workspace/hub/data')
CACHE = Path('/tmp/wiki2')
OUT = CACHE / 'out'
UA = 'FC26CareerHub/1.0 (fan career snapshot; serafinllensa@gmail.com)'
HOY = date(2026, 10, 12)
FECHA = '2026-10-12'

LIGAS = [
    {
        'liga': 'Championship', 'pais': 'Inglaterra', 'padre': 'Premier League',
        'wiki': CACHE / 'championship.wiki', 'page': '2026–27 EFL Championship',
        'html': CACHE / 'championship.html',
        'directo': 2, 'playoff': 8, 'descenso': 22, 'equipos': 24,
        'copa': 'FA Cup',
        'formato': 'Ascienden los 2 primeros. Del 3º al 8º hay playoff (primera temporada con 6 equipos). Descienden los 3 últimos.',
    },
    {
        'liga': 'Segunda División', 'pais': 'España', 'padre': 'LaLiga',
        'wiki': CACHE / 'segunda.wiki', 'page': '2026–27 Segunda División',
        'html': CACHE / 'html-segunda.html',
        'directo': 2, 'playoff': 6, 'descenso': 19, 'equipos': 22,
        'copa': 'Copa del Rey',
        'formato': 'Ascienden los 2 primeros. Del 3º al 6º hay playoff. Descienden los 4 últimos. Un filial no puede ascender.',
    },
    {
        'liga': 'Serie B', 'pais': 'Italia', 'padre': 'Serie A',
        'wiki': CACHE / 'serieb.wiki', 'page': '2026–27 Serie B',
        'html': CACHE / 'html-serieb.html',
        'directo': 2, 'playoff': 8, 'descenso': 16, 'equipos': 20,
        'copa': 'Coppa Italia',
        'formato': 'Ascienden los 2 primeros. Del 3º al 8º hay playoff. El 16º y el 17º juegan el play-out. Descienden directo los 3 últimos.',
    },
    {
        'liga': '2. Bundesliga', 'pais': 'Alemania', 'padre': 'Bundesliga',
        'wiki': CACHE / 'bundes2.wiki', 'page': '2026–27 2. Bundesliga',
        'html': CACHE / 'html-bundes2.html',
        'directo': 2, 'playoff': 3, 'descenso': 16, 'equipos': 18,
        'copa': 'DFB-Pokal',
        'formato': 'Ascienden los 2 primeros. El 3º juega el repechaje contra el 16º de la Bundesliga. El 16º juega el repechaje de descenso. Bajan directo los 2 últimos.',
    },
    {
        'liga': 'Ligue 2', 'pais': 'Francia', 'padre': 'Ligue 1',
        'wiki': CACHE / 'ligue2.wiki', 'page': '2026–27 Ligue 2',
        'html': CACHE / 'html-ligue2.html',
        'directo': 2, 'playoff': 5, 'descenso': 16, 'equipos': 18,
        'copa': 'Coupe de France',
        'formato': 'Ascienden los 2 primeros. El 3º entra a semis del playoff y el 4º y el 5º a cuartos. El 16º juega el playoff de descenso. Bajan directo los 2 últimos.',
    },
]

POS = {'GK': 'POR', 'DF': 'DFC', 'MF': 'MC', 'FW': 'DC'}
MESES = {m: i for i, m in enumerate(
    'january february march april may june july august september october november december'.split(), 1)}
NAT = {
    'ENG': ('England', 'GB-ENG'), 'SCO': ('Scotland', 'GB-SCT'), 'WAL': ('Wales', 'GB-WLS'),
    'NIR': ('Northern Ireland', 'GB-NIR'), 'IRL': ('Ireland', 'IE'), 'ESP': ('Spain', 'ES'),
    'FRA': ('France', 'FR'), 'GER': ('Germany', 'DE'), 'ITA': ('Italy', 'IT'), 'POR': ('Portugal', 'PT'),
    'NED': ('Netherlands', 'NL'), 'BEL': ('Belgium', 'BE'), 'SUI': ('Switzerland', 'CH'),
    'AUT': ('Austria', 'AT'), 'POL': ('Poland', 'PL'), 'CZE': ('Czech Republic', 'CZ'),
    'SVK': ('Slovakia', 'SK'), 'HUN': ('Hungary', 'HU'), 'ROU': ('Romania', 'RO'),
    'BUL': ('Bulgaria', 'BG'), 'GRE': ('Greece', 'GR'), 'TUR': ('Turkey', 'TR'),
    'CRO': ('Croatia', 'HR'), 'SRB': ('Serbia', 'RS'), 'SVN': ('Slovenia', 'SI'),
    'BIH': ('Bosnia and Herzegovina', 'BA'), 'MKD': ('North Macedonia', 'MK'),
    'ALB': ('Albania', 'AL'), 'MNE': ('Montenegro', 'ME'), 'UKR': ('Ukraine', 'UA'),
    'RUS': ('Russia', 'RU'), 'DEN': ('Denmark', 'DK'), 'SWE': ('Sweden', 'SE'),
    'NOR': ('Norway', 'NO'), 'FIN': ('Finland', 'FI'), 'ISL': ('Iceland', 'IS'),
    'BRA': ('Brazil', 'BR'), 'ARG': ('Argentina', 'AR'), 'URU': ('Uruguay', 'UY'),
    'COL': ('Colombia', 'CO'), 'CHI': ('Chile', 'CL'), 'PAR': ('Paraguay', 'PY'),
    'PER': ('Peru', 'PE'), 'ECU': ('Ecuador', 'EC'), 'VEN': ('Venezuela', 'VE'),
    'BOL': ('Bolivia', 'BO'), 'MEX': ('Mexico', 'MX'), 'USA': ('United States', 'US'),
    'CAN': ('Canada', 'CA'), 'CRC': ('Costa Rica', 'CR'), 'HON': ('Honduras', 'HN'),
    'PAN': ('Panama', 'PA'), 'JAM': ('Jamaica', 'JM'), 'TRI': ('Trinidad and Tobago', 'TT'),
    'JPN': ('Japan', 'JP'), 'KOR': ('South Korea', 'KR'), 'CHN': ('China', 'CN'),
    'AUS': ('Australia', 'AU'), 'NZL': ('New Zealand', 'NZ'), 'MAR': ('Morocco', 'MA'),
    'ALG': ('Algeria', 'DZ'), 'TUN': ('Tunisia', 'TN'), 'EGY': ('Egypt', 'EG'),
    'SEN': ('Senegal', 'SN'), 'NGA': ('Nigeria', 'NG'), 'GHA': ('Ghana', 'GH'),
    'CIV': ('Ivory Coast', 'CI'), 'CMR': ('Cameroon', 'CM'), 'MLI': ('Mali', 'ML'),
    'GUI': ('Guinea', 'GN'), 'COD': ('DR Congo', 'CD'), 'RSA': ('South Africa', 'ZA'),
    'CPV': ('Cape Verde', 'CV'), 'ANG': ('Angola', 'AO'), 'MOZ': ('Mozambique', 'MZ'),
    'GAB': ('Gabon', 'GA'), 'BUR': ('Burkina Faso', 'BF'), 'TOG': ('Togo', 'TG'),
    'BEN': ('Benin', 'BJ'), 'GAM': ('Gambia', 'GM'), 'MTN': ('Mauritania', 'MR'),
    'EQG': ('Equatorial Guinea', 'GQ'), 'MAD': ('Madagascar', 'MG'), 'ZIM': ('Zimbabwe', 'ZW'),
    'ISR': ('Israel', 'IL'), 'IRN': ('Iran', 'IR'), 'IRQ': ('Iraq', 'IQ'),
    'KSA': ('Saudi Arabia', 'SA'), 'QAT': ('Qatar', 'QA'), 'UAE': ('United Arab Emirates', 'AE'),
    'GEO': ('Georgia', 'GE'), 'ARM': ('Armenia', 'AM'), 'AZE': ('Azerbaijan', 'AZ'),
    'KAZ': ('Kazakhstan', 'KZ'), 'LUX': ('Luxembourg', 'LU'), 'CYP': ('Cyprus', 'CY'),
    'MLT': ('Malta', 'MT'), 'AND': ('Andorra', 'AD'), 'FRO': ('Faroe Islands', 'FO'),
    'EST': ('Estonia', 'EE'), 'LAT': ('Latvia', 'LV'), 'LTU': ('Lithuania', 'LT'),
    'BLR': ('Belarus', 'BY'), 'MDA': ('Moldova', 'MD'), 'KOS': ('Kosovo', 'XK'),
    'WAL': ('Wales', 'GB-WLS'), 'CUW': ('Curaçao', 'CW'), 'SUR': ('Suriname', 'SR'),
    'HAI': ('Haiti', 'HT'), 'GUA': ('Guatemala', 'GT'), 'SLV': ('El Salvador', 'SV'),
    'NCA': ('Nicaragua', 'NI'), 'PUR': ('Puerto Rico', 'PR'), 'DOM': ('Dominican Republic', 'DO'),
    'PHI': ('Philippines', 'PH'), 'IDN': ('Indonesia', 'ID'), 'THA': ('Thailand', 'TH'),
    'VIE': ('Vietnam', 'VN'), 'MAS': ('Malaysia', 'MY'), 'SIN': ('Singapore', 'SG'),
    'IND': ('India', 'IN'), 'KGZ': ('Kyrgyzstan', 'KG'), 'UZB': ('Uzbekistan', 'UZ'),
    'TKM': ('Turkmenistan', 'TM'), 'LBN': ('Lebanon', 'LB'), 'SYR': ('Syria', 'SY'),
    'JOR': ('Jordan', 'JO'), 'PLE': ('Palestine', 'PS'), 'COM': ('Comoros', 'KM'),
    'CTA': ('Central African Republic', 'CF'), 'CGO': ('Congo', 'CG'), 'ZAM': ('Zambia', 'ZM'),
    'TAN': ('Tanzania', 'TZ'), 'UGA': ('Uganda', 'UG'), 'KEN': ('Kenya', 'KE'),
    'RWA': ('Rwanda', 'RW'), 'BDI': ('Burundi', 'BI'), 'ETH': ('Ethiopia', 'ET'),
    'LBY': ('Libya', 'LY'), 'SUD': ('Sudan', 'SD'), 'NAM': ('Namibia', 'NA'),
    'BOT': ('Botswana', 'BW'), 'MRI': ('Mauritius', 'MU'), 'SEY': ('Seychelles', 'SC'),
    'LIE': ('Liechtenstein', 'LI'), 'SMR': ('San Marino', 'SM'), 'GIB': ('Gibraltar', 'GI'),
    'WAL': ('Wales', 'GB-WLS'),
}


def slug(s):
    s = unicodedata.normalize('NFKD', s or '')
    s = ''.join(c for c in s if not unicodedata.combining(c))
    s = s.lower().replace('&', ' and ').replace("'", '')
    s = re.sub(r'[^a-z0-9]+', '-', s).strip('-')
    return s or 'x'


def norm(s):
    return slug(s).replace('-', ' ')


def get(url, cache=None, timeout=40):
    if cache and cache.exists() and cache.stat().st_size > 200:
        return cache.read_bytes()
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': '*/*'})
    espera = 1.2
    ultimo = None
    for intento in range(6):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                data = r.read()
            if cache:
                cache.parent.mkdir(parents=True, exist_ok=True)
                cache.write_bytes(data)
            time.sleep(0.35)
            return data
        except Exception as e:
            ultimo = e
            codigo = getattr(e, 'code', None)
            if codigo == 404:
                raise
            print(f'  retry {intento} {codigo} {url[:90]} {e}', flush=True)
            time.sleep(espera)
            espera = min(espera * 2, 30)
    raise RuntimeError(f'no se pudo bajar {url}: {ultimo}')


def api(params):
    q = urllib.parse.urlencode(params, doseq=True)
    url = 'https://en.wikipedia.org/w/api.php?' + q
    return json.loads(get(url).decode('utf-8', 'replace'))


def plain(codigo):
    s = str(codigo or '')
    s = re.sub(r'<ref[^>]*>.*?</ref>', ' ', s, flags=re.S | re.I)
    s = re.sub(r'<ref[^>]*/>', ' ', s, flags=re.I)
    for _ in range(5):
        s2 = re.sub(r'\{\{\s*(?:nowrap|nobreak|nts|small|center|0)\s*\|\s*([^{}|]+)\}\}', r'\1', s, flags=re.I)
        if s2 == s:
            break
        s = s2
    w = mwparserfromhell.parse(s)
    t = w.strip_code(normalize=True, collapse=True)
    t = re.sub(r'\s+', ' ', t).strip(' |')
    return t


def tokens_club(s):
    n = norm(s)
    n = re.sub(r'\b(fc|cf|afc|sc|ac|ud|cd|sd|rc|as|us|ss|osc|fco|calcio|de|the|club)\b', ' ', n)
    return {w for w in n.split() if w and w not in {
        'real', 'united', 'city', 'sporting', 'athletic', 'deportivo', 'wanderers', 'rovers', 'hotspur'}}


def mismo_club(a, b):
    ta, tb = tokens_club(a), tokens_club(b)
    if not ta or not tb:
        return norm(a) == norm(b) and norm(a) not in ('', 'x')
    if ta == tb:
        return True
    if ta <= tb or tb <= ta:
        extra = (tb - ta) if ta <= tb else (ta - tb)
        if extra and all(len(x) > 2 for x in extra):
            return True
    return False


def links(codigo):
    w = mwparserfromhell.parse(str(codigo or ''))
    out = []
    for l in w.filter_wikilinks():
        titulo = str(l.title).strip()
        if titulo.lower().startswith(('file:', 'image:', 'category:')):
            continue
        texto = plain(l.text) if l.text else titulo.split('#')[0]
        texto = re.sub(r'\s+', ' ', texto).strip()
        out.append((titulo, texto))
    return out


def hexcolor(v):
    if not v:
        return None
    s = str(v).strip().strip('#').strip().lower()
    nombres = {'white': 'ffffff', 'black': '000000', 'red': 'ff0000', 'blue': '0000ff',
               'gold': 'ffd700', 'navy': '000080', 'green': '008000', 'yellow': 'ffff00',
               'navyblue': '000080', 'skyblue': '87ceeb', 'claret': '7f1734'}
    s = nombres.get(s, s)
    if re.fullmatch(r'[0-9a-f]{3}', s):
        s = ''.join(c * 2 for c in s)
    if re.fullmatch(r'[0-9a-f]{6}', s):
        return '#' + s.upper()
    return None


def split_rows(tabla):
    """Filas de una wikitable. Separa por salto+| y por ||, sin romper plantillas."""
    cuerpo = tabla.strip()
    if cuerpo.startswith('{|'):
        cuerpo = cuerpo[2:]
    if cuerpo.rstrip().endswith('|}'):
        cuerpo = cuerpo.rstrip()[:-2]
    filas, fila, celda = [], [], []
    depth = 0
    i, n = 0, len(cuerpo)

    def push_cell():
        nonlocal celda
        text = ''.join(celda).strip()
        text = re.sub(r'^(?:!\s*|\|\s*)', '', text)
        text = re.sub(r'^(?:[A-Za-z:-]+(?:=(?:"[^"]*"|[^\s|]+))?\s*)+\|\s*', '', text).strip()
        if text:
            fila.append(text)
        celda = []

    def push_row():
        nonlocal fila
        if any(c.strip() for c in fila):
            filas.append(fila)
        fila = []

    while i < n:
        ch = cuerpo[i]
        if ch == '{' and i + 1 < n and cuerpo[i + 1] == '{':
            depth += 1
            celda.append('{{')
            i += 2
            continue
        if ch == '}' and i + 1 < n and cuerpo[i + 1] == '}':
            depth = max(0, depth - 1)
            celda.append('}}')
            i += 2
            continue
        if depth == 0 and (cuerpo.startswith('||', i) or cuerpo.startswith('!!', i)):
            push_cell()
            i += 2
            continue
        if depth == 0 and ch == '\n':
            nxt = cuerpo[i + 1:i + 3]
            if nxt.startswith('|-') or nxt.startswith('|}'):
                push_cell()
                push_row()
                nl = cuerpo.find('\n', i + 1)
                i = n if nl < 0 else nl
                continue
            if nxt[:1] in ('|', '!') and not nxt.startswith('|+'):
                if ''.join(celda).strip():
                    push_cell()
                else:
                    celda = []
                i += 2
                if i < n and cuerpo[i] == ' ':
                    i += 1
                continue
        celda.append(ch)
        i += 1
    push_cell()
    push_row()
    return filas


def primera_tabla(texto, ancla):
    i = texto.lower().find(ancla.lower())
    if i < 0:
        return ''
    j = texto.find('\n==', i + 3)
    bloque = texto[i:j if j > 0 else None]
    m = re.search(r'\{\|.*?\n\|\}', bloque, re.S)
    return m.group(0) if m else ''


def persona(celda):
    """Nombre visible, título wiki y código de bandera."""
    nat = None
    w = mwparserfromhell.parse(str(celda or ''))
    for t in w.filter_templates():
        n = str(t.name).strip().lower()
        if 'flagicon' in n or n.endswith('flag') or 'fbicon' in n or n.startswith('#invoke:flag'):
            for p in t.params:
                code = plain(p).upper()
                if re.fullmatch(r'[A-Z]{3}', code):
                    nat = code
                    break
    ls = links(celda)
    if not ls:
        t = plain(celda) or None
        if t and re.search(r'\d{4}', t) and re.search(r'[A-Za-z]', t):
            # una fecha ("10 July 2026") no es un nombre
            if re.search(r'\d{1,2}\s+[A-Za-z]+\s+\d{4}', t):
                return None, None, nat
        return t, None, nat
    titulo, texto = ls[0]
    return texto or plain(titulo), titulo, nat


def origenes(texto):
    """Quién bajó de primera y quién subió de tercera, por título wiki."""
    desc, asc = set(), set()
    i = texto.lower().find('team change')
    if i < 0:
        i = texto.lower().find('==teams==')
    bloque = texto[i:i + 12000] if i >= 0 else texto[:8000]
    # Tabla de cuatro columnas, si existe.
    m = re.search(r'\{\|.*?\n\|\}', bloque, re.S)
    if m and 'Promoted' in m.group(0) and 'Relegated' in m.group(0):
        filas = split_rows(m.group(0))
        hi = next((i for i, f in enumerate(filas) if any('promoted' in plain(c).lower() for c in f)), None)
        if hi is not None:
            cabezas = [plain(c).lower() for c in filas[hi]]
            for fila in filas[hi + 1:]:
                for k, celda in enumerate(fila):
                    cab = cabezas[k] if k < len(cabezas) else ''
                    dest = None
                    if 'promoted from' in cab:
                        dest = asc
                    elif 'relegated from' in cab:
                        dest = desc
                    if dest is None:
                        continue
                    for titulo, texto in links(celda):
                        dest.add(titulo)
                        dest.add(norm(texto))
                        dest.add(norm(titulo))
        if desc or asc:
            return desc, asc
    # Listas con epígrafes en negrita (Championship, Serie B, Ligue 2).
    modo = None
    # Solo el tramo "hacia esta división", no el de los que se fueron.
    corte = re.search(r'===\s*From ', bloque)
    zona = bloque[:corte.start()] if corte else bloque
    for linea in zona.splitlines():
        bajo = plain(linea).lower()
        if 'promoted from' in bajo or 'promoted to the' in bajo and 'from' in bajo:
            modo = 'asc'
        elif linea.strip().startswith("'''") and 'promoted' in bajo:
            modo = 'asc'
        elif 'relegated from' in bajo:
            modo = 'desc'
        elif linea.strip().startswith("'''") and 'relegated' in bajo and 'to ' not in bajo:
            modo = 'desc'
        elif bajo.startswith('=== from') or 'relegated to' in bajo or 'promoted to' in bajo:
            if 'promoted from' not in bajo and 'relegated from' not in bajo:
                modo = None
        if linea.strip().startswith('*') and modo:
            for titulo, _t in links(linea):
                (asc if modo == 'asc' else desc).add(titulo)
    return desc, asc


def equipos_de_liga(cfg):
    texto = cfg['wiki'].read_text(errors='replace')
    desc, asc = origenes(texto)
    tabla = primera_tabla(texto, 'Stadiums and locations')
    if not tabla:
        tabla = primera_tabla(texto, 'Stadiums')
    equipos = []
    vistos = set()
    for fila in split_rows(tabla):
        if len(fila) < 3:
            continue
        ls = links(fila[0])
        if not ls:
            continue
        titulo, nombre = ls[0]
        if titulo in vistos or nombre.lower() in ('team', 'club'):
            continue
        vistos.add(titulo)
        ciudad = links(fila[1])
        estadio = links(fila[2])
        cap = plain(fila[3]) if len(fila) > 3 else ''
        m = re.search(r'(\d{1,3}(?:[.,]\d{3})+|\d{4,6})', cap)
        capacidad = int(m.group(1).replace(',', '').replace('.', '')) if m else None
        def esta(grupo):
            if titulo in grupo or norm(nombre) in grupo or norm(titulo) in grupo:
                return True
            return any(mismo_club(item, nombre) or mismo_club(item, titulo) for item in grupo)
        if esta(desc):
            origen = 'descenso'
        elif esta(asc):
            origen = 'ascenso'
        else:
            origen = 'permanece'
        reserva = bool(re.search(r'\sB$', nombre) or nombre in ('Celta Fortuna', 'Real Sociedad B') or 'Fortuna' == nombre.split()[-1] and 'Celta' in nombre)
        equipos.append({
            'titulo': titulo, 'nombre': nombre,
            'ciudad': ciudad[0][1] if ciudad else plain(fila[1]) or None,
            'estadio': estadio[0][1] if estadio else plain(fila[2]) or None,
            'capacidad': capacidad, 'origen': origen, 'reserva': reserva,
        })
    # Técnicos de la tabla de personal.
    personal = primera_tabla(texto, 'Personnel')
    por_nombre = {}
    for fila in split_rows(personal):
        if len(fila) < 2:
            continue
        ls = links(fila[0])
        clave = norm(ls[0][1] if ls else plain(fila[0]))
        if clave in ('team', 'main', '') or 'sponsor' in clave:
            continue
        nom, titulo_p, nat = persona(fila[1])
        if not nom or not re.search(r'[A-Za-z]', nom):
            continue
        por_nombre[clave] = {'nombre': nom, 'titulo': titulo_p, 'nat': nat}
        if ls:
            por_nombre[norm(ls[0][0])] = por_nombre[clave]
    cambios = primera_tabla(texto, 'Managerial changes')
    fechas = {}
    for fila in split_rows(cambios):
        if not fila:
            continue
        ls = links(fila[0])
        clave = norm(ls[0][1] if ls else plain(fila[0]))
        if not clave or clave == 'team':
            continue
        personas, cuando = [], None
        for c in fila[1:]:
            fch = parse_fecha(c)
            if fch:
                cuando = fch
            nom, tit, nat = persona(c)
            if nom and tit and not parse_fecha(nom):
                personas.append((nom, tit, nat))
        if personas and cuando and cuando <= HOY:
            nom, tit, nat = personas[-1]
            fechas[clave] = {'nombre': nom, 'titulo': tit, 'nat': nat, 'fecha': cuando.isoformat()}
    for e in equipos:
        p = por_nombre.get(norm(e['nombre']))
        if not p:
            for k, v in por_nombre.items():
                if mismo_club(k, e['nombre']) or mismo_club(k, e['titulo']):
                    p = v
                    break
        f = fechas.get(norm(e['nombre']))
        if p:
            e['dt'] = p
            if f and norm(f['nombre']) == norm(p['nombre']):
                e['dt']['fecha'] = f['fecha']
                e['dt']['nat'] = e['dt'].get('nat') or f.get('nat')
        elif f:
            e['dt'] = {k: v for k, v in f.items()}
        else:
            e['dt'] = None
    cfg['descenso_n'] = len(desc)
    cfg['ascenso_n'] = len(asc)
    return equipos


def parse_fecha(celda):
    s = plain(celda)
    m = re.search(r'(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})', s)
    if m and m.group(2).lower() in MESES:
        try:
            return date(int(m.group(3)), MESES[m.group(2).lower()], int(m.group(1)))
        except ValueError:
            return None
    m = re.search(r'(\d{4})-(\d{2})-(\d{2})', s)
    if m:
        try:
            return date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
        except ValueError:
            return None
    return None


class TablasHTML:
    def __init__(self):
        from html.parser import HTMLParser

        class P(HTMLParser):
            def __init__(self):
                super().__init__(convert_charrefs=True)
                self.tablas, self.cur, self.fila, self.celda = [], None, None, None
                self.prof = 0
                self.href = None
                self.title = None
            def handle_starttag(self, tag, attrs):
                d = dict(attrs)
                if tag == 'table':
                    self.prof += 1
                    if self.prof == 1:
                        self.cur = []
                elif self.prof == 1 and tag == 'tr' and self.cur is not None:
                    self.fila = []
                elif self.prof == 1 and tag in ('td', 'th') and self.fila is not None:
                    self.celda = ''
                    self.href = None
                    self.title = None
                elif tag == 'a' and self.celda is not None and not self.href:
                    self.href = d.get('href')
                    self.title = d.get('title')
            def handle_endtag(self, tag):
                if tag in ('td', 'th') and self.celda is not None and self.fila is not None:
                    self.fila.append({'t': re.sub(r'\s+', ' ', self.celda).strip(), 'title': self.title, 'href': self.href})
                    self.celda = None
                elif tag == 'tr' and self.fila is not None and self.cur is not None:
                    if any(c['t'] for c in self.fila):
                        self.cur.append(self.fila)
                    self.fila = None
                elif tag == 'table':
                    if self.prof == 1 and self.cur is not None:
                        self.tablas.append(self.cur)
                        self.cur = None
                    self.prof = max(0, self.prof - 1)
            def handle_data(self, data):
                if self.celda is not None:
                    self.celda += data
        self.P = P

    def parse(self, html):
        p = self.P()
        p.feed(html)
        return p.tablas


def tabla_posiciones(html):
    tablas = TablasHTML().parse(html)
    mejor = None
    for t in tablas:
        if not t:
            continue
        cabezas = [c['t'].lower() for c in t[0]]
        if not any(h in ('pld', 'pj', 'played') for h in cabezas):
            continue
        if not any(h in ('pts', 'points') for h in cabezas):
            continue
        mejor = t
        break
    if not mejor:
        return {}
    cabezas = [c['t'].lower() for c in mejor[0]]
    def idx(*nombres):
        for i, h in enumerate(cabezas):
            token = re.split(r'[^a-z]+', h.lower())[0]
            if token in nombres or h in nombres:
                return i
        return None
    i_pos, i_pj, i_pts = 0, idx('pld', 'pj', 'played'), idx('pts', 'points')
    i_team = idx('team', 'club')
    out = {}
    for fila in mejor[1:]:
        if i_pj is None or i_pts is None or i_team is None or len(fila) <= max(i_pj, i_pts, i_team):
            continue
        celda = fila[i_team]
        titulo = celda.get('title') or celda.get('t')
        if not titulo or titulo.lower() in ('team', 'club'):
            continue
        def num(i):
            m = re.search(r'-?\d+', fila[i]['t'].replace('−', '-').replace('–', '-'))
            return int(m.group(0)) if m else None
        pos, pj, pts = num(i_pos), num(i_pj), num(i_pts)
        if pos is None:
            continue
        out[titulo] = {'posicion': pos, 'pj': pj, 'puntos': pts}
    return out


def bajar_html(cfg):
    if cfg['html'].exists() and cfg['html'].stat().st_size > 5000:
        return cfg['html'].read_text(errors='replace')
    titulo = urllib.parse.quote(cfg['page'].replace(' ', '_'), safe='()_/')
    url = 'https://en.wikipedia.org/wiki/' + titulo
    print('HTML', cfg['liga'], flush=True)
    data = get(url, cfg['html'], timeout=60)
    return data.decode('utf-8', 'replace')


def bajar_clubes(titulos):
    dest = CACHE / 'clubs'
    dest.mkdir(parents=True, exist_ok=True)
    faltan = []
    for t in titulos:
        f = dest / (slug(t)[:80] + '.wiki')
        if not f.exists() or f.stat().st_size < 80:
            faltan.append(t)
    print(f'páginas de club en caché {len(titulos) - len(faltan)}/{len(titulos)}', flush=True)
    for i in range(0, len(faltan), 2):
        lote = faltan[i:i + 2]
        print(f'  wiki {i + 1}-{i + len(lote)} / {len(faltan)}', flush=True)
        data = api({
            'action': 'query', 'format': 'json', 'formatversion': '2', 'redirects': '1',
            'prop': 'revisions|pageprops', 'rvprop': 'content', 'rvslots': 'main',
            'ppprop': 'wikibase_item', 'titles': '|'.join(lote),
        })
        paginas = data.get('query', {}).get('pages', [])
        redirs = {r['from']: r['to'] for r in data.get('query', {}).get('redirects', [])}
        por_titulo = {p.get('title'): p for p in paginas}
        for pedido in lote:
            titulo = redirs.get(pedido, pedido)
            p = por_titulo.get(titulo) or por_titulo.get(pedido)
            f = dest / (slug(pedido)[:80] + '.wiki')
            if not p or p.get('missing'):
                f.write_text('', encoding='utf-8')
                continue
            rev = (p.get('revisions') or [{}])[0]
            slots = rev.get('slots') or {}
            main = (slots.get('main') or {}).get('content') or rev.get('content') or ''
            qid = (p.get('pageprops') or {}).get('wikibase_item') or ''
            f.write_text(f'<!--Q:{qid}-->\n<!--TITLE:{p.get("title")}-->\n' + main, encoding='utf-8')
        time.sleep(0.6)
    textos = {}
    for t in titulos:
        f = dest / (slug(t)[:80] + '.wiki')
        textos[t] = f.read_text(encoding='utf-8', errors='replace') if f.exists() else ''
    return textos


def infobox(texto):
    w = mwparserfromhell.parse(texto)
    for t in w.filter_templates():
        n = str(t.name).strip().lower()
        if 'infobox football club' in n or n == 'infobox football club':
            return t
    return None


def param(tpl, *nombres):
    if not tpl:
        return None
    for n in nombres:
        if tpl.has(n):
            return tpl.get(n).value
    return None


def plantilla_de(texto, url):
    limpio = re.sub(r'<!--.*?-->', '', texto, flags=re.S)
    m = re.search(r'^==+[^\n]*(?:squad|first[- ]team)[^\n]*==+', limpio, re.I | re.M)
    if not m:
        chunk = limpio
    else:
        resto = limpio[m.end():]
        m2 = re.search(r'^==[^=\n].*==\s*$', resto, re.M)
        chunk = resto[:m2.start()] if m2 else resto
        chunk = re.split(r'^==+[^\n]*(out on loan|currently out|players out|departed)[^\n]*==+', chunk, maxsplit=1, flags=re.I | re.M)[0]
    w = mwparserfromhell.parse(chunk)
    jugadores, vistos = [], set()
    for t in w.filter_templates():
        n = str(t.name).strip().lower().replace('_', ' ')
        if n not in ('fs player', 'football squad player', 'fs player2'):
            continue
        def p(*ks):
            for k in ks:
                if t.has(k):
                    return t.get(k).value
            return None
        nombre_raw = p('name', 'player')
        if not nombre_raw:
            continue
        ls = links(nombre_raw)
        if ls:
            titulo, nombre = ls[0]
        else:
            titulo, nombre = None, plain(nombre_raw)
        nombre = re.sub(r'\s+', ' ', nombre or '').strip()
        if not nombre or norm(nombre) in vistos:
            continue
        vistos.add(norm(nombre))
        pos_w = plain(p('pos', 'position') or '').upper()
        pos_w = pos_w.split('/')[0].strip()
        nat = plain(p('nat', 'nation', 'nationality') or '').upper().split('|')[0].strip()
        dorsal = plain(p('no', 'number') or '')
        dm = re.search(r'\d+', dorsal or '')
        other = plain(p('other') or '')
        bajo = other.lower()
        cedido = any(x in bajo for x in ('loan', 'cedido', 'prestito', 'leihe', 'prêt', 'pret'))
        capitan = 'captain' in bajo or 'capitán' in bajo
        pais, codigo = NAT.get(nat, (None, nat or None))
        pos = POS.get(pos_w)
        sin = ['valorM', 'contratoHasta']
        if pos != 'POR':
            sin.append('pos')
        if not pais and nat:
            pais = nat
        jugadores.append({
            'wiki': titulo, 'nombre': nombre, 'pos': pos, 'posWiki': pos_w or None,
            'dorsal': int(dm.group(0)) if dm else None, 'nac': pais, 'nacCodigo': codigo,
            'cedido': cedido, 'capitan': capitan, 'sin': sin,
        })
    return jugadores


def confirmar_bundesliga():
    """Si la plantilla de la tabla trae resultN, pisa el formato supuesto."""
    try:
        data = api({
            'action': 'query', 'format': 'json', 'formatversion': '2', 'redirects': '1',
            'prop': 'revisions', 'rvprop': 'content', 'rvslots': 'main',
            'titles': 'Template:2026–27 2. Bundesliga table',
        })
        page = data['query']['pages'][0]
        rev = page['revisions'][0]
        texto = (rev.get('slots') or {}).get('main', {}).get('content') or ''
    except Exception as e:
        print('no pude leer la tabla de la 2. Bundesliga:', e, flush=True)
        return
    nums = {}
    for m in re.finditer(r'result(\d+)\s*=\s*([A-Za-z0-9_]+)', texto):
        nums[int(m.group(1))] = m.group(2).upper()
    if not nums:
        print('plantilla 2. Bundesliga sin resultN; dejo el formato DFL habitual', flush=True)
        return
    print('resultados 2. Bundesliga', nums, flush=True)
    cfg = next(c for c in LIGAS if c['liga'] == '2. Bundesliga')
    verdes = [n for n, k in nums.items() if k in ('P', 'PR', 'PRO', 'PRM', 'BL', 'AUF')]
    amarillos = [n for n, k in nums.items() if 'PO' in k or 'PLAY' in k or k in ('AUFPO', 'RELPO', 'Q')]
    # El 3º suele ser el repechaje de ascenso (no el de descenso).
    rojos = [n for n, k in nums.items() if k in ('R', 'REL', 'AB')]
    if verdes:
        cfg['directo'] = max(verdes)
    play = [n for n in amarillos if n <= 8]
    if play:
        cfg['playoff'] = max(play)
    if rojos or any(n >= 15 for n in nums):
        zona = [n for n, k in nums.items() if n >= 15]
        if zona:
            cfg['descenso'] = min(zona)
    cfg['formato'] = (
        f"Ascienden los {cfg['directo']} primeros. "
        f"El {cfg['playoff']}º juega el repechaje de ascenso. "
        f"Desde el {cfg['descenso']}º se juega la permanencia (repechaje o descenso directo)."
    )


def edades(jugadores):
    titulos = sorted({j['wiki'] for j in jugadores if j.get('wiki')})
    print(f'edades: {len(titulos)} fichas', flush=True)
    qids = {}
    dest = CACHE / 'qids.json'
    if dest.exists():
        qids = json.loads(dest.read_text())
    faltan = [t for t in titulos if t not in qids]
    for i in range(0, len(faltan), 40):
        lote = faltan[i:i + 40]
        print(f'  qid {i + 1}/{len(faltan)}', flush=True)
        try:
            data = api({
                'action': 'query', 'format': 'json', 'formatversion': '2', 'redirects': '1',
                'prop': 'pageprops', 'ppprop': 'wikibase_item', 'titles': '|'.join(lote),
            })
        except Exception as e:
            print('  qid fallo', e, flush=True)
            break
        redirs = {r['to']: r['from'] for r in data.get('query', {}).get('redirects', [])}
        normal = {r['from']: r['to'] for r in data.get('query', {}).get('normalized', [])}
        for p in data.get('query', {}).get('pages', []):
            q = (p.get('pageprops') or {}).get('wikibase_item')
            titulo = p.get('title')
            qids[titulo] = q
            if titulo in redirs:
                qids[redirs[titulo]] = q
        for ped in lote:
            real = normal.get(ped, ped)
            if ped not in qids and real in qids:
                qids[ped] = qids[real]
            qids.setdefault(ped, None)
        dest.write_text(json.dumps(qids), encoding='utf-8')
        time.sleep(0.5)
    ids = sorted({q for q in qids.values() if q})
    nacim = {}
    cache_n = CACHE / 'nacimientos.json'
    if cache_n.exists():
        nacim = json.loads(cache_n.read_text())
    faltan_q = [q for q in ids if q not in nacim]
    for i in range(0, len(faltan_q), 40):
        lote = faltan_q[i:i + 40]
        print(f'  p569 {i + 1}/{len(faltan_q)}', flush=True)
        url = 'https://www.wikidata.org/w/api.php?' + urllib.parse.urlencode({
            'action': 'wbgetentities', 'format': 'json', 'props': 'claims',
            'ids': '|'.join(lote),
        })
        try:
            data = json.loads(get(url).decode('utf-8', 'replace'))
        except Exception as e:
            print('  wikidata fallo', e, flush=True)
            break
        for q, ent in (data.get('entities') or {}).items():
            fecha = None
            try:
                claim = ent['claims']['P569'][0]['mainsnak']['datavalue']['value']
                if claim.get('precision', 11) >= 11:
                    m = re.search(r'([+-]\d+)-(\d{2})-(\d{2})', claim.get('time') or '')
                    if m and int(m.group(1)) > 0:
                        fecha = f'{int(m.group(1)):04d}-{m.group(2)}-{m.group(3)}'
            except Exception:
                fecha = None
            nacim[q] = fecha
        cache_n.write_text(json.dumps(nacim), encoding='utf-8')
        time.sleep(0.4)
    def edad_de(iso):
        if not iso:
            return None
        try:
            y, m, d = map(int, iso.split('-'))
            n = date(y, m, d)
        except ValueError:
            return None
        e = HOY.year - n.year - ((HOY.month, HOY.day) < (n.month, n.day))
        return e if 15 <= e <= 45 else None
    for j in jugadores:
        q = qids.get(j.get('wiki'))
        iso = nacim.get(q) if q else None
        j['fechaNac'] = iso
        j['edad'] = edad_de(iso)
        if j['edad'] is None and 'edad' not in j['sin']:
            j['sin'].append('edad')
        elif j['edad'] is not None:
            j['sin'] = [x for x in j['sin'] if x != 'edad']


def bajar_escudo(archivo, destino):
    if not archivo or destino.exists() and destino.stat().st_size > 400:
        return destino.exists()
    nombre = str(archivo).strip()
    nombre = re.sub(r'^\[\[(?:File|Image):', '', nombre, flags=re.I)
    nombre = nombre.split('|')[0].split(']]')[0].strip()
    if not nombre:
        return False
    try:
        data = api({
            'action': 'query', 'format': 'json', 'formatversion': '2',
            'prop': 'imageinfo', 'iiprop': 'url', 'iiurlwidth': '128',
            'titles': 'File:' + nombre,
        })
        info = ((data.get('query', {}).get('pages') or [{}])[0].get('imageinfo') or [None])[0]
        url = (info or {}).get('thumburl') or (info or {}).get('url')
    except Exception as e:
        print('  escudo api', nombre, e, flush=True)
        return False
    if not url:
        print('  sin archivo', nombre, flush=True)
        return False
    try:
        req = urllib.request.Request(url, headers={'User-Agent': UA})
        with urllib.request.urlopen(req, timeout=40) as r:
            blob = r.read()
    except Exception as e:
        print('  escudo', nombre, e, flush=True)
        return False
    if len(blob) < 400 or not (blob.startswith(b'\x89PNG') or blob.startswith(b'\xff\xd8') or blob.startswith(b'GIF')):
        print('  escudo no es imagen', nombre, blob[:12], flush=True)
        return False
    destino.write_bytes(blob)
    return True


def nivel_de(eq, cfg):
    base = 3 if eq['origen'] == 'descenso' else 2
    # La posición solo cuenta si ya se jugó. Si no, no se inventa una tabla.
    return base


def aplicar_tabla(eq, cfg, tab):
    t = tab.get(eq['titulo'])
    if not t:
        n1, n2 = norm(eq['titulo']), norm(eq['nombre'])
        for k, v in tab.items():
            nk = norm(k)
            if nk == n1 or nk == n2:
                t = v
                break
    if not t or not t.get('pj'):
        return None
    pos = t['posicion']
    if eq['origen'] != 'descenso' and pos <= cfg['playoff']:
        eq['nivel_tabla'] = min(3, (3 if eq['origen'] == 'descenso' else 2) + 1)
    elif pos >= cfg['descenso']:
        eq['nivel_tabla'] = max(1, (3 if eq['origen'] == 'descenso' else 2) - 1)
    else:
        eq['nivel_tabla'] = 3 if eq['origen'] == 'descenso' else 2
    if eq['reserva']:
        eq['nivel_tabla'] = min(eq['nivel_tabla'], 2)
    return {
        'temporada': '26/27', 'posicion': pos, 'puntos': t.get('puntos'), 'pj': t.get('pj'),
        'fecha': '2026-10-11', 'division': 2,
    }


def main():
    existentes = json.loads((ROOT / 'clubes.json').read_text())
    ids = {c['id'] for c in existentes}
    nombres = {norm(c['nombre']) for c in existentes}
    dts = json.loads((ROOT / 'dts.json').read_text())
    dts_por_nombre = {}
    for d in dts:
        dts_por_nombre.setdefault(norm(d['nombre']), d)
    print('confirmo formato 2. Bundesliga', flush=True)
    confirmar_bundesliga()
    todos = []
    for cfg in LIGAS:
        eqs = equipos_de_liga(cfg)
        print(f"{cfg['liga']}: {len(eqs)} clubes, bajaron {cfg['descenso_n']}, subieron {cfg['ascenso_n']}", flush=True)
        for e in eqs:
            e['cfg'] = cfg
            if norm(e['nombre']) in nombres:
                print('  YA EN PRIMERA, no se duplica:', e['nombre'], flush=True)
                continue
            todos.append(e)
        html = bajar_html(cfg)
        tab = tabla_posiciones(html)
        print(f"  tabla {cfg['liga']}: {len(tab)} filas", flush=True)
        cfg['tabla'] = tab
    print('total nuevos', len(todos), flush=True)
    textos = bajar_clubes([e['titulo'] for e in todos])
    planos = []
    for e in todos:
        texto = textos.get(e['titulo']) or ''
        q = re.search(r'<!--Q:(Q\d*)-->', texto)
        titulo_real = re.search(r'<!--TITLE:(.*?)-->', texto)
        e['qid'] = q.group(1) if q and q.group(1) else None
        e['titulo_real'] = titulo_real.group(1) if titulo_real else e['titulo']
        box = infobox(texto)
        full = plain(param(box, 'fullname', 'full name') or '') or None
        cuerpo = hexcolor(plain(param(box, 'body1') or ''))
        short = hexcolor(plain(param(box, 'shorts1') or ''))
        if cuerpo and short and cuerpo == short:
            short = hexcolor(plain(param(box, 'body2') or '')) or short
        imagen = plain(param(box, 'image') or '') or None
        if not e.get('dt'):
            nom, tit, nat = persona(param(box, 'manager', 'head coach', 'coach') or '')
            if nom:
                e['dt'] = {'nombre': nom, 'titulo': tit, 'nat': nat}
        presidente, _tp, _np = persona(param(box, 'chairman', 'president', 'chairperson') or '')
        url = 'https://en.wikipedia.org/wiki/' + urllib.parse.quote(e['titulo_real'].replace(' ', '_'), safe='()_/')
        url_liga = 'https://en.wikipedia.org/wiki/' + urllib.parse.quote(e['cfg']['page'].replace(' ', '_'), safe='()_/')
        jugadores = plantilla_de(texto, url)
        sid = slug(e['nombre'])
        base = sid
        n = 2
        while sid in ids:
            sid = f'{base}-{n}'
            n += 1
        ids.add(sid)
        actual = aplicar_tabla(e, e['cfg'], e['cfg']['tabla'])
        nivel = e.get('nivel_tabla') or nivel_de(e, e['cfg'])
        if e['reserva']:
            nivel = min(nivel, 2)
        e['id'] = sid
        e['jugadores_raw'] = jugadores
        e['url'] = url
        e['url_liga'] = url_liga
        e['imagen'] = imagen
        e['fullname'] = full
        e['colores'] = {'principal': cuerpo, 'secundario': short}
        e['presidente'] = presidente
        e['nivel'] = nivel
        e['actual'] = actual
        planos.extend(jugadores)
        print(f"  {e['nombre']}: {len(jugadores)} jugadores, dt={e['dt']['nombre'] if e['dt'] else '—'}, color={cuerpo}", flush=True)
    print('busco edades', flush=True)
    try:
        edades(planos)
    except Exception as ex:
        print('edades incompletas:', ex, flush=True)
        for j in planos:
            if j.get('edad') is None and 'edad' not in j['sin']:
                j['sin'].append('edad')
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / 'plantillas').mkdir(exist_ok=True)
    escudos = OUT / 'escudos'
    escudos.mkdir(exist_ok=True)
    clubes_nuevos, dts_nuevos, dts_updates = [], [], []
    usados_dt = set()
    for e in todos:
        if not e.get('id'):
            continue
        cfg = e['cfg']
        arch = None
        if e.get('imagen'):
            dest = escudos / f"{e['id']}.png"
            if bajar_escudo(e['imagen'], dest):
                arch = f"escudos/{e['id']}.png"
        jugadores = []
        for j in e['jugadores_raw']:
            jid = 'wiki-' + e['id'] + '-' + slug(j['nombre'])[:48]
            fila = {
                'id': jid, 'nombre': j['nombre'], 'pos': j['pos'], 'posSec': [],
                'edad': j.get('edad'), 'nac': j.get('nac'), 'nacCodigo': j.get('nacCodigo'),
                'valorM': None, 'contratoHasta': None, 'dorsal': j.get('dorsal'),
                'verificado': False, 'sinVerificar': j['sin'],
            }
            if j.get('fechaNac'):
                fila['fechaNac'] = j['fechaNac']
            if j.get('posWiki'):
                fila['posWiki'] = j['posWiki']
            if j.get('cedido'):
                fila['cedido'] = True
            if j.get('capitan'):
                fila['capitan'] = True
            if j.get('wiki'):
                fila['wiki'] = 'https://en.wikipedia.org/wiki/' + urllib.parse.quote(j['wiki'].replace(' ', '_'), safe='()_/')
            jugadores.append(fila)
        plantilla = {
            'clubId': e['id'], 'fecha': FECHA,
            'fuente': e['url'],
            'nota': 'Plantel de la Wikipedia inglesa (plantilla fs player), foto del 2026-10-12. El puesto es el grueso de esa ficha: GK queda POR; DF se guardó como DFC, MF como MC y FW como DC, y no es el puesto fino. Valor de mercado y fin de contrato no figuran: quedan vacíos. La edad sale de Wikidata (P569) cuando la ficha tiene día de nacimiento.',
            'jugadores': jugadores,
        }
        (OUT / 'plantillas' / f"{e['id']}.json").write_text(json.dumps(plantilla, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
        fuentes = [
            {'campo': 'nombre,ciudad,estadio,division', 'url': e['url_liga'], 'fecha': FECHA,
             'nota': 'Página de la temporada 2026/27 en la Wikipedia en inglés.'},
            {'campo': 'colores,escudo,presidente.nombre,plantilla', 'url': e['url'], 'fecha': FECHA,
             'nota': 'Infobox y primer equipo. Colores = camiseta (body1) y pantalón (shorts1).'},
            {'campo': 'presupuestoFichajesM,masaSalarialM,valorPlantillaM', 'url': None, 'fecha': FECHA,
             'nota': 'null a propósito: la Wikipedia no publica valor de plantilla ni masa salarial. No se estimó un número.'},
            {'campo': 'sigla', 'url': None, 'nota': 'Abreviatura de 3 letras generada para la interfaz; no es un código oficial.'},
            {'campo': 'nivel', 'url': e['url_liga'], 'fecha': FECHA,
             'nota': 'Regla del motor para segunda: 3 si descendió de primera, 2 si no; +0 ya contemplado en la tabla, baja a 1 si está en zona de descenso y sube a 3 si un no-descendiendo pelea el playoff. Tope 3. Un filial no pasa de 2.'},
        ]
        if e.get('actual'):
            fuentes.append({'campo': 'actual', 'url': e['url_liga'], 'fecha': '2026-10-11',
                            'nota': 'Tabla de la Wikipedia. Solo se cargó porque ya hay partidos jugados.'})
        club = {
            'id': e['id'], 'nombre': e['nombre'], 'nombreOficial': e.get('fullname') or e['nombre'],
            'corto': e['nombre'], 'pais': cfg['pais'], 'liga': cfg['liga'], 'division': 2,
            'ligaPadre': cfg['padre'], 'nivel': e['nivel'], 'ciudad': e.get('ciudad'),
            'estadio': e.get('estadio'), 'capacidad': e.get('capacidad'),
            'origenDivision': e['origen'], 'reserva': bool(e['reserva']),
            'ascensoDirecto': cfg['directo'], 'playoffHasta': cfg['playoff'], 'descensoDesde': cfg['descenso'],
            'formato': cfg['formato'], 'copa': cfg['copa'],
            'valorPlantillaM': None, 'jugadores': len(jugadores),
            'colores': e['colores'], 'presupuestoFichajesM': None, 'masaSalarialM': None,
            'presidente': {
                'nombre': e.get('presidente') or None, 'perfil': None,
                'nota': 'El nombre, si está, es el chairman o president de la Wikipedia. No se le asignó perfil (mecenas, austero, ultra, político o fondo): no hay fuente que lo clasifique.',
            },
            'estilo': [], 'fuentes': fuentes, 'sigla': None, 'historial': [],
            'actual': e.get('actual'), 'ficha': 'wikipedia-segunda-2026-10-12',
        }
        if arch:
            club['escudo'] = {
                'archivo': arch,
                'url': e['url'], 'fecha': FECHA,
                'nota': 'Miniatura de Commons a partir del archivo del infobox. Marca del club; uso de fans, sin fines comerciales.',
            }
        # sigla única de 3 letras
        base_sig = ''.join(w[0] for w in re.sub(r'[^A-Za-z ]', '', unicodedata.normalize('NFKD', e['nombre'])).split() if w.lower() not in ('fc', 'cf', 'ac', 'afc', 'sc', 'ud', 'cd', 'sd', 'rc', 'de', 'calcio'))[:3].upper()
        if len(base_sig) < 3:
            base_sig = (base_sig + slug(e['nombre'])[:3].upper())[:3]
        club['sigla'] = base_sig
        clubes_nuevos.append(club)
        if e.get('dt') and e['dt'].get('nombre'):
            dn = e['dt']['nombre']
            existente = dts_por_nombre.get(norm(dn))
            # No se le saca el club a un DT que ya está en primera.
            if existente and existente.get('clubActual') in {c['id'] for c in existentes}:
                print('  DT de primera, no se reasigna:', dn, '→ creo ficha aparte', flush=True)
                existente = None
            nat = e['dt'].get('nat')
            pais_dt, cod_dt = NAT.get(nat, (None, None)) if nat else (None, None)
            desde = None
            if e['dt'].get('fecha'):
                y, m, d = e['dt']['fecha'].split('-')
                desde = f"26/27 ({d}/{m}/{y})"
            if existente and existente['id'] not in usados_dt:
                if e['id'] not in (existente.get('clubesDirigidos') or []):
                    existente.setdefault('clubesDirigidos', []).append(e['id'])
                existente['clubActual'] = e['id']
                existente['rolActual'] = existente.get('rolActual') or 'Manager'
                fuentes_dt = existente.setdefault('fuentes', [])
                fuentes_dt.append({'campo': 'clubActual', 'url': e['url_liga'], 'fecha': FECHA,
                                   'nota': 'Técnico que figura en la página de la segunda división 2026/27.'})
                if desde:
                    existente.setdefault('historialDT', []).append({
                        'club': e['nombre'], 'clubId': e['id'], 'rol': 'Manager',
                        'desde': desde, 'hasta': 'expected',
                    })
                dts_updates.append(existente['id'])
                usados_dt.add(existente['id'])
            else:
                did = slug(dn)
                if did in {d['id'] for d in dts} or did in {d['id'] for d in dts_nuevos}:
                    did = slug(dn) + '-' + e['id'][:12]
                ficha = {
                    'id': did, 'nombre': dn, 'nac': pais_dt, 'nacCodigo': cod_dt,
                    'edad': None, 'clubActual': e['id'], 'rolActual': 'Manager',
                    'contratoHasta': None, 'clubesDirigidos': [e['id']], 'clubesJugados': [],
                    'formaciones': [], 'filosofia': [], 'temperamento': None, 'nivel': None,
                    'fuentes': [{'campo': 'clubActual,nombre', 'url': e['url_liga'], 'fecha': FECHA,
                                 'nota': 'Wikipedia, personal de la temporada 2026/27. Sin historial de etapas anteriores en esta ficha: no se inventó.'}],
                    'historialDT': [],
                    'ficha': 'wikipedia-segunda-2026-10-12',
                }
                if desde:
                    ficha['historialDT'] = [{'club': e['nombre'], 'clubId': e['id'], 'rol': 'Manager', 'desde': desde, 'hasta': 'expected'}]
                dts_nuevos.append(ficha)
                usados_dt.add(did)
        else:
            print('  SIN DT', e['nombre'], flush=True)
    (OUT / 'clubes.json').write_text(json.dumps(clubes_nuevos, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    (OUT / 'dts-nuevos.json').write_text(json.dumps(dts_nuevos, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    (OUT / 'dts-tocados.json').write_text(json.dumps(dts_updates) + '\n')
    print('LISTO', len(clubes_nuevos), 'clubes,', len(dts_nuevos), 'dts nuevos,', len(dts_updates), 'dts actualizados', flush=True)
    # resumen por liga
    from collections import Counter
    print(Counter(c['liga'] for c in clubes_nuevos), flush=True)
    sin_plantel = [c['id'] for c in clubes_nuevos if c['jugadores'] < 8]
    sin_escudo = [c['id'] for c in clubes_nuevos if 'escudo' not in c]
    sin_color = [c['id'] for c in clubes_nuevos if not c['colores'].get('principal')]
    print('plantel corto', sin_plantel, flush=True)
    print('sin escudo', sin_escudo, flush=True)
    print('sin color', sin_color, flush=True)


if __name__ == '__main__':
    main()
