
import {I18n} from './i18n.mjs';
import {GlobalConst} from './constants.js';
import {InfoBox} from './canvas_customization_helpers.mjs';

class MapPrintInRect {

	right;
	boxh;
	boxw;
	bottom;
	fillStyleBack; 
	fillStyleFront; 
	font;

	constructor() {
		this.i18n = new I18n();
	}

	print(p_mapctx, p_x, py) {
		// To be implemented
	}

	remove(p_mapctx) {
		const canvas_dims = [];
		const gfctx = p_mapctx.renderingsmgr.getDrwCtx('service', '2d');
		p_mapctx.renderingsmgr.getCanvasDims(canvas_dims);

		gfctx.clearRect(this.right-this.boxw, this.bottom-this.boxh, this.boxw, this.boxh); 
	}	
	
}

class PermanentMessaging extends MapPrintInRect {
	constructor() {
		super();
		this.fillStyleBack = GlobalConst.MESSAGING_STYLES.PERMANENT_BCKGRD; 
		this.fillStyleFront = GlobalConst.MESSAGING_STYLES.PERMANENT_COLOR;
		this.font = GlobalConst.MESSAGING_STYLES.PERMANENT_FONT;
	}	
}

class MousecoordsPrint extends PermanentMessaging {

	constructor() {
		super();
	}

	print(p_mapctx, p_x, py) {

		const terr_pt = [], canvas_dims = [];
		p_mapctx.transformmgr.getTerrainPt([p_x, py], terr_pt);

		const ctx = p_mapctx.renderingsmgr.getDrwCtx('service', '2d');
		ctx.save();

		try {
			p_mapctx.renderingsmgr.getCanvasDims(canvas_dims);

			this.right = canvas_dims[0];
			this.boxh = 20;
			this.boxw = 130;
			this.bottom = canvas_dims[1]-(2*this.boxh)-2;

			ctx.clearRect(this.right-this.boxw, this.bottom-this.boxh, this.boxw, this.boxh); 
			ctx.fillStyle = this.fillStyleBack;
			ctx.fillRect(this.right-this.boxw, this.bottom-this.boxh, this.boxw, this.boxh);

			ctx.fillStyle = this.fillStyleFront;
			ctx.font = this.font;

			ctx.fillText(terr_pt[0].toLocaleString(undefined, { maximumFractionDigits: 2 }), this.right-this.boxw+8, this.bottom-6);		
			ctx.fillText(terr_pt[1].toLocaleString(undefined, { maximumFractionDigits: 2 }), this.right-this.boxw+66, this.bottom-6);	
			
		} catch(e) {
			throw e;
		} finally {
			ctx.restore();
		}

	}	

	
}

class MapScalePrint extends PermanentMessaging {

	constructor() {
		super();
	}

	print(p_mapctx, p_scaleval) {

		const canvas_dims = [];
		const ctx = p_mapctx.renderingsmgr.getDrwCtx('service', '2d');
		ctx.save();

		try {
			p_mapctx.renderingsmgr.getCanvasDims(canvas_dims);

			this.right = canvas_dims[0];
			this.boxh = 20;
			this.boxw = 130;
			this.bottom = canvas_dims[1]-this.boxh;

			ctx.clearRect(this.right-this.boxw, this.bottom-this.boxh, this.boxw, this.boxh); 
			ctx.fillStyle = this.fillStyleBack;
			ctx.fillRect(this.right-this.boxw, this.bottom-this.boxh, this.boxw, this.boxh);

			//console.log('>> MapScalePrint print scale', [this.right-this.boxw, this.bottom-this.boxh, this.boxw, this.boxh]);

			ctx.fillStyle = this.fillStyleFront;
			ctx.font = this.font;

			ctx.fillText(this.i18n.msg('ESCL', true) + " 1:"+p_scaleval, this.right-this.boxw+GlobalConst.MESSAGING_STYLES.TEXT_OFFSET, this.bottom-6);		

		} catch(e) {
			throw e;
		} finally {
			ctx.restore();
		}
	}	
}

class LoadingMessaging extends MapPrintInRect {
	constructor() {
		super();
		this.fillStyleBack = GlobalConst.MESSAGING_STYLES.LOADING_BCKGRD; 
		this.fillStyleFront = GlobalConst.MESSAGING_STYLES.LOADING_COLOR;
		this.font = GlobalConst.MESSAGING_STYLES.LOADING_FONT;
	}	
}

class LoadingPrint extends LoadingMessaging {

	constructor() {
		super();
	}

	print(p_mapctx, p_msg) {

		const canvas_dims = [];
		const ctx = p_mapctx.renderingsmgr.getDrwCtx('service', '2d');
		ctx.save();

		try {
			p_mapctx.renderingsmgr.getCanvasDims(canvas_dims);

			const msg = `${this.i18n.msg('LDNG', false)} ${p_msg}`;
			// const tm = ctx.measureText(msg);
			this.boxw =  GlobalConst.MESSAGING_STYLES.LOADING_WIDTH;

			this.right = this.boxw;
			this.boxh = GlobalConst.MESSAGING_STYLES.LOADING_HEIGHT;
			this.bottom = canvas_dims[1]-this.boxh;

			ctx.clearRect(this.right-this.boxw, this.bottom-this.boxh, this.boxw, this.boxh); 
			ctx.fillStyle = this.fillStyleBack;
			ctx.fillRect(this.right-this.boxw, this.bottom-this.boxh, this.boxw, this.boxh);

			ctx.fillStyle = this.fillStyleFront;
			ctx.font = this.font;
			ctx.textAlign = "center";

			ctx.fillText(msg, this.boxw/2, this.bottom-6, this.boxw - 2 * GlobalConst.MESSAGING_STYLES.TEXT_OFFSET);		

		} catch(e) {
			throw e;
		} finally {
			ctx.restore();
		}
	}	
}

class Info {
	// curr_layerkey;
	// curr_featid;
	callout;
	canvaslayer = 'viz';
	styles;

	constructor(p_styles) {
		this.styles = p_styles;
		this.callout = null;
	}
	hover(p_mapctx, p_layerkey, p_featid, p_feature, p_scrx, p_scry) {
		// this.curr_layerkey = p_layerkey;
		// this.curr_featid = p_featid;
		//console.log("Maptip, layer:", p_layerkey, " feat:", p_featid);
		const currlayer = p_mapctx.tocmgr.getLayer(p_layerkey);
		this.callout = new InfoBox(p_mapctx, currlayer, p_featid, p_feature, this.styles, p_scrx, p_scry, true);
		const ctx = p_mapctx.renderingsmgr.getDrwCtx(this.canvaslayer, '2d');
		this.callout.clear(ctx);
		this.callout.draw(ctx);
	}
	pick(p_mapctx, p_layerkey, p_featid, p_feature, p_scrx, p_scry) {
		this.clear(p_mapctx, p_layerkey, p_featid, p_scrx, p_scry)
		// this.curr_layerkey = p_layerkey;
		// this.curr_featid = p_featid;
		console.log("Info, layer:", p_layerkey, " feat:", p_featid);
		console.log(p_feature);
	} 
	clear(p_mapctx, p_layerkey, p_featid, p_scrx, p_scry) {
		//console.log("info/tip clear, prev layer:", p_layerkey, " feat:", p_featid);
		if (this.callout) {
			const ctx = p_mapctx.renderingsmgr.getDrwCtx(this.canvaslayer, '2d');
			this.callout.clear(ctx);
		}
	} 	
}

export class MapCustomizations {

	constructor() {
		this.instances = {
			"mousecoordsprint": new MousecoordsPrint(),
			"mapscaleprint": new MapScalePrint(),
			"loadingmsgprint": new LoadingPrint(),
			"infoclass": new Info(GlobalConst.INFO_MAPTIPS_BOXSTYLE)						
		}
		
	}

}
