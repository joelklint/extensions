import { ActionPanel, List, Action, showToast, Toast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import algoliasearch from "algoliasearch/lite";
import striptags from "striptags";
import { VersionDropdown } from "./version_dropdown";

type docList = {
  [key: string]: {
    url: string;
    title: string;
  }[];
};

const DOCS: { [key: string]: docList } = {
  master: require("./documentation/master.json"),
  "10.x": require("./documentation/10.x.json"),
  "9.x": require("./documentation/9.x.json"),
  "8.x": require("./documentation/8.x.json"),
  "7.x": require("./documentation/7.x.json"),
  "6.x": require("./documentation/6.x.json"),
  "5.8": require("./documentation/5.8.json"),
  "5.7": require("./documentation/5.7.json"),
  "5.6": require("./documentation/5.6.json"),
  "5.5": require("./documentation/5.5.json"),
  "5.4": require("./documentation/5.4.json"),
  "5.3": require("./documentation/5.3.json"),
  "5.2": require("./documentation/5.2.json"),
  "5.1": require("./documentation/5.1.json"),
  "5.0": require("./documentation/5.0.json"),
  "4.2": require("./documentation/4.2.json"),
};

const APPID = "E3MIRNPJH5";
const APIKEY = "1fa3a8fec06eb1858d6ca137211225c0";
const INDEX = "laravel";

type KeyValueHierarchy = {
  [key: string]: string;
};

type LaravelDocsHit = {
  url: string;
  hierarchy: KeyValueHierarchy;
  objectID: string;
  _highlightResult: {
    content:
      | {
          value: string;
          matchlevel: string;
          fullyHighlighted: boolean;
          matchedWords: string[];
        }
      | undefined;
    hierarchy: {
      [key: string]: {
        value: string;
        matchLevel: string;
        matchedWords: string[];
      };
    };
  };
};

export default function main() {
  const algoliaClient = useMemo(() => {
    return algoliasearch(APPID, APIKEY);
  }, [APPID, APIKEY]);

  const algoliaIndex = useMemo(() => {
    return algoliaClient.initIndex(INDEX);
  }, [algoliaClient, INDEX]);

  const [searchResults, setSearchResults] = useState<any[] | undefined>();
  const [version, setVersion] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  const hierarchyToArray = (hierarchy: KeyValueHierarchy) => {
    return Object.values(hierarchy)
      .filter((hierarchyEntry: string | unknown) => hierarchyEntry)
      .map((hierarchyEntry: string) => hierarchyEntry.replaceAll("&amp;", "&"));
  };

  const getTitle = (hit: LaravelDocsHit): string => {
    return hierarchyToArray(hit.hierarchy).pop() || "";
  };

  const getSubTitle = (hit: LaravelDocsHit): string => {
    const highlightResult = striptags(hit._highlightResult?.content?.value || "");
    if (highlightResult) {
      return highlightResult;
    }

    const hierarchy = hierarchyToArray(hit.hierarchy) || [];
    hierarchy.pop();
    return hierarchy.join(" > ");
  };

  const search = async (query = "") => {
    if (query === "") {
      return;
    }
    setIsLoading(true);

    return await algoliaIndex
      .search(query, {
        hitsPerPage: 11,
        facetFilters: ["version:" + version],
      })
      .then((res) => {
        setIsLoading(false);
        return res.hits;
      })
      .catch((err) => {
        setIsLoading(false);
        showToast(Toast.Style.Failure, "Error searching Laravel Documentation", err.message);
        return [];
      });
  };

  useEffect(() => {
    (async () => setSearchResults(await search()))();
  }, []);

  if (!version) {
    return (
      <List
        isLoading={isLoading}
        searchBarAccessory={<VersionDropdown id="version" versions={Object.keys(DOCS)} onChange={setVersion} />}
      />
    );
  }

  const currentDocs = DOCS[version];

  if (isLoading && Object.entries(currentDocs).length) {
    setIsLoading(false);
  }

  return (
    <List
      throttle={true}
      isLoading={isLoading}
      onSearchTextChange={async (query) => setSearchResults(await search(query))}
      searchBarAccessory={<VersionDropdown id="version" versions={Object.keys(DOCS)} onChange={setVersion} />}
    >
      {searchResults?.map((hit: LaravelDocsHit) => {
        return (
          <List.Item
            key={hit.objectID}
            title={getTitle(hit)}
            subtitle={getSubTitle(hit)}
            icon="command-icon.png"
            actions={
              <ActionPanel title={hit.url}>
                <Action.OpenInBrowser url={hit.url} title="Open in Browser" />
                <Action.CopyToClipboard content={hit.url} title="Copy URL" />
              </ActionPanel>
            }
          />
        );
      }) ||
        Object.entries(currentDocs).map(([section, items]: Array<any>) => {
          return (
            <List.Section title={section} key={section}>
              {items.map((item: any) => {
                return (
                  <List.Item
                    key={item.url}
                    title={item.title}
                    icon="command-icon.png"
                    actions={
                      <ActionPanel title={item.url}>
                        <Action.OpenInBrowser url={item.url} title="Open in Browser" />
                        <Action.CopyToClipboard content={item.url} title="Copy URL" />
                      </ActionPanel>
                    }
                  />
                );
              })}
            </List.Section>
          );
        })}
    </List>
  );
}
