		var map = L.map('map');
		var mapBoxKey = 'pk.eyJ1IjoibWdyaWdvbGEiLCJhIjoiY2lubWd0aXFjMHpmdHVrbHkwcTBqNGVnYiJ9.bDdNMfx32jV_AglS1z48Zg';

		var grayscale = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token='+mapBoxKey, {
			maxZoom: 13,
			attribution: '...',
			id: 'mapbox.light'
		}).addTo(map);
		
		
		L.control.scale().addTo(map);
		
		var info = L.control();
		var hasInfo = false;

		info.onAdd = function (map) {
			this._div = L.DomUtil.create('div', 'info');
			this.update();
			return this._div;
		};

		info.update = function (e) {
			var props = e ? e.target.feature.properties : false ;
			this._div.innerHTML = '<h4>ZIP Code</h4>' +  (props ? '<b>' + props.id + '</b>' : '');
		};


		function onLocationFound(e) {
			var radius = e.accuracy / 2;
			//L.marker(e.latlng).addTo(map).bindPopup("You are within " + radius + " meters from this point").openPopup();
			L.circle(e.latlng, radius).addTo(map);
		}

		function onLocationError(e) {
			//alert(e.message);
			map.setView([43.0, -89.6], 11);
		}

		map.on('locationfound', onLocationFound);
		map.on('locationerror', onLocationError);
		map.locate({setView: true, maxZoom: 13, maximumAge: 36000000});
		
		function clearInfo(e) {
			if (hasInfo) {
				info.remove(map);
				hasInfo = false;
			}
		}
		

		// get color depending on population density value
		function rgbColor(r,g,b) {
			return "rgb("+Math.floor(r)+","+Math.floor(g)+","+Math.floor(b)+")";
		}
		
		function heatColor(val,minVal,maxVal,minRGB,maxRGB) {
			var scale = (val - minVal)/(maxVal - minVal);
			scale = (scale<0) ? 0 : (scale>1) ? 1 : Math.pow(scale,0.25);
			return rgbColor((maxRGB[0]-minRGB[0])*scale+minRGB[0] , (maxRGB[1]-minRGB[1])*scale+minRGB[1] , (maxRGB[2]-minRGB[2])*scale+minRGB[2]);
		}

		function getColor(val) {
			return heatColor(val, 53500, 53950, [0,64,255], [255,128,0]);
		}
		
		function style(feature) {
			return {
				weight: 1,
				opacity: 0.7,
				color: 'white',
				dashArray: 5,
				fillOpacity: 0.7,
				fillColor: getColor(feature.properties.id)
			};
		}
		
		var popup = L.popup();
		var stateID;
		var stateElement;
		
		function highlightFeature(e) {
			var layer = e.target,
				props = layer.feature.properties;
			
			if (stateID != layer.feature.id) {
				stateID = layer.feature.id
				if (stateElement) geojson.resetStyle(stateElement.target);
				stateElement = e;
				popup
					.setLatLng(e.latlng)
					.setContent('<h4>'+props.name+'</h4>ID: '+layer.feature.id+'<br />ZIP Code: '+props.id)
					.openOn(map);
				
				layer.setStyle({
					weight: 9,
					color: '#693',
					dashArray: '',
					fillOpacity: 0.7
				});

				if (!L.Browser.ie && !L.Browser.opera) {
					layer.bringToFront();
				}
			}
		}

		var geojson;

	
		function zoomToFeature(e) {
			map.fitBounds(e.target.getBounds());
			if (!hasInfo) {
				info.addTo(map);
				hasInfo = true;
			}
			info.update(e);
			
			map.addOneTimeEventListener('movestart',clearInfo);
		}

		function onEachFeature(feature, layer) {
			layer.on({
				mouseover: highlightFeature,
				//mouseout: resetHighlight,
				click: zoomToFeature				
			});
			//layer.feature.properties.densityRank = statesData.count;
		}

		geojson = L.geoJson(daneCountyZips, {
			style: style,
			onEachFeature: onEachFeature
		}).addTo(map);
		
		//map.attributionControl.addAttribution('...');


		var legend = L.control({position: 'bottomright'});

		legend.onAdd = function (map) {

			var div = L.DomUtil.create('div', 'info legend'),
				grades = [53000, 53200, 53400, 53600, 53800, 54000],
				labels = [],
				from, to, val;

			for (var i = 0; i < grades.length; i++) {
				from = grades[i];
				to = grades[i + 1];
				val = (to ? to : grades[grades.length - 1]);

				labels.push('<i style="background:' + getColor(val) + '"></i> ' + from + (to ? '&ndash;' + to : '+') );
			}

			div.innerHTML = labels.join('<br>');
			return div;
		};

		legend.addTo(map);
		
		
		var baseLayers = {
			"Grayscale": grayscale,
		};

		var overlays = {
			"States": geojson
		};

		L.control.layers( baseLayers,  overlays).addTo(map);
		//var layerControl = L.control.layers()
		//layerControl.addOverlay(overlays)
