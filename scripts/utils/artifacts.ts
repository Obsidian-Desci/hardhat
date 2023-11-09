import { address as mimisAddress, abi as mimisAbi } from '../../abi/MimisbrunnrV2.json'
import { address as wethAddress, abi as wethAbi } from "../../abi/WETH.json"
import { address as rscAddress, abi as rscAbi } from "../../abi/RSC.json"
import { address as growAddress, abi as growAbi } from "../../abi/GROW.json"
import { address as hairAddress, abi as hairAbi } from "../../abi/HAIR.json"
import { address as lakeAddress, abi as lakeAbi } from "../../abi/LAKE.json"
import { address as vitaAddress, abi as vitaAbi } from "../../abi/VITA.json"

import { address as MIMISWETH} from "../../abi/MIMISWETHPool.json"

const RSCWETH = "0xeC2061372a02D5e416F5D8905eea64Cab2c10970"
const GROWWETH = "0x61847189477150832D658D8f34f84c603Ac269af"
const HAIRWETH = "0x94DD312F6Cb52C870aACfEEb8bf5E4e28F6952ff"
const LAKEWETH = "0xeFd69F1FF464Ed673dab856c5b9bCA4D2847a74f"
const VITAWETH = "0xcBcC3cBaD991eC59204be2963b4a87951E4d292B"

export interface Artifact {
    address: string
    abi: any
    poolAddr: string
}

export const MIMISBRUNNR: Artifact = {
    address: mimisAddress,
    abi: mimisAbi,
    poolAddr: MIMISWETH
}

export const RSC: Artifact = {
    address: rscAddress,
    abi: rscAbi,
    poolAddr: RSCWETH
}
export const GROW: Artifact = {
    address: growAddress,
    abi: growAbi,
    poolAddr: GROWWETH
}
export const HAIR: Artifact = {
    address: hairAddress,
    abi: hairAbi,
    poolAddr: HAIRWETH
}
export const LAKE: Artifact = {
    address: lakeAddress,
    abi: lakeAbi,
    poolAddr: LAKEWETH
}
export const VITA: Artifact = {
    address: vitaAddress,
    abi: vitaAbi,
    poolAddr: VITAWETH
}
export const WETH: Artifact = {
    address: wethAddress,
    abi: wethAbi,
    poolAddr: ""
}