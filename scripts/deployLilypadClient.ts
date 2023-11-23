// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
import hre from 'hardhat'
import {address as lilypadControllerAddress, abi as lilypadControllerAbi} from '../abi/LilypadController.json'
import {abi as onChainJobCreatorAbi} from '../abi/LilypadOnChainJobCreator.json'
import {abi as lilypadTokenAbi} from '../abi/LilypadToken.json'
async function main() {
  const signers = await hre.ethers.getSigners()
  const controller = new hre.ethers.Contract(
    lilypadControllerAddress,
    lilypadControllerAbi,
    signers[0]
  )
  const creatorAddr = await controller.getJobCreatorAddress()
  console.log('creatorAddr', creatorAddr)
  const creator = new hre.ethers.Contract(
    creatorAddr,
    onChainJobCreatorAbi,
    signers[0]
  )

  const tokenAddress = await creator.getTokenAddress()
  const token = new hre.ethers.Contract(
    tokenAddress,
    lilypadTokenAbi,
    signers[0]
  )
  const balance = await token.balanceOf(signers[0].address)
  const price = await creator.getRequiredDeposit()
  const solver = await creator.getControllerAddress()
  const allow = await (await token.approve(solver, price)).wait()
  console.log('price', price.toString())    
 
  console.log('balance', balance.toString())
  

  const runCowsay = async () => {return await new Promise(async (res,rej) => {
    creator.on("JobAdded", async (
      id,
      calling_contract,
      payee,
      module,
      inputs
    ) => {
      console.log('JobAdded', id)
      res(id)
    })

    const cowsay = await(await creator.runJob(
      'cowsay',
      ['hello Cowsay'],
      signers[0].address
    )).wait()
  })
  }

  const jobId = await runCowsay()






  /*
  const lilypadClient = await hre.ethers.deployContract(
    "LilypadClient", []
    );

  await lilypadClient.waitForDeployment();
  console.log(await lilypadClient.getAddress())
  return await lilypadClient.getAddress()
*/
 
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

exports.main = main
