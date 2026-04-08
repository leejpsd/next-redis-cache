import { randomUUID, createHmac } from "node:crypto";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function decodeHtmlEntities(value) {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

function extractJsonPayload(html, id) {
  const match = html.match(
    new RegExp(`<pre id="${id}"[^>]*>([\\s\\S]*?)<\\/pre>`)
  );

  if (!match) {
    throw new Error(`Payload with id "${id}" not found`);
  }

  return JSON.parse(decodeHtmlEntities(match[1]));
}

async function fetchJson(url, init) {
  const response = await fetch(url, init);

  if (!response.ok) {
    throw new Error(`Request failed for ${url}: ${response.status}`);
  }

  return response.json();
}

async function fetchHtml(url, init) {
  const response = await fetch(url, init);

  if (!response.ok) {
    throw new Error(`Request failed for ${url}: ${response.status}`);
  }

  return response.text();
}

async function collectRuntimeInstances(baseUrl, attempts = 12) {
  const seen = new Set();
  const samples = [];

  for (let i = 0; i < attempts; i += 1) {
    const url = new URL("/api/runtime", baseUrl);
    url.searchParams.set("t", `${Date.now()}-${i}`);

    const payload = await fetchJson(url);
    const instanceId = payload.runtime.instanceId;

    seen.add(instanceId);
    samples.push(payload.runtime);

    if (seen.size >= 2) {
      break;
    }

    await wait(250);
  }

  return {
    instances: [...seen],
    samples,
  };
}

async function collectUseCacheSamples(baseUrl, attempts = 12) {
  const samples = [];

  for (let i = 0; i < attempts; i += 1) {
    const html = await fetchHtml(new URL("/verify/use-cache", baseUrl));
    const payload = extractJsonPayload(html, "probe-payload");
    const renderer = extractJsonPayload(html, "probe-renderer");
    samples.push({
      payload,
      renderer,
    });
    await wait(250);
  }

  return samples;
}

async function collectRandomUserSamples(baseUrl, attempts = 8) {
  const samples = [];

  for (let i = 0; i < attempts; i += 1) {
    const html = await fetchHtml(new URL(`/?t=${Date.now()}-${i}`, baseUrl));
    const payload = extractJsonPayload(html, "random-user-payload");
    samples.push(payload);
    await wait(250);
  }

  return samples;
}

function createWebhookSignature({
  topic,
  timestamp,
  webhookId,
  body,
  secret,
}) {
  const signedPayload = [topic, timestamp, webhookId, body].join(".");

  return createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");
}

async function triggerRandomUserInvalidation(baseUrl) {
  const revalidationSecret = process.env.REVALIDATION_SECRET;
  const signingSecret = process.env.WEBHOOK_SIGNING_SECRET;

  if (!revalidationSecret || !signingSecret) {
    throw new Error(
      "REVALIDATION_SECRET and WEBHOOK_SIGNING_SECRET are required for invalidation verification"
    );
  }

  const endpoint = new URL("/api/revalidate", baseUrl);
  endpoint.searchParams.set("secret", revalidationSecret);

  const body = JSON.stringify({ source: "verify-staging-shared-cache" });
  const topic = "random-user/update";
  const timestamp = Date.now().toString();
  const webhookId = randomUUID();
  const signature = createWebhookSignature({
    topic,
    timestamp,
    webhookId,
    body,
    secret: signingSecret,
  });

  return fetchJson(endpoint, {
    method: "POST",
    headers: {
      topic,
      "content-type": "application/json",
      "x-webhook-timestamp": timestamp,
      "x-webhook-id": webhookId,
      "x-webhook-signature": signature,
    },
    body,
  });
}

async function waitForRandomUserRefresh(baseUrl, previousFetchedAt, attempts = 10) {
  for (let i = 0; i < attempts; i += 1) {
    const html = await fetchHtml(new URL(`/?refresh=${Date.now()}-${i}`, baseUrl));
    const payload = extractJsonPayload(html, "random-user-payload");

    if (payload.fetchedAt !== previousFetchedAt) {
      return payload;
    }

    await wait(1000);
  }

  throw new Error("Timed out waiting for random-user cache to refresh");
}

async function main() {
  const appBaseUrl = process.env.APP_BASE_URL;

  if (!appBaseUrl) {
    throw new Error("APP_BASE_URL is required");
  }

  const runtime = await collectRuntimeInstances(appBaseUrl);
  const useCacheSamples = await collectUseCacheSamples(appBaseUrl);
  const useCacheGeneratedBy = new Set(
    useCacheSamples.map((sample) => sample.payload.generatedBy.instanceId)
  );
  const useCacheRenderedBy = new Set(
    useCacheSamples.map((sample) => sample.renderer.instanceId)
  );
  const useCacheCounts = new Set(
    useCacheSamples.map((sample) => sample.payload.count)
  );

  const beforeInvalidation = await collectRandomUserSamples(appBaseUrl, 4);
  const beforeFetchedAt = beforeInvalidation[0]?.fetchedAt;
  const beforeCacheBy = new Set(
    beforeInvalidation.map((sample) => sample.generatedBy.instanceId)
  );

  const invalidationResponse = await triggerRandomUserInvalidation(appBaseUrl);
  const refreshedPayload = await waitForRandomUserRefresh(
    appBaseUrl,
    beforeFetchedAt
  );

  const result = {
    ok: true,
    runtime: {
      discoveredInstances: runtime.instances,
      discoveredCount: runtime.instances.length,
    },
    useCache: {
      sampledRequestCount: useCacheSamples.length,
      distinctPayloadCounts: [...useCacheCounts],
      renderedByInstances: [...useCacheRenderedBy],
      generatedByInstances: [...useCacheGeneratedBy],
      sharedCacheObserved: useCacheCounts.size === 1,
    },
    randomUser: {
      beforeInvalidationFetchedAt: beforeFetchedAt,
      beforeGeneratedByInstances: [...beforeCacheBy],
      invalidationResponse,
      afterInvalidationFetchedAt: refreshedPayload.fetchedAt,
      afterGeneratedByInstance: refreshedPayload.generatedBy.instanceId,
      refreshed: refreshedPayload.fetchedAt !== beforeFetchedAt,
    },
  };

  console.log(JSON.stringify(result, null, 2));

  assert(
    runtime.instances.length >= 2,
    "Expected to discover at least 2 ECS task instances behind the load balancer"
  );
  assert(
    useCacheRenderedBy.size >= 2,
    "Expected use-cache verification requests to be rendered by at least 2 instances"
  );
  assert(useCacheCounts.size === 1, "Expected shared use-cache payload across instances");
  assert(
    refreshedPayload.fetchedAt !== beforeFetchedAt,
    "Expected random-user payload to refresh after invalidation"
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
