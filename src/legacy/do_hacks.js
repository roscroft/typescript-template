/** @param {NS} ns */
import {run_progs, my_servers} from "./servers.js"
import {hack_batch} from "./hack_batcher.js"

export async function main(ns) {
    let force_kill = ns.args[0]
    
    let hosts = run_progs(ns)
    let best_target = hosts[hosts.length-1]
    ns.tprintf("Best target found: %s", best_target)

    let pids = new Map()
    let base_ram_amount = 16
    let owned_servers = [...my_servers(ns, base_ram_amount)]

    for (let hacker of hosts) {
        pids[hacker] = await run_max_hacks(ns, hacker, hacker, force_kill)
    }
    for (let hacker of owned_servers) {
        pids[hacker] = await run_max_hacks(ns, best_target, hacker, force_kill)
    }
    pids['home'] = await run_max_hacks(ns, best_target, 'home', false)

    //ns.tprintf("Hacks running: %d/%d", Object.entries(pids).filter(entry => entry[1]!=0).length, Object.keys(pids).length)
    //ns.tprint(pids)
}

export async function run_max_hacks(ns, hackee, hacker, force=false) {
    let source = ns.getHostname()
    let script_name = "local_hack_handler.js"
    let files_placed = place_files(ns, script_name, hacker, source, force)
    if (files_placed) {
        return hack_batch(ns, hackee, hacker)
    }
    else {
        ns.tprintf("Skipping %s", hacker)
    }
}