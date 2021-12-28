const { restore, backup, upload, fetchFile } = require("./");
const assert = require("assert");

describe("fetch and upload", function () {
  const text = "hello world";
  let ipfsHash;
  it ("upload", async function () {
    ipfsHash = await upload(Buffer.from(text));
    assert.equal(ipfsHash.length > 0, true);
  });

  it ("fetch", async function () {
    const fetchedData = await fetchFile(ipfsHash);
    const fetchedText = fetchedData.toString();
    assert.equal(fetchedText, text);
  });
});

function randomString() {
  const alphabets = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let s = "";
  for (let i = 0; i < 128; i++) {
    s += alphabets[Math.floor(Math.random() * alphabets.length)];
  }
  return s;
}
describe("backup and restore", function() {
  it ("backup and restore", async function () {
    this.timeout(30 * 1000);
    const password = randomString();
    await backup([
      {
        name: "hello.txt",
        content: Buffer.from("hello world"),
      },
      {
        name: "hoge.txt",
        content: Buffer.from("hoge fuga"),
      }
    ], password);
    const files = await restore(password);
    assert.equal(files.length, 2);
    assert.equal(files[0].name, "hello.txt");
    assert.equal(files[0].content.toString(), "hello world");
    assert.equal(files[1].name, "hoge.txt");
    assert.equal(files[1].content.toString(), "hoge fuga");
  });
});
