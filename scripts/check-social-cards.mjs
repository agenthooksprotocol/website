import { createHash } from 'node:crypto';
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(target) : [target];
  }))).flat();
}

const files = await filesUnder('dist');
const htmlFiles = files.filter((file) => file.endsWith('.html'));
const cardFiles = new Set(
  files.filter((file) => {
    const relativePath = path.relative('dist', file).split(path.sep).join('/');
    return /^social-cards\/[a-f0-9]{20}\.png$/.test(relativePath);
  }),
);
const linkedCards = new Set();
const errors = [];

for (const htmlFile of htmlFiles) {
  const html = await readFile(htmlFile, 'utf8');
  const openGraphImage = html.match(/<meta property="og:image" content="([^"]+)"/u)?.[1];
  const twitterImage = html.match(/<meta name="twitter:image" content="([^"]+)"/u)?.[1];
  if (openGraphImage === undefined || openGraphImage !== twitterImage) {
    errors.push(`${htmlFile}: missing or mismatched social image metadata`);
    continue;
  }

  const imageFile = path.join('dist', ...new URL(openGraphImage).pathname.split('/'));
  linkedCards.add(imageFile);
  try {
    await stat(imageFile);
  } catch {
    errors.push(`${htmlFile}: linked social card does not exist`);
  }
}

for (const cardFile of cardFiles) {
  if (!linkedCards.has(cardFile)) errors.push(`${cardFile}: generated social card is not linked`);
  const digest = createHash('sha256').update(await readFile(cardFile)).digest('hex').slice(0, 20);
  if (path.basename(cardFile) !== `${digest}.png`) {
    errors.push(`${cardFile}: filename does not match the rendered PNG digest`);
  }
}
for (const cardFile of linkedCards) {
  if (!cardFiles.has(cardFile)) errors.push(`${cardFile}: linked image is not a hashed social card`);
}
const homeHtml = await readFile('dist/index.html', 'utf8');
const homeImage = homeHtml.match(/<meta property="og:image" content="([^"]+)"/u)?.[1];
const homeCard = homeImage === undefined
  ? null
  : await readFile(path.join('dist', ...new URL(homeImage).pathname.split('/')));
for (const legacyPath of ['dist/social-card.png', 'dist/social-card-v2.png']) {
  try {
    const legacyCard = await readFile(legacyPath);
    if (homeCard === null || !legacyCard.equals(homeCard)) {
      errors.push(`${legacyPath}: legacy alias differs from the homepage social card`);
    }
  } catch {
    errors.push(`${legacyPath}: legacy social card alias does not exist`);
  }
}

if (errors.length > 0) {
  throw new Error(`Social card validation failed:
${errors.join('\n')}`);
}

console.log(`Validated ${linkedCards.size} page social cards and 2 legacy aliases.`);
