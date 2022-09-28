
/** Based on https://docs.google.com/document/d/e/2PACX-1vTzTvYFStkFjQut5674ppS4mAhWggLL5PEQ_IbqSRDDCZ-l-bjv0E6Uo04Z-UfPdaQVu4c84vawwq8E/pub */
/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("disableLog");
    ns.disableLog("sleep");
    ns.disableLog("asleep");
    
    const HOME_CITY = "Sector-12";
    const CORP_NAME = "Corp";
    const DIV1 = {
        type: "Agriculture",
        name: "Agriculture",
        mats: ["Water", "Energy"],
        prods: ["Plants", "Food"],
    };
    const DIV2 = {
        type: "Tobacco",
        name: "Tobacco",
        mats: ["Plants", "Energy"],
    };
    const CITIES = ["Sector-12", "Aevum", "Chongqing", "Ishima", "New Tokyo", "Volhaven"];
    const CENT = 100;
    
    const FULL_AUTO = ns.args.length <= 0 || ns.args[0] != "MANUAL";
    
    const bn = ns.getPlayer().bitNodeN;
    const FREE_CORP_BN = 3;
    // The optimal amount of seed money for minimal manual work
    const SEED_MONEY = 250e9;
    const WAREHOUSE_SECS_PER_TICK = 10;
    
    const INVEST_INFO = [
        {
            profit: 1.5e6,
            sharePercent: 10,
            targ: 210e9,
            min: 1e9,
        },
        {
            profit: 24e6,
            sharePercent: 35,
            targ: 5e12,
            min: 5e12
        }
    ];
    
    if (!ns.getPlayer().hasCorporation) {
        if (bn == FREE_CORP_BN) {
            if (ns.getPlayer().city != HOME_CITY)
                ns.singularity.travelToCity(HOME_CITY);
            ns.corporation.createCorporation(CORP_NAME, false);
        } else {
            ns.tail();
            ns.print("Please go to Cityhall in ", HOME_CITY, " and self-fund a corporation using at least $", ns.nFormat(SEED_MONEY, "0a"));
        }
    }
    if (!ns.getPlayer().hasCorporation)
        return;
    const corp = ns.corporation.getCorporation();
    
    /** Buys the given one-time upgrade for the corp, if we don't already have it. */
    function buyUpgrade(upgrade) {
        if (ns.corporation.hasUnlockUpgrade(upgrade))
            return true;
        if (ns.corporation.getUnlockUpgradeCost(upgrade) > corp.funds) {
            ns.tail();
            ns.print("Failed to buy upgrade ", upgrade);
            return false;
        }
        ns.corporation.unlockUpgrade(upgrade);
        return ns.corporation.hasUnlockUpgrade(upgrade);
    }
    
    if (corp.funds >= SEED_MONEY) {
        if (!buyUpgrade("Warehouse API"))
            return;
        if (!buyUpgrade("Office API"))
            return;
    }
    
    if (!buyUpgrade("Smart Supply"))
        return;
    
    const INIT_UPGRADES = ["FocusWires", "Neural Accelerators", "Speech Processor Implants", "Nuoptimal Nootropic Injector Implants", "Smart Factories"];
    for (const upgrade of INIT_UPGRADES) {
        while (ns.corporation.getUpgradeLevel(upgrade) < 2) {
            ns.corporation.levelUpgrade(upgrade);
            await ns.sleep(1);
        }
    }
    
    async function assignOrHire(div, city, pos, num) {
        if (!ns.corporation.hasUnlockUpgrade("Office API"))
            throw "Cannot call assignOrHire without Office API!!!";
        const office = ns.corporation.getOffice(div, city);
        const has = office.employeeJobs[pos];
        if (has >= num) {
            ns.tail();
            ns.print(`${city} already has ${num} employees in ${pos}?`);
            return;
        }
        const toHire = num - office.employeeJobs.Unassigned - has;
        for (let i = 0; i < toHire; i++) {
            ns.corporation.hireEmployee(div, city);
            await ns.sleep(1 << 2);
        }
        if (!ns.corporation.setAutoJobAssignment(div, city, pos, num)) {
            ns.tail();
            ns.print(`assignOrHire(${div}, ${city}, ${pos}, ${num}) failed with: toHire = ${toHire}, employeeJobs = `
                + `${office.employeeJobs[pos]} / ${office.employeeJobs.Unassigned}!`);
        }
    }
    
    /** @type {Promise<?>[]} */
    const buyPromises = [];
    function buyMatOnce(div, city, mat, amt) {
        if (!ns.corporation.hasUnlockUpgrade("Warehouse API"))
            throw "Cannot call buyMatOnce without Warehouse API!!!";
        ns.corporation.sellMaterial(div, city, mat, "0", "MP");
        if (ns.corporation.hasResearched(div, "Bulk Purchasing")) {
            ns.corporation.bulkPurchase(div, city, mat, amt);
        } else {
            ns.corporation.buyMaterial(div, city, mat, amt / WAREHOUSE_SECS_PER_TICK);
            const stop = () => void ns.corporation.buyMaterial(div, city, mat, 0);
            buyPromises.push(ns.asleep(WAREHOUSE_SECS_PER_TICK).then(stop, stop));
        }
    }
    async function stopBuyMats() {
        while (buyPromises.length > 0) {
            await buyPromises.pop();
        }
    }
    
    /** @param {number} maxInvestNo - the maximum numbered investment to make */
    async function considerInvest(maxInvestNo) {
        const offer = ns.corporation.getInvestmentOffer();
        if (maxInvestNo < offer.round)
            return false;
        if (INVEST_INFO.length < offer.round) {
            ns.tail();
            ns.print("Wanted investment info for invest #", offer.round);
        }
        const investInfo = INVEST_INFO[offer.round - 1];
        if (corp.funds < investInfo.targ && corp.revenue - corp.expenses > investInfo.profit) {
            if (offer.shares / corp.totalShares > investInfo.sharePercent / CENT)
                throw `${ns.nFormat(offer.round, "0o")} investment offer asking for more than ${investInfo.sharePercent}% of shares???`;
            if (!FULL_AUTO) {
                const approved = await ns.prompt(`Accept ${ns.nFormat(offer.round, "0o")} round investment of $${ns.nFormat(offer.funds, "0.00a")} `
                    + `for ${offer.shares / corp.totalShares * CENT}% of shares?`);
                if (!approved)
                    return false;
            }
            for (let i = 0; i <= 2; i++) {
                if (ns.corporation.acceptInvestmentOffer())
                    return true;
                await ns.sleep(1 << 2);
            }
        }
        return false;
    }
    
    const NINE_EMPLOYEE_DIV = new Map([
        ["Operations", 2],
        ["Engineer", 2],
        ["Business", 1],
        ["Management", 2],
        ["Research & Development", 2]
    ]);
    const NINE_EMPLOYEES = 9;
    
    async function setupDiv1() {
        if (!corp.divisions.find(div => div.name == DIV1.name))
            ns.corporation.expandIndustry(DIV1.type, DIV1.name);
        
        const ORIG_POSITIONS = ["Operations", "Engineer", "Business"];
        for (const city of CITIES) {
            if (!ns.corporation.getDivision(DIV1.name).cities.includes(city))
                ns.corporation.expandCity(DIV1.name, city);
            if (ns.corporation.hasUnlockUpgrade("Office API")) {
                for (const pos of ORIG_POSITIONS) {
                    await assignOrHire(DIV1.name, city, pos, 1);
                }
            }
        }
        if (!ns.corporation.hasUnlockUpgrade("Office API")) {
            ns.tail();
            ns.print("Please hire 3 employees in each city of ", DIV1.name, " and assign 1 in each of: ", ORIG_POSITIONS);
        }
        
        if (ns.corporation.hasUnlockUpgrade("Warehouse API")) {
            ns.corporation.setSmartSupply(DIV1.name, HOME_CITY, true);
            for (const mat of DIV1.mats) {
                ns.corporation.setSmartSupplyUseLeftovers(DIV1.name, HOME_CITY, mat, true);
            }
        } else {
            ns.tail();
            ns.print(`Please enable Smart Supply for each City in the ${DIV1.name} Division!`);
        }
        
        // splurge on a single AdVert.Inc purchase
        if (!ns.corporation.getDivision(DIV1.name).awareness) {
            if (ns.corporation.hasUnlockUpgrade("Office API")) {
                while (ns.corporation.getHireAdVertCount(DIV1.name) < 1) {
                    ns.corporation.hireAdVert(DIV1.name);
                    await ns.sleep(1 << 1);
                }
            }
            else {
                ns.tail();
                ns.print("Please buy 1 AdVert in ", DIV1.name);
            }
        }
        // Upgrade each office’s Storage to 300 (two successive upgrades)
        const WAREHOUSE_LEVEL_TARG = 3;
        if (ns.corporation.hasUnlockUpgrade("Warehouse API")) {
            for (const city of CITIES) {
                const currLevel = ns.corporation.getWarehouse(DIV1.name, city).level;
                if (currLevel < WAREHOUSE_LEVEL_TARG)
                    ns.corporation.upgradeWarehouse(DIV1.name, city, WAREHOUSE_LEVEL_TARG - currLevel);
                // start selling your Plants and Food
                for (const prod of DIV1.prods) {
                    ns.corporation.sellMaterial(DIV1.name, city, prod, "MAX", "MP");
                }
            }
        } else {
            ns.tail();
            ns.print("Please level each warehouse in ", DIV1.name, " to size 300 and set each of: ", DIV1.prods, " to sell MAX at MP");
        }
        
        /* eslint-disable no-magic-numbers */
        /** @type {[string, number][]} */
        const INIT_MATERIALS = [
            ["Hardware", 125],
            ["AI Cores", 75],
            ["Real Estate", 27e3],
        ];
        /* eslint-enable no-magic-numbers */
        if (ns.corporation.hasUnlockUpgrade("Warehouse API")) {
            for (const city of CITIES) {
                for (const [mat, amt] of INIT_MATERIALS) {
                    const matData = ns.corporation.getMaterial(DIV1.name, city, mat);
                    if (matData.qty < amt)
                        buyMatOnce(DIV1.name, city, mat, amt - matData.qty);
                }
            }
            await stopBuyMats();
        } else {
            ns.tail();
            ns.print("Please buy the following in each Warehouse of ", DIV1.name, " for a single tick: ");
            for (const [mat, amt] of INIT_MATERIALS) {
                ns.print(mat, " at ", amt / WAREHOUSE_SECS_PER_TICK, " (", ns.nFormat(amt / WAREHOUSE_SECS_PER_TICK, "0.0a"), ")/s for one tick to ", ns.nFormat(amt, "0a"), " total");
            }
        }
        
        if (corp.funds < INVEST_INFO[0].min) {
            if (!await considerInvest(1)) {
                if (!await ns.prompt("Failed to pass first invest checkpoint, continue?"))
                    return;
            }
        }
        
        if (ns.corporation.hasUnlockUpgrade("Office API")) {
            for (const city of CITIES) {
                const office = ns.corporation.getOffice(DIV1.name, city);
                if (office.size < NINE_EMPLOYEES) {
                    const toHire = NINE_EMPLOYEES - office.size;
                    ns.corporation.upgradeOfficeSize(DIV1.name, city, toHire);
                    for (let i = 0; i < toHire; i++) {
                        ns.corporation.hireEmployee(DIV1.name, city);
                    }
                }
                for (const [pos, targ] of NINE_EMPLOYEE_DIV) {
                    if (office.employeeJobs[pos] < targ)
                        ns.corporation.setAutoJobAssignment(DIV1.name, city, pos, targ);
                }
            }
        } else {
            ns.tail();
            ns.print("Please expand each office to ", NINE_EMPLOYEES, " max employees, hire the max, and then assign jobs as follows: ");
            for (const [pos, targ] of NINE_EMPLOYEE_DIV) {
                ns.print(`${pos}: ${targ}`);
            }
        }
        
        const UPGRADES2 = ["Smart Factories", "Smart Storage"];
        const UPGRADE_LEVEL2 = 10;
        
        for (const upgrade of UPGRADES2) {
            while (ns.corporation.getUpgradeLevel(upgrade) < UPGRADE_LEVEL2) {
                ns.corporation.levelUpgrade(upgrade);
                await ns.sleep(1);
            }
        }
        
        const WAREHOUSE_LEVEL_TARG2 = 10;
        if (ns.corporation.hasUnlockUpgrade("Warehouse API")) {
            for (const city of CITIES) {
                const currLevel = ns.corporation.getWarehouse(DIV1.name, city).level;
                if (currLevel < WAREHOUSE_LEVEL_TARG2)
                    ns.corporation.upgradeWarehouse(DIV1.name, city, WAREHOUSE_LEVEL_TARG2 - currLevel);
            }
        } else {
            ns.tail();
            ns.print("Please level each warehouse in ", DIV1.name, " 7 times to size 2000");
        }
        
        /* eslint-disable no-magic-numbers */
        /** Material, amount to have, amount to buy from last check
         * @type {[string, number, number][]} */
        const MATERIALS2 = [
            ["Hardware", 2800, 2675],
            ["Robots", 96, 96],
            ["AI Cores", 2520, 2445],
            ["Real Estate", 146.4e3, 119.4e3],
        ];
        /* eslint-enable no-magic-numbers */
        if (ns.corporation.hasUnlockUpgrade("Warehouse API")) {
            for (const city of CITIES) {
                for (const [mat, amt,] of MATERIALS2) {
                    const matData = ns.corporation.getMaterial(DIV1.name, city, mat);
                    if (matData.qty < amt)
                        buyMatOnce(DIV1.name, city, mat, amt - matData.qty);
                }
            }
            await stopBuyMats();
        } else {
            ns.tail();
            ns.print("Please buy the following in each Warehouse of ", DIV1.name, " for a single tick: ");
            for (const [mat, amt, diff] of MATERIALS2) {
                ns.print(mat, " at ", diff / WAREHOUSE_SECS_PER_TICK, " (", ns.nFormat(diff / WAREHOUSE_SECS_PER_TICK, "0.0a"), ")/s for one tick to get to ", ns.nFormat(amt - diff, "0a"), " + ", ns.nFormat(diff, "0a"), " = ", ns.nFormat(amt, "0a"));
            }
        }
        
        // Consider invest
        if (corp.funds < INVEST_INFO[1].min) {
            if (!await considerInvest(2)) {
                if (!await ns.prompt("Failed to pass second invest checkpoint, continue?"))
                    return;
            }
        }
        
        // TODO: "Let’s get a bit more storage space" to the end of the section
    }
    
    // await setupDiv1();
    
    async function setupDiv2() {
        if (!corp.divisions.find(div => div.name == DIV2.name))
            ns.corporation.expandIndustry(DIV2.type, DIV2.name);
        
        // Expand first to Aevum, then to all other cities:
        const MAIN_CITY = "Aevum";
        if (!ns.corporation.getDivision(DIV2.name).cities.includes(MAIN_CITY))
            ns.corporation.expandCity(DIV2.name, MAIN_CITY);
        
        // In Aevum, Upgrade the Size of the office to 30 employees and hire enough folks to have 6 of each type of employee except Training.
        const POSITIONS = ["Operations", "Engineer", "Business", "Management", "Research & Development"];
        const MAIN_OFFICE_SIZE1 = 30;
        if (ns.corporation.hasUnlockUpgrade("Office API")) {
            const office = ns.corporation.getOffice(DIV2.name, MAIN_CITY);
            if (office.size < MAIN_OFFICE_SIZE1) {
                ns.corporation.upgradeOfficeSize(DIV2.name, MAIN_CITY, MAIN_OFFICE_SIZE1 - office.size);
            }
            for (const pos of POSITIONS) {
                await assignOrHire(DIV2.name, MAIN_CITY, pos, MAIN_OFFICE_SIZE1 / POSITIONS.length);
            }
        } else {
            ns.print(`In ${MAIN_CITY}, Upgrade the Size of the Office to ${MAIN_OFFICE_SIZE1} and hire enough folks to have 6 of each type of employee except Training.`);
            ns.print(`In every other city, upgrade the size of the office to ${NINE_EMPLOYEES} and hire as follows: `);
            for (const [pos, targ] of NINE_EMPLOYEE_DIV) {
                ns.print(`${pos}: ${targ}`);
            }
        }
        
        for (const city of CITIES) {
            if (!ns.corporation.getDivision(DIV2.name).cities.includes(city))
                ns.corporation.expandCity(DIV2.name, city);
            if (ns.corporation.hasUnlockUpgrade("Office API")) {
                const office = ns.corporation.getOffice(DIV2.name, city);
                if (office.size < NINE_EMPLOYEES) {
                    ns.corporation.upgradeOfficeSize(DIV2.name, city, NINE_EMPLOYEES - office.size);
                }
                for (const [pos, amt] of NINE_EMPLOYEE_DIV) {
                    await assignOrHire(DIV2.name, city, pos, amt);
                }
            }
            if (ns.corporation.hasUnlockUpgrade("Warehouse API") && ns.corporation.hasWarehouse(DIV2.name, city)) {
                const wh = ns.corporation.getWarehouse(DIV2.name, city);
                if (wh.level > 0) {
                    ns.corporation.setSmartSupply(DIV2.name, city, true);
                    for (const mat of DIV2.mats) {
                        ns.corporation.setSmartSupplyUseLeftovers(DIV2.name, city, mat, true);
                    }
                }
            }
        }
        
        const UPGRADES = ["FocusWires", "Neural Accelerators", "Speech Processor Implants", "Nuoptimal Nootropic Injector Implants"];
        const TARG_LEVEL = 20;
        for (const upgrade of UPGRADES) {
            while (ns.corporation.getUpgradeLevel(upgrade) < TARG_LEVEL) {
                ns.corporation.levelUpgrade(upgrade);
                await ns.sleep(1 << 2);
            }
        }
        
        ns.atExit(() => ns.run("/corp/makeProducts.js", 1));
    }
    
    await setupDiv1();
    await setupDiv2();
}
