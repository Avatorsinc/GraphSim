import { useEffect, useMemo, useState } from "react";
import yaml from "js-yaml";
import { useStore } from "../state/store";
import { deviceRegistry } from "../registry/DeviceRegistry";
import {
  categoryRegistry,
  saveUserDeviceType,
  removeUserDeviceType,
  isUserDeviceType,
  type CategoryDef,
} from "../registry/CategoryRegistry";
import type { DeviceTypeDefinition } from "../model/deviceType";

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#1e293b",
  color: "#f8fafc",
  border: "1px solid #334155",
  borderRadius: 4,
  padding: "4px 6px",
  fontSize: 12,
};

const btn: React.CSSProperties = {
  background: "#1e293b",
  color: "#f8fafc",
  border: "1px solid #334155",
  borderRadius: 4,
  padding: "4px 8px",
  cursor: "pointer",
  fontSize: 11,
};

function NewCategoryDialog({ onClose }: { onClose: () => void }) {
  const [id, setId] = useState("");
  const [label, setLabel] = useState("");
  const [color, setColor] = useState("#a78bfa");
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#0b1220",
          padding: 16,
          borderRadius: 8,
          minWidth: 320,
          color: "#f8fafc",
          fontSize: 12,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <strong>New Category</strong>
        <label>
          <div style={{ color: "#94a3b8" }}>ID (lowercase, no spaces)</div>
          <input
            value={id}
            onChange={(e) =>
              setId(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
            }
            placeholder="security-tools"
            style={inputStyle}
          />
        </label>
        <label>
          <div style={{ color: "#94a3b8" }}>Display Label</div>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Security Tools"
            style={inputStyle}
          />
        </label>
        <label>
          <div style={{ color: "#94a3b8" }}>Color</div>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            style={{ width: 60, height: 28, border: "none", borderRadius: 4 }}
          />
        </label>
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
          <button style={btn} onClick={onClose}>
            Cancel
          </button>
          <button
            style={{ ...btn, background: "#0ea5e9", color: "#0f172a" }}
            onClick={() => {
              if (!id || !label) return;
              try {
                categoryRegistry.add({ id, label, color });
                onClose();
              } catch (e) {
                alert((e as Error).message);
              }
            }}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

const VENDOR_ID_PREFIX: Record<string, { prefix: string; vendor: string }> = {
  "42gears": { prefix: "vendor.suremdm", vendor: "42gears" },
  microsoft: { prefix: "vendor.intune", vendor: "microsoft" },
  cisco: { prefix: "vendor.cisco", vendor: "cisco" },
  meraki: { prefix: "vendor.meraki", vendor: "meraki" },
  checkpoint: { prefix: "vendor.checkpoint", vendor: "checkpoint" },
  paloalto: { prefix: "vendor.paloalto", vendor: "paloalto" },
  azure: { prefix: "vendor.azure", vendor: "azure" },
  gcp: { prefix: "vendor.gcp", vendor: "gcp" },
};

function NewDeviceDialog({
  category,
  onClose,
  vendorKey,
}: {
  category: CategoryDef;
  onClose: () => void;
  vendorKey?: string;
}) {
  const slug = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  const [name, setName] = useState("");
  const [evaluator, setEvaluator] = useState<DeviceTypeDefinition["evaluator"]>(
    "passthrough",
  );

  const vendorInfo = vendorKey ? VENDOR_ID_PREFIX[vendorKey] : null;
  const idPrefix = vendorInfo?.prefix ?? "custom";
  const vendorValue = vendorInfo?.vendor ?? "user";
  const idPreview = name ? `${idPrefix}.${slug(name)}` : `${idPrefix}.my_device`;

  const VENDOR_LABEL_INLINE: Record<string, string> = {
    "42gears": "42Gears (SureMDM)",
    microsoft: "Microsoft",
    cisco: "Cisco",
    meraki: "Cisco Meraki",
    checkpoint: "Check Point",
    paloalto: "Palo Alto",
    azure: "Azure",
    gcp: "GCP",
  };
  const vendorDisplay = vendorKey
    ? VENDOR_LABEL_INLINE[vendorKey] ?? vendorKey
    : null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#0b1220",
          padding: 16,
          borderRadius: 8,
          minWidth: 380,
          color: "#f8fafc",
          fontSize: 12,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <strong>
          Add Device to {category.label}
          {vendorDisplay && (
            <span style={{ color: "#0ea5e9", fontWeight: 400 }}>
              {" "}
              — {vendorDisplay}
            </span>
          )}
        </strong>
        <label>
          <div style={{ color: "#94a3b8" }}>Name</div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={vendorDisplay ? `My ${vendorDisplay} Thing` : "My Custom Tool"}
            style={inputStyle}
            autoFocus
          />
        </label>
        <div style={{ color: "#64748b", fontSize: 11 }}>
          ID: <code>{idPreview}</code>
        </div>
        <label>
          <div style={{ color: "#94a3b8" }}>Evaluator (simulation behavior)</div>
          <select
            value={evaluator}
            onChange={(e) =>
              setEvaluator(
                e.target.value as DeviceTypeDefinition["evaluator"],
              )
            }
            style={inputStyle}
          >
            <option value="passthrough">passthrough (always allow)</option>
            <option value="endpoint">endpoint (src/dst only)</option>
            <option value="l2_switch">l2 switch</option>
            <option value="router">router</option>
            <option value="generic_acl">generic ACL</option>
            <option value="stateful_firewall">stateful firewall</option>
            <option value="cloud_nsg">cloud NSG</option>
            <option value="vpn_terminator">VPN terminator</option>
            <option value="conditional_access">conditional access</option>
          </select>
        </label>
        <div style={{ color: "#64748b", fontSize: 11 }}>
          For richer config, edit it later under Packs → Custom Device.
        </div>
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
          <button style={btn} onClick={onClose}>
            Cancel
          </button>
          <button
            style={{ ...btn, background: "#0ea5e9", color: "#0f172a" }}
            onClick={() => {
              if (!name.trim()) return;
              const def: DeviceTypeDefinition = {
                id: idPreview,
                name: name.trim(),
                vendor: vendorValue,
                category: category.id as DeviceTypeDefinition["category"],
                description: `User-added ${vendorDisplay ?? category.label} device`,
                evaluator,
                interfaces: [{ name: "eth0", type: "ethernet" }],
                defaultConfig: {},
                configSchema: {
                  type: "object",
                  title: name.trim(),
                  properties: {
                    note: { type: "string", title: "Note" },
                  },
                },
              };
              saveUserDeviceType(def);
              onClose();
            }}
          >
            Add
          </button>
        </div>
        <details style={{ marginTop: 4 }}>
          <summary style={{ cursor: "pointer", color: "#94a3b8" }}>
            Or paste full YAML
          </summary>
          <YamlPaster onSaved={onClose} fallbackCategory={category.id} />
        </details>
      </div>
    </div>
  );
}

function YamlPaster({
  onSaved,
  fallbackCategory,
}: {
  onSaved: () => void;
  fallbackCategory: string;
}) {
  const [src, setSrc] = useState(`id: custom.my_device
name: My Device
category: ${fallbackCategory}
evaluator: passthrough
interfaces:
  - { name: eth0, type: ethernet }
configSchema:
  type: object
  properties:
    note: { type: string }
`);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <textarea
        value={src}
        onChange={(e) => setSrc(e.target.value)}
        rows={10}
        style={{
          ...inputStyle,
          fontFamily: "ui-monospace, Consolas, monospace",
          whiteSpace: "pre",
          resize: "vertical",
        }}
      />
      <button
        style={btn}
        onClick={() => {
          try {
            const def = yaml.load(src) as DeviceTypeDefinition;
            saveUserDeviceType(def);
            onSaved();
          } catch (e) {
            alert((e as Error).message);
          }
        }}
      >
        Register
      </button>
    </div>
  );
}

interface Props {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Palette({ collapsed, onToggle }: Props) {
  const addNode = useStore((s) => s.addNode);
  const drawingTool = useStore((s) => s.drawingTool);
  const setDrawingTool = useStore((s) => s.setDrawingTool);
  const [refresh, bump] = useState(0);
  const [search, setSearch] = useState("");
  const [openCat, setOpenCat] = useState<string | null>("endpoint");
  const [newCat, setNewCat] = useState(false);
  const [newDevFor, setNewDevFor] = useState<{
    cat: CategoryDef;
    vendor?: string;
  } | null>(null);

  useEffect(() => {
    const t = setInterval(() => bump((r) => r + 1), 1000);
    return () => clearInterval(t);
  }, []);
  void refresh;

  const cats = categoryRegistry.all();
  const byCat = useMemo(() => deviceRegistry.byCategory(), [refresh]);
  const [openVendor, setOpenVendor] = useState<Record<string, boolean>>({});

  const matches = (s: string) =>
    !search ||
    s.toLowerCase().includes(search.toLowerCase());

  const VENDOR_LABEL: Record<string, string> = {
    builtin: "Built-in",
    microsoft: "Microsoft",
    "42gears": "42Gears (SureMDM)",
    cisco: "Cisco",
    meraki: "Cisco Meraki",
    checkpoint: "Check Point",
    paloalto: "Palo Alto",
    azure: "Azure",
    gcp: "GCP",
    user: "Custom (You)",
  };
  const vendorLabel = (v?: string) =>
    !v ? "Other" : VENDOR_LABEL[v] ?? v.charAt(0).toUpperCase() + v.slice(1);
  const vendorOrder = (v?: string) => {
    const order = [
      "microsoft",
      "42gears",
      "cisco",
      "meraki",
      "paloalto",
      "checkpoint",
      "azure",
      "gcp",
      "builtin",
      "user",
    ];
    const idx = v ? order.indexOf(v) : -1;
    return idx === -1 ? 100 : idx;
  };

  if (collapsed) {
    return (
      <div
        style={{
          width: 36,
          background: "#0b1220",
          borderRight: "1px solid #1e293b",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "8px 0",
        }}
      >
        <button
          style={{
            ...btn,
            writingMode: "vertical-rl" as const,
            transform: "rotate(180deg)",
            padding: "12px 4px",
          }}
          onClick={onToggle}
          title="Expand palette"
        >
          Palette ▸
        </button>
      </div>
    );
  }

  return (
    <aside
      style={{
        width: 260,
        background: "#0b1220",
        borderRight: "1px solid #1e293b",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 6,
          padding: 8,
          borderBottom: "1px solid #1e293b",
          alignItems: "center",
        }}
      >
        <strong style={{ color: "#f8fafc", fontSize: 13 }}>Palette</strong>
        <button
          style={{ ...btn, marginLeft: "auto" }}
          onClick={onToggle}
          title="Collapse palette"
        >
          ◂
        </button>
      </div>
      <div style={{ padding: 8 }}>
        <input
          placeholder="Search devices..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={inputStyle}
        />
      </div>
      <div
        style={{
          padding: "0 8px 8px",
          borderBottom: "1px solid #1e293b",
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
        }}
      >
        <button
          style={{
            ...btn,
            flex: 1,
            background: drawingTool === "zone" ? "#fbbf24" : btn.background,
            color: drawingTool === "zone" ? "#0f172a" : btn.color,
            fontWeight: drawingTool === "zone" ? 600 : 400,
          }}
          onClick={() =>
            setDrawingTool(drawingTool === "zone" ? null : "zone")
          }
          title="Drag a rectangle on the canvas to label an area"
        >
          {drawingTool === "zone" ? "✎ Drawing zone..." : "▭ Draw Zone"}
        </button>
        <button
          style={{
            ...btn,
            flex: 1,
            background: drawingTool === "note" ? "#fde68a" : btn.background,
            color: drawingTool === "note" ? "#0f172a" : btn.color,
            fontWeight: drawingTool === "note" ? 600 : 400,
          }}
          onClick={() =>
            setDrawingTool(drawingTool === "note" ? null : "note")
          }
          title="Drag a small rectangle to drop a sticky note"
        >
          {drawingTool === "note" ? "✎ Drawing note..." : "✏ Draw Note"}
        </button>
      </div>
      <div
        style={{
          padding: "0 8px 8px",
          borderBottom: "1px solid #1e293b",
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
        }}
      >
        <button
          style={{ ...btn, flex: 1 }}
          onClick={() =>
            addNode({
              typeId: "meta.sticky_note",
              label: "Note",
              position: {
                x: 100 + Math.random() * 400,
                y: 100 + Math.random() * 300,
              },
              interfaces: [],
              config: { text: "", color: "#fde68a" },
            })
          }
          title="Add a connectable sticky note"
        >
          📝 Sticky Note
        </button>
        <button
          style={{ ...btn, flex: 1 }}
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "image/*";
            input.onchange = () => {
              const file = input.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => {
                addNode({
                  typeId: "meta.image",
                  label: file.name || "Image",
                  position: {
                    x: 100 + Math.random() * 400,
                    y: 100 + Math.random() * 300,
                  },
                  interfaces: [],
                  config: { imageDataUrl: reader.result as string },
                });
              };
              reader.readAsDataURL(file);
            };
            input.click();
          }}
          title="Upload image or screenshot (also supports Ctrl+V paste on canvas)"
        >
          🖼 Add Image
        </button>
      </div>
      <div style={{ flex: 1, overflow: "auto" }}>
        {cats.map((cat) => {
          const devices = (byCat[cat.id] ?? []).filter(
            (d) => matches(d.name) || matches(d.id),
          );
          const isOpen = openCat === cat.id || !!search;
          if (search && devices.length === 0) return null;
          return (
            <div key={cat.id} style={{ borderBottom: "1px solid #1e293b" }}>
              <button
                style={{
                  width: "100%",
                  background: isOpen ? "#162033" : "transparent",
                  color: "#f8fafc",
                  border: "none",
                  padding: "8px 10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  fontSize: 12,
                }}
                onClick={() =>
                  setOpenCat(openCat === cat.id ? null : cat.id)
                }
              >
                <span
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      width: 10,
                      height: 10,
                      borderRadius: 2,
                      background: cat.color,
                    }}
                  />
                  {cat.label}{" "}
                  <span style={{ color: "#64748b", fontSize: 11 }}>
                    {devices.length}
                  </span>
                </span>
                <span style={{ color: "#64748b" }}>{isOpen ? "▾" : "▸"}</span>
              </button>
              {isOpen &&
                (() => {
                  const byVendor: Record<
                    string,
                    typeof devices
                  > = {};
                  for (const d of devices) {
                    const v = d.vendor ?? "other";
                    (byVendor[v] = byVendor[v] ?? []).push(d);
                  }
                  const vendors = Object.keys(byVendor).sort(
                    (a, b) => vendorOrder(a) - vendorOrder(b),
                  );
                  const flatten =
                    vendors.length <= 1 && devices.length <= 4;

                  const renderDevice = (d: (typeof devices)[number]) => (
                    <div
                      key={d.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <button
                        style={{
                          ...btn,
                          flex: 1,
                          textAlign: "left",
                          marginBottom: 4,
                          paddingLeft: 8,
                        }}
                        title={d.description ?? d.id}
                        onClick={() =>
                          addNode({
                            typeId: d.id,
                            label: d.name,
                            position: {
                              x: 100 + Math.random() * 400,
                              y: 100 + Math.random() * 300,
                            },
                            interfaces: d.interfaces.map((i) => ({
                              name: i.name,
                              type: i.type,
                            })),
                            config: structuredClone(d.defaultConfig ?? {}),
                          })
                        }
                      >
                        + {d.name}
                      </button>
                      {isUserDeviceType(d.id) && (
                        <button
                          style={btn}
                          title="Remove user-added device"
                          onClick={() => {
                            if (confirm(`Remove ${d.name}?`)) {
                              removeUserDeviceType(d.id);
                              bump((r) => r + 1);
                            }
                          }}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  );

                  return (
                    <div style={{ padding: "4px 8px 8px" }}>
                      {flatten
                        ? devices.map(renderDevice)
                        : vendors.map((v) => {
                            const key = `${cat.id}::${v}`;
                            const open =
                              openVendor[key] ??
                              (vendors.length <= 2 || !!search);
                            return (
                              <div
                                key={v}
                                style={{
                                  marginBottom: 4,
                                  border: "1px solid #162033",
                                  borderRadius: 4,
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                  }}
                                >
                                  <button
                                    style={{
                                      flex: 1,
                                      background: open
                                        ? "#0f1a2c"
                                        : "transparent",
                                      color: "#cbd5e1",
                                      border: "none",
                                      padding: "4px 8px",
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                      cursor: "pointer",
                                      fontSize: 11,
                                      borderRadius: "4px 0 0 4px",
                                    }}
                                    onClick={() =>
                                      setOpenVendor((s) => ({
                                        ...s,
                                        [key]: !open,
                                      }))
                                    }
                                  >
                                    <span>
                                      {vendorLabel(v)}{" "}
                                      <span
                                        style={{
                                          color: "#64748b",
                                          fontSize: 10,
                                        }}
                                      >
                                        {byVendor[v].length}
                                      </span>
                                    </span>
                                    <span
                                      style={{
                                        color: "#64748b",
                                        fontSize: 10,
                                      }}
                                    >
                                      {open ? "▾" : "▸"}
                                    </span>
                                  </button>
                                  {v !== "builtin" && (
                                    <button
                                      style={{
                                        background: "transparent",
                                        color: "#0ea5e9",
                                        border: "none",
                                        padding: "4px 6px",
                                        cursor: "pointer",
                                        fontSize: 13,
                                        fontWeight: 700,
                                        borderRadius: "0 4px 4px 0",
                                        lineHeight: 1,
                                      }}
                                      title={`Add new device to ${vendorLabel(v)}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setNewDevFor({
                                          cat,
                                          vendor: v,
                                        });
                                      }}
                                    >
                                      +
                                    </button>
                                  )}
                                </div>
                                {open && (
                                  <div
                                    style={{
                                      padding: "4px 6px",
                                    }}
                                  >
                                    {byVendor[v].map(renderDevice)}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      <button
                        style={{
                          ...btn,
                          width: "100%",
                          marginTop: 4,
                          borderStyle: "dashed",
                          color: "#94a3b8",
                        }}
                        onClick={() => setNewDevFor({ cat })}
                      >
                        + Add device to {cat.label}
                      </button>
                    </div>
                  );
                })()}
            </div>
          );
        })}
      </div>
      <div
        style={{ padding: 8, borderTop: "1px solid #1e293b" }}
      >
        <button
          style={{ ...btn, width: "100%" }}
          onClick={() => setNewCat(true)}
        >
          + New Category
        </button>
      </div>

      {newCat && <NewCategoryDialog onClose={() => setNewCat(false)} />}
      {newDevFor && (
        <NewDeviceDialog
          category={newDevFor.cat}
          vendorKey={newDevFor.vendor}
          onClose={() => setNewDevFor(null)}
        />
      )}
    </aside>
  );
}
