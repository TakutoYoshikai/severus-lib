# severus-lib
severus is a tool for encryption data and saving the encrypted data into P2P network. severus uses Polygon Mumbai Network.
You can use [severus](https://github.com/TakutoYoshikai/severus) shell command.

### Requirements
* macOS or Ubuntu
* Node.js
* npm

### Usage
**install**
```bash
npm install --save TakutoYoshikai/severus-lib
```

**backup and restore**

share is not rewritable. backup is rewritable.
```javascript
const { share, restore, backup } = require("severus-lib");

let password = "helloworld";

await backup([
  {
    name: "hello.txt",
    content: Buffer.from("hello hello world world"),
  }
], password);

password = "dsfsdigudisgjidfgiweehtgi";

await share([
  {
    name: "hello.txt",
    content: Buffer.from("hello hello world world"),
  }
], password);

const files = await restore(password);
```

### License
MIT License
