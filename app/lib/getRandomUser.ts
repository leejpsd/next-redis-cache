import { cacheLife, cacheTag } from "next/cache";
import { getRuntimeIdentity, type RuntimeIdentity } from "@/lib/runtime-context";

const RANDOM_USER_URL = "https://randomuser.me/api";
const REQUEST_TIMEOUT_MS = 4000;
const MAX_ATTEMPTS = 3;
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

const FALLBACK_RANDOM_USER_RESPONSE = {
  results: [
    {
      name: {
        title: "Mx",
        first: "Cache",
        last: "Fallback",
      },
      location: {
        street: {
          number: 16,
          name: "Redis Lane",
        },
        city: "Seoul",
        country: "South Korea",
        timezone: {
          offset: "+09:00",
          description: "Seoul, Tokyo, Osaka, Sapporo, Yakutsk",
        },
        coordinates: {
          latitude: "37.5665",
          longitude: "126.9780",
        },
      },
      email: "cache-fallback@example.com",
      phone: "010-0000-0000",
      nat: "KR",
      dob: {
        date: "1995-06-16T00:00:00.000Z",
        age: 29,
      },
      registered: {
        date: "2024-03-10T00:00:00.000Z",
        age: 1,
      },
      picture: {
        large: "https://randomuser.me/api/portraits/lego/1.jpg",
      },
    },
  ],
};

type RandomUserPayload = {
  results: Array<{
    name: {
      title: string;
      first: string;
      last: string;
    };
    location: {
      street: {
        number: number;
        name: string;
      };
      city: string;
      country: string;
      timezone: {
        offset: string;
        description: string;
      };
      coordinates: {
        latitude: string;
        longitude: string;
      };
    };
    email: string;
    phone: string;
    nat: string;
    dob: {
      date: string;
      age: number;
    };
    registered: {
      date: string;
      age: number;
    };
    picture: {
      large: string;
    };
  }>;
  fetchedAt: number;
  source: "origin" | "fallback";
  generatedBy: RuntimeIdentity;
};

function isRetryableStatus(status: number): boolean {
  return RETRYABLE_STATUS.has(status);
}

async function fetchRandomUserFromOrigin(): Promise<RandomUserPayload> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(RANDOM_USER_URL, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!response.ok) {
        if (!isRetryableStatus(response.status) || attempt === MAX_ATTEMPTS) {
          throw new Error(`Failed to fetch random user: ${response.status}`);
        }

        throw new Error(`Retryable upstream status: ${response.status}`);
      }

      return {
        ...(await response.json()),
        fetchedAt: Date.now(),
        source: "origin",
        generatedBy: getRuntimeIdentity(),
      } as RandomUserPayload;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === MAX_ATTEMPTS) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, attempt * 200));
    }
  }

  throw lastError ?? new Error("Failed to fetch random user");
}

function getFallbackRandomUser(): RandomUserPayload {
  return {
    ...FALLBACK_RANDOM_USER_RESPONSE,
    fetchedAt: Date.now(),
    source: "fallback",
    generatedBy: getRuntimeIdentity(),
  };
}

export async function getRandomUser(): Promise<RandomUserPayload> {
  "use cache";

  cacheLife("minutes");
  cacheTag("random-user");

  try {
    return await fetchRandomUserFromOrigin();
  } catch (error) {
    console.error(
      "[getRandomUser] Falling back after upstream failure:",
      error instanceof Error ? error.message : String(error)
    );
    return getFallbackRandomUser();
  }
}
