/** @param {NS} ns */
import * as netmn from "./network-manager.js"
import {run_progs, buy_servers} from "./servers.js"

export async function main(ns) {
    let target = ns.args[0]
    let prepped = false

    while(!prepped) {
        run_progs(ns)
        buy_servers(ns)
        if (ns.getServerSecurityLevel(target) > (1.001*ns.getServerMinSecurityLevel(target))) {
            await weaken_wrapper(ns, target)
        } else if (ns.getServerMoneyAvailable(target) < (0.999 * ns.getServerMaxMoney(target))) {
            await grow_wrapper(ns, target)
        } else {
            prepped = true
        }
        ns.tprintf("Server security: %f/%f.", ns.getServerSecurityLevel(target), ns.getServerMinSecurityLevel(target))
        ns.tprintf("Server money: %f/%f.", ns.getServerMoneyAvailable(target), ns.getServerMaxMoney(target))
    }
    ns.tprintf("Server %s prepped!!!!", target)
    
    if (!ns.getRunningScript("batcher.js", "home", target)) {
        ns.spawn("batcher.js", 1, target)
    }
}

export async function weaken_wrapper(ns, target) {
    function get_weakening_needed(ns, target) {
        let weaken_amount = Math.ceil((ns.getServerSecurityLevel(target) - ns.getServerMinSecurityLevel(target))/0.05)
        return [weaken_amount, ns.getWeakenTime(target)]
    }
    return await do_action(ns, target, get_weakening_needed, "weaken")
}

export async function grow_wrapper(ns, target) {
    function get_growth_needed(ns, target) {
        let grow_fac = (ns.getServerMaxMoney(target) / Math.max(ns.getServerMoneyAvailable(target), 1))
        return [Math.ceil(ns.growthAnalyze(target, grow_fac)), ns.getGrowTime(target)]
    }
    return await do_action(ns, target, get_growth_needed, "grow")
}

export async function do_action(ns, target, get_action_needed, action_name) {
    let [amount, time] = get_action_needed(ns, target)
    let threads_left = await allocate_resources(ns, amount, target, action_name)
    //ns.tprintf("Threads left: %d", threads_left)
    ns.tprintf("Waiting for %s to finish: %f minutes.", action_name, time/60000)
    await ns.sleep(time)
    ns.tprintf("%d threads left.", threads_left)
    return 1
}

export async function allocate_resources(ns, threads_needed, target, action) {
    let valid_hosts = [...netmn.get_hosts(ns).filter(host => host.hasAdminRights), ns.getServer("home")]
    let script_name = "b-" + action + ".js"
    let curr_transfer = transfer_script(ns, script_name, false) // change to true if we change the script
    let threads_to_go = threads_needed
    let script_ram = ns.getScriptRam(script_name)
    for (let host of valid_hosts) {
        curr_transfer(host.hostname)
        let threads_to_allocate_to_host = Math.min(Math.floor((host.maxRam - host.ramUsed)/script_ram), threads_to_go)
        if (threads_to_allocate_to_host > 0) {
            let success = await ns.exec(script_name, host.hostname, threads_to_allocate_to_host, target, threads_to_allocate_to_host, 0)
            if (success) {threads_to_go = threads_to_go - threads_to_allocate_to_host}
            else {ns.tprintf("Unnsuccessful call of script %s on host %s.", script_name, host.hostname)}
        }
        if (threads_to_go <= 0) {return threads_to_go}
    }
    ns.tprintf("Allocated threads: %d", threads_needed-threads_to_go)
    return threads_to_go
}

export function transfer_script(ns, script_name, force) {
    return function (dest) {
        let source = ns.getHostname()
        if (force) {
            ns.scriptKill(script_name, dest)
            if (dest != source) {ns.rm(script_name, dest)}
        }
        if (!ns.fileExists(script_name, dest)) {
            if (ns.scp(script_name, dest, source)) {
                ns.tprintf("%s copied to %s!", script_name, dest)
                return true
            }
            else {
                ns.tprintf("File copy failed!")
                return false
            }
        }
        return true
    }
}