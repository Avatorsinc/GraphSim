import { useState } from "react";
import { useStore } from "../state/store";
import {
  downloadTopology,
  pickTopologyFile,
} from "../persistence/file";
import PackManager from "./PackManager";
import ToolsMenu from "./ToolsMenu";

const btn: React.CSSProperties = {
  background: "#1e293b",
  color: "#f8fafc",
  border: "1px solid #334155",
  padding: "6px 10px",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 12,
};

export default function Toolbar() {
  const topology = useStore((s) => s.topology);
  const newTopology = useStore((s) => s.newTopology);
  const loadTopology = useStore((s) => s.loadTopology);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const pastCount = useStore((s) => s.past.length);
  const futureCount = useStore((s) => s.future.length);
  const [packManagerOpen, setPackManagerOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);

  const disabled = (b: boolean): React.CSSProperties =>
    b ? { opacity: 0.4, cursor: "not-allowed" } : {};

  return (
    <div
      style={{
        display: "flex",
        gap: 6,
        padding: 8,
        background: "#0f172a",
        borderBottom: "1px solid #1e293b",
        alignItems: "center",
      }}
    >
      <strong style={{ color: "#f8fafc", marginRight: 4 }}>GraphSim</strong>
      <input
        value={topology.name}
        onChange={(e) =>
          useStore.setState((s) => ({
            topology: { ...s.topology, name: e.target.value },
          }))
        }
        style={{
          background: "#1e293b",
          color: "#f8fafc",
          border: "1px solid #334155",
          borderRadius: 6,
          padding: "4px 8px",
          fontSize: 12,
          width: 220,
        }}
        placeholder="Topology name"
      />
      <span style={{ color: "#64748b", fontSize: 11, marginLeft: 6 }}>
        v{topology.version} · {topology.nodes.length} nodes ·{" "}
        {topology.edges.length} edges ·{" "}
        {(topology.annotations ?? []).length} annotations
      </span>
      <span style={{ flex: 1 }} />
      <button
        style={{ ...btn, ...disabled(pastCount === 0) }}
        onClick={undo}
        disabled={pastCount === 0}
        title={`Undo (Ctrl+Z) — ${pastCount} step${pastCount === 1 ? "" : "s"} available`}
      >
        ↶ Undo {pastCount > 0 && <span style={{ opacity: 0.6 }}>({pastCount})</span>}
      </button>
      <button
        style={{ ...btn, ...disabled(futureCount === 0) }}
        onClick={redo}
        disabled={futureCount === 0}
        title={`Redo (Ctrl+Shift+Z) — ${futureCount} step${futureCount === 1 ? "" : "s"} available`}
      >
        ↷ Redo {futureCount > 0 && <span style={{ opacity: 0.6 }}>({futureCount})</span>}
      </button>
      <button style={btn} onClick={() => setToolsOpen(true)}>
        Tools
      </button>
      <button style={btn} onClick={() => setPackManagerOpen(true)}>
        Packs
      </button>
      <button style={btn} onClick={() => newTopology("Untitled")}>
        New
      </button>
      <button
        style={btn}
        onClick={async () => {
          try {
            const t = await pickTopologyFile();
            loadTopology(t);
          } catch (e) {
            console.warn(e);
          }
        }}
      >
        Open
      </button>
      <button style={btn} onClick={() => downloadTopology(topology)}>
        Save
      </button>
      {packManagerOpen && (
        <PackManager onClose={() => setPackManagerOpen(false)} />
      )}
      {toolsOpen && <ToolsMenu onClose={() => setToolsOpen(false)} />}
    </div>
  );
}
