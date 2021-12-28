const { encrypt, decrypt } = require("aes256cbc");

const contractAddress = "0x799358B503325af18FCBF9DE723393Ce76B1bfAF";
const baseUrl = "http://localhost:3000";
const rpcHost = "https://matic-mumbai.chainstacklabs.com";

const crypto = require("crypto");
const Accounts = require("web3-eth-accounts");
const accounts = new Accounts(rpcHost);

const Client = require("./client");

const IpfsHttpClient = require("ipfs-http-client");
const ipfsClient = IpfsHttpClient({
  host: "ipfs.infura.io",
  port: 5001,
  protocol: "https",
});

async function fetchFile(ipfsHash) {
  const response = await ipfsClient.get(ipfsHash);
  for await (const data of response) {
    let content = Buffer.alloc(0);
    for await (const chunk of data.content) {
      content = Buffer.concat([content, chunk]);
    }
    return content;
  }
}

async function upload(data) {
  const response = await ipfsClient.add(data);
  if (response) {
    return response.path;
  }
  throw new Error("Failed to upload the file.");
}


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

async function fetchBackupList(ipfsHash, password) {
  const encryptedBackupList = await fetchFile(ipfsHash);
  const backupList = parseBackupList(decrypt(encryptedBackupList, password).toString());
  return backupList;
}

async function fetchBackup(backupList, password) {
  const files = [];
  for (const file of backupList) {
    const encryptedData = await fetchFile(file.ipfsHash);
    const content = decrypt(encryptedData, password);
    files.push({
      name: file.fileName,
      content,
    });
  }
  return files;
}

function getPolygonPrivateKey(silverKey) {
  const hashHex = crypto.createHash("sha256").update(silverKey, "utf8").digest("hex");
  return hashHex;
}

function privateKeyToAddress(privateKey) {
  return accounts.privateKeyToAccount(privateKey).address;
}

async function polygonGet(password) {
  const privateKey = getPolygonPrivateKey(password);
  const address = privateKeyToAddress(privateKey);
  const baseUrl = "http://localhost:3000";
  const client = new Client(rpcHost, accounts, contractAddress, baseUrl);
  await client.init();

  const ipfsHashes = await client.getIpfsHashes(address);
  return ipfsHashes[ipfsHashes.length - 1].ipfsHash;
}

async function polygonSave(ipfsHash, privateKey) {
  const client = new Client(rpcHost, accounts, contractAddress, baseUrl);
  await client.init();
  const signed = await client.signIpfsHash(ipfsHash, {
    privateKey,
  });
  await client.createBackup(signed);
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

async function backup(files, password) {
  const encryptedFiles = [];
  for (const file of files) {
    const encryptedData = encrypt(file.content, password);
    const ipfsHash = await upload(encryptedData);
    encryptedFiles.push({
      name: file.name,
      ipfsHash,
    });
  }
  const backupList = createBackupList(encryptedFiles);
  const encryptedBackupList = encrypt(Buffer.from(backupList), password);
  const backupIpfsHash = await upload(encryptedBackupList);
  const privateKey = getPolygonPrivateKey(password);
  await polygonSave(backupIpfsHash, privateKey);
}

async function restore(password) {
  const ipfsHash = await polygonGet(password);
  const encryptedBackupList = await fetchFile(ipfsHash);
  const backupList = parseBackupList(decrypt(encryptedBackupList, password).toString());
  const files = [];
  for (const file of backupList) {
    const encryptedContent = await fetchFile(file.ipfsHash);
    const content = decrypt(encryptedContent, password);
    files.push({
      name: file.fileName,
      content,
    });
  }
  return files;
}

module.exports = {
  polygonGet,
  polygonSave,
  fetchFile,
  fetchBackupList,
  fetchBackup,
  getPolygonPrivateKey,
  backup,
  restore,
  upload,
}
