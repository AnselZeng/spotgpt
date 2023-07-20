import React, { useState, useEffect } from "react";
import axios from "axios";
import { Configuration, OpenAIApi } from "openai";
import {
  getReturnedParamsFromSpotifyAuth,
  normalizeString,
  getHighestPopularityTrack,
  getUniqueTopTrack,
  getSongAndArtist,
} from "./helpers";
import {
  Box,
  Button,
  Flex,
  Heading,
  Image,
  Input,
  Link,
  ListItem,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Spinner,
  Stack,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  UnorderedList,
  VStack,
  useBreakpointValue,
} from "@chakra-ui/react";

const API_KEY = process.env.REACT_APP_API_KEY;
const openai = new OpenAIApi(new Configuration({ apiKey: API_KEY }));
const CLIENT_ID = process.env.REACT_APP_CLIENT_ID;
const CLIENT_SECRET = process.env.REACT_APP_CLIENT_SECRET;
const breakpoints = {
  base: {
    welcomeTextFontSize: "0",
    headingFontSize: "3xl",
    playlistTextFontSize: "xs",
    buttonSize: "sm",
    inputBoxSize: "sm",
    loginButtonText: "Login to Spotify",
    placeholderText: "Type here...",
    listFontSize: "xs",
    imageBoxSize: "50px",
    isDesktop: false,
    thPaddingX: 1,
    thPaddingY: 1,
  },
  md: {
    welcomeTextFontSize: "2xl",
    headingFontSize: "4xl",
    playlistTextFontSize: "2xl",
    buttonSize: "md",
    inputBoxSize: "md",
    loginButtonText: "Login with Spotify",
    placeholderText: "Type anything here...",
    listFontSize: "md",
    imageBoxSize: "100px",
    isDesktop: true,
    thPaddingX: 2,
    thPaddingY: 2,
  },
};

function App() {
  const [accessToken, setAccessToken] = useState("");
  const [songs, setSongs] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  const [numberOfSongs, setNumberOfSongs] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const {
    welcomeTextFontSize,
    headingFontSize,
    playlistTextFontSize,
    buttonSize,
    inputBoxSize,
    loginButtonText,
    placeholderText,
    listFontSize,
    imageBoxSize,
    isDesktop,
    thPaddingX,
    thPaddingY,
  } = useBreakpointValue(breakpoints);
  const EXAMPLES = [
    "I'm about to workout and I like kpop",
    "I've been listening to a lot of beabadoobee lately",
    "I just got home from work and want to enjoy some chill reading",
  ];

  const handleEnterKey = async (e) => {
    if (e.key === "Enter" || e.type === "click") {
      if (e.preventDefault) {
        e.preventDefault();
      }
      setIsLoading(true);

      let searchInput = inputText;
      if (e.exampleText) {
        searchInput = e.exampleText;
      }

      const modifiedInput =
        searchInput +
        `, recommend me ${numberOfSongs} songs to listen to, just respond with the list and format it as the song name in double quotation marks followed by the artist name`;
      const res = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: modifiedInput }],
      });

      const songList = res.data.choices[0].message.content
        .split("\n")
        .map((song) => song.replace(/^\d+\.\s/, ""))
        .filter((song) => song.startsWith('"'));

      if (songList.length > 0) {
        await searchSongs(songList);
      }

      setInputText("");
      setIsLoading(false);
    }
  };

  async function searchSongs(songList) {
    setSongs([]);
    setIsLoading(true);
    const addedSongs = new Set();

    for (const song of songList) {
      const [songName, artistName] = getSongAndArtist(song);

      console.log(`Search for ${songName} by ${artistName}`);

      const songResults = await searchTracks(
        `${songName} ${artistName}`,
        numberOfSongs
      );
      const matchingTracks = getMatchingTracks(
        songResults,
        songName,
        artistName
      );

      let topTrack =
        matchingTracks.length > 0
          ? getUniqueTopTrack(matchingTracks)
          : getHighestPopularityTrack(songResults);

      if (topTrack) {
        const trackId = topTrack.id;
        if (!addedSongs.has(trackId)) {
          addedSongs.add(trackId);
          setSongs((prevSongs) => [...prevSongs, topTrack]);
        } else {
          const nextTrack = songResults.find(
            (track) => !addedSongs.has(track.id)
          );
          if (nextTrack) {
            addedSongs.add(nextTrack.id);
            setSongs((prevSongs) => [...prevSongs, nextTrack]);
          }
        }
        setIsLoading(false);
      } else {
        console.log(`No track found for ${song}`);
      }
    }
    setIsLoading(false);
  }

  async function searchTracks(query, limit) {
    const { data } = await axios.get("https://api.spotify.com/v1/search", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      params: {
        q: query,
        type: "track",
        limit: limit.toString(),
      },
    });

    return data.tracks.items;
  }

  function getMatchingTracks(tracks, songName, artistName) {
    const normalizedSongName = normalizeString(songName).toLowerCase();
    const normalizedArtistName = normalizeString(artistName).toLowerCase();

    return tracks.filter((track) => {
      const trackSongName = normalizeString(track.name).toLowerCase();
      const trackArtists = track.artists.map((artist) =>
        normalizeString(artist.name).toLowerCase()
      );

      return (
        (trackSongName.includes(normalizedSongName) ||
          normalizedSongName.includes(trackSongName)) &&
        trackArtists.some(
          (trackArtist) =>
            trackArtist.includes(normalizedArtistName) ||
            normalizedArtistName.includes(trackArtist)
        )
      );
    });
  }

  useEffect(() => {
    const authParameters = {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=client_credentials&client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}`,
    };

    fetch("https://accounts.spotify.com/api/token", authParameters)
      .then((result) => result.json())
      .then((data) => setAccessToken(data.access_token));
  }, []);

  useEffect(() => {
    if (window.location.hash) {
      const { access_token, expires_in, token_type } =
        getReturnedParamsFromSpotifyAuth(window.location.hash);
      localStorage.clear();
      localStorage.setItem("accessToken", access_token);
      localStorage.setItem("tokenType", token_type);
      localStorage.setItem("expiresIn", expires_in);
      setIsLoggedIn(true);
    }
  }, []);

  useEffect(() => {
    const storedAccessToken = localStorage.getItem("accessToken");
    if (storedAccessToken) {
      setAccessToken(storedAccessToken);
      setIsLoggedIn(true);
      fetchUserData(storedAccessToken);
    }
  }, [accessToken]);

  const fetchUserData = async (accessToken) => {
    try {
      const response = await axios.get("https://api.spotify.com/v1/me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      setUserData(response.data);
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    }
  };

  const handleLogin = () => {
    const redirectUri = `${window.location.origin}/login/callback`;
    const spotifyAuthUrl = `https://accounts.spotify.com/authorize?response_type=token&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&scope=user-read-private%20user-read-email%20playlist-modify-public`;

    window.location.href = spotifyAuthUrl;
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("tokenType");
    localStorage.removeItem("expiresIn");
    setAccessToken("");
    setIsLoggedIn(false);
    setUserData(null);
    window.location.href = "/";
  };

  const tryExample = async (example) => {
    setInputText(example);
    const event = {
      key: "Enter",
      type: "click",
      preventDefault: () => {},
      exampleText: example,
    };
    await handleEnterKey(event);
  };

  const createAndSavePlaylist = async () => {
    try {
      const response = await axios.post(
        `https://api.spotify.com/v1/users/${userData.id}/playlists`,
        {
          name: "My Awesome Playlist",
          description: "A playlist created with SpotGPT",
          public: true,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      const playlistId = response.data.id;
      const trackUris = songs.map((song) => song.uri);

      await axios.post(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
        {
          uris: trackUris,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Playlist created and saved successfully!");
    } catch (error) {
      console.error("Failed to create and save the playlist:", error);
    }
  };

  // const truncateText = (text, maxLength) => {
  //   if (text.length > maxLength) {
  //     return text.substring(0, maxLength - 3) + "...";
  //   }
  //   return text;
  // };

  return (
    <Box mx={"auto"} px={4} maxW={"container.lg"}>
      <Stack direction={"row"} justifyContent={"space-between"} mt={[4, 8]}>
        <VStack align={"start"} py={8} alignSelf={"center"}>
          <Text fontSize={welcomeTextFontSize} as="b" mb={"-1.5"}>
            Welcome to
          </Text>
          <Heading size={[headingFontSize]}>SpotGPT</Heading>
          <Text fontSize={[playlistTextFontSize]} as="b">
            generate your ultimate playlist
          </Text>
        </VStack>
        {isLoggedIn ? (
          <VStack alignSelf={"center"}>
            {userData && (
              <VStack>
                <img
                  src={userData.images[0]?.url}
                  alt="Profile"
                  className="ProfilePicture"
                />
                <p className="UserName">Welcome {userData.display_name}!</p>
                <Button
                  onClick={createAndSavePlaylist}
                  colorScheme="green"
                  variant="outline"
                  size={buttonSize}
                >
                  Save Playlist
                </Button>
              </VStack>
            )}
            <Button onClick={handleLogout} colorScheme="red" size={buttonSize}>
              Logout
            </Button>
          </VStack>
        ) : (
          <VStack alignSelf={"center"}>
            <Button onClick={handleLogin} colorScheme="green" size={buttonSize} maxW={"100%"} css={{ whiteSpace: "normal" }}>
              {loginButtonText}
            </Button>
          </VStack>
        )}
      </Stack>
      <VStack align={"start"}>
        <Text fontSize={listFontSize}>here are a couple of example inputs:</Text>
        <UnorderedList>
          {EXAMPLES.map((example, index) => (
            <ListItem key={index} fontSize={listFontSize}>
              {example}{" "}
              <Button size="xs" onClick={() => tryExample(example)}>
                Try Me
              </Button>
            </ListItem>
          ))}
        </UnorderedList>
      </VStack>
      <Flex
        direction={{ base: "column", md: "row" }}
        maxW="80%"
        mx={"auto"}
        my={8}
      >
        <Box flex={1} mr={{ base: 0, md: 2}} mb={{ base: 2, md: 0 }}>
          <Input
            value={inputText}
            onChange={(event) => setInputText(event.target.value)}
            onKeyDown={handleEnterKey}
            placeholder={placeholderText}
            size={inputBoxSize}
          />
        </Box>
        <Box display={"flex"}>
          <NumberInput
            value={numberOfSongs}
            onChange={(value) => setNumberOfSongs(value)}
            min={10}
            max={30}
            step={1}
            allowMouseWheel
            size={inputBoxSize}
            mr={2}
            flex={1}
          >
            <NumberInputField placeholder="Number of Songs" />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
          <Button onClick={handleEnterKey} colorScheme="green" size={buttonSize}>
            Generate
          </Button>
        </Box>
      </Flex>
      {isLoading ? (
        <>
          <TableContainer>
            <Table variant={"simple"}>
              <Thead>
                <Tr>
                  <Th px={thPaddingX} py={thPaddingY}>#</Th>
                  <Th px={thPaddingX} py={thPaddingY}>Album Cover</Th>
                  <Th px={thPaddingX} py={thPaddingY}>Song Title</Th>
                  {isDesktop && <Th px={thPaddingX} py={thPaddingY}>Artist Name</Th>}
                  {isDesktop && <Th px={thPaddingX} py={thPaddingY}>Popularity</Th>}
                </Tr>
              </Thead>
            </Table>
          </TableContainer>
          <Flex direction={"column"} align={"center"}>
            <Spinner
              my={8}
              thickness="4px"
              speed="0.65s"
              emptyColor="gray.200"
              color="blue.500"
              size="xl"
            />
            <Text fontSize={"xl"} mb={8}>
              Generating a playlist of {numberOfSongs} songs
            </Text>
          </Flex>
        </>
      ) : (
        <TableContainer mb={[4, 8]}>
          <Table variant={"simple"}>
            <Thead>
              <Tr>
                <Th px={thPaddingX} py={thPaddingY}>#</Th>
                <Th px={thPaddingX} py={thPaddingY}>Album Cover</Th>
                <Th px={thPaddingX} py={thPaddingY}>Song Title</Th>
                {isDesktop && <Th px={thPaddingX} py={thPaddingY}>Artist Name</Th>}
                {isDesktop && <Th px={thPaddingX} py={thPaddingY}>Popularity</Th>}
              </Tr>
            </Thead>
            <Tbody>
              {songs &&
                songs.map((song, i) => (
                  <Tr key={i}>
                    <Td px={thPaddingX} py={thPaddingY}>{i + 1}</Td>
                    <Td px={thPaddingX} py={thPaddingY}>
                      <Link
                        href={song.external_urls.spotify}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Image
                          src={song.album.images[0].url}
                          alt="Album Cover"
                          boxSize={imageBoxSize}
                        />
                      </Link>
                    </Td>
                    <Td px={thPaddingX} py={thPaddingY}>
                      {/* {truncateText(song.name, 30)} */}
                      {song.name}
                      {!isDesktop && <Text>By: {song.artists[0].name}</Text>}
                    </Td>
                    {isDesktop && <Td px={thPaddingX} py={thPaddingY}>{song.artists[0].name}</Td>}
                    {isDesktop && <Td px={thPaddingX} py={thPaddingY}>{song.popularity}</Td>}
                  </Tr>
                ))}
            </Tbody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}

export default App;
