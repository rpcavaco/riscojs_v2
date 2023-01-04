
import {I18n} from './i18n.mjs';

export class CalloutBox {

	origin;
	dims;
	layerkey;
	featid;
	feature;
	fillStyle;
	strokeStyle;
	leaderorig;

	//constructor(p_origin, p_dims, p_fill, p_stroke, p_leaderorig) {
	constructor(p_mapctx, p_layer, p_featid, p_feature, p_styles, p_scrx, p_scry) {

		this.origin = [20,20];
		this.anchorpt = [20,20];
		this.leftpad = 10;
		this.rightpad = 10;
		this.betweencols = 10;
		this.layer = p_layer;
		this.featid = p_featid;
		this.feature = p_feature;
		this.layercaptionfontfamily = "sans-serif";
		this.captionfontfamily = "sans-serif";
		this.fontfamily = "sans-serif";

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
		
		this.mapdims = [];
		p_mapctx.renderingsmgr.getCanvasDims(this.mapdims);

		this.userpt = [p_scrx, p_scry];
	}

	stroke(p_ctx, opt_lwidth) {
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

	fill(p_ctx) {
		if (!this.fillStyle.toLowerCase() != "none") {
			p_ctx.fillStyle = this.fillStyle;
			p_ctx.fill();
		}	
	}	
	_setorigin(p_width, p_height) {

		const xdelta = 50;
		const ydelta = 50;
		
		if (this.userpt[0] > p_width + xdelta) {
			// left of user point
			this.origin[0] = this.userpt[0] - p_width - xdelta;
			this.anchorpt[0] = this.userpt[0] - xdelta;
		} else {
			// right of upt
			this.origin[0] = this.userpt[0] + xdelta;
			this.anchorpt[0] = this.origin[0];
		}

		if (this.userpt[1] > (this.mapdims[1] / 2)) {
			// below of upt
			this.origin[1] = this.userpt[1] - 2 * ydelta;
			this.anchorpt[1] = this.origin[1] + p_height;
		} else {
			// obove of upt
			this.origin[1] = this.userpt[1] + ydelta;
			this.anchorpt[1] = this.origin[1];
		}


	}
	_drawBackground(p_ctx, p_width, p_numrows) {

		p_ctx.beginPath();

		p_ctx.font = `${this.layercaptionszPX}px ${this.layercaptionfontfamily}`;
		const lbltm = p_ctx.measureText(this.layer.label);
		const height = lbltm.actualBoundingBoxAscent - lbltm.actualBoundingBoxDescent;

		const realwidth = Math.max(p_width, this.leftpad + lbltm.width + this.rightpad);
		
		const hsz = 2 * height;
		const realheight = p_numrows * hsz + 2 * hsz;

		this._setorigin(realwidth, realheight);

		p_ctx.rect(...this.origin, realwidth, realheight);
		this.fill(p_ctx);
		this.stroke(p_ctx);

		const headerlimy = 3 * height;
		p_ctx.moveTo(this.origin[0], this.origin[1]+headerlimy);
		p_ctx.lineTo(this.origin[0]+realwidth, this.origin[1]+headerlimy);
		this.stroke(p_ctx);

		p_ctx.fillStyle = this.strokeStyle;
		p_ctx.fillText(this.layer.label, this.origin[0]+this.leftpad, this.origin[1]+1.1*hsz);

		p_ctx.moveTo(...this.userpt);
		p_ctx.lineTo(...this.anchorpt);
		this.stroke(p_ctx, 2);

		return [height, realwidth];
	}
	draw(p_ctx) {

		const ifkeys = Object.keys(this.layer.infofields);
		if (ifkeys.length < 1) {
			throw new Error(`Missing 'infokey' config for layer '${this.layer.key}`);
		}

		const lang = (new I18n(this.layer.msgsdict)).getLang();

		p_ctx.save();


		// console.log(this.feature);
		// console.log(this.layer.msgsdict);

		const rows = [];


		function wrtField(p_rows, p_attrs, p_fld, p_msgsdict) {
			let caption, cota;
			if (Object.keys(p_msgsdict).indexOf(p_fld) >= 0) {
				caption = I18n.capitalize(p_msgsdict[p_fld]);
			} else {
				caption = I18n.capitalize(p_fld);
			}

			p_rows.push([caption, p_attrs[p_fld]]);
		}

		if (ifkeys.indexOf("add") >= 0) {
			for (let fld of this.layer.infofields["add"]) {
				wrtField(rows, this.feature.a, fld, this.layer.msgsdict[lang]);
			}	
		} else {
			for (let fld in this.feature.a) {
				if (ifkeys["remove"].indexOf(fld) < 0) {
					wrtField(rows, this.feature.a, fld, this.layer.msgsdict[lang]);
				}
			} 
		}

		// Calc text dims
		let row, cota, colsizes=[0,0];
		for (row of rows) {
			for (let i=0; i<2; i++) {
				if (i==0) {
					p_ctx.font = `${this.normalszPX}px ${this.captionfontfamily}`;
				} else {
					p_ctx.font = `${this.normalszPX}px ${this.fontfamily}`;
				}
				colsizes[i] = Math.max(p_ctx.measureText(row[i]).width, colsizes[i]);
			}
		}

		let [hg, realwidth] = this._drawBackground(p_ctx, this.leftpad+colsizes[0]+this.betweencols+colsizes[1]+this.rightpad, rows.length);
		let rownum = 1;

		for (row of rows) {

			cota = this.origin[1]+3*hg+rownum*2*hg;

			p_ctx.textAlign = "right";
			p_ctx.font = `${this.normalszPX}px ${this.captionfontfamily}`;
			p_ctx.fillText(row[0], this.origin[0]+this.leftpad+colsizes[0], cota);

			p_ctx.textAlign = "left";
			p_ctx.font = `${this.normalszPX}px ${this.fontfamily}`;
			p_ctx.fillText(row[1], this.origin[0]+this.leftpad+colsizes[0]+this.betweencols, cota);

			rownum++;
		}

		p_ctx.restore();
	}

	// TODO - desenhar na layer própria, fazer clear ao mapa inteiro

	clear(p_ctx) {
		p_ctx.clearRect(...this.origin, 200, 200); 
	}	
}