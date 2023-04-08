/** @param {NS} ns */
export async function main(ns) {
    // listener function; reads data from ports every interval
    let interval = 500
    let active_ports = [1]
    //clear_ports(ns, active_ports)
    while(true) {
        let port_data = check_ports(ns, active_ports)
        if (port_data[0].length != 0) {ns.tprint(port_data)}
        //let write_data = write_ports(ns, active_ports)
        //ns.tprint(write_data)
        await ns.sleep(interval)
    }
}

function clear_ports(ns, active_ports) {
    active_ports.map(port => ns.clearPort(port))
}

function check_ports(ns, active_ports) {
    return active_ports.map(port => {
        let data = []
        while (ns.peek(port) != "NULL PORT DATA") {
            data.push(ns.readPort(port))
        }
        return data
    })
}

function write_ports(ns, active_ports) {
    return active_ports.map(port => ns.tryWritePort(port, `Hello world! ${port}`))
}