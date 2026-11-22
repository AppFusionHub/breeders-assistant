import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Card } from '../components';
import { FEED_STAGES, INGREDIENTS, mixProtein, mixVerdict } from '../lib/feeding';

type Mix = Record<string, { share: string; protein: number }>;
const STORE = 'ba-feed-mix';

const PRESETS: { label: string; shares: Record<string, number>; protein?: Record<string, number> }[] = [
  { label: '70 pellets + 30 mais', shares: { pellet: 70, corn: 30 } },
  { label: '50 pellets + 25 mais + 25 palay', shares: { pellet: 50, corn: 25, palay: 25 } },
  { label: 'PCAARRD farm mix (supplement)', shares: { darak: 50, corn: 20, copra: 30 } },
  { label: '60 pellets + 30 mais + 10 monggo', shares: { pellet: 60, corn: 30, monggo: 10 } },
];

function initialMix(): Mix {
  const m: Mix = Object.fromEntries(INGREDIENTS.map((i) => [i.id, { share: '', protein: i.protein }]));
  try {
    const saved = JSON.parse(localStorage.getItem(STORE) ?? 'null') as Mix | null;
    if (saved) for (const k of Object.keys(m)) if (saved[k]) m[k] = saved[k];
  } catch { /* storage unavailable */ }
  return m;
}

const SOURCES = [
  { label: 'Oregon State Extension: Nutrition for the backyard flock (protein by stage)', url: 'https://extension.oregonstate.edu/sites/default/files/catalog/auto/PNW477.pdf' },
  { label: 'Alabama Extension: Nutrition for backyard chicken flocks', url: 'https://www.aces.edu/wp-content/uploads/2022/07/ANR-1317_NutritionforBackyardChickenFlocks_071222aL.pdf' },
  { label: 'Mississippi State Extension: Feeds and nutrition', url: 'https://extension.msstate.edu/agriculture/livestock/poultry/feeds-and-nutrition' },
  { label: 'Colorado State Extension: Practical feeding methods for small flocks (grains ~10%)', url: 'https://extension.colostate.edu/resource/practical-feeding-methods-for-small-poultry-flocks/' },
  { label: 'Manila Bulletin: 6 major components of native poultry feed (PCAARRD farm mix)', url: 'https://mb.com.ph/2022/05/04/6-major-components-of-native-poultry-feed' },
  { label: 'DA RFO 3: Native chicken production guide', url: 'https://rfo3.da.gov.ph/wp-content/uploads/elibrary/km/Native%20Chicken.pdf' },
  { label: 'Feedipedia: feed ingredient protein values', url: 'https://www.feedipedia.org/' },
];

export default function Feeding() {
  const [sp, setSp] = useSearchParams();
  const stage = FEED_STAGES.find((s) => s.id === sp.get('stage')) ?? FEED_STAGES[0];
  const [mix, setMix] = useState<Mix>(initialMix);
  useEffect(() => { try { localStorage.setItem(STORE, JSON.stringify(mix)); } catch { /* ignore */ } }, [mix]);

  const set = (id: string, patch: Partial<Mix[string]>) => setMix((m) => ({ ...m, [id]: { ...m[id], ...patch } }));
  const parts = Object.values(mix).map((v) => ({ share: Number(v.share) || 0, protein: v.protein }));
  const total = parts.reduce((a, p) => a + p.share, 0);
  const protein = mixProtein(parts);
  const verdict = protein != null ? mixVerdict(protein, stage.protein) : null;

  function preset(p: (typeof PRESETS)[number]) {
    setMix((m) => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, { ...v, share: p.shares[k] ? String(p.shares[k]) : '' }])));
  }

  return (
    <div className="stack">
      <Link to="/guides" className="small">← Guides</Link>
      <h1>Feeding by age</h1>
      <p className="small muted">Uses feeds you can buy in the Philippines. A complete commercial feed is the base at every stage; grains and greens are added on top. Always check the protein % printed on the sack.</p>

      <div className="chips">
        {FEED_STAGES.map((s) => (
          <button key={s.id} className={`chip ${s.id === stage.id ? 'on' : ''}`} onClick={() => setSp({ stage: s.id }, { replace: true })}>{s.name}</button>
        ))}
      </div>

      <Card>
        <div className="row-between"><h2>{stage.name}</h2><span className="small muted">{stage.ages}</span></div>
        <div className="targets">
          <div><span className="small muted">Protein (whole ration)</span><b>{stage.protein[0]}–{stage.protein[1]}%</b></div>
          {stage.calcium && <div><span className="small muted">Calcium</span><b>{stage.calcium}</b></div>}
        </div>
        <h3>Main feed</h3>
        <ul className="tight">{stage.mainFeed.map((x) => <li key={x}>{x}</li>)}</ul>
        <h3>Add</h3>
        <ul className="tight">{stage.extras.map((x) => <li key={x}>{x}</li>)}</ul>
        {stage.avoid && <><h3>Avoid</h3><ul className="tight">{stage.avoid.map((x) => <li key={x}>{x}</li>)}</ul></>}
        {stage.notes && <p className="small muted">{stage.notes.join(' ')}</p>}
      </Card>

      <Card>
        <h2>Feed mix calculator</h2>
        <p className="small muted">Enter parts of each feed (by weight, e.g. kg or percent). It works out the protein of the whole mix and compares it with the <b>{stage.name}</b> target.</p>
        <div className="chips wrap">
          {PRESETS.map((p) => <button key={p.label} className="chip" onClick={() => preset(p)}>{p.label}</button>)}
          <button className="chip" onClick={() => preset({ label: '', shares: {} })}>Clear</button>
        </div>
        <div className="mix">
          <div className="mix-head small muted"><span>Feed</span><span>Protein %</span><span>Parts</span></div>
          {INGREDIENTS.map((i) => (
            <div key={i.id} className={`mix-row ${Number(mix[i.id].share) > 0 ? 'used' : ''}`}>
              <label htmlFor={`share-${i.id}`} className="small">{i.name}{i.note && <span className="hint"> · {i.note}</span>}</label>
              {i.custom
                ? <input aria-label={`${i.name} protein %`} type="number" inputMode="decimal" step="0.5" min="0" max="80" value={mix[i.id].protein}
                    onChange={(e) => set(i.id, { protein: Number(e.target.value) || 0 })} />
                : <span className="small center">{i.protein}</span>}
              <input id={`share-${i.id}`} type="number" inputMode="decimal" min="0" step="any" placeholder="0" value={mix[i.id].share}
                onChange={(e) => set(i.id, { share: e.target.value })} />
            </div>
          ))}
        </div>
        {protein == null ? (
          <p className="small muted">Enter parts for at least one feed.</p>
        ) : (
          <div className={`mix-result mix-${verdict}`}>
            <div className="coi-num">{protein.toFixed(1)}%</div>
            <div className="small">protein in this mix ({total} parts) · target {stage.protein[0]}–{stage.protein[1]}%</div>
            <p>
              {verdict === 'ok' && '✓ Within the target for this stage.'}
              {verdict === 'low' && '▼ Too low. Add more commercial feed or a protein source (monggo, soybean meal, copra or fish meal), or use less grain.'}
              {verdict === 'high' && '▲ Higher than needed. Fine for short periods, but you can save money by adding more grain.'}
            </p>
          </div>
        )}
        <p className="hint">The PCAARRD farm mix is meant as a cheaper supplement, often blended about 75:25 with commercial feed, not as the whole diet. </p>
        <p className="hint">Protein values for grains and meals are typical averages and real feeds vary. This checks protein only. Vitamins, minerals and calcium come mainly from the commercial feed, greens and oyster shell, so don't replace commercial feed with grains alone for chicks or laying hens.</p>
      </Card>

      <Card>
        <h2>Good habits at every stage</h2>
        <ul className="tight small">
          <li>Clean water always. Birds drink more in hot weather.</li>
          <li>Change feeds gradually over 3–5 days by mixing old and new.</li>
          <li>Store feed dry, off the floor and away from rats. Throw away moldy feed, especially moldy corn.</li>
          <li>Give grit (graba) when birds eat whole grains or forage.</li>
          <li>Weigh or handle birds regularly and adjust the amount to keep good body condition.</li>
          <li>Feed costs are tracked under <Link to="/costs">Costs</Link>.</li>
        </ul>
      </Card>

      <div className="small">
        <b>Sources</b>
        <ul>{SOURCES.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.label}</a></li>)}</ul>
      </div>
    </div>
  );
}
