/** @param {NS} ns */
export async function main(ns) {
    return await ns.grow(ns.args[0], {threads: ns.args[1]})
}