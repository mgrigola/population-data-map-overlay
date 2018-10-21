		var mapBoxKey = configKeys.mapBoxApiKey; // place your mapbox key here or create config/config.js and set var configInfo.mapBoxApiKey = 'your_key'


		// color stuff. feels like it could be like a separate colormap thing
		var colormapMinVal = 999999, colormapMaxVal = 0;  //should be config or calculated or something
		var keyToDisplay = 'HC01_EST_VC15';
		var keyToDisplayDescription = 'Mean Household Income ($)'
		for (zipId in zipIncomeVals) {
            var val = parseInt(zipIncomeVals[zipId][keyToDisplay]);
            if (val < colormapMinVal)  colormapMinVal = val;
            if (val > colormapMaxVal)  colormapMaxVal = val;
		}
		var legendGradeScale = 1000;
		colormapMinVal = Math.ceil(colormapMinVal/legendGradeScale)*legendGradeScale;
		colormapMaxVal = Math.floor(colormapMaxVal/legendGradeScale)*legendGradeScale;

//      //***I've got income for all the zips in wisconsin, but I've filtered the shape data to a subset of zips
//      //  so scale is 'off' because max income is in like Milwaukee but that zip isn't displayed
//		for (zipId in zipIncomeVals) {
//            var val = parseInt(zipIncomeVals[zipId][keyToDisplay]);
//            if (val < colormapMinVal)  colormapMinVal = val;
//            if (val > colormapMaxVal)  colormapMaxVal = val;
//		}

		function rgbColor(r,g,b) {
			return 'rgb('+Math.floor(r)+','+Math.floor(g)+','+Math.floor(b)+')';
		}

		function heatColor(val,minVal,maxVal,minRGB,maxRGB) {
			var scale = (val - minVal)/(maxVal - minVal);
			scale = (scale<0) ? 0 : (scale>1) ? 1 : Math.pow(scale,0.5);
			return rgbColor((maxRGB[0]-minRGB[0])*scale+minRGB[0] , (maxRGB[1]-minRGB[1])*scale+minRGB[1] , (maxRGB[2]-minRGB[2])*scale+minRGB[2]);
		}

		function getMappedColor(val) {
			return heatColor(val, colormapMinVal, colormapMaxVal, [0,64,255], [255,128,0]);
		}



        //load the map and support components (layers/legend/scale, etc)
		var map = L.map('map');  // big L is leaflet

        //the options for map styles
		var layerLight = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token='+mapBoxKey, {
			maxZoom: 13,
			minZoom: 9,
			attribution: 'mapbox.com',
			id: 'mapbox.light'
		}).addTo(map);

		var layerDark = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token='+mapBoxKey, {
			maxZoom: 13,
			minZoom: 9,
			attribution: 'mapbox.com',
			id: 'mapbox.dark'
		}).addTo(map);

//      //this guy takes a little longer to load maybe
//		var layerSat = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token='+mapBoxKey, {
//			maxZoom: 13,
//			minZoom: 9,
//			attribution: 'mapbox.com',
//			id: 'mapbox.satellite'
//		}).addTo(map);

		var baseLayers = {
			"light": layerLight,
			"dark": layerDark
			//,"sat": layerSat
		};

		L.control.layers(baseLayers).addTo(map);

		var legend = L.control({position: 'bottomright'});
		legend.onAdd = function (map) {

			var div = L.DomUtil.create('div', 'info legend');
            var legendText = ['<div class="leaflet-container">'+keyToDisplayDescription+'</div>'];
            var gradeCount = 5;
			var gradeVal, colorVal;

            //generate color gradations for the legend here
			legendText.push('<i style="background:' + getMappedColor(colormapMinVal) + '"></i> ' + '<' + colormapMinVal.toLocaleString());
            for (var gradeNo = 1; gradeNo < gradeCount-1; gradeNo++) {
                gradeVal = Math.floor( gradeNo*(colormapMaxVal - colormapMinVal)/gradeCount + colormapMinVal );
                legendText.push('<i style="background:' + getMappedColor(gradeVal) + '"></i> &nbsp;&nbsp;' + gradeVal.toLocaleString());
            }
			legendText.push('<i style="background:' + getMappedColor(colormapMaxVal) + '"></i> ' + '>' + colormapMaxVal.toLocaleString());

			div.innerHTML = legendText.join('<br>');
			return div;
		};

		legend.addTo(map);

        L.control.scale().addTo(map);

        //zoom to current location
		function on_location_found(e) {
			var uncertaintyRadius = e.accuracy / 2;
			e.latlng = [43.0, -89.6];
			L.marker(e.latlng).addTo(map).bindPopup('location uncertainty = ' + uncertaintyRadius + 'm?').openPopup();
			L.circle(e.latlng, uncertaintyRadius).addTo(map);
			map.setView(e.latlng, 9);
		}

        // can't or refused to get location -> go to madison
		function on_location_error(e) {
			map.setView([43.0, -89.6], 11);
		}

		map.on('locationfound', on_location_found);
		map.on('locationerror', on_location_error);
		map.locate({setView: true, maxZoom: 13, maximumAge: 36000000});




		var controlInfo = L.control();
		var needsShowInfo = false;

        //adds this little info popup thing on the upper right of the map with some contextual detail
		controlInfo.onAdd = function (map) {
			this._div = L.DomUtil.create('div', 'info');
			this.update();
			return this._div;
		};

		controlInfo.update = function (e) {
		    if  (e) {
			var props = e.target.feature.properties;
			var regionIncome = zipIncomeVals[props.id.toString()];
			var detailStr = '<h3>Blibbity bloop</h3><h4>Some more detailed info about this region</h4>'+
			    '<b>' + 'zip: ' + props.id + '</b>'+
			    '<br>income: ' + regionIncome['HC01_EST_VC15'];
			this._div.innerHTML = detailStr;
	        }
		};
		
		function clear_info(e) {
			if (needsShowInfo) {
				controlInfo.remove(map);
				needsShowInfo = false;
			}
		}


		var popup = L.popup();
		var regionId, regionElement;  //keeps tract of the currently active/selected region so we know when that changes
		var geojsonZipData;  //the zip code boundary coordinates stored in (geo)JSON format

		function highlight_feature(e) {
			var myLayer = e.target;
			var gjsnFeature = e.target.feature;  //the geoJson feature (a region)
			var regionProps = gjsnFeature.properties;  //properties for the region (like id, whatever else is in the json file)

            //see if element under mouse has changed nd update highlighting accordingly
			if (regionId != regionProps.id) {
				regionId = regionProps.id;

				//if we had an existing region highlighted, remove that highlighting?  can just do in mouseout
				//if (regionElement)
                //    geojsonZipData.resetStyle(regionElement.target);  // this will call style_region() for region


				var regionIncome = zipIncomeVals[regionProps.id.toString()];
				var contentStr = '<h4>blah blah blah</h4>ID: '+myLayer._leaflet_id+
			        '<br>ZIP Code: '+regionProps.id+
			        '<br>Households: '+regionIncome.HC01_EST_VC01+
			        '<br>Median Income: $'+regionIncome.HC01_EST_VC13+
			        '<br>Mean Income: $'+regionIncome.HC01_EST_VC15;

				popup.setLatLng(e.latlng)  //where the mouse is?
			    popup.setContent(contentStr);
				popup.openOn(map);

				//highlight boundary in green
				myLayer.setStyle({
					weight: 9,
					color: '#693',
					dashArray: '',
					fillOpacity: 0.7
				});
			}
		}

		function reset_highlight(e) {
		    geojsonZipData.resetStyle(e.target);
		    map.closePopup();
		    regionId = null;
		}

        //determines how the region overlays are colors/styled
		function style_region(feature) {
		    var regionIncome = zipIncomeVals[feature.properties.id.toString()];
		    var colorFill = regionIncome ? getMappedColor(regionIncome[keyToDisplay]) : '#000';
			return {
				weight: 1,
				opacity: 0.7,
				color: 'white',
				dashArray: 5,
				fillOpacity: 0.7,
				fillColor: colorFill
			};
		}


		function on_each_feature(feature, layer) {
			layer.on({
				mouseover: highlight_feature,
				mouseout: reset_highlight,
				click: zoom_to_feature
			});
		}

        //user clicks/selects a feature/region and we zoom to fit region in view and show info about region
        function zoom_to_feature(e) {
			map.fitBounds(e.target.getBounds());
			if (!needsShowInfo) {
				controlInfo.addTo(map);
				needsShowInfo = true;
			}
			controlInfo.update(e);
			map.addOneTimeEventListener('movestart',clear_info);
		}

        // load/generate regions from the geojson data (zipBounds) and put them on the map
		geojsonZipData = L.geoJson(zipBounds, {
		    style: style_region,
		    onEachFeature: on_each_feature
        }).addTo(map);

		var overlays = {
			"Mean Income": geojsonZipData,
			"Population": geojsonZipData  //***don't need separate geojson data, need separate other-data-by-zip (?)
		};

		L.control.layers(null, overlays).addTo(map);  //add just the overlay, no baseLayer(already done above)