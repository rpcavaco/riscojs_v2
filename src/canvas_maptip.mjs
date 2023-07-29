
import {I18n} from './i18n.mjs';
import {GlobalConst} from './constants.js';
import {canvasWrtField, calcNonTextRowHeight} from './utils.mjs';

export class PopupBox {

	origin;
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
	imgbuffer;

	constructor(p_mapctx, p_imgbuffer, p_layer, p_styles, p_scrx, p_scry, b_callout) {

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
		this.imgbuffer = p_imgbuffer;

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
		p_ctx.textAlign = "left";
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

	constructor(p_mapctx, p_imgbuffer, p_layer, p_feature, p_styles, p_scrx, p_scry, b_callout) {
		super(p_mapctx, p_imgbuffer, p_layer, p_styles, p_scrx, p_scry, b_callout);
		this.feature = p_feature;
	}

	async draw(p_ctx) {

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
				await canvasWrtField(this, p_ctx, this.feature.a, fld, lang, this.layer.msgsdict, capttextwidth, valuetextwidth, this.rows);
			}	
		} else if (ifkeys.indexOf("remove") >= 0) {
			for (let fld in this.feature.a) {
				if (this.layer.maptipfields["remove"].indexOf(fld) < 0) {
					await canvasWrtField(this, p_ctx, this.feature.a, fld, lang, this.layer.msgsdict, capttextwidth, valuetextwidth, this.rows);
				}
			} 
		} else {
			for (let fld in this.feature.a) {
				await canvasWrtField(this, p_ctx, this.feature.a, fld, lang, this.layer.msgsdict, capttextwidth, valuetextwidth, this.rows);
			}	
		}

		// console.log("rows:", this.rows, this.rows.length);

		// Calc text dims
		let height, cota, lnidx, celltxt, changed_found, colsizes=[0,0];
		for (let row of this.rows) {
			if (row["c"] !== undefined) {
				for (let i=0; i<numcols; i++) {

					if (row["err"] !== undefined && row["err"]) {
						colsizes[i] = 0;
					}

					if (i % 2 ==0) {
						p_ctx.font = `${this.normalszPX}px ${this.captionfontfamily}`;
					} else {
						p_ctx.font = `${this.normalszPX}px ${this.fontfamily}`;
					}
					for (let rowln of row["c"][i]) {
						colsizes[i] = Math.max(p_ctx.measureText(rowln).width, colsizes[i]);
					}
				}
			}
		}

		// calculate global height of text line - from layer caption font - e
		p_ctx.font = `${this.layercaptionszPX}px ${this.layercaptionfontfamily}`;

		let lbl;
		if (this.layer["label"] !== undefined && this.layer["label"] != "none") {
			if (this.layer['msgsdict'] !== undefined && this.layer.msgsdict[lang] !== undefined && Object.keys(this.layer.msgsdict[lang]).indexOf(this.layer["label"]) >= 0) {
				lbl = I18n.capitalize(this.layer.msgsdict[lang][this.layer["label"]]);
			} else {
				lbl = I18n.capitalize(this.layer["label"]);
			}	
		} else {
			lbl = "(void label)";	
		}	

		const txtlnheight = this.layercaptionszPX;
		const realwidth = Math.max(this.leftpad+p_ctx.measureText(lbl).width+this.rightpad, this.leftpad+colsizes[0]+this.betweencols+colsizes[1]+this.rightpad);
		const imgpadding = GlobalConst.INFO_MAPTIPS_BOXSTYLE["thumbcoll_imgpadding"];


		// calculate height of all rows
		let maxrowlen, textlinescnt=0;
		height = 2.5*txtlnheight;
		for (let row, ri=0; ri<this.rows.length; ri++) {

			row = this.rows[ri];
			if (row["c"] === undefined) {
			
				// 0.75 = 0.25 spacing + 0.5 (caption height)
				height = height + calcNonTextRowHeight(row, realwidth, imgpadding, this.leftpad, this.rightpad) + 0.75 * txtlnheight;
			
			} else { 

				maxrowlen=0;
				for (let colidx=0; colidx<numcols; colidx++) {
					maxrowlen = Math.max(maxrowlen, row["c"][colidx].length);
				}
				textlinescnt += maxrowlen;
				
				height = height + maxrowlen * lineheightfactor * txtlnheight + 0.25 * txtlnheight;

			}
		}

		// Layer label caption printing
		
		height = height + 0.5 * txtlnheight;

		this._drawBackground(p_ctx, realwidth, height, txtlnheight, lbl);

		p_ctx.fillStyle = this.fillTextStyle;

		// console.log(this.rows);

		cota = this.origin[1]+2.5*txtlnheight;
		for (let row of this.rows) {

			if (row["c"] === undefined) {
				continue;
			}

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

		// Non-text items
		const left_caption = this.origin[0] + realwidth / 2.0;

		let left_symbs = 0;
		for (let row of this.rows) {

			// console.log(row);

			if (row["c"] !== undefined || (row["err"] !== undefined && row["err"])) {
				continue;
			}			

			// Field caption
			p_ctx.textAlign = "center";
			p_ctx.font = `${this.normalszPX}px ${this.captionfontfamily}`;
			p_ctx.fillText(row["cap"], left_caption, cota);	
			cota = cota + 0.5 * txtlnheight;

			if (row["thumbcoll"] !== undefined) {

				let acumw = 0, prevrowi=-1, acumwidths = {};
				for (let imge, rii=0; rii < row["thumbcoll"].length; rii++) {
					if (row["thumbcoll"][rii] !== undefined) {
						imge = row["thumbcoll"][rii];
						const [w, h, rowi, coli] = row["dims_pos"][rii];
						if (imge.complete) {

							if (rowi == prevrowi) {
								acumw += w + imgpadding;
							} else {
								if (prevrowi >= 0) {
									acumwidths[prevrowi] = acumw;
								}
								acumw = w;
							}
							prevrowi = rowi;
						}
					}
				}
				if (acumw > 0 && prevrowi >= 0) {
					acumwidths[prevrowi] = acumw;
				}	
				
				// console.log("realw:", realwidth, "acumwidths:", acumwidths);

				for (let imge, currh=0, rii=0; rii < row["thumbcoll"].length; rii++) {
					if (row["thumbcoll"][rii] !== undefined) {
						imge = row["thumbcoll"][rii];

						const [w, h, rowi, coli] = row["dims_pos"][rii];

						// console.log("---->", w, h, rowi, coli);
						if (imge.complete) {
							if (coli == 0) {
								//console.log("::492::", rowi, coli, w, realwidth, acumwidths[rowi], "currh:", currh);
								left_symbs = this.origin[0] + (realwidth - acumwidths[rowi]) / 2.0;
								if (rowi > 0) {
									//console.log("     ::502 draw::", coli, rowi, "cota:", cota, "currh:", currh);
									cota += currh + imgpadding;
									currh = 0;
								}
							}
							//console.log("::506 draw::", coli, rowi, "h:", h, "cota:", cota, "currh:", currh);
							p_ctx.drawImage(imge, left_symbs, cota, w, h);
							currh = Math.max(currh, h);
						};	

						left_symbs = left_symbs + w + imgpadding;	
					}				
				}
			}
			cota = cota + 0.25 * txtlnheight;
		}

		// console.log(this.rows.length);

		p_ctx.restore();
	}

	clear(p_ctx) {
		p_ctx.clearRect(0, 0, ...this.mapdims); 
	}	
}