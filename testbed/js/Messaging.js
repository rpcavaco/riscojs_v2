function fadeout(element, heartbeat, finalcallback) {
    let op = 1;  // initial opacity
    let timer = setInterval(function () {
        if (op <= 0.2){
			op = 0;
            clearInterval(timer);
            element.style.display = 'none';
            if (finalcallback) {
				finalcallback();
			}
        }
        element.style.opacity = op;
		if (op > 0) {
        	op -= op * 0.1;
		}
    }, heartbeat);
    return timer;
}

// Singleton
let MessagesController = {

	// Constantes
	elemid: "msgsdiv",
	minwidth: 300,
	maxwidth: 550,
	messageTimeout: 4000,
	shortMessageTimeout: 4000,
	charwidth: 10,
	padding: 26,
	rowheight: 28,
	
	messageText: "",
	lines: 0,
	width: 0,
	height: 0,
	isvisible: false,
	timer: null,

	check() {
		let msgsdiv = document.getElementById(this.elemid);
		msgsdiv.style.display = 'none';

		// attach self close on click event
		(function(p_this, p_msgsdiv) {
			p_msgsdiv.addEventListener('click', (e) => {
				p_this.hideMessage(true);
			})
		})(this, msgsdiv);		
	},
	
	/*reshape: function() {
		
		if (!this.isvisible) {
			return;
		}
		
		let msgsdiv = document.getElementById(this.elemid);

		// this.height = msgsdiv.clientHeight;

		msgsdiv.style.width = this.width + 'px';
		//msgsdiv.style.height = this.height + 'px';
		//msgsdiv.style.top = this.top + 'px';
		msgsdiv.style.left = this.left + 'px';
	}, */
	
	
	setMessage: function(p_msg_txt, p_is_timed, p_is_warning) {

		this.messageText = p_msg_txt;
		let iconimg=null, msgsdiv = document.getElementById(this.elemid);
		if (this.timer != null) {
			clearTimeout(this.timer);
			this.timer = null;
		}
		if (msgsdiv!=null) {

			while (msgsdiv.firstChild) {
				msgsdiv.removeChild(msgsdiv.firstChild);
			}			
			iconimg = document.createElement("img");
			if (p_is_warning) {
				iconimg.src = "media/warning-5-32.png";
			} else {
				iconimg.src = "media/info-3-32.png";
			}

			msgsdiv.appendChild(iconimg);
			
			let p = document.createElement("p");
			p.insertAdjacentHTML('afterBegin', this.messageText);
			msgsdiv.appendChild(p);
			
			msgsdiv.style.display = '';
			msgsdiv.style.opacity = 1;
			this.isvisible = true;
		}
		//this.reshape();

		let tmo;
		if (p_is_timed) {			
			if (p_is_warning) {
				tmo = this.shortMessageTimeout;
			} else {
				tmo = this.messageTimeout;
			}
			this.timer = setTimeout(function() { MessagesController.hideMessage(true); }, tmo);
		}
	},
	
	hideMessage: function(do_fadeout) {
		if (!this.isvisible) {
			return;
		}
		this.timer = null;
		let msgsdiv = document.getElementById(this.elemid);
		this.isvisible = false;
		if (do_fadeout) 
		{
			fadeout(msgsdiv);
		} 
		else 
		{
			if (msgsdiv!=null) {
				msgsdiv.style.display = 'none';
			}
		}
	},
	
	info(p_msg_txt) {
		this.setMessage(p_msg_txt, true, false);
	},

	warn(p_msg_txt) {
		this.setMessage(p_msg_txt, true, true);
	},

	error(p_msg_txt) {
		this.setMessage(p_msg_txt, false, true);
	}	
}



