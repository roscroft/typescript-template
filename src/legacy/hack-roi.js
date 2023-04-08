/** @param {NS} ns */
import {get_hosts, get_ram} from "./network-manager.js" 
export async function get_times(ns, target, threads_available) {
    let cores_available = 1
    let weaken_amt = 0.05
    let growth_sec_fac = 0.004
    //let hack_threshes = [0.9, 0.8, 0.75, 0.7, 0.67, 0.6, 0.5]
    let hack_thresh = 0.9
    let growth_amt = 1/hack_thresh 
    let max_money = ns.getServerMaxMoney(target)
    let money_available = ns.getServerMoneyAvailable(target)
    let hack_thresh_avail = money_available*(1-hack_thresh)

    let growth_amt_thresh = growth_amt
    let growth_amt_max = max_money/(money_available+1)

    let hacks_required_avail = Math.floor(ns.hackAnalyzeThreads(target, hack_thresh_avail))
    let weakens_hack_avail = Math.ceil(ns.hackAnalyzeSecurity(hacks_required_avail, target)/weaken_amt)

    let growth_req_thresh = Math.ceil(ns.growthAnalyze(target, growth_amt_thresh, cores_available))
    let weakens_growth_avail = Math.ceil((growth_req_thresh*growth_sec_fac)/weaken_amt)
    //let growth_req_max = Math.ceil(ns.growthAnalyze(target, growth_amt_max, cores_available))
    //let weakens_growth_max = Math.ceil((growth_req_max*growth_sec_fac)/weaken_amt)

        //let hack_time = time_needed(ns, threads_available)("hack")
        //let grow_time = time_needed(ns, threads_available)("grow")
        //let weaken_time = time_needed(ns, threads_available)("weaken")

        //ns.tprint("========================================================")
        //ns.tprintf("Threads: %d, Money threshold: %f, Growth multiplier: %f", threads_available, hack_thresh, growth_amt)
        //ns.tprintf("Hacks: %d, Time: %f minutes, Weakens: %d, Time: %f minutes",hacks_required_avail, hack_time(hacks_required_avail), weakens_hack_avail, weaken_time(weakens_hack_avail))
        //ns.tprintf("Grows: %d, Time: %f minutes, Weakens: %d, Time: %f minutes", growth_req_thresh, grow_time(growth_req_thresh), weakens_growth_avail, weaken_time(weakens_growth_avail))
        //ns.tprintf("Max Grows: %d, Time: %f mins, Weakens: %d, Time: %f minutes", growth_req_max, grow_time(growth_req_max), weakens_growth_max, weaken_time(weakens_growth_max))

    return [growth_req_thresh, weakens_growth_avail, hacks_required_avail, weakens_hack_avail].map(val => Math.max(1,Math.floor(val/threads_available)))
}

export function get_hack_thresh(ns, target, desired_grow_iterations) {
    // binary search! slightly underestimates the hacking threshold.
    ns.tprintf("Target: %s", target.hostname)
    let cores_available = 1
    let [used_ram, max_ram] = get_ram(get_hosts(ns))
    let available_threads = (0.8*(max_ram - used_ram))/ns.getScriptRam("grow.js")

    function binary_search(ns, goal, lb, ub) {
        let search = (ub+lb)/2
        let search_result = ns.growthAnalyze(target.hostname, 1/search, cores_available)/available_threads
        ns.tprintf("Checking hack factor: %f. Requires %f cycles. Looking for %f", search, search_result, goal)
        if (ub-lb <= 0.001 || 0.01 > search || search > 0.99) {
            return search
        }
        if (search_result > goal) {
            return binary_search(ns, goal, search, ub)
        } else if (goal > search_result) {
            return binary_search(ns, goal, lb, search)
        } else {
            return search
        }
    }
    let search = binary_search(ns, desired_grow_iterations, 0, 1)
    ns.tprintf("Selected hack threshold: %f", search)
    return search
}

export async function main(ns) {
    let target = ns.getServer("n00dles")
    let script_ram = ns.getScriptRam("grow.js")
    return get_hack_thresh(ns, target, 2)
} 

function time_needed(ns, available_threads) {
    return function(action) {
            return function(threads_needed) {
            let action_fn = null
            if (action == "grow") {
                action_fn = ns.getGrowTime()
            } else if (action == "hack") {
                action_fn = ns.getHackTime()
            } else if (action == "weaken") {
                action_fn = ns.getWeakenTime()
            }
            return action_fn*Math.max(1,Math.floor(threads_needed/available_threads))/60000
        }
    }
}