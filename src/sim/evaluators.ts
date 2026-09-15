import type { Evaluator, Verdict } from "./types";
import type { Rule, RoutingEntry } from "../model/types";
import {
  longestPrefixMatch,
  matchHost,
  matchPort,
} from "./cidr";

const allow = (note?: string, nextHop?: string): Verdict => ({
  action: "allow",
  note,
  nextHop,
});
const deny = (matchedRule?: string, note?: string): Verdict => ({
  action: "deny",
  matchedRule,
  note,
});

export const endpointEvaluator: Evaluator = (node, ctx) => {
  if (node.id === ctx.flow.src || node.id === ctx.flow.dst) {
    return allow("endpoint");
  }
  return deny(undefined, "endpoint not part of flow");
};

export const l2SwitchEvaluator: Evaluator = () => allow("l2 forward");

export const routerEvaluator: Evaluator = (node, ctx) => {
  const dstIp = ctx.flow.dstIp;
  if (!dstIp) return allow("router (no dstIp)");
  const routes = (node.config?.routes ?? []) as RoutingEntry[];
  if (routes.length === 0) return allow("router (no static routes — fall through)");
  const best = longestPrefixMatch(routes, dstIp);
  if (!best) return deny(undefined, `no route to ${dstIp}`);
  return {
    action: "allow",
    note: `route ${best.prefix} → ${best.nextHop}`,
    nextHop: best.nextHop,
  };
};

function evalAcl(rules: Rule[], ctx: EvalContext, defaultAction: "allow" | "deny"): Verdict {
  const ordered = [...rules].sort(
    (a, b) => (a.priority ?? 0) - (b.priority ?? 0),
  );
  for (const r of ordered) {
    const m = r.match ?? {};
    if (m.proto && m.proto !== "any" && m.proto !== ctx.flow.proto) continue;
    if (!matchHost(m.src ?? "any", ctx.flow.srcIp ?? "")) continue;
    if (!matchHost(m.dst ?? "any", ctx.flow.dstIp ?? "")) continue;
    if (!matchPort(m.port, ctx.flow.port)) continue;
    if (m.identity && ctx.identity) {
      const inGroup =
        ctx.identity.id === m.identity ||
        ctx.identity.groups.includes(m.identity);
      if (!inGroup) continue;
    } else if (m.identity && !ctx.identity) {
      continue;
    }
    if (r.action === "allow") return allow(`rule ${r.id}`);
    return deny(r.id, `rule ${r.id} ${r.action}`);
  }
  return defaultAction === "allow"
    ? allow("default allow")
    : deny(undefined, "default deny");
}

type EvalContext = Parameters<Evaluator>[1];

export const genericAclEvaluator: Evaluator = (node, ctx) => {
  const rules = (node.config?.rules ?? []) as Rule[];
  const def = (node.config?.defaultAction as "allow" | "deny") ?? "deny";
  return evalAcl(rules, ctx, def);
};

export const statefulFirewallEvaluator: Evaluator = (node, ctx) => {
  const rules = (node.config?.rules ?? []) as Rule[];
  const def = (node.config?.defaultAction as "allow" | "deny") ?? "deny";
  return evalAcl(rules, ctx, def);
};

export const cloudNsgEvaluator: Evaluator = (node, ctx) => {
  const raw = (node.config?.nsgRules ?? []) as Array<Record<string, unknown>>;
  const rules: Rule[] = raw.map((r, i) => ({
    id: (r.id as string) ?? `nsg-${i}`,
    priority: (r.priority as number) ?? i,
    direction: (r.direction as Rule["direction"]) ?? "in",
    match: (r.match as Rule["match"]) ?? {},
    action: (r.action as Rule["action"]) ?? "deny",
  }));
  return evalAcl(rules, ctx, "deny");
};

export const natEvaluator: Evaluator = () => allow("nat (no-op v1)");

export const vpnTerminatorEvaluator: Evaluator = () => allow("vpn terminate");

export const passthroughEvaluator: Evaluator = () => allow("pass");

interface CaPolicy {
  id: string;
  name: string;
  state: "enabled" | "disabled" | "report_only";
  assignments?: {
    users?: { include?: string[]; exclude?: string[] };
    cloudApps?: string[];
    conditions?: {
      signInRiskLevels?: string[];
      userRiskLevels?: string[];
      platforms?: string[];
      locations?: string[];
      clientApps?: string[];
      devices?: { requireCompliant?: boolean; requireHybridJoined?: boolean };
    };
  };
  grantControls?: {
    operator?: "AND" | "OR";
    builtIn?: string[];
  };
}

function userMatches(
  assignment: CaPolicy["assignments"],
  identity?: { id: string; groups: string[] },
): boolean {
  const u = assignment?.users;
  if (!u) return true;
  if (!identity) return false;
  const idents = [identity.id, ...identity.groups, "All"];
  if (u.exclude?.some((x) => idents.includes(x))) return false;
  if (!u.include || u.include.length === 0) return true;
  return u.include.some((x) => idents.includes(x) || x === "All");
}

export const conditionalAccessEvaluator: Evaluator = (node, ctx) => {
  const policies = (node.config?.policies ?? []) as CaPolicy[];
  const id = ctx.identity;

  const matched: CaPolicy[] = [];
  for (const p of policies) {
    if (p.state !== "enabled") continue;
    if (!userMatches(p.assignments, id)) continue;
    const conds = p.assignments?.conditions;
    if (conds?.platforms?.length) {
      const os = id?.posture?.os?.toLowerCase();
      if (!os || !conds.platforms.map((x) => x.toLowerCase()).includes(os))
        continue;
    }
    matched.push(p);
  }

  if (matched.length === 0)
    return allow("no CA policy applied");

  const allControls = new Set<string>();
  for (const p of matched) {
    for (const c of p.grantControls?.builtIn ?? []) allControls.add(c);
  }

  if (allControls.has("block"))
    return deny(matched[0].id, `blocked by CA policy "${matched[0].name}"`);

  if (
    allControls.has("compliantDevice") &&
    !id?.posture?.compliant
  )
    return deny(
      matched[0].id,
      `device not compliant — required by "${matched[0].name}"`,
    );

  if (allControls.has("hybridJoinedDevice") && !id?.posture?.mdmEnrolled)
    return deny(
      matched[0].id,
      `device not hybrid-joined — required by "${matched[0].name}"`,
    );

  return allow(
    `CA: ${matched.map((p) => p.name).join(", ")} satisfied (${[...allControls].join("|") || "no controls"})`,
  );
};

export const evaluatorRegistry: Record<string, Evaluator> = {
  endpoint: endpointEvaluator,
  l2_switch: l2SwitchEvaluator,
  router: routerEvaluator,
  generic_acl: genericAclEvaluator,
  stateful_firewall: statefulFirewallEvaluator,
  cloud_nsg: cloudNsgEvaluator,
  nat: natEvaluator,
  vpn_terminator: vpnTerminatorEvaluator,
  passthrough: passthroughEvaluator,
  conditional_access: conditionalAccessEvaluator,
};
