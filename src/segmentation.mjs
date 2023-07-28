
import {GlobalConst} from './constants.js';

export class SegmentationPanel {

	top;
	left;
	width;
	height;
	
	canvaslayer = 'data_viz';
	mapctx;

	fillStyleBack;
	activeStyleFront;
	inactiveStyleFront;
	is_active;

	constructor(p_mapctx) {
		this.mapctx = p_mapctx;
		this.fillStyleBack = GlobalConst.CONTROLS_STYLES.SEG_BCKGRD;  // **
		this.activeStyleFront = GlobalConst.CONTROLS_STYLES.SEG_ACTIVECOLOR;
		this.inactiveStyleFront = GlobalConst.CONTROLS_STYLES.SEG_INACTIVECOLOR;

		this.is_active = false;
	}

	calcDims() {

		const dims=[];
		this.mapctx.getCanvasDims(dims);

		const r = dims[0] / dims[1];

		this.width = Math.min(GlobalConst.CONTROLS_STYLES.SEG_WIDTHS[1], Math.max(GlobalConst.CONTROLS_STYLES.SEG_WIDTH_PERC * dims[0], GlobalConst.CONTROLS_STYLES.SEG_WIDTHS[0]));
		this.left = dims[0] -  this.width;

		this.height = this.width / r;

		this.top = Math.round((dims[1] - this.height) / 2.0);
		this.left = Math.round((dims[0] - this.width) / 2.0);

	}

	draw() {

		this.clear();


		this.calcDims();

		const ctx = this.mapctx.renderingsmgr.getDrwCtx(this.canvaslayer, '2d');

		ctx.save();
		
		ctx.fillStyle = this.fillStyleBack;
		ctx.fillRect(this.top, this.left, this.width, this.height);

		ctx.lineWidth = 1;
		ctx.strokeStyle = this.activeStyleFront;
		ctx.strokeRect(this.top, this.left, this.width, this.height);


		ctx.restore();

	}

	clear() {
		// data_viz layer intended for 'singletons',lets clear the whole lot
		const dims=[];

		const ctx = this.mapctx.renderingsmgr.getDrwCtx(this.canvaslayer, '2d');
		this.mapctx.getCanvasDims(dims);
		ctx.clearRect(0, 0, ...dims); 
	}

	setState(p_activeflag) {
		this.is_active = p_activeflag;
		if (this.is_active) {
			this.draw();
		} else {
			this.clear();
		}
	}

	interact(p_mapctx, p_evt) {

		let ret = false;

		if (!this.is_active) {
			return ret;
		}

		return ret;
	}

}