import hre from 'hardhat'
import { main } from '../scripts/deployMimisbrunnr'
import { expect } from 'chai'
import { address as factoryAddress, abi as factoryAbi } from "../abi/UniswapV3Factory.json"
import { address as nfpmAddress, abi as nfpmAbi } from "../abi/NonFungiblePositionManager.json"
import { address as swapAddress, abi as swapAbi } from '../abi/SwapRouter.json'
import {abi as poolAbi} from "../abi/UniswapV3Pool.json"
import { address as stakerAddress, abi as stakerAbi} from '../abi/V3Staker.json'


import { address as wethAddress, abi as wethAbi } from "../abi/WETH.json"
import { address as rscAddress, abi as rscAbi } from "../abi/RSC.json"
import { address as growAddress, abi as growAbi } from "../abi/GROW.json"
import { address as hairAddress, abi as hairAbi } from "../abi/HAIR.json"
import { address as lakeAddress, abi as lakeAbi } from "../abi/LAKE.json"
import { address as vitaAddress,  abi as vitaAbi } from "../abi/VITA.json"

import { Mimisbrunnr } from '../typechain-types'

const RSCWETH = "0xeC2061372a02D5e416F5D8905eea64Cab2c10970"
const GROWWETH = "0x61847189477150832D658D8f34f84c603Ac269af"
const HAIRWETH = "0x94DD312F6Cb52C870aACfEEb8bf5E4e28F6952ff"
const LAKEWETH = "0xeFd69F1FF464Ed673dab856c5b9bCA4D2847a74f"
const VITAWETH ="0xcBcC3cBaD991eC59204be2963b4a87951E4d292B"

describe("Mimisbrunnr", async () => {
    let accounts: hre.ethers.Signer[];
    let mimisbrunnr: Mimisbrunnr;
    
    let uniswapFactory: hre.ethers.Contract;
    let swapRouter: hre.ethers.Contract;
    let nfpm: hre.ethers.Contract;
    let v3Staker: hre.ethers.Contract; 
    let weth: hre.ethers.Contract;
    let rsc: hre.ethers.Contract;
    let grow: hre.ethers.Contract;
    let hair: hre.ethers.Contract;
    let lake: hre.ethers.Contract;
    let vita: hre.ethers.Contract;
    
    let mimisWethPool: hre.ethers.Contract;
    let rscWethPool: hre.ethers.Contract;
    let growWethPool: hre.ethers.Contract;
    let hairWethPool: hre.ethers.Contract;
    let lakeWethPool: hre.ethers.Contract;
    let vitaWethPool: hre.ethers.Contract;

    before(async () => {
        accounts = await hre.ethers.getSigners()
        const mimisbrunnrAddr = await main()
        mimisbrunnr  = await hre.ethers.getContractAt("Mimisbrunnr", mimisbrunnrAddr)
        uniswapFactory = new hre.ethers.Contract(factoryAddress, factoryAbi, accounts[0]) 
        nfpm = new hre.ethers.Contract(nfpmAddress, nfpmAbi, accounts[0])
        swapRouter = new hre.ethers.Contract(swapAddress, swapAbi, accounts[0])
        v3Staker = new hre.ethers.Contract(stakerAddress, stakerAbi, accounts[0])

        weth = new hre.ethers.Contract(wethAddress, wethAbi, accounts[0])
        rsc = new hre.ethers.Contract(rscAddress, rscAbi, accounts[0])
        hair = new hre.ethers.Contract(hairAddress, hairAbi, accounts[0])
        grow = new hre.ethers.Contract(growAddress, growAbi, accounts[0])
        vita = new hre.ethers.Contract(vitaAddress, vitaAbi, accounts[0])
        lake = new hre.ethers.Contract(lakeAddress, lakeAbi, accounts[0])

        rscWethPool = new hre.ethers.Contract(RSCWETH, poolAbi, accounts[0])
        hairWethPool = new hre.ethers.Contract(HAIRWETH, poolAbi, accounts[0])
        growWethPool = new hre.ethers.Contract(GROWWETH, poolAbi, accounts[0])
        vitaWethPool = new hre.ethers.Contract(VITAWETH, poolAbi, accounts[0])
        lakeWethPool = new hre.ethers.Contract(LAKEWETH, poolAbi, accounts[0])


        
    })


    it("should create the initial mimis positions", async () => {
        const createMimisPosition  = async (
            token:hre.ethers.Contract,
            pool: hre.ethers.Contract
        ) => {
            const wethAmount = hre.ethers.parseUnits('0.1', 'ether')
            await weth.deposit({value: wethAmount})
            await weth.approve(swapRouter, wethAmount)

            await swapRouter.exactInputSingle({
                tokenIn: wethAddress,
                tokenOut: await token.getAddress(),
                fee: await pool.fee(),
                recipient: accounts[0].address,
                deadline: Math.floor(new Date().getTime() / 1000) + 3600,
                amountIn: wethAmount,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })

            console.log('exact input single complete')
            const tokenAmount = await token.balanceOf(accounts[0].address)
            console.log('approving', tokenAmount)
            await token.approve(nfpmAddress, 0)
            await token.approve(nfpmAddress, tokenAmount)
            console.log('depositing weth')
            await weth.deposit({value: wethAmount})
            console.log('approving weth')
            await weth.approve(nfpmAddress, wethAmount)
            console.log('=========================')
            console.log('tokenamount:', tokenAmount)
            console.log('wethamount', wethAmount)
            console.log('=========================')
            console.log('attempting to mint position')
            const tickSpacing = Number(await pool.tickSpacing())
            const minttx = await nfpm.mint({
                token0: await pool.token0(),
                token1: await pool.token1(),
                fee: await pool.fee(),
                tickLower: Math.ceil(-887272 / tickSpacing) * tickSpacing,
                tickUpper: Math.floor(887272 / tickSpacing) * tickSpacing,
                amount0Desired: await pool.token0() == wethAddress ? wethAmount : tokenAmount,
                amount1Desired: await pool.token1() == wethAddress ? tokenAmount : wethAmount,
                amount0Min: 0,
                amount1Min: 0,
                recipient: await mimisbrunnr.getAddress(),
                deadline: Math.floor(new Date().getTime() / 1000) + 3600
            })
            await minttx.wait()
            console.log('mint complete')
            const filter =  nfpm.filters.Transfer()
            const events = await nfpm.queryFilter(
                filter,
                (await hre.ethers.provider.getBlockNumber()) - 1, 
                (await hre.ethers.provider.getBlockNumber())
            )
            
            await mimisbrunnr.setMimisPositionForToken(await token.getAddress(), events[0].args[2])
            console.log('position set')
            expect((await nfpm.ownerOf(events[0].args[2])).toString()).to.equal(await mimisbrunnr.getAddress())
            expect((await mimisbrunnr.pools(await token.getAddress())).mimisPosition).to.equal(events[0].args[2])

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

        const totalProtocolLiquidity = await mimisbrunnr.totalProtocolOwnedLiquidity()
        const totalSupply = await mimisbrunnr.totalSupply()
        const rscLiquidity = (await mimisbrunnr.pools(await rsc.getAddress())).protocolOwnedLiquidity
        const growLiquidity = (await mimisbrunnr.pools(await grow.getAddress())).protocolOwnedLiquidity
        const hairLiquidity = (await mimisbrunnr.pools(await hair.getAddress())).protocolOwnedLiquidity
        const vitaLiquidity = (await mimisbrunnr.pools(await vita.getAddress())).protocolOwnedLiquidity
        const lakeLiquidity = (await mimisbrunnr.pools(await lake.getAddress())).protocolOwnedLiquidity
        expect(rscLiquidity+growLiquidity+hairLiquidity+vitaLiquidity+lakeLiquidity).to.equal(totalProtocolLiquidity)
        expect(totalProtocolLiquidity).to.be.equal(totalSupply)
    })
    it("should accept a RSC WETH Liquidity position", async () => {
        const wethAmount = hre.ethers.parseUnits('0.1', 'ether')
        const wethtx = await weth.deposit({value: wethAmount})
        await wethtx.wait()
        const wethtx2 = await weth.deposit({value: wethAmount})
        await wethtx2.wait()
        const approvetx = await weth.approve(swapAddress, wethAmount)
        await approvetx.wait()

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
        await swapForRsc.wait()
        const rscBalance = await rsc.balanceOf(accounts[0].address)
        const rscallowance = await rsc.allowance(accounts[0].address, nfpmAddress)
        await rsc.approve(nfpmAddress, 0n)
        const approvetx3 = await rsc.approve(nfpmAddress, rscBalance)
        await approvetx3.wait()
        const wethtx3 = await weth.deposit({value: wethAmount})
        const approvetx4 = await weth.approve(nfpmAddress, wethAmount)
        await approvetx4.wait()
        const tickSpacing = Number(await rscWethPool.tickSpacing())
        const minttx = await nfpm.mint({
            token0: await rscWethPool.token0(),
            token1: await rscWethPool.token1(),
            fee: await rscWethPool.fee(),
            tickLower: Math.ceil(-887272 / tickSpacing) * tickSpacing,
            tickUpper: Math.floor(887272 / tickSpacing) * tickSpacing,
            amount0Desired: wethAmount,
            amount1Desired: await rsc.balanceOf(accounts[0]),
            amount0Min: 0,
            amount1Min: 0,
            recipient: accounts[0].address,
            deadline: Math.floor(new Date().getTime() / 1000) + 3600
        })
        await minttx.wait()

        const filterTransfer =  nfpm.filters.Transfer()
        const eventsTransfer = await nfpm.queryFilter(
            filterTransfer,
            (await hre.ethers.provider.getBlockNumber()) - 1, 
            (await hre.ethers.provider.getBlockNumber())
        )

        const approvetx5 = await nfpm.approve(await mimisbrunnr.getAddress(), eventsTransfer[0].args[2])
        await approvetx5.wait()
        const selltx = await mimisbrunnr.sellLP(eventsTransfer[0].args[2])
        await selltx.wait()

        const totalSupply = await mimisbrunnr.totalSupply()
        const totalProtocolLiquidity = await mimisbrunnr.totalProtocolOwnedLiquidity()
        const rscLiquidity = (await mimisbrunnr.pools(await rsc.getAddress())).protocolOwnedLiquidity
        const growLiquidity = (await mimisbrunnr.pools(await grow.getAddress())).protocolOwnedLiquidity
        const hairLiquidity = (await mimisbrunnr.pools(await hair.getAddress())).protocolOwnedLiquidity
        const vitaLiquidity = (await mimisbrunnr.pools(await vita.getAddress())).protocolOwnedLiquidity
        const lakeLiquidity = (await mimisbrunnr.pools(await lake.getAddress())).protocolOwnedLiquidity
        expect(rscLiquidity+growLiquidity+hairLiquidity+vitaLiquidity+lakeLiquidity).to.equal(totalProtocolLiquidity)
        expect(totalProtocolLiquidity).to.be.equal(totalSupply)


    })

    it("should unwrap mims", async () => {
        const mimBalance = await mimisbrunnr.balanceOf(accounts[0].address)
        console.log('============balances user ===========')
        console.log('mims', await mimisbrunnr.balanceOf(accounts[0]))
        console.log('weth', await weth.balanceOf(accounts[0]))
        console.log('rsc', await rsc.balanceOf(accounts[0]))
        console.log('grow', await grow.balanceOf(accounts[0]))
        console.log('lake', await lake.balanceOf(accounts[0]))
        console.log('vita', await vita.balanceOf(accounts[0]))
        console.log('hair', await hair.balanceOf(accounts[0]))
        console.log('=========poolLiqidity==============')
        console.log('rsc', await mimisbrunnr.pools(rscAddress))
        console.log('grow', await mimisbrunnr.pools(growAddress))
        console.log('lake', await mimisbrunnr.pools(lakeAddress))
        console.log('vita', await mimisbrunnr.pools(vitaAddress))
        console.log('hair', await mimisbrunnr.pools(hairAddress))
        console.log('=======================')
        const unwraptx = await mimisbrunnr.unwrapMimis(mimBalance)
        console.log(await mimisbrunnr.balanceOf(accounts[0].address))
        console.log('=======================')
        console.log('mims', await mimisbrunnr.balanceOf(accounts[0]))
        console.log('weth', await weth.balanceOf(accounts[0]))
        console.log('rsc', await rsc.balanceOf(accounts[0]))
        console.log('grow', await grow.balanceOf(accounts[0]))
        console.log('=======================')

        const totalSupply = await mimisbrunnr.totalSupply()
        const totalProtocolLiquidity = await mimisbrunnr.totalProtocolOwnedLiquidity()
        const rscLiquidity = (await mimisbrunnr.pools(await rsc.getAddress())).protocolOwnedLiquidity
        const growLiquidity = (await mimisbrunnr.pools(await grow.getAddress())).protocolOwnedLiquidity
        const hairLiquidity = (await mimisbrunnr.pools(await hair.getAddress())).protocolOwnedLiquidity
        const vitaLiquidity = (await mimisbrunnr.pools(await vita.getAddress())).protocolOwnedLiquidity
        const lakeLiquidity = (await mimisbrunnr.pools(await lake.getAddress())).protocolOwnedLiquidity
        expect(rscLiquidity+growLiquidity+hairLiquidity+vitaLiquidity+lakeLiquidity).to.equal(totalProtocolLiquidity)
        expect(totalProtocolLiquidity).to.be.equal(totalSupply+4n)
    })

    it("mint some mimis for initial liquidity", async () => {
        
        const zapMimis = async (
            token:hre.ethers.Contract,
            pool: hre.ethers.Contract,
            wethAmount:number
        ) => {
            const depositAmount = hre.ethers.parseUnits(String(2*wethAmount), 'ether')
            wethAmount = hre.ethers.parseUnits(String(wethAmount), 'ether')
         
            const wethtx = await weth.deposit({value: depositAmount})
            await wethtx.wait()
            const approvetx = await weth.approve(swapAddress, wethAmount)
            await approvetx.wait()

            const swap = await swapRouter.exactInputSingle({
                tokenIn: wethAddress,
                tokenOut: await token.getAddress(),
                fee: await pool.fee(),
                recipient: accounts[0].address,
                deadline: Math.floor(new Date().getTime() / 1000) + 3600,
                amountIn: wethAmount,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
            await swap.wait()
            const tokenBalance = await token.balanceOf(accounts[0].address)
            await token.approve(nfpmAddress, 0n)
            await token.approve(nfpmAddress, tokenBalance)
            //const wethtx3 = await weth.deposit({value: wethAmount})
            await weth.approve(nfpmAddress, wethAmount)
            
            const tickSpacing = Number(await pool.tickSpacing())
            const minttx = await nfpm.mint({
                token0: await pool.token0(),
                token1: await pool.token1(),
                fee: await pool.fee(),
                tickLower: Math.ceil(-887272 / tickSpacing) * tickSpacing,
                tickUpper: Math.floor(887272 / tickSpacing) * tickSpacing,
                amount0Desired: wethAmount,
                amount1Desired: tokenBalance,
                amount0Min: 0,
                amount1Min: 0,
                recipient: accounts[0].address,
                deadline: Math.floor(new Date().getTime() / 1000) + 3600
            })
            await minttx.wait()

            const filterTransfer =  nfpm.filters.Transfer()
            const eventsTransfer = await nfpm.queryFilter(
                filterTransfer,
                (await hre.ethers.provider.getBlockNumber()) - 1, 
                (await hre.ethers.provider.getBlockNumber())
            )

            const approvetx5 = await nfpm.approve(await mimisbrunnr.getAddress(), eventsTransfer[0].args[2])
            await approvetx5.wait()
            const selltx = await mimisbrunnr.sellLP(eventsTransfer[0].args[2])
            await selltx.wait()

        }

            await zapMimis(rsc, rscWethPool, 0.1)
            await zapMimis(grow, growWethPool, 0.1)
            await zapMimis(hair, hairWethPool, 0.1)
            await zapMimis(vita, vitaWethPool, 0.1)
            await zapMimis(lake, lakeWethPool, 0.1)

            const totalSupply = await mimisbrunnr.totalSupply()
            const totalProtocolLiquidity = await mimisbrunnr.totalProtocolOwnedLiquidity()
            const rscLiquidity = (await mimisbrunnr.pools(await rsc.getAddress())).protocolOwnedLiquidity
            const growLiquidity = (await mimisbrunnr.pools(await grow.getAddress())).protocolOwnedLiquidity
            const hairLiquidity = (await mimisbrunnr.pools(await hair.getAddress())).protocolOwnedLiquidity
            const vitaLiquidity = (await mimisbrunnr.pools(await vita.getAddress())).protocolOwnedLiquidity
            const lakeLiquidity = (await mimisbrunnr.pools(await lake.getAddress())).protocolOwnedLiquidity
            expect(rscLiquidity+growLiquidity+hairLiquidity+vitaLiquidity+lakeLiquidity).to.equal(totalProtocolLiquidity)
            expect(totalProtocolLiquidity).to.be.equal(totalSupply+4n)
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
        const setPooltx = await mimisbrunnr.setMimisPool(
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
            amount0Desired: await mimisbrunnr.balanceOf(accounts[0].address),
            amount1Desired: initialTokenAmount,
            amount0Min: 0,
            amount1Min: 0,
            recipient: accounts[0].address,
            deadline: Math.floor(new Date().getTime() / 1000) + 3600
        })

    })

    it("should create incentive in uniswap v3 staker", async () => {
        const rscIncentive = await v3Staker.createIncentive({
            rewardToken: rscAddress,
            poolAddress:  RSCWETH,
            startTime: Math.floor(new Date().getTime() / 1000),
            endTime: Math.floor(new Date().getTime() / 1000) + (365 * 24 * 60 * 60),
            refundee: await mimisbrunnr.getAddress()
        })
    })

})

