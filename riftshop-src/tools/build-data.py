"""Builds src/data/cards.json for the game from two community snapshots:

  - Riot's official card gallery (names, sets, rarities, image URLs on Riot's CDN):
      git clone --depth 1 https://github.com/Dystorted888/riftbound-card-data
  - TCGplayer market prices in USD, keyed by printed card code:
      git clone --depth 1 https://github.com/rleutz/riftbound-prices

Usage: python3 tools/build-data.py <riftbound-card-data dir> <riftbound-prices dir>
Card images are not downloaded; the game loads them from Riot's CDN.
"""
import json, re, sys, statistics, collections

cards_dir, prices_dir = sys.argv[1], sys.argv[2]
gallery = json.load(open(f'{cards_dir}/data/cards.json'))
pfile = json.load(open(f'{prices_dir}/prices/riftbound_prices_updated.json'))
prices = pfile['prices']

BOOSTER_SETS = ['OGN', 'SFD', 'UNL', 'RAD', 'VEN']

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

# Sealed products (USD). Market from TCGplayer via the riftdex-data snapshot where the product id is
# known (Origins, Unleashed, 26 Nov 2026); otherwise from TCGplayer listings found by search (Oct-Nov 2026).
SETS = {
    'OGN': {'name': 'Origins', 'msrpPack': 4.99, 'msrpBox': 119.99, 'pack': 11.18, 'box': 148.23, 'case': 936.21},
    'SFD': {'name': 'Spiritforged', 'msrpPack': 4.99, 'msrpBox': 119.99, 'pack': 7.25, 'box': 161.51, 'case': 1010.0, 'est': ['pack', 'case']},
    'UNL': {'name': 'Unleashed', 'msrpPack': 4.99, 'msrpBox': 119.99, 'pack': 6.72, 'box': 162.60, 'case': 1052.67},
    'RAD': {'name': 'Radiance', 'msrpPack': 4.99, 'msrpBox': 119.99, 'pack': 5.99, 'box': 127.13, 'case': 790.0, 'est': ['pack', 'case']},
    'VEN': {'name': 'Vendetta', 'msrpPack': 4.99, 'msrpBox': 119.99, 'pack': 5.99, 'box': 126.22, 'case': 780.0, 'est': ['pack', 'case']},
}
meta = {
    'pricesDate': pfile.get('updated'), 'galleryDate': gallery.get('fetched_at'),
    'source': 'Card data: Riot Games official card gallery. Prices: TCGplayer market (USD).',
}
json.dump({'meta': meta, 'sets': SETS, 'cards': out}, open('src/data/cards.json', 'w'), separators=(',', ':'))
print(len(out), 'cards;', sum(c['est'] for c in out), 'estimated prices;', collections.Counter(c['set'] for c in out))
