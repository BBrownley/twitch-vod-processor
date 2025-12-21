const { spawn } = require("node:child_process");

function runAsync(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: "inherit" });
    console.log(`${cmd} | ${args}`);

    p.on("close", (code) => {
      if (code === 0) {
        console.log(`done with command ${cmd}: ${args}`);
        resolve();
      } else {
        reject(new Error(`${cmd} failed (${code})`));
      }
    });
  });
}

module.exports = runAsync;
