import hre from 'hardhat'
import { address as factoryAddress, abi as factoryAbi } from "../abi/UniswapV3Factory.json"
import {address as poolAddress, abi as poolAbi} from "../abi/UniswapV3Pool.json"

import { abi as wFilAbi } from "../abi/WETH.json"
export async function main() {
    const accounts = await hre.ethers.getSigners()

    const wfil = new hre.ethers.Contract("0x60E1773636CF5E4A227d9AC24F20fEca034ee25A", wFilAbi, accounts[0])
    const usdt = new hre.ethers.Contract("0x422849B355039bC58F2780cc4854919fC9cfaF94", wFilAbi, accounts[0])

    const uniswapFactory = new hre.ethers.Contract(factoryAddress, factoryAbi, accounts[0])

    const initialUSDTAmount = hre.ethers.parseUnits('4', 'ether')
    const initialWFILAmount = hre.ethers.parseUnits('1', 'ether')
    const depositWethtx = await wfil.deposit({ value: initialWFILAmount })
    await depositWethtx.wait()
        const pooltx = await uniswapFactory.createPool(
            await wfil.getAddress(),
            await usdt.getAddress(),
            3000
        )
        await pooltx.wait()

        const poolAddr = await uniswapFactory.getPool(
            await wfil.getAddress(),
            await usdt.getAddress(),
            3000
        )
        console.log('poolAddr', poolAddr)
        const pool = new hre.ethers.Contract(poolAddr, poolAbi, accounts[0])

    /*
      sqrtPriceX96 = sqrt(price) * 2 ** 96
    # divide both sides by 2 ** 96
    sqrtPriceX96 / (2 ** 96) = sqrt(price)
    # square both sides
    (sqrtPriceX96 / (2 ** 96)) ** 2 = price
    # expand the squared fraction
    (sqrtPriceX96 ** 2) / ((2 ** 96) ** 2)  = price
    # multiply the exponents in the denominator to get the final expression
    sqrtRatioX96 ** 2 / 2 ** 192 = price
        const sqrtPriceX96 = 1n * 2n ** 96n



        console.log(sqrtPriceX96)
        const initTx = await mimisWethPool.initialize(
           sqrtPriceX96 
        )
        await initTx.wait()
    */
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
