/* FastDraw (.fdb) import helpers for FastCourt */
const FastDrawImport = (function () {
  const FASTCOURT_EXPORT_VERSION = "fastcourt_v1";
  const DECODE_BATCH_SIZE = 2000;

  function decodeUtf8(bytes) {
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  }

  function decodeUtf16Le(bytes) {
    const even = bytes.length - (bytes.length % 2);
    let out = "";
    for (let i = 0; i < even; i += 2) {
      const code = bytes[i] | (bytes[i + 1] << 8);
      if (code === 0) continue;
      out += String.fromCharCode(code);
    }
    return out;
  }

  function detectFormat(bytes) {
    if (bytes.length >= 8 && decodeUtf8(bytes.slice(0, 8)) === "FastDraw") {
      return "fastdraw_native";
    }
    if (bytes.length >= 15 && decodeUtf8(bytes.slice(0, 15)).startsWith("SQLite format 3")) {
      return "sqlite";
    }
    if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b) {
      return "zip";
    }
    const trimmed = decodeUtf8(bytes).trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        JSON.parse(trimmed);
        return "json";
      } catch (_) {}
    }
    if (looksLikeFirebird(bytes)) return "firebird";
    return "unknown";
  }

  function looksLikeFirebird(bytes) {
    if (bytes.length < 4096) return false;
    if (bytes[0] === 0x01) return true;
    const ascii = decodeUtf8(bytes.slice(0, Math.min(bytes.length, 65536)));
    if (ascii.includes("RDB$")) return true;
    const utf16 = decodeUtf16Le(bytes.slice(0, Math.min(bytes.length, 131072)));
    if (utf16.includes("RDB$")) return true;
    return false;
  }

  function emptyFrame() {
    return {
      players: [], arrows: [], actions: [], texts: [], zones: [], cones: [], flags: [], shadows: [],
      notes: "", thumbnail: ""
    };
  }

  function makePlay(name, meta = {}) {
    const cleanName = cleanPlayName(name || "");
    return {
      id: "play_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      name: cleanName || "Imported Play",
      team: meta.team || "No Team",
      category: meta.category || "",
      season: meta.season || "Default",
      courtType: meta.courtType || "half",
      state: { frames: [emptyFrame()] }
    };
  }

  function normalizeOpenDrawExport(data) {
    if (!data || !data.playData || !data.playData.sections) {
      throw new Error("Invalid OpenDraw export structure.");
    }
    data.playData.sections.forEach((section) => {
      section.plays = section.plays || [];
      section.plays.forEach((play) => {
        if (!play.state) play.state = { frames: [emptyFrame()] };
        if (!play.state.frames || !play.state.frames.length) {
          play.state.frames = [emptyFrame()];
        }
      });
    });
    return {
      version: data.version || FASTCOURT_EXPORT_VERSION,
      source: data.source || "fastcourt_json",
      exportedAt: data.exportedAt || new Date().toISOString(),
      customTeams: data.customTeams || ["No Team", "First Team", "Juniors"],
      customCategories: data.customCategories || [],
      customSeasons: data.customSeasons || ["Default"],
      actionColors: data.actionColors,
      playData: data.playData,
      warnings: data.warnings || []
    };
  }

  function extractBalancedJson(text, start) {
    if (start < 0 || start >= text.length || text[start] !== "{") return null;
    let depth = 0;
    let inStr = false;
    let esc = false;
    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (inStr) {
        if (esc) esc = false;
        else if (ch === "\\") esc = true;
        else if (ch === "\"") inStr = false;
        continue;
      }
      if (ch === "\"") {
        inStr = true;
        continue;
      }
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) return text.slice(start, i + 1);
      }
      if (i - start > 2000000) return null;
    }
    return null;
  }

  function extractEmbeddedJsonStrings(bytes) {
    const hits = [];
    const seen = new Set();
    const text = decodeUtf8(bytes);
    const markers = [
      "\"version\":\"opendraw_v1\"",
      "\"version\":\"playsketch_v1\"",
      "\"version\":\"fastcourt_v1\"",
      "\"version\": \"opendraw_v1\"",
      "\"version\": \"playsketch_v1\"",
      "\"version\": \"fastcourt_v1\""
    ];

    for (const marker of markers) {
      let idx = 0;
      while ((idx = text.indexOf(marker, idx)) !== -1) {
        const start = text.lastIndexOf("{", idx);
        if (start !== -1) {
          const slice = extractBalancedJson(text, start);
          if (slice && !seen.has(slice)) {
            seen.add(slice);
            try {
              hits.push(JSON.parse(slice));
            } catch (_) {}
          }
        }
        idx += marker.length;
      }
    }

    if (!hits.length) {
      const re = /\{"version"\s*:\s*"(?:opendraw_v1|playsketch_v1|fastcourt_v1)"[\s\S]{20,500000}?\}/g;
      let match;
      while ((match = re.exec(text)) !== null) {
        if (seen.has(match[0])) continue;
        seen.add(match[0]);
        try {
          hits.push(JSON.parse(match[0]));
        } catch (_) {}
      }
    }

    return hits;
  }

  function uniqueStrings(values, minLen = 3, maxLen = 80) {
    const seen = new Set();
    const out = [];
    for (const raw of values) {
      const value = String(raw || "").replace(/\s+/g, " ").trim();
      if (value.length < minLen || value.length > maxLen) continue;
      if (!/[A-Za-zΑ-Ωα-ω]/.test(value)) continue;
      if (/^(RDB\$|SYSDBA|UTF8|NONE|SQL|NULL)$/i.test(value)) continue;
      if (/^[\d\s.,:;+\-/\\()[\]{}]+$/.test(value)) continue;
      const key = value.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(value);
    }
    return out;
  }

  function extractReadableStrings(bytes) {
    const asciiChunks = [];
    let current = "";
    for (let i = 0; i < bytes.length; i++) {
      const c = bytes[i];
      if (c >= 32 && c <= 126) current += String.fromCharCode(c);
      else if (current.length >= 4) {
        asciiChunks.push(current);
        current = "";
      } else current = "";
    }
    if (current.length >= 4) asciiChunks.push(current);

    const utf16Chunks = [];
    for (let i = 0; i + 1 < bytes.length; i += 2) {
      const code = bytes[i] | (bytes[i + 1] << 8);
      if (code >= 32 && code <= 126) {
        utf16Chunks.push(String.fromCharCode(code));
      } else if (utf16Chunks.length) {
        const chunk = utf16Chunks.join("");
        if (chunk.length >= 4) asciiChunks.push(chunk);
        utf16Chunks.length = 0;
      }
    }

    return uniqueStrings(asciiChunks);
  }

  function decodeHtmlEntities(value) {
    return String(value || "")
      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");
  }

  function cleanPlayName(raw) {
    return decodeHtmlEntities(raw)
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^[\s"'$#/*!+,;%&()[\]{}\\]+/, "")
      .replace(/^\d+\s*,\s*/, "")
      .replace(/[\s.]+$/, "");
  }

  function isLikelyPlayName(value) {
    if (!value || value.length < 3 || value.length > 120) return false;
    if (!/[A-Za-zΑ-Ωα-ω]/.test(value)) return false;
    if (/^(RDB|SYSDBA|UTF8|NONE|SQL|NULL|BLOBS?|flexfield)$/i.test(value)) return false;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) return false;
    if (/^(plays?|note|notes?|series|season|team|category|tags?|library|folder|frame|frames)$/i.test(value)) return false;
    if (/^[\d\s.,:;+\-/\\()[\]{}]+$/.test(value)) return false;
    if (/^\s*O\s+\d/i.test(value)) return false;
    if (/&#\d+;/.test(value) && value.length > 40) return false;
    return true;
  }

  function scorePlayName(value) {
    let score = 0;
    if (/^(HORNS|ZONE|SLOB|ATO|FLEX|DRILL|PNR|MPNR|SPNR)/i.test(value)) score += 3;
    if (/\(\d+\)/.test(value)) score += 2;
    if (/play|drill|horns|zone|pnr|screen|stack|baseline|motion|flex|slob|ato/i.test(value)) score += 2;
    if (value.split(" ").length <= 10) score += 1;
    if (/^[\d.]+\s/.test(value)) score -= 1;
    return score;
  }

  function extractUtf16PlayNames(bytes) {
    const out = [];
    const max = bytes.length;
    let i = 0;
    while (i + 1 < max) {
      if (bytes[i + 1] !== 0 || bytes[i] < 32 || bytes[i] > 126) {
        i++;
        continue;
      }
      let value = "";
      let j = i;
      while (j + 1 < max && bytes[j + 1] === 0 && bytes[j] >= 32 && bytes[j] <= 126) {
        value += String.fromCharCode(bytes[j]);
        j += 2;
      }
      if (value.length >= 3) out.push(value);
      i = j > i ? j : i + 2;
    }
    return uniqueStrings(out.map(cleanPlayName).filter(isLikelyPlayName), 3, 120)
      .sort((a, b) => scorePlayName(b) - scorePlayName(a) || a.localeCompare(b));
  }

  function guessPlayNames(strings) {
    const keywords = /play|horns|pnr|pick|screen|blob|slob|ato|zone|motion|drill|flex|stack|baseline|transition/i;
    return strings.filter((s) => keywords.test(s) || (s.split(" ").length <= 8 && /[A-Za-z]/.test(s)));
  }

  const FASTDRAW_SERIES_RULES = [
    { series: "Horns", re: /\bhorns\b/i },
    { series: "SLOB", re: /\bslob\b/i },
    { series: "BLOB", re: /\bblob\b/i },
    { series: "ATO", re: /\bato\b|\ba\.?t\.?o\.?\b/i },
    { series: "Transition", re: /\btransition\b/i },
    { series: "Press Break", re: /\bpress\b/i },
    { series: "PNR", re: /\bpnr\b|\bp\.?\s*n\.?\s*r\b|\.pnr\b|\bpnr\.|\bpick[\s-]?and[\s-]?roll\b|\bball[\s-]?screen\b/i },
    { series: "MPNR", re: /\bmpnr\b|\bmiddle[\s-]?pnr\b/i },
    { series: "SPNR", re: /\bspnr\b|\bside[\s-]?pnr\b/i },
    { series: "Flex", re: /\bflex\b/i },
    { series: "Zone", re: /\bzone\b/i },
    { series: "Drills", re: /\bdrill\b/i },
    { series: "Stack", re: /\bstack\b/i },
    { series: "Baseline", re: /\bbaseline\b/i },
    { series: "Motion", re: /\bmotion\b/i },
    { series: "UCLA", re: /\bucla\b/i },
    { series: "Flare", re: /\bflare\b/i },
    { series: "Stagger", re: /\bstagger\b/i },
    { series: "ISO", re: /\bisolation\b|\biso\b/i },
    { series: "Post", re: /\bpost\b|\blow post\b/i },
    { series: "Floppy", re: /\bfloppy\b/i },
    { series: "Spain PNR", re: /\bspain\b/i },
    { series: "I-Set", re: /\bi[\s-]?set\b/i },
    { series: "Chin", re: /\bchin\b/i },
    { series: "Punch", re: /\bpunch\b/i },
    { series: "Flip", re: /\bflip\b/i },
    { series: "Delay", re: /\bdelay\b/i },
    { series: "Rip", re: /\brip\b/i },
    { series: "Individual Bigs", re: /\bindividual\s+bigs\b/i },
    { series: "Individual Smalls", re: /\bindividual\s+smalls\b/i },
    { series: "Spacing Drills", re: /\bspacing\s+drills?\b/i },
    { series: "Spacing Bigs", re: /\bspacing\s+bigs\b/i },
    { series: "Ball Handling", re: /\bball\s+handling\b/i },
    { series: "Pin Down", re: /\bpin\s+down\b/i },
    { series: "Step Up", re: /\bstep\s+up\b/i },
    { series: "Zipper", re: /\bzipper\b/i },
    { series: "Thumb", re: /\bthumb\b/i },
    { series: "Choice", re: /\bchoi[sc]e\b/i }
  ];

  function detectFastDrawSeries(name) {
    const clean = cleanPlayName(name);
    for (const rule of FASTDRAW_SERIES_RULES) {
      if (rule.re.test(clean)) return rule.series;
    }
    return "";
  }

  function normalizePlaybookLabel(raw) {
    let label = cleanPlayName(raw).replace(/\s+/g, " ").trim();
    if (!label) return "";
    if (label.length > 48) label = label.slice(0, 48).trim();
    return label;
  }

  function isWeakPlaybookKey(key) {
    if (!key || key.length < 2) return true;
    if (/^\d+$/.test(key)) return true;
    if (/^(play|drill|set|action|option|vs|day|other|general|misc)$/i.test(key)) return true;
    return false;
  }

  function displayPlaybookName(key) {
    const label = normalizePlaybookLabel(key);
    if (!label) return "";
    const keepUpper = /^(SLOB|BLOB|ATO|PNR|MPNR|SPNR|ISO|UCLA)$/i;
    if (keepUpper.test(label.trim())) return label.trim().toUpperCase();
    if (label === label.toUpperCase() && /[A-Z]/.test(label)) {
      return label
        .split(/\s+/)
        .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
        .join(" ");
    }
    return label;
  }

  function canonicalPlaybookKey(key) {
    return displayPlaybookName(key).toLowerCase();
  }

  function classifyFastDrawPlayNameInner(clean) {
    const series = detectFastDrawSeries(clean);

    const vsMatch = clean.match(/(?:^|\()(\d+)\s*[Vv][Ss]\.?\s*(\d+)\b/);
    if (vsMatch) {
      const key = `${vsMatch[1]} Vs ${vsMatch[2]}`;
      return { series: series || key, playbookKey: key, bucketSource: "vs-count" };
    }

    if (/\b1[\s,.-]*4\b/i.test(clean)) {
      const key = "1-4 High";
      return { series: series || key, playbookKey: key, bucketSource: "keyword" };
    }

    const downMatch = clean.match(/^(\d+)\s*down\b/i) || clean.match(/^(\d+)down\b/i);
    if (downMatch) {
      const key = `${downMatch[1]} Down`;
      return { series: series || key, playbookKey: key, bucketSource: "keyword" };
    }

    if (/\b5\s*out\b/i.test(clean)) {
      const key = "5 Out";
      return { series: series || key, playbookKey: key, bucketSource: "keyword" };
    }

    const choiceMatch = clean.match(/^(\d+)\s*\(\s*choi[sc]e\s*\)/i);
    if (choiceMatch) {
      const key = "Choice";
      return { series: series || key, playbookKey: key, bucketSource: "keyword" };
    }

    const letterPrefix = clean.match(/^([A-Z])\s+([A-Za-z][A-Za-z0-9/]*)/);
    if (letterPrefix) {
      const key = normalizePlaybookLabel(`${letterPrefix[1]} ${letterPrefix[2]}`);
      if (!isWeakPlaybookKey(key)) {
        return { series: series || key, playbookKey: key, bucketSource: "letter-prefix" };
      }
    }

    const letterDigit = clean.match(/^([A-Z])\s+(\d+)\b/);
    if (letterDigit) {
      const key = normalizePlaybookLabel(`${letterDigit[1]} ${letterDigit[2]}`);
      if (!isWeakPlaybookKey(key)) {
        return { series: series || key, playbookKey: key, bucketSource: "letter-prefix" };
      }
    }

    const parenAnnotation = clean.match(/^([A-Z0-9])\s*\([^)]{2,}\)/);
    if (parenAnnotation) {
      if (/^\d+$/.test(parenAnnotation[1])) {
        const key = "Choice";
        return { series: series || key, playbookKey: key, bucketSource: "keyword" };
      }
      const key = normalizePlaybookLabel(`${parenAnnotation[1]} Choice`);
      if (!isWeakPlaybookKey(key)) {
        return { series: series || key, playbookKey: key, bucketSource: "letter-prefix" };
      }
    }

    const bracket = clean.match(/^\[([^\]]{2,40})\]\s*(.+)$/)
      || clean.match(/^\(([^)]{2,40})\)\s+(.+)$/);
    if (bracket) {
      const label = normalizePlaybookLabel(bracket[1]);
      if (!isWeakPlaybookKey(label)) {
        return { series: series || label, playbookKey: label, bucketSource: "bracket" };
      }
    }

    const multiDelim = clean.match(/^(.{2,28}?)\s*[-–—:|/\\]\s+(.{2,28}?)\s*[-–—:|/\\]\s+(.+)$/);
    if (multiDelim) {
      const group = normalizePlaybookLabel(multiDelim[1]);
      if (!isWeakPlaybookKey(group)) {
        return { series: series || group, playbookKey: group, bucketSource: "multi-delimiter" };
      }
    }

    const underscore = clean.match(/^([A-Za-z][A-Za-z0-9]{1,24})_(.+)$/);
    if (underscore) {
      const label = normalizePlaybookLabel(underscore[1]);
      if (!isWeakPlaybookKey(label)) {
        return { series: series || label, playbookKey: label, bucketSource: "underscore" };
      }
    }

    const delim = clean.match(/^(.{2,42}?)\s*[-–—:|/\\]\s+(.+)$/);
    if (delim) {
      const label = normalizePlaybookLabel(delim[1]);
      if (!isWeakPlaybookKey(label)) {
        return { series: series || label, playbookKey: label, bucketSource: "delimiter" };
      }
    }

    const numbered = clean.match(/^(\d+(?:\s+[A-Za-z][A-Za-z0-9.\s]{0,22})?)/);
    if (numbered) {
      const key = normalizePlaybookLabel(numbered[1].trim());
      if (!isWeakPlaybookKey(key)) {
        return { series: series || key, playbookKey: key, bucketSource: "numbered" };
      }
    }

    const acronym = clean.match(/^([A-Z][A-Z0-9.]{2,}(?:\s+[A-Z0-9.]+)?)/);
    if (acronym) {
      const key = normalizePlaybookLabel(acronym[1]);
      if (!isWeakPlaybookKey(key)) {
        return { series: series || key, playbookKey: key, bucketSource: "acronym" };
      }
    }

    const titleLead = clean.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/);
    if (titleLead) {
      const key = normalizePlaybookLabel(titleLead[1]);
      if (!isWeakPlaybookKey(key)) {
        return { series: series || key, playbookKey: key, bucketSource: "title" };
      }
    }

    if (series) return { series, playbookKey: series, bucketSource: "keyword" };
    return { series: "", playbookKey: "", bucketSource: "none" };
  }

  function classifyFastDrawPlayName(name) {
    const candidates = [
      cleanPlayName(name),
      cleanPlayName(name).replace(/^[^A-Za-z0-9(\[{]+/, "").trim()
    ];
    const seen = new Set();
    for (const clean of candidates) {
      if (!clean || seen.has(clean)) continue;
      seen.add(clean);
      const result = classifyFastDrawPlayNameInner(clean);
      if (result.bucketSource !== "none" || result.series) return result;
    }
    return classifyFastDrawPlayNameInner(candidates[0] || "");
  }

  function makePlaybookSectionId(name, index) {
    const slug = String(name || "playbook")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 36) || "playbook";
    return `fdb_${slug}_${Date.now()}_${index}`;
  }

  function planPlaybookSections(plays, options = {}) {
    const fallbackPlaybook = options.fallbackPlaybook || "FastDraw Import";
    const minPlaysPerPlaybook = options.minPlaysPerPlaybook ?? 2;
    const maxPlaybooks = options.maxPlaybooks ?? 168;
    const miscPlaybook = options.miscPlaybook || "Miscellaneous";
    const foldMiscIntoFallback = !!options.foldMiscIntoFallback;
    const previewMode = !!options.previewMode;

    const classified = (plays || []).map((play) => {
      const meta = classifyFastDrawPlayName(play.name);
      return {
        play,
        ...meta,
        playbookKey: displayPlaybookName(meta.playbookKey),
        series: meta.series ? displayPlaybookName(meta.series) : ""
      };
    });

    const keyCounts = new Map();
    classified.forEach(({ playbookKey }) => {
      if (!playbookKey) return;
      const canon = canonicalPlaybookKey(playbookKey);
      keyCounts.set(canon, (keyCounts.get(canon) || 0) + 1);
    });

    function resolvePlaybookKey(item) {
      const { playbookKey, series, bucketSource } = item;
      if (series) return series;
      const canon = canonicalPlaybookKey(playbookKey);
      const count = playbookKey ? (keyCounts.get(canon) || 0) : 0;
      if (playbookKey && count >= minPlaysPerPlaybook) return displayPlaybookName(playbookKey);
      if (playbookKey && (
        bucketSource === "numbered"
        || bucketSource === "delimiter"
        || bucketSource === "bracket"
        || bucketSource === "multi-delimiter"
        || bucketSource === "underscore"
        || bucketSource === "acronym"
        || bucketSource === "title"
        || bucketSource === "letter-prefix"
        || bucketSource === "vs-count"
      )) {
        return displayPlaybookName(playbookKey);
      }
      if (foldMiscIntoFallback) return fallbackPlaybook;
      return miscPlaybook;
    }

    const rows = classified.map((item) => {
      const resolvedPlaybook = resolvePlaybookKey(item) || fallbackPlaybook;
      return {
        play: item.play,
        playName: item.play?.name || "Untitled",
        series: item.series,
        playbookKey: item.playbookKey,
        bucketSource: item.bucketSource,
        resolvedPlaybook,
        inMisc: !foldMiscIntoFallback && resolvedPlaybook === miscPlaybook
      };
    });

    const buckets = new Map();
    const bucketLabels = new Map();
    let seriesTagged = 0;

    rows.forEach((row) => {
      const playbookName = row.resolvedPlaybook;
      const canon = canonicalPlaybookKey(playbookName);
      if (!previewMode) {
        if (row.series) {
          row.play.category = row.series;
          seriesTagged++;
        } else if (playbookName !== miscPlaybook && playbookName !== fallbackPlaybook) {
          row.play.category = playbookName;
          seriesTagged++;
        }
      }
      if (!buckets.has(canon)) {
        buckets.set(canon, []);
        bucketLabels.set(canon, playbookName);
      }
      buckets.get(canon).push(row.play);
    });

    let entries = [...buckets.entries()].map(([canon, sectionPlays]) => [
      bucketLabels.get(canon) || canon,
      sectionPlays
    ]).sort((a, b) => {
      if (a[0] === miscPlaybook) return 1;
      if (b[0] === miscPlaybook) return -1;
      return b[1].length - a[1].length || a[0].localeCompare(b[0]);
    });

    if (entries.length > maxPlaybooks) {
      const keep = entries.slice(0, maxPlaybooks - 1);
      const overflow = entries.slice(maxPlaybooks - 1);
      const merged = [];
      overflow.forEach(([, list]) => merged.push(...list));
      const overflowPlaySet = new Set(merged);
      rows.forEach((row) => {
        if (overflowPlaySet.has(row.play)) {
          row.resolvedPlaybook = miscPlaybook;
          row.inMisc = !foldMiscIntoFallback;
        }
      });
      keep.push([miscPlaybook, merged]);
      entries = keep.sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
    }

    if (entries.length === 1 && entries[0][0] === miscPlaybook && fallbackPlaybook) {
      entries[0][0] = fallbackPlaybook;
      rows.forEach((row) => {
        if (row.resolvedPlaybook === miscPlaybook) row.resolvedPlaybook = fallbackPlaybook;
        row.inMisc = false;
      });
    }

    const categories = previewMode
      ? [...new Set(rows.map((r) => r.series || r.resolvedPlaybook).filter(Boolean))].sort()
      : [...new Set(classified.map((c) => c.series || c.play.category).filter(Boolean))].sort();
    const sections = entries.map(([name, sectionPlays], index) => ({
      id: previewMode ? `preview_${index}` : makePlaybookSectionId(name, index),
      name,
      plays: sectionPlays
    }));
    const miscCount = rows.filter((row) => row.inMisc).length;

    return {
      rows,
      entries,
      sections,
      categories,
      stats: {
        playbookCount: sections.length,
        seriesTagged: previewMode
          ? rows.filter((r) => r.series || (r.resolvedPlaybook && r.resolvedPlaybook !== miscPlaybook)).length
          : seriesTagged,
        playbookNames: sections.map((s) => s.name),
        miscCount,
        fallbackPlaybook,
        miscPlaybook,
        minPlaysPerPlaybook,
        foldMiscIntoFallback
      }
    };
  }

  function previewPlaybookMapping(plays, options = {}) {
    const plan = planPlaybookSections(plays, { ...options, previewMode: true });
    return {
      playbooks: plan.entries.map(([name, list]) => ({
        name,
        count: list.length,
        sampleNames: list.slice(0, 4).map((p) => p.name || "Untitled"),
        isMisc: name === (options.miscPlaybook || "Miscellaneous")
      })),
      miscPlays: plan.rows
        .filter((row) => row.inMisc)
        .slice(0, 50)
        .map((row) => ({
          name: row.playName,
          detectedKey: row.playbookKey || "—",
          bucketSource: row.bucketSource || "none"
        })),
      stats: plan.stats
    };
  }

  function applyPlaybookMapping(exportData, options = {}) {
    return organizeFastDrawLibrary(exportData, options);
  }

  function buildPlaybookSectionsFromPlays(plays, options = {}) {
    const plan = planPlaybookSections(plays, options);
    return {
      sections: plan.sections,
      categories: plan.categories,
      stats: plan.stats
    };
  }

  function organizeFastDrawLibrary(exportData, options = {}) {
    if (!exportData?.playData?.sections?.length) return exportData;
    const allPlays = exportData.playData.sections.flatMap((s) => s.plays || []);
    if (allPlays.length < 2) return exportData;

    const fallbackPlaybook = options.fallbackPlaybook
      || exportData.playData.sections[0]?.name
      || "FastDraw Import";
    const organized = buildPlaybookSectionsFromPlays(allPlays, { ...options, fallbackPlaybook });

    exportData.playData = { sections: organized.sections };
    const existing = new Set(exportData.customCategories || []);
    organized.categories.forEach((cat) => existing.add(cat));
    exportData.customCategories = [...existing].sort((a, b) => a.localeCompare(b));
    exportData.warnings = exportData.warnings || [];
    exportData.warnings.push(
      `Organized into ${organized.stats.playbookCount} playbook(s); ${organized.stats.seriesTagged} play(s) tagged with series.`
    );
    exportData.stats = { ...(exportData.stats || {}), ...organized.stats };
    return exportData;
  }

  function buildLibraryFromNames(names, sourceLabel) {
    const playbookName = sourceLabel.replace(/\.fdb$/i, "") || "FastDraw Import";
    const plays = names.slice(0, DECODE_BATCH_SIZE).map((name) => makePlay(name));
    const organized = buildPlaybookSectionsFromPlays(plays, { fallbackPlaybook: playbookName });
    return normalizeOpenDrawExport({
      version: FASTCOURT_EXPORT_VERSION,
      source: "fastdraw_fdb_partial",
      exportedAt: new Date().toISOString(),
      customTeams: ["No Team", "First Team", "Juniors"],
      customCategories: organized.categories,
      customSeasons: ["Default"],
      playData: {
        sections: organized.sections
      },
      warnings: [
        "Imported play names only — diagram coordinates were not decoded from this .fdb file.",
        "Native decode was attempted but did not return playable diagrams for this file.",
        `Organized into ${organized.stats.playbookCount} playbook(s) from play names.`
      ],
      stats: organized.stats
    });
  }

  function parseLazyNative(bytes, filename = "library.fdb", options = {}) {
    if (typeof FastDrawDecode === "undefined" || typeof FastDrawDecode.indexNativeFile !== "function") {
      throw new Error("FastDraw lazy import requires the diagram decoder.");
    }
    const index = FastDrawDecode.indexNativeFile(bytes);
    if (!index.entries.length) {
      throw new Error("No diagram blocks were indexed in this FastDraw file.");
    }
    const sourceId = options.sourceId || `fdb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const playbookName = filename.replace(/\.fdb$/i, "") || "FastDraw Import";
    const plays = index.entries.map((entry) => {
      const play = makePlay(entry.name);
      play.fastDrawLazy = {
        sourceId,
        candidateOrdinal: entry.candidateOrdinal,
        fileName: filename || "library.fdb"
      };
      return play;
    });
    const organized = buildPlaybookSectionsFromPlays(plays, { fallbackPlaybook: playbookName });
    return normalizeOpenDrawExport({
      version: FASTCOURT_EXPORT_VERSION,
      source: "fastdraw_native_lazy",
      format: "fastdraw_native",
      lazyImport: true,
      exportedAt: new Date().toISOString(),
      customTeams: ["No Team", "First Team", "Juniors"],
      customCategories: organized.categories,
      customSeasons: ["Default"],
      playData: { sections: organized.sections },
      warnings: [
        `Lazy import: ${plays.length} play(s) indexed. Diagrams decode automatically in the background after import.`,
        `Source file (${formatByteSize(bytes.length)}) stored locally for on-demand decode.`
      ],
      stats: {
        lazyImport: true,
        indexed: plays.length,
        sourceId,
        totalDiagramCandidates: index.totalDiagramCandidates,
        recordCount: index.recordCount,
        diagramCount: index.diagramCount,
        fileSize: bytes.length,
        ...organized.stats
      }
    });
  }

  function playHasDiagramContent(play) {
    const frames = play?.state?.frames || [];
    return frames.some((frame) =>
      (frame.players?.length || 0) > 0
      || (frame.arrows?.length || 0) > 0
      || (frame.actions?.length || 0) > 0
      || (frame.texts?.length || 0) > 0
      || (frame.cones?.length || 0) > 0
      || (frame.zones?.length || 0) > 0
    );
  }

  function stripEmptyPlaysFromDecoded(decoded) {
    if (!decoded?.playData?.sections) return decoded;
    let removed = 0;
    decoded.playData.sections.forEach((sec) => {
      if (!Array.isArray(sec.plays)) return;
      const before = sec.plays.length;
      sec.plays = sec.plays.filter((play) => playHasDiagramContent(play));
      removed += before - sec.plays.length;
    });
    decoded.playData.sections = decoded.playData.sections.filter((sec) => (sec.plays || []).length > 0);
    if (removed > 0) {
      decoded.warnings = decoded.warnings || [];
      decoded.warnings.push(`Removed ${removed} empty play(s) after decode.`);
      decoded.stats = decoded.stats || {};
      decoded.stats.emptyPlaysRemoved = removed;
    }
    return decoded;
  }

  async function parse(bytes, filename = "library.fdb", options = {}) {
    const format = detectFormat(bytes);

    if (format === "json") {
      return normalizeOpenDrawExport(JSON.parse(decodeUtf8(bytes).trim()));
    }

    const embedded = extractEmbeddedJsonStrings(bytes);
    if (embedded.length) {
      return normalizeOpenDrawExport(embedded[embedded.length - 1]);
    }

    if (format === "fastdraw_native") {
      const playbookName = filename.replace(/\.fdb$/i, "") || "FastDraw Import";

      if (typeof FastDrawDecode !== "undefined") {
        const batchSize = options.maxPlays || DECODE_BATCH_SIZE;
        const skipCandidates = options.skipCandidates || 0;
        const batchIndex = options.batchIndex || (skipCandidates > 0 ? Math.ceil(skipCandidates / batchSize) + 1 : 1);
        const decoded = FastDrawDecode.decodeNativeFile(bytes, {
          maxPlays: batchSize,
          skipCandidates,
          batchIndex,
          playbookName
        });
        if (decoded.playData?.sections?.[0]?.plays?.length) {
          stripEmptyPlaysFromDecoded(decoded);
          const normalized = normalizeOpenDrawExport(
            organizeFastDrawLibrary(decoded, { fallbackPlaybook: playbookName })
          );
          normalized.format = "fastdraw_native";
          normalized.stats = { ...(decoded.stats || {}), ...(normalized.stats || {}) };
          return normalized;
        }
      }

      const candidates = extractUtf16PlayNames(bytes);
      if (candidates.length >= 3) {
        const partial = buildLibraryFromNames(candidates.slice(0, DECODE_BATCH_SIZE), filename);
        partial.partialImport = true;
        partial.format = "fastdraw_native";
        return partial;
      }
      const err = new Error("FASTDRAW_NEEDS_CONVERTER");
      err.format = "fastdraw_native";
      err.details =
        "FastDraw native .fdb detected, but no readable play names were found in this file.";
      throw err;
    }

    if (format === "firebird" || format === "unknown") {
      const strings = extractReadableStrings(bytes);
      const candidates = guessPlayNames(strings);

      if (candidates.length >= 3) {
        const partial = buildLibraryFromNames(candidates, filename);
        partial.partialImport = true;
        partial.format = format === "firebird" ? "firebird" : "unknown";
        return partial;
      }

      const err = new Error("FASTDRAW_NEEDS_CONVERTER");
      err.format = format === "firebird" ? "firebird" : "unknown";
      err.details =
        "This .fdb looks like a Firebird database. FastCourt cannot decode diagrams directly in the browser yet.";
      throw err;
    }

    if (format === "sqlite") {
      const err = new Error("FASTDRAW_SQLITE");
      err.details = "This .fdb file looks like SQLite. Please contact support with a sample file so we can add a reader.";
      throw err;
    }

    throw new Error("Unrecognized .fdb format.");
  }

  async function parseNamesOnly(bytes, filename = "library.fdb") {
    const format = detectFormat(bytes);
    let candidates = [];
    if (format === "fastdraw_native") {
      candidates = extractUtf16PlayNames(bytes);
    } else {
      candidates = guessPlayNames(extractReadableStrings(bytes));
    }
    if (candidates.length < 3) {
      const err = new Error("FASTDRAW_NEEDS_CONVERTER");
      err.format = format;
      err.details = "Not enough play names found for a names-only import.";
      throw err;
    }
    const partial = buildLibraryFromNames(candidates.slice(0, DECODE_BATCH_SIZE), filename);
    partial.partialImport = true;
    partial.format = format === "fastdraw_native" ? "fastdraw_native" : (format === "firebird" ? "firebird" : "unknown");
    return partial;
  }

  function formatByteSize(bytes) {
    const n = Number(bytes) || 0;
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(2)} MB`;
  }

  function analyze(bytes, filename = "library.fdb") {
    const format = detectFormat(bytes);
    const formatLabels = {
      fastdraw_native: "FastDraw native",
      firebird: "Firebird legacy",
      sqlite: "SQLite",
      json: "JSON",
      zip: "ZIP archive",
      unknown: "Unknown binary"
    };
    const analysis = {
      format,
      formatLabel: formatLabels[format] || format,
      filename: filename || "library.fdb",
      fileSize: bytes.length,
      fileSizeLabel: formatByteSize(bytes.length),
      canBrowserDecode: format === "json" || format === "fastdraw_native",
      canNamesOnly: false,
      nameCount: 0,
      converterRequired: false,
      converterType: null,
      hints: []
    };

    if (format === "json") {
      analysis.hints.push("JSON export — full library import in the browser.");
      return analysis;
    }

    if (format === "fastdraw_native") {
      if (typeof FastDrawDecode === "undefined") {
        analysis.hints.push("Diagram decoder not loaded — refresh the page.");
      } else {
        analysis.hints.push("FastDraw native binary — browser will attempt full diagram decode.");
        try {
          const index = FastDrawDecode.indexNativeFile(bytes);
          analysis.estimatedDiagrams = index.totalDiagramCandidates || FastDrawDecode.findDiagramOffsets(bytes).length;
          analysis.indexedPlays = index.totalDiagramCandidates;
          analysis.batchSize = DECODE_BATCH_SIZE;
          analysis.batchCount = Math.max(1, Math.ceil(analysis.estimatedDiagrams / DECODE_BATCH_SIZE));
          analysis.needsBatchImport = analysis.estimatedDiagrams > DECODE_BATCH_SIZE;
          analysis.canLazyImport = analysis.indexedPlays >= 1;
          if (analysis.canLazyImport) {
            analysis.hints.push(
              `${analysis.indexedPlays} play(s) indexed — use lazy import to add the catalog instantly and decode on open.`
            );
          }
          if (analysis.needsBatchImport) {
            analysis.hints.push(
              `${analysis.estimatedDiagrams} diagram(s) — import in batches of ${DECODE_BATCH_SIZE} (background decode).`
            );
          }
        } catch (_) {}
      }
      const names = extractUtf16PlayNames(bytes);
      analysis.nameCount = names.length;
      analysis.canNamesOnly = names.length >= 3;
      if (analysis.canNamesOnly) {
        analysis.hints.push(`${names.length} play name(s) available for names-only fallback.`);
      }
      return analysis;
    }

    if (format === "firebird" || format === "unknown") {
      analysis.converterRequired = true;
      analysis.converterType = format === "firebird" ? "firebird" : "unknown";
      const candidates = guessPlayNames(extractReadableStrings(bytes));
      analysis.nameCount = candidates.length;
      analysis.canNamesOnly = candidates.length >= 3;
      analysis.hints.push("Legacy Firebird-style .fdb — use desktop converter for full diagrams.");
      if (analysis.canNamesOnly) {
        analysis.hints.push(`${candidates.length} likely play name(s) found in file strings.`);
      }
      return analysis;
    }

    if (format === "sqlite") {
      analysis.converterRequired = true;
      analysis.converterType = "sqlite";
      analysis.hints.push("SQLite .fdb — not supported in-browser yet. Contact support with a sample file.");
      return analysis;
    }

    analysis.converterRequired = true;
    analysis.hints.push("Unrecognized .fdb format.");
    return analysis;
  }

  return {
    DECODE_BATCH_SIZE,
    detectFormat,
    analyze,
    parse,
    parseLazyNative,
    parseNamesOnly,
    organizeFastDrawLibrary,
    buildPlaybookSectionsFromPlays,
    previewPlaybookMapping,
    applyPlaybookMapping,
    classifyFastDrawPlayName
  };
})();

if (typeof globalThis !== "undefined") {
  globalThis.FastDrawImport = FastDrawImport;
}

if (typeof module !== "undefined") {
  module.exports = FastDrawImport;
}
