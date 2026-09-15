import JSZip from "jszip";
import yaml from "js-yaml";
import type { DeviceTypeDefinition } from "../model/deviceType";
import { deviceRegistry } from "../registry/DeviceRegistry";
import { customEvaluators } from "./sandbox";

interface PackManifest {
  name: string;
  version: string;
  description?: string;
  deviceTypes: string[];
  evaluators: string[];
}

export interface ImportedPack {
  manifest: PackManifest;
  loadedTypes: number;
  loadedEvaluators: number;
  errors: string[];
}

export async function importPack(file: File): Promise<ImportedPack> {
  const errors: string[] = [];
  const zip = await JSZip.loadAsync(file);

  const manifestFile = zip.file("manifest.json");
  if (!manifestFile) throw new Error("missing manifest.json");
  const manifest = JSON.parse(await manifestFile.async("string")) as PackManifest;

  let loadedTypes = 0;
  for (const id of manifest.deviceTypes ?? []) {
    const f =
      zip.file(`devices/${id}.yaml`) ??
      zip.file(`devices/${id}.yml`) ??
      zip.file(`devices/${id}.json`);
    if (!f) {
      errors.push(`device file missing for ${id}`);
      continue;
    }
    try {
      const txt = await f.async("string");
      const def = (
        f.name.endsWith(".json") ? JSON.parse(txt) : yaml.load(txt)
      ) as DeviceTypeDefinition;
      deviceRegistry.register(def);
      loadedTypes++;
    } catch (e) {
      errors.push(`failed to load ${id}: ${(e as Error).message}`);
    }
  }

  let loadedEvaluators = 0;
  for (const id of manifest.evaluators ?? []) {
    const f = zip.file(`evaluators/${id}.js`);
    if (!f) {
      errors.push(`evaluator missing for ${id}`);
      continue;
    }
    try {
      const src = await f.async("string");
      customEvaluators.set(id, src);
      loadedEvaluators++;
    } catch (e) {
      errors.push(`failed to load evaluator ${id}: ${(e as Error).message}`);
    }
  }

  return { manifest, loadedTypes, loadedEvaluators, errors };
}

export async function exportPack(opts: {
  name: string;
  version: string;
  description?: string;
  deviceTypeIds: string[];
  evaluatorIds: string[];
}): Promise<Blob> {
  const zip = new JSZip();

  const manifest: PackManifest = {
    name: opts.name,
    version: opts.version,
    description: opts.description,
    deviceTypes: opts.deviceTypeIds,
    evaluators: opts.evaluatorIds,
  };
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));

  for (const id of opts.deviceTypeIds) {
    const def = deviceRegistry.get(id);
    if (!def) continue;
    zip.file(`devices/${id}.yaml`, yaml.dump(def));
  }
  for (const id of opts.evaluatorIds) {
    const rec = customEvaluators.get(id);
    if (!rec) continue;
    zip.file(`evaluators/${id}.js`, rec.source);
  }

  return zip.generateAsync({ type: "blob" });
}

export function downloadPack(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".graphpack.zip")
    ? filename
    : `${filename}.graphpack.zip`;
  a.click();
  URL.revokeObjectURL(url);
}
