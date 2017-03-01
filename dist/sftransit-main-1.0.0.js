/*! sftransit.js - v1.0.0 - 2017-03-01
* https://github.com/agaase/
* Copyright (c) 2017 agaase; Licensed MIT */
var MapRender = (function(){
    var timestamp, map, oldVehLocs, newVehLocs={}, vehicleOnMap={},routesFilter=[], svgGlobal;

    var BaseMap = (function(){

        var width = parseInt(d3.select("#map").style("width")), height = window.innerHeight;

        var tiler = d3.tile()
            .size([width, window.innerHeight]);

        var projection = d3.geoMercator()
            .center([-122.4335457,37.7800564])
            .scale(220000);

        var zoom = d3.zoom()
                     .scaleExtent([1, 10])
                     .on("zoom", function(){
                        svgGlobal.style("transform", "translate(" + d3.event.transform.x + "px," + d3.event.transform.y + "px) scale(" + d3.event.transform.k + ")");
                     });

        var path = d3.geoPath()
            .projection(projection);

        svgGlobal = d3.select("#map").append("svg")
            .attr("width", "100%")
            .attr("height", height)
            .call(zoom);

        var baseMap = svgGlobal.append("g")
                        .attr("class","baseMap")
                        .on("click",function(){
                            clearRoutePaths();
                        });
        baseMap.selectAll("g")
            .data(tiler
              .scale(projection.scale() * 2 * Math.PI)
              .translate(projection([0, 0])))
              .enter().append("g")
                .each(function(d) {
                  var g = d3.select(this);
                  d3.json("https://tile.mapzen.com/mapzen/vector/v1/roads/" + d[2] + "/" + d[0] + "/" + d[1] + ".json?api_key=odes-9thVtDE", function(error, json) {
                    if (error) throw error;

                    g.selectAll("path")
                      .data(json.features.sort(function(a, b) { return a.properties.sort_key - b.properties.sort_key; }))
                    .enter().append("path")
                      .attr("class", function(d) { return d.properties.kind; })
                      .attr("d", path);
                  });
                });

        

        return {
            mapProjection : projection
        };
    })();

    /**Gets the route info from server **/
    var getRouteInfo = function(routeId,callback){
        if(localStorage.getItem(routeId) && false){
            callback(JSON.parse(localStorage.getItem(routeId)));
        }else{
            d3.xml("http://webservices.nextbus.com/service/publicXMLFeed?command=routeConfig&a=sf-muni&r="+routeId, function(error, data) {
                var pathPoints = [].map.call(data.querySelectorAll("path"), function(path) {
                var pts = [].map.call(path.querySelectorAll("point"),function(point){
                        return BaseMap.mapProjection([parseFloat(point.getAttribute("lon")), parseFloat(point.getAttribute("lat"))]);
                    });
                    return pts;
                });

                //Fetching info for all stops.
                var stops={};
                [].map.call(data.querySelectorAll("stop"),function(stop){
                    if(stop.getAttribute("lon"))
                    stops[stop.getAttribute("tag")] = [parseFloat(stop.getAttribute("lon")),parseFloat(stop.getAttribute("lat"))];
                });

                //Finding the inbound and outbound description
                var dirs = {};
                [].map.call(data.querySelectorAll("direction"),function(dir){
                    var tag = dir.getAttribute("tag").indexOf("_I_")>-1? "I" : "O";
                    dirs[tag] = {"title" : dir.getAttribute("title")};
                    var stopPts = [].map.call(dir.querySelectorAll("stop"),function(stop){
                        return stops[stop.getAttribute("tag")];
                    });
                    dirs[tag]["stops"] = stopPts;
                });

                //Routename
                var routeName;
                [].map.call(data.querySelectorAll("route"),function(route){
                    routeName = route.getAttribute("title");
                });

                var route = {
                    "pathPoints" : pathPoints,
                    "directions" : dirs,
                    "name" : routeName
                };
                localStorage.setItem(routeId,JSON.stringify(route));
                callback(route);
            });
        }
    };
    /**
    Renders vehicle positions on a map
    **/
    var renderVehicleMarkers = function(vehicles){
        var vehicleMarkers;
        if(d3.select(".vehicleMarkers").empty()){
            vehicleMarkers = svgGlobal.append("g")
                                      .attr("class","vehicleMarkers");
        }else{
            vehicleMarkers = d3.select(".vehicleMarkers");
        }
        for(var vehId in vehicles){
            var veh = vehicles[vehId];
            if(routesFilter.indexOf(veh.route) > -1 || !routesFilter.length){
                var coord = veh.coord;
                var xy = BaseMap.mapProjection(coord);
                var vehicleMarker = vehicleMarkers.append("svg:image")
                   .attr("xlink:href", "images/bus-icons/bus.png")
                   .attr("x", xy[0])
                   .attr("y", xy[1])
                   .attr("class","vehicleMarker")
                   .attr("width",  "16.8" )
                   .attr("height", "6")
                   .attr("transform-origin",(xy[0]+14)+" "+(xy[1]+5))
                   .style("transform","rotate("+(veh.heading+90)+"deg) ")
                   .attr("route",veh.route)
                   .attr("list",routesFilter.length ? "filtered" : "all")
                   .attr("route-dir",veh.dir)
                   .on("click",function(){
                        event.stopPropagation();
                        //Reverting the image for old marker
                        if(!d3.select(".vehicleMarker.selected").empty()){
                            var oldMarker = d3.select(".vehicleMarker.selected");
                            oldMarker
                              .classed("selected",false)
                              .attr("xlink:href", oldMarker.attr("list")  === "all" ? "images/bus-icons/bus.png" : "images/bus-icons/"+oldMarker.attr("route")+".png");
                        }
                        //Adding active image for selected marker
                        var vehicle = d3.select(this);
                        vehicle.classed("selected",true)
                               .attr("xlink:href", "images/bus-icons/bus-blue.png");

                        //route info
                        drawRouteInfo(event,vehicle.attr('route'),vehicle.attr("route-dir"));
                   });
                vehicleOnMap[vehId] = vehicleMarker;
            }
        }
    };

    /**
    * Shows info for every vehicle clicked
    **/
    var showInfo = function(event,routeName, routeDir){
          d3.select(".info").remove();
          d3.select("body")
            .append("div")
            .attr("class","info")
            .style("top", (event.pageY-5)+"px")
            .style("left",(event.pageX-5)+"px")
            .on("mouseout", function(){
                d3.select(".info").transition().duration(400).style("opacity", 0).remove(); 
            })
            .html("<div class='name'>"+routeName + "</div><div class='dir'>" +routeDir+"</div>");
    };

    /** Drawing the route **/
    var drawRouteInfo = function(event,routeId,routeDir){
        getRouteInfo(routeId, function(routeInfo) {
            clearRoutePaths();
            var line = d3.line()
                .x(function(d) { return d[0]; })
                .y(function(d) { return d[1]; });

            var routePaths = svgGlobal.append("g")
                                     .attr("class","routePaths");

            routePaths.selectAll(".routePath")
                      .data(routeInfo.pathPoints)
                      .enter().append("path")
                      .attr("class", "routePath")
                      .attr("d", line);

            showInfo(event,routeInfo["name"],routeInfo["directions"][routeDir]["title"]);
            var stops = routeInfo["directions"][routeDir]["stops"];
            routePaths.selectAll(".routeStop")
                      .data(stops)
                      .enter().append("circle")
                      .attr("class",function(d,i){return (i === (stops.length-1) ? "routeStop last" : "routeStop"); })
                      .attr("cx",function(d){return BaseMap.mapProjection(d)[0]; })
                      .attr("cy",function(d){return BaseMap.mapProjection(d)[1]; })
                      .attr("r",function(d,i){return (i === (stops.length-1) ? "6px" : "3px"); });
        });
    };

    /**
    * Clears all the route paths
    **/
    var clearRoutePaths  =function(){
        svgGlobal.select(".routePaths").remove();
        d3.select(".info").remove();
    };

    /**
    * Update vehicles based on route filters
    **/
    var updateRouteFilters = function(routes){
        clearRoutePaths();
        routesFilter = routes;
        for(var vehId in vehicleOnMap){
            if(routesFilter.indexOf(vehicleOnMap[vehId].attr("route")) === -1 && routes.length){
                vehicleOnMap[vehId].classed("hidden",true);
            }else{
                vehicleOnMap[vehId].classed("hidden",false);
                vehicleOnMap[vehId].attr("list", routes.length ? "filtered"  : "all")
                                   .attr("xlink:href", routes.length ? ('images/bus-icons/'+vehicleOnMap[vehId].attr("route") + ".png")  : 'images/bus-icons/bus.png');
            }
        }
    };

    /**
    * This will update vehicle markers as per the new request 
    **/
    var updateVehicleMarkers = function(callback){
        var toAdd = {};
        for(var vehId in newVehLocs){
            if(vehicleOnMap[vehId]){
                if(oldVehLocs[vehId]){
                    if(newVehLocs[vehId].heading !== oldVehLocs[vehId].heading){
                        //rotating
                        vehicleOnMap[vehId].style("transform","rotate("+(newVehLocs[vehId].heading+90)+"deg)");
                    }
                    if(newVehLocs[vehId].coord.toString() !== oldVehLocs[vehId].coord.toString()){
                        //"moving the marker"
                        var xy = BaseMap.mapProjection(newVehLocs[vehId].coord);
                        vehicleOnMap[vehId]
                        .attr("transform-origin",(xy[0]+14)+" "+(xy[1]+5))
                        .transition()
                        .duration(1000)
                        .attr("x",xy[0])
                        .attr("y",xy[1]);
                    }
                }else{
                    //"adding the marker"
                    toAdd[vehId] = newVehLocs[vehId];
                }
            }
        }
        oldVehLocs = JSON.parse(JSON.stringify(newVehLocs));
        renderVehicleMarkers(toAdd);
    };

    /**
    * Just to query latest list of vehicles
    **/
    var queryForVehicles = function(callback){
        if(!timestamp){
            var date =  new Date();
            timestamp = new Date(date.getTime()+date.getTimezoneOffset()*60000-8*60*60000).getTime();
        }
        d3.xml("http://webservices.nextbus.com/service/publicXMLFeed?command=vehicleLocations&a=sf-muni&t="+timestamp)
            .get(function(error, data) {
                var vehicles = [];
                [].map.call(data.querySelectorAll("vehicle"), function(v) {
                    if(v.getAttribute("dirTag")){
                    //Only including vehicles which have a direction tag
                        vehicles.push({
                          id: v.getAttribute("id"),
                          speed : v.getAttribute("speedKmHr"),
                          heading : parseInt(v.getAttribute("heading")),
                          dir : v.getAttribute("dirTag").indexOf("_I_")>-1? "I" : "O",
                          leadV : parseFloat(v.getAttribute("leadingVehicleId")),
                          route : v.getAttribute("routeTag"),
                          coord : [parseFloat(v.getAttribute("lon")),parseFloat(v.getAttribute("lat"))]
                        });
                    }
                 });
                vehicles.forEach(function(d,i){
                    newVehLocs[d.id] = d;
                });
                timestamp = [].map.call(data.querySelectorAll("lastTime"), function(v) {
                    return {
                      time: v.getAttribute("time")
                    };
                  });
                timestamp = parseInt(timestamp[0].time);
                if(!oldVehLocs){
                    //Only the first time
                    oldVehLocs = JSON.parse(JSON.stringify(newVehLocs));    
                }
                callback(newVehLocs);
            });
    };

    return {
        renderVehicles : renderVehicleMarkers,
        queryVehicles : queryForVehicles,
        updateVehicles : updateVehicleMarkers,
        updateRouteFilters : updateRouteFilters
    };
})();

var sftransitApp = angular.module('sftransitApp', []);

sftransitApp.controller('MenuController', function sftransitController($scope,$http,$timeout) {
    var routesAll;
    $http.get('data/routes.json').then(function(response) {
        routesAll = response.data;
        $scope.routes = response.data;
        // $('#search').hideseek();
    });

    $scope.$watch('routeFilter', function(){
        if($scope.routeFilter && $scope.routeFilter.length){
            var filtered = [];
            routesAll.forEach(function(r,i){
                if(r.title.toLowerCase().indexOf($scope.routeFilter.toLowerCase()) >-1){
                    filtered.push(r);
                }
            });
            if(!filtered.length){
                //If no routes could be found, then insert a 'none' entry
                filtered.push({
                    "title" : "No routes found",
                    "tag" : "na"
                });
            }
            $scope.routes = filtered;
        }else{
            $scope.routes = routesAll;
        }

    });
    $scope.routesFiltered = {};

    $scope.timer = function(){
        var timeFormat = d3.timeFormat("%a, %-e %b %-I:%M:%S %p");
        var date = new Date();
        date = new Date(date.getTime()+date.getTimezoneOffset()*60000-8*60*60000);
        $scope.time = timeFormat(date);
        $timeout($scope.timer,1000);
    };
    $scope.timer();

    $scope.refresh = function(){
        MapRender.queryVehicles(function(vehicles){ MapRender.updateVehicles();});
        $timeout($scope.refresh,10000);
    };

    MapRender.queryVehicles(function(vehicles){
        MapRender.renderVehicles(vehicles);
        $timeout($scope.refresh,10000);
    });

    $scope.filterEvent = function(event){
        var route = d3.select(event.currentTarget);
        route.classed("selected",!route.classed("selected"));
        var tag = route.attr("data-id");
        if(tag !=="na"){
            var routeObj = {
                "title" : tag,
                "color" : route.attr("data-color")
            };
            if(!this.routesFiltered[tag]){
                this.routesFiltered[tag] = routeObj;
                MapRender.updateRouteFilters(Object.keys(this.routesFiltered));
            }
        }
    };
    $scope.removeRoute = function(event){
        var route = d3.select(event.currentTarget);
        var tag = route.attr("data-id");
        delete(this.routesFiltered[tag]);
        route.remove();
        MapRender.updateRouteFilters(Object.keys(this.routesFiltered));
    };
});

