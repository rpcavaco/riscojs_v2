
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
		this.dims = [200,200];
		this.headsize = 30
		this.layer = p_layer;
		this.featid = p_featid;
		this.feature = p_feature;
		this.leaderorig = [p_scrx, p_scry];
		this.captionfont = "bold 20px sans-serif";
		this.font = "18px sans-serif";

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
		if (p_styles["font"] !== undefined) {
			this.font = p_styles["font"];
		}				
		if (p_styles["captionfont"] !== undefined) {
			this.captionfont = p_styles["captionfont"];
		}
	}

	stroke(p_ctx) {
		if (!this.strokeStyle.toLowerCase() != "none") {
			p_ctx.strokeStyle = this.strokeStyle;
			p_ctx.lineWidth = this.lwidth;
			p_ctx.stroke();
		}		
	}

	fill(p_ctx) {
		if (!this.fillStyle.toLowerCase() != "none") {
			p_ctx.fillStyle = this.fillStyle;
			p_ctx.fill();
		}	
	}	

	draw(p_ctx) {

		const ifkeys = Object.keys(this.layer.infofields);
		if (ifkeys.length < 1) {
			throw new Error(`Missing 'infokey' config for layer '${this.layer.key}`);
		}

		const lang = (new I18n(this.layer.msgsdict)).getLang();

		const leftpad = 10;

		p_ctx.save();

		p_ctx.beginPath();
		p_ctx.rect(...this.origin, ...this.dims);
		this.fill(p_ctx);
		this.stroke(p_ctx);

		p_ctx.moveTo(this.origin[0], this.origin[1]+this.headsize), 
		p_ctx.lineTo(this.origin[0]+this.dims[0], this.origin[1]+this.headsize)
		this.stroke(p_ctx);

		const ltxt = this.layer.label;

		p_ctx.font = this.captionfont;

		p_ctx.fillStyle = this.strokeStyle;
		p_ctx.fillText(ltxt, this.origin[0]+leftpad, this.origin[1]+20);

		// console.log(this.feature);
		// console.log(this.layer.msgsdict);


		function wrtField(p_this, pp_ctx, p_attrs, p_fld, p_msgsdict, p_rownum) {
			let caption, cota;
			if (Object.keys(p_msgsdict).indexOf(p_fld) >= 0) {
				caption = I18n.capitalize(p_msgsdict[p_fld]);
			} else {
				caption = I18n.capitalize(p_fld);
			}

			cota = p_this.origin[1]+32+rownum*20;

			pp_ctx.textAlign = "right";
			pp_ctx.fillText(caption, p_this.origin[0]+leftpad+100, cota);
			
			pp_ctx.textAlign = "left";
			pp_ctx.fillText(p_attrs[p_fld], p_this.origin[0]+leftpad+110, cota);
		}

		p_ctx.font = this.font;
		let rownum = 1;

		if (ifkeys.indexOf("add") >= 0) {
			for (let fld of this.layer.infofields["add"]) {
				wrtField(this, p_ctx, this.feature.a, fld, this.layer.msgsdict[lang], rownum);
				rownum++;
			}	
		} else {
			for (let fld in this.feature.a) {
				if (ifkeys["remove"].indexOf(fld) < 0) {
					wrtField(this, p_ctx, this.feature.a, fld, this.layer.msgsdict[lang], rownum);
					rownum++;
				}
			} 
		}


		p_ctx.restore();
	}

	clear(p_ctx) {
		p_ctx.clearRect(...this.origin, ...this.dims); 
	}	
}