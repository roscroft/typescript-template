/** @param {NS} ns */
export async function main(ns) {
    return await ns.weaken(ns.args[0], {threads: ns.args[1], additionalMsec: ns.args[2]})
}