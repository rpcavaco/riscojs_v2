import {GlobalConst} from './constants.js';
import {uuidv4} from './utils.mjs';
import {WMSLayer, AGSMapLayer, AGSImageServiceLayer} from './rasterlayers.mjs';

// import {processHDREffect} from './canvas_utils.mjs';

function timeOutOnRasterLoading(p_rastersloading, p_raster_id) {

	setTimeout(
		function() {

			if (p_rastersloading[p_raster_id] !== undefined) {

				if (p_rastersloading[p_raster_id].reloaded) {
					if (GlobalConst.getDebug("IMGLOAD")) {
						console.log(`[DBG:IMGLOAD] Re-re-loading request rejected '${p_raster_id}'`);
					}
					return;
				}

				p_rastersloading[p_raster_id].img.src = "";

				if (GlobalConst.getDebug("IMGLOAD")) {
					console.log(`[DBG:IMGLOAD] Re-loading '${p_raster_id}'`);
				}
		
				p_rastersloading[p_raster_id].img.src = p_rastersloading[p_raster_id].url;
				p_rastersloading[p_raster_id].reloaded = true;

			}
		},
		GlobalConst.IMGRELOAD_TIMEOUT_MSEC
	);

}

const canvasRasterMethodsMixin = (Base) => class extends Base {

	canvasKey = 'base';
	image_filter = 'none';
	alpha = "none";

	static toGrayScaleImgFilter(p_gfctx, p_imgobj, p_x, p_y, p_ctxw, p_ctxh, null_filteradicdata) {
			
		try {
			var imageData = p_gfctx.getImageData(p_x, p_y, p_ctxw, p_ctxh);
			var data = imageData.data;

			for(var i = 0; i < data.length; i += 4) {
			var brightness = 0.34 * data[i] + 0.5 * data[i + 1] + 0.16 * data[i + 2];
			// red
			data[i] = brightness;
			// green
			data[i + 1] = brightness;
			// blue
			data[i + 2] = brightness;
			}

			// overwrite original image
			p_gfctx.putImageData(imageData, p_x, p_y);    			
			
		} catch(e) {
			var accepted = false
			if (e.name !== undefined) {
				if (["NS_ERROR_NOT_AVAILABLE"].indexOf(e.name) >= 0) {
					accepted = true;
				}
			}
			if (!accepted) {
				console.log("... drawImage ERROR ...");
				console.log(p_imgobj);
				console.log(e);
			}
				
		}
	};

	static BlueprintEffectImgFilter(p_gfctx, p_imgobj, p_x, p_y, p_ctxw, p_ctxh, null_filteradicdata) {
			
		try {
			const imageData = p_gfctx.getImageData(p_x, p_y, p_ctxw, p_ctxh);
			const data = imageData.data;
			let brightness;

			for(var i = 0; i < data.length; i += 4) {
				brightness = 0.34 * data[i] + 0.5 * data[i + 1] + 0.16 * data[i + 2];
				// red
				data[i] = 0.5 * brightness;
				// green
				data[i + 1] = brightness;
				// blue
				data[i + 2] = 1.28 * brightness;
			}

			// overwrite original image
			p_gfctx.putImageData(imageData, p_x, p_y);    			
			
		} catch(e) {
			var accepted = false
			if (e.name !== undefined) {
				if (["NS_ERROR_NOT_AVAILABLE"].indexOf(e.name) >= 0) {
					accepted = true;
				}
			}
			if (!accepted) {
				console.log("... drawImage ERROR ...");
				console.log(p_imgobj);
				console.log(e);
			}
				
		}
	};	

	static SepiaEffectImgFilter(p_gfctx, p_imgobj, p_x, p_y, p_ctxw, p_ctxh, null_filteradicdata) {
			
		try {
			const imageData = p_gfctx.getImageData(p_x, p_y, p_ctxw, p_ctxh);
			const data = imageData.data;
			let brightness;

			for(var i = 0; i < data.length; i += 4) {
				brightness = 0.34 * data[i] + 0.5 * data[i + 1] + 0.16 * data[i + 2];
				// red
				data[i] = 1.1 * brightness;
				// green
				data[i + 1] = 0.5 * brightness;
				// blue
				data[i + 2] = 0.24 * brightness;
			}

			// overwrite original image
			p_gfctx.putImageData(imageData, p_x, p_y);    			
			
		} catch(e) {
			var accepted = false
			if (e.name !== undefined) {
				if (["NS_ERROR_NOT_AVAILABLE"].indexOf(e.name) >= 0) {
					accepted = true;
				}
			}
			if (!accepted) {
				console.log("... drawImage ERROR ...");
				console.log(p_imgobj);
				console.log(e);
			}
				
		}
	};

	static imageEvtsHandling(pp_mapctxt, p_lyr, p_img, pp_scr_env, pp_dims, pp_envkey, p_raster_id, p_alpha) {
		
		const that = this;
		p_img.onload = function() {

			const gfctx = pp_mapctxt.renderingsmgr.getDrwCtx(p_lyr.canvasKey, '2d'); //, true);

			gfctx.save();
			// Requires definition of global var _GLOBAL_SAVE_RESTORE_CTR
			// _GLOBAL_SAVE_RESTORE_CTR++;
			try {

				if (p_alpha != null && p_alpha != "none") {
					gfctx.globalAlpha = parseFloat(p_alpha);
				}
				//p_gfctx.clearRect(pp_scr_env[0], pp_scr_env[3], ...pp_dims);
				gfctx.drawImage(p_img, pp_scr_env[0], pp_scr_env[3]);
				if (p_lyr.filter == 'grayscale') {
					that.toGrayScaleImgFilter(gfctx, p_img, pp_scr_env[0], pp_scr_env[3], ...pp_dims);
				} else if (p_lyr.filter == 'blueprint') {
					that.BlueprintEffectImgFilter(gfctx, p_img, pp_scr_env[0], pp_scr_env[3], ...pp_dims);
				} else if (p_lyr.filter == 'sepia') {
					that.SepiaEffectImgFilter(gfctx, p_img, pp_scr_env[0], pp_scr_env[3], ...pp_dims);
				}		

				//processHDREffect(gfctx, [0,0], pp_dims)
			} catch(e) {
				throw e;
			} finally {
/* 				_GLOBAL_SAVE_RESTORE_CTR--;
				if (_GLOBAL_SAVE_RESTORE_CTR < 0) {
					console.log("Neg _GLOBAL_SAVE_RESTORE_CTR, canvas_raster:", _GLOBAL_SAVE_RESTORE_CTR);
				}
 */				gfctx.restore();

				if (p_lyr.rastersloading[p_raster_id] !== undefined) {

					if (GlobalConst.getDebug("IMGLOAD")) {
						console.log(`[DBG:IMGLOAD] timing for '${p_raster_id}': ${new Date().getTime() - p_lyr.rastersloading[p_raster_id]["ts"]}, reloaded: ${p_lyr.rastersloading[p_raster_id]["reloaded"]}`);
					}

					delete p_lyr.rastersloading[p_raster_id];
				}
				// console.log(`(rstrs still loading at t1 x ${p_envkey}):`, Object.keys(p_lyr.rastersloading[p_envkey]));
			}
		}

		p_img.onerror = function() {
			if (GlobalConst.getDebug("IMGLOAD")) {
				if (p_lyr.rastersloading[p_raster_id] !== undefined) {
					console.log(`[DBG:IMGLOAD] Error for '${p_raster_id}', time: ${new Date().getTime() - p_lyr.rastersloading[p_raster_id]["ts"]}`);
				}
			}
			if (p_lyr.rastersloading[p_raster_id] !== undefined) {
				delete p_lyr.rastersloading[p_raster_id];		
			}		
		}

	}


	refreshrasteritem(p_mapctxt, p_scr_env, p_dims, p_envkey, p_raster_url) {

		const img = new Image();
		img.crossOrigin = "anonymous";

		const raster_id = uuidv4();

		this.constructor.imageEvtsHandling(p_mapctxt, this, img, p_scr_env.slice(0), p_dims.slice(0), p_envkey, raster_id, this.alpha);		
		img.src = p_raster_url;

		// console.log(`(rstrs on loading at t0 x ${p_envkey}):`, Object.keys(this.rastersloading[p_envkey]));

		if (GlobalConst.getDebug("IMGLOAD")) {
			const ks = Object.keys(this.rastersloading);
			console.log(`[DBG:IMGLOAD] Loading '${raster_id}', pending: ${ks.length} ${Object.keys(this.rastersloading)}`);
		}

		this.rastersloading[raster_id] = {
			"raster_id": raster_id,
			"img": img,
			"ts": new Date().getTime(),
			"url": p_raster_url,
			"reloaded": false
		}

		timeOutOnRasterLoading(this.rastersloading, raster_id);

		return true;

	}	
}

export class CanvasWMSLayer extends canvasRasterMethodsMixin(WMSLayer) {

}

export class CanvasAGSMapLayer extends canvasRasterMethodsMixin(AGSMapLayer) {

}

export class CanvasAGSImgSrvLayer extends canvasRasterMethodsMixin(AGSImageServiceLayer) {

}

