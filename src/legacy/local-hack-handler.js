/** @param {NS} ns */
export async function main(ns) {
    let [target, step_1, step_2, step_3, step_4] = ns.args
    let step_counts = [step_1, step_2, step_3, step_4]
    let steps = [ns.hack, ns.weaken, ns.grow, ns.weaken]
    while (true) {
        for (let i = 0; i < 4; i++) {
            for (let step_ctr = step_counts[i]; step_ctr--;) {
                let step = await steps[i](target)//, { threads: max_threads })
            }
        }
    }
}