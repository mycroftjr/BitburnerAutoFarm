const ALL_ACTIONS = [];
/** @param {NS} ns */
export function haveBladeburnerApiAccess(ns) {
    let access = false;
    try {
        access = ns.bladeburner.joinBladeburnerDivision();
    }
    catch { }
    return access;
}
/** Assigns skill points and schedules new actions. Returns the time it will take to complete the current action.
 * @param {NS} ns */
export function bladeburnerStep(ns) {
    // The hard limit of the Overclock skill's level
    const OVERCLOCK_MAX_LEVEL = 90;
    // The softcap of the Datamancer skill's level
    const DATAMANCER_SOFT_CAP = 5; // TODO: apply math instead of guessing
    try {
        ns.bladeburner.joinBladeburnerFaction();
    }
    catch { }
    function getIntelEffectiveness(name) {
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
    const INTEL_ACTIONS = [
        ["General", "Field Analysis"],
        // ["Contracts", "Tracking"],  // uses flat numbers instead of percentages, basically pointless
        ["Operations", "Investigation"],
        ["Operations", "Undercover Operation"],
    ];
    // The times-x decrease in Chaos needed to switch cities after establishing population estimates
    const CHAOS_RATIO = 1.25;
    const city = () => ns.bladeburner.getCity();
    const chaos = () => ns.bladeburner.getCityChaos(city());
    const citiesByChaos = Object.values(ns.enums.CityName)
        .map(c => [ns.bladeburner.getCityChaos(c), c])
        .sort(([chaosA,], [chaosB,]) => chaosA - chaosB);
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
    function spamUpgrade(upgrade, maxLevel = Infinity) {
        while (ns.bladeburner.getSkillPoints() >= ns.bladeburner.getSkillUpgradeCost(upgrade)
            && ns.bladeburner.getSkillLevel(upgrade) + 1 <= maxLevel) {
            ns.bladeburner.upgradeSkill(upgrade);
        }
    }
    const intel = {
        // Whether the population estimate is completely accurate
        popAcc: true,
        // How we know the population estimate is inaccurate
        popInaccuracy: ["", "", 1, 1],
        // Whether all actions we can currently take are guaranteed successes
        allSuccess: true,
        // The first action we see that is not a guaranteed success
        potentialFailure: ["", "", 0, 1],
    };
    /** Returns the lower-end estimate of success chance for the given action.
     * @modifies {popAcc} */
    function getSuccessChance(type, name) {
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
    ALL_ACTIONS.filter(([type, name]) => name != "Recruitment" && (type != "Black Operations" || ns.bladeburner.getBlackOpRank(name) <= ns.bladeburner.getRank()))
        .reverse().map(([type, name]) => getSuccessChance(type, name));
    spamUpgrade("Overclock", OVERCLOCK_MAX_LEVEL);
    if (!intel.popAcc) {
        spamUpgrade("Datamancer", DATAMANCER_SOFT_CAP);
    }
    else if (!intel.allSuccess) {
        const [sType, sName, chance0,] = intel.potentialFailure;
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
    if (action && ns.bladeburner.getActionEstimatedSuccessChance(action.type, action.name)[0] != 1.0) {
        ns.print("Cancelling existing Bladeburner action due to increased danger!");
        ns.bladeburner.stopBladeburnerAction();
        action = ns.bladeburner.getCurrentAction();
        timeElapsed = 0;
    }
    if (!action) {
        // Find a bladeburner action to start
        const stam = ns.bladeburner.getStamina();
        // Low stam will harm success chances
        if (2 * stam[0] > stam[1]) {
            /** Sorts the given actions into the returned array
             * @param {[string, string][]} actions
             * @returns {[number, number, BladeburnerActionType, BladeburnerActionName][]} [score, time to complete action, type of action, name of action] */
            function sortActions(actions, gradeOnIntel = false) {
                const out = [];
                for (const [type, name] of actions) {
                    if (ns.bladeburner.getActionCountRemaining(type, name) <= 0) {
                        // ns.print(`Skipping ${type}: ${name} as no counts are remaining`);
                        continue;
                    }
                    if (type == "Black Operations") {
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
                    const time = ns.bladeburner.getActionTime(type, name);
                    const score = gradeOnIntel ? getIntelEffectiveness(name) : ns.bladeburner.getActionRepGain(type, name);
                    const scoreSpeed = score / time;
                    out.push([scoreSpeed, time, type, name]);
                }
                return out.sort(([speedA, timeA, typeA], [speedB, timeB, typeB]) => {
                    // BlackOps first
                    const typeDiff = (typeB == "Black Operations" ? 1 : 0) - (typeA == "Black Operations" ? 1 : 0);
                    if (typeDiff != 0)
                        return typeDiff;
                    // Bigger speeds first
                    const speedDiff = speedB - speedA;
                    if (speedDiff != 0)
                        return speedDiff;
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
    if (!action)
        return 0;
    return ns.bladeburner.getActionTime(action.type, action.name) - ns.bladeburner.getActionCurrentTime();
}
/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("disableLog");
    ns.disableLog("sleep");
    ns.disableLog("bladeburner.switchCity");
    const SLEEP_MILLIS = 1e3;
    if (!haveBladeburnerApiAccess(ns))
        return;
    ALL_ACTIONS.push(...ns.bladeburner.getGeneralActionNames().map(name => ["General", name]));
    ALL_ACTIONS.push(...ns.bladeburner.getContractNames().map(name => ["Contracts", name]));
    ALL_ACTIONS.push(...ns.bladeburner.getOperationNames().map(name => ["Operations", name]));
    ALL_ACTIONS.push(...ns.bladeburner.getBlackOpNames().map(name => ["Black Operations", name]));
    while (true) {
        await ns.sleep(Math.min(bladeburnerStep(ns), SLEEP_MILLIS));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmxhZGVidXJuZXIuanMiLCJzb3VyY2VSb290IjoiaHR0cDovL2xvY2FsaG9zdDo4MDAwL3NvdXJjZXMvIiwic291cmNlcyI6WyJibGFkZWJ1cm5lci9ibGFkZWJ1cm5lci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFLQSxNQUFNLFdBQVcsR0FBd0IsRUFBRSxDQUFDO0FBRTVDLHFCQUFxQjtBQUNyQixNQUFNLFVBQVUsd0JBQXdCLENBQUMsRUFBb0I7SUFDekQsSUFBSSxNQUFNLEdBQUcsS0FBSyxDQUFDO0lBQ25CLElBQUk7UUFDQSxNQUFNLEdBQUcsRUFBRSxDQUFDLFdBQVcsQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO0tBQ3JEO0lBQUMsTUFBTSxHQUFFO0lBQ1YsT0FBTyxNQUFNLENBQUM7QUFDbEIsQ0FBQztBQUVEO29CQUNvQjtBQUNuQixNQUFNLFVBQVUsZUFBZSxDQUFDLEVBQW9CO0lBQ2pELGdEQUFnRDtJQUNoRCxNQUFNLG1CQUFtQixHQUFHLEVBQUUsQ0FBQztJQUMvQiw4Q0FBOEM7SUFDOUMsTUFBTSxtQkFBbUIsR0FBRyxDQUFDLENBQUMsQ0FBRSx1Q0FBdUM7SUFFdkUsSUFBSTtRQUNBLEVBQUUsQ0FBQyxXQUFXLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztLQUMzQztJQUFDLE1BQU0sR0FBRTtJQUVWLFNBQVMscUJBQXFCLENBQUMsSUFBWTtRQUN2QyxxSEFBcUg7UUFDckgscUNBQXFDO1FBQ3JDLFFBQVEsSUFBSSxFQUFFO1lBQ1YsS0FBSyxnQkFBZ0IsQ0FBQyxDQUFDO2dCQUNuQixNQUFNLE1BQU0sR0FBRyxFQUFFLENBQUMsU0FBUyxFQUFFLENBQUM7Z0JBQzlCLElBQUksR0FBRyxHQUFHLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQztzQkFDL0MsSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUs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