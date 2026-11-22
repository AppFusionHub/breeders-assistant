import { Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useBirds } from '../hooks';
import { Card, Empty } from '../components';
import { birdLabel } from '../db';
import { confidence, lineNicks, MIN_LINE, MIN_PAIR, pairNicks, verdict, verdictLabel, type NickResult } from '../lib/nick';

function NickRow({ r, title, to }: { r: NickResult; title: string; to?: string }) {
  const v = verdict(r);
  const body = (
    <>
      <div className="grow">
        <b>{title}</b>
        <div className="small muted">
          {r.n} rated offspring · avg {r.mean.toFixed(1)} (range {r.min}–{r.max}) vs expected {r.expected.toFixed(1)}
          {r.basis === 'flock-average' && ' (flock average)'}
        </div>
      </div>
      <div className="right">
        <span className={`nick-tag nick-${v}`}>{v === 'strong' && confidence(r) !== 'early' ? <Sparkles size={12} /> : null} {verdictLabel(r)}</span>
        <div className="small muted">{r.diff >= 0 ? '+' : ''}{r.diff.toFixed(2)} · {confidence(r)} data</div>
      </div>
    </>
  );
  return to ? <Link to={to} className="row-link">{body}</Link> : <div className="row-link">{body}</div>;
}

export default function Nicks() {
  const { birds, map } = useBirds();
  if (!birds) return null;
  const pairs = pairNicks(birds);
  const lines = lineNicks(birds);
  const ratedCount = birds.filter((b) => b.rating).length;

  return (
    <div className="stack">
      <h1>Nick finder</h1>
      <p className="small">
        A <b>nick</b> is a cock and hen (or two bloodlines) whose offspring turn out better than either parent produces with other mates.
        The app compares each pair's offspring ratings with what that cock and that hen produce with others.
      </p>

      {ratedCount < 4 && (
        <Empty>
          Rate your birds 1–5 on their profile (the stars on the bird page) once you can judge them.
          <span className="small">You have {ratedCount} rated bird{ratedCount === 1 ? '' : 's'}. Nicks appear once a pair has {MIN_PAIR}+ rated offspring.</span>
          <Link to="/birds" className="btn">Go to birds</Link>
        </Empty>
      )}

      <Card>
        <h2>Pairs</h2>
        {!pairs.length && <p className="muted small">No pair has {MIN_PAIR}+ rated offspring yet.</p>}
        {pairs.map((r) => (
          <NickRow key={r.key} r={r} title={`${birdLabel(map.get(r.sire as number))} × ${birdLabel(map.get(r.dam as number))}`} to={`/pair?sire=${r.sire}&dam=${r.dam}`} />
        ))}
      </Card>

      <Card>
        <h2>Bloodline crosses</h2>
        <p className="small muted">Sire's line × dam's line. Needs {MIN_LINE}+ rated offspring and bloodlines set on the parents.</p>
        {lines.map((r) => <NickRow key={r.key} r={r} title={`${r.sire} × ${r.dam}`} />)}
      </Card>

      <Card>
        <h2>How to read this</h2>
        <ul className="small tight">
          <li><b>Strong nick</b>: offspring average at least 0.5 above expected. Worth repeating this mating.</li>
          <li><b>Possible nick</b>: 0.2–0.5 above expected. Promising; hatch more to confirm.</li>
          <li><b>Poor cross</b>: 0.5 or more below expected. Consider other mates for both birds.</li>
          <li><b>Promising / Below expected</b>: the same signals with early data. Hatch more before deciding.</li>
          <li><b>Data</b>: "early" means fewer than 4 offspring, or no other-mate offspring to compare against. Treat early results as hints, not proof.</li>
          <li>Rate consistently, using the same standard and at a similar age, or the comparison means little.</li>
        </ul>
      </Card>
    </div>
  );
}
