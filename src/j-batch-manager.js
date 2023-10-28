/** @param {NS} ns */
import { get_period_and_depth, get_delays, get_times, get_needed, action_needed, calc_threads, ram_used, get_available_ram, best_money_and_threads } from "./j-batcher.js"
import { get_hack_hosts } from "./network-manager.js"

const scripts = ["j-weaken.js", "j-weaken.js", "j-grow.js", "j-hack.js"]

export async function main(ns) {
    let target = "n00dles"
    let hacker = "home"
    while (true) {
        //let available_ram_list = get_host_caps(ns, scripts)
        let times = get_times(ns, target)
        let [period, depth] = get_period_and_depth(...times)
        let delays = get_delays(period, depth, ...times)
        let needed = get_needed(ns, target)
        let best = best_money_and_threads(ns, target, hacker, needed[3])
        ns.tprintf("Best thread count: %s. Dollars per unit RAM: %.2f", ...best)
        let threads_to_dispatch = calc_threads(ns, target, hacker, best[0])
        let ram_to_dispatch = ram_used(ns, threads_to_dispatch)*depth
        ns.tprint(threads_to_dispatch)
        ns.tprintf("Total RAM cost: %d", ram_to_dispatch)

        for (let i = 0; i < depth; ++i) {
            for (let j=0; j<4; ++j) {
                dispatch_to(ns, target, scripts[j], threads_to_dispatch[j], delays[j], i)(hacker)
            }
            await ns.sleep(period)
        }
    }
}

function dispatch_to(ns, target, script, threads, delay, ind) {
    return function (hacker) {
        ns.exec(script, hacker, threads, target, threads, delay, ind)
    }
}

export function get_host_caps(ns, scripts) {
    return get_hack_hosts(ns).reduce((acc, host) => {
        let name = host.hostname
        let threads = Math.floor(get_available_ram(ns, name) / get_script_ram(ns, scripts))
        return threads >= 6 ? acc.concat([[name, threads]]) : acc
    }, []).sort((a, b) => b[1] - a[1])
}

export function get_script_ram(ns, scripts) {
    return scripts.map(a => ns.getScriptRam(a)).reduce((a, b) => Math.max(a, b), 0)
}