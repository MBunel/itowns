import { Vector4, Uniform, NoBlending, NormalBlending, RawShaderMaterial } from 'three';
import PointsVS from './Shader/PointsVS.glsl';
import PointsFS from './Shader/PointsFS.glsl';
import Capabilities from '../Core/System/Capabilities';

export const MODE = {
    COLOR: 0,
    PICKING: 1,
    INTENSITY: 2,
    CLASSIFICATION: 3,
    NORMAL: 4,
};

class PointsMaterial extends RawShaderMaterial {
    constructor(size = 0, mode = MODE.COLOR) {
        super();
        this.vertexShader = PointsVS;
        this.fragmentShader = PointsFS;
        this.scale = 0.05 * 0.5 / Math.tan(1.0 / 2.0); // autosizing scale
        this.oldMode = null;

        for (const key in MODE) {
            if (Object.prototype.hasOwnProperty.call(MODE, key)) {
                this.defines[`MODE_${key}`] = MODE[key];
            }
        }

        this.uniforms.size = new Uniform(size);
        this.uniforms.mode = new Uniform(mode);
        this.uniforms.opacity = new Uniform(1.0);
        this.uniforms.overlayColor = new Uniform(new Vector4(0, 0, 0, 0));

        if (Capabilities.isLogDepthBufferSupported()) {
            this.defines.USE_LOGDEPTHBUF = 1;
            this.defines.USE_LOGDEPTHBUF_EXT = 1;
        }

        if (__DEBUG__) {
            this.defines.DEBUG = 1;
        }
    }

    enablePicking(pickingMode) {
        // we don't want pixels to blend over already drawn pixels
        this.blending = pickingMode ? NoBlending : NormalBlending;
        if (pickingMode) {
            if (this.uniforms.mode.value !== MODE.PICKING) {
                this.oldMode = this.uniforms.mode.value;
                this.uniforms.mode.value = MODE.PICKING;
            }
        } else {
            this.uniforms.mode.value = this.oldMode || this.uniforms.mode.value;
            this.oldMode = null;
        }
    }

    updateUniforms(layer) {
        // if size is null, switch to autosizing using the canvas height
        this.uniforms.size.value = (layer.pointSize > 0) ? layer.pointSize : -this.scale * window.innerHeight;
        this.uniforms.mode.value = layer.mode;
    }
}

export default PointsMaterial;
