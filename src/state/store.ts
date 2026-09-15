import { create } from "zustand";
import { v4 as uuid } from "uuid";
import type {
  Topology,
  NetNode,
  NetEdge,
  Identity,
  TestFlow,
  NodeId,
  Annotation,
} from "../model/types";

export interface Snapshot {
  at: string;
  label: string;
  topology: Topology;
}

export interface SimHop {
  nodeId: string;
  action: "allow" | "deny" | "drop";
}

export interface SimPath {
  hops: SimHop[];
  reached: boolean;
  label: string;
  color: string;
}

export interface SimHighlight {
  paths: SimPath[];
  startedAt: number;
}

const HISTORY_MAX = 100;

interface StoreState {
  topology: Topology;
  selectedNodeId: NodeId | null;
  snapshots: Snapshot[];

  past: Topology[];
  future: Topology[];
  recordHistory: () => void;
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;

  takeSnapshot: (label?: string) => void;
  restoreSnapshot: (index: number) => void;
  clearSnapshots: () => void;
  importFragment: (nodes: NetNode[], edges: NetEdge[]) => void;

  addNode: (partial: Omit<NetNode, "id">) => NodeId;
  updateNode: (id: NodeId, patch: Partial<NetNode>) => void;
  removeNode: (id: NodeId) => void;
  moveNode: (id: NodeId, x: number, y: number) => void;

  addEdge: (partial: Omit<NetEdge, "id">) => string;
  updateEdge: (id: string, patch: Partial<NetEdge>) => void;
  removeEdge: (id: string) => void;
  selectedEdgeId: string | null;
  selectEdge: (id: string | null) => void;

  addIdentity: (i: Omit<Identity, "id">) => string;
  addFlow: (f: Omit<TestFlow, "id">) => string;

  addAnnotation: (a: Omit<Annotation, "id">) => string;
  updateAnnotation: (id: string, patch: Partial<Annotation>) => void;
  removeAnnotation: (id: string) => void;
  selectedAnnotationId: string | null;
  selectAnnotation: (id: string | null) => void;
  drawingTool: "zone" | "note" | null;
  setDrawingTool: (t: "zone" | "note" | null) => void;

  simHighlight: SimHighlight | null;
  setSimHighlight: (h: SimHighlight | null) => void;

  selectNode: (id: NodeId | null) => void;

  loadTopology: (t: Topology) => void;
  newTopology: (name?: string) => void;
  exportJSON: () => string;
}

const blankTopology = (name = "Untitled"): Topology => ({
  id: uuid(),
  name,
  version: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  nodes: [],
  edges: [],
  identities: [],
  flows: [],
});

const touch = (t: Topology): Topology => ({
  ...t,
  updatedAt: new Date().toISOString(),
  version: t.version + 1,
});

const pushHistory = (s: Pick<StoreState, "past" | "topology">) => ({
  past: [...s.past, structuredClone(s.topology)].slice(-HISTORY_MAX),
  future: [] as Topology[],
});

export const useStore = create<StoreState>((set, get) => ({
  topology: blankTopology(),
  selectedNodeId: null,
  selectedEdgeId: null,
  selectedAnnotationId: null,
  drawingTool: null,
  setDrawingTool: (t) => set({ drawingTool: t }),
  simHighlight: null,
  setSimHighlight: (h) => set({ simHighlight: h }),
  snapshots: [],

  past: [],
  future: [],

  recordHistory: () =>
    set((s) => ({
      past: [...s.past, structuredClone(s.topology)].slice(-HISTORY_MAX),
      future: [],
    })),

  undo: () =>
    set((s) => {
      if (s.past.length === 0) return {};
      const prev = s.past[s.past.length - 1];
      return {
        topology: prev,
        past: s.past.slice(0, -1),
        future: [structuredClone(s.topology), ...s.future].slice(
          0,
          HISTORY_MAX,
        ),
      };
    }),

  redo: () =>
    set((s) => {
      if (s.future.length === 0) return {};
      const next = s.future[0];
      return {
        topology: next,
        past: [...s.past, structuredClone(s.topology)].slice(-HISTORY_MAX),
        future: s.future.slice(1),
      };
    }),

  clearHistory: () => set({ past: [], future: [] }),

  addAnnotation: (a) => {
    const id = uuid();
    set((s) => ({
      ...pushHistory(s),
      topology: touch({
        ...s.topology,
        annotations: [...(s.topology.annotations ?? []), { ...a, id }],
      }),
    }));
    return id;
  },

  updateAnnotation: (id, patch) =>
    set((s) => ({
      ...pushHistory(s),
      topology: touch({
        ...s.topology,
        annotations: (s.topology.annotations ?? []).map((a) =>
          a.id === id ? { ...a, ...patch } : a,
        ),
      }),
    })),

  removeAnnotation: (id) =>
    set((s) => ({
      ...pushHistory(s),
      topology: touch({
        ...s.topology,
        annotations: (s.topology.annotations ?? []).filter((a) => a.id !== id),
      }),
      selectedAnnotationId:
        s.selectedAnnotationId === id ? null : s.selectedAnnotationId,
    })),

  selectAnnotation: (id) => set({ selectedAnnotationId: id }),

  takeSnapshot: (label) =>
    set((s) => ({
      snapshots: [
        ...s.snapshots,
        {
          at: new Date().toISOString(),
          label: label ?? `v${s.topology.version}`,
          topology: structuredClone(s.topology),
        },
      ].slice(-20),
    })),

  restoreSnapshot: (index) =>
    set((s) => {
      const snap = s.snapshots[index];
      if (!snap) return {};
      return {
        ...pushHistory(s),
        topology: structuredClone(snap.topology),
      };
    }),

  clearSnapshots: () => set({ snapshots: [] }),

  importFragment: (nodes, edges) =>
    set((s) => ({
      ...pushHistory(s),
      topology: touch({
        ...s.topology,
        nodes: [...s.topology.nodes, ...nodes],
        edges: [...s.topology.edges, ...edges],
      }),
    })),

  addNode: (partial) => {
    const id = uuid();
    set((s) => ({
      ...pushHistory(s),
      topology: touch({
        ...s.topology,
        nodes: [...s.topology.nodes, { ...partial, id }],
      }),
    }));
    return id;
  },

  updateNode: (id, patch) =>
    set((s) => ({
      ...pushHistory(s),
      topology: touch({
        ...s.topology,
        nodes: s.topology.nodes.map((n) =>
          n.id === id ? { ...n, ...patch } : n,
        ),
      }),
    })),

  removeNode: (id) =>
    set((s) => ({
      ...pushHistory(s),
      topology: touch({
        ...s.topology,
        nodes: s.topology.nodes.filter((n) => n.id !== id),
        edges: s.topology.edges.filter(
          (e) => e.source !== id && e.target !== id,
        ),
      }),
      selectedNodeId:
        s.selectedNodeId === id ? null : s.selectedNodeId,
    })),

  moveNode: (id, x, y) =>
    set((s) => ({
      topology: {
        ...s.topology,
        nodes: s.topology.nodes.map((n) =>
          n.id === id ? { ...n, position: { x, y } } : n,
        ),
      },
    })),

  addEdge: (partial) => {
    const id = uuid();
    set((s) => ({
      ...pushHistory(s),
      topology: touch({
        ...s.topology,
        edges: [...s.topology.edges, { ...partial, id }],
      }),
    }));
    return id;
  },

  updateEdge: (id, patch) =>
    set((s) => ({
      ...pushHistory(s),
      topology: touch({
        ...s.topology,
        edges: s.topology.edges.map((e) =>
          e.id === id ? { ...e, ...patch } : e,
        ),
      }),
    })),

  removeEdge: (id) =>
    set((s) => ({
      ...pushHistory(s),
      topology: touch({
        ...s.topology,
        edges: s.topology.edges.filter((e) => e.id !== id),
      }),
      selectedEdgeId: s.selectedEdgeId === id ? null : s.selectedEdgeId,
    })),

  selectEdge: (id) => set({ selectedEdgeId: id }),

  addIdentity: (i) => {
    const id = uuid();
    set((s) => ({
      ...pushHistory(s),
      topology: touch({
        ...s.topology,
        identities: [...s.topology.identities, { ...i, id }],
      }),
    }));
    return id;
  },

  addFlow: (f) => {
    const id = uuid();
    set((s) => ({
      ...pushHistory(s),
      topology: touch({
        ...s.topology,
        flows: [...s.topology.flows, { ...f, id }],
      }),
    }));
    return id;
  },

  selectNode: (id) => set({ selectedNodeId: id }),

  loadTopology: (t) =>
    set((s) => ({
      ...pushHistory(s),
      topology: t,
      selectedNodeId: null,
    })),

  newTopology: (name) =>
    set((s) => ({
      ...pushHistory(s),
      topology: blankTopology(name),
      selectedNodeId: null,
    })),

  exportJSON: () => JSON.stringify(get().topology, null, 2),
}));
