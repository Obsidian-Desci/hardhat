const hre = require('hardhat')

const clientLilypadAddr = process.env.CLIENT_ADDR

async function main() {
    const lilypadClient = await hre.ethers.getContractAt("LilypadClient", clientLilypadAddr)
    const cowsay = await lilypadClient.runCowsay('hello cowsay from hardhat', {
        //value: hre.ethers.parseUnits('2', 'ether')
    })
    console.log(cowsay)
}


main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});