import { Handle, Position } from "reactflow";
import type { NetNode } from "../model/types";

const tint: Record<string, string> = {
  cloud: "rgba(245,158,11,0.08)",
  l3: "rgba(139,92,246,0.08)",
  l2: "rgba(16,185,129,0.08)",
  custom: "rgba(100,116,139,0.08)",
};
const border: Record<string, string> = {
  cloud: "rgba(245,158,11,0.5)",
  l3: "rgba(139,92,246,0.5)",
  l2: "rgba(16,185,129,0.5)",
  custom: "rgba(100,116,139,0.5)",
};

interface Props {
  data: { node: NetNode; category: string };
  selected?: boolean;
}

export default function GroupNode({ data, selected }: Props) {
  const cat = data.category;
  return (
    <div
      style={{
        background: tint[cat] ?? tint.custom,
        border: `1px dashed ${selected ? "#38bdf8" : border[cat] ?? border.custom}`,
        borderRadius: 10,
        width: "100%",
        height: "100%",
        position: "relative",
        boxSizing: "border-box",
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: "#475569" }}
      />
      <div
        style={{
          position: "absolute",
          top: -10,
          left: 12,
          background: "#0f172a",
          padding: "0 6px",
          color: "#cbd5e1",
          fontSize: 11,
          fontWeight: 600,
        }}
      >
        {data.node.label}
      </div>
      <div
        style={{
          position: "absolute",
          top: -10,
          right: 12,
          background: "#0f172a",
          padding: "0 6px",
          color: "#64748b",
          fontSize: 10,
        }}
      >
        {data.node.typeId.replace("generic.", "")}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: "#475569" }}
      />
    </div>
  );
}
