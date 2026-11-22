export interface FeedStage {
  id: string;
  name: string;
  ages: string;
  fromWeeks: number;
  toWeeks?: number;
  who?: 'all' | 'M' | 'F';
  protein: [number, number]; // % crude protein target for the whole ration
  calcium?: string;
  mainFeed: string[];
  extras: string[];
  avoid?: string[];
  notes?: string[];
}

export const FEED_STAGES: FeedStage[] = [
  {
    id: 'chick', name: 'Chick', ages: '0–6 weeks', fromWeeks: 0, toWeeks: 6, protein: [20, 22], calcium: '~1%',
    mainFeed: ['Chick booster or chick starter crumble (mash or crumble, not pellets). Feed it free-choice.'],
    extras: ['Clean water at all times. Use shallow drinkers.', 'A little finely chopped malunggay or kangkong is optional. If you give anything besides crumble, also give chick-size grit.'],
    avoid: ['Whole grains (mais, palay) are too big and dilute protein.', 'Layer feed has too much calcium for chicks.'],
    notes: ['Many breeders change from starter to grower at about 1½ months. Change over gradually across 3–5 days.'],
  },
  {
    id: 'grower', name: 'Grower', ages: '6–18 weeks', fromWeeks: 6, toWeeks: 18, protein: [15, 18], calcium: '~1%',
    mainFeed: ['Grower pellets or crumble as the base of the diet.'],
    extras: ['Grains (cracked mais, palay, binlid) at about 10% of the daily feed.', 'Greens and grass: malunggay, kangkong, camote tops, ipil-ipil leaves (small amounts), and range or pasture if you have it.', 'Grit (graba) once they eat grains or forage.'],
    avoid: ['Feeding mostly grains, because growth and feathering suffer from low protein.', 'Layer feed for males or before pullets lay.'],
  },
  {
    id: 'developer', name: 'Stag / pullet (developer)', ages: '18 weeks to maturity', fromWeeks: 18, toWeeks: 40, protein: [14, 16], calcium: '~1% (until laying)',
    mainFeed: ['Grower or developer pellets, or maintenance pellets.'],
    extras: ['Grains can be a bigger share now. Use the calculator below to keep the whole ration at 14–16% protein.', 'Greens daily, grit and space to exercise.'],
    avoid: ['Switching pullets to layer feed before they start laying, because the extra calcium is not needed yet.'],
    notes: ['Gamefowl mature slower than commercial chickens. Many stags and pullets are not fully mature until 8–12 months.'],
  },
  {
    id: 'maintenance', name: 'Adult: maintenance (not breeding)', ages: 'Adults, rest season', fromWeeks: 40, protein: [14, 16],
    mainFeed: ['Maintenance or grower pellets, plus grains.'],
    extras: ['Keep the whole ration around 14–16% protein. A pellet + mais + palay mix usually works; check it with the calculator.', 'Watch body condition and adjust the amount so birds are neither fat nor thin.'],
    avoid: ['Layer feed for cocks over long periods. Males don\'t need the extra calcium, and too much calcium can harm the kidneys of non-laying birds.'],
  },
  {
    id: 'breeder-hen', name: 'Breeding hen (laying)', ages: 'Laying season', fromWeeks: 40, who: 'F', protein: [16, 18], calcium: '3.5–4%',
    mainFeed: ['Layer or breeder pellets. Start about 2 weeks before you collect hatching eggs.'],
    extras: ['Oyster shell (kabibe) or another calcium grit free-choice in a separate dish.', 'Greens (malunggay, kangkong) for vitamins and yolk color.'],
    avoid: ['Too many grains, because protein and calcium drop, and so do shell quality and hatchability.'],
  },
  {
    id: 'broodcock', name: 'Broodcock (breeding season)', ages: 'Breeding season', fromWeeks: 40, who: 'M', protein: [15, 17],
    mainFeed: ['Breeder or maintenance pellets, plus grains.'],
    extras: ['Greens and clean water. Keep him fit, not fat, because fertility drops in overweight males.'],
    avoid: ['Long-term layer feed (see Maintenance).'],
    notes: ['If cocks and hens share a pen, provide layer feed or oyster shell for the hens in a separate feeder or by free-choice calcium.'],
  },
  {
    id: 'molt', name: 'Molting', ages: 'During the molt', fromWeeks: 40, protein: [18, 22],
    mainFeed: ['Higher-protein pellets: grower, all-flock or breeder feed.'],
    extras: ['Protein boosters such as monggo, soybean meal or a little fish meal can lift a grain-heavy mix. Check it with the calculator.'],
    notes: ['See the Molt care program for the full routine.'],
  },
];

export interface Ingredient {
  id: string;
  name: string;
  protein: number; // approx % crude protein, as fed
  note?: string;
  custom?: boolean; // protein editable (e.g. bag label)
}

// Approximate typical values. Commercial feed: use the bag label.
export const INGREDIENTS: Ingredient[] = [
  { id: 'pellet', name: 'Commercial feed (bag label)', protein: 16, custom: true, note: 'Enter the crude protein % from the sack' },
  { id: 'pellet2', name: 'Second commercial feed', protein: 21, custom: true },
  { id: 'corn', name: 'Mais (yellow corn), cracked', protein: 8.5 },
  { id: 'palay', name: 'Palay (unhulled rice)', protein: 7 },
  { id: 'binlid', name: 'Binlid (broken rice)', protein: 8 },
  { id: 'wheat', name: 'Trigo (wheat)', protein: 12 },
  { id: 'darak', name: 'Darak / rice bran (D1)', protein: 12 },
  { id: 'copra', name: 'Copra meal', protein: 20 },
  { id: 'monggo', name: 'Monggo (mung beans)', protein: 23 },
  { id: 'malunggay', name: 'Malunggay leaf meal (dried)', protein: 25 },
  { id: 'soya', name: 'Soybean meal', protein: 44 },
  { id: 'fishmeal', name: 'Fish meal (local)', protein: 55, note: 'Varies a lot by quality' },
];

export function mixProtein(parts: { share: number; protein: number }[]): number | null {
  const total = parts.reduce((a, p) => a + (p.share > 0 ? p.share : 0), 0);
  if (!total) return null;
  return parts.reduce((a, p) => a + (p.share > 0 ? p.share * p.protein : 0), 0) / total;
}

export function mixVerdict(protein: number, target: [number, number]): 'low' | 'ok' | 'high' {
  const shown = Math.round(protein * 10) / 10; // judge the number the user sees
  if (shown < target[0]) return 'low';
  if (shown > target[1]) return 'high';
  return 'ok';
}

/** Suggested feeding stage from age (and sex for adults). */
export function stageForAge(ageWeeks: number | null, sex: 'M' | 'F' | 'U'): FeedStage {
  const byId = (id: string) => FEED_STAGES.find((s) => s.id === id)!;
  if (ageWeeks == null) return byId(sex === 'U' ? 'grower' : 'maintenance');
  if (ageWeeks < 6) return byId('chick');
  if (ageWeeks < 18) return byId('grower');
  if (ageWeeks < 40) return byId('developer');
  return byId('maintenance');
}
