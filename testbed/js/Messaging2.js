function fadeout(element, heartbeat, p_callback_obj) {
    let op = 1;  // initial opacity
    let timer = setInterval(function () {
        if (op <= 0.2){
			op = 0;
            clearInterval(timer);
            element.style.display = 'none';
            if (p_callback_obj != null && p_callback_obj['threshold'] === undefined) {
				p_callback_obj.execfunc();
			}
        }
		if (p_callback_obj != null && p_callback_obj['threshold'] !== undefined) {
			if (op < p_callback_obj['threshold']) {
				p_callback_obj.execfunc();
			}
		}
        element.style.opacity = op;
		if (op > 0) {
        	op -= op * 0.1;
		}
    }, heartbeat);
    return timer;
}

function getSelOption(p_wdg) {
	return p_wdg.options[p_wdg.selectedIndex].value;
}

// Singleton
let MessagesController2 = {

	// Constantes
	elemid: "mapmsgsdiv",
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
	i18n: null,
	media_root: "",

	setI18n(p_i18nobj) {
		this.i18n = p_i18nobj;
	},

	setMediaRoot(p_path) {
		if (p_path.endsWith("/")) {
			this.media_root = p_path;
		} else {
			this.media_root = p_path + "/";
		}
	},	

	i18nMsg(p_input, p_capitalize) {
		let ret = p_input;
		if (this.i18n) {
			ret = this.i18n.msg(p_input, p_capitalize);
		}
		return ret;
	},

	check() {

		let msgsdiv = document.getElementById(this.elemid);
		msgsdiv.style.display = 'none';

		// attach self close on click event
		(function(p_this, p_msgsdiv) {
			p_msgsdiv.addEventListener('click', (e) => {
				if (!p_this.persist) {
					p_this.hideMessage(true);
				}
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
	
	_setMessage: function(p_msg_txt, p_is_timed, p_type, opt_callback, opt_value_text_dict, opt_constraintitems) {

		this.messageText = p_msg_txt;
		let iconimg=null, msgsdiv = document.getElementById(this.elemid), innercontentdiv;
		if (this.timer != null) {
			clearTimeout(this.timer);
			this.timer = null;
		}

		if (opt_value_text_dict) {
			console.assert(p_type == "SELECT", "optional value-text pairs will work only with type SELECT, not with '%s'", p_type);
		}

		if (msgsdiv!=null) {

			let contentelem = null;
			let initialvalue = null;

			let leftchange = false;
			let topchange = false;
			if (opt_constraintitems) {
				if (opt_constraintitems['left'] !== undefined) {
					msgsdiv.style.left = opt_constraintitems['left'];
					leftchange = true;
				}
				if (opt_constraintitems['top'] !== undefined) {
					msgsdiv.style.top = opt_constraintitems['top'];
					topchange = true;
				}				
			}

			if (!leftchange) {
				msgsdiv.style.left = '30%';
			}
			if (!topchange) {
				if (p_type == "TEXT" || p_type == "NUMBER" || p_type == "SELECT") {
					msgsdiv.style.top = '40%';
				} else {
					msgsdiv.style.top = '10%';
				}
			}

			while (msgsdiv.firstChild) {
				msgsdiv.removeChild(msgsdiv.firstChild);
			}	

			iconimg = document.createElement("img");
			if (p_type == "WARN") {
				this.persist = false;
				iconimg.src = this.media_root + "media/warning-5-32.png";
			} else if (p_type == "INFO") {
				this.persist = false;
				iconimg.src = this.media_root + "media/info-3-32.png";
			} else if (p_type == "YESNO" || p_type == "YESNOCANCEL" || p_type == "OKCANCEL" || p_type == "SELECT" || p_type == "TEXT" || p_type == "NUMBER") {
				this.persist = true;
				iconimg.src = this.media_root + "media/q-32.png";
			}

			msgsdiv.appendChild(iconimg);

			if (typeof this.messageText == "string") {

				if (p_type == "TEXT") {
					contentelem = document.createElement("input");
					contentelem.setAttribute('type', 'text');
					contentelem.value = this.messageText;
					initialvalue = contentelem.value;
					if (opt_constraintitems) {
						if (opt_constraintitems['pattern'] !== undefined) {
							contentelem.setAttribute('pattern',opt_constraintitems['pattern']);
						}
					}
				} else if (p_type == "NUMBER") {
					contentelem = document.createElement("input");
					contentelem.setAttribute('type', 'number');
					contentelem.value = this.messageText;
					initialvalue = contentelem.value;
					if (opt_constraintitems) {
						for (let item of ['min', 'max', 'step', 'pattern']) {
							if (opt_constraintitems[item] !== undefined) {
								contentelem.setAttribute(item, opt_constraintitems[item]);
							}
						}
					}
					if (contentelem.getAttribute('pattern') == null) {
						contentelem.setAttribute('pattern', '\d+');
					}
				} else {
					contentelem = document.createElement("p");
					contentelem.insertAdjacentHTML('afterbegin', this.messageText);
					initialvalue = this.messageText;
				}
				msgsdiv.appendChild(contentelem);

				innercontentdiv = document.createElement("div");
				innercontentdiv.classList.add("innercont");
				msgsdiv.appendChild(innercontentdiv);
									
			} else if (this.messageText instanceof Array) {

				if (this.messageText.length < 1) {
					return;
				}

				if (p_type == "TEXT" || p_type == "NUMBER") {
					console.assert(this.messageText.length > 0 && this.messageText.length < 4, "array of messages for TEXT_xx mode must have 1,2 or 3 lines (just caption; caption, initial textbox content; caption, textbox prefix, initial textbox content)");
				}

				let br, p = document.createElement("p");
				p.insertAdjacentHTML('afterbegin', this.messageText[0]);
				msgsdiv.appendChild(p);

				innercontentdiv = document.createElement("div");
				innercontentdiv.classList.add("innercont");
				msgsdiv.appendChild(innercontentdiv);
				
				for (let i=1; i<this.messageText.length; i++) {
					if (i > 1 && !p_type == "TEXT") {
						br = document.createElement("br");
						innercontentdiv.appendChild(br);	
					}
					if (p_type == "TEXT" && ((i==1 && this.messageText.length == 2) || (i==2 && this.messageText.length == 3))) {

						contentelem = document.createElement("input");
						contentelem.setAttribute('type', 'text');
						contentelem.value = this.messageText[i];	
						initialvalue = contentelem.value;

						if (opt_constraintitems) {
							for (let item of ['pattern']) {
								if (opt_constraintitems[item] !== undefined) {
									contentelem.setAttribute(item, opt_constraintitems[item]);
								}
							}
						}

						innercontentdiv.appendChild(contentelem);

					} else if (p_type == "NUMBER" && ((i==1 && this.messageText.length == 2) || (i==2 && this.messageText.length == 3))) {

						contentelem = document.createElement("input");
						contentelem.setAttribute('type', 'number');
						contentelem.value = this.messageText[i];	
						initialvalue = contentelem.value;

						if (opt_constraintitems) {
							for (let item of ['min', 'max', 'step', 'pattern']) {
								if (opt_constraintitems[item] !== undefined) {
									contentelem.setAttribute(item, opt_constraintitems[item]);
								}
							}
						}						

						if (contentelem.getAttribute('pattern') == null) {
							contentelem.setAttribute('pattern', '\d+');
						}
	
						innercontentdiv.appendChild(contentelem);	

					} else {
						innercontentdiv.insertAdjacentHTML('beforeend', this.messageText[i]);
					}
				}
			}

			msgsdiv.style.display = 'block';
			msgsdiv.style.opacity = 1;
			msgsdiv.style.filter = 'none';
			this.isvisible = true;

			let btn1 = null;

			if (opt_callback) {

				if (!opt_value_text_dict) {

					const ctrldiv = document.createElement("div");
					ctrldiv.style.float = "right";
					innercontentdiv.appendChild(ctrldiv);

					if (p_type == "YESNO" || p_type == "YESNOCANCEL" || p_type.endsWith("OKCANCEL") || p_type == "TEXT" || p_type == "NUMBER") {

						btn1 = document.createElement("button");
						const btn2 = document.createElement("button");
						let btn3 = null;
						btn1.setAttribute("type", "button");
						btn2.setAttribute("type", "button");
						if (p_type.startsWith("YESNO")) {
							btn1.insertAdjacentHTML('afterBegin', this.i18nMsg("Y", true));
							btn2.insertAdjacentHTML('afterBegin', this.i18nMsg("N", true));
							if (p_type.endsWith("CANCEL")) {
								btn3 = document.createElement("button");
								btn3.insertAdjacentHTML('afterBegin', this.i18nMsg("C", true));
							}
						} else if (p_type.endsWith("OKCANCEL") || p_type == "TEXT" || p_type == "NUMBER") {
							btn1.insertAdjacentHTML('afterBegin', "Ok");
							btn1.disabled = true;
							btn2.insertAdjacentHTML('afterBegin', this.i18nMsg("C", true));
						}
						ctrldiv.appendChild(btn1);
						ctrldiv.appendChild(btn2);
						if (btn3) {
							ctrldiv.appendChild(btn3);
						}

						// Activation of OK button when effective content change happens 
						(function(p_init_value, p_content_elem, p_btn) {
							['change', 'keypress'].forEach(evttype => {
								p_content_elem.addEventListener(evttype, function(ev) {
									if (p_content_elem.value != p_init_value) {
										p_btn.disabled = false;
									}
								});
							});
						})(initialvalue, contentelem, btn1);					

						(function(p_this, p_btn, pp_type, pp_callback) {
							p_btn.addEventListener('click', function(ev) {
								p_this.hideMessage(false);
								let ret = null;
								if (contentelem) {
									ret = contentelem.value;
								}
								pp_callback(ev, true, ret);
							});
						})(this, btn1, p_type, opt_callback);

						(function(p_this, p_btn, pp_callback) {
							p_btn.addEventListener('click', function(ev) {
								p_this.hideMessage(true);
								pp_callback(ev, false, null);
							});
						})(this, btn2, opt_callback);

						if (btn3) {
							(function(p_this, p_btn, pp_callback) {
								p_btn.addEventListener('click', function(ev) {
									p_this.hideMessage(true);
									pp_callback(ev, null, null);
								});
							})(this, btn3, opt_callback);						
						}

					}

				} else {

					const wdg0 = document.createElement("div");
					wdg0.classList.add("attention-select");
					innercontentdiv.appendChild(wdg0);

					const ctrldiv = document.createElement("div");
					ctrldiv.style.float = "right";
					innercontentdiv.appendChild(ctrldiv);

					contentelem = document.createElement("select");
					wdg0.appendChild(contentelem);

					let optel;
					for (let k in opt_value_text_dict) {
						optel = document.createElement("option");
						optel.value = k;
						optel.text = opt_value_text_dict[k];
						contentelem.appendChild(optel);

						if (opt_constraintitems) {
							if (opt_constraintitems['selected'] !== undefined) {
								if (opt_constraintitems['selected'] == k) {
									optel.selected = 'selected';
									optel.style.fontWeight = 'bold';
								}
							}
						}
					}

					const btn1 = document.createElement("button");
					const btn2 = document.createElement("button");
					btn1.setAttribute("type", "button");
					btn2.setAttribute("type", "button");
					ctrldiv.appendChild(btn1);
					ctrldiv.appendChild(btn2);

					btn1.insertAdjacentHTML('afterBegin', "Ok");
					btn2.insertAdjacentHTML('afterBegin', this.i18nMsg("C", true));

					if (contentelem != null) { 
						(function(p_this, p_selel, p_btn, pp_callback) {
							p_btn.addEventListener('click', function(ev) {
								const optval = getSelOption(p_selel);
								p_this.hideMessage(true);						
								pp_callback(ev, true, optval);
							});
						})(this, contentelem, btn1, opt_callback);
					}

					(function(p_this, p_btn, pp_callback) {
						p_btn.addEventListener('click', function(ev) {
							p_this.hideMessage(true);
							pp_callback(ev, false, null);
						});
					})(this, btn2, opt_callback);				
				
				}

			}

			if (contentelem) {
				contentelem.focus({ focusVisible: true });
			}

		}

		let tmo;
		if (p_is_timed) {			
			if (p_type == "WARN") {
				tmo = this.shortMessageTimeout;
			} else {
				tmo = this.messageTimeout;
			}
			this.timer = setTimeout(function() { MessagesController2.hideMessage(true); }, tmo);
		}
	},

	setMessage: function(p_msg_txt, p_is_timed, p_is_warning) {
		
		let type;
		if (p_is_warning) {
			type = 'WARN';
		} else {
			type = 'INFO';
		}

		this._setMessage(p_msg_txt, p_is_timed, type);
	},
	
	/*setMessage: function(p_msg_txt, p_is_timed, p_is_warning) {

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
			this.timer = setTimeout(function() { MessagesController2.hideMessage(true); }, tmo);
		}
	},*/

	confirmMessage: function(p_msg_txt, p_yes_no, p_callback, opt_adic_cancel_for_yesno) {
		
		let type;
		if (p_yes_no) {
			if (opt_adic_cancel_for_yesno) {
				type = 'YESNOCANCEL';
			} else {
				type = 'YESNO';
			}
		} else {
			type = 'OKCANCEL';
		}

		this._setMessage(p_msg_txt, false, type, p_callback);
	},

	selectInputMessage: function(p_msg_txt, p_value_text_pairs, p_callback, opt_constraint_items) {
		
		this._setMessage(p_msg_txt, false, "SELECT", p_callback, p_value_text_pairs, opt_constraint_items);
	},	

	textInputMessage: function(p_msg_txt, p_callback, opt_constraint_items) {

		this._setMessage(p_msg_txt, false, "TEXT", p_callback, null, opt_constraint_items);
	},
	
	numberInputMessage: function(p_msg_txt, p_callback, opt_constraint_items) {

		this._setMessage(p_msg_txt, false, "NUMBER", p_callback, null, opt_constraint_items);
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



