/** @param {NS} ns */
import * as netmn from "./network-manager.js"
import * as roi from "./hack-roi.js"
import {run_progs, buy_servers} from "./servers.js"
import {find_target} from "./find-target.js"

export async function main(ns) {
    let target = null
    let arg0 = ns.args[0]
    let arg1 = ns.args[1]
    if (arg0 == "targets" || arg0 == "best") {
        target = arg1 ? find_target(ns, arg1) : find_target(ns, 1)
        if (arg0 == "targets") {return}
    }
    else {
        target = arg0 ? ns.getServer(arg0) : find_target(ns, 10)
    }
    let hack_thresh = roi.get_hack_thresh(ns, target, 2)
    ns.tprintf("Chose target %s with hack threshold %f.", target.hostname, hack_thresh)
    //let kill_scripts = ns.args[1] ? true : false
    
    while(true) {
        run_progs(ns)
        buy_servers(ns)
        if (target.hackDifficulty > (1.01*target.minDifficulty)) {
            target = await weaken_wrapper(ns, target)
        } else if (target.moneyAvailable < (0.99 * target.moneyMax)) {
            target = await grow_wrapper(ns, target)
        } else {
            target = await hack_wrapper(ns, target, hack_thresh)
        }
        ns.tprintf("Server current money: %f. Server max money: %f.", target.moneyAvailable, target.moneyMax)
        ns.tprintf("Server current security: %f. Server min security: %f.", target.hackDifficulty, target.minDifficulty)
    }
}

export async function weaken_wrapper(ns, target) {
    function get_weakening_needed(ns, target) {
        let weaken_amount = Math.ceil((target.hackDifficulty - target.minDifficulty)/0.05)
        return [weaken_amount, ns.getWeakenTime(target.hostname)]
    }
    return await do_action(ns, target, get_weakening_needed, "weaken")
}

export async function grow_wrapper(ns, target) {
    function get_growth_needed(ns, target) {
        let grow_fac = (target.moneyMax / Math.max(target.moneyAvailable, 1))
        return [Math.ceil(ns.growthAnalyze(target.hostname, grow_fac)), ns.getGrowTime(target.hostname)]
    }
    return await do_action(ns, target, get_growth_needed, "grow")
}

export async function hack_wrapper(ns, target, hack_thresh) {
    function get_hacks_possible(ns, target) {
        //damn this one's kinda hard. whatever
        let to_steal =  target.moneyAvailable*(1-hack_thresh)
        ns.tprintf("Money stolen: %f", to_steal)
        return [Math.floor(Math.max(1,ns.hackAnalyzeThreads(target.hostname, to_steal))), ns.getHackTime(target.hostname)]
    }
    return await do_action(ns, target, get_hacks_possible, "hack")
}

export async function do_action(ns, target, get_action_needed, action_name) {
    let [amount, time] = get_action_needed(ns, target)
    let threads_left = await allocate_resources(ns, amount, target, action_name)
    //ns.tprintf("Threads left: %d", threads_left)
    ns.tprintf("Waiting for %s to finish: %f minutes.", action_name, time/60000)
    await ns.sleep(time)
    ns.tprintf("%d threads left.", threads_left)
    return netmn.refresh(ns, target.hostname)
}

export function get_available_ram(ns, kill_scripts) {
    // identify network stats
    let host_list = netmn.get_hosts(ns)
    let [used_ram, max_ram] = netmn.get_ram(host_list)
    let available = max_ram - used_ram
    // add additional option to wipe out all running scripts
    if (kill_scripts) {
        netmn.kill_scripts(ns, host_list)
        available = max_ram
    }
    return available
}

export async function allocate_resources(ns, threads_needed, target, action) {
    let valid_hosts = [...netmn.get_hosts(ns).filter(host => host.hasAdminRights), netmn.refresh(ns, 'home')]
    let script_name = action + ".js"
    let curr_transfer = transfer_script(ns, script_name, false) // change to true if we change the script
    let threads_to_go = threads_needed
    let script_ram = ns.getScriptRam(script_name)
    //let available_ram = get_available_ram(ns, kill_scripts)
    for (let host of valid_hosts) {
        curr_transfer(host.hostname) // copy the files over
        let threads_to_allocate_to_host = Math.min(Math.floor((host.maxRam - host.ramUsed)/script_ram), threads_to_go)
        if (threads_to_allocate_to_host > 0) {
            //ns.tprintf("Allocating %f threads to host %s.", threads_to_allocate_to_host, host.hostname)
            let success = await ns.exec(script_name, host.hostname, threads_to_allocate_to_host, target.hostname, threads_to_allocate_to_host)
            if (success) {
                threads_to_go -= threads_to_allocate_to_host
                //ns.tprintf("Successfully running script %s on host %s!", script_name, host.hostname)
            }
            else {ns.tprintf("Unnsuccessful call of script %s on host %s.", script_name, host.hostname)}
        }
        if (threads_to_go <= 0) {
            return threads_to_go
        }
    }
    ns.tprintf("Allocated threads: %d", threads_needed-threads_to_go)
    //ns.tprintf("Remaining threads necessary after allocation: %d", threads_to_go)
    return threads_to_go
}