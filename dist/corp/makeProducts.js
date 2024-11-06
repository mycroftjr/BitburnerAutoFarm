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
    const divs = corp.divisions.map(d => ns.corporation.getDivision(d));
    const tempDiv = divs.find(d => d.type == DIV_TYPE);
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
        const product = ns.corporation.getProduct(divName, MAIN_CITY, getNextProductName());
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
            const product = ns.corporation.getProduct(divName, MAIN_CITY, productName);
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
        }
        else if (ns.corporation.hasResearched(divName, "uPgrade: Capacity.I")) {
            // eslint-disable-next-line no-magic-numbers
            MAX_PRODUCTS = 4;
        }
        if (!ns.corporation.hasResearched(divName, "Hi-Tech R&D Laboratory")) {
            const cost = ns.corporation.getResearchCost(divName, "Hi-Tech R&D Laboratory");
            if (div.researchPoints > cost) {
                ns.corporation.research(divName, "Hi-Tech R&D Laboratory");
            }
            else {
                ns.tprint("Hi-Tech R&D Laboratory cost: ", cost);
            }
        }
        if (!ns.corporation.hasResearched(divName, MARKET_TAS[MARKET_TAS.length - 1]) && div.researchPoints > marketTAIICost()) {
            for (const res of MARKET_TAS) {
                ns.corporation.research(divName, res);
            }
        }
        for (const city of div.cities) {
            if (ns.corporation.hasWarehouse(divName, city)) {
                ns.corporation.setSmartSupply(divName, city, true);
                for (const mat of DIV_MATS) {
                    ns.corporation.setSmartSupplyOption(divName, city, mat, "leftovers");
                }
            }
        }
        if (lastProductName == FAKE_PRODUCT_NAME) {
            lastProductName = designProduct();
        }
        const latestProduct = ns.corporation.getProduct(divName, MAIN_CITY, lastProductName);
        if (latestProduct.developmentProgress < COMPLETE) {
            ns.print("Waiting on product ", lastProductName, " development to finish");
            await ns.sleep(SLEEP_MS);
            continue;
        }
        if (!latestProduct.desiredSellPrice || latestProduct.desiredSellPrice == "MP") {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFrZVByb2R1Y3RzLmpzIiwic291cmNlUm9vdCI6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zb3VyY2VzLyIsInNvdXJjZXMiOlsiY29ycC9tYWtlUHJvZHVjdHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBR0EsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDO0FBRXJCLG1KQUFtSjtBQUVuSixxQkFBcUI7QUFDckIsTUFBTSxDQUFDLEtBQUssVUFBVSxJQUFJLENBQUMsRUFBb0I7SUFDM0MsRUFBRSxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUM1QixFQUFFLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3ZCLE9BQU8sSUFBSSxFQUFFO1FBQ1QsSUFBSTtZQUNBLE1BQU0sVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1NBQ3hCO1FBQUMsTUFBTSxHQUFFO1FBQ1YsTUFBTSxFQUFFLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0tBQzVCO0FBQ0wsQ0FBQztBQUVELEtBQUssVUFBVSxVQUFVLENBQUMsRUFBb0I7SUFDMUMsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDO0lBRVYsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDO0lBRTFCLE1BQU0sUUFBUSxHQUFHLFNBQVMsQ0FBQztJQUMzQixNQUFNLFFBQVEsR0FBRyxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQztJQUN0QyxNQUFNLElBQUksR0FBRyxFQUFFLENBQUMsV0FBVyxDQUFDLGNBQWMsRUFBRSxDQUFDO0lBRTdDLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNwRSxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksSUFB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