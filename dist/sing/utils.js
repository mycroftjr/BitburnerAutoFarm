
/** @param {NS} ns */
export function lowestCombatStat(ns) {
    const s = ns.getPlayer().skills;
    return Math.min(s.agility, s.defense, s.dexterity, s.strength);
}
