"use client";

import type { FilmScoutPrintModel } from "@/lib/film-room/film-scout-print-model";

export function FilmScoutPrintDocument({ model }: { model: FilmScoutPrintModel }) {
  return (
    <div className="fc-film-scout-print-doc">
      <header className="fc-film-scout-print-header">
        {model.teamName ? (
          <div className="fc-film-scout-print-team">{model.teamName}</div>
        ) : null}
        <h1 className="fc-film-scout-print-title">{model.reportTitle}</h1>
        <p className="fc-film-scout-print-meta">
          {model.sessionTitle}
          {" · "}
          {model.sourceLabel}
          {" · "}
          Generated {model.generatedAtLabel}
        </p>
        <p className="fc-film-scout-print-session-link">
          Film session: {model.sessionLink}
        </p>
      </header>

      {model.chapters.length ? (
        <section className="fc-film-scout-print-chapters">
          <h2 className="fc-film-scout-print-chapters-title">Chapters</h2>
          <ul className="fc-film-scout-print-chapter-list">
            {model.chapters.map((chapter) => (
              <li
                key={`${chapter.timeLabel}-${chapter.label}`}
                className={`fc-film-scout-print-chapter-row${chapter.kind === "disruption" ? " is-disruption" : ""}`}
              >
                <span className="fc-film-scout-print-chapter-time">{chapter.timeLabel}</span>
                <span className="fc-film-scout-print-chapter-label">{chapter.label}</span>
                {chapter.note ? (
                  <span className="fc-film-scout-print-chapter-note">{chapter.note}</span>
                ) : null}
                <span className="fc-film-scout-print-clip-link">{chapter.clipLink}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {model.clips.map((clip, index) => (
        <section
          key={`${clip.playheadLabel}-${index}`}
          className="fc-film-scout-print-clip"
        >
          <header className="fc-film-scout-print-clip-head">
            <h2 className="fc-film-scout-print-clip-title">
              Clip @ {clip.playheadLabel}
            </h2>
            <p className="fc-film-scout-print-clip-link">{clip.clipLink}</p>
          </header>

          {clip.summary ? (
            <div className="fc-film-scout-print-summary">
              <strong>Summary</strong>
              <p>{clip.summary}</p>
            </div>
          ) : null}

          {clip.coachTags.length ? (
            <div className="fc-film-scout-print-block">
              <h3 className="fc-film-scout-print-block-title">Coach tags</h3>
              <ul className="fc-film-scout-print-tag-list">
                {clip.coachTags.map((tag, tagIndex) => (
                  <li key={`${tag.time}-${tagIndex}`}>
                    <span className="fc-film-scout-print-tag-time">{tag.time}</span>
                    <span className="fc-film-scout-print-tag-label">{tag.label}</span>
                    {tag.note ? (
                      <span className="fc-film-scout-print-tag-note"> — {tag.note}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {clip.tendencies.length ? (
            <div className="fc-film-scout-print-block">
              <h3 className="fc-film-scout-print-block-title">Tendencies</h3>
              <ul className="fc-film-scout-print-tendency-list">
                {clip.tendencies.map((row, rowIndex) => (
                  <li key={`${row.label}-${rowIndex}`}>
                    <span className="fc-film-scout-print-tendency-label">{row.label}</span>
                    <span className="fc-film-scout-print-confidence">
                      {row.confidencePct}%
                    </span>
                    {row.notes ? (
                      <p className="fc-film-scout-print-tendency-note">{row.notes}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {clip.patterns.length ? (
            <div className="fc-film-scout-print-block">
              <h3 className="fc-film-scout-print-block-title">Play patterns</h3>
              <ul className="fc-film-scout-print-pattern-list">
                {clip.patterns.map((row, rowIndex) => (
                  <li key={`${row.tag}-${rowIndex}`}>
                    <span className="fc-film-scout-print-pattern-tag">{row.tag}</span>
                    <span className="fc-film-scout-print-confidence">
                      {row.confidencePct}%
                    </span>
                    {row.notes ? (
                      <p className="fc-film-scout-print-pattern-note">{row.notes}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {clip.disruption ? (
            <div className="fc-film-scout-print-block fc-film-scout-print-disruption">
              <h3 className="fc-film-scout-print-block-title">Play disrupted</h3>
              <p className="fc-film-scout-print-disruption-headline">{clip.disruption.headline}</p>
              <p>{clip.disruption.reason}</p>
              {clip.disruption.coverageLabel ? (
                <p>
                  <strong>Coverage:</strong> {clip.disruption.coverageLabel}
                </p>
              ) : null}
              {clip.disruption.whatBroke ? (
                <p>
                  <strong>What broke:</strong> {clip.disruption.whatBroke}
                </p>
              ) : null}
              {clip.disruption.suggestedRead ? (
                <p>
                  <strong>Read:</strong> {clip.disruption.suggestedRead}
                </p>
              ) : null}
              {clip.disruption.offenseReads.length ? (
                <ul className="fc-film-scout-print-disruption-reads">
                  {clip.disruption.offenseReads.map((read) => (
                    <li key={read}>{read}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          {clip.disruptionTags.length ? (
            <div className="fc-film-scout-print-block">
              <h3 className="fc-film-scout-print-block-title">Disruption tags</h3>
              <ul className="fc-film-scout-print-tag-list">
                {clip.disruptionTags.map((tag, tagIndex) => (
                  <li key={`${tag.time}-${tagIndex}`}>
                    <span className="fc-film-scout-print-tag-time">{tag.time}</span>
                    <span className="fc-film-scout-print-tag-label">{tag.label}</span>
                    {tag.note ? (
                      <span className="fc-film-scout-print-tag-note"> — {tag.note}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {clip.coachingSections.map((section) => (
            <div key={section.categoryId} className="fc-film-scout-print-block">
              <h3 className="fc-film-scout-print-block-title">{section.label}</h3>
              <ul className="fc-film-scout-print-coaching-list">
                {section.items.map((item, itemIndex) => (
                  <li key={`${item.title}-${itemIndex}`} className="fc-film-scout-print-coaching-item">
                    <div className="fc-film-scout-print-coaching-head">
                      <strong>{item.title}</strong>
                      {item.priority ? (
                        <span
                          className={`fc-film-scout-print-priority fc-film-scout-print-priority-${item.priority}`}
                        >
                          {item.priority}
                        </span>
                      ) : null}
                    </div>
                    <p>{item.detail}</p>
                    {item.metaLines?.length ? (
                      <ul className="fc-film-scout-print-coaching-meta">
                        {item.metaLines.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}

      {model.footerText ? (
        <footer className="fc-film-scout-print-footer">{model.footerText}</footer>
      ) : null}
    </div>
  );
}
