/**
 * Edge AI engine — the on-device "brain" slot of the offline-first stack.
 *
 * Premium learners download a quantised small language model (4-bit GGUF)
 * and llama.rn (llama.cpp; Metal on iOS, CPU/GPU on Android) runs it on the
 * phone. `lib/edgeAI/modelStore.ts` registers the engine once a model is
 * installed. Expo Go and the website have no native runtime, so
 * `getEdgeEngine()` stays null there and the app says so plainly; offline
 * questions are then answered from lesson retrieval instead.
 *
 * Pure module (no React Native imports) so the check script can load it.
 */

export interface EdgeEngine {
  /** e.g. "llama.cpp" or "onnxruntime-mobile". */
  runtime: string;
  modelId: string;
  generate(prompt: string, opts?: { maxTokens?: number }): Promise<string>;
}

export interface EdgeModelSpec {
  id: string;
  name: string;
  params: string;
  quantization: string;
  format: 'GGUF' | 'ONNX';
  /** Approximate download size in MB (display only). */
  sizeMb: number;
  /** Exact file size in bytes — a download that doesn't match is discarded. */
  bytes: number;
  /** Pinned Hugging Face commit: the file behind the URL can never change. */
  revision: string;
  /** SHA-256 published by Hugging Face for the pinned file (for audits). */
  sha256: string;
  url: string;
  fileName: string;
  license: string;
  /** Minimum free RAM recommended, in GB. */
  minRamGb: number;
  note: string;
}

/** The SLMs the offline stack is designed around (blueprint section 3A). */
export const EDGE_MODELS: EdgeModelSpec[] = [
  {
    id: 'qwen2.5-1.5b-instruct-q4',
    name: 'Qwen2.5 1.5B Instruct',
    params: '1.5B',
    quantization: '4-bit (Q4_K_M)',
    format: 'GGUF',
    sizeMb: 1117,
    bytes: 1117320736,
    revision: '91cad51170dc346986eccefdc2dd33a9da36ead9',
    sha256: '6a1a2eb6d15622bf3c96857206351ba97e1af16c30d7a74ee38970e434e9407e',
    url: 'https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/91cad51170dc346986eccefdc2dd33a9da36ead9/qwen2.5-1.5b-instruct-q4_k_m.gguf',
    fileName: 'qwen2.5-1.5b-instruct-q4_k_m.gguf',
    license: 'Apache-2.0',
    minRamGb: 3,
    note: 'Same model family as the Bingo cloud tutor today. Best fit for mid-range Android.',
  },
  {
    id: 'gemma-2-2b-it-q4',
    name: 'Gemma 2 2B Instruct',
    params: '2B',
    quantization: '4-bit (Q4_K_M)',
    format: 'GGUF',
    sizeMb: 1709,
    bytes: 1708582752,
    revision: '855f67caed130e1befc571b52bd181be2e858883',
    sha256: 'e0aee85060f168f0f2d8473d7ea41ce2f3230c1bc1374847505ea599288a7787',
    url: 'https://huggingface.co/bartowski/gemma-2-2b-it-GGUF/resolve/855f67caed130e1befc571b52bd181be2e858883/gemma-2-2b-it-Q4_K_M.gguf',
    fileName: 'gemma-2-2b-it-Q4_K_M.gguf',
    license: 'Gemma Terms of Use',
    minRamGb: 4,
    note: 'Stronger multilingual answers. Needs a recent phone.',
  },
  {
    id: 'phi-3-mini-4k-q4',
    name: 'Phi-3 Mini 4K Instruct',
    params: '3.8B',
    quantization: '4-bit (Q4)',
    format: 'GGUF',
    sizeMb: 2393,
    bytes: 2393231072,
    revision: 'a64113399c2f6b8ad3e11c394733a2ddadaa7f33',
    sha256: '8a83c7fb9049a9b2e92266fa7ad04933bb53aa1e85136b7b30f1b8000ff2edef',
    url: 'https://huggingface.co/microsoft/Phi-3-mini-4k-instruct-gguf/resolve/a64113399c2f6b8ad3e11c394733a2ddadaa7f33/Phi-3-mini-4k-instruct-q4.gguf',
    fileName: 'Phi-3-mini-4k-instruct-q4.gguf',
    license: 'MIT',
    minRamGb: 6,
    note: 'Best reasoning of the three. Flagship phones only.',
  },
];

let engine: EdgeEngine | null = null;

export function registerEdgeEngine(next: EdgeEngine | null): void {
  engine = next;
}

export function getEdgeEngine(): EdgeEngine | null {
  return engine;
}

export function edgeModel(id: string | null | undefined): EdgeModelSpec | undefined {
  return EDGE_MODELS.find((m) => m.id === id);
}

/** An installed file is current only if it came from the pinned revision at the exact size. */
export function installIsCurrent(
  spec: EdgeModelSpec,
  installed: { revision: string; bytes: number } | null | undefined
): boolean {
  return !!installed && installed.revision === spec.revision && installed.bytes === spec.bytes;
}

/** Human-readable status for the Offline AI screen. */
export function edgeEngineStatus(): { ready: boolean; label: string } {
  if (engine) return { ready: true, label: `${engine.modelId} running on ${engine.runtime}` };
  return {
    ready: false,
    label:
      'No on-device model is running, so offline questions are answered by searching your lessons.',
  };
}
