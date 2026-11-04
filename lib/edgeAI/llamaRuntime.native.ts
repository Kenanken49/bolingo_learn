/**
 * Native on-device runtime: llama.rn (llama.cpp bindings). Runs 4-bit GGUF
 * small language models on the phone, with Metal acceleration on iOS and
 * GPU offload where the Android device supports it.
 *
 * Loaded lazily: Expo Go has no llama.rn native module, and a static import
 * would crash there. In that case `llamaAvailable()` is false and the app
 * says plainly that a development or store build is needed.
 */
export interface LoadedModel {
  generate(prompt: string, opts?: { maxTokens?: number; system?: string }): Promise<string>;
  release(): Promise<void>;
}

export const RUNTIME_NAME = 'llama.cpp';

let mod: any = null;
let tried = false;

function llama(): any | null {
  if (!tried) {
    tried = true;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      mod = require('llama.rn');
      if (typeof mod?.initLlama !== 'function') mod = null;
    } catch (e) {
      console.warn('llama.rn native module unavailable (Expo Go?):', e);
      mod = null;
    }
  }
  return mod;
}

export function llamaAvailable(): boolean {
  return llama() != null;
}

export function llamaUnavailableReason(): string {
  return 'This build of the app does not include the on-device model runtime. Install the Bolingo app from the store or a development build.';
}

const SYSTEM =
  'You are Bingo, a warm, patient tutor in the Bolingo Learn app. Answer in 2-4 short sentences. Use only the lesson extracts you are given.';

export async function loadLlamaModel(path: string): Promise<LoadedModel> {
  const L = llama();
  if (!L) throw new Error(llamaUnavailableReason());
  const ctx = await L.initLlama({
    model: path.startsWith('file://') ? path.slice('file://'.length) : path,
    n_ctx: 2048,
    n_gpu_layers: 99,
    use_mlock: false,
  });
  return {
    async generate(prompt, opts = {}) {
      const result = await ctx.completion({
        messages: [
          { role: 'system', content: opts.system ?? SYSTEM },
          { role: 'user', content: prompt },
        ],
        n_predict: opts.maxTokens ?? 256,
        temperature: 0.3,
        top_p: 0.9,
      });
      const text = String(result?.content || result?.text || '')
        .replace(/<think>[\s\S]*?<\/think>/g, '')
        .trim();
      if (!text) throw new Error('The on-device model returned an empty answer.');
      return text;
    },
    async release() {
      await ctx.release();
    },
  };
}
