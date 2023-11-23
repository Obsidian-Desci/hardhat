import hre from 'hardhat'
import MimisBrunnr from '../artifacts/contracts/Mimisbrunnr.sol/Mimisbrunnr.json'
import { address as wethAddress, abi as wethAbi } from "../abi/WETH.json"
async function main() {
  const signers = await hre.ethers.getSigners();
  const weth = new hre.ethers.Contract(wethAddress, wethAbi, signers[0])
  console.log(await weth.balanceOf(signers[0].address))
}


main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});