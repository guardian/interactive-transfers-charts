
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

const d3 = Object.assign({}, d3Scale, d3Array, d3Axis, d3Collection, d3Format, d3Scale, d3Select, d3Shape, d3Transition, d3Request, d3Time)

console.log(d3);

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
	        	//console.log("WORKS ",transfer['Player name'],transfer.utcStamp)
	        }

	        if(isNaN(tempdateStamp)){
	        	console.log("ERROR", transfer['Player name'],transfer.Timestamp )
	        }

	    })


		var maxFee = d3.max(data, function(d) { return +d.longFee;} );
		var minDate = d3.min(data, function(d) { return +d.utcStamp;} );
		var maxDate = d3.max(data, function(d) { return +d.utcStamp;} );

    	const el = d3.select("#interactive-slot-1").append("div").classed("interactive-chart", true);
        const clientWidth = el.node().clientWidth;

        const width = clientWidth < 620 ? clientWidth : 720;
        const height = clientWidth < 620 ? 450 : 900;

        const chartMargin = {top: 0, bottom: 20, right:0, left: 10}

        const timeScale = d3.scaleLinear()
            .domain([minDate, maxDate])
            .range([0, width]);

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
                .tickValues([minDate, maxDate]);

            const yAxis = d3.axisLeft(yScale)
                .ticks(0);

            svg.append("g").classed("x-axis", true).call(xAxis).style("transform", "translateY(" + height + "px)")

            const yAxisEl = svg.append("g").classed("y-axis", true); 

            yAxisEl.call(yAxis)

            svg.selectAll(".domain").remove();
            svg.selectAll(".y-axis text").attr("x", 0).attr("dy", "-4").style("text-anchor", "start");
            svg.selectAll(".y-axis line").attr("x", 0).attr("x2", "5")

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
                .text("Jun 1 2016")

            svg.selectAll(".x-axis .tick:last-of-type text")
                .text("31 Jan 2018")        
 })






