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

export default function ImageNode({ data, selected }: Props) {
  const imageDataUrl = data.node.config.imageDataUrl as string | undefined;
  const hi = data.simHighlight;
  const ringColor = hi ? hi.color : selected ? "#38bdf8" : null;

  return (
    <div
      style={{
        background: "#1e293b",
        color: "#f8fafc",
        padding: 8,
        borderRadius: 8,
        border: `2px solid ${selected ? "#38bdf8" : "#334155"}`,
        boxShadow: ringColor
          ? `0 0 0 3px ${ringColor}, 0 0 12px ${ringColor}`
          : "0 2px 6px rgba(0,0,0,0.4)",
        fontSize: 12,
        transition: "box-shadow 200ms ease",
        display: "inline-block",
      }}
    >
      <Handle type="target" position={Position.Left} />
      {imageDataUrl ? (
        <img
          src={imageDataUrl}
          alt={data.node.label}
          style={{
            maxWidth: 300,
            maxHeight: 200,
            display: "block",
            borderRadius: 4,
            objectFit: "contain",
          }}
        />
      ) : (
        <div
          style={{
            width: 160,
            height: 90,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#0f172a",
            borderRadius: 4,
            color: "#64748b",
            fontSize: 11,
          }}
        >
          No image
        </div>
      )}
      <div
        style={{
          marginTop: 4,
          textAlign: "center",
          fontSize: 10,
          opacity: 0.7,
        }}
      >
        {data.node.label}
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
