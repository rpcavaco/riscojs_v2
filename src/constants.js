

var SUBKEYS = {
	"layers": ["ogcraster"]
}

// 'layers' and other keys in SUBKEYS are group keys: whenever DEBUG: "LAYERS", code marked with debug for "WMS" is also debugged

var GlobalConst = {

	DEBUG: "LAYERS",    // ALL, I18N, LAYERS, OGCRaster

	MMPD: 25.4 / 96.0,
	ACCPTBLE_LYRREDRAW_DELAY_MSEC: 10,
	MAPCHANGE_TIMEOUT_MSEC: 8000,
	SPINDEX_STEP: 10,
	MINSCALE: 100,
	MAXSCALE: 1000000,
	MINSCALEDIFF: 1,
	MAXLAYERCOUNT: 100,

	getDebug: function(p_dbgkey) {
		let ret = false, all = false;
		if (p_dbgkey.toLowerCase() == "all") {
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