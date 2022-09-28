import type { NS } from "@ns";
import type { DeepReadonly } from "ts-essentials";

/** [type of action, name of action] */
const ALL_ACTIONS: [string, string][] = [];

/** @param {NS} ns */
export function haveBladeburnerApiAccess(ns: DeepReadonly<NS>): boolean {
    let access = false;
    try {
        access = ns.bladeburner.joinBladeburnerDivision();
    } catch {}
    return access;
}

/** Assigns skill points and schedules new actions. Returns the time it will take to complete the current action.
 * @param {NS} ns */
 export function bladeburnerStep(ns: DeepReadonly<NS>): number {
    const CITIES = ["Sector-12", "Aevum", "Chongqing", "Ishima", "New Tokyo", "Volhaven"];
    // The hard limit of the Overclock skill's level
    const OVERCLOCK_MAX_LEVEL = 90;
    // The softcap of the Datamancer skill's level
    const DATAMANCER_SOFT_CAP = 5;  // TODO: apply math instead of guessing

    try {
        ns.bladeburner.joinBladeburnerFaction();
    } catch {}

    function getIntelEffectiveness(name: string) {
        // From https://github.com/danielyxie/bitburner/blob/dev/src/Bladeburner/Bladeburner.tsx, search "PopulationEstimate"
        /* eslint-disable no-magic-numbers */
        switch (name) {
            case "Field Analysis": {
                const person = ns.getPlayer();
                let eff = 0.04 * Math.pow(person.skills.hacking, 0.3)
                    + 0.04 * Math.pow(person.skills.intelligence, 0.9)
                    + 0.02 * Math.pow(person.skills.charisma, 0.3);
                eff *= person.mults.bladeburner_analysis;
                return eff;
            }
            case "Investigation":
                return 0.4;
            case "Undercover Operation":
                return 0.8;
            default:
                throw Error(`Unexpected intel name ${name}!`);
        }
        /* eslint-enable no-magic-numbers */
    }

    const INTEL_ACTIONS: readonly [string, string][] = [
        ["General", "Field Analysis"],
        // ["Contracts", "Tracking"],  // uses flat numbers instead of percentages, basically pointless
        ["Operations", "Investigation"],
        ["Operations", "Undercover Operation"],
    ];

    // The times-x decrease in Chaos needed to switch cities after establishing population estimates
    const CHAOS_RATIO = 1.25;
    const city = () => ns.bladeburner.getCity();
    const chaos = () => ns.bladeburner.getCityChaos(city());
    const citiesByChaos = CITIES
        .map(c => [ns.bladeburner.getCityChaos(c), c] as [number, string])
        .sort(([chaosA, ], [chaosB, ]) => chaosA - chaosB);
    
    // TODO: only move for communities if the rep gain of Raid over the next best is more than the increase in Chaos
    /*
    const communitiesByChaos = citiesByChaos.filter(([, c]) => ns.bladeburner.getCityCommunities(c) >= 1);
    if (communitiesByChaos.length) {
        // If Synthoid communities are eradicated here but exist elsewhere, go to least Chaotic city where there are any communities
        if ((ns.bladeburner.getCityCommunities(city()) == 0 || communitiesByChaos[0][0] * CHAOS_RATIO < chaos()) && communitiesByChaos[0][1] != city()) {
            ns.print(`Moving to ${communitiesByChaos[0][1]} for more Synthoid communities`);
            ns.bladeburner.switchCity(communitiesByChaos[0][1]);
        }
    } else*/ if (ns.bladeburner.getCityEstimatedPopulation(city()) == 0
    || citiesByChaos[0][0] * CHAOS_RATIO < chaos()) {
        // If just starting Bladeburning or synthoid opportunities are otherwise gone, OR if there is much lesser chaos somewhere out there, go to where there is the least chaos
        if (citiesByChaos[0][1] != city()) {
            ns.print(`Moving to ${citiesByChaos[0][1]} for less Chaos`);
            ns.bladeburner.switchCity(citiesByChaos[0][1]);
        }
    }

    function spamUpgrade(upgrade: string, maxLevel = Infinity) {
        while (ns.bladeburner.getSkillPoints() >= ns.bladeburner.getSkillUpgradeCost(upgrade)
                && ns.bladeburner.getSkillLevel(upgrade) + 1 <= maxLevel) {
            ns.bladeburner.upgradeSkill(upgrade);
        }
    }

    const intel = {
        // Whether the population estimate is completely accurate
        popAcc: true,
        // How we know the population estimate is inaccurate
        popInaccuracy: ["", "", 1, 1] as [string, string, number, number],
        // Whether all actions we can currently take are guaranteed successes
        allSuccess: true,
        // The first action we see that is not a guaranteed success
        potentialFailure: ["", "", 0, 1] as [string, string, number, number],
    };

    /** Returns the lower-end estimate of success chance for the given action.
     * @modifies {popAcc} */
    function getSuccessChance(type: string, name: string) {
        const chances = ns.bladeburner.getActionEstimatedSuccessChance(type, name);
        if (chances[0] != chances[1] && intel.popAcc) {
            intel.popAcc = false;
            // TODO: assign biggest gap
            intel.popInaccuracy = [type, name, chances[0], chances[1]];
        }
        if (chances[0] != 1.0 && chances[1] != 0.0 && intel.allSuccess) {
            intel.allSuccess = false;
            // TODO: assign lowest success chance
            intel.potentialFailure = [type, name, chances[0], chances[1]];
        }
        return chances[0];
    }

    // Populate intel with calculations on the actions we can currently take, other than Recruitment
    ALL_ACTIONS.filter(([type, name]) => name != "Recruitment" && (type != "BlackOps" || ns.bladeburner.getBlackOpRank(name) <= ns.bladeburner.getRank()))
        .reverse().map(([type, name]) => getSuccessChance(type, name));

    spamUpgrade("Overclock", OVERCLOCK_MAX_LEVEL);
    if (!intel.popAcc) {
        spamUpgrade("Datamancer", DATAMANCER_SOFT_CAP);
    } else if (!intel.allSuccess) {
        const [sType, sName, chance0, ] = intel.potentialFailure;
        ns.print(`Need success levels for: ${sType} ${sName}, ${chance0}% success chance`);
        spamUpgrade("Digital Observer");
        spamUpgrade("Blade's Intuition");
        // TODO: upgrade other skills?
    }

    let action = ns.bladeburner.getCurrentAction();
    const MILLIS_THRESH = 1e2;
    let timeElapsed = ns.bladeburner.getActionCurrentTime();
    if (timeElapsed < MILLIS_THRESH) {
        ns.bladeburner.stopBladeburnerAction();
        action = ns.bladeburner.getCurrentAction();
        timeElapsed = 0;
    }

    if (action.type != "Idle" && ns.bladeburner.getActionEstimatedSuccessChance(action.type, action.name)[0] != 1.0) {
        ns.print("Cancelling existing Bladeburner action due to increased danger!");
        ns.bladeburner.stopBladeburnerAction();
        action = ns.bladeburner.getCurrentAction();
        timeElapsed = 0;
    }
    if (action.type == "Idle") {
        // Find a bladeburner action to start
        const stam = ns.bladeburner.getStamina();
        // Low stam will harm success chances
        if (2 * stam[0] > stam[1]) {
            /** Sorts the given actions into the returned array
             * @param {[string, string][]} actions
             * @returns {[number, number, string, string][]} [score, time to complete action, type of action, name of action] */
            function sortActions(actions: DeepReadonly<[string, string][]>, gradeOnIntel = false) {
                const out: [number, number, string, string][] = [];
                for (const [type, name] of actions) {
                    if (ns.bladeburner.getActionCountRemaining(type, name) <= 0) {
                        // ns.print(`Skipping ${type}: ${name} as no counts are remaining`);
                        continue;
                    }
                    if (type == "BlackOps") {
                        const neededRank = ns.bladeburner.getBlackOpRank(name);
                        const rank = ns.bladeburner.getRank();
                        if (rank < neededRank) {
                            // ns.print(`Skipping ${type}: ${name} because Rank is not high enough: ${rank} vs ${neededRank}`);
                            continue;
                        }
                    }
                    const chance = getSuccessChance(type, name);
                    if (chance < 1.0) {
                        // ns.print(`Skipping ${type}: ${name} as success estimate is only ${chance}`);
                        continue;
                    }
                    const lvl = ns.bladeburner.getActionCurrentLevel(type, name);
                    const time = ns.bladeburner.getActionTime(type, name);
                    const score = gradeOnIntel ? getIntelEffectiveness(name) : ns.bladeburner.getActionRepGain(type, name, lvl);
                    const scoreSpeed = score / time;
                    out.push([scoreSpeed, time, type, name]);
                }
                return out.sort(([speedA, timeA, typeA], [speedB, timeB, typeB]) => {
                    // BlackOps first
                    const typeDiff = (typeB == "BlackOps" ? 1 : 0) - (typeA == "BlackOps" ? 1 : 0);
                    if (typeDiff != 0) return typeDiff;
                    // Bigger speeds first
                    const speedDiff = speedB - speedA;
                    if (speedDiff != 0) return speedDiff;
                    // Less time first
                    return timeA - timeB;
                });
            }
            /** [rep gain per time, time to complete action, type of action, name of action] */
            const actionsByRep = sortActions(ALL_ACTIONS);
            if (!intel.popAcc) {
                // TODO: attempt to calculate the max possible % pop inaccuracy to use a quicker Intel action to fix
                const [piType, piName, chance0, chance1] = intel.popInaccuracy;
                ns.print(`${piType}: ${piName} is how we know the population estimate is inaccurate: ${chance0} vs ${chance1}`);
                const intelActionsByRep = sortActions(INTEL_ACTIONS, true);
                ns.print("actions by intel gain: ", intelActionsByRep);
                for (const [, time, type, name] of intelActionsByRep) {
                    if (ns.bladeburner.startAction(type, name))
                        return time;
                }
            }
            ns.print("actions: ", actionsByRep);
            for (const [, time, type, name] of actionsByRep) {
                if (ns.bladeburner.startAction(type, name))
                    return time;
            }
        }
        if (chaos() > 0) {
            if (ns.bladeburner.startAction("General", "Diplomacy"))
                return ns.bladeburner.getActionTime("General", "Diplomacy");
        }
        if (!intel.popAcc) {
            if (ns.bladeburner.startAction("General", "Field Analysis"))
                return ns.bladeburner.getActionTime("General", "Field Analysis");
        }
        if (ns.bladeburner.startAction("General", "Hyperbolic Regeneration Chamber"))
            return ns.bladeburner.getActionTime("General", "Hyperbolic Regeneration Chamber");
    }

    action = ns.bladeburner.getCurrentAction();
    return ns.bladeburner.getActionTime(action.type, action.name) - ns.bladeburner.getActionCurrentTime();
}

/** @param {NS} ns */
export async function main(ns: DeepReadonly<NS>) {
    ns.disableLog("disableLog");
    ns.disableLog("sleep");
    ns.disableLog("bladeburner.switchCity");
    const SLEEP_MILLIS = 1e3;
    if (!haveBladeburnerApiAccess(ns)) return;
    ALL_ACTIONS.push(...ns.bladeburner.getGeneralActionNames().map(name => ["General", name] as [string, string]));
    ALL_ACTIONS.push(...ns.bladeburner.getContractNames().map(name => ["Contracts", name] as [string, string]));
    ALL_ACTIONS.push(...ns.bladeburner.getOperationNames().map(name => ["Operations", name] as [string, string]));
    ALL_ACTIONS.push(...ns.bladeburner.getBlackOpNames().map(name => ["BlackOps", name] as [string, string]));
    while (true) {
        await ns.sleep(Math.min(bladeburnerStep(ns), SLEEP_MILLIS));
    }
}