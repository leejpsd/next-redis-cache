/* eslint-disable @typescript-eslint/no-require-imports */

import { describe, expect, it } from "vitest";

const {
  CachedRouteKind,
} = require("next/dist/server/response-cache");
const {
  NEXT_CACHE_TAGS_HEADER,
  CACHE_ONE_YEAR_SECONDS,
} = require("next/dist/lib/constants");
const {
  __test,
} = require("./incremental-cache-handler.js");

describe("incremental-cache-handler helpers", () => {
  it("serializes and deserializes Buffer and Map values", () => {
    const record = {
      lastModified: 123,
      value: {
        kind: CachedRouteKind.APP_PAGE,
        html: "<div>ok</div>",
        rscData: Buffer.from("rsc"),
        status: 200,
        headers: {
          [NEXT_CACHE_TAGS_HEADER]: "posts,feed",
        },
        postponed: undefined,
        segmentData: new Map([["/hero", Buffer.from("segment")]]),
      },
    };

    const serialized = __test.serializeCacheRecord(record);
    const deserialized = __test.deserializeCacheRecord(serialized);

    expect(Buffer.isBuffer(deserialized.value.rscData)).toBe(true);
    expect(deserialized.value.rscData.toString()).toBe("rsc");
    expect(deserialized.value.segmentData).toBeInstanceOf(Map);
    expect(deserialized.value.segmentData.get("/hero").toString()).toBe("segment");
  });

  it("extracts tags from fetch and response values", () => {
    const fetchTags = __test.extractTagsFromValue(
      {
        kind: CachedRouteKind.FETCH,
        data: {
          headers: {},
          body: "{}",
          url: "https://example.com",
        },
        tags: ["posts"],
        revalidate: 300,
      },
      {
        kind: "FETCH",
        tags: ["feed"],
        softTags: ["soft-feed"],
      }
    );

    const responseTags = __test.extractTagsFromValue(
      {
        kind: CachedRouteKind.APP_PAGE,
        html: "<html></html>",
        headers: {
          [NEXT_CACHE_TAGS_HEADER]: "posts, feed",
        },
      },
      {
        kind: "APP_PAGE",
      }
    );

    expect(fetchTags).toEqual(["posts", "feed", "soft-feed"]);
    expect(responseTags).toEqual(["posts", "feed"]);
  });

  it("marks stale fetch entries and expired response entries as invalid", () => {
    expect(__test.isTagStateExpired({ stale: 200 }, 100, true)).toBe(true);
    expect(__test.isTagStateExpired({ stale: 200 }, 100, false)).toBe(false);
    expect(__test.isTagStateExpired({ expired: 200 }, 100, false)).toBe(true);
  });

  it("normalizes ttl conservatively for fetch and response cache", () => {
    expect(
      __test.normalizeTtlSeconds(
        {
          kind: CachedRouteKind.FETCH,
          data: { headers: {}, body: "{}", url: "https://example.com" },
          revalidate: 5,
        },
        {}
      )
    ).toBe(60);

    expect(
      __test.normalizeTtlSeconds(
        {
          kind: CachedRouteKind.APP_PAGE,
          html: "<html></html>",
        },
        {
          cacheControl: {
            revalidate: false,
          },
        }
      )
    ).toBe(CACHE_ONE_YEAR_SECONDS);
  });
});
