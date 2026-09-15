import { useMemo, useState } from "react";
import { useStore } from "../state/store";
import { simulate } from "../sim/runner";
import type { SimResult } from "../sim/types";
import type { SimPath } from "../state/store";

const inputStyle: React.CSSProperties = {
  background: "#1e293b",
  color: "#f8fafc",
  border: "1px solid #334155",
  borderRadius: 4,
  padding: "4px 6px",
  fontSize: 12,
  fontFamily: "inherit",
};

const verdictColor = (a: string) =>
  a === "allow" ? "#22c55e" : a === "deny" ? "#f87171" : "#fbbf24";

function traceToPath(r: SimResult, label: string, color: string): SimPath {
  return {
    label,
    color,
    reached: r.kind === "reached",
    hops: r.trace.map((h) => ({
      nodeId: h.nodeId,
      action: h.verdict.action,
    })),
  };
}

export default function SimulatePanel() {
  const topology = useStore((s) => s.topology);
  const setSimHighlight = useStore((s) => s.setSimHighlight);
  const simHighlight = useStore((s) => s.simHighlight);

  const endpoints = useMemo(
    () =>
      topology.nodes.filter(
        (n) => n.typeId === "generic.client" || n.typeId === "generic.server",
      ),
    [topology.nodes],
  );

  const all = topology.nodes;
  const [src, setSrc] = useState<string>("");
  const [dst, setDst] = useState<string>("");
  const [proto, setProto] = useState<"tcp" | "udp" | "icmp">("tcp");
  const [port, setPort] = useState<string>("443");
  const [identityId, setIdentityId] = useState<string>("");
  const [bidirectional, setBidirectional] = useState(false);
  const [result, setResult] = useState<SimResult | null>(null);
  const [reverse, setReverse] = useState<SimResult | null>(null);

  const run = () => {
    if (!src || !dst) return;
    const fwd = simulate(topology, {
      src,
      dst,
      proto,
      port: port ? Number(port) : undefined,
      identityId: identityId || undefined,
    });
    setResult(fwd);
    let rev: SimResult | null = null;
    if (bidirectional) {
      rev = simulate(topology, {
        src: dst,
        dst: src,
        proto,
        port: port ? Number(port) : undefined,
        identityId: identityId || undefined,
      });
      setReverse(rev);
    } else {
      setReverse(null);
    }
    setSimHighlight({
      paths: rev
        ? [
            traceToPath(fwd, "forward →", "#38bdf8"),
            traceToPath(rev, "← return", "#fb923c"),
          ]
        : [traceToPath(fwd, "forward →", "#38bdf8")],
      startedAt: Date.now(),
    });
  };

  const clearHighlight = () => setSimHighlight(null);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: 10,
        height: "100%",
        overflow: "auto",
        color: "#f8fafc",
      }}
    >
      <strong>Simulate</strong>

      <label style={{ fontSize: 11, color: "#94a3b8" }}>
        Source
        <select
          value={src}
          onChange={(e) => setSrc(e.target.value)}
          style={{ ...inputStyle, width: "100%" }}
        >
          <option value="">— select —</option>
          {(endpoints.length ? endpoints : all).map((n) => (
            <option key={n.id} value={n.id}>
              {n.label} ({n.typeId})
            </option>
          ))}
        </select>
      </label>

      <label style={{ fontSize: 11, color: "#94a3b8" }}>
        Destination
        <select
          value={dst}
          onChange={(e) => setDst(e.target.value)}
          style={{ ...inputStyle, width: "100%" }}
        >
          <option value="">— select —</option>
          {all.map((n) => (
            <option key={n.id} value={n.id}>
              {n.label} ({n.typeId})
            </option>
          ))}
        </select>
      </label>

      <div style={{ display: "flex", gap: 6 }}>
        <label style={{ fontSize: 11, color: "#94a3b8", flex: 1 }}>
          Proto
          <select
            value={proto}
            onChange={(e) =>
              setProto(e.target.value as "tcp" | "udp" | "icmp")
            }
            style={{ ...inputStyle, width: "100%" }}
          >
            <option value="tcp">tcp</option>
            <option value="udp">udp</option>
            <option value="icmp">icmp</option>
          </select>
        </label>
        <label style={{ fontSize: 11, color: "#94a3b8", flex: 1 }}>
          Port
          <input
            value={port}
            onChange={(e) => setPort(e.target.value)}
            style={{ ...inputStyle, width: "100%" }}
          />
        </label>
      </div>

      {topology.identities.length > 0 && (
        <label style={{ fontSize: 11, color: "#94a3b8" }}>
          Identity (optional)
          <select
            value={identityId}
            onChange={(e) => setIdentityId(e.target.value)}
            style={{ ...inputStyle, width: "100%" }}
          >
            <option value="">none</option>
            {topology.identities.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} ({i.type})
              </option>
            ))}
          </select>
        </label>
      )}

      <label
        style={{
          fontSize: 11,
          color: "#cbd5e1",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <input
          type="checkbox"
          checked={bidirectional}
          onChange={(e) => setBidirectional(e.target.checked)}
        />
        Bidirectional (also simulate return path)
      </label>

      <div style={{ display: "flex", gap: 6 }}>
        <button
          onClick={run}
          disabled={!src || !dst}
          style={{
            flex: 1,
            background: "#0ea5e9",
            color: "#0f172a",
            border: "none",
            borderRadius: 4,
            padding: "6px 10px",
            cursor: src && dst ? "pointer" : "not-allowed",
            fontWeight: 600,
          }}
        >
          ▶ Run & Animate
        </button>
        {simHighlight && (
          <button
            onClick={clearHighlight}
            style={{
              background: "#1e293b",
              color: "#f8fafc",
              border: "1px solid #334155",
              borderRadius: 4,
              padding: "6px 10px",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            Clear
          </button>
        )}
      </div>

      {result && (
        <ResultBlock title="Forward →" pathColor="#38bdf8" result={result} />
      )}
      {reverse && (
        <ResultBlock title="← Return" pathColor="#fb923c" result={reverse} />
      )}
    </div>
  );
}

function ResultBlock({
  title,
  pathColor,
  result,
}: {
  title: string;
  pathColor: string;
  result: SimResult;
}) {
  return (
    <div
      style={{
        border: `1px solid ${pathColor}40`,
        borderLeft: `3px solid ${pathColor}`,
        borderRadius: 6,
        padding: 8,
        marginTop: 4,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <span style={{ color: pathColor, fontWeight: 600 }}>{title}</span>
        <span
          style={{
            color:
              result.kind === "reached"
                ? "#22c55e"
                : result.kind === "blocked"
                  ? "#f87171"
                  : "#fbbf24",
            fontWeight: 600,
          }}
        >
          {result.kind.toUpperCase()}
          {result.message ? ` — ${result.message}` : ""}
        </span>
      </div>
      <ol style={{ paddingLeft: 18, margin: 0 }}>
        {result.trace.map((h, i) => (
          <li
            key={i}
            style={{
              marginBottom: 4,
              fontSize: 11,
              borderLeft: `3px solid ${verdictColor(h.verdict.action)}`,
              paddingLeft: 6,
            }}
          >
            <strong>{h.nodeLabel}</strong>{" "}
            <span style={{ color: "#64748b" }}>[{h.evaluator}]</span>
            <div style={{ color: "#cbd5e1" }}>
              {h.verdict.action}
              {h.verdict.matchedRule ? ` · ${h.verdict.matchedRule}` : ""}
              {h.verdict.note ? ` · ${h.verdict.note}` : ""}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
