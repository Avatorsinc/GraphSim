export function ipToInt(ip: string): number {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255))
    throw new Error(`bad IP: ${ip}`);
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

export interface Cidr {
  base: number;
  mask: number;
  bits: number;
}

export function parseCidr(cidr: string): Cidr {
  const [ip, b] = cidr.split("/");
  const bits = b == null ? 32 : Number(b);
  if (bits < 0 || bits > 32) throw new Error(`bad CIDR bits: ${cidr}`);
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  const base = ipToInt(ip) & mask;
  return { base, mask, bits };
}

export function cidrContains(cidr: string, ip: string): boolean {
  const c = parseCidr(cidr);
  const v = ipToInt(ip);
  return (v & c.mask) === c.base;
}

export function matchHost(pattern: string, ip: string): boolean {
  if (!pattern || pattern === "any" || pattern === "*") return true;
  if (pattern.includes("/")) return cidrContains(pattern, ip);
  return pattern === ip;
}

export function matchPort(pattern: string | number | undefined, port?: number): boolean {
  if (pattern === undefined || pattern === "any" || pattern === "*" || pattern === "")
    return true;
  if (port === undefined) return false;
  const s = String(pattern);
  if (s.includes("-")) {
    const [lo, hi] = s.split("-").map(Number);
    return port >= lo && port <= hi;
  }
  if (s.includes(",")) {
    return s.split(",").map((p) => Number(p.trim())).includes(port);
  }
  return Number(s) === port;
}

export function longestPrefixMatch<T extends { prefix: string }>(
  routes: T[],
  ip: string,
): T | undefined {
  let best: T | undefined;
  let bestBits = -1;
  for (const r of routes) {
    try {
      const c = parseCidr(r.prefix);
      if ((ipToInt(ip) & c.mask) === c.base && c.bits > bestBits) {
        best = r;
        bestBits = c.bits;
      }
    } catch {
    }
  }
  return best;
}

export function ipOf(cidrOrIp: string | undefined): string | undefined {
  if (!cidrOrIp) return undefined;
  return cidrOrIp.split("/")[0];
}
