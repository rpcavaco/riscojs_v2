
import {GlobalConst} from './constants.js';
import {I18n} from './i18n.mjs';

export class SlicingPanel {

	top;
	left;
	width;
	height;
	had_prev_interaction;
	
	canvaslayer = 'data_viz';

	fillStyleBack;
	activeStyleFront;
	inactiveStyleFront;
	is_active;

	constructor() {

		this.fillTextStyle = GlobalConst.CONTROLS_STYLES.SEG_TEXTFILL;  
		this.fillStyleBack = GlobalConst.CONTROLS_STYLES.SEG_BCKGRD; 
		this.activeStyleFront = GlobalConst.CONTROLS_STYLES.SEG_ACTIVECOLOR;
		this.inactiveStyleFront = GlobalConst.CONTROLS_STYLES.SEG_INACTIVECOLOR;
		this.margin_offset = GlobalConst.CONTROLS_STYLES.OFFSET;
		this.normalszPX = GlobalConst.CONTROLS_STYLES.NORMALSZ_PX;
		this.captionszPX = GlobalConst.CONTROLS_STYLES.CAPTIONSZ_PX;

		this.captionfontfamily = GlobalConst.CONTROLS_STYLES.CAPTIONFONTFAMILY;
		this.fontfamily = GlobalConst.CONTROLS_STYLES.FONTFAMILY;

		this.is_active = false;
		this.had_prev_interaction = false;
	}

	calcDims(p_mapctx) {

		const dims=[];
		p_mapctx.getCanvasDims(dims);

		const r = dims[0] / dims[1];

		this.width = Math.min(GlobalConst.CONTROLS_STYLES.SEG_WIDTHS[1], Math.max(GlobalConst.CONTROLS_STYLES.SEG_WIDTH_PERC * dims[0], GlobalConst.CONTROLS_STYLES.SEG_WIDTHS[0]));
		this.left = dims[0] -  this.width;

		this.height = this.width / r;

		this.top = Math.round((dims[1] - this.height) / 2.0);
		this.left = Math.round((dims[0] - this.width) / 2.0);

	}

	print(p_mapctx) {

		if (!this.is_active) {
			return;
		}

		this.clear(p_mapctx);
		this.calcDims(p_mapctx);

		const ctx = p_mapctx.renderingsmgr.getDrwCtx(this.canvaslayer, '2d');

		ctx.save();
		
		ctx.fillStyle = this.fillStyleBack;
		ctx.fillRect(this.left, this.top, this.width, this.height);

		ctx.lineWidth = 1;
		ctx.strokeStyle = this.activeStyleFront;
		ctx.strokeRect(this.left, this.top, this.width, this.height);

		let msg = p_mapctx.i18n.msg('SEGM', true);
		ctx.fillStyle = this.fillTextStyle;
		ctx.textAlign = "left";

		let cota  = this.top+this.margin_offset+this.captionszPX;
		let indent = this.left+2*this.margin_offset;
		ctx.font = `${this.captionszPX}px ${this.captionfontfamily}`;
		ctx.fillText(msg, indent, cota);
		
		let keys=[], slicekeystxt = "(error: slicing not properly configured in risco_basic_config.js)";
		if (p_mapctx.cfgvar["basic"]["slicing"] !== undefined) {
			keys = Object.keys(p_mapctx.cfgvar["basic"]["slicing"]);
			if (keys.length > 0) {
				slicekeystxt = p_mapctx.i18n.msg('SEGMBY', true) + ":";
			}
		}

		cota += 2 * this.normalszPX;
		ctx.font = `${this.normalszPX}px ${this.fontfamily}`;
		ctx.fillText(slicekeystxt, this.left+2*this.margin_offset, cota);

		let lbl, w, h, slack = GlobalConst.CONTROLS_STYLES.TEXTBOXSLACK, selwigetsymb_dim = GlobalConst.CONTROLS_STYLES.DROPDOWNARROWSZ;
		if (keys.length > 0) {

			let txtdims = ctx.measureText(slicekeystxt);
			const lang = (new I18n(p_mapctx.cfgvar["basic"]["msgs"])).getLang();

			if (Object.keys(p_mapctx.cfgvar["basic"]["msgs"][lang]).indexOf(p_mapctx.cfgvar["basic"]["slicing"][keys[0]]) >= 0) {
				lbl = p_mapctx.cfgvar["basic"]["msgs"][lang][p_mapctx.cfgvar["basic"]["slicing"][keys[0]]];
			} else {
				lbl = p_mapctx.cfgvar["basic"]["slicing"][keys[0]];
			}	
			indent = indent+txtdims.width+2*this.margin_offset;
			ctx.fillText(lbl, indent, cota);

			txtdims = ctx.measureText(lbl);

			if (keys.length > 1) {
				w = txtdims.width+3*slack + selwigetsymb_dim;
			} else {
				w = txtdims.width+2*slack;
			}

			h = 2*slack + txtdims.actualBoundingBoxAscent + txtdims.actualBoundingBoxDescent;
			const ritems = [indent - txtdims.actualBoundingBoxLeft - slack, cota + txtdims.actualBoundingBoxDescent + slack, w, -h];

			if (keys.length > 1) {

				ctx.beginPath();

				let x = indent + txtdims.width + slack;
				let y = cota-2;
				ctx.lineJoin = "round";
				ctx.moveTo(x, y-selwigetsymb_dim);
				ctx.lineTo(x+(selwigetsymb_dim/2.0), y);
				ctx.lineTo(x+selwigetsymb_dim, y-selwigetsymb_dim);
				ctx.closePath();
				ctx.fill();
			}

			ctx.strokeRect(...ritems);	
		}

		ctx.restore();
	}

	clear(p_mapctx) {
		// data_viz layer intended for 'singletons',lets clear the whole lot
		const dims=[];

		const ctx = p_mapctx.renderingsmgr.getDrwCtx(this.canvaslayer, '2d');
		p_mapctx.getCanvasDims(dims);
		ctx.clearRect(0, 0, ...dims); 
	}

	setState(p_mapctx, p_activeflag) {
		this.is_active = p_activeflag;
		if (this.is_active) {
			this.print(p_mapctx);
		} else {
			this.clear(p_mapctx);
		}
	}

	interact(p_mapctx, p_evt) {

		let topcnv, ret = false;

		if (!this.is_active) {
			return ret;
		}

		if (p_evt.clientX >= this.left && 
			p_evt.clientX <= this.left+this.width && 
			p_evt.clientY >= this.top && 
			p_evt.clientY <= this.top+this.height) {

			ret = true;
		}

		if (ret) {

			if (!this.had_prev_interaction) {
				p_mapctx.clearInteractions('SEG');
			}
			this.had_prev_interaction = true;

		} else {

			if (this.had_prev_interaction) {

				// emulating mouseout
				topcnv = p_mapctx.renderingsmgr.getTopCanvas();
				topcnv.style.cursor = "default";

				p_mapctx.clearInteractions('SEG');

				this.had_prev_interaction = false;
			}
		}

		return ret;
	}

}