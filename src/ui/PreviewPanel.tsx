import { useMemo } from "react";
import { useStore } from "../state/store";
import { deviceRegistry } from "../registry/DeviceRegistry";
import { categoryRegistry } from "../registry/CategoryRegistry";
import type { Medium } from "../model/types";

const MEDIUM_LABELS: Record<string, string> = {
  lan: "LAN",
  wifi: "Wi-Fi",
  trunk: "Trunk",
  wan: "WAN",
  sdwan: "SD-WAN",
  vpn_ipsec: "IPsec VPN",
  vpn_ssl: "SSL VPN",
  peering: "Peering",
  api: "API",
  saml: "SAML",
  oidc: "OIDC",
  sso: "SSO",
  data_flow: "Data Flow",
  mdm_push: "MDM Push",
  policy: "Policy",
  enrollment: "Enrollment",
  nfc: "NFC",
  bluetooth: "Bluetooth",
};

const mediumColor: Record<string, string> = {
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
};

export default function PreviewPanel() {
  const selectedNodeId = useStore((s) => s.selectedNodeId);
  const topology = useStore((s) => s.topology);
  const selectNode = useStore((s) => s.selectNode);
  const selectEdge = useStore((s) => s.selectEdge);

  const selectedNode = useMemo(
    () => topology.nodes.find((n) => n.id === selectedNodeId),
    [topology.nodes, selectedNodeId],
  );

  const connections = useMemo(() => {
    if (!selectedNodeId) return [];
    return topology.edges
      .filter((e) => e.source === selectedNodeId || e.target === selectedNodeId)
      .map((e) => {
        const neighborId =
          e.source === selectedNodeId ? e.target : e.source;
        const neighbor = topology.nodes.find((n) => n.id === neighborId);
        const direction =
          e.source === selectedNodeId ? "outgoing" : "incoming";
        return { edge: e, neighbor, neighborId, direction };
      })
      .sort((a, b) => {
        if (a.direction !== b.direction)
          return a.direction === "incoming" ? -1 : 1;
        return (a.neighbor?.label ?? "").localeCompare(
          b.neighbor?.label ?? "",
        );
      });
  }, [selectedNodeId, topology.edges, topology.nodes]);

  const incoming = connections.filter((c) => c.direction === "incoming");
  const outgoing = connections.filter((c) => c.direction === "outgoing");

  if (!selectedNode) {
    return (
      <div
        style={{
          padding: 16,
          color: "#64748b",
          fontSize: 12,
          textAlign: "center",
          marginTop: 40,
        }}
      >
        Select a node to see its connections.
      </div>
    );
  }

  const def = deviceRegistry.get(selectedNode.typeId);
  const cat = categoryRegistry.get(
    def?.category ?? "custom",
  );
  const nodeColor = cat?.color ?? "#64748b";

  const imageUrl = selectedNode.config.imageDataUrl as string | undefined;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: 10,
        height: "100%",
        overflow: "auto",
        color: "#f8fafc",
        fontSize: 12,
      }}
    >
      <div
        style={{
          background: "#1e293b",
          borderRadius: 8,
          padding: 12,
          border: `2px solid ${nodeColor}`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 4,
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: nodeColor,
            }}
          />
          <strong style={{ fontSize: 14 }}>{selectedNode.label}</strong>
        </div>
        <div style={{ color: "#94a3b8", fontSize: 11 }}>
          {def?.name ?? selectedNode.typeId}
          {def?.vendor && def.vendor !== "builtin" ? ` · ${def.vendor}` : ""}
        </div>
        <div style={{ color: "#64748b", fontSize: 11, marginTop: 2 }}>
          {connections.length} connection{connections.length !== 1 ? "s" : ""}
          {" · "}
          {incoming.length} in · {outgoing.length} out
        </div>
      </div>

      {imageUrl && (
        <div
          style={{
            background: "#1e293b",
            borderRadius: 8,
            padding: 8,
            border: "1px solid #334155",
          }}
        >
          <div
            style={{
              color: "#94a3b8",
              fontSize: 10,
              marginBottom: 4,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Image
          </div>
          <img
            src={imageUrl}
            alt={selectedNode.label}
            style={{
              maxWidth: "100%",
              maxHeight: 200,
              borderRadius: 4,
              display: "block",
            }}
          />
        </div>
      )}

      {Boolean(selectedNode.config.text) && (
        <div
          style={{
            background: "#1e293b",
            borderRadius: 8,
            padding: 8,
            border: "1px solid #334155",
          }}
        >
          <div
            style={{
              color: "#94a3b8",
              fontSize: 10,
              marginBottom: 4,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Note
          </div>
          <div style={{ whiteSpace: "pre-wrap", color: "#cbd5e1" }}>
            {String(selectedNode.config.text)}
          </div>
        </div>
      )}

      {incoming.length > 0 && (
        <div>
          <div
            style={{
              color: "#94a3b8",
              fontSize: 10,
              marginBottom: 6,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            ← Incoming ({incoming.length})
          </div>
          {incoming.map((c) => (
            <ConnectionCard
              key={c.edge.id}
              neighborLabel={c.neighbor?.label ?? c.neighborId}
              neighborTypeId={c.neighbor?.typeId}
              medium={c.edge.medium}
              direction="incoming"
              onClickNode={() => selectNode(c.neighborId)}
              onClickEdge={() => selectEdge(c.edge.id)}
            />
          ))}
        </div>
      )}

      {outgoing.length > 0 && (
        <div>
          <div
            style={{
              color: "#94a3b8",
              fontSize: 10,
              marginBottom: 6,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            → Outgoing ({outgoing.length})
          </div>
          {outgoing.map((c) => (
            <ConnectionCard
              key={c.edge.id}
              neighborLabel={c.neighbor?.label ?? c.neighborId}
              neighborTypeId={c.neighbor?.typeId}
              medium={c.edge.medium}
              direction="outgoing"
              onClickNode={() => selectNode(c.neighborId)}
              onClickEdge={() => selectEdge(c.edge.id)}
            />
          ))}
        </div>
      )}

      {connections.length === 0 && (
        <div
          style={{
            color: "#475569",
            textAlign: "center",
            padding: 20,
            fontSize: 11,
          }}
        >
          No connections yet.
          <br />
          Drag from a handle to connect.
        </div>
      )}
    </div>
  );
}

function ConnectionCard({
  neighborLabel,
  neighborTypeId,
  medium,
  direction,
  onClickNode,
  onClickEdge,
}: {
  neighborLabel: string;
  neighborTypeId?: string;
  medium: Medium;
  direction: "incoming" | "outgoing";
  onClickNode: () => void;
  onClickEdge: () => void;
}) {
  const mColor = mediumColor[medium] ?? "#94a3b8";
  const mLabel = MEDIUM_LABELS[medium] ?? medium;
  const def = neighborTypeId ? deviceRegistry.get(neighborTypeId) : null;
  const cat = categoryRegistry.get(def?.category ?? "custom");
  const nColor = cat?.color ?? "#64748b";

  return (
    <div
      style={{
        background: "#0f1a2c",
        borderRadius: 6,
        padding: "8px 10px",
        marginBottom: 4,
        border: "1px solid #1e293b",
        display: "flex",
        alignItems: "center",
        gap: 8,
        cursor: "pointer",
        transition: "background 150ms ease",
      }}
      onClick={onClickNode}
      onMouseEnter={(e) =>
        ((e.currentTarget as HTMLDivElement).style.background = "#162033")
      }
      onMouseLeave={(e) =>
        ((e.currentTarget as HTMLDivElement).style.background = "#0f1a2c")
      }
    >
      <span
        style={{
          color: mColor,
          fontSize: 14,
          fontWeight: 700,
          minWidth: 16,
          textAlign: "center",
        }}
      >
        {direction === "incoming" ? "←" : "→"}
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: nColor,
              flexShrink: 0,
            }}
          />
          <strong
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {neighborLabel}
          </strong>
        </div>
        {neighborTypeId && (
          <div
            style={{
              color: "#64748b",
              fontSize: 10,
              marginTop: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {def?.name ?? neighborTypeId}
          </div>
        )}
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onClickEdge();
        }}
        style={{
          background: `${mColor}20`,
          color: mColor,
          border: `1px solid ${mColor}40`,
          borderRadius: 4,
          padding: "2px 6px",
          fontSize: 10,
          fontWeight: 600,
          cursor: "pointer",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
        title={`Click to select edge (${mLabel})`}
      >
        {mLabel}
      </button>
    </div>
  );
}
