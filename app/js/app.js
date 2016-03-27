/**
*	Callback from google maps api to create a new map
* and a new infoWindow.
*	Also apply DOM bindings from knockout to the ViewModel
* @return {object} returns a google.maps.Map(), 
*		and a google.maps.InfoWindow()
**/
// var googleError = function(){
// 	window.alert('error');	
// }

function init(){
	var map = new initMap();
	var service;
	var infoWindow = new initInfoWindow();
	ko.applyBindings(new ViewModel());
}

function initMap(){
	// create map and center it on Gilbert AZ
	// var currentLocation = navigator.geolocation.getCurrentPosition;
	map = new google.maps.Map(document.getElementById('map'), {
		center: {lat: 33.3500, lng: -111.7892},
		zoom: 12,
	});	
}

function initInfoWindow(){
	infoWindow = new google.maps.InfoWindow({pixelOffset: new google.maps.Size(0, -40)});
}

var ViewModel = function(){
	var that = this;

	//create a knockout oberservable array, which will hold
	//an object of each 'place' inside PlacesOfInterest
	this.markerArray = ko.observableArray([]);
	this.filteredArray = ko.observableArray([]);
	this.query = ko.observable('');
	this.queryLocation = ko.observable('');

	//yelp variables for infoView
	this.yelpTitle = ko.observable();
	this.yelpRating = ko.observable('');
	this.yelpUrl = ko.observable();
	this.yelpReview = ko.observable();
	this.yelpImage = ko.observable();
	this.yelpRatingNum = ko.observable();	
	//api error message
	this.apiError = ko.observable();

	/*
		*	options for each marker to be placed on the map. Called by 'destination'.
		* @param lat {number} latitude of marker
		* @param lng {number} longitude of marker
		* @param title {string} title of marker
	*/
	this.markerOptions = function(lat, lng, title){
		var position = {lat, lng};
		return {
			position: position,
			title: title,
			map: map,
			animation: google.maps.Animation.DROP
		};
	};

	/*
		*	Class to create objects for ViewModel.markerArray
		* @param data {object} object from PlacesOfInterest
		*	@return {object} return observable object 
		*		to the ViewModel.markerArray 
		*	@return {object} new google.maps.Marker()
	*/
	this.destination = function(data, Placelat, Placelng){
		this.name = ko.observable(data.name);
		this.lat = data.lat || Placelat;
		this.lng = data.lng || Placelng;
		this.description = ko.observable(data.description);
		this.id = ko.observable(data.id);
		this.marker = ko.observable(new google.maps.Marker(that.markerOptions(
			this.lat, this.lng, this.name())));
		this.visible = ko.observable(data.visible);
	};

	/*
		* simple animation function to make markers bounce momentarily
		* @param marker {object} the activated marker, generated by a click event on
		* 	the listView, or map.
	*/
	this.animateMarker = function(marker){
		marker.marker().setAnimation(google.maps.Animation.BOUNCE);
				setTimeout(function(){
					marker.marker().setAnimation(null);
				}, 1400);
	};

	//receive clicks from KO, and reset infoWindow with new data
	this.openWindow = function(data){
		that.yelp(data);
		var position = {lat: data.lat, lng: data.lng};
		// var description = "<strong>" + data.name() + "</strong>" + "<p>" +
		//  		data.description() + "</p>" + '<a href="' + that.yelpUrl() + '">' +
		//  		"Visit Website" + "</a>";
		var description = "<strong>" + data.name() + "</strong>";
		infoWindow.close();
		that.animateMarker(data);
		infoWindow.setContent(description);
		infoWindow.setPosition(position);
		infoWindow.open(map);
	};

	/*
		* additional data received from Google Maps API, google.maps.Places.
		* See https://developers.google.com/places for detailed documentation
	*/
	this.googlePlacesAPI = function(location){
		var request = {
			location: {lat: 33.3500, lng: -111.7892},
			radius: '12000',
			query: 'restaurants' 
		};

		service = new google.maps.places.PlacesService(map);
		service.textSearch(request, callback);

		/*
			*	function to run once data is received from request
			* @param results {array} array of each 'place'
			* @param status {const} CONSTANT, status of server response 
		*/
		function callback(results, status){
			//push results to markerArray, as a new destination object
			if(status == google.maps.places.PlacesServiceStatus.OK){
				results.forEach(function(place){
					var lat = place.geometry.location.lat();
					var lng = place.geometry.location.lng();
					that.markerArray.push(new that.destination(place, lat, lng));
				});
				//create listeners for each marker once the callback has 
				//populated the markerArray.
				ko.utils.arrayForEach(that.markerArray(), function(place){
					place.marker().addListener('click', function(){
						that.animateMarker(place);
						that.openWindow(place);
					});
				});
				//if server responds != OK, add listeners to hard-coded locations only.
				//and give error.
			} else {
				that.apiError("Oops, there was an error reaching Google Places, please try again later.");
				ko.utils.arrayForEach(that.markerArray(), function(place){
					place.marker().addListener('click', function(){
						that.animateMarker(place);
						that.openWindow(place);
					});
				});
			}
		}
	};

	/*
		*	ajax call to Yelp API, and append it to the infoView
		*		 See https://www.yelp.com/developers/documentation/v2/overview for detailed documentation
		* @param place {object} place object from markerArray, passed from knockout click event
	*/
	this.yelp = function(place){
		var auth = {
			oauth_consumer_key: 'gsSlBzHSmPTFocOOnlKpqQ',
			consumer_secret: 'OmL44ruWPPtwm2oeVvZO3PSeRhs',
			token: 'cPfxv2_sPUjupYLzEH-OSXhYLGsODa89',
			token_secret: '9XtYnUhZP_Ddmz-_n29-QY2uDi8',
		};

		var accessor = {
			consumerSecret: auth.consumer_secret,
			tokenSecret: auth.token_secret
		};

	  var parameters = {
    term: place.name(),
    location: 'gilbert',
    oauth_consumer_key: auth.oauth_consumer_key,
    oauth_token: auth.token,
    oauth_nonce: (Math.random() * 1e10).toString(),
    oauth_timestamp: Math.floor(Date.now()/1000),
    oauth_signature_method: 'HMAC-SHA1',
    callback: 'cb',
  	};
  	var message = {
	    'action' : 'http://api.yelp.com/v2/search',
	    'method' : 'GET',
	    'parameters' : parameters
	  };

	  OAuth.setTimestampAndNonce(message);
	  OAuth.SignatureMethod.sign(message, accessor);
	  var parameterMap = OAuth.getParameterMap(message.parameters);
	  parameterMap.oauth_signature = OAuth.percentEncode(parameterMap.oauth_signature);
	  $.ajax({
	  	'url': message.action,
	  	'data': parameterMap,
	  	'dataType': 'jsonp',
	  	'timeout': 6000,
	  	'jsonpCallback': 'cb',
	  	'cache': true,
	  	'success': function(data, textStatus, XMLHttpRequest){
	  		that.yelpUrl(data.businesses[0].url);
	  		that.yelpTitle(data.businesses[0].name);
	  		that.yelpRating(data.businesses[0].rating_img_url);
	  		that.yelpRatingNum(data.businesses[0].review_count);
	  		that.yelpImage(data.businesses[0].image_url);
	  		that.yelpReview(data.businesses[0].snippet_text);
	  	}
	  }).fail(function(){
	  	that.apiError("Oops, there was an error reaching Yelp, please try again later.");
	  });
	};

	//receive calls from knockout click to hide the infoView
	this.hideYelp = function(){
		that.yelpTitle(false);
		that.apiError(false);
	};

	/**
		* create ko.observableArray of objects from each 
		*	place in PlacesOfInterest
		* @param place {object} received from PlacesOfInterest
		*	@param map {object} received from initMap()
	*/
	PlacesOfInterest.forEach(function(place){
		that.markerArray.push(new that.destination(place));
	});

	this.googlePlacesAPI();

	// filter items in markerArray based on user input
	// and remove the item from the listView, and its 
	// corresponding marker
	this.filteredItems = ko.computed(function(){
		var filter = ko.observable(this.query().toLowerCase());
		if(!filter()){
			return that.markerArray();
		} else {
			return ko.utils.arrayFilter(that.markerArray(), function(data){
				var string = data.name().toLowerCase().indexOf(filter()) !== -1;
				if(!string){
					data.marker().setVisible(false);
				}
				// TODO see if filter() exists in the infoWindow title, if so, keep infowindow
				// else remove the window, use substring()
				return string;
			});
		}
	}, that);

	

	this.locationQuerySubmit = function(){
		console.log('location submit');
	}

	this.query.subscribe(function(data){
		if(data === ''){
			ko.utils.arrayForEach(that.markerArray(), function(place){
				place.marker().setVisible(true);
			});
		}
	});
};



/**
* The initial data to be used to populate
* the map with markers
**/
var PlacesOfInterest = [
{
	name: 'The Bagel Man',
	lat: 33.348880,
	lng: -111.976837,
	description: 'Get yourself some decent bagels.'
	// visible: true
},{
	name: 'The Soda Shop',
	lat: 33.378187,
	lng:  -111.741916,
	description: 'A unique twist on soda.'
	// visible: true
}];