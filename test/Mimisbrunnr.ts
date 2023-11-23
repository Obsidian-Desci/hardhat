import hre from 'hardhat'
import { main } from '../scripts/deployMimisbrunnr'
import { swapForDesciToken, mintMimis, mintMimisLP, createMimisPosition } from '../scripts/utils/utils'
import * as ARTIFACTS from '../scripts/utils/artifacts'
import { expect } from 'chai'
import { address as factoryAddress, abi as factoryAbi } from "../abi/UniswapV3Factory.json"
import { address as nfpmAddress, abi as nfpmAbi } from "../abi/NonFungiblePositionManager.json"
import { address as swapAddress, abi as swapAbi } from '../abi/SwapRouter.json'
import { abi as poolAbi } from "../abi/UniswapV3Pool.json"
//import { address as stakerAddress, abi as stakerAbi} from '../abi/V3Staker.json'


import { address as wethAddress, abi as wethAbi } from "../abi/WETH.json"
import { address as rscAddress, abi as rscAbi } from "../abi/RSC.json"
import { address as growAddress, abi as growAbi } from "../abi/GROW.json"
import { address as hairAddress, abi as hairAbi } from "../abi/HAIR.json"
import { address as lakeAddress, abi as lakeAbi } from "../abi/LAKE.json"
import { address as vitaAddress, abi as vitaAbi } from "../abi/VITA.json"

import { Mimisbrunnr } from '../typechain-types'

const RSCWETH = "0xeC2061372a02D5e416F5D8905eea64Cab2c10970"
const GROWWETH = "0x61847189477150832D658D8f34f84c603Ac269af"
const HAIRWETH = "0x94DD312F6Cb52C870aACfEEb8bf5E4e28F6952ff"
const LAKEWETH = "0xeFd69F1FF464Ed673dab856c5b9bCA4D2847a74f"
const VITAWETH = "0xcBcC3cBaD991eC59204be2963b4a87951E4d292B"

describe("Mimisbrunnr", async () => {
    let accounts: hre.ethers.Signer[];
    let mimisbrunnr: Mimisbrunnr;
    let staker: Staker;
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

    let tokenArray: hre.ethers.Contract;
    let artifactsArray: ARTIFACTS.Artifact[];
    let mimisWethPool: hre.ethers.Contract;
    let rscWethPool: hre.ethers.Contract;
    let growWethPool: hre.ethers.Contract;
    let hairWethPool: hre.ethers.Contract;
    let lakeWethPool: hre.ethers.Contract;
    let vitaWethPool: hre.ethers.Contract;

    let nftIdToUnstake
    const zapMimis = async (
        token: hre.ethers.Contract,
        pool: hre.ethers.Contract,
        wethAmount: number | BigInt,
        account: hre.Signer
    ) => {
        const depositAmount = hre.ethers.parseUnits(String(2 * wethAmount), 'ether')
        wethAmount = hre.ethers.parseUnits(String(wethAmount), 'ether')

        const wethtx = await weth.connect(account).deposit({ value: depositAmount })
        await wethtx.wait()
        const approvetx = await weth.connect(account).approve(swapAddress, wethAmount)
        await approvetx.wait()

        const swap = await swapRouter.connect(account).exactInputSingle({
            tokenIn: wethAddress,
            tokenOut: await token.getAddress(),
            fee: await pool.fee(),
            recipient: account.address,
            deadline: Math.floor(new Date().getTime() / 1000) + 3600,
            amountIn: wethAmount,
            amountOutMinimum: 0,
            sqrtPriceLimitX96: 0
        })
        await swap.wait()
        const tokenBalance = await token.balanceOf(account.address)
        await token.connect(account).approve(nfpmAddress, 0n)
        await token.connect(account).approve(nfpmAddress, tokenBalance)
        //const wethtx3 = await weth.deposit({value: wethAmount})
        await weth.connect(account).approve(nfpmAddress, wethAmount)

        const tickSpacing = Number(await pool.tickSpacing())
        const minttx = await nfpm.connect(account).mint({
            token0: await pool.token0(),
            token1: await pool.token1(),
            fee: await pool.fee(),
            tickLower: Math.ceil(-887272 / tickSpacing) * tickSpacing,
            tickUpper: Math.floor(887272 / tickSpacing) * tickSpacing,
            amount0Desired: wethAmount,
            amount1Desired: tokenBalance,
            amount0Min: 0,
            amount1Min: 0,
            recipient: account.address,
            deadline: Math.floor(new Date().getTime() / 1000) + 3600
        })
        await minttx.wait()

        const filterTransfer = nfpm.filters.Transfer()
        const eventsTransfer = await nfpm.queryFilter(
            filterTransfer,
            (await hre.ethers.provider.getBlockNumber()) - 1,
            (await hre.ethers.provider.getBlockNumber())
        )

        const approvetx5 = await nfpm.connect(account).approve(await mimisbrunnr.getAddress(), eventsTransfer[0].args[2])
        await approvetx5.wait()
        const selltx = await mimisbrunnr.connect(account).sellLP(eventsTransfer[0].args[2])
        await selltx.wait()

    }

    function AccountBalances({ account, balanceMim, balanceWeth, balanceRsc, balanceGrow, balanceHair, balanceVita, balanceLake }) {
        this.account = `${account.substring(0, 6)}...${account.substring(account.length - 4)}`
        this.mimis = balanceMim
        this.Weth = balanceWeth
        this.rsc = balanceRsc
        this.grow = balanceGrow
        this.hair = balanceHair
        this.vita = balanceVita
        this.lake = balanceLake
    }

    const createAccountBalances = async (account) => {
        const balanceMim = await mimisbrunnr.balanceOf(account)
        const balanceWeth = await weth.balanceOf(account)
        const balanceRsc = await rsc.balanceOf(account)
        const balanceGrow = await grow.balanceOf(account)
        const balanceHair = await hair.balanceOf(account)
        const balanceVita = await vita.balanceOf(account)
        const balanceLake = await lake.balanceOf(account)
        return new AccountBalances({ account, balanceMim, balanceWeth, balanceRsc, balanceGrow, balanceHair, balanceVita, balanceLake })
    }

    function StakerBalance({ symbol, balance, unclaimedReward }) {
        this.symbol = symbol
        this.balance = balance
        this.unclaimedReward = unclaimedReward
    }
    const createStakerBalance = async (token) => {
        const symbol = await token.symbol()
        const balance = await token.balanceOf(await staker.getAddress())
        const incentiveKey = await staker.incentiveKeys(await token.getAddress())
        const encodedIncentiveKey = hre.ethers.AbiCoder.defaultAbiCoder().encode(
            ['address', 'address', 'uint256', 'uint256', 'address'], incentiveKey);
        const hashedIncentiveKey = hre.ethers.keccak256(encodedIncentiveKey);
        const incentive = await staker.incentives(hashedIncentiveKey)
        const unclaimedReward = incentive.totalRewardUnclaimed
        return { symbol, balance, unclaimedReward }
    }

    before(async () => {
        accounts = await hre.ethers.getSigners()
        const { mimisAddr, stakerAddr, poolAddr } = await main()
        mimisbrunnr = await hre.ethers.getContractAt("Mimisbrunnr", mimisAddr)
        staker = await hre.ethers.getContractAt("Staker", stakerAddr)
        mimisWethPool = new hre.ethers.Contract(poolAddr, poolAbi, accounts[0])

        uniswapFactory = new hre.ethers.Contract(factoryAddress, factoryAbi, accounts[0])
        nfpm = new hre.ethers.Contract(nfpmAddress, nfpmAbi, accounts[0])
        swapRouter = new hre.ethers.Contract(swapAddress, swapAbi, accounts[0])

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


        tokenArray = [
            { token: rsc, pool: rscWethPool },
            { token: grow, pool: growWethPool },
            { token: hair, pool: hairWethPool },
            { token: vita, pool: vitaWethPool },
            { token: lake, pool: lakeWethPool }
        ]

        artifactsArray = [
            ARTIFACTS.RSC,
            ARTIFACTS.GROW,
            ARTIFACTS.HAIR,
            ARTIFACTS.VITA,
            ARTIFACTS.LAKE
        ]

    })

    it("should create the initial mimis positions", async () => {
        for await (const artifact of artifactsArray) {
            const positionId = await createMimisPosition(artifact, 1, accounts[0])
            expect((await nfpm.ownerOf(positionId)).toString()).to.equal(await mimisbrunnr.getAddress())
            expect((await mimisbrunnr.pools(artifact.address)).mimisPosition).to.equal(positionId)
        }

        const totalProtocolLiquidity = await mimisbrunnr.totalProtocolOwnedLiquidity()
        const totalSupply = await mimisbrunnr.totalSupply()
        const rscLiquidity = (await mimisbrunnr.pools(await rsc.getAddress())).protocolOwnedLiquidity
        const growLiquidity = (await mimisbrunnr.pools(await grow.getAddress())).protocolOwnedLiquidity
        const hairLiquidity = (await mimisbrunnr.pools(await hair.getAddress())).protocolOwnedLiquidity
        const vitaLiquidity = (await mimisbrunnr.pools(await vita.getAddress())).protocolOwnedLiquidity
        const lakeLiquidity = (await mimisbrunnr.pools(await lake.getAddress())).protocolOwnedLiquidity
        expect(rscLiquidity + growLiquidity + hairLiquidity + vitaLiquidity + lakeLiquidity).to.equal(totalProtocolLiquidity)
        expect(totalProtocolLiquidity).to.be.equal(totalSupply)
    })
    it("should accept a RSC WETH Liquidity position", async () => {

        await swapForDesciToken(ARTIFACTS.RSC, 1, accounts[0])
        await mintMimis(ARTIFACTS.RSC, 1, accounts[0])

        const totalSupply = await mimisbrunnr.totalSupply()
        const totalProtocolLiquidity = await mimisbrunnr.totalProtocolOwnedLiquidity()
        const rscLiquidity = (await mimisbrunnr.pools(await rsc.getAddress())).protocolOwnedLiquidity
        const growLiquidity = (await mimisbrunnr.pools(await grow.getAddress())).protocolOwnedLiquidity
        const hairLiquidity = (await mimisbrunnr.pools(await hair.getAddress())).protocolOwnedLiquidity
        const vitaLiquidity = (await mimisbrunnr.pools(await vita.getAddress())).protocolOwnedLiquidity
        const lakeLiquidity = (await mimisbrunnr.pools(await lake.getAddress())).protocolOwnedLiquidity
        expect(rscLiquidity + growLiquidity + hairLiquidity + vitaLiquidity + lakeLiquidity).to.equal(totalProtocolLiquidity)
        expect(totalProtocolLiquidity).to.be.equal(totalSupply)



    })

    it("should unwrap mims", async () => {
        const mimBalance = await mimisbrunnr.balanceOf(accounts[0].address)
        const unwraptx = await mimisbrunnr.unwrapMimis(mimBalance)

        const totalSupply = await mimisbrunnr.totalSupply()
        const totalProtocolLiquidity = await mimisbrunnr.totalProtocolOwnedLiquidity()
        const rscLiquidity = (await mimisbrunnr.pools(await rsc.getAddress())).protocolOwnedLiquidity
        const growLiquidity = (await mimisbrunnr.pools(await grow.getAddress())).protocolOwnedLiquidity
        const hairLiquidity = (await mimisbrunnr.pools(await hair.getAddress())).protocolOwnedLiquidity
        const vitaLiquidity = (await mimisbrunnr.pools(await vita.getAddress())).protocolOwnedLiquidity
        const lakeLiquidity = (await mimisbrunnr.pools(await lake.getAddress())).protocolOwnedLiquidity
        expect(rscLiquidity + growLiquidity + hairLiquidity + vitaLiquidity + lakeLiquidity).to.equal(totalProtocolLiquidity)
        expect(totalProtocolLiquidity).to.be.equal(totalSupply + 2n)
    })

    it("mint some mimis for initial liquidity", async () => {

        for await (const artifact of artifactsArray) {
            await swapForDesciToken(artifact, 1, accounts[0])
            await mintMimis(artifact, 1, accounts[0])
            await mintMimisLP(artifact, 1, accounts[0])
        }

        const totalSupply = await mimisbrunnr.totalSupply()
        const totalProtocolLiquidity = await mimisbrunnr.totalProtocolOwnedLiquidity()
        const rscLiquidity = (await mimisbrunnr.pools(await rsc.getAddress())).protocolOwnedLiquidity
        const growLiquidity = (await mimisbrunnr.pools(await grow.getAddress())).protocolOwnedLiquidity
        const hairLiquidity = (await mimisbrunnr.pools(await hair.getAddress())).protocolOwnedLiquidity
        const vitaLiquidity = (await mimisbrunnr.pools(await vita.getAddress())).protocolOwnedLiquidity
        const lakeLiquidity = (await mimisbrunnr.pools(await lake.getAddress())).protocolOwnedLiquidity
        expect(rscLiquidity + growLiquidity + hairLiquidity + vitaLiquidity + lakeLiquidity).to.equal(totalProtocolLiquidity)
        expect(totalProtocolLiquidity).to.be.equal(totalSupply + 2n)


        const liquidity = await mimisWethPool.liquidity()
        console.log('mimisWeth Liquidity', liquidity)

    })


    it("stake a MIMIS/WETH position", async () => {
        await swapForDesciToken(ARTIFACTS.RSC, 1, accounts[0])
        await mintMimis(ARTIFACTS.RSC, 1, accounts[0])
        nftIdToUnstake = await mintMimisLP(ARTIFACTS.RSC, 1, accounts[0])
        await nfpm["safeTransferFrom(address,address,uint256,bytes)"](accounts[0].address, await staker.getAddress(), nftIdToUnstake, "0x00")
    })

    it("conducts swap party to generate tx fees and advance the block time", async () => {

        const swapParty = async (account) => {
            for await (const artifact of artifactsArray) {
                const pool = new hre.ethers.Contract(artifact.poolAddr, poolAbi, account)
                const token = new hre.ethers.Contract(artifact.address, artifact.abi, account)
                await swapForDesciToken(artifact, 1, account)

                await (await token.approve(await swapRouter.getAddress(), await token.balanceOf(account.address))).wait()
                const swapBack = await swapRouter.connect(account).exactInputSingle({
                    tokenIn: artifact.address,
                    tokenOut: wethAddress,
                    fee: await pool.fee(),
                    recipient: account.address,
                    deadline: Math.floor(new Date().getTime() / 1000) + 3600,
                    amountIn: (await token.balanceOf(account.address)) / 2n,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
                await swapBack.wait()
                await mintMimis(artifact, 0.5, account)
                await hre.network.provider.send("evm_increaseTime", [3600 * 2])
            }
        }
        console.log('/********************************/')
        console.log('======Pre swap Party======')
        console.log('======staker balances======')
        console.table([
            new StakerBalance(await createStakerBalance(rsc)),
            new StakerBalance(await createStakerBalance(grow)),
            new StakerBalance(await createStakerBalance(hair)),
            new StakerBalance(await createStakerBalance(vita)),
            new StakerBalance(await createStakerBalance(lake)),
            new StakerBalance(await createStakerBalance(weth))
        ])
        console.log('======accounts balances======') 
        console.table([
            await createAccountBalances(accounts[0].address),
            await createAccountBalances(accounts[1].address),
            await createAccountBalances(accounts[2].address),
            await createAccountBalances(accounts[3].address),
            await createAccountBalances(accounts[4].address),
            await createAccountBalances(accounts[5].address),
            await createAccountBalances(accounts[6].address),
        ])
        let j = 0
        while (j < 10) {
            await swapParty(accounts[j + 1])
            j++
        }

        console.log('/********************************/')
        console.log('======Post swap Party======')
        console.log('======staker balances======')
        console.table([
            new StakerBalance(await createStakerBalance(rsc)),
            new StakerBalance(await createStakerBalance(grow)),
            new StakerBalance(await createStakerBalance(hair)),
            new StakerBalance(await createStakerBalance(vita)),
            new StakerBalance(await createStakerBalance(lake)),
            new StakerBalance(await createStakerBalance(weth))
        ])
        console.log('======accounts balances======') 
        console.table([
            await createAccountBalances(accounts[0].address),
            await createAccountBalances(accounts[1].address),
            await createAccountBalances(accounts[2].address),
            await createAccountBalances(accounts[3].address),
            await createAccountBalances(accounts[4].address),
            await createAccountBalances(accounts[5].address),
            await createAccountBalances(accounts[6].address),
        ])

    })

    it("unwraps mimis", async () => {

        console.log('attempting to unwrap mimis')
        const unwrapTx = await mimisbrunnr.unwrapMimis(
            hre.ethers.parseUnits('140.22434782', 'ether')
        )

        console.log('===============unstake=============')
        console.table([
            await createAccountBalances(accounts[0].address),
            await createAccountBalances(await staker.getAddress())
        ])
        /*
        const rewardInfo = await staker.getRewardInfo(
            await rsc.getAddress(), nftIdToUnstake
        )
        console.log('rewardInfo', rewardInfo)
        */
       const rscBalance = await rsc.balanceOf(accounts[0].address)
       const growBalance = await grow.balanceOf(accounts[0].address)
       const hairBalance = await hair.balanceOf(accounts[0].address)
       const vitaBalance = await vita.balanceOf(accounts[0].address)
       const lakeBalance = await lake.balanceOf(accounts[0].address)
       const wethBalance = await weth.balanceOf(accounts[0].address)

        await (await staker.unstakeToken(nftIdToUnstake)).wait()

        await (await staker.claimRewards(
            accounts[0].address,
        )).wait()

        expect(await rsc.balanceOf(accounts[0].address)).to.greaterThan(rscBalance)
        expect(await grow.balanceOf(accounts[0].address)).to.greaterThan(growBalance)
        expect(await hair.balanceOf(accounts[0].address)).to.greaterThan(hairBalance)
        expect(await vita.balanceOf(accounts[0].address)).to.greaterThan(vitaBalance)
        expect(await lake.balanceOf(accounts[0].address)).to.greaterThan(lakeBalance)
        expect(await weth.balanceOf(accounts[0].address)).to.greaterThan(wethBalance)

        /*
        */
        console.table([
            await createAccountBalances(accounts[0].address),
            await createAccountBalances(await staker.getAddress())
        ])
        console.table([
             new StakerBalance(await createStakerBalance(rsc)),
             new StakerBalance(await createStakerBalance(grow)),
             new StakerBalance(await createStakerBalance(hair)),
             new StakerBalance(await createStakerBalance(vita)),
             new StakerBalance(await createStakerBalance(lake)),
             new StakerBalance(await createStakerBalance(weth))
        ])
    })

})

