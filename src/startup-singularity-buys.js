/** @param {NS} ns */

export function main(ns) {
    if (buy_tor(ns)) ns.tprint("Tor server purchased!")
    if (buy_progs(ns)) ns.tprint("Darkweb program(s) purchased!")
}

export function buy_tor(ns) {
    return ns.singularity.purchaseTor()
}

export function buy_progs(ns) {
    return ns.singularity.getDarkwebPrograms().map(prog => [prog, ns.fileExists(prog)||prog=="Formulas.exe" ? true : ns.singularity.purchaseProgram(prog)])
}