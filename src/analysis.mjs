
import {GlobalConst} from './constants.js';
import {ctrToolTip, MapPrintInRect} from './customization_canvas_baseclasses.mjs';

export class AnalysisMgr extends MapPrintInRect {

	left;
	boxh;
	boxw;
	top;

	activeStyleFront;
	enabledFillStyleFront;
	inactiveStyleFront;
	margin_offset;
	normalszPX;
	fontfamily;

	leftcol_width;
	print_attempts;
	had_prev_interaction;
	collapsedstate;
	prevboxenv;
	bottom;
	other_widgets;
	std_boxdims;
	active_mode;
	slicing_filter_active;
	slicing_available;
	dashboard_available;

	constructor(p_mapctx, p_other_widgets) {

		super();
		this.name = "AnalysisMgr";
		this.active_mode = 'NONE';

		this.other_widgets = p_other_widgets;

		// ** - can be overrriden in basic config, at 'style_override' group, 
		//      creating a key with same property name in CONTROLS_STYLES, but in lower case

		this.fillStyleBack = GlobalConst.CONTROLS_STYLES.AM_BCKGRD;  // **
		this.activeStyleFront = GlobalConst.CONTROLS_STYLES.AM_ACTIVECOLOR;
		this.enabledFillStyleFront = GlobalConst.CONTROLS_STYLES.AM_INACTIVECOLOR;
		this.inactiveStyleFront = GlobalConst.CONTROLS_STYLES.AM_INACTIVECOLOR;
		this.margin_offset = GlobalConst.CONTROLS_STYLES.OFFSET;
		this.normalszPX = GlobalConst.CONTROLS_STYLES.AM_NORMALSZ_PX;

		if (p_mapctx.cfgvar["basic"]["style_override"] !== undefined && p_mapctx.cfgvar["basic"]["style_override"]["fontfamily"] !== undefined) {		
			this.fontfamily = p_mapctx.cfgvar["basic"]["style_override"]["fontfamily"];
		} else {
			this.fontfamily = GlobalConst.CONTROLS_STYLES.FONTFAMILY;
		}

		this.std_boxdims = GlobalConst.CONTROLS_STYLES.AM_BOXDIMS;
		this.inUseStyle = GlobalConst.CONTROLS_STYLES.AM_INUSE;
		this.canvaslayer = 'service_canvas'; 
		this.slicing_filter_active = false;

		this.left = 600;
		this.top = 600;
		this.boxh = {
			"OPEN": this.std_boxdims[1],
			"COLLAPSED": 60
		};
		this.boxw = {
			"OPEN": this.std_boxdims[0],
			"COLLAPSED": 60
		};

		this.print_attempts = 0;
		this.had_prev_interaction = false;

		this.expandenv = 1;
		this.prevboxenv = null;

		this.slicing_available = false;
		this.dashboard_available = false;
	
		/*let mapdims = [];
		p_mapctx.renderingsmgr.getCanvasDims(mapdims);

		if (mapdims[0] <  GlobalConst.CONTROLS_STYLES.AM_START_COLLAPSED_CANVAS_MAXWIDTH) {
			this.collapsedstate = "COLLAPSED";
		} else {
			this.collapsedstate = "OPEN";
		}

		this.bottom = mapdims[1];

		this.top = this.bottom - this.boxh[this.collapsedstate];*/

	}

	itemsAvailable(p_has_slicing, p_has_dashboarding) {

		this.slicing_available = p_has_slicing;
		this.dashboard_available = p_has_dashboarding;
	}

	preCalcDims(p_mapctx) {

		const dims=[];
		p_mapctx.getCanvasDims(dims);

		if (dims[0] <  GlobalConst.CONTROLS_STYLES.AM_START_COLLAPSED_CANVAS_MAXWIDTH) {
			this.collapsedstate = "COLLAPSED";
		} else {
			this.collapsedstate = "OPEN";
		}

		this.bottom = dims[1];

		this.top = this.bottom - this.boxh[this.collapsedstate];

	}

	getHeight() {
		return this.boxh[this.collapsedstate];
	}

	_print(p_mapctx) {

		const icondim = GlobalConst.CONTROLS_STYLES.AM_ICONDIM;

		const ctx = p_mapctx.renderingsmgr.getDrwCtx(this.canvaslayer, '2d');
		ctx.save();

		this.preCalcDims(p_mapctx)

		// cal width
		this.boxw["OPEN"] = this.std_boxdims[0];

		let mapdims = [];
		p_mapctx.renderingsmgr.getCanvasDims(mapdims);

		this.left = mapdims[0] - (this.boxw[this.collapsedstate] + this.margin_offset);

		try {

			this.boxh["OPEN"] = this.std_boxdims[1];

			let otherboxesheight = 0;
			for (let ow of this.other_widgets) {
				if (ow['setdims'] !== undefined) {
					ow.setdims(p_mapctx, mapdims);
				}		
				otherboxesheight += ow.getHeight();
				// console.warn("AM boxesheight:", otherboxesheight, this.other_widgets.length);
			}
			this.bottom = mapdims[1] - otherboxesheight - this.margin_offset;
		
			// background
			
			// BASIC_CONFIG_DEFAULTS_OVERRRIDE ctx.clearRect(this.left, this.top, this.boxw, this.boxh); 
			if (p_mapctx.cfgvar["basic"]["style_override"] !== undefined && p_mapctx.cfgvar["basic"]["style_override"]["am_bckgrd"] !== undefined) {
				ctx.fillStyle = p_mapctx.cfgvar["basic"]["style_override"]["am_bckgrd"];
			} else {
				ctx.fillStyle = this.fillStyleBack;
			}

			this.top = this.bottom - this.boxh[this.collapsedstate];

			if (this.prevboxenv) {
				//ctx.clearRect(...this.prevboxenv); 	
				this.prevboxenv = null;
			} else {
				const dee = 2 * this.expandenv;
				//console.warn("CR 2:", this.left-this.expandenv, this.top-this.expandenv, this.boxw[this.collapsedstate]+dee, this.boxh[this.collapsedstate]+dee);
				ctx.clearRect(this.left-this.expandenv, this.top-this.expandenv, this.boxw[this.collapsedstate]+dee, this.boxh[this.collapsedstate]+dee); 	
			}
		
			//console.log(this.left, this.top, this.boxw[this.collapsedstate], this.boxh[this.collapsedstate]);
			ctx.fillRect(this.left, this.top, this.boxw[this.collapsedstate], this.boxh[this.collapsedstate]);
			
			ctx.strokeStyle = this.activeStyleFront;
			ctx.lineWidth = this.strokeWidth;
			ctx.strokeRect(this.left, this.top, this.boxw[this.collapsedstate], this.boxh[this.collapsedstate]);

			if (this.collapsedstate == "OPEN") {

				let vstyle;
				const imgfilt = new Image();
				imgfilt.decoding = "sync";

				if (!this.slicing_available) {
					vstyle = this.inactiveStyleFront;
				} else {
					if (this.active_mode == 'SEG') {
						vstyle = this.inUseStyle;
					} else {
						vstyle = this.activeStyleFront;
					}	
				}
				let imgfltsrc = p_mapctx.cfgvar["basic"]["filtericon"].replace(/stroke:%23fff;/g, `stroke:${encodeURIComponent(vstyle)};`);

				if (this.slicing_filter_active) {
					imgfltsrc = imgfltsrc.replace(/fill:none;/g, `fill:${encodeURIComponent(this.enabledFillStyleFront)};`);
				}

				const imgchart = new Image();
				imgchart.decoding = "sync";

				let imgchrtsrc;
				if (!this.dashboard_available) {
					vstyle = this.inactiveStyleFront;
				} else {
					if (this.active_mode == 'DASH') {
						vstyle = this.inUseStyle;
					} else {
						vstyle = this.activeStyleFront;
					}
				}
				imgchrtsrc = p_mapctx.cfgvar["basic"]["charticon"].replace(/stroke:%23fff;/g, `stroke:${encodeURIComponent(vstyle)};`);

				const topval = this.top+this.margin_offset;
				const occupwidth = 2*icondim + 2*this.margin_offset;
				const leftoffset = (this.std_boxdims[0] - occupwidth) / 2.0;

				imgchart.src = imgchrtsrc;
				imgchart.decode()
				.then(() => {
					ctx.drawImage(imgchart, this.left+leftoffset, topval, icondim, icondim);
				});

				ctx.beginPath()
				const xval = this.left+leftoffset+this.margin_offset+icondim;
				ctx.moveTo(xval, topval);
				ctx.lineTo(xval, topval+icondim);
				ctx.stroke();

				imgfilt.src = imgfltsrc;
				imgfilt.decode()
				.then(() => {
					ctx.drawImage(imgfilt, xval+this.margin_offset, topval, icondim, icondim);
				});


			} else {

				const leftx = this.left + this.margin_offset;
				const rightx = this.left + this.boxw["COLLAPSED"] - this.margin_offset;

				const ynsteps = 4;
				const ystep = this.boxh["COLLAPSED"] / (ynsteps+1);
				let cota;

				ctx.save();
				for (let ri=0; ri<ynsteps; ri++) {

					cota = this.top + (ri+1) * ystep;

					ctx.strokeStyle = GlobalConst.CONTROLS_STYLES.TOC_COLLAPSED_STRIPES_FILL;
					ctx.lineWidth = 6;
					ctx.lineCap = "round";
					ctx.beginPath();
					ctx.moveTo(leftx, cota);
					ctx.lineTo(rightx, cota);
					ctx.stroke();
				}
				ctx.restore();
			}

		} catch(e) {
			throw e;
		} finally {
			ctx.restore();
		}
	}	

	print(p_mapctx) {
		const that = this;
		// prevent drawing before configured fonts are available
		while (!document.fonts.check("10px "+this.fontfamily) && this.print_attempts < 10) {
			setTimeout(() => {
				that.print(p_mapctx);
			}, 200);
			that.print_attempts++;
			return;
		}
		this.print_attempts = 0;
		return this._print(p_mapctx)
	}

	_checkPickWhichSide(p_evt) {
		let ret = null;
		
		if (p_evt.offsetX >= this.left+this.margin_offset && 
			p_evt.offsetX <= this.left+(this.boxw[this.collapsedstate] / 2.0) && 
			p_evt.offsetY >= this.top+this.margin_offset && 
			p_evt.offsetY <= this.top+this.boxh[this.collapsedstate]-+this.margin_offset) {					
				ret = 'LEFT';
		} else if (p_evt.offsetX >= this.left+(this.boxw[this.collapsedstate] / 2.0) && 
			p_evt.offsetX <= this.left+this.boxw[this.collapsedstate]-this.margin_offset && 
			p_evt.offsetY >= this.top+this.margin_offset && 
			p_evt.offsetY <= this.top+this.boxh[this.collapsedstate]-this.margin_offset) {
				ret = 'RIGHT';
		}

		return ret;
	}

	interact(p_mapctx, p_evt) {
		let topcnv, ret = false;

		if (p_evt.offsetX >= this.left && 
			p_evt.offsetX <= this.left+this.boxw[this.collapsedstate] && 
			p_evt.offsetY >= this.top && 
			p_evt.offsetY <= this.top+this.boxh[this.collapsedstate]) {

				switch(p_evt.type) {

					case 'mousemove':
		
						topcnv = p_mapctx.renderingsmgr.getTopCanvas();
						topcnv.style.cursor = "pointer";
						let msg;

						if (this.collapsedstate == "OPEN") {

							if (this._checkPickWhichSide(p_evt) == 'LEFT') {					
								msg = p_mapctx.i18n.msg('DASH', true);
							}
							else if (this._checkPickWhichSide(p_evt) == 'RIGHT') {					
								msg = p_mapctx.i18n.msg('SEGM', true);
							}

						} else {
							msg = p_mapctx.i18n.msg('SHOWAP', true);
						}

						ctrToolTip(p_mapctx, p_evt, msg, [250,30]);	
						break;

					case 'mouseup':
					case 'touchend':

						const ci = p_mapctx.getCustomizationObject();
						if (ci == null) {
							throw new Error("map context customization instance is missing")
						}

						if (this._checkPickWhichSide(p_evt) == 'LEFT') {					

							if (this.active_mode == 'DASH') {

									this.active_mode = 'NONE';
	
									const dashpanel = ci.instances["dashboard"];
									this.print(p_mapctx);
									dashpanel.closeAction(p_mapctx);								
	
							} else {

								if (this.active_mode == 'SEG') {
									const segpanel = ci.instances["slicing"];
									this.print(p_mapctx);
									segpanel.closeAction(p_mapctx);								
								} 

								this.active_mode = 'DASH';

								const dashpanel = ci.instances["dashboard"];
								this.print(p_mapctx);
								dashpanel.setState(p_mapctx, true);	
							}

						}
						else if (this._checkPickWhichSide(p_evt) == 'RIGHT') {					
					
							if (this.active_mode == 'SEG') {

								this.active_mode = 'NONE';

								const segpanel = ci.instances["slicing"];
								this.print(p_mapctx);
								segpanel.closeAction(p_mapctx);								

							} else {

								if (this.active_mode == 'DASH') {
									const dashpanel = ci.instances["dashboard"];
									this.print(p_mapctx);
									dashpanel.closeAction(p_mapctx);								
								} 
								this.active_mode = 'SEG';

								const segpanel = ci.instances["slicing"];
								this.print(p_mapctx);
								segpanel.setState(p_mapctx, true);	
							}
						}
						break;

					default:
						topcnv = p_mapctx.renderingsmgr.getTopCanvas();
						topcnv.style.cursor = "default";
				}

				//console.log("1296:", p_evt.type);
				ret = true;
		}

		if (ret) {

			if (!this.had_prev_interaction) {
				p_mapctx.clearInteractions('ANALYSISMGR');
			}
			this.had_prev_interaction = true;

		} else {

			if (this.had_prev_interaction) {

				// emulating mouseout
				topcnv = p_mapctx.renderingsmgr.getTopCanvas();
				topcnv.style.cursor = "default";

				p_mapctx.clearInteractions('ANALYSISMGR');

				this.had_prev_interaction = false;
			}
		}

		return ret;
	}

	collapse(p_mapctx) {

		if (this.collapsedstate != "COLLAPSED") {

			const dee = 2 * this.expandenv;

			this.prevboxenv = [this.left-this.expandenv, this.top-this.expandenv, this.boxw[this.collapsedstate]+dee, this.boxh[this.collapsedstate]+dee];
			this.collapsedstate = "COLLAPSED";
			this.print(p_mapctx);

		}

		return (this.collapsedstate == "COLLAPSED");
	}

	isCollapsed() {
		return (this.collapsedstate == "COLLAPSED");
	}

	inflate(p_mapctx) {
		this.collapsedstate = "OPEN";
		this.print(p_mapctx);

		return (this.collapsedstate == "OPEN");
	}	

	deactivateSlicingPanelOpenedSign(p_mapctx, p_slicing_is_enabled) {

		let changed = false;
		if (this.active_mode == "SEG") {
			this.active_mode = 'NONE';
			changed = true;
		}

		if (this.slicing_filter_active != p_slicing_is_enabled) {
			this.slicing_filter_active = p_slicing_is_enabled;
			changed = true;
		}

		if (changed) {
			this.print(p_mapctx);
		}

	}

	deactivateDashboardPanelOpenedSign(p_mapctx) {

		let changed = false;
		if (this.active_mode == "DASH") {
			this.active_mode = 'NONE';
			changed = true;
		}

		if (changed) {
			this.print(p_mapctx);
		}

	}

}

export class SelectionsNavigator extends MapPrintInRect {

	left;
	boxh;
	boxw;
	top;
	fillStyleBack; 
	fillStyleFront; 
	font;
	leftcol_width;
	print_attempts;
	had_prev_interaction;
	collapsedstate;
	prevboxenv;
	bottom;
	other_widgets;
	std_boxdims;

	constructor(p_mapctx, p_other_widgets) {

		super();
		this.name = "SelectionsNavigator";

		this.other_widgets = p_other_widgets;

		// BASIC_CONFIG_DEFAULTS_OVERRRIDE
		// ** - can be overrriden in basic config, at 'style_override' group, 
		//      creating a key with same property name in CONTROLS_STYLES, but in lower case

		this.fillStyleBack = GlobalConst.CONTROLS_STYLES.SN_BCKGRD; // **
		this.activeStyleFront = GlobalConst.CONTROLS_STYLES.SN_ACTIVECOLOR;
		this.inactiveStyleFront = GlobalConst.CONTROLS_STYLES.SN_INACTIVECOLOR;
		this.margin_offset = GlobalConst.CONTROLS_STYLES.OFFSET;
		this.normalszPX = GlobalConst.CONTROLS_STYLES.SN_NORMALSZ_PX;

		if (p_mapctx.cfgvar["basic"]["style_override"] !== undefined && p_mapctx.cfgvar["basic"]["style_override"]["fontfamily"] !== undefined) {		
			this.fontfamily = p_mapctx.cfgvar["basic"]["style_override"]["fontfamily"];
		} else {
			this.fontfamily = GlobalConst.CONTROLS_STYLES.FONTFAMILY;
		}

		this.canvaslayer = 'service_canvas'; 
		this.std_boxdims = GlobalConst.CONTROLS_STYLES.SN_BOXDIMS;

		this.left = 600;
		this.top = 600;
		this.boxh = {
			"OPEN": this.std_boxdims[1],
			"COLLAPSED": 60
		};
		this.boxw = {
			"OPEN": this.std_boxdims[0],
			"COLLAPSED": 60
		};

		this.print_attempts = 0;
		this.had_prev_interaction = false;

		this.expandenv = 1;
		this.prevboxenv = null;

		let mapdims = [];
		p_mapctx.renderingsmgr.getCanvasDims(mapdims);

		if (mapdims[0] <  GlobalConst.CONTROLS_STYLES.AM_START_COLLAPSED_CANVAS_MAXWIDTH) {
			this.collapsedstate = "COLLAPSED";
		} else {
			this.collapsedstate = "OPEN";
		}

		this.bottom = mapdims[1];

		this.top = this.bottom - this.boxh[this.collapsedstate];

	}

	getHeight() {
		return this.boxh[this.collapsedstate];
	}

	preCalcDims(p_mapctx) {

		const dims=[];
		p_mapctx.getCanvasDims(dims);

		if (dims[0] <  GlobalConst.CONTROLS_STYLES.AM_START_COLLAPSED_CANVAS_MAXWIDTH) {
			this.collapsedstate = "COLLAPSED";
		} else {
			this.collapsedstate = "OPEN";
		}

		this.bottom = dims[1];

		this.top = this.bottom - this.boxh[this.collapsedstate];

	}

	_print(p_mapctx) {

		const ctx = p_mapctx.renderingsmgr.getDrwCtx(this.canvaslayer, '2d');
		ctx.save();

		this.preCalcDims(p_mapctx)

		console.log("OPENED", );

		// cal width
		this.boxw["OPEN"] = this.std_boxdims[1];

		let mapdims = [];
		p_mapctx.renderingsmgr.getCanvasDims(mapdims);

		this.left = mapdims[0] - (this.boxw[this.collapsedstate] + this.margin_offset);

		try {

			this.boxh["OPEN"] = this.std_boxdims[0];

			let boxesheight = 0;
			for (let ow of this.other_widgets) {
				if (ow['setdims'] !== undefined) {
					ow.setdims(p_mapctx, mapdims);
				}		
				boxesheight += ow.getHeight();
				//console.warn("SN boxesheight:", boxesheight, this.other_widgets.length);
			}
			this.bottom = mapdims[1] - boxesheight - this.margin_offset;
		
			// background
			
			// ctx.clearRect(this.left, this.top, this.boxw, this.boxh); 
			// BASIC_CONFIG_DEFAULTS_OVERRRIDE set_mapenv_cookies
			if (p_mapctx.cfgvar["basic"]["style_override"] !== undefined && p_mapctx.cfgvar["basic"]["style_override"]["sn_bckgrd"] !== undefined) {
				ctx.fillStyle = p_mapctx.cfgvar["basic"]["style_override"]["sn_bckgrd"];
			} else {
				ctx.fillStyle = this.fillStyleBack;
			}

			this.top = this.bottom - this.boxh[this.collapsedstate];

			if (this.prevboxenv) {
				// console.warn("CR 1:", this.prevboxenv);
				// ctx.clearRect(...this.prevboxenv); 	
				this.prevboxenv = null;
			} else {
				const dee = 2 * this.expandenv;
				// console.warn("CR 2:", this.left-this.expandenv, this.top-this.expandenv, this.boxw[this.collapsedstate]+dee, this.boxh[this.collapsedstate]+dee);
				ctx.clearRect(this.left-this.expandenv, this.top-this.expandenv, this.boxw[this.collapsedstate]+dee, this.boxh[this.collapsedstate]+dee); 	
			}

			//console.log(this.left, this.top, this.boxw[this.collapsedstate], this.boxh[this.collapsedstate]);
			ctx.fillRect(this.left, this.top, this.boxw[this.collapsedstate], this.boxh[this.collapsedstate]);
			
			ctx.strokeStyle = this.activeStyleFront;
			ctx.lineWidth = this.strokeWidth;
			ctx.strokeRect(this.left, this.top, this.boxw[this.collapsedstate], this.boxh[this.collapsedstate]);


			if (this.collapsedstate == "OPEN") {

			} else {

				// stripes pattern

				const leftx = this.left + this.margin_offset;
				const rightx = this.left + this.boxw["COLLAPSED"] - this.margin_offset;

				const ynsteps = 4;
				const ystep = this.boxh["COLLAPSED"] / (ynsteps+1);
				let cota;

				ctx.save();
				for (let ri=0; ri<ynsteps; ri++) {

					cota = this.top + (ri+1) * ystep;

					ctx.strokeStyle = GlobalConst.CONTROLS_STYLES.TOC_COLLAPSED_STRIPES_FILL;
					ctx.lineWidth = 6;
					ctx.lineCap = "round";
					ctx.beginPath();
					ctx.moveTo(leftx, cota);
					ctx.lineTo(rightx, cota);
					ctx.stroke();
				}
				ctx.restore();
			}

		} catch(e) {
			throw e;
		} finally {
			ctx.restore();
		}
	}	

	print(p_mapctx) {
		const that = this;
		// prevent drawing before configured fonts are available
		while (!document.fonts.check("10px "+this.fontfamily) && this.print_attempts < 10) {
			setTimeout(() => {
				that.print(p_mapctx);
			}, 200);
			that.print_attempts++;
			return;
		}
		this.print_attempts = 0;
		return this._print(p_mapctx)
	}

	interact(p_mapctx, p_evt) {
		let topcnv, ret = false;

		if (p_evt.offsetX >= this.left && 
			p_evt.offsetX <= this.left+this.boxw[this.collapsedstate] && 
			p_evt.offsetY >= this.top && 
			p_evt.offsetY <= this.top+this.boxh[this.collapsedstate]) {

				switch(p_evt.type) {

					case 'mousemove':
		
						topcnv = p_mapctx.renderingsmgr.getTopCanvas();
						topcnv.style.cursor = "pointer";
						let msg;

						if (this.collapsedstate == "OPEN") {
							msg = p_mapctx.i18n.msg('NAV', true);
						} else {
							msg = p_mapctx.i18n.msg('SHOWNAV', true);
						}

						ctrToolTip(p_mapctx, p_evt, msg, [250,30]);	
						break;

					default:
						topcnv = p_mapctx.renderingsmgr.getTopCanvas();
						topcnv.style.cursor = "default";
				}

				//console.log("1296:", p_evt.type);
				ret = true;
		}

		if (ret) {

			if (!this.had_prev_interaction) {
				p_mapctx.clearInteractions('NAV');
			}
			this.had_prev_interaction = true;

		} else {

			if (this.had_prev_interaction) {

				// emulating mouseout
				topcnv = p_mapctx.renderingsmgr.getTopCanvas();
				topcnv.style.cursor = "default";

				p_mapctx.clearInteractions('NAV');

				this.had_prev_interaction = false;
			}
		}

		return ret;
	}

	collapse(p_mapctx) {

		if (this.collapsedstate != "COLLAPSED") {

			const dee = 2 * this.expandenv;

			this.prevboxenv = [this.left-this.expandenv, this.top-this.expandenv, this.boxw[this.collapsedstate]+dee, this.boxh[this.collapsedstate]+dee];
			this.collapsedstate = "COLLAPSED";
			this.print(p_mapctx);

		}

		return (this.collapsedstate == "COLLAPSED");
	}

	isCollapsed() {
		return (this.collapsedstate == "COLLAPSED");
	}

	inflate(p_mapctx) {
		this.collapsedstate = "OPEN";
		this.print(p_mapctx);

		return (this.collapsedstate == "OPEN");
	}	
}