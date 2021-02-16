import React from 'react';
import clsx from 'clsx';
import Layout from '@theme/Layout';
import CodeBlock from '@theme/CodeBlock';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import useThemeContext from '@theme/hooks/useThemeContext';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './styles.module.css';
import features from "./features"


function Features() {
  const { isDarkTheme } = useThemeContext();
  return (
    <section className={clsx(styles.features, isDarkTheme ? styles.featuresDark : styles.featuresLight)}>
      <div className="container">
        <div className="row">
          {features.map((props, idx) => (
            <Feature key={idx} index={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}

function Feature({ description, title, code, link, index, image }) {
  return (
    <div className={clsx('col col--12', styles.feature)}>
      <div className={clsx('row', styles.featureContainer, index % 2 === 0 ? styles.featureContainerOdd : styles.featureContainerEven)}>
        <div className={clsx('col col--5', styles.codeFont)}>
          {
            !!code ? <CodeSnippet code={code} /> : <img className={styles.featureImage} src={image} />
          }
        </div>
        <div className="col col--7">
          <h1>{title}</h1>
          <div>{description}</div>
          <Link to={link.url} className={clsx('button button--primary button--lg', styles.featureButton)}>Learn more about this feature</Link>
        </div>
      </div>
    </div>
  );
}

function CodeSnippet({ code }) {
  return (
    <div className={clsx(styles.codeBorder)}>
      <div className={clsx(styles.codeTitleBox)}>
        <div className={clsx(styles.codeRgb, styles.rgbRed)}></div>
        <div className={clsx(styles.codeRgb, styles.rgbGreen)}></div>
        <div className={clsx(styles.codeRgb, styles.rgbBlue)}></div>
      </div>
      <CodeBlock metastring="typescript" className="typescript">{code}</CodeBlock>
    </div>
  );
}

function Home() {
  const context = useDocusaurusContext();
  const { siteConfig = {} } = context;
  return (
    <Layout
      title={`Hello from ${siteConfig.title}`}
      description="Description will go into a meta tag in <head />">
      <header className={clsx('hero ', styles.heroBanner)}>
        <div className={clsx('container', styles.heroContainer)}>
          <h2 className="hero__subtitle">{siteConfig.title}</h2>
          <h1 className="hero__title">{siteConfig.tagline}</h1>
          <p>A TypeScript backend framework focuses on development productivity, uses dedicated reflection library to help you create a robust, secure and fast API delightfully.</p>
          <div className={styles.buttons}>
            <Link
              className={clsx(
                'button button--primary button--lg',
              )}
              to={useBaseUrl('docs/')}>
              Quick Start
            </Link>
            <Link
              className={clsx(
                'button button--secondary button--lg',
              )}
              to={useBaseUrl('docs/')}>
              Plumier in Five Minutes
            </Link>
          </div>
        </div>
      </header>
      <main>
        <Features />
      </main>
    </Layout>
  );
}

export default Home;
