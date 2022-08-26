
/** @param {NS} ns */
export function main(ns) {
    const faction = ns.args[0];
    const repToGain = ns.args[1];
    // from https://github.com/danielyxie/bitburner/blob/master/src/Constants.ts, DonateMoneyToRepDivisor
    const MONEY_PER_REP = 1e6;
    const MAX_SPEND_RATIO = 0.01;
    const donationAmount = repToGain / ns.getPlayer().mults.faction_rep * MONEY_PER_REP;
    if (ns.corporation.getCorporation().funds * MAX_SPEND_RATIO > donationAmount) {
        ns.corporation.bribe(faction, donationAmount);
    }
}
