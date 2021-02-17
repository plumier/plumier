module.exports = {
  title: 'Plumier',
  tagline: 'Delightful TypeScript Backend Framework',
  url: 'https://plumierjs.com',
  baseUrl: '/',
  favicon: 'img/plumier.png',
  organizationName: 'plumier', // Usually your GitHub org/user name.
  projectName: 'plumier.github.io', // Usually your repo name.
  themeConfig: {
    algolia: {
      apiKey: 'cc5032f20c325b27c07de03fe7078651',
      indexName: 'plumierjs',
      contextualSearch: true,
      searchParameters: {},
    },
    navbar: {
      hideOnScroll: true,
      title: 'Plumier',
      logo: {
        alt: 'Plumier logo',
        src: 'img/plumier.png',
      },
      items: [
        {
          to: 'quick-start',
          activeBasePath: 'quick-start',
          label: 'Quick Start',
          position: 'left',
        },
        {
          to: 'plumier-in-five-minutes',
          activeBasePath: 'plumier-in-five-minutes',
          label: 'Plumier in Five Minutes',
          position: 'left',
        },
        {
          href: 'https://github.com/plumier/plumier',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Fundamentals',
              to: 'plumier-in-five-minutes',
            },
            {
              label: 'Plumier in Five Minutes',
              to: 'quick-start',
            },
            {
              label: 'Extending Plumier',
              to: 'extend',
            }
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'Stack Overflow',
              href: 'https://stackoverflow.com/questions/tagged/plumier',
            }
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/plumier/plumier',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Plumier.`,
    },
    colorMode: {
      defaultMode: 'light',
    }
  },
  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          // It is recommended to set document id as docs home page (`docs/` path).
          routeBasePath: '/',
          sidebarPath: require.resolve('./sidebars.js'),
          // Please change this to your repo.
          editUrl: 'https://github.com/plumier/plumier/edit/master/docs/docusaurus/',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],
};
