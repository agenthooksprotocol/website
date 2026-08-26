export interface NavItem {
  title: string;
  href: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const GITHUB_ORG = 'https://github.com/agenthooksprotocol';
export const SPEC_REPO = 'https://github.com/agenthooksprotocol/agent-hooks-protocol';
export const SPEC_URL = `${SPEC_REPO}/blob/main/spec/working-draft.md`;

export const docsNav: NavSection[] = [
  {
    title: 'Getting started',
    items: [
      { title: 'Overview', href: '/docs/' },
      { title: 'Architecture', href: '/docs/architecture/' },
    ],
  },
  {
    title: 'Protocol',
    items: [
      { title: 'Events', href: '/docs/events/' },
      { title: 'Capabilities and effects', href: '/docs/effects/' },
      { title: 'Composition and failure', href: '/docs/composition/' },
      { title: 'Transports', href: '/docs/transports/' },
      { title: 'Registration', href: '/docs/registration/' },
    ],
  },
  {
    title: 'Reference',
    items: [
      { title: 'Conformance', href: '/docs/conformance/' },
      { title: 'Specification', href: '/docs/specification/' },
    ],
  },
];

export const flatDocsNav: NavItem[] = docsNav.flatMap((section) => section.items);
