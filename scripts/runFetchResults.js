const hre = require('hardhat')

const clientLilypadAddr = process.env.CLIENT_ADDR

async function main() {
    const exampleClient = await hre.ethers.getContractAt("ExampleClient", clientLilypadAddr)
    const cowsay = await exampleClient.fetchAllResults()
    console.log(cowsay)
}


main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});