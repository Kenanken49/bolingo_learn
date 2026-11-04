/**
 * Web / default build: there is no native llama.cpp runtime here. The
 * native implementation lives in `llamaRuntime.native.ts`; Metro picks it
 * on iOS and Android, so the web bundle never references `llama.rn`.
 */
export interface LoadedModel {
  generate(prompt: string, opts?: { maxTokens?: number; system?: string }): Promise<string>;
  release(): Promise<void>;
}

export const RUNTIME_NAME = 'llama.cpp';

export function llamaAvailable(): boolean {
  return false;
}

export function llamaUnavailableReason(): string {
  return 'On-device models run in the Bolingo Android and iOS apps. The website uses offline lesson search instead.';
}

export async function loadLlamaModel(_path: string): Promise<LoadedModel> {
  throw new Error(llamaUnavailableReason());
}
