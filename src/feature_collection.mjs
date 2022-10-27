import {SpatialIndex} from './spatial_index.mjs';
import {Layer} from './layers.mjs'

export class FeatureCollection {

	constructor(p_mapctx) {
		this.mapctx = p_mapctx;
		this.featList = {};
		this.layers = {};
		//this.spIndex = new SpatialIndex();
	}

	setLayer(p_layerkey, p_layerobj) {
		if (!(p_layerobj instanceof Layer)) {
			throw new Error(`layer '${p_layerkey}' is not instance of Layer`);
		}
		if (this.featList[p_layerkey] === undefined) {
			this.featList[p_layerkey] = {};
			this.layers[p_layerkey] = p_layerobj;
		} else {
			throw new Error(`layer '${p_layerkey}' already set`);
		}	
	}

	add(p_layerkey, p_geom, p_attrs, p_path_levels, opt_id, opt_id_fieldname) {

		if (opt_id != null && opt_id_fieldname != null) {
			throw new Error(`layer '${p_layerkey}' opt_id, opt_id_fieldname are mutually exclusive, both were given, opt_id:${opt_id}, opt_id_fieldname:${opt_id_fieldname}`);
		}

		if (this.featList[p_layerkey] === undefined) {
			throw new Error(`layer '${p_layerkey}' was not set through 'setLayer' method`);
		}

		let id;

		if (opt_id) {
			id = opt_id;
		} else {
			id = p_attrs[opt_id_fieldname];
		}

		if (this.featList[p_layerkey][id] !== undefined) {

			//delete this.featList[p_layerkey][id];
			// probably wasn't properly garbage collected yet, returning id null prevents subsequent drawing
			id = null;

		} else {

			this.featList[p_layerkey][id] = {
				l: p_path_levels,
				g: p_geom.slice(0),
				a: {...p_attrs}
			};

		}

		return id;
	}

	remove(p_layerkey, p_id) {
		if (this.featList[p_layerkey] !== undefined) {
			if (this.featList[p_layerkey][p_id] !== undefined) {
				delete this.featList[p_layerkey][p_id];
			}
		}
	}

	emptyLayer(p_layerkey) {
		if (this.featList[p_layerkey] !== undefined) {
			this.featList[p_layerkey] = {};
		}
	}

	emptyAll() {
		for (let layerkey in this.featList) {
			this.emptyLayer(layerkey);
		}
	}	

	invalidate() {
		this.emptyAll();
		//this.spIndex.invalidate();
	}
	
	draw(p_mapctxt, p_terrain_env, p_scr_env, p_dims, p_layerkey, opt_featid) {

		let feat;

		if (this.featList[p_layerkey] === undefined) {
			throw new Error(`layer '${p_layerkey}' was not set through 'setLayer' method`);
		}

		if (opt_featid) {
			feat = this.featList[p_layerkey][opt_featid];
			this.layers[p_layerkey].refreshitem(p_mapctxt, p_terrain_env, p_scr_env, p_dims, feat.g, feat.a, feat.l, opt_featid);
		} else {

			for (let id in this.featList[p_layerkey]) {
				if (this.featList[p_layerkey].hasOwnProperty(id)) {
					feat = this.featList[p_layerkey][id];
					this.layers[p_layerkey].refreshitem(p_mapctxt, p_terrain_env, p_scr_env, p_dims, feat.g, feat.a, feat.l, id);
				}
			}
		}
	}

}