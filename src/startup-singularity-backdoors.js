/** @param {NS} ns */

export async function main(ns) {
    await get_and_backdoor_hosts(ns)
    ns.singularity.connect("home")
}

export async function get_and_backdoor_hosts(ns) {
    let hosts_explored = new Set([ns.getHostname()])
    async function dfs(hosts_to_explore) {
        if (hosts_to_explore.length == 0) { return [] }
        let [host, ...remaining] = hosts_to_explore
        hosts_explored.add(host)
        let all_neighbors = ns.scan(host)
        let new_backdoored = 0
        for (let neighbor of all_neighbors) {
            if (ns.singularity.connect(host) || ns.singularity.connect("home")) {
                if (neighbor != "home") {
                    new_backdoored += await connect_and_backdoor(ns, neighbor)
                }
            }
        }
        //ns.tprintf("New backdoors installed: %d", new_backdoored)
        let new_neighbors = all_neighbors.filter(target => !hosts_explored.has(target))
        let dfs_rest = await dfs([...remaining, ...new_neighbors])
        return [ns.getServer(host), ...dfs_rest]
    }
    return await dfs(ns.scan())
}

export async function connect_and_backdoor(ns, neighbor) {
    let server = ns.getServer(neighbor)
    if (server.requiredHackingSkill <= ns.getHackingLevel() && server.hasAdminRights && ns.singularity.connect(neighbor) && !server.backdoorInstalled) {
        ns.tprintf("Trying backdoor on %s", neighbor)
        return await ns.singularity.installBackdoor().then(1).catch(0)
    }
    return 0
}