import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Award, CheckCircle, ChevronDown, Sun, Moon, ClipboardCheck, RotateCcw, Copy, Download, Zap } from 'lucide-react';

// Maturity band: equal fifths of the max score -> Level 1..5 (matches the table's point bands).
const bandLevel = (score, max) => Math.min(5, Math.max(1, Math.ceil(score / (max / 5))));

// Sentinel for "I'm not sure": excluded from scoring (dropped from the dimension's denominator).
const DK = 'dk';

// Distinct factors in a dimension.
const factorCount = (d) => new Set(d.questions.map(q => q.factor)).size;

// How many factors to ask per dimension (one question each), capped at available factors.
const askN = (d) => Math.min(d.askCount ?? factorCount(d), factorCount(d));

// Assessment lengths. 'full' uses the askCounts from assessment.json; 'quick' scales them
// down to QUICK_TOTAL proportionally (largest-remainder rounding), keeping the same draw logic.
const QUICK_TOTAL = 12;
const askCountsFor = (assessment, mode) => {
  const counts = {};
  assessment.dimensions.forEach(d => { counts[d.key] = askN(d); });
  if (mode !== 'quick') return counts;
  const keys = assessment.dimensions.map(d => d.key);
  const full = keys.map(k => counts[k]);
  const total = full.reduce((s, n) => s + n, 0) || 1;
  const quotas = full.map(n => (n * QUICK_TOTAL) / total);
  const base = quotas.map(Math.floor);
  const left = QUICK_TOTAL - base.reduce((s, n) => s + n, 0);
  [...quotas.keys()]
    .sort((a, b) => (quotas[b] - base[b]) - (quotas[a] - base[a]))
    .slice(0, Math.max(0, left))
    .forEach(i => { base[i] += 1; });
  keys.forEach((k, i) => { counts[k] = Math.min(base[i], factorCount(assessment.dimensions[i])); });
  return counts;
};
const totalFor = (assessment, mode) =>
  Object.values(askCountsFor(assessment, mode)).reduce((s, n) => s + n, 0);
const minutesFor = (n) => Math.max(1, Math.round((n * 36) / 60)); // ~36s/question

const shuffle = (arr) => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

// Points for a chosen descriptor. Normal: top->bottom = 1..5. reverse: top->bottom = 5..1
// (use reverse for negatively-keyed items whose descriptors are authored most-mature-first).
const pointsFor = (q, idx) => q.reverse ? (q.descriptors.length - idx) : (idx + 1);

// Draw the mode's count of distinct factors per dimension, then one random question from each.
const generateSelection = (assessment, counts) => {
  const ids = [];
  for (const d of assessment.dimensions) {
    const byFactor = new Map();
    for (const q of d.questions) {
      if (!byFactor.has(q.factor)) byFactor.set(q.factor, []);
      byFactor.get(q.factor).push(q);
    }
    for (const f of shuffle([...byFactor.keys()]).slice(0, counts[d.key])) {
      const qs = byFactor.get(f);
      ids.push(qs[Math.floor(Math.random() * qs.length)].id);
    }
  }
  return ids;
};

// --- Radar chart (hand-rolled SVG, no dependency) ---
const RADAR_C = 150, RADAR_R = 108;
const radarPoint = (i, n, r) => {
  const a = (-90 + (i * 360) / n) * (Math.PI / 180);
  return [RADAR_C + r * Math.cos(a), RADAR_C + r * Math.sin(a)];
};
const polyPoints = (pts) => pts.map(p => p.join(',')).join(' ');

function RadarChart({ dims, revealed }) {
  const n = dims.length;
  const dataPts = dims.map((d, i) => radarPoint(i, n, ((d.level || 0) / 5) * RADAR_R));
  return (
    <svg className="radar-chart" viewBox="0 0 300 300" role="img" aria-label="Maturity level by dimension">
      {[1, 2, 3, 4, 5].map(L => (
        <polygon key={L} className="radar-grid"
          points={polyPoints(dims.map((_, i) => radarPoint(i, n, (L / 5) * RADAR_R)))} />
      ))}
      {dims.map((_, i) => {
        const [x, y] = radarPoint(i, n, RADAR_R);
        return <line key={i} className="radar-axis" x1={RADAR_C} y1={RADAR_C} x2={x} y2={y} />;
      })}
      <g style={{ transformOrigin: 'center', transform: revealed ? 'scale(1)' : 'scale(0)', transition: 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
        <polygon className="radar-area" points={polyPoints(dataPts)} />
        {dataPts.map(([x, y], i) => <circle key={i} className="radar-dot" cx={x} cy={y} r={4} />)}
      </g>
      {dims.map((d, i) => {
        const [x, y] = radarPoint(i, n, RADAR_R + 22);
        const anchor = Math.abs(x - RADAR_C) < 1 ? 'middle' : (x > RADAR_C ? 'start' : 'end');
        return (
          <text key={i} className="radar-label" x={x} y={y} textAnchor={anchor} dominantBaseline="middle">
            {d.label}
            <tspan className="radar-label-lvl" x={x} dy="14">{d.level ? `Level ${d.level}` : 'n/a'}</tspan>
          </text>
        );
      })}
    </svg>
  );
}

// --- Minimal single-page PDF of a text summary (no dependency) ---
const pdfEsc = (s) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
const pdfAscii = (s) => s
  .replace(/[•]/g, '-')
  .replace(/[–—]/g, '-')          // en/em dash
  .replace(/[‘’]/g, "'")           // curly single quotes
  .replace(/[“”]/g, '"')           // curly double quotes
  .replace(/[^\x20-\x7E]/g, '');             // keep ASCII so byte offsets == char offsets
const buildSummaryPdf = (title, lines) => {
  let content = 'BT\n/F1 16 Tf 72 760 Td (' + pdfEsc(pdfAscii(title)) + ') Tj\n/F1 11 Tf 0 -30 Td 16 TL\n';
  content += lines.map(s => '(' + pdfEsc(pdfAscii(s)) + ') Tj T*\n').join('');
  content += 'ET';
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Length ' + content.length + ' >>\nstream\n' + content + '\nendstream',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [];
  objs.forEach((body, i) => { offsets.push(pdf.length); pdf += `${i + 1} 0 obj\n${body}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`
    + offsets.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('')
    + `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return pdf;
};

function AssessmentScreen() {
  const navigate = useNavigate();
  const layoutRef = useRef(null);
  const [maturityLevels, setMaturityLevels] = useState([]);
  const [assessment, setAssessment] = useState(null);
  const [phase, setPhase] = useState('intro'); // intro | quiz | results
  const [sectionIdx, setSectionIdx] = useState(0);
  const [answers, setAnswers] = useState(() => {
    try { return JSON.parse(localStorage.getItem('assessmentAnswers')) || {}; }
    catch { return {}; }
  });
  // Which questions this run drew from each pool (persisted so a refresh keeps the same set).
  const [selectedIds, setSelectedIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('assessmentSelectedIds')) || []; }
    catch { return []; }
  });
  // Which length was chosen: 'quick' (12 questions) or 'full' (25).
  const [mode, setMode] = useState(() => localStorage.getItem('assessmentMode') || 'full');
  const [results, setResults] = useState(null);
  const [showHalftime, setShowHalftime] = useState(false);
  const [halftimeSeen, setHalftimeSeen] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [countPct, setCountPct] = useState(0);
  const [copied, setCopied] = useState(false);
  const [selectedLevelIdx, setSelectedLevelIdx] = useState(null);
  const [expandedLevels, setExpandedLevels] = useState({ 0: true });
  // Answered questions collapse to a compact summary row (qid -> collapsed).
  const [collapsedQs, setCollapsedQs] = useState({});
  const advanceTimers = useRef([]);
  const quizNavRef = useRef(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.body.classList.toggle('dark-mode', theme === 'dark');
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', next);
      return next;
    });
  };

  // Persist answers + drawn question set so a refresh mid-quiz doesn't wipe progress.
  useEffect(() => {
    localStorage.setItem('assessmentAnswers', JSON.stringify(answers));
  }, [answers]);
  useEffect(() => {
    localStorage.setItem('assessmentSelectedIds', JSON.stringify(selectedIds));
  }, [selectedIds]);
  useEffect(() => {
    localStorage.setItem('assessmentMode', mode);
  }, [mode]);

  useEffect(() => {
    const base = import.meta.env.BASE_URL;
    fetch(`${base}data.json`)
      .then(res => res.json())
      .then(data => {
        const findMaturity = (node) => {
          if (node.name === "Maturity stages") return node.children || [];
          if (node.children) {
            for (const child of node.children) {
              const res = findMaturity(child);
              if (res && res.length > 0) return res;
            }
          }
          return [];
        };
        setMaturityLevels(findMaturity(data));
      })
      .catch(err => console.error("Error loading maturity stages", err));

    fetch(`${base}assessment.json`)
      .then(res => res.json())
      .then(data => {
        // Invariant: every assessment asks exactly 25 questions. Warn in dev if the config drifts.
        if (import.meta.env.DEV) {
          const total = data.dimensions.reduce((s, d) => s + (d.askCount ?? d.questions.length), 0);
          if (total !== 25) console.warn(`assessment.json: askCount sums to ${total}, expected 25`);
          data.dimensions.forEach(d => {
            const nf = new Set(d.questions.map(q => q.factor)).size;
            if ((d.askCount ?? 0) > nf)
              console.warn(`assessment.json: "${d.label}" has ${nf} factors but askCount is ${d.askCount}`);
          });
        }
        setAssessment(data);
      })
      .catch(err => console.error("Error loading assessment questions", err));
  }, []);

  // Heal stale saved progress: if the persisted selection no longer matches the current
  // question set (content changed, or it's an old partial draw), discard it.
  useEffect(() => {
    if (!assessment || selectedIds.length === 0) return;
    const counts = askCountsFor(assessment, mode);
    const meta = new Map();
    assessment.dimensions.forEach(d => d.questions.forEach(q => meta.set(q.id, { key: d.key, factor: q.factor })));
    const byDim = {};
    selectedIds.forEach(id => { const m = meta.get(id); if (m) (byDim[m.key] ??= []).push(m.factor); });
    const valid = selectedIds.every(id => meta.has(id))
      && assessment.dimensions.every(d => {
        const facs = byDim[d.key] || [];
        return facs.length === counts[d.key] && new Set(facs).size === facs.length; // right count, distinct factors
      });
    if (!valid) { setSelectedIds([]); setAnswers({}); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessment]);

  // The drawn subset, grouped by dimension. Falls back to nothing until a selection is made.
  const quiz = useMemo(() => {
    if (!assessment || selectedIds.length === 0) return [];
    const set = new Set(selectedIds);
    return assessment.dimensions
      .map(d => ({ ...d, questions: d.questions.filter(q => set.has(q.id)) }))
      .filter(d => d.questions.length > 0);
  }, [assessment, selectedIds]);

  const allQuestions = quiz.flatMap(d => d.questions);
  const answeredCount = allQuestions.filter(q => answers[q.id] != null).length;
  const allAnswered = allQuestions.length > 0 && answeredCount === allQuestions.length;

  const section = quiz[sectionIdx];
  const sectionLeft = section ? section.questions.filter(q => answers[q.id] == null).length : 0;
  const isLastSection = sectionIdx >= quiz.length - 1;

  // Animate the results in: scale the radar/bars, count the overall % up.
  useEffect(() => {
    if (phase !== 'results') { setRevealed(false); return; }
    const id = setTimeout(() => setRevealed(true), 60);
    return () => clearTimeout(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'results' || !results) return;
    const target = results.overallPct != null ? Math.round(results.overallPct * 100) : 0;
    setCountPct(0);
    let raf, start;
    const step = (t) => {
      if (start == null) start = t;
      const p = Math.min(1, (t - start) / 1100);
      setCountPct(Math.round(target * (1 - Math.pow(1 - p, 3)))); // easeOutCubic
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [phase, results]);

  const scrollTop = () => layoutRef.current?.scrollTo({ top: 0 });

  // Entering a section (start, resume, back/next): already-answered questions render collapsed.
  useEffect(() => {
    if (phase !== 'quiz' || !quiz[sectionIdx]) return;
    const next = {};
    quiz[sectionIdx].questions.forEach(q => { next[q.id] = answers[q.id] != null; });
    setCollapsedQs(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, sectionIdx, quiz]);

  useEffect(() => () => advanceTimers.current.forEach(clearTimeout), []);

  // Start (or resume) the chosen length. Switching lengths discards any saved progress,
  // after a confirm if answers would be lost.
  const startQuiz = (m) => {
    const switching = m !== mode;
    if (switching && answeredCount > 0 &&
      !window.confirm('Switching assessment length clears your current progress. Start fresh?')) return;
    if (switching || selectedIds.length === 0) {
      setAnswers({});
      setSelectedIds(generateSelection(assessment, askCountsFor(assessment, m)));
    }
    setMode(m);
    setSectionIdx(0);
    setShowHalftime(false);
    setHalftimeSeen(false);
    setPhase('quiz');
  };

  // Record the answer, then (after a beat so the selection registers visually) collapse the
  // card and glide to the next unanswered question — or to the nav once the section is done.
  const selectAnswer = (qid, idx) => {
    const nextAnswers = { ...answers, [qid]: idx };
    setAnswers(nextAnswers);
    const qs = quiz[sectionIdx]?.questions ?? [];
    const at = qs.findIndex(q => q.id === qid);
    const target = qs.slice(at + 1).find(q => nextAnswers[q.id] == null)
      ?? qs.find(q => nextAnswers[q.id] == null); // wrap to earlier skipped questions
    advanceTimers.current.push(setTimeout(() => {
      setCollapsedQs(prev => ({ ...prev, [qid]: true }));
      // Scroll once the collapse is mostly done, so the target isn't still shifting.
      advanceTimers.current.push(setTimeout(() => {
        if (target) {
          const el = document.getElementById(`q-${target.id}`);
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el?.focus({ preventScroll: true });
        } else {
          quizNavRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 250));
    }, 300));
  };

  const goNext = () => {
    const target = Math.min(sectionIdx + 1, quiz.length - 1);
    setSectionIdx(target);
    // Halfway moment: first time we cross into the second half of the dimensions.
    if (!halftimeSeen && target === Math.ceil(quiz.length / 2)) {
      setHalftimeSeen(true);
      setShowHalftime(true);
    }
    scrollTop();
  };
  const goBack = () => { setSectionIdx(i => Math.max(i - 1, 0)); scrollTop(); };

  // Jump to (and briefly highlight) the first unanswered question, switching section if needed.
  const goToFirstUnanswered = () => {
    for (let i = 0; i < quiz.length; i++) {
      const q = quiz[i].questions.find(q => answers[q.id] == null);
      if (!q) continue;
      setSectionIdx(i);
      setTimeout(() => {
        const el = document.getElementById(`q-${q.id}`);
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('flash-missing');
        setTimeout(() => el.classList.remove('flash-missing'), 1600);
      }, 60);
      return;
    }
  };

  const computeResults = () => {
    const dims = quiz.map(d => {
      const scored = d.questions.filter(q => answers[q.id] !== DK); // "not sure" drops out of the denominator
      const max = scored.length * 5;
      const score = scored.reduce((s, q) => s + pointsFor(q, answers[q.id]), 0);
      const has = scored.length > 0;
      return {
        key: d.key, label: d.label, dataName: d.dataName, weight: d.weight,
        score, max, skipped: d.questions.length - scored.length,
        level: has ? bandLevel(score, max) : null,
        pct: has ? score / max : null,
      };
    });
    // Overall weights only dimensions that have at least one scored answer.
    const scoredDims = dims.filter(d => d.level != null);
    const totalW = scoredDims.reduce((s, d) => s + d.weight, 0) || 1;
    const overallAvg = scoredDims.reduce((s, d) => s + d.weight * d.level, 0) / totalW;
    const overallPct = scoredDims.reduce((s, d) => s + d.weight * d.pct, 0) / totalW;
    const overallLevel = scoredDims.length ? Math.min(5, Math.max(1, Math.round(overallAvg))) : null;
    setResults({ dims, overallAvg, overallPct, overallLevel });
    setSelectedLevelIdx(overallLevel != null ? overallLevel - 1 : null);
    setExpandedLevels(overallLevel != null ? { [overallLevel - 1]: true, [overallLevel]: true } : { 0: true });
    setPhase('results');
    scrollTop();
  };

  const retake = () => {
    setAnswers({});
    setSelectedIds(generateSelection(assessment, askCountsFor(assessment, mode))); // draw a fresh random set
    setResults(null);
    setSectionIdx(0);
    setShowHalftime(false);
    setHalftimeSeen(false);
    setSelectedLevelIdx(null);
    setPhase('quiz');
    scrollTop();
  };

  const summaryText = () => {
    if (!results) return '';
    const lines = ['Security Awareness Program Maturity Assessment', ''];
    results.dims.forEach(d => lines.push(d.level != null
      ? `• ${d.label}: Level ${d.level} (${d.score}/${d.max}${d.skipped ? `, ${d.skipped} not sure` : ''})`
      : `• ${d.label}: not enough answers`));
    lines.push('', results.overallLevel != null
      ? `Overall: Level ${results.overallLevel} (${Math.round(results.overallPct * 100)}% maturity)`
      : 'Overall: not enough answers to score');
    return lines.join('\n');
  };
  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(summaryText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
  };

  const downloadPdf = () => {
    if (!results) return;
    const lines = [
      `Generated ${new Date().toLocaleDateString('en-CA')}`,
      '',
      results.overallLevel != null
        ? `Overall maturity:  Level ${results.overallLevel}  (${Math.round(results.overallPct * 100)}%)`
        : 'Overall maturity:  not enough answers',
      '',
      'By dimension:',
      ...results.dims.map(d => d.level != null
        ? `   ${d.label}:  Level ${d.level}  (${d.score}/${d.max}${d.skipped ? `, ${d.skipped} not sure` : ''})`
        : `   ${d.label}:  not enough answers`),
      '',
      'Looking to strengthen your program? I provide consulting to help',
      'organisations close these gaps. Reach out: liam@edurisk.ca',
    ];
    const blob = new Blob([buildSummaryPdf('Security Awareness Program Maturity Assessment', lines)], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'maturity-assessment.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const toggleExpand = (idx) => setExpandedLevels(prev => ({ ...prev, [idx]: !prev[idx] }));

  const handleSelectLevel = (idx) => {
    setSelectedLevelIdx(idx);
    setExpandedLevels(prev => ({ ...prev, [idx]: true, [idx + 1]: idx < 4 ? true : prev[idx + 1] }));
  };

  const getCleanLevelName = (name) => name.includes(':') ? name.split(':')[1].trim() : name;

  const pillStyle = { position: 'static', boxShadow: 'var(--shadow-sm)' };

  return (
    <div className="assessment-container" style={{ minHeight: '100vh', padding: '2rem 1.5rem', position: 'relative' }}>
      <button className="back-btn" onClick={() => navigate('/Home')} style={{ position: 'absolute', top: '2rem', left: '2rem', zIndex: 10, background: 'var(--node-fill)', border: '1px solid var(--panel-border)', padding: '0.5rem 1.2rem', borderRadius: '999px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', boxShadow: 'var(--shadow-sm)', fontFamily: 'Inter, sans-serif', transition: 'all 0.2s ease' }}>
        <ArrowLeft size={16} />
        <span>Back to Home</span>
      </button>

      <div style={{ position: 'absolute', top: '2rem', right: '2rem', zIndex: 10, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {phase !== 'intro' && (
          <button
            className="back-btn"
            onClick={() => { if (window.confirm('Restart the assessment? Your current answers will be cleared.')) retake(); }}
            style={{ position: 'static', boxShadow: 'var(--shadow-sm)', height: '40px' }}
          >
            <RotateCcw size={16} />
            <span>Restart Assessment</span>
          </button>
        )}
        <button className="theme-toggle-btn" onClick={toggleTheme} aria-label="Toggle dark mode" style={{ background: 'var(--node-fill)', border: '1px solid var(--panel-border)', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: 'var(--shadow-sm)', color: 'var(--text-primary)', transition: 'all 0.2s ease' }}>
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
      </div>

      <div className="assessment-layout" ref={layoutRef}>
        <div className="assessment-intro">
          <h2 style={{ background: 'linear-gradient(135deg, var(--text-primary) 0%, var(--text-secondary) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {assessment?.intro?.title || 'Program Maturity Assessment'}
          </h2>
          {assessment?.intro?.description && <p>{assessment.intro.description}</p>}
        </div>

        {/* INTRO */}
        {phase === 'intro' && assessment && (
          <div className="results-card" style={{ padding: '3rem 2rem' }}>
            <div className="success-icon"><ClipboardCheck size={48} /></div>
            <h2 style={{ marginBottom: '1rem' }}>Choose your assessment</h2>
            <div className="intro-instructions">
              <p>This assessment gauges how mature your organisation's security-awareness program is, across four dimensions. For each question, pick the statement that best reflects how things <em>actually</em> work at your organisation today, not how you'd like them to.</p>
              <ul>
                <li>Answer <strong>honestly and to the best of your ability</strong>. This measures your program, not you. There are no right or wrong answers.</li>
                <li>You'll go one dimension at a time. Progress saves automatically, so you can pause and resume where you left off.</li>
                <li>If you genuinely don't know, choose <strong>"I'm not sure"</strong>. That question is set aside rather than counted against you.</li>
              </ul>
            </div>
            <div className="intro-choice-grid">
              {[
                { m: 'quick', title: 'Quick check', icon: <Zap size={26} />, blurb: 'A fast pulse-check that samples every dimension.' },
                { m: 'full', title: 'Full assessment', icon: <ClipboardCheck size={26} />, blurb: 'The complete picture, covering each dimension in depth.' },
              ].map(({ m, title, icon, blurb }) => {
                const n = totalFor(assessment, m);
                const resumable = m === mode && answeredCount > 0;
                return (
                  <div key={m} className="intro-choice-card">
                    <div className="intro-choice-icon">{icon}</div>
                    <div className="intro-choice-title">{title}</div>
                    <div className="intro-choice-meta">{n} questions · about {minutesFor(n)} minutes</div>
                    <div className="intro-choice-blurb">{blurb}</div>
                    <button className="submit-btn intro-choice-btn" onClick={() => startQuiz(m)}>
                      {resumable ? `Resume (${answeredCount}/${allQuestions.length})` : 'Start'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* QUIZ: one dimension at a time */}
        {phase === 'quiz' && assessment && section && (
          showHalftime ? (
            <div className="results-card halftime-card" style={{ padding: '3rem 2rem' }}>
              <img className="halftime-img" src={`${import.meta.env.BASE_URL}mid-assessment.jpg`} alt="Office manager leaning by a cubicle holding a coffee mug" />
              <h2 style={{ marginBottom: '0.5rem' }}>Yeeeah… you're about halfway.</h2>
              <p style={{ color: 'var(--text-secondary)', maxWidth: 460, marginBottom: '0.75rem', fontSize: '1.05rem' }}>So if you could go ahead and knock out the other half, that'd be greaaat.</p>
              <p style={{ color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '2rem' }}>{answeredCount} of {allQuestions.length} done. Mmkay.</p>
              <button className="submit-btn" style={{ maxWidth: 320 }} onClick={() => { setShowHalftime(false); scrollTop(); }}>Yeah, I'll continue</button>
            </div>
          ) : (
          <>
            <div className="quiz-progress">
              <div className="quiz-progress-topline">
                <span className="quiz-progress-label">Dimension {sectionIdx + 1} of {quiz.length} · {section.label}</span>
                <span className="quiz-progress-label">{answeredCount} / {allQuestions.length}</span>
              </div>
              <div className="quiz-progress-track">
                <div className="quiz-progress-fill" style={{ width: `${(answeredCount / allQuestions.length) * 100}%` }} />
              </div>
            </div>

            <div className="quiz-dimension-group">
              <h3 className="quiz-dimension-title">{section.label}</h3>
              {section.questions.map(q => {
                const isCollapsed = !!collapsedQs[q.id] && answers[q.id] != null;
                const expand = () => setCollapsedQs(prev => ({ ...prev, [q.id]: false }));
                return (
                  <div
                    key={q.id}
                    id={`q-${q.id}`}
                    tabIndex={-1}
                    className={`question-card ${isCollapsed ? 'collapsed' : ''}`}
                    onClick={isCollapsed ? expand : undefined}
                  >
                    <button className="question-summary" onClick={expand} inert={!isCollapsed || undefined}>
                      <CheckCircle size={18} className="question-summary-check" aria-hidden="true" />
                      <span className="question-summary-main">
                        <span className="question-summary-text">{q.text}</span>
                        <span className="question-summary-answer">
                          {answers[q.id] === DK ? "I'm not sure" : q.descriptors[answers[q.id]]}
                        </span>
                      </span>
                      <ChevronDown size={16} className="question-summary-chevron" aria-hidden="true" />
                    </button>
                    <div className="question-full" inert={isCollapsed || undefined}>
                      <div className="question-full-inner">
                        {q.factor && <span className="question-factor">{q.factor}</span>}
                        <div className="question-text">{q.text}</div>
                        <div className="options-grid descriptors">
                          {q.descriptors.map((desc, idx) => (
                            <button
                              key={idx}
                              className={`option-btn option-row ${answers[q.id] === idx ? 'selected' : ''}`}
                              onClick={() => selectAnswer(q.id, idx)}
                            >
                              <span className="option-radio" aria-hidden="true" />
                              <span className="option-row-text">{desc}</span>
                            </button>
                          ))}
                          <button
                            className={`option-dk ${answers[q.id] === DK ? 'selected' : ''}`}
                            onClick={() => selectAnswer(q.id, DK)}
                          >
                            I'm not sure
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="quiz-nav" ref={quizNavRef}>
              <button className="quiz-nav-btn" onClick={goBack} disabled={sectionIdx === 0}>
                <ArrowLeft size={16} /> Back
              </button>
              {!isLastSection ? (
                <button className="submit-btn quiz-nav-next" onClick={sectionLeft > 0 ? goToFirstUnanswered : goNext}>
                  {sectionLeft > 0 ? `Answer all (${sectionLeft} left)` : <>Next dimension <ArrowRight size={16} style={{ verticalAlign: 'middle' }} /></>}
                </button>
              ) : (
                <button className="submit-btn quiz-nav-next" onClick={allAnswered ? computeResults : goToFirstUnanswered}>
                  {allAnswered ? 'See My Results' : `Answer all (${allQuestions.length - answeredCount} left)`}
                </button>
              )}
            </div>
          </>
          )
        )}

        {/* RESULTS: animated radar + overall, dimension cards, export */}
        {phase === 'results' && results && (
          <>
            <div className="results-hero">
              <RadarChart dims={results.dims} revealed={revealed} />
              <div className="results-hero-overall">
                {results.overallLevel != null ? (
                  <>
                    <div className="results-overall-pct">{countPct}<span>%</span></div>
                    <div className="results-overall-sub">overall maturity</div>
                    {maturityLevels.length > 0 && (
                      <>
                        <div className="results-overall-level">Level {results.overallLevel}: {getCleanLevelName(maturityLevels[results.overallLevel - 1].name)}</div>
                        <div className="results-overall-framing">
                          {results.overallLevel < 5
                            ? `One step from ${getCleanLevelName(maturityLevels[results.overallLevel].name)}.`
                            : `You've reached the top tier. Focus on sustainment.`}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <div className="results-overall-pct">N/A</div>
                    <div className="results-overall-sub">overall maturity</div>
                    <div className="results-overall-framing">Not enough answered questions to produce an overall level. Retake and answer a few more.</div>
                  </>
                )}
              </div>
            </div>

            <div className="results-summary">
              {results.dims.map(d => (
                <div key={d.key} className={`dim-result-card level-${d.level || 0}`}>
                  <div className="dim-result-label">{d.label}</div>
                  {d.level != null ? (
                    <>
                      <div className="dim-result-level">Level {d.level}</div>
                      <div className="dim-result-bar"><div className="dim-result-bar-fill" style={{ width: revealed ? `${d.pct * 100}%` : '0%' }} /></div>
                      <div className="dim-result-score">{d.score} / {d.max} pts{d.skipped ? ` · ${d.skipped} not sure` : ''}</div>
                    </>
                  ) : (
                    <>
                      <div className="dim-result-level" style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>N/A</div>
                      <div className="dim-result-score">Not enough answers</div>
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="results-actions">
              <button className="back-btn" onClick={copySummary} style={pillStyle}>
                <Copy size={16} /><span>{copied ? 'Copied!' : 'Copy summary'}</span>
              </button>
              <button className="back-btn" onClick={downloadPdf} style={pillStyle}>
                <Download size={16} /><span>Save as PDF</span>
              </button>
              <button className="back-btn" onClick={retake} style={pillStyle}>
                <RotateCcw size={16} /><span>Retake</span>
              </button>
            </div>
          </>
        )}

        {/* Self-Assessment Banner (overall result) */}
        {phase === 'results' && maturityLevels.length > 0 && selectedLevelIdx !== null && (
          <div className="self-assessment-banner" style={{ background: 'linear-gradient(135deg, var(--accent-color), var(--secondary-accent))' }}>
            <div className="self-assessment-info">
              <h3>Overall: {getCleanLevelName(maturityLevels[selectedLevelIdx].name)}</h3>
              {selectedLevelIdx < 4 ? (
                <p style={{ color: 'rgba(255, 255, 255, 0.85)' }}>
                  Weighted across dimensions you are at Level {selectedLevelIdx + 1}. To reach <strong>{getCleanLevelName(maturityLevels[selectedLevelIdx + 1].name)}</strong>, focus on the Level {selectedLevelIdx + 2} action items below.
                </p>
              ) : (
                <p style={{ color: 'rgba(255, 255, 255, 0.9)' }}>Congratulations! Your program is fully optimized. Focus on data-driven sustainment and adaptive learning.</p>
              )}
            </div>
            <div className="self-assessment-result">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Award size={24} style={{ color: '#FCD34D' }} />
                <span className="self-assessment-badge">Level {selectedLevelIdx + 1}</span>
              </div>
            </div>
          </div>
        )}

        {/* Timeline Roadmap */}
        {phase === 'results' && maturityLevels.length > 0 && (
          <div className="timeline-roadmap">
            <div className="timeline-line-container">
              <div className="timeline-line-highlight" style={{ height: selectedLevelIdx !== null ? `${(selectedLevelIdx / (maturityLevels.length - 1)) * 100}%` : '0%' }} />
            </div>

            {maturityLevels.map((level, idx) => {
              const isOpen = !!expandedLevels[idx];
              const isSelected = selectedLevelIdx === idx;
              const isPassed = selectedLevelIdx !== null && idx < selectedLevelIdx;
              return (
                <div key={level.name} className={`timeline-item ${isSelected ? 'active-level' : ''} ${isPassed ? 'passed-level' : ''}`}>
                  <div className="timeline-badge">
                    {isPassed ? <CheckCircle size={16} style={{ color: 'white' }} /> : idx + 1}
                  </div>
                  <div className="timeline-panel" onClick={() => toggleExpand(idx)}>
                    <div className="timeline-panel-header">
                      <div className="timeline-level-name">{level.name}</div>
                      <div className="timeline-panel-actions" onClick={(e) => e.stopPropagation()}>
                        {isSelected ? <span className="level-status-tag current">You are here</span>
                          : isPassed ? <span className="level-status-tag completed">Achieved</span> : null}
                        <button className="btn-select-level" onClick={() => handleSelectLevel(idx)} style={{ backgroundColor: isSelected ? 'var(--accent-color)' : '', color: isSelected ? 'white' : '', border: isSelected ? '1px solid var(--accent-color)' : '' }}>
                          {isSelected ? 'Selected' : 'Set Active'}
                        </button>
                        <span className={`toggle-arrow ${isOpen ? 'expanded' : ''}`} onClick={() => toggleExpand(idx)}>▼</span>
                      </div>
                    </div>
                    {isOpen && (
                      <div className="timeline-panel-body" onClick={(e) => e.stopPropagation()}>
                        <div className="level-tldr"><strong>TL;DR:</strong> {level.tldr}</div>
                        <div className="level-description">{level.description}</div>
                        <div className="level-section-grid">
                          <div>
                            <h4 className="level-section-title">Key Transition Action Items</h4>
                            <ul className="level-action-items">
                              {level.actionItems && level.actionItems.map((item, i) => <li key={i}>{item}</li>)}
                            </ul>
                          </div>
                          <div>
                            <h4 className="level-section-title">Critical KPIs to Track</h4>
                            <div className="level-kpis">
                              {level.kpis && level.kpis.map((kpi, i) => <span key={i} className="level-kpi-badge">{kpi}</span>)}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {phase === 'results' && (
          <p className="results-cta">
            Looking to strengthen your program? I provide consulting to help organisations close these gaps. Reach out at <a href="mailto:liam@edurisk.ca?subject=Security%20awareness%20program%20consulting">liam@edurisk.ca</a>.
          </p>
        )}
      </div>
    </div>
  );
}

export default AssessmentScreen;
