import yaml from "js-yaml";
import Ajv, { type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import type { DeviceTypeDefinition } from "../model/deviceType";

const builtinFiles = import.meta.glob(
  "../packs/**/*.{yaml,yml,json}",
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

class DeviceRegistry {
  private types = new Map<string, DeviceTypeDefinition>();
  private validators = new Map<string, ValidateFunction>();
  private ajv = new Ajv({ allErrors: true, strict: false });

  constructor() {
    addFormats(this.ajv);
  }

  loadBuiltins() {
    for (const [path, raw] of Object.entries(builtinFiles)) {
      try {
        const def = (
          path.endsWith(".json") ? JSON.parse(raw) : yaml.load(raw)
        ) as DeviceTypeDefinition;
        this.register(def);
      } catch (e) {
        console.warn(`[DeviceRegistry] failed to load ${path}`, e);
      }
    }
  }

  register(def: DeviceTypeDefinition) {
    if (!def?.id) throw new Error("DeviceType missing id");
    this.types.set(def.id, def);
    if (def.configSchema) {
      try {
        this.validators.set(def.id, this.ajv.compile(def.configSchema));
      } catch (e) {
        console.warn(
          `[DeviceRegistry] schema compile failed for ${def.id}`,
          e,
        );
      }
    }
  }

  unregister(id: string) {
    this.types.delete(id);
    this.validators.delete(id);
  }

  get(id: string): DeviceTypeDefinition | undefined {
    return this.types.get(id);
  }

  all(): DeviceTypeDefinition[] {
    return [...this.types.values()].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }

  byCategory(): Record<string, DeviceTypeDefinition[]> {
    const out: Record<string, DeviceTypeDefinition[]> = {};
    for (const def of this.all()) {
      (out[def.category] ??= []).push(def);
    }
    return out;
  }

  validate(
    typeId: string,
    config: unknown,
  ): { valid: boolean; errors?: string[] } {
    const v = this.validators.get(typeId);
    if (!v) return { valid: true };
    const valid = v(config);
    if (valid) return { valid: true };
    return {
      valid: false,
      errors: (v.errors ?? []).map(
        (e) => `${e.instancePath || "/"} ${e.message}`,
      ),
    };
  }
}

export const deviceRegistry = new DeviceRegistry();
deviceRegistry.loadBuiltins();
