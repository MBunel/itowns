import Coordinates from '../Core/Geographic/Coordinates';
import Extent from '../Core/Geographic/Extent';

function readCRS(json) {
    if (json.crs) {
        if (json.crs.type.toLowerCase() == 'epsg') {
            return `EPSG:${json.crs.properties.code}`;
        } else if (json.crs.type.toLowerCase() == 'name') {
            const epsgIdx = json.crs.properties.name.toLowerCase().indexOf('epsg:');
            if (epsgIdx >= 0) {
                // authority:version:code => EPSG:[...]:code
                const codeStart = json.crs.properties.name.indexOf(':', epsgIdx + 5);
                if (codeStart > 0) {
                    return `EPSG:${json.crs.properties.name.substr(codeStart + 1)}`;
                }
            }
        }
        throw new Error(`Unsupported CRS type '${json.crs}'`);
    }
    // assume default crs
    return 'EPSG:4326';
}

const coords = new Coordinates('EPSG:4978', 0, 0, 0);
function readCoordinates(crsIn, crsOut, coordinates, extent, target) {
    // coordinates is a list of pair [[x1, y1], [x2, y2], ..., [xn, yn]]
    let offset = 0;
    if (target) {
        offset = target.length;
        target.length += coordinates.length;
    }
    const out = target || new Array(coordinates.length);

    let i = 0;
    // TODO: 1 is a default z value, makes this configurable
    let z = 1;
    for (const pair of coordinates) {
        if (typeof pair[2] == 'number') {
            z = pair[2];
        }

        if (crsIn === crsOut) {
            out[offset + i] = new Coordinates(crsIn, pair[0], pair[1], z);
        } else {
            coords.set(crsIn, pair[0], pair[1], z);
            out[offset + i] = coords.as(crsOut);
        }
        // expand extent if present
        if (extent) {
            extent.expandByPoint(out[offset + i]);
        }
        ++i;
    }
    return out;
}

// Helper struct that returns an object { type: "", coordinates: [...], extent}:
// - type is the geom type
// - Coordinates is an array of Coordinate
// - extent is optional, it's coordinates's extent
// Multi-* geometry types are merged in one.
const GeometryToCoordinates = {
    point(crsIn, crsOut, coordsIn, filteringExtent, options) {
        const extent = options.buildExtent ? new Extent(crsOut, Infinity, -Infinity, Infinity, -Infinity) : undefined;
        let coordinates = readCoordinates(crsIn, crsOut, coordsIn, extent);
        if (filteringExtent) {
            coordinates = coordinates.filter(c => filteringExtent.isPointInside(c));
        }
        return { type: 'point', vertices: coordinates, extent };
    },
    polygon(crsIn, crsOut, coordsIn, filteringExtent, options) {
        const extent = options.buildExtent ? new Extent(crsOut, Infinity, -Infinity, Infinity, -Infinity) : undefined;
        // read contour first
        const coordinates = readCoordinates(crsIn, crsOut, coordsIn[0], extent);
        if (filteringExtent && !filteringExtent.isPointInside(coordinates[0])) {
            return;
        }
        const contour = {
            offset: 0,
            count: coordinates.length,
        };
        let offset = coordinates.length;
        const holes = [];
        // Then read optional holes
        for (let i = 1; i < coordsIn.length; i++) {
            readCoordinates(crsIn, crsOut, coordsIn[i], extent, coordinates);
            const count = coordinates.length - offset;
            holes.push({
                offset,
                count,
            });
            offset += count;
        }

        return {
            type: 'polygon',
            vertices: coordinates,
            contour,
            holes,
            extent,
        };
    },
    lineString(crsIn, crsOut, coordsIn, filteringExtent, options) {
        const extent = options.buildExtent ? new Extent(crsOut, Infinity, -Infinity, Infinity, -Infinity) : undefined;
        const coordinates = readCoordinates(crsIn, crsOut, coordsIn, extent);
        if (filteringExtent && !filteringExtent.isPointInside(coordinates[0])) {
            return;
        }
        return { type: 'linestring', vertices: coordinates, extent };
    },
    multiPoint(crsIn, crsOut, coordsIn, filteringExtent, options) {
        const points = [];
        points.type = 'multipoint';
        for (const pt of coordsIn) {
            const l = this.point(crsIn, crsOut, pt, filteringExtent, options);
            if (!l) {
                return;
            }
            filteringExtent = undefined;
            points.push(l);
            if (options.buildExtent) {
                points.extent = points.extent || l.extent;
                points.extent.union(l.extent);
            }
        }
        return points;
    },

    multiLineString(crsIn, crsOut, coordsIn, filteringExtent, options) {
        const lines = [];
        lines.type = 'multilinestring';
        for (const line of coordsIn) {
            const l = this.lineString(crsIn, crsOut, line, filteringExtent, options);
            if (!l) {
                return;
            }
            // only test the first line
            filteringExtent = undefined;
            lines.push(l);
            if (options.buildExtent) {
                lines.extent = lines.extent || l.extent;
                lines.extent.union(l.extent);
            }
        }
        return lines;
    },
    multiPolygon(crsIn, crsOut, coordsIn, filteringExtent, options) {
        const polygons = [];
        polygons.type = 'multipolygon';
        for (const polygon of coordsIn) {
            const p = this.polygon(crsIn, crsOut, polygon, filteringExtent, options);
            if (!p) {
                return;
            }
            // only test the first poly
            filteringExtent = undefined;
            polygons.push(p);
            if (options.buildExtent) {
                polygons.extent = polygons.extent || p.extent;
                polygons.extent.union(p.extent);
            }
        }
        return polygons;
    },
};

function readGeometry(crsIn, crsOut, json, filteringExtent, options) {
    if (json.coordinates.length == 0) {
        return;
    }
    switch (json.type.toLowerCase()) {
        case 'point':
            return GeometryToCoordinates.point(crsIn, crsOut, [json.coordinates], filteringExtent, options);
        case 'multipoint':
            return GeometryToCoordinates.multiPoint(crsIn, crsOut, json.coordinates, filteringExtent, options);
        case 'linestring':
            return GeometryToCoordinates.lineString(crsIn, crsOut, json.coordinates, filteringExtent, options);
        case 'multilinestring':
            return GeometryToCoordinates.multiLineString(crsIn, crsOut, json.coordinates, filteringExtent, options);
        case 'polygon':
            return GeometryToCoordinates.polygon(crsIn, crsOut, json.coordinates, filteringExtent, options);
        case 'multipolygon':
            return GeometryToCoordinates.multiPolygon(crsIn, crsOut, json.coordinates, filteringExtent, options);
        case 'geometrycollection':
        default:
            throw new Error(`Unhandled geometry type ${json.type}`);
    }
}

function readFeature(crsIn, crsOut, json, filteringExtent, options) {
    if (options.filter && !options.filter(json.properties)) {
        return;
    }
    const feature = {};
    feature.geometry = readGeometry(crsIn, crsOut, json.geometry, filteringExtent, options);

    if (!feature.geometry) {
        return;
    }
    feature.properties = json.properties || {};
    // copy other properties
    for (const key of Object.keys(json)) {
        if (['type', 'geometry', 'properties'].indexOf(key.toLowerCase()) < 0) {
            feature.properties[key] = json[key];
        }
    }

    return feature;
}

function readFeatureCollection(crsIn, crsOut, json, filteringExtent, options) {
    const collec = [];

    for (const feature of json.features) {
        const f = readFeature(crsIn, crsOut, feature, filteringExtent, options);
        if (f) {
            if (options.buildExtent) {
                if (collec.extent) {
                    collec.extent.union(f.geometry.extent);
                } else {
                    collec.extent = f.geometry.extent.clone();
                }
            }
            collec.push(f);
        }
    }
    return collec;
}

/**
 * The GeoJsonParser module provide a [parse]{@link module:GeoJsonParser.parse}
 * method that takes a GeoJSON in and gives an object formatted for iTowns
 * containing all necessary informations to display this GeoJSON.
 *
 * @module GeoJsonParser
 */
export default {
    /**
     * Similar to the geometry of a feature in a GeoJSON, but adapted to iTowns.
     * The difference is that coordinates are stored as {@link Coordinates}
     * instead of raw values. If needed (especially if the geometry is a
     * <code>polygon</code>), more information is provided.
     *
     * @typedef FeatureGeometry
     * @type {Object}
     *
     * @property {string} type - Geometry type, can be <code>point</code>,
     * <code>multipoint</code>, <code>linestring</code>,
     * <code>multilinestring</code>, <code>polygon</code> or
     * <code>multipolygon</code>.
     * @property {Coordinates[]} vertices - All the vertices of the geometry.
     * @property {?number[]} contour - If this geometry is a
     * <code>polygon</code>, <code>contour</code> contains the indices that
     * compose the contour (outer ring).
     * @property {?Array} holes - If this geometry is a <code>polygon</code>,
     * <code>holes</code> contains an array of indices representing holes in the
     * polygon.
     * @property {?Extent} extent - The 2D extent containing all the geometries.
    */

    /**
     * Similar to a feature in a GeoJSON, but adapted to iTowns.
     *
     * @typedef Feature
     * @type {Object}
     *
     * @property {FeatureGeometry|FeatureGeometry[]} geometry - The feature's
     * geometry. Can be a [FeatureGeometry]{@link
     * module:GeoJsonParser~FeatureGeometry} or an array of FeatureGeometry.
     * @property {Object} properties - Properties of the features. It can be
     * anything specified in the GeoJSON under the <code>properties</code>
     * property.
    */

    /**
     * Parse a GeoJSON file content and return a [Feature]{@link
     * module:GeoJsonParser~Feature} or an array of Features.
     *
     * @param {string} json - The GeoJSON file content to parse.
     * @param {Object} options - Options controlling the parsing.
     * @param {string} options.crsOut - The CRS to convert the input coordinates
     * to.
     * @param {string} options.crsIn - Override the data CRS.
     * @param {Extent} [options.filteringExtent] - Optional filter to reject
     * features outside of this extent.
     * @param {boolean} [options.buildExtent=false] - If true the geometry will
     * have an extent property containing the area covered by the geom
     * @param {function} [options.filter] - Filter function to remove features
     *
     * @return {Promise} A promise resolving with a [Feature]{@link
     * module:GeoJsonParser~Feature} or an array of Features.
     */
    parse(json, options = {}) {
        const crsOut = options.crsOut;
        const filteringExtent = options.filteringExtent;
        if (typeof (json) === 'string') {
            json = JSON.parse(json);
        }
        options.crsIn = options.crsIn || readCRS(json);
        switch (json.type.toLowerCase()) {
            case 'featurecollection':
                return Promise.resolve(readFeatureCollection(options.crsIn, crsOut, json, filteringExtent, options));
            case 'feature':
                return Promise.resolve(readFeature(options.crsIn, crsOut, json, filteringExtent, options));
            default:
                throw new Error(`Unsupported GeoJSON type: '${json.type}`);
        }
    },
};
