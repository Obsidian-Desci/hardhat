import hre from 'hardhat'
import * as fs from 'node:fs'
import MimisBrunnr from '../artifacts/contracts/Mimisbrunnr.sol/Mimisbrunnr.json'
export async function main() {

  const mimisbrunnr = await hre.ethers.deployContract(
    "Mimisbrunnr", []
    );

  await mimisbrunnr.waitForDeployment();
  console.log(await mimisbrunnr.getAddress())

  fs.writeFile('./abi/MimisbrunnrV2.json', JSON.stringify({
    address: await mimisbrunnr.getAddress(),
    abi:MimisBrunnr.abi
  }), (err) => {
    if (err) {
      console.log(err)
    }
  });
  return await mimisbrunnr.getAddress()
 
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
