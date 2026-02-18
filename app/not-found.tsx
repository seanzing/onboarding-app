'use client';

/**
 * Not Found Page (404)
 *
 * This is the App Router way to handle 404 errors.
 * Uses client-side rendering to avoid SSR context issues.
 */

import Link from 'next/link';

export default function NotFound() {
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
      }}
    >
      <div
        style={{
          maxWidth: '600px',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            fontSize: '6rem',
            fontWeight: 'bold',
            marginBottom: '0.5rem',
            color: '#3B82F6',
          }}
        >
          404
        </h1>
        <h2
          style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            marginBottom: '1rem',
            color: 'white',
          }}
        >
          Page Not Found
        </h2>
        <p
          style={{
            color: '#9CA3AF',
            marginBottom: '2rem',
          }}
        >
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          href="/"
          style={{
            display: 'inline-block',
            backgroundColor: '#3B82F6',
            color: 'white',
            padding: '0.75rem 1.5rem',
            borderRadius: '0.5rem',
            textDecoration: 'none',
            fontSize: '1rem',
            fontWeight: '500',
            transition: 'opacity 0.2s',
          }}
        >
          Go Back Home
        </Link>
      </div>
    </div>
  );
}
