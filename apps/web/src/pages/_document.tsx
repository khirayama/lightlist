import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="ja" dir="ltr">
      <Head>
        <link rel="preconnect" href="https://identitytoolkit.googleapis.com" />
        <link rel="preconnect" href="https://firestore.googleapis.com" />
        <link rel="preconnect" href="https://apis.google.com" />
      </Head>
      <body className="font-sans antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
