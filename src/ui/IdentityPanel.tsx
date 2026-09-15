import { useState } from "react";
import { useStore } from "../state/store";
import type { Identity } from "../model/types";

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#1e293b",
  color: "#f8fafc",
  border: "1px solid #334155",
  borderRadius: 4,
  padding: "4px 6px",
  fontSize: 12,
  fontFamily: "inherit",
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

function IdentityCard({ id }: { id: string }) {
  const identity = useStore((s) =>
    s.topology.identities.find((i) => i.id === id),
  );
  const setTopology = useStore.setState;

  if (!identity) return null;

  const patch = (p: Partial<Identity>) => {
    setTopology((s) => ({
      topology: {
        ...s.topology,
        identities: s.topology.identities.map((i) =>
          i.id === identity.id ? { ...i, ...p } : i,
        ),
      },
    }));
  };

  const remove = () =>
    setTopology((s) => ({
      topology: {
        ...s.topology,
        identities: s.topology.identities.filter((i) => i.id !== identity.id),
      },
    }));

  return (
    <fieldset
      style={{
        border: "1px solid #1e293b",
        borderRadius: 6,
        padding: 8,
        marginBottom: 8,
      }}
    >
      <legend
        style={{
          color: "#cbd5e1",
          fontSize: 11,
          display: "flex",
          gap: 8,
          alignItems: "center",
        }}
      >
        {identity.name || "(unnamed)"}
        <button style={btn} onClick={remove}>
          delete
        </button>
      </legend>
      <label style={{ display: "block", marginBottom: 6 }}>
        <div style={{ color: "#94a3b8", fontSize: 11 }}>Name</div>
        <input
          value={identity.name}
          onChange={(e) => patch({ name: e.target.value })}
          style={inputStyle}
        />
      </label>
      <label style={{ display: "block", marginBottom: 6 }}>
        <div style={{ color: "#94a3b8", fontSize: 11 }}>Type</div>
        <select
          value={identity.type}
          onChange={(e) =>
            patch({ type: e.target.value as Identity["type"] })
          }
          style={inputStyle}
        >
          <option value="user">user</option>
          <option value="device">device</option>
        </select>
      </label>
      <label style={{ display: "block", marginBottom: 6 }}>
        <div style={{ color: "#94a3b8", fontSize: 11 }}>
          Groups (comma-separated)
        </div>
        <input
          value={identity.groups.join(", ")}
          onChange={(e) =>
            patch({
              groups: e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
          style={inputStyle}
        />
      </label>
      <fieldset
        style={{
          border: "1px dashed #334155",
          borderRadius: 4,
          padding: 6,
          marginTop: 6,
        }}
      >
        <legend style={{ color: "#94a3b8", fontSize: 11 }}>Posture</legend>
        <label style={{ display: "block" }}>
          <input
            type="checkbox"
            checked={!!identity.posture?.compliant}
            onChange={(e) =>
              patch({
                posture: { ...identity.posture, compliant: e.target.checked },
              })
            }
          />{" "}
          Compliant
        </label>
        <label style={{ display: "block" }}>
          <input
            type="checkbox"
            checked={!!identity.posture?.mdmEnrolled}
            onChange={(e) =>
              patch({
                posture: {
                  ...identity.posture,
                  mdmEnrolled: e.target.checked,
                },
              })
            }
          />{" "}
          MDM-enrolled / Hybrid-joined
        </label>
        <label style={{ display: "block", marginTop: 6 }}>
          <div style={{ color: "#94a3b8", fontSize: 11 }}>OS</div>
          <select
            value={identity.posture?.os ?? ""}
            onChange={(e) =>
              patch({
                posture: {
                  ...identity.posture,
                  os: e.target.value || undefined,
                },
              })
            }
            style={inputStyle}
          >
            <option value="">—</option>
            <option value="windows">windows</option>
            <option value="linux">linux</option>
            <option value="macos">macos</option>
            <option value="android">android</option>
            <option value="ios">ios</option>
          </select>
        </label>
        <label style={{ display: "block", marginTop: 6 }}>
          <div style={{ color: "#94a3b8", fontSize: 11 }}>OS version</div>
          <input
            value={identity.posture?.osVersion ?? ""}
            onChange={(e) =>
              patch({
                posture: {
                  ...identity.posture,
                  osVersion: e.target.value || undefined,
                },
              })
            }
            style={inputStyle}
          />
        </label>
      </fieldset>
    </fieldset>
  );
}

export default function IdentityPanel() {
  const identities = useStore((s) => s.topology.identities);
  const addIdentity = useStore((s) => s.addIdentity);
  const [name, setName] = useState("");

  return (
    <div
      style={{
        padding: 12,
        height: "100%",
        overflow: "auto",
        color: "#f8fafc",
        fontSize: 12,
      }}
    >
      <strong>Identities</strong>
      <div
        style={{
          display: "flex",
          gap: 6,
          marginTop: 8,
          marginBottom: 12,
        }}
      >
        <input
          placeholder="alice@corp / laptop-01"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={inputStyle}
        />
        <button
          style={btn}
          onClick={() => {
            if (!name.trim()) return;
            addIdentity({
              type: "user",
              name: name.trim(),
              groups: [],
              posture: {},
            });
            setName("");
          }}
        >
          + Add
        </button>
      </div>
      {identities.length === 0 && (
        <div style={{ color: "#64748b" }}>
          No identities yet. Add a user or device to make Conditional Access
          and identity-aware ACL rules evaluate against something.
        </div>
      )}
      {identities.map((i) => (
        <IdentityCard key={i.id} id={i.id} />
      ))}
    </div>
  );
}
