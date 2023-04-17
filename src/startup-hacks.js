/** @param {NS} ns */
import {get_hosts} from "./network-manager.js"

export function main(ns) {
    let hosts = get_hosts(ns).map(host => host.hostname)
    let new_hacks = hosts.reduce((acc, host) => {
        let hacks_worked = run_hacks(ns, host)
        if (hacks_worked != 0) return acc.concat(host)
        return acc
    },[])
    ns.tprintf("Newly hacked servers: %d", new_hacks.length)
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