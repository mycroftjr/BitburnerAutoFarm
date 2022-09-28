
/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("ALL");
    const MILLIS_TO_WAIT = 5000;
    
    const faction = ns.args[0];
    const repTarg = ns.args[1];
    const preferCombat = ns.args[2];
    const CHARISMA_TARG = 250;
    let JOB_PRIOS = [];
    if (preferCombat) {
        if (ns.getPlayer().skills.charisma > CHARISMA_TARG) {
            JOB_PRIOS = ["security", "field", "hacking"];
        } else {
            JOB_PRIOS = ["field", "security", "hacking"];
        }
    } else {
        JOB_PRIOS = ["hacking", "field", "security"];
    }
    
    while (ns.singularity.getFactionRep(faction) < repTarg) {
        for (const job of JOB_PRIOS) {
            const focus = ns.singularity.isBusy() && ns.singularity.isFocused();
            if (ns.singularity.workForFaction(faction, job, focus))
                break;
        }
        await ns.sleep(MILLIS_TO_WAIT);
    }
}
