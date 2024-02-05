
import {I18n} from './i18n.mjs';
import {GlobalConst} from './constants.js';
import {PopupBox} from './canvas_maptip.mjs';
import {canvasWrtField, calcNonTextRowHeight} from './utils.mjs';




export class InfoBox extends PopupBox {

	data;
	box;
	recordidx;
	navFillStyle;
	urls;
	formats;
	field_textlines_count;
	ordered_fldnames;
	txtlnheight;
	topcota;
	colsizes;
	columncount;
	rowboundaries; // for each page
	nontext_formats;
	infobox_static_pick_method;
	infobox_static_expandimage_method;
	layer;
	rows;
	ctx;
	data_key;

	constructor(p_mapctx, p_imgbuffer, p_layer, p_data, p_styles, p_scrx, p_scry, p_infobox_pick_method, p_expandimage_method, p_ctx, opt_max_rows_height) {

		super(p_mapctx, p_imgbuffer, p_styles, p_scrx, p_scry);

		this.data = p_data;
		this.layer = p_layer;
		this.recordidx = -1;
		this.urls = {};
		this.formats = {};
		this.field_row_count = {};
		this.ordered_fldnames = [];
		this.used_fldnames = [];
		this.field_textlines_count = {};
		this.txtlnheight = 0;
		this.topcota = 0;
		this.colsizes = [0,0];
		this.columncount = 2;
		this.infobox_static_pick_method = p_infobox_pick_method;
		this.infobox_static_expandimage_method = p_expandimage_method;
		this.max_textlines_height = opt_max_rows_height;
		this.ctx = p_ctx;

		this.pagecount = 0;
		this.activepageidx = -1;
		this.rows = [];

		this.rowboundaries = []; // for each page
		this.nontext_formats = ["singleimg", "thumbcoll"];
	
		/*
		if (this.layer.infocfg["qrykey"] === undefined) {
			throw new Error(`Missing mandatory 'infocfg.qrykey' config (info query 'falias' in 'risco_find') for layer '${this.layer.key}`);
		}

			throw new Error(`Missing mandatory 'infocfg.jsonkey' config (info query 'alias' in 'risco_find') for layer '${this.layer.key}`);

		*/

		if (this.layer.infocfg["jsonkey"] !== undefined) {

			if (this.data[this.layer.infocfg.jsonkey] === undefined) {
				throw new Error(`Missing 'infocfg.jsonkey' ('${this.layer.infocfg.jsonkey}') in data row (found keys:${Object.keys(this.data)}) for layer '${this.layer.key}`);
			}

			this.data_key = this.layer.infocfg["jsonkey"];
	
		} else {

			if (this.data[this.layer.key] === undefined) {
				throw new Error(`Missing '${this.layer.key}' in data row (found keys:${Object.keys(this.data)}) for layer '${this.layer.key}`);
			}	
			
			this.data_key = this.layer.key;
			
		}

		
		this.recordcnt = this.data[this.data_key].length;
		
		if (p_styles["navFillStyle"] !== undefined) {
			this.navFillStyle = p_styles["navFillStyle"];
		} else {
			this.navFillStyle = "grey";
		}		
	}

	drawnavitems(p_recnum, p_totalrecs) {

		function rightarrow(pp_ctx, p_dims) {

			pp_ctx.beginPath();
			pp_ctx.moveTo(p_dims[0], p_dims[2]);
			pp_ctx.lineTo(p_dims[1], p_dims[3]);
			pp_ctx.lineTo(p_dims[0], p_dims[4]);
			pp_ctx.closePath();
	
			pp_ctx.fill();
		}

		this.ctx.save();
		this.ctx.fillStyle = this.navFillStyle;
		this.ctx.strokeStyle = this.navFillStyle;
		this.ctx.lineWidth = 2;

		const pad = 10;
		const width = 12;
		const sep = 8;
		const smallsep = 2;
		const height = 12;

		const top = this.box[1] + pad;
		const middle = top + height/2;
		const bottom = top + height;

		// console.log("box", this.box)

		// jump end
		let right = this.box[0] + this.box[2] - pad; 
		let left = right - width;

		if (this.recordcnt > 2) {

			this.clickboxes["toend"] = [left, top, right, bottom];

			rightarrow(this.ctx, [left, right, bottom, middle, top]);

			this.ctx.beginPath();
			this.ctx.moveTo(right, bottom);
			this.ctx.lineTo(right, top);
			this.ctx.stroke();

			// move to shift right
			right = left - smallsep; 
			left = right - width;
		}

		// shift right
		this.clickboxes["next"] = [left, top, right, bottom];
		rightarrow(this.ctx, [left, right, bottom, middle, top]);

		// shift left
		right = left - sep; 
		left = right - width;
		this.clickboxes["prev"] = [left, top, right, bottom];

		this.ctx.beginPath();
		this.ctx.moveTo(right, bottom);
		this.ctx.lineTo(right, top);
		this.ctx.lineTo(left, middle);
		this.ctx.closePath();

		this.ctx.fill();

		this.ctx.textAlign = 'right';
		this.ctx.fillText(`${p_recnum}/${p_totalrecs}`, left-sep, bottom);

		this.ctx.restore();

	}

	drawpagenavitems() {

		this.ctx.save();

		const pagekeys = [];
		for (let k in this.clickboxes) {
			if (k.startsWith("page")) {
				pagekeys.push(k);
			}
		}
		for (let k of pagekeys) {
			delete this.clickboxes[k];
		}

		if (this.pagecount <= 1) {
			return;
		}

		const pad = 8;
		const size = 16;
		const sep = 6;
		const texthoffset = 1;
		const textvoffset = 4;
		const rightmost = this.box[0] + this.box[2] - pad; 

		let origx;
		let origy = this.box[1] + this.box[3] - size - pad;

		this.ctx.strokeStyle = this.navFillStyle;
		this.ctx.lineWidth = 1;

		this.ctx.font = '10px sans-serif';
		this.ctx.textAlign = "left";

		for (let tx, ox, i = (this.pagecount-1); i>=0; i--) {
			
			origx = rightmost - (1 + (this.pagecount-1-i)) * size - (this.pagecount-1-i) * sep;

			this.clickboxes[`page${(i+1)}`] = [origx, origy, origx+size, origy+size];
			tx = (i+1).toString();
			ox = Math.round(origx+texthoffset+(size/4));

			if (i==this.activepageidx) {
				this.ctx.fillStyle = this.navFillStyle;
				this.ctx.fillRect(origx, origy, size, size);
				this.ctx.fillStyle = "black";
				this.ctx.fillText(tx, ox, origy+size-textvoffset);	
			} else {
				this.ctx.fillStyle = this.navFillStyle;
				this.ctx.fillText(tx, ox, origy+size-textvoffset);	
			}
			this.ctx.strokeRect(origx, origy, size, size);

		}

		this.ctx.restore();

	}

	async infodraw() {

		const ifcfg = Object.keys(this.layer.infocfg);
		if (ifcfg.length < 1) {
			throw new Error(`Missing mandatory 'infocfg' config for layer '${this.layer.key}`);
		}
		/*if (this.layer.infocfg["jsonkey"] === undefined) {
			throw new Error(`Missing mandatory 'infocfg.jsonkey' config for layer '${this.layer.key}`);
		}*/
		const ifkeys = Object.keys(this.layer.infocfg.fields);
		if (ifkeys.length < 1) {
			console.warn(`Missing 'infocfg.fields' config for layer '${this.layer.key}, all fields will be printed`);
		}

		const lang = (new I18n(this.layer.msgsdict)).getLang();

		this.ctx.save();
		this.rows.length = 0;
		for (const p in this.urls) {
			if (this.urls.hasOwnProperty(p)) {
				delete this.urls[p];
			}
		}

		if (this.recordidx < 0) {
			this.recordidx = 0;
		}

		let caption2value_widthfraction;
		if (this.layer.infocfg['caption2value_widthfraction'] !== undefined) {
			caption2value_widthfraction = this.layer.infocfg['caption2value_widthfraction'];
		} else {
			caption2value_widthfraction = GlobalConst.INFO_MAPTIPS_BOXSTYLE["caption2value_widthfraction"];
		}

		const tipsboxfrac = GlobalConst.INFO_MAPTIPS_BOXSTYLE["tipsbox2map_widthfraction"];
		const maxboxwidth = Math.min(Math.max(GlobalConst.INFO_MAPTIPS_BOXSTYLE["minpopupwidth"], this.mapdims[0] / tipsboxfrac), GlobalConst.INFO_MAPTIPS_BOXSTYLE["maxpopupwidth"]);
		const capttextwidth = caption2value_widthfraction * maxboxwidth;
		const valuetextwidth = (1 - caption2value_widthfraction) * maxboxwidth;
		const lineheightfactor = GlobalConst.INFO_MAPTIPS_BOXSTYLE["lineheightfactor"];
		const rowsintervalfactor = GlobalConst.INFO_MAPTIPS_BOXSTYLE["rowsintervalfactor"];

		const recdata = this.data[this.data_key][this.recordidx];

		/*if (this.layer.infocfg.fields["transforms"] !== undefined) {
			const trfcfgs = this.layer.infocfg.fields.transforms;
			for (const trcfg of trfcfgs) {
				const [data, format] = trcfg.func(recdata);
				recdata[trcfg.outfield] = data;
				this.formats[trcfg.outfield] = format;
			}
		} */

		// collect all field names to publish
		this.ordered_fldnames.length = 0;
		this.used_fldnames.length = 0;
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
					this.ordered_fldnames.push(fld);
				}
			}
		}

		// complete with fields eventually out of ordered field list
		for (let fld of unordered_fldnames) {
			if (this.ordered_fldnames.indexOf(fld) < 0) {
				this.ordered_fldnames.push(fld);
			}
		}

		for (let fld of this.ordered_fldnames) {

			// ciclar layers
			this.field_textlines_count[fld] = await canvasWrtField(this, this.ctx, recdata, fld, lang, this.layer, capttextwidth, valuetextwidth, this.rows, this.urls);

			if (this.layer.infocfg.fields["formats"][fld] !== undefined) {
				if (this.nontext_formats.indexOf(this.layer.infocfg.fields["formats"][fld]["type"]) >= 0) {
					if (recdata[fld] !== undefined && recdata[fld] !== null) {
						this.used_fldnames.push(fld);
					}
					continue;
				} else {
					if (this.field_textlines_count[fld] > 0) {
						this.used_fldnames.push(fld);
					}	
				}
			} else {
				if (this.field_textlines_count[fld] > 0) {
					this.used_fldnames.push(fld);
				}
			}
		}	

		this.colsizes=[0,0];

		// calc max widths of text in columns
		for (let row of this.rows) {

			if (row["c"] === undefined) {
				continue;
			}

			for (let i=0; i<this.columncount; i++) {
				if (i==0) {
					this.ctx.font = `${this.normalszPX}px ${this.captionfontfamily}`;
				} else {
					this.ctx.font = `${this.normalszPX}px ${this.fontfamily}`;
				}
				for (let rowln of row["c"][i]) {
					this.colsizes[i] = Math.max(this.ctx.measureText(rowln).width, this.colsizes[i]);
				}
			}
		}

		// console.log("-- px:", this.layercaptionszPX, "asc:", lbltm.actualBoundingBoxAscent, "desc:", lbltm.actualBoundingBoxDescent);
		// ROWS: are not data rows, are rows of printing, each row corresponds to an atrribute or data field
		// TEXTLINE: each row can geneate ZERO or more text lines

		let currow;
		let maxrowtextlineslen, accumtextlineslen, pageaccumtextlineslen;
		this.rowboundaries.length = 0;
		pageaccumtextlineslen = 0;
		accumtextlineslen = 0;

		// calculate global height of text line - from layer caption font - e
		this.ctx.font = `${this.layercaptionszPX}px ${this.layercaptionfontfamily}`;
		this.txtlnheight = this.layercaptionszPX

		let acc_colsz = 0;
		for (let clsz of this.colsizes) {
			acc_colsz += clsz;
		}		
		let bwidth = Math.min(maxboxwidth, this.leftpad+this.rightpad+this.betweencols+acc_colsz+10);
		let imgpadding = GlobalConst.INFO_MAPTIPS_BOXSTYLE["thumbcoll_imgpadding"];

		// calc text line boundaries for each "page"
		let prevrowbndry = 0;
		const page_items = [];
		for (let tmph, ri=0; ri<this.rows.length; ri++) {

			currow = ri;

			if (this.rows[ri]["c"] === undefined) {
				
				tmph = calcNonTextRowHeight(this.rows[ri], bwidth, imgpadding, this.leftpad, this.rightpad);

				this.field_textlines_count[this.rows[ri]["f"]] = (tmph + 0.5 *this.txtlnheight) / this.txtlnheight;
				maxrowtextlineslen = Math.ceil(this.field_textlines_count[this.rows[ri]["f"]]);

			} else {

				maxrowtextlineslen=0;
				for (let colidx=0; colidx<this.columncount; colidx++) {
					maxrowtextlineslen = Math.max(maxrowtextlineslen, this.rows[ri]["c"][colidx].length);
				}
			}

			if (this.max_textlines_height) {

				if (pageaccumtextlineslen + maxrowtextlineslen > this.max_textlines_height) {
					page_items.push({
						"textlineslen": pageaccumtextlineslen,
					})
					this.rowboundaries.push([prevrowbndry, ri-1]);
					prevrowbndry = ri;
					pageaccumtextlineslen = 0;
				}
			}
			pageaccumtextlineslen += maxrowtextlineslen;
			accumtextlineslen += maxrowtextlineslen;
		}

		page_items.push({
			"textlineslen": pageaccumtextlineslen
		})

		let height, textlineslen = 0
		for (const pi of page_items) {
			textlineslen = Math.max(textlineslen, pi.textlineslen);
		}

		// Header + row lines + row separators
		height = (GlobalConst.INFO_MAPTIPS_BOXSTYLE["header_spacing_factor"] * this.txtlnheight) + (textlineslen * lineheightfactor * this.txtlnheight) + (this.rows.length * (rowsintervalfactor * this.txtlnheight));

		if (this.rows.length > 0) {
			this.rowboundaries.push([prevrowbndry, currow]);
		}

		if (this.max_textlines_height) {
			this.pagecount = this.rowboundaries.length;
		} else {
			this.pagecount = 1;
		}
		if (this.activepageidx < 0) {
			this.activepageidx = 0;
		}

		// footer
		if (this.pagecount > 1) {
			height += GlobalConst.INFO_MAPTIPS_BOXSTYLE["footer_spacing_factor"][0] * this.txtlnheight;
		} else {
			height += GlobalConst.INFO_MAPTIPS_BOXSTYLE["footer_spacing_factor"][1] * this.txtlnheight;
		}

		//console.log("pgcnt:", this.pagecount, this.activepageidx);
		// Layer caption
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
	
		this._drawBackground(this.ctx, bwidth, height, this.txtlnheight);
		this._drawLayerCaption(this.ctx, this.origin[1]+1.2*this.txtlnheight, lbl);

		this.ctx.fillStyle = this.fillTextStyle;
		this.ctx.strokeStyle = this.URLStyle;

		let cota = this.origin[1] + 2.5*this.txtlnheight;
		this.topcota = cota - lineheightfactor*this.txtlnheight;

		// loop through printing rows

		const fromri = this.rowboundaries[this.activepageidx][0];
		const tori = this.rowboundaries[this.activepageidx][1];

		// Actual drawing
		let lnidx, crrfld, fmt, bgwidth, textorig_x, lineincell_txt, txtdims, changed_found;

		for (let row, ri=fromri; ri<=tori; ri++) {

			if (this.rows[ri]["c"] === undefined) {
				continue;
			}

			row = this.rows[ri]["c"];
			lnidx = 0;
			crrfld = this.rows[ri]["f"];
			fmt = this.formats[crrfld];

			// ---- Draw row backgrounds ----
			// loop layout columns
			for (let hunit, colidx=0; colidx<this.columncount; colidx++) {

				// for now, draw backgrounds only on value cells
				if (colidx % 2 == 1 && fmt != null && fmt !== undefined && fmt["backgroundColor"] !== undefined) {
					
					bgwidth = 0;
					// loop lines of text to get max textwidth
					for (lineincell_txt of row[colidx]) {
						txtdims = this.ctx.measureText(lineincell_txt);
						if (txtdims.width > bgwidth) {
							bgwidth = txtdims.width;
						}
					}
					bgwidth += 6;
					textorig_x = this.origin[0]+this.leftpad+this.colsizes[colidx-1]+colidx*this.betweencols;
					hunit = lineheightfactor * this.txtlnheight;

					this.ctx.save();
					this.ctx.fillStyle = fmt["backgroundColor"];
					this.ctx.fillRect(textorig_x-3, cota - hunit, bgwidth, row[colidx].length * hunit + 0.25 * this.txtlnheight);
					this.ctx.restore();
				}
			}
			// --- Draw row's text ----
			// loop text lines per each row
			do {
				changed_found = false;

				// loop layout columns

				for (let colidx=0; colidx<this.columncount; colidx++) {

					if (row[colidx].length > lnidx) {
						
						lineincell_txt = row[colidx][lnidx];
						//console.log(row, colidx, lnidx, celltxt);

						if (colidx % 2 == 0) { //  EVEN COLUNNS 

							this.ctx.textAlign = "right";
							this.ctx.font = `${this.normalszPX}px ${this.captionfontfamily}`;
							this.ctx.fillText(lineincell_txt, this.origin[0]+this.leftpad+this.colsizes[0], cota);	

						} else {  //  odd COLUNNS 

							textorig_x = this.origin[0]+this.leftpad+this.colsizes[colidx-1]+colidx*this.betweencols;

							// Drawing values text
							// console.log(">>", lineincell_txt, fmt);

							this.ctx.textAlign = "left";
							this.ctx.font = `${this.normalszPX}px ${this.fontfamily}`;
							txtdims = this.ctx.measureText(lineincell_txt);

							if (this.urls[crrfld] !== undefined) {
								this.ctx.save();
								this.ctx.fillStyle = this.URLStyle;
							}

							this.ctx.fillText(lineincell_txt, textorig_x, cota);	

							if (this.urls[crrfld] !== undefined) {
								// underline
								this.ctx.beginPath();
								this.ctx.moveTo(textorig_x, cota+3)
								this.ctx.lineTo(textorig_x+txtdims.width, cota+3);
								this.ctx.closePath();
								this.ctx.stroke();

								this.ctx.restore();
							}
						}
						changed_found = true;
					}	
				}
				if (changed_found) {
					cota += lineheightfactor * this.txtlnheight;
					lnidx++;
				}
			} while (changed_found);

			// end of text lines loop
			cota = cota + rowsintervalfactor *this.txtlnheight;
		}

		// Non-text items
		const left_caption = this.origin[0] + bwidth / 2.0;

		// console.log(">>>", this.rows.length, fromri, tori);
		
		let left_symbs = 0;
		for (let row, ri=fromri; ri<=tori; ri++) {

			row = this.rows[ri];
			// console.log(row);

			if (row["c"] !== undefined || (row["err"] !== undefined && row["err"])) {
				continue;
			}			

			// Field caption
			if (row["hidecaption"] === undefined || !row["hidecaption"]) {
				this.ctx.textAlign = "center";
				this.ctx.font = `${this.normalszPX}px ${this.captionfontfamily}`;
				this.ctx.fillText(row["cap"], left_caption, cota);	
				cota = cota + 0.5 * this.txtlnheight;
			} else {
				cota = cota - 0.25 * this.txtlnheight;
			}

			if (row["thumbcoll"] !== undefined) {

				if (row["err"] !== undefined && row["err"]) {
					continue;
				}
				
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

				let currh = 0;
				for (let imge, rii=0; rii < row["thumbcoll"].length; rii++) {
					if (row["thumbcoll"][rii] !== undefined) {
						imge = row["thumbcoll"][rii];

						const [w, h, rowi, coli] = row["dims_pos"][rii];

						currh = Math.max(currh, h);
						if (imge.complete) {
							if (coli == 0) {

								left_symbs = this.origin[0] + (bwidth - acumwidths[rowi]) / 2.0;
								if (rowi > 0) {
									cota += currh + imgpadding;
									currh = 0;
								}
							}
							this.ctx.drawImage(imge, left_symbs, cota, w, h);
						};	

						left_symbs = left_symbs + w + imgpadding;	
					}				
				}
				cota += currh;

			} else if (row["singleimg"] !== undefined) {
				
				const imge = row["singleimg"];
				if (row["dims"] !== undefined) {
					const [w, h] = row["dims"];
					if (imge.complete) {
						left_symbs = this.origin[0] + (bwidth - w) / 2.0;
						this.ctx.drawImage(imge, left_symbs, cota, w, h);
						cota = cota + h;
					}
				}
			}

			cota = cota + this.txtlnheight;
		}


		if (this.recordcnt > 1) {
			this.drawnavitems(this.recordidx+1, this.data[this.data_key].length);
		}

		this.drawcount++;

		this.drawpagenavitems();

		this.ctx.restore();
	}

	infoclear() {
		const topcnv = this.mapctx.renderingsmgr.getTopCanvas();
		this.ctx.clearRect(0, 0, ...this.mapdims); 
		topcnv.style.cursor = "default";
	}	

	interact_infobox(p_evt) {

		const lineheightfactor = GlobalConst.INFO_MAPTIPS_BOXSTYLE["lineheightfactor"];
		const rowsintervalfactor = GlobalConst.INFO_MAPTIPS_BOXSTYLE["rowsintervalfactor"];

		const SHOWROWS = false;

		const topcnv = this.mapctx.renderingsmgr.getTopCanvas();
		topcnv.style.cursor = "default";

		// in header
		if (p_evt.offsetX >= this.headerbox[0] && p_evt.offsetX <= this.headerbox[0] + this.headerbox[2] && 
			p_evt.offsetY >= this.headerbox[1] && p_evt.offsetY <= this.headerbox[1] + this.headerbox[3]) {

				let cb;
				for (let k in this.clickboxes) {

					cb = this.clickboxes[k];

					if (p_evt.offsetX >= cb[0] && p_evt.offsetX <= cb[2] && 
						p_evt.offsetY >= cb[1] && p_evt.offsetY <= cb[3]) {

							if (p_evt.type == "mouseup" || p_evt.type == "touchend") {

								switch(k) {

									case "next":
										if (this.recordidx == this.recordcnt-1) {
											this.recordidx = 0;
										} else {
											this.recordidx++;
										}
										this.activepageidx = 0;
										this.infoclear();
										this.infodraw();
										break;

									case "prev":
										if (this.recordidx == 0) {
											this.recordidx = this.recordcnt-1;
										} else {
											this.recordidx--;
										}
										this.activepageidx = 0;
										this.infoclear();
										this.infodraw();
										break;		
										
									case "toend":
										this.recordidx = this.recordcnt-1;
										this.activepageidx = 0;
										this.infoclear();
										this.infodraw();
										break;			
																			
								}
							} else {
								topcnv.style.cursor = "pointer";	
							}
					}
				}
		} else {
			
			// checking fldname linked to the area clicked by user
			let prev, next, left, right, first=true, fldname=null, accumrows=0, row=null;

			if (SHOWROWS) {
				this.ctx.save();
				this.ctx.strokeStyle ="white";
				this.ctx.fillStyle ="white";
				this.ctx.lineWidth = 2;
				this.ctx.font = "20px Arial";
			}

			let cb, alreadycaptured = false;
			for (let k in this.clickboxes) {

				if (!k.startsWith("page")) {
					continue;
				}

				cb = this.clickboxes[k];

				if (p_evt.offsetX >= cb[0] && p_evt.offsetX <= cb[2] && 
					p_evt.offsetY >= cb[1] && p_evt.offsetY <= cb[3]) {

						const pagenum = parseInt(k.replace(/[a-zA-Z]+/g,''));
						if (p_evt.type == "mouseup" || p_evt.type == "touchend") {
							this.activepageidx = pagenum-1;
							this.infoclear();
							this.infodraw();
						} else {
							if (!isNaN(pagenum)) {
								if (this.activepageidx != (pagenum-1)){
									topcnv.style.cursor = "pointer";
								}
							} else {
								topcnv.style.cursor = "pointer";
							}							
						}
						alreadycaptured = true;
						break;
				}
			}

			if (alreadycaptured) {
				return;
			}

			let cnt = 0;

			//console.log("::779:: used fldnames:", this.used_fldnames);

			const fromri = this.rowboundaries[this.activepageidx][0];
			const tori = this.rowboundaries[this.activepageidx][1];

			for (let fld, flix = fromri; flix<=tori; flix++) {

				fld = this.used_fldnames[flix];

				accumrows = accumrows + this.field_textlines_count[fld];
				cnt++;

				if (first) {
					prev = this.topcota;
				} else {
					prev = next;
				}
				first = false;
				next = prev + (Math.ceil(this.field_textlines_count[fld]) * lineheightfactor * this.txtlnheight) + rowsintervalfactor * this.txtlnheight;

				if (SHOWROWS) {
					console.log(`${cnt.toString()} ${fld}`);
					this.ctx.fillText(`${cnt.toString()} ${fld}`,90,next);
					this.ctx.beginPath();
					this.ctx.moveTo(100,next);
					this.ctx.lineTo(700,next);
					this.ctx.stroke();
				}

				// console.log('     ', fld, prev, next, p_evt.offsetY);
				if (p_evt.offsetY >= prev && p_evt.offsetY < next) {
					fldname = fld;
					row = this.rows[flix];
					break;
				}
			}

			//console.log("fldname:", fldname, "type:", p_evt.type, "row", row);

			if (fldname != null) {

				let mode = 'NONE';

				if (this.layer.infocfg.fields["formats"][fldname] !== undefined) {
					if (this.nontext_formats.indexOf(this.layer.infocfg.fields["formats"][fldname]["type"]) < 0) {
						if (this.columncount > 0) {
							mode = 'GOTEXTCOLS';
						}
					} else {
						mode = 'GOELSE';
					}
				} else {
					if (this.columncount > 0) {
						mode = 'GOTEXTCOLS';
					}
				}

				// if ((this.layer.infocfg.fields["formats"][fldname] === undefined || 
				// 	this.nontext_formats.indexOf(this.layer.infocfg.fields["formats"][fldname]["type"]) < 0)
				// 	&& this.columncount > 0) {

				// images and icons, collections etc.
				if (mode == 'GOELSE') {	

					if (this.layer.infocfg.fields["formats"][fldname]["type"] == "singleimg") {
						if (['touchend', 'mouseup', 'mouseout', 'mouseleave'].indexOf(p_evt.type) >= 0) {
							topcnv.style.cursor = "default";
							this.infobox_static_expandimage_method(row["singleimg"]);
						} else if ("mousemove" == p_evt.type) {
							if (p_evt.offsetX >= this.box[0]+this.leftpad 
								&& p_evt.offsetX <= this.box[0]+this.box[2]-this.rightpad) {
								topcnv.style.cursor = "pointer";
							}
						}
					}
					
				} else if (mode == 'GOTEXTCOLS') {	
				
					let foundcolidx = -1;
					for (let colidx=0; colidx<this.columncount; colidx++) {
						if (colidx == 0) {
							left = this.origin[0]+this.leftpad;
						} else {
							left = right+this.betweencols;
						}
						right = left + this.colsizes[colidx];		
						if (p_evt.offsetX >= left && p_evt.offsetX <= right) {
							foundcolidx = colidx;
							break;
						}
					}

					// console.log("foundcolidx:", foundcolidx, "type:", p_evt.type);

					if (foundcolidx >= 0) {
						if (p_evt.type == "mouseup" || p_evt.type == "touchend") {
							this.infobox_static_pick_method(this, this.data[this.data_key][this.recordidx], fldname, foundcolidx);
						} 
						else if (p_evt.type == "mousemove") {
							if (foundcolidx % 2 == 1) {
								// Too much intrusive
								//ctrToolTip(this.mapctx, p_evt, this.mapctx.i18n.msg('CL2CP', true), [100,100]); 
								topcnv.style.cursor = "copy";
							}
						}						
					}
				}
			}

			if (SHOWROWS) {
				this.ctx.restore();
			}
		} 

		
		if (p_evt['preventDefault'] !== undefined) {
			p_evt.preventDefault();
		} 
	}

}

