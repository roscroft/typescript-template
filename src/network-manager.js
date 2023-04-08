/** @param {NS} ns */

export async function main(ns) {
    if (ns.args[0] == "kill") {kill_all_scripts(ns)}
    else if (ns.args[0] == "prepped") {count_prepped(ns)}
}

export function count_prepped(ns) {
    let total_targets = get_targets(ns).length
    let prepped_targets = prepped(ns).length
    ns.tprintf("Prepped targets: %d/%d", prepped_targets, total_targets)
    ns.tprintf("Unprepped targets: %d", unprepped(ns).length)
}

export function prepped(ns) {
    return get_targets(ns).filter(target => (target.moneyAvailable==target.moneyMax) && (target.minDifficulty==target.hackDifficulty))
}

export function unprepped(ns) {
    return get_targets(ns).filter(target => (target.moneyAvailable<target.moneyMax) || (target.minDifficulty>target.hackDifficulty))
}

export function get_target_names(ns) {
    return get_targets(ns).map(host => host.hostname)
}

export function get_targets(ns) {
    return get_all_hosts(ns).filter(host => host.requiredHackingSkill <= ns.getHackingLevel() && ns.hackAnalyze(host.hostname)!=0 && host.moneyMax != 0 && host.purchasedByPlayer == false && host.hasAdminRights == true && host.hostname!="home")
}

export function get_hosts(ns) {
    let hosts_explored = new Set([ns.getHostname()])
    function dfs(hosts_to_explore) {
        if (hosts_to_explore.length == 0) { return [] }
        let [host, ...remaining] = hosts_to_explore
        hosts_explored.add(host)
        return [ns.getServer(host), ...dfs([...remaining, ...ns.scan(host).filter(target => !hosts_explored.has(target))])]
    }
    return dfs(ns.scan())
}
export function get_all_hosts(ns) {
    return [...get_hosts(ns), ns.getServer("home")]
}
export function get_ram(host_list) {
    return [host_list.reduce((acc, host) => acc + host.ramUsed, 0), host_list.reduce((acc, host) => acc + host.maxRam, 0)]
}
export function get_running_scripts(ns) {
    return [...get_all_hosts(ns).reduce((acc, host) => (acc[host.hostname] = ns.ps(host.hostname)), {})]
}
export function get_running_script_pids(ns) {
    return get_running_scripts(ns).map(script => script[1].pid)
}
export function kill_all_scripts(ns) {
    return get_all_hosts(ns).map(host => ns.killall(host.hostname))
}
export function get_hack_hosts(ns) {
    return get_all_hosts(ns).filter(host => host.hasAdminRights == true && host.maxRam > 0)
}
export function get_prepped_servers(ns) {
    return get_targets(ns).filter(is_prepped)
}
export function get_unprepped_servers(ns) {
    return get_targets(ns).filter(host => !is_prepped(host))
}
export function get_servers_to_grow(ns) {
    return get_unprepped_servers(ns).filter(to_grow)
}
export function get_servers_to_weaken(ns) {
    return get_unprepped_servers(ns).filter(to_weaken)
}
export function is_prepped(host) {
    return host.hackDifficulty == host.minDifficulty && host.moneyAvailable == host.moneyMax
}
export function to_grow(host) {
    return host.moneyAvailable < host.moneyMax
}
export function to_weaken(host) {
    return host.hackDifficulty > host.minDifficulty
}
export function refresh(ns, hostname) {
    return ns.getServer(hostname)
}