function show(el){

	if(typeof(el)==='string'){
		el = document.getElementById(el);
	}

	var aside = document.getElementsByTagName('aside')[0];
	aside.removeAttribute("hidden");

	var divs = aside.getElementsByTagName('section');

	for(var i=0;i<divs.length;i++){
		if(!divs[i].getAttribute('hidden')){
			divs[i].setAttribute("hidden","true");
		}
	}

	// ensure its shown
	el.removeAttribute("hidden");
}

function hide(){
	var aside = document.querySelector('aside');
	aside.setAttribute("hidden","true");

	var divs = aside.getElementsByTagName('section');
	for(var i=0;i<divs.length;i++){
		divs[i].setAttribute("hidden","true");
	}

}

document.addEventListener('keydown', function(e){
	if(e.which===27){
		hide();
	}
});

