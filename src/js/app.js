import loadJson from "../components/load-json"
import Handlebars from 'handlebars/dist/handlebars'
//import paraTemplate from "./src/templates/para.html!text"

import paraItem from '../templates/para.html'

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

const palette = { gu_sport: "#00b2ff", gu_sport_kicker: "#056da1", gu_sport_headline: "#1896d7", gu_sport_background: "#e6f5ff", dark_neutral: "#333", light_neutral: "#EFEFEF"}
const monthStrings = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const formatNumber = d3.format(".0f"),
    formatBillion = function(x) { return formatNumber(x / 1e9) + "bn"; },
    formatMillion = function(x) { return formatNumber(x / 1e6) + "m"; },
    formatThousand = function(x) { return formatNumber(x / 1e3) + " thousand"; 
};

const selectedLeagues = ["Premier League","La Liga","Ligue 1","Serie A","Bundesliga"];
const tickTextLabelsLong = ["January 2017","Summer 2017","January 2018"];
const tickTextLabelsShort = ["Jan 2017","Summer 2017","Jan 2018"];
const tickDates = [ {startDate:  new Date("Dec 10 2016 00:00:00 GMT (GMT)"), endDate:  new Date("Feb 01 2017 23:58:00 GMT (GMT)")}, {startDate:  new Date("May 15 2017 00:00:00 GMT+0100 (BST)"), endDate:  new Date("Oct 20 2017 00:00:00 GMT+0100 (BST)")}, {startDate:  new Date("Dec 15 2017 00:00:00 GMT (GMT)"), endDate: new Date("Jan 31 2018 00:00:00 GMT (GMT)")} ]
const windowClosureDates = [ {startDate: new Date("Feb 1 2017 23:59:00 GMT (GMT)"), endDate: new Date("May 14 2017 23:59:00 GMT (GMT)")}, {startDate:  new Date("Sep 1 2017 00:01:00 GMT+0100 (BST)"), endDate:  new Date("Dec 14 2017 23:59:00 GMT (GMT)")} ];

var minDate = tickDates[0].startDate.getTime();
var maxDate = tickDates[2].endDate.getTime();

var closedStartsI = windowClosureDates[0].startDate.getTime();
var closedEndsI = windowClosureDates[0].endDate.getTime();
var closedStartsII = windowClosureDates[1].startDate.getTime();
var closedEndsII = windowClosureDates[1].endDate.getTime();

let prevScroll = 0;
let prevCutOff = 0;
let prevScrollDepth = 0;

const interactiveChartEl = document.querySelector(".interactive-chart");

const svgContainerEl = d3.select(interactiveChartEl);

const screenWidth = window.innerWidth;
const isMobile = screenWidth < 740;

const isiOS = document.body.classList.contains("ios");
const isAndroid = document.body.classList.contains("android");

const isApp = isiOS || isAndroid;

const width = svgContainerEl.node().clientWidth;
const svgEl = interactiveChartEl.querySelector("svg");
const svgClientRect = svgEl.getBoundingClientRect();

const chartWidth = width;
const height = (!isiOS) ? svgClientRect.height - 36 : svgClientRect.height - 108;
const chartMargin = {top: 20, bottom: 20, right:10, left: 10}
const bigDealThreshold = chartWidth < 620 ? 49999999 : 49999999;
const elHeight = (!isiOS) ? interactiveChartEl.clientHeight : interactiveChartEl.clientHeight - 96;
const tickTextLabels = chartWidth < 620 ? tickTextLabelsShort : tickTextLabelsLong;

const maxSumFee = 300000000; //300m


const dateScale = scaleDiscontinuous(d3.scaleLinear())
           .discontinuityProvider(discontinuityRange([closedStartsI, closedEndsI], [closedStartsII, closedEndsII]))
            .domain([minDate, maxDate])
            .range([0, interactiveChartEl.offsetHeight]);

var prevDealPos = 0;



 Promise.all([
        loadJson(process.env.PATH + "/assets/data/transfers.json")
    ]).then((allData) => {

    	const data = allData[0].sheets.allDeals;

        let tempTotalFee = 0;

        let tempWinFee = 0;

        let parasObj = { objArr:[] };

        //var buyData = groupBy(data, 'What is the new club?');

    	data.map((transfer,i) => {
            let prevWindow ;
            if(i > 0 && data[i-1].transferWindow){
                prevWindow = data[i-1].transferWindow;
            }

            if(transfer['What is the new league?'] === selectedLeagues[0] || transfer['What is the new league?'] === selectedLeagues[1] ||transfer['What is the new league?'] === selectedLeagues[2] || transfer['What is the new league?'] === selectedLeagues[3] || transfer['What is the new league?'] === selectedLeagues[4]){
                transfer.transferBuyLeague = transfer['What is the new league?'];
                transfer.selectLeagueBuy = true;  
            }

            if(transfer['What was the previous league?'] === selectedLeagues[0] || transfer['What was the previous league?'] === selectedLeagues[1] ||transfer['What was the previous league?'] === selectedLeagues[2] || transfer['What was the previous league?'] === selectedLeagues[3] || transfer['What was the previous league?'] === selectedLeagues[4]){
                transfer.transferSellLeague = transfer['What was the previous league?'];
                transfer.selectLeagueSale = true; 
            }

            transfer.refNum = i;
            transfer.playerName = transfer['Player name'];


	        if( !isNaN(transfer["Price in £"]) ){
	        	transfer.shortFee = Number((transfer["Price in £"] / 1000000).toFixed(1));

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
                transfer.transferWindow = getTransferWindow(transfer.dateStamp); 

	        }
            if (transfer.transferWindow != prevWindow) { 
                tempWinFee = 0;
               
            }

            tempTotalFee += transfer.longFee;
            tempWinFee += transfer.longFee;
            transfer.totalSpendAfterDeal = tempTotalFee;
            transfer.totalWinSpend = tempWinFee;

	        if(isNaN(tempdateStamp)){
	        	console.log("ERROR", transfer['Player name'],transfer.Timestamp )
	        }

            if(transfer.longFee > bigDealThreshold  || transfer.playerName == "Corentin Tolisso"){
                transfer.bigDeal = true;
                transfer.newClub = transfer['What is the new club?'];
                transfer.prevClub = transfer['What was the previous club?'];
                transfer.dateVal = {day: transfer.dateStamp.getDay() , month: monthStrings[transfer.dateStamp.getMonth()],  year: transfer.dateStamp.getFullYear()}
                transfer.imgPath = process.env.PATH+'/assets/cutouts/'+transfer.refNum+'.png';
                transfer.dealPos = dateScale(transfer.utcStamp);
               if ((prevDealPos+220) > transfer.dealPos){
                    transfer.dealPos = prevDealPos+220;
                }
                prevDealPos = transfer.dealPos;
                // if(prevDealPos) {  }
                // 
                //var jsPath = process.env.PATH;
                parasObj.objArr.push(transfer);
            }
	    })
    
        var paraHTML = addParas(parasObj);

        document.querySelector(".chart-text").innerHTML = paraHTML;

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

        const xScale = scaleDiscontinuous(d3.scaleLinear())
            .discontinuityProvider(discontinuityRange([closedStartsI, closedEndsI], [closedStartsII, closedEndsII]))
            .domain([minDate, maxDate])
            .range([0, width-chartMargin.right]);

        const yScale = d3.scaleLinear()
            .domain([0, grandTotalFee])
            .range([height, 0])
            .clamp(true);

            const svgContainerEl = d3.select(".interactive-chart svg"); 

            const transfersLine = d3.line()
                .x(d => xScale(d.utcStamp))
                .y(d => yScale(d.totalSpendAfterDeal))
                .curve(d3.curveStepAfter);

            const transfersArea = d3.area()
                .x(d => xScale(d.utcStamp))
                .y0(height)
                .y1(d => yScale(d.totalSpendAfterDeal))
                .curve(d3.curveStepAfter);

            const xAxis = d3.axisBottom(xScale).tickSize(0)
                .tickValues([tickDates[0].startDate.getTime(), tickDates[0].endDate.getTime(), tickDates[1].startDate.getTime(), tickDates[1].endDate.getTime(), tickDates[2].startDate.getTime(), tickDates[2].endDate.getTime()]);

            const yAxis = d3.axisLeft(yScale)
                .tickSize(width)
                .ticks(4).tickFormat(formatAbbreviation);

            const chartGroup = svgContainerEl.append("g").style("transform", "translateY(" + chartMargin.top + "px)")

            chartGroup.append("path")
                .data([data])
                .attr("class", "area")                                   
                .style("fill", palette.gu_sport_background)
                .attr("d", transfersArea);    


            const transfersLineElDashed = chartGroup.append("path")
                .data([data])
                .style("stroke", palette.gu_sport)
                .style("stroke-width", "1.5px")
                .style("fill", "none")
                .attr("id", "transfersLineDashed")
                .attr("d", transfersLine);

            chartGroup.append("g").classed("x-axis", true).call(xAxis).style("transform", "translateY(" + height + "px)")

            const yAxisEl = chartGroup.append("g").classed("y-axis", true); 

            yAxisEl.call(yAxis)

            chartGroup.selectAll(".domain").remove();
            chartGroup.selectAll(".y-axis text").attr("x", 0).attr("dy", "-4").style("text-anchor", "start").style("font-family","'Guardian Text Sans Web',sans-serif")
                .style("font-size","13px")
                .style("font-weight", "700" )
                .style("fill", "#333");

            chartGroup.selectAll(".y-axis .tick:not(:first-of-type) line").attr("stroke", "#dcdcdc").attr("stroke-width","1px").attr("stroke-dasharray", "1,1");
            chartGroup.selectAll(".y-axis line").attr("x", 0).attr("x2", width);

            chartGroup.select(".y-axis").append("line")
                .attr("x1", 0)
                .attr("x2", width)
                .attr("y1", height)
                .attr("y2", height);

            chartGroup.selectAll(".x-axis .tick text")
                .text("").style("font-family","'Guardian Text Sans Web',sans-serif")
                .style("font-size","13px")
                .style("font-weight", "700" )
                .attr("dy","15px")
                .attr("dx","6px")
                .style("fill", "#333")

            chartGroup.selectAll(".x-axis .tick:first-of-type text")
                .text(tickTextLabels[0]).style("text-anchor", "start");

            chartGroup.selectAll(".x-axis .tick:nth-child(3) text")
                .text(tickTextLabels[1]).style("text-anchor", "start");

            chartGroup.selectAll(".x-axis .tick:nth-child(5) text")
                .text(tickTextLabels[2]).style("text-anchor", "start");

            chartGroup.selectAll(".y-axis .tick:first-of-type")
                .style("display", "none"); 
            
            var mask = svgContainerEl.append("defs")
                 .append("mask")
                 .attr("id", "dashMaskLine");

             mask.append("path")
                .data([data])
                .attr("id", "transferMaskLine")
                .attr("d", transfersLine)
                .style("stroke", "white")
                .style("stroke-width", "5px")                
                .style("stroke-dasharray", "2,2");

            chartGroup.select(".y-axis").append("line")
                .attr("class", "closedBar")
                .attr("x1", xScale(tickDates[0].endDate.getTime()) +6)
                .attr("x2", xScale(tickDates[0].endDate.getTime()) +6)
                .attr("y1", -6)
                .attr("y2", height+2)
                .style("stroke-width", "10px") 
                .style("stroke","#FFF");

            chartGroup.select(".y-axis").append("line")
                .attr("class", "closedBar")
                .attr("x1", xScale(tickDates[1].endDate.getTime()) +6)
                .attr("x2", xScale(tickDates[1].endDate.getTime()) +6)
                .attr("y1", -6)
                .attr("y2", height+2)
                .style("stroke-width", "10px") 
                .style("stroke","#FFF");

            document.querySelector("#hidden-svg path").setAttribute("d", transfersLine(data));

            const lineLength = document.querySelector("#transfersLineDashed").getTotalLength();

            // console.log("lineLength",lineLength)
            
            data.forEach((d) => {
                    if (d.bigDeal) {
                        
                        var circ = chartGroup.append("circle")
                            .attr("cx", xScale(d.utcStamp))
                            .attr("cy", yScale(d.totalSpendAfterDeal))
                            .attr("r", 0)
                            .style("stroke", palette.gu_sport)
                            .style("stroke-width", "1.5px")
                            .style("fill", palette.gu_sport)                            
                            .transition()
                            .duration(2500)
                            .attr("r", 7)                            
                            .transition()
                            .duration(250)
                            .attr("r", 3)
                            .attr("id", "circ_"+d.refNum)
                            .attr("class","chart-hl-circle hidden")
                            

                        chartGroup.append("text")
                            .text(d.playerName)
                            .attr("x", xScale(d.utcStamp))
                            .attr("y", yScale(d.totalSpendAfterDeal))
                            .classed("country-label hidden", true)
                            .style("text-anchor", "end")
                            .attr("dy", d.playerName === "Benjamin Mendy" ? -3 : 3 )
                            .attr("dx", -8)
                            .attr("id", "label_"+d.refNum)
                            .style("font-family","'Guardian Text Sans Web',sans-serif")
                            .style("font-size","12px")
                            .style("font-weight", "400" )
                            .style("fill", "#333")
                    }
            });

            
             //setBarChartData(data);

            // setWindowAreaData(data);


           var twoWeeks = 1000 * 60 * 60 * 24 * 14;

       
            function getTransferWindow(dateIn){
                var winStr;
                if(dateIn > tickDates[0].startDate && dateIn < tickDates[0].endDate){ winStr = "jan2017" }; 
                if(dateIn > tickDates[1].startDate && dateIn < tickDates[1].endDate){ winStr = "summer2017" }; 
                if(dateIn > tickDates[2].startDate && dateIn < tickDates[2].endDate){ winStr = "jan2018" }; 
                return winStr;
            }


             var windowData = data.filter(transfer => transfer.transferWindow);
  
                windowData = groupBy(windowData, 'transferWindow');

                windowData = sortByKeys(windowData);

                console.log(windowData)

                windowData.forEach((windo) => {
                    setBarChartData(windo.objArr, windo.sortOn)               
                });

            transfersLineElDashed
                .style("stroke-dasharray", lineLength)
                .style("stroke-dashoffset", lineLength);
            
            checkScroll(transfersLineElDashed, elHeight, lineLength, interactiveChartEl, svgContainerEl);
          

 })


function setBarChartData(data, ident){

            var sellData = data.filter(transfer => transfer.selectLeagueSale);
  
            sellData = groupBy(sellData, 'What was the previous club?');

            sellData = sortByKeys(sellData);
           
            sellData.forEach((team) => {
                team.totalSell = 0;          
                team.objArr.map((player,i) => {
                    team.totalSell += player.longFee;
                })               
            });

            sellData = sellData.sort((a, b) => b.totalSell - a.totalSell);

            sellData.forEach((team,i) => {
                team.sellRank = i+1;
                //if(team.sortOn == "Monaco"){ console.log(team); } 
            });

            
            // var buyData = data.filter(function(transfer) {
            //     return transfer.selectLeagueBuy = true;
            // });

            var buyData = data.filter(transfer => transfer.selectLeagueBuy);          

            buyData = groupBy(buyData, 'What is the new club?');

            buyData = sortByKeys(buyData);
           
            buyData.forEach((team) => {
                team.totalSpent = 0;               
                team.objArr.map((player,i) => {
                    team.totalSpent += player.longFee;   
                })
            });

            buyData = buyData.sort((a, b) => b.totalSpent - a.totalSpent);

            buyData.forEach((team,i) => { 
                team.buyRank = i+1; 
            });


            var allTransferData = [];

            allTransferData = buyData;

            console.log(buyData)

            allTransferData.forEach((team,i) => { 
                team.playersIn = team.objArr;

                 sellData.forEach((sellTeam) => {
                    if(sellTeam.sortOn === team.sortOn){
                        team.playersOut = sellTeam.objArr;
                        team.totalSell = sellTeam.totalSell;
                        team.sellRank = sellTeam.sellRank; 
                    }
                 })

                 team.transferBalance = team.totalSell - team.totalSpent;

                 if(isNaN(team.transferBalance)){ team.transferBalance = 0 }

            });          

            allTransferData = allTransferData.sort((a, b) => b.transferBalance - a.transferBalance);

            

            console.log("------------surpluses ---- "+ident);
            allTransferData.forEach((team,i) => { 
                team.balanceRank = i+1;
                if(i < 6){
                   console.log(team.sortOn+","+team.totalSpent+","+team.totalSell) 
                }
                


            })


            var tempArr = allTransferData.reverse();

            var bottomTenBalance = tempArr.slice(0, 10);

            //console.log(bottomTenBalance.length, bottomTenBalance);

            var topTenBuy = [], topTenDeficit = [], topTenSell = [], topTenSurplus = [];

            allTransferData.forEach((team,i) => { 

                    if(team.balanceRank < 6){ topTenDeficit.push(team)}
                    if(team.sellRank < 6){ topTenSell.push(team)}
                    if(team.buyRank < 6){ topTenBuy.push(team)}
            })


            console.log("------------deficits ---- "+ident);
            allTransferData.forEach((team,i) => { 
                team.balanceRank = i+1;
                if(i < 6){
                   console.log(team.sortOn+","+team.totalSpent+","+team.totalSell) 
                }
         

            })


            topTenDeficit = topTenDeficit.sort((a, b) => a.balanceRank - b.balanceRank);
            topTenSurplus = topTenDeficit.reverse();
            //topTenBuy = topTenBuy.sort((a, b) => a.buyRank - b.buyRank);
            //console.log("----------------------------"+ident+" top deficits-----  ");

            topTenDeficit.map((team) => {
                //console.log(team.sortOn+","+team.totalSpent+","+team.totalSell)
            })


            //console.log("----------------------------"+ident+" top surpluses")

            topTenSurplus.map((team) => {
                //console.log(team.sortOn+","+team.totalSpent+","+team.totalSell)
            })

            //stackedBarView(topTenBalance,"#interactive-slot-balance");

            //stackedBarView(bottomTenBalance,"#interactive-slot-spending")
            //topTenBuy,, topTenSell , "remove non relevant leagues"

}


function checkScroll(transfersLineElDashed, elHeight, lineLength, interactiveChartEl, svgContainerEl) {

    window.requestAnimationFrame(() => {
        const scroll = window.pageYOffset;

        if (!isApp && scroll !== prevScroll) {
            var elOffset = interactiveChartEl.getBoundingClientRect().top + scroll;
            if (!featureTest('position', 'sticky') && !featureTest('position', '-webkit-sticky')) {
                var scrollOffset = interactiveChartEl.getBoundingClientRect().top + scroll;

                if (scrollOffset + elHeight - window.innerHeight <= scroll) {
                    svgEl.style.position = "absolute";
                    svgEl.style.bottom = "0px";
                    svgEl.style.top = "auto";
                } else if (scrollOffset <= scroll) {
                    svgEl.style.position = "fixed";
                    svgEl.style.bottom = "";
                    svgEl.style.top = "";
                } else {
                    svgEl.style.position = "";
                }
            }

            prevScroll = scroll;

            var scrollToUse = scroll - elOffset;
            var scrollDepth = 1.1 * (scrollToUse / (elHeight - height));

            doScrollEvent(transfersLineElDashed, scrollDepth, lineLength, svgContainerEl);
        }

        if (isApp && scroll !== prevScroll) {
            var elOffset = interactiveChartEl.getBoundingClientRect().top + scroll; 
            var scrollOffset = interactiveChartEl.getBoundingClientRect().top + scroll;

                if (scrollOffset + elHeight - window.innerHeight <= scroll) {
                    svgEl.style.position = "absolute";
                    svgEl.style.bottom = "0px";
                    svgEl.style.top = "auto";
                } else if (scrollOffset <= scroll) {
                    svgEl.style.position = "fixed";
                    svgEl.style.bottom = "";
                    svgEl.style.top = !isiOS ? "" : "36px";
                } else {
                    svgEl.style.position = "";
                }
           

            prevScroll = scroll;

            var scrollToUse = scroll - elOffset;
            var scrollDepth = 1.1 * (scrollToUse / (elHeight - height)); 

            doScrollEvent(transfersLineElDashed, scrollDepth, lineLength, svgContainerEl);

        }

        checkScroll(transfersLineElDashed, elHeight, lineLength, interactiveChartEl, svgContainerEl);
    });
}



function doScrollEvent(transfersLineElDashed, scrollDepth, lineLength, svgContainerEl) {

    if (scrollDepth < 0) {
        scrollDepth = 0
    }

    if (scrollDepth > 1) {
        scrollDepth = 1;
    }

    prevScrollDepth = scrollDepth;

    
    const depthChange = Math.abs(scrollDepth - scrollDepth);


    var draw = lineLength - (scrollDepth * lineLength);

    var pt = transfersLineElDashed.node().getPointAtLength(lineLength - draw);

    checkCircles(pt, lineLength - draw)

    transfersLineElDashed
        .transition().duration(2500 * depthChange).style("stroke-dashoffset", draw)

     
}

function checkCircles(pt, draw){  

    var circlesArr = document.querySelectorAll(".interactive-chart svg circle");
    
    circlesArr.forEach((circle) => {
        var labelItem = document.querySelector(".interactive-chart svg #label_"+circle.id.split("_")[1]);

        if (Number(circle.getAttribute("cx") ) < pt.x ){
            circle.classList.remove('hidden');

            if(labelItem){
                labelItem.classList.remove("hidden");
            }
            
        }

        if (Number(circle.getAttribute("cx") ) > pt.x ){
            circle.classList.add('hidden');
            if(labelItem){
                labelItem.classList.add("hidden");
            }
        }

    })  



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



function formatAbbreviation(x) {
              var v = Math.abs(x);
              return (v >= .9995e9 ? formatBillion
                  : v >= .9995e6 ? formatMillion
                  : formatThousand)(x);
            } 




function stackedBarView(data, tgtSlot){

    data.map((team,i) => {
        team.tickLabel = team.sortOn;
        if (team.sortOn == "Borussia Dortmund"){
            team.tickLabel = "B Dortmund";
        }
        if (team.sortOn == "Bayer Leverkusen"){
            team.tickLabel = "B Leverkusen";
        }

        if (team.sortOn == "Manchester City"){
            team.tickLabel = "Man City";
        }
        if (team.sortOn == "Manchester United"){
            team.tickLabel = "Man Utd";
        }
        if (team.sortOn == "Paris Saint-Germain"){
            team.tickLabel = "PSG";
        }

        if (team.sortOn == "Bayern Munich"){
            team.tickLabel = "B Munich";
        }

        if (team.sortOn == "Crystal Palace"){
            team.tickLabel = "C Palace";
        }

    })


    var barChartHeight = 380;

    const barChartWidth = chartWidth < 620 ? chartWidth : 620;

    var barChartMargin = {top: 40, right: 0 , bottom: 80, left: 80}

    var x = d3.scaleLinear().range([0, barChartWidth - barChartMargin.left]);

    var y = d3.scaleBand().range([0, barChartHeight]).padding(0.5);

    x.domain([0, d3.max(data, function(d) { return d.totalSell })]);
    y.domain(data.map(function(d) { return d.tickLabel; }));
    
    var svg = d3.select(tgtSlot).append("svg")
        .attr("width", barChartWidth )
        .attr("height", barChartHeight + chartMargin.top + chartMargin.bottom)
      .append("g")
        //.attr("transform", "translate(" + chartMargin.left + "," + chartMargin.top + ")"); 

    const xAxis = d3.axisBottom(x)
        .tickSize(barChartHeight).ticks(4).tickFormat(formatAbbreviation);

    const yAxis = d3.axisLeft(y)
        .tickSize(0);

    var barHolder = svg.append("g").classed("bar-holder", true)
        .style("transform", "translateX(" + barChartMargin.left + "px)")

    barHolder.append("g").classed("bar-x-axis", true)
      //.attr("transform", "translate(0," + barChartHeight + ")")
      .call(xAxis); 

    barHolder.append("g").classed("bar-y-axis", true)
      .call(yAxis).selectAll("tick");

    barHolder.selectAll(".buybar")
      .data(data)
    .enter().append("rect")
      .attr("class", "buybar")
      .attr("x", 0 )
      .attr("width",  function(d) { return x(d.totalSpent); })
      .attr("y", function(d) { return y(d.tickLabel); })
      .attr("fill", palette.gu_sport)
      .attr("height", y.bandwidth()/2)
    
    barHolder.selectAll(".sellbar")
      .data(data)
    .enter().append("rect")
      .attr("class", "sellbar")
      .attr("x", 0 )
      .attr("width",  function(d) { return x(d.totalSell); })
      .attr("y", function(d) { return y(d.tickLabel) + y.bandwidth()/2; })
      .attr("fill",palette.dark_neutral)
      .attr("height", y.bandwidth()/2);

    barHolder.selectAll(".bar-x-axis .tick line").attr("stroke", "#dcdcdc").attr("stroke-width","1px");
    barHolder.selectAll(".bar-x-axis .tick:not(:first-of-type) line").attr("stroke", "#dcdcdc").attr("stroke-width","1px").attr("stroke-dasharray", "1,1");

    barHolder.selectAll(".bar-x-axis text").style("text-anchor", "start").style("font-family","'Guardian Text Sans Web',sans-serif")
                            .style("font-size","12px")
                            .style("font-weight", "700" )
                            .style("fill", "#333");

    barHolder.selectAll(".bar-y-axis text").attr("x", -80).attr("dy", 1).style("text-anchor", "start").style("font-family","'Guardian Text Sans Web',sans-serif")
                            .style("font-size","12px")
                            .style("font-weight", "700")
                            .style("fill", "#333");

    barHolder.selectAll(".bar-x-axis .tick:first-of-type text").text("0").style("text-anchor", "start");

    barHolder.selectAll(".domain").remove();

}


function setWindowAreaData(data){
    var winData = groupBy(data, 'transferWindow');

    console.log(winData);

    winData = sortByKeys(winData);
           
             winData.forEach((win, key) => {
                if(win.sortOn == "jan2017"){
                    addAreaChart(win, tickDates[0], "win1");
                }

                if(win.sortOn == "summer2017"){
                    addAreaChart(win, tickDates[1], "win2");
                }

                if(win.sortOn == "jan2018"){
                    addAreaChart(win, tickDates[2], "win3");
                }
                // team.totalSell = 0;          
                // team.objArr.map((player,i) => {
                //     team.totalSell += player.longFee;
                // })               
            });
}

function addAreaChart(winData, reqDates, tgt){
        var maxFee = 5000000000;
        var minWinDate = reqDates.startDate.getTime();
        var maxWinDate = reqDates.startDate.setMonth(reqDates.startDate.getMonth() + 5, 1);
        const containerEl = d3.select("#"+tgt);
        const svgContainerEl = d3.select("#"+tgt+" svg"); 



        console.log(reqDates.startDate.setMonth(reqDates.startDate.getMonth() + 4, 1))

        var smAreaSize = { "w": 420, "h": 140}

        const xScale = d3.scaleLinear()
            .domain([minWinDate, maxWinDate])
            .range([0, smAreaSize.w]);

        const yScale = d3.scaleLinear()
            .domain([0, maxFee])
            .range([smAreaSize.h - 20, 0])
            .clamp(true);

        const windowLine = d3.line()
            .x(d => xScale(d.utcStamp))
            .y(d => yScale(d.totalWinSpend))
            .curve(d3.curveStepAfter);

        const chartGroup = svgContainerEl.append("g");

        const dataViz = chartGroup.append("g").style("transform", "translateX(" + 30 + "px)")

        const winLineDraw = dataViz.append("path")
                .data([winData.objArr])
                .style("stroke", palette.gu_sport)
                .style("stroke-width", "1.5px")
                .style("fill", "none")
                .attr("id", "winLineDashed")
                .attr("d", windowLine);

        const windowArea = d3.area()
            .x(d => xScale(d.utcStamp))
            .y0(height)
            .y1(d => yScale(d.totalWinSpend))
            .curve(d3.curveStepAfter);

        dataViz.append("path")
                .data([winData.objArr])
                .attr("class", "area")                                   
                .style("fill", palette.gu_sport_background)
                .attr("d", windowArea);   

        const xAxis = d3.axisBottom(xScale).ticks(3);

        const yAxis = d3.axisLeft(yScale)
            .tickSize(width)
            .ticks(4).tickFormat(formatAbbreviation);

        chartGroup.append("g").classed("x-axis", true).call(xAxis).style("transform", "translateY(" + height + "px)")

        const yAxisEl = chartGroup.append("g").classed("y-axis", true); 

        yAxisEl.call(yAxis);


        chartGroup.selectAll(".domain").remove();

        chartGroup.selectAll(".y-axis text").attr("x", 0).attr("dy", "-4").style("text-anchor", "start").style("font-family","'Guardian Text Sans Web',sans-serif")
            .style("font-size","13px")
            .style("font-weight", "700" )
            .style("fill", "#333");

            chartGroup.selectAll(".y-axis .tick:not(:first-of-type) line").attr("stroke", "#dcdcdc").attr("stroke-width","1px").attr("stroke-dasharray", "1,1");
            chartGroup.selectAll(".y-axis line").attr("x", 0).attr("x2", width);

            chartGroup.select(".y-axis").append("line")
                .attr("x1", 0)
                .attr("x2", width)
                .attr("y1", height)
                .attr("y2", height);

            chartGroup.selectAll(".x-axis .tick text")
                .text("").style("font-family","'Guardian Text Sans Web',sans-serif")
                .style("font-size","13px")
                .style("font-weight", "700" )
                .attr("dy","15px")
                .attr("dx","6px")
                .style("fill", "#333")

            chartGroup.selectAll(".x-axis .tick:first-of-type text")
                .text(tickTextLabels[0]).style("text-anchor", "start");

            chartGroup.selectAll(".x-axis .tick:nth-child(3) text")
                .text(tickTextLabels[1]).style("text-anchor", "start");

            chartGroup.selectAll(".x-axis .tick:nth-child(5) text")
                .text(tickTextLabels[2]).style("text-anchor", "start");

            chartGroup.selectAll(".y-axis .tick:first-of-type")
                .style("display", "none"); 

        //     const transfersLine = d3.line()
        //         .x(d => xScale(d.utcStamp))
        //         .y(d => yScale(d.totalSpendAfterDeal))
        //         .curve(d3.curveStepAfter);

        //     const transfersArea = d3.area()
        //         .x(d => xScale(d.utcStamp))
        //         .y0(height)
        //         .y1(d => yScale(d.totalSpendAfterDeal))
        //         .curve(d3.curveStepAfter);

        //     const xAxis = d3.axisBottom(xScale).tickSize(0)
        //         .tickValues([tickDates[0].startDate.getTime(), tickDates[0].endDate.getTime(), tickDates[1].startDate.getTime(), tickDates[1].endDate.getTime(), tickDates[2].startDate.getTime(), tickDates[2].endDate.getTime()]);

        //     const yAxis = d3.axisLeft(yScale)
        //         .tickSize(width)
        //         .ticks(4).tickFormat(formatAbbreviation);
}

function addParas(dataIn){

    Handlebars.registerHelper('html_decoder', function(text) {
        var str = unescape(text).replace(/&amp;/g, '&');
        return str;
    });

    Handlebars.registerPartial({
        'paragraph': paraItem,

    });

    var content = Handlebars.compile(
        paraItem, {
            compat: true
        }
    );

    var newHTML = content(dataIn);

    return newHTML

}



