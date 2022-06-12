
/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    const MILLIS_TO_WAIT = 5000;
    const company = ns.args[0];
    const job = ns.args[1];
    const repTarg = ns.args[2];
    while (ns.singularity.getCompanyRep(company) < repTarg) {
        const focus = ns.singularity.isBusy() && ns.singularity.isFocused();
        ns.singularity.stopAction();
        if (ns.singularity.applyToCompany(company, job)) {
            ns.tprint("Got a promotion at ", company, "!");
        }
        ns.singularity.workForCompany(company, focus);
        await ns.sleep(MILLIS_TO_WAIT);
    }
}
