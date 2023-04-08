/** @param {NS} ns */
import { get_targets, get_hack_hosts } from "./network-manager.js"
import { find_target } from "./find-target.js"
import {setup} from "./setup.js"

export async function dispatch(ns, script, host, script_threads, target, action_threads, wait, batch) {
    if (script_threads > 0) {
        let success = await ns.exec(script, host, script_threads, target, action_threads, wait, batch)
        if (success) {return success}
        else {ns.tprintf("Unnsuccessful call of script %s on host %s.", script, host)}
    }
    return 0
}

export function get_growth_amt(ns, target) {
    let cur_money = ns.getServerMoneyAvailable(target)
    let max_money = ns.getServerMaxMoney(target)
    return cur_money == 0 ? max_money : max_money / cur_money
}

export function get_script_ram(ns, action=null) {
    let script_name = "b-"+action+".js"
    let scripts = ["b-hack.js", "b-weaken.js", "b-grow.js"]
    if (action) {
        return ns.getScriptRam(script_name)
    } else {
        return scripts.map(a => ns.getScriptRam(a)).reduce((a, b) => Math.max(a, b), 0)
    }
}

export function get_weakens_left(ns, target, weaken_factor) {
    return (ns.getServerSecurityLevel(target) - ns.getServerMinSecurityLevel(target)) / base_weaken_fac
}

export async function main(ns) {

    let target = ns.args[0] ? ns.args[0] : find_target(ns)
    let home = "home"
    let home_ram_factor = 0.60 // limit it to 90% home ram usage!
    let away_ram_factor = 1 // remote servers get full utilization
    let base_weaken_fac = 0.05
    let script_ram = get_script_ram(ns)
    let weakens_to_start_growth = get_weakens_left(ns, target, base_weaken_fac)
    ns.tprintf("Predicting %d weakens before growth starts.", weakens_to_start_growth)
    let cur_sec = ns.getServerSecurityLevel(target)
    script_ram = ["b-weaken.js"].map(a => ns.getScriptRam(a)).reduce((a, b) => Math.max(a, b), 0)
    while (cur_sec > ns.getServerMinSecurityLevel(target)) {
        // we can kind of just throw the entire kitchen sink at the problem. Who cares if we're burning excess ram for now
        let weaken_time = ns.getWeakenTime(target)
        let cycle_weakens = 0
        let hackers = get_hack_hosts(ns).map(host => host.hostname)
        for (let hacker of hackers) {
            let ram_factor = hacker == home ? home_ram_factor : away_ram_factor
            let hacker_ram = ns.getServerMaxRam(hacker) - ns.getServerUsedRam(hacker)
            let max_threads = Math.floor((hacker_ram * ram_factor)/script_ram)
            if (max_threads < 4) {continue}
            cycle_weakens += max_threads
            //no waiting here; just ship em
            let pid = await dispatch(ns, "b-weaken.js", hacker, max_threads, target, max_threads, 0, 0)
            cur_sec = pid ? cur_sec - ns.weakenAnalyze(max_threads, ns.getServer(hacker).cpuCores) : cur_sec
            await ns.sleep(100)
            if (cur_sec <= ns.getServerMinSecurityLevel(target)) {break}
        }
        let offset_to_next_cycle = (hackers.length-1)*100+weaken_time+100
        weakens_to_start_growth = (cur_sec - ns.getServerMinSecurityLevel(target)) / base_weaken_fac
        ns.tprintf("Predicting %d weakens before growth starts.", weakens_to_start_growth-cycle_weakens)
        ns.tprintf("Waiting %f minutes to start next cycle.", offset_to_next_cycle/60000)
        await ns.sleep(offset_to_next_cycle)
    }
    ns.tprintf("Server %s fully weakened! Stage 2 prep begins.", target)
    let grows_to_start_hacks = Math.ceil(ns.growthAnalyze(target, get_growth_amt(ns, target), 1))
    ns.tprintf("Predicting %d growths before hacking starts.", grows_to_start_hacks)
    // Now we can start the GW cycles
    // Basically we're going to kick off a bunch of G__100 ms__W cycles offset by a bit on each hacker.
    // There's a max grow, but even at 100 servers, that's only 10 extra seconds. DO IT ALL, we don't wait *less*
    
    // here's where batching starts to matter; let's add a 2nd entry to the host name list 
    // and attach the batch number. if capacity exceeds demand (in other words, if the total
    // capacity of the server is more than twice the # threads allocated to it), push something 
    // onto the list that's the same server with an incremented batch #
    script_ram = ["b-weaken.js", "b-grow.js"].map(a => ns.getScriptRam(a)).reduce((a, b) => Math.max(a, b), 0)
    let cur_mon = ns.getServerMoneyAvailable(target)
    while (cur_mon < ns.getServerMaxMoney(target)) {
        // we can kind of just throw the entire kitchen sink at the problem. Who cares if we're burning excess ram for now
        // Find out the max grow/weaken ratio, kick off the weaken, wait a bit, kick off the grows, grow finishes weaken finishes we're prepped for another round if necessary
        let grow_time = ns.getGrowTime(target)
        let weaken_time = ns.getWeakenTime(target)
        let cycle_growths = 0
        let hackers = get_hack_hosts(ns).map(host => host.hostname)
        // run through the list but don't do anything yet, we're just finding out 
        // if there's additional cap space
        let batched_hackers = []
        for (let hacker of hackers) {
            let ram_factor = hacker == home ? home_ram_factor : away_ram_factor
            let hacker_ram = ns.getServerMaxRam(hacker) - ns.getServerUsedRam(hacker)
            let max_threads = Math.floor((hacker_ram * ram_factor)/script_ram)
            if (max_threads < 8) {continue}
            let initial_grows = bin_search(ns, hacker, target, prep_threads, max_threads, 0, max_threads)
            let [gp, wp] = prep_threads(ns, hacker, target, initial_grows)
            let batches_on_server = Math.floor(max_threads/(gp+wp))
            for (let i = 0; i<batches_on_server; i++) {
                batched_hackers.push([hacker, i])
            }
        }
        //ns.tprint(hackers.length)
        //ns.tprint(batched_hackers.length)

        for (let b_hacker of batched_hackers) {
            let hacker = b_hacker[0]
            let batch = b_hacker[1]
            let ram_factor = hacker == home ? home_ram_factor : away_ram_factor
            let hacker_ram = ns.getServerMaxRam(hacker) - ns.getServerUsedRam(hacker)
            let max_threads = Math.floor((hacker_ram * ram_factor)/script_ram)
            //ns.tprintf("Max threads on server %s: %f", hacker, max_threads)
            if (max_threads < 8) {continue}
            let initial_grows = bin_search(ns, hacker, target, prep_threads, max_threads, 0, max_threads)
            let [gp, wp] = prep_threads(ns, hacker, target, initial_grows)
            cycle_growths += gp
            //ns.tprintf("Grows: %d, Weakens: %d", gp, wp)
            let prep_offset_1 = 0
            let prep_offset_2 = prep_offset_1 + weaken_time - grow_time - 100
            //ns.tprintf("Timings: w:%f, g:%f", weaken_time + prep_offset_1, grow_time + prep_offset_2)
            // Weaken
            let prep_pid_1 = await dispatch(ns, "b-weaken.js", hacker, wp, target, wp, prep_offset_1, batch)
            // Grow
            let prep_pid_2 = await dispatch(ns, "b-grow.js", hacker, gp, target, gp, prep_offset_2, batch)
            await ns.sleep(100) // I think this solves the problem with timing? this should batch it?
            if (cycle_growths>=Math.ceil(ns.growthAnalyze(target, get_growth_amt(ns, target), 1))) {break}
        }
        let offset_to_next_cycle = (hackers.length-1)*100+weaken_time+100
        grows_to_start_hacks = Math.ceil(ns.growthAnalyze(target, get_growth_amt(ns, target), 1))
        ns.tprintf("Predicting %d growths left before hacking starts.", grows_to_start_hacks-cycle_growths)
        ns.tprintf("Waiting %f minutes to start next cycle.", offset_to_next_cycle/60000)
        await ns.sleep(offset_to_next_cycle)
        cur_mon = ns.getServerMoneyAvailable(target) // evaluate at the end might save us a cycle
    }
    ns.tprintf("Server %s fully weakened and grown! Hacks begin.", target)
    // connect joesguns; connect CSEC;
    // connect harakiri-sushi; connect zer0; connect silver-helix; connect avmnite-02h
    script_ram = ["b-hack.js", "b-weaken.js", "b-grow.js"].map(a => ns.getScriptRam(a)).reduce((a, b) => Math.max(a, b), 0)
    while (true) {
        run_progs(ns)
        let hack_time = ns.getHackTime(target)
        let grow_time = ns.getGrowTime(target)
        let weaken_time = ns.getWeakenTime(target)

        let batch_cap = Math.floor(weaken_time/800)
        ns.tprintf("Total batches allotable: %d", batch_cap)

        let hacked_amt = 0
        let hackers = get_hack_hosts(ns).map(host => host.hostname)
        let batched_hackers = []
        for (let hacker of hackers) {
            let ram_factor = hacker == home ? home_ram_factor : away_ram_factor
            let hacker_ram = ns.getServerMaxRam(hacker) - ns.getServerUsedRam(hacker)
            let max_threads = Math.floor((hacker_ram * ram_factor)/script_ram)
            if (max_threads < 8) {continue}
            let upper_bound = ns.hackAnalyze(target) * max_threads >= 1 ? Math.floor(1/ns.hackAnalyze(target))-1 : max_threads
            let hack_threads_to_spend = bin_search(ns, hacker, target, calc_threads, max_threads, 0, upper_bound)
            let [h, w1, g, w2] = calc_threads(ns, hacker, target, hack_threads_to_spend)
            let batches_on_server = Math.floor(max_threads/(h+w1+g+w2))
            for (let i = 0; i<batches_on_server; i++) {
                batched_hackers.push([hacker, i])
            }
        }
        ns.tprintf("Expanded from %d hackers to %d batches.", hackers.length, batched_hackers.length)
        //we're actually outpacing our hacking ability. Keep track of the delays; let's cap out at maybe half the weaken time


        let total_alloted_batches = 0
        for (let b_hacker of batched_hackers) {
            if (total_alloted_batches >= batch_cap) {break}
            let hacker = b_hacker[0]
            let batch = b_hacker[1]
            let ram_factor = hacker == home ? home_ram_factor : away_ram_factor
            let hacker_ram = ns.getServerMaxRam(hacker) - ns.getServerUsedRam(hacker)
            let max_threads = Math.floor((hacker_ram * ram_factor)/script_ram)
            //ns.tprint([hacker, batch, ram_factor, hacker_ram, max_threads])
            if (max_threads < 10) {continue}
            //ns.tprintf("Comparing total possible, decided, and max: %f, %f, %f", ns.hackAnalyze(target) * max_threads , Math.floor(1/ns.hackAnalyze(target))-1 , max_threads)
            let upper_bound = ns.hackAnalyze(target) * max_threads >= 1 ? Math.floor(1/ns.hackAnalyze(target))-1 : max_threads
            let hack_threads_to_spend = bin_search(ns, hacker, target, calc_threads, max_threads, 0, upper_bound)
            let [h, w1, g, w2] = calc_threads(ns, hacker, target, hack_threads_to_spend)
            if (h == 0 || w1 == 0 || g == 0 || w2 == 0) {continue}
            //ns.tprintf("Max: %d. Found: %d.", max_threads, (h + w1 + g + w2))
            //ns.tprintf("Thread #s to run: %d, %d, %d, %d. Total: %d", h, w1, g, w2, h + w1 + g + w2)
            //ns.tprintf("Equates to %f ram, out of %d available", (h + w1 + g + w2)*1.75, hacker_ram)
            // Stagger these by 100ms, whatever lol
            // We need these to finish in the order hack, weaken_1, grow, weaken_2
            // go weaken_1, weaken_2, grow, hack
            let offset_1 = 0 // -> weaken_1 is 0ms
            let offset_2 = 400 // weaken_1 -> weaken_2 is 200ms
            let offset_3 = weaken_time - grow_time + 200 // weaken_2 -> grow is weaken_time - 100 - grow_time
            let offset_4 = weaken_time - hack_time - 200  // grow -> hack is grow_time - 200 - hack_time
            //ns.tprint([offset_1, offset_2, offset_3, offset_4])
            //ns.tprintf("Timings: w1:%f, w2:%f, g:%f, h:%f", weaken_time + offset_1, weaken_time + offset_2, grow_time + offset_3, hack_time + offset_4)
            //ns.tprintf("Server security: %f/%f.", ns.getServerSecurityLevel(target), ns.getServerMinSecurityLevel(target))
            //ns.tprintf("Server money: %f/%f.", ns.getServerMoneyAvailable(target), ns.getServerMaxMoney(target))
            // Weaken 1
            let pid_1 = await dispatch(ns, "b-weaken.js", hacker, w1, target, w1, offset_1, batch)
            // Weaken 2
            let pid_2 = await dispatch(ns, "b-weaken.js", hacker, w2, target, w2, offset_2, batch)
            // Grow
            let pid_3 = await dispatch(ns, "b-grow.js", hacker, g, target, g, offset_3, batch)
            // Hack
            let pid_4 = await dispatch(ns, "b-hack.js", hacker, h, target, h, offset_4, batch)
            //ns.tprintf("Pids: %d, %d, %d, %d", pid_1, pid_2, pid_3, pid_4)
            await ns.sleep(200) // I think this solves the problem with timing? this should batch it?
            hacked_amt += ns.hackAnalyzeChance(target)*(ns.hackAnalyze(target)*h*ns.getServerMaxMoney(target))
            total_alloted_batches += 1
        }
        ns.tprintf("Expected money stolen in cycle: %d", hacked_amt)
        ns.tprintf("Batches used: %d/%d (%f). %d remaining.", total_alloted_batches, batched_hackers.length, total_alloted_batches/batched_hackers.length, batched_hackers.length - total_alloted_batches )
        let offset_to_next_cycle = 200+weaken_time+100
        ns.tprintf("Waiting %f minutes to start next cycle.", offset_to_next_cycle/60000)
        await ns.sleep(offset_to_next_cycle)
    }
}

export function prep_threads(ns, hacker, target, grow_threads) {
    // Given a server at min security, what's the biggest grow/weaken batch we can throw at it given thread limits
    let cores = ns.getServer(hacker).cpuCores
    let weaken_fac = ns.weakenAnalyze(1, cores)
    //let cur_money = ns.getServerMoneyAvailable(target)
    //let max_money = ns.getServerMaxMoney(target)
    //let growth_amt = cur_money == 0 ? max_money : max_money / cur_money
    //let growth_threads_needed = Math.ceil(ns.growthAnalyze(target, growth_amt, cores))
    let growth_security_impact = ns.growthAnalyzeSecurity(grow_threads)
    let weaken_threads_to_counteract_growth = Math.ceil(growth_security_impact / weaken_fac)
    return [grow_threads, weaken_threads_to_counteract_growth]
}

export function calc_threads(ns, hacker, target, hack_threads) {
    // escape out the degenerate case of having too many threads
    // idea here is to divide this batch ram up into 4 sections: HWGW
    // each of these will require a different number of threads
    // the relationship between them is:
    // 0. Maximize money and minimize security (can just run the batch until server prepped)
    // 1. Hack
    // 2. Weaken to counteract hackSecurity
    // 3. Grow to counteract hackMoney
    // 4. Weaken to counteract growSecurity
    // this is our goal_fn
    // spend hack_threads on hacking; this gives hackAnalyze*hack_threads % money stolen
    // and stealing x% of y dollars means money goes from y -> y*(1-x)
    // which means the money multiplier to go from y*(1-x) to y => 1/(1-x)
    // so the growth amount is 1/(1-x)
    let cores = ns.getServer(hacker).cpuCores
    let weaken_fac = ns.weakenAnalyze(1, cores)
    let total_threads_to_spend = hack_threads
    // first, we counteract the hack with weaken
    let hack_security_impact = ns.hackAnalyzeSecurity(hack_threads, target)
    let weaken_threads_to_counteract_hack = Math.ceil(hack_security_impact / weaken_fac)
    total_threads_to_spend = total_threads_to_spend + weaken_threads_to_counteract_hack
    // next, we grow to counteract the hack
    // can't steal more than 100% of the money
    let money_stolen_pct = ns.hackAnalyze(target) * hack_threads
    //ns.tprintf("Using %d threads steals %f percent of server money.", hack_threads, money_stolen_pct)
    let growth_amt = 1 / (1 - money_stolen_pct)
    let growth_threads_to_counteract_hack = Math.ceil(ns.growthAnalyze(target, growth_amt, cores))
    total_threads_to_spend = total_threads_to_spend + growth_threads_to_counteract_hack
    let growth_security_impact = ns.growthAnalyzeSecurity(growth_threads_to_counteract_hack)
    let weaken_threads_to_counteract_growth = Math.max(1, Math.ceil(growth_security_impact / weaken_fac))
    total_threads_to_spend = total_threads_to_spend + weaken_threads_to_counteract_growth
    //ns.tprintf("Threads spent: %d hacks, %d weakens, %d grows, %d weakens.", hack_threads, weaken_threads_to_counteract_hack, growth_threads_to_counteract_hack, weaken_threads_to_counteract_growth)
    return [hack_threads, weaken_threads_to_counteract_hack, growth_threads_to_counteract_hack, weaken_threads_to_counteract_growth]
}

export function bin_search(ns, hacker, target, goal_fn, goal, lb, ub) {
    let search = Math.floor((lb + ub) / 2) // starting search val
    let search_val = goal_fn(ns, hacker, target, search).reduce((acc, next) => acc + next) // apply the function
    //ns.tprintf("search: %f, search_val: %f, goal: %f, lb: %f, ub: %f", search, search_val, goal, lb, ub)
    if (search_val > goal) {
        if (ub <= lb || Math.abs(ub - lb) < 2) {
            return bin_search(ns, hacker, target, goal_fn, goal, Math.min(lb,ub)-1, search - 1)
        } else{
            return bin_search(ns, hacker, target, goal_fn, goal, lb, search - 1)
        }
    } else {
        if (search_val == goal || Math.abs(ub - lb) <= 2 || Math.abs(search_val - goal) <= 0.01) {
            return search
        }
        else {
            return bin_search(ns, hacker, target, goal_fn, goal, search, ub)
        }
    }
}