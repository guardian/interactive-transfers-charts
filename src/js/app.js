
import loadJson from "../components/load-json"

import * as d3Scale from 'd3-scale'
import * as d3Array from 'd3-array'
import * as d3Axis from 'd3-axis'
import * as d3Collection from 'd3-collection'
import * as d3Format from 'd3-format'
// import * as d3Path from 'd3-path'
import * as d3Select from 'd3-selection'
import * as d3Shape from 'd3-shape'
import * as d3Transition from 'd3-transition'
import * as d3Request from 'd3-request'
import * as d3Time from 'd3-time'

const d3 = Object.assign({}, d3Scale, d3Array, d3Axis, d3Collection, d3Format, d3Scale, d3Select, d3Shape, d3Transition, d3Request, d3Time);

const formatNumber = d3.format(".0f"),
    formatBillion = function(x) { return "£"+formatNumber(x / 1e9) + "bn"; },
    formatMillion = function(x) { return "£"+formatNumber(x / 1e6) + "m"; },
    formatThousand = function(x) { return "£"+formatNumber(x / 1e3) + " thousand"; };

var tickDates = [ {startDate:  new Date("Dec 30 2016 00:00:00 GMT (GMT)"), endDate:  new Date("Jan 31 2017 00:00:00 GMT (GMT)")}, {startDate:  new Date("May 15 2017 00:00:00 GMT+0100 (BST)"), endDate:  new Date("Sep 30 2017 00:00:00 GMT+0100 (BST)")}, {startDate:  new Date("Dec 15 2017 00:00:00 GMT (GMT)"), endDate: new Date("Jan 31 2018 00:00:00 GMT (GMT)")} ]

// console.log(new Date("Dec 30 2016 00:00:00 GMT (GMT)").getTime())

// console.log(d3);

 Promise.all([
        loadJson(process.env.PATH + "/assets/data/transfers.json")
    ])
    .then((allData) => {

    	const data = allData[0].sheets.allDeals;

    	data.map((transfer) => {
	        if( !isNaN(transfer["Price in £"]) ){
	        	transfer.shortFee = Number(transfer["Price in £"] / 1000000);
	        	transfer.longFee = Number(transfer["Price in £"]);
	        }

	        if( isNaN(transfer["Price in £"]) ){
	        	transfer.shortFee = 0;
	        	transfer.longFee = 0;
	        }

	        let tempDateArr = transfer.Timestamp.split("/");
	        
	        let tempdateStamp = new Date(tempDateArr[1]+"/"+tempDateArr[0]+"/"+tempDateArr[2]);

	        if(!isNaN(tempdateStamp)){
	        	transfer.dateStamp = tempdateStamp;
	        	transfer.utcStamp = tempdateStamp.getTime();
	        	//console.log("WORKS ",transfer['Player name'],transfer.dateStamp)
	        }



	        if(isNaN(tempdateStamp)){
	        	console.log("ERROR", transfer['Player name'],transfer.Timestamp )
	        }

	    })


		var maxFee = d3.max(data, function(d) { return +d.longFee;} );
		var minDate = tickDates[0].startDate.getTime();
		var maxDate = tickDates[2].endDate.getTime();

    	const el = d3.select("#interactive-slot-1").append("div").classed("interactive-chart", true);
        const clientWidth = el.node().clientWidth;

        const width = clientWidth < 620 ? clientWidth : 720;
        const height = clientWidth < 620 ? 450 : 900;

        const chartMargin = {top: 0, bottom: 20, right:10, left: 10}

        const timeScale = d3.scaleLinear()
            .domain([minDate, maxDate])
            .range([0, width-chartMargin.right]);

        const yScale = d3.scaleLinear()
            .domain([0, maxFee])
            .range([height, 0])
            .clamp(true);

        const wrapper = el.append("div")
                .classed("line-wrapper", true);   
                
        wrapper.append("h3")
                .html("Chart title here")
                .classed("line-header", true);

            // wrapper.append("div")
            //     .html(text.filter(d => d.code === site.siteMeta["@SiteCode"])[0].text)
            //     .classed("line-desc", true)

            const svg = wrapper
                .append("svg")
                .attr("height", height + chartMargin.bottom)
                .attr("width", width)
                .classed("line-chart", true);

            const line = d3.line()
                .y(d => yScale(d))
                .x((d, i) => timeScale(i))
                .curve(d3.curveStepAfter);

            const xAxis = d3.axisBottom(timeScale)
                .tickValues([tickDates[0].startDate.getTime(), tickDates[0].endDate.getTime(), tickDates[1].startDate.getTime(), tickDates[1].endDate.getTime(), tickDates[2].startDate.getTime(), tickDates[2].endDate.getTime()]);

            const yAxis = d3.axisLeft(yScale)
                .tickSize(width)
                .ticks(4).tickFormat(formatAbbreviation);

            svg.append("g").classed("x-axis", true).call(xAxis).style("transform", "translateY(" + height + "px)")

            const yAxisEl = svg.append("g").classed("y-axis", true); 

            yAxisEl.call(yAxis)

            svg.selectAll(".domain").remove();
            svg.selectAll(".y-axis text").attr("x", 0).attr("dy", "-4").style("text-anchor", "start");
            svg.selectAll(".y-axis .tick:not(:first-of-type) line").attr("stroke", "#777").attr("stroke-dasharray", "2,2");
            svg.selectAll(".y-axis line").attr("x", 0).attr("x2", width)

            svg.select(".y-axis").append("line")
                .attr("x1", 0)
                .attr("x2", width)
                .attr("y1", height)
                .attr("y2", height)

            svg.select(".y-axis").append("line")
                .attr("x1", 0)
                .attr("x2", width)
                .attr("y1", 0)
                .attr("y2", 0)
                .classed("target-line", true)

            svg.selectAll(".x-axis .tick text")
                .text("")

            svg.selectAll(".x-axis .tick:first-of-type text")
                .text("Jan 2016").style("text-anchor", "start");

            svg.selectAll(".x-axis .tick:nth-child(3) text")
                .text("Summer 2017").style("text-anchor", "start");

            svg.selectAll(".x-axis .tick:nth-child(5) text")
                .text("Jan 2017").style("text-anchor", "start");

            svg.selectAll(".y-axis .tick:first-of-type")
                .style("display", "none");



           function formatAbbreviation(x) {
              var v = Math.abs(x);
              return (v >= .9995e9 ? formatBillion
                  : v >= .9995e6 ? formatMillion
                  : formatThousand)(x);
            }     
 })






