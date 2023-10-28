/** @param {NS} ns */
import {get_hosts} from "./network-manager.js"
let scripts = ["b-weaken.js", "b-grow.js", "b-hack.js"]

export function main(ns) {
    get_hosts(ns).map(host => transfer_scripts(ns, host.hostname, true))
}

export function transfer_scripts(ns, host, force=false) {
    scripts.map(script => transfer_script(ns, script, force)(host))
}

export function transfer_script(ns, script_name, force=true) {
    return function (dest) {
        let source = ns.getHostname()
        if (force) {
            ns.scriptKill(script_name, dest)
            if (dest != source) {ns.rm(script_name, dest)}
        }
        if (!ns.fileExists(script_name, dest)) {
            if (!ns.scp(script_name, dest, source)) {
                ns.tprintf("File copy failed!")
                return false
            }
            else {
                ns.tprintf("%s copied to %s!", script_name, dest)
            }
        }
        return true
    }
}