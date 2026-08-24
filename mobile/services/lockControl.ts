// Tiny shared flag so the app-lock can tell an *intentional* in-app excursion
// (the system file picker / folder picker, or the auth prompt itself, which all
// briefly send the app to the background) apart from the user actually leaving
// the app. While a "trusted interaction" is in progress the lock does not engage.
let _depth = 0;

export function beginTrusted(): void {
  _depth += 1;
}

export function endTrusted(): void {
  _depth = Math.max(0, _depth - 1);
}

export function isTrusted(): boolean {
  return _depth > 0;
}

/** Run an async action that opens a system UI, without tripping the app lock. */
export async function runTrusted<T>(fn: () => Promise<T>): Promise<T> {
  beginTrusted();
  try {
    return await fn();
  } finally {
    // Delay the reset slightly so the returning foreground event (which fires
    // just after the picker closes) still sees the interaction as trusted.
    setTimeout(endTrusted, 800);
  }
}
