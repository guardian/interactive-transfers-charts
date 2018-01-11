
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
    formatThousand = function(x) { return "£"+formatNumber(x / 1e3) + " thousand"; 
};

const tickDates = [ {startDate:  new Date("Nov 15 2016 00:00:00 GMT (GMT)"), endDate:  new Date("Jan 31 2017 00:00:00 GMT (GMT)")}, {startDate:  new Date("May 15 2017 00:00:00 GMT+0100 (BST)"), endDate:  new Date("Sep 30 2017 00:00:00 GMT+0100 (BST)")}, {startDate:  new Date("Dec 15 2017 00:00:00 GMT (GMT)"), endDate: new Date("Jan 31 2018 00:00:00 GMT (GMT)")} ]

let prevScroll = 0;
let prevCutOff = 0;
let prevScrollDepth = 0;

const interactiveChartEl = d3.select("#interactive-slot-1").append("div").classed("interactive-chart", true);

const screenWidth = window.innerWidth;
const isMobile = screenWidth < 740;

const isiOS = document.body.classList.contains("ios");
const isAndroid = document.body.classList.contains("android");

const isApp = isiOS || isAndroid;

const clientWidth = interactiveChartEl.node().clientWidth;
const width = clientWidth < 620 ? clientWidth : 720;
const height = clientWidth < 620 ? 450 : 900;
const chartMargin = {top: 20, bottom: 20, right:10, left: 10}
const bigDealThreshold = clientWidth < 620 ? 59999999 : 39999999;

const elHeight = (!isiOS) ? interactiveChartEl.clientHeight : interactiveChartEl.clientHeight - 96;


 Promise.all([
        loadJson(process.env.PATH + "/assets/data/transfers.json")
    ])
    .then((allData) => {

    	const data = allData[0].sheets.allDeals;

        let tempTotalFee = 0;

    	data.map((transfer,i) => {

            transfer.refNum = i;
            transfer.playerName = transfer['Player name'];


	        if( !isNaN(transfer["Price in £"]) ){
	        	transfer.shortFee = Number(transfer["Price in £"] / 1000000);
	        	transfer.longFee = Number(transfer["Price in £"]);                
	        }

	        if( isNaN(transfer["Price in £"]) ){
	        	transfer.shortFee = 0;
	        	transfer.longFee = 0;
	        }

            if(transfer.longFee > bigDealThreshold){
                transfer.bigDeal = true;
            }


            tempTotalFee += transfer.longFee;
            transfer.totalSpendAfterDeal = tempTotalFee;

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

         // Get an array of checkout values only
        var allFees = data.map(function(item) {
            return item.longFee;
        });

        // Sum the array's values from left to right
        var grandTotalFee = allFees.reduce(function(prev, curr) {
            return prev + curr;
        });


        console.log(formatAbbreviation(grandTotalFee))


		var maxFee = grandTotalFee;
		var minDate = tickDates[0].startDate.getTime();
		var maxDate = tickDates[2].endDate.getTime();

        const xScale = d3.scaleLinear()
            .domain([minDate, maxDate])
            .range([0, width-chartMargin.right]);

        const yScale = d3.scaleLinear()
            .domain([0, grandTotalFee])
            .range([height - chartMargin.top - chartMargin.bottom, 0])
            .clamp(true);

        const wrapper = interactiveChartEl.append("div")
                .classed("line-wrapper", true);   
                
        wrapper.append("h3")
                .html("Chart title here")
                .classed("line-header", true);

            // wrapper.append("div")
            //     .html(text.filter(d => d.code === site.siteMeta["@SiteCode"])[0].text)
            //     .classed("line-desc", true)

            const svg = wrapper
                .append("svg")
                .attr("height", height + chartMargin.bottom + chartMargin.top  )
                .attr("width", width)
                .classed("line-chart", true); 

            const svgEl = svg;

            const transfersLine = d3.line()
                .x(d => xScale(d.utcStamp))
                .y(d => yScale(d.totalSpendAfterDeal))
                .curve(d3.curveStepAfter);

            const transfersArea = d3.area()
                .x(d => xScale(d.utcStamp))
                .y0(height)
                .y1(d => yScale(d.totalSpendAfterDeal))
                .curve(d3.curveStepAfter);

            // const transfersLine = d3.line()
            //     .x(function(d) {console.log(d, "log"); return xScale(d.utcStamp)})
            //     .y(d => yScale(d.totalSpendAfterDeal))
            //     .curve(d3.curveStepAfter)



            const xAxis = d3.axisBottom(xScale)
                .tickValues([tickDates[0].startDate.getTime(), tickDates[0].endDate.getTime(), tickDates[1].startDate.getTime(), tickDates[1].endDate.getTime(), tickDates[2].startDate.getTime(), tickDates[2].endDate.getTime()]);

            const yAxis = d3.axisLeft(yScale)
                .tickSize(width)
                .ticks(4).tickFormat(formatAbbreviation);

            const chartGroup = svg.append("g").style("transform", "translateY(" + chartMargin.top + "px)")

            chartGroup.append("path")
                .data([data])
                .attr("class", "area")                                   
                .style("fill", "#f6f6f6")
                .attr("d", transfersArea);    

            chartGroup.append("g").classed("x-axis", true).call(xAxis).style("transform", "translateY(" + height + "px)")

            const yAxisEl = chartGroup.append("g").classed("y-axis", true); 

            yAxisEl.call(yAxis)

            chartGroup.selectAll(".domain").remove();
            chartGroup.selectAll(".y-axis text").attr("x", 0).attr("dy", "-4").style("text-anchor", "start").style("font-family","'Guardian Text Sans Web',sans-serif")
                            .style("font-size","13px")
                            .style("font-weight", "700" )
                            .style("fill", "#333");
            chartGroup.selectAll(".y-axis .tick:not(:first-of-type) line").attr("stroke", "#CCC").attr("stroke-width","1px").attr("stroke-dasharray", "1,2");
            chartGroup.selectAll(".y-axis line").attr("x", 0).attr("x2", width)

            chartGroup.select(".y-axis").append("line")
                .attr("x1", 0)
                .attr("x2", width)
                .attr("y1", height)
                .attr("y2", height)

            // chartGroup.select(".y-axis").append("line")
            //     .attr("x1", 0)
            //     .attr("x2", width)
            //     .attr("y1", 0)
            //     .attr("y2", 0)
            //     .classed("target-line", true)

            chartGroup.selectAll(".x-axis .tick text")
                .text("").style("font-family","'Guardian Text Sans Web',sans-serif")
                            .style("font-size","13px")
                            .style("font-weight", "700" )
                            .style("fill", "#333")

            chartGroup.selectAll(".x-axis .tick:first-of-type text")
                .text("Jan 2016").style("text-anchor", "start");

            chartGroup.selectAll(".x-axis .tick:nth-child(3) text")
                .text("Summer 2017").style("text-anchor", "start");

            chartGroup.selectAll(".x-axis .tick:nth-child(5) text")
                .text("Jan 2017").style("text-anchor", "start");

            chartGroup.selectAll(".y-axis .tick:first-of-type")
                .style("display", "none"); 

            const transfersLineEl = chartGroup.append("path")
                .data([data])
                .style("stroke", "#fc0")
                .style("stroke-width", "1px")
                .style("fill", "none")
                .attr("d", transfersLine);

            checkScroll(transfersLineEl, elHeight, lineLength, data, transfersLine, transfersLineElDashed, svg)

            const transfersLineElDashed = chartGroup.append("path")
                .data([data])
                .style("stroke", "#fc0")
                .style("stroke-width", "1px")
                .style("fill", "none")
                .attr("d", transfersLine)
                .style("stroke-dasharray", "2,2");

                data.forEach((d) => {
                    if (d.bigDeal) {
                        chartGroup.append("text")
                            .text(d.playerName)
                            .attr("x", xScale(d.utcStamp))
                            .attr("y", yScale(d.totalSpendAfterDeal))
                            .classed("country-label", true)
                            .style("text-anchor", "end")
                            .attr("dy", d.playerName === "Benjamin Mendy" ? -3 : 3 )
                            .attr("dx", -8)
                            .attr("id", "label_"+d.refNum)
                            .style("font-family","'Guardian Text Sans Web',sans-serif")
                            .style("font-size","12px")
                            .style("font-weight", "400" )
                            .style("fill", "#333")

                        chartGroup.append("circle")
                            .attr("cx", xScale(d.utcStamp))
                            .attr("cy", yScale(d.totalSpendAfterDeal))
                            .attr("r", 0)
                            .style("stroke", "#fc0")
                            .style("stroke-width", "1.5px")
                            .style("fill", "#fc0")
                            .transition()
                            .duration(2500)
                            .attr("r", 7)                            
                            .transition()
                            .duration(250)
                            .attr("r", 3)
                            .attr("id", "circ_"+d.refNum)
                    }
            });

            document.querySelector("#hidden-svg path").setAttribute("d", transfersLine(data));

            const lineLength = document.querySelector("#hidden-svg path").getTotalLength();

           function formatAbbreviation(x) {
              var v = Math.abs(x);
              return (v >= .9995e9 ? formatBillion
                  : v >= .9995e6 ? formatMillion
                  : formatThousand)(x);
            } 

            function featureTest(property, value, noPrefixes) {
                var prop = property + ':',
                    el = document.createElement('test'),
                    mStyle = el.style;

                if (!noPrefixes) {
                    mStyle.cssText = prop + ['-webkit-', '-moz-', '-ms-', '-o-', ''].join(value + ';' + prop) + value + ';';
                } else {
                    mStyle.cssText = prop + value;
                }
                return mStyle[property];
            } 

            var chartEl = document.querySelector(".interactive-chart");

            var scrollDepth, scrollToUse;


            function checkScroll(transfersLineEl, elHeight, lineLength, data, transfersLine, transfersLineElDashed, svg) {
               console.log("h2")
                window.requestAnimationFrame(() => {
                    const scroll = window.pageYOffset;
                    if (scroll !== prevScroll) {
                        const elOffset = chartEl.getBoundingClientRect().top + scroll;
                        if (!featureTest('position', 'sticky') && !featureTest('position', '-webkit-sticky')) {
                            const offset = chartEl.getBoundingClientRect().top + scroll;

                            if (offset + elHeight - window.innerHeight <= scroll) {
                                svgEl.style.position = "absolute";
                                svgEl.style.bottom = "0px";
                                svgEl.style.top = "auto";
                            } else if (offset <= scroll) {
                                svgEl.style.position = "fixed";
                                svgEl.style.bottom = "";
                                svgEl.style.top = "";
                            } else {
                                svgEl.style.position = "";
                            }
                        }

                        prevScroll = scroll;

                        scrollToUse = scroll - elOffset;
                        scrollDepth = 1.1*(scrollToUse / (elHeight - height));

                        doScrollEvent(transfersLineEl, elHeight, lineLength, data, transfersLine, transfersLineElDashed, svg);
                    }

                    checkScroll(transfersLineEl, elHeight, lineLength, data, transfersLine, transfersLineElDashed, svg);
                });
            }


            function doScrollEvent(transfersLineEl, elHeight, lineLength, data, transfersLine, transfersLineElDashed, svg) {
                        if (scrollDepth < 0) {
                            scrollDepth = 0
                        }

                        if (scrollDepth > 1) {
                            scrollDepth = 1;
                        }

                        if (scrollDepth < prevScrollDepth) {
                            return;
                        }

                        // console.log(scrollDepth)

                        const depthChange = Math.abs(scrollDepth - prevScrollDepth);
                        // console.log(healthcarePopulationData)
                        const cutOff = Math.min(165, Math.floor(data.length * scrollDepth));
                        console.log(data.length, cutOff)
                        console.log("PROBLEM HERE cutoff and scrollDepth generate NaN -- ", cutOff, Math.floor(data.length * scrollDepth))

                        transfersLineElDashed
                            .attr("d", transfersLine(data.filter((d, i) => i <= cutOff)))

                        transfersLineEl
                            .attr("d", transfersLine(data.filter((d, i) => { return Number(d.utcStamp) < tickDates[2].endDate.getTime() && i <= cutOff; })))
                            .transition().duration(2500 * depthChange).style("stroke-dashoffset", lineLength - (lineLength * scrollDepth))

                        // .transition().duration(2500 * depthChange).style("stroke-dashoffset", lineLength - (lineLength * scrollDepth))

                        // if (prevCutOff !== cutOff) {
                        //     try {
                        //         const yearBoundaries = [healthcarePopulationData[prevCutOff], healthcarePopulationData[cutOff]];
                        //         const newCountriesWithHealthcare = healthcareData.filter((d) => Number(d.start) > yearBoundaries[0].year && Number(d.start) <= yearBoundaries[1].year);

                                // if (newCountriesWithHealthcare.length > 0) {
                                //     newCountriesWithHealthcare.forEach((d) => {
                                //         let stack = stackData.find((e) => e.key === d.country);
                                     

                                //         if(d["mega-highlight"] === "yes") {
                                //             svg.append("circle")
                                //                 .attr("cx", xScale(Number(d.start)))
                                //                 .attr("cy", yScale(stack[0][1]))
                                //                 .attr("r", 0)
                                //                 .style("fill", "#69d1ca")
                                //                 .style("stroke", "none")
                                //                 .classed("pulsing", true)
                                //         }

                                //         if (d.highlight === "yes") {
                                //             svg.append("text")
                                //                 .text(d.country)
                                //                 .attr("x", xScale(Number(d.start)))
                                //                 .attr("y", yScale(stack[0][1]))
                                //                 .classed("country-label", true)
                                //                 .style("text-anchor", "end")
                                //                 .attr("dy", 3)
                                //                 .attr("dx", -8)
                                //                 .style("font-weight", (d["mega-highlight"] === "yes") ? "900" : "normal")
                                //                 .style("fill", (d["mega-highlight"] === "yes") ? "#000" : "#767676")

                                //             svg.append("circle")
                                //                 .attr("cx", xScale(Number(d.start)))
                                //                 .attr("cy", yScale(stack[0][1]))
                                //                 .attr("r", 0)
                                //                 .style("stroke", "#69d1ca")
                                //                 .style("stroke-width", "1.5px")
                                //                 .style("fill", (d["mega-highlight"] === "yes") ? "#69d1ca" : "#fff")
                                //                 .transition()
                                //                 .duration(250)
                                //                 .attr("r", 4)
                                //                 .transition()
                                //                 .duration(250)
                                //                 .attr("r", 3)
                                //         }

                                //         let fullData = healthcareData.filter((a) => stack.key === a.country)[0];

                                //         stack = stack.filter((a) => !(Number(fullData.start) > Number(a.data.year)));

                                        



                                //     });
                                // }
                        //     } catch (err) {
                        //         console.log(err)
                        //     }
                        // }

                        prevScrollDepth = scrollDepth;
                        prevCutOff = cutOff;
                    }

 })




