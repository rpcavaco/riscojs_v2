
import {I18n} from './i18n.mjs';
import {GlobalConst} from './constants.js';

export class InfoBox {

	origin;
	dims;
	layerkey;
	featid;
	feature;
	fillStyle;
	strokeStyle;
	leaderorig;

	//constructor(p_origin, p_dims, p_fill, p_stroke, p_leaderorig) {
	constructor(p_mapctx, p_layer, p_data, p_styles, p_scrx, p_scry, b_callout) {

		this.origin = [20,20];
		this.anchorpt = [20,20];
		this.leftpad = GlobalConst.INFO_MAPTIPS_BOXSTYLE["leftpad"];
		this.rightpad = GlobalConst.INFO_MAPTIPS_BOXSTYLE["rightpad"];
		this.betweencols = GlobalConst.INFO_MAPTIPS_BOXSTYLE["betweencols"];
		this.layer = p_layer;
		this.data = p_data;
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
		this.callout = b_callout;

		this.recordidx = -1;
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
			this.origin[1] = this.userpt[1] - 3 * ydelta;
			this.anchorpt[1] = this.origin[1] + p_height;
		} else {
			// obove of upt
			this.origin[1] = this.userpt[1] + ydelta;
			this.anchorpt[1] = this.origin[1];
		}


	}
	_drawBackground(p_ctx, p_width, p_height, p_lnheight) {

		p_ctx.beginPath();

		this._setorigin(p_width, p_height);

		p_ctx.rect(...this.origin, p_width, p_height);
		this.fill(p_ctx);
		this.stroke(p_ctx);

		const headerlimy = 3 * p_lnheight;
		p_ctx.moveTo(this.origin[0], this.origin[1]+headerlimy);
		p_ctx.lineTo(this.origin[0]+p_width, this.origin[1]+headerlimy);
		this.stroke(p_ctx);

		p_ctx.fillStyle = this.strokeStyle;
		p_ctx.fillText(this.layer.label, this.origin[0]+this.leftpad, this.origin[1]+2.2*p_lnheight);

		if (this.callout) {
			p_ctx.moveTo(...this.userpt);
			p_ctx.lineTo(...this.anchorpt);
			this.stroke(p_ctx, 2);
		}
	}
	draw(p_ctx) {

		const ifcfg = Object.keys(this.layer.infocfg);
		if (ifcfg.length < 1) {
			throw new Error(`Missing mandatory 'infocfg' config for layer '${this.layer.key}`);
		}
		if (this.layer.infocfg["jsonkey"] === undefined) {
			throw new Error(`Missing mandatory 'infocfg.jsonkey' config for layer '${this.layer.key}`);
		}
		const ifkeys = Object.keys(this.layer.infocfg.fields);
		if (ifkeys.length < 1) {
			console.warn(`Missing 'infocfg.fields' config for layer '${this.layer.key}, all fields will be printed`);
		}

		const lang = (new I18n(this.layer.msgsdict)).getLang();

		p_ctx.save();

		const rows = [];
		const numcols = 2;

		function collectLines(ppp_ctx, p_words, p_maxlen, out_lines) {

			let test, tm, currline = '';
			out_lines.length = 0;

			for (let word of p_words) {
				test = currline + ' ' + word;
				tm = ppp_ctx.measureText(test);
				if (tm.width <= p_maxlen) {
					currline = currline + ' ' + word;
				} else {
					out_lines.push((' ' + currline).slice(1).trim());
					currline = word;
				}
			}
			if (currline.length > 0) {
				out_lines.push((' ' + currline).slice(1).trim());
			}
		}

		function wrtField(p_this, pp_ctx, p_rows, p_attrs, p_fld, p_msgsdict, opt_max_valuewidth) {
			
			let caption;

			if (Object.keys(p_msgsdict).indexOf(p_fld) >= 0) {
				caption = I18n.capitalize(p_msgsdict[p_fld]);
			} else {
				caption = I18n.capitalize(p_fld);
			}

			let captionlines=[], valuelines = [];

			if (opt_max_valuewidth !== null && typeof p_attrs[p_fld] != 'number') {
				let words;
				try {
					words = p_attrs[p_fld].split(/\s+/);
				} catch(e) {
					console.error(p_fld, typeof p_attrs[p_fld]);
					throw e;
				}
				if (words) {
					pp_ctx.font = `${p_this.normalszPX}px ${p_this.fontfamily}`;
					collectLines(pp_ctx, words, opt_max_valuewidth, valuelines);
				} else {
					valuelines.push('');
				}
			} else {
				valuelines = [p_attrs[p_fld].toString()];
			}

			const words = caption.split(/\s+/);
			if (words) {
				pp_ctx.font = `${p_this.normalszPX}px ${p_this.captionfontfamily}`;
				collectLines(pp_ctx, words, 120, captionlines);
			} else {
				captionlines.push('');
			}

			p_rows.push([captionlines, valuelines]);
		}

		if (this.recordidx < 0) {
			this.recordidx = 0;
		}

		const maxlen = Math.max(GlobalConst.INFO_MAPTIPS_BOXSTYLE["minlefcolwidth"], this.mapdims[0] / 4);
		const recdata = this.data[this.layer.infocfg.jsonkey][this.recordidx];

		if (this.layer.infocfg.fields["transforms"] !== undefined) {
			const trfcfgs = this.layer.infocfg.fields.transforms;
			for (const trcfg of trfcfgs) {
				recdata[trcfg.outfield] = trcfg.func(recdata);
			}
		}

		// collect all field names to publish
		let fldnames=[];
		const unordered_fldnames = [];
		if (ifkeys.indexOf("add") >= 0) {
			for (let fld of this.layer.infocfg.fields["add"]) {
				unordered_fldnames.push(fld);
			}	
		} else if (ifkeys.indexOf("remove") >= 0) {
			for (let fld in recdata) {
				if (this.layer.infocfg.fields["remove"].indexOf(fld) < 0) {
					unordered_fldnames.push(fld);
				}
			} 
		} else {
			for (let fld in recdata) {
				unordered_fldnames.push(fld);
			}	
		}

		// add ordered field names
		if (this.layer.infocfg.fields["order"] !== undefined) {
			for (let fld of this.layer.infocfg.fields.order) {
				if (unordered_fldnames.indexOf(fld) >= 0) {
					fldnames.push(fld);
				}
			}
		}

		// complete with fields eventually out of ordered field list
		for (let fld of unordered_fldnames) {
			if (fldnames.indexOf(fld) < 0) {
				fldnames.push(fld);
			}
		}
		for (let fld of fldnames) {
			wrtField(this, p_ctx, rows, recdata, fld, this.layer.msgsdict[lang], maxlen);
		}	
		
		// Calc text dims
		let row, cota, lnidx, celltxt, changed_found, colsizes=[0,0];
		for (row of rows) {
			for (let i=0; i<numcols; i++) {
				if (i==0) {
					p_ctx.font = `${this.normalszPX}px ${this.captionfontfamily}`;
				} else {
					p_ctx.font = `${this.normalszPX}px ${this.fontfamily}`;
				}
				for (let rowln of row[i]) {
					colsizes[i] = Math.max(p_ctx.measureText(rowln).width, colsizes[i]);
				}
			}
		}

		// calculate global height of text line - from layer caption font - e
		p_ctx.font = `${this.layercaptionszPX}px ${this.layercaptionfontfamily}`;
		const lbltm = p_ctx.measureText(this.layer.label);
		const txtlnheight = lbltm.actualBoundingBoxAscent - lbltm.actualBoundingBoxDescent;

		// calculate height of all rows
		let maxrowlen, lineheightfactor = 1.8;
		cota = this.origin[1]+6*txtlnheight;
		for (let row, ri=0; ri<rows.length; ri++) {
			maxrowlen=0;
			row = rows[ri];
			for (let colidx=0; colidx<numcols; colidx++) {
				maxrowlen = Math.max(maxrowlen, row[colidx].length);
			}
			cota += maxrowlen * lineheightfactor * txtlnheight + 0.5 * txtlnheight;
		}
		cota = cota - 2 * txtlnheight;

		const realwidth = Math.max(this.leftpad+colsizes[0]+this.betweencols+colsizes[1]+this.rightpad, this.leftpad+lbltm.width+this.rightpad);

		this._drawBackground(p_ctx, realwidth, cota, txtlnheight);

		cota = this.origin[1]+6*txtlnheight;
		for (row of rows) {

			lnidx = 0;

			do {
				changed_found = false;

				for (let colidx=0; colidx<2; colidx++) {

					if (row[colidx].length > lnidx) {
						
						celltxt = row[colidx][lnidx];
						//console.log(row, colidx, lnidx, celltxt);

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

			cota = cota + 0.5 *txtlnheight;
		}

		p_ctx.restore();
	}

	clear(p_ctx) {
		p_ctx.clearRect(0, 0, ...this.mapdims); 
	}	
}