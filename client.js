const abi = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "BackupRecords",
    "outputs": [
      {
        "internalType": "string",
        "name": "ipfsHash",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "addressToBackupId",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "hash",
        "type": "bytes32"
      },
      {
        "internalType": "bytes",
        "name": "signature",
        "type": "bytes"
      }
    ],
    "name": "ecverify",
    "outputs": [
      {
        "internalType": "address",
        "name": "sig_address",
        "type": "address"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_address",
        "type": "address"
      }
    ],
    "name": "getBackups",
    "outputs": [
      {
        "internalType": "string[]",
        "name": "",
        "type": "string[]"
      },
      {
        "internalType": "uint256[]",
        "name": "",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "target",
        "type": "string"
      }
    ],
    "name": "makeHash",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "ipfsHash",
        "type": "string"
      },
      {
        "internalType": "bytes",
        "name": "sig",
        "type": "bytes"
      }
    ],
    "name": "setBackup",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
]

const axios = require("axios");
const Contract = require("web3-eth-contract");
const Web3Utils = require("web3-utils");

class Client {
  constructor(rpcHost, accounts, contractAddress, baseUrl) {
    this.rpcHost = rpcHost;
    this.accounts = accounts;
    this.contractAddress = contractAddress;
    this.baseUrl = baseUrl;
  }
  async init() {
    Contract.setProvider(this.rpcHost);
    this.contract = new Contract(abi, this.contractAddress);
  }
  async createBackup(signed) {
    return new Promise((resolve, reject) => {
      axios.post(this.baseUrl + "/backup",
        signed,
        {
          headers: {
            "content-type": "application/json",
          }
        }
      ).then(response => {
        resolve(response.data);
      }).catch(err => {
        reject(err);
      });
    });
  }
  async getIpfsHashes(address) {
    const response = await this.contract.methods.getBackups(address).call();
    const ipfsHashes = response[0];
    const times = response[1];
    const result = [];
    for (let i = 0; i < ipfsHashes.length; i++) {
      result.push({
        ipfsHash: ipfsHashes[i],
        time: times[i],
      });
    }
    return result;
  }
  async signIpfsHash(ipfsHash, accountToSign) {
    const hash = Web3Utils.soliditySha3({
      type: "string",
      value: ipfsHash,
    });
    let signature;

    if (accountToSign.privateKey) {
      signature = await this.accounts.sign(
        hash,
        accountToSign.privateKey,
      ).signature;
    } else if (accountToSign.address) {
      signature = await this.web3.eth.personal.sign(
        hash,
        accountToSign.address,
      );
    } else {
      throw new Error("It needs an account to sign.");
    }
    return {
      signature,
      ipfsHash,
    }
  }
}

module.exports = Client;

