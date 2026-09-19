import { ScrollViewStyleReset } from 'expo-router/html';
import type { ReactNode } from 'react';

// Web-only root HTML for static rendering (Node.js — no browser APIs).
export default function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover, shrink-to-fit=no"
        />
        <meta name="theme-color" content="#FAF9F7" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="format-detection" content="telephone=no" />

        {/*
          Disable body scrolling so ScrollView behaves like native.
          Safe-area + 100dvh CSS below keep iPhone/Android browsers app-like.
        */}
        <ScrollViewStyleReset />

        <style dangerouslySetInnerHTML={{ __html: mobileWebShell }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const mobileWebShell = `
html {
  height: 100%;
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}
html, body {
  margin: 0;
  padding: 0;
  background-color: #FAF9F7;
  color: #2A2A2A;
}
body {
  /* svh = visible viewport with browser chrome; avoids clipping the tab bar labels */
  min-height: 100%;
  min-height: 100svh;
  height: 100%;
  height: 100svh;
  overflow: hidden;
  overscroll-behavior: none;
  -webkit-tap-highlight-color: transparent;
  -webkit-font-smoothing: antialiased;
}
#root, [data-reactroot] {
  height: 100%;
  min-height: 100%;
  min-height: 100svh;
}
`;
