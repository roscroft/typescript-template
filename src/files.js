/** @param {NS} ns */
import {get_hosts} from "./network-manager.js"

export async function main(ns) {
    let ext = ns.args[0]
    let hosts = get_hosts(ns)
    hosts = hosts.map(host => [host.hostname, ns.ls(host.hostname).filter(file => ["b-grow.js", "b-hack.js", "b-weaken.js"].indexOf(file) == -1)]).filter(host_info => host_info[1].length>0)
    hosts = hosts.filter(host_info => host_info[1].filter(file => !file.endsWith(".js")).length>0)
    hosts.map(host => ns.tprint(host))
}