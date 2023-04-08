// 

export function cost_fn(ns, threads, hack_level) {
    // money per second per thread
    // Explicit cost function: amortized $/sec given _current_ hack level
    // It's much less important to know the exact number than it is to have a _pretty good_ ranking
    // For now, ignore hacking level increases. I'm assuming we'll be calling this enough that it'll sort of buff out
    return function (target) {
        // curry it so i can pass it around like a real boy
        // by calling it with the currrent values we can update the cost_fn
        let target_mon = [ns.getServerMaxMoney(target), ns.getServerMoneyAvailable(target)]
        let target_sec = [ns.getServerMinSecurityLevel(target), ns.getServerSecurityLevel(target)]
        // 


    }
}

/** @param {NS} ns */
export async function main(ns) {

}