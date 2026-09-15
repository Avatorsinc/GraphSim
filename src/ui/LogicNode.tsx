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

type LogicShape = "diamond" | "pill" | "gate" | "rect" | "hexagon";

function shapeFor(typeId: string): LogicShape {
  if (typeId === "logic.decision") return "diamond";
  if (typeId === "logic.start" || typeId === "logic.end") return "pill";
  if (typeId === "logic.or_gate" || typeId === "logic.and_gate") return "gate";
  if (typeId === "logic.check") return "hexagon";
  return "rect";
}

const SHAPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  "logic.decision":  { bg: "#fef3c7", border: "#f59e0b", text: "#78350f" },
  "logic.or_gate":   { bg: "#e0f2fe", border: "#0ea5e9", text: "#0c4a6e" },
  "logic.and_gate":  { bg: "#e0f2fe", border: "#0ea5e9", text: "#0c4a6e" },
  "logic.process":   { bg: "#f0fdf4", border: "#22c55e", text: "#14532d" },
  "logic.action":    { bg: "#faf5ff", border: "#a855f7", text: "#3b0764" },
  "logic.start":     { bg: "#d1fae5", border: "#10b981", text: "#064e3b" },
  "logic.end":       { bg: "#fecaca", border: "#ef4444", text: "#7f1d1d" },
  "logic.check":     { bg: "#fef9c3", border: "#eab308", text: "#713f12" },
  "logic.credential":{ bg: "#ede9fe", border: "#8b5cf6", text: "#4c1d95" },
};

const ICONS: Record<string, string> = {
  "logic.decision": "◇",
  "logic.or_gate": "∨",
  "logic.and_gate": "∧",
  "logic.process": "⚙",
  "logic.action": "▶",
  "logic.start": "●",
  "logic.end": "◼",
  "logic.check": "✓",
  "logic.credential": "🔑",
};

export default function LogicNode({ data, selected }: Props) {
  const { node } = data;
  const shape = shapeFor(node.typeId);
  const colors = SHAPE_COLORS[node.typeId] ?? { bg: "#f0fdf4", border: "#22c55e", text: "#14532d" };
  const hi = data.simHighlight;
  const ringColor = hi ? hi.color : selected ? "#fff" : null;
  const icon = ICONS[node.typeId] ?? "";

  const subtitle =
    (node.config.condition as string) ||
    (node.config.description as string) ||
    (node.config.what as string) ||
    (node.config.method as string) ||
    (node.config.actor as string) ||
    (node.config.result as string) ||
    "";

  const baseStyle: React.CSSProperties = {
    background: colors.bg,
    color: colors.text,
    border: `2px solid ${selected ? "#fff" : colors.border}`,
    boxShadow: ringColor
      ? `0 0 0 3px ${ringColor}, 0 0 12px ${ringColor}`
      : `0 2px 6px rgba(0,0,0,0.15)`,
    fontSize: 12,
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    transition: "box-shadow 200ms ease",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    position: "relative",
  };

  if (shape === "diamond") {
    return (
      <div
        style={{
          ...baseStyle,
          width: 120,
          height: 120,
          transform: "rotate(45deg)",
          borderRadius: 8,
          padding: 8,
        }}
      >
        <Handle type="target" position={Position.Left} style={{ transform: "rotate(-45deg)" }} />
        <div style={{ transform: "rotate(-45deg)", padding: 4 }}>
          <div style={{ fontWeight: 700, fontSize: 11 }}>{icon} {node.label}</div>
          {subtitle && (
            <div style={{ fontSize: 9, marginTop: 2, opacity: 0.8, lineHeight: 1.2 }}>
              {subtitle}
            </div>
          )}
        </div>
        <Handle type="source" position={Position.Right} style={{ transform: "rotate(-45deg)" }} id="yes" />
        <Handle type="source" position={Position.Bottom} style={{ transform: "rotate(-45deg)" }} id="no" />
      </div>
    );
  }

  if (shape === "pill") {
    return (
      <div
        style={{
          ...baseStyle,
          borderRadius: 999,
          padding: "10px 24px",
          minWidth: 80,
        }}
      >
        <Handle type="target" position={Position.Left} />
        <div style={{ fontWeight: 700, fontSize: 13 }}>{icon} {node.label}</div>
        {subtitle && (
          <div style={{ fontSize: 10, marginTop: 2, opacity: 0.8 }}>{subtitle}</div>
        )}
        <Handle type="source" position={Position.Right} />
      </div>
    );
  }

  if (shape === "gate") {
    return (
      <div
        style={{
          ...baseStyle,
          borderRadius: 12,
          padding: "8px 18px",
          minWidth: 70,
        }}
      >
        <Handle type="target" position={Position.Left} id="in1" />
        <Handle type="target" position={Position.Top} id="in2" />
        <div style={{ fontWeight: 900, fontSize: 22, lineHeight: 1 }}>{icon}</div>
        <div style={{ fontWeight: 700, fontSize: 11, marginTop: 2 }}>{node.label}</div>
        <Handle type="source" position={Position.Right} />
      </div>
    );
  }

  if (shape === "hexagon") {
    return (
      <div
        style={{
          ...baseStyle,
          borderRadius: 8,
          padding: "10px 16px",
          minWidth: 120,
          clipPath: "polygon(10% 0%, 90% 0%, 100% 50%, 90% 100%, 10% 100%, 0% 50%)",
          paddingLeft: 24,
          paddingRight: 24,
        }}
      >
        <Handle type="target" position={Position.Left} />
        <div style={{ fontWeight: 700, fontSize: 12 }}>{icon} {node.label}</div>
        {subtitle && (
          <div style={{ fontSize: 10, marginTop: 2, opacity: 0.8 }}>{subtitle}</div>
        )}
        <Handle type="source" position={Position.Right} id="pass" />
        <Handle type="source" position={Position.Bottom} id="fail" />
      </div>
    );
  }

  return (
    <div
      style={{
        ...baseStyle,
        borderRadius: 10,
        padding: "10px 16px",
        minWidth: 130,
      }}
    >
      <Handle type="target" position={Position.Left} />
      <div style={{ fontWeight: 700, fontSize: 12 }}>{icon} {node.label}</div>
      {subtitle && (
        <div style={{ fontSize: 10, marginTop: 3, opacity: 0.8, lineHeight: 1.3, maxWidth: 160 }}>
          {subtitle}
        </div>
      )}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
