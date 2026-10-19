import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FolderOpen, X, ArrowLeft, Camera, CameraOff, Mic, MicOff, Loader2, LogOut, PhoneOff, Radio, Info } from 'lucide-react';
import { api } from '../../api/client';
import type { ElSession, ElJoin } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../i18n/LanguageContext';
import ConfirmDialog from '../../composants/ui/ConfirmDialog';
import { StatusPill, fmtRange } from '../../composants/elearning/shared';
import ResourcesPanel from '../../composants/elearning/ResourcesPanel';

// Minimal typing for the Jitsi external API we use.
interface JitsiApi {
  addListener(event: string, fn: (...a: unknown[]) => void): void;
  executeCommand(cmd: string, ...args: unknown[]): void;
  dispose(): void;
}
declare global {
  interface Window { JitsiMeetExternalAPI?: new (domain: string, options: Record<string, unknown>) => JitsiApi }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.JitsiMeetExternalAPI && document.querySelector(`script[data-jitsi="${src}"]`)) return resolve();
    const el = document.createElement('script');
    el.src = src; el.async = true; el.dataset.jitsi = src;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error('Could not load the video service. Check your connection or ask your administrator.'));
    document.head.appendChild(el);
  });
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="flex-1 overflow-y-auto flex items-center justify-center p-4">{children}</div>;
}
function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 text-center space-y-4">{children}</div>;
}

type Phase = 'loading' | 'waiting' | 'prejoin' | 'joining' | 'inclass' | 'left' | 'ended' | 'cancelled' | 'error';

export default function Classroom() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const { lang } = useLanguage();
  const fr = lang === 'fr';
  const nav = useNavigate();
  const isTeacher = user?.role === 'teacher';
  const back = isTeacher ? '/teacher/e-learning' : '/student/e-learning';

  const [session, setSession] = useState<ElSession | null>(null);
  const [phase, setPhase] = useState<Phase>('loading');
  const [error, setError] = useState('');
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [mediaError, setMediaError] = useState('');
  const [level, setLevel] = useState(0);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [starting, setStarting] = useState(false);
  const [showMaterials, setShowMaterials] = useState(false);

  const previewRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const jitsiRef = useRef<JitsiApi | null>(null);
  const joinRef = useRef<ElJoin | null>(null);

  // ── Load + poll the session until it's live ──────────────────────────────
  const refresh = useCallback(async () => {
    try {
      const s = await api.elSession(id);
      setSession(s);
      setPhase(p => {
        if (p === 'inclass' || p === 'joining' || p === 'left') return p;
        if (s.status === 'live') return p === 'prejoin' ? p : 'prejoin';
        if (s.status === 'ended') return 'ended';
        if (s.status === 'cancelled') return 'cancelled';
        return 'waiting';
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load'); setPhase('error');
    }
  }, [id]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    if (phase !== 'waiting') return;
    const i = setInterval(refresh, 5000);
    return () => clearInterval(i);
  }, [phase, refresh]);

  // ── Camera / mic test on the pre-join screen ───────────────────────────────
  const stopPreview = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    if (phase !== 'prejoin') return;
    let cancelled = false;
    let raf = 0;
    let ctx: AudioContext | null = null;
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) { setMediaError(fr ? 'Votre navigateur ne permet pas l’accès à la caméra/micro (HTTPS requis).' : 'Camera/microphone access is not available (HTTPS is required).'); return; }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (previewRef.current) previewRef.current.srcObject = stream;
        ctx = new AudioContext();
        const analyser = ctx.createAnalyser();
        ctx.createMediaStreamSource(stream).connect(analyser);
        const buf = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          analyser.getByteTimeDomainData(buf);
          let peak = 0; for (const v of buf) peak = Math.max(peak, Math.abs(v - 128));
          setLevel(Math.min(100, peak * 2.2));
          raf = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        setMediaError(fr ? 'Caméra ou micro bloqué. Autorisez l’accès dans votre navigateur, ou rejoignez sans.' : 'Camera or microphone blocked. Allow access in your browser, or join without them.');
        setCamOn(false); setMicOn(false);
      }
    })();
    return () => { cancelled = true; cancelAnimationFrame(raf); ctx?.close().catch(() => {}); stopPreview(); };
  }, [phase, fr, stopPreview]);

  useEffect(() => { streamRef.current?.getVideoTracks().forEach(t => { t.enabled = camOn; }); }, [camOn]);
  useEffect(() => { streamRef.current?.getAudioTracks().forEach(t => { t.enabled = micOn; }); }, [micOn]);

  // ── Joining ──────────────────────────────────────────────────────────────────
  const leaveCleanup = useCallback(() => {
    jitsiRef.current?.dispose(); jitsiRef.current = null;
    if (joinRef.current) { api.elLeave(id, joinRef.current.attendance_id).catch(() => {}); joinRef.current = null; }
  }, [id]);

  const join = async () => {
    setError(''); setPhase('joining'); stopPreview();
    try {
      const j = await api.elJoin(id);
      joinRef.current = j;
      await loadScript(j.scriptUrl);
      setPhase('inclass');   // the Jitsi instance is created by the effect below, once the host element is mounted
    } catch (e) {
      failJoin(e);
    }
  };

  // A failure after the server already opened an attendance record must close it again.
  const failJoin = (e: unknown) => {
    if (joinRef.current) { api.elLeave(id, joinRef.current.attendance_id).catch(() => {}); joinRef.current = null; }
    const msg = e instanceof Error ? e.message : 'Could not join';
    setError(msg);
    if (/not started/i.test(msg)) setPhase('waiting');
    else if (/ended/i.test(msg)) setPhase('ended');
    else if (/cancel/i.test(msg)) setPhase('cancelled');
    else setPhase('prejoin');
  };

  useEffect(() => {
    if (phase !== 'inclass' || jitsiRef.current) return;
    const j = joinRef.current;
    if (!j) return;
    if (!hostRef.current || !window.JitsiMeetExternalAPI) { failJoin(new Error('The video service could not be started. Please try again.')); return; }
    const jitsi = new window.JitsiMeetExternalAPI(j.domain, {
      roomName: j.roomName, jwt: j.jwt, parentNode: hostRef.current, width: '100%', height: '100%',
      userInfo: { displayName: user?.name, email: user?.email },
      configOverwrite: {
        prejoinPageEnabled: false, startWithAudioMuted: !micOn, startWithVideoMuted: !camOn,
        disableDeepLinking: true, subject: j.session.title, defaultLanguage: fr ? 'fr' : 'en',
      },
      interfaceConfigOverwrite: { MOBILE_APP_PROMO: false, SHOW_JITSI_WATERMARK: false },
    });
    jitsiRef.current = jitsi;
    jitsi.addListener('readyToClose', () => { leaveCleanup(); setPhase('left'); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Heartbeat: keeps server-side attendance accurate and tells us when the teacher ends the class.
  useEffect(() => {
    if (phase !== 'inclass') return;
    const i = setInterval(async () => {
      const j = joinRef.current; if (!j) return;
      try {
        const r = await api.elHeartbeat(id, j.attendance_id);
        if (r.status === 'ended') { leaveCleanup(); setPhase('ended'); }
      } catch { /* transient network error — next beat retries */ }
    }, 30_000);
    const onUnload = () => { if (joinRef.current) api.elLeaveBeacon(id, joinRef.current.attendance_id); };
    window.addEventListener('pagehide', onUnload);
    return () => { clearInterval(i); window.removeEventListener('pagehide', onUnload); };
  }, [phase, id, leaveCleanup]);

  useEffect(() => () => { stopPreview(); leaveCleanup(); }, [stopPreview, leaveCleanup]);

  const leave = () => { leaveCleanup(); setPhase('left'); };
  const endClass = async () => {
    setConfirmEnd(false);
    try { try { jitsiRef.current?.executeCommand('endConference'); } catch { /* older Jitsi builds */ } leaveCleanup(); await api.elEnd(id); setPhase('ended'); refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not end class'); setPhase('left'); }
  };
  const startClass = async () => {
    setStarting(true); setError('');
    try { await api.elStart(id); await refresh(); setPhase('prejoin'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not start class'); }
    finally { setStarting(false); }
  };

  const backBtn = (
    <button onClick={() => nav(back)} className="px-5 py-2.5 rounded-xl bg-slate-800 text-white text-sm font-medium hover:bg-slate-700">
      {fr ? 'Retour à E-Learning' : 'Back to E-Learning'}
    </button>
  );

  return (
    <div className="fixed inset-0 z-[55] bg-slate-900 flex flex-col">
      {/* Top bar */}
      <div className="h-14 shrink-0 px-3 sm:px-5 flex items-center gap-3 bg-slate-950 text-white">
        {phase !== 'inclass' && (
          <button onClick={() => nav(back)} aria-label="Back" className="p-2 rounded-lg hover:bg-slate-800"><ArrowLeft size={18} /></button>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate">{session?.title ?? '…'}</p>
          {session && <p className="text-xs text-slate-400 truncate">{session.subject_name} · {session.class_name}</p>}
        </div>
        {session && <StatusPill status={session.effective_status} />}
        {(phase === 'inclass' || phase === 'prejoin') && session && (
          <button onClick={() => setShowMaterials(true)} className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-medium flex items-center gap-1.5">
            <FolderOpen size={15} /> <span className="hidden sm:inline">{fr ? 'Supports' : 'Materials'}</span>
          </button>
        )}
        {phase === 'inclass' && (
          <>
            <button onClick={leave} className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm font-medium flex items-center gap-1.5">
              <LogOut size={15} /> <span className="hidden sm:inline">{fr ? 'Quitter le cours' : 'Leave Class'}</span>
            </button>
            {isTeacher && (
              <button onClick={() => setConfirmEnd(true)} className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-sm font-semibold flex items-center gap-1.5">
                <PhoneOff size={15} /> <span className="hidden sm:inline">{fr ? 'Terminer le cours' : 'End class'}</span>
              </button>
            )}
          </>
        )}
      </div>

      {phase === 'loading' && <Center><Loader2 className="animate-spin text-white" size={32} /></Center>}

      {phase === 'error' && <Center><Card><p className="text-red-600">{error}</p>{backBtn}</Card></Center>}

      {phase === 'waiting' && session && (
        <Center><Card>
          <Radio className="mx-auto text-blue-500" size={36} />
          <h2 className="text-lg font-bold text-slate-800">
            {isTeacher ? (fr ? 'Prêt à commencer ?' : 'Ready to start?') : (fr ? 'L’enseignant n’a pas encore démarré le cours' : 'The teacher has not started this class yet')}
          </h2>
          <p className="text-sm text-slate-500">{fmtRange(session.starts_at, session.ends_at, lang)}</p>
          {isTeacher ? (
            <button onClick={startClass} disabled={starting} className="px-6 py-3 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700 disabled:opacity-60 flex items-center gap-2 mx-auto">
              {starting && <Loader2 size={16} className="animate-spin" />}{fr ? 'Démarrer le cours' : 'Start class'}
            </button>
          ) : (
            <p className="text-sm text-slate-500 flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" /> {fr ? 'Cette page s’actualise automatiquement…' : 'This page updates automatically…'}</p>
          )}
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          {backBtn}
        </Card></Center>
      )}

      {(phase === 'prejoin' || phase === 'joining') && session && (
        <Center>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl grid md:grid-cols-2 overflow-hidden">
            <div className="bg-slate-800 relative aspect-video md:aspect-auto md:min-h-[280px] flex items-center justify-center">
              <video ref={previewRef} autoPlay muted playsInline className={`w-full h-full object-cover -scale-x-100 ${camOn && !mediaError ? '' : 'hidden'}`} />
              {(!camOn || mediaError) && <CameraOff className="text-slate-500" size={40} />}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-3">
                <button onClick={() => setMicOn(v => !v)} aria-pressed={micOn} aria-label="Microphone"
                  className={`w-11 h-11 rounded-full flex items-center justify-center text-white ${micOn ? 'bg-slate-600 hover:bg-slate-500' : 'bg-red-600'}`}>{micOn ? <Mic size={18} /> : <MicOff size={18} />}</button>
                <button onClick={() => setCamOn(v => !v)} aria-pressed={camOn} aria-label="Camera"
                  className={`w-11 h-11 rounded-full flex items-center justify-center text-white ${camOn ? 'bg-slate-600 hover:bg-slate-500' : 'bg-red-600'}`}>{camOn ? <Camera size={18} /> : <CameraOff size={18} />}</button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800">{session.title}</h2>
                <p className="text-sm text-slate-500">{session.subject_name} · {session.teacher_name}</p>
                <p className="text-xs text-slate-400 mt-1">{fmtRange(session.starts_at, session.ends_at, lang)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">{fr ? 'Test du micro — parlez' : 'Microphone test — say something'}</p>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-green-500 transition-[width] duration-100" style={{ width: `${micOn ? level : 0}%` }} /></div>
              </div>
              {mediaError && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">{mediaError}</p>}
              <ul className="text-xs text-slate-500 space-y-1 list-disc pl-4">
                <li>{fr ? 'Utilisez un casque pour éviter l’écho.' : 'Use headphones to avoid echo.'}</li>
                <li>{fr ? 'Coupez votre micro quand vous n’intervenez pas.' : 'Mute your microphone when not speaking.'}</li>
                <li>{fr ? 'Utilisez le bouton « main levée » pour poser une question.' : 'Use the raise-hand button to ask a question.'}</li>
              </ul>
              {error && <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
              <button onClick={join} disabled={phase === 'joining'}
                className="w-full py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-2">
                {phase === 'joining' && <Loader2 size={16} className="animate-spin" />}
                {isTeacher ? (fr ? 'Entrer dans la classe' : 'Enter classroom') : (fr ? 'Rejoindre le cours' : 'Join Class')}
              </button>
            </div>
          </div>
        </Center>
      )}

      {phase === 'inclass' && <div ref={hostRef} className="flex-1 min-h-0 bg-black" />}

      {phase === 'left' && (
        <Center><Card>
          <h2 className="text-lg font-bold text-slate-800">{fr ? 'Vous avez quitté le cours' : 'You left the class'}</h2>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3 justify-center flex-wrap">
            {session?.status === 'live' && (
              <button onClick={() => { setError(''); setPhase('prejoin'); }} className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700">{fr ? 'Revenir' : 'Rejoin'}</button>
            )}
            {backBtn}
          </div>
        </Card></Center>
      )}

      {phase === 'ended' && (
        <Center><Card>
          <Info className="mx-auto text-slate-400" size={34} />
          <h2 className="text-lg font-bold text-slate-800">{fr ? 'Ce cours est terminé' : 'This class has ended'}</h2>
          {backBtn}
        </Card></Center>
      )}

      {phase === 'cancelled' && (
        <Center><Card>
          <Info className="mx-auto text-orange-400" size={34} />
          <h2 className="text-lg font-bold text-slate-800">{fr ? 'Ce cours a été annulé' : 'This class was cancelled'}</h2>
          {backBtn}
        </Card></Center>
      )}

      {showMaterials && session && (
        <div className="fixed inset-0 z-[56] bg-black/50 flex justify-end" onClick={() => setShowMaterials(false)}>
          <aside className="bg-slate-50 w-full max-w-md h-full overflow-y-auto p-4 space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">{fr ? 'Supports de cours' : 'Course materials'} — {session.subject_name}</h2>
              <button onClick={() => setShowMaterials(false)} aria-label="Close" className="p-1 text-slate-500"><X size={20} /></button>
            </div>
            <ResourcesPanel mode={isTeacher ? 'teacher' : 'student'} compact filter={{ class_id: session.class_id, subject_name: session.subject_name }} courses={[]} />
          </aside>
        </div>
      )}

      {confirmEnd && (
        <ConfirmDialog
          title={fr ? 'Terminer le cours pour tous ?' : 'End the class for everyone?'}
          message={fr ? 'Tous les participants seront déconnectés et la présence sera enregistrée.' : 'All participants will be disconnected and attendance will be finalised.'}
          confirmLabel={fr ? 'Terminer' : 'End class'} cancelLabel={fr ? 'Continuer le cours' : 'Keep teaching'}
          onCancel={() => setConfirmEnd(false)} onConfirm={endClass}
        />
      )}
    </div>
  );
}
