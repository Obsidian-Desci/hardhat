import hre from 'hardhat'
import * as fs from 'node:fs'

import { createMimisPosition } from './utils/utils'

import * as ARTIFACTS from './utils/artifacts'

export async function main() {
  const signers = await hre.ethers.getSigners();

  await createMimisPosition(ARTIFACTS.LAKE, 0.001, signers[0])

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
