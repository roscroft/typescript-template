/** @param {NS} ns */

export async function main(ns) {
    buy_servers(ns)
    upgrade_servers(ns)
}

export function buy_servers(ns, min_ram_amount=64) {
    let purchased = ns.getPurchasedServers()
    let num_hosts = purchased.length
    let serv_limit = ns.getPurchasedServerLimit()
    let money = ns.getServerMoneyAvailable("home")
    if (num_hosts < serv_limit) {
        // buy as many as we can at the moment
        //ns.tprint(money / ns.getPurchasedServerCost(min_ram_amount))
        let to_buy = Math.floor(money / ns.getPurchasedServerCost(min_ram_amount))
        // we have num_hosts servers, with a serv_limit max (e.g. 5 servers out of 25)
        // we can afford to_buy number of servers
        // so, buy min(to_buy, serv_limit-num_hosts) servers
        let can_buy = Math.min(to_buy, serv_limit - num_hosts)
        for (let i = can_buy; i--;) {
            let server_num = num_hosts + 1 + i
            ns.purchaseServer("pserv-" + server_num, min_ram_amount)
            ns.tprintf("Bought server pserv-%d with %d ram.",server_num, min_ram_amount)
        }
    }
    return purchased
}

// Use this instead of get_hosts, connecting + backdooring where possible
export function upgrade_servers(ns) {
    let purchased = ns.getPurchasedServers()
    ns.tprintf("Servers: %d, Limit: %d",purchased.length,ns.getPurchasedServerLimit())
    if (purchased.length < ns.getPurchasedServerLimit()) {return}
    // broad strokes, least overall cost prefers upgrading as much as possible.
    // go through the servers, attempting to greedily max
    function max_affordable_ram(ns, ram, money) {
        if (ram == 0) {return 0}
        if (ns.getPurchasedServerCost(ram) > money) {return max_affordable_ram(ns, ram/2, money)}
        else {return ram}
    }
    for (let purchase of purchased) {
        // greedily try to upgrade as much as possible
        let current_money = ns.getServerMoneyAvailable("home")
        let current_ram = ns.getServerMaxRam(purchase)
        let max_ram = max_affordable_ram(ns, ns.getPurchasedServerMaxRam(), current_money)
        if (max_ram > (current_ram*4) || (max_ram == ns.getPurchasedServerMaxRam() && current_ram != ns.getPurchasedServerMaxRam())) {
            let transfer_name = purchase
            ns.tprintf("Upgrading server %s from %d to %d ram!", transfer_name, current_ram, max_ram)
            ns.killall(transfer_name)
            ns.deleteServer(transfer_name)
            ns.purchaseServer(transfer_name, max_ram)
            transfer_scripts(ns, transfer_name, true)
        }
    }
    return purchased
}