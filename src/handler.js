/** @param {NS} ns */
const TICKRATE = 200

export async function main(ns) {
  //1,1,2,3,5,8,13,21
  let resources = [8,5,3,5,2,1,1]
  let targets = [1,1,2,3,3,5,3,2,1,1,1,1,1]
  let actions = [5,5,5,3]
  resources.forEach(res => ns.writePort(100, res))
  targets.forEach(res => ns.writePort(200, res))
  actions.forEach(res => ns.writePort(300, res))
  await port_reader(ns)
}

async function port_reader(ns) {
  let counter = 0
  while (counter < 10) {
    // resource port: 1 overflow: 11
    // target port: 2 overflow: 21
    // action port: 3 overflow: 31
    // Overflow ports store things we weren't able to process; basically, they're the item pinned to the top of the queue until they're handled
    let cached_resources = ns.readPort(11)
    let cached_targets = ns.readPort(21)
    let cached_actions = ns.readPort(31)

    // handle the cache; dispatch anything that needs to be dispatched
    let [remainder_resources, remainder_targets, remainder_actions] = priority_queue_dispatcher(ns, cached_resources, cached_targets, cached_actions)
    
    let to_write_resources = get_cache_fill(ns, remainder_resources, 100)
    let to_write_targets = get_cache_fill(ns, remainder_targets, 200)
    let to_write_actions = get_cache_fill(ns, remainder_actions, 300)

    let written_resources = cache_write(ns, to_write_resources, 11)
    let written_targets = cache_write(ns, to_write_targets, 21)
    let written_actions = cache_write(ns, to_write_actions, 31)

    if (written_resources == null) ns.tprint("Resource list empty.")
    else if (written_targets == null) ns.tprint("Target list empty.")
    else if (written_actions == null) ns.tprint("Action list empty.")

    // Wait a cycle
    await ns.nextWrite()
    counter += 1
  }
}

function priority_queue_dispatcher(ns, resources, targets, actions) {
  if (resources && actions) {
    let [resources_remainder, actions_remainder] = dispatch(ns, resources, actions, 0)
    return priority_queue_dispatcher(ns, resources_remainder, targets, actions_remainder)
  } else if (resources && targets) {
    let [resources_remainder, targets_remainder] = dispatch(ns, resources, targets, 1)
    return priority_queue_dispatcher(ns, resources_remainder, targets_remainder, actions)
  }
  return [resources, targets, actions]
}

function get_cache_fill(ns, previous_cache_remainder, port_handle) {
  if (previous_cache_remainder) return previous_cache_remainder
  else if (ns.peek(port_handle) != "NULL PORT DATA") return ns.readPort(port_handle)
  else return null
}

function cache_write(ns, to_write, port_handle) {
  ns.tprint(to_write)
  if (to_write) return ns.writePort(port_handle, to_write)
  else return null
}

function dispatch(ns, resources, event, flag) {
  let event_type = flag == 0 ? "action" : "target"
  let res_int = parseInt(resources)
  let evt_int = parseInt(event)
  if (res_int > evt_int) {
    ns.tprintf("Dispatching %d %s to %d.", res_int-evt_int, event_type, res_int)
    return [res_int-evt_int, 0]
  }
  else if (res_int < evt_int) {
    ns.tprintf("Dispatching %d %s to %d.", evt_int-res_int, event_type, res_int)
    return [0, evt_int-res_int]
  }
  else return [0,0]
}




/**  
3 types of events:
  1. Resources available
  2. Target available
  3. Action required

Goal: We are always using as much of our capacity as possible to hack, and everything else to share** (this changes once we have corporations etc.)
Resources available:
- Capacity added (buy event (pserv), upgrade event (home, pserv), hack event (ext. servers))
- Capacity freed (hack ended, action ended)

Goal: Hackable servers are being hacked constantly, with minimized downtime
Target available:
- Block opened (hack ended)

Goal: Dispatch necessaries to excess capacity; minimize time spent, maximize freeness of home RAM
Action required:
- Backdoor

Port 1:
Resources coming online (equivalent to continually checking max-used ram per server)

Port 2:
Targets becoming available

Port 3:
Actions requiring dispatching


Resources: ___ _ __ ______ _ _ ____
Targets:   _ ____ __ _ _ ______ ___
Actions:   _ _ _ _

States:
1. R T A
2. R _ A
3. R T _
4. _ T A
5. R _ _
6. _ T _
7. _ _ A
8. _ _ _

1: dispatch R to A until 3
2: dispatch R to A until 5
3: dispatch R to T until 5
4: wait R until 1
5: wait A until 2, T until 3
6: wait R until 3, A until 4
7. wait R until 2, T until 4
8. wait 



*/