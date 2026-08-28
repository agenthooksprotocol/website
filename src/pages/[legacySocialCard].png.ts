import type { APIRoute, GetStaticPaths } from 'astro';
import { homeSocialCard, renderSocialCard } from '../lib/social-card';

const legacyNames = ['social-card', 'social-card-v2'];

export const prerender = true;

export const getStaticPaths = (() =>
  legacyNames.map((legacySocialCard) => ({
    params: { legacySocialCard },
  }))) satisfies GetStaticPaths;

export const GET: APIRoute = async () =>
  new Response(await renderSocialCard(homeSocialCard), {
    headers: { 'Content-Type': 'image/png' },
  });
