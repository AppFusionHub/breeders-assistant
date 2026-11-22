export interface Guide {
  slug: string;
  title: string;
  summary: string;
  tag: 'Husbandry' | 'Health' | 'Breeding';
  sections: { heading: string; body: string[] }[];
  sources: { label: string; url: string }[];
}

const MERCK = { label: 'Merck Veterinary Manual: Poultry', url: 'https://www.merckvetmanual.com/poultry' };
const BAI = { label: 'Bureau of Animal Industry (BAI)', url: 'https://www.bai.gov.ph' };
const DA_MC7 = {
  label: 'DA Memorandum Circular No. 7: Newcastle disease in Luzon poultry farms',
  url: 'https://www.bai.gov.ph/media/qoznpeku/da-memorandum-circular-no-7-newcastle-disease-reports-in-luzon-poultry-farms.pdf',
};

export const GUIDES: Guide[] = [
  {
    slug: 'incubation',
    title: 'Incubation & hatching',
    tag: 'Husbandry',
    summary: 'The 21-day timeline: temperature, humidity, turning, candling and lockdown.',
    sections: [
      { heading: 'Collecting hatching eggs', body: [
        'Collect eggs at least twice a day. Pick clean, normal-shaped eggs. Avoid cracked, very small or double-yolk eggs.',
        'Store pointed end down in a cool place (about 13–18 °C if possible). Set within 7 days. Hatchability drops the longer eggs are stored.',
        'Do not wash hatching eggs. Washing removes the protective bloom.',
      ]},
      { heading: 'Incubator settings', body: [
        'Forced-air (with fan) incubator: about 37.5 °C (99.5 °F). Still-air: measure at the top of the eggs, about 38.3 °C (101 °F).',
        'Humidity about 50–55% for days 1–18, then 65–70% from day 18 to hatch.',
        'Turn eggs at least 3 times a day (odd number so they rest on alternating sides overnight), until day 18.',
        'Brown-outs: keep the incubator closed. Eggs tolerate short cooling better than overheating. A UPS or a backup plan helps.',
      ]},
      { heading: 'Candling', body: [
        'Day 7: a fertile egg shows spider-like veins and a dark spot. A "clear" egg is infertile. A red ring ("blood ring") means early death. Remove both.',
        'Day 14: most of the egg is dark with a clear air cell at the blunt end. Remove eggs that have not developed.',
        'Record fertile counts in the app to track fertility per breeding pair.',
      ]},
      { heading: 'Lockdown & hatch', body: [
        'Day 18: stop turning, raise humidity and do not open the incubator.',
        'Pips appear around day 20; most chicks hatch on day 21. Leave chicks in until they are dry, then move them to the brooder.',
        'Hen-hatched: give the hen a quiet, clean nest with feed and water nearby. Mark eggs so you can remove new eggs laid later.',
      ]},
    ],
    sources: [
      { label: 'Penn State Extension: Incubating eggs', url: 'https://extension.psu.edu/' },
      MERCK,
    ],
  },
  {
    slug: 'brooding',
    title: 'Brooding chicks (0–6 weeks)',
    tag: 'Husbandry',
    summary: 'Heat, space, feed and water for the first weeks.',
    sections: [
      { heading: 'Heat', body: [
        'Start about 32–35 °C at chick level in week 1, then lower about 3 °C each week until no extra heat is needed (often by week 4–6 in the Philippine climate).',
        'Watch the chicks: huddled under the lamp means they are cold, staying at the edges and panting means hot, evenly spread means just right.',
        'Use a brooder guard (ring) so chicks cannot wander away from the heat. Avoid drafts.',
      ]},
      { heading: 'Feed & water', body: [
        'Give clean water first, then chick starter/booster feed (about 18–21% protein) freely.',
        'Use shallow drinkers, or put pebbles in them, so chicks do not drown.',
        'Keep litter (rice hulls or ipa) dry. Remove wet patches daily. Wet litter encourages coccidiosis.',
      ]},
      { heading: 'Identification', body: [
        'Wing-band or toe-punch at hatch so every chick links back to its sire and dam. Use the app\'s "Register chicks" on the hatch batch.',
      ]},
    ],
    sources: [MERCK],
  },
  {
    slug: 'vaccination',
    title: 'Vaccination (Newcastle disease)',
    tag: 'Health',
    summary: 'BAI recommended ND program for game fowls, plus handling tips.',
    sections: [
      { heading: 'Why it matters', body: [
        'Newcastle disease ("peste") spreads fast and kills many birds. It has no treatment, so vaccination is the main protection.',
        'DA advises regular ND vaccination on schedule, especially for backyard flocks and gamefowl.',
      ]},
      { heading: 'BAI game fowl ND program', body: [
        'Day 3–7: live B1 or other apathogenic strain (high-risk areas: day 1–3).',
        'Day 14–17: live La Sota (high-risk areas: day 10–14).',
        'Day 28: killed La Sota, intramuscular. May be optional if a recombinant ND vaccine was given at day 1.',
        'These are the defaults in the app\'s Health schedule. Edit them to match your veterinarian\'s program and confirm with the current BAI document.',
      ]},
      { heading: 'Handling vaccines', body: [
        'Keep vaccines cold (2–8 °C). Do not freeze unless the label says so. Use reconstituted live vaccine within the time on the label (usually within 1–2 hours).',
        'Use chlorine-free water for drinking-water vaccines, and never mix disinfectant with vaccines.',
        'Other vaccines (fowl pox, fowl cholera, coryza) depend on the disease risk in your area. Ask your municipal or provincial veterinarian.',
      ]},
    ],
    sources: [BAI, DA_MC7, MERCK],
  },
  {
    slug: 'biosecurity',
    title: 'Biosecurity basics',
    tag: 'Health',
    summary: 'Simple farm habits that keep disease out.',
    sections: [
      { heading: 'Keep disease out', body: [
        'Quarantine new or returning birds (from derby, sale or another farm) for at least 2–3 weeks, away from your flock. Feed and handle them last.',
        'Use a footbath or separate slippers at the farm entrance. Limit visitors, especially other breeders.',
        'Keep wild birds, rats and stray chickens away from feed and water.',
      ]},
      { heading: 'Keep the farm clean', body: [
        'Clean drinkers daily. Clean and disinfect pens between batches.',
        'Bury or burn dead birds right away, and never sell or eat sick birds.',
        'Report sudden high deaths to your municipal agriculturist or veterinarian. ND and bird flu (avian influenza) must be reported.',
      ]},
    ],
    sources: [BAI, MERCK],
  },
  {
    slug: 'diseases',
    title: 'Recognizing common diseases',
    tag: 'Health',
    summary: 'Warning signs to watch for. Get a vet to confirm the diagnosis.',
    sections: [
      { heading: 'Important', body: [
        'Many diseases look alike. Use this list to spot a problem early, then consult a veterinarian or the BAI/Regional Animal Disease Diagnostic Laboratory for diagnosis and treatment.',
      ]},
      { heading: 'Newcastle disease', body: [
        'Gasping, coughing, green watery droppings, twisted neck (torticollis), paralysis, sudden deaths. Isolate birds and report it.',
      ]},
      { heading: 'Fowl pox (bulutong)', body: [
        'Dry form: wart-like scabs on the comb, wattles and face. Wet form: yellow patches in the mouth and throat that make breathing and eating hard. Spread by mosquitoes, so it is more common in the rainy season.',
      ]},
      { heading: 'Infectious coryza / CRD (sipon)', body: [
        'Swollen face, nasal discharge, foul smell, bubbly eyes, rattling breath. Often worse with stress, poor ventilation and damp housing.',
      ]},
      { heading: 'Coccidiosis', body: [
        'Bloody or mucus droppings, hunched and fluffed-up chicks, poor growth. Linked to wet litter. Common at 3–8 weeks.',
      ]},
      { heading: 'Worms and lice/mites', body: [
        'Weight loss, pale comb, dull feathers, lower egg production. Check under the wings and around the vent for lice and mites. Deworm on a schedule your vet recommends.',
      ]},
    ],
    sources: [MERCK],
  },
  {
    slug: 'breeding-systems',
    title: 'Breeding systems & inbreeding',
    tag: 'Breeding',
    summary: 'Inbreeding, line breeding, outcrossing, and how to read the COI number.',
    sections: [
      { heading: 'The three approaches', body: [
        'Inbreeding: mating very close relatives (full siblings, parent × offspring). It fixes traits fast but brings out hidden defects and lowers vigor and hatchability.',
        'Line breeding: milder inbreeding toward one outstanding ancestor (for example, half-siblings or a grandsire × granddaughter mating). It keeps a family\'s type while limiting the damage.',
        'Outcrossing: mating unrelated lines. It restores vigor (hybrid vigor), but offspring are less uniform.',
        'Many breeders keep a few pure families, line breed within them, and cross families to produce battle or sale stock.',
      ]},
      { heading: 'Coefficient of inbreeding (COI)', body: [
        'The COI is the chance that a chick inherits two identical copies of a gene from a shared ancestor. The app calculates it from your recorded pedigrees.',
        'Reference values: full siblings or parent × offspring = 25%, half siblings = 12.5%, first cousins = 6.25%, unrelated = 0%.',
        'The COI is only as accurate as your records. Missing parents count as unrelated, so the real value may be higher.',
      ]},
      { heading: 'Selection & culling', body: [
        'Breed only from healthy, sound birds with good structure. Write down the traits you select for (gameness, speed, cutting ability, temperament, conformation) and keep notes on each bird.',
        'Track fertility and hatch rate per pair. A sudden drop can be an early sign of too much inbreeding.',
      ]},
    ],
    sources: [{ label: 'Wright, S. (1922): Coefficients of inbreeding and relationship', url: 'https://www.journals.uchicago.edu/doi/10.1086/279872' }],
  },
  {
    slug: 'records',
    title: 'Record keeping & marking',
    tag: 'Breeding',
    summary: 'Why records matter and how to mark birds.',
    sections: [
      { heading: 'Mark every bird', body: [
        'Wing bands at hatch, leg bands once the shanks are large enough. Toe punching gives a permanent family mark.',
        'Use a band numbering scheme that encodes year and family, for example 26-KL-014.',
      ]},
      { heading: 'Record the essentials', body: [
        'For each bird: band number, sire, dam, hatch date, bloodline, color, and any vaccines or treatments.',
        'For each breeding pen and incubation batch: eggs set, fertile eggs, hatched chicks.',
        'Use Settings → Export backup regularly. Data is stored only on this phone.',
      ]},
    ],
    sources: [],
  },
];
