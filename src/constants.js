

var SUBKEYS = {
	"layers": ["wms", "agsmap", "agsqry", "imgload", "vectload", "riscofeats"]
}

// 'layers' and other keys in SUBKEYS are group keys: whenever DEBUG: "LAYERS", code marked with debug for "WMS" is also debugged

// DISENG_WHEEL - "disengage wheel" desliga a mousewheel das respetivas acoes, apenas gera msgs de debug

var GlobalConst = {

	DEBUG: "none",    // ALL, I18N, LAYERS, WMS, DISENG_WHEEL, AGSMAP, AGSQRY, IMGLOAD, VECTLOAD, RISCOFEATS, none

	MMPD: 25.4 / 96.0,
	IMGRELOAD_TIMEOUT_MSEC: 2000,  // Image loading time after which original request is discarded and a new image load is attempted 
	/*ACCPTBLE_LYRREDRAW_DELAY_MSEC: 10,
	MAPCHANGE_TIMEOUT_MSEC: 8000,
	SPINDEX_STEP: 10,*/
	MINSCALE: 100,
	MAXSCALE: 1000000,
	MINSCALEDIFF: 1,
	MAXFEATCHUNKSIZE: 500,
	GEOMPRECISION_DECIMALS: 3,	
	TOLERANCEDIST_RINGCLOSED: 0.1, // Max dist between line endpoints for it to be considered closed ring
	//MAXLAYERCOUNT: 100,
	MOUSEWHEEL_THROTTLE: 100,  // millisecs, interval between wheel events must span more than this interval for each event to be listened
	ENVSPLIT_CFG_DEFAULT: {  // envelope division in chunking requests -- each entry:  display scales up to key value are split n-times horizontally and k-times vertically
		1000: [1, 1],
		2000: [2, 1],
		3000: [2, 2],
		4000: [3, 2],
		9999999999999: [3, 3]
	},

	getDebug: function(p_dbgkey) {
		let ret = false, all = false;
		if (this.DEBUG.toLowerCase() == "all" && !p_dbgkey.toLowerCase().startsWith('diseng')) {
			all = true;
			ret = true;
		} else {
			ret = (p_dbgkey.toLowerCase() == this.DEBUG.toLowerCase() ? true : false);
		}
		if (!all) {
			switch(this.DEBUG.toLowerCase()) {
				case "layers":
					ret = (SUBKEYS["layers"].indexOf(p_dbgkey.toLowerCase()) >= 0 ? true : false);
					break;


			}
		}
		return ret
	}
};

export {GlobalConst}