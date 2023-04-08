/** @param {NS} ns */
export async function main(ns) {
    let target = ns.args[0]
    ns.tprintf("Server %s:", target)
    ns.tprintf("Server security: %f/%f.", ns.getServerSecurityLevel(target), ns.getServerMinSecurityLevel(target))
    ns.tprintf("Server money: %f/%f.", ns.getServerMoneyAvailable(target), ns.getServerMaxMoney(target))
}