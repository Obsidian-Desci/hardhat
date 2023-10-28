import hre from 'hardhat'
export async function main() {

  const mimisbrunnr = await hre.ethers.deployContract(
    "Mimisbrunnr", []
    );

  await mimisbrunnr.waitForDeployment();
  console.log(await mimisbrunnr.getAddress())
  return await mimisbrunnr.getAddress()
 
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
