// Libraries
import React from "react";
import {
  ThemeProvider,
  CSSReset,
  Box,
  Image,
  Flex,
  Badge,
  Text,
  Button,
  Icon,
  Tag,
  Input,
  CheckboxGroup,
  Checkbox,
  Stack,
  Skeleton,
  TagLabel,
  Tooltip,
  TagCloseButton,
  Tabs,
  TabList,
  TabPanels,
  Select,
  Tab,
  TabPanel,
  List,
  ListItem,
  Heading,
  IconButton,
} from "@chakra-ui/core";
import Fuse from "fuse.js";
import debounce from "lodash.debounce";
import startCase from "lodash.startcase";

// Data
import schools from "./data/schools.json";
import logos from "./data/logos.json";

const FUSE_INDEX = Fuse.createIndex(["NAME"], schools);

const fuse = new Fuse(
  schools,
  {
    keys: ["NAME", "WEBSITE"],
    includeScore: true,
    isCaseSensitive: true,
  },
  FUSE_INDEX
);

const FUSE_CACHE = {};

const LOGOS = logos
  .map((logo) => `images/logos/${logo}`)
  .filter((logo) => logo);

const formatLogoFilename = (filename) =>
  filename.replace("images/logos/", "").replace(".png", "");

const getUrlIndex = () => {
  const index = parseInt(window.location.pathname.replace("/", "")) || 0;

  if (index < 0 || index > LOGOS.length - 1) {
    return 0;
  }

  return index;
};

//////////////////////////////////////////////////////////////////////////////////////////
// useLocation
// Source: https://gist.github.com/lenkan/357b006dd31a8c78f659430467369ea7

function getCurrentLocation() {
  return {
    pathname: window.location.pathname,
    search: window.location.search,
  };
}

const listeners = [];

function notify() {
  listeners.forEach((listener) => listener());
}

function useLocation() {
  const [{ pathname, search }, setLocation] = React.useState(
    getCurrentLocation()
  );

  React.useEffect(() => {
    window.addEventListener("popstate", handleChange);
    return () => window.removeEventListener("popstate", handleChange);
  }, []);

  React.useEffect(() => {
    listeners.push(handleChange);
    return () => listeners.splice(listeners.indexOf(handleChange), 1);
  }, []);

  function handleChange() {
    setLocation(getCurrentLocation());
  }

  function push(url) {
    window.history.pushState(null, null, url);
    notify();
  }

  function replace(url) {
    window.history.replaceState(null, null, url);
    notify();
  }

  return {
    push,
    replace,
    pathname,
    search,
  };
}
//////////////////////////////////////////////////////////////////////////////////////////
// App

function App() {
  const location = useLocation();
  const [savedCheckedSchools, setSavedCheckedSchools] = useLocalStorage(
    "rename-school-logos",
    {}
  );
  const [checkedSchools, setCheckedSchools] = React.useState(
    savedCheckedSchools
  );
  const [logoIndex, setLogoIndex] = React.useState(getUrlIndex());
  const [isLoadingSearchResults, setIsLoadingSearchResults] = React.useState(
    false
  );
  const [schoolQuery, setSchoolQuery] = React.useState("");
  const [fuseResults, setFuseResults] = React.useState([]);
  const delayedSchoolQuery = React.useCallback(
    debounce((q) => getFuseResults(q), 500),
    []
  );

  const getNextLogoIndex = () => {
    if (logoIndex === LOGOS.length - 1) {
      return 0;
    } else {
      return logoIndex + 1;
    }
  };

  const getPreviousLogoIndex = () => {
    if (logoIndex === 0) {
      return LOGOS.length - 1;
    } else {
      return logoIndex - 1;
    }
  };

  const incrementLogo = () => {
    setLogoIndex(getNextLogoIndex());
  };

  const decrementLogo = () => {
    setLogoIndex(getPreviousLogoIndex());
  };

  const goToLogo = (index) => {
    setLogoIndex(index);
  };

  const getFuseResults = (query) => {
    const formattedQuery = query.trim().toUpperCase();

    if (FUSE_CACHE[formattedQuery]) {
      setFuseResults([...FUSE_CACHE[formattedQuery]]);
    } else {
      const results = fuse
        .search(formattedQuery.trim().toUpperCase())
        .map((o) => ({
          name: startCase(o.item.NAME.toLowerCase()).trim(),
          location: `${startCase(o.item.CITY.toLowerCase())}, ${
            o.item.STATE
          }`.trim(),
          score: o.score.toFixed(4),
          value: o.item.NAME,
        }));

      FUSE_CACHE[formattedQuery] = results;

      setFuseResults(results);
    }

    setIsLoadingSearchResults(false);
  };

  const onSchoolQuery = (e) => {
    setSchoolQuery(e.target.value);

    if (e.target.value.length >= 3) {
      setIsLoadingSearchResults(true);
      delayedSchoolQuery(e.target.value);
    }

    if (e.target.value.length === 0) {
      setFuseResults([]);
    }
  };

  const toggleCheckedSchools = (checked) => {
    const newCheckedSchools = {
      ...checkedSchools,
      [logoIndex]: [...checked],
    };

    setCheckedSchools(newCheckedSchools);
    setSavedCheckedSchools(newCheckedSchools);
  };

  const removeSchool = (school) => {
    const newCheckedSchools = {
      ...checkedSchools,
      [logoIndex]: checkedSchools[logoIndex].filter(
        (_school) => _school !== school
      ),
    };

    setCheckedSchools(newCheckedSchools);
    setSavedCheckedSchools(newCheckedSchools);
  };

  React.useEffect(() => {
    const newIndex = parseInt(location.pathname.replace("/", "")) || 0;

    if (newIndex !== logoIndex) {
      setSchoolQuery("");
      setFuseResults([]);
      location.push(`/${logoIndex}`);
    }
  }, [logoIndex, location]);

  return (
    <ThemeProvider>
      <CSSReset />

      <Box
        maxWidth={900}
        p={4}
        borderRadius={4}
        borderWidth={2}
        borderStyle="solid"
        m="auto"
        my={4}
        bg="white"
      >
        <Tabs variant="soft-rounded">
          <TabList>
            <Tab>Home</Tab>
            <Tab>Current Results</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <Select
                value={logoIndex}
                placeholder="Select school"
                my={6}
                size="sm"
                onChange={(e) => goToLogo(parseInt(e.target.value))}
              >
                {logos.map((logo, index) => (
                  <option key={index} value={index}>
                    {formatLogoFilename(logo)}{" "}
                    {checkedSchools[index] && checkedSchools[index].length > 0
                      ? ` — (${checkedSchools[index].length})`
                      : null}
                  </option>
                ))}
              </Select>
              <Flex align="center" justifyContent="space-between" pt={12}>
                <Tooltip
                  label={formatLogoFilename(LOGOS[getPreviousLogoIndex()])}
                >
                  <Button onClick={decrementLogo}>
                    <Icon name="chevron-left" />
                  </Button>
                </Tooltip>
                <Flex flexDirection="column" align="center">
                  <Image src={LOGOS[logoIndex]} maxW={350} mb={6} />
                  <Text>{formatLogoFilename(LOGOS[logoIndex])}</Text>
                </Flex>
                <Tooltip label={formatLogoFilename(LOGOS[getNextLogoIndex()])}>
                  <Button onClick={incrementLogo}>
                    <Icon name="chevron-right" />
                  </Button>
                </Tooltip>
              </Flex>
              <Box my={6}>
                {logoIndex in checkedSchools ? (
                  <Flex mb={4} flexWrap="wrap">
                    {checkedSchools[logoIndex].map((school) => (
                      <Tag key={school} mr={2} mb={2}>
                        <TagLabel>{school}</TagLabel>
                        <TagCloseButton onClick={() => removeSchool(school)} />
                      </Tag>
                    ))}
                  </Flex>
                ) : null}
                <Input
                  placeholder="Search schools..."
                  onChange={onSchoolQuery}
                  value={schoolQuery}
                  type="text"
                  borderWidth={2}
                />
              </Box>
              {isLoadingSearchResults ? <Skeleton height={10} my={10} /> : null}
              {!isLoadingSearchResults && fuseResults.length > 0 ? (
                <Box
                  maxH={500}
                  overflowY="scroll"
                  borderRadius={4}
                  borderWidth={2}
                  borderStyle="solid"
                  p={4}
                >
                  <CheckboxGroup
                    size="lg"
                    onChange={toggleCheckedSchools}
                    value={checkedSchools[logoIndex]}
                  >
                    {fuseResults.map((result, index) => (
                      <Checkbox
                        key={`${result.name}-${index}`}
                        value={result.name}
                      >
                        <Flex
                          ml={4}
                          justifyContent="space-between"
                          align="center"
                        >
                          <Flex flexDir="column">
                            <Text fontSize="md">
                              {result.name}
                              <Badge
                                as="span"
                                ml={8}
                                fontSize="xs"
                                variantColor={
                                  result.score < 0.1
                                    ? "green"
                                    : result.score < 0.2
                                    ? "yellow"
                                    : result.score < 0.3
                                    ? "orange"
                                    : result.score >= 0.75
                                    ? "red"
                                    : "blue"
                                }
                              >
                                {result.score}
                              </Badge>
                            </Text>
                            <Text fontSize="xs" color="gray.500">
                              {result.location}
                            </Text>
                          </Flex>
                        </Flex>
                      </Checkbox>
                    ))}
                  </CheckboxGroup>
                </Box>
              ) : null}
              {fuseResults.length > 0 ? (
                <Text pt={2} textAlign="right" fontSize="sm">
                  {fuseResults.length} results found
                </Text>
              ) : null}
            </TabPanel>
            <TabPanel>
              <Stack spacing={4} pt={8}>
                {checkedSchools ? (
                  Object.keys(checkedSchools)
                    .filter(
                      (schoolIndex) =>
                        checkedSchools[schoolIndex] &&
                        checkedSchools[schoolIndex].length
                    )
                    .map((schoolIndex) => (
                      <Box
                        key={LOGOS[schoolIndex]}
                        p={5}
                        shadow="md"
                        borderWidth={1}
                      >
                        <Heading fontSize="md" mb={2}>
                          {formatLogoFilename(LOGOS[schoolIndex])}
                        </Heading>
                        <List spacing={3}>
                          {checkedSchools[schoolIndex].map((school) => (
                            <ListItem key={school} fontSize="md">
                              <Tooltip label={`Remove ${school}`}>
                                <IconButton
                                  variant="ghost"
                                  mr={2}
                                  size="xs"
                                  icon="close"
                                  variantColor="red"
                                  onClick={() => removeSchool(school)}
                                />
                              </Tooltip>
                              {school}
                            </ListItem>
                          ))}
                        </List>
                      </Box>
                    ))
                ) : (
                  <Text>Nothing here</Text>
                )}
              </Stack>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
    </ThemeProvider>
  );
}

//////////////////////////////////////////////////////////////////////////////////////////
// useLocalStorage
// Source: https://usehooks.com/useLocalStorage/

function useLocalStorage(key, initialValue) {
  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = React.useState(() => {
    try {
      // Get from local storage by key
      const item = window.localStorage.getItem(key);
      // Parse stored json or if none return initialValue
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      // If error also return initialValue
      console.log(error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that ...
  // ... persists the new value to localStorage.
  const setValue = (value) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      // Save state
      setStoredValue(valueToStore);
      // Save to local storage
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      // A more advanced implementation would handle the error case
      console.log(error);
    }
  };

  return [storedValue, setValue];
}

export default App;
