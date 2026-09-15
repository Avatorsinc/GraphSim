import { v4 as uuid } from "uuid";
import type { NetEdge, NetNode } from "../model/types";

export interface Template {
  id: string;
  name: string;
  description: string;
  build: (origin: { x: number; y: number }) => {
    nodes: NetNode[];
    edges: NetEdge[];
  };
}

const node = (
  typeId: string,
  label: string,
  x: number,
  y: number,
  config: Record<string, unknown> = {},
  parentId?: string,
): NetNode => ({
  id: uuid(),
  typeId,
  label,
  position: { x, y },
  parentId,
  interfaces: [],
  config,
});

const edge = (
  source: string,
  target: string,
  medium: NetEdge["medium"] = "lan",
): NetEdge => ({
  id: uuid(),
  source,
  target,
  medium,
});

const FINANCE_GROUP = "GRP-DEV-Finance-Windows";

export const templates: Template[] = [
  {
    id: "example-office",
    name: "Example — Contoso Office",
    description:
      "Laptop → switch → firewall → Conditional Access → web app, with an Intune group, compliance policy and configuration profile",
    build: (o) => {
      const laptop = node("generic.client", "LT-0042", o.x, o.y, {
        os: "windows",
        ip: "10.10.1.20/24",
        gateway: "10.10.1.1",
        dns: ["10.10.1.1"],
      });
      const sw = node("generic.switch", "Access Switch", o.x + 220, o.y, {
        vlans: [{ id: 10, name: "workstations" }],
        ports: [],
      });
      const fw = node("generic.firewall", "Edge Firewall", o.x + 440, o.y, {
        defaultAction: "deny",
        rules: [
          {
            id: "allow-web",
            priority: 10,
            direction: "both",
            match: { src: "10.10.1.0/24", dst: "10.20.0.10", proto: "tcp", port: "443" },
            action: "allow",
            log: true,
            comment: "Workstations to web app over HTTPS",
          },
          {
            id: "deny-db",
            priority: 20,
            direction: "both",
            match: { src: "10.10.1.0/24", dst: "10.20.0.20", proto: "tcp", port: "1433" },
            action: "deny",
            log: true,
            comment: "No direct database access from workstations",
          },
        ],
      });
      const ca = node(
        "vendor.entra.conditional_access",
        "Conditional Access",
        o.x + 660,
        o.y,
        {
          policies: [
            {
              id: "ca-finance-compliant",
              name: "Finance requires compliant device",
              state: "enabled",
              assignments: { users: { include: ["Finance"], exclude: [] } },
              grantControls: { operator: "AND", builtIn: ["compliantDevice"] },
            },
          ],
        },
      );
      const web = node("generic.client", "Web App", o.x + 880, o.y, {
        os: "linux",
        ip: "10.20.0.10/24",
        gateway: "10.20.0.1",
      });
      const db = node("generic.client", "Database", o.x + 660, o.y + 150, {
        os: "linux",
        ip: "10.20.0.20/24",
        gateway: "10.20.0.1",
      });

      const tenant = node("vendor.intune.tenant", "Intune Tenant", o.x, o.y + 320, {
        tenantName: "contoso",
        tenantId: "00000000-0000-0000-0000-000000000000",
        region: "global",
        scopeTags: ["Default"],
      });
      const group = node("vendor.intune.device_group", FINANCE_GROUP, o.x + 660, o.y + 460, {
        name: FINANCE_GROUP,
        type: "dynamic_device",
        description: "Windows devices tagged for the Finance department",
        membershipRule:
          '(device.deviceOSType -eq "Windows") and (device.devicePhysicalIds -any _ -eq "[OrderID]:FINANCE")',
        members: [],
      });
      const compliance = node(
        "vendor.intune.compliance_policy",
        "Windows Compliance Baseline",
        o.x + 440,
        o.y + 320,
        {
          name: "Windows Compliance Baseline",
          platform: "windows11",
          rules: {
            osMinVersion: "10.0.22631",
            bitlockerRequired: true,
            secureBootRequired: true,
            defenderEnabled: true,
            firewallEnabled: true,
          },
          actionsForNonCompliance: [{ action: "markNonCompliant", gracePeriodHours: 24 }],
          assignments: { include: [FINANCE_GROUP], exclude: [] },
        },
      );
      const profile = node(
        "vendor.intune.config_profile",
        "Corporate Wi-Fi",
        o.x + 440,
        o.y + 460,
        {
          name: "Corporate Wi-Fi",
          platform: "windows11",
          template: "wifi",
          settings: { ssid: "CONTOSO-CORP", security: "WPA2-Enterprise", autoConnect: true },
          assignments: { include: [FINANCE_GROUP], exclude: [] },
        },
      );
      const note = node("meta.sticky_note", "How to use this example", o.x - 260, o.y, {
        text: "Simulate tab:\n• LT-0042 → Web App, TCP 443 → reaches\n• LT-0042 → Database, TCP 1433 → blocked by deny-db\n\nIdentity tab: add a user in group \"Finance\" with compliant = false, then re-run the web flow to see Conditional Access deny it.",
        color: "#fef3c7",
      });

      return {
        nodes: [laptop, sw, fw, ca, web, db, tenant, group, compliance, profile, note],
        edges: [
          edge(laptop.id, sw.id, "lan"),
          edge(sw.id, fw.id, "lan"),
          edge(fw.id, ca.id, "lan"),
          edge(ca.id, web.id, "lan"),
          edge(fw.id, db.id, "lan"),
          edge(tenant.id, compliance.id, "policy"),
          edge(tenant.id, profile.id, "policy"),
          edge(compliance.id, group.id, "mdm_push"),
          edge(profile.id, group.id, "mdm_push"),
          edge(compliance.id, ca.id, "api"),
        ],
      };
    },
  },
];
