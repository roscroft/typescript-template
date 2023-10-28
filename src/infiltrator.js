/** @param {NS} ns */
const TICKRATE = 200

export async function main(ns) { 
    let locs = ns.infiltration.getPossibleLocations()
    let loc_data = locs.map(loc => ns.infiltration.getInfiltration(loc.name))
    // Best hack target is first one with less than 50% difficulty
    loc_data = loc_data.filter(loc => loc.difficulty/3 < .6).sort((a,b) => b.reward.tradeRep - a.reward.tradeRep).slice(0,3)
    loc_data.map(best_loc => ns.tprintf("Best locations to hack: %s in %s, giving %s rep and $%s.", best_loc.location.name, best_loc.location.city, best_loc.reward.tradeRep.toExponential(2), best_loc.reward.sellCash.toExponential(2)))
}

export async function main_(ns) { 
    let locs = ns.infiltration.getPossibleLocations()
    let loc_data = locs.map(loc => ns.infiltration.getInfiltration(loc.name))
    let sorted_locs = loc_data.sort((a,b) => a.location.infiltrationData.startingSecurityLevel - b.location.infiltrationData.startingSecurityLevel)
    ns.tprint(sorted_locs.map(loc => loc.location.city + ", " + loc.location.name))
}