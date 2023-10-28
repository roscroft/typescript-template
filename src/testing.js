/** @param {NS} ns */
export async function main(ns) {
    let port = ns.getPortHandle(100)
    ns.tprint(port.empty())
}

//comment