import { useState } from "react";
import { useStore } from "../state/store";
import { templates } from "../templates";
import {
  toMermaid,
  toDrawioXml,
  downloadText,
  downloadPng,
  copyPngToClipboard,
} from "../persistence/exporters";
import { diffTopology } from "../state/diff";

const btn: React.CSSProperties = {
  background: "#1e293b",
  color: "#f8fafc",
  border: "1px solid #334155",
  padding: "4px 8px",
  borderRadius: 4,
  cursor: "pointer",
  fontSize: 11,
};

interface Props {
  onClose: () => void;
}

export default function ToolsMenu({ onClose }: Props) {
  const topology = useStore((s) => s.topology);
  const snapshots = useStore((s) => s.snapshots);
  const takeSnapshot = useStore((s) => s.takeSnapshot);
  const restoreSnapshot = useStore((s) => s.restoreSnapshot);
  const clearSnapshots = useStore((s) => s.clearSnapshots);
  const importFragment = useStore((s) => s.importFragment);
  const [tab, setTab] = useState<"templates" | "snapshots" | "export">(
    "templates",
  );
  const [snapLabel, setSnapLabel] = useState("");
  const [diffIdx, setDiffIdx] = useState<number | null>(null);
  const [pngStatus, setPngStatus] = useState<"idle" | "busy" | "done" | "error">("idle");

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#0b1220",
          border: "1px solid #1e293b",
          borderRadius: 8,
          width: "85%",
          maxWidth: 900,
          height: "75%",
          display: "flex",
          flexDirection: "column",
          color: "#f8fafc",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "10px 14px",
            borderBottom: "1px solid #1e293b",
          }}
        >
          <strong>Tools</strong>
          <button style={btn} onClick={onClose}>
            Close
          </button>
        </div>
        <div
          style={{
            display: "flex",
            gap: 4,
            padding: "0 14px",
            borderBottom: "1px solid #1e293b",
          }}
        >
          {(
            [
              ["templates", "Templates"],
              ["snapshots", "Snapshots & Diff"],
              ["export", "Export"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              style={{
                background: tab === k ? "#1e293b" : "transparent",
                color: tab === k ? "#f8fafc" : "#94a3b8",
                border: "none",
                borderBottom: `2px solid ${tab === k ? "#38bdf8" : "transparent"}`,
                padding: "8px 12px",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: 14, fontSize: 12 }}>
          {tab === "templates" && (
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ color: "#94a3b8" }}>
                Drop a pre-built fragment into the current topology.
              </div>
              {templates.map((t) => (
                <div
                  key={t.id}
                  style={{
                    border: "1px solid #1e293b",
                    borderRadius: 6,
                    padding: 10,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <strong>{t.name}</strong>
                    <div style={{ color: "#94a3b8" }}>{t.description}</div>
                  </div>
                  <button
                    style={btn}
                    onClick={() => {
                      const frag = t.build({ x: 200, y: 200 });
                      importFragment(frag.nodes, frag.edges);
                    }}
                  >
                    Insert
                  </button>
                </div>
              ))}
            </div>
          )}

          {tab === "snapshots" && (
            <div>
              <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                <input
                  placeholder="Label (optional)"
                  value={snapLabel}
                  onChange={(e) => setSnapLabel(e.target.value)}
                  style={{
                    flex: 1,
                    background: "#1e293b",
                    color: "#f8fafc",
                    border: "1px solid #334155",
                    borderRadius: 4,
                    padding: "4px 6px",
                    fontSize: 12,
                  }}
                />
                <button
                  style={btn}
                  onClick={() => {
                    takeSnapshot(snapLabel || undefined);
                    setSnapLabel("");
                  }}
                >
                  Take snapshot
                </button>
                <button style={btn} onClick={clearSnapshots}>
                  Clear
                </button>
              </div>
              {snapshots.length === 0 && (
                <div style={{ color: "#64748b" }}>No snapshots yet.</div>
              )}
              {snapshots.map((s, i) => {
                const d = diffTopology(s.topology, topology);
                return (
                  <div
                    key={i}
                    style={{
                      border: "1px solid #1e293b",
                      borderRadius: 6,
                      padding: 10,
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <strong>{s.label}</strong>{" "}
                        <span style={{ color: "#64748b" }}>
                          {new Date(s.at).toLocaleString()}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button
                          style={btn}
                          onClick={() => setDiffIdx(diffIdx === i ? null : i)}
                        >
                          {diffIdx === i ? "Hide diff" : "Show diff"}
                        </button>
                        <button
                          style={btn}
                          onClick={() => restoreSnapshot(i)}
                        >
                          Restore
                        </button>
                      </div>
                    </div>
                    <div style={{ color: "#94a3b8", marginTop: 4 }}>
                      vs current: +{d.nodes.added.length} −
                      {d.nodes.removed.length} ~{d.nodes.changed.length} nodes ·
                      +{d.edges.added.length} −{d.edges.removed.length} ~
                      {d.edges.changed.length} edges
                    </div>
                    {diffIdx === i && (
                      <pre
                        style={{
                          background: "#020617",
                          padding: 8,
                          borderRadius: 4,
                          fontSize: 11,
                          marginTop: 6,
                          maxHeight: 200,
                          overflow: "auto",
                        }}
                      >
                        {JSON.stringify(d, null, 2)}
                      </pre>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {tab === "export" && (
            <div style={{ display: "grid", gap: 12 }}>
              <fieldset
                style={{
                  border: "1px solid #1e293b",
                  borderRadius: 6,
                  padding: 10,
                }}
              >
                <legend style={{ color: "#cbd5e1" }}>📷 Image (PNG) — for Jira / Teams / Docs</legend>
                <div style={{ color: "#94a3b8", marginBottom: 8 }}>
                  Export your diagram as an image you can paste into Jira, Teams, Confluence, or download as a file.
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    style={{
                      ...btn,
                      background: "#1d4ed8",
                      border: "1px solid #3b82f6",
                    }}
                    disabled={pngStatus === "busy"}
                    onClick={async () => {
                      setPngStatus("busy");
                      try {
                        await copyPngToClipboard();
                        setPngStatus("done");
                        setTimeout(() => setPngStatus("idle"), 2500);
                      } catch {
                        setPngStatus("error");
                        setTimeout(() => setPngStatus("idle"), 3000);
                      }
                    }}
                  >
                    {pngStatus === "busy"
                      ? "Capturing…"
                      : pngStatus === "done"
                        ? "✓ Copied!"
                        : pngStatus === "error"
                          ? "✗ Failed"
                          : "📋 Copy to Clipboard"}
                  </button>
                  <button
                    style={btn}
                    disabled={pngStatus === "busy"}
                    onClick={async () => {
                      setPngStatus("busy");
                      try {
                        await downloadPng(`${topology.name}.png`);
                        setPngStatus("idle");
                      } catch {
                        setPngStatus("error");
                        setTimeout(() => setPngStatus("idle"), 3000);
                      }
                    }}
                  >
                    💾 Download PNG
                  </button>
                </div>
                {pngStatus === "done" && (
                  <div style={{ color: "#4ade80", marginTop: 6, fontSize: 11 }}>
                    Image copied! Paste it into Jira with Ctrl+V.
                  </div>
                )}
                {pngStatus === "error" && (
                  <div style={{ color: "#f87171", marginTop: 6, fontSize: 11 }}>
                    Export failed — try closing modals and retrying.
                  </div>
                )}
              </fieldset>
              <fieldset
                style={{
                  border: "1px solid #1e293b",
                  borderRadius: 6,
                  padding: 10,
                }}
              >
                <legend style={{ color: "#cbd5e1" }}>Mermaid</legend>
                <button
                  style={btn}
                  onClick={() =>
                    downloadText(
                      toMermaid(topology),
                      `${topology.name}.mmd`,
                      "text/plain",
                    )
                  }
                >
                  Download .mmd
                </button>
                <pre
                  style={{
                    background: "#020617",
                    padding: 8,
                    borderRadius: 4,
                    fontSize: 11,
                    marginTop: 6,
                    maxHeight: 220,
                    overflow: "auto",
                  }}
                >
                  {toMermaid(topology)}
                </pre>
              </fieldset>
              <fieldset
                style={{
                  border: "1px solid #1e293b",
                  borderRadius: 6,
                  padding: 10,
                }}
              >
                <legend style={{ color: "#cbd5e1" }}>draw.io / diagrams.net</legend>
                <button
                  style={btn}
                  onClick={() =>
                    downloadText(
                      toDrawioXml(topology),
                      `${topology.name}.drawio`,
                      "application/xml",
                    )
                  }
                >
                  Download .drawio
                </button>
              </fieldset>
              <fieldset
                style={{
                  border: "1px solid #1e293b",
                  borderRadius: 6,
                  padding: 10,
                }}
              >
                <legend style={{ color: "#cbd5e1" }}>JSON</legend>
                <button
                  style={btn}
                  onClick={() =>
                    downloadText(
                      JSON.stringify(topology, null, 2),
                      `${topology.name}.graphsim.json`,
                      "application/json",
                    )
                  }
                >
                  Download .graphsim.json
                </button>
              </fieldset>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
