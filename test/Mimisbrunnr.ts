import hre from 'hardhat'
import { main } from '../scripts/deployMimisbrunnr'
import {
    address as factoryAddress,
    abi as factoryAbi
} from "../abi/UniswapV3Factory.json"
import {
    address as nfpmAddress,
    abi as nfpmAbi
} from "../abi/NonFungiblePositionManager.json"
import {
    address as wethAddress,
    abi as wethAbi
} from "../abi/WETH.json"
import {
    address as rscAddress, 
    abi as rscAbi
} from "../abi/RSC.json"
import {
    address as swapAddress,
    abi as swapAbi
} from '../abi/SwapRouter.json'
import {abi as poolAbi} from "../abi/UniswapV3Pool.json"

import { Mimisbrunnr } from '../typechain-types'

const RSCWETH = "0xeC2061372a02D5e416F5D8905eea64Cab2c10970"

import { TickMath } from '@uniswap/v3-sdk'
console.log('factoryAbi', factoryAbi)
describe("Mimisbrunnr", async () => {
    let accounts: hre.ethers.Signer[];
    let mimisbrunnr: Mimisbrunnr;
    let uniswapFactory: hre.ethers.Contract;
    let nfpm: hre.ethers.Contract;
    let mimisWethPool: hre.ethers.Contract;
    let weth: hre.ethers.Contract;
    let rsc: hre.ethers.Contract;
    let swapRouter: hre.ethers.Contract;
    before(async () => {
        accounts = await hre.ethers.getSigners()
        const mimisbrunnrAddr = await main()
        mimisbrunnr  = await hre.ethers.getContractAt("Mimisbrunnr", mimisbrunnrAddr)
        uniswapFactory = new hre.ethers.Contract(factoryAddress, factoryAbi, accounts[0]) 
        nfpm = new hre.ethers.Contract(nfpmAddress, nfpmAbi, accounts[0])
        weth = new hre.ethers.Contract(wethAddress, wethAbi, accounts[0])
        rsc = new hre.ethers.Contract(rscAddress, rscAbi, accounts[0])
        swapRouter = new hre.ethers.Contract(swapAddress, swapAbi, accounts[0])
    })

    it("initializes the MIMISWETH pool", async () => {
        console.log(await mimisbrunnr.getAddress())
        const pooltx = await uniswapFactory.createPool(
            await mimisbrunnr.getAddress(),
            wethAddress,
            10000
        )
        await pooltx.wait()

        const poolAddr = await uniswapFactory.getPool(
            await mimisbrunnr.getAddress(),
            wethAddress,
            10000
        )
        const setPooltx = await mimisbrunnr.setMimsPool(
            poolAddr
        )
        await setPooltx.wait()
        mimisWethPool = new hre.ethers.Contract(poolAddr, poolAbi, accounts[0])

        const sqrtPriceX96 = 1n * 2n ** 96n
        console.log(sqrtPriceX96)
        const initTx = await mimisWethPool.initialize(
           sqrtPriceX96 
        )
        await initTx.wait()

    })

    it("should provide initial liquidity", async () => {
        const initialTokenAmount = await hre.ethers.parseUnits('10', 'ether')
        console.log('weth', await weth.balanceOf(accounts[0]))
        const depositWethtx = await weth.deposit({ value: initialTokenAmount})
        await depositWethtx.wait()

        const wethApprovetx = await weth.approve(
            await nfpm.getAddress(),
            initialTokenAmount
        )
        await wethApprovetx.wait()
        const mimisbrunnrApproveTx = await mimisbrunnr.approve(
            await nfpm.getAddress(),
            initialTokenAmount
        )
        await mimisbrunnrApproveTx.wait() 

        const minttx = await nfpm.mint({
            token0: await mimisbrunnr.getAddress(),
            token1: wethAddress,
            fee: 10000,
            tickLower: Math.ceil(-887272 / 200) * 200,
            tickUpper: Math.floor(887272 / 200) * 200,
            amount0Desired: initialTokenAmount,
            amount1Desired: initialTokenAmount,
            amount0Min: 0,
            amount1Min: 0,
            recipient: await mimisbrunnr.getAddress(),
            deadline: Math.floor(new Date().getTime() / 1000) + 3600
        })
    })

    it("should accept a RSC WETH Liquidity position", async () => {
        const wethAmount = hre.ethers.parseUnits('0.1', 'ether')
        const wethtx = await weth.deposit({value: wethAmount})
        await wethtx.wait()
        const wethtx2 = await weth.deposit({value: wethAmount})
        await wethtx2.wait()
        const approvetx = await weth.approve(swapAddress, wethAmount)
        await approvetx.wait()
        console.log(await weth.balanceOf(accounts[0]))

        const swapForRsc = await swapRouter.exactInputSingle({
            tokenIn: wethAddress,
            tokenOut: rscAddress,
            fee: 10000,
            recipient: accounts[0].address,
            deadline: Math.floor(new Date().getTime() / 1000) + 3600,
            amountIn: wethAmount,
            amountOutMinimum: 0,
            sqrtPriceLimitX96: 0
        })

        console.log('=======================')
        console.log(await weth.balanceOf(accounts[0]))
        console.log(await rsc.balanceOf(accounts[0]))
        console.log('=======================')
        const approvetx3 = await rsc.approve(nfpmAddress, await rsc.balanceOf(accounts[0]))
        await approvetx3.wait()
        const approvetx4 = await weth.approve(nfpmAddress, wethAmount)
        await approvetx4.wait()

        const minttx = await nfpm.mint({
            token0: wethAddress,
            token1: rscAddress,
            fee: 10000,
            tickLower: Math.ceil(-887272 / 200) * 200,
            tickUpper: Math.floor(887272 / 200) * 200,
            amount0Desired: wethAmount,
            amount1Desired: await rsc.balanceOf(accounts[0]),
            amount0Min: 0,
            amount1Min: 0,
            recipient: accounts[0].address,
            deadline: Math.floor(new Date().getTime() / 1000) + 3600
        })
        await minttx.wait()


        const filter =  nfpm.filters.Transfer()
        const events = await nfpm.queryFilter(
            filter,
            (await hre.ethers.provider.getBlockNumber()) - 1, 
            (await hre.ethers.provider.getBlockNumber())
        )
        console.log('events', events)
        console.log('=======================')
        console.log('mims', await mimisbrunnr.balanceOf(accounts[0]))
        console.log('weth', await weth.balanceOf(accounts[0]))
        console.log('rsc', await rsc.balanceOf(accounts[0]))
        console.log('=======================')
        const approvetx5 = await nfpm.approve(await mimisbrunnr.getAddress(), events[0].args[2])
        await approvetx5.wait()
        const selltx = await mimisbrunnr.sellLP(events[0].args[2])
        await selltx.wait()
        console.log('=======================')
        console.log('mims', await mimisbrunnr.balanceOf(accounts[0]))
        console.log('weth', await weth.balanceOf(accounts[0]))
        console.log('rsc', await rsc.balanceOf(accounts[0]))
        console.log('=======================')

        

    })

    it("")
})

