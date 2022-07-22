import type { NS } from "@ns";
import type { DeepReadonly } from "ts-essentials";

/** @param {NS} ns */
export async function main(ns: DeepReadonly<NS>): Promise<void> {
    ns.disableLog("sleep");
    const MILLIS_TO_WAIT = 5e3;
    /** @type {string} */
    const program = ns.args[0] as string;
    while (!ns.fileExists(program, "home")) {
        const focus = ns.singularity.isBusy() && ns.singularity.isFocused();
        ns.singularity.createProgram(program, focus);
        await ns.sleep(MILLIS_TO_WAIT);
    }
}