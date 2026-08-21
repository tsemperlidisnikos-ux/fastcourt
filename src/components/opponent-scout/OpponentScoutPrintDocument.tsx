import {
  OPPONENT_SCOUT_STAT_COLUMNS,
  type OpponentScoutReport,
} from "@/types/opponent-scout";

interface Props {
  report: OpponentScoutReport;
  brandLogoDataUrl?: string;
  footerLogoDataUrl?: string;
  pageNumber?: number;
  pageCount?: number;
}

function formatGameDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split("-");
    return `${Number(d)}/${Number(m)}/${y}`;
  }
  return trimmed;
}

export function OpponentScoutPrintDocument({
  report,
  brandLogoDataUrl,
  footerLogoDataUrl,
  pageNumber = 1,
  pageCount = 1,
}: Props) {
  const logo = brandLogoDataUrl || report.teamLogoDataUrl;
  const footerLogo = footerLogoDataUrl || logo;

  return (
    <article className="fc-os-print-doc">
      <header className="fc-os-print-header">
        <div className="fc-os-print-header-top">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="fc-os-print-team-logo" src={logo} alt="" />
          ) : (
            <div className="fc-os-print-team-logo placeholder" />
          )}
          <div className="fc-os-print-title-block">
            <h1>{report.teamName || "Opponent"}</h1>
            {report.gameDate ? (
              <p>Game Date: {formatGameDate(report.gameDate)}</p>
            ) : null}
          </div>
        </div>
      </header>

      <div className="fc-os-print-players">
        {report.players.map((player) => (
          <section key={player.id} className="fc-os-print-player">
            <div className="fc-os-print-player-photo">
              {player.photoDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={player.photoDataUrl} alt={player.name} />
              ) : (
                <div className="fc-os-print-player-photo-empty" />
              )}
            </div>

            <div className="fc-os-print-player-body">
              <div className="fc-os-print-player-heading">
                {[
                  player.jersey ? `#${player.jersey}` : null,
                  player.name || "PLAYER",
                  player.position || null,
                  player.height || null,
                ]
                  .filter(Boolean)
                  .join(" • ")}
              </div>

              {OPPONENT_SCOUT_STAT_COLUMNS.some(
                (column) => player.stats[column.key]?.trim(),
              ) ? (
                <table className="fc-os-print-stats">
                  <thead>
                    <tr>
                      {OPPONENT_SCOUT_STAT_COLUMNS.filter(
                        (column) => player.stats[column.key]?.trim(),
                      ).map((column) => (
                        <th key={column.key}>{column.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {OPPONENT_SCOUT_STAT_COLUMNS.filter(
                        (column) => player.stats[column.key]?.trim(),
                      ).map((column) => (
                        <td key={column.key}>{player.stats[column.key]}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              ) : null}

              <div className="fc-os-print-sw">
                <div>
                  <h3>STRENGTH</h3>
                  {player.strengths.length ? (
                    <ul>
                      {player.strengths.map((line, index) => (
                        <li key={`${player.id}-s-${index}`}>{line}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="fc-os-print-empty-note">—</p>
                  )}
                </div>
                <div>
                  <h3>WEAKNESS</h3>
                  {player.weaknesses.length ? (
                    <ul>
                      {player.weaknesses.map((line, index) => (
                        <li key={`${player.id}-w-${index}`}>{line}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="fc-os-print-empty-note">—</p>
                  )}
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>

      <footer className="fc-os-print-footer">
        <div className="fc-os-print-footer-brand">
          {footerLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={footerLogo} alt="" />
          ) : null}
        </div>
        {pageCount > 1 ? (
          <div className="fc-os-print-footer-page">
            {pageNumber} of {pageCount}
          </div>
        ) : null}
      </footer>
    </article>
  );
}
