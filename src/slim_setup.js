/** @param {NS} ns */
import {get_hosts} from "./network-manager.js"
let scripts = ["b-weaken.js", "b-grow.js", "b-hack.js"]
let hacks = ["BruteSSH.exe", 
                "FTPCrack.exe", 
                "relaySMTP.exe", 
                "HTTPWorm.exe", 
                "SQLInject.exe",
                "NUKE.exe"]

export async function main(ns) {

    //buy_servers(ns)
    let hosts = get_hosts(ns).map(host => host.hostname)
    hosts.map(host => transfer_scripts(ns, host))
    let new_hacks = hosts.reduce((acc, host) => {
        let hacks_worked = run_hacks(ns, host)
        if (hacks_worked != 0) return acc.concat(host)
        return acc
    },[])
    ns.tprintf("Newly hacked servers: %d", new_hacks.length)
    hosts = await get_and_backdoor_hosts(ns)
    ns.singularity.connect("home")
}

export function transfer_script(ns, script_name, force=true) {
    return function (dest) {
        let source = ns.getHostname()
        if (force) {
            ns.scriptKill(script_name, dest)
            if (dest != source) {ns.rm(script_name, dest)}
        }
        if (!ns.fileExists(script_name, dest)) {
            if (!ns.scp(script_name, dest, source)) {
                ns.tprintf("File copy failed!")
                return false
            }
            else {
                ns.tprintf("%s copied to %s!", script_name, dest)
            }
        }
        return true
    }
}

export function buy_servers(ns, min_ram_amount=64) {
    let purchased = ns.getPurchasedServers()
    let num_hosts = purchased.length
    let serv_limit = ns.getPurchasedServerLimit()
    let money = ns.getServerMoneyAvailable("home")
    if (num_hosts < serv_limit) {
        // buy as many as we can at the moment
        //ns.tprint(money / ns.getPurchasedServerCost(min_ram_amount))
        let to_buy = Math.floor(money / ns.getPurchasedServerCost(min_ram_amount))
        // we have num_hosts servers, with a serv_limit max (e.g. 5 servers out of 25)
        // we can afford to_buy number of servers
        // so, buy min(to_buy, serv_limit-num_hosts) servers
        let can_buy = Math.min(to_buy, serv_limit - num_hosts)
        for (let i = can_buy; i--;) {
            let server_num = num_hosts + 1 + i
            ns.purchaseServer("pserv-" + server_num, min_ram_amount)
            ns.tprintf("Bought server pserv-%d with %d ram.",server_num, min_ram_amount)
        }
    }
    return purchased
}

export function transfer_scripts(ns, host, force=false) {
    scripts.map(script => transfer_script(ns, script, force)(host))
}

export function run_hacks(ns, target) {
    let target_server = ns.getServer(target)
    if (!target_server.sshPortOpen && ns.fileExists("BruteSSH.exe", "home")) {ns.brutessh(target)}
    if (!target_server.ftpPortOpen && ns.fileExists("FTPCrack.exe", "home")) {ns.ftpcrack(target)}
    if (!target_server.smtpPortOpen && ns.fileExists("relaySMTP.exe", "home")) {ns.relaysmtp(target)}
    if (!target_server.httpPortOpen && ns.fileExists("HTTPWorm.exe", "home")) {ns.httpworm(target)}
    if (!target_server.sqlPortOpen && ns.fileExists("SQLInject.exe", "home")) {ns.sqlinject(target)}
    if (target_server.numOpenPortsRequired <= target_server.openPortCount && !target_server.hasAdminRights) {
        ns.tprintf("Nuking %s", target)
        ns.nuke(target)
        return target
    }
    return 0
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