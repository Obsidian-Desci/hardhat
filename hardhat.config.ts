import 'dotenv/config'
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
//import "@nomiclabs/hardhat-etherscan"
const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.15",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000,
          }
        }
      },
      {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000,
          }
        }
      },
    ]
  },
  networks: {
    hardhat: {
      chainId: 1337,
      forking: {
        blockNumber: 18458946,
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
    },
    mainnet: {
      url: process.env.TENDERLY_MAINNET,
      chainId: 1,
      accounts: {
        mnemonic: process.env.MNEMONIC || ''
      }
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN
  }
};

export default config;
