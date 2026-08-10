/* Both maps on the venue page, rendered from data/restaurants.json.
   The basemap and the venue marker are defined once here so the two maps
   stay visually identical. */

(function () {
  const venueEl = document.getElementById('venue-map');
  const listEl  = document.getElementById('restaurant-list');
  const diningEl = document.getElementById('dining-map');
  if (!venueEl && !listEl) return;

  const esc = (s) => String(s).replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const pin = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"'
    + ' fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"'
    + ' stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>'
    + '<circle cx="12" cy="10" r="3"/></svg>';

  // ── Shared map styling ──────────────────────────────────────────────
  // CARTO Positron: a muted greyscale basemap rendered from OpenStreetMap
  // data, so the brand-coloured markers carry all the visual weight.
  const TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
  const TILE_OPTS = {
    subdomains: 'abcd',
    maxZoom: 20,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> '
               + 'contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
  };

  const dot = (colour, radius) => ({
    radius: radius, color: '#fff', weight: 2, fillColor: colour, fillOpacity: 1
  });
  const VENUE_DOT      = () => dot('#D82418', 10);   // red, both maps
  const RESTAURANT_DOT = () => dot('#240C6C', 7);    // navy

  function createMap(el) {
    const map = L.map(el, { scrollWheelZoom: false });
    L.tileLayer(TILE_URL, TILE_OPTS).addTo(map);
    map.on('click', () => map.scrollWheelZoom.enable());
    return map;
  }

  const venueMarker = (map, venue) =>
    L.circleMarker([venue.lat, venue.lon], VENUE_DOT()).addTo(map)
      .bindPopup(`<strong>${esc(venue.name)}</strong><br>${esc(venue.address)}`
               + `<br><em>Conference venue</em>`);

  // ── Render ──────────────────────────────────────────────────────────
  fetch('data/restaurants.json')
    .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(data => {
      const venue = data.venue, list = data.restaurants;

      // Venue map: the conference location on its own.
      if (venueEl) {
        const map = createMap(venueEl);
        venueMarker(map, venue);
        // Set the view before anything else — Leaflet renders nothing without one.
        const place = () => { map.invalidateSize(); map.setView([venue.lat, venue.lon], 16); };
        place();
        requestAnimationFrame(place);
      }

      if (!listEl) return;

      // Restaurant cards.
      listEl.innerHTML = list.map(r => `
        <div class="card">
          <div class="restaurant-type">${esc(r.type)}</div>
          <h3 class="restaurant-name">${esc(r.name)}</h3>
          <p class="restaurant-desc">${esc(r.description)}</p>
          <div class="restaurant-addr">${pin}${esc(r.address)}</div>
          <div class="restaurant-walk">${r.walkMinutes} min walk from the venue</div>
        </div>`).join('');

      // Dining map: the venue plus every restaurant.
      if (!diningEl) return;
      const map = createMap(diningEl);
      const marks = [venueMarker(map, venue)];

      list.forEach(r => {
        marks.push(
          L.circleMarker([r.lat, r.lon], RESTAURANT_DOT()).addTo(map)
            .bindPopup(`<strong>${esc(r.name)}</strong><br>${esc(r.type)}<br>`
                     + `${esc(r.address)}<br><em>${r.walkMinutes} min walk</em>`)
        );
      });

      // Fit once the container has its final size, otherwise Leaflet computes
      // the zoom against a stale height and lands on the wrong area.
      const bounds = L.featureGroup(marks).getBounds();
      const fit = () => { map.invalidateSize(); map.fitBounds(bounds, { padding: [30, 30] }); };
      fit();
      requestAnimationFrame(fit);
      window.addEventListener('resize', () => map.invalidateSize());
    })
    .catch(err => {
      if (listEl) {
        listEl.innerHTML = '<p class="prose">The restaurant list could not be loaded. '
          + 'It is available in <a href="data/restaurants.json">data/restaurants.json</a>.</p>';
      }
      document.querySelectorAll('.map-wrap').forEach(el => { el.style.display = 'none'; });
      console.error('restaurants.json:', err);
    });
})();
