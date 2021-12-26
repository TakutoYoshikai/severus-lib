const { encrypt, decrypt } = require("aes256cbc");

const password = "";

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
