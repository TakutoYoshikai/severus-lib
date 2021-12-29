# severus-lib
severus is a tool for encryption data and saving the encrypted data into P2P network. severus uses Polygon Mumbai Network.

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
```javascript
const { restore, backup } = require("severus-lib");

const password = "helloworld";
await backup([
  {
    name: "hello.txt",
    content: Buffer.from("hello hello world world"),
  }
], password);

const files = await restore(password);
```

### License
MIT License
