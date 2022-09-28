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
                "PC Direct-Neural Interface Optimization Submodule",  // +10% hacking, +75% company rep
            ],
            ["Four Sigma", "PC Direct-Neural Interface", "Neurotrainer III"],
            ["Clarke Incorporated", "Neuronal Densification", "nextSENS Gene Modification"],
            ["NWO", "Xanipher", "Power Recirculation Core"],
            ["OmniTek Incorporated", "OmniTek InfoLoad"],
            ["The Covenant", "SPTN-97 Gene Modification"],  // +15% hacking, +75% combat
            // BN ?: ["Church of the Machine God", "Stanek's Gift - Genesis"],
        ],
        // currently unused:
        /** @type {string[][]} */
        FACTION_PRIOS_CRIME: [
            ["Ishima", "INFRARET Enhancement"],  // +10% dex, +10% crime$, +25% crime chance
        ],
        /** @type {string[][]} */
        FACTION_PRIOS_COMBAT: [
            ["The Covenant", "SPTN-97 Gene Modification"],
            ["Sector-12", "CashRoot Starter Kit"],
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
                "Graphene Bionic Spine Upgrade"  // +60% combat
            ],
            ["Four Sigma", "PC Direct-Neural Interface", "Neurotrainer III"],
            // Volhaven companies
            ["OmniTek Incorporated", "OmniTek InfoLoad"],
            ["NWO", "Xanipher", "Power Recirculation Core"],
            ["Volhaven", "DermaForce Particle Barrier"],
            
            ["MegaCorp", "CordiARC Fusion Reactor"],
            ["Clarke Incorporated", "nextSENS Gene Modification", "FocusWire"],
            ["KuaiGong International", "Photosynthetic Cells", "HyperSight Corneal Implant"],
            ["Blade Industries", "Neotra"],
            ["Ishima", "INFRARET Enhancement"],  // +10% dex, +10% crime$, +25% crime chance
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
    const combatBn = bladeBurnerBn;
    const MIN_COMBAT_STAT = 300;
    const CHARISMA_TARG = 250;
    
    function goForAchievo() {
        return !eval("document.achievements").includes(ACHIEVO_NAME) && ns.getPlayer().hasCorporation;
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
        ["Sector-12", ["Sector-12", 15e6, 0, ["Chongqing", "Ishima", "New Tokyo", "Volhaven"]]],
        ["Aevum", ["Aevum", 40e6, 0, ["Chongqing", "Ishima", "New Tokyo", "Volhaven"]]],
        ["Chongqing", ["Chongqing", 20e6, 0, ["Sector-12", "Aevum", "Volhaven"]]],
        ["Ishima", ["Ishima", 30e6, 0, ["Sector-12", "Aevum", "Volhaven"]]],
        ["New Tokyo", ["New Tokyo", 20e6, 0, ["Sector-12", "Aevum", "Volhaven"]]],
        ["Volhaven", ["Volhaven", 50e6, 0, ["Sector-12", "Aevum", "Chongqing", "Ishima", "New Tokyo"]]],
        ["Tian Di Hui", ["Chongqing", 1e6, 50, []]],
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
        ["ECorp", ["Aevum", "ECorp", DEFAULT_COMPANY_REP_REQ, COMPANY_BASE_HACKING_LEVEL]],
        ["MegaCorp", ["Sector-12", "MegaCorp", DEFAULT_COMPANY_REP_REQ, COMPANY_BASE_HACKING_LEVEL]],
        ["KuaiGong International", ["Chongqing", "KuaiGong International", DEFAULT_COMPANY_REP_REQ, COMPANY_BASE_HACKING_LEVEL]],
        ["Four Sigma", ["Sector-12", "Four Sigma", DEFAULT_COMPANY_REP_REQ, COMPANY_BASE_HACKING_LEVEL]],
        ["NWO", ["Volhaven", "NWO", DEFAULT_COMPANY_REP_REQ, COMPANY_BASE_HACKING_LEVEL]],
        ["Blade Industries", ["Sector-12", "Blade Industries", DEFAULT_COMPANY_REP_REQ, COMPANY_BASE_HACKING_LEVEL]],
        ["OmniTek Incorporated", ["Volhaven", "OmniTek Incorporated", DEFAULT_COMPANY_REP_REQ, COMPANY_BASE_HACKING_LEVEL]],
        ["Bachman & Associates", ["Aevum", "Bachman & Associates", DEFAULT_COMPANY_REP_REQ, COMPANY_BASE_HACKING_LEVEL]],
        ["Clarke Incorporated", ["Aevum", "Clarke Incorporated", DEFAULT_COMPANY_REP_REQ, COMPANY_BASE_HACKING_LEVEL]],
        ["Fulcrum Secret Technologies", ["Aevum", "Fulcrum Technologies", FULCRUM_COMPANY_REP_REQ, COMPANY_BASE_HACKING_LEVEL]],
    ]);
    const HACKING_JOB_PRIOS = ["software", "software consultant", "it", "security engineer", "network engineer", "business", "business consultant", "security", "agent", "employee"];
    const COMBAT_JOB_PRIOS = ["agent", "security", "business", "business consultant", "software", "software consultant", "it", "security engineer", "network engineer", "employee"];
    
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
                        ns.tprint(`Working for company ${company} (${ns.nFormat(untilRep, "0a")} rep needed)`);
                } else {
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
    } else {
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
                    } else {  // run it
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
            } else if (CITY_FACTIONS.has(faction) && !awaitingCityFactionInvite) {
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
            
            if (ns.getPlayer().hasCorporation) {
                ns.print("Attempting to bribe faction ", faction);
                // Try to use corp funds to get the faction rep high enough
                ns.run("/sing/bribeWithCorpFunds.js", 1, faction, repToGain());
                await ns.sleep(1 ^ 2);
            }
            
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            if (!working && repToGain() > 0) {
                if (ns.isRunning("/sing/workForFaction.js", HOST, faction, repNeeded, combatBn, CHARISMA_TARG)) {
                    working = true;
                } else {  // run it
                    // don't work towards augs we can't get the prereqs for yet
                    if (!haveOrCanBuyPrereqs(aug))
                        continue;
                    
                    ns.scriptKill("/sing/workForFaction.js", HOST);
                    ns.scriptKill("/sing/doCrime.js", HOST);
                    if (!haveBladeburnerAug)
                        ns.scriptKill("/bladeburner/bladeburner.js", HOST);
                    if (ns.run("/sing/workForFaction.js", 1, faction, repNeeded, combatBn, CHARISMA_TARG)) {
                        ns.tprint(`Working towards aug ${aug} from ${faction} (${ns.nFormat(repNeeded, "0a")} rep needed)`);
                        working = true;
                    } else {
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
            } else {
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
            } else {
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
                    const preReq = preReqs.pop();  // lowest first
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
            } else {
                // TODO: don't spam this
                ns.toast(`Waiting on ${MIN_AUGS_FOR_ACHIEVO - (bought.size - preOwnedAugs.length)} more augments (for achievo) before installing!`, "warning", null);
            }
        } else if (augsToBuy.length && augsToBuy[augsToBuy.length - 1][0] > ns.getPlayer().money) {
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
                    ns.singularity.universityCourse(uni, "Study Computer Science", focus);
                    return;
                } else {
                    ns.tail();
                    ns.print("Failed to find university in city ", newCity);
                }
            }
        }
        considerCrime();
    }
}
