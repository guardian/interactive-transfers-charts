
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

import { scaleDiscontinuous, discontinuityRange } from 'd3fc-discontinuous-scale';

import {groupBy, sortByKeys, shuffle, compareValues, changeFirstObj, dedupe } from './libs/arrayUtils';

const d3 = Object.assign({}, d3Scale, d3Array, d3Axis, d3Collection, d3Format, d3Scale, d3Select, d3Shape, d3Transition, d3Request, d3Time);

const formatNumber = d3.format(".0f"),
    formatBillion = function(x) { return "£"+formatNumber(x / 1e9) + "bn"; },
    formatMillion = function(x) { return "£"+formatNumber(x / 1e6) + "m"; },
    formatThousand = function(x) { return "£"+formatNumber(x / 1e3) + " thousand"; 
};

const tickDates = [ {startDate:  new Date("Dec 20 2016 00:00:00 GMT (GMT)"), endDate:  new Date("Jan 31 2017 23:59:00 GMT (GMT)")}, {startDate:  new Date("May 15 2017 00:00:00 GMT+0100 (BST)"), endDate:  new Date("Sep 30 2017 00:00:00 GMT+0100 (BST)")}, {startDate:  new Date("Dec 15 2017 00:00:00 GMT (GMT)"), endDate: new Date("Jan 31 2018 00:00:00 GMT (GMT)")} ]
const windowClosureDates = [ {startDate: new Date("Feb 1 2017 00:01:00 GMT (GMT)"), endDate: new Date("May 14 2017 23:59:00 GMT (GMT)")}, {startDate:  new Date("Sep 1 2017 00:01:00 GMT+0100 (BST)"), endDate:  new Date("Dec 14 2017 23:59:00 GMT (GMT)")} ];


let prevScroll = 0;
let prevCutOff = 0;
let prevScrollDepth = 0;

const interactiveChartEl = d3.select("#interactive-slot-1").append("div").classed("interactive-chart", true);

const screenWidth = window.innerWidth;
const isMobile = screenWidth < 740;

const isiOS = document.body.classList.contains("ios");
const isAndroid = document.body.classList.contains("android");

const isApp = isiOS || isAndroid;
console.log(interactiveChartEl.node().clientWidth)
const clientWidth = interactiveChartEl.node().clientWidth;
const width = clientWidth < 620 ? clientWidth : 720;
const height = clientWidth < 620 ? 450 : 900;
const chartMargin = {top: 20, bottom: 20, right:10, left: 10}
const bigDealThreshold = clientWidth < 620 ? 59999999 : 39999999;
const elHeight = height;


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

                transfer.transferWindow = getTransferWindow(transfer.dateStamp); 
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

        // console.log(formatAbbreviation(grandTotalFee))
		var maxFee = grandTotalFee;
		var minDate = tickDates[0].startDate.getTime();
		var maxDate = tickDates[2].endDate.getTime();

        var closedStartsI = windowClosureDates[0].startDate.getTime();
        var closedEndsI = windowClosureDates[0].endDate.getTime();
        var closedStartsII = windowClosureDates[1].startDate.getTime();
        var closedEndsII = windowClosureDates[1].endDate.getTime();

        // var scale = scaleDiscontinuous(scaleLinear())
        //     .discontinuityProvider(discontinuityRange([50, 75]))
        //     .domain([0, 100])
        //     .range([0, 550]);

        const xScale = scaleDiscontinuous(d3.scaleLinear())
            .discontinuityProvider(discontinuityRange([closedStartsI, closedEndsI], [closedStartsII, closedEndsII]))
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

        const textWrapper = wrapper.append("div")
                .classed("chart-text",true) 
                
        textWrapper.append("div")
                .html("<div class='p-wrapper'><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.</p></div>")
                .classed("text-wrapper", true);        
        textWrapper.append("div")
                .html("<div class='p-wrapper'><p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. </p></div>")
                .classed("text-wrapper", true);      
        textWrapper.append("div")
                .html("<div class='p-wrapper'><p>Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus, omnis voluptas assumenda est, omnis dolor repellendus. Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae.</p></div>")
                .classed("text-wrapper", true);      
        textWrapper.append("div")
                .html("<div class='p-wrapper'><p>At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident, similique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum fuga. Et harum quidem rerum facilis est et expedita distinctio.</p></div>")
                .classed("text-wrapper", true);      


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

            // const transfersLineEl = chartGroup.append("path")
            //     .data([data])
            //     .style("stroke", "#fc0")
            //     .style("stroke-width", "1px")
            //     .style("fill", "none")
            //     .attr("id","transferLine")
            //     .attr("d", transfersLine); 
            
            var mask = svg.append("defs")
                 .append("mask")
                 .attr("id", "dashMaskLine");

             mask.append("path")
                .data([data])
                .attr("id", "transferMaskLine")
                .attr("d", transfersLine)
                .style("stroke", "white")
                .style("stroke-width", "3px");  

            const transfersLineElDashed = chartGroup.append("path")
                .data([data])
                .style("stroke", "#fc0")
                .style("stroke-width", "1px")
                .style("fill", "none")
                .attr("id", "transfersLineDashed")
                .attr("d", transfersLine)
                .style("stroke-dashoffset", "1px")
                .style("stroke-dasharray", "1481")
                .attr("mask","url(#dashMaskLine)");  

            document.querySelector("#hidden-svg path").setAttribute("d", transfersLine(data));

            const lineLength = document.querySelector("#hidden-svg path").getTotalLength();

            console.log("lineLength",lineLength)
            

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

            let teamsData = groupBy(data, 'What is the new club?');

            teamsData = sortByKeys(teamsData);
           
            teamsData.forEach((team) => {
                team.totalSpent = 0;
                
                team.objArr.map((player,i) => {
                    team.totalSpent += player.longFee;
                })

               
            });

            teamsData = teamsData.sort((a, b) => b.totalSpent - a.totalSpent);
            console.log(teamsData);


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

            function getTransferWindow(dateIn){
                var winStr;
                if(dateIn > tickDates[0].startDate && dateIn < tickDates[0].endDate){ winStr = "jan2017" }; 
                if(dateIn > tickDates[1].startDate && dateIn < tickDates[1].endDate){ winStr = "summer2017" }; 
                if(dateIn > tickDates[2].startDate && dateIn < tickDates[2].endDate){ winStr = "jan2018" }; 
                return winStr;
            }

            checkScroll(); 
            
            window.addEventListener("scroll", checkScroll);

            function checkScroll(){

                console.log("scroll check")
                let targetChartEl = document.querySelector(".interactive-chart");
                const scroll = window.pageYOffset;

                if (scroll !== prevScroll) {
                    const elOffset = targetChartEl.getBoundingClientRect().top + scroll;

                    if (!featureTest('position', 'sticky') && !featureTest('position', '-webkit-sticky')) {
                        const offset = targetChartEl.getBoundingClientRect().top + scroll;
                        
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

                            console.log(scroll, offset);
                        }

                        prevScroll = scroll;

                        const scrollToUse = scroll - elOffset;
                        const scrollDepth = 1.1*(scrollToUse / (elHeight - height));
                        
                        doScrollEvent();
                    } 

            }

            function doScrollEvent() {
                  const maskedLine = document.getElementById("transfersLineDashed");
                  const mask =  document.getElementById("transferMaskLine");
                  var length = maskedLine.getTotalLength();   
                  var scrollpercent = (document.body.scrollTop + document.documentElement.scrollTop) / (document.documentElement.scrollHeight - document.documentElement.clientHeight);
                  // Length to offset the dashes
                  var draw = length * scrollpercent;
                  // Reverse the drawing (when scrolling upwards)
                  maskedLine.style.strokeDashoffset = length - draw;

                  let endPoint = maskedLine.getPointAtLength(draw);
                  //USE THIS to show circles -- console.log("endPoint",endPoint)
            }

 })




