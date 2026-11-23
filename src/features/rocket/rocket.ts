import type { RocketMember, RocketMemberKind } from "../../domain/rocket";

export function memberKindLabel(kind: RocketMemberKind): string {
  switch (kind) {
    case "giovanni": return "Giovanni";
    case "leader": return "Leaders";
    case "unknown": return "Other Rocket members";
    default: return "Grunts";
  }
}

export function groupRocketMembers(members: RocketMember[]): Array<{ kind: RocketMemberKind; label: string; members: RocketMember[] }> {
  const order: RocketMemberKind[] = ["giovanni", "leader", "grunt", "unknown"];
  return order.flatMap((kind) => {
    const grouped = members.filter((member) => member.kind === kind);
    return grouped.length > 0 ? [{ kind, label: memberKindLabel(kind), members: grouped }] : [];
  });
}

export function formatTheme(member: RocketMember): string {
  return member.themeType ? `${member.themeType}-type` : "Variable lineup";
}
