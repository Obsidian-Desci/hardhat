import hre from 'hardhat'
import * as fs from 'node:fs'
import MimisBrunnr from '../artifacts/contracts/Mimisbrunnr.sol/Mimisbrunnr.json'
import Staker from '../artifacts/contracts/Staker/Staker.sol/Staker.json'
import { address as factoryAddress, abi as factoryAbi } from "../abi/UniswapV3Factory.json"
import {abi as poolAbi} from "../abi/UniswapV3Pool.json"
import { address as wethAddress, abi as wethAbi } from "../abi/WETH.json"

export async function main() {
  const signers = await hre.ethers.getSigners();
  const mimisbrunnr = await hre.ethers.deployContract(
    "Mimisbrunnr", []
    );

  await mimisbrunnr.waitForDeployment();
  const mimisaddr = await mimisbrunnr.getAddress()

  const factory = new hre.ethers.Contract(
    factoryAddress,
    factoryAbi,
    signers[0]
  )

  const pooltx = await factory.createPool(
      await mimisbrunnr.getAddress(),
      wethAddress,
      10000
  )
  await pooltx.wait()

  const sqrtPriceX96 = 1n * 2n ** 96n
  const poolAddr = await factory.getPool(
      mimisaddr,
      wethAddress,
      10000
  )

  const pool = new hre.ethers.Contract(
      poolAddr, poolAbi, signers[0]
  )

  const initTx = await pool.initialize(
      sqrtPriceX96
  )
  await initTx.wait()

  const staker = await hre.ethers.deployContract("Staker",[mimisaddr, poolAddr])
  await mimisbrunnr.setStakingContract(await staker.getAddress())
  console.log('mimisbrunnr addr', await mimisbrunnr.getAddress())
  fs.writeFile('./abi/MimisbrunnrV2.json', JSON.stringify({
    address: await mimisbrunnr.getAddress(),
    abi:MimisBrunnr.abi
  }), (err) => {
    if (err) {
      console.log(err)
    }
  });
  fs.writeFile('./abi/Staker.json', JSON.stringify({
    address: await staker.getAddress(),
    abi:Staker.abi
  }), (err) => {
    if (err) {
      console.log(err)
    }
  });
  fs.writeFile('./abi/MIMISWETHPool.json', JSON.stringify({
    address: poolAddr,
    abi: poolAbi
  }), (err) => {
    if (err) {
      console.log(err)
    }
  });
  return { 
    mimisAddr: await mimisbrunnr.getAddress(),
    stakerAddr: await staker.getAddress(),
    poolAddr: poolAddr
  }
 
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
