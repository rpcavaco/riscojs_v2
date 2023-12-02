import {GlobalConst} from './constants.js';
import {ctrToolTip, MapPrintInRect} from './customization_canvas_baseclasses.mjs';

export class EditingMgr extends MapPrintInRect {

	current_user;
	current_user_canedit;
	#editing_is_enabled;
	editable_layers;

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

	print_attempts;
	had_prev_interaction;
	// collapsedstate;
	prevboxenv;
	bottom;
	other_widgets;
	std_boxdims;
	// active_mode;

	#current_edit_features;

	constructor(p_mapctx, p_editable_layers, p_other_widgets) {

		super();
		this.name = "EditingMgr";

		this.other_widgets = p_other_widgets;

		this.editable_layers = p_editable_layers;
		this.current_user_canedit = false;
		this.#editing_is_enabled = false;

		this.fillStyleBack = GlobalConst.CONTROLS_STYLES.EM_BCKGRD;  // **
		this.activeStyleFront = GlobalConst.CONTROLS_STYLES.EM_ACTIVECOLOR;
		this.enabledFillStyleFront = GlobalConst.CONTROLS_STYLES.EM_INACTIVECOLOR;
		this.inactiveStyleFront = GlobalConst.CONTROLS_STYLES.EM_INACTIVECOLOR;
		this.margin_offset = GlobalConst.CONTROLS_STYLES.OFFSET;
		this.normalszPX = GlobalConst.CONTROLS_STYLES.EM_NORMALSZ_PX;		
		this.strokeWidth = GlobalConst.CONTROLS_STYLES.STROKEWIDTH;

		if (p_mapctx.cfgvar["basic"]["style_override"] !== undefined && p_mapctx.cfgvar["basic"]["style_override"]["fontfamily"] !== undefined) {		
			this.fontfamily = p_mapctx.cfgvar["basic"]["style_override"]["fontfamily"];
		} else {
			this.fontfamily = GlobalConst.CONTROLS_STYLES.FONTFAMILY;
		}

		this.canvaslayer = 'service_canvas'; 

		this.left = 600;
		this.top = 600;

		this.expandenv = 1;
		this.prevboxenv = null;

		this.print_attempts = 0;
		this.had_prev_interaction = false;

		this.#current_edit_features = null;

		p_mapctx.toolmgr.setEditingManager(this);
	}

	getHeight() {
		return this.boxh;
	}

	_print(p_mapctx) {

		const ctx = p_mapctx.renderingsmgr.getDrwCtx(this.canvaslayer, '2d');
		ctx.save();

		let mapdims = [];
		p_mapctx.renderingsmgr.getCanvasDims(mapdims);

		const icondims = GlobalConst.CONTROLS_STYLES.EM_ICONDIMS;

		this.boxh = icondims[1] + 2 * this.margin_offset;
		this.boxw = icondims[0] + 2 * this.margin_offset;

		this.left = mapdims[0] - (this.boxw + this.margin_offset);

		try {

			let otherboxesheight = 0;
			for (let ow of this.other_widgets) {
				if (ow['setdims'] !== undefined) {
					ow.setdims(p_mapctx, mapdims);
				}		
				otherboxesheight += ow.getHeight();
				// console.warn("AM boxesheight:", otherboxesheight, this.other_widgets.length);
			}

			this.top = otherboxesheight + 2 * this.margin_offset;
			this.bottom = this.top + this.boxh;
	
			// background
			
			// BASIC_CONFIG_DEFAULTS_OVERRRIDE ctx.clearRect(this.left, this.top, this.boxw, this.boxh); 
			if (p_mapctx.cfgvar["basic"]["style_override"] !== undefined && p_mapctx.cfgvar["basic"]["style_override"]["em_bckgrd"] !== undefined) {
				ctx.fillStyle = p_mapctx.cfgvar["basic"]["style_override"]["em_bckgrd"];
			} else {
				ctx.fillStyle = this.fillStyleBack;
			}

			this.top = this.bottom - this.boxh;

			const dee = 2 * this.expandenv;
			ctx.clearRect(this.left-this.expandenv, this.top-this.expandenv, this.boxw+dee, this.boxh+dee); 	

			ctx.fillRect(this.left, this.top, this.boxw, this.boxh);
			
			ctx.strokeStyle = this.activeStyleFront;
			ctx.lineWidth = this.strokeWidth;
			ctx.strokeRect(this.left, this.top, this.boxw, this.boxh);

			let iconname = "edit_off";
			if (this.#editing_is_enabled) {
				iconname = "edit_on";
			}
			const img = new Image();
			img.decoding = "sync";

			let imgsrc = p_mapctx.cfgvar["basic"][iconname]; //.replace(/stroke:%23fff;/g, `stroke:${encodeURIComponent(vstyle)};`);

			img.src = imgsrc;
			img.decode()
			.then(() => {
				ctx.drawImage(img, this.left+this.margin_offset, this.top+this.margin_offset, icondims[0], icondims[1]);
			});

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
			p_evt.offsetX <= this.left+this.boxw && 
			p_evt.offsetY >= this.top && 
			p_evt.offsetY <= this.top+this.boxh) {

				switch(p_evt.type) {

					case 'mousemove':
		
						topcnv = p_mapctx.renderingsmgr.getTopCanvas();
						topcnv.style.cursor = "pointer";
						let msg;

						if (this.#editing_is_enabled) {
							msg = p_mapctx.i18n.msg('STOPEDIT', true);
						} else {
							msg = p_mapctx.i18n.msg('STARTEDIT', true);
						}

						ctrToolTip(p_mapctx, p_evt, msg, [250,30]);	
						break;

					case 'mouseup':
					case 'touchend':

						const ci = p_mapctx.getCustomizationObject();
						if (ci == null) {
							throw new Error("map context customization instance is missing")
						}

						this.#editing_is_enabled = !this.#editing_is_enabled;
						this.print(p_mapctx);
	
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
				p_mapctx.clearInteractions('EDITMGR');
			}
			this.had_prev_interaction = true;

		} else {

			if (this.had_prev_interaction) {

				// emulating mouseout
				topcnv = p_mapctx.renderingsmgr.getTopCanvas();
				topcnv.style.cursor = "default";

				p_mapctx.clearInteractions('EDITMGR');

				this.had_prev_interaction = false;
			}
		}

		return ret;
	} 
	
	setCurrentUser(p_username, b_user_canedit) {
		this.current_user = p_username;
		this.current_user_canedit = b_user_canedit;
	}
	
	setEditingEnabled(p_editing_is_enabled) {
		this.#editing_is_enabled = p_editing_is_enabled;
	}	

	isEditingEnabled() {
		return this.#editing_is_enabled;
	}
	
	setCurrentEditFeatures(p_feat_dict) {
		console.log(p_feat_dict);
		this.#current_edit_features = p_feat_dict;
	}
}