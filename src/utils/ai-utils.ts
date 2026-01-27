import { of, delay } from "rxjs";

/**
 * Simulates an AI response for demo purposes.
 * Returns an Observable that emits a formatted HTML string after a delay.
 *
 * @param text The input text to "transform"
 * @param t CodeGeneration translations
 */
export function simulateAiResponse(
  text: string,
  t: { aiTransformationPrefix: string; aiRealIntegrationComment: string }
) {
  const response = `<blockquote><p>✨ <strong>${t.aiTransformationPrefix}</strong><br>${t.aiRealIntegrationComment} ${text.toUpperCase()}</p></blockquote>`;
  return of(response).pipe(delay(1500));
}
