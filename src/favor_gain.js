/** @param {NS} ns */
export async function main(ns) {
    let current_favor = ns.singularity.getFactionFavor("Daedalus")
    let favor_gained = ns.singularity.getFactionFavorGain("Daedalus")
    ns.tprintf(ns.getFavorToDonate()-(current_favor+favor_gained))
}