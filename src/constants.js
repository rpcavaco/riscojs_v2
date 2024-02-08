

/* var SUBKEYS = {
	"layers": ["wms", "agsmap", "agsqry", "imgload", "vectload", "riscofeats"]
} */

// 'layers' and other keys in SUBKEYS are group keys: whenever DEBUG: "LAYERS", code marked with debug for "WMS" is also debugged

// DISENG_WHEEL - "disengage wheel" desliga a mousewheel das respetivas acoes, apenas gera msgs de debug

var GlobalConst = {

	// ------------------------------------------------------------------------
	// GENERIC CONSTANTS
	//
	// User-serviceable, change with caution
	// ------------------------------------------------------------------------
	DEBUG: "none",    // ALL, GEOM, I18N, LAYERS, WMS, DISENG_WHEEL, AGSMAP, AGSQRY, AGSIMAGE, IMGLOAD, VECTLOAD, RISCOFEATS, FEATMOUSESEL, INTERACTION, INTERACTIONCLICKEND, INTERACTIONCLEAR, INTERACTIONOUT, TOOLENABLE, DYNSYMBOLOGY, DRAWASSELECTED, none
	FEATMOUSESEL_MAXDIST_1K: 2, // Max distance of graphic selection with mouse, meters at 1:1000 scale
	MARKERSIZE_SCALEFACTOR: 10.0,
	IMGRELOAD_TIMEOUT_MSEC: 2000,  // Image loading time after which original request is discarded and a new image load is attempted 
	MINSCALE: 100,
	SCALEINOUT_STEP: 150,
	MAXSCALE: 1000000,
	MINSCALEDIFF: 1,
	GLOBAL_SEQATTEMPTS_DELAY_MS: 700,
	GLOBAL_SEQATTEMPTS_MAXNR: 50,

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
	MOUSEINTERACTION_NEARESTFEATURES_COINCIDENCE_TOLERANCE: 0.01, // ground meters
	CENTER_TARGET_WIDTH: 2,
	CENTER_TARGET_SIZE: 18,

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
			"marker": "circle",
			"markersize": 3,
			"fillStyle": "none",
			"strokeStyle": "yellow",
			"lineWidth": 4
		}
	},

	FEATMOUSESEL_HIGHLIGHT_EDIT: {
		"selected": {
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
				"marker": "diamond",
				"fillStyle": "none",
				"strokeStyle": "#20ffff",
				"lineWidth": 3,
				"markersize": 8
			}	
		},
		"engaged": {
			"poly" : { 
				"lineWidth": 3
			 },
			"line" : { 
				"lineWidth": 3
			},
			"point" : { 
				"marker": "star",
				"fillStyle": "none",
				"strokeStyle": "#20ffff",
				"lineWidth": 3,
				"markersize": 18,
				"thickness": 10	
			}	
		},		
	},

	FEATUREEDIT_VERTEX_MOVE: [
		{
			"marker": "star",
			"strokeStyle": "#187735",
			"lineWidth": 5,
			"markersize": 18,
			"thickness": 14
		},
		{
			"marker": "star",
			"strokeStyle": "#85ffaa",
			"lineWidth": 2,
			"markersize": 16,
			"thickness": 12
		},	
		{
			"marker": "circle",
			"fillStyle": "#85ffaa",
			"markersize": 1
		}		
	],

	FEATUREEDIT_VERTEX_NEW: [
		{
			"marker": "circle",
			"markersize": 12,
			"strokeStyle": "yellow",
			"lineWidth": 4
		},
		{
			"marker": "circle",
			"markersize": 14,
			"strokeStyle": "orange",
			"lineWidth": 2
		},		
		{
			"marker": "star",
			"strokeStyle": "yellow",
			"lineWidth": 3,
			"markersize": 24,
			"thickness": 6
		}		
	],	

	INFO_MAPTIPS_BOXSTYLE: {

		"fillStyle": "#0b1f11e0",
		"strokeStyle": "white",
		"innerStrokeStyle": "none",
		"headerFillStyle": "grey",
		"fillTextStyle": "white",
		"altRowsFillStyle": "rgb(255, 255, 255, 0.2)",
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

		"singleimg_maximgheight": 170,
		"header_spacing_factor": 1.6,
		"footer_spacing_factor": [2, 0.6]  // Info, multiple pages, single page
	},

	MESSAGING_STYLES: {

		PERMANENT_BCKGRD: "rgb(216, 216, 216)",
		PERMANENT_COLOR: "rgb(65, 65, 65)",
		PERMANENT_FONT: "8pt Arial",

		LOADING_BCKGRD: "#fc2424a0",
		LOADING_COLOR: "#ffffff",
		LOADING_FONT: "8pt Arial",
		LOADING_WIDTH: 250,
		LOADING_HEIGHT: 20,
		LOADING_TEXT_OFFSET: 6,

		TEXT_OFFSET: 12,

		MAPSCALE_WIDTH: 130,
		MAPSCALE_HEIGHT: 18,
		MAPSCALE_TXTBASEOFFSET: -5,
		//MAPSCALE_SEPFROM_ATTRIBUTION: 0,
		//MAPSCALE_LEFTOF_ATTRIBUTION: true,
		MAPSCALE_HORIZONTAL_LAYOUT: true,		

		MAPCOORDS_WIDTH: 130,
		MAPCOORDS_HEIGHT: 18,
		MAPCOORDS_SEPARATION: 2,
		MAPCOORDS_HORIZONTAL_LAYOUT: true,		
		MAPCOORDS_TXTBASEOFFSET: -5,

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
		STROKEWIDTH: 1.2,
		GAP: 10,
		MOBILE_DEFGAP: 5,
		FONTFAMILY: "OpenSans-CondensedRegular",
		CAPTIONFONTFAMILY: "OpenSans-CondensedBold",
		NORMALSZ_PX: 16,
		CAPTIONSZ_PX: 20,
		TEXTBOXSLACK: 8,
		DROPDOWNARROWSZ: 6,

		BASIC_CONTROLS_ORIENTATION: "VERTICAL",

		HOMESYMBWID: 24,
		HOMESYMB: "data:image/svg+xml;charset=utf-8,%3Csvg width=%2224%22 height=%2224%22 viewBox=%220 0 24 24%22 xmlns=%22http://www.w3.org/2000/svg%22%3E %3Cpath fill=%22none%22 stroke=%22black%22 stroke-width=%221.2%22 stroke-linejoin=%22round%22 d=%22M 4,14 L 12,8 L 20,14 h -3 v 8 h -3 v -4 h -4 v 4 h -3 v -8 z %22 /%3E%3C/svg%3E",
		LAYERSSYMB: "data:image/svg+xml;charset=utf-8,%3C?xml version=%221.0%22 encoding=%22UTF-8%22 standalone=%22no%22?%3E %3Csvg xmlns:svg=%22http://www.w3.org/2000/svg%22 xmlns=%22http://www.w3.org/2000/svg%22 version=%221.1%22 viewBox=%220 0 200 200%22 height=%22200mm%22 width=%22200mm%22%3E %3Cg transform=%22translate(0,-97)%22 id=%22layer1%22%3E  %3Cpath  transform=%22matrix(0.86144972,0,0,0.43822488,14.998756,141.52603)%22  d=%22M 97.517855,267.79573 11.817369,180.58335 99.029752,94.88286 184.73024,182.09524 Z%22  id=%22path1919-1%22  style=%22fill:none;fill-opacity:1;fill-rule:nonzero;stroke:black;stroke-width:8.5;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-opacity:1%22 /%3E  %3Cpath  transform=%22matrix(0.86144972,0,0,0.43822488,11.091467,129.80415)%22  d=%22M 97.517855,267.79573 11.817369,180.58335 99.029752,94.88286 184.73024,182.09524 Z%22  id=%22path1919-9-2-7%22  style=%22fill:white;fill-opacity:1;fill-rule:nonzero;stroke:none;stroke-width:8.5;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-opacity:1%22 /%3E  %3Cpath  transform=%22matrix(0.86144972,0,0,0.43822488,15.649972,118.40784)%22  d=%22M 97.517855,267.79573 11.817369,180.58335 99.029752,94.88286 184.73024,182.09524 Z%22  id=%22path1919-9%22  style=%22fill:none;fill-opacity:1;fill-rule:nonzero;stroke:black;stroke-width:8.5;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-opacity:1%22 /%3E  %3Cpath  transform=%22matrix(0.86144972,0,0,0.43822488,15.975579,107.33717)%22  d=%22M 97.517855,267.79573 11.817369,180.58335 99.029752,94.88286 184.73024,182.09524 Z%22  id=%22path1919-9-2%22  style=%22fill:white;fill-opacity:1;fill-rule:nonzero;stroke:none;stroke-width:8.5;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-opacity:1%22 /%3E  %3Cpath  transform=%22matrix(0.86144972,0,0,0.43822488,15.975574,93.539189)%22  d=%22M 97.517855,267.79573 11.817369,180.58335 99.029752,94.88286 184.73024,182.09524 Z%22  id=%22path1919%22  style=%22fill:none;fill-opacity:1;fill-rule:nonzero;stroke:black;stroke-width:8.5;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:4;stroke-opacity:1%22 /%3E %3C/g%3E %3C/svg%3E",

		TOC_LEFTCOL_WIDTH: 50,
		TOC_VARSTYLESZ_PX: 14,
		TOC_SEPARATION_FACTOR: 1.8,
		TOC_VARSTYLE_SEPARATION_FACTOR: 1.6,
		TOC_BCKGRD: "#0b1d1fe0",
		TOC_ACTIVECOLOR: "white",
		TOC_INACTIVECOLOR: "grey",
		TOC_STRIKETHROUGH_FILL: "rgba(200, 200, 200, 0.2)",
		TOC_COLLAPSED_STRIPES_FILL: "rgba(220, 220, 220, 0.75)",
		TOC_START_COLLAPSED_CANVAS_MAXWIDTH: 800,
		TOC_EDITLAYER_ENTRY_COLOR: "#3effff",

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

		// Selection navigator
		SN_BCKGRD: "#0b1d1fe0",
		SN_BOXDIMS: [150, 50],
		SN_ACTIVECOLOR: "white",
		SN_INACTIVECOLOR: "grey",
		SN_NORMALSZ_PX: 16,

		// Edting management
		EM_LEFTCOL_WIDTH: 50,
		EM_NORMALSZ_PX: 16,
		EM_BCKGRD: "#0b1d1fe0",
		EM_ACTIVECOLOR: "white",
		EM_INACTIVECOLOR: "grey",
		EM_INUSE: "cyan",
		EM_COLLAPSED_STRIPES_FILL: "rgba(220, 220, 220, 0.75)",
		EM_START_COLLAPSED_CANVAS_MAXWIDTH: 800,

		EM_BOXDIMS: [150, 50],
		EM_ICONDIMS: [80,32],

		// Segmentation
		SEG_TEXTFILL: "white",
		SEG_WIDTHS: [400, 1200], // min, max
		SEG_WIDTH_PERC: 0.8,
		SEG_BCKGRD: "#0b1d1fe0",
		SEG_ACTIVECOLOR: "white",
		SEG_SELBCKGRD: "#80808060",
		SEG_INACTIVECOLOR: "grey",
		SEG_DATAFONTFAMILY: "sans-serif",
		SEG_DATACAPTIONFONTSIZE_PX: 13,
		SEG_DATAFONTSIZE_PX: 10,
		SEG_MAXICONSZ: 40,
		SEG_MINICONSZ: 26,
		SEG_MAXICONSEP: 2,
		SEG_MINICONSEP: 1,
		SEG_BOX2ICON_RATIO: 2.5,
		SEG_PERCDECPLACES: 2,
		SEG_SMALLBOXLIMIT_PX: 60,
		SEG_SEPFROMCLASSBOUNDARY: 2,
		SEG_SEPSELBOXFROMCLASSBOX: 2,
		SEG_SELECTEDCLASSBOUNDARY: 2,
		SEG_CLASSFILL_ALPHA: 0.2,
		SEG_SELECTEDCLASSBOUNDARY_CLR: "white",
		SEG_SELECTEDCLASSFILL_CLR: "rgb(255, 255, 255, 0.3)",
		SEG_CLUSTERSIZE: 150,

		DASH_COUNTERMAXRADIUS: 120,
		DASH_COUNTERFONTSIZE_PX: 60,
		DASH_COUNTERFONTFAMILY: "OpenSans-CondensedBold",
		DASH_COUNTERTXTFONTSIZE_PX: 30,
		DASH_COUNTERTXTFONTFAMILY: "OpenSans-CondensedBold",
		DASH_COUNTERGAUGESTYLE: "rgba(255, 150, 84, 0.7)",
		DASH_COUNTERGAUGELINEWIDTH: 10,

		// Feature selection fixed tooltip
		FST_SEPSELBOXFROMCLASSBOX: 4,
		FST_WIDSELBOXFROMCLASSBOX: 2,
		FST_ACTIVECOLOR: "white",
		FST_SELBCKGRD: "#80808040"
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
					/*if (!ret) {
						ret = (SUBKEYS["layers"].indexOf(dbgkey.toLowerCase()) >= 0 ? true : false);
					}*/
					break;

				default:	
					ret = (dbgkey.toLowerCase() == this.DEBUG.toLowerCase() ? true : false);

			}
		}
		return ret
	}
};

export {GlobalConst}