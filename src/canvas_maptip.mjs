
import {I18n} from './i18n.mjs';
import {GlobalConst} from './constants.js';
import {canvasWrtField} from './utils.mjs';

export class PopupBox {

	origin;
	dims;
	box;
	headerbox;
	anchorpt;
	leftpad;
	rigthpad;
	betweencols;
	fillStyle;
	strokeStyle;
	headerFillStyle;
	fillTextStyle;
	URLStyle;
	leaderorig;
	layercaptionfontfamily;
	captionfontfamily;
	fontfamily;
	mapdims;
	userpt;
	callout;	
	drawcount;
	rows;
	mapctx;

	constructor(p_mapctx, p_layer, p_styles, p_scrx, p_scry, b_callout) {

		this.origin = [20,20];
		this.anchorpt = [20,20];
		this.layer = p_layer;
		this.leftpad = GlobalConst.INFO_MAPTIPS_BOXSTYLE["leftpad"];
		this.rightpad = GlobalConst.INFO_MAPTIPS_BOXSTYLE["rightpad"];
		this.betweencols = GlobalConst.INFO_MAPTIPS_BOXSTYLE["betweencols"];
		this.layercaptionfontfamily = "sans-serif";
		this.captionfontfamily = "sans-serif";
		this.fontfamily = "sans-serif";
		this.drawcount = 0;
		this.rows = [];
		this.mapctx = p_mapctx;

		if (p_styles["fillStyle"] !== undefined) {
			this.fillStyle = p_styles["fillStyle"];
		} else {
			this.fillStyle = "none";
		}
		if (p_styles["strokeStyle"] !== undefined) {
			this.strokeStyle = p_styles["strokeStyle"];
		} else {
			this.strokeStyle = "none";
		}

		if (p_styles["innerStrokeStyle"] !== undefined) {
			this.innerStrokeStyle = p_styles["innerStrokeStyle"];
		} else {
			this.innerStrokeStyle = "none";
		}

		if (p_styles["headerFillStyle"] !== undefined) {
			this.headerFillStyle = p_styles["headerFillStyle"];
		} else {
			this.headerFillStyle = "none";
		}
		if (p_styles["fillTextStyle"] !== undefined) {
			this.fillTextStyle = p_styles["fillTextStyle"];
		} else {
			this.fillTextStyle = "none";
		}
		if (p_styles["URLStyle"] !== undefined) {
			this.URLStyle = p_styles["URLStyle"];
		} else {
			this.URLStyle = "none";
		}

		if (p_styles["lineWidth"] !== undefined) {
			this.lwidth = p_styles["lineWidth"];
		} else {
			this.lwidth = 1;
		}	
		if (p_styles["fontfamily"] !== undefined) {
			this.fontfamily = p_styles["fontfamily"];
		}				
		if (p_styles["captionfontfamily"] !== undefined) {
			this.captionfontfamily = p_styles["captionfontfamily"];
		}
		if (p_styles["layercaptionfontfamily"] !== undefined) {
			this.layercaptionfontfamily = p_styles["layercaptionfontfamily"];
		}	
		if (p_styles["normalszPX"] !== undefined) {
			this.normalszPX = p_styles["normalszPX"];
		}	
		if (p_styles["layercaptionszPX"] !== undefined) {
			this.layercaptionszPX = p_styles["layercaptionszPX"];
		}	

		// console.log(">>>>  this.layercaptionszPX:", this.layercaptionszPX);
		
		this.mapdims = [];
		p_mapctx.renderingsmgr.getCanvasDims(this.mapdims);

		this.userpt = [p_scrx, p_scry];
		this.callout = b_callout;
	}

	defaultstroke(p_ctx, opt_lwidth) {
		if (!this.strokeStyle.toLowerCase() != "none") {
			p_ctx.strokeStyle = this.strokeStyle;
			if (opt_lwidth) {
				p_ctx.lineWidth = opt_lwidth;
			} else {
				p_ctx.lineWidth = this.lwidth;
			}
			p_ctx.stroke();
		}		
	}

	_setorigin(p_width, p_height) {

		const xdelta = 50;
		const ydelta = 50;
		let tmp;

		if (this.userpt[0] > (this.mapdims[0] / 2)) {
			// userpt right of map center
			this.origin[0] = this.userpt[0] - p_width - xdelta;
			this.anchorpt[0] = this.userpt[0] - xdelta;
		} else {
			// userpt left of map center
			this.origin[0] = this.userpt[0] + xdelta;
			this.anchorpt[0] = this.origin[0];
		}

		if (this.userpt[1] > (this.mapdims[1] / 2)) {
			// below of map center
			this.origin[1] = Math.max((this.userpt[1] - p_height - ydelta), 20);
			this.anchorpt[1] = this.origin[1] + p_height;
		} else {
			// obove of map center
			tmp = this.userpt[1] + ydelta;
			if (tmp + p_height >  this.mapdims[1]) {
				this.origin[1] = this.mapdims[1] - p_height - 20;
			} else {
				this.origin[1] = this.userpt[1] + ydelta;
			}
			this.anchorpt[1] = this.origin[1];
		}
	}
	
	_drawBackground(p_ctx, p_width, p_height, p_lnheight, p_label) {

		if (this.drawcount == 0) {
			this._setorigin(p_width, p_height);  
		}

		this.box = [...this.origin, p_width, p_height];

		const headerlimy = 1.5 * p_lnheight;

		//console.log("<<<< 162 >>>>", headerlimy, p_lnheight);

		this.headerbox = [...this.origin, p_width, headerlimy];

		p_ctx.save();

		p_ctx.beginPath();
		p_ctx.rect(...this.origin, p_width, p_height);

		if (!this.fillStyle.toLowerCase() != "none") {
			p_ctx.fillStyle = this.fillStyle;
			p_ctx.fill();
		}	

		if (this.headerFillStyle != "none") {
			p_ctx.save();
			p_ctx.beginPath();
			p_ctx.fillStyle = this.headerFillStyle;
			p_ctx.rect(...this.origin, p_width, headerlimy);
			p_ctx.fill();
			p_ctx.restore();
		}

		p_ctx.beginPath();
		p_ctx.rect(...this.origin, p_width, p_height);
		this.defaultstroke(p_ctx);

		if (this.innerStrokeStyle != "none") {
			p_ctx.save();
			p_ctx.strokeStyle = this.innerStrokeStyle;
			p_ctx.beginPath();
			p_ctx.moveTo(this.origin[0], this.origin[1]+headerlimy);
			p_ctx.lineTo(this.origin[0]+p_width, this.origin[1]+headerlimy);
			p_ctx.stroke();
			p_ctx.restore();
		}

		p_ctx.fillStyle = this.fillTextStyle;
		p_ctx.fillText(p_label, this.origin[0]+this.leftpad, this.origin[1]+1.2*p_lnheight);

		if (this.callout) {
			p_ctx.beginPath();
			p_ctx.moveTo(...this.userpt);
			p_ctx.lineTo(...this.anchorpt);
			this.defaultstroke(p_ctx, 2);
		}

		p_ctx.restore();

	}	
}

export class MaptipBox extends PopupBox {

	feature;

	constructor(p_mapctx, p_layer, p_feature, p_styles, p_scrx, p_scry, b_callout) {

		super(p_mapctx, p_layer, p_styles, p_scrx, p_scry, b_callout);

		this.feature = p_feature;

	}

	draw(p_ctx) {

		const ifkeys = Object.keys(this.layer.maptipfields);
		if (ifkeys.length < 1) {
			console.warn(`[WARN] Missing 'maptipfields' config for layer '${this.layer.key}`);
			return;
		}


		const lang = (new I18n(this.layer.msgsdict)).getLang();

		p_ctx.save();
		this.rows.length = 0;
		const numcols = 2;

		const tipsboxfrac = GlobalConst.INFO_MAPTIPS_BOXSTYLE["tipsbox2map_widthfraction"];
		const maxboxwidth = Math.min(Math.max(GlobalConst.INFO_MAPTIPS_BOXSTYLE["minpopupwidth"], this.mapdims[0] / tipsboxfrac), GlobalConst.INFO_MAPTIPS_BOXSTYLE["maxpopupwidth"]);

		const capttextwidth = GlobalConst.INFO_MAPTIPS_BOXSTYLE["caption2value_widthfraction"] * maxboxwidth;
		const valuetextwidth = (1 - GlobalConst.INFO_MAPTIPS_BOXSTYLE["caption2value_widthfraction"]) * maxboxwidth;
		const lineheightfactor = GlobalConst.INFO_MAPTIPS_BOXSTYLE["lineheightfactor"];

		if (ifkeys.indexOf("add") >= 0) {
			for (let fld of this.layer.maptipfields["add"]) {
				canvasWrtField(this, p_ctx, this.feature.a, fld, lang, this.layer.msgsdict, capttextwidth, valuetextwidth, this.rows);
			}	
		} else if (ifkeys.indexOf("remove") >= 0) {
			for (let fld in this.feature.a) {
				if (this.layer.maptipfields["remove"].indexOf(fld) < 0) {
					canvasWrtField(this, p_ctx, this.feature.a, fld, lang, this.layer.msgsdict, capttextwidth, valuetextwidth, this.rows);
				}
			} 
		} else {
			for (let fld in this.feature.a) {
				canvasWrtField(this, p_ctx, this.feature.a, fld, lang, this.layer.msgsdict, capttextwidth, valuetextwidth, this.rows);
			}	
		}

		// Calc text dims
		let row, height, cota, lnidx, celltxt, changed_found, colsizes=[0,0];
		for (row of this.rows) {
			for (let i=0; i<numcols; i++) {
				if (i==0) {
					p_ctx.font = `${this.normalszPX}px ${this.captionfontfamily}`;
				} else {
					p_ctx.font = `${this.normalszPX}px ${this.fontfamily}`;
				}
				for (let rowln of row["c"][i]) {
					colsizes[i] = Math.max(p_ctx.measureText(rowln).width, colsizes[i]);
				}
			}
		}

		// calculate global height of text line - from layer caption font - e
		p_ctx.font = `${this.layercaptionszPX}px ${this.layercaptionfontfamily}`;

		const txtlnheight = this.layercaptionszPX;

		// calculate height of all rows
		let maxrowlen, textlinescnt=0;
		height = 2.5*txtlnheight;
		for (let row, ri=0; ri<this.rows.length; ri++) {

			maxrowlen=0;
			row = this.rows[ri];
			for (let colidx=0; colidx<numcols; colidx++) {
				maxrowlen = Math.max(maxrowlen, row["c"][colidx].length);
			}
			textlinescnt += maxrowlen;
			
			height += maxrowlen * lineheightfactor * txtlnheight + 0.25 * txtlnheight;

		}

		// Layer label caption printing

		let lbl;
		if (this.layer["label"] !== undefined && this.layer["label"] != "none") {
			if (this.layer['msgsdict'] !== undefined && this.layer.msgsdict[lang] !== undefined && Object.keys(this.layer.msgsdict[lang]).indexOf(this.layer["label"]) >= 0) {
				lbl = I18n.capitalize(this.layer.msgsdict[lang][this.layer["label"]]);
			} else {
				lbl = I18n.capitalize(this.layer["label"]);
			}	
		} else {
			lbl = "(sem etiqueta)";	
		}	
		
		const realwidth = Math.max(this.leftpad+p_ctx.measureText(lbl).width+this.rightpad, this.leftpad+colsizes[0]+this.betweencols+colsizes[1]+this.rightpad);

		this._drawBackground(p_ctx, realwidth, height, txtlnheight, lbl);

		p_ctx.fillStyle = this.fillTextStyle;

		cota = this.origin[1]+2.5*txtlnheight;
		for (row of this.rows) {

			lnidx = 0;
			do {
				changed_found = false;

				for (let colidx=0; colidx<2; colidx++) {

					if (row["c"][colidx].length > lnidx) {
						
						celltxt = row["c"][colidx][lnidx];
						if (colidx == 0) {
							p_ctx.textAlign = "right";
							p_ctx.font = `${this.normalszPX}px ${this.captionfontfamily}`;
							p_ctx.fillText(celltxt, this.origin[0]+this.leftpad+colsizes[0], cota);		
						} else { 
							p_ctx.textAlign = "left";
							p_ctx.font = `${this.normalszPX}px ${this.fontfamily}`;
							p_ctx.fillText(celltxt, this.origin[0]+this.leftpad+colsizes[colidx-1]+colidx*this.betweencols, cota);		
						}
						changed_found = true;
					}
	
				}

				if (changed_found) {
					cota += lineheightfactor * txtlnheight;
					lnidx++;
				}

			} while (changed_found);

			cota = cota + 0.25 *txtlnheight;
		}

		p_ctx.restore();
	}

	clear(p_ctx) {
		p_ctx.clearRect(0, 0, ...this.mapdims); 
	}	
}