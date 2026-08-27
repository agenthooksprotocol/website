import { generatedDocsNav, protocolMetadata, protocolRoutes } from '../generated/protocol-docs';

export interface NavItem {
  title: string;
  href: string;
}

export interface NavSection {
  title: string;
  items: readonly NavItem[];
}

export const GITHUB_ORG = 'https://github.com/agenthooksprotocol';
export const SPEC_REPO = 'https://github.com/agenthooksprotocol/agent-hooks-protocol';
export const SPEC_URL = protocolRoutes.specification;
export { protocolMetadata, protocolRoutes };

export const docsNav: readonly NavSection[] = generatedDocsNav;
export const flatDocsNav: NavItem[] = docsNav.flatMap((section) => [...section.items]);
