// standard command lengths in twitchplays bot

const a2aDelay = 0.025; // additional time padded after each command is played

const tapLength = 0.05;
const pressLength = 0.2; // default length of commands without a prefix
const shortLength = 0.75;
const longLength = 2;

// generate lookup table for each command mapping to duration

const buttons = [
  "a",
  "b",
  "x",
  "y",
  "z",
  "w",
  "start",
  "select",
  "up",
  "down",
  "left",
  "right",
  "upc",
  "downc",
  "leftc",
  "rightc",
  "upd",
  "downd",
  "leftd",
  "rightd",
  "l1", // PS triggers if needed
  "r1",
  "l2",
  "r2",
  "l3",
  "r3",
  "rup", // PS right analog
  "rleft",
  "rright",
  "rdown",
  "tri", // PS face buttons
  "sq",
  "cir",
  "ls",
  "ss",
];

const prefixLengths = [
  ["t", 0.05 + a2aDelay],
  ["s", 0.75 + a2aDelay],
  ["l", 2 + a2aDelay],
  ["h", 0.5 + a2aDelay], // activation duration
];

const commandDuration = Object.fromEntries(
  buttons.flatMap((btn) => [
    [btn, 0.2 + a2aDelay], // base button
    ...prefixLengths.map(([prefix, duration]) => [`${prefix}${btn}`, duration]),
  ])
);

function calculateCommandLength(message) {
  return Math.ceil(message.split(" ").reduce((acc, cmd) => acc + (commandDuration[cmd] ?? 0), 0));
}

module.exports = calculateCommandLength;
