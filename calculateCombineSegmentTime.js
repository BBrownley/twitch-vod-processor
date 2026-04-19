function calculateTime(trimPositions) {
  // get total # of seconds

  const totalSeconds = trimPositions.reduce((acc, curr) => {
    const currStart = curr[0];
    const currEnd = curr[1];

    return acc + currEnd - currStart;
  }, 0);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const formattedHours = hours.toString().padStart(2, "0");
  const formattedMinutes = minutes.toString().padStart(2, "0");
  const formattedSeconds = seconds.toString().padStart(2, "0");

  return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
}

module.exports = calculateTime;
