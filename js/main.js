//This the module for the menu. Also controls the refresh for the live locations.
var sftransitApp = angular.module('sftransitApp', []);

sftransitApp.controller('MenuController', function sftransitController($scope,$http,$timeout) {
    var routesAll;

    //Get all routes. Saved in a file locally.
    $http.get('data/routes.json').then(function(response) {
        routesAll = response.data;
        $scope.routes = response.data;
    });

    //Filtering the list based on search term.
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

    //The timer you see on the menu page.
    $scope.timer = function(){
        var timeFormat = d3.timeFormat("%a, %-e %b %-I:%M:%S %p");
        var date = new Date();
        date = new Date(date.getTime()+date.getTimezoneOffset()*60000-8*60*60000);
        $scope.time = timeFormat(date);
        $timeout($scope.timer,1000);
    };
    $scope.timer();

    //Refresh the locations.
    $scope.refresh = function(){
        MapRender.queryVehicles(function(vehicles){ MapRender.updateVehicles();});
        $timeout($scope.refresh,10000);
    };

    //The initial call for vehicle locations.
    MapRender.queryVehicles(function(vehicles){
        MapRender.renderVehicles(vehicles);
        $timeout($scope.refresh,10000);
    });

    //Adding the route to the filter list.
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
    //To remove a selected route
    $scope.removeRoute = function(event){
        var route = d3.select(event.currentTarget);
        var tag = route.attr("data-id");
        delete(this.routesFiltered[tag]);
        route.remove();
        MapRender.updateRouteFilters(Object.keys(this.routesFiltered));
    };
});


