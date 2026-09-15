import type { NetNode, NodeId, Topology, Identity } from "../model/types";

export interface Flow {
  src: NodeId;
  dst: NodeId;
  srcIp?: string;
  dstIp?: string;
  proto: "tcp" | "udp" | "icmp";
  port?: number;
  identityId?: string;
}

export type Verdict =
  | { action: "allow"; nextHop?: NodeId; matchedRule?: string; note?: string }
  | { action: "deny" | "drop"; matchedRule?: string; note?: string };

export interface HopRecord {
  nodeId: NodeId;
  nodeLabel: string;
  typeId: string;
  evaluator: string;
  verdict: Verdict;
}

export type SimResultKind = "reached" | "blocked" | "loop" | "no_path" | "error";

export interface SimResult {
  kind: SimResultKind;
  trace: HopRecord[];
  message?: string;
}

export interface EvalContext {
  topology: Topology;
  flow: Flow;
  identity?: Identity;
  neighborsOf: (id: NodeId) => NodeId[];
  nodeForIp: (ip: string) => NetNode | undefined;
}

export type Evaluator = (
  node: NetNode,
  ctx: EvalContext,
) => Verdict;
