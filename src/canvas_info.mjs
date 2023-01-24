
import {I18n} from './i18n.mjs';
import {GlobalConst} from './constants.js';
import {PopupBox} from './canvas_maptip.mjs';

export class InfoBox extends PopupBox {

	data;
	box;
	recordidx;
	navFillStyle;
	clickboxes;

	constructor(p_mapctx, p_layer, p_data, p_styles, p_scrx, p_scry, b_callout) {

		super(p_mapctx, p_layer, p_styles, p_scrx, p_scry, b_callout);

		this.data = p_data;
		this.recordidx = -1;

		if (this.layer.infocfg["jsonkey"] === undefined) {
			throw new Error(`Missing mandatory 'infocfg.jsonkey' config for layer '${this.layer.key}`);
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

		function wrtField(p_this, pp_ctx, p_rows, p_attrs, p_fld, p_msgsdict, max_captwidth, max_valuewidth) {
			
			let caption;

			if (Object.keys(p_msgsdict).indexOf(p_fld) >= 0) {
				caption = I18n.capitalize(p_msgsdict[p_fld]);
			} else {
				caption = I18n.capitalize(p_fld);
			}

			let pretext, tmp, captionlines=[], valuelines = [];

			if (p_this.layer.infocfg.fields["formats"] !== undefined && p_this.layer.infocfg.fields["formats"][p_fld] !== undefined) {
				if (p_this.layer.infocfg.fields["formats"][p_fld]["type"] !== undefined) {
					switch(p_this.layer.infocfg.fields["formats"][p_fld]["type"]) {

						case "date":
							tmp = new Date(p_attrs[p_fld]);
							pretext = tmp.toLocaleDateString(lang);
							break;

						case "time":
							tmp = new Date(p_attrs[p_fld]);
							pretext = tmp.toLocaleTimeString(lang);
							break;
	
						case "datetime":
						case "timeanddate":
						case "dateandtime":
							tmp = new Date(p_attrs[p_fld]);
							pretext = tmp.toLocaleString(lang);
							break;

					}
				}
			} else {
				pretext = p_attrs[p_fld];
			}

			if (typeof pretext != 'number') {
				let words;
				try {
					words = pretext.split(/\s+/);
				} catch(e) {
					console.error(p_fld, typeof pretext);
					throw e;
				}
				if (words) {
					pp_ctx.font = `${p_this.normalszPX}px ${p_this.fontfamily}`;
					collectLines(pp_ctx, words, max_valuewidth, valuelines);
				} else {
					valuelines.push('');
				}
			} else {
				valuelines = [pretext.toString()];
			}

			const words = caption.split(/\s+/);
			if (words) {
				pp_ctx.font = `${p_this.normalszPX}px ${p_this.captionfontfamily}`;
				collectLines(pp_ctx, words, max_captwidth, captionlines);
			} else {
				captionlines.push('');
			}

			p_rows.push([captionlines, valuelines]);
		}

		if (this.recordidx < 0) {
			this.recordidx = 0;
		}

		const maxboxwidth = Math.max(GlobalConst.INFO_MAPTIPS_BOXSTYLE["minpopupwidth"], this.mapdims[0] / 2.5);

		const capttextwidth = GlobalConst.INFO_MAPTIPS_BOXSTYLE["caption2value_widthfraction"] * maxboxwidth;
		const valuetextwidth = (1 - GlobalConst.INFO_MAPTIPS_BOXSTYLE["caption2value_widthfraction"]) * maxboxwidth;

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
			wrtField(this, p_ctx, rows, recdata, fld, this.layer.msgsdict[lang], capttextwidth, valuetextwidth);
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
		let maxrowlen, height, textlinescnt=0, lineheightfactor = 1.8;
		height = 6*txtlnheight;
		for (let row, ri=0; ri<rows.length; ri++) {
			maxrowlen=0;
			row = rows[ri];
			for (let colidx=0; colidx<numcols; colidx++) {
				maxrowlen = Math.max(maxrowlen, row[colidx].length);
			}
			textlinescnt += maxrowlen;
			//cota += maxrowlen * lineheightfactor * txtlnheight + 0.5 * txtlnheight;

			height += 0.5 * txtlnheight;
		}
		height = height + textlinescnt * lineheightfactor * txtlnheight; // - 2 * txtlnheight;

		this._drawBackground(p_ctx, maxboxwidth, height, txtlnheight);

		p_ctx.fillStyle = this.fillTextStyle;

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

		if (this.recordcnt > 1) {
			this.drawnavitems(p_ctx, this.recordidx+1, this.data[this.layer.infocfg.jsonkey].length);
		}

		p_ctx.restore();
	}

	clear(p_ctx) {
		p_ctx.clearRect(0, 0, ...this.mapdims); 
	}	

	interact(p_evt, p_ctx) {

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
			} 
	}
}