var mapBoxKey = configKeys.mapBoxApiKey; // place your mapbox key here or create config/config.js and set
var LMap = L.map('leaflet-map');  // big L is leaflet

//the options for map styles
var layerLight = L.tileLayer('https://api.mapbox.com/v4/{styleId}/{z}/{x}/{y}.{format}?access_token={accessToken}', {
    accessToken: mapBoxKey,
    maxZoom: 13,
    minZoom: 7,
    attribution: 'mapbox.com',
    styleId: 'mapbox.light',
    styleId: 'mapbox.light',
    format: 'jpg70'
}).addTo(LMap);

var layerDark = L.tileLayer('https://api.mapbox.com/v4/{styleId}/{z}/{x}/{y}.{format}?access_token={accessToken}', {
    accessToken: mapBoxKey,
    maxZoom: 13,
    minZoom: 7,
    attribution: 'mapbox.com',
    styleId: 'mapbox.dark',
    format: 'png'
}).addTo(LMap);

//      //this guy takes a little longer to load maybe
//		var layerSat = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token='+mapBoxKey, {
//			maxZoom: 13,
//			minZoom: 9,
//			attribution: 'mapbox.com',
//			id: 'mapbox.satellite'
//		}).addTo(LMap);

//unnecessary to have multiple layers here. just to see/show how baselayers works
var baseLayers = {
    "light": layerLight,
    "dark": layerDark
    //,"sat": layerSat
};

var activeOverlays = [];
L.control.layers(baseLayers).addTo(LMap);
L.control.scale().addTo(LMap);

LMap.on('overlayadd', function(layersControlEvent) {
    //I'm sure there's a cleaner way but this:
    //checks if activated layer had been previously active and moves it to top of this half-assed stack
    //else inserts a new element at head and pushes everything back
    var newLayer = layersControlEvent.name;
    for (var layerNo=0; layerNo<activeOverlays.length; layerNo++) {
        if (activeOverlays[layerNo] == newLayer) {
            for (var moveNo=(layerNo-1); moveNo>=0; moveNo--) {
                activeOverlays[moveNo+1] = activeOverlays[moveNo];
            }
            activeOverlays[0] = newLayer;
            return;
        }
    }
    activeOverlays.splice(0,0,newLayer);
});

LMap.on('overlayremove', function(layersControlEvent) {
    //removes the removed (from the UI) layer from our (internal) iist and bumps other layers up
    //first element in activeOverlays is the currently active layer (if any)
    var oldLayer = layersControlEvent.name;
    for (var layerNo=0; layerNo<activeOverlays.length; layerNo++) {
        if (activeOverlays[layerNo] == oldLayer) {
            activeOverlays.splice(layerNo, 1);
        }
    }
});

var distTooltip, distMarkerA, distMarkerB, distPolyline, drawingLine=false, clearTimer;
LMap.on('click', function(mouseEvent) {
    if (!drawingLine && mouseEvent.originalEvent.ctrlKey) {
        if (distPolyline) {
            clear_distance_markers();
        }
        else {
            distPolyline = L.polyline([], {color: 'red', opacity: 0.25, dashArray: '4', interactive: false});
        }
        distPolyline.setStyle({opacity: 0.2});
        distPolyline.addTo(LMap);
        drawingLine = true;
        distMarkerA = L.marker(mouseEvent.latlng, {
            //icon: L.divIcon({className: 'my-div-icon'}),
            title: 'A',
            opacity: 0.75,
            keyboard: false
        });
        distMarkerA.addTo(LMap); //.bindPopup('<h4>A</h4><div>distP1</div>').openPopup();
        distTooltip = L.tooltip({direction:'right', offset: [0,-10]});
        LMap.addEventListener('mousemove', update_distance_line);
    }
    else if (drawingLine) {
        drawingLine = false;
        LMap.removeEventListener('mousemove', update_distance_line);
        distMarkerB = L.marker(mouseEvent.latlng, {
            //icon: L.divIcon({className: 'my-div-icon'}),  //don't use the marker, build our own marker
            title: 'B',
            opacity: 0.75,
            keyboard: false
        });
        distMarkerB.addTo(LMap); //.bindPopup('<h4>B</h4><div>distP1</div>').openPopup();
        distPolyline.setLatLngs([distMarkerA.getLatLng(), distMarkerB.getLatLng()]);
        distPolyline.setStyle({opacity: 0.8});
        distMarkerA.options.opacity = 0.75;
        distMarkerB.options.opacity = 0.75;
        var dist = calc_distance(distMarkerA.getLatLng(), distMarkerB.getLatLng());

        distPolyline.bindTooltip(distTooltip).openTooltip();
        distTooltip.setContent(dist+' mi');
        clearTimer = window.setTimeout(clear_distance_markers, 3000);
    }
});

function update_distance_line(mouseEvent) {
    var dist = calc_distance(distMarkerA.getLatLng(), mouseEvent.latlng);
    distPolyline.setLatLngs([distMarkerA.getLatLng(), mouseEvent.latlng])

    distPolyline.bindTooltip(distTooltip).openTooltip();
    distTooltip.setContent(dist+' mi');
};

function clear_distance_markers() {
    window.clearTimeout(clearTimer);
    if (drawingLine)
        return;

    if(distMarkerA) distMarkerA.remove();
    if(distMarkerB) distMarkerB.remove();
    if(distPolyline) {
        distPolyline.setLatLngs([]);
        distPolyline.remove();
    }
}

//haversine formula to calculate great circle distance between 2 latlng coords
function calc_distance(ptA, ptB) {
    var rEarth = 3960.0,   //earth_rad in meters: 6378137.0 | miles: 3963.19 | km: 6378.137
        deg2rad = Math.PI/180,
        dLng = deg2rad*(ptB.lng-ptA.lng)/2.0,
        dLat = deg2rad*(ptB.lat-ptA.lat)/2.0;

    var h = Math.pow(Math.sin(dLat), 2) + Math.pow(Math.sin(dLng), 2)*Math.cos(deg2rad*ptA.lat)*Math.cos(deg2rad*ptB.lat);
    return round_sig_figs(2*rEarth*Math.asin(Math.sqrt(h)), 3, false);
}

//There's a toFixed(decimals) and toPrecision(sigFigs), but I don't like them.
//  This is like toPrecision, but doesn't do scientific notation
//given value and number of significant figures, returns the value rounded appropriately (as float)
//something like 1.00 will present as 1. rounds -1.5 to -2 (away from 0)
function round_sig_figs(val, sigFigs=3, trailZeros=false) {
    var sign = Math.sign(val);
    var logTen = Math.floor(Math.log10(sign*val));
    var scale = Math.pow(10.0, sigFigs - logTen - 1);
    var noDecVal = sign*Math.round(sign*val*scale);
    var roundedVal = noDecVal / scale;
    if (!trailZeros) return roundedVal

    //TODO
    //this doesn't work atm. consider 600: 600+"00" = "60000",  60.0: 60+"00" = "6000". Gotta consider the decimal place
    //for something like 3 sigfigs for 0.02, we want to return '0.0200'
    //if the tens, hundreds, etc -place digit is 0, we record '0' and move to next place
    //the noDecVal will be like 200 for 0.02 -> sigfigs end at the decimal and we divide at end
    var trailingZeroStr = '';
    var digitMultiplier = 10;
    while (noDecVal%digitMultiplier==0) {
        trailingZeroStr += '0';
        digitMultiplier *= 10;
    }
    return roundedVal+trailingZeroStr;  //0.02+'00' = '0.0200'
}

//these are standard labels defined by census bureau
//the income dataset is from ACS (American Community Survey) ref#: S1901 (from 2016, 5year average ['12-'16] estimates)
//HC01_EST_VC01: Households; Estimate; Total
//HC01_EST_VC02: Households; Estimate; Less than $10,000
//HC01_EST_VC03: Households; Estimate; $10,000 to $14,999
//HC01_EST_VC04: Households; Estimate; $15,000 to $24,999
//HC01_EST_VC05: Households; Estimate; $25,000 to $34,999
//HC01_EST_VC06: Households; Estimate; $35,000 to $49,999
//HC01_EST_VC07: Households; Estimate; $50,000 to $74,999
//HC01_EST_VC08: Households; Estimate; $75,000 to $99,999
//HC01_EST_VC09: Households; Estimate; $100,000 to $149,999
//HC01_EST_VC10: Households; Estimate; $150,000 to $199,999
//HC01_EST_VC11: Households; Estimate; $200,000 or more
//HC01_EST_VC13: Households; Estimate; Median income (dollars)
//HC01_EST_VC15: Households; Estimate; Mean income (dollars)
//HC01_EST_VC18: Households; Estimate; PERCENT IMPUTED - Household income in the past 12 months
var keyDefs = {
    'HC01_EST_VC02': 'Less than $10,000',
    'HC01_EST_VC03': '$10,000 to $14,999',
    'HC01_EST_VC04': '$15,000 to $24,999',
    'HC01_EST_VC05': '$25,000 to $34,999',
    'HC01_EST_VC06': '$35,000 to $49,999',
    'HC01_EST_VC07': '$50,000 to $74,999',
    'HC01_EST_VC08': '$75,000 to $99,999',
    'HC01_EST_VC09': '$100,000 to $149,999',
    'HC01_EST_VC10': '$150,000 to $199,999',
    'HC01_EST_VC11': '$200,000 or more'
};


var keyToDisplay = 'HC01_EST_VC15';
var keyToDisplayPop = 'house_density'; //'HC01_EST_VC01';
var keyToDisplayDescription = 'Mean Household Income ($)';

var zipIncomeVals = {};
var zipIncomeSrc = 'data/incomeDistribByZipcode.json';  //now with all the zips in US?
var geojsonZipData;  //the zip code boundary coordinates stored in (geo)JSON format
var zipBoundSrc = 'data/cb_2017_us_zcta510_500k_IL.json';

//load the interesting data and zip code boundaries.
$(document).ready(function() {
    $.getJSON(zipIncomeSrc, function(zipIncomeJson) {
        //tempIncome = zipIncomeJson;
        //calc_colormap_scale(zipIncomeVals);

        $.getJSON(zipBoundSrc, function(zipBoundJson) {
            //
            for (var featureId in zipBoundJson.features) {
                var zipId = zipBoundJson.features[featureId].properties.zip;
                zipIncomeVals[zipId] = zipIncomeJson[zipId];
                zipIncomeVals[zipId]['area'] = calc_geodesic_area(zipBoundJson.features[featureId].geometry.coordinates);
                zipIncomeVals[zipId]['house_density'] = zipIncomeVals[zipId]['HC01_EST_VC01']/zipIncomeVals[zipId]['area'];
            }
            calc_colormap_scale(zipIncomeVals);

            geojsonZipData = L.geoJson(zipBoundJson, {
                style: style_region,
                onEachFeature: on_each_feature
            });
            geojsonZipData.addTo(LMap);
            activeOverlays.push('Mean Income'); //the addTo above doesn't trigger LMap.overlayadd, so add manually

            //pop (households) is same geojson but we'll color it differently
            geojsonZipDataPop = L.geoJson(zipBoundJson, {
                style: style_region_pop,
                onEachFeature: on_each_feature_pop
            });

            var overlays = {
                "Mean Income": geojsonZipData,
                "Population": geojsonZipDataPop
            };

            L.control.layers(null, overlays).addTo(LMap);  //add just the overlay, no baseLayer(already done above)
            add_d3_plot();  //add the bar plot on right. only requires the income data
            mapLegend.addTo(LMap);  //add legend after we load the data and know what scale to use
        });
    });
});


var popup = L.popup({autoPan: false, className: 'info'});
var regionId, regionElement;  //keeps tract of the currently active/selected region so we know when that changes

var leafletLayerMapping = {};
function on_each_feature(feature, layer) {
    layer.on({
        mouseover: on_feature_mouseover,
        mouseout: on_feature_mouseout,
        click: zoom_to_feature
    });

    var zipId = feature.properties.zip;
    if (leafletLayerMapping.hasOwnProperty(zipId))
        leafletLayerMapping[zipId]['Mean Income'] = layer;
    else
        leafletLayerMapping[zipId]= {'Mean Income': layer};
}

function on_each_feature_pop(feature, layer) {
    layer.on({
        mouseover: on_feature_mouseover,
        mouseout: on_feature_mouseout,
        click: zoom_to_feature
    });

    var zipId = feature.properties.zip;
    if (leafletLayerMapping.hasOwnProperty(zipId))
        leafletLayerMapping[zipId]['Population'] = layer;
    else
        leafletLayerMapping[zipId]= {'Population': layer};
}


function on_feature_mouseover(mouseEvent) { highlight_feature(mouseEvent.target); }
function highlight_feature(leafletLayer) {
    var gjsnFeature = leafletLayer.feature;  //the geoJson feature (a region)
    var regionProps = gjsnFeature.properties;  //properties for the region (like id, whatever else is in the json file)

    //see if element under mouse has changed. update highlighted region if different
    if (regionId == regionProps.zip)
        return;

    regionId = regionProps.zip;
    var regionIncome = zipIncomeVals[regionProps.zip];
    var contentStr = '<h4>'+regionProps.zip+'</h4>'+
        '<br>Households: '+regionIncome.HC01_EST_VC01+
        '<br>Median Income: $'+regionIncome.HC01_EST_VC13+
        '<br>Mean Income: $'+regionIncome.HC01_EST_VC15+
        '<br>Area: '+(Math.floor( 100.0*regionIncome['area'] + 0.5) /100.0)+'mi<sup>2</sup>'+
        '<br>Household Density: '+(Math.floor( 100.0*regionIncome['house_density'] + 0.5) /100.0)+' households/mi<sup>2</sup>';

    var locNE = leafletLayer['_bounds']['_northEast'];
    var locSW = leafletLayer['_bounds']['_southWest'];
    var popupLoc = {'lat': locNE.lat, 'lng': (locNE.lng+locSW.lng)/2.0};
    popup.setLatLng(popupLoc);  //boundary of feature layer, top-center
    popup.setContent(contentStr);
    popup.openOn(LMap);

    //highlight boundary in thick green
    leafletLayer.setStyle({
        weight: 9,
        color: '#693',
        dashArray: '',
        //fillOpacity: 0.7
    });
}

function on_feature_mouseout(mouseEvent) { reset_highlight(mouseEvent.target); }
function reset_highlight(leafletLayer) {
    leafletLayer.setStyle(leafletLayer.defaultOptions.style(leafletLayer.feature));
    LMap.closePopup();
    regionId = null;
}

//determines how the region overlays are colors/styled
function style_region(feature) {
    var colorFill = '#000';
    if (zipIncomeVals) {
        var regionIncome = zipIncomeVals[feature.properties.zip];
        colorFill = regionIncome ? map_color(+regionIncome[keyToDisplay]) : '#000';
    }
    return {
        weight: 1,
        opacity: 0.7,
        color: 'white',
        dashArray: 5,
        fillOpacity: (colorFill=='#000' ? 0 : .7),
        fillColor: colorFill
    };
}

//determines how the region overlays are colors/styled
function style_region_pop(feature) {
    var colorFill = '#000';
    if (zipIncomeVals) {
        var regionIncome = zipIncomeVals[feature.properties.zip];
        colorFill = regionIncome ? map_color_pop(regionIncome[keyToDisplayPop]) : '#000';
    }
    return {
        weight: 1,
        opacity: 0.7,
        color: 'black',
        dashArray: 5,
        fillOpacity: .5, //(colorFill=='#000' ? 0 : .7),
        fillColor: colorFill
    };
}


//user clicks/selects a feature/region and we zoom to fit region in view and show info about region
function zoom_to_feature(e) {
    LMap.fitBounds(e.target.getBounds());
    if (!controlInfo.isVisible) {
        controlInfo.addTo(LMap);
        controlInfo.isVisible = true;
    }

    controlInfo.update(e);
    LMap.addOneTimeEventListener('mousedown',clear_info);  // "hide" the info box when user clicks elsewhere
}

//adds this little info popup box overlaid on the right of the map with some contextual detail
var controlInfo = L.control();
//var controlInfoIsVisible = false;
controlInfo.isVisible = false;  //can i do this?
controlInfo.onAdd = function (e) {
    this._div = L.DomUtil.create('div', 'info'); //'my-mini-plot');
    return this._div;
};

controlInfo.update = function (e) {
    if  (e.target) {
        var props = e.target.feature.properties;
        var regionIncome = zipIncomeVals[props.zip];

        //I'm sure this is not the way to do this... TODO
        var detailStr = '<h4>Detail</h4><table>';
        for (var key in keyDefs) {
            detailStr += '<tr><td>'+keyDefs[key]+'</td><td>'+regionIncome[key]+'</td></tr>';
        }
        detailStr += '</table>'
        this._div.innerHTML = detailStr;
    }
};

function clear_info(e) {
    if (controlInfo.isVisible) {
        controlInfo.remove(LMap);
        controlInfo.isVisible = false;
    }
}


//create the legend
var mapLegend = L.control({position: 'bottomright'});
mapLegend.onAdd = function (_) {
    var div = L.DomUtil.create('div', 'legend info');
    var legendText = ['<leghd>'+keyToDisplayDescription+'</leghd>'];
    var gradeCount = 5;
    var gradeVal, colorVal;

    //generate color gradations for the legend here
    legendText.push('<legli style="background:' + map_color(colormapMinVal) + '"></legli> ' + '<' + colormapMinVal.toLocaleString());
    for (var gradeNo = 1; gradeNo < gradeCount-1; gradeNo++) {
        gradeVal = Math.floor( gradeNo*(colormapMaxVal - colormapMinVal)/gradeCount + colormapMinVal );
        legendText.push('<legli style="background:' + map_color(gradeVal) + '"></legli> &nbsp;&nbsp;' + gradeVal.toLocaleString());
    }
    legendText.push('<legli style="background:' + map_color(colormapMaxVal) + '"></legli> ' + '>' + colormapMaxVal.toLocaleString());

    div.innerHTML = legendText.join('<br>');
    return div;
};


//manually defining a colormap function. I'm sure there's a cleaner way
var colormapMinVal = 10000, colormapMaxVal = 100000;  //default values until we load data
var colormapMinPop = 10000, colormapMaxPop = 100000;  //some ugly copying of the income stuff for pop
var legendGradeScale = 1000;
function calc_colormap_scale() {
    colormapMinVal = 999999, colormapMaxVal = 0;
    colormapMinPop = 999999, colormapMaxPop = 0;
    for (zipId in zipIncomeVals) {
        var val = parseInt(zipIncomeVals[zipId][keyToDisplay]);
        if (val < colormapMinVal)  colormapMinVal = val;
        if (val > colormapMaxVal)  colormapMaxVal = val;

        var pop = parseInt(zipIncomeVals[zipId][keyToDisplayPop]);
        if (pop < colormapMinPop)  colormapMinPop = pop;
        if (pop > colormapMaxPop)  colormapMaxPop = pop;
    }
    colormapMinVal = Math.ceil(colormapMinVal/legendGradeScale)*legendGradeScale;
    colormapMaxVal = Math.floor(colormapMaxVal/legendGradeScale)*legendGradeScale;

    colormapMinPop = Math.ceil(colormapMinPop/legendGradeScale)*legendGradeScale;
    colormapMaxPop = Math.floor(colormapMaxPop/legendGradeScale)*legendGradeScale;
}

function rgb_2_str(r,g,b) {
    return 'rgb('+Math.floor(r)+','+Math.floor(g)+','+Math.floor(b)+')';
}

function colormap_heat(val,minVal,maxVal,minRGB,maxRGB) {
    var scale = (val - minVal)/(maxVal - minVal);
    scale = (scale<0) ? 0 : ( (scale>1) ? 1 : Math.pow(scale,0.667) );  //bound scale on [0,1]. Apply like a gamma correction to make range visually easier to separate
    return rgb_2_str((maxRGB[0]-minRGB[0])*scale+minRGB[0] , (maxRGB[1]-minRGB[1])*scale+minRGB[1] , (maxRGB[2]-minRGB[2])*scale+minRGB[2]);
}

function map_color(val) {
    return colormap_heat(val, colormapMinVal, colormapMaxVal, [0,64,255], [255,128,0]);
}

function map_color_pop(val) {
    return colormap_heat(val, colormapMinPop, colormapMaxPop, [0,64,192], [0,255,128]);
}

//on initial load of map, try to find current location and center map there
LMap.on('locationfound', on_location_found);
LMap.on('locationerror', on_location_error);
LMap.locate({setView: true});

function on_location_found(e) {
    var uncertaintyRadius = e.accuracy / 2;
    //e.latlng = [43.03, -89.55];
    L.marker(e.latlng).addTo(LMap).bindPopup('location uncertainty = ±' + uncertaintyRadius + 'm').openPopup();
    L.circle(e.latlng, uncertaintyRadius).addTo(LMap);
    LMap.setView(e.latlng, 9);
}

// can't or refused to get location -> go to madison
function on_location_error(e) {
    LMap.setView([43.03, -89.55], 9);
}


var plotWidth = 300,
    barHeight = 12,
    spaceOnLeft = 50,
    spaceOnRight = 5,
    gapBetweenGroups = .5,
    zipCount, maxPlotVal,
    x_scale, y_scale;

function add_d3_plot() {
//    var plotData = [],plotLabels = [];
    var plotObjs = [];
    for (var zipId in zipIncomeVals) {
        var intVal = +zipIncomeVals[zipId][keyToDisplay];
	    if (isNaN(intVal)) intVal = 0;
//        plotData.push(intVal);
//        plotLabels.push(zipId);
        plotObjs.push([zipId, intVal]);
        if (plotObjs.length >= 250)
            break;
    }
    zipCount = plotObjs.length;
    //maxPlotVal = d3.max(ployObjs);
//    maxPlotVal = Math.max(plotObjs.map(obj => obj[1]), 0);  //finds max val in second col of plotObjs (max income)
    maxPlotVal = Math.max.apply(Math, plotObjs.map(function(obj) {return obj[1];}));  //finds max val in second col of plotObjs (max income)
    plotObjs.sort(function(a, b) { return a[1]<b[1] ? 1 : -1; });  //sorts plotObjs by second col (income, desc)

    var plotHeight = zipCount*(barHeight + gapBetweenGroups) - gapBetweenGroups;
    var myd3plot = document.getElementById("d3-plot");
    plotWidth = myd3plot.clientWidth - spaceOnLeft - spaceOnRight;

    //*_scale = a function that maps our data value in domain to pixels/position-on-screen value in range
    x_scale = d3.scale.linear()
        .domain([0, maxPlotVal])
        .range([0, plotWidth]);

    y_scale = d3.scale.linear()
        .range([plotHeight, 0]);

    var plotChart = d3.select(".chart")
        .attr("width", plotWidth)
        .attr("height", plotHeight);

    //
    var plotBars = plotChart.selectAll("g")
        .data(plotObjs)   //data here
        .enter().append("g")
            .attr("transform", calling_to_see_the_params); //

    plotBars.append("rect")
        .attr("class", "plot-bars")
        .attr("fill", function(d,i) { return map_color(d[1]); })
        .attr("width", function(d) { return x_scale(d[1]); })
        .attr("height", barHeight);

    plotBars.append("text")
        .attr("class", "text-values")
        .attr("x", text_values_attr_x)
        .attr("y", barHeight/2)
        .attr("fill", "#fff")
        .attr("dy", ".3em")
        .text(function(d) { return '$'+d[1].toLocaleString(); });

    plotBars.append("text")
        .attr("class", "label")
        .attr("x", function(d) { return -10; })
        .attr("y", barHeight / 2)
        .attr("dy", ".25em")
        .text(function(d,i) { return d[0]; });

    //draw a line for the y-axis, maybe with some tick marks
    var y_axis = d3.svg.axis()
        .scale(y_scale)
        .tickFormat('')
        .tickSize(0)
        .orient("left");  //put tick left of axis

    plotChart.append("g")
      .attr("class", "y axis")
      .attr("transform", "translate(" + (spaceOnLeft) + ", " + gapBetweenGroups + ")")
      .call(y_axis);

    d3.selectAll("rect").on("mouseover", my_mouseover_function);
    d3.selectAll("rect").on("mouseout", my_mouseout_function);
}

function text_values_attr_x(d) {
    return Math.max(x_scale(d[1])-3, 9);  //min cap at 9 so values are always right of axis
}

function my_mouseover_function() {
    var selectedThing = d3.select(this);
    selectedThing.style("fill", "#693");
    var zipId = selectedThing.datum()[0];
    var activeOverlay = activeOverlays[0];
    var topLayer = leafletLayerMapping[zipId][activeOverlay];
    highlight_feature(topLayer);
}

function my_mouseout_function() {
    var selectedThing = d3.select(this);
    selectedThing.style("fill", map_color(selectedThing.datum()[1]) );
    var zipId = selectedThing.datum()[0];
    var activeOverlay = activeOverlays[0];
    var topLayer = leafletLayerMapping[zipId][activeOverlay];
    reset_highlight(topLayer);
}

//d = dataValue,  i = elementNumber (starts at 0 for first bar)
function calling_to_see_the_params(d,i) {
    return "translate(" + spaceOnLeft + "," + (i * (barHeight+gapBetweenGroups) + (0.5 * barHeight)) + ")";
}

function update_window_resize() {
    if (!x_scale)
        return;

    var plotBars = d3.select(".chart").selectAll("g");

    plotWidth = document.getElementById("d3-plot").clientWidth - spaceOnLeft - spaceOnRight;
    x_scale.range([0, plotWidth]);
    plotBars.selectAll("plot-bars").attr("width", function(d) { return x_scale(d[1]); });
    plotBars.selectAll("text-values").attr("x", text_values_attr_x);
}
d3.select(window).on('resize.updatesvg', update_window_resize);


//calculate area from coordinates. math
//coordinates for a geojson object are an array of polygons ('islands' are separate polygons)
//I've removed negative spaces ('holes') in pre-processing, so don't need to worry about that
// ignoring negative holes will make some areas wrong, but it makes this calculation simpler
function calc_geodesic_area(coords) {
    var area = 0.0,
        deg2rad = Math.PI/180,
        rEarth = 3960.0,   //earth_rad in meters: 6378137.0 | miles: 3963.19 | km: 6378.137  //it varies, so more than like 2/3 sigfigs is not justifiable
        polygon, ptCnt, p1, p2;

    for (var polyNo=0; polyNo<coords.length; polyNo++) {
        polygon = coords[polyNo]
        ptCnt = polygon.length;
        if (ptCnt > 2) {
            for (var ptNo=0; ptNo<ptCnt; ptNo++) {
                p1 = polygon[ptNo];
                p2 = polygon[ (ptNo+1) % ptCnt ];
                area += ((p2[0] - p1[0]) * deg2rad) * (2 + Math.sin(p1[1] * deg2rad) + Math.sin(p2[1] * deg2rad));
            }
        }
    }

    return Math.abs(area*rEarth*rEarth / 2.0);
}