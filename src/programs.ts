import type { ProgramStep } from './db';

export interface BuiltinProgram {
  slug: string;
  name: string;
  summary: string;
  startHint: string; // what "day 0" means
  durationDays: number;
  steps: ProgramStep[];
  sources: { label: string; url: string }[];
  guideSlug?: string;
}

const MSU_PARASITES = { label: 'Mississippi State Extension: Control external parasites of poultry', url: 'https://extension.msstate.edu/publications/control-external-parasites-poultry' };
const LSU_WORMS = { label: 'LSU AgCenter: Worms in chickens', url: 'https://www.lsuagcenter.com/profiles/lblack/articles/page1717688621824' };
const BAI = { label: 'Bureau of Animal Industry (BAI)', url: 'https://www.bai.gov.ph' };
const MERCK = { label: 'Merck Veterinary Manual: Poultry', url: 'https://www.merckvetmanual.com/poultry' };

const DEWORM_NOTE = 'Best: have a fecal test done, or ask your vet which product to use. Follow the label dose and the egg withdrawal period, and do not set eggs laid during withdrawal.';
const LICE_NOTE = 'Check under the wings and around the vent. Some mites hide in nests and cracks by day and feed at night, so also check birds after dark with a flashlight.';
const REPEAT_LICE_NOTE = 'Most treatments do not kill louse eggs (nits). A second treatment catches newly hatched lice. Follow the product label for the interval.';

export const BUILTIN_PROGRAMS: BuiltinProgram[] = [
  {
    slug: 'pre-breeding',
    name: 'Pre-breeding conditioning (6 weeks)',
    summary: 'Get broodcocks and hens healthy and in condition before you put pairs together.',
    startHint: 'Start 6 weeks before you plan to put pairs together.',
    durationDays: 42,
    steps: [
      { day: 0, time: '06:30', title: 'Health check & weigh breeders', notes: 'Check body condition (feel the keel), comb color, eyes and nostrils, droppings, and feet (bumblefoot). Write weights in each bird\'s notes. Hold back any bird that is sick or very thin.' },
      { day: 0, time: '19:00', title: 'Check for lice & mites (night check)', notes: LICE_NOTE },
      { day: 1, time: '06:30', title: 'Deworm breeders', notes: DEWORM_NOTE },
      { day: 2, time: '07:00', title: 'Treat lice/mites if found; clean nests & perches', notes: 'Treat birds and housing together, including nest boxes, perches and cracks.' },
      { day: 7, lastDay: 35, everyDays: 7, time: '07:00', title: 'Vitamins & minerals in water', notes: 'Use a poultry vitamin/electrolyte product at the label dose. Make fresh water daily.' },
      { day: 10, time: '07:00', title: 'Repeat lice/mite treatment (if treated)', notes: REPEAT_LICE_NOTE },
      { day: 14, time: '07:00', title: 'Switch hens to layer/breeder feed', notes: 'Hens need extra calcium for strong shells. Use layer/breeder ration or give oyster shell free-choice, at least 2 weeks before collecting hatching eggs.' },
      { day: 21, time: '08:00', title: 'Ask your vet about an ND booster before laying', notes: 'Breeders are best vaccinated before the laying season. Ask your vet or municipal agriculturist which vaccine to use and when.' },
      { day: 28, time: '08:00', title: 'Prepare breeding pens & nests', notes: 'Clean and disinfect pens, put in fresh litter and nesting material, and check feeders, drinkers and fences.' },
      { day: 35, time: '06:30', title: 'Final health check & weigh', notes: 'Compare with the weights from week 1. Only pair birds that are healthy and in good condition.' },
      { day: 42, time: '07:00', title: 'Put breeding pairs/pens together', notes: 'Hens can store sperm for about 2–3 weeks. If a hen was recently with a different cock, wait about 3 weeks before saving her eggs, so the chicks\' sire is certain. Record each pairing in the app.' },
    ],
    sources: [MSU_PARASITES, LSU_WORMS, BAI, MERCK],
    guideSlug: 'breeding-systems',
  },
  {
    slug: 'molt',
    name: 'Molt care (8 weeks)',
    summary: 'Support feather regrowth and keep stress low during the yearly molt.',
    startHint: 'Start when birds begin dropping feathers.',
    durationDays: 56,
    steps: [
      { day: 0, time: '07:00', title: 'Switch to higher-protein feed (about 18–22%)', notes: 'Feathers are mostly protein. Use a grower, all-flock or breeder ration with more protein than ordinary layer feed. Hens molting usually stop laying, which is normal.' },
      { day: 0, time: '08:00', title: 'Pause breeding, moving and handling', notes: 'Avoid moving birds, adding new birds or rearranging pens during molt, because changes in the pecking order add stress. Do not set eggs from molting hens.' },
      { day: 3, lastDay: 52, everyDays: 7, time: '07:00', title: 'Vitamins in water', notes: 'Poultry vitamin product at the label dose.' },
      { day: 7, lastDay: 49, everyDays: 7, time: '19:00', title: 'Check lice/mites & feather regrowth', notes: LICE_NOTE },
      { day: 56, time: '07:00', title: 'Molt check: return to normal ration when done', notes: 'When new feathers are fully grown in, go back to the usual feed. Then you can start the pre-breeding program.' },
    ],
    sources: [
      { label: 'Farm & Fleet: Complete guide to molting chickens', url: 'https://www.farmandfleet.com/blog/?p=13208' },
      { label: 'Purina: Tips to help molting chickens (feed company)', url: 'https://www.purinamills.com/chicken-feed/education/detail/three-tips-to-help-molting-chickens' },
      MSU_PARASITES,
    ],
  },
  {
    slug: 'hen-recovery',
    name: 'Hen recovery after brooding (3 weeks)',
    summary: 'Help a hen regain condition after sitting and raising chicks.',
    startHint: 'Start when the hen is done brooding.',
    durationDays: 21,
    steps: [
      { day: 0, time: '07:00', title: 'Health & parasite check of hen', notes: `Brooding hens lose weight and often pick up mites in the nest. ${LICE_NOTE}` },
      { day: 0, time: '08:00', title: 'Clean nest box & replace nesting material', notes: 'Remove old nesting material, and clean and treat the box before the next hen uses it.' },
      { day: 0, time: '09:00', title: 'Full ration: layer/breeder feed + fresh water', notes: 'Give her free access to good feed so she can rebuild body condition.' },
      { day: 1, time: '07:00', title: 'Treat lice/mites if found', notes: 'Treat the hen and the nest area.' },
      { day: 7, time: '07:00', title: 'Deworm if due', notes: DEWORM_NOTE },
      { day: 11, time: '07:00', title: 'Repeat lice/mite treatment (if treated)', notes: REPEAT_LICE_NOTE },
      { day: 21, time: '07:00', title: 'Condition check: ready to breed again?', notes: 'She should have good weight, a red comb and bright eyes. If not, give her more rest.' },
    ],
    sources: [MSU_PARASITES, LSU_WORMS],
  },
  {
    slug: 'grow-out',
    name: 'Chick-to-stag grow-out (16 weeks)',
    summary: 'Brooding, feed changes, housing moves and selection from hatch to 4 months.',
    startHint: 'Start on hatch day.',
    durationDays: 112,
    steps: [
      { day: 0, time: '07:00', title: 'Brooder ready: 32–35 °C, starter feed, clean water', notes: 'See the Brooding guide. Vaccines follow the Health schedule automatically for chicks with a hatch date.' },
      { day: 7, lastDay: 28, everyDays: 7, time: '07:00', title: 'Lower brooder heat by about 3 °C', notes: 'Watch the chicks. Huddling means they are cold; panting or staying away from the heat means they are hot.' },
      { day: 14, lastDay: 56, everyDays: 7, time: '17:00', title: 'Litter & coccidiosis check', notes: 'Keep litter dry. Watch for bloody droppings or hunched, fluffed-up chicks, and call your vet if you see them.' },
      { day: 35, time: '07:00', title: 'Remove heat if fully feathered', notes: 'In warm weather most chicks no longer need heat by 4–6 weeks. Keep them out of drafts and rain.' },
      { day: 49, time: '07:00', title: 'Switch from starter to grower feed', notes: 'Change over gradually across 3–5 days by mixing the old and new feed.' },
      { day: 56, time: '08:00', title: 'Ask your vet about first deworming', notes: DEWORM_NOTE },
      { day: 56, time: '09:00', title: 'Move to grow-out pen (more space & perches)', notes: 'Give them room to exercise, low perches and shade.' },
      { day: 90, time: '07:00', title: 'Separate stags from pullets', notes: 'This reduces fighting and gives pullets a rest. Update each bird\'s sex in the app.' },
      { day: 90, time: '08:00', title: 'Banding check: move to leg bands', notes: 'Make sure every bird is still identified and that bands are not too tight.' },
      { day: 112, time: '08:00', title: 'Evaluate & rate birds (★)', notes: 'Rate each bird 1–5 on its page, using the same standard every time, and choose keepers. Ratings at a consistent age make the Nick finder accurate.' },
    ],
    sources: [MERCK, LSU_WORMS],
    guideSlug: 'brooding',
  },
];

export function builtinByKey(key: string) {
  return key.startsWith('builtin:') ? BUILTIN_PROGRAMS.find((p) => `builtin:${p.slug}` === key) : undefined;
}
