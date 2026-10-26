import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const REPO_URL = 'https://github.com/ivbeg/data-inventory';
// Год текущей редакции книги: в строке © подвала, не год сборки.
const EDITION_YEAR = 2026;
// PDF-версия книги: npm run pdf кладёт файл в корень сайта.
const PDF = 'pathname:///data-inventory-book.pdf';

const config: Config = {
  title: 'Инвентаризация данных',
  tagline: 'Как выяснить, какие данные у вас есть, и найти те, которых не хватает',
  favicon: 'img/favicon.svg',

  future: {
    v4: true,
  },

  // Сайт книги живёт на поддомене личного сайта автора: static/CNAME, DNS — CNAME на ivbeg.github.io.
  url: 'https://datainventory.begtin.tech',
  baseUrl: '/',
  organizationName: 'ivbeg',
  projectName: 'data-inventory',
  trailingSlash: true,

  onBrokenLinks: 'throw',
  onBrokenAnchors: 'throw',

  i18n: {
    defaultLocale: 'ru',
    locales: ['ru'],
  },

  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'throw',
    },
  },
  themes: ['@docusaurus/theme-mermaid'],
  clientModules: ['./src/clientModules/mermaid-scroll.js'],

  // Перенаправления со старых путей: путь не меняют без перенаправления (stable-paths.md).
  plugins: [
    [
      '@docusaurus/plugin-client-redirects',
      {
        redirects: [
          {
            from: ['/practices/good-practices/', '/practices/anti-patterns/'],
            to: '/practices/practices-and-anti-patterns/',
          },
        ],
      },
    ],
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
          showLastUpdateTime: false,
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/home/data-inventory-hero.webp',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    docs: {
      sidebar: {
        hideable: true,
      },
    },
    navbar: {
      title: 'Инвентаризация данных',
      logo: {
        alt: 'Инвентаризация данных',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'bookSidebar',
          position: 'left',
          label: 'Книга',
        },
        {
          to: '/#с-чего-начать',
          label: 'С чего начать',
          position: 'left',
          // Ссылка на раздел главной: без этого Docusaurus считает её активной на любой странице.
          activeBaseRegex: '^$',
        },
        {
          to: '/process/steps/',
          label: 'Семь шагов',
          position: 'left',
          className: 'navbar-item--wide-only',
        },
        {
          to: '/appendices/checklists/',
          label: 'Чек-листы',
          position: 'left',
          className: 'navbar-item--wide-only',
        },
        {
          to: '/appendices/glossary/',
          label: 'Глоссарий',
          position: 'left',
          className: 'navbar-item--wide-only',
        },
        {
          href: 'https://datacatalogs.begtin.tech/',
          label: 'Каталоги данных',
          title: 'Соседняя книга автора о каталогах данных',
          position: 'right',
        },
        {
          href: REPO_URL,
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Книга',
          items: [
            {label: 'О книге', to: '/'},
            {label: 'Два подхода', to: '/approaches/two-approaches/'},
            {label: 'Семь шагов', to: '/process/steps/'},
            {label: 'Где искать данные', to: '/sources/three-layers/'},
            {label: 'Об авторе', to: '/about-the-author/'},
            {label: 'Скачать PDF', to: PDF},
          ],
        },
        {
          title: 'Справочник',
          items: [
            {label: 'Реестр данных: 14 атрибутов', to: '/process/registry/'},
            {label: 'Стандарты описания', to: '/frameworks/metadata-standards/'},
            {label: 'Шаблоны', to: '/appendices/templates/'},
            {label: 'Чек-листы', to: '/appendices/checklists/'},
            {label: 'Глоссарий', to: '/appendices/glossary/'},
            {label: 'Нормативная база', to: '/appendices/legal-framework/'},
          ],
        },
        {
          title: 'Автор',
          items: [
            {label: 'Книга «Каталоги данных»', href: 'https://datacatalogs.begtin.tech/'},
            {label: 'Сайт автора', href: 'https://begtin.tech/ru/'},
            {label: 'Поиск данных Dateno', href: 'https://dateno.io/'},
            {label: 'Репозиторий на GitHub', href: REPO_URL},
          ],
        },
      ],
      copyright: `© ${EDITION_YEAR} Иван Бегтин, «Инвентаризация данных», черновик октября ${EDITION_YEAR} года. Текст доступен по лицензии <a href="https://creativecommons.org/licenses/by/4.0/deed.ru">CC BY 4.0</a>.`,
    },
    mermaid: {
      theme: {light: 'neutral', dark: 'dark'},
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'yaml', 'json'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
