precision highp float;
precision highp int;

#include <logdepthbuf_pars_vertex>
#define EPSILON 1e-6
// see PointsMaterial.js
#define MODE_COLOR 0
#define MODE_PICKING 1
#define MODE_INTENSITY 2
#define MODE_CLASSIFICATION 3
#define MODE_NORMAL 4
#define MODE_NORMAL_OCT16 5
#define MODE_NORMAL_SPHEREMAPPED 6

attribute vec3 position;
uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
uniform float size;

uniform int mode;
uniform float opacity;
uniform vec4 overlayColor;
attribute vec3 color;
attribute vec4 unique_id;
attribute float intensity;
attribute vec4 normal;
attribute vec2 sphereMappedNormal;
attribute vec2 oct16Normal;

varying vec4 vColor;

// see https://web.archive.org/web/20150303053317/http://lgdv.cs.fau.de/get/1602
// and implementation in PotreeConverter (BINPointReader.cpp) and potree (BinaryDecoderWorker.js)
vec3 decodeOct16Normal(vec2 encodedNormal) {
    vec2 nNorm = encodedNormal * 255. / 2. - 1.;
    vec3 n;
    n.z = 1. - abs(nNorm.x) - abs(nNorm.y);
    if (n.z >= 0.) {
        n.x = nNorm.x;
        n.y = nNorm.y;
    } else {
        n.x = sign(nNorm.x) - sign(nNorm.x) * sign(nNorm.y) * nNorm.y;
        n.y = sign(nNorm.y) - sign(nNorm.y) * sign(nNorm.x) * nNorm.x;
    }
    return normalize(n);
}

// see http://aras-p.info/texts/CompactNormalStorage.html method #4
// or see potree's implementation in BINPointReader.cpp
vec3 decodeSphereMappedNormal(vec2 encodedNormal) {
    vec2 fenc = 2. * encodedNormal / 255. - 1.;
    float f = dot(fenc,fenc);
    float g = 2. * sqrt(1. - f);
    vec3 n;
    n.xy = fenc * g;
    n.z = 1. - 2. * f;
    return n;
}

void main() {
    if (mode == MODE_PICKING) {
        vColor = unique_id;
    } else if (mode == MODE_INTENSITY) {
        vColor = vec4(intensity, intensity, intensity, 1.0);
    } else if (mode == MODE_NORMAL) {
        vColor = normal;
    } else if (mode == MODE_NORMAL_OCT16) {
        vColor = vec4(decodeOct16Normal(oct16Normal), 1.0);
    } else if (mode == MODE_NORMAL_SPHEREMAPPED) {
        vColor = vec4(decodeSphereMappedNormal(sphereMappedNormal), 1.0);
    } else {
        // default to color mode
        vColor = vec4(mix(color, overlayColor.rgb, overlayColor.a), opacity);
    }

    gl_Position = projectionMatrix * (modelViewMatrix * vec4( position, 1.0 ));

    if (size > 0.) {
        gl_PointSize = size;
    } else {
        gl_PointSize = clamp(-size / gl_Position.w, 3.0, 10.0);
    }

    #include <logdepthbuf_vertex>
}
