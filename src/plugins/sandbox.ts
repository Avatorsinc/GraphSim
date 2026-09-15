import SandboxWorker from "./sandboxWorker?worker";
import type { Evaluator, Verdict } from "../sim/types";

interface CustomEvaluatorRecord {
  id: string;
  source: string;
  timeoutMs: number;
}

class CustomEvaluatorRegistry {
  private records = new Map<string, CustomEvaluatorRecord>();

  set(id: string, source: string, timeoutMs = 200) {
    this.records.set(id, { id, source, timeoutMs });
  }

  get(id: string): CustomEvaluatorRecord | undefined {
    return this.records.get(id);
  }

  remove(id: string) {
    this.records.delete(id);
  }

  list() {
    return [...this.records.values()];
  }

  buildEvaluator(id: string): Evaluator | null {
    const rec = this.records.get(id);
    if (!rec) return null;
    return (node, ctx) => {
      const result = runSync(rec.source, node, ctx, rec.timeoutMs);
      return result;
    };
  }
}

function runSync(
  source: string,
  node: unknown,
  ctx: unknown,
  timeoutMs: number,
): Verdict {

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

  const start = Date.now();
  const tick = () => {
    if (Date.now() - start > timeoutMs)
      throw new Error(`evaluator timeout ${timeoutMs}ms`);
  };

  try {
    const factory = new Function(
      "helpers",
      "tick",
      `"use strict";\n${source}\nreturn typeof evaluate === "function" ? evaluate : null;`,
    );
    const evaluate = factory(helpers, tick);
    if (!evaluate)
      return {
        action: "drop",
        note: "custom evaluator missing `evaluate()`",
      };
    const v = evaluate(node, ctx);
    if (!v || typeof v !== "object" || !("action" in v))
      return { action: "drop", note: "evaluator returned bad verdict" };
    return v as Verdict;
  } catch (e) {
    return {
      action: "drop",
      note: `evaluator error: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

let _warmed = false;
function warmup() {
  if (_warmed) return;
  _warmed = true;
  try {
    new SandboxWorker().terminate();
  } catch {
  }
}
warmup();

export const customEvaluators = new CustomEvaluatorRegistry();
