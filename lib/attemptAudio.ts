import { Platform } from 'react-native';
import { File } from 'expo-file-system';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';

/**
 * The learner's own speak-back audio, kept only long enough to replay it next
 * to Livia's model phrase.
 *
 * A transcript cannot tell you that your `r` sounds like an `l` — that is
 * exactly what a learner listens for when comparing. So the attempt audio has
 * to be the real recording.
 *
 * The recognizer already owns the microphone, and opening a second recorder
 * session on native fights it for the audio route. The audio therefore comes
 * from the recognition session itself:
 *
 * - native: `recordingOptions.persist` (Android 13+, iOS) writes a WAV into the
 *   cache directory and the `audioend` event returns its URI;
 * - web: the browser recognizer cannot persist, so a MediaRecorder taps the
 *   same microphone while it listens.
 *
 * Everything stays on the device. Files are deleted as soon as a newer attempt
 * replaces them or the exercise unmounts; nothing is uploaded.
 */

const IS_WEB = Platform.OS === 'web';

/** Whether this platform can hand back the audio of a speak-back attempt. */
export function attemptCaptureSupported(): boolean {
  if (IS_WEB) {
    return (
      typeof navigator !== 'undefined' &&
      typeof MediaRecorder !== 'undefined' &&
      typeof navigator.mediaDevices?.getUserMedia === 'function'
    );
  }
  try {
    return ExpoSpeechRecognitionModule.supportsRecording();
  } catch {
    return false;
  }
}

/** Extra `start()` options that make the native recognizer keep its audio. */
export function nativeAttemptCaptureOptions(): { recordingOptions: { persist: true } } | null {
  return !IS_WEB && attemptCaptureSupported() ? { recordingOptions: { persist: true } } : null;
}

/* ------------------------------------------------------------------ *
 * Web capture
 * ------------------------------------------------------------------ */

let stream: MediaStream | null = null;
let recorder: MediaRecorder | null = null;
let chunks: Blob[] = [];

function releaseStream(): void {
  try {
    stream?.getTracks().forEach((track) => track.stop());
  } catch {}
  stream = null;
}

/** Start the browser-side recording that runs beside the recognizer. */
export async function beginWebAttempt(): Promise<boolean> {
  if (!IS_WEB || recorder || !attemptCaptureSupported()) return false;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    return false;
  }
  try {
    const preferred = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
    const mimeType = preferred.find((type) => MediaRecorder.isTypeSupported(type));
    const made = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    chunks = [];
    made.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    made.start();
    recorder = made;
    return true;
  } catch {
    releaseStream();
    return false;
  }
}

/** Finish the browser recording and resolve an object URL for replay. */
export function endWebAttempt(): Promise<string | null> {
  const current = recorder;
  if (!current) return Promise.resolve(null);
  recorder = null;

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      const blob = new Blob(chunks, { type: current.mimeType || 'audio/webm' });
      chunks = [];
      releaseStream();
      resolve(blob.size > 0 ? URL.createObjectURL(blob) : null);
    };
    current.onstop = finish;
    try {
      current.stop();
    } catch {
      finish();
    }
  });
}

/** Drop an in-flight browser recording without keeping it (unmount). */
export function cancelWebAttempt(): void {
  const current = recorder;
  recorder = null;
  chunks = [];
  if (current) {
    current.onstop = null;
    try {
      current.stop();
    } catch {}
  }
  releaseStream();
}

/* ------------------------------------------------------------------ *
 * Cleanup
 * ------------------------------------------------------------------ */

/**
 * Delete an attempt recording. Safe on both platforms and for `null`; a URI
 * that is already gone is not an error worth surfacing.
 */
export function discardAttempt(uri: string | null): void {
  if (!uri) return;
  if (uri.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(uri);
    } catch {}
    return;
  }
  if (IS_WEB) return;
  try {
    new File(uri).delete();
  } catch {}
}
