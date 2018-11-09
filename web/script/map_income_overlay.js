var NmMap = {};  //make a namespace for each file?

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
    format: 'png'
}).addTo(LMap);

var layerDark = L.tileLayer('https://api.mapbox.com/v4/{styleId}/{z}/{x}/{y}.{format}?access_token={accessToken}', {
    accessToken: mapBoxKey,
    maxZoom: 13,
    minZoom: 7,
    attribution: 'mapbox.com',
    styleId: 'mapbox.dark',
    format: 'png'
}).addTo(LMap);

//unnecessary to have multiple layers here. just to see/show how baselayers works
var baseLayers = {
    "light": layerLight,
    "dark": layerDark
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

//There's a toFixed(decimals) and toPrecision(sigFigs), but I don't like them.
//  This is like toPrecision, but doesn't do scientific notation
//given value and number of significant figures, returns the value rounded appropriately (as float)
//something like 1.00 will present as 1. rounds -1.5 to -2 (away from 0)
function round_sig_figs(val, sigFigs=3, trailZeros=false, round_func=Math.round) {
    var sign = Math.sign(val);
    var logTen = Math.floor(Math.log10(sign*val));
    var scale = Math.pow(10.0, sigFigs - logTen - 1);
    var noDecVal = sign*round_func(sign*val*scale);
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
//could maybe load from data/income_descriptions.json
var keyDefs = {
//HC01_EST_VC01: Households; Estimate; Total
    'HC01_EST_VC02': '$10k -',
    'HC01_EST_VC03': '$10-15k',
    'HC01_EST_VC04': '$15-25k',
    'HC01_EST_VC05': '$25-35k',
    'HC01_EST_VC06': '$35-50k',
    'HC01_EST_VC07': '$50-75k',
    'HC01_EST_VC08': '$75-100k',
    'HC01_EST_VC09': '$100-150k',
    'HC01_EST_VC10': '$150-200k',
    'HC01_EST_VC11': '$200k +'
//HC01_EST_VC13: Households; Estimate; Median income (dollars)
//HC01_EST_VC15: Households; Estimate; Mean income (dollars)
};
var keyList = [['HC01_EST_VC02', 'Less than $10,000'],
        ['HC01_EST_VC03', '$10,000 to $14,999'],
        ['HC01_EST_VC04', '$15,000 to $24,999'],
        ['HC01_EST_VC05', '$25,000 to $34,999'],
        ['HC01_EST_VC06', '$35,000 to $49,999'],
        ['HC01_EST_VC07', '$50,000 to $74,999'],
        ['HC01_EST_VC08', '$75,000 to $99,999'],
        ['HC01_EST_VC09', '$100,000 to $149,999'],
        ['HC01_EST_VC10', '$150,000 to $199,999'],
        ['HC01_EST_VC11', '$200,000 or more']];

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
        $.getJSON(zipBoundSrc, function(zipBoundJson) {
            //filter and copy over json data + add some computed values
            //zipBounds has only data for 1 state. zipIncome has every zip, so use keys in bounds to filter income
            for (var featureId in zipBoundJson.features) {
                var zipId = zipBoundJson.features[featureId].properties.zip;
                zipIncomeVals[zipId] = zipIncomeJson[zipId];
                zipIncomeVals[zipId]['area'] = calc_geodesic_area(zipBoundJson.features[featureId].geometry.coordinates);
                zipIncomeVals[zipId]['house_density'] = zipIncomeVals[zipId]['HC01_EST_VC01']/zipIncomeVals[zipId]['area'];
            }

            calc_colormap_scale();

            geojsonZipData = L.geoJson(zipBoundJson, {
                style: style_region,
                onEachFeature: on_each_feature
            });
            geojsonZipData.addTo(LMap);
            activeOverlays.push('Mean Income'); //the addTo above doesn't trigger LMap.overlayadd, so add manually

            //pop (households) is same geojson but we'll color it differently
            //seems plausible to manually handle the color and only have 1 geoJson dataset (boundary data is a few MB)
            geojsonZipDataPop = L.geoJson(zipBoundJson, {
                style: style_region_pop,
                onEachFeature: on_each_feature_pop
            });

            //add the second layer button in upper right to toggle pop/inc
            var overlays = {
                "Mean Income": geojsonZipData,
                "Population": geojsonZipDataPop
            };
            L.control.layers(null, overlays).addTo(LMap);  //add just the overlay, no baseLayer (already done elsewhere)

            add_d3_plot();  //add the bar plot on right. only requires the income data
            mapLegend.addTo(LMap);  //add legend after we load the data and know what scale to use
        });
    });
});


var hoverPopup = L.popup({autoPan: false, className: 'info'});
var regionId, regionElement;  //keeps tract of the currently active/selected region so we know when that changes

var leafletLayerMapping = {};
function on_each_feature(feature, layer) {
    layer.on({
        mouseover: on_mouseover_feature,
        mouseout: on_mouseout_feature,
        click: on_click_feature
    });

    var zipId = feature.properties.zip;
    if (leafletLayerMapping.hasOwnProperty(zipId))
        leafletLayerMapping[zipId]['Mean Income'] = layer;
    else
        leafletLayerMapping[zipId]= {'Mean Income': layer};
}

function on_each_feature_pop(feature, layer) {
    layer.on({
        mouseover: on_mouseover_feature,
        mouseout: on_mouseout_feature,
        click: on_click_feature
    });

    var zipId = feature.properties.zip;
    if (leafletLayerMapping.hasOwnProperty(zipId))
        leafletLayerMapping[zipId]['Population'] = layer;
    else
        leafletLayerMapping[zipId]= {'Population': layer};
}


function on_mouseover_feature(mouseEvent) { highlight_feature(mouseEvent.target); }
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
    hoverPopup.setLatLng(popupLoc);  //boundary of feature layer, top-center
    hoverPopup.setContent(contentStr);
    hoverPopup.openOn(LMap);

    //highlight boundary in thick green
    leafletLayer.setStyle({
        weight: 9,
        color: '#693',
        dashArray: ''
    });
}

function on_mouseout_feature(mouseEvent) { reset_highlight(mouseEvent.target); }
function reset_highlight(leafletLayer) {
    leafletLayer.setStyle(leafletLayer.defaultOptions.style(leafletLayer.feature));
    hoverPopup.closePopup();
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
function on_click_feature(mouseEvent) { zoom_to_feature(mouseEvent.target); }
function zoom_to_feature(leafletLayer) {
    var bounds = leafletLayer.getBounds();
    LMap.fitBounds(bounds, {paddingTopLeft:[150,150], paddingBottomRight:[150,0]});
    
    // if (!controlInfo.isVisible) {
    //     controlInfo.addTo(LMap);
    //     controlInfo.isVisible = true;
    // }
    controlInfo.clear_info();
    controlInfo.addTo(LMap);

    controlInfo.update_info(leafletLayer);
    LMap.addOneTimeEventListener('mousedown', controlInfo.clear_info);  // "hide" the info box when user clicks elsewhere
    regionId = null;
    highlight_feature(leafletLayer);
}

//adds this little info popup box overlaid on the right of the map with some contextual detail
var controlInfo = L.control();
controlInfo.isVisible = false;  //can i do this?
controlInfo.onAdd = function (e) {
    this._div = L.DomUtil.create('div', 'pie-box'); //'my-mini-plot');
    this._div.innerHTML = '<h4>Income Distribution in '+regionId+'</h4>';

    return this._div;
};

var pieRad = 150, pieHeight = 300, pieWidth = 300;
var pieColorData;
var pie_color_map = function(i) {return pieColorData[i]; };
var arcPath = d3.svg.arc().outerRadius(pieRad).innerRadius(pieRad/4); //defines svg path for a pie slice assumed centered at origin?
function debug_arc_path(a,b,c,d) {
    var val = arcPath(a,b,c,d);
    return val;
}

controlInfo.update_info = function(leafletLayer) {
    if  (!leafletLayer)
        return;
    
    //controlInfo.clear_info();
    d3.select('.pie-box.svg').remove();

    var props = leafletLayer.feature.properties;
    var regionIncome = zipIncomeVals[props.zip];
    var incomeData = [];

    for (key in keyDefs) {
        incomeData.push({'label':key, 'value':zipIncomeVals[props.zip][key]});
    }
    // for (var idx=0; idx<keyList.length; idx++) {
    //     incomeData.push({'label':keyList[idx][0], 'value':zipIncomeVals[props.zip][keyList[idx][0]]});
    // }

    var pieThing = d3.select('.pie-box');
    var pieThing2 = pieThing.append('svg')
        .data([incomeData])
        .attr("width", pieWidth)
        .attr("height", pieHeight)
        .append("g")
            .attr("transform", 'translate('+(pieWidth/2)+','+(pieHeight/2)+')');

    var pieLayout = d3.layout.pie()
        .value(pie_layout_func)
        .sort(null);
    
    var whatsthis = pieLayout(incomeData);
    var pieSlices = pieThing2.selectAll('g.pie-slice')
        .data(pieLayout)
        .enter().append('g')
            .attr("class", 'pie-slice');
    
    pieSlices.append('path')
        .attr("fill", pie_color_func)
        .attr("d", debug_arc_path);

    var slicesThatFitText = pieSlices.filter(d => (d.endAngle-d.startAngle)*pieRad/2>30)
    slicesThatFitText.append('text') //newer syntax for defining a function? I like it
        .attr('class', 'pie-label')
        .attr("transform", pie_text_transform)
        .text(pie_text_func);
        
    slicesThatFitText.append('text')
        .attr('class', 'pie-label-lower')
        .attr("transform", pie_text_transform_lower)
        .text(d => d.data.value+'%') //zipIncomeVals[props.zip]['HC01_EST_VC01']/100.0)
};

function pie_text_func(datum, index) {
    return keyDefs[datum.data.label];
}

function pie_layout_func(datum, index) {
    return datum.value;
}

function pie_color_func(datum, index) {
    return pie_color_map(index);
}

function pie_text_transform(datum, index) {
    datum.innerRadius = pieRad/1.5;
    datum.outerRadius = pieRad;
    var pt = arcPath.centroid(datum);
    var halfAng = (datum.startAngle + datum.endAngle)/2.0
    if ( halfAng > 1.57 && halfAng < 4.71)
        pt[1] += 6;
    else
        pt[1] += 6;
    return 'translate('+pt+')';
}

function pie_text_transform_lower(datum, index) {
    datum.innerRadius = pieRad/1.5;
    datum.outerRadius = pieRad;
    var pt = arcPath.centroid(datum);
    var halfAng = (datum.startAngle + datum.endAngle)/2.0
    if ( halfAng > 1.57 && halfAng < 4.71)
        pt[1] -= 6;
    else
        pt[1] -= 6;
    return 'translate('+pt+')';
}

controlInfo.clear_info = function(mouseEvent) {
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
// var colormapMinVal = 10000, colormapMaxVal = 100000;  //default values until we load data
// var colormapMinPop = 10000, colormapMaxPop = 100000;  //some ugly copying of the income stuff for pop
// var legendGradeScale = 1000;
var colormapMinVal, colormapMaxVal, colormapMinValPop, colormapMaxValPop;  //some ugly copying of the income stuff for pop
function calc_colormap_scale() {
    colormapMinVal = 999999, colormapMaxVal = 0, colormapMinPop = 999999, colormapMaxPop = 0;
    for (zipId in zipIncomeVals) {
        var val = parseInt(zipIncomeVals[zipId][keyToDisplay]);
        if (val < colormapMinVal)  colormapMinVal = val;
        if (val > colormapMaxVal)  colormapMaxVal = val;

        var pop = parseInt(zipIncomeVals[zipId][keyToDisplayPop]);
        if (pop < colormapMinPop)  colormapMinPop = pop;
        if (pop > colormapMaxPop)  colormapMaxPop = pop;
    }

    colormapMinVal = round_sig_figs(colormapMinVal, 1, false, Math.ceil);
    colormapMaxVal = round_sig_figs(colormapMaxVal, 1, false, Math.floor);
    colormapMinValPop = round_sig_figs(colormapMinValPop, 1, false, Math.ceil);
    colormapMaxValPop = round_sig_figs(colormapMaxValPop, 1, false, Math.floor);
    pieColorData = [map_color(10000), map_color(12500), map_color(20000), map_color(30000), map_color(42500), map_color(62500), map_color(87500), map_color(125000), map_color(175000), map_color(999999)];
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

var locMarker, locCircle;
function on_location_found(e) {
    var uncertaintyRadius = e.accuracy / 2;
    locMarker = L.marker(e.latlng, {opacity:.75, title: e.latlng});
    locMarker.addTo(LMap);
    var locPopup = L.popup({opacity:.5});
    locPopup.setContent('location uncertainty = ±' + uncertaintyRadius + 'm');
    locMarker.bindPopup(locPopup).openPopup();
    locCircle = L.circle(e.latlng, uncertaintyRadius);
    locCircle.addTo(LMap);
    LMap.setView(e.latlng, 9);
    window.setTimeout(function() {
        locMarker.remove();
        locCircle.remove();
    }, 3000);
}

// can't or refused to get location -> go to madison
function on_location_error(e) {
    LMap.setView([41.7, -87.9], 9);
}