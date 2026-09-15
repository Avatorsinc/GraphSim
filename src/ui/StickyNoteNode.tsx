import { Handle, Position } from "reactflow";
import type { NetNode } from "../model/types";

interface Props {
  data: {
    node: NetNode;
    category: string;
    simHighlight?: { action: "allow" | "deny" | "drop"; color: string };
  };
  selected?: boolean;
}

export default function StickyNoteNode({ data, selected }: Props) {
  const bg = (data.node.config.color as string) ?? "#fde68a";
  const hi = data.simHighlight;
  const ringColor = hi ? hi.color : selected ? "#ffffff" : null;

  return (
    <div
      style={{
        background: bg,
        color: "#1e293b",
        padding: "10px 12px",
        borderRadius: 4,
        minWidth: 100,
        maxWidth: 200,
        border: `2px solid ${selected ? "#fff" : "rgba(0,0,0,0.12)"}`,
        boxShadow: ringColor
          ? `0 0 0 3px ${ringColor}, 0 0 12px ${ringColor}`
          : "2px 3px 8px rgba(0,0,0,0.18)",
        fontSize: 12,
        transition: "box-shadow 200ms ease",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}
    >
      <Handle type="target" position={Position.Left} />
      <div style={{ fontWeight: 700, marginBottom: 4 }}>
        {data.node.label}
      </div>
      {Boolean(data.node.config.text) && (
        <div
          style={{
            fontSize: 11,
            lineHeight: 1.4,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {data.node.config.text as string}
        </div>
      )}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
