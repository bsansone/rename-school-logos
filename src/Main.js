// Libraries
import React from "react";
import {
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
  useToast,
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
  filename ? filename.replace("images/logos/", "").replace(".png", "") : filename;

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
// Main

function Main() {
  const toast = useToast();
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
  const [isFixingSchools, setIsFixingSchools] = React.useState(
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
      [LOGOS[logoIndex]]: [...checked],
    };

    setCheckedSchools(newCheckedSchools);
    setSavedCheckedSchools(newCheckedSchools);
  };

  const removeSchool = (school) => {
    const newCheckedSchools = {
      ...checkedSchools,
      [LOGOS[logoIndex]]: checkedSchools[LOGOS[logoIndex]].filter(
        (_school) => _school !== school
      ),
    };

    setCheckedSchools(newCheckedSchools);
    setSavedCheckedSchools(newCheckedSchools);
  };

  const fixSchools = () => {
    setIsFixingSchools(true);

    try {
      const fixedSchoolData = {};

      for (let key in savedCheckedSchools) {
        if (LOGOS[key]) {
          fixedSchoolData[LOGOS[key]] = savedCheckedSchools[key];
        }
      }

      if (Object.keys(fixedSchoolData).length > 0) {
        setCheckedSchools(fixedSchoolData);
        setSavedCheckedSchools(fixedSchoolData);
        toast({
            title: "Schools fixed.",
            status: "success",
            duration: 9000,
            isClosable: true,
          });
      } else {
        toast({
            description: "No schools to be fixed.",
            status: "warning",
            duration: 9000,
            isClosable: true,
          });
      }

      setIsFixingSchools(false);
    } catch (error) {
      setIsFixingSchools(false);
      console.error(error);
      toast({
        title: "An error occurred.",
        description: error,
        status: "error",
        duration: 9000,
        isClosable: true,
      });
    }
  };

  const downloadSavedData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(savedCheckedSchools));
    const downloadAnchorNode = document.createElement('a');
    const now = new Date();
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `rename_school_logos_${now}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
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
            <Tab>Other</Tab>
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
                <SelectedSchoolTags logoIndex={logoIndex} checkedSchools={checkedSchools} removeSchool={removeSchool} />
                <Input
                  placeholder="Search schools..."
                  onChange={onSchoolQuery}
                  value={schoolQuery}
                  type="text"
                  borderWidth={2}
                />
              </Box>
              <SearchResults
                isLoadingSearchResults={isLoadingSearchResults}
                fuseResults={fuseResults}
                checkedSchools={checkedSchools}
                toggleCheckedSchools={toggleCheckedSchools}
                logoIndex={logoIndex}
              />
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
                        key={schoolIndex}
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
            <TabPanel>
              <Stack pt={8} spacing={4}>
            <Button onClick={downloadSavedData}>
                Download Saved Data
              </Button>
              <Button onClick={fixSchools} disabled={isFixingSchools}>
                {isFixingSchools ? "Fixing..." : "Fix Schools" }
              </Button>
              </Stack>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
  );
}

const SearchResults = ({ isLoadingSearchResults, fuseResults, checkedSchools, toggleCheckedSchools, logoIndex }) => {
    return (
        <React.Fragment>
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
                       <Result
                            name={result.name}
                            location={result.location}
                            score={result.score}
                        />
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
        </React.Fragment>
    );
};

const Result = ({ name, score, location }) => {
    return (
        <Flex
          ml={4}
          justifyContent="space-between"
          align="center"
        >
          <Flex flexDir="column">
            <Text fontSize="md">
              {name}
              <Badge
                as="span"
                ml={8}
                fontSize="xs"
                variantColor={
                  score < 0.1
                    ? "green"
                    : score < 0.2
                    ? "yellow"
                    : score < 0.3
                    ? "orange"
                    : score >= 0.75
                    ? "red"
                    : "blue"
                }
              >
                {score}
              </Badge>
            </Text>
            <Text fontSize="xs" color="gray.500">
              {location}
            </Text>
          </Flex>
        </Flex>
    );
};

const SelectedSchoolTags = ({ logoIndex, checkedSchools, removeSchool }) => {
    if (LOGOS[logoIndex] in checkedSchools) {
        return (
            <Flex mb={4} flexWrap="wrap">
                {checkedSchools[LOGOS[logoIndex]].map((school) => (
                <Tag key={school} mr={2} mb={2}>
                    <TagLabel>{school}</TagLabel>
                    <TagCloseButton onClick={() => removeSchool(school)} />
                </Tag>
                ))}
            </Flex>
        );
    }

    return null;
};


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

export default Main;
