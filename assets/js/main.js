function initRequest(requestURL){

	var request = new XMLHttpRequest();
	request.open('GET', requestURL);
	request.responseType = 'json';
	request.send();

	return request;
}

function makeToponymLayer(features, svgMarkersLayer, fillcolor, strokecolor){

	// Add SVG to the map for each toponym
    features.forEach(function(feature) {
        var coordinates = feature.geometry.coordinates;
        var nom = feature.properties.Nom;
        
        // Create SVG string
        var svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="60">
                            <text x="10" y="40" font-family="Helvetica" font-size="16" fill="${fillcolor}" stroke="${strokecolor}" stroke-width="1" fill-opacity="55%" stroke-opacity="55%">${nom}</text>
                         </svg>`;
        
        // Create a Leaflet divIcon with the SVG string
        var svgIcon = L.divIcon({html: svgString, className: 'svg-icon'});
        
        // Add the SVG icon to the map at the feature's coordinates
        var marker = L.marker([coordinates[1], coordinates[0]], {icon: svgIcon});
        svgMarkersLayer.push(marker);
    });

    return L.layerGroup(svgMarkersLayer);
}

function resetObjectsColor(color) {
	mapA.eachLayer(function(layer) {
	    if (layer instanceof L.Polygon) {
	        layer.setStyle({
	            fillColor: color,
	            color: color  // Optional if you also want to change the border color
	        });
	    }
	});

	mapB.eachLayer(function(layer) {
	    if (layer instanceof L.Circle) {
	        layer.setStyle({
	            fillColor: color,
	            color: color  // Optional if you also want to change the border color
	        });
	    }
	});
};

// Update legendBox
function updateLegendBox(placename, desc) {

    document.getElementById('placename').innerText = placename;
    document.getElementById('desc').innerText = desc;
}

function clearLegendBox() {
	resetObjectsColor('#bc3754');
    document.getElementById('placename').innerText = '';
    document.getElementById('desc').innerText = '';
}

// Initialize maps
let mapA = L.map('mapA').setView([-2.59, 3.08], 8);
let mapB = L.map('mapB').setView([46.522362, 6.635170], 16);

var CartoDBLightB = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
	attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
	subdomains: 'abcd',
	minZoom: 14,
	maxZoom: 20
});

// Add map layers
CartoDBLightB.addTo(mapB);

var merianPath = 'assets/data/1654_Matthaeus.jpg';
var merianBounds = [[0, 0], [-5.186, 6.168]];
L.imageOverlay(merianPath, merianBounds).addTo(mapA);
var merian_data = [];
let polygonsA = [];
let circlesB = [];

var maquettePath = 'assets/data/mhl_orthophoto.png';
var maquetteBounds = [[46.5275, 6.6238], [46.5171, 6.64288]];
var maquetteOverlay = L.imageOverlay(maquettePath, maquetteBounds);

var svgMarkersMelotte = [];
var svgMarkersBerney = [];

var overlayMaps = {};
var controlLayers = L.control.layers({}, {"Maquette": maquetteOverlay}).addTo(mapB);
var geocoderControl;
var geocoder = new L.Control.Geocoder.Nominatim();
geocoderControl = L.Control.geocoder({geocoder: geocoder}).addTo(mapB);

var request_merian = initRequest('https://raw.githubusercontent.com/RPetitpierre/merian/main/assets/data/data_merian.json');
request_merian.onload = function() {
	merian_data = request_merian.response;

	// Draw circles and add click event listeners
	merian_data.forEach(point => {
	    let polygonA = L.polygon(point.polygonA.map(point => [point[1], point[0]]), 
	    	{weight: 1, color: '#bc3754', fillColor: '#bc3754', opacity: 0.6}).addTo(mapA);
	    let circleB = L.circle([point.latB, point.lonB], {radius: 25,
	    	color: '#bc3754', fillColor: '#bc3754'}).addTo(mapB);

	    polygonsA.push(polygonA);
	    circlesB.push(circleB);

	    polygonA.on('click', function(event) {
	    	L.DomEvent.stopPropagation(event);
	        if (mapB._zoom >= 20) {
	        	mapB.setZoom(19);
	        }
	        if (mapB._zoom < 16) {
	        	mapB.setZoom(16);
	        }
	        mapB.setView([point.latB, point.lonB]);
	        updateLegendBox(point.placename, point.desc);

	        resetObjectsColor('#bc3754');
	        polygonA.setStyle({color: '#f98e09', fillColor: '#f98e09'})
	    	circleB.setStyle({color: '#f98e09', fillColor: '#f98e09'})
	    });

	    circleB.on('click', function(event) {

	        L.DomEvent.stopPropagation(event);
	        mapA.setView([point.polygonA[0][1], point.polygonA[0][0]]);
	        updateLegendBox(point.placename, point.desc);
	        
	        resetObjectsColor('#bc3754');
	        polygonA.setStyle({color: '#f98e09', fillColor: '#f98e09'})
	    	circleB.setStyle({color: '#f98e09', fillColor: '#f98e09'})
	    });
	});
}

var request_toponyms = initRequest('https://raw.githubusercontent.com/RPetitpierre/merian/main/assets/data/toponyms.geojson');
request_toponyms.onload = function() {
	var geojsonData = request_toponyms.response;

	var svgLayerGroup = makeToponymLayer($.grep(geojsonData.features, function( n, i ) {return n.properties.year === 1727;}), 
		svgMarkersMelotte, "#57106e", "#9a6fa8");
	controlLayers.addOverlay(svgLayerGroup, "Toponymes 1727");

	var svgLayerGroup = makeToponymLayer($.grep(geojsonData.features, function( n, i ) {return n.properties.year === 1831;}), 
		svgMarkersBerney, "#8a226a", "#b87aa5");
	controlLayers.addOverlay(svgLayerGroup, "Toponymes 1831");
}

var request_melotte = initRequest('https://raw.githubusercontent.com/RPetitpierre/merian/main/assets/data/melotte_bati.geojson');
request_melotte.onload = function() {
	var geojsonData = request_melotte.response;

	let geojsonLayer = L.geoJSON(geojsonData, {
	    style: function (feature) {
	        return {
	            color: "#210c4a",
	            weight: 1.5,
	            fillOpacity: 0.4,
	            opacity: 0.6
	        };
	    },
	    onEachFeature: function (feature, layer) {
	        // If you want to attach events or popups to the polygons:
	        layer.bindPopup(feature.properties.name);
	    }
	})

    controlLayers.addOverlay(geojsonLayer, "Cadastre 1727");
}

// Add empty area click event to clear legendBox
mapA.on('click', clearLegendBox);
mapB.on('click', clearLegendBox);

document.getElementById('togglePlanMerian').addEventListener('change', function() {
    if (this.checked) {
        document.getElementById('mapA').style.display = 'block';
        document.getElementById('mapB').style.width = '42%';
        
        polygonsA.forEach(polygon => polygon.addTo(mapA));
        circlesB.forEach(circle => circle.addTo(mapB));
        mapA.invalidateSize();
        mapB.invalidateSize();
        mapA.setView([-2.59, 3.08], 8);
    } else {
        document.getElementById('mapA').style.display = 'none';
        document.getElementById('mapB').style.width = '84%';
        
        polygonsA.forEach(polygon => polygon.remove());
        circlesB.forEach(circle => circle.remove());
        mapB.invalidateSize();
    }
});
