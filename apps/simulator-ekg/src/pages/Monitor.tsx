/** Mode 4 — Monitor Irama Dinamis (strip real-time dari synthesizer dengan perubahan irama). */
import { useEffect, useMemo, useRef, useState } from 'react';
import { MONITOR_ACTION_LABEL, MONITOR_RHYTHM_LABEL, MONITOR_SCENARIOS, type MonitorAction, type MonitorRhythm, type MonitorScenario } from '../cases/monitor';
import { createEcgStream } from '../ekg/synth/stream';
import { EcgRhythmMonitor } from '../ekg/react/EcgRhythmMonitor';
import { useSessionRunner } from '../hooks/useSession';
import { LEVEL_LABEL } from '../cases/diagnoses';
import type { ItemResult, StepResult } from '../scoring/grade';
import { SCORING } from '../clinical/ecg-criteria';
import { cx } from '../lib/format';

declare global {
  interface Window {
    __ekgMonitor?: { answer: MonitorRhythm; action: MonitorAction; phase: string };
  }
}

export default function Monitor() {
  const [sc, setSc] = useState<MonitorScenario | null>(null);
  if (sc) return <Runner sc={sc} onExit={() => setSc(null)} />;
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-2xl font-bold">Monitor Irama Dinamis</h1>
      <p className="mt-1 text-slate-700 dark:text-slate-300">Strip irama sadapan II real-time (sintetis). Saat irama berubah, kenali irama baru dan pilih respons secepatnya (target ≤{SCORING.MONITOR_RESPONSE_S} detik).</p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2" data-testid="monitor-list">
        {MONITOR_SCENARIOS.map((s) => (
          <li key={s.id}>
            <button type="button" className="card block h-full w-full text-left hover:ring-sky-500" onClick={() => setSc(s)} data-testid={`monitor-${s.id}`}>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                {LEVEL_LABEL[s.level]} · {s.events.length} perubahan irama
              </span>
              <h2 className="font-bold">{s.title}</h2>
              <p className="mt-1 text-sm">{s.intro}</p>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Runner({ sc, onExit }: { sc: MonitorScenario; onExit: () => void }) {
  const stream = useMemo(() => createEcgStream({ rhythm: sc.baseline.rhythm, morph: sc.baseline.morph, seed: sc.id, fs: 250, noise: { emg: 0.006, wander: 0.02 } }), [sc]);
  const runner = useSessionRunner('monitor', `Monitor irama: ${sc.title}`, sc.level);
  const [k, setK] = useState(-1); // −1 = baseline
  const [phase, setPhase] = useState<'baseline' | 'event' | 'feedback'>('baseline');
  const [rh, setRh] = useState<MonitorRhythm | ''>('');
  const [act, setAct] = useState<MonitorAction | ''>('');
  const [context, setContext] = useState(sc.baseline.context);
  const [hr, setHr] = useState(0);
  const [beep, setBeep] = useState(false);
  const [paused, setPaused] = useState(false);
  const [fb, setFb] = useState<{ ok: boolean; text: string } | null>(null);
  const tEvent = useRef(0);
  const beats = useRef<number[]>([]);
  const audio = useRef<AudioContext | null>(null);
  const results = useRef<ItemResult[]>([]);
  const ev = k >= 0 ? sc.events[k] : null;

  // Laju dari QRS 6 detik terakhir
  useEffect(() => {
    const id = window.setInterval(() => {
      const now = stream.time;
      beats.current = beats.current.filter((t) => t > now - 6);
      const b = beats.current;
      setHr(b.length >= 2 ? Math.round((60 * (b.length - 1)) / (b[b.length - 1] - b[0])) : 0);
    }, 500);
    return () => clearInterval(id);
  }, [stream]);
  // Jadwal perubahan irama berikutnya
  useEffect(() => {
    if (phase !== 'baseline' && phase !== 'feedback') return;
    if (paused) return;
    const nextK = k + 1;
    if (nextK >= sc.events.length) return;
    const delay = phase === 'baseline' ? 8000 : 6000;
    const id = window.setTimeout(() => {
      const e = sc.events[nextK];
      stream.setRhythm(e.rhythm, e.morph ?? sc.baseline.morph ?? {});
      setK(nextK);
      setContext(e.context);
      setRh('');
      setAct('');
      setFb(null);
      setPhase('event');
      tEvent.current = Date.now();
    }, delay);
    return () => clearTimeout(id);
  }, [phase, k, sc, stream, paused]);
  useEffect(() => {
    if (ev) window.__ekgMonitor = { answer: ev.answer, action: ev.action, phase };
  }, [ev, phase]);

  const onBeat = (t: number) => {
    beats.current.push(t);
    if (beep) {
      try {
        audio.current ??= new AudioContext();
        const a = audio.current;
        const o = a.createOscillator();
        const g = a.createGain();
        o.frequency.value = 880;
        g.gain.value = 0.05;
        o.connect(g).connect(a.destination);
        o.start();
        o.stop(a.currentTime + 0.06);
      } catch {
        /* abaikan */
      }
    }
  };
  const submit = () => {
    if (!ev) return;
    const dt = (Date.now() - tEvent.current) / 1000;
    const late = dt > SCORING.MONITOR_RESPONSE_S;
    const rOk = rh === ev.answer;
    const aOk = act === ev.action;
    const crit = !rOk && ['vf', 'vt', 'asistol', 'torsades'].includes(ev.answer);
    const steps: StepResult[] = [
      { step: 'rhythm-id', label: 'Irama', ok: rOk, credit: rOk ? (late ? 0.5 : 1) : 0, user: rh ? MONITOR_RHYTHM_LABEL[rh] : 'kosong', truth: MONITOR_RHYTHM_LABEL[ev.answer], feedback: rOk ? (late ? `Tepat tetapi lambat (${Math.round(dt)} dtk).` : `Tepat (${Math.round(dt)} dtk).`) : `Irama: ${MONITOR_RHYTHM_LABEL[ev.answer]}.`, competency: 'irama', weight: 2, critical: crit },
      { step: 'action', label: 'Respons', ok: aOk, credit: aOk ? (late ? 0.5 : 1) : 0, user: act ? MONITOR_ACTION_LABEL[act] : 'kosong', truth: MONITOR_ACTION_LABEL[ev.action], feedback: aOk ? 'Respons tepat.' : `Respons: ${MONITOR_ACTION_LABEL[ev.action]}.`, competency: 'tatalaksana', weight: 2, critical: !aOk && (ev.action === 'defibrilasi' || ev.action === 'rjp-epinefrin') },
    ];
    const score = steps.reduce((a, s) => a + s.credit * s.weight, 0) / 4;
    const item: ItemResult = { caseId: `${sc.id}-${k}`, dx: ev.answer === 'vt' ? 'vt-mono' : ev.answer === 'asistol' ? 'asystole' : ev.answer === 'pvc' ? 'bigeminy' : ev.answer === 'sinus' ? 'sinus-normal' : ev.answer, kind: 'sintetis', mode: 'monitor', score, correctDx: rOk, steps, criticalErrors: steps.filter((s) => s.critical).map((s) => `${sc.title}: ${s.feedback}`), timeS: Math.round(dt) };
    results.current = [...results.current, item];
    runner.record(item);
    setFb({ ok: rOk && aOk, text: `${steps[0].feedback} ${steps[1].feedback}` });
    setPhase('feedback');
    if (k + 1 >= sc.events.length) window.setTimeout(() => runner.finish(results.current), 2500);
  };
  return (
    <div className="mx-auto max-w-6xl px-4 py-4" data-testid="monitor-runner">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <button type="button" className="ctrl" onClick={onExit}>
          ← Skenario
        </button>
        <h1 className="text-lg font-bold">{sc.title}</h1>
        <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-bold text-violet-900 ring-1 ring-violet-300 dark:bg-violet-950 dark:text-violet-100">◆ Sintetis</span>
        <span className="text-sm text-slate-600 dark:text-slate-400">
          Perubahan {Math.max(0, k + 1)}/{sc.events.length}
        </span>
      </div>
      <div className="rounded-2xl bg-[#05080d] p-3 text-white">
        <div className="mb-2 flex flex-wrap items-baseline gap-4 font-mono">
          <span className="text-sm text-slate-300">{context}</span>
          <span className="ml-auto text-[#3ee07a]">
            HR <strong className="text-4xl tabular-nums" data-testid="monitor-hr">{hr || '--'}</strong>
          </span>
        </div>
        <EcgRhythmMonitor stream={stream} paused={paused} onBeat={onBeat} height={200} windowS={6} />
        <div className="mt-2 flex gap-2">
          <button type="button" className="rounded-lg bg-white/10 px-3 py-2 text-sm" onClick={() => setPaused((p) => !p)} data-testid="monitor-pause">
            {paused ? '▶ Lanjut' : '❚❚ Jeda'}
          </button>
          <label className="flex items-center gap-1 rounded-lg bg-white/10 px-3 py-2 text-sm">
            <input type="checkbox" checked={beep} onChange={(e) => setBeep(e.target.checked)} /> Bunyi QRS
          </label>
        </div>
      </div>
      <div className="card mt-3">
        {phase === 'baseline' && <p role="status">Amati irama dasar. Perubahan pertama segera terjadi…</p>}
        {phase === 'feedback' && fb && (
          <p className={cx('rounded-xl p-2', fb.ok ? 'bg-emerald-50 dark:bg-emerald-950' : 'bg-amber-50 dark:bg-amber-950')} role="status" data-testid="monitor-feedback">
            {fb.ok ? '✓ ' : '! '}
            {fb.text} {k + 1 < sc.events.length ? 'Pantau terus…' : 'Skenario selesai — menuju debriefing…'}
          </p>
        )}
        {phase === 'event' && (
          <div className="grid gap-3 md:grid-cols-2">
            <fieldset>
              <legend className="label">Irama sekarang?</legend>
              <div className="grid grid-cols-2 gap-1.5">
                {(Object.keys(MONITOR_RHYTHM_LABEL) as MonitorRhythm[]).map((r) => (
                  <button key={r} type="button" className={cx('opt !min-h-10', rh === r && 'opt-on')} aria-pressed={rh === r} onClick={() => setRh(r)} data-testid={`mr-${r}`}>
                    {MONITOR_RHYTHM_LABEL[r]}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="label">Respons?</legend>
              <div className="grid gap-1.5">
                {(Object.keys(MONITOR_ACTION_LABEL) as MonitorAction[]).map((a) => (
                  <button key={a} type="button" className={cx('opt !min-h-10', act === a && 'opt-on')} aria-pressed={act === a} onClick={() => setAct(a)} data-testid={`ma-${a}`}>
                    {MONITOR_ACTION_LABEL[a]}
                  </button>
                ))}
              </div>
              <button type="button" className="btn-primary mt-2 w-full" disabled={!rh || !act} onClick={submit} data-testid="monitor-submit">
                Kunci respons
              </button>
            </fieldset>
          </div>
        )}
      </div>
    </div>
  );
}
