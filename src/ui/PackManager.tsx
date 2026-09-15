import { useEffect, useState } from "react";
import yaml from "js-yaml";
import { deviceRegistry } from "../registry/DeviceRegistry";
import { customEvaluators } from "../plugins/sandbox";
import { downloadPack, exportPack, importPack } from "../plugins/pack";
import type { DeviceTypeDefinition } from "../model/deviceType";

const btn: React.CSSProperties = {
  background: "#1e293b",
  color: "#f8fafc",
  border: "1px solid #334155",
  padding: "4px 8px",
  borderRadius: 4,
  cursor: "pointer",
  fontSize: 11,
};
const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#1e293b",
  color: "#f8fafc",
  border: "1px solid #334155",
  borderRadius: 4,
  padding: "4px 6px",
  fontSize: 12,
  fontFamily: "ui-monospace, Consolas, monospace",
};

const STARTER_EVALUATOR = `// Custom evaluator. Receives (node, ctx) and returns a Verdict.
// Verdict: { action: "allow"|"deny"|"drop", note?, matchedRule?, nextHop? }
// Helpers: helpers.matchHost(pattern, ip), helpers.matchPort(pattern, port)
// tick() periodically to be a good citizen — throws on timeout.

function evaluate(node, ctx) {
  tick();
  const cfg = node.config || {};
  // Example: deny everything that hits this device.
  return { action: "deny", note: "default custom evaluator stub" };
}
`;

const STARTER_DEVICE = `id: custom.my_device
name: My Custom Device
vendor: me
category: custom
description: A device I authored
evaluator: custom
evaluatorRef: custom.my_evaluator
interfaces:
  - { name: eth0, type: ethernet }
defaultConfig: {}
configSchema:
  type: object
  title: My Custom Device
  properties:
    note: { type: string, title: Note }
`;

interface Props {
  onClose: () => void;
}

export default function PackManager({ onClose }: Props) {
  const [tab, setTab] = useState<"types" | "evaluator" | "device" | "io">(
    "types",
  );
  const [refresh, setRefresh] = useState(0);
  const bump = () => setRefresh((r) => r + 1);

  const [evalId, setEvalId] = useState("custom.my_evaluator");
  const [evalSource, setEvalSource] = useState(STARTER_EVALUATOR);
  const [deviceYaml, setDeviceYaml] = useState(STARTER_DEVICE);
  const [packName, setPackName] = useState("my-pack");
  const [packVersion, setPackVersion] = useState("0.1.0");

  useEffect(() => {
  }, [refresh]);

  const types = deviceRegistry.all();
  const evals = customEvaluators.list();

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
          width: "90%",
          maxWidth: 1100,
          height: "85%",
          display: "flex",
          flexDirection: "column",
          color: "#f8fafc",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "10px 14px",
            borderBottom: "1px solid #1e293b",
          }}
        >
          <strong>Pack Manager</strong>
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
              ["types", "Device Types"],
              ["evaluator", "Custom Evaluator"],
              ["device", "Custom Device"],
              ["io", "Import / Export"],
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
        <div style={{ flex: 1, overflow: "auto", padding: 14 }}>
          {tab === "types" && (
            <div>
              <div style={{ color: "#94a3b8", marginBottom: 8 }}>
                {types.length} device types loaded ({evals.length} custom evaluators).
              </div>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 12,
                }}
              >
                <thead>
                  <tr style={{ color: "#94a3b8" }}>
                    <th style={{ textAlign: "left", padding: 6 }}>ID</th>
                    <th style={{ textAlign: "left", padding: 6 }}>Name</th>
                    <th style={{ textAlign: "left", padding: 6 }}>Vendor</th>
                    <th style={{ textAlign: "left", padding: 6 }}>
                      Category
                    </th>
                    <th style={{ textAlign: "left", padding: 6 }}>
                      Evaluator
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {types.map((t) => (
                    <tr
                      key={t.id}
                      style={{ borderTop: "1px solid #1e293b" }}
                    >
                      <td style={{ padding: 6, fontFamily: "monospace" }}>
                        {t.id}
                      </td>
                      <td style={{ padding: 6 }}>{t.name}</td>
                      <td style={{ padding: 6 }}>{t.vendor ?? "—"}</td>
                      <td style={{ padding: 6 }}>{t.category}</td>
                      <td style={{ padding: 6 }}>
                        {t.evaluator}
                        {t.evaluatorRef ? ` → ${t.evaluatorRef}` : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === "evaluator" && (
            <div
              style={{
                display: "flex",
                gap: 12,
                height: "100%",
                flexDirection: "column",
              }}
            >
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <label style={{ color: "#94a3b8", fontSize: 12 }}>
                  Evaluator ID
                </label>
                <input
                  value={evalId}
                  onChange={(e) => setEvalId(e.target.value)}
                  style={{ ...inputStyle, width: 280 }}
                />
                <button
                  style={btn}
                  onClick={() => {
                    customEvaluators.set(evalId, evalSource);
                    bump();
                  }}
                >
                  Save
                </button>
                <button
                  style={btn}
                  onClick={() => {
                    customEvaluators.remove(evalId);
                    bump();
                  }}
                >
                  Delete
                </button>
                <span style={{ color: "#64748b", fontSize: 11 }}>
                  {evals.length} stored
                </span>
              </div>
              <textarea
                value={evalSource}
                onChange={(e) => setEvalSource(e.target.value)}
                style={{
                  ...inputStyle,
                  flex: 1,
                  resize: "none",
                  whiteSpace: "pre",
                  fontSize: 12,
                  padding: 8,
                  minHeight: 300,
                }}
                spellCheck={false}
              />
              <div style={{ color: "#64748b", fontSize: 11 }}>
                Evaluators run in strict mode with no globals beyond
                <code> helpers </code> and <code> tick </code>. They run on
                the main thread for v1 — author trusted code only.
              </div>
            </div>
          )}

          {tab === "device" && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                height: "100%",
              }}
            >
              <div style={{ color: "#94a3b8", fontSize: 12 }}>
                Author or paste a DeviceTypeDefinition (YAML). Hit Register
                to add it to the palette.
              </div>
              <textarea
                value={deviceYaml}
                onChange={(e) => setDeviceYaml(e.target.value)}
                style={{
                  ...inputStyle,
                  flex: 1,
                  resize: "none",
                  whiteSpace: "pre",
                  fontSize: 12,
                  padding: 8,
                  minHeight: 320,
                }}
                spellCheck={false}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  style={btn}
                  onClick={() => {
                    try {
                      const def = yaml.load(
                        deviceYaml,
                      ) as DeviceTypeDefinition;
                      deviceRegistry.register(def);
                      bump();
                      alert(`Registered ${def.id}`);
                    } catch (e) {
                      alert(
                        `Failed: ${e instanceof Error ? e.message : String(e)}`,
                      );
                    }
                  }}
                >
                  Register
                </button>
              </div>
            </div>
          )}

          {tab === "io" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <fieldset
                style={{
                  border: "1px solid #1e293b",
                  borderRadius: 6,
                  padding: 10,
                }}
              >
                <legend style={{ color: "#cbd5e1" }}>Import .graphpack.zip</legend>
                <input
                  type="file"
                  accept=".zip,.graphpack.zip,application/zip"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    try {
                      const r = await importPack(f);
                      bump();
                      alert(
                        `Imported ${r.manifest.name}: ${r.loadedTypes} types, ${r.loadedEvaluators} evaluators${r.errors.length ? ` (errors: ${r.errors.join("; ")})` : ""}`,
                      );
                    } catch (err) {
                      alert(
                        `Import failed: ${err instanceof Error ? err.message : String(err)}`,
                      );
                    }
                  }}
                />
              </fieldset>
              <fieldset
                style={{
                  border: "1px solid #1e293b",
                  borderRadius: 6,
                  padding: 10,
                }}
              >
                <legend style={{ color: "#cbd5e1" }}>Export Pack</legend>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <label style={{ color: "#94a3b8", fontSize: 12 }}>
                    Name
                  </label>
                  <input
                    value={packName}
                    onChange={(e) => setPackName(e.target.value)}
                    style={{ ...inputStyle, width: 200 }}
                  />
                  <label style={{ color: "#94a3b8", fontSize: 12 }}>
                    Version
                  </label>
                  <input
                    value={packVersion}
                    onChange={(e) => setPackVersion(e.target.value)}
                    style={{ ...inputStyle, width: 120 }}
                  />
                  <button
                    style={btn}
                    onClick={async () => {
                      const blob = await exportPack({
                        name: packName,
                        version: packVersion,
                        deviceTypeIds: types
                          .filter((t) => !t.id.startsWith("generic."))
                          .map((t) => t.id),
                        evaluatorIds: evals.map((e) => e.id),
                      });
                      downloadPack(blob, packName);
                    }}
                  >
                    Export
                  </button>
                </div>
                <div
                  style={{
                    color: "#64748b",
                    fontSize: 11,
                    marginTop: 6,
                  }}
                >
                  Includes all non-builtin device types and all custom evaluators.
                </div>
              </fieldset>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
