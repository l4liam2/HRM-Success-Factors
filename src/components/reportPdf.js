import { jsPDF } from 'jspdf';
import { bibliography } from './bibliographyData.js'; // explicit .js so check_report.mjs can run it in node

// Multi-page results report. AssessmentScreen loads this module (and jsPDF with it) only
// when someone clicks "Save as PDF", so the page itself stays light.

// US Letter in points. ponytail: Letter only; A4 printers scale it to fit.
const PAGE_W = 612, PAGE_H = 792, M = 54, W = PAGE_W - M * 2;
const BOTTOM = PAGE_H - 62; // content stops here, clear of the footer
const LH = 1.35;            // line height factor for all text

// Site palette (light theme in index.css). The report always prints light.
const C = {
  ink: '#0F172A', body: '#334155', muted: '#64748B',
  line: '#E2E8F0', track: '#F1F5F9',
  accent: '#4F46E5', accentSoft: '#EEF2FF', accentMid: '#C7D2FE',
  teal: '#0D9488', tealSoft: '#F0FDFA',
  amber: '#B45309', amberSoft: '#FEF3C7',
  white: '#FFFFFF',
};

const SITE = 'https://www.edurisk.ca/';
const EMAIL = 'liam@edurisk.ca';

// Built-in Helvetica covers WinAnsi: Latin-1 plus curly quotes, dashes and bullets.
// ponytail: other scripts (CJK, emoji) are dropped; embed a Unicode TTF via addFont if that matters.
const clean = (s) => String(s ?? '')
  .replace(/[^\s\x20-\x7E\xA0-\xFF€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

const trunc = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);
const isoDate = (d) => [d.getFullYear(), d.getMonth() + 1, d.getDate()].map(n => String(n).padStart(2, '0')).join('-');
const cleanLevelName = (name = '') => (name.includes(':') ? name.split(':')[1].trim() : name);

// Assessment factor names mostly match the mind map's end nodes once case and punctuation
// are ignored; these two were named differently.
const norm = (s) => s.toLowerCase().replace(/[^a-z]/g, '');
const FACTOR_ALIASES = { biases: 'cognitivebiases', workforceintegration: 'workforcemanagementintegration' };
export const factorIndex = (tree) => {
  const idx = {};
  const walk = (n) => (n.children?.length ? n.children.forEach(walk) : (idx[norm(n.name)] = n));
  if (tree) walk(tree);
  return (factor) => idx[FACTOR_ALIASES[norm(factor)] ?? norm(factor)];
};

export const reportFilename = (org = '', date = new Date()) => {
  const slug = org.normalize('NFKD').replace(/[^\x20-\x7E]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40).replace(/-$/, '');
  return ['security-awareness-maturity', slug, isoDate(date)].filter(Boolean).join('-') + '.pdf';
};

/**
 * items: one entry per question asked, in quiz order:
 *   { dim, dimLabel, weight, factor, text, answer, points, best }
 * where points/answer are null for "I'm not sure" and best is the Level 5 statement.
 */
export function buildReport({ results, items, maturityLevels = [], mapData, mode, preparedFor = '', siteUrl = SITE, date = new Date() }) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter', compress: true });
  doc.setLineHeightFactor(LH);

  const org = clean(preparedFor);
  const factorNode = factorIndex(mapData);
  const levelName = (lvl) => cleanLevelName(maturityLevels[lvl - 1]?.name);
  const lvl = results.overallLevel;
  const unsure = items.filter(i => i.points == null);
  const pctOf = (d) => `${Math.round(d.pct * 100)}%`;
  const host = new URL(siteUrl).host;

  // --- Drawing helpers ---
  // Each block is laid out twice: a "dry" pass that only measures (so a block that won't
  // fit moves to the next page whole), then the real pass. Every draw goes through here.
  let dry = false;
  const measure = (fn) => { const prev = dry; dry = true; const h = fn(); dry = prev; return h; };
  const setFont = (size, style = 'normal') => doc.setFont('helvetica', style).setFontSize(size);
  const wrap = (s, width, size, style) => { setFont(size, style); return doc.splitTextToSize(clean(s), width); };

  // Text (a string to wrap, or pre-split lines) with its top edge at `top`. Returns the height used.
  const text = (s, x, top, { size = 9.5, style = 'normal', color = C.body, width = W, align, charSpace } = {}) => {
    const lines = Array.isArray(s) ? s : wrap(s, width, size, style);
    if (!dry) {
      setFont(size, style);
      doc.setTextColor(color);
      doc.text(lines, x, top, { baseline: 'top', align, charSpace });
    }
    return lines.length * size * LH;
  };
  const eyebrow = (label, x, top, color = C.accent) =>
    text([label.toUpperCase()], x, top, { size: 7.5, style: 'bold', color, charSpace: 0.9 });
  const eyebrowW = (label) => { setFont(7.5, 'bold'); return doc.getTextWidth(label.toUpperCase()) + 0.9 * label.length; };
  // Offset from a text line's top to its visual (cap-height) centre, for lining up with shapes.
  const mid = (size) => 0.29 * size;

  const box = (x, top, w, h, { fill, stroke, r = 0 } = {}) => {
    if (dry) return;
    if (fill) doc.setFillColor(fill);
    if (stroke) { doc.setDrawColor(stroke); doc.setLineWidth(0.75); }
    const style = fill && stroke ? 'FD' : fill ? 'F' : 'S';
    if (r) doc.roundedRect(x, top, w, h, r, r, style);
    else doc.rect(x, top, w, h, style);
  };
  const hline = (x1, x2, yy) => {
    if (dry) return;
    doc.setDrawColor(C.line);
    doc.setLineWidth(0.75);
    doc.line(x1, yy, x2, yy);
  };
  const poly = (pts, style) => {
    doc.moveTo(...pts[0]);
    pts.slice(1).forEach(p => doc.lineTo(...p));
    doc.close();
    if (style === 'F') doc.fill(); else doc.stroke();
  };
  // Filled circle with a centred number (alphabetic baseline sits half a cap height below centre).
  const badge = (cx, cy, label, color) => {
    if (dry) return;
    doc.setFillColor(color);
    doc.circle(cx, cy, 10, 'F');
    setFont(10, 'bold');
    doc.setTextColor(C.white);
    doc.text(String(label), cx, cy + 3.6, { align: 'center' });
  };
  // Rounded tag, right-aligned to xRight. Returns its width.
  const pill = (label, xRight, top, fg, bg) => {
    setFont(8, 'bold');
    const w = doc.getTextWidth(label) + 14;
    box(xRight - w, top, w, 15, { fill: bg, r: 7.5 });
    if (!dry) {
      doc.setTextColor(fg);
      doc.text(label, xRight - w / 2, top + 10.4, { align: 'center' });
    }
    return w;
  };
  // Single-line runs of differently styled text; a run with a url becomes a link.
  const runsWidth = (runs, size) => runs.reduce((w, [s, , style]) => (setFont(size, style), w + doc.getTextWidth(s)), 0);
  const runs = (segs, x, top, size = 9) => {
    let cx = x;
    segs.forEach(([s, color, style = 'normal', url]) => {
      setFont(size, style);
      const w = doc.getTextWidth(s);
      if (!dry) {
        doc.setTextColor(color);
        doc.text(s, cx, top, { baseline: 'top' });
        if (url) doc.link(cx, top - 1, w, size + 2, { url });
      }
      cx += w;
    });
    return size * LH;
  };
  const bullet = (s, x, top, width, { size = 9.5, color = C.body, mark = C.accent } = {}) => {
    if (!dry) {
      doc.setFillColor(mark);
      doc.circle(x + 2.5, top + size * 0.4, 1.5, 'F');
    }
    return text(s, x + 11, top, { size, color, width: width - 11 }) + 2;
  };
  const bullets = (arr, x, top, width, opts) => arr.reduce((h, s) => h + bullet(s, x, top + h, width, opts), 0);

  // --- Page flow ---
  let y = M;
  const newPage = () => { doc.addPage(); y = M; };
  // Place a block (top => height), starting a new page first if it would run past the bottom.
  const place = (block, gapAfter = 0) => {
    const h = measure(() => block(y));
    if (y + h > BOTTOM && y > M) newPage();
    y += block(y) + gapAfter;
  };
  // Keep a heading on the same page as the first thing under it.
  const withHeading = (heading, first) => (top) => { const h = heading(top); return h + first(top + h); };
  const pageTitle = (kicker, title, intro) => {
    y += eyebrow(kicker, M, y) + 4;
    y += text(title, M, y, { size: 18, style: 'bold', color: C.ink }) + 2;
    if (intro) y += text(intro, M, y, { size: 9.5, color: C.muted }) + 14;
  };

  // ===== Page 1: executive summary =====
  box(0, 0, PAGE_W, 6, { fill: C.accent });
  y += eyebrow('Security awareness program', M, y) + 4;
  y += text('Maturity Assessment Report', M, y, { size: 24, style: 'bold', color: C.ink }) + 2;
  if (org) y += text(`Prepared for ${org}`, M, y, { size: 12, color: C.body }) + 2;
  const meta = [
    date.toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }),
    `${mode === 'quick' ? 'Quick check' : 'Full assessment'}, ${items.length} questions`,
    unsure.length ? `${unsure.length} answered “I’m not sure”` : null,
  ].filter(Boolean).join('  ·  ');
  y += text(meta, M, y, { size: 9, color: C.muted }) + 10;
  hline(M, M + W, y);
  y += 18;

  // Hero: radar chart (same geometry as the on-screen one) + overall result.
  place((top) => {
    const dims = results.dims, n = dims.length, R = 66, gap = 10;
    const ang = (i) => ((-90 + (i * 360) / n) * Math.PI) / 180;
    const lvlLabel = (d) => (d.level ? `Level ${d.level}` : 'n/a');
    const labelW = (d) => {
      setFont(8.5, 'bold');
      const a = doc.getTextWidth(d.label);
      setFont(8);
      return Math.max(a, doc.getTextWidth(lvlLabel(d)));
    };
    const side = (sign) => Math.max(0, ...dims.filter((_, i) => Math.cos(ang(i)) * sign > 0.01).map(labelW));
    const labelH = (8.5 + 8) * LH;
    const cx = M + side(-1) + gap + R, cy = top + labelH + gap + R;
    const pt = (i, r) => [cx + r * Math.cos(ang(i)), cy + r * Math.sin(ang(i))];
    const chartH = (labelH + gap + R) * 2;

    if (!dry) {
      doc.setDrawColor(C.line);
      doc.setLineWidth(0.75);
      for (let L = 1; L <= 5; L++) poly(dims.map((_, i) => pt(i, (L / 5) * R)), 'S');
      dims.forEach((_, i) => doc.line(cx, cy, ...pt(i, R)));
      const data = dims.map((d, i) => pt(i, ((d.level || 0) / 5) * R));
      doc.setGState(new doc.GState({ opacity: 0.18 }));
      doc.setFillColor(C.accent);
      poly(data, 'F');
      doc.setGState(new doc.GState({ opacity: 1 }));
      doc.setDrawColor(C.accent);
      doc.setLineWidth(1.5);
      doc.setLineJoin('round');
      poly(data, 'S');
      data.forEach(([x, yy]) => doc.circle(x, yy, 2.4, 'F'));
    }
    dims.forEach((d, i) => {
      const [lx, ly] = pt(i, R + gap);
      const c = Math.cos(ang(i));
      const align = Math.abs(c) < 0.01 ? 'center' : c > 0 ? 'left' : 'right';
      const t = ly - labelH / 2 + Math.sin(ang(i)) * (labelH / 2);
      text([d.label], lx, t, { size: 8.5, style: 'bold', color: C.ink, align });
      text([lvlLabel(d)], lx, t + 8.5 * LH, { size: 8, color: C.muted, align });
    });

    // Overall result, vertically centred against the chart.
    const x0 = cx + R + gap + side(1) + 30, rw = M + W - x0;
    const overall = (t) => {
      let h = eyebrow('Overall maturity', x0, t, C.muted) + 6;
      if (!dry) {
        setFont(40, 'bold');
        doc.setTextColor(C.accent);
        doc.text(lvl != null ? `${Math.round(results.overallPct * 100)}%` : 'N/A', x0, t + h + 29);
      }
      h += 40;
      if (lvl == null) return h + text('Not enough answered questions to produce an overall level.', x0, t + h, { width: rw });
      h += text(`Level ${lvl}: ${levelName(lvl)}`, x0, t + h, { size: 13, style: 'bold', color: C.ink, width: rw }) + 2;
      if (maturityLevels[lvl - 1]?.tldr) h += text(maturityLevels[lvl - 1].tldr, x0, t + h, { width: rw }) + 4;
      h += text(lvl < 5 ? `One step from ${levelName(lvl + 1)}.` : 'You’ve reached the top tier. Focus on sustainment.',
        x0, t + h, { style: 'bold', color: C.teal, width: rw });
      return h;
    };
    const oh = measure(() => overall(0));
    overall(top + Math.max(0, (chartH - oh) / 2));
    return Math.max(chartH, oh);
  }, 16);

  // Maturity scale with a "you are here" marker.
  place((top) => {
    const gap = 5, segW = (W - gap * 4) / 5, pad = 7;
    let h = eyebrow('Maturity scale', M, top) + 18;
    const names = [1, 2, 3, 4, 5].map(L => wrap(levelName(L), segW - pad * 2, 7.5));
    const segH = pad + 13 + Math.max(...names.map(ls => ls.length)) * 7.5 * LH + pad - 3;
    names.forEach((ls, i) => {
      const L = i + 1, x = M + i * (segW + gap), t = top + h;
      const [bg, fg, sub] = L === lvl ? [C.accent, C.white, C.accentSoft]
        : lvl && L < lvl ? [C.accentSoft, C.accent, C.accent] : [C.track, C.muted, C.muted];
      box(x, t, segW, segH, { fill: bg, r: 5 });
      text([`Level ${L}`], x + pad, t + pad, { size: 8.5, style: 'bold', color: fg });
      text(ls, x + pad, t + pad + 13, { size: 7.5, color: sub });
      if (L === lvl) {
        text(['You are here'], x + segW / 2, t - 15, { size: 7, style: 'bold', color: C.accent, align: 'center' });
        if (!dry) {
          doc.setFillColor(C.accent);
          doc.triangle(x + segW / 2 - 4, t - 5, x + segW / 2 + 4, t - 5, x + segW / 2, t - 1, 'F');
        }
      }
    });
    return h + segH;
  }, 20);

  // Dimension rows: level, bar with band ticks, score.
  place((top) => {
    let h = eyebrow('By dimension', M, top) + 10;
    const colLvl = M + 116, colBar = M + 170, barW = W - 170 - 118;
    results.dims.forEach(d => {
      const t = top + h;
      text([d.label], M, t, { size: 10, style: 'bold', color: C.ink });
      text([`${Math.round(d.weight * 100)}% of overall`], M, t + 13.5, { size: 7.5, color: C.muted });
      if (d.level != null) {
        text([`Level ${d.level}`], colLvl, t, { size: 10, style: 'bold', color: C.accent });
        box(colBar, t, barW, 7, { fill: C.track, r: 3.5 });
        box(colBar, t, Math.max(7, barW * d.pct), 7, { fill: C.accent, r: 3.5 });
        if (!dry) {
          doc.setDrawColor(C.white);
          doc.setLineWidth(1);
          for (let k = 1; k < 5; k++) doc.line(colBar + (barW * k) / 5, t, colBar + (barW * k) / 5, t + 7);
        }
      } else {
        text(['N/A'], colLvl, t, { size: 10, style: 'bold', color: C.muted });
      }
      const score = d.level != null ? `${d.score} / ${d.max} pts${d.skipped ? `  ·  ${d.skipped} not sure` : ''}` : 'Not enough answers';
      text([score], M + W, t + 0.5, { size: 8.5, color: C.muted, align: 'right' });
      h += 31;
    });
    return h - 10;
  }, 18);

  // Key takeaways, generated from the scores.
  const ranked = results.dims.filter(d => d.pct != null).sort((a, b) => b.pct - a.pct);
  const takeaways = [];
  if (ranked.length > 1) {
    const best = ranked[0], worst = ranked[ranked.length - 1];
    // Ties are common (especially in the Quick check), so name every dimension that shares the score.
    const tied = (d) => ranked.filter(r => r.pct === d.pct);
    const names = (ds) => new Intl.ListFormat('en').format(ds.map(r => r.label));
    const top = tied(best), low = tied(worst);
    if (best.pct === worst.pct) takeaways.push(`Every dimension scores the same, at Level ${best.level} (${pctOf(best)}).`);
    else takeaways.push(
      `${names(top)} ${top.length > 1 ? 'are your strongest dimensions' : 'is your strongest dimension'}, at Level ${best.level} (${pctOf(best)}).`,
      `${names(low)} ${low.length > 1 ? 'have' : 'has'} the most room to grow, at Level ${worst.level} (${pctOf(worst)}).`,
    );
  }
  takeaways.push(unsure.length
    ? `You answered “I’m not sure” to ${unsure.length} question${unsure.length > 1 ? 's' : ''}. They’re left out of the score and listed at the end as blind spots.`
    : 'You gave a definite answer to every question, so nothing was left out of the score.');
  if (lvl != null && lvl < 5) takeaways.push(`The next page sets out your top priorities and what it takes to reach Level ${lvl + 1}.`);
  if (mode === 'quick') takeaways.push('This was the Quick check. Treat it as indicative, and take the Full assessment for a complete picture.');

  place((top) => {
    const pad = 14;
    const inner = (t) => {
      const h = text(['Key takeaways'], M + pad, t, { size: 10.5, style: 'bold', color: C.ink }) + 3;
      return h + bullets(takeaways, M + pad, t + h, W - pad * 2);
    };
    const ih = measure(() => inner(0));
    box(M, top, W, ih + pad * 2 - 7, { fill: C.accentSoft, r: 8 });
    inner(top + pad);
    return ih + pad * 2 - 7;
  });

  // ===== Page 2: priorities and roadmap =====
  const scored = items.filter(i => i.points != null);
  // Lowest (or highest) points first; ties go to the dimension that carries more weight.
  const byPoints = (dir) => [...scored].sort((a, b) => dir * (a.points - b.points) || b.weight - a.weight);
  const gaps = byPoints(1).filter(i => i.points < 5).slice(0, 3);
  const strengths = byPoints(-1).filter(i => i.points >= 4 && !gaps.includes(i)).slice(0, 2);

  newPage();
  pageTitle('Where to focus', 'Top priorities',
    gaps.length ? 'The factors where your answers scored lowest. When scores tie, the dimension that carries more weight comes first.' : null);
  if (!gaps.length) {
    y += text(scored.length ? 'Every factor you answered scored Level 5. Nothing to fix, just keep it that way.'
      : 'Not enough answers to set priorities.', M, y, { size: 9.5, color: C.muted }) + 14;
  }

  // One header row: title on the left; dimension and level pill on the right. Returns its height.
  const factorHeader = (it, x, t, xRight, width, size, pillFg, pillBg) => {
    const c = t + 9; // row centre line
    const pw = pill(`Level ${it.points}`, xRight, c - 7.5, pillFg, pillBg);
    const dw = eyebrowW(it.dimLabel);
    eyebrow(it.dimLabel, xRight - pw - 8 - dw, c - mid(7.5), C.muted);
    const lines = wrap(it.factor, width - pw - dw - 20, size, 'bold');
    const top = c - mid(size);
    text(lines, x, top, { size, style: 'bold', color: C.ink });
    return Math.max(18, top - t + (lines.length - 1) * size * LH + size);
  };

  gaps.forEach((it, gi) => place((top) => {
    const node = factorNode(it.factor);
    const pad = 13, ix = M + pad + 32, iw = M + W - pad - ix, colW = (iw - 10) / 2;
    const inner = (t) => {
      badge(M + pad + 10, t + 9, gi + 1, C.accent);
      let h = factorHeader(it, ix, t, M + W - pad, iw, 12.5, C.amber, C.amberSoft) + 4;
      // The question gives the answers their context (some answers finish its sentence).
      h += text(it.text, ix, t + h, { size: 9, style: 'italic', color: C.muted, width: iw }) + 6;
      const today = wrap(it.answer, colW - 18, 9), best = wrap(it.best, colW - 18, 9);
      const ch = 8 + 12 + Math.max(today.length, best.length) * 9 * LH + 3;
      box(ix, t + h, colW, ch, { fill: C.track, r: 6 });
      box(ix + colW + 10, t + h, colW, ch, { fill: C.tealSoft, r: 6 });
      eyebrow('Today', ix + 9, t + h + 8, C.muted);
      eyebrow('Level 5 looks like', ix + colW + 19, t + h + 8, C.teal);
      text(today, ix + 9, t + h + 20, { size: 9 });
      text(best, ix + colW + 19, t + h + 20, { size: 9 });
      h += ch + 8;
      const steps = node?.actionItems?.slice(0, 2) ?? [];
      if (steps.length) {
        h += eyebrow('Next steps', ix, t + h) + 3;
        h += bullets(steps, ix, t + h, iw, { size: 9 });
      }
      return h;
    };
    const ih = measure(() => inner(0));
    box(M, top, W, ih + pad * 2 - 6, { stroke: C.line, r: 8 });
    inner(top + pad);
    return ih + pad * 2 - 6;
  }, 10));

  if (strengths.length) {
    y += 10;
    const strength = (it) => (top) => {
      let h = factorHeader(it, M, top, M + W, W, 10.5, C.teal, C.tealSoft) + 1;
      h += text(it.text, M, top + h, { size: 8.5, style: 'italic', color: C.muted }) + 1;
      return h + text(/^[“"]/.test(it.answer) ? it.answer : `“${it.answer}”`, M, top + h, { size: 9 });
    };
    strengths.forEach((it, i) => place(i === 0
      ? withHeading((t) => eyebrow('Strengths to protect', M, t, C.teal) + 8, strength(it))
      : strength(it), 12));
  }

  // The next maturity stage (or, at the top, what sustains Level 5).
  if (lvl != null && maturityLevels[Math.min(lvl, 4)]) {
    const atTop = lvl >= 5, target = maturityLevels[Math.min(lvl, 4)];
    y += 8;
    place((top) => {
      let h = eyebrow(atTop ? 'Staying at the top' : 'Your next level', M, top) + 4;
      h += text(atTop ? `Sustaining Level 5: ${levelName(5)}` : `Reaching Level ${lvl + 1}: ${levelName(lvl + 1)}`,
        M, top + h, { size: 14, style: 'bold', color: C.ink }) + 2;
      if (target.tldr) h += text(target.tldr, M, top + h) + 10;
      const colW = (W - 24) / 2, x2 = M + colW + 24;
      const a = eyebrow(atTop ? 'What sustains it' : 'Key action items', M, top + h) + 4;
      const b = eyebrow('KPIs to track', x2, top + h) + 4;
      const ah = bullets(target.actionItems ?? [], M, top + h + a, colW);
      const bh = bullets(target.kpis ?? [], x2, top + h + b, colW, { mark: C.teal });
      return h + Math.max(a + ah, b + bh);
    });
  }

  // Consulting CTA and links back to the tool, ahead of the appendix so skimmers still see them.
  y += 14;
  place((top) => {
    const pad = 18;
    const inner = (t) => {
      let h = text('Looking to strengthen your program?', M + pad, t, { size: 14, style: 'bold', color: C.white }) + 2;
      h += text('I provide consulting to help organisations close these gaps.', M + pad, t + h, { size: 10, color: C.accentSoft }) + 8;
      h += runs([
        [EMAIL, C.white, 'bold', `mailto:${EMAIL}?subject=Security%20awareness%20program%20consulting`],
        ['    ·    ', C.accentMid],
        ['edurisk.ca', C.white, 'bold', SITE],
      ], M + pad, t + h, 10);
      return h;
    };
    const ih = measure(() => inner(0));
    box(M, top, W, ih + pad * 2 - 4, { fill: C.accent, r: 10 });
    inner(top + pad);
    return ih + pad * 2 - 4;
  }, 12);

  // Wide gaps between runs: viewers draw built-in Helvetica with their own metrics, so a
  // single space can visually close up.
  const reassess = new Date(date.getFullYear(), date.getMonth() + 6, 1)
    .toLocaleDateString('en-CA', { month: 'long', year: 'numeric' });
  place((top) => {
    const h = runs([[`Track your progress: retake the assessment around ${reassess}`, C.muted], ['   ', C.muted],
      [`${host}/assessment`, C.accent, 'bold', `${siteUrl}assessment`]], M, top);
    return h + runs([['Explore the research behind each factor', C.muted], ['   ', C.muted],
      [`${host}/mindmap`, C.accent, 'bold', `${siteUrl}mindmap`]], M, top + h + 2);
  });

  // ===== Page 3+: appendix =====
  newPage();
  pageTitle('Appendix', 'Your answers', 'Every question you were asked, grouped by dimension. Each answer maps to a level from 1 to 5.');

  const levelDots = (n, xRight, top) => {
    setFont(7.5, 'bold');
    const label = `Level ${n}`, lw = doc.getTextWidth(label);
    if (dry) return;
    doc.setTextColor(C.ink);
    doc.text(label, xRight, top, { baseline: 'top', align: 'right' });
    doc.setLineWidth(0.75);
    for (let k = 1; k <= 5; k++) {
      const cx = xRight - lw - 8 - (5 - k) * 8.5;
      doc.setFillColor(k <= n ? C.accent : C.white);
      doc.setDrawColor(k <= n ? C.accent : C.accentMid);
      doc.circle(cx, top + 2.4, 2.6, 'FD');
    }
  };

  results.dims.forEach(d => {
    const qs = items.filter(i => i.dim === d.key);
    const header = (top) => {
      box(M, top, W, 26, { fill: C.track, r: 6 });
      text([d.label], M + 10, top + 7, { size: 11, style: 'bold', color: C.ink });
      text([d.level != null ? `Level ${d.level}  ·  ${d.score} / ${d.max} pts` : 'Not enough answers'],
        M + W - 10, top + 8.5, { size: 8.5, style: 'bold', color: C.accent, align: 'right' });
      return 36;
    };
    const question = (it, last) => (top) => {
      eyebrow(it.factor, M, top);
      if (it.points != null) levelDots(it.points, M + W, top);
      else pill('Not sure', M + W, top - 4, C.amber, C.amberSoft);
      let h = 13;
      h += text(it.text, M, top + h, { size: 9.5, style: 'bold', color: C.ink, width: W - 10 }) + 2;
      const ah = text(it.points != null ? it.answer : 'I’m not sure. Left out of the score.', M + 10, top + h,
        { size: 9.5, color: it.points != null ? C.body : C.muted, width: W - 10 });
      box(M, top + h, 2, ah - 4, { fill: it.points != null ? C.accentMid : C.amberSoft });
      h += ah + 4;
      if (!last) hline(M, M + W, top + h);
      return h + 9;
    };
    qs.forEach((it, qi) => place(qi === 0 ? withHeading(header, question(it, qs.length === 1)) : question(it, qi === qs.length - 1)));
    y += 12;
  });

  // Blind spots: one block per entry so a long list can run across pages.
  unsure.forEach((it, i) => {
    const entry = (top) => bullet(`${it.factor} (${it.dimLabel}): ${it.text}`, M, top, W, { mark: C.amber });
    place(i === 0 ? withHeading((top) => {
      let h = eyebrow('Blind spots to investigate', M, top, C.amber) + 4;
      h += text('You weren’t sure about these. Finding out is a quick win: it’s hard to improve what you can’t see.', M, top + h) + 6;
      return h;
    }, entry) : entry, i === unsure.length - 1 ? 16 : 0);
  });

  const weights = [...results.dims].sort((a, b) => b.weight - a.weight)
    .map(d => `${d.label} ${Math.round(d.weight * 100)}%`).join(', ');
  const method = [
    'Each question offers five statements that map to Levels 1 to 5, worth 1 to 5 points.',
    'A dimension’s level comes from its score as a share of the maximum, in equal fifths: up to 20% is Level 1, up to 40% is Level 2, and so on.',
    `The overall result is a weighted average across dimensions (${weights}), rounded to the nearest level.`,
    '“I’m not sure” answers are left out of the score rather than counted as zero.',
    mode === 'quick'
      ? 'This was the Quick check, a shorter sample of every dimension, so treat it as indicative.'
      : 'Questions are drawn at random, one per success factor, so a retake asks a different mix.',
    `The model draws on ${bibliography.length} research sources, which you can explore in the interactive mind map.`,
  ];
  place((top) => {
    const h = eyebrow('How scoring works', M, top) + 4;
    return h + bullets(method, M, top + h, W, { size: 9, color: C.muted, mark: C.accentMid });
  });

  // Footer on every page.
  const pages = doc.getNumberOfPages();
  const footLeft = ['Security Awareness Program Maturity Report', org && trunc(org, 40),
    date.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })].filter(Boolean).join('  ·  ');
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    hline(M, M + W, PAGE_H - 42);
    runs([[footLeft, C.muted]], M, PAGE_H - 34, 7.5);
    const right = [['edurisk.ca', C.accent, 'bold', SITE], [`    Page ${p} of ${pages}`, C.muted]];
    runs(right, M + W - runsWidth(right, 7.5), PAGE_H - 34, 7.5);
  }

  doc.setProperties({
    title: org ? `Security Awareness Program Maturity Report for ${org}` : 'Security Awareness Program Maturity Report',
    subject: 'Results of the Security Awareness Program Maturity Assessment',
    author: 'EduRisk',
    creator: 'EduRisk Program Maturity Assessment',
    keywords: 'security awareness, maturity assessment, human risk management',
  });
  doc.setLanguage('en-CA');
  doc.viewerPreferences({ DisplayDocTitle: true });
  return doc;
}

// Build and download. jsPDF's save() defers releasing the blob URL, so the download isn't cut short.
export function saveReport(input) {
  const date = new Date();
  buildReport({ ...input, date }).save(reportFilename(input.preparedFor, date));
}
