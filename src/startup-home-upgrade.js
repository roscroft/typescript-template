/** @param {NS} ns */

export function main(ns) {
    let upgrades_to_go = true
    while(upgrades_to_go) {
        let ram = ns.singularity.upgradeHomeRam()
        let core = ns.singularity.upgradeHomeCores()
        upgrades_to_go = upgrades_to_go && ram && core
    }
    return upgrades_to_go
}