

var SUBKEYS = {
	"layers": ["wms", "agsmap", "agsqry", "imgload", "vectload", "riscofeats"]
}

// 'layers' and other keys in SUBKEYS are group keys: whenever DEBUG: "LAYERS", code marked with debug for "WMS" is also debugged

// DISENG_WHEEL - "disengage wheel" desliga a mousewheel das respetivas acoes, apenas gera msgs de debug

var GlobalConst = {

	DEBUG: "none",    // ALL, GEOM, I18N, LAYERS, WMS, DISENG_WHEEL, AGSMAP, AGSQRY, IMGLOAD, VECTLOAD, RISCOFEATS, FEATMOUSESEL, none
	FEATMOUSESEL_MAXDIST_1K: 2, // Max distance of graphic selection with mouse, meters at 1:1000 scale
	MMPD: 25.4 / 96.0,
	MARKERSIZE_SCALEFACTOR: 10.0,
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
	MOUSEWHEEL_THROTTLE: 500,  // millisecs, minimum interval between firing effective map change during a fast succession of mouse wheel events
	ENVSPLIT_CFG_DEFAULT: {  // envelope division in chunking requests -- each entry:  display scales up to key value are split at [n,p]: n-times horizontally and p-times vertically
		1000: [1, 1],
		2000: [2, 1],
		3000: [2, 2],
		4000: [3, 2],
		9999999999999: [3, 3]
	},

	// Specialized debugging - canvas path opening and closing
	DEBUG_CANVASVECTOR_PATHCLOSING: null,
	DEBUG_CANVASVECTOR_PATHCLOSING_FEATID: 387,

	// Specialized debugging - canvas path opening and closing
	DEBUG_FEATURE_DISTANCETO: false,
	DEBUG_FEATURE_DISTANCETO_FEATID: 7455,


	FEATMOUSESEL_HIGHLIGHT: {
		"poly" : { 
			"fillStyle": "#11fbff7f",
			"strokeStyle": "#11caff",
			"lineWidth": 2
		 },
		"line" : { 
			"strokeStyle": "#11fbff",
			"lineWidth": 2
		},
		"point" : { 
			"fillStyle": "#11fbff7f",
			"strokeStyle": "#11caff",
			"lineWidth": 2
		}
	},

	DEBUG_FEATMOUSESEL_SPINDEXMASK_SYMB: { // Symbolize spatial index features selected on mouse position
		"poly" : { 
			"fillStyle": "#ffff007f"
		 },
		"line" : { 
			"strokeStyle": "#ffff00",
			"lineWidth": 2
		},
		"point" : { 
			"fillStyle": "#ffff007f",
			"strokeStyle": "#ffff00",
			"lineWidth": 2
		}
	},

	DEBUG_FEATMOUSESEL_SELUNDERMASK_SYMB: { // Symbolize features of found elements, of any layer, under spatial index features selected on mouse position
		"poly" : { 
			"fillStyle": "#ff00007f"
		 },
		"line" : { 
			"strokeStyle": "#ff0000",
			"lineWidth": 2
		},
		"point" : { 
			"fillStyle": "#ff00007f",
			"strokeStyle": "#ff0000",
			"lineWidth": 2
		}
	},

	SPATIALIDX_GRID: {
		"hiddengraphics": true,
		"spindex": true,
		"type": "areagrid",
		"scaledep_separation_1k": 10,
		"strokeStyle": "white",
		"fillStyle": "none",
		"lineWidth": 0.5
	},	

	MESSAGING_STYLES: {
		PERMANENT_BCKGRD: "rgb(216, 216, 216)",
		PERMANENT_COLOR: "rgb(65, 65, 65)",
		PERMANENT_FONT: "8pt Arial",

		LOADING_BCKGRD: "#fc4040",
		LOADING_COLOR: "#ffffff",
		LOADING_FONT: "8pt Arial",
		LOADING_WIDTH: 250,
		TEXT_OFFSET: 12
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