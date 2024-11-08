import { parseConfig } from "configHelper";
import { lowestCombatStat } from "/sing/utils";
import { haveBladeburnerApiAccess } from "/bladeburner/bladeburner";
// Whether we are currently working for reputation
let working = false;
// Whether we are currently waiting for a city faction invite
let awaitingCityFactionInvite = false;
/** @param {NS} ns */
export async function main(ns) {
    // The location of the config file that the user should edit.
    const CONFIG_FILE = "/sing/activitiesConfig.txt";
    const DEFAULT_CONFIG = {
        // the minimum number of augments queued/available for purchase to consider going for the "have 40 augments queued" achievement
        MIN_AUGS_TO_CONSIDER_ACHIEVO: 30,
        FACTION_BLACKLIST: ["Netburners", "CyberSec"],
        // Whether to accept all faction invitations from factions you still need augments from. May cause problems with "enemy" factions.
        ACCEPT_ALL_INVITATIONS: false,
        /** A list of [Faction Name, Notable Augments] to join/get augments from, in the order they should be worked on.
         * @type {string[][]} */
        FACTION_PRIOS: [
            ["Daedalus", "The Red Pill"],
            ["Illuminati", "QLink"],
            ["Sector-12", "CashRoot Starter Kit"],
            ["Tian Di Hui", "Neuroreceptor Management Implant"],
            ["NiteSec", "Neural-Retention Enhancement", "CRTX42-AA Gene Modification"],
            ["BitRunners", "BitRunners Neurolink", "Neural Accelerator"],
            ["Aevum", "PCMatrix"],
            ["Chongqing", "Neuregen Gene Modification"],
            ["The Black Hand", "The Black Hand"],
            ["Bachman & Associates", "Smart Jaw", "ADR-V2 Pheromone Gene"],
            [
                "Fulcrum Secret Technologies",
                "PC Direct-Neural Interface NeuroNet Injector",
                "PC Direct-Neural Interface Optimization Submodule", // +10% hacking, +75% company rep
            ],
            ["Four Sigma", "PC Direct-Neural Interface", "Neurotrainer III"],
            ["Clarke Incorporated", "Neuronal Densification", "nextSENS Gene Modification"],
            ["NWO", "Xanipher", "Power Recirculation Core"],
            ["OmniTek Incorporated", "OmniTek InfoLoad"],
            ["The Covenant", "SPTN-97 Gene Modification"], // +15% hacking, +75% combat
            // BN ?: ["Church of the Machine God", "Stanek's Gift - Genesis"],
        ],
        // currently unused:
        /** @type {string[][]} */
        FACTION_PRIOS_CRIME: [
            ["Ishima", "INFRARET Enhancement"], // +10% dex, +10% crime$, +25% crime chance
        ],
        /** @type {string[][]} */
        FACTION_PRIOS_COMBAT: [
            ["The Covenant", "SPTN-97 Gene Modification"],
            ["Ishima", "INFRARET Enhancement"],
            ["New Tokyo", "NutriGen Implant"],
            ["Tetrads", "Bionic Arms", "HemoRecirculator"],
            ["The Dark Army", "Graphene Bionic Arms Upgrade", "Nanofiber Weave"],
            ["The Syndicate", "Bionic Legs", "Bionic Spine", "BrachiBlades", "NEMEAN Subdermal Weave"],
            ["Speakers for the Dead", "Graphene BrachiBlades Upgrade"],
            ["The Black Hand", "The Black Hand"],
            // TODO: add some hacking aug factions with security work before this? need like 3x the hacking level for the backdoor
            [
                "Fulcrum Secret Technologies",
                "Graphene Bionic Spine Upgrade",
                "Graphene Bionic Legs Upgrade",
                "Graphene Bone Lacings",
                "Synfibril Muscle",
                "Synfibril Heart",
                "PC Direct-Neural Interface NeuroNet Injector",
                "PC Direct-Neural Interface Optimization Submodule",
                "Graphene Bionic Spine Upgrade" // +60% combat
            ],
            ["Four Sigma", "PC Direct-Neural Interface", "Neurotrainer III"],
            // Volhaven companies
            ["OmniTek Incorporated", "OmniTek InfoLoad"],
            ["NWO", "Xanipher", "Power Recirculation Core"],
            ["Volhaven", "DermaForce Particle Barrier"],
            ["MegaCorp", "CordiARC Fusion Reactor"],
            ["Clarke Incorporated", "nextSENS Gene Modification", "FocusWire"],
            ["KuaiGong International", "Photosynthetic Cells", "HyperSight Corneal Implant"],
            ["Blade Industries", "Neotra"], // +55% str & def
        ],
    };
    /** END OF CONFIGURABLE VALUES */
    const config = parseConfig(ns, CONFIG_FILE, DEFAULT_CONFIG);
    // The maximum hacking level we should ever need
    let maxHackLevel = ns.args[0];
    // The current BN
    const bn = ns.args[1];
    const HOST = ns.getHostname();
    // the number of augments to be queued at once to get the achievement
    const MIN_AUGS_FOR_ACHIEVO = 40;
    const ACHIEVO_SLEEP_MS = 1000;
    const ACHIEVO_NAME = "It's time to install";
    // the lowest karma needed by any faction
    const LOWEST_KARMA = -90;
    // eslint-disable-next-line no-magic-numbers
    const BLADEBURNER_BNS = [6, 7];
    const bladeBurnerBn = BLADEBURNER_BNS.includes(bn);
    const combatBn = bladeBurnerBn || (bn == 2);
    const MIN_COMBAT_STAT = 300;
    const CHARISMA_TARG = 250;
    function goForAchievo() {
        return !eval("document.achievements").includes(ACHIEVO_NAME) && ns.corporation.hasCorporation();
    }
    /** @modifies {working} */
    function considerCrime() {
        if (eval("ns.heart.break()") <= LOWEST_KARMA && lowestCombatStat(ns) > MIN_COMBAT_STAT)
            return;
        if (!ns.scriptRunning("/sing/doCrime.js", HOST)) {
            ns.singularity.stopAction();
            ns.run("/sing/doCrime.js", 1, "homicide", LOWEST_KARMA, MIN_COMBAT_STAT);
        }
        working = true;
    }
    /** Augmentations offered by every faction */
    const COMMON_AUGS = ["NeuroFlux Governor"];
    const UNIS = new Map([
        ["Sector-12", "Rothman University"],
        ["Aevum", "Summit University"],
        ["Volhaven", "ZB Institute of Technology"],
    ]);
    /** A map of City faction name to [City needed, Money needed, Hacking level needed]
     * @type {Map<string, [string, number, number, string[]]} */
    const CITY_FACTIONS = new Map([
        /* eslint-disable no-magic-numbers */
        ["Sector-12", [ns.enums.CityName.Sector12, 15e6, 0, ["Chongqing", "Ishima", "New Tokyo", "Volhaven"]]],
        ["Aevum", [ns.enums.CityName.Aevum, 40e6, 0, ["Chongqing", "Ishima", "New Tokyo", "Volhaven"]]],
        ["Chongqing", [ns.enums.CityName.Chongqing, 20e6, 0, ["Sector-12", "Aevum", "Volhaven"]]],
        ["Ishima", [ns.enums.CityName.Ishima, 30e6, 0, ["Sector-12", "Aevum", "Volhaven"]]],
        ["New Tokyo", [ns.enums.CityName.NewTokyo, 20e6, 0, ["Sector-12", "Aevum", "Volhaven"]]],
        ["Volhaven", [ns.enums.CityName.Volhaven, 50e6, 0, ["Sector-12", "Aevum", "Chongqing", "Ishima", "New Tokyo"]]],
        ["Tian Di Hui", [ns.enums.CityName.Chongqing, 1e6, 50, []]],
        /* eslint-enable no-magic-numbers */
    ]);
    const AIRFARE = 200e3;
    const DEFAULT_COMPANY_REP_REQ = 400e3;
    const FULCRUM_COMPANY_REP_REQ = 400e3;
    const COMPANY_BASE_HACKING_LEVEL = 225;
    /** Map of Company Faction Name to [City, Company Name, Company Reputation Required, Hacking Level for Entry-Level Job]
     * @type {Map<string, [string, string, number, number]>} */
    // Note: the Company city names are currently unused
    const COMPANY_LOOKUP = new Map([
        ["ECorp", ["Aevum", ns.enums.CompanyName.ECorp, DEFAULT_COMPANY_REP_REQ, COMPANY_BASE_HACKING_LEVEL]],
        ["MegaCorp", ["Sector-12", ns.enums.CompanyName.MegaCorp, DEFAULT_COMPANY_REP_REQ, COMPANY_BASE_HACKING_LEVEL]],
        ["KuaiGong International", ["Chongqing", ns.enums.CompanyName.KuaiGongInternational, DEFAULT_COMPANY_REP_REQ, COMPANY_BASE_HACKING_LEVEL]],
        ["Four Sigma", ["Sector-12", ns.enums.CompanyName.FourSigma, DEFAULT_COMPANY_REP_REQ, COMPANY_BASE_HACKING_LEVEL]],
        ["NWO", ["Volhaven", ns.enums.CompanyName.NWO, DEFAULT_COMPANY_REP_REQ, COMPANY_BASE_HACKING_LEVEL]],
        ["Blade Industries", ["Sector-12", ns.enums.CompanyName.BladeIndustries, DEFAULT_COMPANY_REP_REQ, COMPANY_BASE_HACKING_LEVEL]],
        ["OmniTek Incorporated", ["Volhaven", ns.enums.CompanyName.OmniTekIncorporated, DEFAULT_COMPANY_REP_REQ, COMPANY_BASE_HACKING_LEVEL]],
        ["Bachman & Associates", ["Aevum", ns.enums.CompanyName.BachmanAndAssociates, DEFAULT_COMPANY_REP_REQ, COMPANY_BASE_HACKING_LEVEL]],
        ["Clarke Incorporated", ["Aevum", ns.enums.CompanyName.ClarkeIncorporated, DEFAULT_COMPANY_REP_REQ, COMPANY_BASE_HACKING_LEVEL]],
        ["Fulcrum Secret Technologies", ["Aevum", ns.enums.CompanyName.FulcrumTechnologies, FULCRUM_COMPANY_REP_REQ, COMPANY_BASE_HACKING_LEVEL]],
    ]);
    const HACKING_JOB_PRIOS = ["Software", "Software Consultant", "IT", "Security Engineer", "Network Engineer", "Business", "Business Consultant", "Security", "Agent", "Employee"];
    const COMBAT_JOB_PRIOS = ["Agent", "Security", "Business", "Business Consultant", "Software", "Software Consultant", "IT", "Security Engineer", "Network Engineer", "Employee"];
    // Factions that you cannot work for (at least in the usual way)
    const NO_WORK_FACTIONS = ["Shadows of Anarchy", "Bladeburners"];
    // do we have the aug to perform bladeburner actions alongside normal ones?
    const haveBladeburnerAug = ns.singularity.getOwnedAugmentations(false).includes("");
    function assert(cond, ...msg) {
        if (!cond) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            ns.tprint(...msg);
        }
    }
    /**
     * @param {string} company
     * @param {number} untilRep the reputation to keep working until reached
    */
    function tryWorkForCompany(company, untilRep = Infinity) {
        const jobPrios = combatBn ? COMBAT_JOB_PRIOS : HACKING_JOB_PRIOS;
        for (const job of jobPrios) {
            if (ns.singularity.applyToCompany(company, job)) {
                ns.scriptKill("/sing/workForFaction.js", HOST);
                ns.scriptKill("/sing/doCrime.js", HOST);
                if (!haveBladeburnerAug)
                    ns.scriptKill("/bladeburner/bladeburner.js", HOST);
                if (ns.getScriptRam("/sing/workForCompany.js") > ns.getServerMaxRam(HOST) - ns.getServerUsedRam(HOST)) {
                    ns.scriptKill("share.js", HOST);
                }
                ns.scriptKill("share.js", HOST);
                if (ns.run("/sing/workForCompany.js", 1, company, job, untilRep)) {
                    if (untilRep != Infinity)
                        ns.tprint(`Working for company ${company} (${ns.formatNumber(untilRep, 0)} rep needed)`);
                }
                else {
                    ns.tprint(`Failed to start working for company ${company}! Is there enough free RAM?`);
                }
                return true;
            }
        }
        return false;
    }
    const forceInstall = ns.args.length ? ns.args[0] == "FORCE_INSTALL" : false;
    if (forceInstall)
        ns.tail();
    const myAugs = ns.singularity.getOwnedAugmentations(true);
    function getUnownedAugs(faction) {
        return ns.singularity.getAugmentationsFromFaction(faction).filter((aug) => COMMON_AUGS.includes(aug) || !myAugs.includes(aug));
    }
    let city = ns.getPlayer().city;
    /** A map of Faction Name to (Number of Augmentations we need from it); only meant for debugging or viewing via the written file
     * @type {Map<string, number>} */
    let factionData;
    if (ns.fileExists("/sing/factionData.txt")) {
        factionData = new Map(JSON.parse(ns.read("/sing/factionData.txt")));
    }
    else {
        factionData = new Map();
    }
    /** A map of Augmentation Name to {Price in $, Faction offering it}
     * @type {Map<string, {price: number, faction: string}>} */
    const augsToBuyMap = new Map();
    // have to do this before main faction loop to prevent prio/prereq deadlock
    for (const faction of ns.getPlayer().factions) {
        const augs = getUnownedAugs(faction);
        for (const aug of augs) {
            const repNeeded = ns.singularity.getAugmentationRepReq(aug);
            const price = ns.singularity.getAugmentationPrice(aug);
            if ((augsToBuyMap.get(aug)?.price ?? Infinity) > price && ns.singularity.getFactionRep(faction) >= repNeeded) {
                augsToBuyMap.set(aug, { price, faction });
            }
        }
    }
    /** Says whether we have (or can currently buy) all prerequisites for this augmentation
     * @param {string} aug */
    function haveOrCanBuyPrereqs(aug) {
        const prereqs = ns.singularity.getAugmentationPrereq(aug);
        return !prereqs.find((prereq) => !myAugs.includes(prereq) && !augsToBuyMap.has(prereq));
    }
    /** Examine the faction for any augs we might want.
     * @param {string} faction
     * @modifies {working}
     * @modifies {awaitingCityFactionInvite}
     * @returns whether or not more work can be done for the faction in the current life
     */
    async function considerFaction(faction) {
        if (config.FACTION_BLACKLIST.includes(faction))
            return false;
        if (NO_WORK_FACTIONS.includes(faction))
            return false;
        const augs = getUnownedAugs(faction);
        factionData.set(faction, augs.length - COMMON_AUGS.length);
        if (augs.length <= COMMON_AUGS.length) {
            ns.print("Have all augs from ", faction, "?");
            return false;
        }
        if (ns.singularity.checkFactionInvitations().includes(faction)) {
            ns.singularity.joinFaction(faction);
        }
        if (!ns.getPlayer().factions.includes(faction)) {
            if (COMPANY_LOOKUP.has(faction)) {
                // The next important faction is a company faction we're not in. Work the company.
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const [, company, repNeeded, hackingLevelNeeded] = COMPANY_LOOKUP.get(faction);
                maxHackLevel = Math.max(maxHackLevel, hackingLevelNeeded);
                if (!working && ns.getPlayer().skills.hacking >= hackingLevelNeeded && ns.singularity.getCompanyRep(company) < repNeeded) {
                    // can't use ns.isRunning() as job can't always be predicted
                    if (ns.scriptRunning("/sing/workForCompany.js", HOST)) {
                        ns.scriptKill("/sing/workForFaction.js", HOST);
                        ns.scriptKill("/sing/doCrime.js", HOST);
                        if (!haveBladeburnerAug)
                            ns.scriptKill("/bladeburner/bladeburner.js", HOST);
                        working = true;
                    }
                    else { // run it
                        ns.singularity.quitJob(company);
                        working = tryWorkForCompany(company, repNeeded);
                    }
                    if (working)
                        return true;
                    else {
                        ns.tail();
                        ns.print("Failed to work for ", company, "?!");
                    }
                }
                // TODO: stop the workForCompany work early if faction inv comes in (i.e. backdoor reduced rep requirement)
            }
            else if (CITY_FACTIONS.has(faction) && !awaitingCityFactionInvite) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const [neededCity, neededMoney, neededHackingLevel, enemies] = CITY_FACTIONS.get(faction);
                maxHackLevel = Math.max(maxHackLevel, neededHackingLevel);
                if (enemies.filter((enemy) => ns.getPlayer().factions.includes(enemy)).length)
                    return false;
                if (ns.getPlayer().money >= neededMoney + AIRFARE && ns.getPlayer().skills.hacking >= neededHackingLevel) {
                    if (neededCity === city || ns.singularity.travelToCity(neededCity)) {
                        city = neededCity;
                        awaitingCityFactionInvite = true;
                    }
                }
            }
        }
        if (working || !ns.getPlayer().factions.includes(faction)) {
            ns.print(faction, " - ", working ? "working" : "not in faction yet");
            return true;
        }
        ns.print(faction);
        // TODO: for The Cave augment, if can donate for rep, do so; else, softReset when we would have enough favor to donate to the faction
        for (const aug of augs) {
            if (COMMON_AUGS.includes(aug))
                continue;
            const repNeeded = ns.singularity.getAugmentationRepReq(aug);
            const repToGain = () => repNeeded - ns.singularity.getFactionRep(faction);
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            if (working || repToGain() < 0)
                continue;
            ns.scriptKill("share.js", HOST);
            if (ns.corporation.hasCorporation()) {
                ns.print("Attempting to bribe faction ", faction);
                // Try to use corp funds to get the faction rep high enough
                ns.run("/sing/bribeWithCorpFunds.js", 1, faction, repToGain());
                await ns.sleep(1 ^ 2);
            }
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            if (!working && repToGain() > 0) {
                if (ns.isRunning("/sing/workForFaction.js", HOST, faction, repNeeded, combatBn, CHARISMA_TARG)) {
                    working = true;
                }
                else { // run it
                    // don't work towards augs we can't get the prereqs for yet
                    if (!haveOrCanBuyPrereqs(aug))
                        continue;
                    ns.scriptKill("/sing/workForFaction.js", HOST);
                    ns.scriptKill("/sing/doCrime.js", HOST);
                    if (!haveBladeburnerAug)
                        ns.scriptKill("/bladeburner/bladeburner.js", HOST);
                    if (ns.run("/sing/workForFaction.js", 1, faction, repNeeded, combatBn, CHARISMA_TARG)) {
                        ns.tprint(`Working towards aug ${aug} from ${faction} (${ns.formatNumber(repNeeded, 0)} rep needed)`);
                        working = true;
                    }
                    else {
                        ns.tprint(`Failed to start working for faction ${faction}! Is there enough free RAM?`);
                    }
                }
                if (working)
                    break;
            }
        }
        return working;
    }
    eval("working = false");
    eval("awaitingCityFactionInvite = false");
    const factionsConsidered = new Set();
    const factionPrios = combatBn ? config.FACTION_PRIOS_COMBAT : config.FACTION_PRIOS;
    const factionUnprios = combatBn ? config.FACTION_PRIOS : config.FACTION_PRIOS_COMBAT;
    for (const [faction,] of factionPrios) {
        if (working)
            break;
        factionsConsidered.add(faction);
        await considerFaction(faction);
    }
    if (!working && combatBn)
        considerCrime();
    // TODO: do bladeburner stuff
    if (haveBladeburnerApiAccess(ns)) {
        if (!working || haveBladeburnerAug) {
            if (!working)
                ns.singularity.stopAction();
            ns.run("/bladeburner/bladeburner.js");
            if (!working && !haveBladeburnerAug)
                working = true;
        }
    }
    for (const faction of ns.getPlayer().factions) {
        if (working)
            break;
        if (!factionsConsidered.has(faction)) {
            factionsConsidered.add(faction);
            await considerFaction(faction);
        }
    }
    if (!working) {
        ns.scriptKill("/sing/workForCompany.js", HOST);
        ns.scriptKill("/sing/workForFaction.js", HOST);
        ns.scriptKill("/sing/doCrime.js", HOST);
        if (!haveBladeburnerAug)
            ns.scriptKill("/bladeburner/bladeburner.js", HOST);
    }
    if (config.ACCEPT_ALL_INVITATIONS || (augsToBuyMap.size < MIN_AUGS_FOR_ACHIEVO && augsToBuyMap.size > config.MIN_AUGS_TO_CONSIDER_ACHIEVO)) {
        for (const faction of ns.singularity.checkFactionInvitations()) {
            if (config.FACTION_BLACKLIST.includes(faction))
                continue;
            const numAugsNeeded = getUnownedAugs(faction).length - COMMON_AUGS.length;
            if (numAugsNeeded > 0) {
                ns.singularity.joinFaction(faction);
            }
            else {
                ns.print("Have all augs from ", faction, "?");
            }
            factionData.set(faction, numAugsNeeded);
        }
    }
    ns.write("/sing/factionData.txt", JSON.stringify(Array.from(factionData.entries())), "w");
    if (forceInstall || augsToBuyMap.size && (!working || (goForAchievo() && augsToBuyMap.size > MIN_AUGS_FOR_ACHIEVO))) {
        // TODO: attempt this less often than the other activities
        // If we aren't working towards any augmentations and have augs to buy/install, let's do so now
        for (const faction of ns.getPlayer().factions) {
            function cantGetAugment(aug) {
                return !haveOrCanBuyPrereqs(aug) && ns.singularity.getFactionRep(faction) < ns.singularity.getAugmentationRepReq(aug);
            }
            const augs = getUnownedAugs(faction);
            if (NO_WORK_FACTIONS.includes(faction)) {
                assert(augs.find(cantGetAugment), `Found aug(s) under faction ${faction} that we don't have the reputation for, but aren't working towards!`);
            }
            else {
                for (const aug of augs) {
                    assert(!cantGetAugment(aug), `Found aug ${aug} under faction ${faction} that we don't have the reputation for, but aren't working towards!`);
                    const price = ns.singularity.getAugmentationPrice(aug);
                    if ((augsToBuyMap.get(aug)?.price ?? Infinity) > price) {
                        augsToBuyMap.set(aug, { price, faction });
                    }
                }
            }
        }
        /** A sortable list of [Augmentation Price in $, Augmentation, Faction offering it]
         * @type {[number, string, string][]} */
        const augsToBuy = [];
        for (const [aug, info] of augsToBuyMap) {
            if (COMMON_AUGS.includes(aug))
                continue;
            augsToBuy.push([info.price, aug, info.faction]);
        }
        /** sort the list from cheapest to most expensive
         * @param {[number, ...T[]][]} arr
         * @modifies {arr}
         * @template T */
        // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
        const sortAsc = (arr) => arr.sort((a, b) => a[0] - b[0]);
        sortAsc(augsToBuy);
        const preOwnedAugs = ns.singularity.getOwnedAugmentations(false);
        const boughtAugs = myAugs.length - preOwnedAugs.length;
        const augsAvailableToQueue = boughtAugs + Math.max(augsToBuyMap.size, augsToBuy.length);
        ns.print("augsToBuy: ", augsToBuy);
        ns.print(`(length: ${augsToBuy.length} elements)`);
        if (augsToBuy.length)
            ns.tail();
        if (forceInstall || (boughtAugs > 0 || (augsToBuy.length && augsToBuy[augsToBuy.length - 1][0] <= ns.getPlayer().money)
            && (!goForAchievo() || augsAvailableToQueue < config.MIN_AUGS_TO_CONSIDER_ACHIEVO || augsAvailableToQueue >= MIN_AUGS_FOR_ACHIEVO))) {
            // Liquidate (sell) all stocks
            ns.scriptKill("stockBot.js", HOST);
            if (ns.stock.hasTIXAPIAccess()) {
                for (const sym of ns.stock.getSymbols()) {
                    ns.stock.sellStock(sym, Infinity);
                    try {
                        ns.stock.sellShort(sym, Infinity);
                    }
                    catch { }
                }
            }
            /** @type {Set<string>} */
            const bought = new Set(myAugs);
            /** @param {string} faction
             * @param {string} aug */
            function buyAug(faction, aug) {
                const success = ns.singularity.purchaseAugmentation(faction, aug);
                if (success) {
                    bought.add(aug);
                    myAugs.push(aug);
                }
                return success;
            }
            while (augsToBuy.length) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const [, aug, faction] = augsToBuy.pop();
                if (bought.has(aug))
                    continue;
                const preReqs = ns.singularity.getAugmentationPrereq(aug);
                while (preReqs.length) {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    const preReq = preReqs.pop(); // lowest first
                    if (bought.has(preReq))
                        continue;
                    const preReqFaction = augsToBuyMap.get(preReq)?.faction;
                    if (!preReqFaction || !buyAug(preReqFaction, preReq))
                        break;
                }
                buyAug(faction, aug);
            }
            // with our remaining money, buy as many lvls of COMMON_AUGS as possible
            for (const aug of COMMON_AUGS) {
                const info = augsToBuyMap.get(aug);
                if (!info)
                    continue;
                augsToBuy.push([info.price, aug, info.faction]);
            }
            while (augsToBuy.length && (augsToBuy.at(-1)?.[0] ?? Infinity) < ns.getPlayer().money) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const [price, aug, faction] = augsToBuy.pop();
                if (ns.singularity.purchaseAugmentation(faction, aug)) {
                    const newPrice = ns.singularity.getAugmentationPrice(aug);
                    if (newPrice === price) {
                        throw new Error(`Price of ${aug} did not change! Was ${price}, now ${newPrice}!`);
                    }
                    augsToBuy.push([newPrice, aug, faction]);
                    sortAsc(augsToBuy);
                }
            }
            for (const faction of ns.getPlayer().factions) {
                factionData.set(faction, getUnownedAugs(faction).length - COMMON_AUGS.length);
            }
            ns.write("/sing/factionData.txt", JSON.stringify(Array.from(factionData.entries())), "w");
            if (forceInstall || augsAvailableToQueue < config.MIN_AUGS_TO_CONSIDER_ACHIEVO
                || !goForAchievo() || (bought.size - preOwnedAugs.length >= MIN_AUGS_FOR_ACHIEVO)) {
                while (bought.size - preOwnedAugs.length >= MIN_AUGS_FOR_ACHIEVO && !eval("documents.achievements").includes(ACHIEVO_NAME)) {
                    ns.print("Waiting for 'queue 40 augments' achievement");
                    await ns.sleep(ACHIEVO_SLEEP_MS);
                }
                ns.singularity.installAugmentations("/sing/sing.js");
            }
            else {
                // TODO: don't spam this
                ns.toast(`Waiting on ${MIN_AUGS_FOR_ACHIEVO - (bought.size - preOwnedAugs.length)} more augments (for achievo) before installing!`, "warning", null);
            }
        }
        else if (augsToBuy.length && augsToBuy[augsToBuy.length - 1][0] > ns.getPlayer().money) {
            ns.print("Cannot afford most expensive purchasable augment yet!");
        }
    }
    for (const [faction,] of factionUnprios) {
        if (working)
            break;
        factionsConsidered.add(faction);
        await considerFaction(faction);
    }
    if (!working) {
        if (ns.getPlayer().skills.hacking >= maxHackLevel && !ns.singularity.isBusy()) {
            // Use actions to make money
            let maxCompanyRep = -Infinity;
            let maxRepCompany = null;
            const companies = new Set();
            for (const [, [, company, ,]] of COMPANY_LOOKUP) {
                companies.add(company);
            }
            // A map of company name to position held in the company
            const jobs = ns.getPlayer().jobs;
            for (const [company,] of Object.entries(jobs)) {
                companies.add(company);
            }
            for (const company of companies) {
                const rep = ns.singularity.getCompanyRep(company);
                if (rep > maxCompanyRep) {
                    maxCompanyRep = rep;
                    maxRepCompany = company;
                }
            }
            // Work for the company we have the most reputation with
            if (maxRepCompany) {
                tryWorkForCompany(maxRepCompany);
                return;
            }
            /*
            for (const [, [, company, , reqHackingLevel]] of COMPANY_LOOKUP) {
                maxHackLevel = Math.max(maxHackLevel, reqHackingLevel);
                if (company in jobs) continue;
                ns.singularity.quitJob(company);
                if (ns.getPlayer().hacking > reqHackingLevel && tryWorkForCompany(company))
                    ns.scriptKill("/sing/workForCompany.js", HOST);
            }
            // TODO: Find the most profitable job? Would need income/salary numbers...
            */
        }
        if (ns.getPlayer().skills.hacking < maxHackLevel) {
            const newCity = UNIS.has(city) ? city : Array.from(UNIS.keys())[0];
            if (newCity === city || (!awaitingCityFactionInvite && ns.singularity.travelToCity(newCity))) {
                const uni = UNIS.get(city);
                if (uni) {
                    ns.print(`attempting to study at ${uni}`);
                    const focus = ns.singularity.isBusy() && ns.singularity.isFocused();
                    ns.singularity.universityCourse(uni, "Computer Science", focus);
                    return;
                }
                else {
                    ns.tail();
                    ns.print("Failed to find university in city ", newCity);
                }
            }
        }
        considerCrime();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWN0aXZpdGllcy5qcyIsInNvdXJjZVJvb3QiOiJodHRwOi8vbG9jYWxob3N0OjgwMDAvc291cmNlcy8iLCJzb3VyY2VzIjpbInNpbmcvYWN0aXZpdGllcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFFQSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sY0FBYyxDQUFDO0FBQzNDLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUMvQyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUVwRSxrREFBa0Q7QUFDbEQsSUFBSSxPQUFPLEdBQUcsS0FBSyxDQUFDO0FBQ3BCLDZEQUE2RDtBQUM3RCxJQUFJLHlCQUF5QixHQUFHLEtBQUssQ0FBQztBQUV0QyxxQkFBcUI7QUFDckIsTUFBTSxDQUFDLEtBQUssVUFBVSxJQUFJLENBQUMsRUFBb0I7SUFDM0MsNkRBQTZEO0lBQzdELE1BQU0sV0FBVyxHQUFHLDRCQUE0QixDQUFDO0lBQ2pELE1BQU0sY0FBYyxHQUFHO1FBQ25CLCtIQUErSDtRQUMvSCw0QkFBNEIsRUFBRSxFQUFFO1FBQ2hDLGlCQUFpQixFQUFFLENBQUMsWUFBWSxFQUFFLFVBQVUsQ0FBQztRQUM3QyxrSUFBa0k7UUFDbEksc0JBQXNCLEVBQUUsS0FBSztRQUM3QjtnQ0FDd0I7UUFDeEIsYUFBYSxFQUFFO1lBQ1gsQ0FBQyxVQUFVLEVBQUUsY0FBYyxDQUFDO1lBQzVCLENBQUMsWUFBWSxFQUFFLE9BQU8sQ0FBQztZQUN2QixDQUFDLFdBQVcsRUFBRSxzQkFBc0IsQ0FBQztZQUNyQyxDQUFDLGFBQWEsRUFBRSxrQ0FBa0MsQ0FBQztZQUNuRCxDQUFDLFNBQVMsRUFBRSw4QkFBOEIsRUFBRSw2QkFBNkIsQ0FBQztZQUMxRSxDQUFDLFlBQVksRUFBRSxzQkFBc0IsRUFBRSxvQkFBb0IsQ0FBQztZQUM1RCxDQUFDLE9BQU8sRUFBRSxVQUFVLENBQUM7WUFDckIsQ0FBQyxXQUFXLEVBQUUsNEJBQTRCLENB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