/* Renders the Recommended Restaurants list and map from data/restaurants.json. */

(function () {
  const listEl = document.getElementById('restaurant-list');
  const mapEl  = document.getElementById('dining-map');
  if (!listEl || !mapEl) return;

  const esc = (s) => String(s).replace(/[&<>"]/g, c =>
    ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));

  const pin = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"'
    + ' fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"'
    + ' stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>'
    + '<circle cx="12" cy="10" r="3"/></svg>';

  fetch('data/restaurants.json')
    .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(data => {
      const venue = data.venue, list = data.restaurants;

      // ── Cards ──
      listEl.innerHTML = list.map(r => `
        <div class="card">
          <div class="restaurant-type">${esc(r.type)}</div>
          <h3 class="restaurant-name">${esc(r.name)}</h3>
          <p class="restaurant-desc">${esc(r.description)}</p>
          <div class="restaurant-addr">${pin}${esc(r.address)}</div>
          <div class="restaurant-walk">${r.walkMinutes} min walk from the venue</div>
        </div>`).join('');

      // ── Map ──
      const map = L.map(mapEl, { scrollWheelZoom: false });
      // CARTO Positron: a muted greyscale basemap rendered from OpenStreetMap
      // data, so the brand-coloured markers carry all the visual weight.
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxZoom: 20,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> '
                   + 'contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      }).addTo(map);
      map.on('click', () => map.scrollWheelZoom.enable());

      const dot = (colour, radius) => ({
        radius: radius, color: '#fff', weight: 2,
        fillColor: colour, fillOpacity: 1
      });

      const marks = [];
      const vm = L.circleMarker([venue.lat, venue.lon], dot('#D82418', 10)).addTo(map)
        .bindPopup(`<strong>${esc(venue.name)}</strong><br>${esc(venue.address)}<br>
                    <em>Conference venue</em>`);
      marks.push(vm);

      list.forEach(r => {
        marks.push(
          L.circleMarker([r.lat, r.lon], dot('#240C6C', 7)).addTo(map)
            .bindPopup(`<strong>${esc(r.name)}</strong><br>${esc(r.type)}<br>
                        ${esc(r.address)}<br><em>${r.walkMinutes} min walk</em>`)
        );
      });

      // Set the view straight away — Leaflet renders nothing until it has one.
      // Then re-fit on the next frame, once the container has its final size,
      // otherwise the zoom is computed against a stale height.
      const bounds = L.featureGroup(marks).getBounds();
      const fit = () => { map.invalidateSize(); map.fitBounds(bounds, { padding: [30, 30] }); };
      fit();
      requestAnimationFrame(fit);
      window.addEventListener('resize', () => map.invalidateSize());
    })
    .catch(err => {
      listEl.innerHTML = '<p class="prose">The restaurant list could not be loaded. '
        + 'It is available in <a href="data/restaurants.json">data/restaurants.json</a>.</p>';
      mapEl.style.display = 'none';
      console.error('restaurants.json:', err);
    });
})();
