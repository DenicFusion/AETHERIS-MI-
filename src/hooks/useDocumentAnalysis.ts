import React, { useRef, useEffect, useCallback, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface DocumentMetrics {
  alignment: number;      // 0–100  (card roughly in frame)
  brightness: number;     // 0–100  (ambient light level)
  sharpness: number;      // 0–100  (edge clarity / focus)
  glare: number;          // 0–100  (100 = zero glare)
  tilt: number;           // 0–100  (100 = perfectly level)
  overallConfidence: number; // 0–100 (weighted composite)
  readyToCapture: boolean;
  statusMessage: string;
  feedbackHint: string;   // plain-language coaching for the user
}

export interface AnalysisHookResult {
  metrics: DocumentMetrics;
  isAnalyzing: boolean;
  countdownSeconds: number | null;   // null = not counting down, 3→2→1→0
  captureReady: boolean;             // true for the single frame to capture
}

// ─────────────────────────────────────────────────────────────────────────────
// THRESHOLDS  ← easy to tune in one place
// ─────────────────────────────────────────────────────────────────────────────

const T = {
  // PRIMARY gate  — these two must BOTH pass to arm the shutter
  SHARPNESS_MIN: 85,
  GLARE_MIN: 85,

  // SECONDARY — used for overall confidence only, never block capture alone
  ALIGNMENT_MIN: 50,
  BRIGHTNESS_MIN: 50,
  TILT_MIN: 60,

  // Countdown arms when overall confidence ≥ this value
  CONFIDENCE_TO_ARM: 72,

  // Hold-steady window before countdown begins (ms)
  STEADY_HOLD_MS: 1500,

  // Countdown duration per tick (ms)
  COUNTDOWN_TICK_MS: 1000,
  COUNTDOWN_START: 3,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// PIXEL-LEVEL ANALYSIS  (runs every animation frame, no API calls)
// ─────────────────────────────────────────────────────────────────────────────

function analyzeFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement
): Omit<DocumentMetrics, "readyToCapture" | "statusMessage" | "feedbackHint"> {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx || video.readyState < 2) {
    return { alignment: 0, brightness: 0, sharpness: 0, glare: 0, tilt: 0, overallConfidence: 0 };
  }

  // Draw at reduced resolution for speed
  const W = 320;
  const H = Math.round((W * video.videoHeight) / video.videoWidth) || 200;
  canvas.width = W;
  canvas.height = H;
  ctx.drawImage(video, 0, 0, W, H);

  const { data } = ctx.getImageData(0, 0, W, H);
  const pixelCount = W * H;

  // ── Brightness & Glare ──────────────────────────────────────────────────
  let lumSum = 0;
  let overexposedPixels = 0;
  const OVEREXPOSED_THRESHOLD = 240;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    lumSum += lum;
    if (r > OVEREXPOSED_THRESHOLD && g > OVEREXPOSED_THRESHOLD && b > OVEREXPOSED_THRESHOLD) {
      overexposedPixels++;
    }
  }

  const avgLum = lumSum / pixelCount;
  // Map 60–200 lum → 0–100 brightness (below 60 = too dark, above 200 = blown out)
  const brightness = Math.min(100, Math.max(0, ((avgLum - 60) / 140) * 100));
  const glareRatio = overexposedPixels / pixelCount;
  // 0% glare pixels = 100 score, 15%+ = 0 score
  const glare = Math.max(0, 100 - (glareRatio / 0.15) * 100);

  // ── Sharpness (Laplacian variance) ──────────────────────────────────────
  // Convert to grayscale row; apply 3×3 Laplacian; measure variance
  const gray = new Float32Array(W * H);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    gray[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  let lapSum = 0, lapSumSq = 0, lapCount = 0;
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const idx = y * W + x;
      const lap =
        -gray[idx - W - 1] - gray[idx - W] - gray[idx - W + 1]
        - gray[idx - 1] + 8 * gray[idx] - gray[idx + 1]
        - gray[idx + W - 1] - gray[idx + W] - gray[idx + W + 1];
      lapSum += lap;
      lapSumSq += lap * lap;
      lapCount++;
    }
  }
  const lapMean = lapSum / lapCount;
  const lapVariance = lapSumSq / lapCount - lapMean * lapMean;
  // Empirically: variance < 200 = blurry, > 2000 = sharp
  const sharpness = Math.min(100, Math.max(0, ((lapVariance - 200) / 1800) * 100));

  // ── Alignment (centre-region brightness vs. edge) ────────────────────────
  // Heuristic: a card filling the frame will make the centre notably brighter
  // than the four corners (which show the background).
  const sampleCenter = sampleRegionLum(gray, W, H, 0.25, 0.25, 0.75, 0.75);
  const sampleEdge = (
    sampleRegionLum(gray, W, H, 0, 0, 0.2, 0.2) +
    sampleRegionLum(gray, W, H, 0.8, 0, 1, 0.2) +
    sampleRegionLum(gray, W, H, 0, 0.8, 0.2, 1) +
    sampleRegionLum(gray, W, H, 0.8, 0.8, 1, 1)
  ) / 4;

  const contrast = sampleCenter - sampleEdge;
  // If the card is inside the frame, centre is brighter (card) vs darker edges (background)
  // or vice-versa. Use |contrast| as the signal.
  const alignment = Math.min(100, Math.max(0, (Math.abs(contrast) / 40) * 100 + 30));

  // ── Tilt (simplified: scan horizontal edge density) ──────────────────────
  // Real tilt detection would use Hough lines — this approximates it cheaply.
  // We measure how many strong horizontal vs. diagonal edges exist in the centre strip.
  let hEdge = 0, dEdge = 0;
  const midY = Math.floor(H / 2);
  for (let x = 1; x < W - 1; x++) {
    const top = gray[(midY - 2) * W + x];
    const mid = gray[midY * W + x];
    const bot = gray[(midY + 2) * W + x];
    hEdge += Math.abs(top - bot);
    dEdge += Math.abs(top - mid) + Math.abs(mid - bot);
  }
  const tiltScore = hEdge > 0 ? Math.min(100, (hEdge / Math.max(dEdge, 1)) * 100) : 50;
  const tilt = Math.max(30, tiltScore); // floor at 30 so it never kills overall score alone

  // ── Overall Confidence (weighted) ────────────────────────────────────────
  // Sharpness and Glare are the CRITICAL factors (carry 50% of the score)
  // Alignment, Brightness, Tilt are supporting indicators
  const overallConfidence = Math.round(
    sharpness   * 0.30 +
    glare       * 0.20 +
    alignment   * 0.20 +
    brightness  * 0.20 +
    tilt        * 0.10
  );

  return {
    alignment: Math.round(alignment),
    brightness: Math.round(brightness),
    sharpness: Math.round(sharpness),
    glare: Math.round(glare),
    tilt: Math.round(tilt),
    overallConfidence,
  };
}

function sampleRegionLum(
  gray: Float32Array, W: number, H: number,
  x0: number, y0: number, x1: number, y1: number
): number {
  let sum = 0, count = 0;
  const xStart = Math.floor(x0 * W), xEnd = Math.floor(x1 * W);
  const yStart = Math.floor(y0 * H), yEnd = Math.floor(y1 * H);
  for (let y = yStart; y < yEnd; y++) {
    for (let x = xStart; x < xEnd; x++) {
      sum += gray[y * W + x];
      count++;
    }
  }
  return count > 0 ? sum / count : 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// FEEDBACK COPY
// ─────────────────────────────────────────────────────────────────────────────

function buildFeedback(
  metrics: Omit<DocumentMetrics, "readyToCapture" | "statusMessage" | "feedbackHint">
): { statusMessage: string; feedbackHint: string } {
  const { sharpness, glare, alignment, brightness, tilt } = metrics;

  // Priority order: worst problem first
  if (sharpness < T.SHARPNESS_MIN) {
    return {
      statusMessage: "Sharpness too low",
      feedbackHint: sharpness < 50
        ? "Hold your phone completely still — the image is blurry"
        : "Almost sharp enough — hold steady for a moment",
    };
  }
  if (glare < T.GLARE_MIN) {
    return {
      statusMessage: "Glare detected",
      feedbackHint: "Tilt the card slightly or move away from direct light",
    };
  }
  if (alignment < T.ALIGNMENT_MIN) {
    return {
      statusMessage: "Align the card",
      feedbackHint: "Move your ID so all four corners are inside the frame",
    };
  }
  if (brightness < T.BRIGHTNESS_MIN) {
    return {
      statusMessage: "Lighting too low",
      feedbackHint: "Move to a brighter area or turn on a light",
    };
  }
  if (tilt < T.TILT_MIN) {
    return {
      statusMessage: "Card tilted",
      feedbackHint: "Keep the card flat and parallel to your screen",
    };
  }
  return {
    statusMessage: "Hold steady…",
    feedbackHint: "Looking good — keep still while we capture",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN HOOK
// ─────────────────────────────────────────────────────────────────────────────

export function useDocumentAnalysis(
  videoRef: React.RefObject<HTMLVideoElement>,
  active: boolean,
  onCaptureTrigger: () => void
): AnalysisHookResult {
  const canvasRef = useRef<HTMLCanvasElement>(document.createElement("canvas"));
  const rafRef = useRef<number>(0);

  // Steady-hold tracking
  const steadySinceRef = useRef<number | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const captureReadyRef = useRef(false);

  const [metrics, setMetrics] = useState<DocumentMetrics>({
    alignment: 0, brightness: 0, sharpness: 0, glare: 0, tilt: 0,
    overallConfidence: 0, readyToCapture: false,
    statusMessage: "Point your camera at the ID card",
    feedbackHint: "Make sure the full card is visible",
  });
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);
  const [captureReady, setCaptureReady] = useState(false);

  // ── Primary capture gate ──────────────────────────────────────────────────
  // RULE: sharpness ≥ 85 AND glare ≥ 85 → arm the shutter.
  // Confidence score is used for the hold-steady delay and UI colour.
  const isPrimaryGatePassed = useCallback((
    raw: Omit<DocumentMetrics, "readyToCapture" | "statusMessage" | "feedbackHint">
  ) => {
    return raw.sharpness >= T.SHARPNESS_MIN && raw.glare >= T.GLARE_MIN;
  }, []);

  const clearCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setCountdownSeconds(null);
    steadySinceRef.current = null;
    captureReadyRef.current = false;
    setCaptureReady(false);
  }, []);

  const startCountdown = useCallback(() => {
    if (countdownRef.current) return; // already running
    let tick = T.COUNTDOWN_START;
    setCountdownSeconds(tick);

    countdownRef.current = setInterval(() => {
      tick--;
      if (tick > 0) {
        setCountdownSeconds(tick);
      } else {
        // 🔴 FIRE — capture this frame
        clearInterval(countdownRef.current!);
        countdownRef.current = null;
        captureReadyRef.current = true;
        setCaptureReady(true);
        setCountdownSeconds(0);
        onCaptureTrigger();
      }
    }, T.COUNTDOWN_TICK_MS);
  }, [onCaptureTrigger]);

  // ── rAF loop ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!active) {
      clearCountdown();
      cancelAnimationFrame(rafRef.current);
      return;
    }

    let frameId = 0;

    const loop = () => {
      const video = videoRef.current;
      if (video && video.readyState >= 2) {
        const raw = analyzeFrame(video, canvasRef.current);
        const { statusMessage, feedbackHint } = buildFeedback(raw);
        const primaryPassed = isPrimaryGatePassed(raw);
        const overallOk = raw.overallConfidence >= T.CONFIDENCE_TO_ARM;

        setMetrics({
          ...raw,
          readyToCapture: primaryPassed,
          statusMessage: primaryPassed ? "Hold steady…" : statusMessage,
          feedbackHint: primaryPassed ? "Looking good — capturing soon" : feedbackHint,
        });

        if (primaryPassed && overallOk) {
          // Start the steady-hold timer
          if (steadySinceRef.current === null) {
            steadySinceRef.current = Date.now();
          }
          const held = Date.now() - steadySinceRef.current;
          if (held >= T.STEADY_HOLD_MS && !countdownRef.current && !captureReadyRef.current) {
            startCountdown();
          }
        } else {
          // Conditions dropped — reset countdown
          if (countdownRef.current) {
            clearCountdown();
          } else {
            steadySinceRef.current = null;
          }
        }
      }

      frameId = requestAnimationFrame(loop);
      rafRef.current = frameId;
    };

    frameId = requestAnimationFrame(loop);
    rafRef.current = frameId;

    return () => {
      cancelAnimationFrame(frameId);
      clearCountdown();
    };
  }, [active, videoRef, isPrimaryGatePassed, startCountdown, clearCountdown]);

  return { metrics, isAnalyzing: active, countdownSeconds, captureReady };
}

