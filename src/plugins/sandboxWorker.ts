/// <reference lib="WebWorker" />

declare const self: DedicatedWorkerGlobalScope;

const danger = [
  "fetch",
  "XMLHttpRequest",
  "WebSocket",
  "importScripts",
  "indexedDB",
  "caches",
  "Notification",
] as const;
for (const k of danger) {
  try {
    (self as unknown as Record<string, unknown>)[k] = undefined;
  } catch {
  }
}

interface EvalRequest {
  id: number;
  source: string;
  node: unknown;
  ctx: unknown;
  timeoutMs: number;
}

interface EvalResponse {
  id: number;
  ok: boolean;
  verdict?: unknown;
  error?: string;
}

self.onmessage = (e: MessageEvent<EvalRequest>) => {
  const { id, source, node, ctx, timeoutMs } = e.data;
  const start = Date.now();

  const helpers = {
    matchHost(pattern: string, ip: string): boolean {
      if (!pattern || pattern === "any" || pattern === "*") return true;
      if (!ip) return false;
      if (!pattern.includes("/")) return pattern === ip;
      const [base, bitsStr] = pattern.split("/");
      const bits = Number(bitsStr);
      const toInt = (s: string) =>
        s.split(".").reduce((a, p) => (a << 8) | Number(p), 0) >>> 0;
      const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
      return (toInt(ip) & mask) === (toInt(base) & mask);
    },
    matchPort(pattern: string | number | undefined, port?: number): boolean {
      if (pattern === undefined || pattern === "any" || pattern === "*")
        return true;
      if (port === undefined) return false;
      const s = String(pattern);
      if (s.includes("-")) {
        const [lo, hi] = s.split("-").map(Number);
        return port >= lo && port <= hi;
      }
      return Number(s) === port;
    },
  };

  const tick = () => {
    if (Date.now() - start > timeoutMs)
      throw new Error(`evaluator timeout (${timeoutMs}ms)`);
  };

  try {
    const factory = new Function(
      "helpers",
      "tick",
      `
      "use strict";
      ${source}
      return typeof evaluate === "function" ? evaluate : null;
    `,
    );
    const evaluate = factory(helpers, tick);
    if (!evaluate) {
      const r: EvalResponse = {
        id,
        ok: false,
        error: "user code did not define `evaluate(node, ctx)`",
      };
      self.postMessage(r);
      return;
    }
    const verdict = evaluate(Object.freeze(node), Object.freeze(ctx));
    const r: EvalResponse = { id, ok: true, verdict };
    self.postMessage(r);
  } catch (err) {
    const r: EvalResponse = {
      id,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
    self.postMessage(r);
  }
};

export {};
