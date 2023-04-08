/** @param {NS} ns */
import {get_hosts} from "./network-manager.js"

export function main(ns) {
    let force = ns.args[0] ? true : false
    run_progs(ns, true, force)
}

export function transfer_script(ns, script_name, force=true) {
    return function (dest) {
        let source = ns.getHostname()
        if (force) {
            ns.scriptKill(script_name, dest)
            if (dest != source) {ns.rm(script_name, dest)}
        }
        if (!ns.fileExists(script_name, dest)) {
            if (ns.scp(script_name, dest, source)) {
                ns.tprintf("%s copied to %s!", script_name, dest)
                return true
            }
            else {
                ns.tprintf("File copy failed!")
                return false
            }
        }
        return true
    }
}

export function run_progs(ns, verbose=false, force=false) {
    // broad strokes: recurse through the network, returning the hosts we can hack + run scripts on
    // this means we'll need to identify the number of ports we can open and our hacking skill
    let source = "home"
    let exes = [{ script: "BruteSSH.exe", fn: exe_wrap(ns.brutessh)('brutessh') },
                { script: "FTPCrack.exe", fn: exe_wrap(ns.ftpcrack)('ftpcrack') },
                { script: "relaySMTP.exe", fn: exe_wrap(ns.relaysmtp)('relaysmtp') },
                { script: "HTTPWorm.exe", fn: exe_wrap(ns.httpworm)('httpworm') },
                { script: "SQLInject.exe", fn: exe_wrap(ns.sqlinject)('sqlinject') }]
    let nuke_script = { script: "NUKE.exe", fn: exe_wrap(ns.nuke)('nuke') }

    function exe_wrap(exe_fn) {
        return function (name) {
            return function (target) {
                exe_fn(target)
            }
        }
    }

    let ports_openable = exes.filter(exe => ns.fileExists(exe.script, source)).length
    let hacking_skill = ns.getHackingLevel()
    let scripts = ["b-grow.js", "b-hack.js", "b-weaken.js"]
    let hosts = get_hosts(ns)
    scripts.map(script => hosts.map(host => transfer_script(ns, script, force)(host.hostname)))

    let actionable_hosts = hosts.filter(host => host.requiredHackingSkill <= hacking_skill && host.numOpenPortsRequired <= ports_openable)
    let gettable_hosts = hosts.filter(host => host.requiredHackingSkill <= hacking_skill && host.numOpenPortsRequired > ports_openable && !host.purchasedByPlayer)
    if (verbose) {
        ns.tprintf("Next hacking level gate: %d", Math.min(...hosts.filter(host => host.requiredHackingSkill > hacking_skill).map(host => host.requiredHackingSkill)))
        ns.tprintf("Hosts meeting current hacking level: %d. Ports needed (min): %d/%d.", gettable_hosts.length, ports_openable, Math.min(...gettable_hosts.map(host => host.numOpenPortsRequired)))
    }
    // Runs as many programs agaisnt the scripts as necessary, then nukes everything, then just returns the hostname!
    actionable_hosts.map(host => exes.slice(0, host.numOpenPortsRequired).map(exe => exe.fn(host.hostname)))
    actionable_hosts.map(host => nuke_script.fn(host.hostname))
    ns.tprintf("Active servers: %d", actionable_hosts.length)
    return actionable_hosts.map(host => host.hostname)
}