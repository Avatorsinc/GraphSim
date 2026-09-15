import Form from "@rjsf/core";
import validator from "@rjsf/validator-ajv8";
import type { IChangeEvent } from "@rjsf/core";
import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import { useStore } from "../state/store";
import { deviceRegistry } from "../registry/DeviceRegistry";
import type { Medium } from "../model/types";

const uiSchema: UiSchema = {
  "ui:submitButtonOptions": { norender: true },
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#1e293b",
  color: "#f8fafc",
  border: "1px solid #334155",
  padding: "4px 6px",
  borderRadius: 4,
};

const CONTAINER_TYPES = new Set([
  "generic.cloud_tenant",
  "generic.cloud_region",
  "generic.cloud_vpc",
]);

const MEDIA_GROUPS: { label: string; items: { value: Medium; label: string }[] }[] = [
  {
    label: "Network",
    items: [
      { value: "lan", label: "LAN" },
      { value: "wifi", label: "Wi-Fi" },
      { value: "trunk", label: "Trunk" },
      { value: "wan", label: "WAN" },
      { value: "sdwan", label: "SD-WAN" },
      { value: "vpn_ipsec", label: "IPsec VPN" },
      { value: "vpn_ssl", label: "SSL VPN" },
      { value: "peering", label: "Peering" },
    ],
  },
  {
    label: "Logical / Integration",
    items: [
      { value: "api", label: "API" },
      { value: "saml", label: "SAML" },
      { value: "oidc", label: "OIDC" },
      { value: "sso", label: "SSO" },
      { value: "data_flow", label: "Data Flow" },
    ],
  },
  {
    label: "Management",
    items: [
      { value: "mdm_push", label: "MDM Push" },
      { value: "policy", label: "Policy" },
      { value: "enrollment", label: "Enrollment" },
    ],
  },
  {
    label: "Proximity",
    items: [
      { value: "nfc", label: "NFC" },
      { value: "bluetooth", label: "Bluetooth" },
    ],
  },
  {
    label: "Annotation / Notes",
    items: [
      { value: "reference", label: "See also" },
      { value: "note_link", label: "Note link" },
      { value: "depends_on", label: "Depends on" },
      { value: "leads_to", label: "Then / Leads to" },
      { value: "triggers", label: "Triggers" },
    ],
  },
  {
    label: "Flow / Logic",
    items: [
      { value: "condition", label: "If (condition)" },
      { value: "unlocks", label: "Unlocks" },
      { value: "requires", label: "Requires" },
      { value: "authenticates", label: "Authenticates" },
    ],
  },
];

const PALETTE = [
  "#fbbf24",
  "#f87171",
  "#34d399",
  "#60a5fa",
  "#c084fc",
  "#f472b6",
  "#22d3ee",
  "#fde68a",
  "#cbd5e1",
];

function EdgeInspector() {
  const edgeId = useStore((s) => s.selectedEdgeId);
  const edge = useStore((s) =>
    s.topology.edges.find((e) => e.id === edgeId),
  );
  const updateEdge = useStore((s) => s.updateEdge);
  const removeEdge = useStore((s) => s.removeEdge);
  const nodes = useStore((s) => s.topology.nodes);

  if (!edge) return null;
  const src = nodes.find((n) => n.id === edge.source);
  const dst = nodes.find((n) => n.id === edge.target);

  return (
    <div
      style={{
        padding: 12,
        color: "#f8fafc",
        fontSize: 12,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <strong>Edge</strong>
        <button
          style={{
            background: "transparent",
            color: "#f87171",
            border: "1px solid #7f1d1d",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: 11,
            padding: "2px 6px",
          }}
          onClick={() => removeEdge(edge.id)}
        >
          Delete
        </button>
      </div>
      <div style={{ color: "#94a3b8" }}>
        {src?.label ?? "?"} → {dst?.label ?? "?"}
      </div>
      <label>
        <div style={{ color: "#94a3b8", marginBottom: 2 }}>Medium</div>
        <select
          value={edge.medium}
          onChange={(e) =>
            updateEdge(edge.id, { medium: e.target.value as Medium })
          }
          style={inputStyle}
        >
          {MEDIA_GROUPS.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.items.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      <label>
        <div style={{ color: "#94a3b8", marginBottom: 2 }}>From iface</div>
        <input
          value={edge.fromIface ?? ""}
          onChange={(e) =>
            updateEdge(edge.id, { fromIface: e.target.value || undefined })
          }
          style={inputStyle}
        />
      </label>
      <label>
        <div style={{ color: "#94a3b8", marginBottom: 2 }}>To iface</div>
        <input
          value={edge.toIface ?? ""}
          onChange={(e) =>
            updateEdge(edge.id, { toIface: e.target.value || undefined })
          }
          style={inputStyle}
        />
      </label>
      <fieldset
        style={{
          border: "1px solid #1e293b",
          borderRadius: 6,
          padding: 8,
        }}
      >
        <legend style={{ color: "#cbd5e1", fontSize: 11 }}>
          Link attrs
        </legend>
        <label>
          <div style={{ color: "#94a3b8", marginBottom: 2 }}>MTU</div>
          <input
            type="number"
            value={edge.attrs?.mtu ?? ""}
            onChange={(e) =>
              updateEdge(edge.id, {
                attrs: {
                  ...edge.attrs,
                  mtu: e.target.value ? Number(e.target.value) : undefined,
                },
              })
            }
            style={inputStyle}
          />
        </label>
        <label style={{ display: "block", marginTop: 6 }}>
          <input
            type="checkbox"
            checked={!!edge.attrs?.encrypted}
            onChange={(e) =>
              updateEdge(edge.id, {
                attrs: { ...edge.attrs, encrypted: e.target.checked },
              })
            }
          />{" "}
          Encrypted
        </label>
        <label style={{ display: "block", marginTop: 6 }}>
          <div style={{ color: "#94a3b8", marginBottom: 2 }}>
            Latency (ms)
          </div>
          <input
            type="number"
            value={edge.attrs?.latencyMs ?? ""}
            onChange={(e) =>
              updateEdge(edge.id, {
                attrs: {
                  ...edge.attrs,
                  latencyMs: e.target.value
                    ? Number(e.target.value)
                    : undefined,
                },
              })
            }
            style={inputStyle}
          />
        </label>
      </fieldset>
    </div>
  );
}

function NodeInspector() {
  const selectedId = useStore((s) => s.selectedNodeId);
  const node = useStore((s) =>
    s.topology.nodes.find((n) => n.id === selectedId),
  );
  const allNodes = useStore((s) => s.topology.nodes);
  const updateNode = useStore((s) => s.updateNode);
  const removeNode = useStore((s) => s.removeNode);

  if (!node) {
    return (
      <div style={{ padding: 16, color: "#64748b", fontSize: 12 }}>
        Select a node to inspect.
      </div>
    );
  }

  const def = deviceRegistry.get(node.typeId);
  const schema = (def?.configSchema as RJSFSchema | undefined) ?? {
    type: "object",
  };
  const validation = deviceRegistry.validate(node.typeId, node.config);

  const descendants = new Set<string>();
  const collect = (id: string) => {
    descendants.add(id);
    for (const n of allNodes)
      if (n.parentId === id) collect(n.id);
  };
  collect(node.id);
  const parentCandidates = allNodes.filter(
    (n) => CONTAINER_TYPES.has(n.typeId) && !descendants.has(n.id),
  );

  return (
    <div
      style={{
        padding: 12,
        color: "#f8fafc",
        fontSize: 12,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
      className="graphsim-inspector"
    >
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <strong>Node</strong>
        <button
          style={{
            background: "transparent",
            color: "#f87171",
            border: "1px solid #7f1d1d",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: 11,
            padding: "2px 6px",
          }}
          onClick={() => removeNode(node.id)}
        >
          Delete
        </button>
      </div>

      <label style={{ display: "block" }}>
        <div style={{ color: "#94a3b8", marginBottom: 2 }}>Label</div>
        <input
          value={node.label}
          onChange={(e) => updateNode(node.id, { label: e.target.value })}
          style={inputStyle}
        />
      </label>

      <div style={{ color: "#94a3b8" }}>
        <span>Type: </span>
        {def?.name ?? node.typeId}{" "}
        <span style={{ opacity: 0.6 }}>({node.typeId})</span>
      </div>

      <label>
        <div style={{ color: "#94a3b8", marginBottom: 2 }}>
          Parent (container)
        </div>
        <select
          value={node.parentId ?? ""}
          onChange={(e) =>
            updateNode(node.id, {
              parentId: e.target.value || undefined,
            })
          }
          style={inputStyle}
        >
          <option value="">— none —</option>
          {parentCandidates.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label} ({p.typeId.replace("generic.", "")})
            </option>
          ))}
        </select>
      </label>

      {!validation.valid && (
        <div
          style={{
            background: "#450a0a",
            border: "1px solid #7f1d1d",
            color: "#fecaca",
            padding: 6,
            borderRadius: 4,
            fontSize: 11,
          }}
        >
          {validation.errors?.map((e, i) => <div key={i}>{e}</div>)}
        </div>
      )}

      {def && (
        <Form
          schema={schema}
          uiSchema={uiSchema}
          formData={node.config}
          validator={validator}
          liveValidate={false}
          onChange={(e: IChangeEvent) =>
            updateNode(node.id, {
              config: e.formData as Record<string, unknown>,
            })
          }
        />
      )}

      <details>
        <summary style={{ cursor: "pointer", color: "#94a3b8" }}>
          Raw config
        </summary>
        <pre
          style={{
            background: "#020617",
            padding: 8,
            borderRadius: 4,
            fontSize: 11,
            overflow: "auto",
            maxHeight: 240,
          }}
        >
          {JSON.stringify(node.config, null, 2)}
        </pre>
      </details>
    </div>
  );
}

function AnnotationInspector() {
  const id = useStore((s) => s.selectedAnnotationId);
  const annotation = useStore((s) =>
    (s.topology.annotations ?? []).find((a) => a.id === id),
  );
  const updateAnnotation = useStore((s) => s.updateAnnotation);
  const removeAnnotation = useStore((s) => s.removeAnnotation);

  if (!annotation) return null;
  return (
    <div
      style={{
        padding: 12,
        color: "#f8fafc",
        fontSize: 12,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <strong>Annotation ({annotation.kind})</strong>
        <button
          style={{
            background: "transparent",
            color: "#f87171",
            border: "1px solid #7f1d1d",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: 11,
            padding: "2px 6px",
          }}
          onClick={() => removeAnnotation(annotation.id)}
        >
          Delete
        </button>
      </div>
      <label>
        <div style={{ color: "#94a3b8", marginBottom: 2 }}>Label</div>
        <input
          value={annotation.label}
          onChange={(e) =>
            updateAnnotation(annotation.id, { label: e.target.value })
          }
          style={inputStyle}
        />
      </label>
      <div>
        <div style={{ color: "#94a3b8", marginBottom: 4 }}>Color</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {PALETTE.map((c) => (
            <button
              key={c}
              onClick={() => updateAnnotation(annotation.id, { color: c })}
              style={{
                width: 22,
                height: 22,
                borderRadius: 4,
                border:
                  annotation.color === c
                    ? "2px solid #fff"
                    : "1px solid #334155",
                background: c,
                cursor: "pointer",
              }}
            />
          ))}
          <input
            type="color"
            value={annotation.color}
            onChange={(e) =>
              updateAnnotation(annotation.id, { color: e.target.value })
            }
            style={{
              width: 22,
              height: 22,
              border: "1px solid #334155",
              borderRadius: 4,
              padding: 0,
              background: "transparent",
              cursor: "pointer",
            }}
          />
        </div>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <label style={{ flex: 1 }}>
          <div style={{ color: "#94a3b8", marginBottom: 2 }}>Width</div>
          <input
            type="number"
            value={annotation.size.w}
            onChange={(e) =>
              updateAnnotation(annotation.id, {
                size: { ...annotation.size, w: Number(e.target.value) || 100 },
              })
            }
            style={inputStyle}
          />
        </label>
        <label style={{ flex: 1 }}>
          <div style={{ color: "#94a3b8", marginBottom: 2 }}>Height</div>
          <input
            type="number"
            value={annotation.size.h}
            onChange={(e) =>
              updateAnnotation(annotation.id, {
                size: { ...annotation.size, h: Number(e.target.value) || 60 },
              })
            }
            style={inputStyle}
          />
        </label>
      </div>
      <div style={{ color: "#64748b", fontSize: 11 }}>
        Tip: double-click the annotation on the canvas to edit its label inline.
      </div>
    </div>
  );
}

export default function Inspector() {
  const selectedNodeId = useStore((s) => s.selectedNodeId);
  const selectedEdgeId = useStore((s) => s.selectedEdgeId);
  const selectedAnnotationId = useStore((s) => s.selectedAnnotationId);

  return (
    <div style={{ height: "100%", overflow: "auto" }}>
      {selectedAnnotationId && !selectedNodeId && !selectedEdgeId ? (
        <AnnotationInspector />
      ) : selectedEdgeId && !selectedNodeId ? (
        <EdgeInspector />
      ) : (
        <NodeInspector />
      )}
    </div>
  );
}
