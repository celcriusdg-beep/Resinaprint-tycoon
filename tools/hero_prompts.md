# Realm Heroes art prompts

Paintings are generated with Figma's image generator (model `gemini-3.1-flash-image`, 1024×1536 requested),
saved as `<id>.png`, then cut out with `python3 tools/hero_cutout.py <folder> [id ...]` into `realm-heroes/img/<id>.webp`.
After adding a sprite, set `img: 1`, `face` (1 if the figure faces right, -1 if left) and `hx` (head position across
the sprite, 0..1) on the hero in `realm-heroes/data.js`.

Every prompt starts with:

> Original fantasy hero character for a mobile hero-collector RPG, premium painted semi-realistic digital illustration,
> highly detailed ornate costume, dramatic rim lighting, rich saturated colors, glossy painterly rendering like high-end
> gacha game splash art.

and ends with:

> Full body from head to feet, [pose], three-quarter view facing right, whole figure visible with margin, isolated on a
> plain flat light grey background, no text, no frame, no scenery.

## Done
vesper, morwen, thornmaw, amunet, odette, kestrel, grimhold, selka, willow, aurelia

## To do
- **malachar** (menacing stance): Malachar the Hexknight, a brooding dark knight with long white hair, spiked black armor with glowing crimson runes, a tattered dark red cape, glowing red eyes, holding a large jagged runic greatsword wreathed in dark red flames.
- **cinder** (casting pose): Cinder the Flame Witch, a fiery young witch with wild orange hair that turns into flames at the tips, a wide-brimmed black witch hat with ember-glowing trim, a black and crimson layered dress with flowing sleeves, holding a gnarled staff with a burning ember crystal, fireballs and sparks swirling.
- **brakka** (fierce stance): Brakka the Orc Raider, a muscular green-skinned orc warrior with tusks, a black topknot, tribal red war paint, spiked leather and fur armor with bone trinkets, holding a big notched battle axe.
- **garrick** (sturdy guard stance): Garrick the Shieldbearer, a broad-shouldered human soldier with a short brown beard, a steel open-faced helmet, blue and steel plate armor with a blue tabard, a large kite shield with a wave emblem and a spear.
- **wren** (archer stance): Wren the Forest Scout, a young ranger with a green hood and cloak, brown leather armor, a quiver on the back, holding a simple wooden longbow with an arrow nocked.
- **pip** (casting pose): Pip the Tide Apprentice, a cheerful teenage apprentice mage with messy purple hair, an oversized blue pointed wizard hat, blue robes with silver wave embroidery, holding a small staff with a glowing water droplet, floating bubbles.
- **mae** (gentle praying pose): Sister Mae, a kind young acolyte healer with golden hair under a white hood, cream and gold priestess robes, holding a slender staff with a glowing golden lantern, soft holy light.
- **skrit** (crouched sneaky stance): Skrit the Goblin Cutthroat, a small wiry goblin with big pointed ears, yellow eyes, a sly grin, a dark patched leather hood and vest, holding two curved daggers.
