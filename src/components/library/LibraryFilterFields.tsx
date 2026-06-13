"use client";

interface FilterProps {
  season: string;
  type: string;
  team: string;
  series: string;
  tags: string;
  playName: string;
  onSeasonChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onTeamChange: (value: string) => void;
  onSeriesChange: (value: string) => void;
  onTagsChange: (value: string) => void;
  onPlayNameChange: (value: string) => void;
  onCreate?: () => void;
  onImport?: () => void;
  showCreate?: boolean;
  showImport?: boolean;
  cleanSlot?: React.ReactNode;
  sortSlot?: React.ReactNode;
  creating?: boolean;
}

export function LibraryFilterFields({
  season,
  type,
  team,
  series,
  tags,
  playName,
  onSeasonChange,
  onTypeChange,
  onTeamChange,
  onSeriesChange,
  onTagsChange,
  onPlayNameChange,
  onCreate,
  onImport,
  showCreate = true,
  showImport = true,
  cleanSlot,
  sortSlot,
  creating,
}: FilterProps) {
  return (
    <div className="fd-filter-bar org-filter-bar">
      <div className="fd-filter-fields">
        <label className="fd-filter-item fd-filter-search">
          <span className="fd-filter-label">Seasons</span>
          <span className="fd-search-wrap">
            <span className="fd-search-icon" aria-hidden="true">
              ⌕
            </span>
            <input
              type="text"
              className="fd-search-input"
              placeholder="Search seasons…"
              value={season}
              onChange={(e) => onSeasonChange(e.target.value)}
            />
          </span>
        </label>
        <label className="fd-filter-item fd-filter-search">
          <span className="fd-filter-label">Type</span>
          <span className="fd-search-wrap">
            <span className="fd-search-icon" aria-hidden="true">
              ⌕
            </span>
            <input
              type="text"
              className="fd-search-input"
              placeholder="Search play / drill…"
              value={type}
              onChange={(e) => onTypeChange(e.target.value)}
            />
          </span>
        </label>
        <label className="fd-filter-item fd-filter-search">
          <span className="fd-filter-label">Teams</span>
          <span className="fd-search-wrap">
            <span className="fd-search-icon" aria-hidden="true">
              ⌕
            </span>
            <input
              type="text"
              className="fd-search-input"
              placeholder="Search teams…"
              value={team}
              onChange={(e) => onTeamChange(e.target.value)}
            />
          </span>
        </label>
        <label className="fd-filter-item fd-filter-search">
          <span className="fd-filter-label">Series</span>
          <span className="fd-search-wrap">
            <span className="fd-search-icon" aria-hidden="true">
              ⌕
            </span>
            <input
              type="text"
              className="fd-search-input"
              placeholder="Search series…"
              value={series}
              onChange={(e) => onSeriesChange(e.target.value)}
            />
          </span>
        </label>
        <label className="fd-filter-item fd-filter-search">
          <span className="fd-filter-label">Tags</span>
          <span className="fd-search-wrap">
            <span className="fd-search-icon" aria-hidden="true">
              ⌕
            </span>
            <input
              type="text"
              className="fd-search-input"
              placeholder="Search tags…"
              value={tags}
              onChange={(e) => onTagsChange(e.target.value)}
            />
          </span>
        </label>
        <div className="fd-filter-play-name-row">
          <label className="fd-filter-item fd-filter-search fd-filter-search-wide">
            <span className="fd-filter-label">Play Name</span>
            <span className="fd-search-wrap">
              <span className="fd-search-icon" aria-hidden="true">
                ⌕
              </span>
              <input
                type="text"
                className="fd-search-input org-search"
                id="search-input"
                placeholder="Search plays…"
                value={playName}
                onChange={(e) => onPlayNameChange(e.target.value)}
              />
            </span>
          </label>
          {showCreate ? (
            <button
              type="button"
              className="fd-create-play-btn fd-filter-create-btn"
              id="btn-fd-quick-play"
              title="New play"
              disabled={creating}
              onClick={onCreate}
            >
              {creating ? "…" : "Create"}
            </button>
          ) : null}
          {sortSlot}
        </div>
      </div>
      {showImport || cleanSlot ? (
      <div className="fd-filter-actions org-filter-bar-actions">
        <div className="fd-create-group" id="fd-create-actions">
          {cleanSlot}
          {showImport ? (
          <button
            type="button"
            className="fd-menu-btn"
            onClick={onImport}
            title="Import FastDraw .fdb"
          >
            Import .fdb
          </button>
          ) : null}
        </div>
      </div>
      ) : null}
    </div>
  );
}
