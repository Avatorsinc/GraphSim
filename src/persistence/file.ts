import type { Topology } from "../model/types";

export function downloadTopology(t: Topology) {
  const blob = new Blob([JSON.stringify(t, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${t.name.replace(/\s+/g, "_")}.graphsim.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function pickTopologyFile(): Promise<Topology> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return reject(new Error("no file"));
      try {
        const text = await file.text();
        const parsed = JSON.parse(text) as Topology;
        if (!parsed.nodes || !parsed.edges)
          throw new Error("not a topology file");
        resolve(parsed);
      } catch (e) {
        reject(e);
      }
    };
    input.click();
  });
}

const LS_KEY = "graphsim.autosave";

export function autosave(t: Topology) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(t));
  } catch {
  }
}

export function loadAutosave(): Topology | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as Topology) : null;
  } catch {
    return null;
  }
}
