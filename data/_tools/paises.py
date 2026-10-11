import pycountry
OV={'England':'GB-ENG','Scotland':'GB-SCT','Wales':'GB-WLS','Northern Ireland':'GB-NIR','Korea, South':'KR','Korea, North':'KP',
 "Cote d'Ivoire":'CI','DR Congo':'CD','Congo':'CG','Türkiye':'TR','Turkey':'TR','Kosovo':'XK','Russia':'RU','Iran':'IR','Venezuela':'VE',
 'Bolivia':'BO','Cape Verde':'CV','Curacao':'CW','Czech Republic':'CZ','Moldova':'MD','Syria':'SY','Tanzania':'TZ','Vietnam':'VN',
 'The Gambia':'GM','Gambia':'GM','Bosnia-Herzegovina':'BA','Chinese Taipei':'TW','Laos':'LA','St. Kitts & Nevis':'KN','St. Lucia':'LC',
 'St. Vincent & Grenadinen':'VC','Palestine':'PS','Neukaledonien':'NC','Southern Sudan':'SS','South Sudan':'SS','Macedonia':'MK',
 'North Macedonia':'MK','Guinea-Bissau':'GW','Equatorial Guinea':'GQ','Central African Republic':'CF','Sao Tome and Principe':'ST',
 'Antigua and Barbuda':'AG','Trinidad and Tobago':'TT','Hongkong':'HK','Hong Kong':'HK','Brunei Darussalam':'BN','Federated States of Micronesia':'FM',
 'Netherlands Antilles':'AN','Mayotte':'YT','Guadeloupe':'GP','Martinique':'MQ','French Guiana':'GF','Réunion':'RE','Reunion':'RE','Comoros':'KM'}
FALTAN=set()
def iso(n):
    if not n: return None
    if n in OV: return OV[n]
    try: return pycountry.countries.lookup(n).alpha_2
    except LookupError:
        try: return pycountry.countries.search_fuzzy(n)[0].alpha_2
        except LookupError: FALTAN.add(n); return None
