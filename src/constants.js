

var SUBKEYS = {
	"layers": ["wms", "agsmap", "agsqry", "imgload", "vectload", "riscofeats"]
}

// 'layers' and other keys in SUBKEYS are group keys: whenever DEBUG: "LAYERS", code marked with debug for "WMS" is also debugged

// DISENG_WHEEL - "disengage wheel" desliga a mousewheel das respetivas acoes, apenas gera msgs de debug

var sel_drawsymb_func = function(p_mapctxt, p_layer, p_coords, opt_feat_id) {

	const sclval = p_mapctxt.getScale();
	const dim = 10;

	p_layer._gfctx.beginPath();
	p_layer._gfctx.arc(p_coords[0], p_coords[1], dim, 0, Math.PI * 2, true);

	if (this["fillStyle"] !== undefined) {
		p_layer._gfctx.fill();
	}

	p_layer._gfctx.stroke();
}

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
	TYPICAL_OIDFLDNAMES: ["objectid", "oid", "oidfld"],

	LBL_QUANTIZE_SIZE: 4,
	LBL_VERTICALITY_TEST: 2,
	LBL_MAX_ALONGPATH_OCCUPATION: 0.98,

	// Specialized debugging - canvas path opening and closing
	DEBUG_CANVASVECTOR_PATHCLOSING: null,
	DEBUG_CANVASVECTOR_PATHCLOSING_FEATID: 387,

	// Specialized debugging - canvas path opening and closing
	DEBUG_FEATURE_DISTANCETO: false,
	DEBUG_FEATURE_DISTANCETO_FEATID: 7455,

	FONTS: {
		"OpenSans-CondensedBold": "fonts/OpenSans-CondensedBold.ttf",
		"OpenSans-CondensedRegular": "fonts/OpenSans-CondensedRegular.ttf"
	},

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
			"fillStyle": "#ffffff00",
			"strokeStyle": "#ffff03",
			"lineWidth": 2,
			"drawsymb": sel_drawsymb_func
		}
	},

	INFO_MAPTIPS_BOXSTYLE: {
		"fillStyle": "#0b1f11e0",
		"strokeStyle": "white",
		"innerStrokeStyle": "none",
		"headerFillStyle": "grey",
		"fillTextStyle": "white",
		"navFillStyle": "white",
		"lineWidth": 1,		
		"layercaptionszPX": 20,
		"normalszPX": 16,
		"layercaptionfontfamily": "OpenSans-CondensedBold",	
		"captionfontfamily": "OpenSans-CondensedBold",	
		"fontfamily": "OpenSans-CondensedRegular",
		
		"leftpad": 10,
		"rightpad": 10,
		"betweencols": 10,
		"minlefcolwidth": 300
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
			"lineWidth": 2,
			"drawsymb": sel_drawsymb_func		
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
			"lineWidth": 2,
			"drawsymb": sel_drawsymb_func
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
		LOADING_HEIGHT: 20,
		TEXT_OFFSET: 12
	},

	getDebug: function(dbgkey) {
		let ret = false, all = false;
		if (this.DEBUG.toLowerCase() == "all" && !dbgkey.toLowerCase().startsWith('diseng')) {
			all = true;
			ret = true;
		} else {
			ret = (dbgkey.toLowerCase() == this.DEBUG.toLowerCase() ? true : false);
		}
		if (!all) {
			switch(this.DEBUG.toLowerCase()) {
				case "layers":
					ret = (SUBKEYS["layers"].indexOf(dbgkey.toLowerCase()) >= 0 ? true : false);
					break;


			}
		}
		return ret
	}
};

export {GlobalConst}