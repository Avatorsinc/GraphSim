export interface DeviceTypeInterface {
  name: string;
  type: "ethernet" | "wifi" | "virtual" | "tunnel";
}

export type EvaluatorKind =
  | "passthrough"
  | "l2_switch"
  | "router"
  | "generic_acl"
  | "stateful_firewall"
  | "nat"
  | "vpn_terminator"
  | "cloud_nsg"
  | "endpoint"
  | "conditional_access"
  | "custom";

export interface DeviceTypeDefinition {
  id: string;
  name: string;
  vendor?: string;
  category:
    | "endpoint"
    | "l2"
    | "l3"
    | "firewall"
    | "cloud"
    | "identity"
    | "mdm"
    | "wireless"
    | "custom"
    | string;
  icon?: string;
  description?: string;
  capabilities?: string[];
  interfaces: DeviceTypeInterface[];
  defaultConfig?: Record<string, unknown>;
  configSchema: object;
  evaluator: EvaluatorKind;
  evaluatorRef?: string;
}
