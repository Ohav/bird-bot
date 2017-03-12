var map = null;
var colors = ["CCCCCC", "BBBBBB", "AAAAAA", "999999", "888888", "777777", "666666"];
// Config
// Breakpoint in px (below breakpoint -> load static map, above breakpoint -> load dynamic map)
googleMapGenerator.options.breakpointDynamicMap = 0;
googleMapGenerator.options.mapLat = 32.08;
googleMapGenerator.options.mapLng = 34.80;
googleMapGenerator.options.mapZoom = 9;
googleMapGenerator.options.apiKey = null;
googleMapGenerator.options.markerIconType = 'numeric';
googleMapGenerator.options.markerIconHexBackground = 'ff6600';
googleMapGenerator.options.markerIconHexColor = '000000';
googleMapGenerator.options.hasPrint = false;

// googleMapGenerator.options.locations = [
// ['תומר טלגם: דוכיפת', 'תל אביב - יפו', 'נצפו להקה גדולה (4000+) של דוכיפת, בגובה של מעל קילומטר. ', 32.083121, 34.805366, 1],

// ['יוני דואן: חסידות', 'אשדוד', 'נצפתה להקה בינונית (בין 500 ל4000) של חסידות, בגובה נמוך של עד 100 מטרים. ', 31.783121, 34.655366, 2],

// ['עוז ניטצקי: עגור אפור', 'זכרון יעקב', 'נצפתה להקה קטנה (עד 500) של עגורים אפורים, בגובה של בין 100 ל500 מטרים. ', 32.583121, 34.940366, 3],

// ['עידן אברהמי: נץ קצר מקור', 'חיפה', 'נצפתה להקה בינונית (בין 500 ל4000) של נץ קצר מקור, בגובה של מעל קילומטר.', 32.779701, 34.963255, 4],

// ['עומר יובל: חסידות', 'לוד', 'נצפתה להקה קטנה (עד 500) של חסידות, בגובה בינוני של בין 100 ל500 מטרים.', 32.00944, 34.88278, 5],

// ['אוהב ברבי:    דוכיפת', 'ירושלים', 'נצפתה להקה גדולה (מעל 4000) של דוכיפת, בגובה נמוך של עד 100 מטרים.', 31.7964453, 35.2453988, 6, "http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=1|CCCCCC|000000"],
// ['אוהב ברבי:    דוכיפת', 'ירושלים', 'נצפתה להקה גדולה (מעל 4000) של דוכיפת, בגובה נמוך של עד 100 מטרים.', 31.7964453, 35.2463988, 6, "http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=2|BBBBBB|000000"],
// ['אוהב ברבי:    דוכיפת', 'ירושלים', 'נצפתה להקה גדולה (מעל 4000) של דוכיפת, בגובה נמוך של עד 100 מטרים.', 31.7964453, 35.2473988, 6, "http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=3|AAAAAA|000000"],
// ['אוהב ברבי:    דוכיפת', 'ירושלים', 'נצפתה להקה גדולה (מעל 4000) של דוכיפת, בגובה נמוך של עד 100 מטרים.', 31.7964453, 35.2483988, 6, "http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=4|999999|000000"],
// ['אוהב ברבי:    דוכיפת', 'ירושלים', 'נצפתה להקה גדולה (מעל 4000) של דוכיפת, בגובה נמוך של עד 100 מטרים.', 31.7964453, 35.2503988, 6],

// ];

var DB = {
        id : 0,
        Reporter_Name : 1,
        Locations : 2,
        Bird_Type: 3,
        Amount : 4,
        Height: 5,
        Flock_Id: 6,
        Area_Name: 7,
        Cred: 8,
        Unix_Time: 9
    };

var NormalIndex = {
        Display_Name : 0,
        Area_Name : 1,
        Description : 2,
        Lat: 3,
        Lng : 4,
        Flock_Id: 5,
        Unix_Time: 6,
        Cred: 7,
        Direction: 8,
        Marker: 9,
        Id: 10
    };

var Normal = {
        Display_Name : 0,
        Area_Name : 1,
        Description : 2,
        Lat: 3,
        Lng : 4,
        Flock_Id: 5,
        Unix_Time: 6,
        Cred: 7,
        Direction: 8,
        Marker: 9,
        Id: 10
    };

$.ajaxPrefilter( function (options) {
  if (options.crossDomain && jQuery.support.cors) {
    var http = (window.location.protocol === 'http:' ? 'http:' : 'https:');
    options.url = http + '//cors-anywhere.herokuapp.com/' + options.url;
    //options.url = "http://cors.corsproxy.io/url=" + options.url;
  }
});


var app = null;
googleMapGenerator.options.styles=[{featureType:"administrative",elementType:"all",stylers:[{hue:"#ffcc00"},{saturation:5},{lightness:-57},{visibility:"off"}]},{featureType:"administrative.country",elementType:"all",stylers:[{visibility:"on"}]},{featureType:"administrative.country",elementType:"geometry",stylers:[{weight:"0.40"}]},{featureType:"administrative.province",elementType:"all",stylers:[{hue:"#ff0000"},{lightness:100}]},{featureType:"administrative.locality",elementType:"labels",stylers:[{hue:"#ff0000"},{lightness:"-100"},{visibility:"on"}]},{featureType:"administrative.locality",elementType:"labels.text.stroke",stylers:[{weight:"0.01"}]},{featureType:"administrative.neighborhood",elementType:"all",stylers:[{hue:"#ff0000"},{lightness:100}]},{featureType:"administrative.land_parcel",elementType:"all",stylers:[{hue:"#ff0000"},{lightness:100}]},{featureType:"landscape",elementType:"geometry",stylers:[{hue:"#68ff00"},{saturation:-14},{lightness:-18},{visibility:"on"}]},{featureType:"landscape.man_made",elementType:"all",stylers:[{hue:"#66ff00"},{saturation:-6},{lightness:-9},{visibility:"on"}]},{featureType:"poi",elementType:"geometry",stylers:[{hue:"#ff8600"},{saturation:61},{lightness:-45},{visibility:"on"}]},{featureType:"poi.medical",elementType:"geometry",stylers:[{hue:"#cba923"},{saturation:50},{lightness:-46},{visibility:"on"}]},{featureType:"poi.park",elementType:"all",stylers:[{hue:"#8ba975"},{saturation:-46},{lightness:-28},{visibility:"on"}]},{featureType:"road",elementType:"geometry",stylers:[{hue:"#8d9b83"},{saturation:-89},{lightness:-12},{visibility:"on"}]},{featureType:"road.highway",elementType:"geometry",stylers:[{hue:"#d4dad0"},{saturation:-88},{lightness:54},{visibility:"simplified"}]},{featureType:"road.arterial",elementType:"geometry",stylers:[{hue:"#bdc5b6"},{saturation:-89},{lightness:-3},{visibility:"simplified"}]},{featureType:"road.local",elementType:"geometry",stylers:[{hue:"#bdc5b6"},{saturation:-89},{lightness:-26},{visibility:"on"}]},{featureType:"transit",elementType:"geometry",stylers:[{hue:"#ff2f00"},{saturation:74},{lightness:-51},{visibility:"on"}]},{featureType:"transit.line",elementType:"geometry",stylers:[{color:"#382d2b"}]},{featureType:"water",elementType:"geometry",stylers:[{hue:"#165c64"},{saturation:34},{lightness:-69},{visibility:"on"}]}];
// Init
$.get(
    'http://birdsbotdb.herokuapp.com/reports',
    function (responses) {
        //console.log("Got Responses > ", responses);
        var locations = []
        responses.forEach(function(response){
            Normal.Display_Name = response.reporterName  + " : " + response.birdType;
            Normal.Lat = response.location.lan;
            Normal.Lng = response.location.long;
            Normal.Flock_Id = response.flockId;
            Normal.Unix_Time = response.time;
            Normal.Area_Name = response.areaName;
            Normal.Cred = response.credibility;
            Normal.Direction = 45;
            Normal.Marker = null;
            Normal.Id = response._id;
            Normal.Description = "נצפתה להקת " + response.birdType + " בגודל של " + response.amount + " בגובה של כ-" + response.height + " <img src='" + response.img + "' />";
            var temp = [];
            for (var key in Normal) {
                temp.push(Normal[key])
            };
            locations.push(temp)
        });
        //console.log("Locations > ", locations)
        
        var counts = {} ;
        //console.log(getAllIndexes(locations, 1));
        googleMapGenerator.options.locations = locations;
        for(i = 0; i < googleMapGenerator.options.locations.length; i++)
        {
            id = googleMapGenerator.options.locations[i][NormalIndex.Flock_Id];
            counts[id] = counts[id] ? counts[id]+1 : 1;
            // if (counts[id] > 1)
            // {
            googleMapGenerator.options.locations[i][NormalIndex.Marker] = "http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=" + counts[id] + "|" + colors[Math.min(counts[id] - 1, colors.length - 1)] + "|000000"
            // }
        }
        
        //console.log("googleMapGenerator.options.locations > ", googleMapGenerator.options.locations)
        app = new googleMapGenerator();
});





var color = 888888;
var i = 5;
var lng = 35.2493988;

setInterval(function() {
    $.get(
    'http://birdsbotdb.herokuapp.com/reports',
    function (responses) {
        //console.log("Got new Responses > ", responses);
        var locations = []
        responses.forEach(function(response){
            Normal.Display_Name = response.reporterName  + " : " + response.birdType;
            Normal.Lat = response.location.lan;
            Normal.Lng = response.location.long;
            Normal.Flock_Id = response.flockId;
            Normal.Unix_Time = response.time;
            Normal.Area_Name = response.areaName;
            Normal.Cred = response.credibility;
            Normal.Direction = 45;
            Normal.Marker = null;
            Normal.Id = response._id;
            Normal.Description = "נצפתה להקת " + response.birdType + " בגודל של " + response.amount + " בגובה של כ-" + response.height + " <img src='" + response.img + "' />";
            var temp = [];
            
            for (var key in Normal) {
                temp.push(Normal[key])
            };
            locations.push(temp)
        });
        //console.log("Locations > ", locations)
        var mrkrs = [];
        locations.forEach(function(loc) {
            
            if (!app.hasId(loc[NormalIndex.Id])) {
                mrkrs.push(loc);
            }
            
        });
        mrkrs.forEach(function(data) {
                // console.log("converting mrkrs to array >>> " + data);
                googleMapGenerator.options.locations.push(data);
            });
        var counts = {} ;
            for(i = 0; i < googleMapGenerator.options.locations.length; i++)
            {
                id = googleMapGenerator.options.locations[i][NormalIndex.Flock_Id];
                counts[id] = counts[id] ? counts[id]+1 : 1;
                //if (counts[id] > 1)
                //{
                googleMapGenerator.options.locations[i][NormalIndex.Marker] = "http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=" + counts[id] + "|" + colors[Math.min(counts[id] - 1, colors.length - 1)] + "|000000"
                //}
            }
        
        app.addGoogleMarker(mrkrs);
        
    });
}, 10000);
