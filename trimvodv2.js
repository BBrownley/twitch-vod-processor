const util = require("util");
const fs = require("fs").promises;
const path = require("path");

const { rm } = require("node:fs/promises");
const os = require("os");
const runAsync = require("./runasync");

const delay = 3; // start recording # of seconds + 1.5 after chat message was sent (note: base delay of 1.5s to trim ends)
const minSegmentLength = 10; // record at least this # of seconds if there are no other messages

const vodID = 2647300244;
const chatJsonFile = "chat.json";

// ignore these chatters when accounting for segment timestamps (e.g. bots)
const chatIgnores = ["twitchchat_gaming"];

// -----------------------------------------------------------

const chatTimestamps = [];
const trimPositions = [];
let vodLength;

async function processChat() {
  // download chat into json file
  await runAsync("twitch-downloader", ["chatdownload", "-u", vodID, "-o", chatJsonFile]);

  const rawdata = await fs.readFile("chat.json");
  const data = JSON.parse(rawdata);

  vodLength = data.video.length;

  // get offset seconds of each message
  data.comments.forEach((comment) => {
    if (!chatIgnores.includes(comment.commenter.display_name)) {
      chatTimestamps.push(comment.content_offset_seconds + delay);
    }
  });

  console.log(chatTimestamps);

  // calculate start/end times for each segment

  let start = chatTimestamps[0];
  let prev = start;

  for (let i = 1; i <= chatTimestamps.length; i++) {
    // next message is minSegmentLength or less seconds since prev
    if (chatTimestamps[i] - prev <= minSegmentLength) {
      prev = chatTimestamps[i];
    }

    // next message is in >minSegmentLength
    else {
      if (prev + minSegmentLength > vodLength) {
        // end of VOD

        if (start < vodLength) {
          trimPositions.push([start, vodLength]);
        }
      } else {
        trimPositions.push([start, prev + minSegmentLength]);
      }

      // reset positions for next clip
      start = chatTimestamps[i];
      prev = start;
    }
  }

  console.log(trimPositions);
}

// -----------------------------------------------------------

async function downloadSegments() {
  await fs.mkdir("fragments");
  await fs.writeFile("fragments.txt", "");

  /* fragments.txt example

    file 'fragments/clip0.mp4'
    file 'fragments/clip1.mp4'
    file 'fragments/clip2.mp4'
    file 'fragments/clip3.mp4'
  */

  for (let i = 0; i < 10; i++) {
    const [start, end] = trimPositions[i];
    const fragmentPath = `fragments/clip${i}.mp4`;
    const trimmedFragmentPath = `trimmed_clips/clip${i}.mp4`; // fragments will be moved to a new dir before being concatenated

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

    await fs.appendFile("fragments.txt", `file ${trimmedFragmentPath}${os.EOL}`);
  }
}

// -----------------------------------------------------------

async function trimSegments() {
  await runAsync("bash", ["trimclips.sh"]);
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
    "fragments.txt",
    "-c:v",
    "libx264",
    "-c:a",
    "copy",
    "output.mp4",
  ]);
}

// -----------------------------------------------------------

async function main() {
  try {
    // clean up previously used files if not already done
    await rm("chat.json", { force: true });
    await rm("fragments.txt", { force: true });
    await rm("fragments", { recursive: true, force: true });
    await rm("trimmed_clips", { recursive: true, force: true });

    // determine VOD segments to download
    await processChat();

    // run command to download all segments
    await downloadSegments();

    // trim beginning/ends of segments and re-encode (removes stuttering)
    await trimSegments();

    // concat all segments
    await concatClips();

    console.log("done!");

    await rm("chat.json", { force: true });
    await rm("fragments.txt", { force: true });
    await rm("fragments", { recursive: true, force: true });
    await rm("trimmed_clips", { recursive: true, force: true });
  } catch (error) {
    console.log(error);
  }
}

main();
