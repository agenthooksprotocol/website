import type { APIRoute, GetStaticPaths } from 'astro';
import { protocolMetadata } from '../../generated/protocol-docs';
import {
  homeSocialCard,
  renderSocialCard,
  socialCardHash,
  type SocialCardInput,
} from '../../lib/social-card';

interface MarkdownModule {
  frontmatter: {
    title: string;
    description?: string;
  };
}

const docs = import.meta.glob<MarkdownModule>('../docs/**/*.md', { eager: true });

function pathnameForModule(modulePath: string) {
  const relativePath = modulePath.slice('../docs/'.length).replace(/(?:^|\/)index\.md$/, '');
  return relativePath === '' ? '/docs/' : `/docs/${relativePath}/`;
}

const cards: SocialCardInput[] = [
  homeSocialCard,
  ...Object.entries(docs).map(([modulePath, page]) => ({
    title: page.frontmatter.title,
    description: page.frontmatter.description ?? protocolMetadata.projectDescription,
    pathname: pathnameForModule(modulePath),
  })),
];

export const prerender = true;

export const getStaticPaths = (async () =>
  Promise.all(cards.map(async (card) => ({
    params: { hash: await socialCardHash(card) },
    props: { card },
  })))) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const card = (props as { card: SocialCardInput }).card;
  return new Response(await renderSocialCard(card), {
    headers: { 'Content-Type': 'image/png' },
  });
};
