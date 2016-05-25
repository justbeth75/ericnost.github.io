//global variables

var svg, zoomer, path, projection, width100, height100, expressed, colorize, color, csvname, yearKey, brush, firstTime = true;
var defaultColor = "#f7f7f7";
var exDefaultColor = "#969696"
var zoom = d3.behavior.zoom()
    .scaleExtent([1, 8])
    .on("zoom",zoomer);
var defaultStroke = {"stroke": "black", "stroke-width": .1} //{"stroke": "red", "stroke-width": ".5px"}
var u, b
var files =  {"race": "Race"}//, "publicassistance": "Public Assistance Levels", "otherincome": "Non-traditional Incomes", "occupancy": "Occupancy Rates"}
var format = d3.format(",.2%")  ;
var filterer = []
var time = "2014"
var siteData;
var viewCheck = false;

//begin script when window loads 
window.onload = initialize(); 

//the first function called once the html is loaded 
function initialize(){

  height100 = window.innerHeight
  width100 = window.innerWidth

  svg = d3.select("body").append("svg")
    .style({"height": height100, "width": width100, "position": "absolute"})


  //create map projection
  projection = d3.geo.mercator()
    .center([-90.091020, 29.967810])
    //.rotate([20, 0])  
    //.parallels([29, 31]) 
    .scale(100000) 
    .translate([width100 / 2, height100 / 2]); 

  function updateWindow(){
    x = window.innerWidth
    y = window.innerHeight
    svg.style({"width": x, "height": y});
  }
  window.onresize = updateWindow;

  path = d3.geo.path()
    .projection(projection);

  setData("race")
}

function setData(selectedCSV){
  csvname = selectedCSV
  queue() 
    .defer(d3.csv, "data/"+selectedCSV+"/1990.csv") //load attributes from csv 
    .defer(d3.csv, "data/"+selectedCSV+"/2000.csv") //load attributes from csv 
	.defer(d3.csv, "data/"+selectedCSV+"/2010.csv") //load attributes from csv
    .defer(d3.csv, "data/"+selectedCSV+"/2013.csv") //load attributes from csv
  	.defer(d3.csv, "data/"+selectedCSV+"/2014.csv") //load attributes from csv 
   // .defer(d3.csv, "data/"+selectedCSV+".2010.csv") //load attributes from csv 
   // .defer(d3.csv, "data/"+selectedCSV+".2013.csv") //load attributes from csv 
    .defer(d3.json, "blocks.json")
    .defer(d3.json, "riversLA.json") //load geometry from topojson
        .defer(d3.json, "water.json") //load geometry from topojson
    .await(callback); //trigger callback function once data is loaded 

//years = 1990. 2000. 2010, 2013 (acs 5 yr), 2014 (acs 5 yr)

  function callback(error, blocks1990, blocks2000, blocks2010, blocks2013, blocks2014, blocks, riversLA, water){
      //svg.call(zoom);

      //start with 2014
      expressed = d3.keys(blocks2014[0])[5] //white % of pop
      colorize = colorScale(blocks2014);

      //variables for csv to json data transfer
      var censusblocks = blocks.objects.blocks.geometries;
      
      var years = [blocks1990, blocks2000, blocks2010, blocks2013, blocks2014]
      escapade(blocks1990, blocks2000, blocks2010, blocks2013, blocks2014)
      //var yearKey = {"1990":blocks1990, "2000":blocks2000, "2014":blocks2014}
      var yearsArray = d3.keys(yearKey)

      //loop through csv to assign each csv values to json province
      for (var i=0; i<years.length; i++) {
      	for (var j=0; j<years[i].length; j++){
	        var block = years[i][j]; //the current block group row
	        if (i == 0 || i == 2 || i == 3){
	        var blockID = "1500000US"+block["Id"]
	        } else{var blockID = block["Id"];} //adm code
	        //loop through json provinces to find right province
        	for (var a=0; a<censusblocks.length; a++){
          		//where adm1 codes match, attach csv to json object
          		//console.log(blockID, censusblocks[a].properties.AFFGEOID)
          		if (censusblocks[a].properties.AFFGEOID == blockID){
            	// assign key/value pairs
            	censusblocks[a].properties[yearsArray[i]]={}

            	var keys = d3.keys(years[i][0])
            	keys = keys.filter(function(d){return d.indexOf("Margin")<0}) //get rid of margin estimates
            	keys = keys.filter(function(d){return d.indexOf("Id")<0}) //get rid of margin estimates
            	keys = keys.filter(function(d){return d.indexOf("Geography")<0}) //get rid of margin estimates


	            for (var n=0; n<keys.length; n++){
	              var attr = keys[n];
	              var val = parseFloat(block[attr]);
	              censusblocks[a].properties[yearsArray[i]][attr] = val;
	            };
	          break; //stop looking through the json provinces
	          };
      		}
        };
      };

    keys.splice(0,1)

    var tooltip = d3.tip()
    .attr('class', 'd3-tip')
    .offset([-50, 0])
    .html(function(d) { 
      return "<span style='color:white'> Census block: " + d.properties.GEOID + "<br>" +format(d.properties[time][expressed]/d.properties[time]["Estimate; Total:"])+" " + expressed.replace("Estimate; Total: - ", "") + "</span>";
    })

    svg.call(tooltip)


  
	//map
    var blocks = svg.selectAll(".blocks")
      .data(topojson.feature(blocks, blocks.objects.blocks).features)
      .enter() //create elements
      .append("g")
       .attr("class", "blocks") //assign class for additional styling
      .attr("id", function(d) { return d.properties.LSAD+d.properties.GEOID })
      .append("path") //append elements to svg
     

      .attr("d", path) //project data as geometry in svg
      .style({"fill": function(d) { //color enumeration units
        return choropleth(d, colorize);
      }, "fill-opacity": 1})
      .style(defaultStroke)
      .on("mouseover", function(d){if (d.properties[time][expressed]){highlight(d); tooltip.show(d)}})
      .on("mouseout", function(d){ dehighlight(d); tooltip.hide(d)})
      .on("click", function(d){
      	if (d.properties[time][expressed]){siteData = d; viewCheck = true; viewer(d)}
      })

    var rivers = svg.append("path")
        .datum(topojson.feature(riversLA, riversLA.objects.riversLA2))
        .attr("class", "rivers")
        .attr("d", path);
    var lakes = svg.append("path")
        .datum(topojson.feature(water, water.objects.lakes))
        .attr("class", "water")
        .attr("d", path);
    var ocean = svg.append("path")
        .datum(topojson.feature(water, water.objects.ocean))
        .attr("class", "water")
        .attr("d", path);



//table selector
	svg.selectAll(".masterbackground")
      .data([0])
      .enter()
      .append("rect")
      .attr("class", "controlbackground")
      .attr("transform", "translate(" + 0 + "," + ((height100/8)-32) + ")")
      .attr("width", width100/10)
      .attr("height", height100/10)
      

    svg.selectAll(".master")
      .data(d3.keys(files))
      .enter()
      .append("rect")
      .attr("class", "selectorz")
      .style("fill", function (d){if (d == csvname){return "grey"}else{return "d3d3d3"}})
      .attr("width", 16)
      .attr("height", 16)
      .attr("y", function(d, i){return  (height100/8) + i*18 - 16}) 
      .attr("x", 5)
      .on('click', function(d){
        d3.selectAll(".blocks, rect, text").remove()
        setData(d)
      })

    svg.selectAll(".mastertext")
      .data(d3.keys(files))
       .enter()
       .append("text")
       .text(function(d){return files[d]})
       .attr("class", "selectorz")
       .attr("text-anchor", "right")
       .attr("y", function(d, i){return (height100/8) + i*18}) 
       .attr("x", 21) 
       .attr("font-size", "12px")
       .attr("fill", "white")
       .on('click', function(d){
         d3.selectAll(".blocks, rect, text").remove()
         filterer = []
         setData(d)
        })

    //title
    svg.selectAll(".title")
	  	.data([0])
	  	.enter()
	  	.append("rect")
	  	.attr("class", "controlbackground")
	  	.attr("width", width100)
	  	.attr("height", height100/20)
	  	.html("New Orleans Viewer")
	svg.selectAll(".titleText")
	  	.data(["New Orleans Viewer"])
	  	.enter()
	  	.append("text")
	  	.attr("id", "title")
   		.attr("transform", "translate(" + ((width100/2.25))+ "," + 35 + ")")
	  	.text(function(d){return d})
  
  legend()
  controls()
  timer()
  attributes(keys)
  }
}

function viewer (data){

	var width = width100/4
	var height = height100/5
	var margin = 35

	svg.selectAll("#viewerBG, #viewerclose, .line, .y, .e, .dot, #viewerTitle").remove()
	svg.selectAll("#viewerBG")
	 .data([0])
      .enter()
      .append("rect")
      .attr("class", "controlbackground")
      .attr("id", "viewerBG")
      .attr("transform", "translate(" + ((width100/6))+ "," + ((height100/1.5) - 40) + ")")
      .attr("width", width+margin*2)
      .attr("height", height)

    svg.selectAll("#viewerclose")
	 .data([0])
      .enter()
      .append("rect")
      .attr("id", "viewerclose")
      .attr("transform", "translate(" + ((width100/6)+8)+ "," + ((height100/1.5)-margin) + ")")
      .attr("width", 16)
      .attr("height", 16)
      .on('click', function(){
      	viewCheck = false
      	svg.selectAll("#viewerBG, #viewerclose, .line, .y, .e, .dot, #viewerTitle").remove()
      })


    //get data
   	//lookup census block over the years



   	var c=d3.keys(yearKey)
   	var push = []

   	for (n=0;n<c.length;n++){
   		var percentage = data.properties[c[n]][expressed] //? data.properties[c[n]][expressed] : data.properties[c[n]]["Population of one race: - White alone"] // this is a problem for 2000/2010?
   		console.log(percentage)
   		push.push({"date": new Date (c[n]), "percentage": (percentage/data.properties[c[n]]["Estimate; Total:"])*100})
   	}

    var r = [-margin, (10/24)*width - margin, (20/24)*width - margin, (23/24)*width - margin, width - margin]

	var x = d3.time.scale()
	 .domain(push.map(function(d){return d.date}))
     .range(r);

	var y = d3.scale.linear()
	    .range([height-margin*2, 0]);

	var xAxis = d3.svg.axis()
	    .scale(x)
	    .orient("bottom")
	    .tickValues(push.map(function(d){return d["date"]}))
	    .tickFormat(d3.time.format("%y"))

	var yAxis = d3.svg.axis()
	    .scale(y)
	    .orient("left");

	var line = d3.svg.line()
	    .x(function(d) { return x(d.date); })
	    .y(function(d) { return y(d.percentage); });

    y.domain(d3.extent(push, function(d) { return d.percentage; }));
 svg.append("g")
      .attr("class", "e axis")
      .attr("transform", "translate(" + ((width100/6)+margin*2)+ "," + ((height100/1.5)+150) + ")")
      .call(xAxis);

  svg.append("g")
      .attr("class", "y axis")
      .attr("transform", "translate(" + ((width100/6)+margin)+ "," + ((height100/1.5)) + ")")
      .call(yAxis)
    .append("text")
      .attr("transform", "rotate(-90)")
      .attr("transform", "translate(" + ((width100/6)+margin*2)+ "," + ((height100/1.5)+height) + ")")
     // .attr("y", height100/6)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .text("Percent (%)");

  svg.append("path")
      .datum(push)
      .attr("class", "line")
      .attr("transform", "translate(" + ((width100/6)+margin*2)+ "," + ((height100/1.5)) + ")")
      .attr("d", line);

   svg.selectAll(".dot")
    .data(push)
  		.enter().append("circle")
    .attr("class", "dot")
    .attr("transform", "translate(" + ((width100/6)+margin*2)+ "," + ((height100/1.5)) + ")")
    .attr("cx", line.x())
    .attr("cy", line.y())
    .attr("r", 3.5);

   svg.selectAll("#viewerTitle")
	 .data([expressed])
      .enter()
      .append("text")
      .attr("class", "label")
      .attr("id", "viewerTitle")
      .attr("transform", "translate(" + (((width100/6)+margin*2)-15)+ "," + ((height100/1.5)-15) + ")")
      .text(function(d){
      	d  = d.replace("Estimate; Total: -", "")
       	d  = d.replace("alone", "")
       	d = d.length > 50 ? d.slice(0,47)+"..." : d
       	return "Percent "+d+" over time in this neighborhood"
      })
}

function attributes(keys){
//attribute selector
	svg.selectAll("#attbackground")
      .data([0])
      .enter()
      .append("rect")
      .attr("class", "controlbackground")
      .attr("id", "attbackground")
      .attr("transform", "translate(" + 0 + "," + ((height100/3) - 40) + ")")
      .attr("width", width100/5)
      .attr("height", height100/5)

	svg.selectAll(".att").remove()
    svg.selectAll(".att")
      .data(keys)
      .enter()
      .append("rect")
      .attr("class", "selectorz att")
      .style("fill", function (d){if (d == expressed){return "grey"}else{return "d3d3d3"}})
      .attr("width", 16)
      .attr("height", 16)
      .attr("y", function(d, i){return  (height100/3) + i*18 - 16}) 
      .attr("x", 5)
      .on('click', function(d){
        filterer = []
         changeAttribute(d)
         if (viewCheck){viewer(siteData)}
         controls()
      })

    svg.selectAll(".attText").remove()
    svg.selectAll(".attText")
      .data(keys)
       .enter()
       .append("text")
       .text(function(d){
       	d  = d.replace("Estimate; Total: -", "")
       	d  = d.replace("alone", "")
       	d = d.length > 50 ? d.slice(0,47)+"..." : d
       	return d

       })
       .attr("class", "selectorz attText")
       .attr("text-anchor", "right")
       .attr("y", function(d, i){return height100/3 + i*18}) 
       .attr("x", 21) 
       .attr("font-size", "12px")
       .attr("fill", "white")
       .on('click', function(d){
        filterer = []
         changeAttribute(d)
         if (viewCheck){viewer(siteData)}
         controls()
        })

       
 }

function legend(){
  //legend
    x = color.copy()
    x.quantiles().unshift(0)


    svg.selectAll("#legbackground")
	svg.selectAll("#legbackground")
      .data([0])
      .enter()
      .append("rect")
      .attr("class", "controlbackground")
      .attr("id", "legbackground")
      .attr("transform", "translate(" + 0 + "," + ((height100/1.5) -32) + ")")
      .attr("width", width100/10)
      .attr("height", height100/10)

    svg.selectAll(".legrect").remove()
    svg.selectAll("legrect")
      .data(x.quantiles())
      .enter()
      .append("rect")
      .attr("class", "legrect")
      .style("fill", function(d){return colorize(d)})
      .attr("width", 16)
      .attr("height", 16)
      .attr("y", function(d, i){return  (height100/1.5) + i*16 - 16}) 
      .attr("x", 5) 


    svg.selectAll(".legtext").remove()
    svg.selectAll("legtext")
      .data(x.quantiles())
       .enter()
       .append("text")
       .text(function(d, i){
       		var z = typeof(x.quantiles()[i+1]) == "number" ? format(x.quantiles()[i+1]) : format(d3.max(color.domain()))
       		return format(d)+" - "+z
       }) //switch to data max
       .attr("class", "legtext")
       .attr("text-anchor", "right")
        .attr("y", function(d, i){return height100/1.5 + i*16}) 
        .attr("x", 21) 
       .attr("font-size", "12px")
       .attr("fill", "white")
 }

function controls (targets){
var margin = {top: 30, right: 25, bottom: 100, left: 25},
    width = width100 - margin.left - margin.right,
    height = height100/1.1
var circleScale = height /70
var x = d3.scale.linear()
    .domain([d3.min(color.domain()), d3.max(color.domain())])
    .range([margin.left, width])

//how to include max value, e.g. 100%?
d3.selectAll("#filterX, .filtercircles, .brush").remove()
var ex = targets ? targets : [d3.min(color.domain()), d3.max(color.domain())]
brush = d3.svg.brush()
    .x(x)
    .extent(ex)
    .on("brushstart", brushstart)
    .on("brush", brushmove)
    .on("brushend", brushend);

var arc = d3.svg.arc()
    .outerRadius(circleScale)
    .startAngle(0)
    .endAngle(function(d, i) { return i ? -Math.PI : Math.PI; });

svg.append("g")
    .attr("transform", "translate(" + margin.left + "," + 0 + ")");

svg.append("g")
    .attr("class", "x axis")
    .attr("id", "filterX")
    .attr("transform", "translate("+0+"," + (height + circleScale )+ ")")
    .call(d3.svg.axis().scale(x).orient("bottom").ticks(20).tickFormat(d3.format("%")));

var circle = svg.append("g").selectAll("circles")
    .data(color.domain())
  .enter().append("circle")
    .attr('class', "filtercircles")
    .attr("transform", function(d) { return "translate(" + x(d) + "," + height + ")"; })
    .attr("fill", function(d){return colorize(d)})
    .attr("r", circleScale);

var brushg = svg.append("g")
    .attr("class", "brush")
    .call(brush);

brushg.selectAll(".resize").append("path")
    .attr("transform", "translate(0," +  height + ")")
    .attr("d", arc);

brushstart();
brushmove();

function brushstart() {
  svg.classed("selecting", true);
}

function brushmove() {
  var s = brush.extent();
  circle.classed("selected", function(d) { return s[0] <= d && d <= s[1]; });
  filter(s)
}

function brushend() {
  svg.classed("selecting", !d3.event.target.empty());
}
}


function timer(){
//year legend here
var margin = {top: 30, right: 25, bottom: 100, left: 25},
    width = width100 - margin.left - margin.right,
    height = height100/1.1
  var r = [0, (10/24)*width, (20/24)*width, (23/24)*width, width]
var formatDate = d3.time.format("%y");
var array =d3.keys(yearKey)
var timeScale =  d3.scale.linear()
	.domain(array)
    .range(r);


// initial value
var brushT = d3.svg.brush()
  .x(timeScale)
  .extent([array[array.length-1],array[array.length-1]])
  .on("brush", brushedT)

var heightx = height100-40

svg.append("g")
  .attr("class", "x axis")
// put in middle of screen
  .attr("transform", "translate("+margin.left+"," + heightx+ ")")
// inroduce axis
.call(d3.svg.axis()
  .scale(timeScale)
  .orient("bottom")
  .tickFormat(function(d) {
    return d;
  })
  .tickSize(0)
  .tickPadding(12)
  .tickValues([timeScale.domain()[0], timeScale.domain()[1], timeScale.domain()[2],  timeScale.domain()[3],  timeScale.domain()[4]]))
  .select(".domain")
  .select(function() {
    return this.parentNode.appendChild(this.cloneNode(true));
  })
  .attr("class", "halo");

var slider = svg.append("g")
  .attr("class", "slider")
  .attr("transform", "translate("+margin.left+"," + heightx+ ")")
  .call(brushT);

slider.selectAll(".extent,.resize")
  .remove();

slider.select(".background")
.attr("transform", "translate("+0+"," +-15+ ")")
  .attr("height", 30);

var handle = slider.append("circle")
    .attr("class", "handle")
    .attr("transform", "translate(0," + 0 + ")")
    .attr("r", 9);

slider
  .call(brushT.event)

function brushedT() {
  var value = brushT.extent()[0];
  value = Number(value)
  var d0 = closest(value, array)
  brushT.extent([d0,d0])

  handle.attr("transform", "translate(" + timeScale(value) + ",0)");
  handle.select('text').text(value);

  
    var keys = d3.keys(yearKey[time][0])
	keys = keys.filter(function(d){return d.indexOf("Id")<=-1})
	keys = keys.filter(function(d){return d.indexOf("Geography")<=-1})
	keys = keys.filter(function(d){return d.indexOf("Margin")<=-1})
	keys.length > 10 ? keys.splice(10, keys.length-10) : keys = keys
	keys.splice(0,1)
    var index = keys.indexOf(expressed)

  time = d0

  
  //change expressed to White
  if (firstTime == false){
    var keys = d3.keys(yearKey[time][0])
	keys = keys.filter(function(d){return d.indexOf("Id")<=-1})
	keys = keys.filter(function(d){return d.indexOf("Geography")<=-1})
	keys = keys.filter(function(d){return d.indexOf("Margin")<=-1})
	keys.length > 10 ? keys.splice(10, keys.length-10) : keys = keys
	keys.splice(0,1)
	expressed = keys[index] //find currently expressed in new keys

  }
  
  changeAttribute(expressed)

  if (firstTime == true) {firstTime = false} else{attributes(keys);controls(brush.extent())}

  }
}

function changeAttribute(attribute, csvData){
  //change the expressed attribute
  expressed = attribute;
  colorize = colorScale(yearKey[time]);
  
  d3.selectAll(".att")
      .style("fill", function (d){if (d == expressed){return "grey"}else{return "d3d3d3"}})
  //recolor the map
  d3.selectAll(".blocks") //select every province
    .select("path")
    .style("fill", function(d) { //color enumeration units
      return choropleth(d, colorize); //->
    })
  legend()
}

function choropleth(d, colorize){

  //get data value
  var value = d.properties[time] ? colorize (d.properties[time][expressed]/d.properties[time]["Estimate; Total:"]) : "#ddd";
  value == undefined ? value = "#ddd" : value = value
  return value

};

function colorScale(csvData){

  //create quantile classes with color scale
  color = d3.scale.quantile() //designate quantile scale generator
    .range(['#edf8e9','#bae4b3','#74c476','#31a354','#006d2c']);
  
/*  var domainArray = [];
  for (var i in csvData){
    domainArray.push(Number(csvData[i][expressed]));
  };

*/
  
  //for equal-interval scale, use min and max expressed data values as domain
  // color.domain([
  //  d3.min(csvData, function(d) { return Number(d[expressed]); }),
  //  d3.max(csvData, function(d) { return Number(d[expressed]); })
  // ]);

  //for quantile scale, pass array of expressed values as domain
  color.domain(csvData.map(function(d){return d[expressed]/d["Estimate; Total:"]})); //this is where we calculate percentage....
  return color; //return the color scale generator
}


function filter(data) {
//return s[0] <= d && d <= s[1]; 
//do math to get range
 svg.selectAll('.blocks')
    .select('path')
    .style("fill", function(d){
      if (d.properties[time]){
      	if (d.properties[time][expressed]/d.properties[time]["Estimate; Total:"] <= data[0] || d.properties[time][expressed]/d.properties[time]["Estimate; Total:"] >= data[1]){return "#ddd"}else {return choropleth(d, colorize)}
      }
      else{
      	return "#ddd"
      } 
    })
}

function zoomer() {
  if (zoom.translate()[0] >-700 && zoom.translate()[0] < 200 && zoom.translate()[1] <500 && zoom.translate()[1] > -400){
  	svg.selectAll(".blocks, .rivers").attr("transform", "translate(" +  zoom.translate() + ")scale(" + zoom.scale() + ")")
      	.selectAll("path").style("stroke-width", .1 / zoom.scale() + "px" );
  }
 }

function highlight(data){
  svg.selectAll(".blocks")
    .select("path")
    .style('stroke', "yellow")
  svg.select("#"+data.properties.LSAD+data.properties.GEOID) 
    .select('path')
    //.transition().duration(500) 
    .style({"stroke": "black", 'cursor': 'pointer'})
}

function dehighlight(data){
  svg.selectAll(".blocks")
    .select("path")
    .style("stroke": "black")
};

function redraw (base){
  /*svg.selectAll("circle").sort(function (a, b) {
    if (a != base) return 0;               // a is not the hovered element, send "a" to the back
    else return 1;                             // a is the hovered element, bring "a" to the front
  });*/
}

var calcFlanneryRadius = function(x, max) {
  // Flannery Compensation formula as described here:
  //http://www.scribd.com/doc/33408233/SUG243-Cartography-Proportional-Symbol#scribd
  // log x * 0.57
  // anti log
  var flannery = 0.57;
  var log = Math.log(x);
  var r = log * flannery;
  r = Math.exp(r);
  return (r);
};

var radiusFlannery = function(x) {
  return flanneryScale(calcFlanneryRadius(x));
};

//helper function from http://stackoverflow.com/questions/8584902/get-closest-number-out-of-array
function closest (num, arr) {
    var curr = arr[0];
    var diff = Math.abs (num - curr);
    for (var val = 0; val < arr.length; val++) {
        var newdiff = Math.abs (num - arr[val]);
        if (newdiff < diff) {
            diff = newdiff;
            curr = arr[val];
        }
    }
    return curr;
}

function escapade (blocks1990, blocks2000, blocks2010, blocks2013, blocks2014){
	yearKey = {"1990":blocks1990, "2000":blocks2000, "2010": blocks2010, "2013": blocks2013, "2014":blocks2014}
}
