import { Link, useParams } from 'react-router-dom';
import { GUIDES } from '../guides';
import { Card } from '../components';

export default function Guides() {
  const tags = ['Husbandry', 'Health', 'Breeding'] as const;
  return (
    <div className="stack">
      <h1>Guides</h1>
      <p className="small muted">Available offline. General guidance only. For sick birds, consult a veterinarian or your municipal or provincial agriculture office.</p>
      {tags.map((t) => (
        <div key={t} className="stack-sm">
          <h2 className="eyebrow">{t}</h2>
          {GUIDES.filter((g) => g.tag === t).map((g) => (
            <Link key={g.slug} to={`/guides/${g.slug}`} className="card guide-card">
              <b>{g.title}</b>
              <span className="small muted">{g.summary}</span>
            </Link>
          ))}
        </div>
      ))}
    </div>
  );
}

export function GuideDetail() {
  const g = GUIDES.find((x) => x.slug === useParams().slug);
  if (!g) return <p className="muted">Guide not found.</p>;
  return (
    <article className="stack guide">
      <Link to="/guides" className="small">← All guides</Link>
      <h1>{g.title}</h1>
      <p className="muted">{g.summary}</p>
      {g.sections.map((s) => (
        <Card key={s.heading}>
          <h2>{s.heading}</h2>
          <ul>{s.body.map((p, i) => <li key={i}>{p}</li>)}</ul>
        </Card>
      ))}
      {g.sources.length > 0 && (
        <div className="small">
          <b>Sources & further reading</b>
          <ul>{g.sources.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.label}</a></li>)}</ul>
        </div>
      )}
    </article>
  );
}
