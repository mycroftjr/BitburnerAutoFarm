/** @param {NS} ns */
export async function main(ns) {
    const root = "https://raw.githubusercontent.com/mycroftjr/BitburnerAutoFarm/master/dist/";
    const files = [
        "autoFarm.js", "configHelper.js", "watcher.js", "bladeburner/bladeburner.js", "corp/makeProducts.js", 
        "corp/setup.js", "sing/activities.js", "sing/ascend.js", "sing/bribeWithCorpFunds.js", "sing/crawl.js", 
        "sing/createProg.js", "sing/doCrime.js", "sing/keepRunning.js", "sing/sing.js", "sing/upgrades.js", 
        "sing/utils.js", "sing/workForCompany.js", "sing/workForFaction.js", 
    ];
    for (const file of files) {
        await ns.wget(root + file, file.includes("/") ? "/" + file : file);
    }
}