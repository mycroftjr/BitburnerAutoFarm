
/** @param {NS} ns */
export function main(ns) {
    const faction = ns.args[0];
    const repToGain = ns.args[1];
    // https://github.com/danielyxie/bitburner/blob/master/src/Corporation/data/Constants.ts, BribeToRepRatio
    const BRIBE_TO_REP_RATIO = 1e9;  // Bribe Value divided by this = rep gain
    const MAX_SPEND_RATIO = 0.01;
    const donationAmount = Math.ceil(repToGain * BRIBE_TO_REP_RATIO);
    if (ns.corporation.getCorporation().funds * MAX_SPEND_RATIO > donationAmount) {
        if (ns.corporation.bribe(faction, donationAmount)) {
            ns.print(`Bribed ${faction} with $${ns.nFormat(donationAmount, "0a")} successfully!`);
        } else {
            ns.print("Bribe unsuccessful???");
        }
    } else {
        ns.print(`Not enough corp money to comfortably bribe ${faction} with $${ns.nFormat(donationAmount, "0a")}`);
    }
}
