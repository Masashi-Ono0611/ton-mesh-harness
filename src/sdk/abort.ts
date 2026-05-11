/**
 * Tiny AbortSignal → ERR_CANCELLED bridge. Used at every phase
 * boundary in long-running async generators (`writeDnsRecord`,
 * `writeDnsRecordAgentic`) and at race-window checkpoints in
 * `agenticSignAndSend`.
 *
 * Kept in its own file so consumers that don't need any other
 * dns-helpers / deploy machinery can still get the abort-check
 * pattern without pulling those in.
 *
 * NO `console.*` IN THIS FILE — lint-enforced.
 */

import { SdkError } from './deploy'

/**
 * Build a `checkAborted()` thunk that throws `ERR_CANCELLED` when the
 * signal has fired. `message` is included in the error so logs
 * distinguish which surface the cancel originated from.
 */
export function makeAbortChecker(
  signal: AbortSignal | undefined,
  message: string,
): () => void {
  return () => {
    if (signal?.aborted) {
      throw new SdkError('ERR_CANCELLED', message, { severity: 'recoverable' })
    }
  }
}
