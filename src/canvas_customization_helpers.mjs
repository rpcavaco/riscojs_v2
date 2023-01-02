
export class CalloutBox {

	origin;
	dims;
	layerkey;
	featid;
	feature;
	fill;
	stroke;
	leaderorig;

	//constructor(p_origin, p_dims, p_fill, p_stroke, p_leaderorig) {
	constructor(p_mapctx, p_layer, p_featid, p_feature, p_styles, p_scrx, p_scry) {
		this.origin = [20,20];
		this.dims = [200,200];
		this.layer = p_layer;
		this.featid = p_featid;
		this.feature = p_feature;
		this.leaderorig = [p_scrx, p_scry];

		if (p_styles["fillStyle"] !== undefined) {
			this.fill = p_styles["fillStyle"];
		} else {
			this.fill = "none";
		}
		if (p_styles["strokeStyle"] !== undefined) {
			this.stroke = p_styles["strokeStyle"];
		} else {
			this.stroke = "none";
		}
		if (p_styles["lineWidth"] !== undefined) {
			this.lwidth = p_styles["lineWidth"];
		} else {
			this.lwidth = 1;
		}	
		if (p_styles["font"] !== undefined) {
			this.font = p_styles["font"];
		}				

	}

	draw(p_ctx) {

		p_ctx.save();

		p_ctx.strokeStyle = this.stroke;
		p_ctx.beginPath();
		p_ctx.rect(...this.origin, ...this.dims);

		if (!this.fill.toLowerCase() != "none") {
			p_ctx.fillStyle = this.fill;
			p_ctx.fill();
		}
		if (!this.stroke.toLowerCase() != "none") {
			p_ctx.strokeStyle = this.stroke;
			p_ctx.lineWidth = this.lwidth;
			p_ctx.stroke();
		}	
		p_ctx

		p_ctx.restore();
	}

	clear(p_ctx) {
		p_ctx.clearRect(...this.origin, ...this.dims); 
	}	
}