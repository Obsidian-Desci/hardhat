import { ethers } from 'hardhat'

import { address as swapAddress, abi as swapAbi } from '../../abi/SwapRouter.json'
import { address as nfpmAddress, abi as nfpmAbi } from "../../abi/NonFungiblePositionManager.json"
import { abi as poolAbi } from "../../abi/UniswapV3Pool.json"

import * as ARTIFACTS from './artifacts'



export const swapForDesciToken = async (
    artifact: ARTIFACTS.Artifact,
    amountWeth: number,
    account: ethers.Signer
) => {
    console.log('swapping for Desci token:')
    const weth = new ethers.Contract(ARTIFACTS.WETH.address, ARTIFACTS.WETH.abi, account)
    const swapRouter = new ethers.Contract(swapAddress, swapAbi, account)

    const token = new ethers.Contract(artifact.address, artifact.abi, account)
    const pool = new ethers.Contract(artifact.poolAddr, poolAbi, account)

    const wethWei = ethers.parseUnits(String(amountWeth), 'ether')
    const currentWethBalance = await weth.balanceOf(account.address)
    if (currentWethBalance <= wethWei) {
        await (await weth.deposit({ value: wethWei - currentWethBalance })).wait()
    }
    const wethApprovalForSwapRouter = await weth.allowance(account.address, await swapRouter.getAddress())
    if (wethApprovalForSwapRouter <= wethWei) {
        await (await weth.approve(await swapRouter.getAddress(), wethWei)).wait()
    }
    console.log('attempting swap')
    await (await swapRouter.exactInputSingle({
        tokenIn: await weth.getAddress(),
        tokenOut: await token.getAddress(),
        fee: await pool.fee(),
        recipient: account.address,
        deadline: Math.floor(new Date().getTime() / 1000) + 3600,
        amountIn: wethWei,
        amountOutMinimum: 0,
        sqrtPriceLimitX96: 0
    })).wait()
    console.log('swap complete')
}

export const mintMimis = async (
    artifact: ARTIFACTS.Artifact,
    amountWeth: number,
    account: Signer,
    initialPosition?: boolean
) => {
    initialPosition = initialPosition ? initialPosition : false
    console.log('minting mimis ')
    const mimisbrunnr = new ethers.Contract(ARTIFACTS.MIMISBRUNNR.address, ARTIFACTS.MIMISBRUNNR.abi, account)
    const nfpm = new ethers.Contract(nfpmAddress, nfpmAbi, account)
    const weth = new ethers.Contract(ARTIFACTS.WETH.address, ARTIFACTS.WETH.abi, account)

    const token = new ethers.Contract(artifact.address, artifact.abi, account)
    const pool = new ethers.Contract(artifact.poolAddr, poolAbi, account)

    const wethWei = ethers.parseUnits(String(amountWeth), 'ether')
    const currentWethBalance = await weth.balanceOf(account.address)
    if (currentWethBalance < wethWei) {
    console.log('depositing weth')
    await (await weth.deposit({ value: wethWei })).wait()
    }
    const tokenAmount = await token.balanceOf(account.address)

    const wethApprovalForNfpm = await weth.allowance(account.address, await nfpm.getAddress())
    if (wethApprovalForNfpm <= wethWei) {
    console.log('approving weth')
    await (await weth.approve(await nfpm.getAddress(), wethWei * 2n)).wait()
    }

    const tokenApprovalForNfpm = await token.allowance(account.address, await nfpm.getAddress())
    if (tokenApprovalForNfpm <= tokenAmount) {
    console.log('approving token')
    await (await token.approve(await nfpm.getAddress(), 0)).wait()
    await (await token.approve(await nfpm.getAddress(), tokenAmount * 2n)).wait()
    }
    console.log('minting')
    const tickSpacing = Number(await pool.tickSpacing())
    const nfpmtx = await nfpm.mint({
        token0: await pool.token0(),
        token1: await pool.token1(),
        fee: await pool.fee(),
        tickLower: Math.ceil(-887272 / tickSpacing) * tickSpacing,
        tickUpper: Math.floor(887272 / tickSpacing) * tickSpacing,
        amount0Desired: (
            ethers.getAddress(await pool.token0()) ==
            ethers.getAddress(await weth.getAddress())
        ) ? wethWei : tokenAmount,
        amount1Desired: (
            ethers.getAddress(await pool.token1()) ==
            ethers.getAddress(await weth.getAddress())
        ) ? wethWei : tokenAmount,
        amount0Min: 0,
        amount1Min: 0,
        recipient: initialPosition ? await mimisbrunnr.getAddress() : account.address,
        deadline: Math.floor(new Date().getTime() / 1000) + 3600
    })
    console.log('mint complete')
    await nfpmtx.wait()
    const filter = nfpm.filters.Transfer(
        null,
        initialPosition ? await mimisbrunnr.getAddress() : account.address,
        null
    )
    const events = await nfpm.queryFilter(
        filter,
        (await ethers.provider.getBlockNumber()) - 1,
        (await ethers.provider.getBlockNumber())
    )
    console.log(events[0].args[2])
    if (initialPosition) {
        await mimisbrunnr.setMimisPositionForToken(artifact.address, events[0].args[2])
        return events[0].args[2]
    } else {
        await (await nfpm.approve(await mimisbrunnr.getAddress(), events[0].args[2])).wait()
        console.log('approve complete')
        await (await mimisbrunnr.sellLP(events[0].args[2])).wait()
    }

}

export const mintMimisLP = async (
    artifact: ARTIFACTS.Artifact,
    amountWeth: number,
    account: Signer
) => {
    console.log('minting mimis ')
    const mimisbrunnr = new ethers.Contract(ARTIFACTS.MIMISBRUNNR.address, ARTIFACTS.MIMISBRUNNR.abi, account)

    const pool = new ethers.Contract(ARTIFACTS.MIMISBRUNNR.poolAddr, poolAbi, account)

    const nfpm = new ethers.Contract(nfpmAddress, nfpmAbi, account)
    const weth = new ethers.Contract(ARTIFACTS.WETH.address, ARTIFACTS.WETH.abi, account)

    const wethWei = ethers.parseUnits(String(amountWeth), 'ether')
    const currentWethBalance = await weth.balanceOf(account.address)
    if (currentWethBalance < wethWei) {
        console.log('depositing weth')
        await (await weth.deposit({ value: wethWei })).wait()
    }
    const tokenAmount = await mimisbrunnr.balanceOf(account.address)

    const wethApprovalForNfpm = await weth.allowance(account.address, await nfpm.getAddress())
    if (wethApprovalForNfpm <= wethWei) {
        console.log('approving weth')
        await (await weth.approve(await nfpm.getAddress(), wethWei * 2n)).wait()
    }
    const tokenApprovalForNfpm = await mimisbrunnr.allowance(account.address, await nfpm.getAddress())
    if (tokenApprovalForNfpm <= tokenAmount) {
        await (await mimisbrunnr.approve(await nfpm.getAddress(), tokenAmount * 2n)).wait()
    }

    const tickSpacing = Number(await pool.tickSpacing())
    const nfpmtx = await nfpm.mint({
        token0: await pool.token0(),
        token1: await pool.token1(),
        fee: await pool.fee(),
        tickLower: Math.ceil(-887272 / tickSpacing) * tickSpacing,
        tickUpper: Math.floor(887272 / tickSpacing) * tickSpacing,
        amount0Desired: (
            ethers.getAddress(await pool.token0()) ==
            ethers.getAddress(await weth.getAddress())
        ) ? wethWei : tokenAmount,
        amount1Desired: (
            ethers.getAddress(await pool.token1()) ==
            ethers.getAddress(await weth.getAddress())
        ) ? wethWei : tokenAmount,
        amount0Min: 0,
        amount1Min: 0,
        recipient: account.address,
        deadline: Math.floor(new Date().getTime() / 1000) + 3600
    })
    console.log('mint complete')
    await nfpmtx.wait()
    const filter = nfpm.filters.Transfer(null, account.address, null)
    const events = await nfpm.queryFilter(
        filter,
        (await ethers.provider.getBlockNumber()) - 1,
        (await ethers.provider.getBlockNumber())
    )
    return events[0].args[2]
}


export const createMimisPosition = async (
    artifact: ARTIFACTS.Artifact,
    wethAmount: number,
    account: ethers.Signer
) => {
    await swapForDesciToken(artifact, wethAmount, account)
    const tokenId = await mintMimis(artifact, wethAmount, account, true)
    return tokenId
}
