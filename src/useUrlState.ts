import { useCallback, useEffect, useState } from 'react';

interface ParamSpec<T> {
  parse: (raw: string | null) => T;
  serialize: (value: T) => string | null;
}

// Constraint uses `any` so that S preserves the literal T of each ParamSpec
// at the call site (using `unknown` would widen and break inference).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Specs = Record<string, ParamSpec<any>>;
type StateOf<S extends Specs> = {
  [K in keyof S]: S[K] extends ParamSpec<infer T> ? T : never;
};

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

function writeParams<S extends Specs>(specs: S, values: StateOf<S>): void {
  const sp = new URLSearchParams(window.location.search);
  for (const key in specs) {
    const serialized = specs[key].serialize(values[key]);
    if (serialized === null) sp.delete(key);
    else sp.set(key, serialized);
  }
  const qs = sp.toString();
  const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
  window.history.replaceState(null, '', url);
}

export function useUrlState<S extends Specs>(
  specs: S,
): [StateOf<S>, (patch: Partial<StateOf<S>>) => void] {
  const [state, setState] = useState<StateOf<S>>(() => readParams(specs));

  useEffect(() => {
    const onPop = () => setState(readParams(specs));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [specs]);

  const update = useCallback(
    (patch: Partial<StateOf<S>>) => {
      setState((prev) => {
        const next = { ...prev, ...patch };
        writeParams(specs, next);
        return next;
      });
    },
    [specs],
  );

  return [state, update];
}

export const urlParams = {
  string: stringParam,
  stringList: stringListParam,
};
