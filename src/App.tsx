import { useCallback, useEffect, useRef, useState } from "react";
import Toolbar from "./ui/Toolbar";
import Canvas from "./ui/Canvas";
import Inspector from "./ui/Inspector";
import SimulatePanel from "./ui/SimulatePanel";
import IdentityPanel from "./ui/IdentityPanel";
import PreviewPanel from "./ui/PreviewPanel";
import Palette from "./ui/Palette";
import { useStore } from "./state/store";
import { autosave, loadAutosave } from "./persistence/file";
import { loadUserDeviceTypes } from "./registry/CategoryRegistry";

loadUserDeviceTypes();

type Tab = "inspector" | "simulate" | "identity" | "preview";

const tabBtn = (active: boolean): React.CSSProperties => ({
  flex: 1,
  background: active ? "#1e293b" : "transparent",
  color: active ? "#f8fafc" : "#64748b",
  border: "none",
  borderBottom: `2px solid ${active ? "#38bdf8" : "transparent"}`,
  padding: "8px 0",
  cursor: "pointer",
  fontSize: 12,
});

export default function App() {
  const topology = useStore((s) => s.topology);
  const loadTopology = useStore((s) => s.loadTopology);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const [tab, setTab] = useState<Tab>("inspector");
  const [paletteCollapsed, setPaletteCollapsed] = useState(false);

  const [sidebarWidth, setSidebarWidth] = useState(360);
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWRef = useRef(360);

  const onSidebarDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      draggingRef.current = true;
      startXRef.current = e.clientX;
      startWRef.current = sidebarWidth;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const onMove = (ev: MouseEvent) => {
        if (!draggingRef.current) return;
        const delta = startXRef.current - ev.clientX;
        const next = Math.max(240, Math.min(800, startWRef.current + delta));
        setSidebarWidth(next);
      };
      const onUp = () => {
        draggingRef.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [sidebarWidth],
  );

  useEffect(() => {
    const saved = loadAutosave();
    if (saved && saved.nodes.length > 0) loadTopology(saved);
  }, [loadTopology]);

  useEffect(() => {
    autosave(topology);
  }, [topology]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const editable =
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.tagName === "SELECT" ||
          t.isContentEditable);
      if (editable) return;
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((key === "z" && e.shiftKey) || key === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        width: "100vw",
        background: "#0f172a",
        color: "#f8fafc",
        fontFamily:
          "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      }}
    >
      <Toolbar />
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <Palette
          collapsed={paletteCollapsed}
          onToggle={() => setPaletteCollapsed((v) => !v)}
        />
        <div style={{ flex: 1, position: "relative" }}>
          <Canvas />
        </div>
        <div
          onMouseDown={onSidebarDragStart}
          style={{
            width: 5,
            cursor: "col-resize",
            background: "transparent",
            borderLeft: "1px solid #1e293b",
            flexShrink: 0,
            transition: "background 150ms",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLDivElement).style.background = "#1e293b")
          }
          onMouseLeave={(e) => {
            if (!draggingRef.current)
              (e.currentTarget as HTMLDivElement).style.background =
                "transparent";
          }}
          title="Drag to resize sidebar"
        />
        <aside
          style={{
            width: sidebarWidth,
            background: "#0b1220",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", borderBottom: "1px solid #1e293b" }}>
            <button
              style={tabBtn(tab === "inspector")}
              onClick={() => setTab("inspector")}
            >
              Inspector
            </button>
            <button
              style={tabBtn(tab === "simulate")}
              onClick={() => setTab("simulate")}
            >
              Simulate
            </button>
            <button
              style={tabBtn(tab === "identity")}
              onClick={() => setTab("identity")}
            >
              Identity
            </button>
            <button
              style={tabBtn(tab === "preview")}
              onClick={() => setTab("preview")}
            >
              Preview
            </button>
          </div>
          <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
            {tab === "inspector" && <Inspector />}
            {tab === "simulate" && <SimulatePanel />}
            {tab === "identity" && <IdentityPanel />}
            {tab === "preview" && <PreviewPanel />}
          </div>
        </aside>
      </div>
    </div>
  );
}
