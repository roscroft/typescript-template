/** @param {NS} ns */
const TICKRATE = 200

export async function main(ns) { 
    let locs = ns.infiltration.getPossibleLocations()
    let loc_data = locs.map(loc => ns.infiltration.getInfiltration(loc.name))
    let sorted_locs = loc_data.sort((a,b) => a.location.infiltrationData.startingSecurityLevel - b.location.infiltrationData.startingSecurityLevel)
    ns.tprint(sorted_locs.map(loc => loc.location.city + ", " + loc.location.name))
}