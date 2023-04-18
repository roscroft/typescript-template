/** @param {NS} ns */
const t0 = 200
const home = "home"
const home_ram_factor = 0.80
const away_ram_factor = 0.95

export function get_period_and_depth(weak_time, grow_time, hack_time) {
    //period is t_min; depth is kW
    const kW_max = Math.floor(1 + (weak_time - 4 * t0) / (8 * t0 ))
    for (let kW = kW_max ; kW >= 1; --kW) {
        const t_min_W = (weak_time + 4 * t0) / kW
        const t_max_W = (weak_time - 4 * t0) / (kW - 1)
        const kG_min = Math.ceil(Math.max((kW - 1) * 0.8, 1))
        const kG_max = Math.floor(1 + kW * 0.8)
        for (let kG = kG_max; kG >= kG_min; --kG) {
            const t_min_G = (grow_time + 3 * t0) / kG
            const t_max_G = (grow_time - 3 * t0) / (kG - 1)
            const kH_min = Math.ceil(Math.max((kW - 1) * 0.25, (kG - 1) * 0.3125, 1))
            const kH_max = Math.floor(Math.min(1 + kW * 0.25, 1 + kG * 0.3125))
            for (let kH = kH_max; kH >= kH_min; --kH) {
                // TODO: find out what hacking levels this applies to
                const t_min_H = (hack_time + 5 * t0) / kH
                const t_max_H = (hack_time - 1 * t0) / (kH - 1)
                const t_min = Math.max(t_min_H, t_min_G, t_min_W)
                const t_max = Math.min(t_max_H, t_max_G, t_max_W)
                if (t_min <= t_max) {
                    return [t_min, kW]
                }
            }
        }
    }
}

export function get_delays(period, depth, weak_time, grow_time, hack_time) {
    const w1_wait = period*depth - 3 * t0 - weak_time;
    const w2_wait = period*depth - 1 * t0 - weak_time;
    const g_wait = period*depth - 2 * t0 - grow_time;
    const h_wait = period*depth - 4 * t0 - hack_time;
    return [w1_wait, w2_wait, g_wait, h_wait]
}

export function get_times(ns, target) {
    return [ns.getWeakenTime(target), ns.getGrowTime(target), ns.getHackTime(target)]
}

export function get_needed(ns, target) {
    let threads = [0,0,0,0]
    threads[0] = Math.ceil((ns.getServerSecurityLevel(target) - ns.getServerMinSecurityLevel(target)) / ns.weakenAnalyze(1))
    threads[2] = Math.ceil(ns.growthAnalyze(target, ns.getServerMaxMoney(target) / Math.max(ns.getServerMoneyAvailable(target), 0.0001)))
    threads[3] = max_supported_hacks(ns, target)
    return threads
}

export function action_needed(threads) {
    if (threads[0] > 0) return "weaken"
    else if (threads[2] > 0) return "grow"
    else return "hack"
}

export function calc_threads(ns, target, hacker, threads) {
    let cores = ns.getServer(hacker).cpuCores
    threads[2] = Math.ceil(ns.growthAnalyze(target, 1 / (1 - (ns.hackAnalyze(target) * threads[3])), cores))
    threads[1] = Math.ceil(ns.growthAnalyzeSecurity(threads[2]) / ns.weakenAnalyze(1, cores))
    threads[0] = Math.ceil(ns.hackAnalyzeSecurity(threads[3], target) / ns.weakenAnalyze(1, cores))
    return threads
}

export function ram_used(ns, threads) {
    return threads[0]*ns.getScriptRam("j-weaken.js") + threads[1]*ns.getScriptRam("j-weaken.js") + threads[2]*ns.getScriptRam("j-grow.js") + threads[3]*ns.getScriptRam("j-hack.js")
}

export function get_available_ram(ns, hacker) {
    return Math.floor((ns.getServerMaxRam(hacker) - ns.getServerUsedRam(hacker)) * (hacker == home ? home_ram_factor : away_ram_factor))
}

export function max_supported_hacks(ns, target) {
    return Math.floor(1/ns.hackAnalyze(target))
}

export function earned_money(ns, target, threads) {

}