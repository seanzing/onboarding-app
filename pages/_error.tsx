/**
 * Pages Router Error Page
 *
 * This file exists for backwards compatibility with Next.js Pages Router.
 * The main error handling is done via App Router's global-error.tsx.
 *
 * This minimal implementation prevents build errors when Next.js falls back
 * to Pages Router for static error page generation.
 */

import { NextPageContext } from 'next';

interface ErrorProps {
  statusCode: number;
}

function Error({ statusCode }: ErrorProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '1rem',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        backgroundColor: '#0a0e27',
        color: 'white',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '4rem', fontWeight: 'bold', color: '#3B82F6' }}>
          {statusCode}
        </h1>
        <p style={{ fontSize: '1.25rem', color: '#9CA3AF' }}>
          {statusCode === 404
            ? 'Page not found'
            : 'An error occurred'}
        </p>
        <a
          href="/"
          style={{
            display: 'inline-block',
            marginTop: '1.5rem',
            backgroundColor: '#3B82F6',
            color: 'white',
            padding: '0.75rem 1.5rem',
            borderRadius: '0.5rem',
            textDecoration: 'none',
          }}
        >
          Go Home
        </a>
      </div>
    </div>
  );
}

Error.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
