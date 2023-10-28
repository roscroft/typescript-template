/** @param {NS} ns */
import { get_target_names, get_hack_hosts } from "./network-manager.js"
const home = "home"
const home_ram_factor = 0.90 // limit it to 90% home ram usage!
const away_ram_factor = 1 // remote servers get full utilization
const interval = 500
const scripts = ["b-weaken.js", "b-weaken.js", "b-grow.js", "b-hack.js"]
// TODO: flags for startup, try/catch block for sizes
//const startup_scripts = ["startup-hacks.js", "startup-singularity-backdoors.js", "startup-singularity-buys.js", "startup-transfer-scripts.js"]
let max_money_map = new Map()

function get_host_caps(ns, scripts) {
    return get_hack_hosts(ns).reduce((acc, host) => {
        let name = host.hostname
        let threads = Math.floor(get_available_ram(ns, name) / get_script_ram(ns, scripts))
        return threads >= 6 ? acc.concat([[name, threads]]) : acc
    }, []).sort((a, b) => b[1] - a[1])
}

export async function main(ns) {
    while (true) {
        let targets = get_target_names(ns).sort((a,b) => ns.getServerMaxMoney(b)-ns.getServerMaxMoney(a))
        let sleep_time = 0
        let hosts = get_host_caps(ns, scripts).filter(host => host[0] == "home") // run only on home for now
        let all_execs = targets.reduce((acc, tgt) => {
            let [execs, new_hosts] = execs_on_target(ns, tgt, hosts)
            if (execs.length > 0) {
                hosts = new_hosts
                //let wait = get_times(ns, tgt)[0] + execs.reduce((a, n) => Math.max(a, n[5]), 0)
                //sleep_time = sleep_time > wait ? sleep_time : wait
                return [...acc, ...execs]
            }
            return acc
        }, [])
        let all_pids = all_execs.map(exec_ => do_execs(ns, exec_))
        //await ns.sleep(sleep_time + interval * 4)
    }
}

function execs_on_target(ns, target, hosts) {
    let times = get_times(ns, target)
    let needed = get_needed(ns, target)
    let action = "hacks"
    if (needed[0] > 0) {action = "weakens"}
    else if (needed[2] > 0) {action = "grows"}
    let [call_data, fn] = get_action(action, times)
    let [batch_length, _, __, n_ind] = call_data
    let call_cap = needed[n_ind]
    let dispatches = get_dispatches(hosts, Math.floor(1/ns.hackAnalyze(target))-1, thread_fn_wrapper(fn)(ns, target))
    let execs = build_execs(target, dispatches, call_cap, ...call_data)
    let new_hosts = reduce_cap_space(hosts, execs)
    if (execs.length > 0) {
        ns.tprintf("Server %s needs %s! Predicting %d %s at %.2f minutes per cycle.", target, action, call_cap, action, times[0]/60000)
        ns.tprintf("Threads: %d. Batches: %d. $%f/sec when hacked.", execs.length, execs.length/(batch_length/interval), set_money(ns, target, execs))
    }
    return [execs, new_hosts]
}

function reduce_cap_space(hosts, execs) {
    return hosts.map(host => [host[0], host[1]-execs.filter(exec_ => exec_[1] == host[0]).reduce((acc, next) => acc + next[2], 0)])
}

function set_money(ns, target, execs) {
    let old = max_money_map.get(target) ? max_money_map.get(target) : 0
    let total_hacks_per_cycle = execs.reduce((acc, next) => acc + next[2], 0)
    let money_per_hack = ns.getServerMaxMoney(target) * ns.hackAnalyze(target) * ns.hackAnalyzeChance(target)
    let cycles_per_second = 1 / (get_times(ns, target)[0]/1000)
    let total_threads_available = sum(execs.map(exec_ => exec_[2]))
    let time_to_value = Math.max(get_time_to_value(ns, target, total_threads_available),1)
    let new_ = (total_hacks_per_cycle * money_per_hack * cycles_per_second)//time_to_value
    if (old < new_) {
        ns.tprintf("Updating max money/sec for server %s from %f to %f.", target, old, new_)
        max_money_map.set(target, new_)
    }
    return new_
}

function do_execs(ns, exec_args) {
    let [script, hacker, thread, target, thread_, offset, batch, to_write] = exec_args
    let pid = ns.exec(...exec_args)
    if (pid == 0) {ns.tprintf("Unsuccessful call of script %s on host %s.", script, hacker)}
    return pid
}

function build_execs(target, dispatches, call_cap, batch_length, batch_cap, offset, n_ind) {
    function recurse_through_dispatches(r_dispatches, r_offset, thread_ct, batch_ct) {
        if (r_dispatches.length == 0 || thread_ct >= call_cap || batch_ct >= batch_cap) {return []} // base case: empty array, return everything left
        else { // Last case: we have more threads to call
            let [next, ...rest] = r_dispatches
            let [hacker, batch, server_threads] = next // unpack
            let new_offset = r_offset.map(off => off + batch_length)
            let rest_disps = recurse_through_dispatches(rest, new_offset, thread_ct + server_threads[n_ind], batch_ct + 1)
            let exec_ = server_threads.reduce((acc, thread, ind) => {
                    if (thread > 0) {
                        return acc.concat([[scripts[ind], hacker, thread, target, thread, r_offset[ind], batch, ind==0&&rest_disps.length == 0]]) //(ind == 0 && to_write) ? 1 : 0
                    }
                    return acc
                },[])
            return [...exec_, ...rest_disps]
        }
    }
    return recurse_through_dispatches(dispatches, offset, 0, 0)
}

function thread_search(cur_fn, goal, min, max) {
    let search = Math.floor((min + max) / 2)
    let threads = cur_fn(search)
    if (sum(threads) == goal || Math.abs(search - min) <= 1) { return threads }
    else if (sum(threads) < goal) { return thread_search(cur_fn, goal, search, max) }
    else { return thread_search(cur_fn, goal, min, search) }
}

function get_dispatches(hosts, max_batch_threads, thread_fn) {
    let dispatches = []
    hosts.map(host => {
        let [hacker, max_server_threads] = host
        let server_threads = thread_search(thread_fn(hacker), max_server_threads, 1, max_batch_threads)
        let server_batches = Math.floor(max_server_threads / sum(server_threads))
        for (let i = 0; i < server_batches; i++) {
            dispatches.push([hacker, i, server_threads])
        }
    })
    return dispatches
}

function get_action(action, times) {
    let [weaken_time, _, grow_time, hack_time] = times
    let batch_lengths = {"weakens":interval, "grows":2*interval, "hacks":4*interval}
    let batch_cap = Math.floor((weaken_time - interval) / batch_lengths[action])
    let offsets = {
        "weakens":[0,0,0,0],
        "grows":[0, 0, weaken_time - grow_time - interval, 0],
        "hacks":[0, 2 * interval, weaken_time - grow_time + interval, weaken_time - hack_time - interval]
    }
    let action_inds = {"weakens":0, "grows":2, "hacks":3}
    let fns = {"weakens":weaken_threads, "grows":prep_threads, "hacks":calc_threads}
    return [[batch_lengths[action], batch_cap, offsets[action], action_inds[action]], fns[action]]
}

function thread_fn_wrapper(thread_fn) {
    return function (ns, target) {
        return function (hacker) {
            return function (thread_ct) {
                return thread_fn(ns, target, hacker, thread_ct)
            }
        }
    }
}

function weaken_threads(ns, target, hacker, max_threads) {
    let cores = ns.getServer(hacker).cpuCores
    let threads = [0, 0, 0, 0]
    threads[3] = 0
    threads[2] = 0
    threads[0] = Math.ceil((ns.getServerSecurityLevel(target) - ns.getServerMinSecurityLevel(target)) / ns.weakenAnalyze(1, cores))
    return threads
}

function prep_threads(ns, target, hacker, grow_threads) {
    let cores = ns.getServer(hacker).cpuCores
    let threads = [0, 0, 0, 0]
    threads[3] = 0
    threads[2] = grow_threads
    threads[1] = 0
    threads[0] = Math.ceil(ns.growthAnalyzeSecurity(grow_threads) / ns.weakenAnalyze(1, cores) * 1.1)
    return threads
}

function calc_threads(ns, target, hacker, hack_threads) {
    let cores = ns.getServer(hacker).cpuCores
    let threads = [0, 0, 0, 0]
    threads[3] = hack_threads
    threads[2] = Math.ceil(ns.growthAnalyze(target, 1 / (1 - (ns.hackAnalyze(target) * threads[3])), cores) * 1.1)
    threads[1] = Math.ceil(ns.growthAnalyzeSecurity(threads[2]) / ns.weakenAnalyze(1, cores) * 1.1)
    threads[0] = Math.ceil(ns.hackAnalyzeSecurity(threads[3], target) / ns.weakenAnalyze(1, cores) * 1.1)
    return threads
}

export function sum(arr) {
    return arr.reduce((a, b) => a + b)
}

export function get_available_ram(ns, hacker) {
    return (ns.getServerMaxRam(hacker) - ns.getServerUsedRam(hacker)) * (hacker == home ? home_ram_factor : away_ram_factor)
}

export function get_script_ram(ns, scripts) {
    return scripts.map(a => ns.getScriptRam(a)).reduce((a, b) => Math.max(a, b), 0)
}

export function get_needed(ns, target) {
    let threads = [0,0,0,0]
    threads[0] = Math.ceil((ns.getServerSecurityLevel(target) - ns.getServerMinSecurityLevel(target)) / ns.weakenAnalyze(1))
    threads[2] = Math.ceil(ns.growthAnalyze(target, ns.getServerMaxMoney(target) / Math.max(ns.getServerMoneyAvailable(target), 0.0001)))
    threads[3] = Number.MAX_SAFE_INTEGER
    return threads
}

export function get_times(ns, target) {
    return [ns.getWeakenTime(target), ns.getWeakenTime(target), ns.getGrowTime(target), ns.getHackTime(target)]
}

export function get_time_to_value(ns, target, threads) {
    // returns the amount-ish of time we'd need to realize value on the server for the purposes of amortizing
    let times = get_times(ns, target)
    let needed = get_needed(ns, target)
    let w_cycles = ((needed[0]/threads)*times[0])/1000
    let gw_cycles = ((needed[2]+Math.ceil(ns.growthAnalyzeSecurity(needed[2]) / ns.weakenAnalyze(1)))/threads*times[2])/1000
    return w_cycles+gw_cycles
}