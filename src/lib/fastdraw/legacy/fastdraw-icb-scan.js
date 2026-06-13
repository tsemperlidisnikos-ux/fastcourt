/**
 * iCoachBasketball-compatible FastDraw binary scan (So players + Br lines).
 * Ported from MigrationFastDraw production bundle.
 */
const FastDrawIcbScan = (function () {
  const AN = 49.21259689331055;
  const VT = 45.931758880615234;
  const ET = VT * 2;
  const GO = ET + 10;
  const AR = AN + 10;
  const DR = VT + 10;

  const BAR_MARKER = new Uint8Array([1, 255, 255, 255, 255]);
  const ZIGZAG_END = new Uint8Array([0, 1, 255, 255, 0, 0, 0, 111]);
  const STYLE_STYLE_BYTES = new Set([111, 101, 155, 116, 157, 113, 112, 117, 156, 114, 158, 118]);
  const STYLE_BYTE_TYPES = new Map([
    [111, "straight"], [101, "straight"], [155, "straight"], [116, "straight"],
    [157, "dashed"], [113, "dashed"],
    [112, "zigzag"], [117, "zigzag"], [156, "zigzag"],
    [114, "bar"], [158, "bar"], [118, "bar"]
  ]);

  const SENTINEL_DEFS = [
    { bytes: [191, 0, 1], name: "bf" },
    { bytes: [0, 191, 0, 1], name: "bf" },
    { bytes: [0, 191, 0, 2], name: "bf" },
    { bytes: [0, 194, 0, 1], name: "c2" },
    { bytes: [0, 194, 0, 2], name: "c2" },
    { bytes: [0, 193, 0, 1], name: "c1" },
    { bytes: [0, 193, 0, 2], name: "c1" },
    { bytes: [0, 192, 0, 1], name: "c0" },
    { bytes: [0, 192, 0, 2], name: "c0" },
    { bytes: [194, 0, 1], name: "c2" },
    { bytes: [194, 0, 2], name: "c2" },
    { bytes: [193, 0, 1], name: "c1" },
    { bytes: [193, 0, 2], name: "c1" },
    { bytes: [192, 0, 1], name: "c0" },
    { bytes: [192, 0, 2], name: "c0" }
  ];
  const SENTINEL_COLOR_BYTE = { bf: 191, c0: 192, c1: 193, c2: 194 };

  function bytesLike(b) {
    return b instanceof Uint8Array ? b : new Uint8Array(b);
  }

  function U(dv, off) {
    return dv.getFloat64(off, false);
  }

  function findAllPatterns(haystack, pattern, start, end) {
    const h = bytesLike(haystack);
    const n = bytesLike(pattern);
    const out = [];
    const lim = end == null ? h.length : end;
    for (let i = start; i <= lim - n.length; i++) {
      let ok = true;
      for (let j = 0; j < n.length; j++) {
        if (h[i + j] !== n[j]) { ok = false; break; }
      }
      if (ok) out.push(i);
    }
    return out;
  }

  function readColor(bytes, offset, markerByte) {
    if (offset < 0 || offset >= bytes.length) return null;
    const o = offset - 7;
    if (o >= 0 && bytes[o] === 0 && bytes[o + 1] === 1 && bytes[o + 6] === 0 && bytes[offset] === markerByte) {
      return rgb(bytes[o + 3], bytes[o + 4], bytes[o + 5]);
    }
    if (offset >= 6) {
      const t = offset - 6;
      if (bytes[t] === 0 && bytes[t + 1] === 1) {
        return rgb(bytes[t + 3], bytes[t + 4], bytes[t + 5]);
      }
    }
    if (offset >= 7) {
      const t = offset - 7;
      if (bytes[t] === 0 && bytes[t + 1] === 1 && bytes[offset - 1] === 0) {
        return rgb(bytes[offset - 4], bytes[offset - 3], bytes[offset - 2]);
      }
    }
    return null;
  }

  function rgb(r, g, b) {
    const h = (n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");
    return `#${h(r)}${h(g)}${h(b)}`;
  }

  function strictPoint(x, y) {
    return Number.isFinite(x) && Number.isFinite(y)
      && x > -10 && x < 70 && y > -10 && y < 130
      && !(x < 0.2 && y < 0.2);
  }

  function loosePoint(x, y) {
    return Number.isFinite(x) && Number.isFinite(y)
      && x > -30 && x < 90 && y > -30 && y < 150;
  }

  function edgeGhost(x, y) {
    const vert = Math.abs(x - 0) <= 0.06 && (Math.abs(y - AN) <= 0.06 || Math.abs(y - AR) <= 0.06);
    const horiz = Math.abs(y - 0) <= 0.06
      && (Math.abs(x - VT) <= 0.06 || Math.abs(x - ET) <= 0.06 || Math.abs(x - DR) <= 0.06 || Math.abs(x - GO) <= 0.06);
    return vert || horiz;
  }

  function parseLabel(label) {
    const t = String(label || "").trim();
    if (/^x$/i.test(t)) return { num: "X", isDefense: true, isCoach: false };
    const xm = /^x(\d+)$/i.exec(t);
    if (xm) return { num: xm[1], isDefense: true, isCoach: false };
    if (/^c$/i.test(t)) return { num: "C", isDefense: false, isCoach: true };
    if (/^\d+$/.test(t)) return { num: t, isDefense: false, isCoach: false };
    return null;
  }

  function scanPlayers(bytes, payloadStart, payloadEnd, dataView) {
    const o = bytesLike(bytes);
    const out = [];
    for (let r = payloadStart; r + 4 + 16 <= payloadEnd; r++) {
      if (o[r] !== 1 || o[r + 1] !== 64 || o[r + 2] !== 0) continue;
      const labelLen = o[r + 3];
      if (labelLen < 1 || labelLen > 12) continue;
      const labelStart = r + 4;
      const coordStart = labelStart + labelLen;
      if (coordStart + 16 > payloadEnd) continue;
      let label = "";
      let ok = true;
      for (let v = 0; v < labelLen; v++) {
        const c = o[labelStart + v];
        if (c < 32 || c > 126) { ok = false; break; }
        label += String.fromCharCode(c);
      }
      if (!ok || !label.trim()) continue;
      const parsed = parseLabel(label);
      if (!parsed || parsed.isCoach) continue;
      const x = U(dataView, coordStart);
      const y = U(dataView, coordStart + 8);
      if (!strictPoint(x, y)) continue;
      out.push({
        kind: "player",
        off: r,
        num: parsed.num,
        x,
        y,
        isDefense: parsed.isDefense,
        hasBallHint: r >= payloadStart + 2 && o[r - 2] === 1 && o[r - 1] === 0
      });
      r = coordStart + 15;
    }
    out.sort((a, b) => a.off - b.off);
    return out;
  }

  function inferTailType(tailBytes, pointCount) {
    const b = bytesLike(tailBytes);
    if (!b.length) return "straight";
    if (b.length >= 8 && b[0] === 0 && b[1] === 1 && b[2] === 255 && b[3] === 255
      && b[4] === 0 && b[5] === 0 && b[6] === 0 && b[7] === 111) {
      return pointCount >= 3 ? "zigzag" : "bar";
    }
    if (b.length >= 2 && b[0] === 0 && b[1] === 3) return "straight";
    if (b.length >= 4 && b[0] === 64 && b[1] === 0 && b[2] === 1 && b[3] === 50) {
      return pointCount === 2 ? "dashed" : "straight";
    }
    const m = b[0];
    if (m === 111 || m === 112 || m === 114) return "bar";
    if (m === 157) return "straight";
    if (m === 158 && pointCount === 2) return "bar";
    return "straight";
  }

  function hasBarMarkerInTail(tailBytes) {
    return findAllPatterns(tailBytes, BAR_MARKER, 0, tailBytes.length).length > 0;
  }

  function readHandoffIconsInTail(tailBytes, tailAbsStart, dataView) {
    const tail = bytesLike(tailBytes);
    const icons = [];
    for (let hy = 0; hy + 1 + 8 + 16 <= tail.length; hy++) {
      if (tail[hy] !== 171) continue;
      let ok = true;
      for (let c = 1; c <= 8; c++) {
        if (tail[hy + c] !== 0) { ok = false; break; }
      }
      if (!ok) continue;
      const hx = U(dataView, tailAbsStart + hy + 9);
      const hy2 = U(dataView, tailAbsStart + hy + 17);
      if (!Number.isFinite(hx) || !Number.isFinite(hy2)) continue;
      if (hx < -10 || hx > 70 || hy2 < -10 || hy2 > 130) continue;
      icons.push({ x: hx, y: hy2, off: tailAbsStart + hy });
    }
    return icons;
  }

  function scanHandoffIcons(bytes, payloadStart, payloadEnd, dataView) {
    const o = bytesLike(bytes);
    const raw = [];
    for (let l = payloadStart; l + 1 + 8 + 16 <= payloadEnd; l++) {
      if (o[l] !== 171) continue;
      let ok = true;
      for (let c = 1; c <= 8; c++) {
        if (o[l + c] !== 0) { ok = false; break; }
      }
      if (!ok) continue;
      const x = U(dataView, l + 9);
      const y = U(dataView, l + 17);
      if (!strictPoint(x, y)) continue;
      raw.push({ kind: "handoff", off: l, x, y, color: "#000000" });
    }
    const seen = new Set();
    const out = [];
    for (const item of raw) {
      if (seen.has(item.off)) continue;
      seen.add(item.off);
      out.push(item);
    }
    out.sort((a, b) => a.off - b.off);
    return out;
  }

  function isPlayerLabelAt(bytes, pos) {
    for (let m = 1; m <= 12; m++) {
      const d = pos - (4 + m);
      if (d < 0 || bytes[d] !== 1 || bytes[d + 1] !== 64 || bytes[d + 2] !== 0 || bytes[d + 3] !== m) continue;
      let ok = true;
      for (let i = 0; i < m; i++) {
        const c = bytes[d + 4 + i];
        if (c < 32 || c > 126) { ok = false; break; }
      }
      if (ok) return true;
    }
    return false;
  }

  function scanLines(bytes, payloadStart, payloadEnd, dataView, players) {
    const o = bytesLike(bytes);
    const lines = [];
    const playerPts = (players || []).map((p) => ({ x: p.x, y: p.y }));

    function nearPlayer(x, y, radius) {
      const r2 = radius * radius;
      for (const p of playerPts) {
        const dx = p.x - x;
        const dy = p.y - y;
        if (dx * dx + dy * dy <= r2) return true;
      }
      return !playerPts.length;
    }

    function pushLine(entry) {
      if (entry.isHandoffOnlyBlock) return;
      lines.push({
        kind: "line",
        off: entry.offset,
        fdType: entry.type,
        points: entry.points,
        color: entry.color || "#000000",
        hasBarMarker: !!entry.hasBarMarker,
        geometry: entry.geometry || "straight"
      });
    }

    // --- Sentinel pass (Br part 1) ---
    const hits = [];
    for (const def of SENTINEL_DEFS) {
      for (const offset of findAllPatterns(o, def.bytes, payloadStart, payloadEnd)) {
        hits.push({ offset, sentinel: def.name, len: def.bytes.length });
      }
    }
    const byOff = new Map();
    for (const hit of hits) {
      const prev = byOff.get(hit.offset);
      if (!prev || hit.len > prev.len) byOff.set(hit.offset, hit);
    }
    const sentinels = Array.from(byOff.values()).sort((a, b) => a.offset - b.offset);

    for (let u = 0; u < sentinels.length; u++) {
      const { offset: f, sentinel: g, len: v } = sentinels[u];
      const regionEnd = u + 1 < sentinels.length ? sentinels[u + 1].offset : payloadEnd;
      let z = f + v;
      const pts = [];
      if (z + 16 > regionEnd) continue;
      const w = U(dataView, z);
      const iy = U(dataView, z + 8);
      if (!strictPoint(w, iy)) continue;
      pts.push({ x: w, y: iy });
      z += 16;
      while (z < regionEnd) {
        if (z < regionEnd && [0, 1, 2, 3].includes(o[z])) { z += 1; continue; }
        if (z + 16 > regionEnd) break;
        const px = U(dataView, z);
        const py = U(dataView, z + 8);
        if (!strictPoint(px, py)) break;
        if (pts.length >= 2 && Math.abs(px - 2) < 0.05 && Math.abs(py) < 1e-6) break;
        pts.push({ x: px, y: py });
        z += 16;
        if (pts.length > 20) break;
      }
      if (pts.length < 2) continue;
      const tail = o.subarray(z, regionEnd);
      const handoffIconsFd = readHandoffIconsInTail(tail, z, dataView);
      const hasBar = hasBarMarkerInTail(tail);
      let type = g === "c2" ? "zigzag" : g === "c0" ? "dashed" : g === "c1" ? "bar" : "straight";
      if (type === "straight" && hasBar) type = "bar";
      const marker = SENTINEL_COLOR_BYTE[g];
      const color = readColor(o, f, marker) || readColor(o, f + 1, marker) || "#000000";
      pushLine({
        offset: f,
        points: pts,
        type,
        color,
        hasBarMarker: hasBar,
        geometry: pts.length >= 3 ? "polyline" : "straight",
        isHandoffOnlyBlock: g === "c0" && handoffIconsFd.length > 0 && tail.length <= 48,
        handoffIconsFd
      });
    }

    // --- Style-byte pass (Br part 2) ---
    const isCoordLead = (pos) => pos + 16 <= o.length && (o[pos] === 63 || o[pos] === 64 || o[pos] === 191 || o[pos] === 192)
      && (o[pos + 8] === 63 || o[pos + 8] === 64 || o[pos + 8] === 191 || o[pos + 8] === 192);
    const isChainLead = (pos) => pos + 16 <= o.length && (o[pos] === 63 || o[pos] === 64 || o[pos] === 191 || o[pos] === 192)
      && (o[pos + 8] === 63 || o[pos + 8] === 64 || o[pos + 8] === 191 || o[pos + 8] === 192);

    function matchesZigEnd(pos) {
      return pos + ZIGZAG_END.length <= o.length && ZIGZAG_END.every((b, i) => o[pos + i] === b);
    }

    function walkChain(startPos) {
      const pts = [];
      let pos = startPos;
      let endPos = startPos;
      const styleHint = startPos >= 2 && o[startPos - 2] === 0 && STYLE_STYLE_BYTES.has(o[startPos - 1]);

      if (!isCoordLead(pos)) return null;
      let x = U(dataView, pos);
      let y = U(dataView, pos + 8);
      if (!strictPoint(x, y) || edgeGhost(x, y)) return null;
      pts.push({ x, y });
      pos += 16;

      while (pos + 16 <= payloadEnd) {
        if (matchesZigEnd(pos)) { endPos = pos; break; }
        const b = o[pos];
        if ([0, 1, 2, 3].includes(b)) { pos += 1; continue; }
        if (b === 0 && pos + 1 < o.length) {
          const nxt = o[pos + 1];
          const chain = nxt === 63 || nxt === 64 || nxt === 191 || nxt === 192;
          if (!chain && !(nxt === 0 || nxt === 1 || nxt === 2 || nxt === 3)) {
            if (pts.length >= 2 && isCoordLead(pos + 2)) { endPos = pos; break; }
            pos += 2;
          } else if (!chain) { endPos = pos; break; }
        } else if (!(b === 63 || b === 64 || b === 191 || b === 192)) {
          endPos = pos;
          break;
        }
        if (pos + 16 > payloadEnd || isPlayerLabelAt(o, pos)) break;
        if (!isChainLead(pos)) { endPos = pos; break; }
        x = U(dataView, pos);
        y = U(dataView, pos + 8);
        if (!loosePoint(x, y) || edgeGhost(x, y)) { endPos = pos; break; }
        const last = pts[pts.length - 1];
        const dist2 = (x - last.x) ** 2 + (y - last.y) ** 2;
        if (dist2 > 60 * 60 && !(pts.length === 1 && styleHint && dist2 <= 160 * 160)) {
          endPos = pos;
          break;
        }
        pts.push({ x, y });
        pos += 16;
        if (pts.length > 60) { endPos = pos; break; }
      }

      while (pts.length >= 2) {
        const last = pts[pts.length - 1];
        if (strictPoint(last.x, last.y)) break;
        pts.pop();
      }
      if (pts.length < 2) return null;
      const tail = o.subarray(endPos, Math.min(payloadEnd, endPos + 80));
      return {
        points: pts,
        endPos: pos,
        tailBytes: tail,
        isNearPlayers: nearPlayer(pts[0].x, pts[0].y, 10) || nearPlayer(pts[pts.length - 1].x, pts[pts.length - 1].y, 10)
      };
    }

    function readStyle(pos, tailBytes, pointCount) {
      if (pos < payloadStart + 2) return null;
      const styleByte = o[pos - 1];
      if (o[pos - 2] !== 0 || styleByte < 96) return null;
      const mapped = STYLE_BYTE_TYPES.get(styleByte);
      if (mapped) return mapped;
      return inferTailType(tailBytes, pointCount);
    }

    function duplicateLine(existing, start, end) {
      return existing.some((line) => {
        const a = line.points[0];
        const b = line.points[line.points.length - 1];
        const d1 = (start.x - a.x) ** 2 + (start.y - a.y) ** 2;
        const d2 = (end.x - b.x) ** 2 + (end.y - b.y) ** 2;
        return d1 < 0.25 && d2 < 0.25;
      });
    }

    let yPos = payloadStart;
    while (yPos + 16 <= payloadEnd) {
      if (isPlayerLabelAt(o, yPos)) { yPos += 1; continue; }
      if (!isCoordLead(yPos)) { yPos += 1; continue; }
      const sx = U(dataView, yPos);
      const sy = U(dataView, yPos + 8);
      if (!strictPoint(sx, sy) || edgeGhost(sx, sy)) { yPos += 1; continue; }
      const chain = walkChain(yPos);
      if (!chain) { yPos += 1; continue; }
      const start = chain.points[0];
      const end = chain.points[chain.points.length - 1];
      if (duplicateLine(lines, start, end)) {
        yPos = Math.max(yPos + 1, chain.endPos);
        continue;
      }
      const type = readStyle(yPos, chain.tailBytes, chain.points.length);
      if (!type) { yPos = Math.max(yPos + 1, chain.endPos); continue; }
      if (type === "straight" && !chain.isNearPlayers) {
        yPos = Math.max(yPos + 1, chain.endPos);
        continue;
      }
      pushLine({
        offset: yPos,
        points: chain.points,
        type,
        color: readColor(o, yPos - 1, o[yPos - 1]) || "#000000",
        hasBarMarker: false,
        geometry: chain.points.length >= 3 ? "polyline" : "straight",
        isHandoffOnlyBlock: false
      });
      yPos = Math.max(yPos + 1, chain.endPos);
    }

    lines.sort((a, b) => a.off - b.off);
    return lines;
  }

  /** Court text labels — same record shape as players but type byte T (84) or L (76). */
  function scanCourtTextLabels(bytes, payloadStart, payloadEnd, dataView) {
    const o = bytesLike(bytes);
    const out = [];
    for (let r = payloadStart; r + 4 + 16 <= payloadEnd; r++) {
      if (o[r] !== 1 || o[r + 2] !== 0) continue;
      const typeByte = o[r + 1];
      if (typeByte !== 84 && typeByte !== 76) continue;
      const labelLen = o[r + 3];
      if (labelLen < 1 || labelLen > 40) continue;
      const labelStart = r + 4;
      const coordStart = labelStart + labelLen;
      if (coordStart + 16 > payloadEnd) continue;
      let label = "";
      let ok = true;
      for (let v = 0; v < labelLen; v++) {
        const c = o[labelStart + v];
        if (c < 32 || c > 126) { ok = false; break; }
        label += String.fromCharCode(c);
      }
      if (!ok || !label.trim()) continue;
      if (/^\d+$/.test(label.trim())) continue;
      const x = U(dataView, coordStart);
      const y = U(dataView, coordStart + 8);
      if (!strictPoint(x, y) || edgeGhost(x, y)) continue;
      out.push({ kind: "text", off: r, text: label.trim(), x, y });
      r = coordStart + 15;
    }
    out.sort((a, b) => a.off - b.off);
    return out;
  }

  /** Training cones — type byte O (79), coords at +4/+12. */
  function scanCones(bytes, payloadStart, payloadEnd, dataView) {
    const o = bytesLike(bytes);
    const out = [];
    for (let r = payloadStart; r + 20 <= payloadEnd; r++) {
      if (o[r] !== 1 || o[r + 1] !== 79 || o[r + 2] !== 0) continue;
      const x = U(dataView, r + 4);
      const y = U(dataView, r + 12);
      if (!strictPoint(x, y) || edgeGhost(x, y)) continue;
      out.push({ kind: "cone", off: r, x, y });
      r += 19;
    }
    return out;
  }

  /** Training flags — type byte f (102), same coord layout as cones. */
  function scanFlags(bytes, payloadStart, payloadEnd, dataView) {
    const o = bytesLike(bytes);
    const out = [];
    for (let r = payloadStart; r + 20 <= payloadEnd; r++) {
      if (o[r] !== 1 || o[r + 1] !== 102 || o[r + 2] !== 0) continue;
      const x = U(dataView, r + 4);
      const y = U(dataView, r + 12);
      if (!strictPoint(x, y) || edgeGhost(x, y)) continue;
      out.push({ kind: "flag", off: r, x, y });
      r += 19;
    }
    return out;
  }

  /**
   * FastDraw shade blocks (designer shadows) — sentinel 1,0,1 with rect doubles + RGB tag.
   * Distinct from zone shades (1,83,0); uses iCoach Co() shadow block layout.
   */
  function scanShadowRects(bytes, payloadStart, payloadEnd, dataView) {
    const o = bytesLike(bytes);
    const out = [];
    const eps = 1e-6;
    const be = (off) => (
      off < 0 || off + 4 > o.length
        ? 0
        : ((o[off] << 24) | (o[off + 1] << 16) | (o[off + 2] << 8) | o[off + 3]) >>> 0
    );
    const pairLen = (off) => (off < 0 || off + 2 > o.length ? 0 : o[off] << 8 | o[off + 1]);

    for (let m = payloadStart; m + 43 <= payloadEnd; m++) {
      if (o[m] !== 1 || o[m + 1] !== 0 || o[m + 2] !== 1) continue;
      const h = U(dataView, m + 3);
      const x = U(dataView, m + 11);
      const y = U(dataView, m + 19);
      const T = U(dataView, m + 27);
      if (!Number.isFinite(h) || !Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(T)) continue;
      if (Math.abs(h) > 500 || Math.abs(x) > 500) continue;
      if (y < 10 || y > 200 || T < 10 || T > 260) continue;
      const rgb = be(m + 35);
      if (rgb === 0 || rgb > 16777215) continue;
      const blobLen = pairLen(m + 39);
      if (blobLen <= 0) continue;
      const blobEnd = m + 41 + blobLen;
      if (blobEnd > payloadEnd) continue;
      const nearOriginH = Math.abs(h) < eps || Math.abs(h + 5) < eps;
      const nearOriginX = Math.abs(x) < eps || Math.abs(x + 5) < eps;
      if (!nearOriginH || !nearOriginX || !(y > h && T > x)) continue;
      const height = y - h;
      const width = T - x;
      if (height < 20 || height > 200 || width < 20 || width > 260) continue;
      const cx = (h + y) / 2;
      const cy = (x + T) / 2;
      if (!loosePoint(cx, cy) || edgeGhost(cx, cy)) continue;
      const shadowType = Math.abs(width - height) < 3 ? "circle" : "rect";
      const REF_W = 45;
      const REF_H = 35;
      out.push({
        kind: "shadow",
        off: m,
        x: cx,
        y: cy,
        scaleX: Math.max(0.2, Math.min(10, width / REF_W)),
        scaleY: Math.max(0.2, Math.min(10, height / REF_H)),
        shadowType
      });
      if (blobLen > 0) m = Math.max(m, blobEnd - 1);
    }
    return out;
  }

  /** Semi-transparent shade rectangles — type byte S (83), four corner doubles. */
  function scanZoneShades(bytes, payloadStart, payloadEnd, dataView) {
    const o = bytesLike(bytes);
    const out = [];
    for (let r = payloadStart; r + 36 <= payloadEnd; r++) {
      if (o[r] !== 1 || o[r + 1] !== 83 || o[r + 2] !== 0) continue;
      const x1 = U(dataView, r + 4);
      const y1 = U(dataView, r + 12);
      const x2 = U(dataView, r + 20);
      const y2 = U(dataView, r + 28);
      if (!loosePoint(x1, y1) || !loosePoint(x2, y2)) continue;
      if (Math.hypot(x2 - x1, y2 - y1) < 2) continue;
      out.push({
        kind: "zone",
        off: r,
        x1: Math.min(x1, x2),
        y1: Math.min(y1, y2),
        x2: Math.max(x1, x2),
        y2: Math.max(y1, y2)
      });
      r += 35;
    }
    return out;
  }

  return {
    scanPlayers,
    scanLines,
    scanHandoffIcons,
    scanCourtTextLabels,
    scanCones,
    scanFlags,
    scanZoneShades,
    scanShadowRects
  };
})();

if (typeof globalThis !== "undefined") {
  globalThis.FastDrawIcbScan = FastDrawIcbScan;
}

if (typeof module !== "undefined") {
  module.exports = FastDrawIcbScan;
}
