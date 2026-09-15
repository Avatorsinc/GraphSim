export type NodeId = string;
export type EdgeId = string;

export type Medium =
  | "lan"
  | "wifi"
  | "trunk"
  | "wan"
  | "vpn_ipsec"
  | "vpn_ssl"
  | "peering"
  | "sdwan"
  | "api"
  | "saml"
  | "oidc"
  | "sso"
  | "mdm_push"
  | "nfc"
  | "bluetooth"
  | "policy"
  | "enrollment"
  | "data_flow"
  | "reference"
  | "note_link"
  | "depends_on"
  | "leads_to"
  | "triggers"
  | "condition"
  | "unlocks"
  | "requires"
  | "authenticates";

export type RuleAction = "allow" | "deny" | "drop" | "log";

export interface Interface {
  name: string;
  type: "ethernet" | "wifi" | "virtual" | "tunnel";
  ip?: string;
  cidr?: string;
}

export interface Rule {
  id: string;
  priority: number;
  direction: "in" | "out" | "both";
  match: {
    src?: string;
    dst?: string;
    proto?: "tcp" | "udp" | "icmp" | "any";
    port?: number | string;
    app?: string;
    identity?: string;
  };
  action: RuleAction;
  log?: boolean;
  comment?: string;
}

export interface RoutingEntry {
  id: string;
  prefix: string;
  nextHop: string;
  interface?: string;
  metric?: number;
}

export interface Identity {
  id: string;
  type: "user" | "device";
  name: string;
  groups: string[];
  posture?: {
    compliant?: boolean;
    mdmEnrolled?: boolean;
    os?: string;
    osVersion?: string;
  };
}

export interface NetNode {
  id: NodeId;
  typeId: string;
  label: string;
  parentId?: NodeId;
  position: { x: number; y: number };
  interfaces: Interface[];
  config: Record<string, unknown>;
}

export interface NetEdge {
  id: EdgeId;
  source: NodeId;
  target: NodeId;
  fromIface?: string;
  toIface?: string;
  medium: Medium;
  attrs?: {
    mtu?: number;
    encrypted?: boolean;
    latencyMs?: number;
    bandwidthMbps?: number;
  };
}

export interface TestFlow {
  id: string;
  name: string;
  src: NodeId;
  dst: NodeId;
  proto: "tcp" | "udp" | "icmp";
  port?: number;
  identityId?: string;
}

export interface Annotation {
  id: string;
  kind: "zone" | "note";
  label: string;
  color: string;
  position: { x: number; y: number };
  size: { w: number; h: number };
}

export interface Topology {
  id: string;
  name: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  nodes: NetNode[];
  edges: NetEdge[];
  identities: Identity[];
  flows: TestFlow[];
  annotations?: Annotation[];
}
