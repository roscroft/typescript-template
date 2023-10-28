/** @param {NS} ns */
const INTERVAL = 50

export async function main(ns, exec_args) {
    // let [target, ...waits, ...threads, ...times]
    let [batch_port, batch_id, target, w1_wait, w2_wait, g_wait, h_wait, w1_threads, w2_threads, g_threads, h_threads, w1_time, w2_time, g_time, h_time] = exec_args
    let remaining_wait = w1_wait + 3*INTERVAL // start of next batch run
    
    await waiter(ns, target, w1_wait, w1_time, ns.getWeakenTime())
    let w1_pid = await ns.weaken(target, w1_threads)

    remaining_wait -= await waiter(ns, target, w2_wait, w2_time, ns.getWeakenTime()) // throw out time waiting for w2
    let w2_pid = await ns.weaken(target, w2_threads)

    remaining_wait -= await waiter(ns, target, g_wait, g_time, ns.getGrowTime()) // throw out time waiting for g
    let g_pid = await ns.grow(target, g_threads)

    remaining_wait -= await waiter(ns, target, h_wait, h_time, ns.getHackTime()) // throw out time waiting for h
    let h_pid = await ns.hack(target, h_threads)

    await ns.sleep(remaining_wait)

    if([w1_pid, w2_pid, g_pid, h_pid].every(a => a>0)) {
        let written = ns.tryWritePort(batch_port, batch_id)
        if (!written) {
            ns.tprint("Port full!!!")
        }
    } else {
        ns.tprint("Batch failed!")
    }
}

async function waiter(ns, target, wait, time, time_fn) {
    let total_wait = wait
    await ns.sleep(wait)
    let new_time = time_fn(target)
    while (new_time + 1 < time) {
        let new_wait = time - new_time
        total_wait += new_wait
        await ns.sleep(new_wait)
        new_time = time_fn(target)
    }
    return total_wait
}