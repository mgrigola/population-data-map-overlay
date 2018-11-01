var mapBoxKey = configKeys.mapBoxApiKey; // place your mapbox key here or create config/config.js and set var configInfo.mapBoxApiKey = 'your_key'
var LMap = L.map('leaflet-map');  // big L is leaflet

//the options for map styles
var layerLight = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token='+mapBoxKey, {
    maxZoom: 13,
    minZoom: 7,
    attribution: 'mapbox.com',
    id: 'mapbox.light'
}).addTo(LMap);

var layerDark = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token='+mapBoxKey, {
    maxZoom: 13,
    minZoom: 7,
    attribution: 'mapbox.com',
    id: 'mapbox.dark'
}).addTo(LMap);

//      //this guy takes a little longer to load maybe
//		var layerSat = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token='+mapBoxKey, {
//			maxZoom: 13,
//			minZoom: 9,
//			attribution: 'mapbox.com',
//			id: 'mapbox.satellite'
//		}).addTo(LMap);

var baseLayers = {
    "light": layerLight,
    "dark": layerDark
    //,"sat": layerSat
};

L.control.layers(baseLayers).addTo(LMap);
L.control.scale().addTo(LMap);




var keyToDisplay = 'HC01_EST_VC15';
var keyToDisplayPop = 'HC01_EST_VC01';
var keyToDisplayDescription = 'Mean Household Income ($)';

var zipIncomeVals;
var zipIncomeSrc = 'data/incomeDistribByZipcode.json';
var geojsonZipData;  //the zip code boundary coordinates stored in (geo)JSON format
var zipBoundSrc = 'data/cb_2017_us_zcta510_500k_WI.json';
var loadedIncome = false, loadedBounds = false;

//load the interesting data and zip code boundaries.
$(document).ready(function() {
    $.getJSON(zipIncomeSrc, function(zipIncomeData) {
        zipIncomeVals = zipIncomeData;
        calc_colormap_scale(zipIncomeVals);
        mapLegend.addTo(LMap);  //add legend after we load the data and know what scale to use

        //if zipbounds loaded first, we want to apply the (new) style with color based on income data to existing elements
        //if this runs first, loading zipbounds data will create the elements using style including income-based color?
        //i think this always happens in its entirety before the income load
        if (geojsonZipData)
            geojsonZipData.resetStyle();

        loadedIncome = true;
        add_d3_plot();
    });

    $.getJSON(zipBoundSrc, function(jsonData) {
        geojsonZipData = L.geoJson(jsonData, {
            style: style_region,
            onEachFeature: on_each_feature
        });
        geojsonZipData.addTo(LMap);

        //pop (households) is same geojson but we'll color it differently
        geojsonZipDataPop = L.geoJson(jsonData, {
            style: style_region_pop,
            onEachFeature: on_each_feature
        });

        var overlays = {
            "Mean Income": geojsonZipData,
            "Population": geojsonZipDataPop
        };

        L.control.layers(null, overlays).addTo(LMap);  //add just the overlay, no baseLayer(already done above)
    });
});


var popup = L.popup();
var regionId, regionElement;  //keeps tract of the currently active/selected region so we know when that changes


function on_each_feature(feature, layer) {
    layer.on({
        mouseover: highlight_feature,
        mouseout: reset_highlight,
        click: zoom_to_feature
    });
}

function highlight_feature(e) {
    var myLayer = e.target;
    var gjsnFeature = e.target.feature;  //the geoJson feature (a region)
    var regionProps = gjsnFeature.properties;  //properties for the region (like id, whatever else is in the json file)

    //see if element under mouse has changed nd update highlighting accordingly
    if (regionId != regionProps.zip) {
        regionId = regionProps.zip;

        //if we had an existing region highlighted, remove that highlighting?  can just do in mouseout
        //if (regionElement)
        //    geojsonZipData.resetStyle(regionElement.target);  // this will call style_region() for region


        var regionIncome = zipIncomeVals[regionProps.zip];
        var contentStr = '<h4>blah blah blah</h4>'+
            'ID: '+myLayer._leaflet_id+
            '<br>ZIP Code: '+regionProps.zip+
            '<br>Households: '+regionIncome.HC01_EST_VC01+
            '<br>Median Income: $'+regionIncome.HC01_EST_VC13+
            '<br>Mean Income: $'+regionIncome.HC01_EST_VC15;

        popup.setLatLng(e.latlng)  //where the mouse is?
        popup.setContent(contentStr);
        popup.openOn(LMap);

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
    this.setStyle(this.defaultOptions.style(this.feature));
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
        colorFill = regionIncome ? map_color(regionIncome[keyToDisplayPop]) : '#000';
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


//user clicks/selects a feature/region and we zoom to fit region in view and show info about region
function zoom_to_feature(e) {
    LMap.fitBounds(e.target.getBounds());
    if (!controlInfoIsVisible) {
        controlInfo.addTo(LMap);
        controlInfoIsVisible = true;
    }

    controlInfo.update(e);
    LMap.addOneTimeEventListener('mousedown',clear_info);  // "hide" the info box when user clicks elsewhere
}

//adds this little info popup box overlaid on the right of the map with some contextual detail
var controlInfo = L.control();
var controlInfoIsVisible = false;
controlInfo.onAdd = function (e) {
    this._div = L.DomUtil.create('div', 'info'); //control info initialized with div element of class 'info'
    return this._div;
};

controlInfo.update = function (e) {
    if  (e) {
        var props = e.target.feature.properties;
        var regionIncome = zipIncomeVals[props.zip.toString()];
        var detailStr = '<h4>Blibbity bloop</h4><div>Some more detailed info about this region</div>'+
            '<b>' + 'zip: ' + props.zip + '</b>'+
            '<div>income: ' + regionIncome['HC01_EST_VC15'] + '</div>';
        this._div.innerHTML = detailStr;
    }
};

function clear_info(e) {
    if (controlInfoIsVisible) {
        controlInfo.remove(LMap);
        controlInfoIsVisible = false;
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
var legendGradeScale = 1000;
function calc_colormap_scale(zipIncomeData) {
    colormapMinVal = 999999, colormapMaxVal = 0;
    for (zipId in zipIncomeData) {
        var val = parseInt(zipIncomeData[zipId][keyToDisplay]);
        if (val < colormapMinVal)  colormapMinVal = val;
        if (val > colormapMaxVal)  colormapMaxVal = val;
    }
    colormapMinVal = Math.ceil(colormapMinVal/legendGradeScale)*legendGradeScale;
    colormapMaxVal = Math.floor(colormapMaxVal/legendGradeScale)*legendGradeScale;
}

function rgb_2_str(r,g,b) {
    return 'rgb('+Math.floor(r)+','+Math.floor(g)+','+Math.floor(b)+')';
}

function colormap_heat(val,minVal,maxVal,minRGB,maxRGB) {
    var scale = (val - minVal)/(maxVal - minVal);
    scale = (scale<0) ? 0 : (scale>1) ? 1 : Math.pow(scale,0.5);
    return rgb_2_str((maxRGB[0]-minRGB[0])*scale+minRGB[0] , (maxRGB[1]-minRGB[1])*scale+minRGB[1] , (maxRGB[2]-minRGB[2])*scale+minRGB[2]);
}

function map_color(val) {
    return colormap_heat(val, colormapMinVal, colormapMaxVal, [0,64,255], [255,128,0]);
}


//on initial load of map, try to find current location and center map there
LMap.on('locationfound', on_location_found);
LMap.on('locationerror', on_location_error);
LMap.locate({setView: true});

function on_location_found(e) {
    var uncertaintyRadius = e.accuracy / 2;
    //e.latlng = [43.03, -89.55];
    L.marker(e.latlng).addTo(LMap).bindPopup('location uncertainty = ' + uncertaintyRadius + 'm?').openPopup();
    L.circle(e.latlng, uncertaintyRadius).addTo(LMap);
    LMap.setView(e.latlng, 9);
}

// can't or refused to get location -> go to madison
function on_location_error(e) {
    LMap.setView([43.03, -89.55], 9);
}



function add_d3_plot() {
    var plotData = [],plotLabels = [];
    for (var zipId in zipIncomeVals) {
        var intVal = +zipIncomeVals[zipId][keyToDisplay];
	    if (isNaN(intVal)) intVal = 0;
        plotData.push(intVal);
        plotLabels.push(zipId);
        if (plotData.length >= 50)
            break;
    }
    var zipCount = plotData.length;

    var plotWidth       = 300,
        barHeight        = 15,
        gapBetweenGroups = 10,
        spaceForLabels   = 150,
        spaceForLegend   = 150,
        plotHeight      = zipCount*(barHeight + gapBetweenGroups) - gapBetweenGroups;

    var x = d3.scale.linear()
        .domain([0, d3.max(plotData)])
        .range([0, plotWidth]);

    var y = d3.scale.linear()
        .range([plotHeight, 0]);

    var yAxis = d3.svg.axis()
        .scale(y)
        .tickFormat('')
        .tickSize(0)
        .orient("left");

//    var plotTest = d3.select(".chart")
//        .attr("width", plotWidth)
//        .attr("height", plotHeight);
//
//    var plotBar = plotTest.selectAll("g")
//        .data(plotData)
//        .enter().append("g")
//
//    plotBar.append("rect")
//        .attr("fill", function(val, idx) { return map_color(val); })
//        .attr("class", "plot-bar")
//        .attr("width", 100)
//        .attr("height", barHeight);
//
//    plotBar.append("text")
//        .attr("x", function(val) { return x(val)-3; })
//        .attr("y", barHeight/2)
//        .attr("fill", "#fff")
//        .attr("dy", ".35em")
//        .text(function(val) { return val; });
}