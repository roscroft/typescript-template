/** @param {NS} ns */
import {get_times} from "./hack-roi.js"

export async function main(ns) {
    let target = ns.args[0]
    await hack_batch(ns, target)
}

export async function script_max_threads(ns, script_to_analyze, host) {
    let max_ram = ns.getServerMaxRam(host)
    let used_ram = ns.getServerUsedRam(host)
    let script_ram = ns.getScriptRam(script_to_analyze)
    //ns.tprintf("Max RAM: %d, Used RAM: %d, Script RAM: %d", max_ram, used_ram, script_ram)
	return Math.floor((max_ram - used_ram) / script_ram)
}

export async function hack_batch(ns, hackee, hacker) {
    // ok so we're looking at a hackee and a hacker
    // assume it has ram and all the files it needs
    let remote_handler = 'local_hack_handler.js'
    let max_threads = await script_max_threads(ns, remote_handler, hacker)
    //ns.tprintf("Max threads possible: %d",max_threads)
    if (max_threads <= 0) {return 0}
    let to_run = await get_times(ns, hackee, max_threads) // array len 4
    let pid = await ns.exec(remote_handler, hacker, max_threads, hackee, ...to_run)
    if (pid == 0) {
        ns.tprintf("Script start failed! Good luck.")
    }
    else {
        ns.tprintf("Script start successful!")
        ns.tprintf("Script %s now running on %s against %s with %d threads!", remote_handler, hacker, hackee, max_threads)
    }
    return pid
}