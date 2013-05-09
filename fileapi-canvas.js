/**
 * @author Andrew Dodson
 * @since Nov 2012
 */

var canvas = document.getElementsByTagName('canvas')[0],
	ctx = canvas.getContext("2d");

// Set the standard
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Splash of color
// Add function events for changing colors
function paintColor(str){
	color = str;
}

// Preload the canvas
// load our default image.... gorgeous!
applyDataUrlToCanvas( 'assets/gorgeous.jpg' );



// Drawing events
// Add events to the canvas
var drawing = false,
	color = "#00A308";
canvas.addEventListener('mousedown', function(e){
	drawing = true;
	draw(e);
});
canvas.addEventListener('mouseup', function(){
	drawing = false;
});

canvas.addEventListener('mousemove', function(e){
	if(drawing){
		draw(e);
	}
});

// Touch
// This is the handler for a touchmove event
function touch(evt){
	//
	evt.preventDefault();

	// Changed Touches
	var touches = evt.changedTouches || evt.touches;
	for (var i=0; i<touches.length; i++) {
		draw(touches[i]);
	}
}

// Touch events
canvas.addEventListener('touchmove', touch,false);
canvas.addEventListener('touchstart', touch,false);



//
// paste ClipBoard data
// This works naturally with text into contentEditable areas, but we want to be able to also paste images
//
document.onpaste = function(e){

	e.preventDefault();

	if(e.clipboardData&&e.clipboardData.items){
		// pasted image
		for(var i=0, items = e.clipboardData.items;i<items.length;i++){
			if( items[i].kind==='file' && items[i].type.match(/^image/) ){
				readFile(items[i].getAsFile());
				break;
			}
		}
	}
	return false;
};

// Prevent icon changing to text in Chrome
document.onselectstart = function(){ return false; };


//
// Drag image files into to the page
//

// stop FireFox from replacing the whole page with the file.
canvas.ondragover = function () { return false; };

// Add drop handler
canvas.ondrop = function (e) {
	e.preventDefault();
	e = e || window.event;
	var files = (e.files || e.dataTransfer.files);
	if(files){
		readFile(files[0]);
	}
};



//
// Draw applies paint to the canvas
// It takes an event object or single touch property of an event object
function draw(e){
	//draw a circle
	ctx.fillStyle = color;
	ctx.beginPath();
	// Draw the arc, webkit supports radius so for touch devices we may support different sizes
	ctx.arc(e.clientX||e.pageX, e.clientY||e.pageY, (e.webkitRadiusX ? 5*Math.min((e.webkitRadiusX)/100, 2) : 10), 0, Math.PI*2, true);
	ctx.closePath();
	ctx.fill();
}


// This function gets used for loading files into the canvas
function applyDataUrlToCanvas(dataUrl){

	show('loading');

	// Get just the base64
	var orientation,
		base64,
		exif;

	// Is this a Data URL?
	if(dataUrl.match(/^data\:/)){
		base64 = dataUrl.replace(/^.*?,/, '');
		exif = EXIF.readFromBinaryFile(new BinaryFile(atob(base64)));
		orientation = exif.Orientation;
	}

	// Insert the file
	var img = new Image();
	img.onload = function(){

		// Work out the
		var ir = (img.height/img.width), // Image Ratio
			wr = (window.innerHeight/window.innerWidth); // Window Ratio

		// Set the standard
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;

		// initial offset points
		var offsetLeft = 0,
			offsetTop = 0;

		// Window is proportionally taller than image
		if(wr>ir){
			// Get the horiontal middle offset
			offsetLeft = Math.round(((canvas.height/ir)-canvas.width));
		}
		// Window is proportionally narrower than the image
		else if(wr<ir){
			// Get the vertical middle offset
			offsetTop = Math.round(((canvas.width*ir)-canvas.height));
		}


		// Orientation and dimension?
		var d = {x:0,y:0,r:0,
				width:canvas.width,
				height:canvas.height};


		// EXIF Orientation
		if( orientation && [3,6,8].indexOf(orientation) >-1 ){

			// Set up the translate
			d.x = canvas.width/2;
			d.y = canvas.height/2;


			if(orientation===8||orientation===6){
				ir = (img.width/img.height);

				// initial offset points
				offsetLeft = 0,
				offsetTop = 0;

				// Window is proportionally taller than image
				if(wr>ir){
					// Get the horiontal middle offset
					offsetTop = Math.round(((canvas.height/ir)-canvas.width));
				}
				// Window is proportionally narrower than the image
				else if(wr<ir){
					// Get the vertical middle offset
					offsetLeft = Math.round(((canvas.width*ir)-canvas.height));
				}

				d.width = canvas.height;
				d.height = canvas.width;
			}

			// See
			// http://www.impulseadventure.com/photo/exif-orientation.html
			if(orientation===6){
				d.r = Math.PI/2;
			}
			if(orientation===3){
				d.r = Math.PI;
			}
			if(orientation===8){
				d.r = -Math.PI/2;
			}

			// Translate to the center of the canvas
			ctx.translate(d.x, d.y);

			// Apply rotation
			ctx.rotate(d.r);

			// Rotate back
			if(orientation===3){
				ctx.translate(-d.x, -d.y);
			}
			else{
				ctx.translate(-d.y, -d.x);
			}

		}

		// Draw on the canvas
		ctx.drawImage(img, -offsetLeft/2, -offsetTop/2, d.width+offsetLeft,d.height+offsetTop);

		// Orient back
		if(orientation){
			if(orientation===3){
				ctx.translate(d.x, d.y);
			}
			else{
				ctx.translate(d.y, d.x);
			}
			ctx.rotate(-d.r);
			ctx.translate(-d.x, -d.y);
		}

		// Hide the loading notice
		hide();
	};
	img.src = dataUrl;
}

// Read the contents of a file using the FileReader part of the FileAPI
function readFile(file){
	// Create a new FileReader Object
	var reader = new FileReader();

	// This take a while so let the user know the cogs grinding
	show('loading');

	// Get ProgressEl
	var progressEl = document.getElementById('loading').getElementsByTagName('progress')[0];

	// Set an onload handler because we load files into it Asynchronously
	reader.onload = function(e){

        // Print onto Canvas
		applyDataUrlToCanvas( this.result );

		progressEl.removeAttribute('max');
		progressEl.removeAttribute('value');

	};

	reader.onprogress = function(e){
		progressEl.max = e.total;
		progressEl.value = e.loaded;
	};

	//
	reader.readAsDataURL(file);
}



// Upload an image
// A large part of the following script is to create an input field and fire a click event on it.
// The other part
var upl;

function selectLocalFile(){

	// insert a form control above the element
	if(!upl){
		upl = document.createElement('input');
		upl.type='file';
		upl.style.opacity = 0;
		upl.style.position = 'absolute';
		upl.style.left = '-2000px';
		upl.style.top = 0;
		document.body.appendChild(upl);

		// listen to the onchange event
		// This will carry with it a reference to the file which the user has selected
		upl.addEventListener('change', function(e){
			if(!(e.target&&e.target.files)){
				return;
			}

			// This is a File object, hurrah
			// With this we can pass it into the FileReader
			var file = e.target.files[0];

			// Pass to our custom function for reading the file
			readFile(file);
		},false);

	}

	// Create and Fire a mouse click event
	var clickEvent = document.createEvent ("MouseEvent");
	clickEvent.initMouseEvent ("click", true, true, window, 0,
		event.screenX, event.screenY, event.clientX, event.clientY,
		event.ctrlKey, event.altKey, event.shiftKey, event.metaKey,
		0, null);

	// Lets ensure we are focussed on the element for which we are triggering the click event
	upl.focus();
	upl.dispatchEvent(clickEvent);

}


// Shim the BlobBuilder if its available
window.BlobBuilder || (window.BlobBuilder = window.MSBlobBuilder||window.MozBlobBuilder||window.WebKitBlobBuilder);

// Shim saveAs
window.saveAs || ( window.saveAs = (window.navigator.msSaveBlob ? function(b,n){ return window.navigator.msSaveBlob(b,n); } : false) || window.webkitSaveAs || window.mozSaveAs || window.msSaveAs || (function(){

	// URL's
	window.URL || (window.URL = window.webkitURL);

	if(!window.URL){
		return false;
	}

	return function(blob,name){
		// Create an objectURL
		var url = URL.createObjectURL(blob);

		// Test for download link support
		if( "download" in document.createElement('a') ){

			var a = document.createElement('a');
			a.setAttribute('href', url);
			a.setAttribute('download', name);

			// Create Click event
			var clickEvent = document.createEvent ("MouseEvent");
			clickEvent.initMouseEvent ("click", true, true, window, 0,
				event.screenX, event.screenY, event.clientX, event.clientY,
				event.ctrlKey, event.altKey, event.shiftKey, event.metaKey,
				0, null);

			// dispatch click event to simulate download
			a.dispatchEvent (clickEvent);

		}
		else{
			// fallover, open resource in new tab.
			window.open(url, '_blank', '');
		}
	};

})());


// Download Control
// Onclick we have to do something rather special
function download(){

	// This take a while so let the user know the cogs grinding
	show('loading');

	// toBlob not supported in Chrome... but there is a hack
	// http://code.google.com/p/chromium/issues/detail?id=67587
	// https://bugzilla.mozilla.org/show_bug.cgi?id=648610
	// installed toBlob
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


			var name = 'Graffiti.png';

			if(window.saveAs){
				// Move the builder object content to a blob and
				window.saveAs(blob, name);
			}
			else{
				// Fallover, open as DataURL
				window.open(canvas.toDataURL());
			}

			// Cancel the user notice
			hide();
		});

	}
	else{
		// Most browsers that support canvas support the toDataUrl method
		try{
			window.open(canvas.toDataURL());
		}
		catch(e){
			// Security Errors on canvas.toDataURL is caused when canvas.drawImage has used an image from another domain.
			alert(e.message);
		}

		// Cancel the user notice
		hide();
	}
}