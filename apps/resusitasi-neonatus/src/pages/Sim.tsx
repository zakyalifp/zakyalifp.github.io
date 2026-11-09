import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSim } from '../store/sim';
import { usePrefs } from '../store/prefs';
import { getScenario } from '../scenarios';
import { observe } from '../engine/observe';
import { getHint } from '../engine/hints';
import type { ActionDef } from '../engine/actions';
import type { Params, SimState } from '../engine/state';
import { Monitor } from '../components/Monitor';
import { Baby, BabyStatus } from '../components/Baby';
import { ActionPanel, BusyTasks } from '../components/ActionPanel';
import { ParamDialog } from '../components/ParamDialog';
import { Stethoscope } from '../components/Stethoscope';
import { Toasts } from '../components/Toasts';
import { href, navigate } from '../router';
import { clock, cx, num } from '../lib/format';
import { COMPRESSIONS, EPINEPHRINE, SIM } from '../clinical/guidelines';
import type { SimAudio } from '../audio/audio';

import { SESSION_KEY } from '../store/sim';

export function SimPage({ id }: { id: string }) {
  const { scenario, state, mode, speed, paused, toasts } = useSim();
  const { act, step, setSpeed, setPaused, dismissToast, finish } = useSim();
  const debrief = useSim((s) => s.debrief);
  const soundOn = usePrefs((p) => p.soundOn);
  const volume = usePrefs((p) => p.volume);
  const setPrefs = usePrefs((p) => p.set);
  const [dialog, setDialog] = useState<ActionDef | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [restored, setRestored] = useState(false);
  const audioRef = useRef<SimAudio | null>(null);
  const finishedRef = useRef(false);
  const justFinished = useRef(false);
  if (state) justFinished.current = true;

  // ---- pulihkan sesi bila halaman dimuat ulang (sekali saat halaman dibuka) ----
  useEffect(() => {
    if (restored) return;
    setRestored(true);
    if (useSim.getState().state) return;
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as { id: string; mode: 'belajar' | 'ujian'; state: SimState };
      const sc = getScenario(saved.id);
      if (sc && saved.id === id && saved.state.phase !== 'ended') {
        useSim.setState({ scenario: sc, mode: saved.mode, state: saved.state, paused: saved.mode === 'belajar', speed: 1, toasts: [] });
      }
    } catch {
      /* abaikan */
    }
  }, [id, state, restored]);
  useEffect(() => {
    if (!state || !scenario) return;
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id: scenario.id, mode, state }));
    } catch {
      /* abaikan */
    }
  }, [state, scenario, mode]);

  // ---- loop waktu ----
  const running = !!state && state.phase === 'running' && !paused;
  useEffect(() => {
    if (!running) return;
    const iv = window.setInterval(() => step(1), (SIM.TICK_S * 1000) / speed);
    return () => window.clearInterval(iv);
  }, [running, speed, step]);

  // ---- selesai → debriefing ----
  useEffect(() => {
    if (!state && debrief && !finishedRef.current && restored && useSim.getState().debriefScenario?.id === id && justFinished.current) {
      finishedRef.current = true;
      navigate({ name: 'debrief' });
    }
  }, [state, debrief, restored]);

  // ---- hook pengujian otomatis (hanya untuk browser yang dikendalikan Playwright) ----
  useEffect(() => {
    if (!navigator.webdriver) return;
    (window as unknown as { __nrsim?: unknown }).__nrsim = {
      advance: (n: number) => step(n),
      t: () => useSim.getState().state?.t ?? null,
    };
  }, [step]);

  // ---- audio (dimuat lazy) ----
  useEffect(() => {
    let alive = true;
    if (soundOn && !audioRef.current) {
      void import('../audio/audio').then((m) => {
        if (!alive) return;
        audioRef.current = m.getAudio();
        audioRef.current.setVolume(volume);
        audioRef.current.setEnabled(true);
      });
    }
    audioRef.current?.setEnabled(soundOn);
    audioRef.current?.setVolume(volume);
    return () => {
      alive = false;
    };
  }, [soundOn, volume]);
  useEffect(() => () => audioRef.current?.setEnabled(false), []);

  const obs = useMemo(() => (state && scenario ? observe(state, scenario) : null), [state, scenario]);
  const hint = useMemo(() => (state && scenario && mode === 'belajar' ? getHint(state, scenario) : null), [state, scenario, mode]);

  // tangis, alarm
  useEffect(() => {
    if (!obs || !soundOn || paused) return;
    if (obs.crying) audioRef.current?.cry();
    if (obs.alarms.length) audioRef.current?.alarm();
  }, [obs, soundOn, paused]);

  // metronom kompresi: satu-dan-dua-dan-tiga-dan-napas (siklus 2 detik pada 1×)
  const [beat, setBeat] = useState(-1);
  const compressing = !!state?.compressions.active;
  useEffect(() => {
    if (!compressing || paused) {
      setBeat(-1);
      return;
    }
    const perEvent = 60000 / COMPRESSIONS.EVENTS_PER_MIN / speed;
    let i = 0;
    const names = ['satu', 'dua', 'tiga', 'napas'] as const;
    const fire = () => {
      const k = i % (COMPRESSIONS.RATIO_COMPRESSIONS + COMPRESSIONS.RATIO_BREATHS);
      setBeat(k);
      if (speed === 1) audioRef.current?.metronome(names[k]);
      i++;
    };
    fire();
    const iv = window.setInterval(fire, perEvent);
    return () => window.clearInterval(iv);
  }, [compressing, paused, speed]);

  const onBeat = useCallback(() => {
    const o = latestObs.current;
    if (o && o.spo2Display !== null) audioRef.current?.pulseBeep(o.spo2Display);
  }, []);
  const latestObs = useRef(obs);
  latestObs.current = obs;

  // pengumuman aria-live tanda vital (tiap 15 dtk sim / saat alarm berubah)
  const [announce, setAnnounce] = useState('');
  const lastAnn = useRef({ t: -999, alarms: '' });
  useEffect(() => {
    if (!obs || !state || state.phase !== 'running') return;
    const alarms = obs.alarms.join(', ');
    if (state.t - lastAnn.current.t >= 15 || alarms !== lastAnn.current.alarms) {
      lastAnn.current = { t: state.t, alarms };
      const parts = [`Menit ${clock(state.t)}`];
      parts.push(obs.hrDisplay !== null ? `HR ${obs.hrDisplay}` : 'HR belum terbaca');
      if (obs.spo2Display !== null) parts.push(`SpO2 ${obs.spo2Display}`);
      parts.push(`napas ${obs.breathing}`);
      if (alarms) parts.push(`alarm: ${alarms}`);
      setAnnounce(parts.join('. '));
    }
  }, [obs, state]);

  if (!state || !scenario || scenario.id !== id) {
    if (!restored) return null;
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-xl font-bold">Tidak ada simulasi aktif</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">Mulai skenario dari halaman briefing.</p>
        <a href={href({ name: 'briefing', id })} className="btn-primary mt-4 inline-flex">
          Ke briefing skenario
        </a>
      </div>
    );
  }

  const doAction = (a: ActionDef) => {
    const avail = a.available(state, scenario);
    if (avail !== true) {
      useSim.setState({ toasts: [...toasts, { id: Date.now(), kind: 'info' as const, text: avail }].slice(-4) });
      return;
    }
    if (a.id === 'auscultate' || (a.params && a.params(state, scenario).length)) setDialog(a);
    else act(a.id);
  };
  const submit = (p: Params) => {
    if (!dialog) return;
    const r = act(dialog.id, p);
    if (r.ok || !r.message) setDialog(null);
  };

  const prebirth = state.phase === 'prebirth';
  const learn = mode === 'belajar';
  const w = scenario.hidden.weightKg;

  return (
    <div className="mx-auto max-w-7xl px-3 pb-28 pt-3 sm:px-4">
      <p className="sr-only" aria-live="polite" data-testid="vitals-live">
        {announce}
      </p>
      {/* bar atas */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="mr-auto min-w-0">
          <h1 className="truncate text-base font-bold text-slate-900 sm:text-lg dark:text-white">
            #{scenario.number} {scenario.title}
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            <span className={cx('mr-2 rounded px-1.5 py-0.5 font-semibold', learn ? 'bg-sky-100 text-sky-900 dark:bg-sky-900 dark:text-sky-100' : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900')} data-testid="mode-badge">
              {learn ? 'Mode Belajar' : 'Mode Ujian'}
            </span>
            {scenario.setting} · BB perkiraan <strong>{num(w, 2)} kg</strong> · usia gestasi {scenario.hidden.gaWeeks} mgg
          </p>
        </div>
        {learn && !prebirth && (
          <div className="flex items-center gap-1" role="group" aria-label="Kontrol waktu">
            <button type="button" className="ctrl" onClick={() => setPaused(!paused)} aria-pressed={paused} data-testid="pause">
              {paused ? '▶ Lanjut' : '❚❚ Jeda'}
            </button>
            {SIM.SPEEDS_LEARN.map((sp) => (
              <button key={sp} type="button" className={cx('ctrl', speed === sp && 'ctrl-on')} aria-pressed={speed === sp} onClick={() => setSpeed(sp)} data-testid={`speed-${sp}`}>
                {sp}×
              </button>
            ))}
          </div>
        )}
        <button type="button" className="ctrl" onClick={() => setPrefs({ soundOn: !soundOn })} aria-pressed={soundOn} aria-label={soundOn ? 'Matikan suara' : 'Nyalakan suara'} data-testid="sound-toggle">
          {soundOn ? '🔊' : '🔇'}
        </button>
        {soundOn && (
          <input type="range" min={0} max={1} step={0.1} value={volume} onChange={(e) => setPrefs({ volume: Number(e.target.value) })} aria-label="Volume" className="w-20 accent-sky-700" />
        )}
        <button type="button" className="ctrl bg-red-50 text-red-900 ring-red-300 dark:bg-red-950 dark:text-red-100" onClick={() => setConfirmEnd(true)} data-testid="end-scenario">
          Akhiri
        </button>
      </div>

      {prebirth ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.1fr] [&>*]:min-w-0">
          <div className="space-y-3 rounded-2xl bg-white p-5 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
            <h2 className="font-bold text-slate-900 dark:text-white">Sebelum bayi lahir</h2>
            <p className="text-slate-800 dark:text-slate-200">{scenario.vignette}</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Tim saat ini: <strong>{state.staff}</strong> orang. Lakukan penilaian risiko, briefing, dan checklist alat; panggil bantuan bila perlu. Tekan “Bayi lahir” untuk memulai jam.
            </p>
            {hint && <HintCard text={hint.text} />}
            <LogPanel s={state} />
          </div>
          <ActionPanel s={state} sc={scenario} suggested={hint?.actions ?? []} showHints={learn} onAction={doAction} />
        </div>
      ) : (
        obs && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] [&>*]:min-w-0">
            <div className="space-y-3">
              <Monitor obs={obs} t={state.t} speed={speed} paused={paused} onBeat={onBeat} />
              <div className="grid grid-cols-1 items-start gap-3 rounded-2xl sm:grid-cols-[auto_1fr] bg-white p-3 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
                <Baby obs={obs} s={state} speed={speed} paused={paused} />
                <div className="space-y-2">
                  <BabyStatus obs={obs} />
                  {compressing && <Metronome beat={beat} />}
                  <BusyTasks s={state} />
                </div>
              </div>
              {hint && <HintCard text={hint.text} />}
              <details className="rounded-2xl bg-white p-3 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700" open={false}>
                <summary className="cursor-pointer text-sm font-semibold">Catatan tindakan & temuan ({state.log.length})</summary>
                <LogPanel s={state} />
              </details>
            </div>
            <div className="lg:sticky lg:top-16 lg:self-start">
              <ActionPanel s={state} sc={scenario} suggested={hint?.actions ?? []} showHints={learn} onAction={doAction} />
            </div>
          </div>
        )
      )}

      {dialog && dialog.id === 'auscultate' && (
        <Stethoscope
          hr={state.hr}
          onBeat={() => soundOn && audioRef.current?.heartbeat()}
          onClose={() => setDialog(null)}
          onSubmit={(v) => {
            act('auscultate', v === null ? {} : { userHr: v });
            setDialog(null);
          }}
        />
      )}
      {dialog && dialog.id !== 'auscultate' && (
        <ParamDialog
          action={dialog}
          defs={dialog.params ? dialog.params(state, scenario) : []}
          showRationale={learn}
          context={
            ['epinephrine', 'nacl', 'd10'].includes(dialog.id) ? (
              <p className="rounded-lg bg-sky-50 px-3 py-2 text-sky-950 dark:bg-sky-950 dark:text-sky-100">
                BB perkiraan <strong>{num(w, 2)} kg</strong>
                {dialog.id === 'epinephrine' && (
                  <>
                    {' '}
                    · sediaan epinefrin <strong>{num(EPINEPHRINE.CONCENTRATION_MG_PER_ML, 2)} mg/mL</strong>. Hitung sendiri dosis (mg) dan volume (mL).
                  </>
                )}
              </p>
            ) : undefined
          }
          onClose={() => setDialog(null)}
          onSubmit={submit}
        />
      )}
      {confirmEnd && (
        <ConfirmEnd
          onCancel={() => setConfirmEnd(false)}
          onConfirm={() => {
            setConfirmEnd(false);
            finish();
          }}
        />
      )}
      {learn && <Toasts toasts={toasts} onDismiss={dismissToast} />}
      {!learn && toasts.filter((t) => t.kind === 'info').length > 0 && <Toasts toasts={toasts.filter((t) => t.kind === 'info')} onDismiss={dismissToast} />}
    </div>
  );
}

function HintCard({ text }: { text: string }) {
  return (
    <div className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-950 ring-1 ring-amber-300 dark:bg-amber-950/40 dark:text-amber-50 dark:ring-amber-700" data-testid="hint">
      <strong>Petunjuk: </strong>
      {text}
    </div>
  );
}

function Metronome({ beat }: { beat: number }) {
  const labels = ['Satu', 'dua', 'tiga', 'NAPAS'];
  return (
    <div className="flex gap-1" aria-label="Metronom kompresi" data-testid="metronome">
      {labels.map((l, i) => (
        <span key={l} className={cx('flex-1 rounded-lg py-1.5 text-center text-xs font-bold transition', beat === i ? (i === 3 ? 'bg-sky-600 text-white' : 'bg-red-600 text-white') : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400')}>
          {l}
        </span>
      ))}
    </div>
  );
}

function LogPanel({ s }: { s: SimState }) {
  const items = [...s.log].reverse().slice(0, 60);
  return (
    <ol className="mt-2 max-h-64 space-y-1 overflow-y-auto text-sm" data-testid="log">
      {items.map((l, i) => (
        <li key={i} className={cx('flex gap-2', l.action.endsWith(':note') ? 'text-slate-600 dark:text-slate-400' : 'font-medium text-slate-900 dark:text-slate-100')}>
          <span className="w-12 shrink-0 font-mono text-xs tabular-nums text-slate-500">{l.t < 0 ? 'pra' : clock(l.t)}</span>
          <span>{l.action.endsWith(':note') ? `↳ ${l.detail}` : l.label}</span>
        </li>
      ))}
    </ol>
  );
}

function ConfirmEnd({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog ref={ref} onCancel={(e) => { e.preventDefault(); onCancel(); }} className="m-auto w-[min(26rem,calc(100vw-1.5rem))] rounded-2xl bg-white p-5 text-slate-900 shadow-2xl backdrop:bg-black/50 dark:bg-slate-900 dark:text-slate-100" aria-labelledby="end-title">
      <h2 id="end-title" className="text-lg font-bold">Akhiri skenario?</h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Kondisi bayi saat ini akan dinilai dan Anda masuk ke debriefing.</p>
      <div className="mt-4 flex gap-3">
        <button type="button" className="btn-secondary flex-1" onClick={onCancel}>
          Lanjutkan
        </button>
        <button type="button" className="btn-primary flex-1" onClick={onConfirm} data-testid="confirm-end">
          Akhiri & nilai
        </button>
      </div>
    </dialog>
  );
}
