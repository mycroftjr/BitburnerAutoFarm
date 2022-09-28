
const SLEEP_MS = 1e3;

/* Also based on https://docs.google.com/document/d/e/2PACX-1vTzTvYFStkFjQut5674ppS4mAhWggLL5PEQ_IbqSRDDCZ-l-bjv0E6Uo04Z-UfPdaQVu4c84vawwq8E/pub */

/** @param {NS} ns */
export async function main(ns) {
    ns.disableLog("disableLog");
    ns.disableLog("sleep");
    while (true) {
        try {
            await mainHelper(ns);
        }
        catch { }
        await ns.sleep(SLEEP_MS);
    }
}

async function mainHelper(ns) {
    ns.tail();
    
    const MAIN_CITY = "Aevum";
    
    const DIV_TYPE = "Tobacco";
    const DIV_MATS = ["Plants", "Energy"];
    const corp = ns.corporation.getCorporation();
    
    const tempDiv = corp.divisions.find(d => d.type == DIV_TYPE);
    if (!tempDiv) {
        throw `Must already have a ${DIV_TYPE} Division; run /corp/setup.js if you have not`;
    }
    let div = tempDiv;
    const divName = div.name;
    
    const MARKET_TAS = ["Market-TA.I", "Market-TA.II"];
    
    const RATIO_TO_INVEST = 0.1;
    const PRODUCT_PREFIX = "Tobacco v";
    const FAKE_PRODUCT_NAME = `${PRODUCT_PREFIX}0`;
    const COMPLETE = 100;
    // eslint-disable-next-line no-magic-numbers
    let MAX_PRODUCTS = 3;
    
    let lastProductName = div.products.find(p => p.startsWith(PRODUCT_PREFIX)) ?? FAKE_PRODUCT_NAME;
    try {
        const product = ns.corporation.getProduct(divName, getNextProductName());
        lastProductName = product.name;
    }
    catch { }
    
    function marketTAIICost() {
        return ns.corporation.hasResearched(divName, MARKET_TAS[0]) ? 0 : ns.corporation.getResearchCost(divName, MARKET_TAS[0])
            + ns.corporation.getResearchCost(divName, MARKET_TAS[1]);
    }
    
    function getNextProductName() {
        const lastProductNum = lastProductName.substring(PRODUCT_PREFIX.length);
        const productName = `${PRODUCT_PREFIX}${parseInt(lastProductNum, 10) + 1}`;
        try {
            const product = ns.corporation.getProduct(divName, productName);
            lastProductName = product.name;
            return getNextProductName();
        }
        catch { }
        return productName;
    }
    
    function designProduct() {
        const investments = corp.funds * RATIO_TO_INVEST;
        const productName = getNextProductName();
        ns.print("Making product ", productName);
        ns.corporation.makeProduct(divName, MAIN_CITY, productName, investments, investments);
        return productName;
    }
    
    while (true) {
        if (ns.corporation.hasResearched(divName, "uPgrade: Capacity.II")) {
            // eslint-disable-next-line no-magic-numbers
            MAX_PRODUCTS = 5;
        } else if (ns.corporation.hasResearched(divName, "uPgrade: Capacity.I")) {
            // eslint-disable-next-line no-magic-numbers
            MAX_PRODUCTS = 4;
        }
        
        if (!ns.corporation.hasResearched(divName, "Hi-Tech R&D Laboratory")) {
            const cost = ns.corporation.getResearchCost(divName, "Hi-Tech R&D Laboratory");
            if (div.research > cost) {
                ns.corporation.research(divName, "Hi-Tech R&D Laboratory");
            } else {
                ns.tprint("Hi-Tech R&D Laboratory cost: ", cost);
            }
        }
        if (!ns.corporation.hasResearched(divName, MARKET_TAS[MARKET_TAS.length - 1]) && div.research > marketTAIICost()) {
            for (const res of MARKET_TAS) {
                ns.corporation.research(divName, res);
            }
        }
        
        for (const city of div.cities) {
            if (ns.corporation.hasWarehouse(divName, city)) {
                ns.corporation.setSmartSupply(divName, city, true);
                for (const mat of DIV_MATS) {
                    ns.corporation.setSmartSupplyUseLeftovers(divName, city, mat, true);
                }
            }
        }
        
        if (lastProductName == FAKE_PRODUCT_NAME) {
            lastProductName = designProduct();
        }
        const latestProduct = ns.corporation.getProduct(divName, lastProductName);
        if (latestProduct.developmentProgress < COMPLETE) {
            ns.print("Waiting on product ", lastProductName, " development to finish");
            await ns.sleep(SLEEP_MS);
            continue;
        }
        
        if (!latestProduct.sCost || latestProduct.sCost == "MP") {
            // TODO: binary search the sell price at which the product gain per second is slightly negative in all cities
            ns.corporation.sellProduct(divName, MAIN_CITY, latestProduct.name, "MAX", "MP", true);
            await ns.sleep(SLEEP_MS);
        }
        if (ns.corporation.hasResearched(divName, "Market-TA.I"))
            ns.corporation.setProductMarketTA1(divName, latestProduct.name, true);
        if (ns.corporation.hasResearched(divName, "Market-TA.II"))
            ns.corporation.setProductMarketTA2(divName, latestProduct.name, true);
        
        await ns.sleep(SLEEP_MS);
        div = ns.corporation.getDivision(divName);
        if (div.products.length >= MAX_PRODUCTS) {
            // TODO: lower sell price and/or wait for product reserves to deplete before discontinuing
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const oldestProductName = div.products.at(0);
            ns.corporation.discontinueProduct(divName, oldestProductName);
            while (div.products.length >= MAX_PRODUCTS) {
                ns.print("Waiting for div.products to reflect discontinued product");
                await ns.sleep(SLEEP_MS);
                div = ns.corporation.getDivision(divName);
            }
        }
        await ns.sleep(SLEEP_MS);
        lastProductName = designProduct();
        await ns.sleep(SLEEP_MS);
        
        // TODO: buy Wilson Analytics levels up to the amount needed for exponential AdVert gain
        // TODO: buy AdVerts (until awareness & popularity reach 1.798e+308) or Aevum office space +15, whichever is smaller
        // TODO: if Aevum office space is > 60, buy office space in the other cities up to 60 less than Aeuvm
    }
}
