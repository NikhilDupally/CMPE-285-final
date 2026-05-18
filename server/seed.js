/**
 * Seed script — fetches 110 breed image URLs from the Dog CEO API
 * (https://dog.ceo/dog-api/) and stores them via db.upsertItem().
 *
 * Safe to re-run: uses upsertItem which overwrites on conflict.
 *
 * Usage:  node seed.js
 */

const https = require('https');
const db    = require('./db');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 12000 }, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch (e) { reject(new Error(`Parse error for ${url}: ${e.message}`)); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timeout: ${url}`));
    });
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Convert API key to a human-readable display name
// "retriever/golden" → "Golden Retriever"
// "germanshepherd"   → "German Shepherd"
function toName(main, sub) {
  const fmt = (s) =>
    s
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .split(/[-\s]+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  return sub ? `${fmt(sub)} ${fmt(main)}` : fmt(main);
}

// Breed descriptions & fun facts (keyed by API breed path)
const INFO = {
  labrador:               { d: 'Friendly, outgoing, active companion everyone loves',           f: 'Labs were the #1 AKC breed in the US for 31 straight years!' },
  'retriever/golden':     { d: 'Intelligent, gentle, and devoted to their people',              f: 'Goldens can carry an egg in their mouth without cracking it.' },
  'bulldog/french':       { d: 'Adaptable, playful, and impossibly cute',                       f: "Frenchies can't swim — their stocky build makes them sink!" },
  germanshepherd:         { d: 'Courageous, confident, and loyal to the core',                  f: 'GSDs are the most widely used police & military dog worldwide.' },
  beagle:                 { d: 'Curious, merry, and always nose-deep in an adventure',          f: 'Beagles have 220 million scent receptors vs. 5 million in humans.' },
  pug:                    { d: 'Charming, mischievous, devoted lap dog',                        f: 'A group of pugs is officially called a "grumble."' },
  husky:                  { d: 'Athletic, vocal, and built for cold-weather adventures',        f: 'Huskies can run 150 miles in a single day in the right conditions.' },
  dachshund:              { d: 'Spunky, curious little hound with a big personality',           f: 'Originally bred in Germany to hunt badgers underground.' },
  boxer:                  { d: 'Energetic, fun-loving, and famously patient with children',     f: 'Named for their habit of play-fighting with their front paws.' },
  shiba:                  { d: "Independent, alert, and the internet's favourite meme dog",     f: "Japan's most popular companion breed for centuries." },
  dalmatian:              { d: 'Distinctive, energetic, and born to run',                       f: 'Dalmatian puppies are born completely white — spots appear later.' },
  chow:                   { d: 'Dignified, aloof, and fiercely loyal to their family',          f: 'Chow Chows have a blue-black tongue, unlike almost any other dog.' },
  samoyed:                { d: 'Perpetually smiling fluff-ball of pure joy',                   f: '"Sammies" were bred by Siberian nomads to herd reindeer.' },
  chihuahua:              { d: 'Confident, sassy, most attitude per pound of any breed',        f: 'Chihuahuas are the world\'s smallest recognised dog breed.' },
  malamute:               { d: 'Powerful sled dog with a gentle, affectionate soul',            f: 'Alaskan Malamutes can pull sleds weighing over 1,100 lbs.' },
  doberman:               { d: 'Sleek, fearless, and intensely loyal guardian',                 f: 'Dobermans were created in the 1880s by a German tax collector.' },
  weimaraner:             { d: 'Aristocratic "Grey Ghost" of the hunting world',                f: 'Weimaraners have webbed feet — excellent swimmers.' },
  vizsla:                 { d: 'The ultimate Velcro dog — always at your side',                 f: 'Vizslas are both pointers AND retrievers — unique in the dog world.' },
  whippet:                { d: 'Elegant, gentle racer who loves the sofa just as much',        f: 'Whippets can accelerate to 35 mph in just a few strides.' },
  'hound/basset':         { d: 'Laid-back, endearingly droopy, and stubbornly nose-driven',    f: 'Basset Hounds have the second-best nose of any dog breed.' },
  'hound/afghan':         { d: 'Regal, aloof, with a gloriously silky flowing coat',           f: 'Afghan Hounds have been clocked at 40 mph — rivalling a Greyhound.' },
  'hound/blood':          { d: 'Gentle giant whose nose can follow trails days old',            f: 'Bloodhound tracking evidence is admissible in US courts.' },
  'mountain/bernese':     { d: 'Tricolour gentle giant from the Swiss Alps',                   f: 'Bernese Mountain Dogs can pull up to 10× their own body weight.' },
  'pointer/german':       { d: 'Versatile hunting dog equally at home on land or in water',    f: 'GSPs were bred to both point birds AND retrieve from water.' },
  stbernard:              { d: 'Giant, heroic mountain-rescue dog with a giant heart',          f: 'St. Bernards have saved over 2,000 lives in the Swiss Alps.' },
  papillon:               { d: 'Butterfly-eared toy breed with the spirit of a big athlete',   f: 'Papillon means "butterfly" in French — named for their ears.' },
  pomeranian:             { d: 'Fluffy, extroverted toy spitz who thinks it\'s a big dog',     f: 'Two Pomeranians survived the sinking of the Titanic.' },
  maltese:                { d: 'Silky white lap dog with a fearless, playful heart',            f: 'Maltese have been treasured companions for over 2,000 years.' },
  shihtzu:                { d: 'Little lion dog bred for Chinese imperial courts',              f: "Shih Tzus were so prized they were only gifted, never sold." },
  lhasa:                  { d: 'Ancient sentinel of Tibetan palaces and monasteries',           f: 'Lhasa Apsos served as Tibet\'s sacred watchdog for 4,000+ years.' },
  'terrier/yorkshire':    { d: 'Feisty, tenacious toy terrier in a silky steel-blue coat',    f: 'A Yorkie named Smoky became one of the first WW2 therapy dogs.' },
  'terrier/cairn':        { d: 'Hardy little Scot forever famous as Toto from Oz',            f: 'Bred in Scotland to flush foxes from rocky cairns.' },
  'terrier/scottish':     { d: 'Dignified, independent "Diehard" of the terrier world',        f: 'More Scottie game pieces appear on Monopoly boards than any other.' },
  'terrier/boston':       { d: 'American Gentleman — tuxedo markings included',                f: 'Boston Terriers were the first non-sporting breed developed in the US.' },
  'terrier/bull':         { d: 'Egg-headed, mischievous clown with boundless affection',      f: 'Bull Terriers have the only triangular eye in the entire dog world.' },
  'spaniel/cocker':       { d: 'Merry, soulful-eyed family dog with gorgeous ears',           f: 'Cocker Spaniels were the most popular US breed throughout the 1940s–50s.' },
  newfoundland:           { d: 'Massive, bear-like water rescue dog with a sweet nature',      f: 'Newfoundlands were brought on Lewis & Clark\'s 1804 expedition.' },
  borzoi:                 { d: 'Aristocratic Russian sighthound, graceful as a dancer',        f: 'Borzois can rotate their heads nearly 270° to spot prey.' },
  pembroke:               { d: 'Smart, alert, big-dog energy in a compact body',               f: 'Corgis were Queen Elizabeth II\'s lifelong favourite breed.' },
  'collie/border':        { d: 'Widely considered the world\'s most intelligent dog breed',   f: 'Border Collies can learn a new command in under 5 repetitions.' },
  ridgeback:              { d: 'African lion-hunting dog with a striking reversed-fur ridge', f: 'Rhodesian Ridgebacks were used to track lions in Africa.' },
  'setter/irish':         { d: 'Flame-red aristocrat of the field — energetic and merry',     f: 'Irish Setters were the first breed used in US bird-dog field trials.' },
  samoyed:                { d: 'Perpetually smiling Arctic companion',                         f: 'Their fluffy coats were historically spun into yarn for clothing.' },
  keeshond:               { d: 'Smiling Dutch barge dog with a spectacular silver coat',      f: 'Keeshonds have distinctive "spectacles" — shading around their eyes.' },
  saluki:                 { d: 'Ancient royal dog of Egypt — possibly the oldest named breed', f: 'Saluki images appear in Egyptian tombs from 2134 BC.' },
  basenji:                { d: 'The barkless dog from central Africa — yodels instead',       f: 'Basenjis groom themselves like cats and cannot bark.' },
  akita:                  { d: 'Powerful, dignified Japanese breed of immense loyalty',        f: 'Hachiko the Akita waited for his deceased owner for 9 years.' },
  'retriever/flatcoated': { d: 'Perpetually happy, glossy-coated retriever',                  f: 'Called "Peter Pan" dogs — they stay puppy-like their whole lives.' },
  'spaniel/springer':     { d: 'Energetic bird dog with a wagging tail and willing spirit',  f: 'Springer Spaniels can work for hours in the toughest terrain.' },
};

function getInfo(key) {
  if (INFO[key]) return INFO[key];
  const [main, sub] = key.split('/');
  const name = toName(main, sub);
  return {
    d: `A wonderful ${name} looking for a loving forever home`,
    f: `${name}s are known for their distinctive personality and charm.`,
  };
}

async function fetchImage(main, sub) {
  const url = sub
    ? `https://dog.ceo/api/breed/${main}/${sub}/images/random`
    : `https://dog.ceo/api/breed/${main}/images/random`;
  const data = await fetchJson(url);
  if (data.status !== 'success') throw new Error('API returned non-success');
  return data.message;
}

async function run() {
  console.log('Fetching breed list from Dog CEO API…');
  const { message: breedMap } = await fetchJson(
    'https://dog.ceo/api/breeds/list/all'
  );

  // Flatten to [main, sub|null] pairs
  const pairs = [];
  for (const [main, subs] of Object.entries(breedMap)) {
    if (subs && subs.length > 0) {
      for (const sub of subs) pairs.push([main, sub]);
    } else {
      pairs.push([main, null]);
    }
  }

  const targets = pairs.slice(0, 110);
  console.log(`Seeding ${targets.length} breeds…\n`);

  let ok = 0, fail = 0;

  for (const [main, sub] of targets) {
    const key  = sub ? `${main}/${sub}` : main;
    const id   = sub ? `${main}-${sub}` : main;
    const name = toName(main, sub);
    const info = getInfo(key);

    try {
      const imageUrl = await fetchImage(main, sub);
      db.upsertItem({
        id,
        name,
        breed_key:   key,
        image_url:   imageUrl,
        description: info.d,
        fun_fact:    info.f,
      });
      console.log(`  ✓  ${name}`);
      ok++;
    } catch (err) {
      console.error(`  ✗  ${name} — ${err.message}`);
      fail++;
    }

    await sleep(80);
  }

  const total = require('./db').allItems().length;
  console.log(`\nDone — ${ok} seeded, ${fail} failed.`);
  console.log(`Total items in store: ${total}`);
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
