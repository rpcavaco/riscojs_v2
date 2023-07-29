
import {GlobalConst} from './constants.js';

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

	constructor(p_mapctx) {

		this.fillTextStyle = GlobalConst.CONTROLS_STYLES.SEG_TEXTFILL;  
		this.fillStyleBack = GlobalConst.CONTROLS_STYLES.SEG_BCKGRD; 
		this.activeStyleFront = GlobalConst.CONTROLS_STYLES.SEG_ACTIVECOLOR;
		this.inactiveStyleFront = GlobalConst.CONTROLS_STYLES.SEG_INACTIVECOLOR;
		this.margin_offset = GlobalConst.CONTROLS_STYLES.OFFSET;
		this.normalszPX = GlobalConst.CONTROLS_STYLES.NORMALSZ_PX;
		this.captionszPX = GlobalConst.CONTROLS_STYLES.CAPTIONSZ_PX;

		this.captionfontfamily = GlobalConst.CONTROLS_STYLES.CAPTIONFONTFAMILY;

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
		ctx.font = `${this.captionszPX}px ${this.captionfontfamily}`;
		ctx.fillText(msg, this.left+2*this.margin_offset, this.top+this.margin_offset+this.captionszPX);

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