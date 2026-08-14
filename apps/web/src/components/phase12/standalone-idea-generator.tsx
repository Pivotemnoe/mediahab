"use client";

import { ArrowRight, Lightbulb, Loader2, Mic, RotateCcw, Sparkles, Square } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  type StandaloneIdeaDirection,
  writeStandaloneIdeaHandoff,
} from "@/features/standalone-ideas/idea-handoff";
import {
  createVoiceRecorder,
  generateStandaloneIdeas,
  getStandaloneIdeaCapability,
  transcribeStandaloneIdeaTopic,
  type StandaloneIdeaCapability,
} from "@/features/standalone-ideas/standalone-ideas-client";

type VoiceState = "error" | "idle" | "recording" | "requesting" | "success" | "transcribing" | "uploading";
type CapabilityState = "error" | "loading" | "ready";

function isAbortError(cause: unknown): boolean {
  return cause instanceof DOMException && cause.name === "AbortError";
}

function recordingTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function voiceStatus(state: VoiceState, seconds: number): { description: string; title: string } | null {
  if (state === "requesting") return { description: "Разрешите доступ к микрофону.", title: "Подключаем микрофон" };
  if (state === "recording") return { description: `Голос принимается · ${recordingTime(seconds)}`, title: "Запись идёт" };
  if (state === "uploading") return { description: "Запись уже остановлена и отправляется на расшифровку.", title: "Загружаем голос" };
  if (state === "transcribing") return { description: "Превращаем запись в тему. Введённый текст пока не меняется.", title: "Расшифровываем" };
  if (state === "success") return { description: "Тема заполнена. Её можно поправить перед генерацией.", title: "Готово" };
  if (state === "error") return { description: "Напишите тему вручную или повторите запись.", title: "Голос не сохранён" };
  return null;
}

export function StandaloneIdeaGenerator({
  notice,
  workspaceId,
}: {
  notice?: string;
  workspaceId: string | null;
}) {
  const router = useRouter();
  const [capability, setCapability] = useState<StandaloneIdeaCapability | null>(null);
  const [capabilityState, setCapabilityState] = useState<CapabilityState>(workspaceId ? "loading" : "error");
  const [capabilityRetry, setCapabilityRetry] = useState(0);
  const [topic, setTopic] = useState("");
  const [ideas, setIdeas] = useState<StandaloneIdeaDirection[]>([]);
  const [runId, setRunId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [voiceSeconds, setVoiceSeconds] = useState(0);
  const [voiceLevel, setVoiceLevel] = useState(0);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const microphoneRequestRef = useRef(0);
  const microphoneRequestPendingRef = useRef(false);
  const recordingStartedAtRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const voiceMeterFrameRef = useRef<number | null>(null);
  const voiceMeterLastUpdateRef = useRef(0);
  const chunksRef = useRef<Blob[]>([]);
  const generationAbortRef = useRef<AbortController | null>(null);
  const voiceAbortRef = useRef<AbortController | null>(null);
  const capabilityAbortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      generationAbortRef.current?.abort();
      voiceAbortRef.current?.abort();
      capabilityAbortRef.current?.abort();
      microphoneRequestRef.current += 1;
      microphoneRequestPendingRef.current = false;
      const recorder = recorderRef.current;
      if (recorder) {
        recorder.ondataavailable = null;
        recorder.onstop = null;
        if (recorder.state !== "inactive") recorder.stop();
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (voiceMeterFrameRef.current !== null) window.cancelAnimationFrame(voiceMeterFrameRef.current);
      const audioContext = audioContextRef.current;
      if (audioContext && audioContext.state !== "closed") void audioContext.close();
      recorderRef.current = null;
      streamRef.current = null;
      recordingStartedAtRef.current = null;
      voiceMeterFrameRef.current = null;
      audioContextRef.current = null;
    };
  }, []);

  function stopVoiceMeter() {
    if (voiceMeterFrameRef.current !== null) {
      window.cancelAnimationFrame(voiceMeterFrameRef.current);
      voiceMeterFrameRef.current = null;
    }
    const context = audioContextRef.current;
    audioContextRef.current = null;
    if (context && context.state !== "closed") void context.close();
    if (mountedRef.current) setVoiceLevel(0);
  }

  function startVoiceMeter(stream: MediaStream) {
    try {
      const context = new AudioContext();
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      context.createMediaStreamSource(stream).connect(analyser);
      const values = new Uint8Array(analyser.frequencyBinCount);
      audioContextRef.current = context;
      voiceMeterLastUpdateRef.current = 0;
      const measure = (timestamp: number) => {
        analyser.getByteTimeDomainData(values);
        if (timestamp - voiceMeterLastUpdateRef.current > 80) {
          let sum = 0;
          for (const value of values) {
            const normalized = (value - 128) / 128;
            sum += normalized * normalized;
          }
          if (mountedRef.current) setVoiceLevel(Math.min(1, Math.sqrt(sum / values.length) * 4));
          voiceMeterLastUpdateRef.current = timestamp;
        }
        voiceMeterFrameRef.current = window.requestAnimationFrame(measure);
      };
      voiceMeterFrameRef.current = window.requestAnimationFrame(measure);
    } catch {
      setVoiceLevel(0.08);
    }
  }

  useEffect(() => {
    if (voiceState !== "recording") return;
    const timer = window.setInterval(() => setVoiceSeconds((current) => current + 1), 1000);
    return () => window.clearInterval(timer);
  }, [voiceState]);

  useEffect(() => {
    if (!workspaceId) return;
    const controller = new AbortController();
    capabilityAbortRef.current = controller;
    setCapabilityState("loading");
    void getStandaloneIdeaCapability(workspaceId, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setCapability(result);
          setCapabilityState("ready");
        }
      })
      .catch((cause: unknown) => {
        if (!isAbortError(cause) && !controller.signal.aborted) {
          setCapability(null);
          setCapabilityState("error");
          setError(cause instanceof Error ? cause.message : "Не удалось проверить доступ к генератору.");
        }
      })
      .finally(() => {
        if (capabilityAbortRef.current === controller) capabilityAbortRef.current = null;
      });
    return () => controller.abort();
  }, [capabilityRetry, workspaceId]);

  async function transcribeVoice(blob: Blob, durationMs: number) {
    if (!workspaceId || !blob.size) {
      setVoiceState("error");
      setError("Запись получилась пустой. Попробуйте ещё раз.");
      return;
    }
    const controller = new AbortController();
    voiceAbortRef.current = controller;
    try {
      setError(null);
      const transcript = await transcribeStandaloneIdeaTopic({
        blob,
        durationMs,
        onStage: (stage) => {
          if (!controller.signal.aborted && mountedRef.current) setVoiceState(stage);
        },
        signal: controller.signal,
        workspaceId,
      });
      if (controller.signal.aborted || !mountedRef.current) return;
      setTopic(transcript.slice(0, 1000));
      setIdeas([]);
      setRunId(null);
      setVoiceState("success");
    } catch (cause) {
      if (isAbortError(cause) || controller.signal.aborted || !mountedRef.current) return;
      setVoiceState("error");
      setError(cause instanceof Error ? cause.message : "Не удалось расшифровать голос.");
    } finally {
      if (voiceAbortRef.current === controller) voiceAbortRef.current = null;
    }
  }

  async function startRecording() {
    if (!workspaceId || microphoneRequestPendingRef.current || recorderRef.current || voiceAbortRef.current) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setVoiceState("error");
      setError("Этот браузер не поддерживает запись. Напишите тему вручную.");
      return;
    }
    const requestId = microphoneRequestRef.current + 1;
    microphoneRequestRef.current = requestId;
    microphoneRequestPendingRef.current = true;
    let requestedStream: MediaStream | null = null;
    try {
      setError(null);
      setVoiceNotice(null);
      setVoiceSeconds(0);
      setVoiceState("requesting");
      requestedStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mountedRef.current || microphoneRequestRef.current !== requestId) {
        requestedStream.getTracks().forEach((track) => track.stop());
        return;
      }
      const recorder = createVoiceRecorder(requestedStream);
      chunksRef.current = [];
      streamRef.current = requestedStream;
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const mimeType = recorder.mimeType || chunksRef.current[0]?.type || "audio/webm";
        const durationMs = Math.max(1, Date.now() - (recordingStartedAtRef.current ?? Date.now()));
        recordingStartedAtRef.current = null;
        requestedStream?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        stopVoiceMeter();
        if (!mountedRef.current) return;
        void transcribeVoice(new Blob(chunksRef.current, { type: mimeType }), durationMs);
      };
      recorder.start(250);
      recorderRef.current = recorder;
      recordingStartedAtRef.current = Date.now();
      startVoiceMeter(requestedStream);
      setVoiceState("recording");
    } catch {
      requestedStream?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      recorderRef.current = null;
      recordingStartedAtRef.current = null;
      stopVoiceMeter();
      if (!mountedRef.current) return;
      setVoiceState("error");
      setError("Браузер не дал доступ к микрофону. Напишите тему вручную или разрешите доступ.");
    } finally {
      if (microphoneRequestRef.current === requestId) microphoneRequestPendingRef.current = false;
    }
  }

  function stopRecording() {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    setVoiceState("uploading");
    recorder.stop();
  }

  useEffect(() => {
    if (voiceState === "recording" && voiceSeconds >= 90) {
      setVoiceNotice("Запись остановлена через 90 секунд. Для темы этого достаточно.");
      stopRecording();
    }
  }, [voiceSeconds, voiceState]);

  async function generate() {
    if (
      !workspaceId
      || generationAbortRef.current
      || isGenerating
      || ["requesting", "recording", "uploading", "transcribing"].includes(voiceState)
      || !topic.trim()
      || !capability?.can_generate
      || capability.remaining_today <= 0
    ) return;
    const controller = new AbortController();
    generationAbortRef.current = controller;
    setIsGenerating(true);
    setError(null);
    setIdeas([]);
    setRunId(null);
    try {
      const result = await generateStandaloneIdeas({ signal: controller.signal, topic: topic.trim(), workspaceId });
      if (controller.signal.aborted || !mountedRef.current) return;
      setIdeas(result.ideas);
      setRunId(result.run.id);
      setCapability((current) => current ? {
        ...current,
        remaining_today: Math.max(0, current.remaining_today - 1),
        used_today: Math.min(current.daily_limit, current.used_today + 1),
      } : current);
    } catch (cause) {
      if (isAbortError(cause) || controller.signal.aborted || !mountedRef.current) return;
      setError(cause instanceof Error ? cause.message : "Не удалось подобрать идеи.");
    } finally {
      if (generationAbortRef.current === controller) generationAbortRef.current = null;
      if (!controller.signal.aborted && mountedRef.current) setIsGenerating(false);
    }
  }

  function openComposer(idea: StandaloneIdeaDirection) {
    if (!workspaceId || !runId) return;
    try {
      const handoff = writeStandaloneIdeaHandoff({ idea, runId, topic: topic.trim(), workspaceId });
      router.push(`/app/content/new?idea=${encodeURIComponent(handoff.handoffToken)}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось открыть диктовку по этой идее.");
    }
  }

  const status = voiceStatus(voiceState, voiceSeconds);
  const quotaExhausted = Boolean(
    capability?.enabled && capability.used_today >= capability.daily_limit,
  );
  const unavailable = Boolean(
    capability && (!capability.enabled || (!capability.can_generate && !quotaExhausted)),
  );
  const voiceBusy = ["requesting", "uploading", "transcribing"].includes(voiceState);
  const voiceActive = ["requesting", "recording", "uploading", "transcribing"].includes(voiceState);

  return (
    <div className="mx-auto grid w-full max-w-5xl min-w-0 gap-5" data-testid="standalone-ideas-page">
      <section className="grid min-w-0 gap-4 rounded-2xl border border-border bg-sidebar p-5 text-sidebar-foreground shadow-panel sm:p-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0">
          <Badge tone="success">Генератор идей</Badge>
          <h1 className="font-editorial mt-3 break-words text-4xl leading-tight text-foreground sm:text-5xl">О чём рассказать?</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted sm:text-base">
            Напишите или надиктуйте одну тему. Получите пять направлений, выберите одно и расскажите всё своими словами.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface px-4 py-3 text-xs leading-5 text-muted sm:text-sm">
          <strong className="block text-foreground">Это не чат и не готовый пост</strong>
          Здесь только направления для вашей следующей диктовки.
        </div>
      </section>

      {notice ? <div className="rounded-xl border border-warning bg-[color-mix(in_srgb,var(--warning),transparent_92%)] p-4 text-sm leading-6 text-muted">{notice}</div> : null}

      <Card className="grid min-w-0 gap-4 p-4 sm:p-6">
        <label className="grid min-w-0 gap-2 text-sm font-semibold text-foreground" htmlFor="standalone-idea-topic">
          Тема для пяти идей
          <span className="text-xs font-normal leading-5 text-muted">Одной фразы достаточно. Например: как владельцу маленькой кофейни рассказывать о команде.</span>
          <textarea
            className="min-h-32 w-full min-w-0 resize-y rounded-xl border border-border bg-background p-4 text-base font-normal leading-7 outline-none transition focus:border-primary focus-visible:ring-2 focus-visible:ring-ring/30"
            disabled={!workspaceId || isGenerating || voiceActive || unavailable}
            id="standalone-idea-topic"
            maxLength={1000}
            onChange={(event) => {
              setTopic(event.currentTarget.value);
              setIdeas([]);
              setRunId(null);
            }}
            placeholder="О чём хочется поговорить с аудиторией?"
            value={topic}
          />
        </label>

        <div className="grid min-w-0 gap-3 rounded-xl border border-border bg-surface-muted p-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:p-4" data-testid="standalone-idea-voice">
          <button
            aria-label={voiceState === "recording" ? "Остановить запись темы" : "Надиктовать тему"}
            aria-pressed={voiceState === "recording"}
            className="grid size-14 place-items-center rounded-full bg-accent text-accent-foreground shadow-panel transition hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={
              !workspaceId
              || capabilityState !== "ready"
              || unavailable
              || quotaExhausted
              || isGenerating
              || (voiceBusy && voiceState !== "recording")
            }
            onClick={() => voiceState === "recording" ? stopRecording() : void startRecording()}
            type="button"
          >
            {voiceBusy ? <Loader2 className="animate-spin motion-reduce:animate-none" size={22} /> : voiceState === "recording" ? <Square size={21} /> : <Mic size={24} />}
          </button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
              {voiceState === "recording" ? <span className="size-2 animate-pulse rounded-full bg-danger motion-reduce:animate-none" /> : null}
              <span aria-live="polite" role="status">{status?.title ?? "Можно надиктовать тему"}</span>
            </div>
            <p aria-hidden={voiceState === "recording" ? "true" : undefined} className="mt-1 text-xs leading-5 text-muted">{status?.description ?? "Нажмите микрофон, скажите одну тему и остановите запись."}</p>
            {voiceState === "recording" ? <progress aria-hidden="true" className="mt-2 h-2 w-full accent-danger" max={1} value={Math.max(voiceLevel, 0.03)} /> : null}
            {voiceNotice ? <p className="mt-2 text-xs leading-5 text-warning">{voiceNotice}</p> : null}
          </div>
        </div>

        {!workspaceId ? (
          <p className="rounded-lg border border-border bg-background p-3 text-sm leading-6 text-muted">Идеи станут доступны, когда в кабинете появится рабочее пространство.</p>
        ) : capabilityState === "ready" && capability && !unavailable ? (
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-muted">Осталось подборок сегодня: {capability.remaining_today} из {capability.daily_limit}</span>
            <Button
              className="min-h-12 w-full text-base sm:w-auto"
              disabled={!topic.trim() || isGenerating || voiceActive || unavailable || quotaExhausted}
              onClick={() => void generate()}
              type="button"
            >
              {isGenerating ? <Loader2 className="animate-spin motion-reduce:animate-none" size={18} /> : <Sparkles size={18} />}
              {isGenerating ? "Подбираем 5 идей…" : ideas.length ? "Предложить другие 5" : "Предложить 5 идей"}
            </Button>
          </div>
        ) : capabilityState === "loading" ? (
          <div className="flex min-h-12 items-center gap-2 text-sm text-muted"><Loader2 className="animate-spin motion-reduce:animate-none" size={17} />Проверяем доступ к идеям…</div>
        ) : (
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-lg border border-warning bg-[color-mix(in_srgb,var(--warning),transparent_92%)] p-3">
            <p className="text-sm leading-6 text-muted">Не удалось проверить доступ к идеям.</p>
            <Button onClick={() => {
              setError(null);
              setCapabilityRetry((current) => current + 1);
            }} type="button" variant="secondary"><RotateCcw size={16} />Повторить</Button>
          </div>
        )}

        {unavailable ? <p className="rounded-lg border border-warning bg-[color-mix(in_srgb,var(--warning),transparent_92%)] p-3 text-sm leading-6 text-muted">Генератор пока недоступен для этого кабинета.</p> : null}
        {quotaExhausted ? <p className="rounded-lg border border-warning bg-[color-mix(in_srgb,var(--warning),transparent_92%)] p-3 text-sm leading-6 text-muted">Подборки на сегодня закончились. Новые будут доступны завтра.</p> : null}
        {error ? <p className="rounded-lg border border-danger bg-[color-mix(in_srgb,var(--danger),transparent_94%)] p-3 text-sm leading-6 text-danger" role="alert">{error}</p> : null}
      </Card>

      {isGenerating ? (
        <section aria-label="Подбираем пять идей" className="grid min-w-0 gap-3" data-testid="standalone-ideas-loading">
          <div className="text-sm font-semibold text-foreground">Ищем пять разных ракурсов…</div>
          {Array.from({ length: 5 }, (_, index) => (
            <Card className="grid animate-pulse gap-3 p-4 motion-reduce:animate-none sm:p-5" key={index}>
              <span className="h-5 w-2/5 rounded bg-surface-muted" />
              <span className="h-4 w-4/5 rounded bg-surface-muted" />
              <span className="h-10 w-full rounded bg-surface-muted sm:w-56" />
            </Card>
          ))}
        </section>
      ) : null}

      {ideas.length === 5 ? (
        <section className="grid min-w-0 gap-3" data-testid="standalone-ideas-results">
          <div className="flex min-w-0 flex-wrap items-end justify-between gap-3">
            <div>
              <Badge tone="success">5 направлений готовы</Badge>
              <h2 className="mt-2 text-2xl font-semibold text-foreground">Выберите, о чём хочется рассказать</h2>
            </div>
            <Button disabled={isGenerating || voiceActive || unavailable || quotaExhausted} onClick={() => void generate()} type="button" variant="ghost"><RotateCcw size={16} />Другие 5</Button>
          </div>
          {ideas.map((idea, index) => (
            <Card className="grid min-w-0 gap-4 p-4 sm:grid-cols-[40px_minmax(0,1fr)_auto] sm:items-center sm:p-5" data-testid="standalone-idea-card" key={idea.id}>
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--primary),transparent_84%)] text-sm font-semibold text-primary">{index + 1}</span>
              <div className="min-w-0">
                <h3 className="break-words text-lg font-semibold text-foreground">{idea.title}</h3>
                <p className="mt-1 text-sm leading-6 text-muted">{idea.direction}</p>
                <p className="mt-2 flex items-start gap-2 text-xs leading-5 text-foreground"><Lightbulb className="mt-0.5 shrink-0 text-success" size={15} /><span><strong>С чего начать:</strong> {idea.speakingPrompt}</span></p>
              </div>
              <Button className="min-h-11 w-full sm:w-auto" onClick={() => openComposer(idea)} type="button">
                <Mic size={17} />Надиктовать по этой идее<ArrowRight size={16} />
              </Button>
            </Card>
          ))}
        </section>
      ) : null}
    </div>
  );
}
