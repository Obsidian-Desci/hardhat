import 'dotenv/config'
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      }
    }
  },
  networks: {
    hardhat: {
      forking: {
        url: process.env.TENDERLY_FORK
      },
      accounts: {
        mnemonic: process.env.MNEMONIC || ''
      }
    },
    lilypad: {
      url: "http://testnet.lilypadnetwork.org:8545",
      chainId: 1337,
      accounts: {
        mnemonic: process.env.MNEMONIC || ''
      }
    },
    goerli: {
      url: process.env.TENDERLY_GOERLI,
      chainId: 5,
      accounts: {
        mnemonic: process.env.MNEMONIC || ''
      }
    }
  },
};

export default config;
