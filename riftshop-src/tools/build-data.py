"""Builds src/data/cards.json for the game from two community snapshots:

  - Riot's official card gallery (names, sets, rarities, image URLs on Riot's CDN):
      git clone --depth 1 https://github.com/Dystorted888/riftbound-card-data
  - TCGplayer market prices in USD, keyed by printed card code:
      git clone --depth 1 https://github.com/rleutz/riftbound-prices

  - Sealed product market prices by TCGplayer product id:
      git clone --depth 1 https://github.com/ehreese/riftdex-data

Usage: python3 tools/build-data.py <riftbound-card-data dir> <riftbound-prices dir> <riftdex-data dir>
Card images are not downloaded; the game loads them from Riot's CDN.
"""
import json, re, sys, statistics, collections

cards_dir, prices_dir, rdx_dir = sys.argv[1], sys.argv[2], sys.argv[3]
gallery = json.load(open(f'{cards_dir}/data/cards.json'))
pfile = json.load(open(f'{prices_dir}/prices/riftbound_prices_updated.json'))
prices = pfile['prices']

BOOSTER_SETS = ['OGN', 'SFD', 'UNL', 'VEN', 'RAD']  # release order

def price_key(code):
    """'OGN-299*/298' -> 'OGN-299-SIG'; 'RAD-061a/167' -> 'RAD-061a'."""
    base = code.split('/')[0]
    if base.endswith('*'):
        return base[:-1] + '-SIG'
    return base

def kind(c):
    p = c['printing']
    if p['signature']: return 'sig'
    if p['overnumbered']: return 'over'
    if p['alternate_art'] or c['rarity'] == 'Showcase': return 'alt'
    return 'std'

out = []
for c in gallery['cards']:
    s = c['set']['id']
    if s not in BOOSTER_SETS or not c['public_code'] or not c['type']:
        continue
    k = kind(c)
    price = prices.get(price_key(c['public_code']))
    out.append({
        'id': c['id'], 'code': c['public_code'], 'n': c['collector_number'], 'name': c['display_name'],
        'set': s, 'rarity': c['rarity'], 'type': c['type'], 'domains': c['domains'] or [],
        'kind': k, 'img': c['image']['url'], 'w': c['image']['width'], 'h': c['image']['height'],
        'price': price, 'est': price is None,
    })

# Fill missing prices with the median of the same set, rarity and printing kind.
groups = collections.defaultdict(list)
for c in out:
    if c['price'] is not None: groups[(c['set'], c['rarity'], c['kind'])].append(c['price'])
for c in out:
    if c['price'] is None:
        g = groups.get((c['set'], c['rarity'], c['kind'])) or groups.get((c['set'], c['rarity'], 'std')) or [0.25]
        c['price'] = round(statistics.median(g), 2)
    c['price'] = max(0.05, c['price'])

# Sealed products: TCGplayer product ids (pack, box = booster display, case = 6 displays).
# Market prices for those ids come from the riftdex-data daily TCGplayer snapshot; images are
# TCGplayer's product photos, loaded by the game at runtime.
TCG = {
    'OGN': ('Origins', 635366, 635368, 635369),
    'SFD': ('Spiritforged', 661954, 661934, 661937),
    'UNL': ('Unleashed', 678149, 678150, 678152),
    'VEN': ('Vendetta', 693377, 693380, 693382),
    'RAD': ('Radiance', 711362, 711365, 711366),
}
rdx = json.load(open(f'{rdx_dir}/prices.json'))
sealed_price = {r[0]: r[1] for r in rdx['prices']}
SETS = {}
for sid, (name, pack, box, case) in TCG.items():
    SETS[sid] = {
        'name': name, 'msrpPack': 4.99, 'msrpBox': 119.99,
        'pack': sealed_price[pack], 'box': sealed_price[box], 'case': sealed_price[case],
        'tcg': {'pack': pack, 'box': box, 'case': case},
    }
meta = {
    'sealedDate': rdx['sourceUpdatedAt'][:10],
    'pricesDate': pfile.get('updated'), 'galleryDate': gallery.get('fetched_at'),
    'source': 'Card data: Riot Games official card gallery. Prices: TCGplayer market (USD).',
}
json.dump({'meta': meta, 'sets': SETS, 'cards': out}, open('src/data/cards.json', 'w'), separators=(',', ':'))
print(len(out), 'cards;', sum(c['est'] for c in out), 'estimated prices;', collections.Counter(c['set'] for c in out))
