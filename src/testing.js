/** @param {NS} ns */
export async function main(ns) {
    ns.tprint(ns.hackAnalyze("n00dles"))
    ns.tprint(ns.hackAnalyzeThreads("n00dles", ns.getServerMaxMoney("n00dles")))
    // 580.238726790451
    let base = ns.getServer("n00dles")
    let target = ns.formulas.mockServer()
    target = base
    target.moneyAvailable = 0
//Oh, so growing actually adds $1 per thread before growing the money....
    ns.tprint(ns.formulas.hacking.growPercent(target, 1000, ns.getPlayer(),1))
}