import { Fragment, type ReactNode } from 'react';
import type { Block } from '@/lib/content';

const AR_RUN = /([؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿][؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿\s]*[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]|[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿])/g;

/** Membungkus potongan teks Arab di tengah kalimat dengan font Amiri. */
export function Rich({ text }: { text: string }) {
  const parts = text.split(AR_RUN);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <span key={i} className="ar-inline" lang="ar" dir="rtl">
            {p}
          </span>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}

export default function Article({ blocks }: { blocks: Block[] }) {
  const out: ReactNode[] = [];
  let list: { n: number; text: string }[] = [];
  const flush = (k: number) => {
    if (list.length) {
      out.push(
        <ol key={'ol' + k}>
          {list.map((li, i) => (
            <li key={i}>
              <span className="li-n">{li.n}</span>
              <span>
                <Rich text={li.text} />
              </span>
            </li>
          ))}
        </ol>,
      );
      list = [];
    }
  };

  blocks.forEach((b, k) => {
    if (b.type === 'li') {
      list.push({ n: b.n, text: b.text });
      return;
    }
    flush(k);
    switch (b.type) {
      case 'h2':
        out.push(
          <h2 key={k} id={b.id}>
            {b.num ? <span className="h2-num">{String(b.num).padStart(2, '0')}</span> : null}
            <span>{b.text}</span>
          </h2>,
        );
        break;
      case 'h3':
        out.push(
          <h3 key={k} id={b.id} className={/^Ayat\s+\d/i.test(b.text) ? 'ayat-h' : undefined}>
            {b.text}
          </h3>,
        );
        break;
      case 'label':
        out.push(
          <p key={k} className="label">
            {b.text}
          </p>,
        );
        break;
      case 'p':
        out.push(
          <p key={k}>
            <Rich text={b.text} />
          </p>,
        );
        break;
      case 'faq':
        out.push(
          <p key={k} className="faq">
            “{b.text}”
          </p>,
        );
        break;
      case 'keyword':
        out.push(
          <p key={k} className="kw">
            <strong>{b.term}</strong>{' '}
            <span className="ar-inline" lang="ar" dir="rtl">
              {b.arabic}
            </span>
            : <Rich text={b.text} />
          </p>,
        );
        break;
      case 'callout':
        out.push(
          <aside key={k} className={`callout ${b.variant}`}>
            <div className="c-label">{b.label || (b.variant === 'reflection' ? 'Renungkan' : '')}</div>
            <p>
              <Rich text={b.text} />
            </p>
          </aside>,
        );
        break;
      case 'ayah':
        out.push(
          <figure key={k} className="ayah">
            {b.arabic.split('\n').map((line, i) => (
              <p key={i} className="ayah-ar" lang="ar" dir="rtl">
                {line}
              </p>
            ))}
            <figcaption>
              <p className="ayah-ref">({b.ref})</p>
              {b.translation
                ? b.translation
                    .split(/\s(?=\(\d{1,3}\)\s)/)
                    .map((t, i) => (
                      <p key={i} className="ayah-tr">
                        {t}
                      </p>
                    ))
                : null}
            </figcaption>
          </figure>,
        );
        break;
      case 'arabic':
        out.push(
          <p key={k} className="arabic-only" lang="ar" dir="rtl">
            {b.text}
          </p>,
        );
        break;
      case 'table':
        out.push(
          <table key={k} className="tbl">
            <thead>
              <tr>
                {b.head.map((h, i) => (
                  <th key={i}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.rows.map((r, ri) => (
                <tr key={ri}>
                  {r.map((c, ci) => (
                    <td key={ci} data-label={b.head[ci] || ''}>
                      <Rich text={c} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>,
        );
        break;
      case 'image':
        out.push(
          <figure key={k} className="doc-figure">
            <a href={b.src} target="_blank" rel="noopener" aria-label={`Perbesar gambar: ${b.alt || 'gambar'}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.src} alt={b.alt || ''} width={b.width || undefined} height={b.height || undefined} loading="lazy" decoding="async" />
            </a>
            <figcaption>Ketuk gambar untuk memperbesar</figcaption>
          </figure>,
        );
        break;
      case 'divider':
        out.push(
          <div key={k} className="divider" aria-hidden="true">
            ◆◆◆
          </div>,
        );
        break;
      case 'signature':
        out.push(
          <p key={k} className="signature">
            — {b.text}
          </p>,
        );
        break;
    }
  });
  flush(blocks.length);
  return <div className="article">{out}</div>;
}
