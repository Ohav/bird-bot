function googleMapGenerator(options) {

    "use strict";

    if (!(this instanceof googleMapGenerator)) {
        return new googleMapGenerator(options);
    }

    var settings = googleMapGenerator.options,
    container = document.querySelectorAll('.' + settings.containerClass)[0],
    frame,
    mapOptions;

    if (options) {
        settings = extend(googleMapGenerator.options, options);
    }

    var DataEnum = {
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

    init();

    /**
     *    Init
     *
     *    If above breakpoint on first load, load Google Maps JS then dynamic map
     *    If below breakpoint on first load, load static map
     *    If below breakpoint after click event of static map, load Google Maps JS then dynamic map
     */

     function init() {
        if (!hasGoogleMapsJS() && settings.docWidth >= settings.breakpointDynamicMap) {
            loadGoogleMapJs();
            return false;
        }

        if (settings.docWidth < settings.breakpointDynamicMap && settings.isStaticMap) {
            addGoogleMapStatic(settings.docWidth, settings.docWidth);
            eventsGoogleMapStatic();
        } else {
            addGoogleMapDynamic();
        }

        window.onresize = function () {
            onWindowResize();
        };
    }

    /**
     *    On Window Resize
     *
     *    If resizing above breakpoint, load Google Maps JS then dynamic map (if not already loaded)
     *    If resizing below breakpoint, resize map frame
     *    If resizing, center dynamic map
     */

     function onWindowResize() {
        var docWidthNew = document.body.clientWidth;

        if (settings.docWidth < settings.breakpointDynamicMap && docWidthNew >= settings.breakpointDynamicMap && !hasGoogleMapDynamic()) {
            loadGoogleMapJs();
        }

        if (settings.docWidth >= settings.breakpointDynamicMap && docWidthNew < settings.breakpointDynamicMap) {
            resizeGoogleMapFrame();
        }

        if (hasGoogleMapsJS()) {
            centerGoogleMapDynamic();
        }

        return settings.docWidth = docWidthNew;
    }

    /**
     *    Add Google Map (dynamic map)
     */

     function addGoogleMapDynamic() {
        // Reset to dynamic map settings
        settings.isStaticMap = false;
        settings.markerAnimation = google.maps.Animation.DROP;

        // Options
        mapOptions = {
            zoom: settings.mapZoom,
            center: new google.maps.LatLng(settings.mapLat, settings.mapLng),
            mapTypeControlOptions: {
                mapTypeIds: [google.maps.MapTypeId.ROADMAP, 'map_style', 'map_heatmap']
            }
        };

        // If map exists, overwrite existing map frame; else append map in new frame
        if (hasGoogleMap()) {
            frame = document.querySelectorAll('.' + settings.frameClass)[0];
            map = new google.maps.Map(frame, mapOptions);
        } else {
            var mapFrame = document.createElement('div');

            mapFrame.setAttribute('class', settings.frameClass);
            container.appendChild(mapFrame);
            map = new google.maps.Map(mapFrame, mapOptions);
        }

        // Legend
        if (settings.hasLegend) {
            addGoogleMapDynamicLegend();
        }

        // Style
        if (settings.styles) {
            addGoogleMapDynamicStyle();
        }

        // Markers
        if (settings.locations) {
            addGoogleMapDynamicMarkers();
        }

        // Print
        if (settings.hasPrint) {
            addGoogleMapDynamicPrintBtn();
        }

        var heatmapData = new Array()
        
        for (var j = 0; j < settings.locations.length; j++) {
                //mapLegend += '<li><span class="map__marker">' + getGoogleMapMarkerLabel(j) + '</span> <strong>' + settings.locations[j][0] + '</strong><br>' + settings.locations[j][1] + '</li>';
                //html: '<div><span class="map__title">' + location[DataEnum.Display_Name] + '</span><span class="map__address">' + location[DataEnum.Area_Name] + '</span><span class="map__description">' + location[DataEnum.Description] + '</span></div>'
                heatmapData.push(new google.maps.LatLng(settings.locations[j][DataEnum.Lat], settings.locations[j][DataEnum.Lng]));
            }
        // var heatmapData = [
        //     new google.maps.LatLng(37.785, -122.435)
        // ];

        var heatmap = new google.maps.visualization.HeatmapLayer({
            data: heatmapData
        });
        heatmap.setMap(map);


        return map;
    }

    /**
     *    Add Google Map Legend (dynamic map)
     *
     *    @returns    {Object} dynamic map legend
     */

     function addGoogleMapDynamicLegend() {
        var mapLegendOverlay = document.createElement('div');

        // Map footer
        if (!document.querySelectorAll('.' + settings.legendClass)[0]) {
            container.insertAdjacentHTML('beforeend', addGoogleMapStaticLegend());
        }

        // Map overlay
        mapLegendOverlay.setAttribute('class', settings.legendClass);
        container.appendChild(mapLegendOverlay);

        settings.legend = getChildByClass(container, settings.legendClass);

        return map.controls[google.maps.ControlPosition.RIGHT_TOP].push(settings.legend);
    }

    /**
     *    Add Google Map Legend (static map)
     *
     *    @returns    {String} static map legend
     */

     function addGoogleMapStaticLegend() {
        var mapLegend = '',
        mapMarkersLen = settings.locations.length;

        if (settings.hasLegend) {
            mapLegend += '<div class="' + settings.legendClass + '"><ul>';
            var ids = new Array()

            for (var j = 0; j < mapMarkersLen; j++) {
                //mapLegend += '<li><span class="map__marker">' + getGoogleMapMarkerLabel(j) + '</span> <strong>' + settings.locations[j][DataEnum.Display_Name] + '</strong><br>' + settings.locations[j][1] + '</li>';
                //html: '<div><span class="map__title">' + location[DataEnum.Display_Name] + '</span><span class="map__address">' + location[DataEnum.Area_Name] + '</span><span class="map__description">' + location[DataEnum.Description] + '</span></div>'

                if (ids.indexOf(parseInt(settings.locations[j][DataEnum.Flock_Id])) == -1) {
                    mapLegend += '<li><a href="#" style="text-decoration:none; color:inherit"><strong>' + settings.locations[j][DataEnum.Display_Name] + '</strong><br>' + settings.locations[j][1] + '</a></li>';
                    ids.push(parseInt(settings.locations[j][DataEnum.Flock_Id]))    
                }
                
            }

            mapLegend += '</ul></div>';
        }

        return mapLegend;
    }

    /**
     *    Add Google Map Style (dynamic map)
     *
     *    @returns    {Object} dynamic map style
     */

     function addGoogleMapDynamicStyle() {
        var styledMap = new google.maps.StyledMapType(settings.styles, {
            name: 'Styled Map',
            mapTypeId: google.maps.MapTypeId.SATELLITE
        });

        map.mapTypes.set('map_style', styledMap);

        return map.setMapTypeId('map_style');
    }

    /**
     *    Add Google Map Style (static map)
     *
     *    @returns {String} static map styles
     */

     function addGoogleMapStaticStyle() {
        var mapStyles = '',
        mapStylesLen = settings.styles.length;

        for (var i = 0; i < mapStylesLen; i++) {
            mapStyles += '&amp;style=feature:' + settings.styles[i].featureType + '%7Celement:' + settings.styles[i].elementType;

            for (var j = 0, stylersLen = settings.styles[i].stylers.length; j < stylersLen; j++) {
                var obj = settings.styles[i].stylers[j];

                for (var key in obj) {
                    // Static map requires colors in 0x000000 format so must replace hex symbol
                    var objKey = obj[key].toString().replace('#', '0x')

                    mapStyles += '%7C' + key + ':' + objKey;
                }
            }
        }

        return mapStyles;
    }

    function hasId(id)
    {
        for (var i = 0, locationsLen = settings.locations.length; i < locationsLen; i++) {
            if (id == settings.locations[i][DataEnum.Id]) {
                return true
            }
        }

        return false

    }

    /**
     *    Add Google Map markers (dynamic map)
     */

     function addGoogleMapDynamicMarkers() {
        var latestKnownScrollY = window.scrollY || document.documentElement.scrollTop,
        markers = [];

        // Google Maps API not fully initialised
        if (!hasGoogleMapsJS()) {
            return false;
        }

        // Markers already added
        if (settings.markersAdded) {
            return false;
        }

        // Markers to load on scroll and has not reached scroll target
        if (settings.markerLoad === 'scroll' && container.offsetTop > latestKnownScrollY) {
            return false;
        }

        // Is static map
        if (settings.isStaticMap === true) {
            return false;
        }

        if (settings.hasInfoWindow) {
            var infowindow = null;

            infowindow = new google.maps.InfoWindow({
                content: '',
                maxWidth: 240
            });
        }

        var ids = new Array()

        for (var i = 0, locationsLen = settings.locations.length; i < locationsLen; i++) {
            var location = settings.locations[i],
            myLatLng = new google.maps.LatLng(location[DataEnum.Lat], location[DataEnum.Lng]),
            marker;

            if (settings.hasMarkerIcon) {
                // If image URL, use icon; else default to Google Chart API marker
                if (location[DataEnum.Marker]) {
                    settings.markerIcon = {
                        url: location[DataEnum.Marker]
                    };
                } else {
                    //settings.markerIcon = 'http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=' + getGoogleMapMarkerLabel(i) + '|' + settings.markerIconHexBackground + '|' + settings.markerIconHexColor;
                    settings.markerIcon = 'https://upload.wikimedia.org/wikipedia/commons/c/c5/Map_marker_icon_%E2%80%93_Nicolas_Mollet_%E2%80%93_Birds_%E2%80%93_Nature_%E2%80%93_classic.png';
                }
            }
            

            marker = new google.maps.Marker({
                position: myLatLng,
                map: map,
                icon: settings.markerIcon,
                animation: settings.markerAnimation,
                title: location[DataEnum.Display_Name],
                html: '<div><span class="map__title">' + location[DataEnum.Display_Name] + '</span><span class="map__address">' + location[DataEnum.Area_Name] + '</span><span class="map__description">' + location[DataEnum.Description] + '</span></div>',
                zIndex: parseInt(location[DataEnum.Flock_Id])
            });

            markers.push(marker);

            if (settings.hasLegend) {
                var legendItem = document.createElement('div');

                legendItem.setAttribute('class', 'map__legend__item');
                //legendItem.innerHTML = '<strong>' + settings.markerIconLabel + '</strong>&nbsp;&nbsp;<a href="#">' + location[DataEnum.Display_Name] + '</a>';
                legendItem.innerHTML = '<a href="#">' + location[DataEnum.Display_Name] + '</a>';
                if (ids.indexOf(parseInt(location[DataEnum.Id])) == -1) {
                    settings.legend.appendChild(legendItem);
                    ids.push(parseInt(location[DataEnum.Flock_Id]))
                 }
            }
            //console.log("thiers > ", map, this, this.map);
            // console.log("thiers > ", map);

            if (settings.hasInfoWindow) {
                google.maps.event.addListener(marker, 'click', function() {                
                    infowindow.setContent("<br />" + this.html);
                    infowindow.open(map, this);
                });

                google.maps.event.addListener(map, 'click', function() {
                    infowindow.close(map, this);
                });
            }
        }
        // var markerCluster = new MarkerClusterer(map, markers,
        // {
        //     zoomOnClick: true,
        //     averageCenter: true,
        //     imagePath: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m'}
        //     );
        try {
            var markerCluster = new MarkerClusterer(map, markers,
            {
                zoomOnClick: true,
                averageCenter: true,
                imagePath: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m'
            });
        } catch(err) {
                console.log("erro message > ", err.message, err);
        }  

        if (settings.hasLegend) {

            var legendItems = document.querySelectorAll('.' + settings.legendClass + ' a'),
            legendItemsLen = legendItems.length;
            

            for (var i = 0; i < legendItemsLen; i++) {
                (function (index) {
                    legendItems[i].onclick = function(e) {
                        e.preventDefault();
                        google.maps.event.trigger(markers[index % (legendItemsLen / 2)], 'click');
                    }
                })(i);
            }
        }

        return settings.markersAdded = true;
    }

    function getLastUpdate(id)
    {
        for (var i = 0; i < settings.locations.length; i++)
        {

        }
    }

    function addGoogleMarker(markers) {        
        if (markers.length <= 0) {
            return
        }

        console.log("addGoogleMarker start got markers > ", markers);
        
        var ids = new Array();
        var mrkrss = []
        for (var i = 0; i < markers.length; i++)
        {
            var location = markers[i],
            myLatLng = new google.maps.LatLng(location[DataEnum.Lat], location[DataEnum.Lng]),
            marker;
            

            if (settings.hasMarkerIcon) {
                // If image URL, use icon; else default to Google Chart API marker
                if (location[DataEnum.Marker]) {
                    settings.markerIcon = {
                        url: location[DataEnum.Marker]
                    };
                } else {
                    //settings.markerIcon = 'http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=' + getGoogleMapMarkerLabel(i) + '|' + settings.markerIconHexBackground + '|' + settings.markerIconHexColor;
                    settings.markerIcon = 'https://upload.wikimedia.org/wikipedia/commons/c/c5/Map_marker_icon_%E2%80%93_Nicolas_Mollet_%E2%80%93_Birds_%E2%80%93_Nature_%E2%80%93_classic.png';
                }
            }

            marker = new google.maps.Marker({
                position: myLatLng,
                map: map,
                icon: settings.markerIcon,
                animation: settings.markerAnimation,
                title: location[DataEnum.Display_Name],
                html: '<div><span class="map__title">' + location[DataEnum.Display_Name] + '</span><span class="map__address">' + location[DataEnum.Area_Name] + '</span><span class="map__description">' + location[DataEnum.Description] + '</span></div>',
                zIndex: parseInt(location[DataEnum.Flock_Id])
            });

            //settings.locations.push(marker);
            try {
                if (settings.hasLegend) {
                    var legendItem = document.createElement('div');

                    legendItem.setAttribute('class', 'map__legend__item');
                    //legendItem.innerHTML = '<strong>' + settings.markerIconLabel + '</strong>&nbsp;&nbsp;<a href="#">' + location[DataEnum.Display_Name] + '</a>';
                    legendItem.innerHTML = '<a href="#">' + location[DataEnum.Display_Name] + '</a>';
                    if (ids.indexOf(parseInt(location[DataEnum.Flock_Id])) == -1) {
                        settings.legend.appendChild(legendItem);
                        ids.push(parseInt(location[DataEnum.Flock_Id]))
                    }
                }
                // console.log("ours > ", map, this, this.map);

                if (settings.hasInfoWindow) {
                    google.maps.event.addListener(marker, 'click', function() {                
                        infowindow.setContent("<br />" + this.html);
                        infowindow.open(map, this);
                    });

                    google.maps.event.addListener(map, 'click', function() {
                        infowindow.close(map, this);
                    });
                }
            }
            catch(err) {
                console.log("erro message > ", err.message, err);
            }
            

        }
        try {
            
            var heatmapData = new Array();
            for (var j = 0; j < settings.locations.length; j++) 
            {
                heatmapData.push(new google.maps.LatLng(settings.locations[j][DataEnum.Lat], settings.locations[j][DataEnum.Lng]));
            }

            var heatmap = new google.maps.visualization.HeatmapLayer({
                data: heatmapData
            });
            
            heatmap.setMap(map);
            
            var markerCluster = new MarkerClusterer(map, mrkrss,
            {
                zoomOnClick: true,
                averageCenter: true,
                imagePath: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m'
            });
        } catch(err) {
                console.log("erro message > ", err.message, err);
        }   

        if (settings.hasLegend) {

           var legendItems = document.querySelectorAll('.' + settings.legendClass + ' a'),
           legendItemsLen = legendItems.length;


           for (var i = 0; i < legendItemsLen; i++) {
               (function (index) {
                   legendItems[i].onclick = function(e) {
                       e.preventDefault();
                       console.log(index % (legendItemsLen / 2));
                       google.maps.event.trigger(markers[index % (legendItemsLen / 2)], 'click');
                   }
               })(i);
           }
       }



   }    

    /**
     *    Add Google Map markers (static map)
     *
     *    @returns    {String} Static map markers
     */

     function addGoogleMapStaticMarkers() {
        var mapMarkers = '',
        mapMarkersBackground = '',
        mapMarkersSize = 'size:' + settings.markerIconSize,
        mapMarkersLen = settings.locations.length;

        // Marker background color
        if (settings.markerIconHexBackground) {
            mapMarkersBackground = '%7Ccolor:0x' + settings.markerIconHexBackground;
        }

        for (var i = 0; i < mapMarkersLen; i++) {
            var markersLabel = '%7Clabel:' + getGoogleMapMarkerLabel(i),
            markersLocation = '%7C' + settings.locations[i][3] + ',' + settings.locations[i][4];

            // Static map API has a limitation where only 5 unique custom markers can be used
            // Therefore if more than 5 markers exist, use default marker to prevent inconsistency
            if (settings.hasMarkerIcon && location[DataEnum.Marker] && mapMarkersLen <= 5) {
                // To do - marker icon
            } else {
                mapMarkers += '&amp;markers=' + mapMarkersSize + mapMarkersBackground + markersLabel + markersLocation;
            }
        }

        return mapMarkers;
    }

    /**
     *    Add Google Map Print
     */

     function addGoogleMapDynamicPrintBtn() {
        var printBtn = document.createElement('a');

        printBtn.setAttribute('class', settings.printClass);
        printBtn.setAttribute('href', '#');
        printBtn.innerHTML = 'Print';
        container.appendChild(printBtn);

        settings.print = getChildByClass(container, settings.printClass);

        settings.print.onclick = function() {
            printGoogleMap();

            return false;
        }
    }

    /**
     *    Add static Google Map
     *
     *    @returns    {Object} update container with static Google Map image
     */

     function addGoogleMapStatic(width, height) {
        return container.innerHTML = generateGoogleMapStatic(width, height) + addGoogleMapStaticLegend();
    }

    /**
     *    Generate static Google Map
     *
     *    @returns    {String} static Google Map image
     */

     function generateGoogleMapStatic(width, height) {
        var width = width || 640,
        height = height || 640,
        mapApiKey = '',
        mapStatic = '',
        mapLegend = '',
        mapUrl = 'http://maps.googleapis.com/maps/api/staticmap?',
        mapLocation = 'center=' + settings.mapLat + ',' + settings.mapLng,
        mapSize = '&amp;size=' + width + 'x' + height,
        mapZoom = '&amp;zoom=' + settings.mapZoom,
        mapMarkers = '',
        mapStyles = '';

        // API key
        if (settings.key) {
            mapApiKey = '&amp;key=' + settings.key;
        }

        // Map styles
        if (settings.styles) {
            mapStyles = addGoogleMapStaticStyle();
        }

        // Map markers
        if (settings.locations) {
            mapMarkers = addGoogleMapStaticMarkers();
        }

        // Map
        mapStatic = '<div class="' + settings.frameClass + '"><img style="-webkit-user-select: none" src="' + mapUrl + mapLocation + mapZoom + mapApiKey + mapSize + mapMarkers + mapStyles + '"></div>';

        return mapStatic;
    }

    /**
     *    Google Map Static Events
     */

     function eventsGoogleMapStatic() {
        var mapFrame = document.querySelectorAll('.' + settings.frameClass)[0];

        mapFrame.onclick = function(e) {
            if (!hasGoogleMapDynamic()) {
                resizeGoogleMapFrame();
                loadGoogleMapJs();

                return false;
            }
        };
    }

    /**
     *    Has Google Map
     *
     *    @returns    {Boolean}
     */

     function hasGoogleMap() {
        return document.querySelectorAll('.' + settings.frameClass)[0]
    }

    /**
     *    Has dynamic Google Map
     *
     *    @returns    {Boolean}
     */

     function hasGoogleMapDynamic() {
        return document.querySelectorAll('.' + settings.mapDynamicClass)[0]
    }

    /**
     *    Resize static Google Map
     *
     *    @returns    {Object} increase height of static Google Map
     */

     function resizeGoogleMapFrame() {
        if (!settings.hasResizedMap) {
            var mapFrame = document.querySelectorAll('.' + settings.frameClass)[0];

            settings.hasResizedMap = true;

            return mapFrame.style.height = mapFrame.offsetHeight * 2.5 + 'px';
        }
    }

    /**
     *    Center Google Map
     *
     *    @returns    {Object} centers dynamic Google Map
     */

     function centerGoogleMapDynamic() {
        var center = map.getCenter();

        google.maps.event.trigger(map, 'resize');
        
        return map.setCenter(center);
    }

    /**
     *    Load Google Map JS API
     *
     *    @returns    {Object} loads Google Maps JS API library
     */

     function loadGoogleMapJs() {
        var script = document.createElement('script');

        // Reset options for dynamic map
        googleMapGenerator.options.isStaticMap = false;
        googleMapGenerator.options.markerLoad = 'load';

        script.type = 'text/javascript';
        script.src = 'https://maps.googleapis.com/maps/api/js?v=3.exp&libraries=visualization&' + 'callback=googleMapGenerator';

        return document.body.appendChild(script);
    }

    /**
     *    Is Google Map JS API loaded?
     *
     *    @returns    {Boolean}
     */

     function hasGoogleMapsJS() {
        return typeof google === 'object' && typeof google.maps === 'object' && typeof google.maps.InfoWindow === 'function';
    }

    /**
     *    Get Google Map Marker Labels
     *
     *    @returns    {String, number} character (A, B, C) or number based on the number input (i starts at 0)
     */

     function getGoogleMapMarkerLabel(i) {
        switch (settings.markerIconType) {
            case 'alpha':
            settings.markerIconLabel = String.fromCharCode(97 + i).toUpperCase();
            break;
            case 'numeric':
            settings.markerIconLabel = i + 1;
            break;
        }

        return settings.markerIconLabel;
    }

    /**
     *    Print Google Map
     *
     *    @returns     Creates a static map in a new popup window and opens the print dialog
     *                         The static map resolves an issue with writing a dynamic map with markers
     *                         in a new window (canvas renders the markers as 'tainted' and will not print)
     *
     *    http://maps.googleapis.com/maps/api/staticmap?center=-33.85,151.23&zoom=12&size=640x640&style=stylers%7Chue:0x000000%7Csaturation:-100&markers=label:A%7C-33.890542,151.274856&markers=label:B%7C-33.887050,151.211540&markers=label:C%7C-33.891284,151.198949&markers=label:D%7C-33.856680,151.215308&markers=label:E%7C-33.80010128657071,151.28747820854187&markers=label:F%7C-33.870851,151.199026&markers=label:G%7C-33.873188,151.203672
     */

     function printGoogleMap() {
        var mapWin = window.open('', 'mapWin', 'width=640,height=640');

        mapWin.focus();
        mapWin.document.write('<style>body { margin:0 } img { width: 100%; height: auto; } .map__legend ul { padding: 0; margin: 1.5em 0 0; } ' +
            '.map__legend ul li { float: left; width: 50%; list-style: none; margin: 0 0 1em; font: 12px sans-serif; }<\/style>' +
            generateGoogleMapStatic() + addGoogleMapStaticLegend() + '<script>setTimeout(function () { window.focus(); window.print(); }, 1500);<\/script>');
        mapWin.document.close();

        return mapWin;
    }

    /**
     *    Extend
     *
     *    See jQuery source
     */

     function extend(a, b) {
        var options, name, src, copy, copyIsArray, clone, target = arguments[0] || {},
        i = 1,
        length = arguments.length,
        deep = false;

        // Handle a deep copy situation
        if (typeof target === 'boolean') {
            deep = target;
            target = arguments[1] || {};
            // skip the boolean and the target
            i = 2;
        }

        // Handle case when target is a string or something (possible in deep copy)
        if (typeof target !== 'object' && !jQuery.isFunction(target)) {
            target = {};
        }

        // extend jQuery itself if only one argument is passed
        if (length === i) {
            target = this;
            --i;
        }

        for (; i < length; i++) {
            // Only deal with non-null/undefined values
            if ((options = arguments[i]) != null) {
                // Extend the base object
                for (name in options) {
                    src = target[name];
                    copy = options[name];

                    // Prevent never-ending loop
                    if (target === copy) {
                        continue;
                    }

                    // Recurse if we're merging plain objects or arrays
                    if (deep && copy && (jQuery.isPlainObject(copy) || (copyIsArray = jQuery.isArray(copy)))) {
                        if (copyIsArray) {
                            copyIsArray = false;
                            clone = src && jQuery.isArray(src) ? src : [];

                        } else {
                            clone = src && jQuery.isPlainObject(src) ? src : {};
                        }

                        // Never move original objects, clone them
                        target[name] = jQuery.extend(deep, clone, copy);

                        // Don't bring in undefined values
                    } else if (copy !== undefined) {
                        target[name] = copy;
                    }
                }
            }
        }

        // Return the modified object
        return target;
    }

    /**
     *    Get child by class name
     *
     *    http://jsfiddle.net/franverona/8Tx27/1/
     *
     *    @returns    {Object} DOM child node(s) matching the specified class name
     */
     function getChildByClass(el, className) {
        var childNode;

        for (var i = 0, il = el.childNodes.length; i < il; i++) {
            var classes = (el.childNodes[i].className != undefined) ? el.childNodes[i].className.split(" ") : [];

            for (var j = 0, jl = classes.length; j < jl; j++) {
                if (classes[j] == className) {
                    childNode = el.childNodes[i];
                }
            }
        }

        return childNode;
    }

    return {
        init: init,
        onWindowResize: onWindowResize,
        addGoogleMapDynamic: addGoogleMapDynamic,
        addGoogleMapDynamicLegend: addGoogleMapDynamicLegend,
        addGoogleMapDynamicStyle: addGoogleMapDynamicStyle,
        addGoogleMapDynamicMarkers: addGoogleMapDynamicMarkers,
        addGoogleMapDynamicPrintBtn: addGoogleMapDynamicPrintBtn,
        addGoogleMapStaticStyle: addGoogleMapStaticStyle,
        addGoogleMapStaticMarkers: addGoogleMapStaticMarkers,
        addGoogleMapStatic: addGoogleMapStatic,
        addGoogleMarker: addGoogleMarker,
        generateGoogleMapStatic: generateGoogleMapStatic,
        eventsGoogleMapStatic: eventsGoogleMapStatic,
        addGoogleMapStaticLegend: addGoogleMapStaticLegend,
        hasId: hasId,
        hasGoogleMap: hasGoogleMap,
        hasGoogleMapDynamic: hasGoogleMapDynamic,
        resizeGoogleMapFrame: resizeGoogleMapFrame,
        centerGoogleMapDynamic: centerGoogleMapDynamic,
        loadGoogleMapJs: loadGoogleMapJs,
        hasGoogleMapsJS: hasGoogleMapsJS,
        getGoogleMapMarkerLabel: getGoogleMapMarkerLabel,
        printGoogleMap: printGoogleMap,
        extend: extend,
        getChildByClass: getChildByClass
    }

};

googleMapGenerator.options = {
    containerClass: 'map',
    frameClass: 'map__frame',
    printClass: 'map__print',
    legendClass: 'map__legend',
    mapDynamicClass: 'gm-style',
    apiKey: null,
    legend: null,
    print: null,
    mapLat: -33.85,
    mapLng: 151.24,
    mapZoom: 12,
    isStaticMap: true,
    hasResizedMap: false,
    hasInfoWindow: true,
    hasLegend: true,
    hasPrint: true,
    hasMarkerIcon: true,
    markerAnimation: null,
    markerLoad: 'load',
    markerIconType: 'alpha',
    markerIconLabel: '',
    markerIconHexColor: 'ffffff',
    markerIconHexBackground: 'cc0000',
    markerIconSize: 'large',
    markerIcon: null,
    markersAdded: false,
    locations: [],
    styles: [],
    docWidth: document.body.clientWidth,
    breakpointDynamicMap: 768
};