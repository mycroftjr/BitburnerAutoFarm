import type { NS } from "@ns";
import type { DeepReadonly } from "ts-essentials";

/** @param {NS} ns */
export function main(ns: DeepReadonly<NS>): void {
    const faction = ns.args[0] as string;
    const repToGain = ns.args[1] as number;
    // https://github.com/danielyxie/bitburner/blob/master/src/Corporation/data/Constants.ts, BribeToRepRatio
    const BRIBE_TO_REP_RATIO = 1e9;  // Bribe Value divided by this = rep gain
    const MAX_SPEND_RATIO = 0.01;
    const donationAmount = Math.ceil(repToGain * BRIBE_TO_REP_RATIO);
    if (ns.corporation.getCorporation().funds * MAX_SPEND_RATIO > donationAmount) {
        if (ns.corporation.bribe(faction, donationAmount)) {
            ns.print(`Bribed ${faction} with $${ns.formatNumber(donationAmount, 0)} successfully!`);
        } else {
            ns.print("Bribe unsuccessful???");
        }
    } else {
        ns.print(`Not enough corp money to comfortably bribe ${faction} with $${ns.formatNumber(donationAmount, 0)}`);
    }
}