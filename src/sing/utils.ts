import type { NS } from "@ns";
import type { DeepReadonly } from "ts-essentials";

/** @param {NS} ns */
export function lowestCombatStat(ns: DeepReadonly<NS>): number {
    const s = ns.getPlayer().skills;
    return Math.min(s.agility, s.defense, s.dexterity, s.strength);
}