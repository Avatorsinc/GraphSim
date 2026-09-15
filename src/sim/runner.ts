import type {
  EvalContext,
  Flow,
  HopRecord,
  SimResult,
} from "./types";
import { evaluatorRegistry } from "./evaluators";
import { deviceRegistry } from "../registry/DeviceRegistry";
import { customEvaluators } from "../plugins/sandbox";
import type { NetNode, NodeId, Topology } from "../model/types";
import { ipOf } from "./cidr";

const MAX_HOPS = 64;

function buildAdjacency(topo: Topology): Map<NodeId, NodeId[]> {
  const adj = new Map<NodeId, NodeId[]>();
  const link = (a: NodeId, b: NodeId) => {
    (adj.get(a) ?? adj.set(a, []).get(a)!).push(b);
  };
  for (const e of topo.edges) {
    link(e.source, e.target);
    link(e.target, e.source);
  }
  for (const n of topo.nodes) {
    if (n.parentId) {
      link(n.id, n.parentId);
      link(n.parentId, n.id);
    }
  }
  return adj;
}

function shortestPath(
  src: NodeId,
  dst: NodeId,
  adj: Map<NodeId, NodeId[]>,
): NodeId[] | null {
  if (src === dst) return [src];
  const queue: NodeId[] = [src];
  const prev = new Map<NodeId, NodeId>();
  const seen = new Set<NodeId>([src]);
  while (queue.length) {
    const cur = queue.shift()!;
    if (cur === dst) break;
    for (const n of adj.get(cur) ?? []) {
      if (seen.has(n)) continue;
      seen.add(n);
      prev.set(n, cur);
      queue.push(n);
    }
  }
  if (!seen.has(dst)) return null;
  const path: NodeId[] = [dst];
  while (path[0] !== src) {
    const p = prev.get(path[0]);
    if (!p) return null;
    path.unshift(p);
  }
  return path;
}

function nodeForIpFactory(topo: Topology) {
  return (ip: string): NetNode | undefined => {
    for (const n of topo.nodes) {
      const cfg = n.config as Record<string, unknown>;
      if (typeof cfg?.ip === "string" && ipOf(cfg.ip as string) === ip)
        return n;
      if (cfg?.interfaceIps && typeof cfg.interfaceIps === "object") {
        for (const v of Object.values(
          cfg.interfaceIps as Record<string, string>,
        )) {
          if (ipOf(v) === ip) return n;
        }
      }
    }
    return undefined;
  };
}

function evaluatorIdFor(typeId: string): string {
  return deviceRegistry.get(typeId)?.evaluator ?? "passthrough";
}

function evaluatorFor(typeId: string) {
  const def = deviceRegistry.get(typeId);
  if (def?.evaluator === "custom" && def.evaluatorRef) {
    const ce = customEvaluators.buildEvaluator(def.evaluatorRef);
    if (ce) return { fn: ce, id: `custom:${def.evaluatorRef}` };
  }
  const id = def?.evaluator ?? "passthrough";
  return { fn: evaluatorRegistry[id], id };
}

export function simulate(topo: Topology, flow: Flow): SimResult {
  const adj = buildAdjacency(topo);
  const path = shortestPath(flow.src, flow.dst, adj);
  if (!path) {
    return {
      kind: "no_path",
      trace: [],
      message: "No connected path between src and dst.",
    };
  }

  const identity = flow.identityId
    ? topo.identities.find((i) => i.id === flow.identityId)
    : undefined;

  const srcCfg = topo.nodes.find((n) => n.id === flow.src)?.config as
    | Record<string, unknown>
    | undefined;
  const dstCfg = topo.nodes.find((n) => n.id === flow.dst)?.config as
    | Record<string, unknown>
    | undefined;
  const enrichedFlow: Flow = {
    ...flow,
    srcIp: flow.srcIp ?? ipOf(srcCfg?.ip as string),
    dstIp: flow.dstIp ?? ipOf(dstCfg?.ip as string),
  };

  const ctx: EvalContext = {
    topology: topo,
    flow: enrichedFlow,
    identity,
    neighborsOf: (id) => adj.get(id) ?? [],
    nodeForIp: nodeForIpFactory(topo),
  };

  const trace: HopRecord[] = [];

  for (let i = 0; i < path.length; i++) {
    if (trace.length >= MAX_HOPS) {
      return { kind: "loop", trace, message: "max hops exceeded" };
    }
    const node = topo.nodes.find((n) => n.id === path[i])!;
    const { fn, id: evalId } = evaluatorFor(node.typeId);
    void evaluatorIdFor;
    if (!fn) {
      trace.push({
        nodeId: node.id,
        nodeLabel: node.label,
        typeId: node.typeId,
        evaluator: evalId,
        verdict: { action: "drop", note: `unknown evaluator ${evalId}` },
      });
      return {
        kind: "error",
        trace,
        message: `unknown evaluator ${evalId}`,
      };
    }
    const verdict = fn(node, ctx);
    trace.push({
      nodeId: node.id,
      nodeLabel: node.label,
      typeId: node.typeId,
      evaluator: evalId,
      verdict,
    });
    if (verdict.action !== "allow") {
      return { kind: "blocked", trace };
    }
  }

  return { kind: "reached", trace };
}
