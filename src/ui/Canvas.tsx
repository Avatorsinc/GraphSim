import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  applyNodeChanges,
  applyEdgeChanges,
  useReactFlow,
  type Node as RFNode,
  type Edge as RFEdge,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from "reactflow";
import "reactflow/dist/style.css";
import { useStore } from "../state/store";
import GenericNode from "./GenericNode";
import GroupNode from "./GroupNode";
import AnnotationNode from "./AnnotationNode";
import StickyNoteNode from "./StickyNoteNode";
import ImageNode from "./ImageNode";
import LogicNode from "./LogicNode";
import { deviceRegistry } from "../registry/DeviceRegistry";
import type { NetNode, Medium } from "../model/types";

const nodeTypes = {
  generic: GenericNode,
  group: GroupNode,
  annotation: AnnotationNode,
  sticky_note: StickyNoteNode,
  image: ImageNode,
  logic: LogicNode,
};

const CONTAINER_TYPES = new Set([
  "generic.cloud_tenant",
  "generic.cloud_region",
  "generic.cloud_vpc",
]);

const DEFAULT_GROUP_SIZE: Record<string, { w: number; h: number }> = {
  "generic.cloud_tenant": { w: 760, h: 560 },
  "generic.cloud_region": { w: 600, h: 440 },
  "generic.cloud_vpc": { w: 460, h: 320 },
};

function categoryFor(typeId: string): string {
  return deviceRegistry.get(typeId)?.category ?? "custom";
}

function isContainer(typeId: string): boolean {
  return CONTAINER_TYPES.has(typeId);
}

const mediumColor: Record<Medium, string> = {
  lan: "#94a3b8",
  wifi: "#14b8a6",
  trunk: "#22d3ee",
  wan: "#a78bfa",
  vpn_ipsec: "#f59e0b",
  vpn_ssl: "#f59e0b",
  peering: "#10b981",
  sdwan: "#ec4899",
  api: "#6366f1",
  saml: "#f97316",
  oidc: "#f97316",
  sso: "#22c55e",
  mdm_push: "#8b5cf6",
  nfc: "#06b6d4",
  bluetooth: "#0ea5e9",
  policy: "#a855f7",
  enrollment: "#d946ef",
  data_flow: "#64748b",
  reference: "#94a3b8",
  note_link: "#fbbf24",
  depends_on: "#fb923c",
  leads_to: "#38bdf8",
  triggers: "#f43f5e",
  condition: "#eab308",
  unlocks: "#22c55e",
  requires: "#ef4444",
  authenticates: "#8b5cf6",
};

const ANIMATED_MEDIA = new Set<Medium>([
  "vpn_ipsec", "vpn_ssl", "peering", "sso", "saml", "oidc", "nfc",
  "triggers", "authenticates",
]);

const DASHED_MEDIA = new Set<Medium>([
  "wifi", "nfc", "bluetooth", "policy", "mdm_push", "enrollment",
  "reference", "note_link", "depends_on", "condition", "requires",
]);

const MEDIUM_LABELS: Record<Medium, string> = {
  lan: "LAN",
  wifi: "Wi-Fi",
  trunk: "Trunk",
  wan: "WAN",
  vpn_ipsec: "IPsec VPN",
  vpn_ssl: "SSL VPN",
  peering: "Peering",
  sdwan: "SD-WAN",
  api: "API",
  saml: "SAML",
  oidc: "OIDC",
  sso: "SSO",
  mdm_push: "MDM Push",
  nfc: "NFC",
  bluetooth: "Bluetooth",
  policy: "Policy",
  enrollment: "Enrollment",
  data_flow: "Data Flow",
  reference: "See also",
  note_link: "Note",
  depends_on: "Depends on",
  leads_to: "Then",
  triggers: "Triggers",
  condition: "If",
  unlocks: "Unlocks",
  requires: "Requires",
  authenticates: "Auth",
};

function DrawingLayer() {
  const tool = useStore((s) => s.drawingTool);
  const setDrawingTool = useStore((s) => s.setDrawingTool);
  const addAnnotation = useStore((s) => s.addAnnotation);
  const reactFlow = useReactFlow();
  const ref = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{
    sx: number;
    sy: number;
    ex: number;
    ey: number;
  } | null>(null);

  useEffect(() => {
    if (!tool) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDrawingTool(null);
        setDrag(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tool, setDrawingTool]);

  if (!tool) return null;

  return (
    <div
      ref={ref}
      onMouseDown={(e) => {
        if (e.button !== 0) return;
        const rect = ref.current!.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setDrag({ sx: x, sy: y, ex: x, ey: y });
      }}
      onMouseMove={(e) => {
        if (!drag) return;
        const rect = ref.current!.getBoundingClientRect();
        setDrag({
          ...drag,
          ex: e.clientX - rect.left,
          ey: e.clientY - rect.top,
        });
      }}
      onMouseUp={() => {
        if (!drag) {
          setDrawingTool(null);
          return;
        }
        const rect = ref.current!.getBoundingClientRect();
        const left = Math.min(drag.sx, drag.ex);
        const top = Math.min(drag.sy, drag.ey);
        const w = Math.abs(drag.ex - drag.sx);
        const h = Math.abs(drag.ey - drag.sy);
        if (w < 10 || h < 10) {
          setDrag(null);
          setDrawingTool(null);
          return;
        }
        const tl = reactFlow.screenToFlowPosition({
          x: rect.left + left,
          y: rect.top + top,
        });
        const br = reactFlow.screenToFlowPosition({
          x: rect.left + left + w,
          y: rect.top + top + h,
        });
        addAnnotation({
          kind: tool,
          label: tool === "zone" ? "Zone" : "Note",
          color: tool === "zone" ? "#fbbf24" : "#fde68a",
          position: { x: tl.x, y: tl.y },
          size: { w: br.x - tl.x, h: br.y - tl.y },
        });
        setDrag(null);
        setDrawingTool(null);
      }}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 50,
        cursor: "crosshair",
        background: "rgba(15,23,42,0.05)",
      }}
    >
      {drag && (
        <div
          style={{
            position: "absolute",
            left: Math.min(drag.sx, drag.ex),
            top: Math.min(drag.sy, drag.ey),
            width: Math.abs(drag.ex - drag.sx),
            height: Math.abs(drag.ey - drag.sy),
            border: `2px dashed ${tool === "zone" ? "#fbbf24" : "#fde68a"}`,
            background:
              tool === "zone"
                ? "rgba(251,191,36,0.15)"
                : "rgba(253,230,138,0.25)",
            pointerEvents: "none",
            borderRadius: 4,
          }}
        />
      )}
      <div
        style={{
          position: "absolute",
          top: 8,
          left: 8,
          background: "rgba(15,23,42,0.95)",
          color: "#f8fafc",
          padding: "6px 10px",
          borderRadius: 4,
          fontSize: 11,
          pointerEvents: "none",
          border: "1px solid #334155",
        }}
      >
        Drawing {tool} — drag to create · Esc to cancel
      </div>
    </div>
  );
}

function CanvasInner() {
  const topology = useStore((s) => s.topology);
  const selectedNodeId = useStore((s) => s.selectedNodeId);
  const moveNode = useStore((s) => s.moveNode);
  const removeNode = useStore((s) => s.removeNode);
  const removeEdge = useStore((s) => s.removeEdge);
  const addNetEdge = useStore((s) => s.addEdge);
  const addNode = useStore((s) => s.addNode);
  const selectNode = useStore((s) => s.selectNode);
  const selectEdge = useStore((s) => s.selectEdge);
  const selectedEdgeId = useStore((s) => s.selectedEdgeId);
  const selectedAnnotationId = useStore((s) => s.selectedAnnotationId);
  const selectAnnotation = useStore((s) => s.selectAnnotation);
  const updateAnnotation = useStore((s) => s.updateAnnotation);
  const removeAnnotation = useStore((s) => s.removeAnnotation);
  const recordHistory = useStore((s) => s.recordHistory);
  const simHighlight = useStore((s) => s.simHighlight);
  const reactFlow = useReactFlow();
  const draggingRef = useRef(false);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const t = e.target as HTMLElement | null;
      const editable =
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.tagName === "SELECT" ||
          t.isContentEditable);
      if (editable) return;

      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            const { x, y, zoom } = reactFlow.getViewport();
            const centerX = (-x + window.innerWidth / 2) / zoom;
            const centerY = (-y + window.innerHeight / 2) / zoom;
            addNode({
              typeId: "meta.image",
              label: file.name || "Screenshot",
              position: { x: centerX - 150, y: centerY - 100 },
              interfaces: [],
              config: { imageDataUrl: dataUrl },
            });
          };
          reader.readAsDataURL(file);
          return;
        }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [addNode, reactFlow]);

  const { highlightedEdges, highlightedNodes } = useMemo(() => {
    const edgeMap = new Map<
      string,
      { color: string; blocked: boolean; order: number }
    >();
    const nodeMap = new Map<
      string,
      { action: "allow" | "deny" | "drop"; color: string }
    >();
    if (!simHighlight) return { highlightedEdges: edgeMap, highlightedNodes: nodeMap };
    for (const path of simHighlight.paths) {
      const hops = path.hops;
      hops.forEach((hop) => {
        const existing = nodeMap.get(hop.nodeId);
        const moreRestrictive =
          !existing ||
          (existing.action === "allow" && hop.action !== "allow");
        if (moreRestrictive) {
          nodeMap.set(hop.nodeId, {
            action: hop.action,
            color:
              hop.action === "allow"
                ? "#22c55e"
                : hop.action === "deny"
                  ? "#f87171"
                  : "#fbbf24",
          });
        }
      });
      for (let i = 0; i < hops.length - 1; i++) {
        const a = hops[i].nodeId;
        const b = hops[i + 1].nodeId;
        const e = topology.edges.find(
          (ed) =>
            (ed.source === a && ed.target === b) ||
            (ed.source === b && ed.target === a),
        );
        if (!e) continue;
        const blocked = hops[i + 1].action !== "allow";
        edgeMap.set(e.id, {
          color: blocked ? "#ef4444" : path.color,
          blocked,
          order: i,
        });
      }
    }
    return { highlightedEdges: edgeMap, highlightedNodes: nodeMap };
  }, [simHighlight, topology.edges]);

  const rfNodes: RFNode[] = useMemo(() => {
    const sorted = [...topology.nodes].sort((a, b) => {
      const ac = isContainer(a.typeId) ? 0 : 1;
      const bc = isContainer(b.typeId) ? 0 : 1;
      return ac - bc;
    });
    const annotations = topology.annotations ?? [];
    const zoneNodes: RFNode[] = annotations
      .filter((a) => a.kind === "zone")
      .map((a) => ({
        id: `ann_${a.id}`,
        type: "annotation",
        position: a.position,
        data: { annotation: a },
        zIndex: -10, // behind everything
        style: {
          width: a.size.w,
          height: a.size.h,
          pointerEvents: "none",
        },
        dragHandle: ".zone-handle",
        selected: a.id === selectedAnnotationId,
        selectable: true,
        draggable: true,
      }));
    const noteNodes: RFNode[] = annotations
      .filter((a) => a.kind === "note")
      .map((a) => ({
        id: `ann_${a.id}`,
        type: "annotation",
        position: a.position,
        data: { annotation: a },
        zIndex: 10,
        style: { width: a.size.w, height: a.size.h },
        selected: a.id === selectedAnnotationId,
        selectable: true,
        draggable: true,
      }));
    const deviceNodes: RFNode[] = sorted.map((n: NetNode) => {
      const container = isContainer(n.typeId);
      const size = DEFAULT_GROUP_SIZE[n.typeId];
      const hi = highlightedNodes.get(n.id);
      const rfType = container
        ? "group"
        : n.typeId === "meta.sticky_note"
          ? "sticky_note"
          : n.typeId === "meta.image"
            ? "image"
            : n.typeId.startsWith("logic.")
              ? "logic"
              : "generic";
      return {
        id: n.id,
        type: rfType,
        position: n.position,
        data: {
          node: n,
          category: categoryFor(n.typeId),
          simHighlight: hi,
        },
        selected: n.id === selectedNodeId,
        ...(n.parentId
          ? { parentNode: n.parentId, extent: "parent" as const }
          : {}),
        ...(container && size
          ? { style: { width: size.w, height: size.h } }
          : {}),
      };
    });
    return [...zoneNodes, ...deviceNodes, ...noteNodes];
  }, [
    topology.nodes,
    topology.annotations,
    selectedNodeId,
    selectedAnnotationId,
    highlightedNodes,
  ]);

  const rfEdges: RFEdge[] = useMemo(
    () =>
      topology.edges.map((e) => {
        const hi = highlightedEdges.get(e.id);
        const baseStroke = mediumColor[e.medium] ?? "#94a3b8";
        return {
          id: e.id,
          source: e.source,
          target: e.target,
          label: MEDIUM_LABELS[e.medium] ?? e.medium,
          animated:
            !!hi || ANIMATED_MEDIA.has(e.medium),
          selected: e.id === selectedEdgeId,
          style: {
            stroke: hi ? hi.color : baseStroke,
            strokeWidth: hi ? 4 : e.id === selectedEdgeId ? 3 : 1.5,
            strokeDasharray:
              DASHED_MEDIA.has(e.medium) && !hi ? "4 4" : undefined,
            filter: hi ? `drop-shadow(0 0 4px ${hi.color})` : undefined,
          },
          labelStyle: {
            fontSize: 10,
            fill: hi ? hi.color : "#cbd5e1",
            fontWeight: hi ? 700 : 400,
          },
          labelBgStyle: { fill: "#0f172a" },
        };
      }),
    [topology.edges, selectedEdgeId, highlightedEdges],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const next = applyNodeChanges(changes, rfNodes);
      for (const change of changes) {
        if (change.type === "position" && change.position) {
          if (change.dragging && !draggingRef.current) {
            recordHistory();
            draggingRef.current = true;
          }
          if (change.dragging === false) {
            draggingRef.current = false;
          }
          if (change.id.startsWith("ann_")) {
            updateAnnotation(change.id.slice(4), {
              position: { x: change.position.x, y: change.position.y },
            });
          } else {
            moveNode(change.id, change.position.x, change.position.y);
          }
        }
        if (change.type === "remove") {
          if (change.id.startsWith("ann_")) {
            removeAnnotation(change.id.slice(4));
          } else {
            removeNode(change.id);
          }
        }
        if (change.type === "select") {
          if (change.id.startsWith("ann_")) {
            selectAnnotation(change.selected ? change.id.slice(4) : null);
          } else {
            selectNode(change.selected ? change.id : null);
          }
        }
      }
      void next;
    },
    [
      rfNodes,
      moveNode,
      removeNode,
      selectNode,
      updateAnnotation,
      removeAnnotation,
      selectAnnotation,
      recordHistory,
    ],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const next = applyEdgeChanges(changes, rfEdges);
      for (const change of changes) {
        if (change.type === "remove") removeEdge(change.id);
        if (change.type === "select")
          selectEdge(change.selected ? change.id : null);
      }
      void next;
    },
    [rfEdges, removeEdge, selectEdge],
  );

  const onConnect = useCallback(
    (c: Connection) => {
      if (!c.source || !c.target) return;
      const src = topology.nodes.find((n) => n.id === c.source);
      const dst = topology.nodes.find((n) => n.id === c.target);
      const srcCat = src ? categoryFor(src.typeId) : "";
      const dstCat = dst ? categoryFor(dst.typeId) : "";
      let medium: Medium = "lan";
      const isIdentityCat = (c: string) => c === "identity" || c === "mdm";
      const isMdm = (id?: string) =>
        id?.startsWith("vendor.suremdm.") || id?.startsWith("vendor.intune.");
      const isEntra = (id?: string) =>
        id?.startsWith("vendor.entra.");
      const isLogic = (c: string) => c === "logic";
      const isStickyNote = (id?: string) => id === "meta.sticky_note";
      const isImage = (id?: string) => id === "meta.image";
      const isAnnotation = (id?: string) => isStickyNote(id) || isImage(id);

      if (isLogic(srcCat) && isLogic(dstCat)) {
        if (src?.typeId === "logic.decision" || dst?.typeId === "logic.decision")
          medium = "condition";
        else if (src?.typeId === "logic.credential" || dst?.typeId === "logic.credential")
          medium = "authenticates";
        else
          medium = "leads_to";
      }
      else if (isLogic(srcCat) || isLogic(dstCat)) {
        if (src?.typeId === "logic.credential" || dst?.typeId === "logic.credential")
          medium = "unlocks";
        else
          medium = "leads_to";
      }
      else if (isAnnotation(src?.typeId) || isAnnotation(dst?.typeId))
        medium = "note_link";
      else if (
        src?.typeId === "generic.vpn_gateway" ||
        dst?.typeId === "generic.vpn_gateway"
      )
        medium = "vpn_ipsec";
      else if (
        src?.typeId === "generic.cloud_vpc" &&
        dst?.typeId === "generic.cloud_vpc"
      )
        medium = "peering";
      else if (srcCat === "wireless" || dstCat === "wireless")
        medium = "wifi";
      else if (isEntra(src?.typeId) || isEntra(dst?.typeId)) {
        if (isMdm(src?.typeId) || isMdm(dst?.typeId))
          medium = "saml";
        else
          medium = "sso";
      } else if (isMdm(src?.typeId) && isMdm(dst?.typeId))
        medium = "policy";
      else if (
        (isMdm(src?.typeId) && !isMdm(dst?.typeId)) ||
        (!isMdm(src?.typeId) && isMdm(dst?.typeId))
      )
        medium = "mdm_push";
      else if (isIdentityCat(srcCat) || isIdentityCat(dstCat))
        medium = "api";
      addNetEdge({ source: c.source, target: c.target, medium });
    },
    [addNetEdge, topology.nodes],
  );

  return (
    <>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        minZoom={0.05}
        maxZoom={5}
        deleteKeyCode={["Backspace", "Delete"]}
        style={{ background: "#0f172a" }}
      >
        <Background color="#1e293b" gap={16} />
        <MiniMap
          pannable
          zoomable
          nodeColor="#334155"
          maskColor="rgba(15,23,42,0.7)"
        />
        <Controls />
      </ReactFlow>
      <DrawingLayer />
    </>
  );
}

export default function Canvas() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}
