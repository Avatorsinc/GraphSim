import { useState } from "react";
import { NodeResizer } from "reactflow";
import { useStore } from "../state/store";
import type { Annotation } from "../model/types";

interface Props {
  data: { annotation: Annotation };
  selected?: boolean;
}

function hexAlpha(hex: string, alpha: number): string {
  const m = hex.match(/^#?([a-f\d]{6})$/i);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function AnnotationNode({ data, selected }: Props) {
  const a = data.annotation;
  const updateAnnotation = useStore((s) => s.updateAnnotation);
  const removeAnnotation = useStore((s) => s.removeAnnotation);
  const [editing, setEditing] = useState(false);
  const isZone = a.kind === "zone";

  if (isZone) {
    return (
      <>
        <NodeResizer
          isVisible={!!selected}
          minWidth={120}
          minHeight={60}
          color={a.color}
          onResize={(_, params) => {
            updateAnnotation(a.id, {
              size: { w: params.width, h: params.height },
            });
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: hexAlpha(a.color, 0.12),
            border: `2px ${selected ? "solid" : "dashed"} ${a.color}`,
            borderRadius: 8,
            boxSizing: "border-box",
            pointerEvents: "none",
          }}
        />
        <div
          className="zone-handle"
          style={{
            position: "absolute",
            top: -14,
            left: 8,
            background: a.color,
            color: "#0f172a",
            padding: "2px 10px",
            borderRadius: 4,
            fontSize: 12,
            fontWeight: 600,
            cursor: "move",
            pointerEvents: "auto",
            userSelect: "none",
            maxWidth: "calc(100% - 32px)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            setEditing(true);
          }}
        >
          {editing ? (
            <input
              autoFocus
              defaultValue={a.label}
              onBlur={(e) => {
                updateAnnotation(a.id, { label: e.target.value });
                setEditing(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === "Escape") {
                  if (e.key === "Enter")
                    updateAnnotation(a.id, {
                      label: (e.target as HTMLInputElement).value,
                    });
                  setEditing(false);
                }
              }}
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                color: "inherit",
                font: "inherit",
                fontWeight: 600,
                width: 180,
              }}
            />
          ) : (
            a.label || "Zone"
          )}
        </div>
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            removeAnnotation(a.id);
          }}
          title="Delete zone"
          style={{
            position: "absolute",
            top: -14,
            right: 8,
            background: "#ef4444",
            color: "#fff",
            border: "2px solid #0f172a",
            borderRadius: "50%",
            width: 22,
            height: 22,
            cursor: "pointer",
            fontSize: 14,
            lineHeight: "16px",
            padding: 0,
            fontWeight: 700,
            pointerEvents: "auto",
            opacity: selected ? 1 : 0.7,
          }}
        >
          ×
        </button>
      </>
    );
  }

  return (
    <>
      <NodeResizer
        isVisible={!!selected}
        minWidth={60}
        minHeight={30}
        color={a.color}
        onResize={(_, params) => {
          updateAnnotation(a.id, {
            size: { w: params.width, h: params.height },
          });
        }}
      />
      <div
        style={{
          width: "100%",
          height: "100%",
          background: a.color,
          border: `1px solid ${selected ? "#fff" : a.color}`,
          borderRadius: 6,
          padding: 4,
          boxSizing: "border-box",
          color: "#0f172a",
          fontSize: 12,
          fontWeight: 600,
          cursor: "move",
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          setEditing(true);
        }}
      >
        {selected && (
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              removeAnnotation(a.id);
            }}
            style={{
              position: "absolute",
              top: -10,
              right: -10,
              background: "#ef4444",
              color: "#fff",
              border: "none",
              borderRadius: "50%",
              width: 18,
              height: 18,
              cursor: "pointer",
              fontSize: 11,
              lineHeight: "16px",
              padding: 0,
            }}
          >
            ×
          </button>
        )}
        {editing ? (
          <input
            autoFocus
            defaultValue={a.label}
            onBlur={(e) => {
              updateAnnotation(a.id, { label: e.target.value });
              setEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "Escape") {
                if (e.key === "Enter")
                  updateAnnotation(a.id, {
                    label: (e.target as HTMLInputElement).value,
                  });
                setEditing(false);
              }
            }}
            style={{
              width: "100%",
              background: "transparent",
              border: "none",
              outline: "none",
              color: "inherit",
              font: "inherit",
              fontWeight: 600,
            }}
          />
        ) : (
          a.label || "Note"
        )}
      </div>
    </>
  );
}
