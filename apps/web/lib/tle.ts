// UNVERIFIED — USER MUST COMPILE
// Fetches climate satellite TLEs from Celestrak.
// Cache stored in localStorage for 6 hours.
// No axios. Standard fetch only.

const CLIMATE_SATS = [49044, 49260, 43013, 43613, 40059] as const;

export type ClimateSat = (typeof CLIMATE_SATS)[number];

export interface TleEntry {
  norad: ClimateSat;
  tle1: string;
  tle2: string;
  name: string;
}

const CACHE_KEY = 'climate_tle_cache';
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

function parseTleText(text: string): { tle1: string; tle2: string; name: string } | null {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return null;
  return {
    tle1: lines[1]?.trim() || '',
    tle2: lines[2]?.trim() || '',
    name: lines[0]?.trim() || '',
  };
}

function fetchTle(norad: ClimateSat): Promise<TleEntry> {
  const cache = localStorage.getItem(CACHE_KEY);
  const cached = cache ? JSON.parse(cache) : null;

  if (cached && cached.timestamp + CACHE_TTL > Date.now()) {
    const entry = cached.entries[norad];
    if (entry) return Promise.resolve(entry);
  }

  const url = `https://celestrak.org/NORAD/elements/gp.php?CATNR=${norad}&FORMAT=TLE`;
  return fetch(url)
    .then((resp) => {
      if (!resp.ok) throw new Error(`TLE fetch failed: ${resp.status}`);
      return resp.text();
    })
    .then((text) => {
      const { tle1, tle2, name } = parseTleText(text) || {};
      if (!tle1 || !tle2) throw new Error(`Empty TLE for NORAD ${norad}`);

      const entry: TleEntry = { norad: norad, tle1, tle2, name: name || '' };

      // Store in localStorage cache
      const cacheEntry = { [norad]: entry };
      const cachedOld = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
      const cacheData = {
        timestamp: Date.now(),
        entries: {
          ...cachedOld.entries,
          ...cacheEntry,
        },
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));

      return entry;
    });
}

function initCache(): void {
  for (const norad of CLIMATE_SATS) {
    fetchTle(norad);
  }
}

initCache();