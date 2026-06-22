// Fetch the latest NDIS Commission Compliance Actions CSV from data.gov.au.
// The Commission publishes a new dataset each week with a dated slug
// (e.g. ndis-commission-compliance-actions-04-06-2026). We search CKAN for
// the latest dataset and grab its CSV resource.
//
// Writes: pipeline/raw/source.csv and pipeline/raw/source.meta.json

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const RAW_DIR = resolve(HERE, 'raw');

const SEARCH_URL =
  'https://data.gov.au/data/api/3/action/package_search?q=ndis+commission+compliance+actions&rows=40&sort=metadata_modified+desc';

const HEADERS = {
  'User-Agent': 'au-ndis-watch (github.com/ben-gy/au-ndis-watch) data pipeline',
  Accept: 'application/json,text/csv,*/*',
};

async function findLatestDataset() {
  const res = await fetch(SEARCH_URL, { headers: HEADERS });
  if (!res.ok) throw new Error(`CKAN search failed: ${res.status}`);
  const json = await res.json();
  const results = json?.result?.results ?? [];

  const candidates = results
    .filter((pkg) => /ndis-commission-(compliance|provider-register)/i.test(pkg.name))
    .map((pkg) => {
      const csv = (pkg.resources ?? []).find(
        (r) => (r.format ?? '').toUpperCase() === 'CSV' && r.url,
      );
      return csv
        ? {
            datasetName: pkg.name,
            datasetTitle: pkg.title,
            modified: pkg.metadata_modified,
            csvUrl: csv.url,
            resourceName: csv.name,
          }
        : null;
    })
    .filter(Boolean)
    .sort((a, b) => (b.modified ?? '').localeCompare(a.modified ?? ''));

  if (!candidates.length) {
    throw new Error('No NDIS Commission Compliance CSV resource found on data.gov.au');
  }
  return candidates[0];
}

async function main() {
  await mkdir(RAW_DIR, { recursive: true });
  const target = await findLatestDataset();
  console.log(`Fetching ${target.csvUrl}`);
  const csvRes = await fetch(target.csvUrl, { headers: HEADERS });
  if (!csvRes.ok) throw new Error(`CSV fetch failed: ${csvRes.status}`);
  const csv = await csvRes.text();
  await writeFile(resolve(RAW_DIR, 'source.csv'), csv, 'utf8');
  const meta = {
    fetched_at: new Date().toISOString(),
    dataset_name: target.datasetName,
    dataset_title: target.datasetTitle,
    dataset_modified: target.modified,
    csv_url: target.csvUrl,
    csv_bytes: Buffer.byteLength(csv, 'utf8'),
  };
  await writeFile(resolve(RAW_DIR, 'source.meta.json'), JSON.stringify(meta, null, 2), 'utf8');
  console.log(`Wrote ${meta.csv_bytes} bytes from ${meta.dataset_title}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
