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

// function on_mousewheel_plotchart(event) {
//     on_click_scroll_down();
// }
// function on_scroll_plotchart(event) {
//     alert('scrolled!');
//}
function on_wheel_plotchart(event) {
    console.log(event.wheelDelta, event.wheelDeltaY, event.deltaY);
    scroll_plot(Math.floor(-event.wheelDeltaY/100.0)*scrollStep);
}

function add_d3_plot() {
    //assuming zipIncomeVals is already loaded...
    var plotObjs = [];
    for (var zipId in zipIncomeVals) {
        var intVal = +zipIncomeVals[zipId][keyToDisplay];
	    if (isNaN(intVal))
	        intVal = 0;
        plotObjs.push([zipId, intVal]);
    }
    zipCount = plotObjs.length;
    maxPlotVal = Math.max.apply(Math, plotObjs.map(function(obj) {return obj[1];}));  //finds max val in second col of plotObjs (max income)
    plotObjs.sort(function(a, b) { return a[1]<b[1] ? 1 : -1; });  //sorts plotObjs by second col (income, desc)

    //var divRect = d3.select("#d3-plot").node().getBoundingClientRect();
    var divRect = document.getElementById('d3-plot').getBoundingClientRect();
    svgWidth = divRect.width;
    svgHeight = divRect.height;
    var plotWidth = svgWidth - spaceOnLeft - spaceOnRight;
    var plotHeight = zipCount*(barHeight + gapBetweenBars) - gapBetweenBars;  //probably runs way below page

    //*_scale = a function that maps our data value in domain to pixels/position-on-screen value in range
    x_scale = d3.scaleLinear()
        .domain([0, maxPlotVal])
        .range([0, plotWidth]);

    //contains the whole right side/bar chart. fills right half of screen
    var plotChart = d3.select("#d3-plot")
        .attr("width", plotWidth)
        .attr("height", plotHeight);
        // .on("mousewheel", on_mousewheel_plotchart)
        // .on("scoll", on_scroll_plotchart)
        // .on("wheel", on_wheel_plotchart);

    //selection.on("wheel", func) doesn't have access to wheel direction?
    //$('#d3-plot')[0]
    document.getElementById('d3-plot')
        .addEventListener("wheel", on_wheel_plotchart, {passive:true});
        // .on("scoll", on_scroll_plotchart)
        // .on("wheel", on_wheel_plotchart);

    //a group to contain all movable elements in the bar plot for resizing and scrolling
    var plotBars = plotChart.selectAll("g")
        .data(plotObjs)   //data here
        .enter().append("g")
            .attr("class", 'plot-elems')
            //.attr("transform", plot_elem_transform);

    //the colorful data bars
    plotBars.append("rect")
        .attr("class", 'plot-bar')
        .attr("fill", function(d,i) { return map_color(d[1]); })
        .attr("width", function(d) { return x_scale(d[1]); })
        .attr("height", barHeight)
        .on("mouseover", on_mouseover_plotbar)
        .on("mouseout", on_mouseout_plotbar)
        .on("click", on_click_plotbar);

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
        .attr("x", function(d) { return - labelEndToRectStart; })
        .attr("y", barHeight / 2)
        .attr("dy", ".35em")
        .text(function(d,i) { return d[0]; });

    //y-axis line and ticks. this is the d3-v4 version: scale.linear -> scaleLinear, svg.axis->axisLeft
    y_scale = d3.scaleLinear().range([0, svgHeight]);
    plotChart.append("g")
        .attr("class", "y-axis")
        //.attr("transform", 'translate('+spaceOnLeft+','+gapBetweenBars+')')
        .call(d3.axisLeft(y_scale)
            .ticks(plotWidth/(barHeight+gapBetweenBars))
            .tickSizeInner(1)
            .tickSizeOuter(0)
            .tickFormat("")
        );


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

    d3.select(window).on('resize.updatesvg', update_window_resize);  //function called on global window resize
    update_window_resize();
}

function update_window_resize() {
    //don't do anything if plot not added yet
    // if (!x_scale)
    //     return;

    var plotRef = d3.select("#d3-plot");
    var svgRect = plotRef.node().getBoundingClientRect();
    svgHeight = svgRect.height;
    svgWidth = svgRect.width;
    var plotWidth = svgWidth - spaceOnLeft - spaceOnRight;
    x_scale.range([0, plotWidth]);
    plotRef.selectAll(".plot-bar")
        .attr("width", function(d) { return x_scale(d[1]); });
        
    plotRef.selectAll(".text-value")
        .attr("x", text_values_attr_x);

    //plotRef.selectAll(".plot-elems")
    plotRef.selectAll("g")
        .attr("transform", plot_elem_transform);
    //.attr("transform", 'translate('+spaceOnLeft+','+gapBetweenBars+')')

    plotRef.select(".scroll-area-bot")
        .attr("transform", translate_scroll_area_bot);
    plotRef.select(".scroll-area-top")
        .attr("transform", translate_scroll_area_top);
    
    plotRef.select(".y-axis")
        .attr("transform", 'translate('+spaceOnLeft+','+spaceOnTop+')');
    

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

function on_click_plotbar() {
    var selectedThing = d3.select(this);
    var zipId = selectedThing.datum()[0];
    var activeOverlay = activeOverlays[0];
    var topLayer = leafletLayerMapping[zipId][activeOverlay];
    zoom_to_feature(topLayer);
}


//kinda moves an element to back, behind other elements at same level.
//Just pushes the element to the top of the list of stuff in its parent element (they get drawn in order, later stuff covers earlier stuff)
d3.selection.prototype.moveToBack = function() {
    return this.each(function() {
        this.parentNode.insertBefore(this, this.parentNode.firstChild);
    });
};