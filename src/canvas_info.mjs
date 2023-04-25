
import {I18n} from './i18n.mjs';
import {GlobalConst} from './constants.js';
import {PopupBox} from './canvas_maptip.mjs';
import {canvasWrtField} from './utils.mjs';

export class InfoBox extends PopupBox {

	data;
	box;
	recordidx;
	navFillStyle;
	clickboxes;
	urls;
	formats;
	field_row_count;
	ordered_fldnames;
	txtlnheight;
	topcota;
	colsizes;
	columncount;

	constructor(p_mapctx, p_layer, p_data, p_styles, p_scrx, p_scry, p_infobox_pick_method, b_callout) {

		super(p_mapctx, p_layer, p_styles, p_scrx, p_scry, b_callout);

		this.data = p_data;
		this.recordidx = -1;
		this.urls = {};
		this.formats = {};
		this.field_row_count = {};
		this.ordered_fldnames = [];
		this.txtlnheight = 0;
		this.topcota = 0;
		this.colsizes = [0,0];
		this.columncount = 2;
		this.infobox_static_pick_method = p_infobox_pick_method;

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

		// jump end
		let right = this.box[0] + this.box[2] - pad; 
		let left = right - width;

		if (this.recordcnt > 2) {

			this.clickboxes["toend"] = [left, bottom, right, top];

			rightarrow(p_ctx, [left, right, bottom, middle, top]);

			p_ctx.beginPath();
			p_ctx.moveTo(right, bottom);
			p_ctx.lineTo(right, top);
			p_ctx.stroke();

			// shift right
			right = left - smallsep; 
			left = right - width;
		}

		this.clickboxes["next"] = [left, bottom, right, top];

		rightarrow(p_ctx, [left, right, bottom, middle, top]);

		// shift left

		right = left - sep; 
		left = right - width;

		this.clickboxes["prev"] = [left, bottom, right, top];

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

		const tipsboxfrac = GlobalConst.INFO_MAPTIPS_BOXSTYLE["tipsbox2map_widthfraction"];
		const maxboxwidth = Math.min(Math.max(GlobalConst.INFO_MAPTIPS_BOXSTYLE["minpopupwidth"], this.mapdims[0] / tipsboxfrac), GlobalConst.INFO_MAPTIPS_BOXSTYLE["maxpopupwidth"]);
		const capttextwidth = GlobalConst.INFO_MAPTIPS_BOXSTYLE["caption2value_widthfraction"] * maxboxwidth;
		const valuetextwidth = (1 - GlobalConst.INFO_MAPTIPS_BOXSTYLE["caption2value_widthfraction"]) * maxboxwidth;
		const lineheightfactor = GlobalConst.INFO_MAPTIPS_BOXSTYLE["lineheightfactor"];

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
			this.field_row_count[fld] = canvasWrtField(this, p_ctx, recdata, fld, lang, this.layer.msgsdict, capttextwidth, valuetextwidth, this.rows, this.urls);
		}	
		
		// Calc text dims
		let row, cota, lnidx, lineincell_txt, txtdims, changed_found;
		this.colsizes=[0,0];
		for (row of this.rows) {
			for (let i=0; i<this.columncount; i++) {
				if (i==0) {
					p_ctx.font = `${this.normalszPX}px ${this.captionfontfamily}`;
				} else {
					p_ctx.font = `${this.normalszPX}px ${this.fontfamily}`;
				}
				for (let rowln of row[i]) {
					this.colsizes[i] = Math.max(p_ctx.measureText(rowln).width, this.colsizes[i]);
				}
			}
		}

		// calculate global height of text line - from layer caption font - e
		p_ctx.font = `${this.layercaptionszPX}px ${this.layercaptionfontfamily}`;
		this.txtlnheight = this.layercaptionszPX

		// console.log("-- px:", this.layercaptionszPX, "asc:", lbltm.actualBoundingBoxAscent, "desc:", lbltm.actualBoundingBoxDescent);

		// ROWS: are not data rows, are rows of printing, each row corresponds to an atrribute or data field

		// calculate height of all rows
		let maxrowlen, height, textlinescnt=0;
		height = 2.5 * this.txtlnheight;
		for (let row, ri=0; ri<this.rows.length; ri++) {

			maxrowlen=0;
			row = this.rows[ri];
			for (let colidx=0; colidx<this.columncount; colidx++) {
				maxrowlen = Math.max(maxrowlen, row[colidx].length);
			}
			textlinescnt += maxrowlen;

			height += (maxrowlen * lineheightfactor * this.txtlnheight) + (0.15 * this.txtlnheight);
		}
		// height = height + textlinescnt * lineheightfactor * this.txtlnheight; // - 2 * txtlnheight;

		this._drawBackground(p_ctx, maxboxwidth, height, this.txtlnheight);

		p_ctx.fillStyle = this.fillTextStyle;
		p_ctx.strokeStyle = this.URLStyle;

		cota = this.origin[1] + 2.5*this.txtlnheight;
		this.topcota = cota - lineheightfactor*this.txtlnheight;

		// loop through printing rows

		let crrfld, fmt, bgwidth, textorig_x;

		for (let ri=0; ri<this.rows.length; ri++) {

			row = this.rows[ri];
			lnidx = 0;
			crrfld = this.ordered_fldnames[ri];
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

			cota = cota + 0.15 *this.txtlnheight;
		}

		if (this.recordcnt > 1) {
			this.drawnavitems(p_ctx, this.recordidx+1, this.data[this.layer.infocfg.jsonkey].length);
		}

		p_ctx.restore();

		this.drawcount++;

		
	}

	clear(p_ctx) {
		p_ctx.clearRect(0, 0, ...this.mapdims); 
	}	

	interact(p_ctx, p_evt) {

		const lineheightfactor = GlobalConst.INFO_MAPTIPS_BOXSTYLE["lineheightfactor"];

		// in header
		if (p_evt.clientX >= this.headerbox[0] && p_evt.clientX <= this.headerbox[0] + this.headerbox[2] && 
			p_evt.clientY >= this.headerbox[1] && p_evt.clientY <= this.headerbox[1] + this.headerbox[3]) {
				let cb;
				for (let k in this.clickboxes) {
					cb = this.clickboxes[k];
					// console.log(k, cb, p_evt.clientX, p_evt.clientY);
					if (p_evt.clientX >= cb[0] && p_evt.clientX <= cb[2] && 
						p_evt.clientY <= cb[1] && p_evt.clientY >= cb[3]) {
							switch(k) {

								case "next":
									if (this.recordidx == this.recordcnt-1) {
										this.recordidx = 0;
									} else {
										this.recordidx++;
									}
									this.clear(p_ctx);
									this.draw(p_ctx);
									break;

								case "prev":
									if (this.recordidx == 0) {
										this.recordidx = this.recordcnt-1;
									} else {
										this.recordidx--;
									}
									this.clear(p_ctx);
									this.draw(p_ctx);
									break;		
									
								case "toend":
									this.recordidx = this.recordcnt-1;
									this.clear(p_ctx);
									this.draw(p_ctx);
									break;									
										
							}
					}
				}
		} else {
			
			// checking fldname linked to the area clicked by user
			let p, prev, next, left, right, first=true, fldname=null, clickedcolidx=-1;

			for (let fld of this.ordered_fldnames) {
				if (first) {
					prev = this.topcota;
				} else {
					prev = next;
				}
				first = false;
				next = prev + (this.field_row_count[fld] * lineheightfactor * this.txtlnheight) + 0.5 * this.txtlnheight;
				p = prev + 0.5 * this.txtlnheight;
				//console.log('   --', fldname, p, next, 'lh:', this.txtlnheight, p_evt.clientY);
				if (p_evt.clientY >= p && p_evt.clientY < next) {
					//console.log('*', fld, p, next, p_evt.clientY);
					fldname = fld;
					break;
				}
			}

			if (fldname && this.columncount > 0) {
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
				this.infobox_static_pick_method(this, this.data[this.layer.infocfg.jsonkey][this.recordidx], fldname, foundcolidx);
			}
		} 
	}

}