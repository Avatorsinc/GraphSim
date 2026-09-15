import type { Topology } from "../model/types";
import { toPng } from "html-to-image";

const safeId = (s: string) => s.replace(/[^a-zA-Z0-9_]/g, "_");

export function toMermaid(topo: Topology): string {
  const lines = ["flowchart LR"];
  const byParent = new Map<string | undefined, typeof topo.nodes>();
  for (const n of topo.nodes) {
    const k = n.parentId;
    (byParent.get(k) ?? byParent.set(k, []).get(k)!).push(n);
  }
  const renderNodes = (parent: string | undefined, indent: string) => {
    const children = byParent.get(parent) ?? [];
    for (const n of children) {
      const id = safeId(n.id);
      const containerKids = byParent.get(n.id);
      if (containerKids && containerKids.length) {
        lines.push(`${indent}subgraph ${id}["${n.label}"]`);
        renderNodes(n.id, indent + "  ");
        lines.push(`${indent}end`);
      } else {
        lines.push(`${indent}${id}["${n.label}\\n${n.typeId}"]`);
      }
    }
  };
  renderNodes(undefined, "  ");
  for (const e of topo.edges) {
    const dashed = e.medium.startsWith("vpn") || ["reference", "note_link", "depends_on", "condition", "requires"].includes(e.medium);
    const arrow = dashed ? "-.->" : "-->";
    lines.push(`  ${safeId(e.source)} ${arrow}|${e.medium}| ${safeId(e.target)}`);
  }
  return lines.join("\n");
}

export function toDrawioXml(topo: Topology): string {
  const idMap = new Map<string, string>();
  topo.nodes.forEach((n, i) => idMap.set(n.id, `n${i + 1}`));

  const cells: string[] = [
    `<mxCell id="0"/>`,
    `<mxCell id="1" parent="0"/>`,
  ];
  for (const n of topo.nodes) {
    const x = Math.round(n.position.x);
    const y = Math.round(n.position.y);
    const parent = n.parentId ? idMap.get(n.parentId) ?? "1" : "1";
    cells.push(
      `<mxCell id="${idMap.get(n.id)}" value="${escapeXml(n.label + "\n" + n.typeId)}" style="rounded=1;fillColor=#1e293b;strokeColor=#334155;fontColor=#f8fafc;" vertex="1" parent="${parent}"><mxGeometry x="${x}" y="${y}" width="160" height="60" as="geometry"/></mxCell>`,
    );
  }
  for (const e of topo.edges) {
    const s = idMap.get(e.source);
    const t = idMap.get(e.target);
    if (!s || !t) continue;
    cells.push(
      `<mxCell id="e_${e.id.slice(0, 8)}" style="endArrow=classic;html=1;" edge="1" parent="1" source="${s}" target="${t}"><mxGeometry relative="1" as="geometry"/></mxCell>`,
    );
  }
  return `<mxfile><diagram name="${escapeXml(topo.name)}"><mxGraphModel dx="800" dy="600" grid="1" gridSize="10" guides="1"><root>${cells.join("")}</root></mxGraphModel></diagram></mxfile>`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function downloadText(text: string, filename: string, mime: string) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function capturePng(scale = 2): Promise<string> {
  const flow = document.querySelector(".react-flow") as HTMLElement | null;
  if (!flow) throw new Error("React Flow container not found");

  const overlays = document.querySelectorAll<HTMLElement>(
    "[style*='z-index: 1000'], [style*='z-index:1000'], aside",
  );
  const saved: { el: HTMLElement; display: string }[] = [];
  overlays.forEach((el) => {
    saved.push({ el, display: el.style.display });
    el.style.display = "none";
  });

  try {
    await new Promise((r) => setTimeout(r, 50));

    const dataUrl = await toPng(flow, {
      backgroundColor: "#0b1220",
      pixelRatio: scale,
      filter: (node: HTMLElement) => {
        if (node.classList) {
          if (
            node.classList.contains("react-flow__minimap") ||
            node.classList.contains("react-flow__controls") ||
            node.classList.contains("react-flow__attribution") ||
            node.classList.contains("react-flow__panel")
          ) {
            return false;
          }
        }
        return true;
      },
    });
    return dataUrl;
  } finally {
    saved.forEach(({ el, display }) => {
      el.style.display = display;
    });
  }
}

export async function downloadPng(filename: string): Promise<void> {
  const dataUrl = await capturePng();
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

export async function copyPngToClipboard(): Promise<void> {
  const dataUrl = await capturePng();
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  await navigator.clipboard.write([
    new ClipboardItem({ "image/png": blob }),
  ]);
}
