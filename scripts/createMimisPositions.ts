import hre from 'hardhat'
import * as fs from 'node:fs'
import { address as mimisAddress, abi as mimisAbi } from '../abi/MimisbrunnrV2.json'
import { address as wethAddress, abi as wethAbi } from "../abi/WETH.json"
import { address as rscAddress, abi as rscAbi } from "../abi/RSC.json"
import { address as growAddress, abi as growAbi } from "../abi/GROW.json"
import { address as hairAddress, abi as hairAbi } from "../abi/HAIR.json"
import { address as lakeAddress, abi as lakeAbi } from "../abi/LAKE.json"
import { address as vitaAddress, abi as vitaAbi } from "../abi/VITA.json"


import { address as swapAddress, abi as swapAbi } from '../abi/SwapRouter.json'
import { address as nfpmAddress, abi as nfpmAbi } from "../abi/NonFungiblePositionManager.json"
import { abi as poolAbi } from "../abi/UniswapV3Pool.json"

const RSCWETH = "0xeC2061372a02D5e416F5D8905eea64Cab2c10970"
const GROWWETH = "0x61847189477150832D658D8f34f84c603Ac269af"
const HAIRWETH = "0x94DD312F6Cb52C870aACfEEb8bf5E4e28F6952ff"
const LAKEWETH = "0xeFd69F1FF464Ed673dab856c5b9bCA4D2847a74f"
const VITAWETH = "0xcBcC3cBaD991eC59204be2963b4a87951E4d292B"

export async function main() {
  const signers = await hre.ethers.getSigners();
  const mimisbrunnr = new hre.ethers.Contract(
    mimisAddress,
    mimisAbi,
    signers[0]
  )

  const weth = new hre.ethers.Contract(wethAddress, wethAbi, signers[0])
  const swapRouter = new hre.ethers.Contract(swapAddress, swapAbi, signers[0])
  const nfpm = new hre.ethers.Contract(nfpmAddress, nfpmAbi, signers[0])
  const rsc = new hre.ethers.Contract(rscAddress, rscAbi, signers[0])
  const hair = new hre.ethers.Contract(hairAddress, hairAbi, signers[0])
  const grow = new hre.ethers.Contract(growAddress, growAbi, signers[0])
  const vita = new hre.ethers.Contract(vitaAddress, vitaAbi, signers[0])
  const lake = new hre.ethers.Contract(lakeAddress, lakeAbi, signers[0])

  const rscWethPool = new hre.ethers.Contract(RSCWETH, poolAbi, signers[0])
  const hairWethPool = new hre.ethers.Contract(HAIRWETH, poolAbi, signers[0])
  const growWethPool = new hre.ethers.Contract(GROWWETH, poolAbi, signers[0])
  const vitaWethPool = new hre.ethers.Contract(VITAWETH, poolAbi, signers[0])
  const lakeWethPool = new hre.ethers.Contract(LAKEWETH, poolAbi, signers[0])
  const wethAmount3 = hre.ethers.parseUnits('0.0001', 'ether')
  const deposittx = await (weth.deposit({ value: wethAmount3 }))
  await deposittx.wait()
  const wethapprove1 = await weth.approve(swapRouter, wethAmount3)
  await wethapprove1.wait()


  const createMimisPosition = async (
    token: hre.ethers.Contract,
    pool: hre.ethers.Contract
  ) => {
    const wethAmount = hre.ethers.parseUnits('0.00001', 'ether')
    const swaptx = await swapRouter.exactInputSingle({
      tokenIn: wethAddress,
      tokenOut: await token.getAddress(),
      fee: await pool.fee(),
      recipient: signers[0].address,
      deadline: Math.floor(new Date().getTime() / 1000) + 3600,
      amountIn: wethAmount,
      amountOutMinimum: 0,
      sqrtPriceLimitX96: 0
    })
    await swaptx.wait()

    console.log('exact input single complete')
    const tokenAmount = await token.balanceOf(signers[0].address)
    await (await token.approve(nfpmAddress, 0)).wait()
    const tokenapprovetx = await token.approve(nfpmAddress, tokenAmount)
    await tokenapprovetx.wait()
    //const deposit2tx = await weth.deposit({ value: wethAmount })
    //await deposit2tx.wait()
    const approvetx2 = await weth.approve(nfpmAddress, wethAmount)
    await approvetx2.wait()
    console.log('=========================')
    console.log('tokenamount:', tokenAmount)
    console.log('wethamount', wethAmount)
    console.log('=========================')
    console.log('attempting to mint position')
    const tickSpacing = Number(await pool.tickSpacing())
    await nfpm.mint({
      token0: await pool.token0(),
      token1: await pool.token1(),
      fee: await pool.fee(),
      tickLower: Math.ceil(-887272 / tickSpacing) * tickSpacing,
      tickUpper: Math.floor(887272 / tickSpacing) * tickSpacing,
      amount0Desired: (
        hre.ethers.getAddress(await pool.token0()) == 
        hre.ethers.getAddress(await weth.getAddress())
        ) ? wethAmount : tokenAmount,
      amount1Desired: (
        hre.ethers.getAddress(await pool.token1()) ==
        hre.ethers.getAddress(await weth.getAddress())
        ) ? wethAmount : tokenAmount,
      amount0Min: 0,
      amount1Min: 0,
      recipient: await mimisbrunnr.getAddress(),
      deadline: Math.floor(new Date().getTime() / 1000) + 3600
    })
    console.log('mint complete')
    const filter = nfpm.filters.Transfer()
    const events = await nfpm.queryFilter(
      filter,
      (await hre.ethers.provider.getBlockNumber()) - 1,
      (await hre.ethers.provider.getBlockNumber())
    )

    await mimisbrunnr.setMimisPositionForToken(await token.getAddress(), events[0].args[2])
    console.log('position set')

  }
  console.log('1:grow')
  await createMimisPosition(grow, growWethPool)
  console.log('2:hair')
  await createMimisPosition(hair, hairWethPool)
  console.log('3:vita')
  await createMimisPosition(vita, vitaWethPool)
  console.log('4:rsc')
  await createMimisPosition(rsc, rscWethPool)
  console.log('5:lake')
  await createMimisPosition(lake, lakeWethPool)
  console.log('6')
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
