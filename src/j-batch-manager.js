/** @param {NS} ns */
import { get_period_and_depth, get_delays, get_times, get_needed, action_needed, calc_threads, ram_used, get_available_ram } from "./j-batcher.js"

export async function main(ns) {
    let target = "n00dles"
    let hacker = "home"
    //while (true) {
        let times = get_times(ns, target)
        let [period, depth] = get_period_and_depth(...times)
        let delays = get_delays(period, depth, ...times)
        //ns.tprint(delays)
        //ns.tprintf("Period: %s, Depth: %s.", period, depth)
        let needed = get_needed(ns, target)
        let action = action_needed(needed)
        //ns.tprint(action_needed(needed))
        //let hosts = [hacker]
        //let available_ram = hosts.map(host => get_available_ram(ns, host))
        //ns.tprint(available_ram)
        //let available_ram = 1641 // real number i got from home
        ns.tprint(needed)
        let threads = calc_threads(ns, target, hacker, needed)
        ns.tprint(threads)
        ns.tprint(ram_used(ns, threads))
    //    await ns.sleep(10000)
    //}
}

/**
 * what's the best batch size?
 * the best size is the one that maximizes our return, per ram
 * 
 * we fix # batches / cycle and # cycles / sec
 * so now we need money / RAM and RAM / batch
 * 
 */