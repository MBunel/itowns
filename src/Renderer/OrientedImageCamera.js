import * as THREE from 'three';

class OrientedImageCamera extends THREE.PerspectiveCamera {
    constructor(size, focal, center, near, far, skew) {
        super(undefined, size.x / size.y, near || 0.1, far || 1000);
        this.size = size;
        this.focal = focal.isVector2 ? focal : new THREE.Vector2(focal, focal);
        this.center = center || size.clone().multiplyScalar(0.5);
        this.skew = skew || 0;
        Object.defineProperty(this, 'fov', {
            get: () => Math.atan2(this.size.y, 2 * this.focal.y) * 360 / Math.PI,
            // setting the fov overwrites focal.x and focal.y
            set: (fov) => {
                var focal = 0.5 * this.size.y / Math.tan(fov * Math.PI / 360);
                this.focal.x = focal;
                this.focal.y = focal;
            },
        });
        this.updateProjectionMatrix();
    }

    updateProjectionMatrix() {
        if (!this.focal) {
            return;
        }
        const near = this.near;
        const sx = near / this.focal.x;
        const sy = near / this.focal.y;
        const left = -sx * this.center.x;
        const bottom = -sy * this.center.y;
        const right = left + sx * this.size.x;
        const top = bottom + sy * this.size.y;
        this.projectionMatrix.makePerspective(left, right, top, bottom, near, this.far);
        this.projectionMatrix.elements[4] = 2 * this.skew / this.size.x;

        // take zoom and aspect into account
        const textureAspect = this.size.x / this.size.y;
        const aspectRatio = this.aspect / textureAspect;
        const zoom = new THREE.Vector2(this.zoom, this.zoom);
        if (aspectRatio > 1) {
            zoom.x /= aspectRatio;
        } else {
            zoom.y *= aspectRatio;
        }
        this.projectionMatrix.premultiply(new THREE.Matrix4().makeScale(zoom.x, zoom.y, 1));
    }

    copy(source, recursive) {
        super.copy(source, recursive);
        this.size = source.size.clone();
        this.focal = source.focal.clone();
        this.center = source.center.clone();
        this.skew = source.skew;
        return this;
    }
}

export default OrientedImageCamera;
