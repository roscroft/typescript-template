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

export async function main(ns) {
    let crime_vals = Object.keys(CrimeType).map(crime => [crime, (ns.singularity.getCrimeChance(crime)*ns.singularity.getCrimeStats(crime).money)/ns.singularity.getCrimeStats(crime).time]).sort((a,b) => b[1]-a[1])
    ns.tprintf("The best crime to commit is %s, earning $%d/sec.", crime_vals[0][0], crime_vals[0][1]*1000)
}