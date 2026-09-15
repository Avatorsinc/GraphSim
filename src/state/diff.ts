import type { Topology } from "../model/types";

export interface TopologyDiff {
  nodes: { added: string[]; removed: string[]; changed: string[] };
  edges: { added: string[]; removed: string[]; changed: string[] };
}

export function diffTopology(a: Topology, b: Topology): TopologyDiff {
  const aNodes = new Map(a.nodes.map((n) => [n.id, n]));
  const bNodes = new Map(b.nodes.map((n) => [n.id, n]));
  const aEdges = new Map(a.edges.map((e) => [e.id, e]));
  const bEdges = new Map(b.edges.map((e) => [e.id, e]));

  const addedN: string[] = [];
  const removedN: string[] = [];
  const changedN: string[] = [];
  for (const [id, n] of bNodes) {
    if (!aNodes.has(id)) addedN.push(id);
    else if (JSON.stringify(aNodes.get(id)) !== JSON.stringify(n))
      changedN.push(id);
  }
  for (const id of aNodes.keys())
    if (!bNodes.has(id)) removedN.push(id);

  const addedE: string[] = [];
  const removedE: string[] = [];
  const changedE: string[] = [];
  for (const [id, e] of bEdges) {
    if (!aEdges.has(id)) addedE.push(id);
    else if (JSON.stringify(aEdges.get(id)) !== JSON.stringify(e))
      changedE.push(id);
  }
  for (const id of aEdges.keys())
    if (!bEdges.has(id)) removedE.push(id);

  return {
    nodes: { added: addedN, removed: removedN, changed: changedN },
    edges: { added: addedE, removed: removedE, changed: changedE },
  };
}
