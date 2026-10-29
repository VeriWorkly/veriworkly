import type { ReactElement, ReactNode } from "react";

/**
 * Runs a client component's own hooks without a DOM: the test file mocks `react` with `hooks`,
 * and `mount` calls the component, runs its effects and re-renders until state settles. Child
 * components are not rendered; the returned tree is the JSX the component itself wrote.
 */

type Slot = { value: unknown; deps?: readonly unknown[] };
type Effect = { run: () => void | (() => void); deps?: readonly unknown[]; cleanup?: () => void };

let slots: Slot[] = [];
let effects: Effect[] = [];
let cursor = 0;
let effectCursor = 0;
let pending: number[] = [];
let dirty = false;

const changed = (prev: readonly unknown[] | undefined, next: readonly unknown[] | undefined) =>
  !prev || !next || prev.length !== next.length || next.some((d, i) => !Object.is(d, prev[i]));

function slot(init: () => unknown) {
  const index = cursor++;
  if (!(index in slots)) slots[index] = { value: init() };
  return slots[index]!;
}

export const hooks = {
  useState<T>(initial: T | (() => T)) {
    const s = slot(() => (typeof initial === "function" ? (initial as () => T)() : initial));
    const set = (next: T | ((prev: T) => T)) => {
      const value =
        typeof next === "function" ? (next as (prev: T) => T)(s.value as T) : (next as T);
      if (!Object.is(value, s.value)) {
        s.value = value;
        dirty = true;
      }
    };
    return [s.value as T, set] as const;
  },
  useRef<T>(initial: T) {
    return slot(() => ({ current: initial })).value as { current: T };
  },
  useCallback<T>(fn: T, deps: readonly unknown[]) {
    const s = slot(() => fn);
    if (changed(s.deps, deps)) {
      s.value = fn;
      s.deps = deps;
    }
    return s.value as T;
  },
  useEffect(run: Effect["run"], deps?: readonly unknown[]) {
    const index = effectCursor++;
    const prev = effects[index];
    if (!prev || changed(prev.deps, deps)) {
      effects[index] = { run, deps, cleanup: prev?.cleanup };
      pending.push(index);
    }
  },
};

export function mount<P extends object>(Component: (props: P) => ReactNode, props: P) {
  slots = [];
  effects = [];

  let tree: ReactNode = null;

  const render = () => {
    for (let pass = 0; pass < 50; pass++) {
      cursor = 0;
      effectCursor = 0;
      pending = [];
      dirty = false;
      tree = Component(props);
      for (const index of pending) {
        const effect = effects[index]!;
        effect.cleanup?.();
        const cleanup = effect.run();
        effect.cleanup = typeof cleanup === "function" ? cleanup : undefined;
      }
      if (!dirty) return;
    }
    throw new Error("component did not settle after 50 renders");
  };

  render();

  return {
    get tree() {
      return tree;
    },
    /** Lets awaited work (a submit) finish, then re-renders with whatever state it set. */
    async settle() {
      for (let i = 0; i < 10; i++) await new Promise((resolve) => setTimeout(resolve, 0));
      render();
    },
    rerender: render,
  };
}

const childrenOf = (node: ReactNode): ReactNode[] => {
  if (Array.isArray(node)) return node.flatMap(childrenOf);
  if (node && typeof node === "object" && "props" in node) {
    const element = node as ReactElement<{ children?: ReactNode }>;
    return [element, ...childrenOf(element.props.children)];
  }
  return [node];
};

/** Every element the component wrote, depth first. */
export const elements = (tree: ReactNode) =>
  childrenOf(tree).filter(
    (n): n is ReactElement<Record<string, unknown>> => !!n && typeof n === "object",
  );

/** All the text the component wrote, joined. */
export const text = (tree: ReactNode) =>
  childrenOf(tree)
    .filter((n) => typeof n === "string" || typeof n === "number")
    .join(" ");

export const byProp = (tree: ReactNode, prop: string, value: unknown) =>
  elements(tree).find((el) => el.props[prop] === value);
