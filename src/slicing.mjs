
import {GlobalConst} from './constants.js';
import {I18n} from './i18n.mjs';
import {genRainbowColor, canvas_text_wrap} from './utils.mjs';

function aspect(p_dim1, p_dim2) {
	return Math.max(p_dim1, p_dim2) / Math.min(p_dim1, p_dim2);
}

function fillTreemapGraph_dumpResult(p_data_dict, p_dump_count) {
			
	if (p_data_dict.accum_queue.length == 1) {
			
		const [ varvalue, count ] = p_data_dict.accum_queue.shift();
		
		if (p_data_dict.current_orient == 'LAND') {
			p_data_dict.response.push([varvalue, count, p_data_dict.current_orig[0], p_data_dict.current_orig[1], p_data_dict.flex_dim, p_data_dict.outer_flex_dim, p_dump_count]);
			p_data_dict.current_orig[0] = p_data_dict.current_orig[0]+p_data_dict.flex_dim;
			p_data_dict.restspace = [p_data_dict.current_orig[0], p_data_dict.current_orig[1], p_data_dict.restspace[2]-p_data_dict.flex_dim, p_data_dict.outer_flex_dim];
		} else {
			p_data_dict.response.push([varvalue, count, p_data_dict.current_orig[0], p_data_dict.current_orig[1], p_data_dict.outer_flex_dim, p_data_dict.flex_dim, p_dump_count]);
			p_data_dict.current_orig[1] = p_data_dict.current_orig[1]+p_data_dict.flex_dim;
			p_data_dict.restspace = [p_data_dict.current_orig[0], p_data_dict.current_orig[1], p_data_dict.outer_flex_dim, p_data_dict.restspace[3]-p_data_dict.flex_dim];
		}	
		

	} else {

		let orig, area, flex_dim;

		orig = [...p_data_dict.current_orig];
		while(p_data_dict.accum_queue.length > 0) {

			const [ varvalue, count ] = p_data_dict.accum_queue.shift();
			area = count * p_data_dict.area_factor;
			flex_dim = area / p_data_dict.outer_flex_dim;

			// orientation inverted, rects are layout vertically if larger area is LAND and horizontally if larger free area is PORT
			if (p_data_dict.current_orient == 'LAND') {
				p_data_dict.response.push([varvalue, count, orig[0], orig[1], p_data_dict.outer_flex_dim, flex_dim, p_dump_count]);
				orig[1] = orig[1] + flex_dim;
			} else {
				p_data_dict.response.push([varvalue, count, orig[0], orig[1], flex_dim, p_data_dict.outer_flex_dim, p_dump_count]);
				orig[0] = orig[0] + flex_dim;
			}	
				
		}

		if (p_data_dict.current_orient == 'LAND') {
			p_data_dict.restspace = [p_data_dict.current_orig[0]+p_data_dict.outer_flex_dim, p_data_dict.current_orig[1], p_data_dict.restspace[2]-p_data_dict.outer_flex_dim, p_data_dict.restspace[3]];
		} else {
			p_data_dict.restspace = [p_data_dict.current_orig[0], p_data_dict.current_orig[1]+p_data_dict.outer_flex_dim, p_data_dict.restspace[2], p_data_dict.restspace[3]-p_data_dict.outer_flex_dim];
		}	

	}

	if (p_data_dict.restspace[2] > p_data_dict.restspace[3]) {
		p_data_dict.current_orient = 'LAND';
		p_data_dict.constrained_dim = p_data_dict.restspace[3];
	} else {
		p_data_dict.current_orient = 'PORT';
		p_data_dict.constrained_dim = p_data_dict.restspace[2];
	}
	p_data_dict.current_orig = [p_data_dict.restspace[0], p_data_dict.restspace[1]];

	// console.log("B restspace:", restspace);
	// console.log("B current_orig:", current_orig, "current_orient", current_orient, "constrained_dim", constrained_dim);

}

function fillIconFuncDict(p_mapctx, p_ifdict) {

	let itemkeys=[];
	if (p_mapctx.cfgvar["basic"]["slicing"] !== undefined && p_mapctx.cfgvar["basic"]["slicing"]["keys"] !== undefined) {
		for (let k in p_mapctx.cfgvar["basic"]["slicing"]["keys"]) {
			for (let fld in p_mapctx.cfgvar["basic"]["slicing"]["keys"][k]) {
				itemkeys.push(`${k}#${fld}`);
				p_ifdict[`${k}#${fld}`] = p_mapctx.cfgvar["basic"]["slicing"]["keys"][k][fld].iconsrcfunc;
			}
		}
	}

}

// dims can be one generic dimension or a [width, height] pair
async function genImage(p_mapctx, p_ctx, p_icon_func_dict, p_graphicbox_entry, p_datafontsz, p_limw, p_limh, p_ost, p_boxw, p_spacing, p_activekey, opt_dim) {

	function normaliz(p_sz) {
		return Math.min(GlobalConst.CONTROLS_STYLES.SEG_MAXICONSZ, Math.max(p_sz, GlobalConst.CONTROLS_STYLES.SEG_MINICONSZ));
	}
	
	if (p_icon_func_dict[p_activekey] !== undefined) {

		const imgpath = p_icon_func_dict[p_activekey](p_graphicbox_entry[0]);
		const imge = await p_mapctx.imgbuffer.syncFetchImage(imgpath, p_graphicbox_entry[0]);
		if (imge!=null && imge.complete) {

			const r1 = imge.width / imge.height;
			let w, h, dimw, dimh;

			const k = 0.85;

			if (opt_dim != null) {
				dimw = opt_dim;
				dimh = opt_dim;
			} else {
				dimw = p_limw;
				dimh = p_limh;

			}

			if (r1 > 1.5) {
				w = 1.5 * normaliz(dimw);
				h = w / r1;
			} else if (r1 > k) { 
				h = normaliz(dimh);
				w = h * r1;
			} else if (r1 < 0.67) { 
				h = 1.5 * normaliz(dimh);
				w = h * r1;
			} else {
				w = normaliz(dimw);
				h = w / r1;
			}

			if (p_limw < p_limh && w > k * p_limw) {
				w = k * p_limw;
				h = w / r1;
			} else if (p_limh < p_limw && h > k * p_limh) {
				h = k * p_limh;
				w = h * r1;
			}

			p_ctx.drawImage(imge, p_graphicbox_entry[2]+p_ost+p_boxw-w-p_spacing*p_datafontsz, p_graphicbox_entry[3]+p_graphicbox_entry[5]-p_ost-p_spacing*p_datafontsz-h, w, h);
		};							
	}

}

function classHover(p_mapctx, p_box) {
	
	const gfctx = p_mapctx.renderingsmgr.getDrwCtx("transientviz", '2d');
	gfctx.save();
	const slack = GlobalConst.CONTROLS_STYLES.SEG_SEPSELBOXFROMCLASSBOX;
	let realbox;

	const canvas_dims = [];		
	try {
		p_mapctx.renderingsmgr.getCanvasDims(canvas_dims);
		gfctx.clearRect(0, 0, ...canvas_dims); 

		gfctx.strokeStyle = GlobalConst.CONTROLS_STYLES.SEG_ACTIVECOLOR;
		gfctx.lineWidth = slack;

		gfctx.fillStyle = GlobalConst.CONTROLS_STYLES.SEG_SELBCKGRD;

		realbox = [p_box[0]+slack, p_box[1]+slack, p_box[2]-2*slack, p_box[3]-2*slack ]

		gfctx.fillRect(...realbox);
		gfctx.strokeRect(...realbox);

	} catch(e) {
		throw e;
	} finally {
		gfctx.restore();
	}	
}

function cmdHover(p_mapctx, p_box) {
	
	const gfctx = p_mapctx.renderingsmgr.getDrwCtx("transientviz", '2d');
	gfctx.save();

	const canvas_dims = [];		
	try {
		p_mapctx.renderingsmgr.getCanvasDims(canvas_dims);
		gfctx.clearRect(0, 0, ...canvas_dims); 

		gfctx.fillStyle = GlobalConst.CONTROLS_STYLES.SEG_SELBCKGRD;

		gfctx.fillRect(...p_box);

	} catch(e) {
		throw e;
	} finally {
		gfctx.restore();
	}	
}

function clearHover(p_mapctx) {
	
	const gfctx = p_mapctx.renderingsmgr.getDrwCtx("transientviz", '2d');
	const canvas_dims = [];		

	p_mapctx.renderingsmgr.getCanvasDims(canvas_dims);
	gfctx.clearRect(0, 0, ...canvas_dims); 

}

export class SlicingPanel {

	top;
	left;
	width;
	height;
	had_prev_interaction;
	
	canvaslayer = 'data_viz';

	fillStyleBack;
	activeStyleFront;
	navFillStyle;
	inactiveStyleFront;
	is_active;

	interaction_boxes = {};
	active_key;
	itemdict;
	itemkeys;
	activepageidx;
	sorted_pairs_collection;
	classes_data;
	graphbox;
	selected_classes;
	ctrlarea_box;

	constructor() {

		this.fillTextStyle = GlobalConst.CONTROLS_STYLES.SEG_TEXTFILL;  
		this.fillStyleBack = GlobalConst.CONTROLS_STYLES.SEG_BCKGRD; 
		this.activeStyleFront = GlobalConst.CONTROLS_STYLES.SEG_ACTIVECOLOR;
		this.navFillStyle = GlobalConst.CONTROLS_STYLES.SEG_ACTIVECOLOR;
		this.inactiveStyleFront = GlobalConst.CONTROLS_STYLES.SEG_INACTIVECOLOR;
		this.margin_offset = GlobalConst.CONTROLS_STYLES.OFFSET;
		this.normalszPX = GlobalConst.CONTROLS_STYLES.NORMALSZ_PX;
		this.captionszPX = GlobalConst.CONTROLS_STYLES.CAPTIONSZ_PX;

		this.captionfontfamily = GlobalConst.CONTROLS_STYLES.CAPTIONFONTFAMILY;
		this.fontfamily = GlobalConst.CONTROLS_STYLES.FONTFAMILY;
		this.datafontfamily = GlobalConst.CONTROLS_STYLES.SEG_DATAFONTFAMILY;
		this.datacaptionfontsz = GlobalConst.CONTROLS_STYLES.SEG_DATACAPTIONFONTSIZE_PX;
		this.datafontsz = GlobalConst.CONTROLS_STYLES.SEG_DATAFONTSIZE_PX;

		this.is_active = false;
		this.had_prev_interaction = false;

		this.active_key = null;
		this.itemdict = null;
		this.itemkeys = [];
		this.activepageidx = null;
		this.sorted_pairs_collection = [];
		this.iconfuncs = {};
		this.classes_data = null;

		this.graphbox = null;
		this.selected_classes = new Set();
	}

	calcDims(p_mapctx) {

		const dims=[];
		p_mapctx.getCanvasDims(dims);

		const r = dims[0] / dims[1];

		this.width = Math.min(GlobalConst.CONTROLS_STYLES.SEG_WIDTHS[1], Math.max(GlobalConst.CONTROLS_STYLES.SEG_WIDTH_PERC * dims[0], GlobalConst.CONTROLS_STYLES.SEG_WIDTHS[0]));
		// console.log("------- width ---------");
		// console.log("dim width:", dims[0]);
		// console.log("max:", GlobalConst.CONTROLS_STYLES.SEG_WIDTH_PERC * dims[0], GlobalConst.CONTROLS_STYLES.SEG_WIDTHS[0]);
		// console.log("min:", GlobalConst.CONTROLS_STYLES.SEG_WIDTHS[1], Math.max(GlobalConst.CONTROLS_STYLES.SEG_WIDTH_PERC * dims[0], GlobalConst.CONTROLS_STYLES.SEG_WIDTHS[0]));
		// console.log("calc width:", this.width);
		// console.log("-----------------------");
		this.height = this.width / r;

		this.top = Math.round((dims[1] - this.height) / 2.0);
		this.left = Math.round((dims[0] - this.width) / 2.0);

	}

	drawTreemapPagenavItems(p_mapctx) {

		const ctx = p_mapctx.renderingsmgr.getDrwCtx(this.canvaslayer, '2d');

		ctx.save();

		const pagekeys = [];
		for (let k in this.interaction_boxes) {
			if (k.startsWith("slicerpage_")) {
				pagekeys.push(k);
			}
		}
		for (let k of pagekeys) {
			delete this.interaction_boxes[k];
		}

		const ost = 2;
		const size = 16;
		const sep = 6;
		const texthoffset = 1;
		const textvoffset = 4;
		//const rightmost = this.left + this.width - this.margin_offset; 
		const rs = this.graphbox;
		const rightmost = rs[0] + rs[2];

		let origx;
		let origy = rs[1] - size - sep;

		ctx.strokeStyle = this.navFillStyle;
		ctx.lineWidth = 1;

		ctx.font = '10px sans-serif';
		ctx.textAlign = "left";

		if (this.activepageidx > (this.sorted_pairs_collection.length-1)) {
			this.activepageidx = 0;
		}

		for (let tx, ox, i = (this.sorted_pairs_collection.length-1); i>=0; i--) {

			if (this.activepageidx == null) {
				this.activepageidx = 0;
			}
			
			// console.log(i, (1 + (p_sorted_pairs_collection.length-1-i)), (p_sorted_pairs_collection.length-1-i));
			
			origx = rightmost - (1 + (this.sorted_pairs_collection.length-1-i)) * size - (this.sorted_pairs_collection.length-1-i) * sep - ost;

			// console.log(p_rightmost, "==", origx+size);


			this.interaction_boxes[`slicerpage_${(i+1)}`] = [origx, origy, size, size];
			tx = (i+1).toString();
			ox = Math.round(origx+texthoffset+(size/4));

			ctx.clearRect(origx, origy, size, size);
			ctx.fillStyle = this.fillStyleBack;
			ctx.fillRect(origx, origy, size, size);

			if (i==this.activepageidx) {
				ctx.fillStyle = this.navFillStyle;
				ctx.fillRect(origx, origy, size, size);
				ctx.fillStyle = "black";
				ctx.fillText(tx, ox, origy+size-textvoffset);	
			} else {
				ctx.fillStyle = this.navFillStyle;
				ctx.fillText(tx, ox, origy+size-textvoffset);	
			}
			ctx.strokeRect(origx, origy, size, size);

		}

		ctx.restore();

	}

	drawCtrlButtons(p_mapctx, p_ctx) {

		try {
			p_ctx.save();

			const msgskeys = ["SEGMACT","CLEAN", "CANC"];
			const msgs = [];
			const tms = [];

			for (let mk of msgskeys) {
				msgs.push(p_mapctx.i18n.msg(mk, true));
			}

			let w, h, msg, tm, asc = 0, desc = 0, boxindent=null, selbox, cmdisactive;

			p_ctx.font = `${this.normalszPX}px ${this.fontfamily}`;
			for (msg of msgs) {
				tms.push(p_ctx.measureText(msg));
			}

			for (tm of tms) {
				asc = Math.max(asc, tm.actualBoundingBoxAscent);
				desc = Math.max(desc, tm.actualBoundingBoxDescent);
			}

			p_ctx.clearRect(...this.ctrlarea_box); 
			p_ctx.fillStyle = this.fillStyleBack;
			p_ctx.fillRect(...this.ctrlarea_box);

			p_ctx.fillStyle = this.fillTextStyle;
			p_ctx.strokeStyle = this.fillTextStyle;
			p_ctx.lineWidth = 1;

			let slack = GlobalConst.CONTROLS_STYLES.TEXTBOXSLACK;
			const cota = this.ctrlarea_box[1] + 2*this.normalszPX;

			let msgidx = msgskeys.length - 1;
			cmdisactive = false;
			while (msgs.length > 0) {

				msg = msgs.pop();
				tm = tms.pop();

				w = tm.width+2*slack;
				h = 2*slack + asc + desc;

				if (boxindent) {
					boxindent = boxindent - w - this.margin_offset;
				} else {
					boxindent = this.ctrlarea_box[0] + this.ctrlarea_box[2] - w;
				}

				cmdisactive = ["CLEAN", "SEGMACT"].indexOf(msgskeys[msgidx]) < 0 || this.selected_classes.size > 0;

				if (!cmdisactive) {
					p_ctx.save();
					p_ctx.fillStyle = GlobalConst.CONTROLS_STYLES.SEG_INACTIVECOLOR;
				}
				p_ctx.fillText(msg, boxindent+slack, cota);
				if (!cmdisactive) {
					p_ctx.restore();
				}

				selbox = [boxindent, cota - slack - asc, w, h];
				p_ctx.strokeRect(...selbox);
					
				if (cmdisactive) {
					this.interaction_boxes[`cmd_${msgskeys[msgidx]}`] = selbox;
				}

				msgidx--;
			}
				
		} catch(e) {
			throw e;
		} finally {
			p_ctx.restore();
		}		
	
	}	

	genTreeMaps(p_mapctx, p_total_count, p_sorted_pairs, p_minarea, b_showvalue) {

		const iconFuncDict = {};
		fillIconFuncDict(p_mapctx, iconFuncDict);

		this.total_count = p_total_count;

		const rs = this.graphbox;
		let area_factor;

		this.sorted_pairs_collection.length = 0;

		let remaining_sorted_pairs = [...p_sorted_pairs];
		let area, sumcount, current_sorted_pairs = [], j, prev_spairs_count=0, current_total_count=0;
		let i = 0, k = 10;

		while (remaining_sorted_pairs.length > 0 && i < 10) {

			if (i==0) {
				current_total_count = this.total_count;
			} else {
				current_total_count = 0;
				for (let sp of remaining_sorted_pairs) {
					current_total_count += sp[1];
				}
			}

			i++;

			// console.log("remaining_sorted_pairs len:", remaining_sorted_pairs.length);

			area_factor = rs[2] * rs[3] / current_total_count;
			// console.log("area_factor ini:", area_factor);
	
			k = 10;
			while (k > 0) {

				k--;
			
				current_sorted_pairs.length = 0;
				sumcount = 0;
				j = 0;
				while (remaining_sorted_pairs[j] !== undefined) {
					area = remaining_sorted_pairs[j][1] * area_factor;
					//console.log(remaining_sorted_pairs[j], "area:", area, ">=", p_minarea);
					if (area >= p_minarea) {
						sumcount += remaining_sorted_pairs[j][1];
						current_sorted_pairs.push(remaining_sorted_pairs[j]);
					} else {
						break;
					}
					j++;
				}

				area_factor = rs[2] * rs[3] / sumcount;
				// console.log("k:", k, "prevcnt:", prev_spairs_count, "current_sorted_pairs:", current_sorted_pairs, "novo area_factor:", area_factor);

				if (prev_spairs_count >= current_sorted_pairs.length) {
					break;
				}
				prev_spairs_count = current_sorted_pairs.length;

			};


			remaining_sorted_pairs.splice(0, current_sorted_pairs.length);

			let cnt = 0;
			for (let sp of current_sorted_pairs) {
				cnt += sp[1];
			}
			if (current_sorted_pairs.length > 0) {
				this.sorted_pairs_collection.push({
					"sp": [...current_sorted_pairs],
					"cnt": cnt
				});
			}
		}

		this.selected_classes.clear();

		this.drawTreemapPagenavItems(p_mapctx);

		let spobj = this.sorted_pairs_collection[this.activepageidx];
		if (spobj) {
			this.fillTreemap(p_mapctx, iconFuncDict, spobj.cnt, spobj.sp, b_showvalue);
		}

	}

	async fillTreemap(p_mapctx, p_icon_func_dict, p_grp_total_count, p_sorted_pairs, b_showvalue) {

		const dataDict = {};

		console.assert(this.graphbox != null, "fillTreemap, graphbox is null");

		dataDict.restspace = [...this.graphbox];
		dataDict.area_factor = (dataDict.restspace[2] * dataDict.restspace[3]) / p_grp_total_count;
		dataDict.response=[];

		const sorted_pairs = [...p_sorted_pairs];
		let filtered_total_count = p_grp_total_count;
		dataDict.area_factor = (dataDict.restspace[2] * dataDict.restspace[3]) / filtered_total_count;

		//let sorted_pairs = [...p_sorted_pairs];
		dataDict.current_orient = null;

		dataDict.constrained_dim = 0;
		if (dataDict.restspace[2] > dataDict.restspace[3]) {
			dataDict.current_orient = 'LAND';
			dataDict.constrained_dim = dataDict.restspace[3];
		} else {
			dataDict.current_orient = 'PORT';
			dataDict.constrained_dim = dataDict.restspace[2];
		}
		dataDict.current_orig = [dataDict.restspace[0], dataDict.restspace[1]];

		const local_accum_queue = [];
		let accum_count=0, local_flex_dim = 0, local_outer_flex_dim= 0;
		let prev_r=9999, r1;

		dataDict.accum_queue = [];

		let ctrlcnt = 2000, accum_area = 0, area=0, dump_count=0;
		while (sorted_pairs.length > 0 && ctrlcnt > 0) {
			
			ctrlcnt--;
			const [ varvalue, count ] = sorted_pairs[0];
			local_accum_queue.push([varvalue, count]);
			accum_count += count;
			area = count * dataDict.area_factor;
			
			if (local_accum_queue.length == 1) {
				local_flex_dim = area / dataDict.constrained_dim;
				local_outer_flex_dim = dataDict.constrained_dim;
			} else {
				accum_area = accum_count * dataDict.area_factor;
				local_outer_flex_dim = accum_area / dataDict.constrained_dim;
				local_flex_dim = area / local_outer_flex_dim;
			}
			
			r1 = aspect(local_flex_dim, local_outer_flex_dim);
			
			if (r1 > prev_r) {
				accum_count = 0;
				local_accum_queue.length = 0;
				prev_r = 9999;
				dump_count++;
				fillTreemapGraph_dumpResult(dataDict, dump_count);
			} else {
				dataDict.accum_queue.push([varvalue, count]);
				dataDict.flex_dim = local_flex_dim;
				dataDict.outer_flex_dim = local_outer_flex_dim;
				sorted_pairs.shift();
				prev_r = r1;
			}
		
		}

		if (dataDict.accum_queue.length > 0) {
			accum_count = 0;
			dump_count++;
			fillTreemapGraph_dumpResult(dataDict, dump_count);
		}

		// console.log(response);

		const ctx = p_mapctx.renderingsmgr.getDrwCtx(this.canvaslayer, '2d');

		const ost = GlobalConst.CONTROLS_STYLES.SEG_SEPFROMCLASSBOUNDARY;
		let color, boxw, boxh, tm0=null, tm1, tm2, tm3, tm4, perc, proptxt, origx, top, limh, limw, largeh=false, allowed_lines, lbl;
		let spacing, mxw1, mxw2, cota, dim, strk_offset, firsttextline_printed = false;

		if (dataDict.response.length > 0) {
			ctx.clearRect(...this.graphbox);
			ctx.fillStyle = this.fillStyleBack;
			ctx.fillRect(...this.graphbox);
		}

		const classboxkeys = [];
		for (let k in this.interaction_boxes) {
			if (k.startsWith("classbox_")) {
				classboxkeys.push(k);
			}
		}
		for (let k of classboxkeys) {
			delete this.interaction_boxes[k];
		}		

		// for each graphic element detail ...
		for (let gr of dataDict.response) {

			// generate adequate color from chosen color ramp (only 'rainbow' for now)
			// TODO - allow config of other color ramps, when available
			color = genRainbowColor(2.2*dump_count, gr[6]+1);
			boxw = gr[4]-2*ost;
			boxh = gr[5]-2*ost;

			origx = gr[2]+ost;

			const captionfont = `${this.datacaptionfontsz}px ${this.captionfontfamily}`;
			const normalfont = `${this.datafontsz}px ${this.datafontfamily}`;

			ctx.save();

			// filtered_total_count

			ctx.globalAlpha = 0.2;
			top = gr[3]+ost;

			ctx.fillStyle = color;	
			ctx.fillRect(gr[2]+ost, top, boxw, boxh);
	
			ctx.globalAlpha = 1.0;

			if (this.selected_classes.has(gr[0])) {
				strk_offset = 3;
				ctx.lineWidth =	6;			
				ctx.strokeStyle = "rgba(255, 246, 246, 0.86)";	
			} else {
				strk_offset = 0;
				ctx.strokeStyle = color;	
			}
			ctx.strokeRect(gr[2]+ost+strk_offset, top+strk_offset, boxw-2*strk_offset, boxh-2*strk_offset);
			ctx.lineWidth = 1;

			this.interaction_boxes[`classbox_${(gr[0])}`] = [origx, top, boxw, boxh];

			ctx.restore();

			ctx.save();
			ctx.fillStyle = this.fillTextStyle;	
			ctx.textAlign = "left";
			ctx.font = normalfont;

			const tol = 0.7;

			limh = Math.floor(boxh-tol*1.5*this.datafontsz);
			limw = Math.floor(boxw-tol*2*this.datafontsz);

			largeh = (boxh / this.datafontsz) > 5.0;
			const pwr = Math.pow(10,GlobalConst.CONTROLS_STYLES.SEG_PERCDECPLACES);
			const lowest = Math.pow(10, -GlobalConst.CONTROLS_STYLES.SEG_PERCDECPLACES);
			perc = (Math.round((gr[1]/this.total_count) * 100 * pwr) / pwr).toFixed(GlobalConst.CONTROLS_STYLES.SEG_PERCDECPLACES);
			if (perc >= lowest) {
				proptxt = `${gr[1]} (${perc}%)`;
			} else {
				proptxt = `${gr[1]} (<${lowest}%)`;
			}

			// class value
			if (b_showvalue) {
				if (largeh) {
					ctx.font = captionfont;
				}
				tm0 = ctx.measureText(gr[0]);
				if (largeh) {
					ctx.font = normalfont;
				}
			}

			// class count 
			tm1 = ctx.measureText(gr[1]);

			// class count percentage
			if (perc >= lowest) {
				tm2 = ctx.measureText(`${perc}%`);
			} else {
				tm2 = ctx.measureText(`< ${lowest}%`);
			}

			// count and percentage, same line
			tm3 = ctx.measureText(proptxt);

			mxw1 = Math.max((tm0!=null ? tm0.width : 0), tm1.width, tm2.width);
			mxw2 = tm3.width;

			dim = boxw / GlobalConst.CONTROLS_STYLES.SEG_BOX2ICON_RATIO;
			// dim = Math.min(GlobalConst.CONTROLS_STYLES.SEG_MAXICONSZ, Math.max(dim, GlobalConst.CONTROLS_STYLES.SEG_MINICONSZ));
			spacing = boxw / 150.0;
			spacing = Math.min(GlobalConst.CONTROLS_STYLES.SEG_MAXICONSEP, Math.max(spacing, GlobalConst.CONTROLS_STYLES.SEG_MINICONSEP))

			// if available vertical space may contain at least 4 line sof text ...
			if (3*this.datafontsz + this.datacaptionfontsz < limh) {
							
				if (mxw1 < limw) {

					// Normal horizontal label

					firsttextline_printed = false;	

					// if this is a smallbox, lets reduce spacing between icon and boundary
					if (Math.min(limh, limw) < GlobalConst.CONTROLS_STYLES.SEG_SMALLBOXLIMIT_PX) {
						spacing = 0.5;
					}

					await genImage(p_mapctx, ctx, p_icon_func_dict, gr, this.datafontsz, limw, limh, ost, boxw, spacing, this.active_key, dim);

					// if class value is to be shown ...
					if (b_showvalue) {

						if (largeh) {
							ctx.save();
							ctx.font = captionfont;
							cota = gr[3]+this.datafontsz+this.datacaptionfontsz;
						} else {
							cota = gr[3]+2*this.datafontsz;
						}
		
						ctx.fillText(gr[0], gr[2]+this.datafontsz, cota);			
						firsttextline_printed = true;	

						if (largeh) {
							ctx.restore();
							cota += this.datacaptionfontsz; 
						} else {
							cota += this.datafontsz; 
						}	

					}

					// if class label exists ...
					if (this.classes_data != null && this.classes_data[gr[0]] !== undefined && this.classes_data[gr[0]]["lbl"] !== undefined && this.classes_data[gr[0]].lbl !== null) {
						
						lbl = I18n.capitalize(this.classes_data[gr[0]].lbl);
						tm4 = ctx.measureText(lbl);
						if (tm4.width < limw) {

							if (!b_showvalue) {
								if (largeh) {
									ctx.save();
									ctx.font = captionfont;
									cota = gr[3]+this.datafontsz+this.datacaptionfontsz;
								} else {
									cota = gr[3]+2*this.datafontsz;
								}
							}
				
							ctx.fillText(lbl, gr[2]+this.datafontsz, cota);
							firsttextline_printed = true;	

							if (!b_showvalue) {
								if (largeh) {
									ctx.restore();
									cota += this.datacaptionfontsz; 
								} else {
									cota += this.datafontsz; 
								}		
							} else {
								cota += this.datafontsz; 
							}

						} else {

							if (!b_showvalue) {
								cota = gr[3]+2*this.datafontsz;
							}

							// available graphic text lines allowing to print label lines
							allowed_lines = Math.round((limh-cota+top) / this.datafontsz);
							allowed_lines = allowed_lines - 2; // discount class value and percentage lines

							if (allowed_lines > 0) {
								const lines = canvas_text_wrap(lbl, ctx, limw);
								for (let line, li=0; li<lines.length; li++) {
									line = lines[li];
									if (allowed_lines < lines.length && li == allowed_lines-1) {
										line = line.substring(0,line.length-3) + '...';
									}
									ctx.fillText(line, gr[2]+this.datafontsz, cota);
									cota += this.datafontsz; 
									if (li == allowed_lines-1) {
										break;
									}
								}
								firsttextline_printed = true;	
							}

						}
					}

					// if first text line wasn't yet printed, lets set y value
					if (!firsttextline_printed) {
						cota = gr[3]+2*this.datafontsz;
					}

					ctx.fillText(gr[1], gr[2]+this.datafontsz, cota);
					cota += this.datafontsz; 
					if (perc >= lowest) {
						ctx.fillText(`${perc}%`, gr[2]+this.datafontsz, cota);	
					} else {
						ctx.fillText(`< ${lowest}%`, gr[2]+this.datafontsz, cota);	
					}

				} else {

					// Vertical label

					await genImage(p_mapctx, ctx, p_icon_func_dict, gr, this.datafontsz, limw/GlobalConst.CONTROLS_STYLES.SEG_BOX2ICON_RATIO, limh/GlobalConst.CONTROLS_STYLES.SEG_BOX2ICON_RATIO, ost, boxw, 0.5, this.active_key);

					ctx.save();
					ctx.translate(gr[2]+this.datafontsz, gr[3]+this.datafontsz);
					ctx.rotate(-Math.PI/2);
					ctx.textAlign = "right";
					ctx.fillText(gr[0], 0, this.datafontsz);
					if (3*this.datafontsz < limh) {
						if (mxw2 < limh) {
							ctx.fillText(proptxt, 0, 2*this.datafontsz);
						} else {
							ctx.fillText(gr[0], 0, 2*this.datafontsz);
						}
					}
					ctx.restore();				

				}

			} else {

				// Horizontal but height-constrained label

				cota = gr[3]+2*this.datafontsz;
				if (b_showvalue) {
					ctx.fillText(gr[0], gr[2]+this.datafontsz, cota);
					cota += this.datafontsz;
				}

				if (3*this.datafontsz < limh) {
					if (4*this.datafontsz < limh) {
						ctx.fillText(gr[1], gr[2]+this.datafontsz, cota);
						cota += this.datafontsz;
						if (perc >= lowest) {
							ctx.fillText(`${perc}%`, gr[2]+this.datafontsz, cota);
						} else {
							ctx.fillText(`${lowest}%`, gr[2]+this.datafontsz, cota);
						}	
					} else { 
						ctx.fillText(proptxt, gr[2]+this.datafontsz, cota);
					}					
				}

				dim = limh/GlobalConst.CONTROLS_STYLES.SEG_BOX2ICON_RATIO;

				await genImage(p_mapctx, ctx, p_icon_func_dict, gr, this.datafontsz, limw, limh, ost, boxw, 0.5, this.active_key, dim);

			}

			ctx.restore();
		}


		this.drawCtrlButtons(p_mapctx, ctx);

	}

	// p_data_dict.response.push([varvalue, count, orig[0], orig[1], p_data_dict.outer_flex_dim, flex_dim, p_dump_count]);

	fetchChartData(p_mapctx, p_minarea, b_showvalue) {

		if (!this.active_key) {
			return;
		}

		const url = p_mapctx.cfgvar["basic"]["slicing"]["url"];
		const splits = this.active_key.split("#");
		const that  = this;

		fetch(url + "/astats", {
			method: "POST",
			body: JSON.stringify({"key":splits[0],"options":{}})
		})
		.then(response => response.json())
		.then(
			function(responsejson) {
				//console.log(responsejson);

				const fields = Object.keys(responsejson);
				console.assert(fields.indexOf(splits[1]) >= 0, "field not found in slicing data, key '%s', field '%s'", splits[0], splits[1]) 

				const dict = responsejson[splits[1]];

				// Create items array
				const varvalues = Object.keys(dict['classes']);
				const items = varvalues.map(function(key) {
					return [key, dict['classes'][key].cnt];
				});

				
				// Sort the array based on the second element
				items.sort(function(first, second) {
					let ret;
					if (second[1] == first[1]) {
						// force second[0] to string
						ret = ('' + first[0]).localeCompare(second[0]);
					} else {
						ret = second[1] - first[1];
					}
					return ret;
				});



				that.classes_data = dict['classes'];

				that.genTreeMaps(p_mapctx, dict['sumofclasscounts'], items, p_minarea, b_showvalue);
				
				// Create a new array with only the first 5 items
				// console.log("Sort:", items.slice(0, 5));
			}
		).catch((error) => {
			console.error(`Impossible to fetch stats on '${splits[0]}'`, error);
		});	

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

		let cota  = this.top+this.margin_offset+this.captionszPX;
		let indent = this.left+2*this.margin_offset;
		ctx.font = `${this.captionszPX}px ${this.captionfontfamily}`;
		ctx.fillText(msg, indent, cota);
		
		let slicekeystxt = "(error: slicing empty or not properly configured in risco_basic_config.js)";
		this.itemkeys.length = 0;
		this.itemdict = {};
		if (p_mapctx.cfgvar["basic"]["slicing"] !== undefined && p_mapctx.cfgvar["basic"]["slicing"]["keys"] !== undefined) {
			for (let k in p_mapctx.cfgvar["basic"]["slicing"]["keys"]) {
				for (let fld in p_mapctx.cfgvar["basic"]["slicing"]["keys"][k]) {
					this.itemkeys.push(`${k}#${fld}`);
					this.itemdict[`${k}#${fld}`] = p_mapctx.cfgvar["basic"]["slicing"]["keys"][k][fld];
				}
			}
			if (this.itemkeys.length > 0) {
				slicekeystxt = p_mapctx.i18n.msg('SEGMBY', true) + ":";
			}
		}

		cota += 2 * this.normalszPX;
		ctx.font = `${this.normalszPX}px ${this.fontfamily}`;
		ctx.fillText(slicekeystxt, this.left+2*this.margin_offset, cota);

		let lbl, w, h, slack = GlobalConst.CONTROLS_STYLES.TEXTBOXSLACK, selwigetsymb_dim = GlobalConst.CONTROLS_STYLES.DROPDOWNARROWSZ;

		if (this.active_key == null && this.itemkeys.length > 0) {
			this.active_key = this.itemkeys[0]; 
		}

		if (this.active_key) {

			let txtdims = ctx.measureText(slicekeystxt);
			const lang = (new I18n(p_mapctx.cfgvar["basic"]["msgs"])).getLang();

			if (Object.keys(p_mapctx.cfgvar["basic"]["msgs"][lang]).indexOf(this.itemdict[this.active_key].label) >= 0) {
				lbl = p_mapctx.cfgvar["basic"]["msgs"][lang][this.itemdict[this.active_key].label];
			} else {
				lbl = this.itemdict[this.active_key].label;
			}	
			indent = indent+txtdims.width+2*this.margin_offset;
			ctx.fillText(lbl, indent, cota);

			txtdims = ctx.measureText(lbl);

			if (this.itemkeys.length > 1) {
				w = txtdims.width+3*slack + selwigetsymb_dim;
			} else {
				w = txtdims.width+2*slack;
			}

			h = 2*slack + txtdims.actualBoundingBoxAscent + txtdims.actualBoundingBoxDescent;
			const selbox = [indent - txtdims.actualBoundingBoxLeft - slack, cota - slack - txtdims.actualBoundingBoxAscent, w, h];

			if (this.itemkeys.length > 1) {

				// draw dropdown arrow
				let x = indent + txtdims.width + slack;
				let y = cota-2;
				ctx.beginPath();
				ctx.lineJoin = "round";
				ctx.moveTo(x, y-selwigetsymb_dim);
				ctx.lineTo(x+(selwigetsymb_dim/2.0), y);
				ctx.lineTo(x+selwigetsymb_dim, y-selwigetsymb_dim);
				ctx.closePath();
				ctx.fill();

				this.interaction_boxes["segmattr"] = [...selbox]; 
			}

			const ctrlbox_height = 3*this.normalszPX;
			indent = this.left+2*this.margin_offset;
			cota += 3 * this.normalszPX - this.margin_offset;
			this.graphbox = [indent, cota, this.width-4*this.margin_offset, this.height+this.top-cota - 2*this.margin_offset - ctrlbox_height]; 
			this.ctrlarea_box = [indent, Math.round(this.height+this.top - 2*this.margin_offset -ctrlbox_height), this.width-4*this.margin_offset, ctrlbox_height];

			ctx.strokeRect(...selbox);	

			// draw graphbox for debugging purposes
			// ctx.strokeStyle = "purple"
			// ctx.strokeRect(...graphbox);	
			
			ctx.restore(); // fetchChartData and children funcs have their own autonomous invocations of graphic context

			let showvalue = false;
			if (this.itemdict[this.active_key]['showvalue'] !== undefined) {
				showvalue = this.itemdict[this.active_key]['showvalue'];
			}

			this.fetchChartData(p_mapctx, this.itemdict[this.active_key].minarea, showvalue);
		
		} else {

			ctx.restore();

		}

	}

	clear(p_mapctx) {
		// data_viz layer intended for 'singletons',lets clear the whole lot
		const dims=[];

		const ctx = p_mapctx.renderingsmgr.getDrwCtx(this.canvaslayer, '2d');
		p_mapctx.getCanvasDims(dims);
		ctx.clearRect(0, 0, ...dims); 
	}

	setState(p_mapctx, p_activeflag) {

		const ci = p_mapctx.getCustomizationObject();
		if (ci == null) {
			throw new Error("Slicing, map context customization instance is missing")
		}
		const toc = ci.instances["toc"];

		this.is_active = p_activeflag;
		if (this.is_active) {
			this.print(p_mapctx);

			// collapse TOC
			if (toc) {
				toc.collapse(p_mapctx);
			}

		} else {

			// collapse TOC
			if (toc) {
				toc.inflate(p_mapctx);
			}
			this.clear(p_mapctx);
		}
	}

	interact(p_mapctx, p_evt) {

		let topcnv, ret = false, interact_box_key = null;

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

			for (let k in this.interaction_boxes) {

				if (p_evt.clientX >= this.interaction_boxes[k][0] && 
					p_evt.clientX <= this.interaction_boxes[k][0]+this.interaction_boxes[k][2] && 
					p_evt.clientY >= this.interaction_boxes[k][1] && 
					p_evt.clientY <= this.interaction_boxes[k][1]+this.interaction_boxes[k][3]) {
						interact_box_key = k;
						break;
				}
			}

			switch(p_evt.type) {

				case "touchend":
				case "mouseup":

					if (interact_box_key) {

						if (interact_box_key == "segmattr") {

							let lbl, constraintitems=null, that = this;
							const seldict = {};
							const lang = (new I18n(p_mapctx.cfgvar["basic"]["msgs"])).getLang();
	
							for (let k of this.itemkeys) {
								if (Object.keys(p_mapctx.cfgvar["basic"]["msgs"][lang]).indexOf(this.itemdict[k].label) >= 0) {
									lbl = p_mapctx.cfgvar["basic"]["msgs"][lang][this.itemdict[k].label];
								} else {
									lbl = this.itemdict[k].label;
								}	
								seldict[k] = lbl;	
							}
	
							if (this.active_item) {
								constraintitems = {'selected': `${this.active_item[0]}#${this.active_item[1]}` };
							}
							p_mapctx.getCustomizationObject().messaging_ctrlr.selectInputMessage(
								p_mapctx.i18n.msg('SELSEGMBY', true), 
								seldict,
								(evt, p_result, p_value) => { 
									if (p_value) {
										that.active_key = p_value;
										that.print(p_mapctx);
									}
								},
								constraintitems
							);

						} else if (interact_box_key.startsWith("slicerpage_")) {

							let page = parseInt(interact_box_key.replace("slicerpage_", ""));

							// console.log(page, this.activepageidx, this.sorted_pairs_collection.length);

							if (page-1 != this.activepageidx) {

								console.assert((page-1) >= 0 && page <= this.sorted_pairs_collection.length, `invalid page ${page-1}, should be in interval [0, ${this.sorted_pairs_collection.length}[`)

								this.activepageidx = page-1;

								const spobj = this.sorted_pairs_collection[this.activepageidx];
								const iconFuncDict = {};
								fillIconFuncDict(p_mapctx, iconFuncDict);

								let showvalue = false;
								if (this.itemdict[this.active_key]['showvalue'] !== undefined) {
									showvalue = this.itemdict[this.active_key]['showvalue'];
								}
					
								this.drawTreemapPagenavItems(p_mapctx)								
								this.fillTreemap(p_mapctx, iconFuncDict, spobj.cnt, spobj.sp, showvalue);
							}

						} else if (interact_box_key.startsWith("classbox_")) {

							let classvalue = interact_box_key.replace("classbox_", "");

							if (this.selected_classes.has(classvalue)) {
								this.selected_classes.delete(classvalue);
							} else {
								this.selected_classes.add(classvalue);
							}

							const spobj = this.sorted_pairs_collection[this.activepageidx];
							const iconFuncDict = {};
							fillIconFuncDict(p_mapctx, iconFuncDict);

							let showvalue = false;
							if (this.itemdict[this.active_key]['showvalue'] !== undefined) {
								showvalue = this.itemdict[this.active_key]['showvalue'];
							}

							this.fillTreemap(p_mapctx, iconFuncDict, spobj.cnt, spobj.sp, showvalue);

						} else if (interact_box_key.startsWith("cmd_")) {

							let cmdvalue = interact_box_key.replace("cmd_", "");

							let refill = false;
							switch (cmdvalue) {

								case "SEGMACT":
									// segmentar
									break;

								case "CLEAN":
									this.selected_classes.clear();
									refill = true;
									break;
										
								case "CANC":
									const ci = p_mapctx.getCustomizationObject();
									if (ci == null) {
										throw new Error("Slicing, interaction, map context customization instance is missing")
									}
									const analysispanel = ci.instances["analysis"];
									if (analysispanel) {
										analysispanel.deactivateSegmentation(p_mapctx);
									}
									this.setState(p_mapctx, false);								
	
									break;
	
							}

							if (refill) {
								const spobj = this.sorted_pairs_collection[this.activepageidx];
								const iconFuncDict = {};
								fillIconFuncDict(p_mapctx, iconFuncDict);

								let showvalue = false;
								if (this.itemdict[this.active_key]['showvalue'] !== undefined) {
									showvalue = this.itemdict[this.active_key]['showvalue'];
								}

								this.fillTreemap(p_mapctx, iconFuncDict, spobj.cnt, spobj.sp, showvalue);
							}

						}
						

					}

					break;

				case "mousemove":

					topcnv = p_mapctx.renderingsmgr.getTopCanvas();
					if (interact_box_key) {
						topcnv.style.cursor = "pointer";
						if (interact_box_key.startsWith("classbox_")) {
							//let classvalue = interact_box_key.replace("classbox_", "");
							classHover(p_mapctx, this.interaction_boxes[interact_box_key]);
						}
						if (interact_box_key.startsWith("cmd_")) {
							//let classvalue = interact_box_key.replace("classbox_", "");
							cmdHover(p_mapctx, this.interaction_boxes[interact_box_key]);
						}
						
					} else {
						topcnv.style.cursor = "default";
						clearHover(p_mapctx);
					}
					break;

			}
	
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