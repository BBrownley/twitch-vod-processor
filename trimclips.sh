mkdir -p trimmed_clips-$1-$2

for f in fragments-$1-$2/*.mp4; do
  echo "$f"
    filename=$(basename "$f")
    outfile="trimmed_clips-$1-$2/$filename"

    # # Get duration of the clip in seconds
    duration=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")

    # # Calculate start/end time +/- 0.5s
    ending=$(echo "$duration - 1.5" | bc)

    # # Trim 1s at start and 1.5s at end and re-encode
    ffmpeg -y -i "$f" -ss 1.5 -to "$ending" \
           -c:a copy "$outfile"

    # remove original clip
    rm $f
done
