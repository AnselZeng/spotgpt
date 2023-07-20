export function getReturnedParamsFromSpotifyAuth(hash) {
  return hash
    .substring(1)
    .split("&")
    .reduce((accumulater, currentValue) => {
      const [key, value] = currentValue.split("=");
      accumulater[key] = value;
      return accumulater;
    }, {});
}

export function normalizeString(str) {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function getHighestPopularityTrack(tracks) {
  return tracks.reduce(
    (highestPopularityTrack, track) =>
      !highestPopularityTrack ||
      track.popularity > highestPopularityTrack.popularity
        ? track
        : highestPopularityTrack,
    null
  );
}

export function getUniqueTopTrack(tracks) {
  const addedTracks = new Set();
  return tracks.reduce((topTrack, track) => {
    if (!addedTracks.has(track.id)) {
      addedTracks.add(track.id);
      return !topTrack || track.popularity > topTrack.popularity
        ? track
        : topTrack;
    }
    return topTrack;
  }, null);
}

export function getSongAndArtist(song) {
  let [songName, artistName] = song.split(/ by |-/);
  return [songName.trim().replace(/"/g, ""), artistName.trim()];
}
