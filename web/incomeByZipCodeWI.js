		var map = L.map('map');
		var mapBoxKey = 'pk.eyJ1IjoibWdyaWdvbGEiLCJhIjoiY2lubWd0aXFjMHpmdHVrbHkwcTBqNGVnYiJ9.bDdNMfx32jV_AglS1z48Zg';

		var grayscale = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token='+mapBoxKey, {
			maxZoom: 13,
			minZoom: 9,
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
			if (e) {
				var props = e.target.feature.properties;
				var zipID = props.id.toString();
				var inc0k = zipIncomeVals[zipID]['Households - Estimate - Less than $10,000']
				var inc10k = zipIncomeVals[zipID]['Households - Estimate - $10,000 to $14,999']
				var inc15k = zipIncomeVals[zipID]['Households - Estimate - $15,000 to $24,999']
				var inc25k = zipIncomeVals[zipID]['Households - Estimate - $25,000 to $34,999']
				var inc35k = zipIncomeVals[zipID]['Households - Estimate - $35,000 to $49,999']
				var inc50k = zipIncomeVals[zipID]['Households - Estimate - $50,000 to $74,9999']
				var inc75k = zipIncomeVals[zipID]['Households - Estimate - $75,000 to $99,999']
				var inc100k = zipIncomeVals[zipID]['Households - Estimate - $100,000 to $149,999']
				var inc150k = zipIncomeVals[zipID]['Households - Estimate - $150,000 to $199,999']
				var inc200k = zipIncomeVals[zipID]['Households - Estimate - $200,000 or more']
				this._div.innerHTML = '<h4>ZIP: '+ props.zip +'</h4> <br /> Less than 10k: '+ inc0k + ' <br /> 10k - 15k: '+ inc10k + ' <br /> 15k - 25k: '+ inc15k );
			}
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
				info.removeFrom(map);
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
			return heatColor(val, 0, 50, [0,64,255], [255,128,0]);
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
		var elemID;
		var gjElem;
		
		function highlightFeature(e) {
			var layer = e.target,
				props = layer.feature.properties;
			
			if (elemID != layer.feature.id) {
				elemID = layer.feature.id
				if (gjElem) geojson.resetStyle(gjElem.target);
				gjElem = e;
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

		geojson = L.geoJson(zipsWiDaneCounty, {
			style: style,
			onEachFeature: onEachFeature
		}).addTo(map);
		
		//map.attributionControl.addAttribution('...');


		var legend = L.control({position: 'bottomright'});

		legend.onAdd = function (map) {

			var div = L.DomUtil.create('div', 'info legend'),
				grades = [0, 10, 20, 30, 40, 50],
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
