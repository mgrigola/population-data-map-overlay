//used from map_income_overlay:
//zipIncomeVals
//

//constants that affect look/feel of plot
var barHeight = 12,
    spaceOnLeft = 38,       //space between left edge of bars and edge of parent element (for label text + y-axis)
    spaceOnRight = 4,       //space between right edge of max length bar and edge of parent element
    spaceOnTop = 2;
    labelEndToRectStart = 4,//space between left edge of bar and right edge of label text
    gapBetweenBars = .5,  //vertical space between each bar
    scrollStep = 24,
    arrowWidth = 16, arrowHeight = 12, arrowPad = 4, arrowEdgePad = 2; //

//some globals we'll keep track of and update
var zipCount, maxPlotVal, //cache some descriptors of the data
    x_scale, y_scale,     //d3 scaling functions mapping data val to pixel sizes
    scrollRow = 0, maxScrollRow,       //keep track of row position when scrolling
    svgHeight, svgWidth;  //dimensions of the <td> tag that contains the bar plot (30% width, 100% height)

var plotData, sortOption = -2;


//var headerHeight = 22;  //not actua used at the moment
var headerPadPixels = 8;  // = 2*[outset border] plus 2*[padding] (for each side)


function prepare_data() {
    if (sortOption == 2)
        plotData.sort(function(a, b) { return a[1]>b[1] ? 1 : -1; });  //sorts plotData by second col (income, asc)
    else if (sortOption == -2)
        plotData.sort(function(a, b) { return a[1]<b[1] ? 1 : -1; });  //sorts plotData by second col (income, desc)
    else if (sortOption == 1)
        plotData.sort(function(a, b) { return a[0]>b[0] ? 1 : -1; });  //sorts plotData by first col (zip, desc)
    else if (sortOption == -1)
        plotData.sort(function(a, b) { return a[0]<b[0] ? 1 : -1; });  //sorts plotData by first col (zip, asc)
}


function add_d3_plot() {

    //div for the column headers, clickable for sorting and stuff
    var headerDiv = d3.select('#d3-plot').append('div')
        .attr('class', 'plot-header');
        //.style('width', '100%');
        //.style('height', headerHeight);

    //div to contain the svg stuff that is the actual 'plot' (bars and numebrs and whatnot)
    var plotDiv = d3.select('#d3-plot').append('div')
        .attr('class', 'plot-content')
        // .attr('height', '100%')
        // .attr('width', '100%');
    
    var plotChart = plotDiv.append('svg');
    //var plotChart = d3.select('#d3-plot').append('svg');

    //assuming zipIncomeVals is already loaded...
    plotData = [];
    for (var zipId in zipIncomeVals) {
        var intVal = +zipIncomeVals[zipId][keyToDisplay];
	    if (isNaN(intVal))
	        intVal = 0;
        plotData.push([zipId, intVal]);
        if (plotData.length > 200)
            break;
    }
    zipCount = plotData.length;
    maxPlotVal = Math.max.apply(Math, plotData.map(function(obj) {return obj[1];}));  //finds max val in second col of plotData (max income)
    prepare_data();

    //var divRect = d3.select("#d3-plot").node().getBoundingClientRect();
    var divRect = document.getElementById('d3-plot').getBoundingClientRect();
    svgWidth = divRect.width;
    svgHeight = divRect.height;
    var plotWidth = svgWidth - spaceOnLeft - spaceOnRight;
    var plotHeight = zipCount*(barHeight + gapBetweenBars) - gapBetweenBars;  //probably runs way below page
    //var plotTotalHeight = zipCount*(barHeight + gapBetweenBars) - gapBetweenBars;  //probably runs way below page


    headerDiv.append('span')
        //.style('border', '.5px solid #000')
        .style('width', spaceOnLeft-headerPadPixels)  //headerPadPixels accounts for size distortion from styling
        //.style('float', 'right')
        // .style('padding', '2px')
        // .style('vertical-align', 'center')
        .on('mousedown', on_mousedown_header_zip)
        .on('mouseup', on_mouseup_header_zip)
        .html('Zip');
    
    headerDiv.append('span')
        .attr('id', 'header-text-income')
        //.style('border', '.5px solid #000')
        //.style('width', '100%')
        //.style('float', 'left')
        // .style('padding', '2px')
        // .style('vertical-align', 'center')
        //.style('width', plotWidth+spaceOnRight-headerPadPixels) //headerPadPixels accounts for size distortion from styling
        .on('mousedown', on_mousedown_header_income)
        .on('mouseup', on_mouseup_header_income)
        .html('Mean Household Income');

    //the svg element that contains the whole right side/bar chart. fills right half of screen
    //var plotChart = d3.select("#d3-plot")
    plotChart
        //.style('display', 'flex')
        //.style("height", '100vh')
        //.attr("width", plotWidth)
        // .style('display', 'block')
        // .style('overflow', 'auto')
        // .style('position', 'relative')
        .attr('width', '100%')
        //.attr('height', '100%');
        //.style("width", svgWidth)
        //.style("height", '100%');

    //a group to contain all movable elements in the bar plot for resizing and scrolling
    var plotBars = plotChart.selectAll('g')
        .data(plotData)   //data here
        .enter()
            .append('g')
            .attr('class', 'plot-elems')
            .attr('transform', plot_elem_transform);

    //*_scale = a function that maps our data value in domain to pixels/position-on-screen value in range
    x_scale = d3.scaleLinear()
        .domain([0, maxPlotVal])
        .range([0, plotWidth]);

    //the colorful data bars
    plotBars.append("rect")
        .attr("class", 'plot-bar')
        .attr("fill", function(d,i) { return map_color(d[1]); })
        .attr("width", function(d) { return x_scale(d[1]); })
        .attr("height", barHeight)
        .on("mouseover", on_mouseover_plotbar)
        .on("mouseout", on_mouseout_plotbar)
        .on("click", on_click_plotbar);

    //background for text labels?
    // plotBars.append("rect")
    //     //.attr('class', 'new-class')
    //     .attr('fill', '#d00')
    //     .attr('width', spaceOnLeft)
    //     .attr('height', barHeight)
    //     .attr('dx', -spaceOnLeft);

    //the text inside the bar that shows the value
    plotBars.append("text")
        .attr("class", 'text-value')
        .text(function(d) { return '$'+d[1].toLocaleString(); })
        .attr("x", text_values_attr_x)
        .attr("y", barHeight/2)
        .attr("dy", ".4em");

    //the y-axis label showing the zip code
    plotBars.append("text")
        .attr("class", 'text-label')
        .attr("x", function(d) { return -labelEndToRectStart; })
        .attr("y", barHeight / 2)
        .attr("dy", ".35em")
        .text(function(d,i) { return d[0]; });

    //y-axis line and ticks. this is the d3-v4 version: scale.linear -> scaleLinear, svg.axis->axisLeft
    y_scale = d3.scaleLinear().range([0, plotHeight]);  //.domain([plotHeight, 0])
    plotChart.append("g")
        .attr("class", "y-axis")
        //.attr("transform", 'translate('+spaceOnLeft+','+gapBetweenBars+')')
        .call(
            d3.axisLeft(y_scale)
            .ticks(0) //zipCount-1 fuck these ticks //svgHeight/(barHeight+gapBetweenBars)
            .tickSizeInner(6)
            .tickSizeOuter(0)
            .tickFormat("")
        );

    //the arrows that allow scrolling through the plot:
    //var arrowDataBot = [[0,0],[arrowWidth,arrowHeight],[2*arrowWidth,0]];
    var arrowDataBot = [[0,0],[arrowWidth-1,arrowHeight],[arrowWidth+1,arrowHeight],[2*arrowWidth,0]];
    var arrowDataTop = [[0,arrowHeight],[arrowWidth-1,0],[arrowWidth+1,0],[2*arrowWidth,arrowHeight]];  //can programmatically invert? having this duplicate irks me
    var lineFunction = d3.line()  //in v4, d3.svg.line -> d3.line and 'linear' -> d3.curveLinear
        .x(function(d) { return d[0];})
        .y(function(d) { return d[1];})
        .curve(d3.curveLinear);

    //bottom scroll arrow
    var scrollOverlayBot = plotChart.append("g")
        .attr("class", "scroll-area-bot")
        //.attr("transform", translate_scroll_area_bot);
    // the scroll arrow
    scrollOverlayBot.append("path")
        .attr("d", lineFunction(arrowDataBot))
        .attr("class", 'scroll-arrow')
        .attr("stroke", 'rgba(0,0,0,.2)')
//        .style("stroke-linecap", 'round')
//        .style("stroke-linejoin", 'round')
    // the clickable rectangular area that actually triggers scrolling, slightly larger than arrow and transparent
    scrollOverlayBot.append("rect")
        .attr("width", 2*arrowWidth+2*arrowPad)
        .attr("height", arrowHeight+2*arrowPad+arrowEdgePad)
        .attr("fill", 'rgba(255,255,255,0.0)')  // == 'transparent'
        //.attr("transform", 'translate('+(-arrowPad)+','+(-arrowPad)+')')
        .on("click", function () { scroll_plot(scrollStep); } )
        .on("mouseover", on_mouseover_scroll_down)
        .on("mouseout", on_mouseout_scroll_down)
//        .on({"click": on_click_scroll_down, "mouseover": on_mouseover_scroll_down, "mouseout": on_mouseout_scroll_down}); //okay this syntax doesn't work with d3v4?

    var scrollOverlayTop = plotChart.append("g")
        .attr("class", "scroll-area-top")
        //.attr("transform", translate_scroll_area_top);
    // the scroll arrow
    scrollOverlayTop.append("path")
        .attr("d", lineFunction(arrowDataTop))
        .attr("class", 'scroll-arrow')
        .attr("stroke", 'rgba(0,0,0,.2)')
//        .style("stroke-linecap", 'round')
//        .style("stroke-linejoin", 'round')
    // the clickable rectangular area that actually triggers scrolling, slightly larger than arrow and transparent
    scrollOverlayTop.append("rect")
        .attr("width", 2*arrowWidth+2*arrowPad)
        .attr("height", arrowHeight+2*arrowPad+arrowEdgePad)
        .attr("fill", 'rgba(255,255,255,0.0)')  // == 'transparent'
        //.attr("transform", 'translate('+(-arrowPad)+','+(-arrowPad-arrowEdgePad)+')')
        .on("click", function () { scroll_plot(-scrollStep); } )
        .on("mouseover", on_mouseover_scroll_up)
        .on("mouseout", on_mouseout_scroll_up);


    //selection.on("wheel", func) doesn't have access to wheel direction?
    //$('#d3-plot')[0]
    document.getElementById('d3-plot')
        .addEventListener("wheel", on_wheel_plotchart, {passive:true});


    d3.select(window).on('resize.updatesvg', update_window_resize);  //function called on global window resize
    update_window_resize();
}

function update_window_resize() {
    var plotRef = d3.select("#d3-plot");

    //###something wonky is happening in the CSS. I'm reading the body correctly, the whole body just resizes itself awkwardly on window resize
    //var svgRect = plotRef.node().getBoundingClientRect();
    //var grsdfjsdfjRect = document.getElementById('grsdfjsdfj').getBoundingClientRect();
    //svgHeight = svgRect.height;
    //svgWidth = svgRect.width;
    
    var headerText = d3.select('#header-text-income');
    var headerHeight = headerText.node().getBoundingClientRect().height;
    svgHeight = window.innerHeight - headerHeight - 4; //i think this -4 is from the margin:2 on the body?
    svgWidth = window.innerWidth * 0.3;  //map-style.css sets map width to 70%, so this is 30%. so sloppy###
    var plotWidth = svgWidth - spaceOnLeft - spaceOnRight;

    //manually size theheader
    headerText
        .style('width', svgWidth-spaceOnLeft-headerPadPixels); //headerPadPixels accounts for size distortion from styling

    plotRef.select('svg')
        .attr('width', svgWidth)
        .attr('height', svgHeight);

    //resize plotbars to new width and move text inside bar back to inside edge of bar
    x_scale.range([0, plotWidth]);
    plotRef.selectAll(".plot-bar")
        .attr("width", function(d) { return x_scale(d[1]); });
    plotRef.selectAll(".text-value")
        .attr("x", text_values_attr_x);

    //translate all the bars to correct row. Maybe could just be in initialization...
    // plotRef.selectAll(".plot-elems")
    //     .attr("transform", plot_elem_transform);

    //move the arrow buttons to top/bottom of svg space and recenter
    plotRef.select(".scroll-area-bot")
        .attr("transform", translate_scroll_area_bot);
    plotRef.select(".scroll-area-top")
        .attr("transform", translate_scroll_area_top);

    //y-axis doesn;t necesasrily need to resize on window resize, but seems reasonable to match new window size
    //y_scale = d3.scaleLinear().range([0, plotHeight]);
    plotRef.selectAll(".y-axis")
        .attr("transform", 'translate('+spaceOnLeft+','+spaceOnTop+')');
    
    //calculate max starting row/bar such that the last bar is at the bottom of the window: depends on how many bars are visible at once
    maxScrollRow = zipCount - Math.floor(svgHeight/(barHeight+gapBetweenBars));
}


function plot_elem_transform(datum, index) {
    var yPos = (index-scrollRow)*(barHeight+gapBetweenBars) + spaceOnTop;// + 0.25*barHeight;
    return 'translate('+spaceOnLeft+','+yPos+')';  //"translate(${spaceOnLeft}, ${yPos})";  //spaceOnLeft
}

function text_values_attr_x(d) {
    var v = this.textLength.baseVal.value;
    var textLengthPx = v>0 ? Math.ceil(v) : (this.textContent.length>0 ? this.textContent.length*6.0 : 40);
    var barLengthPx = x_scale(d[1]);

    return (textLengthPx+2 < barLengthPx) ? barLengthPx-2 : barLengthPx+textLengthPx+2; 
//    return Math.max(x_scale(d[1])-3, 12);  //min cap at 9 so values are always right of axis TODO use text width not 9
}

function translate_scroll_area_bot() {
    return 'translate('+(0.5*svgWidth-arrowWidth-arrowPad)+','+(svgHeight-arrowHeight-arrowPad-arrowEdgePad)+')';
}
function translate_scroll_area_top() {
    return 'translate('+(0.5*svgWidth-arrowWidth-arrowPad)+','+(arrowPad+arrowEdgePad)+')';
}

function scroll_plot(scrollDist) {
    if (scrollDist==0)
        return;
    //scroll down == +scrollStep
    if (scrollDist>0) {
        if (scrollRow == maxScrollRow)
            return;
        scrollRow = Math.min(scrollRow+scrollDist, maxScrollRow);
    }
    //scroll up == -scrollStep
    else {
        if (scrollRow == 0)
            return;
        scrollRow = Math.max(scrollRow+scrollDist, 0);
    }

    d3.selectAll('.plot-elems')
        .transition().duration(200)
            .attr("transform", plot_elem_transform);
}

// all these next mouse* functions are just to make the neat little highlight effect before scrolling
function on_mouseover_scroll_down() {
    d3.select(".scroll-area-bot").select('rect')
        .attr("width", svgWidth)
        //.attr("height", arrowHeight+2*arrowPad+arrowEdgePad)
        .attr("fill", 'rgba(255,255,255,0.1)')  // == 'transparent'
        .attr("transform", 'translate('+(-0.5*svgWidth+arrowWidth+arrowPad)+','+(-arrowPad)+')')
    d3.select(".scroll-area-bot").select('path')
        .attr("stroke", 'rgba(0,0,0,.5)');
}
function on_mouseout_scroll_down() {
    d3.select(".scroll-area-bot").select('rect')
        .attr("width", 2*arrowWidth+2*arrowPad)
        //.attr("height", arrowHeight+2*arrowPad+arrowEdgePad)
        .attr("fill", 'rgba(255,255,255,0.0)')
        .attr("transform", 'translate('+(-arrowPad)+','+(-arrowPad)+')')
    d3.select(".scroll-area-bot").select('path')
        .attr("stroke", 'rgba(0,0,0,.2)');
}
function on_mouseover_scroll_up() {
    d3.select(".scroll-area-top").select('rect')
        .attr("width", svgWidth)
        //.attr("height", arrowHeight+2*arrowPad+arrowEdgePad)
        .attr("fill", 'rgba(255,255,255,0.1)')  // == 'transparent'
        .attr("transform", 'translate('+(-0.5*svgWidth+arrowWidth+arrowPad)+','+(-arrowPad-arrowEdgePad)+')')
    d3.select(".scroll-area-top").select('path')
        .attr("stroke", 'rgba(0,0,0,.5)');
}
function on_mouseout_scroll_up() {
    d3.select(".scroll-area-top").select('rect')
        .attr("width", 2*arrowWidth+2*arrowPad)
        //.attr("height", arrowHeight+2*arrowPad+arrowEdgePad)
        .attr("fill", 'rgba(255,255,255,0.0)')
        .attr("transform", 'translate('+(-arrowPad)+','+(-arrowPad-arrowEdgePad)+')')
    d3.select(".scroll-area-top").select('path')
        .attr("stroke", 'rgba(0,0,0,.2)');
}

//highlight plotbars on mouseover and highlight the corresponding zip on map. revert on mouseout
function on_mouseover_plotbar() {
    var selectedThing = d3.select(this);
    selectedThing.style("fill", '#693');
    var zipId = selectedThing.datum()[0];
    var activeOverlay = activeOverlays[0];
    var topLayer = leafletLayerMapping[zipId][activeOverlay];
    highlight_feature(topLayer);
}
function on_mouseout_plotbar() {
    var selectedThing = d3.select(this);
    selectedThing.style("fill", map_color(selectedThing.datum()[1]) );
    var zipId = selectedThing.datum()[0];
    var activeOverlay = activeOverlays[0];
    var topLayer = leafletLayerMapping[zipId][activeOverlay];
    reset_highlight(topLayer);
}

//clicking a plotbar selects the corresponding zip on map, zooms to it, and pops up some additional info
function on_click_plotbar() {
    var selectedThing = d3.select(this);
    var zipId = selectedThing.datum()[0];
    var activeOverlay = activeOverlays[0];
    var topLayer = leafletLayerMapping[zipId][activeOverlay];
    zoom_to_feature(topLayer);
}

//mousewheel scrolls through plot data (changes the subset visible on screen)
function on_wheel_plotchart(event) {
    console.log(event.wheelDelta, event.wheelDeltaY, event.deltaY);
    scroll_plot(Math.floor(-event.wheelDeltaY/100.0)*scrollStep);
}
 


function on_mousedown_header_income(e) {
    d3.select(this).style('border-style', 'inset');
}
function on_mouseup_header_income(e) {
    d3.select(this).style('border-style', 'outset');

    if (Math.abs(sortOption) == 1)
        sortOption = -2;
    else
        sortOption = -sortOption;
    
    prepare_data();
    var plotElems = d3.selectAll('.plot-elems');
    plotElems.data(plotData);
    
    plotElems.transition().duration(500)
        .attr("fill", function(d,i) { return map_color(d[1]); })
        .attr("width", function(d) { return x_scale(d[1]); })
        .attr('transform', plot_elem_transform);    
}
function on_mousedown_header_zip(e) {
    d3.select(this).style('border-style', 'inset');
}
function on_mouseup_header_zip(e) {
    d3.select(this).style('border-style', 'outset');

    if (Math.abs(sortOption) == 2)
        sortOption = 1;
    else
        sortOption = -sortOption;
    
    prepare_data();
    var plotElems = d3.selectAll('.plot-elems');
    plotElems.data(plotData);
    
    plotElems.transition().duration(500)
        .attr("fill", function(d,i) { return map_color(d[1]); })
        .attr("width", function(d) { return x_scale(d[1]); })
        .attr('transform', plot_elem_transform);    
}


//kinda moves an element to back, behind other elements at same level.
//Just pushes the element to the top of the list of stuff in its parent element (they get drawn in order, later stuff covers earlier stuff)
d3.selection.prototype.moveToBack = function() {
    return this.each(function() {
        this.parentNode.insertBefore(this, this.parentNode.firstChild);
    });
};