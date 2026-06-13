/* FastDraw native .fdb diagram decoder for FastCourt / OpenDraw */
const FastDrawDecode = (function () {
  const FD_COURT_W = 50;
  const FD_COURT_H = 47;

  /** FastDraw native units (iCoach MigrationFastDraw) */
  const FD_AN = 49.21259689331055;
  const FD_VT = 45.931758880615234;
  const FD_ET = FD_VT * 2;
  const FD_GO = FD_ET + 10;
  const FD_AR = FD_AN + 10;
  const FD_DR = FD_VT + 10;

  const MAP_HORIZ_MARGIN = 0.07;
  const MAP_VERT_OFFSET_HALF = 0.05;
  const MAP_VERT_OFFSET_FULL = 0;
  const MAP_FULL_TOP_INSET = 0.08;
  const MAP_FULL_BOTTOM_INSET = 0.08;
  const MAP_FULL_HORIZ_STRETCH = 0.04;

  const LINE_TYPES = new Set([
    101, 102, 103, 104, 105, 106, 107, 108,
    111, 112, 113, 114, 116, 117, 118,
    155, 156, 157, 158,
    168, 169, 170, 171, 174, 176, 178,
    187, 188, 191, 192, 193, 194
  ]);

  const LINE_ACTION_MAP = {
    101: "cut",
    102: "cut",
    103: "pass",
    104: "pass",
    105: "dribble",
    106: "screen",
    107: "handoff",
    108: "curl",
    111: "cut",
    112: "dribble",
    113: "pass",
    114: "dribble",
    116: "curl",
    117: "screen",
    118: "screen",
    155: "handoff",
    156: "screen",
    157: "screen",
    158: "screen",
    168: "cut",
    169: "pass",
    170: "cut",
    171: "shoot",
    174: "dribble",
    176: "handoff",
    178: "screen",
    187: "cut",
    188: "pass",
    191: "dribble",
    192: "screen",
    193: "pass",
    194: "cut"
  };

  const DEFAULT_STROKE = {
    cut: "#000000",
    pass: "#2563eb",
    dribble: "#f97316",
    screen: "#dc2626",
    handoff: "#9333ea",
    curl: "#000000",
    shoot: "#16a34a"
  };

  const FD_FULL_COURT_W = 94;
  const FD_FULL_COURT_H = 50;

  function bytesLike(bytes) {
    return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  }

  function readDoubleBE(bytes, offset, dataView) {
    if (dataView) return dataView.getFloat64(offset, false);
    if (typeof Buffer !== "undefined" && bytes instanceof Buffer) return bytes.readDoubleBE(offset);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return view.getFloat64(offset, false);
  }

  function readDoubleLE(bytes, offset, dataView) {
    if (dataView) return dataView.getFloat64(offset, true);
    if (typeof Buffer !== "undefined" && bytes instanceof Buffer) return bytes.readDoubleLE(offset);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return view.getFloat64(offset, true);
  }

  function tryReadCoordPair(bytes, xOff, dataView) {
    const attempts = [
      { x: readDoubleBE(bytes, xOff, dataView), y: readDoubleBE(bytes, xOff + 8, dataView) },
      { x: readDoubleLE(bytes, xOff, dataView), y: readDoubleLE(bytes, xOff + 8, dataView) }
    ];
    for (const pt of attempts) {
      if (isValidCourtCoord(pt.x, pt.y)) return pt;
    }
    return null;
  }

  const EXTENDED_LINE_TYPE_MAP = {
    109: 103, 110: 104, 115: 101, 119: 101, 120: 103, 121: 105,
    122: 106, 123: 107, 124: 108, 125: 117, 126: 118, 127: 156,
    128: 169, 129: 174, 130: 171, 159: 158, 160: 157, 161: 176,
    162: 178, 163: 192, 164: 193, 165: 194, 166: 187, 167: 188,
    172: 170, 173: 171, 175: 174, 177: 176, 179: 178, 180: 192,
    181: 193, 182: 194, 183: 187, 184: 188, 185: 191, 186: 192
  };

  function resolveLineTypeCode(raw) {
    if (LINE_ACTION_MAP[raw]) return raw;
    if (EXTENDED_LINE_TYPE_MAP[raw]) return EXTENDED_LINE_TYPE_MAP[raw];
    if (raw >= 195 && raw <= 210) return 101;
    if (raw >= 90 && raw <= 100) return 103;
    return null;
  }

  function indexOfBytes(haystack, needle, from = 0) {
    const h = bytesLike(haystack);
    const n = bytesLike(needle);
    outer: for (let i = from; i <= h.length - n.length; i++) {
      for (let j = 0; j < n.length; j++) {
        if (h[i + j] !== n[j]) continue outer;
      }
      return i;
    }
    return -1;
  }

  function indexOfString(haystack, text, from = 0) {
    const h = bytesLike(haystack);
    for (let i = from; i <= h.length - text.length; i++) {
      let ok = true;
      for (let j = 0; j < text.length; j++) {
        if (h[i + j] !== text.charCodeAt(j)) {
          ok = false;
          break;
        }
      }
      if (ok) return i;
    }
    return -1;
  }

  function readCStr(bytes, off, max = 120) {
    let s = "";
    for (let i = 0; i < max && off + i < bytes.length; i++) {
      const c = bytes[off + i];
      if (c === 0) break;
      if (c < 32 || c > 126) return null;
      s += String.fromCharCode(c);
    }
    return s;
  }

  function clampRange(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
  }

  function clampCourt01(x, y) {
    return { x: clampRange(x, 0, 1), y: clampRange(y, 0, 1) };
  }

  function float64ToBytes(n) {
    const buf = new ArrayBuffer(8);
    new DataView(buf).setFloat64(0, n, false);
    return new Uint8Array(buf);
  }

  const FD_ET_BYTES = float64ToBytes(FD_ET);
  const FD_GO_BYTES = float64ToBytes(FD_GO);

  /** iCoach We() — FastDraw units → court01 with margin, inset, and clamp */
  function mapPoint(x, y, courtType = "half") {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return { x: 0.5, y: 0.5 };

    const marginX = clampRange(MAP_HORIZ_MARGIN, 0, 0.25);
    const drawableW = Math.max(0.001, 1 - marginX * 2);

    if (courtType === "full") {
      const vertOff = clampRange(MAP_VERT_OFFSET_FULL, -0.2, 0.2);
      const topInset = clampRange(MAP_FULL_TOP_INSET, 0, 0.25);
      const bottomInset = clampRange(MAP_FULL_BOTTOM_INSET, 0, 0.25);
      const drawableH = Math.max(0.001, 1 - topInset - bottomInset);
      const stretch = clampRange(MAP_FULL_HORIZ_STRETCH, -0.2, 0.25);
      const s = FD_ET - y;
      const p = 0.5 + (s / FD_ET - 0.5) * (1 + 2 * stretch);
      const normX = marginX + p * drawableW;
      const normY = topInset + (x / FD_AN) * drawableH + vertOff;
      return clampCourt01(normX, normY);
    }

    const vertOff = clampRange(MAP_VERT_OFFSET_HALF, -0.2, 0.2);
    const normX = marginX + (x / FD_AN) * drawableW;
    const normY = (y / FD_VT) + vertOff;
    return clampCourt01(normX, normY);
  }

  function inferCourtTypeFromBinary(bytes, start = 0, end) {
    const h = bytesLike(bytes);
    const lim = end == null ? h.length : end;
    for (let i = start; i <= lim - FD_ET_BYTES.length; i++) {
      let matchEt = true;
      for (let j = 0; j < FD_ET_BYTES.length; j++) {
        if (h[i + j] !== FD_ET_BYTES[j]) { matchEt = false; break; }
      }
      if (matchEt) return "full";
      let matchGo = true;
      for (let j = 0; j < FD_GO_BYTES.length; j++) {
        if (h[i + j] !== FD_GO_BYTES[j]) { matchGo = false; break; }
      }
      if (matchGo) return "full";
    }
    return null;
  }

  function isValidCourtCoord(x, y) {
    return Number.isFinite(x) && Number.isFinite(y) &&
      Math.abs(x) <= 120 && Math.abs(y) <= 120 &&
      (Math.abs(x) > 0.05 || Math.abs(y) > 0.05);
  }

  function inferCourtType(bytes, payloadStart, payloadEnd, events, dataView) {
    const headerCourt = inferCourtTypeFromDiagramHeader(bytes, payloadStart, dataView);
    const binaryCourt = inferCourtTypeFromBinary(bytes, payloadStart, payloadEnd);
    const eventsCourt = inferCourtTypeFromEvents(events);
    if (binaryCourt === "full" || headerCourt === "full") return "full";
    if (eventsCourt === "full") return "full";
    if (headerCourt === "half" || eventsCourt === "half") return "half";
    return headerCourt || binaryCourt || eventsCourt || "half";
  }

  function inferCourtTypeFromEvents(events) {
    let maxX = 0;
    let maxY = 0;
    let minX = Infinity;
    for (const ev of events) {
      if (ev.kind === "player") {
        maxX = Math.max(maxX, ev.x);
        maxY = Math.max(maxY, ev.y);
        minX = Math.min(minX, ev.x);
      } else if (ev.kind === "line") {
        if (ev.points?.length) {
          ev.points.forEach((p) => {
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
            minX = Math.min(minX, p.x);
          });
        } else {
          maxX = Math.max(maxX, ev.x1, ev.x2);
          maxY = Math.max(maxY, ev.y1, ev.y2);
          minX = Math.min(minX, ev.x1, ev.x2);
        }
      }
    }
    if (maxY > FD_VT * 1.35) return "full";
    if (maxX > FD_ET * 0.92 || maxY > FD_GO * 0.85) return "full";
    if (maxX > FD_AN * 1.05 && minX < FD_AN * 0.15) return "full";
    return "half";
  }

  function inferCourtTypeFromDiagramHeader(bytes, payloadStart, dataView) {
    if (!payloadStart || payloadStart + 24 >= bytes.length) return null;
    const attempts = [
      { wOff: payloadStart + 6, hOff: payloadStart + 14 },
      { wOff: payloadStart + 8, hOff: payloadStart + 16 }
    ];
    for (const { wOff, hOff } of attempts) {
      let courtW = readDoubleBE(bytes, wOff, dataView);
      let courtH = readDoubleBE(bytes, hOff, dataView);
      if (!Number.isFinite(courtW) || !Number.isFinite(courtH) || courtW <= 0 || courtH <= 0) {
        courtW = readDoubleLE(bytes, wOff, dataView);
        courtH = readDoubleLE(bytes, hOff, dataView);
      }
      if (!Number.isFinite(courtW) || !Number.isFinite(courtH) || courtW <= 0 || courtH <= 0) continue;
      if (courtW >= FD_ET * 0.85 && courtH >= FD_AN * 0.85) return "full";
      if (courtW >= FD_AN * 0.75 && courtW <= FD_AR * 1.05
        && courtH >= FD_VT * 0.75 && courtH <= FD_DR * 1.05) return "half";
    }
    return null;
  }

  function mergePlayerEvents(primary, alt) {
    if (!alt.length) return primary;
    const used = new Set(primary.map((e) => e.off));
    const out = primary.slice();
    for (const ev of alt) {
      if ([...used].some((off) => Math.abs(off - ev.off) < 12)) continue;
      used.add(ev.off);
      out.push(ev);
    }
    return out;
  }

  function tryParseDefensePlayer(bytes, i, dataView) {
    if (bytes[i + 9] === 0x78 && bytes[i + 10] >= 0x31 && bytes[i + 10] <= 0x39) {
      const coords = tryReadCoordPair(bytes, i + 11, dataView);
      if (coords) {
        return {
          num: String.fromCharCode(bytes[i + 10]),
          x: coords.x,
          y: coords.y,
          stride: 19
        };
      }
    }

    if (bytes[i + 9] >= 0x31 && bytes[i + 9] <= 0x39) {
      const coords = tryReadCoordPair(bytes, i + 10, dataView);
      if (coords) {
        return {
          num: String.fromCharCode(bytes[i + 9]),
          x: coords.x,
          y: coords.y,
          stride: 18
        };
      }
    }

    for (const xOff of [9, 10, 11, 12, 15]) {
      const coords = tryReadCoordPair(bytes, i + xOff, dataView);
      if (!coords) continue;
      return { num: "X", x: coords.x, y: coords.y, stride: xOff + 16 };
    }

    for (const m of [
      { labelOff: 9, coordOff: 10, numOff: 10 },
      { labelOff: 10, coordOff: 11, numOff: 9 },
      { labelOff: 9, coordOff: 11, numOff: 10 }
    ]) {
      const label = bytes[i + m.labelOff];
      if (label !== 0x58 && label !== 0x78) continue;
      const coords = tryReadCoordPair(bytes, i + m.coordOff, dataView);
      if (!coords) continue;
      const numCh = bytes[i + m.numOff];
      const num = (numCh >= 0x31 && numCh <= 0x39) ? String.fromCharCode(numCh) : "X";
      return { num, x: coords.x, y: coords.y, stride: m.coordOff + 16 };
    }

    return null;
  }

  function readLegacyBallHint(bytes, i) {
    for (const off of [26, 27, 24, 25, 28, 29, 30, 31]) {
      if (bytes[i + off] === 0x01) return true;
    }
    return false;
  }

  function scanAltPlayerEvents(bytes, payloadStart, payloadEnd, dataView) {
    const events = [];
    for (let i = payloadStart; i < payloadEnd - 20; i++) {
      if (bytes[i] !== 0x00 || bytes[i + 1] !== 0x01) continue;
      const label = bytes[i + 2];
      const tag = bytes[i + 3];
      if (tag !== 0x40 && tag !== 0x00 && tag !== 0x01) continue;
      const isDigit = label >= 0x31 && label <= 0x39;
      const isDefenseLabel = label === 0x58 || label === 0x78;
      if (!isDigit && !isDefenseLabel) continue;
      const coords = tryReadCoordPair(bytes, i + 4, dataView);
      if (!coords) continue;
      events.push({
        kind: "player",
        off: i,
        num: isDigit ? String.fromCharCode(label) : "X",
        x: coords.x,
        y: coords.y,
        isDefense: isDefenseLabel
      });
      i += 18;
    }
    return events;
  }

  function scanPlayerEventsLegacy(bytes, payloadStart, payloadEnd, dataView) {
    const events = [];
    for (let i = payloadStart; i < payloadEnd - 20; i++) {
      if (bytes[i] !== 0x01 || bytes[i + 1] !== 0xff) continue;
      const role = bytes[i + 8];

      if (role === 0x01) {
        const numCode = bytes[i + 9];
        if (numCode < 0x31 || numCode > 0x39) continue;
        const coords = tryReadCoordPair(bytes, i + 10, dataView);
        if (!coords) continue;
        events.push({
          kind: "player",
          off: i,
          num: String.fromCharCode(numCode),
          x: coords.x,
          y: coords.y,
          isDefense: false,
          hasBallHint: readLegacyBallHint(bytes, i)
        });
        i += 18;
        continue;
      }

      if (role === 0x02) {
        const parsed = tryParseDefensePlayer(bytes, i, dataView);
        if (!parsed) continue;
        events.push({
          kind: "player",
          off: i,
          num: parsed.num,
          x: parsed.x,
          y: parsed.y,
          isDefense: true
        });
        i += parsed.stride;
        continue;
      }
    }
    return mergePlayerEvents(events, scanAltPlayerEvents(bytes, payloadStart, payloadEnd, dataView));
  }

  function rgbFromBytes(r, g, b) {
    const h = (n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");
    return `#${h(r)}${h(g)}${h(b)}`;
  }

  function tryReadLegacyLineColor(bytes, offset, markerByte) {
    if (offset < 0 || offset >= bytes.length) return null;
    const o = offset - 7;
    if (o >= 0 && bytes[o] === 0 && bytes[o + 1] === 1 && bytes[o + 6] === 0 && bytes[offset] === markerByte) {
      return rgbFromBytes(bytes[o + 3], bytes[o + 4], bytes[o + 5]);
    }
    if (offset >= 6) {
      const t = offset - 6;
      if (bytes[t] === 0 && bytes[t + 1] === 1) {
        return rgbFromBytes(bytes[t + 3], bytes[t + 4], bytes[t + 5]);
      }
    }
    if (offset >= 7) {
      const t = offset - 7;
      if (bytes[t] === 0 && bytes[t + 1] === 1 && bytes[offset - 1] === 0) {
        return rgbFromBytes(bytes[offset - 4], bytes[offset - 3], bytes[offset - 2]);
      }
    }
    return null;
  }

  function tryParseLineEvent(bytes, i, dataView) {
    if (bytes[i] !== 0x01 || bytes[i + 1] !== 0xff) return null;
    for (const typeOff of [6, 5, 7, 8]) {
      const typeByte = bytes[i + typeOff];
      const typeCode = resolveLineTypeCode(typeByte);
      if (!typeCode) continue;
      const coordOff = i + typeOff + 1;
      const start = tryReadCoordPair(bytes, coordOff, dataView);
      const end = tryReadCoordPair(bytes, coordOff + 16, dataView)
        || tryReadCoordPair(bytes, coordOff + 8, dataView);
      if (!start || !end) continue;
      const color = tryReadLegacyLineColor(bytes, i + typeOff, typeByte)
        || tryReadLegacyLineColor(bytes, i + typeOff + 1, bytes[i + typeOff + 1])
        || "#000000";
      return { kind: "line", off: i, typeCode, x1: start.x, y1: start.y, x2: end.x, y2: end.y, color };
    }
    return null;
  }

  function mergeLegacyPlayerMetadata(icbPlayers, legacyPlayers, proximity = 22) {
    if (!legacyPlayers.length) return icbPlayers;
    const used = new Set(icbPlayers.map((p) => p.off));
    for (const leg of legacyPlayers) {
      const match = icbPlayers.find((p) =>
        Math.abs(p.off - leg.off) < proximity && !!p.isDefense === !!leg.isDefense
      );
      if (match) {
        if (leg.hasBallHint && !match.isDefense) match.hasBallHint = true;
        continue;
      }
      if ([...used].some((off) => Math.abs(off - leg.off) < proximity)) continue;
      used.add(leg.off);
      icbPlayers.push(leg);
    }
    icbPlayers.sort((a, b) => a.off - b.off);
    return icbPlayers;
  }

  function scanPlayerEvents(bytes, payloadStart, payloadEnd, dataView) {
    let icb = [];
    if (typeof FastDrawIcbScan !== "undefined") {
      icb = FastDrawIcbScan.scanPlayers(bytes, payloadStart, payloadEnd, dataView);
    }
    const legacy = scanPlayerEventsLegacy(bytes, payloadStart, payloadEnd, dataView);
    if (!icb.length) return legacy;
    return mergeLegacyPlayerMetadata(icb, legacy);
  }

  function scanLineEventsLegacy(bytes, payloadStart, payloadEnd, dataView) {
    const events = [];
    const seen = new Set();
    for (let i = payloadStart; i < payloadEnd - 32; i++) {
      const parsed = tryParseLineEvent(bytes, i, dataView);
      if (!parsed || seen.has(parsed.off)) continue;
      seen.add(parsed.off);
      events.push(parsed);
      i += 24;
    }
    return events;
  }

  function mergeLegacyLineEvents(icbLines, legacyLines, proximity = 22) {
    if (!legacyLines.length) return icbLines;
    const used = new Set(icbLines.map((l) => l.off));
    for (const leg of legacyLines) {
      if (icbLines.some((l) => Math.abs(l.off - leg.off) < proximity)) continue;
      if ([...used].some((off) => Math.abs(off - leg.off) < proximity)) continue;
      used.add(leg.off);
      icbLines.push(leg);
    }
    icbLines.sort((a, b) => a.off - b.off);
    return icbLines;
  }

  function scanLineEvents(bytes, payloadStart, payloadEnd, dataView, playerEvents) {
    let icb = [];
    if (typeof FastDrawIcbScan !== "undefined") {
      icb = FastDrawIcbScan.scanLines(bytes, payloadStart, payloadEnd, dataView, playerEvents);
    }
    const legacy = scanLineEventsLegacy(bytes, payloadStart, payloadEnd, dataView);
    if (!icb.length) return legacy;
    return mergeLegacyLineEvents(icb, legacy);
  }

  function scanHandoffEvents(bytes, payloadStart, payloadEnd, dataView) {
    if (typeof FastDrawIcbScan !== "undefined" && FastDrawIcbScan.scanHandoffIcons) {
      return FastDrawIcbScan.scanHandoffIcons(bytes, payloadStart, payloadEnd, dataView);
    }
    if (typeof globalThis !== "undefined" && globalThis.FastDrawIcbScan?.scanHandoffIcons) {
      return globalThis.FastDrawIcbScan.scanHandoffIcons(bytes, payloadStart, payloadEnd, dataView);
    }
    return [];
  }

  const HANDOFF_PLAYER_MATCH_MAX = 0.16;

  function handoffIconsToActions(icons, mappedPlayers, courtType) {
    const offense = (mappedPlayers || []).filter((p) => !p.isDefense);
    if (!offense.length || !icons.length) return [];
    const actions = [];
    icons.forEach((icon) => {
      const pt = mapPoint(icon.x, icon.y, courtType);
      let best1 = null;
      let best1d = HANDOFF_PLAYER_MATCH_MAX;
      offense.forEach((p) => {
        const d = Math.hypot(p.x - pt.x, p.y - pt.y);
        if (d < best1d) { best1d = d; best1 = p; }
      });
      if (!best1) return;

      let best2 = null;
      let best2d = HANDOFF_PLAYER_MATCH_MAX;
      offense.forEach((p) => {
        if (p.number === best1.number) return;
        const d = Math.hypot(p.x - pt.x, p.y - pt.y);
        if (d < best2d) { best2d = d; best2 = p; }
      });

      const sx = best1.x;
      const sy = best1.y;
      let ex = pt.x;
      let ey = pt.y;
      if (best2) {
        ex = best2.x;
        ey = best2.y;
      }
      actions.push({
        type: "handoff",
        isHandoff: true,
        handoffControls: {
          _startX: sx,
          _startY: sy,
          _endX: ex,
          _endY: ey,
          _midX: (sx + ex) / 2,
          _midY: (sy + ey) / 2,
          _startPlayerNumber: best1.number,
          _endPlayerNumber: best2?.number || null
        },
        children: []
      });
    });
    return actions;
  }

  function icbTypeToAction(fdType, hasBarMarker) {
    let t = fdType;
    if (t === "straight" && hasBarMarker) t = "bar";
    if (t === "straight") return "cut";
    if (t === "dashed") return "pass";
    if (t === "zigzag") return "dribble";
    if (t === "bar") return "screen";
    if (t === "handoff") return "handoff";
    return "cut";
  }

  function polylineControlPoints(mapped) {
    if (mapped.length === 3) {
      return { midX: mapped[1].x, midY: mapped[1].y };
    }
    if (mapped.length === 4) {
      return {
        midX: mapped[1].x, midY: mapped[1].y,
        c1X: mapped[2].x, c1Y: mapped[2].y
      };
    }
    if (mapped.length === 5) {
      return {
        midX: mapped[1].x, midY: mapped[1].y,
        c1X: mapped[2].x, c1Y: mapped[2].y,
        c2X: mapped[3].x, c2Y: mapped[3].y
      };
    }
    if (mapped.length > 3) {
      const inner = mapped.slice(1, -1);
      const midX = inner.reduce((s, p) => s + p.x, 0) / inner.length;
      const midY = inner.reduce((s, p) => s + p.y, 0) / inner.length;
      return { midX, midY };
    }
    const sx = mapped[0].x;
    const sy = mapped[0].y;
    const ex = mapped[mapped.length - 1].x;
    const ey = mapped[mapped.length - 1].y;
    return { midX: (sx + ex) / 2, midY: (sy + ey) / 2 };
  }

  function emptyFrame() {
    return {
      players: [], arrows: [], actions: [], texts: [], zones: [], cones: [], flags: [], shadows: [],
      notes: "", thumbnail: ""
    };
  }

  const COURT01_FIT_PAD = 0.04;
  const COURT01_FIT_MIN = COURT01_FIT_PAD;
  const COURT01_FIT_MAX = 1 - COURT01_FIT_PAD;

  function collectFrameNormPoints(frame) {
    const pts = [];
    const add = (x, y) => {
      if (Number.isFinite(x) && Number.isFinite(y)) pts.push({ x, y });
    };
    (frame.players || []).forEach((p) => add(p.x, p.y));
    (frame.arrows || []).forEach((a) => {
      (a.points || []).forEach((v, i) => {
        if (i % 2 === 0) add(v, a.points[i + 1]);
      });
      add(a._startX, a._startY);
      add(a._endX, a._endY);
      add(a._midX, a._midY);
      add(a._c1X, a._c1Y);
      add(a._c2X, a._c2Y);
    });
    (frame.actions || []).forEach((act) => {
      const hc = act.handoffControls;
      if (hc) {
        add(hc._startX, hc._startY);
        add(hc._endX, hc._endY);
        add(hc._midX, hc._midY);
      }
      (act.children || []).forEach((ch) => {
        (ch.points || []).forEach((v, i) => {
          if (i % 2 === 0) add(v, ch.points[i + 1]);
        });
      });
    });
    (frame.texts || []).forEach((t) => add(t.x, t.y));
    (frame.cones || []).forEach((c) => add(c.x, c.y));
    (frame.flags || []).forEach((f) => add(f.x, f.y));
    (frame.shadows || []).forEach((s) => add(s.x, s.y));
    (frame.zones || []).forEach((z) => {
      (z.points || []).forEach((v, i) => {
        if (i % 2 === 0) add(v, z.points[i + 1]);
      });
      add(z.x, z.y);
    });
    return pts;
  }

  function frameNeedsCourt01Fit(frame) {
    const pts = collectFrameNormPoints(frame);
    if (!pts.length) return false;
    return pts.some((p) => p.x < -0.02 || p.x > 1.02 || p.y < -0.02 || p.y > 1.02);
  }

  function mapNormPointInFrame(frame, x, y, tx, ty) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    return { x: tx(x), y: ty(y) };
  }

  function fitFrameCoordsToCourt01(frame) {
    if (!frame || !frameNeedsCourt01Fit(frame)) return false;
    const pts = collectFrameNormPoints(frame);
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    pts.forEach((p) => {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    });
    const spanX = Math.max(maxX - minX, 0.001);
    const spanY = Math.max(maxY - minY, 0.001);
    const scale = Math.min(
      (COURT01_FIT_MAX - COURT01_FIT_MIN) / spanX,
      (COURT01_FIT_MAX - COURT01_FIT_MIN) / spanY
    );
    const tx = (x) => COURT01_FIT_MIN + (x - minX) * scale;
    const ty = (y) => COURT01_FIT_MIN + (y - minY) * scale;

    (frame.players || []).forEach((p) => {
      const mapped = mapNormPointInFrame(frame, p.x, p.y, tx, ty);
      if (mapped) {
        p.x = mapped.x;
        p.y = mapped.y;
      }
    });

    (frame.arrows || []).forEach((a) => {
      if (a.points) {
        for (let i = 0; i < a.points.length; i += 2) {
          const mapped = mapNormPointInFrame(frame, a.points[i], a.points[i + 1], tx, ty);
          if (mapped) {
            a.points[i] = mapped.x;
            a.points[i + 1] = mapped.y;
          }
        }
      }
      const metaPairs = [
        ["_startX", "_startY"],
        ["_endX", "_endY"],
        ["_midX", "_midY"],
        ["_c1X", "_c1Y"],
        ["_c2X", "_c2Y"]
      ];
      metaPairs.forEach(([xKey, yKey]) => {
        if (a[xKey] == null) return;
        const mapped = mapNormPointInFrame(frame, a[xKey], a[yKey], tx, ty);
        if (mapped) {
          a[xKey] = mapped.x;
          a[yKey] = mapped.y;
        }
      });
    });

    (frame.actions || []).forEach((act) => {
      const hc = act.handoffControls;
      if (hc) {
        const pairs = [
          ["_startX", "_startY"],
          ["_endX", "_endY"],
          ["_midX", "_midY"]
        ];
        pairs.forEach(([xKey, yKey]) => {
          const mapped = mapNormPointInFrame(frame, hc[xKey], hc[yKey], tx, ty);
          if (mapped) {
            hc[xKey] = mapped.x;
            hc[yKey] = mapped.y;
          }
        });
      }
      (act.children || []).forEach((ch) => {
        if (!ch.points) return;
        for (let i = 0; i < ch.points.length; i += 2) {
          const mapped = mapNormPointInFrame(frame, ch.points[i], ch.points[i + 1], tx, ty);
          if (mapped) {
            ch.points[i] = mapped.x;
            ch.points[i + 1] = mapped.y;
          }
        }
      });
    });

    (frame.texts || []).forEach((t) => {
      const mapped = mapNormPointInFrame(frame, t.x, t.y, tx, ty);
      if (mapped) {
        t.x = mapped.x;
        t.y = mapped.y;
      }
    });

    (frame.cones || []).forEach((c) => {
      const mapped = mapNormPointInFrame(frame, c.x, c.y, tx, ty);
      if (mapped) {
        c.x = mapped.x;
        c.y = mapped.y;
      }
    });

    (frame.flags || []).forEach((f) => {
      const mapped = mapNormPointInFrame(frame, f.x, f.y, tx, ty);
      if (mapped) {
        f.x = mapped.x;
        f.y = mapped.y;
      }
    });

    (frame.shadows || []).forEach((s) => {
      const mapped = mapNormPointInFrame(frame, s.x, s.y, tx, ty);
      if (mapped) {
        s.x = mapped.x;
        s.y = mapped.y;
      }
    });

    (frame.zones || []).forEach((z) => {
      if (z.points) {
        for (let i = 0; i < z.points.length; i += 2) {
          const mapped = mapNormPointInFrame(frame, z.points[i], z.points[i + 1], tx, ty);
          if (mapped) {
            z.points[i] = mapped.x;
            z.points[i + 1] = mapped.y;
          }
        }
      }
      const mapped = mapNormPointInFrame(frame, z.x, z.y, tx, ty);
      if (mapped) {
        z.x = mapped.x;
        z.y = mapped.y;
      }
    });

    return true;
  }

  function fitPlayCoordsToCourt01(play) {
    if (!play?.state?.frames?.length) return 0;
    let fitted = 0;
    play.state.frames.forEach((frame) => {
      if (fitFrameCoordsToCourt01(frame)) fitted++;
    });
    return fitted;
  }

  function makePlay(name, meta = {}) {
    const cleanName = decodeHtmlEntities(name || "").trim();
    return {
      id: "play_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      name: cleanName || "Imported Play",
      team: meta.team || "No Team",
      category: meta.category || "",
      season: meta.season || "Default",
      courtType: meta.courtType || "half",
      importCoordSpace: "court01",
      state: { frames: [emptyFrame()] }
    };
  }

  function findPlayRecords(bytes) {
    const records = [];
    for (let i = 0; i < bytes.length - 80; i++) {
      if (bytes[i] !== 0x24) continue;
      const u1 = readCStr(bytes, i, 40);
      if (!u1 || !/^\$[0-9a-f-]{36}$/i.test(u1)) continue;

      let nameEnd = i - 1;
      while (nameEnd > 0 && bytes[nameEnd] === 0) nameEnd--;
      let nameStart = nameEnd;
      while (nameStart > 0 && bytes[nameStart - 1] >= 32 && bytes[nameStart - 1] <= 126) nameStart--;
      const name = String.fromCharCode(...bytes.subarray(nameStart, nameEnd + 1)).trim();
      if (name.length < 3 || !/[A-Za-zΑ-Ωα-ω]/.test(name)) continue;

      let j = i + u1.length + 1;
      if (bytes[j] !== 0x24) continue;
      const u2 = readCStr(bytes, j, 40);
      if (!u2 || !/^\$[0-9a-f-]{36}$/i.test(u2)) continue;

      records.push({
        name,
        nameStart,
        metaStart: j + u2.length + 1
      });
    }
    records.sort((a, b) => a.nameStart - b.nameStart);
    return records;
  }

  function findDiagramOffsets(bytes) {
    const marker = "FastDraw iPad Pro";
    const out = [];
    let idx = 0;
    while ((idx = indexOfString(bytes, marker, idx)) !== -1) {
      const base = idx + marker.length + 1;
      const vlen = bytes[base] || 0;
      out.push({
        idx,
        payloadStart: base + 1 + vlen + 1
      });
      idx += 1;
    }
    return out;
  }

  function linkRecordsToDiagrams(records, diagrams, fileLength) {
    return records.map((rec, i) => {
      const nextStart = records[i + 1]?.nameStart ?? fileLength;
      const diagram = diagrams.find((d) => d.idx > rec.metaStart && d.idx < nextStart);
      return { ...rec, diagram };
    });
  }

  function decodeHtmlEntities(value) {
    let text = String(value || "");
    for (let pass = 0; pass < 3; pass++) {
      text = text.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, entity) => {
        const token = entity.toLowerCase();
        if (token === "amp") return "&";
        if (token === "lt") return "<";
        if (token === "gt") return ">";
        if (token === "quot") return "\"";
        if (token === "apos") return "'";
        if (token.startsWith("#x")) return String.fromCharCode(parseInt(token.slice(2), 16));
        if (token.startsWith("#")) return String.fromCharCode(parseInt(token.slice(1), 10));
        return _;
      });
    }
    return text;
  }

  function stripFastDrawNoteMarkup(html) {
    return String(html || "")
      .replace(/<\/?(html|head|body)[^>]*>/gi, "")
      .replace(/\sstyle="[^"]*"/gi, (attr) => {
        const color = attr.match(/color\s*:\s*(#[0-9a-f]{3,8}|rgb\([^)]+\)|[a-z]+)/i);
        return color ? ` style="color:${color[1]}"` : "";
      })
      .replace(/\sstyle='[^']*'/gi, "")
      .replace(/<span([^>]*)><span([^>]*)>/gi, "<span$1><span$2>")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeFastDrawNotesHtml(html) {
    if (!html) return "";
    let raw = decodeHtmlEntities(html);
    const bodyMatch = raw.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    raw = bodyMatch ? bodyMatch[1] : raw.replace(/<\/?html[^>]*>/gi, "");
    raw = stripFastDrawNoteMarkup(raw);
    raw = raw
      .replace(/>\s+\./g, ">")
      .replace(/\.\s+</g, "<")
      .replace(/(<br\s*\/?>\s*){2,}/gi, "<br>")
      .trim();
    if (!raw) return "";
    if (!/<[a-z]/i.test(raw)) return `<p>${raw}</p>`;
    return raw;
  }

  function extractHtmlNotesInRange(bytes, start, end) {
    const notes = [];
    let pos = start;
    while (pos < end - 12) {
      const open = indexOfString(bytes, "<html>", pos);
      if (open === -1 || open >= end) break;
      const close = indexOfString(bytes, "</html>", open);
      if (close === -1 || close >= end) break;
      const chunk = bytesLike(bytes).subarray(open, close + 7);
      const html = new TextDecoder("latin1").decode(chunk);
      const normalized = normalizeFastDrawNotesHtml(html);
      if (normalized) notes.push(normalized);
      pos = close + 7;
    }
    return notes;
  }

  function assignNotesToFrames(frames, noteHtmlList) {
    if (!frames.length || !noteHtmlList?.length) return 0;
    const cleaned = noteHtmlList.map(normalizeFastDrawNotesHtml).filter(Boolean);
    if (!cleaned.length) return 0;

    if (cleaned.length === 1) {
      frames[0].notes = cleaned[0];
      return 1;
    }

    let assigned = 0;
    for (let i = 0; i < frames.length && i < cleaned.length; i++) {
      frames[i].notes = cleaned[i];
      assigned++;
    }

    if (cleaned.length > frames.length) {
      const tail = cleaned.slice(frames.length).join("<br>");
      const last = frames[frames.length - 1];
      last.notes = last.notes ? `${last.notes}<br>${tail}` : tail;
      assigned += cleaned.length - frames.length;
    }
    return assigned;
  }

  function scorePlayContent(play) {
    const frames = play.state?.frames || [];
    let score = 0;
    frames.forEach((frame) => {
      const pc = frame.players?.length || 0;
      const lc = (frame.arrows?.length || 0) + (frame.actions?.length || 0);
      const dc = (frame.players || []).filter((p) => p.isDefense).length;
      score += pc * 3 + lc * 2 + dc * 4;
      if (pc || lc) score += 5;
    });
    return score;
  }

  function dedupeObviousDuplicatePlays(plays) {
    const groups = new Map();
    plays.forEach((play) => {
      const key = String(play.name || "").trim().toLowerCase();
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(play);
    });

    const out = [];
    let mergedDuplicates = 0;
    groups.forEach((group) => {
      if (group.length === 1) {
        out.push(group[0]);
        return;
      }
      if (group.length === 2) {
        group.sort((a, b) => scorePlayContent(b) - scorePlayContent(a));
        out.push(group[0]);
        mergedDuplicates += 1;
        return;
      }
      out.push(...group);
    });
    return { plays: out, mergedDuplicates };
  }

  function inferBallPossession(frames, ballHintNums = []) {
    if (!frames.length) return;

    function setBall(frame, player) {
      frame.players.forEach((p) => { p.hasBall = false; });
      if (player && !player.isDefense) player.hasBall = true;
    }

    function nearestOffense(frame, x, y, maxDist = 0.15) {
      let best = null;
      let bestD = maxDist;
      frame.players.filter((p) => !p.isDefense).forEach((p) => {
        const d = Math.hypot(p.x - x, p.y - y);
        if (d < bestD) {
          bestD = d;
          best = p;
        }
      });
      return best;
    }

    function findOffenseByNumber(frame, num) {
      if (!num) return null;
      return frame.players.find((p) => !p.isDefense && p.number === num) || null;
    }

    function resolvePassReceiver(prev, curr, arrow) {
      const endX = arrow._endX ?? arrow.points[arrow.points.length - 2];
      const endY = arrow._endY ?? arrow.points[arrow.points.length - 1];
      return nearestOffense(curr, endX, endY);
    }

    function defaultOffenseHolder(frame) {
      return findOffenseByNumber(frame, "1")
        || frame.players.find((p) => !p.isDefense)
        || null;
    }

    function applyWithinFrameBallHints(frame) {
      const passes = (frame.arrows || []).filter((a) => a.actionType === "pass" || a.actionType === "handoff");
      if (passes.length) {
        const lastPass = passes[passes.length - 1];
        const receiver = nearestOffense(
          frame,
          lastPass._endX ?? lastPass.points[lastPass.points.length - 2],
          lastPass._endY ?? lastPass.points[lastPass.points.length - 1],
          0.2
        );
        if (receiver) {
          setBall(frame, receiver);
          return true;
        }
      }
      const dribble = (frame.arrows || []).find((a) => a.actionType === "dribble");
      if (dribble) {
        const mover = nearestOffense(frame, dribble.points[0], dribble.points[1], 0.18)
          || nearestOffense(
            frame,
            dribble._endX ?? dribble.points[dribble.points.length - 2],
            dribble._endY ?? dribble.points[dribble.points.length - 1],
            0.18
          );
        if (mover) {
          setBall(frame, mover);
          return true;
        }
      }
      return false;
    }

    const firstOffense = frames[0].players.filter((p) => !p.isDefense);
    let opener = firstOffense.find((p) => p.number === "1") || firstOffense[0];
    const hinted = ballHintNums.length
      ? firstOffense.find((p) => ballHintNums.includes(p.number))
      : null;
    if (hinted) opener = hinted;

    const firstPass = (frames[0].arrows || []).find((a) => a.actionType === "pass");
    if (firstPass && !hinted) {
      opener = nearestOffense(frames[0], firstPass.points[0], firstPass.points[1], 0.18) || opener;
    }
    const firstDribble = (frames[0].arrows || []).find((a) => a.actionType === "dribble");
    if (firstDribble && !hinted && !firstPass) {
      opener = nearestOffense(frames[0], firstDribble.points[0], firstDribble.points[1], 0.18) || opener;
    }
    setBall(frames[0], opener);

    for (let fi = 0; fi < frames.length; fi++) {
      const curr = frames[fi];
      curr.players.forEach((p) => { p.hasBall = false; });

      const frameHints = curr._ballHintNums || [];
      if (frameHints.length) {
        for (const num of frameHints) {
          const hintedPlayer = findOffenseByNumber(curr, num);
          if (hintedPlayer) {
            setBall(curr, hintedPlayer);
            break;
          }
        }
        if (curr.players.some((p) => p.hasBall && !p.isDefense)) continue;
      }

      if (fi === 0) {
        setBall(curr, opener);
        continue;
      }

      const prev = frames[fi - 1];
      const prevHolder = prev.players.find((p) => p.hasBall && !p.isDefense);
      let nextHolder = null;

      (prev.arrows || []).forEach((arrow) => {
        if (arrow.actionType === "pass" || arrow.actionType === "handoff") {
          const receiver = resolvePassReceiver(prev, curr, arrow);
          if (receiver) nextHolder = receiver;
        } else if (arrow.actionType === "dribble") {
          const mover = nearestOffense(prev, arrow.points[0], arrow.points[1], 0.14);
          if (mover) nextHolder = findOffenseByNumber(curr, mover.number) || nextHolder;
        }
      });

      (prev.actions || []).forEach((act) => {
        if (act.type !== "handoff" && !act.isHandoff) return;
        const hc = act.handoffControls || {};
        let receiver = null;
        if (hc._endPlayerNumber) receiver = findOffenseByNumber(curr, hc._endPlayerNumber);
        if (!receiver && hc._endX != null) receiver = nearestOffense(curr, hc._endX, hc._endY);
        if (receiver) nextHolder = receiver;
      });

      if (!nextHolder && prevHolder) {
        nextHolder = findOffenseByNumber(curr, prevHolder.number);
      }

      if (nextHolder) setBall(curr, nextHolder);
      else if (prevHolder) {
        const carried = findOffenseByNumber(curr, prevHolder.number);
        if (carried) setBall(curr, carried);
      }

      if (!curr.players.some((p) => p.hasBall && !p.isDefense)) {
        if (!applyWithinFrameBallHints(curr)) {
          const carried = prevHolder ? findOffenseByNumber(curr, prevHolder.number) : null;
          setBall(curr, carried || defaultOffenseHolder(curr));
        }
      }
    }
  }

  function buildScreenBarPointsNorm(sx, sy, ex, ey, halfNorm = 0.022) {
    const dx = ex - sx;
    const dy = ey - sy;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -(dy / len);
    const ny = dx / len;
    return [
      ex - nx * halfNorm, ey - ny * halfNorm,
      ex + nx * halfNorm, ey + ny * halfNorm
    ];
  }

  function createScreenActionFromArrow(arrow) {
    const pts = arrow.points || [];
    if (pts.length < 4) return null;
    const stroke = arrow.stroke || DEFAULT_STROKE.screen;
    const strokeWidth = arrow.strokeWidth || 4;
    return {
      type: "group",
      isScreen: true,
      children: [
        {
          class: "Line",
          points: pts.slice(),
          stroke,
          strokeWidth,
          dash: arrow.dash || null,
          tension: arrow.tension ?? PASS_CUT_CURVE_TENSION
        },
        {
          class: "Line",
          points: buildScreenBarPointsNorm(pts[0], pts[1], pts[pts.length - 2], pts[pts.length - 1]),
          stroke,
          strokeWidth,
          dash: null,
          tension: 0
        }
      ]
    };
  }

  const PASS_CUT_CURVE_TENSION = 0.35;

  function lineEventToFrameEntries(line, courtType) {
    if (line.fdType && line.points?.length >= 2) {
      const mapped = line.points.map((p) => mapPoint(p.x, p.y, courtType));
      const flat = mapped.flatMap((p) => [p.x, p.y]);
      const sx = flat[0];
      const sy = flat[1];
      const ex = flat[flat.length - 2];
      const ey = flat[flat.length - 1];
      const actionType = icbTypeToAction(line.fdType, line.hasBarMarker);
      const ctrl = polylineControlPoints(mapped);
      const stroke = line.color || "#000000";
      const arrow = {
        points: flat,
        stroke,
        strokeWidth: 4,
        dash: actionType === "pass" ? [10, 5] : null,
        tension: actionType === "pass" || actionType === "cut" || actionType === "curl" ? PASS_CUT_CURVE_TENSION : 0,
        actionType,
        _startX: sx,
        _startY: sy,
        _endX: ex,
        _endY: ey,
        _midX: ctrl.midX,
        _midY: ctrl.midY,
        _lateralOffset: 0
      };
      if (ctrl.c1X != null) {
        arrow._c1X = ctrl.c1X;
        arrow._c1Y = ctrl.c1Y;
        arrow._c2X = ctrl.c2X;
        arrow._c2Y = ctrl.c2Y;
      }
      if (actionType === "screen") {
        const screenAction = createScreenActionFromArrow(arrow);
        return screenAction ? [{ type: "action", value: screenAction }] : [];
      }
      return [{ type: "arrow", value: arrow }];
    }

    const actionType = LINE_ACTION_MAP[line.typeCode] || "cut";
    const start = mapPoint(line.x1, line.y1, courtType);
    const end = mapPoint(line.x2, line.y2, courtType);
    const arrow = {
      points: [start.x, start.y, end.x, end.y],
      stroke: line.color || "#000000",
      strokeWidth: 4,
      dash: actionType === "pass" ? [10, 5] : null,
      tension: actionType === "pass" || actionType === "cut" || actionType === "curl" ? PASS_CUT_CURVE_TENSION : 0,
      actionType,
      _startX: start.x,
      _startY: start.y,
      _endX: end.x,
      _endY: end.y,
      _midX: (start.x + end.x) / 2,
      _midY: (start.y + end.y) / 2,
      _lateralOffset: 0
    };
    if (actionType === "screen") {
      const screenAction = createScreenActionFromArrow(arrow);
      return screenAction ? [{ type: "action", value: screenAction }] : [];
    }
    return [{ type: "arrow", value: arrow }];
  }

  function applyMiscScanToFrame(frame, misc, courtType) {
    (misc.texts || []).forEach((t) => {
      const pt = mapPoint(t.x, t.y, courtType);
      frame.texts.push({
        x: pt.x,
        y: pt.y,
        text: t.text,
        fill: "#111827"
      });
    });
    (misc.cones || []).forEach((c) => {
      const pt = mapPoint(c.x, c.y, courtType);
      frame.cones.push({ x: pt.x, y: pt.y });
    });
    (misc.flags || []).forEach((f) => {
      const pt = mapPoint(f.x, f.y, courtType);
      frame.flags.push({ x: pt.x, y: pt.y });
    });
    (misc.zones || []).forEach((z) => {
      const p1 = mapPoint(z.x1, z.y1, courtType);
      const p2 = mapPoint(z.x2, z.y1, courtType);
      const p3 = mapPoint(z.x2, z.y2, courtType);
      const p4 = mapPoint(z.x1, z.y2, courtType);
      frame.zones.push({
        type: "line",
        zoneType: "shade",
        points: [p1.x, p1.y, p2.x, p2.y, p3.x, p3.y, p4.x, p4.y],
        x: 0,
        y: 0
      });
    });
    (misc.shadows || []).forEach((s) => {
      const pt = mapPoint(s.x, s.y, courtType);
      frame.shadows.push({
        x: pt.x,
        y: pt.y,
        type: s.shadowType || "rect",
        scaleX: s.scaleX || 1,
        scaleY: s.scaleY || 1
      });
    });
  }

  function buildFrameFromScan(framePlayers, frameLines, frameHandoffs, courtType, misc = {}) {
    const frame = emptyFrame();
    frame.players = framePlayers.map((p, pi) => {
      const pt = mapPoint(p.x, p.y, courtType);
      const hinted = !!(p.hasBallHint && !p.isDefense);
      return {
        id: "p_" + p.off + "_" + pi,
        x: pt.x,
        y: pt.y,
        number: p.num,
        isDefense: !!p.isDefense,
        hasBall: hinted,
        label: ""
      };
    });
    frame._ballHintNums = framePlayers
      .filter((p) => p.hasBallHint && !p.isDefense)
      .map((p) => p.num);
    applyMiscScanToFrame(frame, misc, courtType);
    frame.arrows = [];
    frame.actions = handoffIconsToActions(frameHandoffs, frame.players, courtType);
    frameLines.forEach((line) => {
      lineEventToFrameEntries(line, courtType).forEach((entry) => {
        if (entry.type === "action") frame.actions.push(entry.value);
        else frame.arrows.push(entry.value);
      });
    });
    fitFrameCoordsToCourt01(frame);
    return frame;
  }

  function countLegacyFrameSplits(playerEvents) {
    const sorted = playerEvents.slice().sort((a, b) => a.off - b.off);
    let splits = 0;
    let hasOffense = false;
    for (const ev of sorted) {
      if (ev.kind && ev.kind !== "player") continue;
      if (!ev.isDefense && ev.num === "1" && hasOffense) splits++;
      if (!ev.isDefense) hasOffense = true;
    }
    return splits + (hasOffense ? 1 : 0);
  }

  function scanMiscObjects(bytes, payloadStart, payloadEnd, dataView) {
    const scan = (typeof FastDrawIcbScan !== "undefined" && FastDrawIcbScan)
      || (typeof globalThis !== "undefined" && globalThis.FastDrawIcbScan)
      || null;
    if (!scan) return { texts: [], cones: [], flags: [], zones: [], shadows: [] };
    return {
      texts: scan.scanCourtTextLabels?.(bytes, payloadStart, payloadEnd, dataView) || [],
      cones: scan.scanCones?.(bytes, payloadStart, payloadEnd, dataView) || [],
      flags: scan.scanFlags?.(bytes, payloadStart, payloadEnd, dataView) || [],
      zones: scan.scanZoneShades?.(bytes, payloadStart, payloadEnd, dataView) || [],
      shadows: scan.scanShadowRects?.(bytes, payloadStart, payloadEnd, dataView) || []
    };
  }

  function filterMiscForRange(misc, start, end) {
    return {
      texts: (misc.texts || []).filter((t) => t.off >= start && t.off < end),
      cones: (misc.cones || []).filter((c) => c.off >= start && c.off < end),
      flags: (misc.flags || []).filter((f) => f.off >= start && f.off < end),
      zones: (misc.zones || []).filter((z) => z.off >= start && z.off < end),
      shadows: (misc.shadows || []).filter((s) => s.off >= start && s.off < end)
    };
  }

  function buildFramesLegacySplit(playerEvents, lineEvents, handoffEvents, courtType, misc = { texts: [], cones: [], flags: [], zones: [], shadows: [] }) {
    const frames = [];
    let ballHintNums = [];
    let currentLines = [];
    let currentPlayers = [];
    let currentHandoffs = [];
    let miscAssigned = false;
    function flushFrameLegacy() {
      if (!currentPlayers.length && !currentLines.length && !currentHandoffs.length) return;
      const frameMisc = miscAssigned
        ? { texts: [], cones: [], flags: [], zones: [], shadows: [] }
        : {
          texts: misc.texts || [],
          cones: misc.cones || [],
          flags: misc.flags || [],
          zones: misc.zones || [],
          shadows: misc.shadows || []
        };
      miscAssigned = true;
      const frame = buildFrameFromScan(currentPlayers, currentLines, currentHandoffs, courtType, frameMisc);
      if (frame._ballHintNums?.length) {
        ballHintNums = ballHintNums.concat(frame._ballHintNums);
      }
      frames.push(frame);
      currentLines = [];
      currentPlayers = [];
      currentHandoffs = [];
    }
    const events = playerEvents.concat(lineEvents).slice().sort((a, b) => a.off - b.off);
    for (const ev of events) {
      if (ev.kind === "line") {
        currentLines.push(ev);
        continue;
      }
      if (!ev.isDefense && ev.num === "1" && currentPlayers.some((p) => !p.isDefense)) flushFrameLegacy();
      currentPlayers.push(ev);
    }
    currentHandoffs = handoffEvents.slice();
    flushFrameLegacy();
    return { frames, ballHintNums };
  }

  function parseDiagramBlock(bytes, payloadStart, payloadEnd) {
    const dataView = typeof DataView !== "undefined" ? new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength) : null;
    const playerEvents = scanPlayerEvents(bytes, payloadStart, payloadEnd, dataView);
    const lineEvents = scanLineEvents(bytes, payloadStart, payloadEnd, dataView, playerEvents);
    const handoffEvents = scanHandoffEvents(bytes, payloadStart, payloadEnd, dataView);
    const allEvents = playerEvents.concat(lineEvents);
    const miscAll = scanMiscObjects(bytes, payloadStart, payloadEnd, dataView);
    const courtType = inferCourtType(bytes, payloadStart, payloadEnd, allEvents, dataView);

    let frameRanges = [];
    if (typeof FastDrawIcbCo !== "undefined" && FastDrawIcbCo.findFrameRanges) {
      frameRanges = FastDrawIcbCo.findFrameRanges(bytes, payloadStart, payloadEnd);
    } else if (typeof globalThis !== "undefined" && globalThis.FastDrawIcbCo?.findFrameRanges) {
      frameRanges = globalThis.FastDrawIcbCo.findFrameRanges(bytes, payloadStart, payloadEnd);
    }
    if (!frameRanges.length) {
      frameRanges = [{ start: payloadStart, end: payloadEnd }];
    }

    const frames = [];
    let ballHintNums = [];

    if (frameRanges.length >= 1) {
      for (const range of frameRanges) {
        const framePlayers = playerEvents.filter((p) => p.off >= range.start && p.off < range.end);
        const frameLines = lineEvents.filter((l) => l.off >= range.start && l.off < range.end);
        const frameHandoffs = handoffEvents.filter((h) => h.off >= range.start && h.off < range.end);
        const frameMisc = filterMiscForRange(miscAll, range.start, range.end);
        if (!framePlayers.length && !frameLines.length && !frameHandoffs.length
          && !frameMisc.texts.length && !frameMisc.cones.length && !frameMisc.flags.length
          && !frameMisc.zones.length) continue;
        const frame = buildFrameFromScan(framePlayers, frameLines, frameHandoffs, courtType, frameMisc);
        if (frame._ballHintNums?.length) {
          ballHintNums = ballHintNums.concat(frame._ballHintNums);
        }
        frames.push(frame);
      }
    }

    if (!frames.length) {
      let currentLines = [];
      let currentPlayers = [];
      let currentHandoffs = [];
      function flushFrameLegacy() {
        if (!currentPlayers.length && !currentLines.length && !currentHandoffs.length) return;
        const maxOff = Math.max(
          0,
          ...currentPlayers.map((p) => p.off),
          ...currentLines.map((l) => l.off),
          ...currentHandoffs.map((h) => h.off)
        );
        const frameMisc = filterMiscForRange(miscAll, payloadStart, maxOff + 1);
        const frame = buildFrameFromScan(currentPlayers, currentLines, currentHandoffs, courtType, frameMisc);
        if (frame._ballHintNums?.length) {
          ballHintNums = ballHintNums.concat(frame._ballHintNums);
        }
        frames.push(frame);
        currentLines = [];
        currentPlayers = [];
        currentHandoffs = [];
      }
      const events = allEvents.slice().sort((a, b) => a.off - b.off);
      for (const ev of events) {
        if (ev.kind === "line") {
          currentLines.push(ev);
          continue;
        }
        if (!ev.isDefense && ev.num === "1" && currentPlayers.some((p) => !p.isDefense)) flushFrameLegacy();
        currentPlayers.push(ev);
      }
      currentHandoffs = handoffEvents.slice();
      flushFrameLegacy();
    } else if (frames.length === 1 && countLegacyFrameSplits(playerEvents) > 1) {
      const legacy = buildFramesLegacySplit(playerEvents, lineEvents, handoffEvents, courtType, miscAll);
      frames.length = 0;
      ballHintNums = legacy.ballHintNums;
      legacy.frames.forEach((frame) => frames.push(frame));
    }

    if (!frames.length) return { frames: [emptyFrame()], courtType: courtType || "half" };
    if (!ballHintNums.length && frames.some((f) => f._ballHintNums?.length)) {
      ballHintNums = frames.flatMap((f) => f._ballHintNums || []);
    }
    inferBallPossession(frames, ballHintNums);
    frames.forEach((frame) => { delete frame._ballHintNums; });
    return { frames, courtType };
  }

  function indexNativeFile(bytes) {
    const buf = bytesLike(bytes);
    const records = findPlayRecords(buf);
    const diagrams = findDiagramOffsets(buf);
    const linked = linkRecordsToDiagrams(records, diagrams, buf.length);
    let candidateOrdinal = 0;
    const entries = [];
    for (const rec of linked) {
      if (!rec.diagram) continue;
      candidateOrdinal++;
      entries.push({ name: rec.name, candidateOrdinal });
    }
    return {
      entries,
      totalDiagramCandidates: entries.length,
      recordCount: records.length,
      diagramCount: diagrams.length
    };
  }

  function decodeNativeCandidate(bytes, candidateOrdinal, options = {}) {
    const targetOrdinal = Number(candidateOrdinal) || 0;
    if (targetOrdinal < 1) return null;
    const buf = bytesLike(bytes);
    const records = findPlayRecords(buf);
    const diagrams = findDiagramOffsets(buf);
    const linked = linkRecordsToDiagrams(records, diagrams, buf.length);
    let ordinal = 0;

    for (const rec of linked) {
      if (!rec.diagram) continue;
      ordinal++;
      if (ordinal !== targetOrdinal) continue;

      const diagramIndex = diagrams.findIndex((d) => d.idx === rec.diagram.idx);
      const nextDiagramIdx = diagrams[diagramIndex + 1]?.idx ?? buf.length;
      const noteHtmlList = extractHtmlNotesInRange(buf, rec.diagram.idx, nextDiagramIdx);
      const frames = parseDiagramBlock(buf, rec.diagram.payloadStart, nextDiagramIdx);
      const hasContent = frames.frames.some((f) =>
        f.players.length || f.arrows.length || f.texts?.length || f.cones?.length || f.zones?.length
        || (f.actions || []).some((a) => a.isHandoff || a.isScreen)
      );
      if (!hasContent && !options.allowEmpty) return null;

      assignNotesToFrames(frames.frames, noteHtmlList);
      const play = makePlay(rec.name, { courtType: frames.courtType });
      play.state = { frames: frames.frames };
      play.state.frames.forEach((frame) => { delete frame._ballHintNums; });
      return play;
    }
    return null;
  }

  function decodeNativeFile(bytes, options = {}) {
    const buf = bytesLike(bytes);
    const maxPlays = options.maxPlays || 1000;
    const skipCandidates = options.skipCandidates || 0;
    const records = findPlayRecords(buf);
    const diagrams = findDiagramOffsets(buf);
    const linked = linkRecordsToDiagrams(records, diagrams, buf.length);
    const totalDiagramCandidates = linked.filter((r) => r.diagram).length;

    function normalizePlayNameKey(name) {
      return String(name || "").trim().toLowerCase().replace(/\s+/g, " ");
    }

    function diagramBlockHasContent(block) {
      return block.frames.some((f) =>
        f.players.length || f.arrows.length || f.texts?.length || f.cones?.length || f.flags?.length
        || f.zones?.length || f.shadows?.length
        || (f.actions || []).some((a) => a.isHandoff || a.isScreen)
      );
    }

    function decodeLinkedDiagram(rec) {
      const diagramIndex = diagrams.findIndex((d) => d.idx === rec.diagram.idx);
      const nextDiagramIdx = diagrams[diagramIndex + 1]?.idx ?? buf.length;
      const noteHtmlList = extractHtmlNotesInRange(buf, rec.diagram.idx, nextDiagramIdx);
      const frames = parseDiagramBlock(buf, rec.diagram.payloadStart, nextDiagramIdx);
      return {
        frames,
        noteHtmlList,
        hasContent: diagramBlockHasContent(frames)
      };
    }

    const plays = [];
    const warnings = [];
    let decodedDiagrams = 0;
    let notesImported = 0;
    let defensePlayers = 0;
    let fullCourtPlays = 0;
    let screenActions = 0;
    let handoffActions = 0;
    let courtTextLabels = 0;
    let conesImported = 0;
    let flagsImported = 0;
    let zonesImported = 0;
    let shadowsImported = 0;
    let skippedCap = 0;
    let emptySkipped = 0;
    let candidateOrdinal = 0;
    let nextBatchSkip = skipCandidates;
    let hasMoreBatches = false;
    const skippedNames = [];

    let alternateRecovered = 0;

    for (let li = 0; li < linked.length; li++) {
      const rec = linked[li];
      if (!rec.diagram) continue;
      candidateOrdinal++;
      if (candidateOrdinal <= skipCandidates) continue;

      if (plays.length >= maxPlays) {
        skippedCap++;
        if (rec.name && skippedNames.length < 100) skippedNames.push(rec.name);
        nextBatchSkip = candidateOrdinal - 1;
        hasMoreBatches = nextBatchSkip < totalDiagramCandidates;
        break;
      }

      let decodeResult = decodeLinkedDiagram(rec);
      if (!decodeResult.hasContent) {
        const nameKey = normalizePlayNameKey(rec.name);
        for (let j = li + 1; j < linked.length && j <= li + 6; j++) {
          const alt = linked[j];
          if (!alt?.diagram) continue;
          const altKey = normalizePlayNameKey(alt.name);
          if (nameKey && altKey && altKey !== nameKey) break;
          const altResult = decodeLinkedDiagram(alt);
          if (altResult.hasContent) {
            decodeResult = altResult;
            alternateRecovered++;
            break;
          }
        }
      }
      if (!decodeResult.hasContent) {
        emptySkipped++;
        nextBatchSkip = candidateOrdinal;
        continue;
      }

      notesImported += assignNotesToFrames(decodeResult.frames.frames, decodeResult.noteHtmlList);

      const play = makePlay(rec.name, { courtType: decodeResult.frames.courtType });
      play.state = { frames: decodeResult.frames.frames };
      play.state.frames.forEach((f) => {
        f.players.forEach((p) => { if (p.isDefense) defensePlayers++; });
        screenActions += (f.actions || []).filter((a) => a.isScreen).length;
        handoffActions += (f.actions || []).filter((a) => a.isHandoff).length;
        courtTextLabels += (f.texts || []).length;
        conesImported += (f.cones || []).length;
        flagsImported += (f.flags || []).length;
        zonesImported += (f.zones || []).length;
        shadowsImported += (f.shadows || []).length;
      });
      if (play.courtType === "full") fullCourtPlays++;
      plays.push(play);
      decodedDiagrams++;
      nextBatchSkip = candidateOrdinal;
    }

    if (!hasMoreBatches) {
      hasMoreBatches = nextBatchSkip < totalDiagramCandidates;
    }

    const deduped = dedupeObviousDuplicatePlays(plays);
    const finalPlays = deduped.plays;
    const playsWithDefense = finalPlays.filter((play) =>
      (play.state?.frames || []).some((frame) => (frame.players || []).some((p) => p.isDefense))
    ).length;

    if (!finalPlays.length) {
      warnings.push("No diagram blocks could be decoded from this FastDraw native .fdb file.");
    } else {
      warnings.push(
        `Decoded ${decodedDiagrams} play diagram(s). Notes on ${notesImported} frame(s). ` +
        `Defense (X): ${defensePlayers} player(s). Full court: ${fullCourtPlays}. ` +
        `Screens as groups: ${screenActions}. Handoffs: ${handoffActions}. ` +
        `Court text: ${courtTextLabels}. Cones: ${conesImported}. Flags: ${flagsImported}. ` +
        `Zones: ${zonesImported}. Shadows: ${shadowsImported}. ` +
        `iCoach-compatible line/player/handoff scan enabled.`
      );
      if (deduped.mergedDuplicates > 0) {
        warnings.push(`Merged ${deduped.mergedDuplicates} duplicate play name pair(s) — kept richest diagram.`);
      }
      if (emptySkipped > 0) {
        warnings.push(`${emptySkipped} empty diagram block(s) were skipped during decode.`);
      }
      if (alternateRecovered > 0) {
        warnings.push(`Recovered ${alternateRecovered} play(s) from alternate diagram blocks with the same name.`);
      }
      if (skippedCap > 0) {
        warnings.push(`${skippedCap} play(s) with diagrams were skipped (import cap: ${maxPlays}).`);
      }
      if (nextBatchSkip < totalDiagramCandidates) {
        warnings.push(
          `${totalDiagramCandidates - nextBatchSkip} diagram(s) remain — import the next batch after merge.`
        );
      }
    }

    return {
      version: "fastcourt_v1",
      source: "fastdraw_native",
      exportedAt: new Date().toISOString(),
      customTeams: ["No Team", "First Team", "Juniors"],
      customCategories: [],
      customSeasons: ["Default"],
      playData: {
        sections: [{
          id: "fastdraw_" + Date.now(),
          name: options.playbookName || "FastDraw Import",
          plays: finalPlays
        }]
      },
      warnings,
      stats: {
        records: records.length,
        diagrams: diagrams.length,
        linked: linked.filter((r) => r.diagram).length,
        decoded: decodedDiagrams,
        importedPlays: finalPlays.length,
        mergedDuplicates: deduped.mergedDuplicates,
        playsWithDefense,
        notesImported,
        defensePlayers,
        fullCourtPlays,
        screenActions,
        handoffActions,
        courtTextLabels,
        conesImported,
        flagsImported,
        zonesImported,
        shadowsImported,
        maxPlays,
        skippedCap,
        skippedNames,
        emptySkipped,
        alternateRecovered,
        decodeCandidates: totalDiagramCandidates,
        totalDiagramCandidates,
        skipCandidates,
        nextBatchSkip,
        batchImported: finalPlays.length,
        batchIndex: options.batchIndex || (skipCandidates > 0 ? 2 : 1),
        hasMoreBatches,
        remainingCandidates: Math.max(0, totalDiagramCandidates - nextBatchSkip)
      }
    };
  }

  return {
    decodeNativeFile,
    indexNativeFile,
    decodeNativeCandidate,
    parseDiagramBlock,
    findPlayRecords,
    findDiagramOffsets,
    extractHtmlNotesInRange,
    assignNotesToFrames,
    normalizeFastDrawNotesHtml,
    inferCourtType,
    inferCourtTypeFromDiagramHeader,
    inferCourtTypeFromEvents,
    inferCourtTypeFromBinary,
    resolveLineTypeCode,
    scanPlayerEvents,
    scanLineEvents,
    scanAltPlayerEvents,
    mapPoint,
    fitFrameCoordsToCourt01,
    fitPlayCoordsToCourt01
  };
})();

if (typeof globalThis !== "undefined") {
  globalThis.FastDrawDecode = FastDrawDecode;
}

if (typeof module !== "undefined") {
  module.exports = FastDrawDecode;
}
