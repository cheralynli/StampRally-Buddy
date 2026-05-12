# Harbour Album

Harbour Album is a lightweight browser app for tracking free stamps collected around Hong Kong.

## Features

- Add stamp stops with place, district, type, date, notes, and photo
- Pick the collection location on an interactive Hong Kong map
- See every collected stamp on a main map with clickable photo popups
- Filter the directory by district, stamp type, and text search
- Export and import your trail as JSON
- Save data locally in your browser with no backend required

## Run

From this folder:

```bash
python3 -m http.server 4173
```

Then open <http://localhost:4173>.

The map uses Leaflet with OpenStreetMap tiles, so the browser needs internet access for map tiles.
