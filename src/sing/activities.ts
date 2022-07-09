import type { NS } from "@ns";
import type { DeepReadonly } from "ts-essentials";
import { parseConfig } from "configHelper";

/** @param {NS} ns */
export async function main(ns: DeepReadonly<NS>): Promise<void> {
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
            ["Illuminati", "QLink"],  // +75% hacking, +100% all speeds, +150% hacking chance, +300% hacking power
            ["Sector-12", "CashRoot Starter Kit"],  // start with $1m and BruteSSH
            ["Tian Di Hui", "Neuroreceptor Management Implant"],  // removes penalty for not focusing
            ["NiteSec", "Neural-Retention Enhancement", "CRTX42-AA Gene Modification"],  // +25% hacking EXP; +8% hacking & +15% hacking EXP
            ["BitRunners", "BitRunners Neurolink", "Neural Accelerator"],  // start with FTPCrack and relaySMTP; +10% hacking & +15% hacking EXP
            ["Aevum", "PCMatrix"],  // start with AutoLink and DeepscanV1
            ["Chongqing", "Neuregen Gene Modification"],  // +40% hacking EXP
            ["The Black Hand", "The Black Hand"],  // +10% hacking, +2% all speed, +10% hacking power, +15% str & dex
            ["Bachman & Associates", "Smart Jaw", "ADR-V2 Pheromone Gene"],  // +25% all rep; +20% all rep
            [
                "Fulcrum Secret Technologies",
                "PC Direct-Neural Interface NeuroNet Injector",  // +10% hacking, +5% all speeds, +100% company rep
                "PC Direct-Neural Interface Optimization Submodule",  // +10% hacking, +75% company rep
                "Graphene Bionic Spine Upgrade"  // +60% combat
            ],
            ["Four Sigma", "PC Direct-Neural Interface", "Neurotrainer III"],  // +30% comp rep; +20% all EXP
            ["Clarke Incorporated", "Neuronal Densification", "nextSENS Gene Modification"],  // +15% hacking, +10% hacking EXP, +3% hacking speed; +20% all skills
            ["NWO", "Xanipher", "Power Recirculation Core"],  // +20% all skills, +15% all EXP; +5% all skills, +10% all EXP
            ["OmniTek Incorporated", "OmniTek InfoLoad"],  // +20% hacking, +25% hacking EXP; Bionic Legs & Spine prereqs for Fulcrum augs
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
            ["The Covenant", "SPTN-97 Gene Modification"],  // +15% hacking, +75% combat
            ["MegaCorp", "CordiARC Fusion Reactor"],  // +35% combat & combat EXP
            ["New Tokyo", "NutriGen Implant"],  // +20% combat EXP
            ["Volhaven", "DermaForce Particle Barrier"],  // +40% defense
        ],
    };
    /** END OF CONFIGURABLE VALUES */
    const config = await parseConfig(ns, CONFIG_FILE, DEFAULT_CONFIG);

    // The maximum hacking level we should ever need
    let maxHackLevel = ns.args[0] as number;
    // The current BN
    const bn = ns.args[1] as number;
    const HOST = ns.getHostname();

    // the number of augments to be queued at once to get the achievement
    const MIN_AUGS_FOR_ACHIEVO = 40;
    // The optimal BN to go for said achievement in
    const CHEAP_BN = 2;

    /** Augmentations offered by every faction */
    const COMMON_AUGS = ["NeuroFlux Governor"];
    const UNIS = new Map([
        ["Sector-12", "Rothman University"],
        ["Aevum", "Summit University"],
        ["Volhaven", "ZB Institute of Technology"],
    ]);
    /** A map of City faction name to [City needed, Money needed, Hacking level needed]
     * @type {Map<string, [string, number, number, string[]]} */
    const CITY_FACTIONS = new Map<string, [string, number, number, string[]]>([
        /* eslint-disable no-magic-numbers */
        ["Sector-12", ["Sector-12", 15e6, 0, ["Chongqing", "Ishima", "New Tokyo", "Volhaven"]]],
        ["Aevum", ["Aevum", 40e6, 0, ["Chongqing", "Ishima", "New Tokyo", "Volhaven"]]],
        ["Chongqing", ["Chongqing", 20e6, 0, ["Sector-12", "Aevum", "Volhaven"]]],
        ["Ishima", ["Ishima", 30e6, 0, ["Sector-12", "Aevum", "Volhaven"]]],
        ["New Tokyo", ["New Tokyo", 20e6, 0, ["Sector-12", "Aevum", "Volhaven"]]],
        ["Volhaven", ["Volhaven", 50e6, 0, ["Sector-12", "Aevum", "Chongqing", "Ishima", "New Tokyo"]]],
        ["Tian Di Hui", ["Chongqing", 100e3, 50, []]],
        /* eslint-enable no-magic-numbers */
    ]);
    const AIRFARE = 200e3;
    const DEFAULT_COMPANY_REP_REQ = 200e3;
    const FULCRUM_COMPANY_REP_REQ = 250e3;
    const COMPANY_BASE_HACKING_LEVEL = 225;
    /** Map of Company Faction Name to [City, Company Name, Company Reputation Required, Hacking Level for Entry-Level Job]
     * @type {Map<string, [string, string, number, number]>} */
    // Note: the Company city names are currently unused
    const COMPANY_LOOKUP = new Map<string, [string, string, number, number]>([
        ["Fulcrum Secret Technologies", ["Aevum", "Fulcrum Technologies", FULCRUM_COMPANY_REP_REQ, COMPANY_BASE_HACKING_LEVEL]],
        ["Four Sigma", ["Sector-12", "Four Sigma", DEFAULT_COMPANY_REP_REQ, COMPANY_BASE_HACKING_LEVEL]],
        ["Bachman & Associates", ["Aevum", "Bachman & Associates", DEFAULT_COMPANY_REP_REQ, COMPANY_BASE_HACKING_LEVEL]],
        ["NWO", ["Volhaven", "NWO", DEFAULT_COMPANY_REP_REQ, COMPANY_BASE_HACKING_LEVEL]],
        ["Clarke Incorporated", ["Aevum", "Clarke Incorporated", DEFAULT_COMPANY_REP_REQ, COMPANY_BASE_HACKING_LEVEL]],
        ["OmniTek Incorporated", ["Volhaven", "OmniTek Incorporated", DEFAULT_COMPANY_REP_REQ, COMPANY_BASE_HACKING_LEVEL]],
    ]);
    const JOB_PRIOS = ["software", "software consultant", "it", "security engineer", "network engineer", "business", "business consultant", "security", "agent", "employee"];

    function assert(cond: unknown, ...msg: DeepReadonly<Parameters<typeof ns.tprint>>) {
        if (!cond) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            ns.tprint(...msg);
        }
    }

    /**
     * @param {string} company
     * @param {number} untilRep the reputation to keep working until reached
    */
    function tryWorkForCompany(company: string, untilRep = Infinity) {
        for (const job of JOB_PRIOS) {
            if (ns.singularity.applyToCompany(company, job)) {
                ns.scriptKill("/sing/workForFaction.js", ns.getHostname());
                if (ns.getScriptRam("/sing/workForCompany.js") > ns.getServerMaxRam(HOST) - ns.getServerUsedRam(HOST)) {
                    ns.scriptKill("share.js", HOST);
                }
                ns.scriptKill("share.js", ns.getHostname());
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
    if (forceInstall) ns.tail();
    const myAugs = ns.singularity.getOwnedAugmentations(true);
    function getUnownedAugs(faction: string) {
        return ns.singularity.getAugmentationsFromFaction(faction).filter((aug) => COMMON_AUGS.includes(aug) || !myAugs.includes(aug));
    }

    let city = ns.getPlayer().city;
    /** A map of Faction Name to (Number of Augmentations we need from it); only meant for debugging or viewing via the written file
     * @type {Map<string, number>} */
    let factionData: Map<string, number>;
    if (ns.fileExists("/sing/factionData.txt")) {
        factionData = new Map<string, number>(JSON.parse(ns.read("/sing/factionData.txt") as string) as Iterable<readonly [string, number]>);
    } else {
        factionData = new Map<string, number>();
    }

    interface AugInfo {
        price: number;
        faction: string;
    }
    /** A map of Augmentation Name to {Price in $, Faction offering it}
     * @type {Map<string, {price: number, faction: string}>} */
    const augsToBuyMap = new Map<string, AugInfo>();
    // have to do this before main faction loop to prevent prio/prereq deadlock
    for (const faction of ns.getPlayer().factions) {
        const augs = getUnownedAugs(faction);
        for (const aug of augs) {
            const repNeeded = ns.singularity.getAugmentationRepReq(aug);
            const price = ns.singularity.getAugmentationPrice(aug);
            if ((augsToBuyMap.get(aug)?.price ?? Infinity) > price && ns.singularity.getFactionRep(faction) >= repNeeded) {
                augsToBuyMap.set(aug, {price, faction});
            }
        }
    }

    /** Says whether we have (or can currently buy) all prerequisites for this augmentation
     * @param {string} aug */
    function haveOrCanBuyPrereqs(aug: string) {
        const prereqs = ns.singularity.getAugmentationPrereq(aug);
        return !prereqs.filter((prereq) => !myAugs.includes(prereq) && !augsToBuyMap.has(prereq)).length;
    }

    let working = false;
    let awaitingCityFactionInvite = false;
    for (const [faction, ] of config.FACTION_PRIOS) {
        ns.print(faction);
        const augs = getUnownedAugs(faction);
        factionData.set(faction, augs.length - COMMON_AUGS.length);
        if (augs.length <= COMMON_AUGS.length) continue;
        if (ns.singularity.checkFactionInvitations().includes(faction)) {
            ns.singularity.joinFaction(faction);
        }
        if (!ns.getPlayer().factions.includes(faction)) {
            if (COMPANY_LOOKUP.has(faction)) {
                // The next important faction is a company faction we're not in. Work the company.
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const [, company, repNeeded, hackingLevelNeeded] = COMPANY_LOOKUP.get(faction)!;
                maxHackLevel = Math.max(maxHackLevel, hackingLevelNeeded);
                if (!working && ns.getPlayer().hacking >= hackingLevelNeeded && ns.singularity.getCompanyRep(company) < repNeeded) {
                    // can't use ns.isRunning() as job can't always be predicted
                    if (ns.scriptRunning("/sing/workForCompany.js", ns.getHostname())) {
                        working = true;
                    } else {  // run it
                        ns.singularity.quitJob(company);
                        working = tryWorkForCompany(company, repNeeded);
                    }
                    if (working) break;
                    else {
                        ns.tail();
                        ns.print("Failed to work for ", company, "?!");
                    }
                }
            } else if (CITY_FACTIONS.has(faction) && !awaitingCityFactionInvite) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const [neededCity, neededMoney, neededHackingLevel, enemies] = CITY_FACTIONS.get(faction)!;
                maxHackLevel = Math.max(maxHackLevel, neededHackingLevel);
                if (enemies.filter((enemy) => ns.getPlayer().factions.includes(enemy)).length)
                    continue;
                if (ns.getPlayer().money >= neededMoney + AIRFARE && ns.getPlayer().hacking >= neededHackingLevel) {
                    if (neededCity === city || ns.singularity.travelToCity(neededCity)) {
                        city = neededCity;
                        awaitingCityFactionInvite = true;
                    }
                }
            }
        }
        if (working || !ns.getPlayer().factions.includes(faction)) continue;
        // TODO: for The Cave augment, if can donate for rep, do so; else, softReset when we would have enough favor to donate to the faction
        for (const aug of augs) {
            if (COMMON_AUGS.includes(aug)) continue;
            const repNeeded = ns.singularity.getAugmentationRepReq(aug);
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            if (!working && ns.singularity.getFactionRep(faction) < repNeeded) {
                if (ns.isRunning("/sing/workForFaction.js", ns.getHostname(), faction, repNeeded)) {
                    working = true;
                } else {  // run it
                    // don't work towards augs we can't get the prereqs for yet
                    if (!haveOrCanBuyPrereqs(aug)) continue;

                    ns.scriptKill("/sing/workForFaction.js", ns.getHostname());
                    ns.scriptKill("share.js", ns.getHostname());
                    if (ns.run("/sing/workForFaction.js", 1, faction, repNeeded)) {
                        ns.tprint(`Working towards aug ${aug} from ${faction} (${ns.nFormat(repNeeded, "0a")} rep needed)`);
                        working = true;
                    } else {
                        ns.tprint(`Failed to start working for faction ${faction}! Is there enough free RAM?`);
                    }
                }
                if (working) break;
            }
        }
    }
    if (!working) {
        ns.scriptKill("/sing/workForCompany.js", ns.getHostname());
        ns.scriptKill("/sing/workForFaction.js", ns.getHostname());
    }

    if (config.ACCEPT_ALL_INVITATIONS) {
        for (const faction of ns.singularity.checkFactionInvitations()) {
            if (config.FACTION_BLACKLIST.includes(faction)) continue;
            const numAugsNeeded = getUnownedAugs(faction).length - COMMON_AUGS.length;
            if (numAugsNeeded > 0) {
                ns.singularity.joinFaction(faction);
            } else {
                ns.tail();
                ns.print("Have all augs from ", faction, "?");
            }
            factionData.set(faction, numAugsNeeded);
        }
    }
    await ns.write("/sing/factionData.txt", JSON.stringify(Array.from(factionData.entries())), "w");

    if (forceInstall || augsToBuyMap.size && (!working || (bn == CHEAP_BN && augsToBuyMap.size > MIN_AUGS_FOR_ACHIEVO))) {
        // If we aren't working towards any augmentations and have augs to buy/install, let's do so now
        for (const faction of ns.getPlayer().factions) {
            const augs = getUnownedAugs(faction);
            for (const aug of augs) {
                assert(ns.singularity.getFactionRep(faction) >= ns.singularity.getAugmentationRepReq(aug) && haveOrCanBuyPrereqs(aug),
                    `Found aug ${aug} under faction ${faction} that we don't have the reputation for, but aren't working towards!`);
                const price = ns.singularity.getAugmentationPrice(aug);
                if ((augsToBuyMap.get(aug)?.price ?? Infinity) > price) {
                    augsToBuyMap.set(aug, {price, faction});
                }
            }
        }

        /** A sortable list of [Augmentation Price in $, Augmentation, Faction offering it]
         * @type {[number, string, string][]} */
        const augsToBuy: [number, string, string][] = [];
        for (const [aug, info] of augsToBuyMap) {
            if (COMMON_AUGS.includes(aug)) continue;
            augsToBuy.push([info.price, aug, info.faction]);
        }

        /** sort the list from cheapest to most expensive
         * @param {[number, ...T[]][]} arr
         * @modifies {arr}
         * @template T */
        // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
        const sortAsc = <T>(arr: [number, ...T[]][]) => arr.sort((a, b) => a[0] - b[0]);
        sortAsc(augsToBuy);

        const preOwnedAugs = ns.singularity.getOwnedAugmentations(false);
        const boughtAugs = myAugs.length - preOwnedAugs.length;
        const augsAvailableToQueue = boughtAugs + Math.max(augsToBuyMap.size, augsToBuy.length);

        ns.print("augsToBuy: ", augsToBuy);
        if (augsToBuy.length)
            ns.tail();

        if (forceInstall || (boughtAugs > 0 || (augsToBuy.length && augsToBuy[augsToBuy.length - 1][0] <= ns.getPlayer().money)
            && (bn != CHEAP_BN || augsAvailableToQueue < config.MIN_AUGS_TO_CONSIDER_ACHIEVO || augsAvailableToQueue >= MIN_AUGS_FOR_ACHIEVO))) {
            // Liquidate (sell) all stocks
            ns.scriptKill("stockBot.js", ns.getHostname());
            for (const sym of ns.stock.getSymbols()) {
                ns.stock.sell(sym, Infinity);
                try {
                    ns.stock.sellShort(sym, Infinity);
                } catch {}
            }

            /** @param {string} faction
             * @param {string} aug */
            function buyAug(faction: string, aug: string) {
                const success = ns.singularity.purchaseAugmentation(faction, aug);
                if (success) {
                    bought.add(aug);
                    myAugs.push(aug);
                }
                return success;
            }

            /** @type {Set<string>} */
            const bought = new Set<string>(myAugs);
            while (augsToBuy.length) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const [, aug, faction] = augsToBuy.pop()!;
                if (bought.has(aug)) continue;
                const preReqs = ns.singularity.getAugmentationPrereq(aug);
                while (preReqs.length) {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    const preReq = preReqs.pop()!;  // lowest first
                    if (bought.has(preReq)) continue;
                    const preReqFaction = augsToBuyMap.get(preReq)?.faction;
                    if (!preReqFaction || !buyAug(preReqFaction, preReq)) break;
                }
                buyAug(faction, aug);
            }

            // with our remaining money, buy as many lvls of COMMON_AUGS as possible
            for (const aug of COMMON_AUGS) {
                const info = augsToBuyMap.get(aug);
                if (!info) continue;
                augsToBuy.push([info.price, aug, info.faction]);
            }
            while (augsToBuy.length && (augsToBuy.at(-1)?.[0] ?? Infinity) < ns.getPlayer().money) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const [price, aug, faction] = augsToBuy.pop()!;
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
            await ns.write("/sing/factionData.txt", JSON.stringify(Array.from(factionData.entries())), "w");

            if (forceInstall || augsAvailableToQueue < config.MIN_AUGS_TO_CONSIDER_ACHIEVO
                || bn != CHEAP_BN || (bought.size - preOwnedAugs.length >= MIN_AUGS_FOR_ACHIEVO)) {
                ns.singularity.installAugmentations("/sing/sing.js");
            } else {
                ns.toast(`Waiting on ${MIN_AUGS_FOR_ACHIEVO - (bought.size - preOwnedAugs.length)} more augments (for achievo) before installing!`, "warning", null);
            }
        } else if (augsToBuy.length && augsToBuy[augsToBuy.length - 1][0] > ns.getPlayer().money) {
            ns.print("Cannot afford most expensive purchasable augment yet!");
        }
    }

    if (!working) {
        if (ns.getPlayer().hacking >= maxHackLevel && !ns.singularity.isBusy()) {
            // Use actions to make money
            let maxCompanyRep = -Infinity;
            let maxRepCompany = null;
            const companies = new Set<string>();
            for (const [, [, company,, ]] of COMPANY_LOOKUP) {
                companies.add(company);
            }
            // A map of company name to position held in the company
            const jobs = new Map<string, string>(ns.getPlayer().jobs as Map<string, string>);
            for (const [company, ] of jobs) {
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
            if (maxRepCompany)
                tryWorkForCompany(maxRepCompany);

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
        if (ns.getPlayer().hacking < maxHackLevel) {
            const newCity = UNIS.has(city) ? city : Array.from(UNIS.keys())[0];
            if (newCity === city || (!awaitingCityFactionInvite && ns.singularity.travelToCity(newCity))) {
                const uni = UNIS.get(city);
                if (uni) {
                    ns.print(`attempting to study at ${uni}`);
                    const focus = ns.singularity.isBusy() && ns.singularity.isFocused();
                    ns.singularity.universityCourse(uni, "Study Computer Science", focus);
                } else {
                    ns.tail();
                    ns.print("Failed to find university in city ", newCity);
                }
            }
        }
    }
}