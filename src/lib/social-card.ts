import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { SITE_ORIGIN } from '../config/site';
import { protocolMetadata } from '../generated/protocol-docs';

const CARD_WIDTH = 1200;
const CARD_HEIGHT = 630;

export interface SocialCardInput {
  title: string;
  description: string;
  pathname: string;
}

export const homeSocialCard: SocialCardInput = {
  title: protocolMetadata.projectName,
  description: protocolMetadata.projectDescription,
  pathname: '/',
};

function renderedInputs(input: SocialCardInput) {
  return {
    title: input.title,
    description: input.description,
    pathname: input.pathname,
    projectName: protocolMetadata.projectName,
    protocolVersion: protocolMetadata.protocolVersion,
    status: protocolMetadata.status,
    siteOrigin: SITE_ORIGIN,
  };
}

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('\"', '&quot;')
    .replaceAll("'", '&apos;');
}

function wrapText(value: string, maxLength: number, maxLines: number) {
  const lines = value.trim().split(/\s+/).reduce<string[]>((result, word) => {
    const current = result.at(-1);
    if (current === undefined || `${current} ${word}`.length > maxLength) result.push(word);
    else result[result.length - 1] = `${current} ${word}`;
    return result;
  }, []);

  if (lines.length <= maxLines) return lines;
  const visible = lines.slice(0, maxLines);
  visible[maxLines - 1] = `${visible[maxLines - 1].replace(/[.,;:!?]?$/, '')}…`;
  return visible;
}

function textLines(lines: string[], x: number, y: number, lineHeight: number, attributes: string) {
  return lines
    .map((line, index) =>
      `<text x="${x}" y="${y + index * lineHeight}" ${attributes}>${escapeXml(line)}</text>`,
    )
    .join('\n  ');
}

function renderSocialCardSvg(input: SocialCardInput) {
  const rendered = renderedInputs(input);
  const title = textLines(
    wrapText(rendered.title, 34, 2),
    104,
    260,
    68,
    'fill="#1f2328" font-family="Arial, sans-serif" font-size="58" font-weight="700" letter-spacing="-1.5"',
  );
  const firstSentence = rendered.description.match(/^.*?[.!?](?:\s|$)/)?.[0].trim()
    ?? rendered.description;
  const description = textLines(
    wrapText(firstSentence, 72, 2),
    104,
    408,
    38,
    'fill="#59645f" font-family="Arial, sans-serif" font-size="27"',
  );
  const badge = `${rendered.protocolVersion} · ${rendered.status}`;
  const pageUrl = `${new URL(rendered.siteOrigin).hostname}${rendered.pathname}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}">
  <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="#ffffff"/>
  <path d="M0 1h${CARD_WIDTH}M0 ${CARD_HEIGHT - 1}h${CARD_WIDTH}" stroke="#d8dedb"/>
  <g transform="translate(104 104) scale(1.45)" fill="none" stroke="#1f2328" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M0 -6.5L0 -19.5A6 6 0 0 1 12 -19.5L12 -13"/>
    <path d="M0 -6.5L0 -19.5A6 6 0 0 1 12 -19.5L12 -13" transform="rotate(120)"/>
    <path d="M0 -6.5L0 -19.5A6 6 0 0 1 12 -19.5L12 -13" transform="rotate(240)"/>
  </g>
  <text x="168" y="115" fill="#1f2328" font-family="Arial, sans-serif" font-size="29" font-weight="700">${escapeXml(rendered.projectName)}</text>
  <rect x="826" y="76" width="270" height="48" rx="24" fill="#f2f5f3" stroke="#d8dedb"/>
  <text x="961" y="106" fill="#48534e" font-family="Arial, sans-serif" font-size="16" font-weight="700" text-anchor="middle">${escapeXml(badge)}</text>
  ${title}
  ${description}
  <line x1="104" y1="492" x2="1096" y2="492" stroke="#d8dedb"/>
  <text x="104" y="552" fill="#59645f" font-family="monospace" font-size="21">${escapeXml(pageUrl)}</text>
</svg>
`;

  return svg;
}

export function renderSocialCard(input: SocialCardInput) {
  return sharp(Buffer.from(renderSocialCardSvg(input))).png().toBuffer();
}

export async function socialCardHash(input: SocialCardInput) {
  return createHash('sha256')
    .update(await renderSocialCard(input))
    .digest('hex')
    .slice(0, 20);
}

export async function socialCardPath(input: SocialCardInput) {
  return `/social-cards/${await socialCardHash(input)}.png`;
}
