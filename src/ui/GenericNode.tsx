import { Handle, Position } from "reactflow";
import type { NetNode } from "../model/types";
import { categoryRegistry } from "../registry/CategoryRegistry";

interface Props {
  data: {
    node: NetNode;
    category: string;
    icon?: string;
    selected?: boolean;
    simHighlight?: { action: "allow" | "deny" | "drop"; color: string };
  };
  selected?: boolean;
}

export default function GenericNode({ data, selected }: Props) {
  const color = categoryRegistry.get(data.category)?.color ?? "#64748b";
  const hi = data.simHighlight;
  const ringColor = hi ? hi.color : selected ? "#38bdf8" : null;
  return (
    <div
      style={{
        border: `2px solid ${selected ? "#fff" : color}`,
        background: "#1e293b",
        color: "#f8fafc",
        padding: "8px 12px",
        borderRadius: 8,
        minWidth: 140,
        boxShadow: ringColor
          ? `0 0 0 3px ${ringColor}, 0 0 12px ${ringColor}`
          : "0 2px 6px rgba(0,0,0,0.4)",
        fontSize: 12,
        transition: "box-shadow 200ms ease",
      }}
    >
      <Handle type="target" position={Position.Left} />
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
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: color,
          }}
        />
        <strong>{data.node.label}</strong>
      </div>
      <div style={{ opacity: 0.6, fontSize: 10, marginTop: 2 }}>
        {data.node.typeId}
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
