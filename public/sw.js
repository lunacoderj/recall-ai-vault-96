self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // If this is the share-receiver route, we allow it to pass through to our React app.
  // We MUST ensure the query parameters (title, text, url) are preserved.
  if (url.pathname === '/share-receiver') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/index.html');
      })
    );
    return;
  }
});
