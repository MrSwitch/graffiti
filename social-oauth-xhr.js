/************************************
 *
 * Code for PART 1
 *
 ***********************************/


//
// SkyDrive Appllication Key / Client ID.
// Depending on the hostname e.g. localhost/production.com define the associative Windows Live Login credentials
// Get yours for your hostname from https://manage.dev.live.com/
var WINDOWS_CLIENT_ID = {
	'adodson.com' : '00000000400D8578',
	'local.knarly.com' : '000000004405FD31' // this is my localhost, windows forbids us from using "localhost"
}[window.location.hostname];


//
// authCallback
// Callback function placeholder
// This is defined when we add a callback operation to a login.
// The functions token and saveToken below are used to set and execute this global function respectively.
window.authCallback = function(){};


//
// saveToken
// This is triggered from redirect.html
// Once the user has logged on the OAuth2 redirects them to the ./redirect.html page which in tern passes the new authentication token, and exiry and state to this function, in the opener window.
// saveToken stores the access_token, expiry date, and the state of the token and triggers any authCallback which was defined by the function which triggered the login.
function saveToken(token, expires, state){

	localStorage.setItem("access_token", token );
	localStorage.setItem("access_token_expires", expires );

	// Save the scopes
	if((localStorage.getItem("access_scopes") || '').indexOf(state)===-1){
		state += "," + localStorage.getItem("access_scopes") || '';
		localStorage.setItem("access_scopes", state );
	}

	window.authCallback(token);
}


//
// getToken
// If: the user is not signed in or their token is wrong, expired or the state has changed.
// Then: this will trigger the OAuth2 authentication flow, and sets the callback to the authCallback
// Else: Return callback(token)
//
// Strict use in response to a user click event, see browser security.
function getToken(scope, callback){

	// Token
	var token = localStorage.getItem("access_token"),
		expires = localStorage.getItem("access_token_expires"),
		scopes = localStorage.getItem("access_scopes") || '';

	// Is the user signed out or needs to refresh their session token?
	if(!(token&&(scopes.indexOf(scope)>-1)&&expires>((new Date()).getTime()/1000))){

		// Save the callback for execution
		window.authCallback = callback;

		// else open the signin window
		var win = window.open( 'https://login.live.com/oauth20_authorize.srf'+
			'?client_id='+WINDOWS_CLIENT_ID+
			'&scope='+scope+
			'&state='+scope+
			'&response_type=token'+
			'&redirect_uri='+encodeURIComponent(window.location.href.replace(/\/[^\/]*?$/,'/redirect.html')), 'auth', 'width=500,height=550,resizeable') ;
		return;
	}

	// otherwise the user is already signed in so lets just execute the callback.
	callback(token);
}




// navigateSkyDrive
// This function is used to initiate the skydrive navigation.
function navigateSkyDrive(){

	// Get Search the user Albums on SkyDrive
	createAlbumView("me/albums", "SkyDrive Albums");
}


//
// Create an Album View
// @param string, path of the album
// @param string, name of te album
function createAlbumView(path, name){

	// Token
	var id = path.replace(/\W/g,'');

	// Use token to check for the session state and execute the callback
	getToken("wl.skydrive", function(token){

		// Make httpRequest
		// Retrieve all albums in SkyDrive
		httpRequest('https://apis.live.net/v5.0/'+path+'?access_token='+token, function(r){

			// Valid
			if(!r||r.error){
				alert("You have an error: "+r.error.message);
				localStorage.removeItem("access_token");
				return;
			}

			var container = document.getElementById(id);

			if(!container){
				container = document.createElement('section');
				container.id = id;
				document.querySelector('aside').appendChild(container);
			}

			// remove previous
			container.innerHTML = '<p>'+ ( path !== 'me/albums' ? "<a onclick='createAlbumView(\"me/albums\", \"SkyDrive Albums\");'>SkyDrive Albums</a> &gt; " : '') + name +"</p>";

			// Loop through the results
			for(var i=0;i<r.data.length;i++){

				createThumbnail( r.data[i], container, thumbnail_click);

			}

			show(container);

		}); // End of httpRequest()

	});	// End of getToken()
}


//
// Builds a thumbnail for an item
// @param item Object containing a SkyDrive album or photo
// @param container HTML element where the item should be appended
// @param click_callback, what to do once the item has been clicked
function createThumbnail(item,container,click_callback){

	console.log(item);

	// Do not test scope, just get the token
	getToken("",function(token){

		container.appendChild((function(){

			var fig = document.createElement('figure');
			var img = document.createElement('img');
			img.src = ( item.picture || "https://apis.live.net/v5.0/" + item.id + "/picture" ) + "?access_token="+token;
			fig.appendChild(img);

			var caption = document.createElement('figcaption');
			caption.innerHTML = item.name;
			fig.appendChild(caption);

			fig.onclick = function(){
				click_callback(item);
			};

			return fig;
		})());
	});
}

//
// On thubnail click handler
// If the item is a photo, load the image into canvas
// Else create a new AlbumView
//
function thumbnail_click(obj){

	if( obj.type === "photo" ){
		applyRemoteDataUrlToCanvas( obj.source );
	}
	else if(obj.type === "album"){
		createAlbumView(obj.id+'/files', obj.name);
	}
}



//
// httpRequest
// Creates an instance of an XMLHttpRequest object and requests information from the URL endpoint.
// if the browser does not support XHR2 it'll revert to JSONP function
//
// @param string url
// @param function callback
//
function httpRequest(url, callback){

	// Trigger loading
	show("loading");

	// IE10, FF, Chrome
	if('withCredentials' in new XMLHttpRequest()){

		var progressEl = document.getElementById('loading').getElementsByTagName('progress')[0];

		var r = new XMLHttpRequest();
		// xhr.responseType = "json"; // is not supported in any of the vendors yet.
		r.onload = function(e){
			// Remove the trail
			progressEl.removeAttribute('max');
			progressEl.removeAttribute('value');

			callback(r.responseText?JSON.parse(r.responseText):{error:{message:"Could not get resource"}});
		};
		r.onprogress = function(e){
			progressEl.max = e.total;
			progressEl.value = e.loaded;
		};

		r.open("GET", url);

		r.send( null );
	}
	else{

		// Else add the callback on to the URL
		jsonp(url+"&callback=?", callback);
	}
}


//
// JSONP
//
//
var json_counter=0;
function jsonp(path,callback){
	// Make the anonymous function. not anonymous
	var callback_name = 'jsonp_' + json_counter++;
	window[callback_name] = callback;
	// Add the callback name to the path
	path = path.replace(/\=\?/, '='+callback_name);
	// find a place to insert the script tag
	var sibling = document.getElementsByTagName('script')[0];
	// Create the script tag
	var script = document.createElement('script');
	script.src = path;
	sibling.parentNode.insertBefore(script,sibling);
}



//
// applyRemoteDataUrlToCanvas
// Using XHR2 we can load remote files into the canvas, avoiding the SecurityError response once canvas.toDataURL() gets called.
function applyRemoteDataUrlToCanvas(url){

	show("loading");

	if( "withCredentials" in new XMLHttpRequest() ){

		httpRequestBlob(url, function(blob){

			var URL = window.URL || window.webkitURL;
			var localurl = URL.createObjectURL(blob);

			applyDataUrlToCanvas( localurl );

		});
	}
	else{
		// We are going to load it directly
		// So we wont be able to use
		applyDataUrlToCanvas( url );
	}
}


//
// httpRequestBlob
// Request a blob image from an external resource, return it in a callback
function httpRequestBlob(url, callback){

	if( !( "withCredentials" in new XMLHttpRequest() ) ) {
		throw new Error("httpRequestBlob(): Browser does not support XHR2");
	}
	
	var progressEl = document.getElementById('loading').getElementsByTagName('progress')[0];

	var xhr = new XMLHttpRequest();

	// Prefix the request with the proxy server which adds the Access-Control-Allow-Origin: *
	// source-code:  https://github.com/MrSwitch/proxy-server
	xhr.open("GET", "http://proxy-server.herokuapp.com/"+ url );

	xhr.responseType = "arraybuffer";

	xhr.onprogress = function(e){
		progressEl.max = e.total;
		progressEl.value = e.loaded;
	};
	xhr.onload = function(r){

		var type = xhr.getResponseHeader("content-type");
		var blob = new Blob([xhr.response], {type: type});

		callback(blob);

		// Remove the trail
		progressEl.removeAttribute('max');
		progressEl.removeAttribute('value');
	};
	xhr.onerror = function(r){
		alert("Sorry there was an error downloading " + url);
	};

	xhr.send();
}

/*************************************************
 *
 * Code for PART 2
 *
 *************************************************/


// A global Variable with the selected album object
var selectedAlbum = null;


//
// pickSkyDriveAlbumToSave
// Creates a list of the users albums to save
//
function pickSkyDriveAlbumToSave(){

	// Show loading
	show("loading");

	// Get the token
	getToken("wl.skydrive_update", function(token){

		// Make a request for data
		httpRequest('https://apis.live.net/v5.0/me/albums?access_token='+token, function(r){


			var container = document.getElementById('figs');

			//
			// Construct the figure build.
			function figure(obj){

				var id = obj.id.replace(/\W/,'');

				if(document.getElementById(id)){
					// we already have it.
					return;
				}

				var fig = (function(){

					var fig = document.createElement('figure');
					fig.id = id;
					fig.onclick = function(){
						var figs = container.getElementsByTagName('figure');
						var bool = (this.className !== "selected");
						for(var i=0;i<figs.length;i++){
							figs[i].className = '';
						}
						this.className = bool?"selected":"";

						selectedAlbum = bool?obj:null;
					};


					var img = document.createElement('img');
					img.src = ( obj.picture || "https://apis.live.net/v5.0/" + obj.id + "/picture" ) + "?access_token="+token;
					fig.appendChild(img);


					var caption = document.createElement('figcaption');
					caption.innerHTML = obj.name;
					fig.appendChild(caption);

					// Add an album Delete button
					var btn = document.createElement('a');
					btn.className = "delete";
					btn.innerHTML = "x";

					btn.onclick=function(e){

						e.stopPropagation();

						if(!confirm("Delete "+ obj.name)){return false;}

						httpDelete( "https://apis.live.net/v5.0/" + obj.id + "/?access_token="+token, function(){
							container.removeChild(fig);
						});
					};
					fig.appendChild(btn);

					return fig;
				})();

				container.appendChild(fig);

			}

			// Loop through the results
			for(var i=0;i<r.data.length;i++){
				figure(r.data[i]);
			}


			// Add a control to create a new Album
			if(!document.getElementById('addAlbum')){
				var fig = document.createElement('figure');
				fig.id = "addAlbum";
				fig.innerHTML = "<figcaption>Create new Album</figcaption>";

				fig.onclick = function(){
					createAlbum(figure);
				};

				container.appendChild(fig);
			}

			// Show Albums tab
			show("albums");

		});

	});
}


//
// createAlbum
//
function createAlbum(callback){

	getToken("wl.skydrive_update", function(token){

		var name = prompt("Please give your album a name", "Graffities");

		if(!name){return;}

		httpPost('https://apis.live.net/v5.0/me/albums?access_token='+token, {name: name}, function(r){
			// add the new figure to the path
			callback(r);
		});
	});
}


//
// Save to SkyDrive
//
function saveToSkyDriveFolder(){

	// Has the user selected an Album?
	if(!selectedAlbum){
		alert("Please select an album first");
		return;
	}

	getToken("wl.skydrive_update", function(token){

		// Set state as saving
		show('saving');

		// Generate a Blob from the Canvas
		if("toBlob" in canvas){

			canvas.toBlob(function( file ){

				var blob;
				if('Blob' in window){
					// The new Blob interface
					try{
						blob = new Blob([file],{
							"type" : "image\/png"
						});
					}catch(e){
						// this gets thrown in Android
					}
				}
				
				if(!blob){
					// The deprecated BlobBuilder interface
					try{
						var bb = new BlobBuilder();
						bb.append( file );
						blob = bb.getBlob( "image\/png");
					}catch(e){
						
					}
				}

				var name = "Grafitti.png";

				// Build the Form Data object
				var formData = new FormData();
				formData.append("file", blob, name);
				formData.append("name", name);

				httpUpload('https://apis.live.net/v5.0/'+ selectedAlbum.id +'/files?access_token='+token, formData, function(r){

					// Prompt the user to share their recent upload with friends
					document.querySelector("#share form input[name=name]").value = r.name;
					document.querySelector("#share form input[name=picture]").value = r.source;
					document.querySelector("#share form img").src = URL.createObjectURL(blob);

					show("share");

				});

			});
		}
		else{
			alert("Sorry your browser can't create files");
		}

	});
}



//
// Share
// Share's the users uploaded image with their public Windows Live profile
function share(e){

	var form = e.target;
	e.preventDefault();

	// Does the user have access to the wl.activity token?
	getToken("wl.share", function(token){

		// Loading
		show("loading");

		// Pass in the form to create the post
		var data = {
			name : form.name.value,
			message : form.message.value,
			link : window.location.href,
			picture : form.picture.value
		};

		httpPost( 'https://apis.live.net/v5.0/me/share?access_token='+token, data, function(r){
			console.log(data);
			console.log("Shared image");
			console.log(r);

			hide();
		});
	});
}



function httpPost( url, data, callback){

	// IE10, FF, Chrome
	if('withCredentials' in new XMLHttpRequest()){

		var r = new XMLHttpRequest();
		// xhr.responseType = "json"; // is not supported in any of the vendors yet.
		r.onload = function(e){
			callback(r.responseText?JSON.parse(r.responseText):{error:{message:"Could not get resource"}});
		};

		r.open("POST", url);

		r.setRequestHeader("Content-Type",'application/json');

		r.send( JSON.stringify(data) );

	}
	else{

		url += "&method=post&data="+JSON.parse(data);

		// Else add the callback on to the URL
		jsonp(url+"&callback=?", callback);
	}
}


function httpDelete( url, callback ){
	// IE10, FF, Chrome
	if('withCredentials' in new XMLHttpRequest()){

		var r = new XMLHttpRequest();
		// xhr.responseType = "json"; // is not supported in any of the vendors yet.
		r.onload = function(e){
			callback(r.responseText?JSON.parse(r.responseText):{error:{message:"Could not get resource"}});
		};

		r.open("DELETE", url);

		r.send( null );
	}
	else{

		url += "&method=delete";

		// Else add the callback on to the URL
		jsonp(url+"&callback=?", callback);
	}
}


function httpUpload(url,formData,callback){

	show("saving");

	var xhr = new XMLHttpRequest();

	xhr.onload = function(){
		var response = xhr.responseText;
		try{
			callback(JSON.parse(response));
		}catch(e){
			callback({error:{message:"Server gave bad response"}});
		}
	};
	xhr.upload.onprogress = function(e){
		var prog = document.getElementById('saving').getElementsByTagName('progress')[0];
		prog.max = e.total;
		prog.value = e.loaded;
	};

	xhr.open("POST", url, true );
	xhr.send(formData);
}