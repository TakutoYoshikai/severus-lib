const { addBackup, getBackups, polygonGet, polygonSave, getPolygonPrivateKey, restore, backup, upload, fetchFile, share } = require("./");
const assert = require("assert");
function randomString() {
  const alphabets = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let s = "";
  for (let i = 0; i < 128; i++) {
    s += alphabets[Math.floor(Math.random() * alphabets.length)];
  }
  return s;
}

describe("set data", function() {
  it ("rewritable", async function() {
    this.timeout(30 * 1000);
    const password = randomString();
    const privateKey = getPolygonPrivateKey(password);
    await polygonSave("1", privateKey, true);
    let res = await polygonGet(password);
    assert.equal(res, "1");
    await polygonSave("2", privateKey, true);
    res = await polygonGet(password);
    assert.equal(res, "2");
    try {
      await polygonSave("3", privateKey, false);
      assert.fail();
    } catch(err) {

    }
  });
  it ("not rewritable", async function() {
    this.timeout(30 * 1000);
    const password = randomString();
    const privateKey = getPolygonPrivateKey(password);
    await polygonSave("1", privateKey, false);
    let res = await polygonGet(password);
    assert.equal(res, "1");
    polygonSave("2", privateKey, false).then(() => {
      assert.fail();
    });
    polygonSave("2", privateKey, true).then(() => {
      assert.fail();
    });
    res = await polygonGet(password);
    assert.equal(res, "1");
  });
});

describe("set backup", function() {

});

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
    let files = await restore(password);
    assert.equal(files.length, 2);
    assert.equal(files[0].name, "hello.txt");
    assert.equal(files[0].content.toString(), "hello world");
    assert.equal(files[1].name, "hoge.txt");
    assert.equal(files[1].content.toString(), "hoge fuga");
    await backup([
      {
        name: "hello2.txt",
        content: Buffer.from("hello world2"),
      },
      {
        name: "hoge2.txt",
        content: Buffer.from("hoge fuga2"),
      }
    ], password);
    files = await restore(password);
    assert.equal(files.length, 2);
    assert.equal(files[0].name, "hello2.txt");
    assert.equal(files[0].content.toString(), "hello world2");
    assert.equal(files[1].name, "hoge2.txt");
    assert.equal(files[1].content.toString(), "hoge fuga2");

    try {
      await share([
        {
          name: "hello2.txt",
          content: Buffer.from("hello world2"),
        },
        {
          name: "hoge2.txt",
          content: Buffer.from("hoge fuga2"),
        }
      ], password);
      assert.fail();
    } catch(err) {

    }
  });
});

describe("share", function() {
  it ("not rewritable", async function() {
    this.timeout(30 * 1000);
    const password = randomString();
    await share([
      {
        name: "hello.txt",
        content: Buffer.from("hello world"),
      },
      {
        name: "hoge.txt",
        content: Buffer.from("hoge fuga"),
      }
    ], password);
    let files = await restore(password);
    assert.equal(files.length, 2);
    assert.equal(files[0].name, "hello.txt");
    assert.equal(files[0].content.toString(), "hello world");
    assert.equal(files[1].name, "hoge.txt");
    assert.equal(files[1].content.toString(), "hoge fuga");
    try {
      await share([
        {
          name: "hello.txt",
          content: Buffer.from("hello world"),
        },
        {
          name: "hoge.txt",
          content: Buffer.from("hoge fuga"),
        }
      ], password);
      assert.fail();
      return;
    } catch(err) {
    }
  });
});

describe("backup list", function () {
  it ("addBackup and getBackups", async function() {
    this.timeout(30 * 1000);
    const password = randomString();
    await addBackup("hello", password);
    await addBackup("world", password);
    await addBackup("hello", password);
    const list = await getBackups(password);
    assert.equal(list.length, 2);
    assert.equal(list[0], "hello");
    assert.equal(list[1], "world");
  });
});
