/** @param {NS} ns */

const CrimeType = {
    shoplift: "Shoplift",
    robStore: "Rob Store",
    mug: "Mug",
    larceny: "Larceny",
    dealDrugs: "Deal Drugs",
    bondForgery: "Bond Forgery",
    traffickArms: "Traffick Arms",
    homicide: "Homicide",
    grandTheftAuto: "Grand Theft Auto",
    kidnap: "Kidnap",
    assassination: "Assassination",
    heist: "Heist",
  }

function crime_stats(ns, crime) {
  let stats = ns.singularity.getCrimeStats(crime)
  let xp = [stats.agility_exp, stats.charisma_exp, stats.defense_exp, stats.dexterity_exp, stats.hacking_exp, stats.intelligence_exp, stats.strength_exp]
  return xp.reduce((partial_sum, a) => partial_sum + a, 0)
}

function get_crimes(ns, flag) {
  if (flag) return Object.keys(CrimeType).map(crime => [crime, (ns.singularity.getCrimeChance(crime)*ns.singularity.getCrimeStats(crime).money)/ns.singularity.getCrimeStats(crime).time]).sort((a,b) => b[1]-a[1])
  else return Object.keys(CrimeType).map(crime => [crime, (ns.singularity.getCrimeChance(crime)*crime_stats(ns, crime))/ns.singularity.getCrimeStats(crime).time]).sort((a,b) => b[1]-a[1])
}

export async function main(ns) {
  let tag = ns.args[0] == '$' ? true : false
  let crime_to_do = get_crimes(ns, tag)[0]
  ns.tprintf("The best crime to commit is %s, earning $%s/sec.", crime_to_do[0], parseFloat(crime_to_do[1]*1000).toExponential(2))
  while (true) {
    let sleepy_time = ns.singularity.commitCrime(crime_to_do[0], ns.singularity.isFocused())
    await ns.sleep(sleepy_time)
    let new_crime = get_crimes(ns, tag)[0]
    if (new_crime[0] != crime_to_do[0]) {
      ns.tprintf("Better crime detected! Swapping to %s, earning $%s/sec.", new_crime[0], parseFloat(new_crime[1]*1000).toExponential(2))
      crime_to_do = new_crime
    }
  }
}