const util = require("util");
const fs = require("fs").promises;
const path = require("path");

const { rm } = require("node:fs/promises");
const os = require("os");
const runAsync = require("./runasync");
const calculateTrimPositions = require("./calculateTrimPositions");
const calculateCommandLength = require("./calculateCommandLength");
const calculateCombineSegmentTime = require("./calculateCombineSegmentTime");
const { start } = require("repl");

const delay = 2; // start recording # of seconds + 1.5 after chat message was sent (note: base delay of 1.5s to trim ends)
let minSegmentLength = 18; // record at least this # of seconds if there are no other messages

const vodID = 2664248292;
const chatJsonFile = `chat-${vodID}.json`;

const startTime = Date.now();

// ignore these chatters when accounting for segment timestamps (e.g. bots)
const chatIgnores = ["twitchchat_gaming"];

// -----------------------------------------------------------

// Custom settings for changing the minSegmentLength based off chat message length

let dynamicTimings = true;

const dynamicMinSegmentLengths = []; // 1:1 mapping of chat messages to dynamic minSegmentLengths
const secondsPerChar = 0.7;
const messages = [];

// -----------------------------------------------------------

const chatTimestamps = [];
let trimPositions;
let vodLength;

// -----------------------------------------------------------

async function processChat() {
  // download chat into json file
  await runAsync("twitch-downloader", ["chatdownload", "-u", vodID, "-o", chatJsonFile]);

  const rawdata = await fs.readFile(chatJsonFile);
  const data = JSON.parse(rawdata);

  vodLength = data.video.length;

  // get offset seconds of each message

  for (const comment of data.comments) {
    if (!chatIgnores.includes(comment.commenter.display_name)) {
      chatTimestamps.push(comment.content_offset_seconds + delay);

      if (dynamicTimings) {
        const messageLength = comment.message.body.length;
        const segmentLength = calculateCommandLength(comment.message.body) + minSegmentLength;

        dynamicMinSegmentLengths.push(segmentLength);
        messages.push(comment.message.body);
      }
    }
  }

  trimPositions = calculateTrimPositions(chatTimestamps, dynamicMinSegmentLengths);
}

// -----------------------------------------------------------

async function downloadSegments() {
  await fs.mkdir(`fragments-${vodID}-${startTime}`);
  await fs.writeFile(`fragments-${vodID}-${startTime}.txt`, "");

  const totalDownloadLength = calculateCombineSegmentTime(trimPositions);

  console.log(
    `Downloading ${trimPositions.length} VOD segments. Total length to be downloaded: ${totalDownloadLength}`
  );

  for (let i = 0; i < trimPositions.length; i++) {
    const [start, end] = trimPositions[i];
    const fragmentPath = `fragments-${vodID}-${startTime}/clip${i}.mp4`;
    const trimmedFragmentPath = `trimmed_clips-${vodID}-${startTime}/clip${i}.mp4`; // fragments will be moved to a new dir before being concatenated

    await runAsync("twitch-downloader", [
      "videodownload",
      "--id",
      vodID,
      "-o",
      fragmentPath,
      "-b",
      start,
      "-e",
      end,
    ]);

    await fs.appendFile(
      `fragments-${vodID}-${startTime}.txt`,
      `file ${trimmedFragmentPath}${os.EOL}`
    );
  }
}

// -----------------------------------------------------------

async function trimSegments() {
  await runAsync("bash", ["trimclips.sh", vodID, startTime]);
}

// -----------------------------------------------------------

async function concatClips() {
  console.log("concatenating clips...");
  await runAsync("ffmpeg", [
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    `fragments-${vodID}-${startTime}.txt`,
    "-c",
    "copy",
    `vod-${vodID}-trimmed-${Date.now()}.mp4`,
  ]);
}

// -----------------------------------------------------------

async function main() {
  try {
    // clean up previously used files if not already done
    // await rm("chat.json", { force: true });
    // await rm("fragments.txt", { force: true });
    // await rm("fragments", { recursive: true, force: true });
    // await rm("trimmed_clips", { recursive: true, force: true });

    // determine VOD segments to download
    await processChat();

    // run command to download all segments
    await downloadSegments();

    // // trim beginning/ends of segments and re-encode (removes stuttering)
    await trimSegments();

    // // concat all segments
    await concatClips();

    console.log("done!");
    console.log(`Combined ${trimPositions.length} clips`);
    console.log(`Outputting segment data: trimPositions-${vodID}.txt`);

    const content = trimPositions.join("\n");

    await fs.writeFile(`trimPositions-${vodID}-${startTime}.txt`, "");
    await fs.appendFile(`trimPositions-${vodID}-${startTime}.txt`, content);

    // await rm("chat.json", { force: true });
    // await rm("fragments.txt", { force: true });
    // await rm("fragments", { recursive: true, force: true });
    // await rm("trimmed_clips", { recursive: true, force: true });
  } catch (error) {
    console.log(error);
  }
}

main();
