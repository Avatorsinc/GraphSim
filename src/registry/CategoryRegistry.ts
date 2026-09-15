import type { DeviceTypeDefinition } from "../model/deviceType";
import { deviceRegistry } from "./DeviceRegistry";

export interface CategoryDef {
  id: string;
  label: string;
  color: string;
}

const BUILTIN: CategoryDef[] = [
  { id: "endpoint", label: "Endpoints", color: "#3b82f6" },
  { id: "l2", label: "L2", color: "#10b981" },
  { id: "l3", label: "L3", color: "#8b5cf6" },
  { id: "firewall", label: "Firewall", color: "#ef4444" },
  { id: "cloud", label: "Cloud", color: "#f59e0b" },
  { id: "identity", label: "Identity", color: "#ec4899" },
  { id: "mdm", label: "MDM / Endpoint Mgmt", color: "#06b6d4" },
  { id: "wireless", label: "Wireless", color: "#14b8a6" },
  { id: "platform", label: "OS / Platform", color: "#f97316" },
  { id: "apps", label: "Applications", color: "#818cf8" },
  { id: "logic", label: "Logic / Flow", color: "#a3e635" },
  { id: "custom", label: "Custom", color: "#64748b" },
];

const LS_CATS = "graphsim.userCategories";
const LS_TYPES = "graphsim.userDeviceTypes";

class CategoryRegistry {
  private user: CategoryDef[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const raw = localStorage.getItem(LS_CATS);
      if (raw) this.user = JSON.parse(raw);
    } catch {
      this.user = [];
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(LS_CATS, JSON.stringify(this.user));
    } catch {
    }
  }

  all(): CategoryDef[] {
    return [...BUILTIN, ...this.user];
  }

  get(id: string): CategoryDef | undefined {
    return this.all().find((c) => c.id === id);
  }

  add(cat: CategoryDef) {
    if (this.all().some((c) => c.id === cat.id))
      throw new Error(`category ${cat.id} already exists`);
    this.user.push(cat);
    this.saveToStorage();
  }

  remove(id: string) {
    if (BUILTIN.some((c) => c.id === id))
      throw new Error("cannot remove a built-in category");
    this.user = this.user.filter((c) => c.id !== id);
    this.saveToStorage();
  }
}

export const categoryRegistry = new CategoryRegistry();

export function loadUserDeviceTypes() {
  try {
    const raw = localStorage.getItem(LS_TYPES);
    if (!raw) return;
    const list = JSON.parse(raw) as DeviceTypeDefinition[];
    for (const def of list) deviceRegistry.register(def);
  } catch {
  }
}

export function saveUserDeviceType(def: DeviceTypeDefinition) {
  deviceRegistry.register(def);
  try {
    const raw = localStorage.getItem(LS_TYPES);
    const list = raw ? (JSON.parse(raw) as DeviceTypeDefinition[]) : [];
    const next = [...list.filter((d) => d.id !== def.id), def];
    localStorage.setItem(LS_TYPES, JSON.stringify(next));
  } catch {
  }
}

export function isUserDeviceType(id: string): boolean {
  try {
    const raw = localStorage.getItem(LS_TYPES);
    if (!raw) return false;
    const list = JSON.parse(raw) as DeviceTypeDefinition[];
    return list.some((d) => d.id === id);
  } catch {
    return false;
  }
}

export function removeUserDeviceType(id: string) {
  deviceRegistry.unregister(id);
  try {
    const raw = localStorage.getItem(LS_TYPES);
    if (!raw) return;
    const list = JSON.parse(raw) as DeviceTypeDefinition[];
    localStorage.setItem(
      LS_TYPES,
      JSON.stringify(list.filter((d) => d.id !== id)),
    );
  } catch {
  }
}
