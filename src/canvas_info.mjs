
import {I18n} from './i18n.mjs';
import {GlobalConst} from './constants.js';
import {PopupBox} from './canvas_maptip.mjs';
import {canvasWrtField} from './utils.mjs';
import {ctrToolTip} from './customization_canvas_baseclasses.mjs';

export class InfoBox extends PopupBox {

	data;
	box;
	recordidx;
	navFillStyle;
	clickboxes;
	urls;
	formats;
	field_textlines_count;
	ordered_fldnames;
	txtlnheight;
	topcota;
	colsizes;
	columncount;
	rowboundaries; // for each page

	constructor(p_mapctx, p_layer, p_data, p_styles, p_scrx, p_scry, p_infobox_pick_method, b_callout, opt_max_rows_height) {

		super(p_mapctx, p_layer, p_styles, p_scrx, p_scry, b_callout);

		this.data = p_data;
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
		this.max_textlines_height = opt_max_rows_height;

		this.pagecount = 0;
		this.activepageidx = -1;

		this.rowboundaries = []; // for each page
	
		if (this.layer.infocfg["qrykey"] === undefined) {
			throw new Error(`Missing mandatory 'infocfg.qrykey' config (info query 'falias' in 'risco_find') for layer '${this.layer.key}`);
		}

		if (this.layer.infocfg["jsonkey"] === undefined) {
			throw new Error(`Missing mandatory 'infocfg.jsonkey' config (info query 'alias' in 'risco_find') for layer '${this.layer.key}`);
		}

		if (this.data[this.layer.infocfg.jsonkey] === undefined) {
			throw new Error(`Missing 'infocfg.jsonkey' in data row (found keys:${Object.keys(this.data)}) for layer '${this.layer.key}`);
		}
		
		this.recordcnt = this.data[this.layer.infocfg.jsonkey].length;
		
		if (p_styles["navFillStyle"] !== undefined) {
			this.navFillStyle = p_styles["navFillStyle"];
		} else {
			this.navFillStyle = "grey";
		}		

		this.clickboxes = {};
	}

	drawnavitems(p_ctx, p_recnum, p_totalrecs) {

		function rightarrow(pp_ctx, p_dims) {

			pp_ctx.beginPath();
			pp_ctx.moveTo(p_dims[0], p_dims[2]);
			pp_ctx.lineTo(p_dims[1], p_dims[3]);
			pp_ctx.lineTo(p_dims[0], p_dims[4]);
			pp_ctx.closePath();
	
			pp_ctx.fill();
		}

		p_ctx.save();
		p_ctx.fillStyle = this.navFillStyle;
		p_ctx.strokeStyle = this.navFillStyle;
		p_ctx.lineWidth = 2;

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

			rightarrow(p_ctx, [left, right, bottom, middle, top]);

			p_ctx.beginPath();
			p_ctx.moveTo(right, bottom);
			p_ctx.lineTo(right, top);
			p_ctx.stroke();

			// move to shift right
			right = left - smallsep; 
			left = right - width;
		}

		// shift right
		this.clickboxes["next"] = [left, top, right, bottom];
		rightarrow(p_ctx, [left, right, bottom, middle, top]);

		// shift left
		right = left - sep; 
		left = right - width;
		this.clickboxes["prev"] = [left, top, right, bottom];

		p_ctx.beginPath();
		p_ctx.moveTo(right, bottom);
		p_ctx.lineTo(right, top);
		p_ctx.lineTo(left, middle);
		p_ctx.closePath();

		p_ctx.fill();

		p_ctx.textAlign = 'right';
		p_ctx.fillText(`${p_recnum}/${p_totalrecs}`, left-sep, bottom);

		p_ctx.restore();

	}

	drawpagenavitems(p_ctx) {

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

		p_ctx.strokeStyle = this.navFillStyle;
		p_ctx.lineWidth = 1;

		p_ctx.font = '10px sans-serif';

		for (let i = (this.pagecount-1); i>=0; i--) {
			
			origx = rightmost - (1 + (this.pagecount-1-i)) * size - (this.pagecount-1-i) * sep;

			this.clickboxes[`page${(i+1)}`] = [origx, origy, origx+size, origy+size];

			if (i==this.activepageidx) {
				p_ctx.fillStyle = this.navFillStyle;
				p_ctx.fillRect(origx, origy, size, size);
				p_ctx.fillStyle = "black";
				p_ctx.fillText(i+1, origx+texthoffset+(size/4), origy+size-textvoffset);	
			} else {
				p_ctx.fillStyle = this.navFillStyle;
				p_ctx.fillText(i+1, origx+texthoffset+(size/4), origy+size-textvoffset);	
			}
			p_ctx.strokeRect(origx, origy, size, size);

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

		const recdata = this.data[this.layer.infocfg.jsonkey][this.recordidx];

		if (this.layer.infocfg.fields["transforms"] !== undefined) {
			const trfcfgs = this.layer.infocfg.fields.transforms;
			for (const trcfg of trfcfgs) {
				const [data, format] = trcfg.func(recdata);
				recdata[trcfg.outfield] = data;
				this.formats[trcfg.outfield] = format;
			}
		}

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
			this.field_textlines_count[fld] = canvasWrtField(this, p_ctx, recdata, fld, lang, this.layer.msgsdict, capttextwidth, valuetextwidth, this.rows, this.urls);
			if (this.field_textlines_count[fld] > 0) {
				this.used_fldnames.push(fld);
			}
		}	

		this.colsizes=[0,0];

		// calc max widths of text in columns
		for (let row of this.rows) {

			for (let i=0; i<this.columncount; i++) {
				if (i==0) {
					p_ctx.font = `${this.normalszPX}px ${this.captionfontfamily}`;
				} else {
					p_ctx.font = `${this.normalszPX}px ${this.fontfamily}`;
				}
				for (let rowln of row["c"][i]) {
					this.colsizes[i] = Math.max(p_ctx.measureText(rowln).width, this.colsizes[i]);
				}
			}
		}

		// console.log("-- px:", this.layercaptionszPX, "asc:", lbltm.actualBoundingBoxAscent, "desc:", lbltm.actualBoundingBoxDescent);
		// ROWS: are not data rows, are rows of printing, each row corresponds to an atrribute or data field
		// TEXTLINE: each row can geneate ZERO or more text lines

		let height, prevrowbndry = 0, currow;
		let maxrowtextlineslen, accumtextlineslen, pageaccumtextlineslen;
		this.rowboundaries.length = 0;
		pageaccumtextlineslen = 0;
		accumtextlineslen = 0;

		// calculate global height of text line - from layer caption font - e
		p_ctx.font = `${this.layercaptionszPX}px ${this.layercaptionfontfamily}`;
		this.txtlnheight = this.layercaptionszPX

		// Include header
		height = 1.6 * this.txtlnheight;

		// calc text line boundaries for each "page"
		for (let onfirstpage=true, ri=0; ri<this.rows.length; ri++) {

			currow = ri;

			maxrowtextlineslen=0;
			for (let colidx=0; colidx<this.columncount; colidx++) {
				maxrowtextlineslen = Math.max(maxrowtextlineslen, this.rows[ri]["c"][colidx].length);
			}

			if (onfirstpage) {
				height += (maxrowtextlineslen * lineheightfactor * this.txtlnheight) + (rowsintervalfactor * this.txtlnheight);
			}
			
			if (this.max_textlines_height) {
				if (pageaccumtextlineslen + maxrowtextlineslen > this.max_textlines_height) {
					onfirstpage = false;
					this.rowboundaries.push([prevrowbndry, ri-1]);
					prevrowbndry = ri;
					pageaccumtextlineslen = 0;
				}
			}
			pageaccumtextlineslen += maxrowtextlineslen;
			accumtextlineslen += maxrowtextlineslen;
		}
		if (this.rows.length > 0) {
			this.rowboundaries.push([prevrowbndry, currow]);
		}

		//console.log("rowboundaries:", this.rowboundaries);

		if (this.max_textlines_height) {
			this.pagecount = this.rowboundaries.length;
		} else {
			this.pagecount = 1;
		}
		if (this.activepageidx < 0) {
			this.activepageidx = 0;
		}

		//console.log("pgcnt:", this.pagecount, this.activepageidx);
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

		this._drawBackground(p_ctx, maxboxwidth, height, this.txtlnheight, lbl);

		p_ctx.fillStyle = this.fillTextStyle;
		p_ctx.strokeStyle = this.URLStyle;

		let cota = this.origin[1] + 2.5*this.txtlnheight;
		this.topcota = cota - lineheightfactor*this.txtlnheight;

		// loop through printing rows

		const fromri = this.rowboundaries[this.activepageidx][0];
		const tori = this.rowboundaries[this.activepageidx][1];

		// Actual drawing
		let lnidx, crrfld, fmt, bgwidth, textorig_x, lineincell_txt, txtdims, changed_found;
		for (let row, ri=fromri; ri<=tori; ri++) {

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
						txtdims = p_ctx.measureText(lineincell_txt);
						if (txtdims.width > bgwidth) {
							bgwidth = txtdims.width;
						}
					}
					bgwidth += 6;
					textorig_x = this.origin[0]+this.leftpad+this.colsizes[colidx-1]+colidx*this.betweencols;
					hunit = lineheightfactor * this.txtlnheight;

					p_ctx.save();
					p_ctx.fillStyle = fmt["backgroundColor"];
					p_ctx.fillRect(textorig_x-3, cota - hunit, bgwidth, row[colidx].length * hunit + 0.25 * this.txtlnheight);
					p_ctx.restore();
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

							p_ctx.textAlign = "right";
							p_ctx.font = `${this.normalszPX}px ${this.captionfontfamily}`;
							p_ctx.fillText(lineincell_txt, this.origin[0]+this.leftpad+this.colsizes[0], cota);	

						} else {  //  odd COLUNNS 

							textorig_x = this.origin[0]+this.leftpad+this.colsizes[colidx-1]+colidx*this.betweencols;

							// Drawing values text
							// console.log(">>", lineincell_txt, fmt);

							p_ctx.textAlign = "left";
							p_ctx.font = `${this.normalszPX}px ${this.fontfamily}`;
							txtdims = p_ctx.measureText(lineincell_txt);

							if (this.urls[crrfld] !== undefined) {
								p_ctx.save();
								p_ctx.fillStyle = this.URLStyle;
							}

							p_ctx.fillText(lineincell_txt, textorig_x, cota);	

							if (this.urls[crrfld] !== undefined) {
								// underline
								p_ctx.beginPath();
								p_ctx.moveTo(textorig_x, cota+3)
								p_ctx.lineTo(textorig_x+txtdims.width, cota+3);
								p_ctx.closePath();
								p_ctx.stroke();

								p_ctx.restore();
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

		if (this.recordcnt > 1) {
			this.drawnavitems(p_ctx, this.recordidx+1, this.data[this.layer.infocfg.jsonkey].length);
		}

		this.drawcount++;

		this.drawpagenavitems(p_ctx);

		p_ctx.restore();
	}

	clear(p_ctx) {
		const topcnv = this.mapctx.renderingsmgr.getTopCanvas();
		p_ctx.clearRect(0, 0, ...this.mapdims); 
		topcnv.style.cursor = "default";
	}	

	interact(p_ctx, p_evt) {

		const lineheightfactor = GlobalConst.INFO_MAPTIPS_BOXSTYLE["lineheightfactor"];
		const rowsintervalfactor = GlobalConst.INFO_MAPTIPS_BOXSTYLE["rowsintervalfactor"];

		const SHOWROWS = false;

		const topcnv = this.mapctx.renderingsmgr.getTopCanvas();
		topcnv.style.cursor = "default";

		// in header
		if (p_evt.clientX >= this.headerbox[0] && p_evt.clientX <= this.headerbox[0] + this.headerbox[2] && 
			p_evt.clientY >= this.headerbox[1] && p_evt.clientY <= this.headerbox[1] + this.headerbox[3]) {

				let cb;
				for (let k in this.clickboxes) {
					cb = this.clickboxes[k];

					if (p_evt.clientX >= cb[0] && p_evt.clientX <= cb[2] && 
						p_evt.clientY >= cb[1] && p_evt.clientY <= cb[3]) {

							if (p_evt.type == "mouseup" || p_evt.type == "touchend") {

								switch(k) {

									case "next":
										if (this.recordidx == this.recordcnt-1) {
											this.recordidx = 0;
										} else {
											this.recordidx++;
										}
										this.activepageidx = 0;
										this.clear(p_ctx);
										this.draw(p_ctx);
										break;

									case "prev":
										if (this.recordidx == 0) {
											this.recordidx = this.recordcnt-1;
										} else {
											this.recordidx--;
										}
										this.activepageidx = 0;
										this.clear(p_ctx);
										this.draw(p_ctx);
										break;		
										
									case "toend":
										this.recordidx = this.recordcnt-1;
										this.activepageidx = 0;
										this.clear(p_ctx);
										this.draw(p_ctx);
										break;												
								}
							} else {
								topcnv.style.cursor = "pointer";	
							}
					}
				}
		} else {
			
			// checking fldname linked to the area clicked by user
			let prev, next, left, right, first=true, fldname=null, accumrows=0;

			if (SHOWROWS) {
				p_ctx.save();
				p_ctx.strokeStyle ="white";
				p_ctx.fillStyle ="white";
				p_ctx.lineWidth = 2;
				p_ctx.font = "20px Arial";
			}

			let cb, alreadycaptured = false;
			for (let k in this.clickboxes) {
				if (!k.startsWith("page")) {
					continue;
				}
				cb = this.clickboxes[k];

				if (p_evt.clientX >= cb[0] && p_evt.clientX <= cb[2] && 
					p_evt.clientY >= cb[1] && p_evt.clientY <= cb[3]) {

						const pagenum = parseInt(k.replace(/[a-zA-Z]+/g,''));
						if (p_evt.type == "mouseup" || p_evt.type == "touchend") {
							this.activepageidx = pagenum-1;
							this.clear(p_ctx);
							this.draw(p_ctx);	
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
				next = prev + (this.field_textlines_count[fld] * lineheightfactor * this.txtlnheight) + rowsintervalfactor * this.txtlnheight;

				if (SHOWROWS) {
					p_ctx.fillText(`${cnt.toString()} ${fld}`,90,next);
					p_ctx.beginPath();
					p_ctx.moveTo(100,next);
					p_ctx.lineTo(700,next);
					p_ctx.stroke();
				}

				if (p_evt.clientY >= prev && p_evt.clientY < next) {
					//console.log('*', fld, p, next, p_evt.clientY);
					fldname = fld;
					break;
				}
			}

			if (fldname != null && this.columncount > 0) {
				let foundcolidx = -1;
				for (let colidx=0; colidx<this.columncount; colidx++) {
					if (colidx == 0) {
						left = this.origin[0]+this.leftpad;
					} else {
						left = right+this.betweencols;
					}
					right = left + this.colsizes[colidx];		
					if (p_evt.clientX >= left && p_evt.clientX <= right) {
						foundcolidx = colidx;
						break;
					}
				}

				if (foundcolidx >= 0) {
					if (p_evt.type == "mouseup" || p_evt.type == "touchend") {
						this.infobox_static_pick_method(this, this.data[this.layer.infocfg.jsonkey][this.recordidx], fldname, foundcolidx);
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

			if (SHOWROWS) {
				p_ctx.restore();
			}
		} 
	}

}

