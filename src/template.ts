import { NS } from "@ns";

export async function main(ns: NS): Promise<void> {
  ns.tprint("Hello Remote API!");
}

export async function testing(ns: NS): Promise<void> {
  ns.tprint("Testing!")
}