# population-data-map-overlay
overlays some data on a map, plus some support functions to translate GIS/shapefile data to polygons/json so leaflet can interpret it
there's some additional public census data in /data

see /web/main.html for the result


NOTE:
To use the map in main you'll need to provide your own mapbox key in /web/config/keys.js (copy+rename+edit web/config/keys.txt)

to use the python random address util you'll need need to provide a googlemaps geocoding api key in /python/geocoding/googleGeocodeKey.py (copy+rename+edit /python/geocoding/googleGeocodeKey.txt)
