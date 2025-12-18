const util = require("util");
const fs = require("fs").promises;
const { spawn } = require("node:child_process");
const { rm } = require("node:fs/promises");
const os = require("os");

// example: chat messages found at [20,29, 31, 51, 55, 90, 97, 120], run clip for at least 10 seconds after message sent
// continue clip across two points (a,b) with <10s diff, run for at least another 10s after point b

// final clip should be running from 20-41 -> 51-65 -> 90-107 -> 118-130
const timestamps = [20, 20, 29, 29, 40, 42, 51, 55, 90, 97, 118, 120, 120];
const vodLength = 122;
const vodsrc = "Ocarina of Time Any% Speedrun in 3_47.900 (WR) [vpqnqaG95Fc].mp4";

// start/end seconds of clip to trim
let start = timestamps[0];
let prev = start;

const trimPositions = [];

for (let i = 1; i <= timestamps.length; i++) {
  // next message is 10 or less seconds since prev
  if (timestamps[i] - prev <= 10) {
    prev = timestamps[i];
  }

  // next message is in >10s
  else {
    if (prev + 10 > vodLength) {
      trimPositions.push([start, vodLength]);
    } else {
      trimPositions.push([start, prev + 10]);
    }

    // reset positions for next clip
    start = timestamps[i];
    prev = start;
  }
}

console.log(trimPositions);

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

const clipNames = [];

async function generateClips() {
  // ffmpeg -ss START -to FINISH -i vodsrc -c copy clipNUM.mp4

  console.log("generating clips...");
  await fs.mkdir("fragments");
  await fs.writeFile("fragments.txt", "");

  /* fragments.txt example

    file 'fragments/clip0.mp4'
    file 'fragments/clip1.mp4'
    file 'fragments/clip2.mp4'
    file 'fragments/clip3.mp4'
  */

  for (let i = 0; i < trimPositions.length; i++) {
    const [start, end] = trimPositions[i];

    await runAsync("ffmpeg", [
      "-ss",
      start,
      "-to",
      end,
      "-i",
      vodsrc,
      "-c",
      "copy",
      `fragments/clip${i}.mp4`,
    ]);

    const fragmentIdentifier = `file 'fragments/clip${i}.mp4'`;
    await fs.appendFile("fragments.txt", `${fragmentIdentifier}${os.EOL}`, "utf8");
  }
}

async function concatClips() {
  console.log("concatenating clips...");
  await runAsync("ffmpeg", [
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    "fragments.txt",
    "-c",
    "copy",
    "output.mp4",
  ]);
}

async function main() {
  try {
    // clean up previously used fragment files if not already done
    await rm("fragments", { recursive: true, force: true });
    await rm("fragments.txt", { force: true });

    await generateClips();
    console.log("clips finished processing");

    console.log("concatenating clips...");
    await concatClips();

    console.log("done!");

    // cleanup

    await rm("fragments", { recursive: true, force: true });
    await rm("fragments.txt", { force: true });
  } catch (error) {
    console.log(error);
  }
}

main();
