import { useCallback, useEffect, useRef, useState } from 'react';
import { URL_SYNC_DEBOUNCE_MS } from './constants';

interface ParamSpec<T> {
  parse: (raw: string | null) => T;
  serialize: (value: T) => string | null;
}

// `any` so S preserves the literal T of each ParamSpec at the call site
// (using `unknown` would widen and break inference).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Specs = Record<string, ParamSpec<any>>;
type StateOf<S extends Specs> = {
  [K in keyof S]: S[K] extends ParamSpec<infer T> ? T : never;
};

export type HistoryMode = 'push' | 'replace';
export interface UpdateOptions {
  history?: HistoryMode;
}

const stringParam = (defaultValue: string): ParamSpec<string> => ({
  parse: (raw) => raw ?? defaultValue,
  serialize: (value) => (value === defaultValue ? null : value),
});

const stringListParam = (): ParamSpec<string[]> => ({
  parse: (raw) => (raw ? raw.split(',').filter(Boolean) : []),
  serialize: (value) => (value.length > 0 ? value.join(',') : null),
});

function readParams<S extends Specs>(specs: S): StateOf<S> {
  const sp = new URLSearchParams(window.location.search);
  const out: Record<string, unknown> = {};
  for (const key in specs) {
    out[key] = specs[key].parse(sp.get(key));
  }
  return out as StateOf<S>;
}

function writeParams<S extends Specs>(specs: S, values: StateOf<S>, mode: HistoryMode): void {
  const sp = new URLSearchParams(window.location.search);
  for (const key in specs) {
    const serialized = specs[key].serialize(values[key]);
    if (serialized === null) sp.delete(key);
    else sp.set(key, serialized);
  }
  const qs = sp.toString();
  const url = (qs ? `${window.location.pathname}?${qs}` : window.location.pathname) + window.location.hash;
  if (mode === 'push') window.history.pushState(null, '', url);
  else window.history.replaceState(null, '', url);
}

export function useUrlState<S extends Specs>(
  specs: S,
): [StateOf<S>, (patch: Partial<StateOf<S>>, options?: UpdateOptions) => void] {
  const [state, setState] = useState<StateOf<S>>(() => readParams(specs));
  const nextHistoryMode = useRef<HistoryMode>('replace');
  const isFromPop = useRef(false);
  const isFirstSync = useRef(true);

  useEffect(() => {
    const onPop = () => {
      isFromPop.current = true;
      setState(readParams(specs));
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [specs]);

  // Sync state -> URL after commit so the updater stays pure.
  //
  // `replace` writes are debounced, `push` writes are not. Every character typed into the
  // search box is one replaceState, and Safari throttles the History API to roughly 100
  // calls per 30 seconds before it starts throwing SecurityError, which fast typing reaches
  // on its own. A push is a deliberate history entry (opening or closing the modal, so the
  // back button works) and has to land immediately; the effect cleanup drops any replace
  // still pending, and since writeParams serializes the whole of `state` rather than a
  // patch, the push that supersedes it carries the dropped value anyway.
  useEffect(() => {
    if (isFirstSync.current) {
      isFirstSync.current = false;
      return;
    }
    if (isFromPop.current) {
      isFromPop.current = false;
      return;
    }
    const mode = nextHistoryMode.current;
    nextHistoryMode.current = 'replace';
    if (mode === 'push') {
      writeParams(specs, state, 'push');
      return;
    }
    const timer = setTimeout(() => writeParams(specs, state, 'replace'), URL_SYNC_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [state, specs]);

  const update = useCallback(
    (patch: Partial<StateOf<S>>, options?: UpdateOptions) => {
      if (options?.history) nextHistoryMode.current = options.history;
      setState((prev) => ({ ...prev, ...patch }));
    },
    [],
  );

  return [state, update];
}

export const urlParams = {
  string: stringParam,
  stringList: stringListParam,
};
