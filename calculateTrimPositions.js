function calculateTrimPositions(timestamps, segmentLengths) {
  const positions = [];

  let start = timestamps[0];
  let prev = start;

  let segmentUpperLimit = segmentLengths[0] + start;

  for (let i = 1; i <= timestamps.length; i++) {
    // a previous message takes precedence for running segment length
    if (timestamps[i] + segmentLengths[i] <= segmentUpperLimit) {
      continue;
    }

    // current message takes precedence for running length and has some overlap with a previous running segment
    if (
      timestamps[i] < segmentUpperLimit &&
      timestamps[i] + segmentLengths[i] > segmentUpperLimit
    ) {
      segmentUpperLimit = timestamps[i] + segmentLengths[i];
      continue;
    }

    // next message is 3 or less seconds difference compared to the upper limit, so just combine and continue the running segment
    if (i < timestamps.length) {
      if (timestamps[i] < segmentUpperLimit + 3) {
        segmentUpperLimit = timestamps[i] + segmentLengths[i];
        continue;
      }
    }

    positions.push([start, segmentUpperLimit]);

    start = timestamps[i];
    prev = start;

    segmentUpperLimit = segmentLengths[i] + start;
  }

  return positions;
}

// const timestamps = [1, 4, 13, 25, 33, 47, 103, 150, 300];
// const segmentLengths = [2, 100, 18, 5, 70, 10, 10, 2, 12];

//calculateTrimPositions(timestamps, segmentLengths);

module.exports = calculateTrimPositions;
