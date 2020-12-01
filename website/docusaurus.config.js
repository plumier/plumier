module.exports = {
  title: 'Plumier',
  tagline: 'A TypeScript backend framework focuses on development productivity, uses dedicated reflection library to help you create a robust, secure and fast API delightfully.',
  url: 'https://plumierjs.com',
  baseUrl: '/',
  favicon: 'img/plumier.png',
  organizationName: 'plumier', // Usually your GitHub org/user name.
  projectName: 'plumier.github.io', // Usually your repo name.
  themeConfig: {
    navbar: {
      title: 'Plumier',
      logo: {
        alt: 'Plumier logo',
        src: 'img/plumier.png',
      },
      items: [
        // {
        //   to: 'refs/entry-point',
        //   activeBasePath: 'refs',
        //   label: 'Reference',
        //   position: 'left',
        // },
        // {to: 'blog', label: 'Blog', position: 'left'},
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
              label: 'Plumier In Five Minutes',
              to: 'overview',
            },
            {
              label: 'Fundamentals',
              to: 'fundamentals',
            },
            {
              label: 'Extending Plumier',
              to: 'extends',
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
          editUrl: 'https://github.com/plumier/plumier/edit/master/website/',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],
};
