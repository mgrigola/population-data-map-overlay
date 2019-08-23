# population-data-map-overlay
overlays some data on a map, plus some support functions to translate GIS/shapefile data to polygons/json so leaflet can interpret it
there's some additional public census data in /input_data


To Run:
see: /web/index.html

To use the map you'll need to provide your own <a href="https://www.mapbox.com/">mapbox</a> key in /web/config/keys.js (you can copy+edit web/config/keys.txt). It's free for limited non-commercial use.

I use <a href="https://www.npmjs.com/package/http-server">http-server</a> to run locally and access the local json files (start it in /web/). Otherwise you'll probably need to mess with your browser's security settings to read the data.

visit at: mgrigola.github.io
