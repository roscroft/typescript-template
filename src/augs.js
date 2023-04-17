/** @param {NS} ns */
export async function main(ns) {
    let faction = ns.args[0]
    //buy_all_neural(ns, faction)
    save(ns, faction)
}

export function save(ns, faction) {
    // Given a faction, buy all its augmentations in reverse order, then install and use the setup.js script as a callback
    let faction_augs = ns.singularity.getAugmentationsFromFaction(faction)
    faction_augs = faction_augs.map(aug => [aug, ns.singularity.getAugmentationPrice(aug), ns.singularity.getAugmentationRepReq(aug)]).sort((a,b) => b[2]-a[2])
    let owned = ns.singularity.getOwnedAugmentations(true)
    let augs_to_buy = faction_augs.filter(aug => owned.indexOf(aug[0]) == -1)
    ns.tprint(augs_to_buy)
    let bought = buy_augs(ns, owned, augs_to_buy, faction)
    ns.tprint(bought)
    // this should avoid issues with neuroflux governor
    let unowned_faction_augs = ns.singularity.getAugmentationsFromFaction(faction).filter(aug => ns.singularity.getOwnedAugmentations(true).indexOf(aug) == -1)
    let new_faction_augs = ns.singularity.getOwnedAugmentations(true).length != ns.singularity.getOwnedAugmentations().length
    if (unowned_faction_augs.length == 0 && new_faction_augs) {
        ns.singularity.installAugmentations("batcher.js")
    }
}

export function buy_all_neural(ns, faction) {
    let aug_name = "NeuroFlux Governor"
    let money = ns.getServerMoneyAvailable("home")
    let aug_price = ns.singularity.getAugmentationPrice(aug_name)
    let counter = 0
    while (aug_price < money) {
        money -= aug_price
        if (ns.singularity.purchaseAugmentation(faction, aug_name)) {
            counter += 1
            aug_price = ns.singularity.getAugmentationPrice(aug_name)
        }
        else {
            ns.tprintf("Purchasing failed! Succesfully bought: %d", counter)
        }
    }
    ns.tprintf("Purchasing complete! Succesfully bought: %d", counter)
}

export function buy_augs(ns, owned, augs_to_buy, faction) {
    if (augs_to_buy.length == 0) return []
    let [aug_info, ...rest] = augs_to_buy
    let [aug, cost] = aug_info
    ns.tprintf("aug, cost %s %d", aug, cost)
    let prereq_buys = []
    if (cost > ns.getServerMoneyAvailable("home")) { 
        ns.tprint("Not enough money!")
        return []
    } else {
        let prereqs = ns.singularity.getAugmentationPrereq(aug).filter(aug => owned.indexOf(aug) == -1)
        if (prereqs.length > 0) {
            ns.tprintf("Looking for prereqs...", aug)
            prereqs = prereqs.map(aug => [aug, ns.singularity.getAugmentationPrice(aug), ns.singularity.getAugmentationRepReq(aug)]).sort((a,b) => b[2]-a[2])
            prereq_buys = buy_augs(ns, owned, prereqs, faction)
            if (prereq_buys == []) {
                ns.tprint("Buying prereqs for aug %s failed! Terminating.")
                return []
            }
        } 
        let purchased = ns.singularity.purchaseAugmentation(faction, aug)
        if (purchased) {
            ns.tprintf("Bought aug %s", aug)
            return [aug, ...prereq_buys, ...buy_augs(ns, owned, rest, faction)]
        }
        else {
            ns.tprint("Purchases unsuccessful!")
            return []
        }
    }
}

let milestone_factions = ["CyberSec",
                          "NiteSec"]