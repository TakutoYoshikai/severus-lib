const { encrypt, decrypt } = require("aes256cbc");


const crypto = require("crypto");
const Accounts = require("web3-eth-accounts");

const Client = require("./client");

const IpfsHttpClient = require("ipfs-http-client");

const axios = require("axios");

function Severus(config=require("./config.json")) {
  const contractAddress = config.contractAddress;
  const baseUrl = config.apiHost;
  const rpcHost = config.rpcHost;
  const accounts = new Accounts(rpcHost);
  const ipfsClient = IpfsHttpClient(config.ipfs);
  function parseBackupList(text) {
    return text.split("\n").map(line => {
      const words = line.split(" ");
      const ipfsHash = words[0];
      const fileName = words.slice(1).join(" ");
      return {
        ipfsHash,
        fileName,
      }
    });
  }
  this.fetchFile = async function (ipfsHash) {
    const gatewayHost = config.ipfsGateway;
    const url = gatewayHost + "/" + ipfsHash;
    const response = await axios.get(url, { responseType: "arraybuffer" });
    return response.data;
  }
  this.upload = async function(data) {
    const response = await ipfsClient.add(data);
    if (response) {
      return response.path;
    }
    throw new Error("Failed to upload the file.");
  }
  this.fetchBackupList = async function(ipfsHash, password) {
    const encryptedBackupList = await this.fetchFile(ipfsHash);
    const backupList = parseBackupList(decrypt(encryptedBackupList, password).toString());
    return backupList;
  }
  this.fetchBackup = async function(backupList, password) {
    const files = [];
    for (const file of backupList) {
      const encryptedData = await this.fetchFile(file.ipfsHash);
      const content = decrypt(encryptedData, password);
      files.push({
        name: file.fileName,
        content,
      });
    }
    return files;
  }
  this.getPolygonPrivateKey = function(silverKey) {
    const hashHex = crypto.createHash("sha256").update(silverKey, "utf8").digest("hex");
    return hashHex;
  }
  function privateKeyToAddress(privateKey) {
    return accounts.privateKeyToAccount(privateKey).address;
  }
  this.polygonGet = async function(password) {
    const privateKey = this.getPolygonPrivateKey(password);
    const address = privateKeyToAddress(privateKey);
    const client = new Client(rpcHost, accounts, contractAddress, baseUrl);
    await client.init();

    const ipfsHashes = await client.getIpfsHashes(address);
    if (ipfsHashes.length === 0) {
      throw new Error("This resource is not found.");
    }
    return ipfsHashes[ipfsHashes.length - 1].ipfsHash;
  }
  this.polygonSave = async function(ipfsHash, password, rewritable) {
    const privateKey = this.getPolygonPrivateKey(password);
    const client = new Client(rpcHost, accounts, contractAddress, baseUrl);
    await client.init();
    const signed = await client.signIpfsHash(ipfsHash, {
      privateKey,
    });
    if (rewritable) {
      await client.createBackup(signed);
    } else {
      await client.createData(signed);
    }
  }
  function createBackupList(encryptedFiles) {
    let backupList = "";
    for (const encryptedFile of encryptedFiles) {
      backupList += encryptedFile.ipfsHash + " " + encryptedFile.name + "\n";
    }
    if (backupList.endsWith("\n")) {
      backupList = backupList.slice(0, -1);
    }
    return backupList;
  }
  this.share = async function(files, _password) {
    const password = _password + contractAddress;
    const encryptedFiles = [];
    for (const file of files) {
      const encryptedData = encrypt(file.content, password);
      const ipfsHash = await this.upload(encryptedData);
      encryptedFiles.push({
        name: file.name,
        ipfsHash,
      });
    }
    const backupList = createBackupList(encryptedFiles);
    const encryptedBackupList = encrypt(Buffer.from(backupList), password);
    const backupIpfsHash = await this.upload(encryptedBackupList);
    await this.polygonSave(backupIpfsHash, password, false);
  }
  this.backup = async function(files, _password) {
    const password = _password + contractAddress;
    const encryptedFiles = [];
    for (const file of files) {
      const encryptedData = encrypt(file.content, password);
      const ipfsHash = await this.upload(encryptedData);
      encryptedFiles.push({
        name: file.name,
        ipfsHash,
      });
    }
    const backupList = createBackupList(encryptedFiles);
    const encryptedBackupList = encrypt(Buffer.from(backupList), password);
    const backupIpfsHash = await this.upload(encryptedBackupList);
    await this.polygonSave(backupIpfsHash, password, true);
  }
  this.getBackups = async function(password) {
    const files = await this.restore(password);
    if (files.length !== 1 && files[0].name !== "severus-list.json"){
      throw new Error("Failed to load backup list.");
    }
    const list = JSON.parse(files[0].content.toString());
    return list;
  }
  this.addBackup = async function(name, password) {
    let files;
    try {
      files = await this.restore(password);
    } catch(err) {
      files = [
        {
          name: "severus-list.json",
          content: Buffer.from("[]"),
        }
      ]
    }
    if (files.length !== 1 || files[0].name !== "severus-list.json") {
      return;
    }
    const list = JSON.parse(files[0].content.toString());
    if (list.includes(name)) {
      return;
    }
    list.push(name);
    const listText = JSON.stringify(list);
    await this.backup([
      {
        name: "severus-list.json",
        content: Buffer.from(listText),
      }
    ], password);
  }
  this.restore = async function(_password) {
    const password = _password + contractAddress;
    const ipfsHash = await this.polygonGet(password);
    const encryptedBackupList = await this.fetchFile(ipfsHash);
    const backupList = parseBackupList(decrypt(encryptedBackupList, password).toString());
    const files = [];
    for (const file of backupList) {
      const encryptedContent = await this.fetchFile(file.ipfsHash);
      const content = decrypt(encryptedContent, password);
      files.push({
        name: file.fileName,
        content,
      });
    }
    return files;
  }
}

module.exports = Severus;
