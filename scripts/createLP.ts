import hre from 'hardhat'
import * as fs from 'node:fs'

import * as ARTIFACTS from './utils/artifacts'
import { swapForDesciToken, mintMimis, mintMimisLP } from './utils/utils';

export async function main() {
  const signers = await hre.ethers.getSigners();
  const createPosition = async (
    artifact: ARTIFACTS.Artifact,
    wethAmount: number,
    account: hre.ethers.Signer
  ) => {
    await swapForDesciToken(artifact, wethAmount, account)
    await mintMimis(artifact, wethAmount, account)
    await mintMimisLP(artifact, wethAmount, account)
  }
  await createPosition(ARTIFACTS.LAKE, 1, signers[0])
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
