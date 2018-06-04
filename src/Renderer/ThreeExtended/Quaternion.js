import * as THREE from 'three';

if (!THREE.Quaternion.prototype.presiceSlerp) {
    THREE.Quaternion.prototype.presiceSlerp = function _presiceSlerp(qb, t) {
        if (t === 0) {
            return this;
        }

        if (t === 1) {
            return this.copy(qb);
        }

        const x = this._x;
        const y = this._y;
        const z = this._z;
        const w = this._w;

        // http://www.euclideanspace.com/maths/algebra/realNormedAlgebra/quaternions/slerp/

        var cosHalfTheta = w * qb._w + x * qb._x + y * qb._y + z * qb._z;

        if (cosHalfTheta < 0) {
            this._w = -qb._w;
            this._x = -qb._x;
            this._y = -qb._y;
            this._z = -qb._z;

            cosHalfTheta = -cosHalfTheta;
        } else {
            this.copy(qb);
        }

        if (cosHalfTheta >= 1.0) {
            this._w = w;
            this._x = x;
            this._y = y;
            this._z = z;

            return this;
        }

        const sinHalfTheta = Math.sqrt(1.0 - cosHalfTheta * cosHalfTheta);

        // This is the same implementation as the THREE.Slerp function except for theta values close to 180 °.
        // In this implementation, the threshold, for which theta is considered equal to 180, is smaller.
        // The calculation is more accurate for values close to 180 °.
        if (Math.abs(sinHalfTheta) < 0.00000001) {
            this._w = 0.5 * (w + this._w);
            this._x = 0.5 * (x + this._x);
            this._y = 0.5 * (y + this._y);
            this._z = 0.5 * (z + this._z);

            return this;
        }

        const halfTheta = Math.atan2(sinHalfTheta, cosHalfTheta);
        const ratioA = Math.sin((1 - t) * halfTheta) / sinHalfTheta;
        const ratioB = Math.sin(t * halfTheta) / sinHalfTheta;

        this._w = (w * ratioA + this._w * ratioB);
        this._x = (x * ratioA + this._x * ratioB);
        this._y = (y * ratioA + this._y * ratioB);
        this._z = (z * ratioA + this._z * ratioB);

        this.onChangeCallback();

        return this;
    };
}
