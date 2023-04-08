/** @param {NS} ns */
export async function main(ns) {
    let target = ns.args[0]
    let thread_ct = ns.args[1]
    let sleep_amt = ns.args[2]
    let to_write = ns.args[4]
    await ns.sleep(sleep_amt)
    let val = await ns.hack(target, {threads: thread_ct}).then((value) => {
        if (to_write) {
            let thread_str = `${target} hacks:${thread_ct} sleep:${sleep_amt} pct:${value} ts:${Date.now()}`
            //ns.tprint("writing to port...")
            let written = ns.tryWritePort(1, thread_str)
            if (!written) {
                ns.tprint("Port full!!!")
            }
        }
    })
    return val
}