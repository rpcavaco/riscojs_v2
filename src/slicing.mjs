
import {GlobalConst} from './constants.js';
import {I18n} from './i18n.mjs';

function fillTreemapGraph_dumpResult(p_data_dict, p_dump_count) {
			
	if (p_data_dict.accum_queue.length == 1) {
			
		const [ varvalue, count ] = p_data_dict.accum_queue.shift();
		
		if (p_data_dict.current_orient == 'LAND') {
			p_data_dict.response.push([varvalue, p_data_dict.current_orig[0], p_data_dict.current_orig[1], p_data_dict.flex_dim, p_data_dict.outer_flex_dim, p_dump_count]);
			p_data_dict.current_orig[0] = p_data_dict.current_orig[0]+p_data_dict.flex_dim;
			p_data_dict.restspace = [p_data_dict.current_orig[0], p_data_dict.current_orig[1], p_data_dict.restspace[2]-p_data_dict.flex_dim, p_data_dict.outer_flex_dim];
		} else {
			p_data_dict.response.push([varvalue, p_data_dict.current_orig[0], p_data_dict.current_orig[1], p_data_dict.outer_flex_dim, p_data_dict.flex_dim, p_dump_count]);
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
				p_data_dict.response.push([varvalue, orig[0], orig[1], p_data_dict.outer_flex_dim, flex_dim, p_dump_count]);
				orig[1] = orig[1] + flex_dim;
			} else {
				p_data_dict.response.push([varvalue, orig[0], orig[1], flex_dim, p_data_dict.outer_flex_dim, p_dump_count]);
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


export class SlicingPanel {

	top;
	left;
	width;
	height;
	had_prev_interaction;
	
	canvaslayer = 'data_viz';

	fillStyleBack;
	activeStyleFront;
	inactiveStyleFront;
	is_active;

	interaction_boxes = {};
	active_key;

	constructor() {

		this.fillTextStyle = GlobalConst.CONTROLS_STYLES.SEG_TEXTFILL;  
		this.fillStyleBack = GlobalConst.CONTROLS_STYLES.SEG_BCKGRD; 
		this.activeStyleFront = GlobalConst.CONTROLS_STYLES.SEG_ACTIVECOLOR;
		this.inactiveStyleFront = GlobalConst.CONTROLS_STYLES.SEG_INACTIVECOLOR;
		this.margin_offset = GlobalConst.CONTROLS_STYLES.OFFSET;
		this.normalszPX = GlobalConst.CONTROLS_STYLES.NORMALSZ_PX;
		this.captionszPX = GlobalConst.CONTROLS_STYLES.CAPTIONSZ_PX;

		this.captionfontfamily = GlobalConst.CONTROLS_STYLES.CAPTIONFONTFAMILY;
		this.fontfamily = GlobalConst.CONTROLS_STYLES.FONTFAMILY;

		this.is_active = false;
		this.had_prev_interaction = false;

		this.active_key = null;
	}

	calcDims(p_mapctx) {

		const dims=[];
		p_mapctx.getCanvasDims(dims);

		const r = dims[0] / dims[1];

		this.width = Math.min(GlobalConst.CONTROLS_STYLES.SEG_WIDTHS[1], Math.max(GlobalConst.CONTROLS_STYLES.SEG_WIDTH_PERC * dims[0], GlobalConst.CONTROLS_STYLES.SEG_WIDTHS[0]));
		this.left = dims[0] -  this.width;

		this.height = this.width / r;

		this.top = Math.round((dims[1] - this.height) / 2.0);
		this.left = Math.round((dims[0] - this.width) / 2.0);

	}

	fillTreemapGraph(p_ctx, p_total_count, p_sorted_pairs) {

		function aspect(p_dim1, p_dim2) {
			return Math.max(p_dim1, p_dim2) / Math.min(p_dim1, p_dim2);
		}

		const k = 1.01;
		const minarea = 3000;

		let dataDict = {};

		dataDict.restspace = [...this.interaction_boxes["graphbox"]];

		dataDict.area_factor = (dataDict.restspace[2] * dataDict.restspace[3]) / p_total_count;
		dataDict.response=[];

		console.log("area_factor 1", dataDict.area_factor, p_total_count);

		const mincount = minarea / dataDict.area_factor;
		console.log("mincount", mincount);

		console.log("pre pairs:", p_sorted_pairs.length);

		const sorted_pairs = p_sorted_pairs.filter((p_pair) => {
			return p_pair[1] >=  mincount;
		});

		console.log("post pairs:", sorted_pairs.length);

		let filtered_total_count = 0;
		for (let sp of sorted_pairs) {
			filtered_total_count += sp[1];
		}
		dataDict.area_factor = (dataDict.restspace[2] * dataDict.restspace[3]) / filtered_total_count;

		console.log("area_factor 2", dataDict.area_factor, filtered_total_count);

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

		 console.log("A restspace:", dataDict.restspace);
		 console.log("A current_orig:", dataDict.current_orig, "current_orient", dataDict.current_orient, "constrained_dim", dataDict.constrained_dim);

		let prev_r=9999, r1, reference_r = aspect(dataDict.restspace[2], dataDict.restspace[3]);

		const local_accum_queue = [];
		let accum_count=0, local_flex_dim = 0, local_outer_flex_dim= 0;

		dataDict.accum_queue = [];

		let ctrlcnt = 2000, accum_area = 0, area=0, dump_count=0;
		while (sorted_pairs.length > 0 && ctrlcnt > 0) {
			
			ctrlcnt--;
			const [ varvalue, count ] = sorted_pairs[0];
			local_accum_queue.push([varvalue, count]);
			//dataDict.accum_queue.push([varvalue, count])
			accum_count += count;
			area = count * dataDict.area_factor;
			
			if (local_accum_queue.length == 1) {
				local_flex_dim = area / dataDict.constrained_dim;
				// dataDict.flex_dim = area / dataDict.constrained_dim;
				local_outer_flex_dim = dataDict.constrained_dim;
				// dataDict.outer_flex_dim = dataDict.constrained_dim;
			} else {
				accum_area = accum_count * dataDict.area_factor;
				local_outer_flex_dim = accum_area / dataDict.constrained_dim;
				// dataDict.outer_flex_dim = accum_area / dataDict.constrained_dim;
				local_flex_dim = area / local_outer_flex_dim;
				// dataDict.flex_dim = area / dataDict.outer_flex_dim;
			}
			
			console.log("dims:", local_flex_dim, local_outer_flex_dim);
			r1 = aspect(local_flex_dim, local_outer_flex_dim);
			
			console.log(varvalue, "r1:", r1, "prev r:",prev_r,'<', "ref_r", k * reference_r);
			console.log("       > acclen:", local_accum_queue.length, "flexdim:", local_flex_dim, "outer:", local_outer_flex_dim);
			// if (r1 <= k * reference_r) {
			if (r1 > prev_r) {
				//dataDict.accum_count = prev_accum_count;
				//dataDict.accum_queue.pop();
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

		p_ctx.strokeStyle = "grey";
		p_ctx.fillStyle = "white";
		const ost = 2;

		for (let gr of dataDict.response) {

			let color;
			switch(gr[5]) {

				case 1:
					color = "white";
					break;

				case 2:
					color = "red";
					break;


				case 3:
					color = "green";
					break;

				
				case 4:
					color = "orange";
					break;

							
				case 5:
					color = "darkcyan";
					break;

					
				case 6:
					color = "yellow";
					break;

					
				case 7:
					color = "lightsalmon";
					break;
					
				case 8:
					color = "mediumseagreen";
					break;
					
				case 9:
					color = "tomato";
					break;
		
			}
			p_ctx.fillStyle = color;
			p_ctx.strokeRect(gr[1]+ost, gr[2]+ost, gr[3]-2*ost, gr[4]-2*ost);
			p_ctx.fillText(gr[0], gr[1]+10, gr[2]+20)
		}


	}

	fetchGraphdata(p_mapctx, p_ctx) {

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

				console.log(dict);

				// Create items array
				const varvalues = Object.keys(dict['classcounts']);
				const items = varvalues.map(function(key) {
					return [key, dict['classcounts'][key]];
				});
				
				// Sort the array based on the second element
				items.sort(function(first, second) {
					return second[1] - first[1];
				});

				that.fillTreemapGraph(p_ctx, dict['sumofclasscounts'], items);
				
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
		
		let itemkeys=[], itemdict={}, slicekeystxt = "(error: slicing empty or not properly configured in risco_basic_config.js)";
		if (p_mapctx.cfgvar["basic"]["slicing"] !== undefined && p_mapctx.cfgvar["basic"]["slicing"]["keys"] !== undefined) {
			for (let k in p_mapctx.cfgvar["basic"]["slicing"]["keys"]) {
				for (let fld in p_mapctx.cfgvar["basic"]["slicing"]["keys"][k]) {
					itemkeys.push(`${k}#${fld}`);
					itemdict[`${k}#${fld}`] = p_mapctx.cfgvar["basic"]["slicing"]["keys"][k][fld];
				}
			}
			if (itemkeys.length > 0) {
				slicekeystxt = p_mapctx.i18n.msg('SEGMBY', true) + ":";
			}
		}

		cota += 2 * this.normalszPX;
		ctx.font = `${this.normalszPX}px ${this.fontfamily}`;
		ctx.fillText(slicekeystxt, this.left+2*this.margin_offset, cota);

		let lbl, w, h, slack = GlobalConst.CONTROLS_STYLES.TEXTBOXSLACK, selwigetsymb_dim = GlobalConst.CONTROLS_STYLES.DROPDOWNARROWSZ;

		if (this.active_key == null && itemkeys.length > 0) {
			this.active_key = itemkeys[0]; 
		}

		if (this.active_key) {

			let txtdims = ctx.measureText(slicekeystxt);
			const lang = (new I18n(p_mapctx.cfgvar["basic"]["msgs"])).getLang();

			if (Object.keys(p_mapctx.cfgvar["basic"]["msgs"][lang]).indexOf(itemdict[this.active_key]) >= 0) {
				lbl = p_mapctx.cfgvar["basic"]["msgs"][lang][itemdict[this.active_key]];
			} else {
				lbl = itemdict[itemdict[this.active_key]];
			}	
			indent = indent+txtdims.width+2*this.margin_offset;
			ctx.fillText(lbl, indent, cota);

			txtdims = ctx.measureText(lbl);

			if (itemkeys.length > 1) {
				w = txtdims.width+3*slack + selwigetsymb_dim;
			} else {
				w = txtdims.width+2*slack;
			}

			h = 2*slack + txtdims.actualBoundingBoxAscent + txtdims.actualBoundingBoxDescent;
			const selbox = [indent - txtdims.actualBoundingBoxLeft - slack, cota + txtdims.actualBoundingBoxDescent + slack, w, -h];

			if (itemkeys.length > 1) {

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

			indent = this.left+2*this.margin_offset;
			cota += 2 * this.normalszPX;
			const graphbox = [indent, cota, this.width-4*this.margin_offset, this.height+this.top-cota-2*this.margin_offset];

			this.interaction_boxes["graphbox"] = [...graphbox]; 

			ctx.strokeRect(...selbox);	
			ctx.strokeStyle = "purple"
			ctx.strokeRect(...graphbox);	

			this.fetchGraphdata(p_mapctx, ctx);
		}

		ctx.restore();
	}

	clear(p_mapctx) {
		// data_viz layer intended for 'singletons',lets clear the whole lot
		const dims=[];

		const ctx = p_mapctx.renderingsmgr.getDrwCtx(this.canvaslayer, '2d');
		p_mapctx.getCanvasDims(dims);
		ctx.clearRect(0, 0, ...dims); 
	}

	setState(p_mapctx, p_activeflag) {
		this.is_active = p_activeflag;
		if (this.is_active) {
			this.print(p_mapctx);
		} else {
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
					p_evt.clientY <= this.interaction_boxes[k][1] && 
					p_evt.clientY >= this.interaction_boxes[k][1]+this.interaction_boxes[k][3]) {
		
					interact_box_key = k;
					break;
				}
			}

			switch(p_evt.type) {

				case "touchend":
				case "mouseup":

					let lbl, constraintitems=null, that = this;
					const seldict = {};
					const lang = (new I18n(p_mapctx.cfgvar["basic"]["msgs"])).getLang();

					let itemkeys=[], itemdict={};
					if (p_mapctx.cfgvar["basic"]["slicing"] !== undefined && p_mapctx.cfgvar["basic"]["slicing"]["keys"] !== undefined) {
						for (let k in p_mapctx.cfgvar["basic"]["slicing"]["keys"]) {
							for (let fld in p_mapctx.cfgvar["basic"]["slicing"]["keys"][k]) {
								itemkeys.push(`${k}#${fld}`);
								itemdict[`${k}#${fld}`] = p_mapctx.cfgvar["basic"]["slicing"]["keys"][k][fld];
							}
						}
					}
																			
					for (let k of itemkeys) {
						if (Object.keys(p_mapctx.cfgvar["basic"]["msgs"][lang]).indexOf(itemdict[k]) >= 0) {
							lbl = p_mapctx.cfgvar["basic"]["msgs"][lang][itemdict[k]];
						} else {
							lbl = itemdict[k];
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
					break;

				case "mousemove":
					topcnv = p_mapctx.renderingsmgr.getTopCanvas();
					if (interact_box_key) {
						topcnv.style.cursor = "pointer";
					} else {
						topcnv.style.cursor = "default";
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