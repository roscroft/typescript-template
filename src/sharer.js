/** @param {NS} ns */
import { get_hosts } from "./network-manager.js"
import {transfer_script} from "./setup.js"

export async function main(ns) {
    // pserv-2 thru pserv-25
    let hosts = get_hosts(ns)
    hosts = hosts.map(host => host.hostname)
    hosts = hosts.filter(host => host != "home" && host != "pserv-1")
    hosts.forEach(function (host) {
        let avail_ram = ns.getServerMaxRam(host)-ns.getServerUsedRam(host)
        let max_calls = Math.floor(avail_ram/ns.getScriptRam("sharing.js"))
        if (max_calls > 0) {
            transfer_script(ns, "sharing.js", true)(host)
            ns.exec("sharing.js", host, max_calls)
        }
    })
}