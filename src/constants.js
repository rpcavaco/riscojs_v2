

var SUBKEYS = {
	"layers": ["wms", "agsmap", "agsqry", "imgload", "vectload", "riscofeats"]
}

// 'layers' and other keys in SUBKEYS are group keys: whenever DEBUG: "LAYERS", code marked with debug for "WMS" is also debugged

// DISENG_WHEEL - "disengage wheel" desliga a mousewheel das respetivas acoes, apenas gera msgs de debug

/*
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
*/

var GlobalConst = {

	// ------------------------------------------------------------------------
	// GENERIC CONSTANTS
	//
	// User-serviceable, change with caution
	// ------------------------------------------------------------------------
	DEBUG: "none",    // ALL, GEOM, I18N, LAYERS, WMS, DISENG_WHEEL, AGSMAP, AGSQRY, IMGLOAD, VECTLOAD, RISCOFEATS, FEATMOUSESEL, INTERACTION, INTERACTIONCLICKEND, none
	FEATMOUSESEL_MAXDIST_1K: 2, // Max distance of graphic selection with mouse, meters at 1:1000 scale
	MARKERSIZE_SCALEFACTOR: 10.0,
	IMGRELOAD_TIMEOUT_MSEC: 2000,  // Image loading time after which original request is discarded and a new image load is attempted 
	MINSCALE: 100,
	SCALEINOUT_STEP: 150,
	MAXSCALE: 1000000,
	MINSCALEDIFF: 1,

	// Specialized debugging - canvas path opening and closing
	DEBUG_CANVASVECTOR_PATHCLOSING: null,
	DEBUG_CANVASVECTOR_PATHCLOSING_FEATID: 387,

	// Specialized debugging - canvas path opening and closing
	DEBUG_FEATURE_DISTANCETO: false,
	DEBUG_FEATURE_DISTANCETO_FEATID: 7455,
	// ------------------------------------------------------------------------
	// END of generic constants 
	// ------------------------------------------------------------------------

	// ------------------------------------------------------------------------
	// INTERNAL CONSTANTS - not user-serviceable
	//
	// Changing can severely affect map execution - values to be changed by developers
	// ------------------------------------------------------------------------
	MMPD: 25.4 / 96.0, // Screen resolution millimeters per inch (millimiters / dots-per-inch)
	MAXFEATCHUNKSIZE: 500,
	GEOMPRECISION_DECIMALS: 3,	
	TOLERANCEDIST_RINGCLOSED: 0.1, // Max dist between line endpoints for it to be considered closed ring
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
	ZOOM2RECT_PERC: 0.8, // proportion of map frame fillling when zooming to rect (largest dimension of rect to respective frame dimension)

	GEOLOCATION_INTERVAL_MS: 1000,
	GEOLOCATION_NEXTPOS_TOLERANCE_PX: 20,
	GEOLOCATION_SPEED_THRESHOLD: 1.7, // m/s
	GEOLOCATION_HIGHSPEED_SCALE: 1200,
	GEOLOCATION_LOWSPEED_SCALE: 700,
	IMAGE_LRUCACHE_SZ: 200,

	// ------------------------------------------------------------------------
	// END of internal constants 
	// ------------------------------------------------------------------------


	// ------------------------------------------------------------------------
	// Style and presentation constants - user-serviceable with caution
	// ------------------------------------------------------------------------

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
			"fillStyle": "#11fbff7f",
			"strokeStyle": "#62efff",
			"lineWidth": 3
		}
	},

	INFO_MAPTIPS_BOXSTYLE: {

		"fillStyle": "#0b1f11e0",
		"strokeStyle": "white",
		"innerStrokeStyle": "none",
		"headerFillStyle": "grey",
		"fillTextStyle": "white",
		"URLStyle": "cyan",
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
		"minpopupwidth": 280,
		"maxpopupwidth": 480,
		"lineheightfactor": 1.0, // 1.8
		"rowsintervalfactor": 0.15,
		"caption2value_widthfraction": 0.31,
		"tipsbox2map_widthfraction": 2.4,
		"infotipsbox_slack": 10,

		"thumbcoll_maximgheight": 50,
		"thumbcoll_maximgwidth": 100,
		"thumbcoll_normwidth": 48,
		"thumbcoll_imgpadding": 10,

		"singleimg_maximgheight": 170
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
		TEXT_OFFSET: 12,

		MAPSCALE_WIDTH: 130,
		MAPSCALE_HEIGHT: 18,
		MAPSCALE_TXTBASEOFFSET: -5,
		MAPSCALE_SEPFROM_ATTRIBUTION: 0,
		MAPSCALE_LEFTOF_ATTRIBUTION: true,

		ATTRIBUTION_WIDTH: 250,
		ATTRIBUTION_HEIGHT: 18,
		ATTRIBUTION_BCKGRND: "rgb(60, 110, 140, 0.6)",
		ATTRIBUTION_FOREGRND: "white",
		ATTRIBUTION_TXTBASEOFFSET: -5


	},

	CONTROLS_STYLES: {

		BCKGRD: "rgb(216, 216, 216)",
		COLOR: "black",
		BCKGRDON: "rgb(255, 255, 255)",
		COLORON: "#488db4",
		BCKGRDDISABLED: "rgb(160, 160, 160)",  // Still not in use
		COLORDISABLED: "rgb(80, 80, 80)", // Still not in use
		OFFSET: 10,
		SIZE: 30,
		STROKEWIDTH: 1,
		GAP: 10,
		MOBILE_DEFGAP: 5,
		FONTFAMILY: "OpenSans-CondensedRegular",
		CAPTIONFONTFAMILY: "OpenSans-CondensedBold",
		NORMALSZ_PX: 16,
		CAPTIONSZ_PX: 20,
		TEXTBOXSLACK: 8,
		DROPDOWNARROWSZ: 6,

		HOMESYMBWID: 24,
		HOMESYMB: "data:image/svg+xml;charset=utf-8,%3Csvg width=%2224%22 height=%2224%22 viewBox=%220 0 24 24%22 xmlns=%22http://www.w3.org/2000/svg%22%3E %3Cpath fill=%22none%22 stroke=%22black%22 stroke-width=%221%22 stroke-linejoin=%22round%22 d=%22M 4,14 L 12,8 L 20,14 h -3 v 8 h -3 v -4 h -4 v 4 h -3 v -8 z %22 /%3E%3C/svg%3E",

		TOC_LEFTCOL_WIDTH: 50,
		TOC_VARSTYLESZ_PX: 14,
		TOC_SEPARATION_FACTOR: 1.8,
		TOC_VARSTYLE_SEPARATION_FACTOR: 1.3,
		TOC_BCKGRD: "#0b1d1fe0",
		TOC_ACTIVECOLOR: "white",
		TOC_INACTIVECOLOR: "grey",
		TOC_STRIKETHROUGH_FILL: "rgba(200, 200, 200, 0.3)",
		TOC_COLLAPSED_STRIPES_FILL: "rgba(220, 220, 220, 0.75)",
		TOC_START_COLLAPSED_CANVAS_MAXWIDTH: 800,

		// Shared between Analysis Manager and Selections Navigator, whose operation in tightly connected
		AM_LEFTCOL_WIDTH: 50,
		AM_NORMALSZ_PX: 16,
		AM_BCKGRD: "#0b1d1fe0",
		AM_ACTIVECOLOR: "white",
		AM_INACTIVECOLOR: "grey",
		AM_INUSE: "cyan",
		AM_COLLAPSED_STRIPES_FILL: "rgba(220, 220, 220, 0.75)",
		AM_START_COLLAPSED_CANVAS_MAXWIDTH: 800,

		AM_BOXDIMS: [150, 50],
		AM_ICONDIM: 30,

		SEG_TEXTFILL: "white",
		SEG_WIDTHS: [400, 1200], // min, max
		SEG_WIDTH_PERC: 0.8,
		SEG_BCKGRD: "#0b1d1fe0",
		SEG_ACTIVECOLOR: "white",
		SEG_INACTIVECOLOR: "grey",
		SEG_DATAFONTFAMILY: "sans-serif",
		SEG_DATACAPTIONFONTSIZE_PX: 13,
		SEG_DATAFONTSIZE_PX: 10,
		SEG_MAXICONSZ: 60,
		SEG_MINICONSZ: 26,
		SEG_MAXICONSEP: 2,
		SEG_MINICONSEP: 1,
		SEG_BOX2ICON_RATIO: 2.5,
		SEG_PERCDECPLACES: 2,
		SEG_SMALLBOXLIMIT_PX: 60
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

	// ------------------------------------------------------------------------
	// End of style and presentation constants 
	// ------------------------------------------------------------------------



	getDebug: function(dbgkey) {
		let ret = false, all = false;
		if (this.DEBUG.toLowerCase() == "all" && !dbgkey.toLowerCase().startsWith('diseng')) {
			all = true;
			ret = true;
		}
		if (!all) {
			switch(this.DEBUG.toLowerCase()) {
				case "layers":
					ret = (dbgkey.toLowerCase() == this.DEBUG.toLowerCase() ? true : false);
					if (!ret) {
						ret = (SUBKEYS["layers"].indexOf(dbgkey.toLowerCase()) >= 0 ? true : false);
					}
					break;

				default:	
					ret = (dbgkey.toLowerCase() == this.DEBUG.toLowerCase() ? true : false);

			}
		}
		return ret
	}
};

export {GlobalConst}